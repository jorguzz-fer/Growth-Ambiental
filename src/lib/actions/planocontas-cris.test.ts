import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";

/** Prompt G2 — criar as contas propostas: valida de novo, cria as boas, devolve o motivo das outras. */
const HAS_DB = !!process.env.DATABASE_URL;
const ctxRef: { current: unknown } = { current: null };
vi.mock("@/lib/context", async (orig) => ({ ...(await orig<typeof import("@/lib/context")>()), getTenantContext: async () => ctxRef.current }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));

describe.skipIf(!HAS_DB)("Prompt G2 — criarContasPropostas", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { criarContasPropostas } = await import("./planocontas");
  let tenantId = "";
  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "tenant-g2" }).returning();
    tenantId = t.id;
    await db.insert(schema.chartAccounts).values({ tenantId, code: "1.1", name: "Técnicos", groupCode: "1", groupName: "Preliminares", kind: "cef" });
    ctxRef.current = { tenant: t, projects: [], userId: null, userEmail: "t@t", role: "owner", perms: defaultPermissions("owner") };
  });
  afterAll(async () => {
    if (tenantId) await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("cria a válida com o grupo e o tipo do grupo; recusa a repetida e a de grupo inexistente", async () => {
    const r = await criarContasPropostas([
      { groupCode: "1", code: "1.2", name: "Canteiro", natureza: "despesa", dreCategory: "Custo Fixo" },
      { groupCode: "1", code: "1.1", name: "Repetida", natureza: "despesa", dreCategory: null },
      { groupCode: "Z", code: "Z.1", name: "Sem grupo", natureza: "despesa", dreCategory: null },
    ]);
    expect(r).toMatchObject({ ok: true, criadas: ["1.2"] });
    if (r.ok) expect(r.recusadas.map((x) => x.code)).toEqual(["1.1", "Z.1"]);
    const [c] = await db.select().from(schema.chartAccounts).where(and(eq(schema.chartAccounts.tenantId, tenantId), eq(schema.chartAccounts.code, "1.2")));
    expect(c).toMatchObject({ groupName: "Preliminares", kind: "cef", dreCategory: "Custo Fixo", tenantId });
    const log = await db.select().from(schema.auditLog).where(eq(schema.auditLog.tenantId, tenantId));
    expect(log.some((l) => JSON.stringify(l.meta).includes("assistente"))).toBe(true);
  });

  it("sem permissão de criar, nada acontece", async () => {
    ctxRef.current = { ...(ctxRef.current as object), role: "contador", perms: defaultPermissions("contador") };
    expect(await criarContasPropostas([{ groupCode: "1", code: "1.3", name: "x", natureza: "despesa", dreCategory: null }])).toEqual({ ok: false, error: "Sem permissão para criar contas." });
  });
});
