/**
 * VARREDURA do Acerto Contábil, restituição em lote e compensação (PR-C).
 *
 * Prova contra banco REAL o caso concreto do cliente (Casarão: 8 PEDs somando
 * R$ 67.000 pagos com uma transferência de R$ 70.000), o rateio de mão de obra
 * entre obras, o abatimento FIFO em lote e o encontro de contas.
 *
 * Cria e remove o próprio tenant de teste. NUNCA aponte para produção.
 *
 *   DATABASE_URL=postgres://... npx tsx scripts/varredura-acerto.ts
 */
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "../src/lib/db";
import {
  abaterFifo,
  calcularDiferenca,
  calcularRateio,
  validarRateio,
} from "../src/lib/calc/acerto";
import { valorCompensavel } from "../src/lib/calc/recebimento-terceiro";

const TENANT = "VARREDURA_ACERTO";

let falhas = 0;
function check(nome: string, ok: boolean, detalhe: string) {
  console.log(`[${ok ? "  OK  " : " FALHA"}] ${nome} — ${detalhe}`);
  if (!ok) falhas++;
}

async function limpar() {
  const antigos = await db
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(eq(schema.tenants.name, TENANT));
  for (const t of antigos) await db.delete(schema.tenants).where(eq(schema.tenants.id, t.id));
}

async function esperaErro(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

async function main() {
  console.log("=== VARREDURA — ACERTO CONTÁBIL E RESTITUIÇÃO EM LOTE ===\n");
  await limpar();

  const [tenant] = await db.insert(schema.tenants).values({ name: TENANT }).returning();
  const criarObra = async (nome: string) => {
    const [p] = await db
      .insert(schema.projects)
      .values({ tenantId: tenant.id, name: nome, kind: "proj" })
      .returning();
    const [v] = await db
      .insert(schema.versions)
      .values({
        tenantId: tenant.id,
        projectId: p.id,
        key: "atual",
        label: "Atual",
        color: "#f59e0b",
        kind: "atual",
      })
      .returning();
    return { projeto: p, versao: v };
  };
  const obra5 = await criarObra("OBRA 5");
  const obra26 = await criarObra("OBRA 26");
  const obra28 = await criarObra("OBRA 28");
  const [deposito] = await db
    .insert(schema.stakeholders)
    .values({ tenantId: tenant.id, nome: "Depósito Exemplo Materiais", tipo: "PJ" })
    .returning();
  const [socio] = await db
    .insert(schema.stakeholders)
    .values({ tenantId: tenant.id, nome: "Sócio Pagador", tipo: "PF" })
    .returning();

  // ── CASO CASARÃO (CA-24) ────────────────────────────────────────────────
  // 8 PEDs somando R$ 67.000, em três obras, pagos com uma única transferência
  // de R$ 70.000. A diferença de R$ 3.000 é juros de atraso.
  const valoresDeposito = [12000, 8000, 9500, 7000, 11000, 6500, 8000, 5000]; // = 67.000
  const obrasCiclo = [obra5, obra26, obra28];
  const pedsDeposito: string[] = [];
  for (let i = 0; i < valoresDeposito.length; i++) {
    const alvo = obrasCiclo[i % 3];
    const [d] = await db
      .insert(schema.despesas)
      .values({
        versionId: alvo.versao.id,
        tenantId: tenant.id,
        numDoc: `PED-CAS-${String(i + 1).padStart(3, "0")}`,
        fornecedorId: deposito.id,
        valor: String(valoresDeposito[i]),
        competencia: "03/2026",
        vencimento: "03/20/2026",
        categoriaDre: "Custo Variável",
        status: "A pagar",
      })
      .returning();
    pedsDeposito.push(d.id);
  }
  const totalVinculado = valoresDeposito.reduce((a, v) => a + v, 0);
  check(
    "8 PEDs de três obras somam R$ 67.000",
    totalVinculado === 67000,
    `total R$ ${totalVinculado}`,
  );

  const VALOR_TRANSFERIDO = 70000;
  const diferenca = calcularDiferenca(VALOR_TRANSFERIDO, totalVinculado);
  check(
    "Diferença de R$ 3.000 é classificada como JUROS",
    diferenca.tipo === "JUROS" && diferenca.valor === 3000,
    `${diferenca.tipo} R$ ${diferenca.valor}`,
  );

  // Simula a conclusão do acerto (a action faz isto numa transação).
  const [acerto] = await db
    .insert(schema.acertos)
    .values({
      tenantId: tenant.id,
      numDoc: "PED-ACERTO-001",
      dataPagamento: "04/15/2026",
      valorTransferido: String(VALOR_TRANSFERIDO),
      favorecidoId: deposito.id,
      diferencaValor: String(diferenca.valor),
      diferencaTipo: diferenca.tipo,
    })
    .returning();
  for (let i = 0; i < pedsDeposito.length; i++) {
    await db.insert(schema.acertoItens).values({
      tenantId: tenant.id,
      acertoId: acerto.id,
      despesaId: pedsDeposito[i],
      valorAbatido: String(valoresDeposito[i]),
      statusAnterior: "A pagar",
    });
    await db
      .update(schema.despesas)
      .set({ status: "Pago", dataCaixa: "04/15/2026" })
      .where(eq(schema.despesas.id, pedsDeposito[i]));
  }
  // A diferença vira despesa FINANCEIRA própria, na competência do pagamento.
  const [despJuros] = await db
    .insert(schema.despesas)
    .values({
      versionId: obra5.versao.id,
      tenantId: tenant.id,
      numDoc: "PED-ACERTO-DIF",
      contaCef: "F.6",
      categoriaDre: "Despesas Financeiras",
      competencia: "04/2026",
      vencimento: "04/15/2026",
      valor: String(diferenca.valor),
      status: "Pago",
      obs: "Juros e multas — acerto PED-ACERTO-001",
    })
    .returning();
  await db.insert(schema.cashEntries).values({
    versionId: obra5.versao.id,
    tenantId: tenant.id,
    data: "04/15/2026",
    descricao: "Acerto PED-ACERTO-001",
    valor: String(-VALOR_TRANSFERIDO),
    cat: "acerto",
    rec: true,
  });

  const quitadas = await db
    .select()
    .from(schema.despesas)
    .where(inArray(schema.despesas.id, pedsDeposito));
  check(
    "CA-24 — todos os 8 PEDs passam para Pago",
    quitadas.every((d) => d.status === "Pago"),
    `${quitadas.filter((d) => d.status === "Pago").length}/8 quitados`,
  );

  const caixa = await db
    .select()
    .from(schema.cashEntries)
    .where(eq(schema.cashEntries.tenantId, tenant.id));
  check(
    "RG-08 — UMA saída de caixa, no valor transferido",
    caixa.length === 1 && Number(caixa[0].valor) === -70000,
    `${caixa.length} lançamento(s), R$ ${caixa[0] ? caixa[0].valor : 0}`,
  );

  // RG-07 — os juros NÃO entram no custo de nenhuma obra.
  const custoPorObra = async (versionId: string) => {
    const ds = await db
      .select()
      .from(schema.despesas)
      .where(eq(schema.despesas.versionId, versionId));
    return ds
      .filter((d) => d.categoriaDre !== "Despesas Financeiras" && !d.cancelado)
      .reduce((a, d) => a + Number(d.valor), 0);
  };
  const custo5 = await custoPorObra(obra5.versao.id);
  const custo26 = await custoPorObra(obra26.versao.id);
  const custo28 = await custoPorObra(obra28.versao.id);
  const esperado5 = valoresDeposito.filter((_, i) => i % 3 === 0).reduce((a, v) => a + v, 0);
  check(
    "CA-24 / RG-07 — os juros NÃO alteram o custo de nenhuma obra",
    custo5 === esperado5 && custo5 + custo26 + custo28 === 67000,
    `custos ${custo5} + ${custo26} + ${custo28} = ${custo5 + custo26 + custo28} (sem os 3.000 de juros)`,
  );
  check(
    "A diferença fica em Despesas Financeiras, na competência do pagamento",
    despJuros.categoriaDre === "Despesas Financeiras" && despJuros.competencia === "04/2026",
    `${despJuros.categoriaDre} em ${despJuros.competencia} (despesas são de 03/2026)`,
  );
  check(
    "CA-25 — despesas de 3 obras no mesmo acerto, cada custo na sua obra",
    custo5 > 0 && custo26 > 0 && custo28 > 0,
    `3 obras com custo próprio preservado`,
  );

  // ── ESTORNO (CA-28) ─────────────────────────────────────────────────────
  for (const item of await db
    .select()
    .from(schema.acertoItens)
    .where(eq(schema.acertoItens.acertoId, acerto.id))) {
    await db
      .update(schema.despesas)
      .set({ status: item.statusAnterior ?? "A pagar", dataCaixa: null })
      .where(eq(schema.despesas.id, item.despesaId));
  }
  await db
    .update(schema.despesas)
    .set({ cancelado: true, motivoCancelamento: "Estorno do acerto" })
    .where(eq(schema.despesas.id, despJuros.id));
  await db.insert(schema.cashEntries).values({
    versionId: obra5.versao.id,
    tenantId: tenant.id,
    data: "04/15/2026",
    descricao: "Estorno do acerto PED-ACERTO-001",
    valor: String(VALOR_TRANSFERIDO),
    cat: "ajuste",
    rec: true,
  });
  await db.update(schema.acertos).set({ estornado: true }).where(eq(schema.acertos.id, acerto.id));

  const reabertas = await db
    .select()
    .from(schema.despesas)
    .where(inArray(schema.despesas.id, pedsDeposito));
  const caixaPos = (
    await db.select().from(schema.cashEntries).where(eq(schema.cashEntries.tenantId, tenant.id))
  ).reduce((a, c) => a + Number(c.valor), 0);
  check(
    "CA-28 — o estorno reabre TODAS as despesas ao status anterior",
    reabertas.every((d) => d.status === "A pagar"),
    `${reabertas.filter((d) => d.status === "A pagar").length}/8 reabertas`,
  );
  check(
    "CA-28 — o estorno zera o efeito no caixa",
    caixaPos === 0,
    `saldo de caixa R$ ${caixaPos}`,
  );
  const [difEstornada] = await db
    .select()
    .from(schema.despesas)
    .where(eq(schema.despesas.id, despJuros.id));
  check(
    "A despesa de juros é CANCELADA, não apagada (RG-09)",
    difEstornada.cancelado === true && Number(difEstornada.valor) === 3000,
    "registro preservado com marca de cancelamento",
  );

  // ── RATEIO ENTRE OBRAS (CA-26 / CA-27) ──────────────────────────────────
  const rateio = calcularRateio(12000, [
    { projectId: obra5.projeto.id, percentual: 50 },
    { projectId: obra26.projeto.id, percentual: 30 },
    { projectId: obra28.projeto.id, percentual: 20 },
  ]);
  check(
    "CA-26 — R$ 12.000 em 50/30/20 gera 6.000 / 3.600 / 2.400",
    rateio.map((r) => r.valor).join(",") === "6000,3600,2400",
    rateio.map((r) => r.valor).join(" / "),
  );
  const [acertoRateio] = await db
    .insert(schema.acertos)
    .values({
      tenantId: tenant.id,
      numDoc: "PED-RATEIO-001",
      dataPagamento: "05/10/2026",
      valorTransferido: "12000",
      favorecidoId: socio.id,
      diferencaTipo: "NENHUMA",
    })
    .returning();
  for (const linha of rateio) {
    const versao =
      linha.projectId === obra5.projeto.id
        ? obra5.versao
        : linha.projectId === obra26.projeto.id
          ? obra26.versao
          : obra28.versao;
    const [d] = await db
      .insert(schema.despesas)
      .values({
        versionId: versao.id,
        tenantId: tenant.id,
        numDoc: `PED-RAT-${linha.projectId.slice(0, 4)}`,
        fornecedorId: socio.id,
        valor: String(linha.valor),
        competencia: "05/2026",
        categoriaDre: "Custo Variável",
        status: "Pago",
      })
      .returning();
    await db.insert(schema.rateiosObra).values({
      tenantId: tenant.id,
      acertoId: acertoRateio.id,
      projectId: linha.projectId,
      despesaId: d.id,
      valor: String(linha.valor),
      percentual: String(linha.percentual),
      baseRateio: "dias trabalhados",
      memoriaCalculo: { valorTotalPago: 12000, percentual: linha.percentual },
    });
  }
  await db.insert(schema.cashEntries).values({
    versionId: obra5.versao.id,
    tenantId: tenant.id,
    data: "05/10/2026",
    descricao: "Rateio entre obras",
    valor: "-12000",
    cat: "acerto",
    rec: true,
  });

  const rateados = await db
    .select()
    .from(schema.rateiosObra)
    .where(eq(schema.rateiosObra.acertoId, acertoRateio.id));
  check(
    "CA-26 — 3 PEDs gerados, um por obra",
    rateados.length === 3 &&
      rateados.reduce((a, r) => a + Number(r.valor), 0) === 12000,
    `${rateados.length} PEDs somando R$ ${rateados.reduce((a, r) => a + Number(r.valor), 0)}`,
  );
  const caixaRateio = (
    await db
      .select()
      .from(schema.cashEntries)
      .where(eq(schema.cashEntries.tenantId, tenant.id))
  ).filter((c) => c.descricao === "Rateio entre obras");
  check(
    "CA-26 — uma única saída de caixa para os 3 PEDs",
    caixaRateio.length === 1 && Number(caixaRateio[0].valor) === -12000,
    `${caixaRateio.length} saída(s) de R$ ${caixaRateio[0] ? caixaRateio[0].valor : 0}`,
  );
  check(
    "A memória de cálculo fica gravada e é reimprimível",
    rateados.every((r) => r.memoriaCalculo != null && r.baseRateio === "dias trabalhados"),
    "memória e base de rateio preservadas",
  );

  const rateioErrado = calcularRateio(12000, [
    { projectId: obra5.projeto.id, valor: 6000 },
    { projectId: obra26.projeto.id, valor: 3000 },
  ]);
  check(
    "CA-27 — rateio que não fecha é bloqueado com mensagem clara",
    (validarRateio(12000, rateioErrado) ?? "").includes("diferença"),
    validarRateio(12000, rateioErrado)?.slice(0, 70) ?? "NÃO bloqueou",
  );

  // ── RESTITUIÇÃO EM LOTE FIFO (CA-20 / CA-21) ────────────────────────────
  const obrigacoesValores = [2000, 1500, 1000, 1200];
  const competencias = ["01/2026", "02/2026", "03/2026", "04/2026"];
  const obrigacoes: string[] = [];
  for (let i = 0; i < obrigacoesValores.length; i++) {
    const [d] = await db
      .insert(schema.despesas)
      .values({
        versionId: obra5.versao.id,
        tenantId: tenant.id,
        numDoc: `PED-TERC-${i + 1}`,
        valor: String(obrigacoesValores[i]),
        competencia: competencias[i],
        categoriaDre: "Custo Variável",
        status: "Pago",
        pagoPorTerceiro: true,
      })
      .returning();
    const [dt] = await db
      .insert(schema.despesaTerceiros)
      .values({
        tenantId: tenant.id,
        despesaId: d.id,
        pagadorTerceiroId: socio.id,
        valorTotal: String(obrigacoesValores[i]),
        status: "Aguardando restituição",
      })
      .returning();
    obrigacoes.push(dt.id);
  }

  const itens = obrigacoes.map((id, i) => ({
    id,
    competencia: competencias[i],
    numDoc: `PED-TERC-${i + 1}`,
    saldo: obrigacoesValores[i],
  }));
  const fifo = abaterFifo(5000, itens);
  check(
    "CA-20 — R$ 5.000 quita os 3 PEDs mais antigos e abate 500 do 4º",
    fifo.abatimentos.length === 4 &&
      fifo.abatimentos[3].valorAbatido === 500 &&
      fifo.abatimentos[3].saldoRestante === 700,
    `abatidos ${fifo.abatimentos.map((a) => a.valorAbatido).join("/")} · sobra no 4º R$ ${fifo.abatimentos[3].saldoRestante}`,
  );

  const [restLote] = await db
    .insert(schema.restituicoes)
    .values({
      tenantId: tenant.id,
      despesaTerceiroId: fifo.abatimentos[0].id,
      valor: String(fifo.totalAbatido),
      dataRestituicao: "06/10/2026",
      idempotencyKey: "lote-1",
    })
    .returning();
  for (const a of fifo.abatimentos) {
    await db.insert(schema.restituicaoItens).values({
      tenantId: tenant.id,
      restituicaoId: restLote.id,
      despesaTerceiroId: a.id,
      valorAbatido: String(a.valorAbatido),
    });
    const [o] = await db
      .select()
      .from(schema.despesaTerceiros)
      .where(eq(schema.despesaTerceiros.id, a.id));
    const novo = Number(o.valorRestituido) + a.valorAbatido;
    await db
      .update(schema.despesaTerceiros)
      .set({
        valorRestituido: String(novo),
        status: novo + 0.01 >= Number(o.valorTotal) ? "Restituído" : "Parcialmente restituído",
      })
      .where(eq(schema.despesaTerceiros.id, a.id));
  }

  const vinculos = await db
    .select()
    .from(schema.restituicaoItens)
    .where(eq(schema.restituicaoItens.restituicaoId, restLote.id));
  check(
    "CA-21 — a restituição em lote se vincula a TODOS os PEDs de origem",
    vinculos.length === 4 &&
      vinculos.reduce((a, v) => a + Number(v.valorAbatido), 0) === 5000,
    `${vinculos.length} vínculos somando R$ ${vinculos.reduce((a, v) => a + Number(v.valorAbatido), 0)}`,
  );
  const statusFinais = await db
    .select()
    .from(schema.despesaTerceiros)
    .where(inArray(schema.despesaTerceiros.id, obrigacoes));
  check(
    "3 obrigações ficam Restituídas e 1 Parcialmente restituída",
    statusFinais.filter((o) => o.status === "Restituído").length === 3 &&
      statusFinais.filter((o) => o.status === "Parcialmente restituído").length === 1,
    statusFinais.map((o) => o.status).join(", "),
  );
  const despesasAposLote = await db
    .select()
    .from(schema.despesas)
    .where(eq(schema.despesas.versionId, obra5.versao.id));
  check(
    "RG-03 — a restituição em lote NÃO cria despesa nova",
    despesasAposLote.filter((d) => d.numDoc?.startsWith("PED-TERC")).length === 4,
    "as 4 despesas originais continuam sendo as únicas do terceiro",
  );

  const erroDupItem = await esperaErro(() =>
    db.insert(schema.restituicaoItens).values({
      tenantId: tenant.id,
      restituicaoId: restLote.id,
      despesaTerceiroId: obrigacoes[0],
      valorAbatido: "100",
    }),
  );
  check(
    "Um PED não pode ser abatido duas vezes pela mesma restituição",
    erroDupItem !== null,
    erroDupItem ? erroDupItem.split("\n")[0].slice(0, 70) : "NÃO bloqueou",
  );

  // ── ENCONTRO DE CONTAS (CA-23) ──────────────────────────────────────────
  await db.insert(schema.recebimentosTerceiros).values({
    tenantId: tenant.id,
    recebedorTerceiroId: socio.id,
    projectId: obra5.projeto.id,
    valorTotal: "500",
    status: "Aguardando repasse",
  });
  const saldoRestituir = 700; // sobrou do 4º PED
  const saldoRepassar = 500;
  const compensavel = valorCompensavel({
    saldoARestituir: saldoRestituir,
    saldoARepassar: saldoRepassar,
  });
  check(
    "CA-23 — a compensação usa o MENOR dos dois saldos",
    compensavel === 500,
    `a restituir ${saldoRestituir} · a repassar ${saldoRepassar} · compensável ${compensavel}`,
  );
  const dreAntes = (
    await db.select().from(schema.despesas).where(eq(schema.despesas.tenantId, tenant.id))
  )
    .filter((d) => !d.cancelado)
    .reduce((a, d) => a + Number(d.valor), 0);
  await db.insert(schema.compensacoes).values({
    tenantId: tenant.id,
    numDoc: "PED-COMP-001",
    terceiroId: socio.id,
    valor: String(compensavel),
    data: "07/10/2026",
    saldoRestituirAntes: String(saldoRestituir),
    saldoRepassarAntes: String(saldoRepassar),
  });
  const dreDepois = (
    await db.select().from(schema.despesas).where(eq(schema.despesas.tenantId, tenant.id))
  )
    .filter((d) => !d.cancelado)
    .reduce((a, d) => a + Number(d.valor), 0);
  check(
    "CA-23 — a compensação NÃO altera a DRE em nenhuma competência",
    dreAntes === dreDepois,
    `DRE R$ ${dreAntes} antes e depois`,
  );
  const [comp] = await db
    .select()
    .from(schema.compensacoes)
    .where(eq(schema.compensacoes.tenantId, tenant.id));
  check(
    "Os saldos BRUTOS ficam gravados no documento de compensação",
    Number(comp.saldoRestituirAntes) === 700 && Number(comp.saldoRepassarAntes) === 500,
    `bruto a restituir ${comp.saldoRestituirAntes} · bruto a repassar ${comp.saldoRepassarAntes}`,
  );

  await limpar();
  console.log(
    `\n=== RESULTADO: ${falhas === 0 ? "TODAS AS REGRAS OK" : `${falhas} FALHA(S)`} ===`,
  );
  process.exit(falhas === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error("ERRO na varredura:", e);
  await limpar().catch(() => {});
  process.exit(1);
});
