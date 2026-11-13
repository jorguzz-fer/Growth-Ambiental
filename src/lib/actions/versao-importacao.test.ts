import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { PLANO_CONTAS_PADRAO } from "@/lib/calc/plano-ambiental";
import { eq } from "drizzle-orm";

/**
 * Prompt I, BI-3 — a importação de planilha só grava lançamento na versão
 * Atual e só em categoria vazia; nunca apaga. Integração: só com DATABASE_URL.
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

describe.skipIf(!HAS_DB)("Importação de planilha na versão (BI-3)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { emptyPlan } = await import("@/lib/calc");
  const { buildExportBuffer } = await import("@/lib/xlsx/growth-template");
  const { importVersionData } = await import("./version-io");
  let tenantId = "";
  const v: Record<string, typeof schema.versions.$inferSelect> = {};

  const planilha = (o: { units?: boolean; despesas?: boolean }) =>
    buildExportBuffer({
      incc: [],
      units: o.units
        ? [{ code: "PL-1", bloco: null, tipo: null, m2: null, andar: null, valor: 1000, status: "Disponivel", mesVenda: null, plan: emptyPlan() }]
        : [],
      reembolsos: [],
      permutas: [],
      despesas: o.despesas ? [{ contaCef: PLANO_CONTAS_PADRAO.obra[0].sub[0].id, competencia: "09/2026", valor: 50 }] : [],
    });
  const importar = (versionId: string, buf: Buffer) => {
    const fd = new FormData();
    fd.set("versionId", versionId);
    fd.set("file", new File([new Uint8Array(buf)], "p.xlsx"));
    return importVersionData(fd);
  };
  const despesasDe = (versionId: string) =>
    db.select().from(schema.despesas).where(eq(schema.despesas.versionId, versionId));
  const unidadesDe = (versionId: string) =>
    db.select().from(schema.units).where(eq(schema.units.versionId, versionId));

  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "imp-BI3" }).returning();
    tenantId = t.id;
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "OBRA IMP" }).returning();
    for (const kind of ["atual", "budget"] as const) {
      [v[kind]] = await db
        .insert(schema.versions)
        .values({ projectId: p.id, tenantId, key: kind, kind, label: kind, color: "#000" })
        .returning();
    }
    ctxRef.current = { tenant: t, projects: [p], userId: null, userEmail: null, role: "owner", perms: defaultPermissions("owner") };
  });
  afterAll(async () => {
    if (tenantId) await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("fora da Atual: recusa e nada é gravado", async () => {
    const r = await importar(v.budget.id, planilha({ units: true, despesas: true }));
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toMatch(/só entram na versão Atual/);
    expect(await despesasDe(v.budget.id)).toHaveLength(0);
    expect(await unidadesDe(v.budget.id)).toHaveLength(0);
  });

  it("na Atual, categorias vazias: grava", async () => {
    const r = await importar(v.atual.id, planilha({ units: true, despesas: true }));
    expect(r).toEqual({ ok: true, result: { units: 1, reembolsos: 0, permutas: 0, despesas: 1, incc: 0 } });
    expect(await despesasDe(v.atual.id)).toHaveLength(1);
  });

  it("na Atual, despesa já lançada com parcela: recusa inteira, nada apagado (antes: apagava e levava a parcela)", async () => {
    const [d] = await despesasDe(v.atual.id);
    await db.insert(schema.despesaParcelas).values({ tenantId, despesaId: d.id, numeroParcela: 1, valorOriginal: "50" });
    const r = await importar(v.atual.id, planilha({ units: true, despesas: true }));
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toMatch(/já tem unidades, despesas/);
    const depois = await despesasDe(v.atual.id);
    expect(depois.map((x) => x.id)).toEqual([d.id]);
    expect(await db.select().from(schema.despesaParcelas).where(eq(schema.despesaParcelas.despesaId, d.id))).toHaveLength(1);
    expect(await unidadesDe(v.atual.id)).toHaveLength(1);
  });

  it("arquivo que não é a planilha: não quebra e não grava lançamento", async () => {
    const antes = (await despesasDe(v.atual.id)).length;
    const fd = new FormData();
    fd.set("versionId", v.atual.id);
    fd.set("file", new File([new Uint8Array([1, 2, 3])], "x.xlsx"));
    const r = await importVersionData(fd);
    if (r.ok) expect(r.result).toMatchObject({ units: 0, despesas: 0, permutas: 0, reembolsos: 0 });
    expect(await despesasDe(v.atual.id)).toHaveLength(antes);
  });
});
