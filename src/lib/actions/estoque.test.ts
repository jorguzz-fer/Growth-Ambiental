import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq, and } from "drizzle-orm";

/** Prompt Y — Estoque, PR Y-1. Integração (precisa de DATABASE_URL). */
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

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe.skipIf(!HAS_DB)("Estoque — actions (Prompt Y, PR Y-1)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { addStockItem, updateStockItem, addStockMovement, estornarMovimento, deleteStockItem, setStockItemAtivo } = await import("./estoque");
  const { getStockSaldos, getDespesasParaEstoque } = await import("@/lib/queries");
  let tenant: typeof schema.tenants.$inferSelect;
  let projectId = "";
  let despesaId = "";
  let permutaId = "";
  let itemId = "";
  let saidaId = "";
  const saldo = async () => (await getStockSaldos(tenant.id)).get(itemId) ?? 0;
  const despesasAntes = async () => (await db.select().from(schema.despesas).where(eq(schema.despesas.tenantId, tenant.id))).map((d) => ({ id: d.id, valor: d.valor, status: d.status, competencia: d.competencia }));
  let fotoDasDespesas: Awaited<ReturnType<typeof despesasAntes>> = [];

  beforeAll(async () => {
    [tenant] = await db.insert(schema.tenants).values({ name: "estoque-Y1" }).returning();
    const [p] = await db.insert(schema.projects).values({ tenantId: tenant.id, name: "OBRA Y1" }).returning();
    const [v] = await db.insert(schema.versions).values({ projectId: p.id, tenantId: tenant.id, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
    projectId = p.id;
    const [d] = await db.insert(schema.despesas).values({ versionId: v.id, tenantId: tenant.id, valor: "100", categoriaDre: "Custo Variável", competencia: "09/2026", vencimento: "09/10/2026", status: "A pagar", obs: "cimento", numDoc: "PED-Y1" }).returning();
    despesaId = d.id;
    const [pm] = await db.insert(schema.permutas).values({ versionId: v.id, tenantId: tenant.id, descricao: "Terreno" }).returning();
    permutaId = pm.id;
    ctxRef.current = { tenant, projects: [{ id: projectId }], userId: null, userEmail: "y1@teste", role: "owner", perms: defaultPermissions("owner") };
    fotoDasDespesas = await despesasAntes();
  });
  afterAll(async () => {
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenant.id));
  });

  it("15 / 5.1 — nome vazio e unidade fora da lista são recusados; cadastro válido grava e audita", async () => {
    expect(await addStockItem(fd({ nome: "  ", unidade: "sc", custoUnit: "10" }))).toMatchObject({ ok: false, error: expect.stringMatching(/nome/) });
    expect(await addStockItem(fd({ nome: "Cimento", unidade: "sacos", custoUnit: "10" }))).toMatchObject({ ok: false, error: expect.stringMatching(/unidade/) });
    expect(await addStockItem(fd({ nome: "Cimento", unidade: "sc", custoUnit: "-1" }))).toMatchObject({ ok: false, error: expect.stringMatching(/negativo/) });
    const r = await addStockItem(fd({ nome: "Cimento CP-II", unidade: "sc", custoUnit: "10", minimo: "5" }));
    expect(r).toMatchObject({ ok: true });
    itemId = (r as { ok: true; id: string }).id;
  });

  it("6 / 7 / 1 / 11 — entrada exige despesa OU permuta; grava o custo do cadastro; saldo sobe; alterar o cadastro não reescreve", async () => {
    expect(await addStockMovement(fd({ itemId, tipo: "entrada", quantidade: "5" }))).toMatchObject({ ok: false, error: expect.stringMatching(/sem origem/) });
    expect(await addStockMovement(fd({ itemId, tipo: "entrada", quantidade: "5", despesaId, permutaId }))).toMatchObject({ ok: false, error: expect.stringMatching(/não as duas/) });
    const r = await addStockMovement(fd({ itemId, tipo: "entrada", quantidade: "5", despesaId, origem: "Compra", data: "09/20/2026" }));
    expect(r).toMatchObject({ ok: true, aviso: null });
    expect(await saldo()).toBe(5);
    const [m] = await db.select().from(schema.stockMovements).where(eq(schema.stockMovements.id, (r as { ok: true; id: string }).id));
    expect(Number(m.custoUnit)).toBe(10);
    expect(m.responsavel).toBe("y1@teste");
    // 11 — muda o custo do cadastro: o movimento mantém 10
    expect(await updateStockItem(itemId, fd({ nome: "Cimento CP-II", unidade: "sc", custoUnit: "20", minimo: "5" }))).toMatchObject({ ok: true });
    const [m2] = await db.select().from(schema.stockMovements).where(eq(schema.stockMovements.id, m.id));
    expect(Number(m2.custoUnit)).toBe(10);
    // entrada por permuta também vale
    expect(await addStockMovement(fd({ itemId, tipo: "entrada", quantidade: "1", permutaId, origem: "Permuta" }))).toMatchObject({ ok: true });
    expect(await saldo()).toBe(6);
  });

  it("8 / 9 — a mesma despesa gera várias entradas; soma acima do valor da despesa AVISA sem bloquear", async () => {
    // já há 5 × 10 = 50 na despesa de 100; mais 4 × 20 = 80 → 130 > 100
    const r = await addStockMovement(fd({ itemId, tipo: "entrada", quantidade: "4", despesaId, origem: "Compra" }));
    expect(r).toMatchObject({ ok: true, aviso: expect.stringMatching(/acima do valor lançado/) });
    expect(await saldo()).toBe(10);
    const d = (await getDespesasParaEstoque(tenant.id)).find((x) => x.id === despesaId)!;
    expect(d.entradasSoma).toBe(130);
    expect(d.numDoc).toBe("PED-Y1");
  });

  it("10 / 12 / 2 / 10a — saída exige obra; maior que o saldo avisa e só grava com confirmação; saldo negativo aparece; nenhuma despesa criada ou alterada", async () => {
    expect(await addStockMovement(fd({ itemId, tipo: "saida", quantidade: "3" }))).toMatchObject({ ok: false, error: expect.stringMatching(/qual projeto/) });
    const r1 = await addStockMovement(fd({ itemId, tipo: "saida", quantidade: "25", projectId, origem: "Consumo na obra" }));
    expect(r1).toMatchObject({ ok: false, precisaConfirmar: true, error: expect.stringMatching(/fica em -15 sc/) });
    expect(await saldo()).toBe(10); // nada gravado
    const r2 = await addStockMovement(fd({ itemId, tipo: "saida", quantidade: "25", projectId, origem: "Consumo na obra", confirmar: "1" }));
    expect(r2).toMatchObject({ ok: true });
    saidaId = (r2 as { ok: true; id: string }).id;
    expect(await saldo()).toBe(-15); // negativo é informação, não é escondido
    expect(await despesasAntes()).toEqual(fotoDasDespesas); // 10a — a saída não cria nem altera despesa
  });

  it("13 — estornar cria lançamento inverso (mesma quantidade e custo) e NÃO apaga o original; não se estorna duas vezes", async () => {
    expect(await estornarMovimento(saidaId, "  ")).toMatchObject({ ok: false, error: expect.stringMatching(/motivo/) });
    const r = await estornarMovimento(saidaId, "requisição cancelada");
    expect(r).toMatchObject({ ok: true });
    const [orig] = await db.select().from(schema.stockMovements).where(eq(schema.stockMovements.id, saidaId));
    expect(orig).toBeTruthy();
    const [inv] = await db.select().from(schema.stockMovements).where(eq(schema.stockMovements.id, (r as { ok: true; id: string }).id));
    expect(inv).toMatchObject({ tipo: "entrada", estornoDeId: saidaId, projectId, origem: "Estorno" });
    expect(Number(inv.quantidade)).toBe(25);
    expect(Number(inv.custoUnit)).toBe(Number(orig.custoUnit));
    expect(await saldo()).toBe(10);
    expect(await estornarMovimento(saidaId, "de novo")).toMatchObject({ ok: false, error: expect.stringMatching(/já foi estornado/) });
    expect(await estornarMovimento(inv.id, "x")).toMatchObject({ ok: false, error: expect.stringMatching(/já é um estorno/) });
  });

  it("14 — excluir item com movimento é recusado, com opção de inativar; item inativo não movimenta; item sem movimento é excluído com auditoria", async () => {
    expect(await deleteStockItem(itemId)).toMatchObject({ ok: false, podeInativar: true, error: expect.stringMatching(/inative/) });
    expect(await setStockItemAtivo(itemId, false)).toMatchObject({ ok: true });
    expect(await addStockMovement(fd({ itemId, tipo: "entrada", quantidade: "1", despesaId }))).toMatchObject({ ok: false, error: expect.stringMatching(/inativo/) });
    const outro = await addStockItem(fd({ nome: "Areia", unidade: "m³", custoUnit: "80" }));
    const outroId = (outro as { ok: true; id: string }).id;
    expect(await deleteStockItem(outroId)).toMatchObject({ ok: true });
    const [log] = await db.select().from(schema.auditLog).where(and(eq(schema.auditLog.tenantId, tenant.id), eq(schema.auditLog.action, "estoque.item.delete")));
    expect(log.meta).toMatchObject({ nome: "Areia", movimentacoesExcluidas: 0 });
    expect((await db.select().from(schema.stockMovements).where(eq(schema.stockMovements.tenantId, tenant.id))).length).toBe(5); // nada apagado em cascata
  });
});
