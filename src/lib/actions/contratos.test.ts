import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";

/**
 * Contratos e Aditivos — integração (DATABASE_URL). Cobre a seção 18 do
 * pedido: criação, projetos, guarda-chuva, aditivos, histórico, medições
 * (parciais, acima do limite, após aditivo, concorrência e duplicidade),
 * faturamento (e a leitura da DRE/Fluxo), recebimento parcial, reembolsos,
 * permissões, isolamento entre empresas, cancelamentos e correções.
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

describe.skipIf(!HAS_DB)("Contratos e Aditivos — integração", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const A = await import("./contratos");
  const Q = await import("@/lib/contratos-queries");
  const { getMonthlyRevenue } = await import("@/lib/queries");
  const { hojeMDY } = await import("@/lib/contrato-regras");

  type Ctx = { tenant: { id: string }; projects: { id: string; name: string }[]; userId: null; userEmail: string; role: string; perms: ReturnType<typeof defaultPermissions> };
  const t = { a: "", b: "" };
  let ctxA: Ctx;
  let ctxB: Ctx;
  let p1 = "";
  let p2 = "";
  let pB = "";
  let versaoP1 = "";
  let clienteId = "";
  const como = (c: Ctx, perms?: Partial<Ctx>) => {
    ctxRef.current = { ...c, ...perms };
  };
  const hoje = hojeMDY();
  const ok = <T extends { ok: boolean }>(r: T) => {
    if (!r.ok) throw new Error((r as unknown as { error: string }).error);
    return r as T & { ok: true; id: string };
  };

  beforeAll(async () => {
    const [ta] = await db.insert(schema.tenants).values({ name: "contratos-A" }).returning();
    const [tb] = await db.insert(schema.tenants).values({ name: "contratos-B" }).returning();
    t.a = ta.id;
    t.b = tb.id;
    const [x1] = await db.insert(schema.projects).values({ tenantId: t.a, name: "Monitoramento Arqueológico" }).returning();
    const [x2] = await db.insert(schema.projects).values({ tenantId: t.a, name: "Resgate de Fauna" }).returning();
    const [xb] = await db.insert(schema.projects).values({ tenantId: t.b, name: "Projeto da B" }).returning();
    p1 = x1.id;
    p2 = x2.id;
    pB = xb.id;
    const [v] = await db.insert(schema.versions).values({ projectId: p1, tenantId: t.a, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
    versaoP1 = v.id;
    const [cl] = await db.insert(schema.clientes).values({ tenantId: t.a, nomeCompleto: "Mineradora Fictícia S.A." }).returning();
    clienteId = cl.id;
    ctxA = { tenant: ta, projects: [x1, x2], userId: null, userEmail: "gestor@a", role: "owner", perms: defaultPermissions("owner") };
    ctxB = { tenant: tb, projects: [xb], userId: null, userEmail: "intruso@b", role: "owner", perms: defaultPermissions("owner") };
    const { garantirModalidades } = await import("@/lib/contrato-modalidades");
    await garantirModalidades(t.a);
  });
  afterAll(async () => {
    for (const id of [t.a, t.b]) if (id) await db.delete(schema.tenants).where(eq(schema.tenants.id, id));
  });

  const novoContrato = async (extra: Partial<Parameters<typeof A.salvarContrato>[0]> = {}) =>
    ok(await A.salvarContrato({ titulo: "Contrato de teste", valorOriginal: 500000, clienteId, projetos: [{ projectId: p1 }], ...extra }));
  const ativar = async (id: string) => ok(await A.mudarStatusContrato({ id, para: "ativo" }));
  const assinarAditivo = async (id: string) => {
    ok(await A.mudarStatusAditivo({ id, para: "aguardando_aprovacao" }));
    ok(await A.mudarStatusAditivo({ id, para: "aprovado" }));
    return ok(await A.mudarStatusAditivo({ id, para: "assinado", dataAssinatura: hoje }));
  };

  it("1-3 · cria contrato com cliente e projetos; código sequencial; vários contratos no mesmo projeto", async () => {
    como(ctxA);
    const c1 = await novoContrato({ projetos: [{ projectId: p1, valorAlocado: 300000 }, { projectId: p2, valorAlocado: 200000 }] });
    const c2 = await novoContrato({ titulo: "Segundo contrato do projeto" });
    const [r1] = await db.select().from(schema.contratos).where(eq(schema.contratos.id, c1.id));
    const [r2] = await db.select().from(schema.contratos).where(eq(schema.contratos.id, c2.id));
    expect(r1.codigo).toMatch(/^CT-\d{6}$/);
    expect(Number(r2.codigo.slice(3))).toBe(Number(r1.codigo.slice(3)) + 1);
    expect(r1.clienteId).toBe(clienteId);
    const vinculos = await db.select().from(schema.contratoProjetos).where(eq(schema.contratoProjetos.projectId, p1));
    expect(vinculos.map((v) => v.contratoId).sort()).toEqual([c1.id, c2.id].sort());
    const d = await Q.detalheDoContrato(t.a, c1.id);
    expect(d!.projetos.map((p) => p.nome).sort()).toEqual(["Monitoramento Arqueológico", "Resgate de Fauna"]);
    expect(d!.saldo.alocadoProjetos).toBe(500000);
    const [log] = await db.select().from(schema.auditLog).where(and(eq(schema.auditLog.tenantId, t.a), eq(schema.auditLog.action, "contrato.create"), eq(schema.auditLog.entityId, c1.id)));
    expect(log.meta).toMatchObject({ titulo: "Contrato de teste", valorOriginal: 500000 });
  });

  it("4 · guarda-chuva: derivados que consomem não passam do principal; adicional soma; consolidação sem dupla contagem", async () => {
    como(ctxA);
    const principal = await novoContrato({ titulo: "Guarda-chuva 2027", valorOriginal: 2000000 });
    await ativar(principal.id);
    for (const v of [650000, 480000, 370000]) ok(await A.salvarContrato({ titulo: `OS ${v}`, tipo: "ordem_servico", contratoPrincipalId: principal.id, vinculoValor: "consome_limite", valorOriginal: v, projetos: [{ projectId: p1 }] }));
    const passa = await A.salvarContrato({ titulo: "OS demais", tipo: "ordem_servico", contratoPrincipalId: principal.id, vinculoValor: "consome_limite", valorOriginal: 500000.01 });
    expect(passa).toEqual({ ok: false, error: expect.stringMatching(/saldo do contrato principal/) });
    ok(await A.salvarContrato({ titulo: "Derivado adicional", tipo: "derivado", contratoPrincipalId: principal.id, vinculoValor: "adicional", valorOriginal: 100000 }));
    const d = await Q.detalheDoContrato(t.a, principal.id);
    expect(d!.saldo.comprometido).toBe(1500000);
    expect(d!.saldo.saldoNaoComprometido).toBe(500000);
    expect(d!.consolidado!.valorTotal).toBe(2100000);
    expect(await A.salvarContrato({ titulo: "x", tipo: "derivado", contratoPrincipalId: principal.id, valorOriginal: 1 })).toMatchObject({ ok: false, error: expect.stringMatching(/consome o limite/) });
  });

  it("5-8 · aditivos de acréscimo, redução e prazo; histórico preservado; formalizado não se edita", async () => {
    como(ctxA);
    const c = await novoContrato({ dataInicio: "01/01/2027", dataTerminoPrevista: "12/31/2027" });
    // antes de valer, aditivo não entra
    expect(await A.salvarAditivo({ contratoId: c.id, tipos: ["acrescimo_valor"], valorDelta: 1, justificativa: "x" })).toMatchObject({ ok: false });
    await ativar(c.id);
    // depois de valer, o valor original não muda por edição
    const [atual] = await db.select().from(schema.contratos).where(eq(schema.contratos.id, c.id));
    expect(await A.salvarContrato({ id: c.id, versao: atual.versao, titulo: "x", valorOriginal: 999, clienteId })).toMatchObject({ ok: false, error: expect.stringMatching(/aditivo/) });
    const a1 = ok(await A.salvarAditivo({ contratoId: c.id, tipos: ["acrescimo_valor"], valorDelta: 80000, justificativa: "Ampliação da área" }));
    const a2 = ok(await A.salvarAditivo({ contratoId: c.id, tipos: ["acrescimo_valor", "prorrogacao_prazo"], valorDelta: 35000, novoTermino: "06/30/2028", justificativa: "Nova campanha" }));
    const a3 = ok(await A.salvarAditivo({ contratoId: c.id, tipos: ["reducao_valor"], valorDelta: -15000, justificativa: "Exclusão de relatório" }));
    expect(await A.salvarAditivo({ contratoId: c.id, tipos: ["reducao_valor"], valorDelta: 5, justificativa: "x" })).toMatchObject({ ok: false, error: expect.stringMatching(/negativa/) });
    let d = await Q.detalheDoContrato(t.a, c.id);
    expect(d!.saldo.atualizado).toBe(500000); // nada formalizado ainda
    for (const a of [a1, a2, a3]) await assinarAditivo(a.id);
    d = await Q.detalheDoContrato(t.a, c.id);
    expect(d!.saldo).toMatchObject({ original: 500000, acrescimos: 115000, reducoes: 15000, atualizado: 600000, terminoAtualizado: "06/30/2028" });
    expect(d!.evolucao.map((e) => e.acumulado)).toEqual([500000, 580000, 615000, 600000]);
    const [orig] = await db.select().from(schema.contratos).where(eq(schema.contratos.id, c.id));
    expect(orig.valorOriginal).toBe("500000.00");
    expect(orig.dataTerminoPrevista).toBe("12/31/2027");
    expect(await A.salvarAditivo({ id: a1.id, contratoId: c.id, tipos: ["acrescimo_valor"], valorDelta: 1, justificativa: "x" })).toMatchObject({ ok: false, error: expect.stringMatching(/não se edita/) });
    const logs = await db.select().from(schema.auditLog).where(and(eq(schema.auditLog.tenantId, t.a), eq(schema.auditLog.action, "contrato.aditivo.status"), eq(schema.auditLog.entityId, a1.id)));
    expect(logs.map((l) => (l.meta as { para: string }).para).sort()).toEqual(["aguardando_aprovacao", "aprovado", "assinado"]);
    expect(d!.historico.some((h) => h.action === "contrato.aditivo.create")).toBe(true);
  });

  it("9-11 · medições parciais por item; acima do limite recusada; após aditivo eficaz, aprovada", async () => {
    como(ctxA);
    const c = await novoContrato({ valorOriginal: 500000 });
    const i1 = ok(await A.salvarItem({ contratoId: c.id, codigo: "03", descricao: "Monitoramento arqueológico", quantidade: 1, valorUnitario: 210000, criterioMedicao: "percentual", projectId: p1 }));
    const i2 = ok(await A.salvarItem({ contratoId: c.id, codigo: "02", descricao: "Levantamento de campo", quantidade: 12, valorUnitario: 10000, criterioMedicao: "quantidade" }));
    await ativar(c.id);
    expect(await A.salvarItem({ contratoId: c.id, codigo: "09", descricao: "Novo", quantidade: 1, valorUnitario: 1, criterioMedicao: "entrega" })).toMatchObject({ ok: false, error: expect.stringMatching(/aditivo/) });
    const m1 = ok(await A.salvarMedicao({ contratoId: c.id, itemId: i1.id, competencia: "03/2027", percentual: 40, enviar: true }));
    const m2 = ok(await A.salvarMedicao({ contratoId: c.id, itemId: i1.id, competencia: "04/2027", percentual: 50, enviar: true }));
    ok(await A.mudarStatusMedicao({ id: m1.id, para: "aprovada" }));
    ok(await A.mudarStatusMedicao({ id: m2.id, para: "aprovada" }));
    const [x] = await db.select().from(schema.contratoMedicoes).where(eq(schema.contratoMedicoes.id, m1.id));
    expect(x.valor).toBe("84000.00");
    expect(x.projectId).toBe(p1);
    const m3 = ok(await A.salvarMedicao({ contratoId: c.id, itemId: i1.id, competencia: "05/2027", percentual: 20, enviar: true }));
    expect(m3.aviso).toMatch(/limite do item/);
    expect(await A.mudarStatusMedicao({ id: m3.id, para: "aprovada" })).toMatchObject({ ok: false, error: expect.stringMatching(/limite do item/) });
    // aditivo com variação no item, ainda não eficaz: continua recusada
    const ad = ok(await A.salvarAditivo({ contratoId: c.id, tipos: ["acrescimo_valor"], valorDelta: 42000, justificativa: "Mais campanhas", variacoes: [{ itemId: i1.id, deltaValor: 42000 }] }));
    ok(await A.mudarStatusAditivo({ id: ad.id, para: "aguardando_aprovacao" }));
    ok(await A.mudarStatusAditivo({ id: ad.id, para: "aprovado" }));
    expect(await A.mudarStatusMedicao({ id: m3.id, para: "aprovada" })).toMatchObject({ ok: false });
    ok(await A.mudarStatusAditivo({ id: ad.id, para: "assinado", dataAssinatura: hoje }));
    ok(await A.mudarStatusMedicao({ id: m3.id, para: "aprovada" }));
    const mq = ok(await A.salvarMedicao({ contratoId: c.id, itemId: i2.id, competencia: "05/2027", quantidade: 3, enviar: true }));
    const [q] = await db.select().from(schema.contratoMedicoes).where(eq(schema.contratoMedicoes.id, mq.id));
    expect(q.valor).toBe("30000.00");
    const d = await Q.detalheDoContrato(t.a, c.id);
    expect(d!.itens.find((i) => i.id === i1.id)).toMatchObject({ limite: 252000, medido: 231000, saldo: 21000 });
    expect(d!.saldo.medidoAprovado).toBe(231000);
    expect(d!.saldo.medidoEmAprovacao).toBe(30000);
    // redução que deixaria o item abaixo do já medido não se assina
    const red = ok(await A.salvarAditivo({ contratoId: c.id, tipos: ["reducao_valor"], valorDelta: -30000, justificativa: "Corte", variacoes: [{ itemId: i1.id, deltaValor: -30000 }] }));
    ok(await A.mudarStatusAditivo({ id: red.id, para: "aguardando_aprovacao" }));
    ok(await A.mudarStatusAditivo({ id: red.id, para: "aprovado" }));
    expect(await A.mudarStatusAditivo({ id: red.id, para: "assinado", dataAssinatura: hoje })).toMatchObject({ ok: false, error: expect.stringMatching(/abaixo do já medido/) });
  });

  it("21 · concorrência e duplicidade: aprovações simultâneas não passam do limite; a mesma medição enviada duas vezes entra uma", async () => {
    como(ctxA);
    const c = await novoContrato({ valorOriginal: 100000 });
    await ativar(c.id);
    const ms = [];
    for (let i = 0; i < 4; i++) ms.push(ok(await A.salvarMedicao({ contratoId: c.id, competencia: "06/2027", valor: 40000, enviar: true })));
    const rs = await Promise.all(ms.map((m) => A.mudarStatusMedicao({ id: m.id, para: "aprovada" })));
    expect(rs.filter((r) => r.ok)).toHaveLength(2);
    const aprovadas = await db.select().from(schema.contratoMedicoes).where(and(eq(schema.contratoMedicoes.contratoId, c.id), eq(schema.contratoMedicoes.status, "aprovada")));
    expect(aprovadas.reduce((s, m) => s + Number(m.valor), 0)).toBe(80000);
    const chave = `idem-${c.id}`;
    const [d1, d2] = await Promise.all([1, 2].map(() => A.salvarMedicao({ contratoId: c.id, competencia: "07/2027", valor: 1000, idempotencyKey: chave })));
    expect(d1.ok && d2.ok).toBe(true);
    const comChave = await db.select().from(schema.contratoMedicoes).where(eq(schema.contratoMedicoes.idempotencyKey, chave));
    expect(comChave).toHaveLength(1);
  });

  it("12-13, 17-18 · fatura vira conta a receber do contrato (DRE/Fluxo leem uma vez); recebimento parcial; saldos", async () => {
    como(ctxA);
    const c = await novoContrato({ valorOriginal: 600000 });
    await ativar(c.id);
    const m = ok(await A.salvarMedicao({ contratoId: c.id, competencia: "02/2027", valor: 350000, enviar: true }));
    ok(await A.mudarStatusMedicao({ id: m.id, para: "aprovada" }));
    const antes = await getMonthlyRevenue(versaoP1, p1);
    const chave = `fat-${c.id}`;
    const f1 = ok(await A.faturarContrato({ contratoId: c.id, projectId: p1, valor: 300000, vencimento: "03/10/2027", idempotencyKey: chave }));
    const f1b = ok(await A.faturarContrato({ contratoId: c.id, projectId: p1, valor: 300000, vencimento: "03/10/2027", idempotencyKey: chave }));
    expect(f1b.id).toBe(f1.id);
    expect(f1b.aviso).toMatch(/já tinha sido registrada/);
    // Growth Ambiental: a fatura do contrato entra em Contas a Receber como "Fatura de serviço".
    const [contaDaFatura] = await db.select({ tipo: schema.contasReceber.tipo }).from(schema.contasReceber).where(eq(schema.contasReceber.id, f1.id));
    expect(contaDaFatura.tipo).toBe("Fatura de serviço");
    expect(await A.faturarContrato({ contratoId: c.id, projectId: pB, valor: 1, vencimento: "03/10/2027" })).toMatchObject({ ok: false });
    const depois = await getMonthlyRevenue(versaoP1, p1);
    expect((depois["03/2027"] ?? 0) - (antes["03/2027"] ?? 0)).toBe(300000);
    await db.insert(schema.contaReceberRecebimentos).values({ tenantId: t.a, contaReceberId: f1.id, valor: "250000", data: "03/12/2027", forma: "Outro", justificativa: "teste" });
    await db.insert(schema.contaReceberRecebimentos).values({ tenantId: t.a, contaReceberId: f1.id, valor: "1000", data: "03/12/2027", forma: "Outro", justificativa: "estornado", estornado: true });
    const d = await Q.detalheDoContrato(t.a, c.id);
    expect(d!.saldo).toMatchObject({ atualizado: 600000, medidoAprovado: 350000, faturado: 300000, recebido: 250000, saldoAMedir: 250000, medidoNaoFaturado: 50000, faturadoNaoRecebido: 50000 });
    const p = await Q.painelDeContratos(t.a);
    expect(p.porContrato.find((x) => x.id === c.id)).toMatchObject({ medido: 350000, faturado: 300000 });
  });

  it("14 · despesas reembolsáveis: vínculo com a despesa existente, sem duplicar; ciclo até recebido; relatório", async () => {
    como(ctxA);
    const c = await novoContrato({ valorOriginal: 100000 });
    await ativar(c.id);
    const [desp] = await db.insert(schema.despesas).values({ tenantId: t.a, versionId: versaoP1, numDoc: "PED-T1", valor: "1200.00", competencia: "02/2027", obs: "Hospedagem em campo" }).returning();
    const r = ok(await A.incluirReembolso({ contratoId: c.id, despesaId: desp.id }));
    expect(await A.incluirReembolso({ contratoId: c.id, despesaId: desp.id })).toMatchObject({ ok: false, error: expect.stringMatching(/já está em um reembolso/) });
    expect(await A.incluirReembolso({ contratoId: c.id, despesaId: desp.id, valorSolicitado: 5000 })).toMatchObject({ ok: false });
    const [apropriada] = await db.select().from(schema.despesas).where(eq(schema.despesas.id, desp.id));
    expect(apropriada.contratoId).toBe(c.id);
    expect(await A.mudarStatusReembolso({ id: r.id, para: "recebido" })).toMatchObject({ ok: false });
    ok(await A.mudarStatusReembolso({ id: r.id, para: "solicitado" }));
    ok(await A.mudarStatusReembolso({ id: r.id, para: "aprovado", valorAprovado: 1000 }));
    expect(await A.mudarStatusReembolso({ id: r.id, para: "faturado" })).toMatchObject({ ok: false, error: expect.stringMatching(/conta a receber/) });
    const outro = await novoContrato({ valorOriginal: 1 });
    await ativar(outro.id);
    const contaDeOutro = ok(await A.faturarContrato({ contratoId: outro.id, projectId: p1, valor: 1, vencimento: "03/10/2027" }));
    expect(await A.mudarStatusReembolso({ id: r.id, para: "faturado", contaReceberId: contaDeOutro.id })).toMatchObject({ ok: false, error: expect.stringMatching(/deste contrato/) });
    const fat = ok(await A.faturarContrato({ contratoId: c.id, projectId: p1, valor: 1000, vencimento: "03/10/2027", descricao: "Reembolso de despesas" }));
    ok(await A.mudarStatusReembolso({ id: r.id, para: "faturado", contaReceberId: fat.id }));
    ok(await A.mudarStatusReembolso({ id: r.id, para: "recebido" }));
    const rel = await Q.relatorioDeReembolsos(t.a, { contratoId: c.id, de: "01/2027", ate: "12/2027" });
    expect(rel).toHaveLength(1);
    expect(rel[0]).toMatchObject({ numDoc: "PED-T1", solicitado: 1200, aprovado: 1000, recebido: 1000, pendente: 0, status: "recebido" });
    expect(await Q.relatorioDeReembolsos(t.a, { contratoId: c.id, de: "01/2028" })).toHaveLength(0);
  });

  it("19 · permissões: membro não aprova; contador não cria; quem não aprova não cancela aditivo formalizado", async () => {
    const membro = { ...ctxA, role: "membro", perms: defaultPermissions("membro" as never) };
    const contador = { ...ctxA, role: "contador", perms: defaultPermissions("contador" as never) };
    como(ctxA);
    const c = await novoContrato();
    await ativar(c.id);
    const m = ok(await A.salvarMedicao({ contratoId: c.id, competencia: "02/2027", valor: 1000, enviar: true }));
    const ad = ok(await A.salvarAditivo({ contratoId: c.id, tipos: ["acrescimo_valor"], valorDelta: 10, justificativa: "x" }));
    await assinarAditivo(ad.id);
    como(membro as Ctx);
    expect(membro.perms.contratosaprovar.editar).toBe(false);
    expect(await A.mudarStatusMedicao({ id: m.id, para: "aprovada" })).toMatchObject({ ok: false, error: expect.stringMatching(/Só quem aprova/) });
    expect(await A.mudarStatusAditivo({ id: ad.id, para: "cancelado", motivo: "erro" })).toMatchObject({ ok: false, error: expect.stringMatching(/Só quem aprova/) });
    como(contador as Ctx);
    expect(await A.salvarContrato({ titulo: "x", valorOriginal: 1 })).toMatchObject({ ok: false, error: expect.stringMatching(/permissão/) });
    ctxRef.current = null;
    expect(await A.salvarContrato({ titulo: "x", valorOriginal: 1 })).toMatchObject({ ok: false, error: expect.stringMatching(/Sessão/) });
  });

  it("20 · isolamento: a empresa B não lê nem altera nada da A, mesmo com os ids", async () => {
    como(ctxA);
    const c = await novoContrato();
    const item = ok(await A.salvarItem({ contratoId: c.id, codigo: "01", descricao: "Mobilização", quantidade: 1, valorUnitario: 40000, criterioMedicao: "entrega" }));
    await ativar(c.id);
    const m = ok(await A.salvarMedicao({ contratoId: c.id, itemId: item.id, competencia: "02/2027", valor: 1000, enviar: true }));
    const ad = ok(await A.salvarAditivo({ contratoId: c.id, tipos: ["acrescimo_valor"], valorDelta: 10, justificativa: "x" }));
    como(ctxB);
    expect(await Q.detalheDoContrato(t.b, c.id)).toBeNull();
    expect((await Q.listarContratos(t.b)).some((l) => l.id === c.id)).toBe(false);
    const nao = /não encontrad/;
    expect(await A.salvarContrato({ id: c.id, titulo: "invadido", valorOriginal: 1 })).toMatchObject({ ok: false, error: expect.stringMatching(nao) });
    expect(await A.mudarStatusContrato({ id: c.id, para: "suspenso", motivo: "x" })).toMatchObject({ ok: false, error: expect.stringMatching(nao) });
    expect(await A.salvarItem({ contratoId: c.id, codigo: "99", descricao: "x", quantidade: 1, valorUnitario: 1, criterioMedicao: "entrega" })).toMatchObject({ ok: false, error: expect.stringMatching(nao) });
    expect(await A.salvarMedicao({ contratoId: c.id, competencia: "02/2027", valor: 1 })).toMatchObject({ ok: false, error: expect.stringMatching(nao) });
    expect(await A.mudarStatusMedicao({ id: m.id, para: "aprovada" })).toMatchObject({ ok: false, error: expect.stringMatching(nao) });
    expect(await A.mudarStatusAditivo({ id: ad.id, para: "cancelado", motivo: "x" })).toMatchObject({ ok: false, error: expect.stringMatching(nao) });
    expect(await A.faturarContrato({ contratoId: c.id, projectId: pB, valor: 1, vencimento: "03/10/2027" })).toMatchObject({ ok: false, error: expect.stringMatching(nao) });
    expect(await A.vincularProjetos({ contratoId: c.id, projetos: [{ projectId: pB }] })).toMatchObject({ ok: false, error: expect.stringMatching(nao) });
    expect(await A.salvarContrato({ titulo: "B usando cliente da A", valorOriginal: 1, clienteId })).toMatchObject({ ok: false, error: expect.stringMatching(/Cliente não encontrado/) });
    expect(await A.salvarContrato({ titulo: "B com projeto da A", valorOriginal: 1, projetos: [{ projectId: p1 }] })).toMatchObject({ ok: false, error: expect.stringMatching(/Projeto inválido/) });
    const [intacto] = await db.select().from(schema.contratos).where(eq(schema.contratos.id, c.id));
    expect(intacto.titulo).toBe("Contrato de teste");
    expect(intacto.status).toBe("ativo");
  });

  it("22 · cancelamentos e correções: aditivo assinado sai só por cancelamento motivado; contrato com medição aprovada não se cancela; concorrência otimista no cadastro", async () => {
    como(ctxA);
    const c = await novoContrato({ valorOriginal: 1000 });
    await ativar(c.id);
    const ad = ok(await A.salvarAditivo({ contratoId: c.id, tipos: ["acrescimo_valor"], valorDelta: 500, justificativa: "x" }));
    await assinarAditivo(ad.id);
    expect((await Q.detalheDoContrato(t.a, c.id))!.saldo.atualizado).toBe(1500);
    expect(await A.mudarStatusAditivo({ id: ad.id, para: "cancelado" })).toMatchObject({ ok: false, error: expect.stringMatching(/motivo/) });
    const m = ok(await A.salvarMedicao({ contratoId: c.id, competencia: "02/2027", valor: 1200, enviar: true }));
    ok(await A.mudarStatusMedicao({ id: m.id, para: "aprovada" }));
    expect(await A.mudarStatusAditivo({ id: ad.id, para: "cancelado", motivo: "Assinado por engano" })).toMatchObject({ ok: false, error: expect.stringMatching(/abaixo do já medido/) });
    expect(await A.mudarStatusContrato({ id: c.id, para: "cancelado", motivo: "x" })).toMatchObject({ ok: false, error: expect.stringMatching(/medições aprovadas/) });
    ok(await A.mudarStatusMedicao({ id: m.id, para: "cancelada", motivo: "Medição duplicada" }));
    ok(await A.mudarStatusAditivo({ id: ad.id, para: "cancelado", motivo: "Assinado por engano" }));
    const d = await Q.detalheDoContrato(t.a, c.id);
    expect(d!.saldo.atualizado).toBe(1000);
    expect(d!.aditivos.find((a) => a.id === ad.id)).toMatchObject({ status: "cancelado", motivoStatus: "Assinado por engano" });
    const [r] = await db.select().from(schema.contratos).where(eq(schema.contratos.id, c.id));
    ok(await A.salvarContrato({ id: c.id, versao: r.versao, titulo: "Renomeado", valorOriginal: 1000, clienteId }));
    expect(await A.salvarContrato({ id: c.id, versao: r.versao, titulo: "Outra edição", valorOriginal: 1000, clienteId })).toMatchObject({ ok: false, error: expect.stringMatching(/outra pessoa/) });
  });

  it("15-18 · Orçamento, Previsão e Realizado pelo motor da DRE; apropriar custo ao contrato não muda a DRE nem duplica", async () => {
    como(ctxA);
    const [p3] = await db.insert(schema.projects).values({ tenantId: t.a, name: "Projeto planejado" }).returning();
    ctxA.projects.push(p3);
    const [vb] = await db.insert(schema.versions).values({ projectId: p3.id, tenantId: t.a, key: "budget", kind: "budget", label: "Orçamento", color: "#000", isDefault: true }).returning();
    const [vf] = await db.insert(schema.versions).values({ projectId: p3.id, tenantId: t.a, key: "forecast", kind: "forecast", label: "Previsão", color: "#000" }).returning();
    const [va] = await db.insert(schema.versions).values({ projectId: p3.id, tenantId: t.a, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
    await db.insert(schema.budgetLines).values([
      { tenantId: t.a, versionId: vb.id, kind: "receita", rowKey: "Outros", dreCategory: "Receita", mes: "03/2027", valor: "100000" },
      { tenantId: t.a, versionId: vb.id, kind: "despesa", rowKey: "1", dreCategory: "Custo Variável", mes: "03/2027", valor: "60000" },
      { tenantId: t.a, versionId: vf.id, kind: "receita", rowKey: "Outros", dreCategory: "Receita", mes: "03/2027", valor: "110000" },
      { tenantId: t.a, versionId: vf.id, kind: "despesa", rowKey: "1", dreCategory: "Custo Variável", mes: "03/2027", valor: "70000" },
    ]);
    const c = await novoContrato({ valorOriginal: 100000, projetos: [{ projectId: p3.id }] });
    await ativar(c.id);
    const [desp] = await db.insert(schema.despesas).values({ tenantId: t.a, versionId: va.id, numDoc: "PED-P3", valor: "65000.00", competencia: "03/2027", categoriaDre: "Custo Variável", contaCef: "1.1" }).returning();
    const plan0 = (await Q.planejamentoDosProjetos(t.a, [{ projectId: p3.id, nome: p3.name }]))[0];
    ok(await A.apropriarDespesa({ despesaId: desp.id, contratoId: c.id }));
    ok(await A.faturarContrato({ contratoId: c.id, projectId: p3.id, valor: 100000, vencimento: "03/20/2027" }));
    const [plan] = await Q.planejamentoDosProjetos(t.a, [{ projectId: p3.id, nome: p3.name }]);
    expect(plan.orcamento).toEqual({ receita: 100000, custos: 60000, margem: 40000 });
    expect(plan.previsao).toEqual({ receita: 110000, custos: 70000, margem: 40000 });
    expect(plan.realizado).toMatchObject({ custos: 65000, receita: 100000 });
    expect(plan0.realizado?.custos).toBe(65000); // apropriar não mexe no custo da DRE
    const d = await Q.detalheDoContrato(t.a, c.id);
    expect(d!.resultado.custoRealizado).toBe(65000);
    expect(d!.resultado.margemSobreFaturado).toBe(35000);
    // despesa de projeto que não é do contrato não se apropria
    const [alheia] = await db.insert(schema.despesas).values({ tenantId: t.a, versionId: versaoP1, numDoc: "PED-P1", valor: "1.00" }).returning();
    expect(await A.apropriarDespesa({ despesaId: alheia.id, contratoId: c.id })).toMatchObject({ ok: false, error: expect.stringMatching(/não está vinculado/) });
  });

  it("Cris · ferramenta de leitura de contratos respeita permissões, acesso financeiro, dado pessoal e empresa", async () => {
    const { executarFerramentaDeDados } = await import("@/lib/cris-dados");
    como(ctxA);
    const [pf] = await db.insert(schema.clientes).values({ tenantId: t.a, nomeCompleto: "Fulano Pessoa Física", cpfCnpj: "123.456.789-09" }).returning();
    const [pj] = await db.insert(schema.clientes).values({ tenantId: t.a, nomeCompleto: "Consórcio Fictício Ltda", cpfCnpj: "12.345.678/0001-90" }).returning();
    const cPf = await novoContrato({ titulo: "Contrato PF para a Cris", clienteId: pf.id });
    const cPj = await novoContrato({ titulo: "Contrato PJ para a Cris", clienteId: pj.id });
    const ler = async (ctx: unknown, entrada: object) => JSON.parse(await executarFerramentaDeDados(ctx as never, "contratos_e_saldos", entrada));
    const r = await ler(ctxA, { contratos: ["para a Cris"], assunto: "resumo", somente: "todos" });
    const porTitulo = Object.fromEntries(r.contratos.map((x: { titulo: string }) => [x.titulo, x]));
    expect(porTitulo["Contrato PJ para a Cris"].cliente).toBe("Consórcio Fictício Ltda");
    expect(porTitulo["Contrato PF para a Cris"].cliente).toBe("cliente pessoa física");
    expect(JSON.stringify(r)).not.toContain("Fulano");
    expect(porTitulo["Contrato PJ para a Cris"]).toHaveProperty("faturado");
    const semFin = { ...ctxA, perms: { ...ctxA.perms, contratosfinanceiro: { ver: false, criar: false, editar: false, excluir: false } } };
    const r2 = await ler(semFin, { contratos: ["para a Cris"], assunto: "financeiro", somente: "todos" });
    expect(r2.contratos[0]).not.toHaveProperty("faturado");
    expect(r2.erro).toMatch(/Sem acesso financeiro/);
    const semVer = { ...ctxA, perms: { ...ctxA.perms, contratos: { ver: false, criar: false, editar: false, excluir: false } } };
    expect((await ler(semVer, { contratos: [], assunto: "resumo", somente: "todos" })).erro).toMatch(/não tem acesso/);
    const rB = await ler(ctxB, { contratos: [cPf.id, "para a Cris"], assunto: "aditivos", somente: "todos" });
    expect(rB.contratos).toEqual([]);
    expect(cPj.id).toBeTruthy();
  });

  it("modalidades: configuráveis por empresa, nome único", async () => {
    como(ctxA);
    const mods = await db.select().from(schema.contratoModalidades).where(eq(schema.contratoModalidades.tenantId, t.a));
    expect(mods.length).toBe(13);
    const nova = ok(await A.salvarModalidade({ nome: "Paleontologia" }));
    expect(await A.salvarModalidade({ nome: "Paleontologia" })).toMatchObject({ ok: false, error: expect.stringMatching(/Já existe/) });
    ok(await A.salvarModalidade({ id: nova.id, nome: "Paleontologia", ativo: false }));
    como(ctxB);
    expect(await A.salvarModalidade({ id: nova.id, nome: "Sequestro", ativo: true })).toMatchObject({ ok: false, error: expect.stringMatching(/não encontrada/) });
  });
});
