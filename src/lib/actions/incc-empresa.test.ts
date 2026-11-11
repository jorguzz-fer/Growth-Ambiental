import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { and, asc, eq, isNull } from "drizzle-orm";

/**
 * Prompt Q2 — INCC da empresa. Adotar copia a série de uma obra para a série
 * da empresa sem tocar nas séries das obras; com a chave desligada nada muda
 * nos relatórios; ligada (e com série adotada), toda obra lê a da empresa, a
 * tela edita a da empresa e a edição da série guardada de uma obra é recusada.
 * Integração: só com DATABASE_URL.
 */
const HAS_DB = !!process.env.DATABASE_URL;
const ctxRef: { current: unknown } = { current: null };
vi.mock("@/lib/context", async (orig) => ({
  ...(await orig<typeof import("@/lib/context")>()),
  getTenantContext: async () => ctxRef.current,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));
vi.mock("server-only", () => ({}));

describe.skipIf(!HAS_DB)("Prompt Q2 · INCC da empresa", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { getInccRows } = await import("@/lib/queries");
  const { adotarSerieDaObraComoDaEmpresa, updateInccMonth } = await import("./incc");
  let tenantId = "";
  let obraA = "";
  let obraB = "";
  const ligar = async (ligada: boolean) => {
    await db.delete(schema.tenantFlags).where(eq(schema.tenantFlags.tenantId, tenantId));
    if (ligada) await db.insert(schema.tenantFlags).values({ tenantId, chave: "incc_por_empresa", ligada: true });
  };
  const serie = (projectId: string, acs: number[]) =>
    acs.map((ac, i) => ({ tenantId, projectId, mes: `0${i + 1}/2026`, monthly: "1", accumulated: String(ac), ordem: i }));
  const acs = async (projectId: string) => (await getInccRows(tenantId, projectId)).map((r) => r.ac);
  // Ordenada pelo mês: sem ORDER BY, o Postgres devolve na ordem física, que muda depois de apagar e regravar a série.
  const daEmpresa = () => db.select().from(schema.inccRates).where(and(eq(schema.inccRates.tenantId, tenantId), isNull(schema.inccRates.projectId))).orderBy(asc(schema.inccRates.mes));

  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "tenant-prompt-q2" }).returning();
    tenantId = t.id;
    const [a] = await db.insert(schema.projects).values({ tenantId, name: "Obra A" }).returning();
    const [b] = await db.insert(schema.projects).values({ tenantId, name: "Obra B" }).returning();
    obraA = a.id;
    obraB = b.id;
    await db.insert(schema.inccRates).values([...serie(obraA, [1, 2, 3]), ...serie(obraB, [5, 6, 7])]);
    ctxRef.current = { tenant: t, projects: [a, b], userId: null, userEmail: "q2@teste", role: "owner", perms: defaultPermissions("owner") };
  });
  afterAll(async () => {
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("chave ligada sem série adotada: cada obra lê a própria", async () => {
    await ligar(true);
    expect(await acs(obraB)).toEqual([5, 6, 7]);
    await ligar(false);
  });

  it("membro não adota; o dono adota a série da obra A e as séries das obras ficam como estão", async () => {
    ctxRef.current = { ...(ctxRef.current as object), role: "membro", perms: defaultPermissions("membro") };
    expect(await adotarSerieDaObraComoDaEmpresa(obraA)).toMatchObject({ ok: false });
    ctxRef.current = { ...(ctxRef.current as object), role: "owner", perms: defaultPermissions("owner") };
    expect(await adotarSerieDaObraComoDaEmpresa(obraA)).toEqual({ ok: true, meses: 3, substituiu: false });
    expect((await daEmpresa()).map((r) => Number(r.accumulated))).toEqual([1, 2, 3]);
    expect(await acs(obraA)).toEqual([1, 2, 3]);
    expect(await acs(obraB)).toEqual([5, 6, 7]); // chave desligada: nada muda
    const [log] = await db.select().from(schema.auditLog).where(and(eq(schema.auditLog.tenantId, tenantId), eq(schema.auditLog.action, "incc.adotarDaEmpresa")));
    expect(log.meta).toMatchObject({ deProjeto: obraA, meses: 3, substituiu: false });
  });

  it("adotar de novo pede confirmação; confirmado, substitui", async () => {
    expect(await adotarSerieDaObraComoDaEmpresa(obraB)).toMatchObject({ ok: false, jaExiste: true });
    expect(await adotarSerieDaObraComoDaEmpresa(obraB, true)).toEqual({ ok: true, meses: 3, substituiu: true });
    expect((await daEmpresa()).map((r) => Number(r.accumulated))).toEqual([5, 6, 7]);
    await adotarSerieDaObraComoDaEmpresa(obraA, true);
  });

  it("chave ligada: toda obra lê a da empresa; a edição vai para a série da empresa", async () => {
    await ligar(true);
    expect(await acs(obraB)).toEqual([1, 2, 3]);
    expect(await updateInccMonth(obraB, "01/2026", 2)).toMatchObject({ ok: false, error: expect.stringMatching(/da empresa/) });
    expect(await updateInccMonth("empresa", "01/2026", 2)).toMatchObject({ ok: true });
    expect(Number((await daEmpresa()).find((r) => r.mes === "01/2026")!.monthly)).toBe(2);
    // a série guardada da obra B não mudou
    const guardada = await db.select().from(schema.inccRates).where(eq(schema.inccRates.projectId, obraB));
    expect(guardada.map((r) => Number(r.accumulated)).sort()).toEqual([5, 6, 7]);
  });

  it("desligar volta às séries das obras", async () => {
    await ligar(false);
    expect(await acs(obraB)).toEqual([5, 6, 7]);
    expect(await updateInccMonth("empresa", "01/2026", 3)).toMatchObject({ ok: false });
  });
});
