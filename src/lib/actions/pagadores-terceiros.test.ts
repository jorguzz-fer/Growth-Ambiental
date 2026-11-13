import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";

/** Prompt T, PR T-1 — papel de pagador (1.2, 1.3, 1.5) e busca por PED (5). Integração. */
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

describe.skipIf(!HAS_DB)("Pagadores terceiros e busca por PED (Prompt T, PR T-1)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { concederPapelPagador, retirarPapelPagador } = await import("./stakeholders");
  const { buscarDespesasPorPed, getDespesaTerceiros } = await import("./restituicoes");
  let tenantId = "";
  let versionId = "";
  let fornecedorId = "";
  const linha = (id: string) => db.select().from(schema.stakeholders).where(eq(schema.stakeholders.id, id)).then((r) => r[0]);

  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "pag-T1" }).returning();
    tenantId = t.id;
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "OBRA T1" }).returning();
    const [v] = await db.insert(schema.versions).values({ projectId: p.id, tenantId, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
    versionId = v.id;
    const [f] = await db.insert(schema.stakeholders).values({ tenantId, nome: "Mestre Fornecedor", tipo: "PF", doc: "000.000.001-91", papeis: ["Prestador de Serviço"] }).returning();
    fornecedorId = f.id;
    ctxRef.current = { tenant: t, projects: [p], userId: null, userEmail: "t1@teste", role: "owner", perms: defaultPermissions("owner") };
  });
  afterAll(async () => {
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("6 — conceder a quem já é fornecedor acrescenta o papel, sem registro novo; auditoria com nome e doc mascarado", async () => {
    const antes = (await db.select().from(schema.stakeholders).where(eq(schema.stakeholders.tenantId, tenantId))).length;
    const r = await concederPapelPagador(fornecedorId);
    expect(r.ok).toBe(true);
    expect((await linha(fornecedorId)).papeis).toEqual(["Prestador de Serviço", "Pagador por Terceiro"]);
    expect((await db.select().from(schema.stakeholders).where(eq(schema.stakeholders.tenantId, tenantId))).length).toBe(antes);
    const [log] = (await db.select().from(schema.auditLog).where(eq(schema.auditLog.entityId, fornecedorId))).filter((l) => l.action === "stakeholder.papelPagador.conceder");
    const meta = JSON.stringify(log.meta);
    expect(meta).toContain("Mestre Fornecedor");
    expect(meta).toContain("•••.000.001-••");
    expect(meta).not.toContain("000.000.001-91");
  });

  it("7 — retirar com obrigação vinculada é bloqueado com explicação; sem obrigação, sai", async () => {
    const [d] = await db.insert(schema.despesas).values({ tenantId, versionId, valor: "100", categoriaDre: "Custo Fixo", numDoc: "PED-000070", pagoPorTerceiro: true, status: "Pago" }).returning();
    await db.insert(schema.despesaTerceiros).values({ tenantId, despesaId: d.id, pagadorTerceiroId: fornecedorId, valorTotal: "100", valorRestituido: "0", status: "Aguardando restituição" } as typeof schema.despesaTerceiros.$inferInsert);
    const r = await retirarPapelPagador(fornecedorId);
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toMatch(/1 obrigação\(ões\) vinculada\(s\)/);
    expect((r as { error: string }).error).toMatch(/inative o cadastro/);
    expect((await linha(fornecedorId)).papeis).toContain("Pagador por Terceiro");
    const [livre] = await db.insert(schema.stakeholders).values({ tenantId, nome: "Livre", tipo: "PJ", papeis: ["Pagador por Terceiro", "Construtora"] }).returning();
    expect((await retirarPapelPagador(livre.id)).ok).toBe(true);
    expect((await linha(livre.id)).papeis).toEqual(["Construtora"]);
  });

  it("3/4 — a busca por PED não procura na observação e normaliza o número", async () => {
    await db.insert(schema.despesas).values({ tenantId, versionId, valor: "100", categoriaDre: "Custo Fixo", numDoc: "PED-000100", obs: "nada" });
    await db.insert(schema.despesas).values({ tenantId, versionId, valor: "50", categoriaDre: "Custo Fixo", numDoc: "PED-000200", obs: "R$ 100 obra 29 - acerto PED-000100" });
    const por100 = await buscarDespesasPorPed("100");
    expect(por100.map((d) => d.numDoc)).toEqual(["PED-000100"]);
    for (const termo of ["70", "000070", "PED-000070"]) {
      expect((await buscarDespesasPorPed(termo)).map((d) => d.numDoc)).toEqual(["PED-000070"]);
    }
  });

  it("10 — a lista da empresa traz obrigações de qualquer obra, com a obra", async () => {
    const todas = await getDespesaTerceiros(tenantId);
    expect(todas).toHaveLength(1);
    expect(todas[0].projectName).toBe("OBRA T1");
    expect((await getDespesaTerceiros(tenantId, versionId)).length).toBe(1);
  });
});
