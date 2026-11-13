import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { and, eq, inArray } from "drizzle-orm";

/**
 * Prompt DP — a chave "despesa_categoria_do_plano". Desligada: os relatórios
 * leem a categoria gravada em cada despesa e o lançamento grava a escolhida
 * (como antes). Ligada: os relatórios leem a da conta (nada é regravado) e o
 * lançamento grava a da conta, qualquer que seja a enviada. A escolha da conta
 * passa pela natureza. Integração: só com DATABASE_URL.
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

describe.skipIf(!HAS_DB)("Prompt DP — despesa herda a categoria do Plano de Contas", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { getExpenseRows } = await import("@/lib/queries");
  const { addDespesa, updateDespesa } = await import("./actions/despesas");
  const { updateChartItem, addChartItem, addChartGroup } = await import("./actions/planocontas");
  const { previaCategoriaDoPlano } = await import("./categoria-do-plano-servidor");
  let tenantId = "";
  let projectId = "";
  let atualId = "";
  let contaId = "";
  let antigaId = "";
  const CHAVE = "despesa_categoria_do_plano";
  const ligar = async (ligada: boolean) => {
    await db.delete(schema.tenantFlags).where(eq(schema.tenantFlags.tenantId, tenantId));
    if (ligada) await db.insert(schema.tenantFlags).values({ tenantId, chave: CHAVE, ligada: true });
  };
  const fd = (campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    return f;
  };
  const categoriaGravada = async (id: string) =>
    (await db.select({ c: schema.despesas.categoriaDre }).from(schema.despesas).where(eq(schema.despesas.id, id)))[0].c;

  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "tenant-prompt-dp" }).returning();
    tenantId = t.id;
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "Obra DP" }).returning();
    projectId = p.id;
    const [a] = await db.insert(schema.versions).values({ tenantId, projectId, key: "atual", kind: "atual", label: "Atual", color: "#000", isDefault: true }).returning();
    atualId = a.id;
    const contas = await db
      .insert(schema.chartAccounts)
      .values([
        { tenantId, code: "1.1", name: "Serviços técnicos", groupCode: "1", groupName: "Preliminares", kind: "cef" },
        { tenantId, code: "A.1", name: "Aluguel", groupCode: "A", groupName: "Administrativo", kind: "complementar" },
        { tenantId, code: "R.1", name: "Venda", groupCode: "R", groupName: "Receitas", kind: "complementar", natureza: "receita" },
      ])
      .returning();
    contaId = contas.find((c) => c.code === "A.1")!.id;
    // Lançada antes: conta de obra classificada como despesa fixa.
    const [d] = await db
      .insert(schema.despesas)
      .values({ tenantId, versionId: atualId, contaCef: "1.1", categoriaDre: "Despesa Fixa", valor: "300", competencia: "09/2026", status: "A pagar", numDoc: "PED-DP1" })
      .returning();
    antigaId = d.id;
    ctxRef.current = { tenant: t, projects: [p], userId: null, userEmail: "quem@teste", role: "owner", perms: defaultPermissions("owner", { operadorDaPlataforma: true }) };
  });
  afterAll(async () => {
    if (tenantId) await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("chave desligada: relatório lê a categoria gravada e o lançamento grava a escolhida", async () => {
    await ligar(false);
    expect((await getExpenseRows(atualId)).map((r) => r.categoriaDre)).toEqual(["Despesa Fixa"]);
    const r = (await addDespesa(fd({ projectId, contaCef: "1.1", categoriaDre: "Custo Fixo", valor: "10", competencia: "09/2026", vencimento: "09/30/2026" }))) as { ok: boolean; id: string };
    expect(r.ok).toBe(true);
    expect(await categoriaGravada(r.id)).toBe("Custo Fixo");
  });

  it("prévia: mostra as despesas que mudam, por conta, sem gravar", async () => {
    const previa = await previaCategoriaDoPlano(tenantId);
    expect(previa).toEqual([{ conta: "1.1", de: "Custo Fixo", para: "Custo Variável", despesas: 1, valor: 10 }, { conta: "1.1", de: "Despesa Fixa", para: "Custo Variável", despesas: 1, valor: 300 }]);
    expect(await categoriaGravada(antigaId)).toBe("Despesa Fixa");
  });

  it("chave ligada: relatório lê a da conta; nada é regravado; desligar volta", async () => {
    await ligar(true);
    expect(new Set((await getExpenseRows(atualId)).map((r) => r.categoriaDre))).toEqual(new Set(["Custo Variável"]));
    expect(await categoriaGravada(antigaId)).toBe("Despesa Fixa");
    await ligar(false);
    expect(new Set((await getExpenseRows(atualId)).map((r) => r.categoriaDre))).toEqual(new Set(["Despesa Fixa", "Custo Fixo"]));
  });

  it("chave ligada: o lançamento grava a da conta, qualquer que seja a enviada; conta de receita é recusada", async () => {
    await ligar(true);
    const r = (await addDespesa(fd({ projectId, contaCef: "A.1", categoriaDre: "Custo Variável", valor: "20", competencia: "09/2026", vencimento: "09/30/2026" }))) as { ok: boolean; id: string };
    expect(r.ok).toBe(true);
    expect(await categoriaGravada(r.id)).toBe("Despesa Fixa");
    const recusa = await addDespesa(fd({ projectId, contaCef: "R.1", categoriaDre: "Custo Variável", valor: "20", competencia: "09/2026", vencimento: "09/30/2026" }));
    expect(recusa).toMatchObject({ ok: false });
    // Edição: trocar a categoria não vale; trocar a conta traz a da conta nova.
    expect(await updateDespesa(r.id, { categoriaDre: "Custo Fixo" })).toEqual({ ok: true });
    expect(await categoriaGravada(r.id)).toBe("Despesa Fixa");
    expect(await updateDespesa(r.id, { contaCef: "1.1" })).toEqual({ ok: true });
    expect(await categoriaGravada(r.id)).toBe("Custo Variável");
  });

  it("a categoria escolhida na conta vale para o relatório; receita é recusada em conta de despesa; vazio volta ao padrão", async () => {
    await ligar(true);
    await expect(updateChartItem(contaId, { dreCategory: "Receita" })).rejects.toThrow(/Receita/);
    // conta já usada: mudar a categoria muda a DRE dos lançamentos — pede confirmação e não grava sem ela
    expect(await addDespesa(fd({ projectId, contaCef: "A.1", categoriaDre: "Despesa Fixa", valor: "1", competencia: "09/2026", vencimento: "09/30/2026" }))).toMatchObject({ ok: true });
    expect(await updateChartItem(contaId, { dreCategory: "Custo Fixo" })).toMatchObject({ ok: false, precisaConfirmar: true });
    const [antes] = await db.select().from(schema.chartAccounts).where(eq(schema.chartAccounts.id, contaId));
    expect(antes.dreCategory).toBeNull();
    expect(await updateChartItem(contaId, { dreCategory: "Custo Fixo", confirmar: true })).toEqual({ ok: true });
    const [c] = await db.select().from(schema.chartAccounts).where(and(eq(schema.chartAccounts.tenantId, tenantId), eq(schema.chartAccounts.code, "A.1")));
    expect(c.dreCategory).toBe("Custo Fixo");
    const r = (await addDespesa(fd({ projectId, contaCef: "A.1", categoriaDre: "Despesa Fixa", valor: "5", competencia: "09/2026", vencimento: "09/30/2026" }))) as { ok: boolean; id: string };
    expect(await categoriaGravada(r.id)).toBe("Custo Fixo");
    await updateChartItem(contaId, { dreCategory: "", confirmar: true });
    const [c2] = await db.select().from(schema.chartAccounts).where(eq(schema.chartAccounts.id, contaId));
    expect(c2.dreCategory).toBeNull();
    await ligar(false);
  });

  it("criar conta e grupo já escolhendo a categoria da DRE; categoria que não serve à natureza é recusada", async () => {
    await addChartItem({ kind: "complementar", groupCode: "A", groupName: "Administrativo", code: "A.90", name: "Coworking", natureza: "despesa", dreCategory: "Despesa Fixa" });
    await addChartGroup({ kind: "cef", groupCode: "PS", groupName: "Programas socioambientais", code: "PS.1", name: "Oficinas comunitárias", natureza: "despesa", dreCategory: "Custo Variável" });
    await expect(addChartItem({ kind: "complementar", groupCode: "A", groupName: "Administrativo", code: "A.91", name: "X", natureza: "despesa", dreCategory: "Receita" })).rejects.toThrow(/Receita/);
    const criadas = await db.select().from(schema.chartAccounts).where(and(eq(schema.chartAccounts.tenantId, tenantId), inArray(schema.chartAccounts.code, ["A.90", "PS.1", "A.91"])));
    expect(Object.fromEntries(criadas.map((c) => [c.code, c.dreCategory]))).toEqual({ "A.90": "Despesa Fixa", "PS.1": "Custo Variável" });
    const [grupo] = await db.select().from(schema.chartGroups).where(and(eq(schema.chartGroups.tenantId, tenantId), eq(schema.chartGroups.code, "PS")));
    expect(grupo).toMatchObject({ name: "Programas socioambientais", kind: "cef" });
  });
});
