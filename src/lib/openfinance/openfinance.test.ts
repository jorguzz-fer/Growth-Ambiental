import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { and, eq } from "drizzle-orm";
import { mensagemDoErro, situacaoDoItem } from "./sincronizar";
import { valorComSinal } from "./pluggy";
import { seloDoOpenFinance } from "./selo";

/**
 * Prompt AT §1-B (Revisão 4) — conectar o Open Finance pela tela. NENHUM teste
 * chama a Pluggy de verdade (1-B.10): o `fetch` é trocado por uma Pluggy
 * simulada, com as respostas e os avisos no formato do SDK oficial.
 */
describe("regras puras", () => {
  it("o sinal vem do type (DEBIT sai, CREDIT entra), não do sinal de amount", () => {
    expect(valorComSinal({ amount: 120, type: "DEBIT" })).toBe(-120);
    expect(valorComSinal({ amount: -120, type: "DEBIT" })).toBe(-120);
    expect(valorComSinal({ amount: -50, type: "CREDIT" })).toBe(50);
    expect(valorComSinal({ amount: -7 })).toBe(-7);
  });
  it("situação do item e mensagem de erro em linguagem de quem opera", () => {
    expect(situacaoDoItem({ status: "UPDATED", error: null }).situacao).toBe("conectado");
    expect(situacaoDoItem({ status: "WAITING_USER_ACTION", error: null }).situacao).toBe("precisa_acao");
    expect(situacaoDoItem({ status: "LOGIN_ERROR", error: { code: "INVALID_CREDENTIALS" } })).toEqual({ situacao: "erro", erro: "o banco recusou o acesso: autorize de novo" });
    expect(mensagemDoErro("CODIGO_NOVO", "mensagem da Pluggy")).toBe("mensagem da Pluggy");
  });
  it("1-B.9: o selo diz a verdade", () => {
    expect(seloDoOpenFinance(false, 0)).toBeNull();
    expect(seloDoOpenFinance(true, 0)).toBe("Open Finance disponível");
    expect(seloDoOpenFinance(true, 1)).toBe("1 conta conectada");
    expect(seloDoOpenFinance(true, 3)).toBe("3 contas conectadas");
  });
});

const HAS_DB = !!process.env.DATABASE_URL;
const ctxRef: { current: unknown } = { current: null };
const depois: Promise<unknown>[] = [];
vi.mock("@/lib/context", async (orig) => ({
  ...(await orig<typeof import("@/lib/context")>()),
  getTenantContext: async () => ctxRef.current,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (fn: () => Promise<unknown>) => void depois.push(fn()) }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));
vi.mock("server-only", () => ({}));

/** A Pluggy simulada: o estado que cada endpoint devolve. */
const pluggy = {
  item: { id: "item-1", status: "UPDATED", connector: { name: "Banco Teste" }, lastUpdatedAt: "2026-11-12T10:00:00.000Z", clientUserId: "", error: null as null | { code: string; message: string } },
  contas: [
    { id: "acc-cc", itemId: "item-1", type: "BANK", subtype: "CHECKING_ACCOUNT", name: "Conta Corrente", number: "1234-5", balance: 8000 },
    { id: "acc-cartao", itemId: "item-1", type: "CREDIT", subtype: "CREDIT_CARD", name: "Cartão Visa", number: "4321", balance: 900 },
  ],
  transacoes: {} as Record<string, { id: string; description: string; amount: number; date: string; type: "DEBIT" | "CREDIT" }[]>,
  chamadas: [] as string[],
};

function fetchDaPluggy(url: string | URL | Request, init?: RequestInit): Promise<Response> {
  const u = new URL(String(url));
  pluggy.chamadas.push(`${init?.method ?? "GET"} ${u.pathname}`);
  const json = (b: unknown) => Promise.resolve(new Response(JSON.stringify(b), { status: 200, headers: { "content-type": "application/json" } }));
  if (u.pathname === "/auth") return json({ apiKey: "chave-falsa" });
  if (u.pathname === "/connect_token") return json({ accessToken: "token-do-widget" });
  if (u.pathname.startsWith("/items/")) return init?.method === "DELETE" ? Promise.resolve(new Response(null, { status: 204 })) : json(pluggy.item);
  if (u.pathname === "/accounts") return json({ results: pluggy.contas });
  if (u.pathname.startsWith("/transactions/")) {
    const id = decodeURIComponent(u.pathname.split("/")[2]);
    return json(Object.values(pluggy.transacoes).flat().find((t) => t.id === id));
  }
  if (u.pathname === "/transactions") return json({ results: pluggy.transacoes[u.searchParams.get("accountId") ?? ""] ?? [], page: 1, total: 0, totalPages: 1 });
  return Promise.resolve(new Response("nao", { status: 404 }));
}

describe.skipIf(!HAS_DB)("Open Finance pela tela (AT §1-B)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { POST: webhook } = await import("@/app/api/openfinance/webhook/route");
  const { POST: sync } = await import("@/app/api/openfinance/sync/route");
  const { abrirConexao, registrarConexao, associarConta, sincronizarAgora, desconectar, decidirPossivelDuplicado } = await import("@/lib/actions/openfinance");
  const { openFinanceDaEmpresa } = await import("./situacao");
  let tenantId = "";
  let contaId = "";
  let cartaoId = "";
  const env = { ...process.env };

  const aviso = (corpo: Record<string, unknown>, segredo = "segredo-do-webhook") =>
    webhook(new Request("http://app/api/openfinance/webhook", { method: "POST", headers: { "content-type": "application/json", "x-webhook-secret": segredo }, body: JSON.stringify(corpo) }));
  const esperarProcessamento = async () => {
    while (depois.length) await depois.shift();
  };
  const movimentos = () => db.select().from(schema.cashEntries).where(eq(schema.cashEntries.tenantId, tenantId));

  beforeAll(async () => {
    vi.stubGlobal("fetch", vi.fn(fetchDaPluggy));
    process.env.PLUGGY_CLIENT_ID = "id-teste";
    process.env.PLUGGY_CLIENT_SECRET = "secret-teste";
    process.env.PLUGGY_WEBHOOK_SECRET = "segredo-do-webhook";
    process.env.OPENFINANCE_CRON_SECRET = "segredo-do-cron";
    const [t] = await db.insert(schema.tenants).values({ name: "AT1B-openfinance" }).returning();
    tenantId = t.id;
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "OBRA OF" }).returning();
    await db.insert(schema.versions).values({ projectId: p.id, tenantId, key: "atual", kind: "atual", label: "Atual", color: "#000" });
    [{ id: contaId }] = await db.insert(schema.bankAccounts).values({ tenantId, banco: "Banco Teste", cc: "1234-5" }).returning();
    [{ id: cartaoId }] = await db.insert(schema.cartoesCredito).values({ tenantId, apelido: "Visa", ultimos4: "4321", diaFechamento: 5, diaVencimento: 15 }).returning();
    ctxRef.current = { tenant: t, projects: [p], userId: null, userEmail: "of@teste", role: "owner", perms: defaultPermissions("owner") };
    pluggy.item.clientUserId = `${tenantId}:sem-usuario`;
    // um extrato já importado na conta (para o possível duplicado da primeira sincronização)
    await db.insert(schema.cashEntries).values({ tenantId, bankAccountId: contaId, versionId: null, data: "11/03/2026", descricao: "PIX FORNECEDOR", valor: "-300", importHash: "manual-1" });
    pluggy.transacoes["acc-cc"] = [
      { id: "tx-1", description: "PIX FORNECEDOR", amount: 300, date: "2026-11-03T00:00:00.000Z", type: "DEBIT" },
      { id: "tx-2", description: "PIX RECEBIDO", amount: 1500, date: "2026-11-04T00:00:00.000Z", type: "CREDIT" },
      { id: "tx-3", description: "TARIFA", amount: 12.5, date: "2026-11-05T00:00:00.000Z", type: "DEBIT" },
    ];
    pluggy.transacoes["acc-cartao"] = [
      { id: "cc-1", description: "POSTO", amount: 150, date: "2026-11-02T00:00:00.000Z", type: "DEBIT" },
      { id: "cc-2", description: "ESTORNO", amount: 20, date: "2026-11-03T00:00:00.000Z", type: "CREDIT" },
    ];
  });
  beforeEach(() => {
    depois.length = 0;
  });
  afterAll(async () => {
    vi.unstubAllGlobals();
    process.env = env;
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("1-B.1 a 1-B.4: token do widget, conexão registrada e contas associadas (conta e cartão)", async () => {
    expect(await abrirConexao()).toEqual({ ok: true, accessToken: "token-do-widget", includeSandbox: true });
    const r = await registrarConexao("item-1");
    expect(r.ok).toBe(true);
    expect((r as { contas: { tipo: string }[] }).contas.map((c) => c.tipo).sort()).toEqual(["BANK", "CREDIT"]);
    // tipo trocado é recusado
    expect(await associarConta({ pluggyAccountId: "acc-cc", destino: `cartao:${cartaoId}` })).toMatchObject({ ok: false });
    expect(await associarConta({ pluggyAccountId: "acc-cc", destino: `conta:${contaId}` })).toEqual({ ok: true });
    expect(await associarConta({ pluggyAccountId: "acc-cartao", destino: `cartao:${cartaoId}` })).toEqual({ ok: true });
    const [b] = await db.select().from(schema.bankAccounts).where(eq(schema.bankAccounts.id, contaId));
    expect(b.openFinanceId).toBe("acc-cc");
    // item de outra empresa (clientUserId de outro tenant) é recusado
    pluggy.item.clientUserId = "outra-empresa:u-9";
    expect(await registrarConexao("item-1")).toMatchObject({ ok: false });
    pluggy.item.clientUserId = `${tenantId}:sem-usuario`;
  });

  it("AT-T23 e AT-T24: primeira sincronização — o igual ao importado não entra (possível duplicado); o cartão vai para o extrato do cartão", async () => {
    const r = await sincronizarAgora("item-1");
    expect(r).toMatchObject({ ok: true, inseridos: 4, possiveisDuplicados: 1 });
    const ms = await movimentos();
    expect(ms.map((m) => [m.externalId, Number(m.valor)]).sort()).toEqual([["tx-2", 1500], ["tx-3", -12.5], [null, -300]].sort());
    // AT-T24: nada do cartão em cash_entry
    expect(ms.some((m) => m.externalId?.startsWith("cc-"))).toBe(false);
    const linhas = await db.select().from(schema.extratoCartao).where(eq(schema.extratoCartao.cartaoId, cartaoId));
    expect(linhas.map((l) => [l.externalId, Number(l.valor)]).sort()).toEqual([["cc-1", 150], ["cc-2", -20]]);
    // saldo da conta pelo banco (1-B.6)
    const [b] = await db.select().from(schema.bankAccounts).where(eq(schema.bankAccounts.id, contaId));
    expect([Number(b.saldo), b.saldoSource]).toEqual([8000, "auto"]);
    const of = await openFinanceDaEmpresa(tenantId);
    expect(of.possiveisDuplicados).toHaveLength(1);
    expect(of.contasConectadas).toBe(2);
    // a pessoa decide: é o mesmo → o importado ganha o id do banco; nada novo entra
    expect(await decidirPossivelDuplicado(of.possiveisDuplicados[0].id, "mesmo")).toEqual({ ok: true });
    expect((await movimentos()).find((m) => m.importHash === "manual-1")!.externalId).toBe("tx-1");
    expect(await movimentos()).toHaveLength(3);
  });

  it("AT-T20: webhook com cabeçalho secreto errado → 401 e nada gravado", async () => {
    const antes = await db.select().from(schema.openfinanceEventos);
    const r = await aviso({ event: "transactions/created", eventId: "ev-falso", itemId: "item-1", accountId: "acc-cc" }, "errado");
    expect(r.status).toBe(401);
    const semCabecalho = await webhook(new Request("http://app/x", { method: "POST", body: "{}" }));
    expect(semCabecalho.status).toBe(401);
    expect(await db.select().from(schema.openfinanceEventos)).toHaveLength(antes.length);
  });

  it("AT-T21: o mesmo transactions/created duas vezes → os movimentos entram uma vez", async () => {
    pluggy.transacoes["acc-cc"].push({ id: "tx-4", description: "PIX NOVO", amount: 99.9, date: "2026-11-10T00:00:00.000Z", type: "CREDIT" });
    const corpo = { event: "transactions/created", eventId: "ev-1", itemId: "item-1", accountId: "acc-cc", transactionsCreatedAtFrom: "2026-11-10T00:00:00.000Z", createdTransactionsLink: "x" };
    const r1 = await aviso(corpo);
    expect(await r1.json()).toEqual({ ok: true, repetido: false });
    await esperarProcessamento();
    const r2 = await aviso(corpo);
    expect(await r2.json()).toEqual({ ok: true, repetido: true });
    await esperarProcessamento();
    expect((await movimentos()).filter((m) => m.externalId === "tx-4")).toHaveLength(1);
    const [ev] = await db.select().from(schema.openfinanceEventos).where(eq(schema.openfinanceEventos.eventId, "ev-1"));
    expect(ev.processadoEm).not.toBeNull();
    expect(ev.erro).toBeNull();
  });

  it("AT-T22: transactions/updated num movimento conciliado → não muda e vai para revisão; não conciliado → atualiza", async () => {
    await db.update(schema.cashEntries).set({ rec: true }).where(and(eq(schema.cashEntries.tenantId, tenantId), eq(schema.cashEntries.externalId, "tx-2")));
    const tx2 = pluggy.transacoes["acc-cc"].find((t) => t.id === "tx-2")!;
    tx2.amount = 1600;
    const tx3 = pluggy.transacoes["acc-cc"].find((t) => t.id === "tx-3")!;
    tx3.amount = 13;
    await aviso({ event: "transactions/updated", eventId: "ev-2", itemId: "item-1", accountId: "acc-cc", clientId: "c", transactionIds: ["tx-2", "tx-3"] });
    await esperarProcessamento();
    const ms = await movimentos();
    const m2 = ms.find((m) => m.externalId === "tx-2")!;
    expect([Number(m2.valor), m2.revisaoBanco]).toEqual([1500, "alterada"]);
    const m3 = ms.find((m) => m.externalId === "tx-3")!;
    expect([Number(m3.valor), m3.revisaoBanco]).toEqual([-13, null]);
  });

  it("transactions/deleted: nunca apaga; marca 'removida' para revisão", async () => {
    await aviso({ event: "transactions/deleted", eventId: "ev-3", itemId: "item-1", accountId: "acc-cc", clientId: "c", transactionIds: ["tx-3", "cc-1"] });
    await esperarProcessamento();
    expect((await movimentos()).find((m) => m.externalId === "tx-3")!.revisaoBanco).toBe("removida");
    expect((await db.select().from(schema.extratoCartao).where(eq(schema.extratoCartao.externalId, "cc-1")))[0].revisaoBanco).toBe("removida");
  });

  it("AT-T25: item/waiting_user_action → a conexão mostra 'precisa de ação' (a tela oferece reconectar)", async () => {
    await aviso({ event: "item/waiting_user_action", eventId: "ev-4", itemId: "item-1" });
    await esperarProcessamento();
    const of = await openFinanceDaEmpresa(tenantId);
    expect(of.conexoes[0].situacao).toBe("precisa_acao");
    expect(of.porConta.get(contaId)?.situacao).toBe("precisa_acao");
    // reabrir para reautorizar usa o mesmo item
    expect(await abrirConexao({ itemId: "item-1" })).toMatchObject({ ok: true });
    // item desconhecido é ignorado, com o motivo
    await aviso({ event: "item/updated", eventId: "ev-5", itemId: "item-de-ninguem" });
    await esperarProcessamento();
    const [ev] = await db.select().from(schema.openfinanceEventos).where(eq(schema.openfinanceEventos.eventId, "ev-5"));
    expect(ev.erro).toMatch(/item desconhecido/);
  });

  it("1-B.7: a sincronização diária exige o segredo; 1-B.8: desconectar mantém tudo o que já veio", async () => {
    const semSegredo = await sync(new Request("http://app/api/openfinance/sync", { method: "POST" }));
    expect(semSegredo.status).toBe(401);
    const ok = await sync(new Request("http://app/api/openfinance/sync", { method: "POST", headers: { "x-cron-secret": "segredo-do-cron" } }));
    expect(await ok.json()).toMatchObject({ ok: true, itens: 1, falhas: 0 });
    const antes = (await movimentos()).length;
    expect(await desconectar("item-1")).toEqual({ ok: true });
    expect(pluggy.chamadas).toContain("DELETE /items/item-1");
    expect((await movimentos()).length).toBe(antes);
    const of = await openFinanceDaEmpresa(tenantId);
    expect(of.conexoes).toEqual([]);
    expect(of.contasConectadas).toBe(0);
    const [b] = await db.select().from(schema.bankAccounts).where(eq(schema.bankAccounts.id, contaId));
    expect(b.openFinanceId).toBeNull();
  });
});
