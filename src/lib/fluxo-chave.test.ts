import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";

/** Prompt AD, 1.2 — permuta fora do planejamento só com a chave. Integração: só com DATABASE_URL. */
const HAS_DB = !!process.env.DATABASE_URL;
vi.mock("@/lib/context", async (orig) => ({ ...(await orig<typeof import("@/lib/context")>()), getTenantContext: async () => null }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));
vi.mock("server-only", () => ({}));

describe.skipIf(!HAS_DB)("Prompt AD — chave do Fluxo (banco)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { flowMaps, flowMapsRealizado, previaFluxoDefinicaoNova } = await import("./fluxo-caixa");
  let tenantId = "";
  let projectId = "";
  let budget: typeof schema.versions.$inferSelect;
  let atual: typeof schema.versions.$inferSelect;

  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "fluxo-chave" }).returning();
    tenantId = t.id;
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "OBRA" }).returning();
    projectId = p.id;
    [budget] = await db.insert(schema.versions).values({ projectId, tenantId, key: "budget", kind: "budget", label: "Orç", color: "#000" }).returning();
    [atual] = await db.insert(schema.versions).values({ projectId, tenantId, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
    // permuta vendida gravada na versão de ORÇAMENTO (fato no lugar errado)
    await db.insert(schema.permutas).values({ tenantId, versionId: budget.id, status: "Vendido", dataVenda: "03/10/2026", valorVenda: "800", estimado: "800", tipoPermuta: "Venda" } as never);
    // caixa gravado no ORÇAMENTO (como as cópias antigas faziam)
    await db.insert(schema.cashEntries).values({ tenantId, versionId: budget.id, data: "03/05/2026", valor: "123", descricao: "copia" } as never);
    await db.insert(schema.cashEntries).values({ tenantId, versionId: atual.id, data: "02/05/2026", valor: "40", descricao: "real" } as never);
  });
  afterAll(async () => {
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("23/3 — chave desligada: a permuta soma no Orçamento, como antes; ligada: só budget_line", async () => {
    const antes = await flowMaps(budget, projectId);
    const depois = await flowMaps(budget, projectId, { definicaoNova: true });
    const soma = (m: Record<string, number>) => Object.values(m).reduce((a, x) => a + x, 0);
    expect(soma(antes.entradas) - soma(depois.entradas)).toBe(800);
  });

  it("2 — o realizado da Atual não leva o caixa gravado no Orçamento", async () => {
    const r = await flowMapsRealizado(atual.id);
    expect(r.entradas).toEqual({ "02/2026": 40 });
  });

  it("prévia: mostra a permuta que sai do planejamento e o caixa fora da Atual", async () => {
    const [pv] = await previaFluxoDefinicaoNova(tenantId, [{ id: projectId, name: "OBRA", startDate: null, endDate: null }], 1000);
    expect(pv).toMatchObject({ temAtual: true, partidaHoje: 1000, permutaNoPlanejamento: 800, caixaForaDaAtual: 123 });
  });
});
