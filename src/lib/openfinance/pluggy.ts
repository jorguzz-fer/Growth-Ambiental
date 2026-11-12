/**
 * Cliente mínimo da Pluggy (agregador de Open Finance brasileiro).
 * Ver docs/STACK.md §2 (Open Finance) e §5 (variáveis PLUGGY_*).
 *
 * Prompt AT §1-B (Revisão 4): endpoints e campos conferidos no SDK oficial da
 * Pluggy (`pluggy-sdk` 0.94.2, `src/client.ts` e `src/types/*`), porque a
 * documentação web não abre a partir do ambiente de desenvolvimento:
 *
 * - `POST /auth` {clientId, clientSecret} → {apiKey}; cabeçalho `X-API-KEY`.
 * - `POST /connect_token` {itemId?, options: {clientUserId, webhookUrl?,
 *   avoidDuplicates?}} → {accessToken} (o token que abre o widget).
 * - `GET /items/{id}` → Item (status UPDATED | UPDATING | WAITING_USER_INPUT |
 *   WAITING_USER_ACTION | MERGING | LOGIN_ERROR | OUTDATED; error; connector;
 *   lastUpdatedAt; clientUserId; consentExpiresAt); `DELETE /items/{id}`.
 * - `GET /accounts?itemId=` → {results: Account[]} (type BANK | CREDIT;
 *   subtype CHECKING_ACCOUNT | SAVINGS_ACCOUNT | CREDIT_CARD; balance).
 * - `GET /transactions?accountId=&from=&to=&page=&pageSize=` →
 *   {results, page, total, totalPages}; `GET /transactions/{id}`.
 *   Transação: id, date, description, amount, type DEBIT | CREDIT.
 *
 * O SINAL vem do `type` (DEBIT sai, CREDIT entra), não do sinal de `amount`:
 * o tipo é explícito e não depende de convenção por tipo de conta.
 *
 * Ambiente: `PLUGGY_ENV` = "sandbox" (padrão) ou "producao". A API é a mesma;
 * em sandbox o widget mostra os conectores de teste da Pluggy.
 */

const PLUGGY_BASE = "https://api.pluggy.ai";

export function isPluggyConfigured(): boolean {
  return Boolean(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET);
}

/** 1-B.10 — sandbox (padrão) ou produção. */
export function ambientePluggy(): "sandbox" | "producao" {
  return process.env.PLUGGY_ENV === "producao" ? "producao" : "sandbox";
}

export interface PluggyTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  /** DEBIT = saída; CREDIT = entrada. Ausente nos testes antigos: vale o sinal de `amount`. */
  type?: "DEBIT" | "CREDIT";
  category?: string | null;
}

export interface PluggyItem {
  id: string;
  status: "UPDATED" | "UPDATING" | "WAITING_USER_INPUT" | "WAITING_USER_ACTION" | "MERGING" | "LOGIN_ERROR" | "OUTDATED" | string;
  executionStatus?: string | null;
  error?: { code?: string; message?: string } | null;
  connector?: { name?: string } | null;
  lastUpdatedAt?: string | null;
  clientUserId?: string | null;
  consentExpiresAt?: string | null;
}

export interface PluggyAccount {
  id: string;
  itemId: string;
  type: "BANK" | "CREDIT" | string;
  subtype?: string | null;
  name?: string | null;
  number?: string | null;
  balance?: number | null;
}

/** Valor com sinal do app: positivo entra, negativo sai (pelo `type`). */
export function valorComSinal(t: Pick<PluggyTransaction, "amount" | "type">): number {
  const v = Math.abs(Number(t.amount) || 0);
  if (t.type === "DEBIT") return -v;
  if (t.type === "CREDIT") return v;
  return Number(t.amount) || 0;
}

/** Autentica e retorna a apiKey de curta duração. */
export async function authenticate(): Promise<string> {
  if (!isPluggyConfigured()) {
    throw new Error("Pluggy não configurada (ver .env.example).");
  }
  const res = await fetch(`${PLUGGY_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Pluggy auth falhou: ${res.status}`);
  const json = (await res.json()) as { apiKey: string };
  return json.apiKey;
}

async function pluggy<T>(apiKey: string, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${PLUGGY_BASE}/${path}`, {
    method: init.method ?? "GET",
    headers: { "X-API-KEY": apiKey, ...(init.body ? { "Content-Type": "application/json" } : {}) },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });
  if (!res.ok) throw new Error(`Pluggy ${init.method ?? "GET"} /${path.split("?")[0]} falhou: ${res.status}`);
  if (res.status === 204) return undefined as T;
  const texto = await res.text();
  return (texto ? JSON.parse(texto) : undefined) as T;
}

/** 1-B.1 — o token que abre o widget Pluggy Connect (com `itemId`, reabre para atualizar ou reautorizar). */
export async function criarConnectToken(apiKey: string, opts: { clientUserId: string; itemId?: string | null; webhookUrl?: string | null }): Promise<string> {
  const r = await pluggy<{ accessToken: string }>(apiKey, "connect_token", {
    method: "POST",
    body: { ...(opts.itemId ? { itemId: opts.itemId } : {}), options: { clientUserId: opts.clientUserId, avoidDuplicates: true, ...(opts.webhookUrl ? { webhookUrl: opts.webhookUrl } : {}) } },
  });
  return r.accessToken;
}

export function buscarItem(apiKey: string, itemId: string): Promise<PluggyItem> {
  return pluggy<PluggyItem>(apiKey, `items/${encodeURIComponent(itemId)}`);
}

export async function excluirItem(apiKey: string, itemId: string): Promise<void> {
  await pluggy<void>(apiKey, `items/${encodeURIComponent(itemId)}`, { method: "DELETE" });
}

export async function listarContas(apiKey: string, itemId: string): Promise<PluggyAccount[]> {
  const r = await pluggy<{ results: PluggyAccount[] }>(apiKey, `accounts?${new URLSearchParams({ itemId })}`);
  return r.results ?? [];
}

export function buscarTransacao(apiKey: string, id: string): Promise<PluggyTransaction> {
  return pluggy<PluggyTransaction>(apiKey, `transactions/${encodeURIComponent(id)}`);
}

/** Lista transações de uma conta conectada, no período informado, página a página. */
export async function listTransactions(
  apiKey: string,
  accountId: string,
  opts: { from?: string; to?: string } = {},
): Promise<PluggyTransaction[]> {
  const out: PluggyTransaction[] = [];
  for (let page = 1; page <= 50; page++) {
    const params = new URLSearchParams({ accountId, page: String(page), pageSize: "500" });
    if (opts.from) params.set("from", opts.from);
    if (opts.to) params.set("to", opts.to);
    const json = await pluggy<{ results: PluggyTransaction[]; totalPages?: number }>(apiKey, `transactions?${params}`);
    out.push(...(json.results ?? []));
    if (!json.totalPages || page >= json.totalPages) break;
  }
  return out;
}
