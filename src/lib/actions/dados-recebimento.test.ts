import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";

/** Prompt T, BT-2 — dados bancários e PIX: gravados, nunca em claro no log (12c). Integração. */
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

describe.skipIf(!HAS_DB)("Dados de recebimento do pagador (Prompt T, BT-2)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { addStakeholder, updateStakeholder } = await import("./stakeholders");
  const { getCompensacoes } = await import("./restituicoes");
  let tenantId = "";
  const fd = (campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    return f;
  };
  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "pix-T3" }).returning();
    tenantId = t.id;
    ctxRef.current = { tenant: t, projects: [], userId: null, userEmail: "t3@teste", role: "owner", perms: defaultPermissions("owner") };
  });
  afterAll(async () => {
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("12c — a chave PIX e a conta ficam gravadas, mas o audit_log registra só que mudaram", async () => {
    const r = await addStakeholder(fd({ nome: "Pagador PIX", tipo: "PF", doc: "000.000.001-91", papeis: "Pagador por Terceiro", pixTipo: "CPF", pixChave: "00000000191", bancoNome: "Banco X", bancoConta: "12345-6" }));
    expect(r.ok).toBe(true);
    const id = (r as { id: string }).id;
    const [s] = await db.select().from(schema.stakeholders).where(eq(schema.stakeholders.id, id));
    expect(s.pixChave).toBe("00000000191");
    expect(s.bancoConta).toBe("12345-6");
    const logs = () => db.select().from(schema.auditLog).where(eq(schema.auditLog.entityId, id)).then((l) => JSON.stringify(l.map((x) => x.meta)));
    expect(await logs()).not.toContain("00000000191");
    expect(await logs()).not.toContain("12345-6");
    expect(await logs()).toContain("comDadosDeRecebimento");
    const u = await updateStakeholder(fd({ id, nome: "Pagador PIX", tipo: "PF", doc: "000.000.001-91", pixTipo: "E-mail", pixChave: "pagador@exemplo.com", bancoConta: "99999-0" }));
    expect(u.ok).toBe(true);
    const texto = await logs();
    expect(texto).toContain("pixChave");
    expect(texto).toContain("[protegido]");
    expect(texto).not.toContain("pagador@exemplo.com");
    expect(texto).not.toContain("99999-0");
    expect((await db.select().from(schema.stakeholders).where(eq(schema.stakeholders.id, id)))[0].pixChave).toBe("pagador@exemplo.com");
  });

  it("11 — a lista de compensações lê os documentos gravados", async () => {
    expect(await getCompensacoes(tenantId)).toEqual([]);
    await db.insert(schema.compensacoes).values({ tenantId, numDoc: "PED-000900", valor: "150", data: "09/10/2026", saldoRestituirAntes: "400", saldoRepassarAntes: "150" } as typeof schema.compensacoes.$inferInsert);
    const [k] = await getCompensacoes(tenantId);
    expect(k).toMatchObject({ numDoc: "PED-000900", valor: 150, saldoRestituirAntes: 400, saldoRepassarAntes: 150 });
  });
});
