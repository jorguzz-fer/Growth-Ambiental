import { describe, it, expect, vi, afterAll } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";

/**
 * Provisionamento de empresa nova (itens 1, 8, 42 da especificação): pelo
 * MESMO caminho da plataforma (`provisionTenant`), a empresa nasce com o plano
 * de consultoria ambiental completo, sem nada de obra, sem lançamento, sem
 * cliente nem fornecedor, e independente das outras. Só com DATABASE_URL.
 */
const HAS_DB = !!process.env.DATABASE_URL;
vi.mock("server-only", () => ({}));

describe.skipIf(!HAS_DB)("Provisionamento: empresa nova recebe o plano ambiental", async () => {
  const { db, schema } = await import("@/lib/db");
  const { provisionTenant } = await import("./provision");
  const { linhasDoPlano, gruposDoPlano } = await import("@/lib/calc/plano-ambiental");
  const { previaDaConversao } = await import("@/lib/planocontas-conversao-servidor");
  const { getChartAccounts } = await import("@/lib/queries");
  const criados: string[] = [];
  afterAll(async () => {
    if (criados.length) await db.delete(schema.tenants).where(inArray(schema.tenants.id, criados));
    await db.delete(schema.users).where(inArray(schema.users.email, ["prov-a@exemplo.invalid", "prov-b@exemplo.invalid"]));
  });

  const nova = async (sufixo: string) => {
    const r = await provisionTenant({ tenantName: `Consultoria ${sufixo}`, ownerName: "Responsável", ownerEmail: `prov-${sufixo}@exemplo.invalid`, ownerPassword: "Senha@12345", projectName: "Sede" });
    if (!r.ok) throw new Error(r.error);
    criados.push(r.tenantId!);
    return r.tenantId!;
  };

  it("plano completo, hierárquico, ativo e sem classificação de obra; nada a converter", async () => {
    const id = await nova("a");
    const contas = await getChartAccounts(id); // a consulta da tela
    expect(contas.filter((c) => c.ativo).map((c) => c.code).sort()).toEqual(linhasDoPlano("x").map((c) => c.code).sort());
    expect(contas.some((c) => /funda|supraestrutura|alvenaria|canteiro|pós-obra|pavimenta/i.test(`${c.name} ${c.groupName}`))).toBe(false);
    for (const c of contas) expect(c.dreCategory, c.code).toBeTruthy();
    const grupos = await db.select().from(schema.chartGroups).where(eq(schema.chartGroups.tenantId, id));
    expect(grupos).toHaveLength(gruposDoPlano("x").length);
    for (const g of gruposDoPlano("x").filter((x) => x.parentCode)) {
      const sub = grupos.find((x) => x.code === g.code)!;
      expect(grupos.find((x) => x.id === sub.parentId)?.code, g.code).toBe(g.parentCode);
    }
    expect((await previaDaConversao(id)).nadaAFazer).toBe(true);
    // chaves de categoria ligadas (despesa e Orçamento herdam a categoria da conta)
    const chaves = await db.select().from(schema.tenantFlags).where(eq(schema.tenantFlags.tenantId, id));
    expect(chaves.filter((c) => c.ligada).map((c) => c.chave).sort()).toEqual(["despesa_categoria_do_plano", "orcamento_categoria_do_plano"]);
  });

  it("sem lançamento, cliente, fornecedor ou dado operacional; planos independentes", async () => {
    const a = criados[0];
    const b = await nova("b");
    for (const t of [schema.despesas, schema.stakeholders, schema.contasReceber]) {
      const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(t).where(inArray(t.tenantId, [a, b]));
      expect(n).toBe(0);
    }
    // personalizar B não muda A
    await db.update(schema.chartAccounts).set({ name: "Hospedagem (B)" }).where(sql`${schema.chartAccounts.tenantId} = ${b} and ${schema.chartAccounts.code} = '2.3.04'`);
    const hospA = (await getChartAccounts(a)).find((c) => c.code === "2.3.04")!;
    expect(hospA.name).toBe("Hospedagens");
  });
});
