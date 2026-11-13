import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";

/**
 * Growth Ambiental — o cliente é o CONTRATANTE (migração 0080). A ficha nova
 * grava nome fantasia e os três contatos; os campos de comprador de imóvel
 * saíram da tela e o Salvar NÃO os apaga (a action só grava o que o
 * formulário envia). Integração: só com DATABASE_URL.
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

describe.skipIf(!HAS_DB)("Cliente contratante (Growth Ambiental)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { addCliente, updateCliente } = await import("./clientes");
  let tenantId = "";
  const fd = (campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    return f;
  };

  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "cli-contratante" }).returning();
    tenantId = t.id;
    ctxRef.current = { tenant: t, projects: [], userId: null, userEmail: null, role: "owner", perms: defaultPermissions("owner") };
  });
  afterAll(async () => {
    if (tenantId) await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("cadastra o contratante com nome fantasia e os contatos administrativo, técnico e financeiro", async () => {
    const r = await addCliente(
      fd({
        nomeCompleto: "Mineração Exemplo S.A.",
        nomeFantasia: "Mina Exemplo",
        cpfCnpj: "00.000.001/0001-36",
        contatoAdmNome: "Ana",
        contatoAdmEmail: "adm@exemplo.invalid",
        contatoTecnicoNome: "Bruno",
        contatoTecnicoTelefone: "(00) 0000-0000",
        contatoFinanceiroNome: "Carla",
        contatoFinanceiroEmail: "fin@exemplo.invalid",
      }),
    );
    expect(r.ok).toBe(true);
    const [c] = await db.select().from(schema.clientes).where(eq(schema.clientes.tenantId, tenantId));
    expect(c).toMatchObject({
      nomeCompleto: "Mineração Exemplo S.A.",
      nomeFantasia: "Mina Exemplo",
      contatoAdmNome: "Ana",
      contatoAdmEmail: "adm@exemplo.invalid",
      contatoTecnicoNome: "Bruno",
      contatoTecnicoTelefone: "(00) 0000-0000",
      contatoFinanceiroNome: "Carla",
      contatoFinanceiroEmail: "fin@exemplo.invalid",
      unitCode: null,
    });
  });

  it("salvar a ficha nova não apaga os campos antigos de comprador (que saíram da tela)", async () => {
    const [antigo] = await db
      .insert(schema.clientes)
      .values({ tenantId, nomeCompleto: "Cliente Antigo", unitCode: "A-101", statusContrato: "Ativo", rendaBruta: "12000", saldoFgts: "5000", scoreCredito: 700, interesse: 4 })
      .returning();
    // O formulário novo só envia os campos do contratante.
    const r = await updateCliente(fd({ id: antigo.id, nomeCompleto: "Cliente Antigo Ltda", nomeFantasia: "Antigo", contatoFinanceiroNome: "Dora" }));
    expect(r.ok).toBe(true);
    const [depois] = await db.select().from(schema.clientes).where(eq(schema.clientes.id, antigo.id));
    expect(depois).toMatchObject({
      nomeCompleto: "Cliente Antigo Ltda",
      nomeFantasia: "Antigo",
      contatoFinanceiroNome: "Dora",
      unitCode: "A-101",
      statusContrato: "Ativo",
      rendaBruta: "12000.00",
      saldoFgts: "5000.00",
      scoreCredito: 700,
      interesse: 4,
    });
  });

  it("campo enviado vazio é limpo (o que está na ficha continua editável)", async () => {
    const [c] = await db.select().from(schema.clientes).where(eq(schema.clientes.nomeCompleto, "Cliente Antigo Ltda"));
    expect((await updateCliente(fd({ id: c.id, nomeCompleto: "Cliente Antigo Ltda", nomeFantasia: "" }))).ok).toBe(true);
    const [depois] = await db.select().from(schema.clientes).where(eq(schema.clientes.id, c.id));
    expect(depois.nomeFantasia).toBeNull();
    expect(depois.unitCode).toBe("A-101");
  });
});
