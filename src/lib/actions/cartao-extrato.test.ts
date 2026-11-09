import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";

/** Prompt U, seções 5 e 6 — extrato do cartão e estorno. Integração (precisa de DATABASE_URL). */
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

describe.skipIf(!HAS_DB)("Extrato do cartão e estorno (Prompt U, 5 e 6)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { addDespesa } = await import("./despesas");
  const { importarExtratoCartao, registrarEstorno } = await import("./cartao-extrato");
  const { pagarFatura, previewPagamentoFatura } = await import("./faturas");
  const { getFaturasCartao, getExtratoCartao, getEstornosDoCartao, getComprasDoCartao } = await import("@/lib/queries");
  const { conferirExtrato } = await import("@/lib/calc/conferencia-cartao");
  let tenantId = "";
  let projectId = "";
  let cartaoId = "";
  let compraId = "";
  const fd = (campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    return f;
  };

  beforeAll(async () => {
    // Em qual fatura um crédito do extrato cai depende de "hoje": a da compra, se ainda não paga;
    // senão a do ciclo ABERTO hoje (cartao-extrato.ts). E `pagarFatura` recusa fatura aberta.
    // Os cenários são de março/2026 (fatura 03/10, pagamento em 03/20); fixa o relógio em 01/04/2026,
    // depois de todas as datas do cenário, para a fatura de março estar fechada e o ciclo aberto não
    // deslizar com o calendário. Só o Date é falso: timers seguem reais (driver do Postgres).
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 3, 1, 12, 0, 0));
    const [t] = await db.insert(schema.tenants).values({ name: "extrato-U4" }).returning();
    tenantId = t.id;
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "OBRA U4" }).returning();
    projectId = p.id;
    await db.insert(schema.versions).values({ projectId, tenantId, key: "atual", kind: "atual", label: "Atual", color: "#000" });
    const [c] = await db.insert(schema.cartoesCredito).values({ tenantId, apelido: "Elo", ultimos4: "4321", diaFechamento: 10, diaVencimento: 20 }).returning();
    cartaoId = c.id;
    ctxRef.current = { tenant: t, projects: [p], userId: null, userEmail: "u4@teste", role: "owner", perms: defaultPermissions("owner") };
    const r = await addDespesa(fd({ projectId, categoriaDre: "Custo Variável", formaPagamento: "Cartão de crédito", status: "A pagar", cartaoId, competencia: "03/2026", valor: "300", cartaoDataCompra: "03/05/2026", cartaoParcelas: "1", obs: "cimento" })); // fatura 03/10
    expect(r.ok).toBe(true);
    [{ id: compraId }] = await db.select({ id: schema.despesas.id }).from(schema.despesas).where(eq(schema.despesas.tenantId, tenantId));
  });
  afterAll(async () => {
    vi.useRealTimers();
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  const itens = [
    { data: "03/05/2026", descricao: "CIMENTO LTDA", valor: 300 },
    { data: "03/07/2026", descricao: "POSTO X", valor: 120 },
    { data: "03/09/2026", descricao: "ESTORNO CIMENTO", valor: -50 },
  ];

  it("13 — subir o mesmo extrato duas vezes não duplica nada; a importação não grava despesa (5.4)", async () => {
    const antes = (await db.select().from(schema.despesas).where(eq(schema.despesas.tenantId, tenantId))).length;
    expect(await importarExtratoCartao({ cartaoId, itens })).toEqual({ ok: true, inseridos: 3, ignorados: 0, vinculados: 0 });
    expect(await importarExtratoCartao({ cartaoId, itens })).toEqual({ ok: true, inseridos: 0, ignorados: 3, vinculados: 0 });
    expect(await getExtratoCartao(tenantId, cartaoId)).toHaveLength(3);
    expect((await db.select().from(schema.despesas).where(eq(schema.despesas.tenantId, tenantId))).length).toBe(antes);
    // conferência: a compra de 300 casa; o posto está sem lançamento; o crédito aparece sem estorno
    const conf = conferirExtrato(await getExtratoCartao(tenantId, cartaoId), await getComprasDoCartao(tenantId, cartaoId), await getEstornosDoCartao(tenantId, cartaoId), { diaFechamento: 10, diaVencimento: 20 });
    expect(conf.casados).toHaveLength(1);
    expect(conf.semLancamento.map((i) => i.valor)).toEqual([120]);
    expect(conf.creditos).toMatchObject([{ estorno: null }]);
  });

  it("15 / 6.2 — o estorno é lançamento próprio: reduz a fatura, a compra não é apagada nem editada", async () => {
    const [antes] = await db.select().from(schema.despesas).where(eq(schema.despesas.id, compraId));
    const credito = (await getExtratoCartao(tenantId, cartaoId)).find((i) => i.valor < 0)!;
    expect(await registrarEstorno({ cartaoId, despesaId: compraId, valor: 400, data: "03/09/2026" })).toMatchObject({ ok: false, error: expect.stringMatching(/excede/) });
    const r = await registrarEstorno({ cartaoId, despesaId: compraId, valor: 50, data: "03/09/2026", extratoItemId: credito.id });
    expect(r).toMatchObject({ ok: true, faturaFechamento: "03/10/2026" });
    const [depois] = await db.select().from(schema.despesas).where(eq(schema.despesas.id, compraId));
    expect(depois).toEqual(antes); // nada mudou na compra
    const mar = (await getFaturasCartao(tenantId)).find((f) => f.fechamento === "03/10/2026")!;
    expect(mar).toMatchObject({ valorCompras: 300, creditos: 50 });
    // 6.3 — o mesmo crédito do extrato não aceita segundo estorno
    expect(await registrarEstorno({ cartaoId, despesaId: compraId, valor: 50, data: "03/09/2026", extratoItemId: credito.id })).toMatchObject({ ok: false, error: expect.stringMatching(/já tem estorno/) });
  });

  it("14 — estorno antecipado e o crédito do extrato não se somam: o crédito é reconhecido como par", async () => {
    // antecipa 30 antes de o extrato trazer o crédito
    const r = await registrarEstorno({ cartaoId, despesaId: compraId, valor: 30, data: "03/12/2026" });
    expect(r).toMatchObject({ ok: true });
    const antes = (await getEstornosDoCartao(tenantId, cartaoId)).length;
    expect(await importarExtratoCartao({ cartaoId, itens: [{ data: "03/14/2026", descricao: "ESTORNO PARCIAL", valor: -30 }] })).toEqual({ ok: true, inseridos: 1, ignorados: 0, vinculados: 1 });
    const estornos = await getEstornosDoCartao(tenantId, cartaoId);
    expect(estornos.length).toBe(antes); // nenhum estorno novo
    expect(estornos.find((e) => e.valor === 30)?.extratoItemId).toBeTruthy();
    const mar = (await getFaturasCartao(tenantId)).find((f) => f.fechamento === "03/10/2026")!;
    expect(mar.creditos).toBe(80); // 50 + 30, uma vez só
  });

  it("os créditos entram antes do dinheiro no pagamento e ficam aplicados (sem contar duas vezes)", async () => {
    const mar = (await getFaturasCartao(tenantId)).find((f) => f.fechamento === "03/10/2026")!;
    const previa = await previewPagamentoFatura(mar.id, 0);
    expect(previa).toMatchObject({ ok: true, creditos: 80, totalDevido: 220, valor: 220 });
    expect(await pagarFatura({ faturaId: mar.id, valor: 300, data: "03/20/2026", projectId })).toMatchObject({ ok: false, error: expect.stringMatching(/excede/) });
    expect(await pagarFatura({ faturaId: mar.id, valor: 220, data: "03/20/2026", projectId, idempotencyKey: "u4-pag" })).toMatchObject({ ok: true, saldoRestante: 0 });
    const cx = await db.select().from(schema.cashEntries).where(eq(schema.cashEntries.tenantId, tenantId));
    expect(cx).toHaveLength(1);
    expect(Number(cx[0].valor)).toBe(-220); // só o dinheiro sai do caixa
    const depois = (await getFaturasCartao(tenantId)).find((f) => f.id === mar.id)!;
    expect(depois).toMatchObject({ valorPago: 300, creditos: 0 });
    expect((await getEstornosDoCartao(tenantId, cartaoId)).every((e) => e.aplicadoEm === "03/20/2026")).toBe(true);
    const pags = await db.select().from(schema.pagamentos).where(eq(schema.pagamentos.tenantId, tenantId));
    expect(pags.map((p) => Number(p.valorTotalPago)).sort((a, b) => a - b)).toEqual([80, 220]);
  });
});
