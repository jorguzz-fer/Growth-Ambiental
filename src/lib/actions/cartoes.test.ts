import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";

/** Prompt U, seção 1 — cadastro de cartões. Integração (precisa de DATABASE_URL). */
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

describe.skipIf(!HAS_DB)("Cartões de crédito — cadastro (Prompt U, 1)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { addCartao, updateCartao, setCartaoAtivo } = await import("./cartoes");
  const { getCartoes } = await import("@/lib/queries");
  let tenantId = "";
  const fd = (campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    return f;
  };
  const base = { apelido: "Itaú Empresa", bandeira: "Visa", titular: "Empresa Exemplo", limite: "15000", diaFechamento: "28", diaVencimento: "5" };
  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "cartoes-U1" }).returning();
    tenantId = t.id;
    ctxRef.current = { tenant: t, projects: [], userId: null, userEmail: "u1@teste", role: "owner", perms: defaultPermissions("owner") };
  });
  afterAll(async () => {
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("17 — número completo é recusado; só os 4 últimos dígitos ficam gravados e no audit", async () => {
    const recusa = await addCartao(fd({ ...base, ultimos4: "4111 1111 1111 1234" }));
    expect(recusa.ok).toBe(false);
    expect((recusa as { error: string }).error).toMatch(/4 últimos/);
    expect(await getCartoes(tenantId)).toEqual([]);

    const r = await addCartao(fd({ ...base, ultimos4: "1234" }));
    expect(r.ok).toBe(true);
    const id = (r as { id: string }).id;
    const [row] = await db.select().from(schema.cartoesCredito).where(eq(schema.cartoesCredito.id, id));
    expect(row.ultimos4).toBe("1234");
    expect(row.taxaRotativo).toBeNull(); // BU-3: sem taxa
    expect(Object.keys(row)).not.toContain("numero");
    const logs = await db.select().from(schema.auditLog).where(eq(schema.auditLog.entityId, id));
    expect(JSON.stringify(logs)).not.toContain("4111");
    expect(JSON.stringify(logs)).toContain("cartao.create");
  });

  it("validações: dias fora de 1..31 e conta de outro tenant", async () => {
    expect((await addCartao(fd({ ...base, diaFechamento: "0" }))).ok).toBe(false);
    expect((await addCartao(fd({ ...base, bankAccountId: "00000000-0000-0000-0000-000000000000" }))).ok).toBe(false);
  });

  it("editar, inativar e reativar (1.4) — nada é excluído", async () => {
    const [c] = await getCartoes(tenantId);
    const u = await updateCartao(fd({ ...base, id: c.id, limite: "20000", taxaRotativo: "12.5", ultimos4: "1234" }));
    expect(u.ok).toBe(true);
    let [v] = await getCartoes(tenantId);
    expect(v.limite).toBe(20000);
    expect(v.taxaRotativo).toBe(12.5);
    expect((await setCartaoAtivo(c.id, false)).ok).toBe(true);
    [v] = await getCartoes(tenantId);
    expect(v.ativo).toBe(false);
    expect((await setCartaoAtivo(c.id, true)).ok).toBe(true);
    expect((await getCartoes(tenantId)).length).toBe(1);
  });
});
