import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";

/**
 * Prompt AR, Fase 2 (Revisão 4), AR-T4 — com a chave `plano_definicao_nova`
 * DESLIGADA, Contas a Receber, a receita mensal (DRE e Fluxo) e a Projeção por
 * fonte mostram exatamente o de antes; LIGADA, aplicam as BAR-1 a BAR-4.
 * Integração: só com DATABASE_URL.
 */
const HAS_DB = !!process.env.DATABASE_URL;
vi.mock("server-only", () => ({}));

describe.skipIf(!HAS_DB)("chave plano_definicao_nova nas consultas", async () => {
  const { db, schema } = await import("@/lib/db");
  const { getReceivables, getMonthlyRevenue, getRevenueBySource } = await import("@/lib/queries");
  const { bla401 } = await import("@/lib/calc/__fixtures__");
  let tenantId = "";
  let projectId = "";
  let versionId = "";

  const ligar = async (ligada: boolean) => {
    await db.delete(schema.tenantFlags).where(eq(schema.tenantFlags.tenantId, tenantId));
    if (ligada) await db.insert(schema.tenantFlags).values({ tenantId, chave: "plano_definicao_nova", ligada: true });
  };
  const soma = (m: Record<string, number>) => Object.values(m).reduce((a, v) => a + v, 0);
  const somaFontes = (s: Record<string, Record<string, number>>) => Object.values(s).reduce((a, m) => a + soma(m), 0);

  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "plano-chave-AR" }).returning();
    tenantId = t.id;
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "OBRA PLANO" }).returning();
    projectId = p.id;
    const [v] = await db.insert(schema.versions).values({ projectId, tenantId, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
    versionId = v.id;
    const { code: _c, status: _s, valor: _v, ...plano } = bla401();
    plano.S1.usarS2 = false; // cenário B da spec: Sinal 2 preenchido, caixinha desmarcada
    await db.insert(schema.units).values({ tenantId, versionId, code: "B-1", valor: "537027", status: "Vendido", paymentPlan: plano } as never);
  });
  afterAll(async () => {
    if (tenantId) await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("desligada: os números de sempre (555 mil nos recebíveis, 525 mil na projeção)", async () => {
    await ligar(false);
    expect((await getReceivables(tenantId, projectId)).reduce((a, r) => a + r.valor, 0)).toBe(555000);
    expect(soma(await getMonthlyRevenue(versionId, projectId))).toBe(555000);
    expect(somaFontes((await getRevenueBySource(versionId, projectId)).sources)).toBe(525000);
  });

  it("ligada: sem financiamento, sem permuta e sem o Sinal 2 desmarcado (435 mil), e a projeção bate", async () => {
    await ligar(true);
    const receb = await getReceivables(tenantId, projectId);
    expect(receb.reduce((a, r) => a + r.valor, 0)).toBe(435000);
    expect(receb.some((r) => r.secao === "Banco" || r.secao === "Permuta" || r.secao === "S2")).toBe(false);
    expect(soma(await getMonthlyRevenue(versionId, projectId))).toBe(435000);
    expect(somaFontes((await getRevenueBySource(versionId, projectId)).sources)).toBe(435000);
    await ligar(false);
  });
});
