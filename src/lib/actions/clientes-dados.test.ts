import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";

/**
 * Prompt M, 5.4 — quem não tem `clientesdados` salva a ficha sem APAGAR os
 * campos sensíveis (que o formulário dele nem mostra). Integração: só com
 * DATABASE_URL.
 */
const HAS_DB = !!process.env.DATABASE_URL;
const ctxRef: { current: unknown } = { current: null };
vi.mock("@/lib/context", async (orig) => ({
  ...(await orig<typeof import("@/lib/context")>()),
  getTenantContext: async () => ctxRef.current,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));
vi.mock("server-only", () => ({}));

describe.skipIf(!HAS_DB)("clientes — campos sensíveis preservados", async () => {
  const { db, schema } = await import("@/lib/db");
  const { effectivePermissions } = await import("@/lib/permissions");
  const { updateCliente } = await import("./clientes");
  let tenantId = "";
  let clienteId = "";

  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "tenant-cli" }).returning();
    tenantId = t.id;
    const [c] = await db
      .insert(schema.clientes)
      .values({
        tenantId,
        nomeCompleto: "Fulano",
        cpfCnpj: "000.000.002-72",
        rendaBruta: "15000.00",
        scoreCredito: 800,
        estadoCivil: "Casado(a)",
        empresa: "ACME",
      })
      .returning();
    clienteId = c.id;
  });
  afterAll(async () => {
    if (tenantId) await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  const ctx = (comDados: boolean) => ({
    tenant: { id: tenantId },
    userId: null,
    role: "membro",
    perms: effectivePermissions("membro", comDados
      ? { clientesdados: { ver: true, criar: true, editar: true, excluir: false } }
      : null),
  });

  const form = (o: Record<string, string>) => {
    const f = new FormData();
    f.set("id", clienteId);
    for (const [k, v] of Object.entries(o)) f.set(k, v);
    return f;
  };

  it("sem a permissão: salvar a ficha (sem os campos) não apaga nada sensível nem o CPF", async () => {
    ctxRef.current = ctx(false);
    await updateCliente(form({ nomeCompleto: "Fulano de Tal", celular: "11999990000" }));
    const [c] = await db.select().from(schema.clientes).where(eq(schema.clientes.id, clienteId));
    expect(c.nomeCompleto).toBe("Fulano de Tal");
    expect(c.rendaBruta).toBe("15000.00");
    expect(c.scoreCredito).toBe(800);
    expect(c.estadoCivil).toBe("Casado(a)");
    expect(c.empresa).toBe("ACME");
    expect(c.cpfCnpj).toBe("000.000.002-72");
  });

  it("sem a permissão: mandar campo sensível à força não grava", async () => {
    ctxRef.current = ctx(false);
    await updateCliente(form({ nomeCompleto: "Fulano de Tal", rendaBruta: "1" }));
    const [c] = await db.select().from(schema.clientes).where(eq(schema.clientes.id, clienteId));
    expect(c.rendaBruta).toBe("15000.00");
  });

  it("sem a permissão: digitar um CPF novo substitui", async () => {
    ctxRef.current = ctx(false);
    await updateCliente(form({ nomeCompleto: "Fulano de Tal", cpfCnpj: "999.888.777-66" }));
    const [c] = await db.select().from(schema.clientes).where(eq(schema.clientes.id, clienteId));
    expect(c.cpfCnpj).toBe("999.888.777-66");
  });

  it("com a permissão: edita os sensíveis, e o log não guarda o valor", async () => {
    ctxRef.current = ctx(true);
    await updateCliente(
      form({ nomeCompleto: "Fulano de Tal", cpfCnpj: "999.888.777-66", rendaBruta: "20000", scoreCredito: "810" }),
    );
    const [c] = await db.select().from(schema.clientes).where(eq(schema.clientes.id, clienteId));
    expect(c.rendaBruta).toBe("20000.00");
    const logs = await db.select().from(schema.auditLog).where(eq(schema.auditLog.tenantId, tenantId));
    const texto = JSON.stringify(logs.map((l) => l.meta));
    expect(texto).not.toContain("20000");
    expect(texto).not.toContain("999.888.777-66");
    expect(texto).toContain("Fulano de Tal");
  });
});
