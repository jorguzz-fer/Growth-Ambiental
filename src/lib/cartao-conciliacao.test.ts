import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";

/**
 * Prompt AT §6 (Revisão 4) — cartões de crédito na conciliação: cada linha do
 * extrato da fatura com a compra lançada no cartão. Integração (DATABASE_URL).
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

describe.skipIf(!HAS_DB)("Cartões na conciliação (AT §6)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { addDespesa } = await import("@/lib/actions/despesas");
  const { importarExtratoCartao } = await import("@/lib/actions/cartao-extrato");
  const { conciliarLinhaDoCartao, desfazerLinhaDoCartao } = await import("@/lib/actions/cartao-conciliacao");
  const { conciliacaoDoCartao } = await import("./cartao-conciliacao");
  const { saldosDosCartoes } = await import("./caixa-cartoes");
  const { pagarFatura } = await import("@/lib/actions/faturas");
  const { importCash } = await import("@/lib/actions/caixa");
  const { conciliarPagamentoDeFatura } = await import("@/lib/actions/cartao-conciliacao");
  const { getConciliacaoData, getFaturasCartao } = await import("@/lib/queries");
  const { realizadoDaVersao } = await import("./movimento-obra");
  let tenantId = "";
  let projectId = "";
  let cartaoId = "";
  let outroCartao = "";
  const fd = (campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    return f;
  };
  const compra = async (valor: string, data: string, obs: string, cartao = cartaoId, extra: Record<string, string> = {}) => {
    const r = await addDespesa(fd({ projectId, categoriaDre: "Custo Variável", formaPagamento: "Cartão de crédito", status: "A pagar", cartaoId: cartao, competencia: "03/2026", valor, cartaoDataCompra: data, cartaoParcelas: "1", obs, ...extra }));
    expect(r.ok).toBe(true);
    return (r as { id: string }).id;
  };

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 3, 1, 12, 0, 0));
    const [t] = await db.insert(schema.tenants).values({ name: "AT6-cartao" }).returning();
    tenantId = t.id;
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "OBRA AT6" }).returning();
    projectId = p.id;
    await db.insert(schema.versions).values({ projectId, tenantId, key: "atual", kind: "atual", label: "Atual", color: "#000" });
    [{ id: cartaoId }] = await db.insert(schema.cartoesCredito).values({ tenantId, apelido: "Visa", ultimos4: "1111", diaFechamento: 10, diaVencimento: 20 }).returning();
    [{ id: outroCartao }] = await db.insert(schema.cartoesCredito).values({ tenantId, apelido: "Master", ultimos4: "2222", diaFechamento: 10, diaVencimento: 20 }).returning();
    ctxRef.current = { tenant: t, projects: [p], userId: null, userEmail: "at6@teste", role: "owner", perms: defaultPermissions("owner") };
  });
  afterAll(async () => {
    vi.useRealTimers();
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("AT-T10: fatura com 5 linhas e 4 compras → 4 sugestões e 1 sem par; lançar a partir dela → 5 conciliadas, diferença zero", async () => {
    const valores = ["100", "200", "300", "400"];
    const ids: string[] = [];
    for (const [i, v] of valores.entries()) ids.push(await compra(v, `03/0${i + 2}/2026`, `compra ${v}`));
    expect((await importarExtratoCartao({ cartaoId, itens: [...valores.map((v, i) => ({ data: `03/0${i + 2}/2026`, descricao: `LOJA ${v}`, valor: Number(v) })), { data: "03/08/2026", descricao: "PADARIA", valor: 37.5 }] })).ok).toBe(true);

    let [fatura] = await conciliacaoDoCartao(tenantId, cartaoId);
    expect(fatura.fechamento).toBe("03/10/2026");
    expect(fatura.linhas).toHaveLength(5);
    const comSugestao = fatura.linhas.filter((l) => l.sugestoes.length > 0);
    expect(comSugestao).toHaveLength(4);
    expect(comSugestao.every((l) => l.sugestoes[0].grau === "alta")).toBe(true);
    const semPar = fatura.linhas.find((l) => l.sugestoes.length === 0)!;
    expect(semPar.descricao).toBe("PADARIA");
    expect(fatura.diferenca).toBe(1037.5);

    for (const l of comSugestao) expect(await conciliarLinhaDoCartao({ linhaId: l.id, despesaId: l.sugestoes[0].despesaId })).toEqual({ ok: true });
    // 6.2 — lançar a despesa a partir da linha: a compra nasce no cartão e a linha é conciliada com ela.
    await compra("37.50", "03/08/2026", "padaria", cartaoId, { extratoCartaoId: semPar.id });
    [fatura] = await conciliacaoDoCartao(tenantId, cartaoId);
    expect(fatura.linhas.every((l) => l.despesaId)).toBe(true);
    expect(fatura.totalConciliado).toBe(1037.5);
    expect(fatura.diferenca).toBe(0);

    const [saldo] = (await saldosDosCartoes(tenantId, "2026-04-01")).filter((k) => k.id === cartaoId);
    expect(saldo).toMatchObject({ pendentes: 0, conciliado: 1037.5, ultimoExtrato: "2026-03-08" });
  });

  it("só candidatas do servidor: compra de outro cartão é recusada; linha já conciliada também; desfazer exige motivo", async () => {
    const deOutro = await compra("55", "03/09/2026", "outro cartão", outroCartao);
    expect((await importarExtratoCartao({ cartaoId, itens: [{ data: "03/09/2026", descricao: "LOJA 55", valor: 55 }] })).ok).toBe(true);
    const [fatura] = await conciliacaoDoCartao(tenantId, cartaoId);
    const linha = fatura.linhas.find((l) => l.descricao === "LOJA 55")!;
    expect(linha.sugestoes).toEqual([]);
    expect(await conciliarLinhaDoCartao({ linhaId: linha.id, despesaId: deOutro })).toMatchObject({ ok: false });
    const [l] = await db.select().from(schema.extratoCartao).where(eq(schema.extratoCartao.id, linha.id));
    expect(l.despesaId).toBeNull();

    const conciliada = fatura.linhas.find((x) => x.despesaId)!;
    expect(await conciliarLinhaDoCartao({ linhaId: conciliada.id, despesaId: conciliada.despesaId! })).toMatchObject({ ok: false });
    expect(await desfazerLinhaDoCartao(conciliada.id, "  ")).toMatchObject({ ok: false });
    expect(await desfazerLinhaDoCartao(conciliada.id, "linha errada")).toEqual({ ok: true });
    const [depois] = await conciliacaoDoCartao(tenantId, cartaoId);
    const volta = depois.linhas.find((x) => x.id === conciliada.id)!;
    expect(volta.despesaId).toBeNull();
    // a compra volta a ser sugerida para a linha
    expect(volta.sugestoes.map((s) => s.despesaId)).toContain(conciliada.despesaId);
  });

  it("crédito do extrato não concilia com compra: segue o fluxo de estorno (6.3)", async () => {
    expect((await importarExtratoCartao({ cartaoId, itens: [{ data: "03/09/2026", descricao: "ESTORNO", valor: -20 }] })).ok).toBe(true);
    const [fatura] = await conciliacaoDoCartao(tenantId, cartaoId);
    const credito = fatura.linhas.find((l) => l.valor < 0)!;
    expect(credito.credito).toBe(true);
    expect(credito.sugestoes).toEqual([]);
    const algumaCompra = fatura.linhas.find((l) => l.despesaId)!.despesaId!;
    expect(await conciliarLinhaDoCartao({ linhaId: credito.id, despesaId: algumaCompra })).toMatchObject({ ok: false });
  });

  it("AT-T11: a saída do pagamento da fatura na conta corrente concilia com o pagamento da fatura e não gera saída nova", async () => {
    const [conta] = await db.insert(schema.bankAccounts).values({ tenantId, banco: "Banco PJ", cc: "77" }).returning();
    await db.update(schema.cartoesCredito).set({ bankAccountId: conta.id }).where(eq(schema.cartoesCredito.id, cartaoId));
    const fatura = (await getFaturasCartao(tenantId, cartaoId)).find((f) => f.fechamento === "03/10/2026")!;
    const pag = await pagarFatura({ faturaId: fatura.id, valor: 500, data: "03/20/2026", projectId, idempotencyKey: "at11" });
    expect(pag).toMatchObject({ ok: true });
    const daConta = () => db.select().from(schema.cashEntries).where(eq(schema.cashEntries.bankAccountId, conta.id));
    expect((await daConta()).map((c) => Number(c.valor))).toEqual([-500]);
    const [atual] = await db.select().from(schema.versions).where(eq(schema.versions.projectId, projectId));
    const realizadoAntes = (await realizadoDaVersao(atual.id)).reduce((a, c) => a + c.valor, 0);

    // o extrato da conta corrente chega com a saída do pagamento
    const imp = await importCash({ rows: [{ data: "03/21/2026", descricao: "PAGTO CARTAO VISA", valor: -500 }], bankAccountId: conta.id, projectId });
    expect(imp.inserted).toBe(1);
    const conc = await getConciliacaoData(tenantId, {});
    const pendente = conc.pendentes.find((m) => m.valor === -500)!;
    expect(pendente.faturas?.map((f) => f.grau)).toEqual(["alta"]);
    // e não sugere as compras da fatura
    expect(pendente.sugestoes.every((s) => s.valor === 500)).toBe(true);

    expect(await conciliarPagamentoDeFatura({ cashEntryId: pendente.cashEntryId, faturaPagamentoId: pendente.faturas![0].faturaPagamentoId })).toEqual({ ok: true });
    const depois = await daConta();
    expect(depois.map((c) => [Number(c.valor), c.rec, c.id])).toEqual([[-500, true, pendente.cashEntryId]]);
    const [fp] = await db.select().from(schema.faturaPagamentos).where(eq(schema.faturaPagamentos.tenantId, tenantId));
    expect(fp.cashEntryId).toBe(pendente.cashEntryId);
    // o realizado da obra não muda: a saída continua contando uma vez
    expect((await realizadoDaVersao(atual.id)).reduce((a, c) => a + c.valor, 0)).toBe(realizadoAntes);
    // e a mesma linha não concilia de novo
    expect(await conciliarPagamentoDeFatura({ cashEntryId: pendente.cashEntryId, faturaPagamentoId: fp.id })).toMatchObject({ ok: false });
    const audit = await db.select().from(schema.auditLog).where(eq(schema.auditLog.action, "cartao.fatura.conciliar"));
    expect(audit.some((a) => (a.meta as { saidaGeradaRemovida: { valor: string } | null }).saidaGeradaRemovida?.valor === "-500.00")).toBe(true);
  });
});
