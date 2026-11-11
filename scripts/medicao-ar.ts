/**
 * MEDIÇÃO do Prompt AR, Fase 1 (Revisão 4) — SOMENTE LEITURA.
 *
 * Três funções leem o mesmo `payment_plan` com regras diferentes
 * (`expandUnitReceivables`, `calcProjectionBySource`, `calcTotals`). Este
 * script mede, por empresa e obra (versão Atual, unidades vendidas):
 *   1. quantas unidades caem em cada regra que diverge;
 *   2. o total pelas três leituras, lado a lado, e a diferença em R$;
 *   3. (BAR-7) quantas unidades têm permuta no plano E na tabela de permutas.
 *
 * SOMENTE LEITURA DE VERDADE: a conexão abre com
 * `default_transaction_read_only = on`, e o cliente do app é trocado por ela
 * antes de qualquer import (o `db` do app reaproveita `globalThis.client`).
 * Qualquer INSERT/UPDATE/DELETE falharia no Postgres. O script confere isso
 * no começo e para se não estiver em modo leitura.
 *
 * Saída: Markdown no stdout, só com nome da empresa, nome da obra, contagens e
 * somas. Nenhum dado de comprador, nenhum código de unidade.
 *
 *   DATABASE_URL=postgres://... npx tsx scripts/medicao-ar.ts > docs/AR-MEDICAO-producao.md
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não definido.");
  process.exit(1);
}
const somenteLeitura = postgres(url, { prepare: false, max: 4, connection: { default_transaction_read_only: "on" } as Record<string, string> });
(globalThis as unknown as { client?: unknown }).client = somenteLeitura;

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const r2 = (v: number) => Math.round(v * 100) / 100;

async function main() {
  const [{ default_transaction_read_only: modo }] = await somenteLeitura`show default_transaction_read_only`;
  if (modo !== "on") throw new Error("A conexão não está em modo somente leitura; nada foi lido.");

  const { and, eq, inArray } = await import("drizzle-orm");
  const { db, schema } = await import("../src/lib/db");
  const { toCalcUnit, getInccRows } = await import("../src/lib/queries");
  const { expandUnitReceivables } = await import("../src/lib/calc/receivables");
  const { calcProjectionBySource, calcTotals } = await import("../src/lib/calc/projection");
  const { chaveLigada } = await import("../src/lib/chaves-tenant");

  const versoes = await db
    .select({ versionId: schema.versions.id, projectId: schema.projects.id, obra: schema.projects.name, tenantId: schema.tenants.id, empresa: schema.tenants.name })
    .from(schema.versions)
    .innerJoin(schema.projects, eq(schema.versions.projectId, schema.projects.id))
    .innerJoin(schema.tenants, eq(schema.versions.tenantId, schema.tenants.id))
    .where(eq(schema.versions.kind, "atual"))
    .orderBy(schema.tenants.name, schema.projects.name);

  const linhas1: string[] = [];
  const linhas2: string[] = [];
  const linhas7: string[] = [];
  const total = { unidades: 0, receb: 0, proj: 0, nova: 0, antiga: 0 };
  const definicaoNovaPorEmpresa = new Map<string, boolean>();

  for (const v of versoes) {
    const unidades = await db.select().from(schema.units).where(and(eq(schema.units.versionId, v.versionId), eq(schema.units.status, "Vendido")));
    if (unidades.length === 0) continue;
    if (!definicaoNovaPorEmpresa.has(v.tenantId)) definicaoNovaPorEmpresa.set(v.tenantId, await chaveLigada(v.tenantId, "resumo_definicao_nova"));
    const incc = await getInccRows(v.tenantId, v.projectId);

    const c = { chaveDesligada: 0, subPendente: 0, financ: 0, permuta: 0, sinalParcelado: 0 };
    let receb = 0;
    let proj = 0;
    for (const u of unidades) {
      const cu = toCalcUnit(u);
      // 1. Regras que divergem. Cada seção tem a própria chave `usar*` (a cascata do plano).
      const secoes: [number, boolean][] = [
        [cu.AS.val, cu.usarAS],
        [cu.S1.val, cu.AS.usarS1],
        [cu.S2.val, cu.S1.usarS2],
        [cu.S3.val, cu.S2.usarS3],
        [cu.Mensais.val, cu.S3.usarMens],
        [cu.Semestrais.val, cu.Mensais.usarSem],
        [cu.Anuais.val, cu.Semestrais.usarAnu],
        [cu.FGTS.val, cu.Anuais.usarFGTS],
        [cu.Subsidio.val, cu.FGTS.usarSub],
        [cu.Permuta.val, cu.Subsidio.usarPer],
        [cu.Banco.valFinanc, cu.Permuta.usarFinanc],
      ];
      if (secoes.some(([val, usar]) => (Number(val) || 0) > 0 && !usar)) c.chaveDesligada++;
      if ((Number(cu.Subsidio.val) || 0) > 0 && cu.Subsidio.statusSub !== "Recebido") c.subPendente++;
      if ((Number(cu.Banco.valFinanc) || 0) > 0) c.financ++;
      if ((Number(cu.Permuta.val) || 0) > 0) c.permuta++;
      if ([cu.S1, cu.S2, cu.S3].some((s) => (Number(s.n) || 0) > 1 && (Number(s.val) || 0) > 0)) c.sinalParcelado++;
      // 2. As três leituras.
      receb += expandUnitReceivables(u.paymentPlan, u.status).reduce((a, x) => a + x.valor, 0);
      const fontes = calcProjectionBySource(cu, incc);
      for (const m of Object.values(fontes)) for (const val of Object.values(m)) proj += val;
    }
    const calc = unidades.map(toCalcUnit);
    const soma = (t: ReturnType<typeof calcTotals>) => t.sinais + t.mens + t.sem + t.anu + t.fgts + t.sub + t.banco;
    const nova = soma(calcTotals(calc, [], [], { definicaoNova: true }));
    const antiga = soma(calcTotals(calc, [], [], { definicaoNova: false }));

    // 3. BAR-7: permuta no plano E registrada na tabela de permutas, na mesma versão e unidade.
    const comPermutaNoPlano = unidades.filter((u) => (Number(toCalcUnit(u).Permuta.val) || 0) > 0).map((u) => u.code);
    let emDobro = 0;
    let valorPlano = 0;
    let valorTabela = 0;
    if (comPermutaNoPlano.length) {
      const regs = await db
        .select({ unitCode: schema.permutas.unitCode, estimado: schema.permutas.estimado, valorVenda: schema.permutas.valorVenda, status: schema.permutas.status })
        .from(schema.permutas)
        .where(and(eq(schema.permutas.versionId, v.versionId), inArray(schema.permutas.unitCode, comPermutaNoPlano)));
      const codigos = new Set(regs.map((r) => r.unitCode));
      emDobro = codigos.size;
      for (const u of unidades) if (codigos.has(u.code)) valorPlano += Number(toCalcUnit(u).Permuta.val) || 0;
      for (const r of regs) if (!/cancel/i.test(r.status ?? "")) valorTabela += r.status === "Vendido" ? Number(r.valorVenda) || 0 : 0;
    }

    total.unidades += unidades.length;
    total.receb += receb;
    total.proj += proj;
    total.nova += nova;
    total.antiga += antiga;
    linhas1.push(`| ${v.empresa} | ${v.obra} | ${unidades.length} | ${c.chaveDesligada} | ${c.subPendente} | ${c.financ} | ${c.permuta} | ${c.sinalParcelado} |`);
    linhas2.push(
      `| ${v.empresa} | ${v.obra} | ${brl(r2(receb))} | ${brl(r2(proj))} | ${brl(r2(nova))} | ${brl(r2(antiga))} | ${brl(r2(receb - proj))} | ${brl(r2(receb - (definicaoNovaPorEmpresa.get(v.tenantId) ? nova : antiga)))} | ${definicaoNovaPorEmpresa.get(v.tenantId) ? "nova" : "antiga"} |`,
    );
    if (comPermutaNoPlano.length) linhas7.push(`| ${v.empresa} | ${v.obra} | ${comPermutaNoPlano.length} | ${emDobro} | ${brl(r2(valorPlano))} | ${brl(r2(valorTabela))} |`);
  }

  const out = [
    `# Medição do Prompt AR, Fase 1 — gerada em ${new Date().toLocaleString("pt-BR")}`,
    "",
    "Conexão em modo somente leitura (`default_transaction_read_only = on`). Versão Atual, só unidades vendidas.",
    "",
    "## 1. Unidades em cada regra que diverge",
    "",
    "| Empresa | Obra | Vendidas | Seção > 0 com a chave `usar*` desligada | Subsídio > 0 não recebido | Financiamento > 0 | Permuta do plano > 0 | S1/S2/S3 com n > 1 |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...linhas1,
    "",
    "## 2. Total da versão Atual pelas três leituras",
    "",
    "Recebíveis = `expandUnitReceivables` (Contas a Receber, DRE, Fluxo). Projeção = `calcProjectionBySource` com o INCC da obra (Projeção em modo comparação, geração de Orçamento). Totais = `calcTotals` (Resumo): sinais + mensais + semestrais + anuais + FGTS + subsídio + financiamento, nas duas definições. A coluna \"Resumo usa\" diz qual definição a chave `resumo_definicao_nova` da empresa liga hoje.",
    "",
    "| Empresa | Obra | Recebíveis | Projeção | Totais (def. nova) | Totais (def. antiga) | Recebíveis − Projeção | Recebíveis − Totais (a que o Resumo usa) | Resumo usa |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
    ...linhas2,
    `| **Total** | | **${brl(r2(total.receb))}** | **${brl(r2(total.proj))}** | **${brl(r2(total.nova))}** | **${brl(r2(total.antiga))}** | **${brl(r2(total.receb - total.proj))}** | | |`,
    "",
    `Unidades vendidas medidas: ${total.unidades}.`,
    "",
    "## BAR-7. Permuta no plano e na tabela de permutas (a mesma unidade, na versão Atual)",
    "",
    "| Empresa | Obra | Unidades com permuta no plano | Delas, com registro na tabela de permutas | `Permuta.val` dessas unidades | Revenda registrada (status Vendido) |",
    "| --- | --- | ---: | ---: | ---: | ---: |",
    ...(linhas7.length ? linhas7 : ["| — | — | 0 | 0 | — | — |"]),
  ];
  console.log(out.join("\n"));
}

main()
  .then(() => somenteLeitura.end())
  .catch(async (e) => {
    console.error("Falha na medição:", e instanceof Error ? e.message : e);
    await somenteLeitura.end();
    process.exit(1);
  });
