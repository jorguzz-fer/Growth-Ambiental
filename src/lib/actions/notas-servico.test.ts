import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { and, count, eq } from "drizzle-orm";

/** Prompt AG, PR 2 — o rascunho da NFS-e. Integração: só com DATABASE_URL. */
const HAS_DB = !!process.env.DATABASE_URL;
const ctxRef: { current: unknown } = { current: null };
vi.mock("@/lib/context", async (orig) => ({
  ...(await orig<typeof import("@/lib/context")>()),
  getTenantContext: async () => ctxRef.current,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));

describe.skipIf(!HAS_DB)("Prompt AG · rascunho da nota de serviço", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { salvarRascunhoDeNota } = await import("./notas-servico");
  let tenantId = "";
  const obra = { id: "", name: "OBRA NF" };
  const semAtual = { id: "", name: "OBRA SEM ATUAL" };
  const outra = { id: "", name: "OUTRA OBRA" };
  let contaDaObra = "";
  let contaDeOutra = "";
  const como = (role: "owner" | "contador" | "membro") =>
    (ctxRef.current = { tenant: { id: tenantId, name: "t", fiscalAmbiente: "homologacao" }, projects: [obra, semAtual, outra], userId: null, userEmail: "t@t", role, perms: defaultPermissions(role) });
  const fd = (o: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) f.set(k, v);
    return f;
  };
  const base = { projectId: "", discriminacao: "Administração de obra", valorServicos: "10.000,00", aliquotaIss: "3", tomadorCpfCnpj: "11.222.333/0001-81", tomadorNome: "Tomador" };
  const contagens = async () => {
    const n = async (t: typeof schema.contasReceber | typeof schema.despesas | typeof schema.cashEntries) =>
      Number((await db.select({ n: count() }).from(t).where(eq(t.tenantId, tenantId)))[0].n);
    return { contas: await n(schema.contasReceber), despesas: await n(schema.despesas), caixa: await n(schema.cashEntries) };
  };

  beforeAll(async () => {
    tenantId = (await db.insert(schema.tenants).values({ name: "tenant-nfse" }).returning())[0].id;
    for (const p of [obra, semAtual, outra]) p.id = (await db.insert(schema.projects).values({ tenantId, name: p.name }).returning())[0].id;
    for (const p of [obra, outra]) await db.insert(schema.versions).values({ projectId: p.id, tenantId, key: "atual", kind: "atual", label: "Atual", color: "#000" });
    contaDaObra = (await db.insert(schema.contasReceber).values({ tenantId, projectId: obra.id, valor: "10000", status: "A receber" }).returning())[0].id;
    contaDeOutra = (await db.insert(schema.contasReceber).values({ tenantId, projectId: outra.id, valor: "5", status: "A receber" }).returning())[0].id;
    base.projectId = obra.id;
  });
  afterAll(async () => {
    if (tenantId) await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("cria o rascunho na versão Atual, com o histórico — e NÃO cria receita, conta nem caixa (BAG-2)", async () => {
    como("owner");
    const antes = await contagens();
    const r = await salvarRascunhoDeNota(fd({ ...base, contaReceberId: contaDaObra, ret_inss: "11", ret_inss_base: "4.000" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [n] = await db.select().from(schema.notasServico).where(eq(schema.notasServico.id, r.id));
    expect(n).toMatchObject({ status: "rascunho", ambiente: "homologacao", valorServicos: "10000.00", aliquotaIss: "3.0000", tomadorCpfCnpj: "11222333000181", contaReceberId: contaDaObra, ref: null });
    expect(n.retencoes).toEqual({ inss: { aliquota: 11, base: 4000 } });
    const evs = await db.select().from(schema.notaServicoEventos).where(eq(schema.notaServicoEventos.notaId, r.id));
    expect(evs.map((e) => e.tipo)).toEqual(["criada"]);
    expect(await contagens()).toEqual(antes);
    // a conta a receber apontada não mudou
    const [cr] = await db.select().from(schema.contasReceber).where(eq(schema.contasReceber.id, contaDaObra));
    expect(cr).toMatchObject({ valor: "10000.00", status: "A receber" });
  });

  it("corrige o rascunho; depois de enviada (processando), não edita mais", async () => {
    como("owner");
    const r = await salvarRascunhoDeNota(fd(base));
    if (!r.ok) throw new Error(r.error);
    expect((await salvarRascunhoDeNota(fd({ ...base, id: r.id, valorServicos: "12000" }))).ok).toBe(true);
    const [n] = await db.select().from(schema.notasServico).where(eq(schema.notasServico.id, r.id));
    expect(n.valorServicos).toBe("12000.00");
    await db.update(schema.notasServico).set({ status: "processando" }).where(eq(schema.notasServico.id, r.id));
    const recusa = await salvarRascunhoDeNota(fd({ ...base, id: r.id, valorServicos: "1" }));
    expect(recusa).toMatchObject({ ok: false, error: expect.stringContaining("já foi enviada") });
    const [igual] = await db.select().from(schema.notasServico).where(eq(schema.notasServico.id, r.id));
    expect(igual.valorServicos).toBe("12000.00");
  });

  it("recusas: conta a receber de outra obra, obra sem Atual, valor inválido", async () => {
    como("owner");
    expect(await salvarRascunhoDeNota(fd({ ...base, contaReceberId: contaDeOutra }))).toMatchObject({ ok: false, error: expect.stringContaining("não é deste projeto") });
    expect(await salvarRascunhoDeNota(fd({ ...base, projectId: semAtual.id }))).toMatchObject({ ok: false, error: expect.stringContaining("versão Atual") });
    expect(await salvarRascunhoDeNota(fd({ ...base, valorServicos: "-5" }))).toMatchObject({ ok: false });
    expect(await salvarRascunhoDeNota(fd({ ...base, aliquotaIss: "7" }))).toMatchObject({ ok: false, error: expect.stringContaining("0 a 5%") });
  });

  it("o contador vê e não monta nota; nota de outra empresa não é encontrada", async () => {
    como("contador");
    expect(await salvarRascunhoDeNota(fd(base))).toMatchObject({ ok: false, error: expect.stringContaining("Sem permissão") });
    como("owner");
    const [outroTenant] = await db.insert(schema.tenants).values({ name: "tenant-nfse-outro" }).returning();
    try {
      const [p] = await db.insert(schema.projects).values({ tenantId: outroTenant.id, name: "X" }).returning();
      const [v] = await db.insert(schema.versions).values({ projectId: p.id, tenantId: outroTenant.id, key: "atual", kind: "atual", label: "A", color: "#000" }).returning();
      const [alheia] = await db.insert(schema.notasServico).values({ tenantId: outroTenant.id, projectId: p.id, versionId: v.id }).returning();
      expect(await salvarRascunhoDeNota(fd({ ...base, id: alheia.id }))).toMatchObject({ ok: false, error: "Nota não encontrada." });
      const [n] = await db.select().from(schema.notasServico).where(and(eq(schema.notasServico.id, alheia.id)));
      expect(n.valorServicos).toBe("0.00");
    } finally {
      await db.delete(schema.tenants).where(eq(schema.tenants.id, outroTenant.id));
    }
  });
});
