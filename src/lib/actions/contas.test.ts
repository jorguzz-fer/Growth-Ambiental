import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";

/** Prompt X — actions de contas correntes. Integração (precisa de DATABASE_URL). */
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

describe.skipIf(!HAS_DB)("Contas correntes (Prompt X)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { addConta, updateConta, setContaAtiva, deleteConta, inventarioDaConta } = await import("./contas");
  const { getBankAccounts } = await import("@/lib/queries");
  let tenantId = "";
  let versionId = "";
  const fd = (campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    return f;
  };
  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "contas-X" }).returning();
    tenantId = t.id;
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "OBRA X" }).returning();
    const [v] = await db.insert(schema.versions).values({ projectId: p.id, tenantId, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
    versionId = v.id;
    ctxRef.current = { tenant: t, projects: [p], userId: null, userEmail: "x@teste", role: "owner", perms: defaultPermissions("owner") };
  });
  afterAll(async () => {
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("2 / 9 — cadastrar sem agência e conta avisa sem bloquear; banco vazio e saldo texto recusam; negativo aceito", async () => {
    const r = await addConta(fd({ banco: "SOCIO TESTE", saldo: "0" }));
    expect(r).toMatchObject({ ok: true, aviso: expect.stringMatching(/Sem agência e sem número/) });
    expect(await addConta(fd({ banco: "", saldo: "0" }))).toMatchObject({ ok: false, error: expect.stringMatching(/banco/) });
    expect(await addConta(fd({ banco: "Itaú", saldo: "abc" }))).toMatchObject({ ok: false, error: expect.stringMatching(/número/) });
    const neg = await addConta(fd({ banco: "Itaú", ag: "0001", cc: "1-1", saldo: "-250.5" }));
    expect(neg).toMatchObject({ ok: true, aviso: null });
    const contas = await getBankAccounts(tenantId);
    expect(contas.find((c) => c.banco === "Itaú")?.saldo).toBe("-250.50");
  });

  it("8 — alterar saldo registra valor anterior e novo; vazio e texto recusam", async () => {
    const itau = (await getBankAccounts(tenantId)).find((c) => c.banco === "Itaú")!;
    expect(await updateConta(itau.id, { saldo: "" })).toMatchObject({ ok: false });
    expect(await updateConta(itau.id, { saldo: "x1" })).toMatchObject({ ok: false });
    expect(await updateConta(itau.id, { saldo: "1200" })).toMatchObject({ ok: true });
    const logs = await db.select().from(schema.auditLog).where(eq(schema.auditLog.entityId, itau.id));
    const upd = logs.find((l) => l.action === "conta.update");
    expect(JSON.stringify(upd?.meta)).toContain('"saldo"');
    expect(JSON.stringify(upd?.meta)).toMatch(/-250\.5/);
    expect(JSON.stringify(upd?.meta)).toMatch(/1200/);
  });

  it("4 / 5 / 6 — excluir com vínculo é recusado dizendo qual; sem vínculo exclui; inativar preserva e tira do total", async () => {
    const [socio, itau] = [(await getBankAccounts(tenantId)).find((c) => c.banco === "SOCIO TESTE")!, (await getBankAccounts(tenantId)).find((c) => c.banco === "Itaú")!];
    await db.insert(schema.cashEntries).values({ tenantId, versionId, bankAccountId: itau.id, data: "09/01/2026", descricao: "x", valor: "10" });
    await db.insert(schema.cartoesCredito).values({ tenantId, apelido: "c", diaFechamento: 1, diaVencimento: 10, bankAccountId: itau.id });
    const inv = await inventarioDaConta(itau.id);
    expect(inv).toMatchObject({ ok: true, bloqueios: ["1 lançamento(s) de caixa", "1 cartão(ões) de crédito"] });
    const r = await deleteConta(itau.id);
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/1 lançamento\(s\) de caixa, 1 cartão\(ões\) de crédito/) });
    expect((await getBankAccounts(tenantId)).some((c) => c.id === itau.id)).toBe(true);
    // inativar: fica no cadastro, sai do total
    expect(await setContaAtiva(itau.id, false)).toMatchObject({ ok: true });
    const depois = await getBankAccounts(tenantId);
    expect(depois.find((c) => c.id === itau.id)?.ativo).toBe(false);
    expect(depois.filter((c) => c.ativo).reduce((a, c) => a + Number(c.saldo), 0)).toBe(0); // só o SOCIO TESTE (saldo 0)
    // sem vínculo: exclui
    expect(await deleteConta(socio.id)).toMatchObject({ ok: true });
    expect((await getBankAccounts(tenantId)).some((c) => c.id === socio.id)).toBe(false);
  });
});
