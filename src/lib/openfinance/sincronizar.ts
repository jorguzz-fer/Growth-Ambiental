import { and, asc, eq, inArray, isNull, ne } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { chaveLigada } from "@/lib/chaves-tenant";
import { logAudit } from "@/lib/audit";
import { assinaturaDoItem } from "@/lib/calc/conferencia-cartao";
import {
  authenticate,
  buscarItem,
  buscarTransacao,
  listarContas,
  listTransactions,
  valorComSinal,
  type PluggyItem,
  type PluggyTransaction,
} from "@/lib/openfinance/pluggy";

/**
 * Prompt AT §1-B (Revisão 4) — as regras de gravação do Open Finance, usadas
 * pelo webhook, pela sincronização diária e pela sincronização manual. TUDO é
 * o mesmo código (1-B.7).
 *
 * 1-B.6:
 * - conta corrente → `cash_entry`, com `external_id`;
 * - cartão → `extrato_cartao`, com `external_id`;
 * - saldo da conta → `bank_account.saldo`, `saldo_source = 'auto'`, `last_sync`;
 * - transação ALTERADA pelo banco: se o movimento não está conciliado, atualiza;
 *   se está, NÃO muda nada e marca para revisão (`revisao_banco = 'alterada'`);
 * - transação REMOVIDA pelo banco: nunca apaga; marca `revisao_banco = 'removida'`;
 * - PRIMEIRA sincronização de uma conta que já recebeu extrato importado:
 *   transação com mesma conta, data e valor de um movimento importado não
 *   entra; vai para a lista "possível duplicado".
 */

export type SituacaoDaConexao = "conectado" | "atualizando" | "precisa_acao" | "erro" | "desconectado";

/** "YYYY-MM-DD…" → "MM/DD/YYYY" (formato do caixa). */
export function dataDoApp(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${m}/${d}/${y}`;
}

/** Mensagem de erro em linguagem de quem opera (1-B.8), pelos códigos do SDK da Pluggy. */
export function mensagemDoErro(code: string | null | undefined, padrao?: string | null): string {
  const m: Record<string, string> = {
    INVALID_CREDENTIALS: "o banco recusou o acesso: autorize de novo",
    INVALID_CREDENTIALS_MFA: "o código de confirmação do banco não foi aceito: tente de novo",
    ALREADY_LOGGED_IN: "há outra sessão aberta no banco: saia dela e tente de novo",
    SITE_NOT_AVAILABLE: "o banco está fora do ar agora: a próxima atualização tenta de novo",
    ACCOUNT_LOCKED: "o acesso está bloqueado no banco: desbloqueie no banco e reconecte",
    ACCOUNT_CREDENTIALS_RESET: "o banco pediu nova senha: troque no banco e reconecte",
    CONNECTION_ERROR: "falha de conexão com o banco: a próxima atualização tenta de novo",
    ACCOUNT_NEEDS_ACTION: "o banco pede uma ação no app ou no site dele",
    USER_AUTHORIZATION_PENDING: "falta autorizar no app do banco",
    USER_AUTHORIZATION_NOT_GRANTED: "a autorização no banco foi negada ou expirou: reconecte",
    USER_NOT_SUPPORTED: "este tipo de conta não é aceito pelo banco no Open Finance",
    USER_INPUT_TIMEOUT: "o tempo para confirmar acabou: reconecte",
    UNEXPECTED_ERROR: "erro inesperado no banco: a próxima atualização tenta de novo",
  };
  return (code && m[code]) || padrao || "erro na conexão com o banco";
}

/** Puro. A situação do app a partir do item da Pluggy. */
export function situacaoDoItem(item: Pick<PluggyItem, "status" | "error">): { situacao: SituacaoDaConexao; erro: string | null } {
  switch (item.status) {
    case "UPDATED":
      return { situacao: "conectado", erro: null };
    case "UPDATING":
    case "MERGING":
      return { situacao: "atualizando", erro: null };
    case "WAITING_USER_INPUT":
    case "WAITING_USER_ACTION":
      return { situacao: "precisa_acao", erro: item.error ? mensagemDoErro(item.error.code, item.error.message) : "o banco pede uma confirmação: reabra a conexão" };
    case "LOGIN_ERROR":
    case "OUTDATED":
      return { situacao: "erro", erro: mensagemDoErro(item.error?.code, item.error?.message) };
    default:
      return { situacao: "atualizando", erro: null };
  }
}

/** Versão em que o movimento nasce: nenhuma com a chave da §3; senão a Atual mais antiga. */
async function versaoDoMovimento(tenantId: string): Promise<{ ok: true; versionId: string | null } | { ok: false }> {
  if (await chaveLigada(tenantId, "caixa_conciliacao_por_conta")) return { ok: true, versionId: null };
  const [v] = await db
    .select({ id: schema.versions.id })
    .from(schema.versions)
    .where(and(eq(schema.versions.tenantId, tenantId), eq(schema.versions.kind, "atual")))
    .orderBy(asc(schema.versions.createdAt), asc(schema.versions.id))
    .limit(1);
  return v ? { ok: true, versionId: v.id } : { ok: false };
}

export interface ResultadoDaConta {
  inseridos: number;
  atualizados: number;
  revisao: number;
  possiveisDuplicados: number;
}

/** Conta corrente: grava as transações pelas regras da 1-B.6. */
export async function gravarTransacoesDaConta(conta: { id: string; tenantId: string }, txs: readonly PluggyTransaction[], opts: { primeira?: boolean } = {}): Promise<ResultadoDaConta> {
  const out: ResultadoDaConta = { inseridos: 0, atualizados: 0, revisao: 0, possiveisDuplicados: 0 };
  const validas = [...new Map(txs.filter((t) => t.id).map((t) => [t.id, t])).values()];
  if (validas.length === 0) return out;
  const destino = await versaoDoMovimento(conta.tenantId);
  if (!destino.ok) return out;
  const existentes = await db
    .select()
    .from(schema.cashEntries)
    .where(and(eq(schema.cashEntries.tenantId, conta.tenantId), eq(schema.cashEntries.bankAccountId, conta.id)));
  const porExterno = new Map(existentes.filter((e) => e.externalId).map((e) => [e.externalId as string, e]));
  const importados = existentes.filter((e) => !e.externalId && e.importHash);
  const novos: (typeof schema.cashEntries.$inferInsert)[] = [];
  for (const t of validas) {
    const data = dataDoApp(t.date);
    const valor = valorComSinal(t);
    const ja = porExterno.get(t.id);
    if (ja) {
      const mudou = ja.data !== data || Math.round(Number(ja.valor) * 100) !== Math.round(valor * 100) || (ja.descricao ?? "") !== (t.description ?? "");
      if (!mudou) continue;
      const conciliado = ja.rec || !!ja.conciliadoDespesaId || !!ja.conciliadoContaReceberId;
      if (conciliado) {
        await db.update(schema.cashEntries).set({ revisaoBanco: "alterada" }).where(eq(schema.cashEntries.id, ja.id));
        out.revisao++;
      } else {
        await db.update(schema.cashEntries).set({ data, valor: String(valor), descricao: t.description, revisaoBanco: null }).where(eq(schema.cashEntries.id, ja.id));
        out.atualizados++;
      }
      continue;
    }
    if (opts.primeira) {
      const igual = importados.find((e) => e.data === data && Math.round(Number(e.valor) * 100) === Math.round(valor * 100));
      if (igual) {
        const r = await db
          .insert(schema.openfinancePossiveisDuplicados)
          .values({ tenantId: conta.tenantId, bankAccountId: conta.id, externalId: t.id, data, descricao: t.description, valor: String(valor), existenteId: igual.id })
          .onConflictDoNothing()
          .returning({ id: schema.openfinancePossiveisDuplicados.id });
        if (r.length) out.possiveisDuplicados++;
        continue;
      }
    }
    novos.push({ versionId: destino.versionId, tenantId: conta.tenantId, bankAccountId: conta.id, externalId: t.id, data, descricao: t.description, valor: String(valor), cat: "openfinance", rec: false });
  }
  if (novos.length) {
    const r = await db.insert(schema.cashEntries).values(novos).onConflictDoNothing().returning({ id: schema.cashEntries.id });
    out.inseridos += r.length;
  }
  return out;
}

/** Cartão: grava as transações no extrato do cartão (compra positiva, crédito negativo). */
export async function gravarTransacoesDoCartao(cartao: { id: string; tenantId: string }, txs: readonly PluggyTransaction[]): Promise<ResultadoDaConta> {
  const out: ResultadoDaConta = { inseridos: 0, atualizados: 0, revisao: 0, possiveisDuplicados: 0 };
  const validas = [...new Map(txs.filter((t) => t.id).map((t) => [t.id, t])).values()];
  if (validas.length === 0) return out;
  const existentes = await db.select().from(schema.extratoCartao).where(and(eq(schema.extratoCartao.tenantId, cartao.tenantId), eq(schema.extratoCartao.cartaoId, cartao.id)));
  const porExterno = new Map(existentes.filter((e) => e.externalId).map((e) => [e.externalId as string, e]));
  const manuais = existentes.filter((e) => !e.externalId);
  for (const t of validas) {
    const data = dataDoApp(t.date);
    // No cartão, a compra (DEBIT) é positiva e o crédito/estorno (CREDIT) negativo.
    const valor = -valorComSinal(t);
    const ja = porExterno.get(t.id);
    if (ja) {
      const mudou = ja.data !== data || Math.round(Number(ja.valor) * 100) !== Math.round(valor * 100) || (ja.descricao ?? "") !== (t.description ?? "");
      if (!mudou) continue;
      if (ja.despesaId) {
        await db.update(schema.extratoCartao).set({ revisaoBanco: "alterada" }).where(eq(schema.extratoCartao.id, ja.id));
        out.revisao++;
      } else {
        await db.update(schema.extratoCartao).set({ data, valor: String(valor), descricao: t.description, revisaoBanco: null }).where(eq(schema.extratoCartao.id, ja.id));
        out.atualizados++;
      }
      continue;
    }
    // A mesma linha já subida à mão (mesma data e valor, sem id do banco): passa a ter o id; não duplica.
    const manual = manuais.find((e) => e.data === data && Math.round(Number(e.valor) * 100) === Math.round(valor * 100));
    if (manual) {
      await db.update(schema.extratoCartao).set({ externalId: t.id }).where(and(eq(schema.extratoCartao.id, manual.id), isNull(schema.extratoCartao.externalId)));
      manuais.splice(manuais.indexOf(manual), 1);
      out.possiveisDuplicados++;
      continue;
    }
    const r = await db
      .insert(schema.extratoCartao)
      .values({ tenantId: cartao.tenantId, cartaoId: cartao.id, externalId: t.id, data, descricao: t.description, valor: String(valor), importHash: assinaturaDoItem(cartao.id, data, valor, t.description) })
      .onConflictDoNothing()
      .returning({ id: schema.extratoCartao.id });
    out.inseridos += r.length;
  }
  return out;
}

/** Transações removidas pelo banco: nunca apaga; marca para revisão. */
export async function marcarRemovidas(tenantId: string, ids: readonly string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const a = await db.update(schema.cashEntries).set({ revisaoBanco: "removida" }).where(and(eq(schema.cashEntries.tenantId, tenantId), inArray(schema.cashEntries.externalId, [...ids]))).returning({ id: schema.cashEntries.id });
  const b = await db.update(schema.extratoCartao).set({ revisaoBanco: "removida" }).where(and(eq(schema.extratoCartao.tenantId, tenantId), inArray(schema.extratoCartao.externalId, [...ids]))).returning({ id: schema.extratoCartao.id });
  return a.length + b.length;
}

/**
 * BAT-10 (proposta do revisor, provisório) — histórico da primeira conexão:
 * desde o dia seguinte ao último dia fechado da empresa, limitado a 90 dias.
 */
export async function desdeDaPrimeiraConexao(tenantId: string, hojeISO: string): Promise<string> {
  const limite = new Date(Date.parse(hojeISO) - 90 * 86_400_000).toISOString().slice(0, 10);
  const fechados = await db
    .select({ dia: schema.dailyClosings.dia })
    .from(schema.dailyClosings)
    .where(and(eq(schema.dailyClosings.tenantId, tenantId), isNull(schema.dailyClosings.projectId), isNull(schema.dailyClosings.reabertoEm)));
  const ultimo = fechados
    .map((f) => (/^\d{2}\/\d{2}\/\d{4}$/.test(f.dia) ? `${f.dia.slice(6)}-${f.dia.slice(0, 2)}-${f.dia.slice(3, 5)}` : null))
    .filter((x): x is string => !!x)
    .sort()
    .pop();
  if (!ultimo) return limite;
  const seguinte = new Date(Date.parse(ultimo) + 86_400_000).toISOString().slice(0, 10);
  return seguinte > limite ? seguinte : limite;
}

export interface Pluggy {
  apiKey: string;
}

/** Atualiza a situação do item e as contas dele (e o saldo das contas correntes associadas). */
export async function atualizarItem(tenantId: string, itemId: string, p?: Pluggy): Promise<SituacaoDaConexao> {
  const apiKey = p?.apiKey ?? (await authenticate());
  const item = await buscarItem(apiKey, itemId);
  const { situacao, erro } = situacaoDoItem(item);
  await db
    .update(schema.openfinanceItens)
    .set({ situacao, ultimoErro: erro, banco: item.connector?.name ?? undefined, ultimaAtualizacao: item.lastUpdatedAt ? new Date(item.lastUpdatedAt) : undefined, consentimentoExpiraEm: item.consentExpiresAt ? new Date(item.consentExpiresAt) : undefined })
    .where(and(eq(schema.openfinanceItens.itemId, itemId), eq(schema.openfinanceItens.tenantId, tenantId), ne(schema.openfinanceItens.situacao, "desconectado")));
  const contas = await listarContas(apiKey, itemId);
  for (const c of contas) {
    await db
      .insert(schema.openfinanceContas)
      .values({ tenantId, itemId, pluggyAccountId: c.id, tipo: c.type, nome: c.name ?? null, numero: c.number ?? null })
      .onConflictDoUpdate({ target: schema.openfinanceContas.pluggyAccountId, set: { nome: c.name ?? null, numero: c.number ?? null } });
    if (c.type === "BANK" && c.balance != null) {
      const [assoc] = await db.select().from(schema.openfinanceContas).where(eq(schema.openfinanceContas.pluggyAccountId, c.id)).limit(1);
      if (assoc?.bankAccountId && assoc.tenantId === tenantId) {
        await db.update(schema.bankAccounts).set({ saldo: String(c.balance), saldoSource: "auto", lastSync: new Date() }).where(and(eq(schema.bankAccounts.id, assoc.bankAccountId), eq(schema.bankAccounts.tenantId, tenantId)));
      }
    }
  }
  return situacao;
}

/** Sincroniza as transações das contas associadas de um item. */
export async function sincronizarItem(tenantId: string, itemId: string, opts: { hojeISO: string; desde?: string; p?: Pluggy }): Promise<ResultadoDaConta> {
  const apiKey = opts.p?.apiKey ?? (await authenticate());
  const [it] = await db.select().from(schema.openfinanceItens).where(and(eq(schema.openfinanceItens.itemId, itemId), eq(schema.openfinanceItens.tenantId, tenantId))).limit(1);
  if (!it || it.situacao === "desconectado") return { inseridos: 0, atualizados: 0, revisao: 0, possiveisDuplicados: 0 };
  await atualizarItem(tenantId, itemId, { apiKey });
  const primeira = !it.primeiraSincronizacaoEm;
  const desde = opts.desde ?? (primeira ? await desdeDaPrimeiraConexao(tenantId, opts.hojeISO) : new Date(Date.parse(opts.hojeISO) - 35 * 86_400_000).toISOString().slice(0, 10));
  const contas = await db.select().from(schema.openfinanceContas).where(and(eq(schema.openfinanceContas.itemId, itemId), eq(schema.openfinanceContas.tenantId, tenantId), eq(schema.openfinanceContas.ignorada, false)));
  const total: ResultadoDaConta = { inseridos: 0, atualizados: 0, revisao: 0, possiveisDuplicados: 0 };
  for (const c of contas) {
    if (!c.bankAccountId && !c.cartaoId) continue;
    const txs = await listTransactions(apiKey, c.pluggyAccountId, { from: desde, to: opts.hojeISO });
    const r = c.bankAccountId ? await gravarTransacoesDaConta({ id: c.bankAccountId, tenantId }, txs, { primeira }) : await gravarTransacoesDoCartao({ id: c.cartaoId!, tenantId }, txs);
    for (const k of Object.keys(total) as (keyof ResultadoDaConta)[]) total[k] += r[k];
  }
  if (primeira && contas.some((c) => c.bankAccountId || c.cartaoId)) await db.update(schema.openfinanceItens).set({ primeiraSincronizacaoEm: new Date() }).where(eq(schema.openfinanceItens.id, it.id));
  return total;
}

type Payload = { event: string; eventId: string; itemId?: string; accountId?: string; transactionIds?: string[]; error?: { code?: string; message?: string } };

/**
 * 1-B.5 — processa um aviso do webhook já gravado (idempotente pelo eventId,
 * na gravação). Item desconhecido é ignorado, com o motivo no registro.
 */
export async function processarEvento(eventoId: string, opts: { hojeISO: string; p?: Pluggy }): Promise<void> {
  const [ev] = await db.select().from(schema.openfinanceEventos).where(eq(schema.openfinanceEventos.id, eventoId)).limit(1);
  if (!ev || ev.processadoEm) return;
  const pl = ev.payload as Payload;
  const fim = (erro: string | null) => db.update(schema.openfinanceEventos).set({ processadoEm: new Date(), erro }).where(eq(schema.openfinanceEventos.id, ev.id));
  try {
    const [it] = pl.itemId ? await db.select().from(schema.openfinanceItens).where(eq(schema.openfinanceItens.itemId, pl.itemId)).limit(1) : [];
    if (!it) return void (await fim("item desconhecido: conexão que não é de nenhuma empresa do app (ou já removida)"));
    if (ev.tenantId !== it.tenantId) await db.update(schema.openfinanceEventos).set({ tenantId: it.tenantId }).where(eq(schema.openfinanceEventos.id, ev.id));
    const tenantId = it.tenantId;
    switch (pl.event) {
      case "item/error":
        await db.update(schema.openfinanceItens).set({ situacao: "erro", ultimoErro: mensagemDoErro(pl.error?.code, pl.error?.message) }).where(eq(schema.openfinanceItens.id, it.id));
        break;
      case "item/waiting_user_input":
      case "item/waiting_user_action":
        await db.update(schema.openfinanceItens).set({ situacao: "precisa_acao", ultimoErro: "o banco pede uma confirmação: reabra a conexão" }).where(eq(schema.openfinanceItens.id, it.id));
        break;
      case "item/deleted":
        await db.update(schema.openfinanceItens).set({ situacao: "desconectado", desconectadoEm: new Date() }).where(eq(schema.openfinanceItens.id, it.id));
        break;
      case "item/created":
      case "item/login_succeeded":
        if (it.situacao !== "desconectado") await atualizarItem(tenantId, it.itemId, opts.p);
        break;
      case "item/updated":
        if (it.situacao !== "desconectado") await sincronizarItem(tenantId, it.itemId, { hojeISO: opts.hojeISO, p: opts.p });
        break;
      case "transactions/created":
        if (it.situacao !== "desconectado") await sincronizarItem(tenantId, it.itemId, { hojeISO: opts.hojeISO, p: opts.p });
        break;
      case "transactions/updated": {
        if (it.situacao === "desconectado") break;
        const apiKey = opts.p?.apiKey ?? (await authenticate());
        const [c] = pl.accountId ? await db.select().from(schema.openfinanceContas).where(and(eq(schema.openfinanceContas.pluggyAccountId, pl.accountId), eq(schema.openfinanceContas.tenantId, tenantId))).limit(1) : [];
        if (!c || c.ignorada || (!c.bankAccountId && !c.cartaoId)) break;
        const txs: PluggyTransaction[] = [];
        for (const id of pl.transactionIds ?? []) txs.push(await buscarTransacao(apiKey, id));
        // Só as que JÁ entraram: transação alterada que não está no app é ignorada (a próxima sincronização a traz).
        if (c.bankAccountId) {
          const ja = new Set((await db.select({ e: schema.cashEntries.externalId }).from(schema.cashEntries).where(and(eq(schema.cashEntries.bankAccountId, c.bankAccountId), inArray(schema.cashEntries.externalId, txs.map((t) => t.id))))).map((x) => x.e));
          await gravarTransacoesDaConta({ id: c.bankAccountId, tenantId }, txs.filter((t) => ja.has(t.id)));
        } else {
          await gravarTransacoesDoCartao({ id: c.cartaoId!, tenantId }, txs);
        }
        break;
      }
      case "transactions/deleted":
        await marcarRemovidas(tenantId, pl.transactionIds ?? []);
        break;
      default:
        break;
    }
    await fim(null);
  } catch (e) {
    // O erro fica no próprio registro do aviso; a sincronização diária tenta de novo.
    await fim(e instanceof Error ? e.message.slice(0, 500) : "falha ao processar");
  }
}

/** Soma de resultados, para o relatório da sincronização diária. */
export function somar(a: ResultadoDaConta, b: ResultadoDaConta): ResultadoDaConta {
  return { inseridos: a.inseridos + b.inseridos, atualizados: a.atualizados + b.atualizados, revisao: a.revisao + b.revisao, possiveisDuplicados: a.possiveisDuplicados + b.possiveisDuplicados };
}

/** 1-B.7 — a rede de segurança diária: todos os itens conectados, pelo mesmo código. */
export async function sincronizarTodos(hojeISO: string): Promise<{ itens: number; falhas: number; resultado: ResultadoDaConta }> {
  const itens = await db.select().from(schema.openfinanceItens).where(ne(schema.openfinanceItens.situacao, "desconectado"));
  let resultado: ResultadoDaConta = { inseridos: 0, atualizados: 0, revisao: 0, possiveisDuplicados: 0 };
  let falhas = 0;
  if (itens.length === 0) return { itens: 0, falhas, resultado };
  const apiKey = await authenticate();
  for (const it of itens) {
    try {
      resultado = somar(resultado, await sincronizarItem(it.tenantId, it.itemId, { hojeISO, p: { apiKey } }));
    } catch (e) {
      falhas++;
      await db.update(schema.openfinanceItens).set({ ultimoErro: e instanceof Error ? e.message.slice(0, 300) : "falha na sincronização" }).where(eq(schema.openfinanceItens.id, it.id));
    }
  }
  await logAudit({ tenantId: itens[0].tenantId, userId: null, action: "openfinance.sincronizacao_diaria", entity: "openfinance_item", meta: { itens: itens.length, falhas, ...resultado } }).catch(() => {});
  return { itens: itens.length, falhas, resultado };
}
