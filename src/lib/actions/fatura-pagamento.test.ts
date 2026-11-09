import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";

/** Prompt U, seção 3 — pagamento da fatura, rotativo e juro cobrado. Integração (precisa de DATABASE_URL). */
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

describe.skipIf(!HAS_DB)("Pagamento da fatura de cartão (Prompt U, 3)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { addDespesa } = await import("./despesas");
  const { pagarFatura, previewPagamentoFatura, informarJurosDaFatura } = await import("./faturas");
  const { getFaturasCartao } = await import("@/lib/queries");
  const { comRotativo } = await import("@/lib/calc/fatura");
  let tenantId = "";
  let projectId = "";
  let cartaoId = "";
  let bankId = "";
  const fd = (campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    return f;
  };
  const caixa = () => db.select().from(schema.cashEntries).where(eq(schema.cashEntries.tenantId, tenantId));
  const despesas = () => db.select().from(schema.despesas).where(eq(schema.despesas.tenantId, tenantId));

  beforeAll(async () => {
    // O estado da fatura (aberta/fechada) depende de "hoje". Os cenários foram escritos com hoje = 01/10/2026
    // (fatura de 10/10/2026 ainda aberta); fixa o relógio nessa data. Só o Date é falso: timers seguem reais (driver do Postgres).
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 1, 12, 0, 0));
    const [t] = await db.insert(schema.tenants).values({ name: "fatura-U3" }).returning();
    tenantId = t.id;
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "OBRA U3" }).returning();
    projectId = p.id;
    await db.insert(schema.versions).values({ projectId, tenantId, key: "atual", kind: "atual", label: "Atual", color: "#000" });
    const [b] = await db.insert(schema.bankAccounts).values({ tenantId, banco: "Banco U3" }).returning();
    bankId = b.id;
    // fecha dia 10, vence dia 20; compras em fevereiro e março de 2026 (faturas já fechadas em 2026-10-01)
    const [c] = await db.insert(schema.cartoesCredito).values({ tenantId, apelido: "Visa", ultimos4: "9999", diaFechamento: 10, diaVencimento: 20, bankAccountId: bankId, taxaRotativo: "10" }).returning();
    cartaoId = c.id;
    ctxRef.current = { tenant: t, projects: [p], userId: null, userEmail: "u3@teste", role: "owner", perms: defaultPermissions("owner", { operadorDaPlataforma: true }) }; // Prompt PLAT: liga chave / baixa backup — só a plataforma
    const base = { projectId, categoriaDre: "Custo Variável", formaPagamento: "Cartão de crédito", status: "A pagar", cartaoId };
    expect((await addDespesa(fd({ ...base, competencia: "02/2026", valor: "300", cartaoDataCompra: "02/05/2026", cartaoParcelas: "1", obs: "fev" }))).ok).toBe(true); // fatura 02/10
    expect((await addDespesa(fd({ ...base, competencia: "03/2026", valor: "400", cartaoDataCompra: "03/05/2026", cartaoParcelas: "1", obs: "mar" }))).ok).toBe(true); // fatura 03/10
  });
  afterAll(async () => {
    vi.useRealTimers();
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("8 / 12 — pagar gera UMA saída de caixa e nenhuma despesa; duplo clique registra um só", async () => {
    const fev = (await getFaturasCartao(tenantId)).find((f) => f.fechamento === "02/10/2026")!;
    const previa = await previewPagamentoFatura(fev.id, 300);
    expect(previa).toMatchObject({ ok: true, totalDevido: 300, valor: 300, saldoRestante: 0, estado: "fechada" });
    const antesDesp = (await despesas()).length;
    const key = "u3-pag-1";
    const r1 = await pagarFatura({ faturaId: fev.id, valor: 300, data: "02/20/2026", projectId, idempotencyKey: key });
    const r2 = await pagarFatura({ faturaId: fev.id, valor: 300, data: "02/20/2026", projectId, idempotencyKey: key });
    expect(r1).toMatchObject({ ok: true, parcelasAbatidas: 1, saldoRestante: 0 });
    expect(r2).toMatchObject({ ok: true, jaExistia: true });
    const cx = await caixa();
    expect(cx).toHaveLength(1);
    expect(Number(cx[0].valor)).toBe(-300);
    expect(cx[0].bankAccountId).toBe(bankId); // conta do cartão
    expect((await despesas()).length).toBe(antesDesp); // 3.2 — não cria despesa
    const [d] = await db.select().from(schema.despesas).where(eq(schema.despesas.obs, "fev"));
    expect(d.status).toBe("Pago");
    const pags = await db.select().from(schema.faturaPagamentos).where(eq(schema.faturaPagamentos.tenantId, tenantId));
    expect(pags).toHaveLength(1);
    expect((await getFaturasCartao(tenantId)).find((f) => f.id === fev.id)?.valorPago).toBe(300);
  });

  it("9 — pagamento parcial deixa rotativo, que aparece na fatura seguinte", async () => {
    const mar = (await getFaturasCartao(tenantId)).find((f) => f.fechamento === "03/10/2026")!;
    expect(await pagarFatura({ faturaId: mar.id, valor: 500, data: "03/20/2026", projectId })).toMatchObject({ ok: false, error: expect.stringMatching(/excede/) });
    const r = await pagarFatura({ faturaId: mar.id, valor: 150, data: "03/20/2026", projectId, idempotencyKey: "u3-pag-2" });
    expect(r).toMatchObject({ ok: true, saldoRestante: 250 });
    // o pagamento parcial já cria a fatura seguinte (abril), vazia, para o rotativo ter onde aparecer
    expect((await getFaturasCartao(tenantId)).map((f) => f.fechamento)).toContain("04/10/2026");
    expect(comRotativo(await getFaturasCartao(tenantId), "2026-10-01").find((f) => f.fechamento === "04/10/2026")).toMatchObject({ valorCompras: 0, rotativoAnterior: 250 });
    // uma compra em abril cai na mesma fatura, que continua trazendo o rotativo
    expect((await addDespesa(fd({ projectId, categoriaDre: "Custo Variável", formaPagamento: "Cartão de crédito", status: "A pagar", cartaoId, competencia: "04/2026", valor: "100", cartaoDataCompra: "04/05/2026", cartaoParcelas: "1", obs: "abr" }))).ok).toBe(true);
    const lista = comRotativo(await getFaturasCartao(tenantId), "2026-10-01");
    expect(lista.find((f) => f.fechamento === "03/10/2026")).toMatchObject({ valorPago: 150, rotativoAnterior: 0 });
    expect(lista.find((f) => f.fechamento === "04/10/2026")).toMatchObject({ valorCompras: 100, rotativoAnterior: 250 });
    // pagar abril cobre primeiro o rotativo de março (FIFO) e depois a compra de abril
    const abr = lista.find((f) => f.fechamento === "04/10/2026")!;
    const previa = await previewPagamentoFatura(abr.id, 350);
    expect(previa).toMatchObject({ ok: true, totalDevido: 350, saldoRestante: 0 });
    expect((previa as { linhas: { faturaFechamento: string }[] }).linhas.map((l) => l.faturaFechamento)).toEqual(["03/10/2026", "04/10/2026"]);
    expect(await pagarFatura({ faturaId: abr.id, valor: 350, data: "04/20/2026", projectId, idempotencyKey: "u3-pag-3" })).toMatchObject({ ok: true, parcelasAbatidas: 2, saldoRestante: 0 });
    expect((await caixa()).length).toBe(3);
  });

  it("11 / 10 — juro cobrado vira despesa financeira na competência da cobrança; a projeção não grava", async () => {
    const antes = (await despesas()).length;
    const abr = (await getFaturasCartao(tenantId)).find((f) => f.fechamento === "04/10/2026")!;
    const r = await informarJurosDaFatura({ faturaId: abr.id, valor: 25, data: "04/18/2026", projectId });
    expect(r.ok).toBe(true);
    const [j] = await db.select().from(schema.despesas).where(eq(schema.despesas.id, (r as { despesaId: string }).despesaId));
    expect(j.categoriaDre).toBe("Despesas Financeiras");
    expect(j.competencia).toBe("04/2026");
    expect(j.cartaoId).toBe(cartaoId);
    expect((await despesas()).length).toBe(antes + 1);
    const depois = (await getFaturasCartao(tenantId)).find((f) => f.id === abr.id)!;
    expect(depois.valorCompras).toBe(125); // a fatura passa a incluir o juro
    expect(depois.jurosDespesaId).toBe(j.id);
    expect(await informarJurosDaFatura({ faturaId: abr.id, valor: 5, data: "04/18/2026", projectId })).toMatchObject({ ok: false, error: expect.stringMatching(/já tem/) });
    // fatura aberta (ciclo em curso) não aceita pagamento nem juro
    expect((await addDespesa(fd({ projectId, categoriaDre: "Custo Variável", formaPagamento: "Cartão de crédito", status: "A pagar", cartaoId, competencia: "10/2026", valor: "10", cartaoDataCompra: "10/01/2026", cartaoParcelas: "1", obs: "out" }))).ok).toBe(true);
    const aberta = (await getFaturasCartao(tenantId)).find((f) => f.fechamento === "10/10/2026")!;
    expect(await pagarFatura({ faturaId: aberta.id, valor: 10, data: "10/01/2026", projectId })).toMatchObject({ ok: false, error: expect.stringMatching(/aberta/) });
    expect(await informarJurosDaFatura({ faturaId: aberta.id, valor: 1, data: "10/01/2026", projectId })).toMatchObject({ ok: false, error: expect.stringMatching(/aberta/) });
  });
});
