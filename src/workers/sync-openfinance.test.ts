import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";

/**
 * Prompt AT §1 (Revisão 4) — o worker do Open Finance grava cada transação
 * uma vez por conta (nunca uma por obra) e deduplica pelo id da transação.
 * Só o banco: a Pluggy não é chamada (as transações entram prontas).
 */
const HAS_DB = !!process.env.DATABASE_URL;

describe.skipIf(!HAS_DB)("Open Finance: uma vez por conta, dedup pelo id (AT §1)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { gravarTransacoesDaConta, versaoDeDestinoProvisoria } = await import("./sync-openfinance");
  const tenants: string[] = [];

  async function empresaCom3Obras() {
    const [t] = await db.insert(schema.tenants).values({ name: "openfinance-AT1" }).returning();
    tenants.push(t.id);
    const atuais: string[] = [];
    for (const nome of ["OBRA A", "OBRA B", "OBRA C"]) {
      const [p] = await db.insert(schema.projects).values({ tenantId: t.id, name: nome }).returning();
      await db.insert(schema.versions).values({ projectId: p.id, tenantId: t.id, key: "budget", kind: "budget", label: "Orç", color: "#000" });
      const [v] = await db.insert(schema.versions).values({ projectId: p.id, tenantId: t.id, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
      atuais.push(v.id);
    }
    const [conta] = await db.insert(schema.bankAccounts).values({ tenantId: t.id, banco: "Banco OF", cc: "1-2", openFinanceId: "acc-1" }).returning();
    return { tenantId: t.id, conta, atuais };
  }
  const movimentos = (tenantId: string) => db.select().from(schema.cashEntries).where(eq(schema.cashEntries.tenantId, tenantId));

  afterAll(async () => {
    for (const id of tenants) await db.delete(schema.tenants).where(eq(schema.tenants.id, id));
  });

  it("AT-T1: empresa com 3 obras, 1 conta, 10 transações → 10 movimentos, todos na mesma versão Atual", async () => {
    const { tenantId, conta, atuais } = await empresaCom3Obras();
    const txs = Array.from({ length: 10 }, (_, i) => ({ id: `tx-${i}`, description: `PIX ${i}`, amount: 100 + i, date: "2026-11-05T10:00:00.000Z" }));
    expect(await gravarTransacoesDaConta(conta, txs)).toBe(10);
    const ms = await movimentos(tenantId);
    expect(ms).toHaveLength(10);
    expect(new Set(ms.map((m) => m.versionId))).toEqual(new Set([atuais[0]]));
    expect(await versaoDeDestinoProvisoria(tenantId)).toBe(atuais[0]);
    expect(ms.every((m) => m.bankAccountId === conta.id && m.rec === false && m.data === "11/05/2026")).toBe(true);
    expect(ms.map((m) => m.externalId).sort()).toEqual(txs.map((t) => t.id).sort());
  });

  it("AT-T2: dois 'PIX RECEBIDO' no mesmo dia com valores diferentes → 2; a mesma transação de novo → 1", async () => {
    const { tenantId, conta } = await empresaCom3Obras();
    const dia = "2026-11-06T00:00:00.000Z";
    const txs = [
      { id: "pix-a", description: "PIX RECEBIDO", amount: 150, date: dia },
      { id: "pix-b", description: "PIX RECEBIDO", amount: 320.5, date: dia },
    ];
    expect(await gravarTransacoesDaConta(conta, txs)).toBe(2);
    // a sincronização seguinte devolve as mesmas transações, mais uma nova
    expect(await gravarTransacoesDaConta(conta, [...txs, { id: "pix-c", description: "TARIFA", amount: -9.9, date: dia }])).toBe(1);
    // e uma repetição dentro do mesmo lote também não duplica
    expect(await gravarTransacoesDaConta(conta, [{ id: "pix-d", description: "PIX", amount: 1, date: dia }, { id: "pix-d", description: "PIX", amount: 1, date: dia }])).toBe(1);
    const ms = await movimentos(tenantId);
    expect(ms).toHaveLength(4);
    expect(ms.filter((m) => m.descricao === "PIX RECEBIDO").map((m) => Number(m.valor)).sort((a, b) => a - b)).toEqual([150, 320.5]);
  });

  it("o mesmo id em outra conta é outra transação; empresa sem versão Atual não grava", async () => {
    const { tenantId, conta } = await empresaCom3Obras();
    const [outra] = await db.insert(schema.bankAccounts).values({ tenantId, banco: "Banco OF 2", openFinanceId: "acc-2" }).returning();
    const tx = { id: "mesmo-id", description: "PIX", amount: 10, date: "2026-11-07" };
    expect(await gravarTransacoesDaConta(conta, [tx])).toBe(1);
    expect(await gravarTransacoesDaConta(outra, [tx])).toBe(1);

    const [vazia] = await db.insert(schema.tenants).values({ name: "openfinance-sem-atual" }).returning();
    tenants.push(vazia.id);
    const [c] = await db.insert(schema.bankAccounts).values({ tenantId: vazia.id, banco: "Banco", openFinanceId: "acc-3" }).returning();
    expect(await gravarTransacoesDaConta(c, [tx])).toBe(0);
  });
});
