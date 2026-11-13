import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";

/**
 * Núcleo financeiro (Etapa 1 da implementação integrada) — integração com
 * Postgres isolado: numeração da medição (inclusive concorrente), vínculos
 * com o plano de trabalho e o aditivo, período, os cinco valores pelo fluxo
 * real, DRE por contrato e por cliente sem dupla contagem, glosa de
 * reembolso, relatório de medições e projeção ao término.
 */
const HAS_DB = !!process.env.DATABASE_URL;
const ctxRef: { current: unknown } = { current: null };
vi.mock("@/lib/context", async (orig) => ({
  ...(await orig<typeof import("@/lib/context")>()),
  getTenantContext: async () => ctxRef.current,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));
vi.mock("server-only", () => ({}));

describe.skipIf(!HAS_DB)("Núcleo financeiro — integração", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const A = await import("./contratos");
  const Q = await import("@/lib/contratos-queries");
  const R = await import("@/lib/resultado-contratos");
  const { cincoValores } = await import("@/lib/receita-servicos");
  const { projecaoDoProjeto } = await import("@/lib/projecao-financeira-dados");
  const { hojeMDY } = await import("@/lib/contrato-regras");

  const t = { a: "", b: "" };
  let p1 = "";
  let p2 = "";
  let versaoP1 = "";
  let cliente1 = "";
  let cliente2 = "";
  let fase = "";
  let atividade = "";
  let atividadeOutraFase = "";
  let faseP2 = "";
  const hoje = hojeMDY();
  const ok = <T extends { ok: boolean }>(r: T) => {
    if (!r.ok) throw new Error((r as unknown as { error: string }).error);
    return r as T & { ok: true; id: string };
  };

  beforeAll(async () => {
    const [ta] = await db.insert(schema.tenants).values({ name: "nucleo-A" }).returning();
    const [tb] = await db.insert(schema.tenants).values({ name: "nucleo-B" }).returning();
    t.a = ta.id;
    t.b = tb.id;
    const [x1] = await db.insert(schema.projects).values({ tenantId: t.a, name: "Monitoramento Arqueológico" }).returning();
    const [x2] = await db.insert(schema.projects).values({ tenantId: t.a, name: "Licenciamento" }).returning();
    p1 = x1.id;
    p2 = x2.id;
    const [v] = await db.insert(schema.versions).values({ projectId: p1, tenantId: t.a, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
    versaoP1 = v.id;
    const [c1] = await db.insert(schema.clientes).values({ tenantId: t.a, nomeCompleto: "Mineradora Fictícia S.A." }).returning();
    const [c2] = await db.insert(schema.clientes).values({ tenantId: t.a, nomeCompleto: "Concessionária Exemplo" }).returning();
    cliente1 = c1.id;
    cliente2 = c2.id;
    const [f] = await db.insert(schema.projetoFases).values({ tenantId: t.a, projectId: p1, nome: "Campo" }).returning();
    const [f2] = await db.insert(schema.projetoFases).values({ tenantId: t.a, projectId: p1, nome: "Relatório" }).returning();
    const [fp2] = await db.insert(schema.projetoFases).values({ tenantId: t.a, projectId: p2, nome: "Diagnóstico" }).returning();
    fase = f.id;
    faseP2 = fp2.id;
    const [a1] = await db.insert(schema.projetoAtividades).values({ tenantId: t.a, projectId: p1, faseId: f.id, nome: "Prospecção" }).returning();
    const [a2] = await db.insert(schema.projetoAtividades).values({ tenantId: t.a, projectId: p1, faseId: f2.id, nome: "Redação" }).returning();
    atividade = a1.id;
    atividadeOutraFase = a2.id;
    ctxRef.current = { tenant: ta, projects: [x1, x2], userId: null, userEmail: "gestor@a", role: "owner", perms: defaultPermissions("owner") };
    const { garantirModalidades } = await import("@/lib/contrato-modalidades");
    await garantirModalidades(t.a);
  });
  afterAll(async () => {
    for (const id of [t.a, t.b]) if (id) await db.delete(schema.tenants).where(eq(schema.tenants.id, id));
  });

  const novoContrato = async (valor: number, clienteId: string) => {
    const c = ok(await A.salvarContrato({ titulo: `Contrato ${valor}`, valorOriginal: valor, clienteId, projetos: [{ projectId: p1 }] }));
    ok(await A.mudarStatusContrato({ id: c.id, para: "ativo" }));
    return c;
  };

  let cPrincipal = "";
  it("medição: número sequencial por contrato, inclusive com lançamentos simultâneos", async () => {
    const c = await novoContrato(600000, cliente1);
    cPrincipal = c.id;
    const ids = await Promise.all([1, 2, 3, 4, 5].map((n) => A.salvarMedicao({ contratoId: c.id, competencia: "01/2027", valor: 1000 * n })));
    for (const r of ids) ok(r);
    const ms = await db.select({ numero: schema.contratoMedicoes.numero }).from(schema.contratoMedicoes).where(eq(schema.contratoMedicoes.contratoId, c.id));
    expect(ms.map((m) => m.numero).sort()).toEqual([1, 2, 3, 4, 5]);
    // outro contrato recomeça do 1
    const outro = await novoContrato(1000, cliente1);
    const m = ok(await A.salvarMedicao({ contratoId: outro.id, competencia: "01/2027", valor: 100 }));
    const [r] = await db.select({ numero: schema.contratoMedicoes.numero }).from(schema.contratoMedicoes).where(eq(schema.contratoMedicoes.id, m.id));
    expect(r.numero).toBe(1);
    // limpa as cinco (canceladas não contam no saldo)
    for (const x of await db.select({ id: schema.contratoMedicoes.id }).from(schema.contratoMedicoes).where(eq(schema.contratoMedicoes.contratoId, c.id))) ok(await A.mudarStatusMedicao({ id: x.id, para: "cancelada", motivo: "teste" }));
  });

  it("medição: período, aditivo e fase/atividade do plano são validados no servidor", async () => {
    const base = { contratoId: cPrincipal, competencia: "02/2027", valor: 1000, projectId: p1 };
    expect(await A.salvarMedicao({ ...base, periodoInicio: "02/20/2027", periodoFim: "02/01/2027" })).toMatchObject({ ok: false, error: expect.stringMatching(/anterior ao início/) });
    expect(await A.salvarMedicao({ ...base, projetoFaseId: faseP2 })).toMatchObject({ ok: false, error: expect.stringMatching(/Fase não encontrada/) });
    expect(await A.salvarMedicao({ ...base, projetoFaseId: fase, projetoAtividadeId: atividadeOutraFase })).toMatchObject({ ok: false, error: expect.stringMatching(/não é da fase/) });
    expect(await A.salvarMedicao({ contratoId: cPrincipal, competencia: "02/2027", valor: 1000, projetoFaseId: fase })).toMatchObject({ ok: false, error: expect.stringMatching(/escolha o projeto/) });
    const m = ok(await A.salvarMedicao({ ...base, projetoAtividadeId: atividade, periodoInicio: "02/01/2027", periodoFim: "02/28/2027" }));
    const [r] = await db.select().from(schema.contratoMedicoes).where(eq(schema.contratoMedicoes.id, m.id));
    expect(r).toMatchObject({ projetoAtividadeId: atividade, projetoFaseId: fase, periodoInicio: "02/01/2027", periodoFim: "02/28/2027", numero: 6 });
    ok(await A.mudarStatusMedicao({ id: m.id, para: "cancelada", motivo: "teste" }));
  });

  it("os cinco valores pelo fluxo real: 600 contratado, 350 medido, 300 faturado, 250 recebido", async () => {
    const m = ok(await A.salvarMedicao({ contratoId: cPrincipal, competencia: "02/2027", valor: 350000, enviar: true }));
    ok(await A.mudarStatusMedicao({ id: m.id, para: "aprovada" }));
    const f = ok(await A.faturarContrato({ contratoId: cPrincipal, projectId: p1, valor: 300000, vencimento: "03/10/2027", idempotencyKey: `nf-${cPrincipal}` }));
    await db.insert(schema.contaReceberRecebimentos).values({ tenantId: t.a, contaReceberId: f.id, valor: "250000", data: "03/12/2027", forma: "Outro", justificativa: "teste" });
    const d = await Q.detalheDoContrato(t.a, cPrincipal);
    const v = cincoValores(d!.saldo, d!.faturas, "12/31/2027");
    expect(v).toMatchObject({ contratado: 600000, medido: 350000, faturado: 300000, recebido: 250000, saldoAMedir: 250000, medidoNaoFaturado: 50000, faturadoNaoRecebido: 50000, receitaReconhecida: 300000 });
    // antes do vencimento, nada reconhecido
    expect(cincoValores(d!.saldo, d!.faturas, "02/28/2027").receitaReconhecida).toBe(0);
  });

  it("DRE por contrato e por cliente: receita das faturas, custo das despesas apropriadas, sem dupla contagem", async () => {
    const outro = await novoContrato(100000, cliente2);
    ok(await A.faturarContrato({ contratoId: outro.id, projectId: p1, valor: 40000, vencimento: "03/10/2027" }));
    const [d1] = await db.insert(schema.despesas).values({ tenantId: t.a, versionId: versaoP1, numDoc: "D1", valor: "70000.00", competencia: "03/2027", categoriaDre: "Custo Variável", contaCef: "2.1.01" }).returning();
    const [d2] = await db.insert(schema.despesas).values({ tenantId: t.a, versionId: versaoP1, numDoc: "D2", valor: "5000.00", competencia: "03/2027", categoriaDre: "Custo Variável", contaCef: "2.1.01" }).returning();
    await db.insert(schema.despesas).values({ tenantId: t.a, versionId: versaoP1, numDoc: "D3-sem-contrato", valor: "999.00", competencia: "03/2027", categoriaDre: "Custo Variável" });
    ok(await A.apropriarDespesa({ despesaId: d1.id, contratoId: cPrincipal }));
    ok(await A.apropriarDespesa({ despesaId: d2.id, contratoId: outro.id }));
    const r = await R.resultadoPorContratoECliente(t.a, { de: "03/2027", ate: "03/2027" });
    const doPrincipal = r.porContrato.find((x) => x.id === cPrincipal)!;
    expect(doPrincipal.receitaBruta).toBe(300000);
    expect(doPrincipal.resultadoLiquido).toBe(230000);
    const c1 = r.porCliente.find((x) => x.id === cliente1)!;
    const c2 = r.porCliente.find((x) => x.id === cliente2)!;
    expect(c2.receitaBruta).toBe(40000);
    expect(c2.resultadoLiquido).toBe(35000);
    // total = soma dos clientes; a despesa sem contrato não entra (sem rateio arbitrário)
    expect(r.total.receitaBruta).toBe(c1.receitaBruta + c2.receitaBruta);
    expect(r.total.resultadoLiquido).toBe(c1.resultadoLiquido + c2.resultadoLiquido);
    expect(r.total.resultadoLiquido).toBe(300000 + 40000 - 70000 - 5000);
    // fora do período, nada
    const vazio = await R.resultadoPorContratoECliente(t.a, { de: "01/2026", ate: "01/2026" });
    expect(vazio.total.receitaBruta).toBe(0);
  });

  it("reembolso: glosa = solicitado − aprovado; rejeitado = glosa total", async () => {
    const [desp] = await db.insert(schema.despesas).values({ tenantId: t.a, versionId: versaoP1, numDoc: "R1", valor: "1200.00", competencia: "03/2027", obs: "Hospedagem" }).returning();
    const [desp2] = await db.insert(schema.despesas).values({ tenantId: t.a, versionId: versaoP1, numDoc: "R2", valor: "300.00", competencia: "03/2027", obs: "Combustível" }).returning();
    const r1 = ok(await A.incluirReembolso({ contratoId: cPrincipal, despesaId: desp.id }));
    ok(await A.mudarStatusReembolso({ id: r1.id, para: "solicitado" }));
    ok(await A.mudarStatusReembolso({ id: r1.id, para: "aprovado", valorAprovado: 1000 }));
    const r2 = ok(await A.incluirReembolso({ contratoId: cPrincipal, despesaId: desp2.id }));
    ok(await A.mudarStatusReembolso({ id: r2.id, para: "solicitado" }));
    ok(await A.mudarStatusReembolso({ id: r2.id, para: "rejeitado" }));
    const linhas = await Q.relatorioDeReembolsos(t.a, { contratoId: cPrincipal });
    expect(linhas.find((l) => l.id === r1.id)).toMatchObject({ solicitado: 1200, aprovado: 1000, glosa: 200 });
    expect(linhas.find((l) => l.id === r2.id)).toMatchObject({ glosa: 300, pendente: 0 });
  });

  it("relatório de medições: filtro por contrato e competência, totais e saldo a medir", async () => {
    const r = await Q.relatorioDeMedicoes(t.a, { contratoId: cPrincipal, status: "aprovada" });
    expect(r.totais).toMatchObject({ quantidade: 1, aprovado: 350000 });
    expect(r.contrato).toMatchObject({ atualizado: 600000, medidoAprovado: 350000, saldoAMedir: 250000 });
    expect((await Q.relatorioDeMedicoes(t.a, { contratoId: cPrincipal, de: "03/2027" })).totais.quantidade).toBe(0);
    // outra empresa não vê nada
    expect((await Q.relatorioDeMedicoes(t.b, {})).totais.quantidade).toBe(0);
  });

  it("projeção ao término: Orçamento original preservado, previsão para concluir e desvio", async () => {
    const [orc1] = await db.insert(schema.versions).values({ projectId: p2, tenantId: t.a, key: "b1", kind: "budget", label: "Orçamento inicial", color: "#000" }).returning();
    const [orc2] = await db.insert(schema.versions).values({ projectId: p2, tenantId: t.a, key: "b2", kind: "budget", label: "Orçamento revisado", color: "#000", status: "Aprovado" }).returning();
    const [atual] = await db.insert(schema.versions).values({ projectId: p2, tenantId: t.a, key: "a", kind: "atual", label: "Atual", color: "#000" }).returning();
    // Orçamento: linhas de planejamento; Atual: despesas (o mesmo motor da DRE lê os dois)
    const linha = (versionId: string, mes: string, valor: number) => db.insert(schema.budgetLines).values({ tenantId: t.a, versionId, kind: "despesa", rowKey: "2.1", dreCategory: "Custo Variável", mes, valor: String(valor) });
    await linha(orc1.id, "01/2020", 100);
    await linha(orc2.id, "01/2020", 150);
    await db.insert(schema.despesas).values({ tenantId: t.a, versionId: atual.id, valor: "180", competencia: "01/2020", categoriaDre: "Custo Variável", contaCef: "2.1.01" });
    const p = await projecaoDoProjeto(t.a, p2, new Date(2026, 0, 15));
    expect(p!.orcamentoOriginal!.custo).toBe(100);
    expect(p!.orcamentoRevisado!.custo).toBe(150);
    expect(p!.realizadoAteHoje.custo).toBe(180);
    expect(p!.custoEstimadoAoTermino).toBe(180);
    expect(p!.desvioDeCusto).toBe(30);
    expect(p!.versoes).toMatchObject({ original: "Orçamento inicial", revisado: "Orçamento revisado" });
    expect(faseP2).toBeTruthy();
  });
});
