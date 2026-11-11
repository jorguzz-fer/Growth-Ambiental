import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq, and } from "drizzle-orm";

/** Prompt L, Parte 2 — vínculo com valor. Integração (precisa de DATABASE_URL). */
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

describe.skipIf(!HAS_DB)("Conciliação com valor (Prompt L, Parte 2)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  type PermMatrix = ReturnType<typeof defaultPermissions>;
  const { conciliarMovimento, conciliarDespesa, desfazerConciliacao, toggleConciliado, importCash } = await import("./caixa");
  const { getConciliacaoData } = await import("@/lib/queries");
  let tenant: typeof schema.tenants.$inferSelect;
  const proj: Record<string, { id: string; versionId: string }> = {};
  const despesa = async (chave: string, valor: number, obs: string, competencia = "09/2026") => {
    const [d] = await db.insert(schema.despesas).values({ versionId: proj[chave].versionId, tenantId: tenant.id, valor: String(valor), categoriaDre: "Custo Variável", competencia, vencimento: "09/10/2026", status: "A pagar", obs, numDoc: `PED-${obs}` }).returning();
    return d;
  };
  const movimento = async (chave: string, valor: number, data = "09/12/2026", descricao = "TED FORNECEDOR") => {
    const [m] = await db.insert(schema.cashEntries).values({ versionId: proj[chave].versionId, tenantId: tenant.id, data, descricao, valor: String(valor), cat: "extrato", importHash: `h-${Math.random()}`, rec: false }).returning();
    return m;
  };
  const ctxDe = (perms: PermMatrix) => ({ tenant, projects: Object.values(proj).map((p) => ({ id: p.id })), userId: null, userEmail: "l2@teste", role: "owner", perms });

  beforeAll(async () => {
    [tenant] = await db.insert(schema.tenants).values({ name: "concil-L2" }).returning();
    for (const k of ["a", "b", "c"]) {
      const [p] = await db.insert(schema.projects).values({ tenantId: tenant.id, name: `OBRA ${k}` }).returning();
      const [v] = await db.insert(schema.versions).values({ projectId: p.id, tenantId: tenant.id, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
      proj[k] = { id: p.id, versionId: v.id };
    }
    ctxRef.current = ctxDe(defaultPermissions("owner"));
  });
  afterAll(async () => {
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenant.id));
  });

  it("10 / 11 — R$ 1.000 numa despesa de R$ 5.000 NÃO marca paga; o movimento fica parcial até a soma fechar", async () => {
    const d = await despesa("a", 5000, "grande");
    const m = await movimento("a", -1000);
    const r = await conciliarMovimento({ cashEntryId: m.id, itens: [{ despesaId: d.id, valor: 1000 }] });
    expect(r).toEqual({ ok: true, concluida: true, soma: 1000 }); // o movimento de 1.000 fecha com 1.000
    const [dd] = await db.select().from(schema.despesas).where(eq(schema.despesas.id, d.id));
    expect(dd.status).toBe("Parcialmente paga"); // BL-3: derivado
    const pags = await db.select().from(schema.pagamentos).where(eq(schema.pagamentos.despesaId, d.id));
    expect(pags.map((p) => Number(p.valorTotalPago))).toEqual([1000]);
    // conciliar a MESMA despesa num segundo movimento de 2.000 informando 2.500 excede o saldo? não: saldo 4.000. Excede o movimento:
    const m2 = await movimento("a", -2000, "09/13/2026");
    expect(await conciliarMovimento({ cashEntryId: m2.id, itens: [{ despesaId: d.id, valor: 2500 }] })).toMatchObject({ ok: false, error: expect.stringMatching(/excede o valor do movimento/) });
    // parcial: 1.500 de 2.000 → não conclui
    const r2 = await conciliarMovimento({ cashEntryId: m2.id, itens: [{ despesaId: d.id, valor: 1500 }] });
    expect(r2).toEqual({ ok: true, concluida: false, soma: 1500 });
    const [mm] = await db.select().from(schema.cashEntries).where(eq(schema.cashEntries.id, m2.id));
    expect(mm.rec).toBe(false);
    const data = await getConciliacaoData(tenant.id, proj.a.versionId);
    expect(data.pendentes.find((p) => p.cashEntryId === m2.id)?.vinculado).toBe(1500);
    // completa com outra despesa: 500 → conclui
    const d2 = await despesa("a", 500, "pequena");
    expect(await conciliarMovimento({ cashEntryId: m2.id, itens: [{ despesaId: d2.id, valor: 500 }] })).toEqual({ ok: true, concluida: true, soma: 2000 });
    expect((await db.select().from(schema.cashEntries).where(eq(schema.cashEntries.id, m2.id)))[0].rec).toBe(true);
    expect((await db.select().from(schema.despesas).where(eq(schema.despesas.id, d2.id)))[0].status).toBe("Pago");
  });

  it("8 — um pagamento quita seis despesas de três obras", async () => {
    const ds = await Promise.all([despesa("a", 100, "s1"), despesa("a", 100, "s2"), despesa("b", 100, "s3"), despesa("b", 100, "s4"), despesa("c", 100, "s5"), despesa("c", 100, "s6")]);
    const m = await movimento("a", -600, "09/14/2026");
    const r = await conciliarMovimento({ cashEntryId: m.id, itens: ds.map((d) => ({ despesaId: d.id, valor: 100 })) });
    expect(r).toEqual({ ok: true, concluida: true, soma: 600 });
    for (const d of ds) expect((await db.select().from(schema.despesas).where(eq(schema.despesas.id, d.id)))[0].status).toBe("Pago");
    expect((await db.select().from(schema.conciliacoesDespesa).where(eq(schema.conciliacoesDespesa.cashEntryId, m.id))).length).toBe(6);
  });

  it("17 — desfazer exige permissão própria, preserva o movimento, remove os pagamentos do vínculo e recalcula o status", async () => {
    const d = await despesa("b", 300, "undo");
    const m = await movimento("b", -300, "09/15/2026");
    expect(await conciliarMovimento({ cashEntryId: m.id, itens: [{ despesaId: d.id, valor: 300 }] })).toMatchObject({ ok: true, concluida: true });
    // quem edita mas não tem "conciliacao:excluir" fica bloqueado, com a mensagem dizendo qual permissão
    const perms = defaultPermissions("owner");
    perms.conciliacao = { ver: true, criar: true, editar: true, excluir: false };
    ctxRef.current = ctxDe(perms);
    await expect(desfazerConciliacao(m.id, "teste")).rejects.toThrow(/Conciliação — ajustar e desfazer: excluir/);
    ctxRef.current = ctxDe(defaultPermissions("owner"));
    await desfazerConciliacao(m.id, "lançado na despesa errada");
    const [mm] = await db.select().from(schema.cashEntries).where(eq(schema.cashEntries.id, m.id));
    expect(mm).toMatchObject({ rec: false, conciliadoDespesaId: null });
    expect(Number(mm.valor)).toBe(-300); // movimento preservado
    expect((await db.select().from(schema.despesas).where(eq(schema.despesas.id, d.id)))[0].status).toBe("A pagar");
    expect((await db.select().from(schema.pagamentos).where(eq(schema.pagamentos.despesaId, d.id))).length).toBe(0);
    const [v] = await db.select().from(schema.conciliacoesDespesa).where(eq(schema.conciliacoesDespesa.cashEntryId, m.id));
    expect(v).toMatchObject({ desfeito: true, motivoDesfazer: "lançado na despesa errada" });
    const logs = await db.select().from(schema.auditLog).where(and(eq(schema.auditLog.entityId, m.id), eq(schema.auditLog.action, "conciliacao.undo")));
    expect(logs).toHaveLength(1);
  });

  it("12 — toggleConciliado valida tenant e versão congelada, audita, e com contraparte grava o vínculo", async () => {
    const d = await despesa("c", 50, "toggle");
    const m = await movimento("c", -50, "09/16/2026");
    await db.update(schema.versions).set({ locked: true }).where(eq(schema.versions.id, proj.c.versionId));
    await expect(toggleConciliado(m.id, true)).rejects.toThrow(/congelada/);
    await db.update(schema.versions).set({ locked: false }).where(eq(schema.versions.id, proj.c.versionId));
    await expect(toggleConciliado("00000000-0000-0000-0000-000000000000", true)).rejects.toThrow(/não encontrado/);
    await toggleConciliado(m.id, true, { despesaId: d.id });
    const [mm] = await db.select().from(schema.cashEntries).where(eq(schema.cashEntries.id, m.id));
    expect(mm.rec).toBe(true);
    expect((await db.select().from(schema.conciliacoesDespesa).where(eq(schema.conciliacoesDespesa.cashEntryId, m.id))).length).toBe(1);
    expect((await db.select().from(schema.despesas).where(eq(schema.despesas.id, d.id)))[0].status).toBe("Pago");
  });

  it("AT-T4 — conciliar sem contraparte é recusado; desfazer funciona, com motivo", async () => {
    const m = await movimento("c", -88, "09/18/2026");
    await expect(toggleConciliado(m.id, true)).rejects.toThrow(/diga com o quê o movimento casou/);
    await expect(toggleConciliado(m.id, true, null)).rejects.toThrow(/diga com o quê/);
    expect((await db.select().from(schema.cashEntries).where(eq(schema.cashEntries.id, m.id)))[0].rec).toBe(false);
    // movimento que já estava marcado sem vínculo: desfazer sem motivo é recusado; com motivo, desfaz e audita
    await db.update(schema.cashEntries).set({ rec: true }).where(eq(schema.cashEntries.id, m.id));
    await expect(toggleConciliado(m.id, false)).rejects.toThrow(/motivo/);
    await expect(toggleConciliado(m.id, false, null, "   ")).rejects.toThrow(/motivo/);
    expect((await db.select().from(schema.cashEntries).where(eq(schema.cashEntries.id, m.id)))[0].rec).toBe(true);
    await toggleConciliado(m.id, false, null, "sem documento que comprove");
    expect((await db.select().from(schema.cashEntries).where(eq(schema.cashEntries.id, m.id)))[0].rec).toBe(false);
    const log = await db.select().from(schema.auditLog).where(and(eq(schema.auditLog.tenantId, tenant.id), eq(schema.auditLog.action, "conciliacao.flag"), eq(schema.auditLog.entityId, m.id)));
    expect(log.map((l) => l.meta)).toEqual([expect.objectContaining({ para: false, motivo: "sem documento que comprove" })]);
  });

  it("19 — rec sem vínculo (BL-2) aparece como estado próprio na lista de conferência", async () => {
    const m = await movimento("c", -77, "09/17/2026");
    // marca antiga, sem contraparte: o caminho que a criava foi fechado (Prompt AT §2.2); o estado continua existindo
    await db.update(schema.cashEntries).set({ rec: true }).where(eq(schema.cashEntries.id, m.id));
    const data = await getConciliacaoData(tenant.id, proj.c.versionId);
    expect(data.conciliados.find((c) => c.cashEntryId === m.id)).toMatchObject({ semVinculo: true, vinculos: [] });
  });

  it("13 — importação: correspondência inequívoca grava o vínculo com rastro; mais de um candidato só propõe", async () => {
    await despesa("b", 333, "unica", "10/2026");
    await despesa("b", 444, "dupla1", "10/2026");
    await despesa("b", 444, "dupla2", "10/2026");
    const r = await importCash({ projectId: proj.b.id, rows: [{ data: "10/03/2026", descricao: "PAG UNICA", valor: -333, doc: "i1" }, { data: "10/04/2026", descricao: "PAG DUPLA", valor: -444, doc: "i2" }] });
    expect(r.inserted).toBe(2);
    expect(r.conciliated).toBe(1);
    const movs = await db.select().from(schema.cashEntries).where(and(eq(schema.cashEntries.versionId, proj.b.versionId), eq(schema.cashEntries.cat, "despesa")));
    const unica = movs.find((x) => x.doc === "i1")!;
    const dupla = movs.find((x) => x.doc === "i2");
    expect(unica.rec).toBe(true);
    const [v] = await db.select().from(schema.conciliacoesDespesa).where(eq(schema.conciliacoesDespesa.cashEntryId, unica.id));
    expect(v).toMatchObject({ origem: "importacao" });
    expect(Number(v.valor)).toBe(333);
    expect(dupla).toBeUndefined(); // ficou "extrato" pendente: proposta, não marca
    const pend = (await db.select().from(schema.cashEntries).where(and(eq(schema.cashEntries.versionId, proj.b.versionId), eq(schema.cashEntries.doc, "i2"))))[0];
    expect(pend.rec).toBe(false);
    expect((await getConciliacaoData(tenant.id, proj.b.versionId)).pendentes.find((p) => p.cashEntryId === pend.id)?.sugestoes.length).toBe(2);
  });

  it("conciliarDespesa (caminho antigo) agora limita ao menor entre o livre do movimento e o saldo da despesa", async () => {
    const d = await despesa("a", 5000, "antigo");
    const m = await movimento("a", -1000, "09/18/2026");
    await conciliarDespesa({ cashEntryId: m.id, despesaId: d.id });
    expect((await db.select().from(schema.despesas).where(eq(schema.despesas.id, d.id)))[0].status).toBe("Parcialmente paga");
  });
});
