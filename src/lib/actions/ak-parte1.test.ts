import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";

/**
 * AK Parte 1 — as 8 actions que gravavam sem rastro passam a registrar, e
 * NENHUMA muda o que grava (1.2). Integração: roda só com DATABASE_URL.
 */
const HAS_DB = !!process.env.DATABASE_URL;

const ctxRef: { current: unknown } = { current: null };
vi.mock("@/lib/context", async (orig) => ({
  ...(await orig<typeof import("@/lib/context")>()),
  getTenantContext: async () => ctxRef.current,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

describe.skipIf(!HAS_DB)("AK Parte 1 — as ações registram no log (liberação de obra, permuta e INCC saíram com os módulos)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  let tenantId = "";
  let ids: Record<string, string> = {};

  const logs = async (action: string) =>
    db
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.tenantId, tenantId), eq(schema.auditLog.action, action)));

  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "tenant-ak1" }).returning();
    tenantId = t.id;
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "Projeto AK" }).returning();
    const [v1] = await db
      .insert(schema.versions)
      .values({ projectId: p.id, tenantId, key: "atual", kind: "atual", label: "Atual", color: "#000", isDefault: true })
      .returning();
    const [v2] = await db
      .insert(schema.versions)
      .values({ projectId: p.id, tenantId, key: "c1", kind: "custom", label: "Cenário 1", color: "#111" })
      .returning();
    const [cash] = await db
      .insert(schema.cashEntries)
      .values({ versionId: v1.id, tenantId, data: "2026-09-01", descricao: "Tarifa", valor: "-10", rec: false })
      .returning();
    const [item] = await db.insert(schema.stockItems).values({ tenantId, nome: "Cimento", unidade: "sc" }).returning();
    await db.insert(schema.stockMovements).values([
      { tenantId, itemId: item.id, tipo: "entrada", quantidade: "10" },
      { tenantId, itemId: item.id, tipo: "saida", quantidade: "3" },
    ]);
    await db.insert(schema.inccRates).values([
      { projectId: p.id, tenantId, mes: "01/2026", monthly: "0.5000", accumulated: "0.5000", ordem: 1 },
      { projectId: p.id, tenantId, mes: "02/2026", monthly: "0.3000", accumulated: "0.8015", ordem: 2 },
    ]);
    ids = { project: p.id, v1: v1.id, v2: v2.id, cash: cash.id, item: item.id };
    ctxRef.current = {
      tenant: t,
      projects: [p],
      project: p,
      versions: [v1, v2],
      version: v1,
      userId: null,
      userEmail: null,
      role: "owner",
      perms: defaultPermissions("owner"),
    };
  });

  afterAll(async () => {
    if (tenantId) await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  const fd = (o: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) f.set(k, v);
    return f;
  };

  it("addBankAccount → contaCorrente.create, grava igual", async () => {
    const { addBankAccount } = await import("./despesas");
    await addBankAccount(fd({ banco: "Banco X", ag: "1", cc: "2", tipo: "Construtora" }));
    const [c] = await db.select().from(schema.bankAccounts).where(eq(schema.bankAccounts.tenantId, tenantId));
    expect(c.banco).toBe("Banco X");
    const [l] = await logs("contaCorrente.create");
    expect(l.entityId).toBe(c.id);
  });

  it("toggleConciliado → conciliacao.flag (Prompt AT §2.2: o seletor só desfaz, com motivo)", async () => {
    const { toggleConciliado } = await import("./caixa");
    // marca antiga, sem vínculo (o caminho que criava isso foi fechado)
    await db.update(schema.cashEntries).set({ rec: true }).where(eq(schema.cashEntries.id, ids.cash));
    await toggleConciliado(ids.cash, false, null, "marcado por engano");
    const [c] = await db.select().from(schema.cashEntries).where(eq(schema.cashEntries.id, ids.cash));
    expect(c.rec).toBe(false);
    const [l] = await logs("conciliacao.flag");
    expect(l.meta).toMatchObject({ para: false, motivo: "marcado por engano" });
  });

  it("deleteStockItem → estoque.item.delete com o que existia (Prompt Y: com movimento, recusa; sem, exclui e audita)", async () => {
    const { deleteStockItem } = await import("./estoque");
    // Prompt Y, 5.2 — item com movimento NÃO é apagado (o histórico ficaria perdido): recusa e oferece inativar
    expect(await deleteStockItem(ids.item)).toMatchObject({ ok: false, podeInativar: true });
    expect(await db.select().from(schema.stockItems).where(eq(schema.stockItems.id, ids.item))).toHaveLength(1);
    await db.delete(schema.stockMovements).where(eq(schema.stockMovements.itemId, ids.item));
    expect(await deleteStockItem(ids.item)).toMatchObject({ ok: true });
    const restantes = await db.select().from(schema.stockItems).where(eq(schema.stockItems.id, ids.item));
    expect(restantes).toHaveLength(0);
    const [l] = await logs("estoque.item.delete");
    expect(l.meta).toMatchObject({ nome: "Cimento", saldo: 0, movimentacoesExcluidas: 0 });
  });

  // setDefaultVersion saiu com a tela /versao (Prompt AP, BAP-4): não há mais
  // escrita de is_default pela interface. Os registros antigos ficam no log.
});
