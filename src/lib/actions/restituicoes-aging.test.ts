import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";

/**
 * Prompt AT §2.4 (Revisão 4) — aging de Ressarcimentos com relógio fixo.
 * `getContaCorrenteTerceiros` calcula o aging contra "hoje" (`hojeISO()` sem
 * argumento) e nenhum teste o exercitava. Só teste: a função não muda.
 *
 * As faixas do código são as do Prompt T (calcularAging): até 30 dias (inclui
 * o que ainda vai vencer, que conta 0 dias), 31–60, 61–90 e acima de 90.
 * Data-base: previsão de ressarcimento; sem ela, a data do desembolso.
 */
const HAS_DB = !!process.env.DATABASE_URL;
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));
vi.mock("server-only", () => ({}));

describe.skipIf(!HAS_DB)("Aging de Ressarcimentos com relógio fixo (AT-T4b)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { getContaCorrenteTerceiros } = await import("./restituicoes");
  let tenantId = "";
  let versionId = "";
  const pagadores: Record<string, string> = {};

  async function obrigacao(pagador: string, o: { total: number; restituido?: number; prevista?: string | null; desembolso?: string | null; status?: string }) {
    const [d] = await db.insert(schema.despesas).values({ tenantId, versionId, valor: String(o.total), categoriaDre: "Custo Fixo", pagoPorTerceiro: true, status: "Pago" }).returning();
    await db.insert(schema.despesaTerceiros).values({
      tenantId,
      despesaId: d.id,
      pagadorTerceiroId: pagadores[pagador],
      valorTotal: String(o.total),
      valorRestituido: String(o.restituido ?? 0),
      dataPrevistaRestituicao: o.prevista ?? null,
      dataPagamentoOriginal: o.desembolso ?? null,
      status: o.status ?? "Aguardando restituição",
    } as typeof schema.despesaTerceiros.$inferInsert);
  }
  const agingDe = async (pagador: string) => (await getContaCorrenteTerceiros(tenantId)).find((c) => c.pagadorId === pagadores[pagador])?.aging;

  beforeAll(async () => {
    // hoje = 11/11/2026. Só o Date é falso: timers seguem reais (driver do Postgres).
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 11, 12, 0, 0));
    const [t] = await db.insert(schema.tenants).values({ name: "aging-AT4b" }).returning();
    tenantId = t.id;
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "OBRA AGING" }).returning();
    const [v] = await db.insert(schema.versions).values({ projectId: p.id, tenantId, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
    versionId = v.id;
    for (const nome of ["faixas", "limites", "base"]) {
      const [s] = await db.insert(schema.stakeholders).values({ tenantId, nome: `Sócio ${nome}`, tipo: "PF", papeis: ["Pagador por Terceiro"] }).returning();
      pagadores[nome] = s.id;
    }
    // Uma obrigação por faixa.
    await obrigacao("faixas", { total: 100, prevista: "11/20/2026" }); // a vencer (conta 0 dias)
    await obrigacao("faixas", { total: 200, prevista: "10/22/2026" }); // vencido há 20 dias
    await obrigacao("faixas", { total: 300, prevista: "09/27/2026" }); // 45 dias
    await obrigacao("faixas", { total: 400, prevista: "08/27/2026" }); // 76 dias
    await obrigacao("faixas", { total: 500, prevista: "07/01/2026" }); // 133 dias
    await obrigacao("faixas", { total: 1000, restituido: 400, prevista: "07/01/2026" }); // saldo 600, acima de 90
    await obrigacao("faixas", { total: 9999, prevista: "07/01/2026", status: "Cancelado" }); // fora
    await obrigacao("faixas", { total: 50, restituido: 50, prevista: "07/01/2026", status: "Restituído" }); // quitada: saldo 0
    // Limites exatos de cada faixa.
    await obrigacao("limites", { total: 1, prevista: "10/12/2026" }); // 30 dias
    await obrigacao("limites", { total: 2, prevista: "10/11/2026" }); // 31
    await obrigacao("limites", { total: 4, prevista: "09/12/2026" }); // 60
    await obrigacao("limites", { total: 8, prevista: "09/11/2026" }); // 61
    await obrigacao("limites", { total: 16, prevista: "08/13/2026" }); // 90
    await obrigacao("limites", { total: 32, prevista: "08/12/2026" }); // 91
    // Data-base: a previsão manda; sem previsão, o desembolso; sem nenhuma, 0 dias.
    await obrigacao("base", { total: 10, prevista: "11/30/2026", desembolso: "01/01/2026" }); // a vencer pela previsão
    await obrigacao("base", { total: 20, desembolso: "09/27/2026" }); // 45 dias pelo desembolso
    await obrigacao("base", { total: 40 }); // sem data
  });
  afterAll(async () => {
    vi.useRealTimers();
    if (tenantId) await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("distribui pelas faixas: a vencer e até 30 dias, 31–60, 61–90, acima de 90", async () => {
    expect(await agingDe("faixas")).toEqual({ ate30: 300, de31a60: 300, de61a90: 400, acima90: 1100 });
  });

  it("limites: 30 fica em até 30; 31 e 60 em 31–60; 61 e 90 em 61–90; 91 acima de 90", async () => {
    expect(await agingDe("limites")).toEqual({ ate30: 1, de31a60: 6, de61a90: 24, acima90: 32 });
  });

  it("data-base: previsão, senão desembolso, senão 0 dias", async () => {
    expect(await agingDe("base")).toEqual({ ate30: 50, de31a60: 20, de61a90: 0, acima90: 0 });
  });

  it("o aging anda com o relógio: 31 dias depois, cada saldo sobe de faixa", async () => {
    vi.setSystemTime(new Date(2026, 11, 12, 12, 0, 0)); // 12/12/2026
    try {
      // a vencer (20/11 → 22 dias) fica em até 30; 20 → 51; 45 → 76; 76 → 107; 133 → 164
      expect(await agingDe("faixas")).toEqual({ ate30: 100, de31a60: 200, de61a90: 300, acima90: 1500 });
    } finally {
      vi.setSystemTime(new Date(2026, 10, 11, 12, 0, 0));
    }
  });
});
