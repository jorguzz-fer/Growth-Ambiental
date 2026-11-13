import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";

/**
 * Prompt Q, PR Q-2 — origem do índice informado (5.3) e variante (5.1).
 * Integração: só com DATABASE_URL.
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

describe.skipIf(!HAS_DB)("Parâmetros / INCC — o que a tela declara (Prompt Q, PR Q-2)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { updateInccMonth, marcarComoProjecao, definirVarianteIncc } = await import("./incc");
  const { getInccTabela } = await import("@/lib/queries");
  let tenantId = "";
  let projectId = "";
  let tenant: unknown;
  let projects: unknown[] = [];
  const mesRel = (delta: number) => {
    const d = new Date();
    const m = d.getMonth() + delta;
    const y = d.getFullYear() + Math.floor(m / 12);
    return `${String((((m % 12) + 12) % 12) + 1).padStart(2, "0")}/${y}`;
  };

  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "incc-Q2" }).returning();
    tenantId = t.id;
    tenant = t;
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "OBRA Q2" }).returning();
    projectId = p.id;
    projects = [p];
    await db.insert(schema.inccRates).values([
      { projectId, tenantId, ordem: 0, mes: mesRel(-1), monthly: "0.5000", accumulated: "0.5000", projected: false },
      { projectId, tenantId, ordem: 1, mes: mesRel(0), monthly: "0.3000", accumulated: "0.8010", projected: false },
      { projectId, tenantId, ordem: 2, mes: mesRel(1), monthly: "0.4000", accumulated: "1.2040", projected: false },
      { projectId, tenantId, ordem: 3, mes: mesRel(2), monthly: "0.0000", accumulated: "0.0000", projected: true },
    ]);
    ctxRef.current = { tenant, projects, userId: null, userEmail: "quem@teste", role: "owner", perms: defaultPermissions("owner") };
  });
  afterAll(async () => {
    if (tenantId) await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("5.3 · histórico fica em branco; editar grava quem, quando e a fonte do mês editado — e só dele", async () => {
    const antes = await getInccTabela(tenantId, projectId);
    expect(antes.variante).toBeNull();
    expect(antes.linhas.every((l) => l.informadoPor === null && l.informadoEm === null)).toBe(true);
    expect((await updateInccMonth(projectId, mesRel(0), 0.35, "FGV · divulgação")).ok).toBe(true);
    const { linhas } = await getInccTabela(tenantId, projectId);
    expect(linhas[1]).toMatchObject({ m: mesRel(0), mo: 0.35, projected: false, informadoPor: "quem@teste", fonte: "FGV · divulgação" });
    expect(linhas[1].informadoEm).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(linhas[0].informadoPor).toBeNull();
    expect(linhas[3].informadoPor).toBeNull(); // projetado reescrito não ganha origem
    const [l] = await db.select().from(schema.auditLog).where(and(eq(schema.auditLog.tenantId, tenantId), eq(schema.auditLog.action, "incc.update")));
    expect(l.meta).toMatchObject({ fonte: "FGV · divulgação" });
  });

  it("5.3 · mês futuro convertido em projeção perde a origem", async () => {
    expect((await updateInccMonth(projectId, mesRel(1), 0.45, null)).ok).toBe(true);
    expect((await getInccTabela(tenantId, projectId)).linhas[2].informadoPor).toBe("quem@teste");
    expect((await marcarComoProjecao(projectId, [mesRel(1)])).ok).toBe(true);
    const { linhas } = await getInccTabela(tenantId, projectId);
    expect(linhas[2]).toMatchObject({ projected: true, informadoPor: null, informadoEm: null, fonte: null });
  });

  it("5.1/BQ-1 · variante: nula = a confirmar; só DI, M ou 10; gravada em todas as linhas da obra, auditada, sem mudar índice", async () => {
    expect(await definirVarianteIncc(projectId, "INCC-X")).toEqual({ ok: false, error: expect.stringMatching(/Índice inválido/) });
    const antes = (await getInccTabela(tenantId, projectId)).linhas.map((l) => [l.m, l.mo, l.ac, l.projected]);
    expect(await definirVarianteIncc(projectId, "INCC-M")).toEqual({ ok: true, meses: 0 });
    const depois = await getInccTabela(tenantId, projectId);
    expect(depois.variante).toBe("INCC-M");
    expect(depois.linhas.map((l) => [l.m, l.mo, l.ac, l.projected])).toEqual(antes);
    const rows = await db.select({ v: schema.inccRates.variante }).from(schema.inccRates).where(eq(schema.inccRates.projectId, projectId));
    expect(rows.every((r) => r.v === "INCC-M")).toBe(true);
    const [l] = await db.select().from(schema.auditLog).where(and(eq(schema.auditLog.tenantId, tenantId), eq(schema.auditLog.action, "incc.variante")));
    expect(l.meta).toMatchObject({ variante: { de: null, para: "INCC-M" } });
    ctxRef.current = { tenant, projects, userId: null, userEmail: "quem@teste", role: "viewer", perms: defaultPermissions("viewer" as "owner") };
    expect(await definirVarianteIncc(projectId, "INCC-DI")).toEqual({ ok: false, error: expect.stringMatching(/permissão/) });
  });

  it("Growth Ambiental · Índices de Reajuste: IPCA, IGP-M e INPC são aceitos, sem mudar nenhum valor", async () => {
    ctxRef.current = { tenant, projects, userId: null, userEmail: "quem@teste", role: "owner", perms: defaultPermissions("owner") };
    const antes = (await getInccTabela(tenantId, projectId)).linhas.map((l) => [l.m, l.mo, l.ac, l.projected]);
    for (const v of ["IPCA", "IGP-M", "INPC"]) {
      expect(await definirVarianteIncc(projectId, v)).toEqual({ ok: true, meses: 0 });
      expect((await getInccTabela(tenantId, projectId)).variante).toBe(v);
    }
    expect((await getInccTabela(tenantId, projectId)).linhas.map((l) => [l.m, l.mo, l.ac, l.projected])).toEqual(antes);
  });
});
