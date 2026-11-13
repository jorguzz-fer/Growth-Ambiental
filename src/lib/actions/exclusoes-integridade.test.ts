import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";

/**
 * Prompt I, PR I-3 — exclusões (§12, §24): despesa e unidade só sem vínculo,
 * plano de contas só sem uso, restituição cancelada em vez de apagada.
 * Integração: só com DATABASE_URL.
 */
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

describe.skipIf(!HAS_DB)("Exclusões — integridade (Prompt I, §12 e §24)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { addDespesa, deleteDespesa, pagarDespesa } = await import("./despesas");
  const { deleteChartItem, deleteChartGroup } = await import("./planocontas");
  const { cancelarRestituicao, getContaCorrenteTerceiros } = await import("./restituicoes");
  let tenantId = "";
  let projectId = "";
  let versionId = "";
  const fd = (campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    return f;
  };
  const base = () => ({ projectId, categoriaDre: "Custo Variável", valor: "100", competencia: "09/2026", vencimento: "09/30/2026" });
  const despesaExiste = async (id: string) => (await db.select().from(schema.despesas).where(eq(schema.despesas.id, id))).length === 1;

  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "excl-I3" }).returning();
    tenantId = t.id;
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "OBRA I3" }).returning();
    projectId = p.id;
    const [v] = await db
      .insert(schema.versions)
      .values({ projectId, tenantId, key: "atual", kind: "atual", label: "Atual", color: "#000" })
      .returning();
    versionId = v.id;
    ctxRef.current = { tenant: t, projects: [p], userId: null, userEmail: "quem@teste", role: "owner", perms: defaultPermissions("owner") };
  });
  afterAll(async () => {
    if (tenantId) await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  // Prompt S, 2.3 — a exclusão passou a exigir o PED digitado.
  const ped = async (id: string) => (await db.select().from(schema.despesas).where(eq(schema.despesas.id, id)))[0]?.numDoc ?? "EXCLUIR";

  it("§12 despesa: sem vínculo apaga; com pagamento, recusa e a despesa fica", async () => {
    const r0 = await addDespesa(fd(base()));
    const id = (r0 as { id: string }).id;
    expect((await pagarDespesa({ despesaId: id, dataPagamento: "09/10/2026", valorPago: 100, idempotencyKey: "x1" })).ok).toBe(true);
    const r = await deleteDespesa(id, await ped(id));
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toMatch(/1 pagamento\(s\)/);
    expect(await despesaExiste(id)).toBe(true);
    const r1 = await addDespesa(fd({ ...base(), valor: "7" }));
    const id2 = (r1 as { id: string }).id;
    expect((await deleteDespesa(id2, await ped(id2))).ok).toBe(true);
    expect(await despesaExiste(id2)).toBe(false);
  });

  it("§12 despesa: nota fiscal ou anexo também travam (a cascata os apagaria)", async () => {
    const r0 = await addDespesa(fd({ ...base(), docTipo: "NFE", docNumero: "123" }));
    const id = (r0 as { id: string }).id;
    const r = await deleteDespesa(id, await ped(id));
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toMatch(/documento\(s\) fiscal/);
    expect(await despesaExiste(id)).toBe(true);
  });

  it("§12 plano de contas: conta usada no Orçamento não é apagada; sem uso, é", async () => {
    const [usada] = await db
      .insert(schema.chartAccounts)
      .values({ tenantId, code: "9.1", name: "Usada", groupCode: "9", groupName: "Grupo 9", kind: "cef" })
      .returning();
    const [livre] = await db
      .insert(schema.chartAccounts)
      .values({ tenantId, code: "9.2", name: "Livre", groupCode: "9", groupName: "Grupo 9", kind: "cef" })
      .returning();
    await db.insert(schema.budgetAccounts).values({ tenantId, versionId, kind: "despesa", rowKey: "9.1", total: "500" });
    const r = await deleteChartItem(usada.id);
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toMatch(/Inativar/);
    expect((await deleteChartGroup({ kind: "cef", groupCode: "9" })).ok).toBe(false);
    expect((await deleteChartItem(livre.id)).ok).toBe(true);
    const restantes = await db.select().from(schema.chartAccounts).where(eq(schema.chartAccounts.tenantId, tenantId));
    expect(restantes.map((c) => c.code)).toEqual(["9.1"]);
  });

  it("§24 restituição: cancelar marca, não apaga; o saldo volta e a conta corrente ignora a cancelada", async () => {
    const [socio] = await db.insert(schema.stakeholders).values({ tenantId, nome: "Sócio X", papeis: ["Sócio/Quotista"] }).returning();
    const r0 = await addDespesa(fd({ ...base(), valor: "300", pagoPorSocioId: socio.id, socioReembolsavel: "on", socioDataPagamento: "09/01/2026" }));
    const despesaId = (r0 as { id: string }).id;
    const [dt] = await db.select().from(schema.despesaTerceiros).where(eq(schema.despesaTerceiros.despesaId, despesaId));
    const [rest] = await db
      .insert(schema.restituicoes)
      .values({ tenantId, despesaTerceiroId: dt.id, valor: "120", dataRestituicao: "09/15/2026" })
      .returning();
    await db.update(schema.despesaTerceiros).set({ valorRestituido: "120", status: "Parcialmente restituída" }).where(eq(schema.despesaTerceiros.id, dt.id));
    const r = await cancelarRestituicao(rest.id, projectId, "lançada em duplicidade");
    expect(r).toEqual({ ok: true });
    const [depois] = await db.select().from(schema.restituicoes).where(eq(schema.restituicoes.id, rest.id));
    expect(depois.cancelada).toBe(true);
    expect(depois.motivoCancelamento).toBe("lançada em duplicidade");
    expect(depois.canceladaPor).toBe("quem@teste");
    const [dtDepois] = await db.select().from(schema.despesaTerceiros).where(eq(schema.despesaTerceiros.id, dt.id));
    expect(dtDepois.valorRestituido).toBe("0.00");
    const estorno = await db
      .select()
      .from(schema.cashEntries)
      .where(and(eq(schema.cashEntries.tenantId, tenantId), eq(schema.cashEntries.descricao, "Estorno de restituição")));
    expect(estorno).toHaveLength(1);
    expect(estorno[0].valor).toBe("120.00");
    // A cancelada sai do saldo e fica no extrato como par (saída + estorno).
    const conta = (await getContaCorrenteTerceiros(tenantId)).find((c) => c.pagadorId === socio.id)!;
    expect(conta.totalRestituido).toBe(0);
    expect(conta.saldoDevido).toBe(300);
    expect(conta.movimentos.some((m) => m.tipo === "estorno" && m.id === `${rest.id}:estorno`)).toBe(true);
    expect((await cancelarRestituicao(rest.id, projectId)).ok).toBe(false); // já cancelada
  });
});
