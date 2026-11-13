import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";

/**
 * Revisão 4, parte 5c — chave `dre_receita_rateio` na DRE, com banco.
 * Desligada: a receita de sempre (parcelas pelo vencimento + liberação +
 * contas a receber + revenda de permuta). Ligada, na Atual: o contrato rateado
 * pela janela da obra + contas a receber; saem liberação, parcelas e revenda
 * de permuta. Orçamento não muda.
 */
const HAS_DB = !!process.env.DATABASE_URL;
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));

describe.skipIf(!HAS_DB)("receita da DRE pelo rateio (chave dre_receita_rateio)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { versionInputsByMonth, versionAnaliticaByMonth } = await import("@/lib/dre-inputs");
  const { getReceitaDaDrePorRateio } = await import("@/lib/queries");
  const { previaRateioDaReceita } = await import("@/lib/rateio-previa");
  const { bla401 } = await import("@/lib/calc/__fixtures__");
  let tenantId = "";
  let projectId = "";
  let atualId = "";
  let budgetId = "";
  const receita = (m: Record<string, { receita: number }>) => Math.round(Object.values(m).reduce((a, x) => a + x.receita, 0) * 100) / 100;
  const ligar = async (ligada: boolean) => {
    await db.delete(schema.tenantFlags).where(eq(schema.tenantFlags.tenantId, tenantId));
    if (ligada) await db.insert(schema.tenantFlags).values({ tenantId, chave: "dre_receita_rateio", ligada: true });
  };

  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "dre-rateio-5c" }).returning();
    tenantId = t.id;
    // obra de 10 meses: 01/2026 a 10/2026
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "OBRA RATEIO", startDate: "01/01/2026", endDate: "10/31/2026" }).returning();
    projectId = p.id;
    const [a] = await db.insert(schema.versions).values({ projectId, tenantId, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
    const [b] = await db.insert(schema.versions).values({ projectId, tenantId, key: "budget", kind: "budget", label: "Orç", color: "#000" }).returning();
    atualId = a.id;
    budgetId = b.id;
    const { code: _c, status: _s, valor: _v, ...plano } = bla401(); // contrato 555 mil (com permuta 90 mil e financiamento 25 mil)
    await db.insert(schema.units).values({ tenantId, versionId: atualId, code: "A-1", valor: "537027", status: "Vendido", paymentPlan: plano } as never);
    await db.insert(schema.reembolsos).values({ tenantId, versionId: atualId, data: "03/15/2026", origem: "Banco", valor: "25000" } as never); // liberação
    await db.insert(schema.permutas).values({ tenantId, versionId: atualId, unitCode: "A-1", status: "Vendido", dataVenda: "06/10/2026", valorVenda: "95000", estimado: "90000", formaVenda: "avista" } as never);
    await db.insert(schema.contasReceber).values({ tenantId, projectId, descricao: "Aluguel do stand", valor: "1000", vencimento: "04/05/2026" } as never); // avulsa
    await db.insert(schema.budgetLines).values({ tenantId, versionId: budgetId, kind: "receita", rowKey: "Vendas", dreCategory: "Receita", mes: "02/2026", valor: "777" } as never);
  });
  afterAll(async () => {
    if (tenantId) await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("desligada: a receita de sempre (parcelas 555 mil + liberação 25 mil + avulsa 1 mil + revenda 95 mil)", async () => {
    await ligar(false);
    expect(receita(await versionInputsByMonth(tenantId, atualId, projectId))).toBe(555000 + 25000 + 1000 + 95000);
  });

  it("ligada: contrato de 555 mil em 10 meses (55,5 mil por mês) + a avulsa; sem liberação e sem revenda", async () => {
    await ligar(true);
    const m = await versionInputsByMonth(tenantId, atualId, projectId);
    expect(receita(m)).toBe(556000);
    expect(m["01/2026"].receita).toBe(55500); // mês antes de qualquer parcela: revisado pelo rateio
    expect(m["04/2026"].receita).toBe(56500); // + a conta avulsa
    expect(m["10/2026"].receita).toBe(55500);
    expect(Object.keys(m).filter((k) => m[k].receita > 0).sort()).toEqual(["01/2026", "02/2026", "03/2026", "04/2026", "05/2026", "06/2026", "07/2026", "08/2026", "09/2026", "10/2026"]);
    // DRE Analítica: a mesma receita, e a revenda de permuta zerada
    const an = await versionAnaliticaByMonth(tenantId, atualId, projectId);
    expect(Object.values(an).reduce((a, x) => a + x.receitaVendas, 0)).toBeCloseTo(556000, 6);
    expect(Object.values(an).reduce((a, x) => a + x.receitaPermuta, 0)).toBe(0);
    // Orçamento não muda
    expect(receita(await versionInputsByMonth(tenantId, budgetId, projectId))).toBe(777);
    await ligar(false);
  });

  it("parâmetro explícito vence a chave (a prévia compara os dois sem mexer na chave)", async () => {
    await ligar(false);
    expect(receita(await versionInputsByMonth(tenantId, atualId, projectId, { receitaRateio: true }))).toBe(556000);
    const [pv] = await previaRateioDaReceita(tenantId, [{ id: projectId, name: "OBRA RATEIO" }], new Date(2026, 5, 15));
    expect(pv).toMatchObject({ temAtual: true, hoje: 676000, rateio: 556000 });
    // meses encerrados até 05/2026: o rateio reconhece 5 × 55,5 mil + a avulsa de abril
    expect(pv.passadoRateio).toBe(5 * 55500 + 1000);
  });

  it("obra sem início e fim: o rateio não reconhece e avisa; conta a receber ligada à unidade aparece para conferência", async () => {
    await db.update(schema.projects).set({ startDate: null, endDate: null }).where(eq(schema.projects.id, projectId));
    await db.insert(schema.contasReceber).values({ tenantId, projectId, descricao: "Sinal", unitCode: "A-1", valor: "5000", vencimento: "02/05/2026" } as never);
    const r = await getReceitaDaDrePorRateio(tenantId, atualId, projectId);
    expect(r.pendencias).toEqual([{ unidade: "A-1", motivo: "o projeto não tem início e fim cadastrados", valor: 555000 }]);
    expect(r.contasComUnidade).toEqual({ qtd: 1, valor: 5000 });
  });
});
