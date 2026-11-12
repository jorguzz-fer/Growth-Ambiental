"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { hojeISO } from "@/lib/despesa-status";
import { ambientePluggy, authenticate, buscarItem, criarConnectToken, excluirItem, isPluggyConfigured } from "@/lib/openfinance/pluggy";
import { atualizarItem, sincronizarItem } from "@/lib/openfinance/sincronizar";

/**
 * Prompt AT §1-B (Revisão 4) — o cliente conecta o banco sozinho, pela tela.
 * As credenciais do banco nunca passam pelo app: o widget da Pluggy conversa
 * com o banco; o servidor só cria o token e lê o resultado. Tudo exige
 * Contas/editar (1-B.1); decidir um possível duplicado exige Caixa/editar.
 */

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function contexto(perm: "contas" | "caixa" = "contas") {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, perm, "editar")) return null;
  return ctx;
}

const SEM_PERMISSAO = "Conectar banco exige a permissão Contas/editar.";

/** 1-B.1 — o token que abre o widget. Com `itemId`, reabre a conexão para reautorizar (precisa de ação). */
export async function abrirConexao(input: { itemId?: string | null } = {}): Promise<R<{ accessToken: string; includeSandbox: boolean }>> {
  const ctx = await contexto();
  if (!ctx) return { ok: false, error: SEM_PERMISSAO };
  if (!isPluggyConfigured()) return { ok: false, error: "O Open Finance não está configurado neste servidor (variáveis PLUGGY_*)." };
  if (input.itemId) {
    const [it] = await db.select().from(schema.openfinanceItens).where(and(eq(schema.openfinanceItens.itemId, input.itemId), eq(schema.openfinanceItens.tenantId, ctx.tenant.id))).limit(1);
    if (!it) return { ok: false, error: "Conexão não encontrada nesta empresa." };
  }
  try {
    const accessToken = await criarConnectToken(await authenticate(), { clientUserId: `${ctx.tenant.id}:${ctx.userId ?? "sem-usuario"}`, itemId: input.itemId ?? null });
    return { ok: true, accessToken, includeSandbox: ambientePluggy() === "sandbox" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao falar com a Pluggy." };
  }
}

export interface ContaDaConexao {
  pluggyAccountId: string;
  tipo: string;
  nome: string | null;
  numero: string | null;
  bankAccountId: string | null;
  cartaoId: string | null;
  ignorada: boolean;
}

async function contasDoItem(tenantId: string, itemId: string): Promise<ContaDaConexao[]> {
  const rows = await db.select().from(schema.openfinanceContas).where(and(eq(schema.openfinanceContas.tenantId, tenantId), eq(schema.openfinanceContas.itemId, itemId)));
  return rows.map((r) => ({ pluggyAccountId: r.pluggyAccountId, tipo: r.tipo, nome: r.nome, numero: r.numero, bankAccountId: r.bankAccountId, cartaoId: r.cartaoId, ignorada: r.ignorada }));
}

/**
 * Depois do widget (onSuccess): guarda a conexão (1-B.3) e lista as contas do
 * banco para a pessoa associar (1-B.4). O item tem de ter sido criado com o
 * token DESTA empresa (`clientUserId`): um id de outra empresa é recusado.
 */
export async function registrarConexao(itemId: string): Promise<R<{ contas: ContaDaConexao[] }>> {
  const ctx = await contexto();
  if (!ctx) return { ok: false, error: SEM_PERMISSAO };
  try {
    const apiKey = await authenticate();
    const item = await buscarItem(apiKey, itemId);
    if (!item.clientUserId?.startsWith(`${ctx.tenant.id}:`)) return { ok: false, error: "Esta conexão não foi aberta por esta empresa." };
    const [outro] = await db.select().from(schema.openfinanceItens).where(eq(schema.openfinanceItens.itemId, itemId)).limit(1);
    if (outro && outro.tenantId !== ctx.tenant.id) return { ok: false, error: "Esta conexão pertence a outra empresa." };
    if (!outro) {
      await db.insert(schema.openfinanceItens).values({ tenantId: ctx.tenant.id, itemId, banco: item.connector?.name ?? null, conectadoPor: ctx.userEmail ?? ctx.userId ?? null }).onConflictDoNothing();
      await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "openfinance.conectar", entity: "openfinance_item", entityId: itemId, meta: { banco: item.connector?.name ?? null } });
    } else if (outro.situacao === "desconectado") {
      await db.update(schema.openfinanceItens).set({ situacao: "atualizando", desconectadoEm: null, desconectadoPor: null }).where(eq(schema.openfinanceItens.id, outro.id));
    }
    await atualizarItem(ctx.tenant.id, itemId, { apiKey });
    revalidatePath("/contas");
    revalidatePath("/cartoes");
    revalidatePath("/caixa");
    return { ok: true, contas: await contasDoItem(ctx.tenant.id, itemId) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao registrar a conexão." };
  }
}

export async function contasDaConexao(itemId: string): Promise<R<{ contas: ContaDaConexao[] }>> {
  const ctx = await contexto();
  if (!ctx) return { ok: false, error: SEM_PERMISSAO };
  return { ok: true, contas: await contasDoItem(ctx.tenant.id, itemId) };
}

/**
 * 1-B.4 — associa a conta do banco: a uma conta corrente ou cartão já
 * cadastrado, a uma conta corrente nova, ou ignora. Conta do banco do tipo
 * BANK só vai para conta corrente; CREDIT só para cartão.
 */
export async function associarConta(input: { pluggyAccountId: string; destino: string }): Promise<R> {
  const ctx = await contexto();
  if (!ctx) return { ok: false, error: SEM_PERMISSAO };
  const [c] = await db.select().from(schema.openfinanceContas).where(and(eq(schema.openfinanceContas.pluggyAccountId, input.pluggyAccountId), eq(schema.openfinanceContas.tenantId, ctx.tenant.id))).limit(1);
  if (!c) return { ok: false, error: "Conta do banco não encontrada nesta empresa." };
  const quem = ctx.userEmail ?? ctx.userId ?? null;
  const [tipo, id] = input.destino.split(":");
  let bankAccountId: string | null = null;
  let cartaoId: string | null = null;
  let ignorada = false;
  if (tipo === "ignorar") ignorada = true;
  else if (tipo === "conta") {
    if (c.tipo !== "BANK") return { ok: false, error: "Cartão de crédito do banco só pode ser associado a um cartão." };
    const [b] = await db.select().from(schema.bankAccounts).where(and(eq(schema.bankAccounts.id, id), eq(schema.bankAccounts.tenantId, ctx.tenant.id))).limit(1);
    if (!b) return { ok: false, error: "Conta corrente não encontrada." };
    bankAccountId = b.id;
  } else if (tipo === "cartao") {
    if (c.tipo !== "CREDIT") return { ok: false, error: "Conta corrente do banco só pode ser associada a uma conta corrente." };
    const [k] = await db.select().from(schema.cartoesCredito).where(and(eq(schema.cartoesCredito.id, id), eq(schema.cartoesCredito.tenantId, ctx.tenant.id))).limit(1);
    if (!k) return { ok: false, error: "Cartão não encontrado." };
    cartaoId = k.id;
  } else if (tipo === "nova") {
    if (c.tipo !== "BANK") return { ok: false, error: "Para um cartão, cadastre-o antes em Cartões de Crédito (o app precisa dos dias de fechamento e vencimento) e associe." };
    const [it] = await db.select().from(schema.openfinanceItens).where(eq(schema.openfinanceItens.itemId, c.itemId)).limit(1);
    const [nova] = await db.insert(schema.bankAccounts).values({ tenantId: ctx.tenant.id, banco: it?.banco ?? c.nome ?? "Banco", cc: c.numero ?? null }).returning();
    bankAccountId = nova.id;
  } else return { ok: false, error: "Destino inválido." };
  // Uma conta do app recebe uma conta do banco só.
  if (bankAccountId) {
    const [ja] = await db.select().from(schema.openfinanceContas).where(and(eq(schema.openfinanceContas.bankAccountId, bankAccountId), eq(schema.openfinanceContas.tenantId, ctx.tenant.id))).limit(1);
    if (ja && ja.pluggyAccountId !== c.pluggyAccountId) return { ok: false, error: "Essa conta corrente já está associada a outra conta do banco." };
  }
  if (cartaoId) {
    const [ja] = await db.select().from(schema.openfinanceContas).where(and(eq(schema.openfinanceContas.cartaoId, cartaoId), eq(schema.openfinanceContas.tenantId, ctx.tenant.id))).limit(1);
    if (ja && ja.pluggyAccountId !== c.pluggyAccountId) return { ok: false, error: "Esse cartão já está associado a outro cartão do banco." };
  }
  await db.update(schema.openfinanceContas).set({ bankAccountId, cartaoId, ignorada, associadaPor: quem, associadaEm: new Date() }).where(eq(schema.openfinanceContas.id, c.id));
  // O id da conta do banco também fica no cadastro (a coluna que já existia).
  if (c.bankAccountId && c.bankAccountId !== bankAccountId) await db.update(schema.bankAccounts).set({ openFinanceId: null }).where(eq(schema.bankAccounts.id, c.bankAccountId));
  if (c.cartaoId && c.cartaoId !== cartaoId) await db.update(schema.cartoesCredito).set({ openFinanceId: null }).where(eq(schema.cartoesCredito.id, c.cartaoId));
  if (bankAccountId) await db.update(schema.bankAccounts).set({ openFinanceId: c.pluggyAccountId }).where(eq(schema.bankAccounts.id, bankAccountId));
  if (cartaoId) await db.update(schema.cartoesCredito).set({ openFinanceId: c.pluggyAccountId }).where(eq(schema.cartoesCredito.id, cartaoId));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "openfinance.associar", entity: "openfinance_conta", entityId: c.id, meta: { destino: tipo, bankAccountId, cartaoId } });
  revalidatePath("/contas");
  revalidatePath("/cartoes");
  revalidatePath("/caixa");
  return { ok: true };
}

/** Busca as transações agora (o mesmo código do webhook e da sincronização diária). */
export async function sincronizarAgora(itemId: string): Promise<R<{ inseridos: number; possiveisDuplicados: number; revisao: number }>> {
  const ctx = await contexto();
  if (!ctx) return { ok: false, error: SEM_PERMISSAO };
  try {
    const r = await sincronizarItem(ctx.tenant.id, itemId, { hojeISO: hojeISO() });
    revalidatePath("/caixa");
    revalidatePath("/contas");
    revalidatePath("/cartoes");
    return { ok: true, inseridos: r.inseridos, possiveisDuplicados: r.possiveisDuplicados, revisao: r.revisao };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao sincronizar." };
  }
}

/** 1-B.8 — desconectar: remove a conexão na Pluggy e mantém tudo o que já foi trazido. */
export async function desconectar(itemId: string): Promise<R> {
  const ctx = await contexto();
  if (!ctx) return { ok: false, error: SEM_PERMISSAO };
  const [it] = await db.select().from(schema.openfinanceItens).where(and(eq(schema.openfinanceItens.itemId, itemId), eq(schema.openfinanceItens.tenantId, ctx.tenant.id))).limit(1);
  if (!it) return { ok: false, error: "Conexão não encontrada nesta empresa." };
  try {
    await excluirItem(await authenticate(), itemId);
  } catch (e) {
    return { ok: false, error: `A Pluggy não confirmou a remoção (${e instanceof Error ? e.message : "erro"}). Nada mudou; tente de novo.` };
  }
  const contas = await db.select().from(schema.openfinanceContas).where(and(eq(schema.openfinanceContas.itemId, itemId), eq(schema.openfinanceContas.tenantId, ctx.tenant.id)));
  const bancos = contas.map((c) => c.bankAccountId).filter((x): x is string => !!x);
  const cartoes = contas.map((c) => c.cartaoId).filter((x): x is string => !!x);
  if (bancos.length) await db.update(schema.bankAccounts).set({ openFinanceId: null }).where(and(eq(schema.bankAccounts.tenantId, ctx.tenant.id), inArray(schema.bankAccounts.id, bancos)));
  if (cartoes.length) await db.update(schema.cartoesCredito).set({ openFinanceId: null }).where(and(eq(schema.cartoesCredito.tenantId, ctx.tenant.id), inArray(schema.cartoesCredito.id, cartoes)));
  await db.update(schema.openfinanceItens).set({ situacao: "desconectado", desconectadoEm: new Date(), desconectadoPor: ctx.userEmail ?? ctx.userId ?? null }).where(eq(schema.openfinanceItens.id, it.id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "openfinance.desconectar", entity: "openfinance_item", entityId: itemId, meta: { banco: it.banco, contas: bancos.length, cartoes: cartoes.length } });
  revalidatePath("/contas");
  revalidatePath("/cartoes");
  revalidatePath("/caixa");
  return { ok: true };
}

/**
 * 1-B.6 — possível duplicado da primeira sincronização: "mesmo" (é o movimento
 * já importado: ele passa a ter o id do banco; nada novo entra) ou "importar"
 * (é outro: entra como movimento novo).
 */
export async function decidirPossivelDuplicado(id: string, decisao: "mesmo" | "importar"): Promise<R> {
  const ctx = await contexto("caixa");
  if (!ctx) return { ok: false, error: "Decidir exige a permissão Caixa/editar." };
  const quem = ctx.userEmail ?? ctx.userId ?? null;
  return db.transaction(async (tx) => {
    const [d] = await tx.select().from(schema.openfinancePossiveisDuplicados).where(and(eq(schema.openfinancePossiveisDuplicados.id, id), eq(schema.openfinancePossiveisDuplicados.tenantId, ctx.tenant.id))).for("update");
    if (!d) return { ok: false as const, error: "Item não encontrado." };
    if (d.decisao) return { ok: false as const, error: "Já decidido." };
    if (decisao === "mesmo") {
      if (!d.existenteId) return { ok: false as const, error: "O movimento importado não existe mais; escolha importar." };
      await tx.update(schema.cashEntries).set({ externalId: d.externalId }).where(and(eq(schema.cashEntries.id, d.existenteId), eq(schema.cashEntries.tenantId, ctx.tenant.id), isNull(schema.cashEntries.externalId)));
    } else {
      const versionId = (await import("@/lib/chaves-tenant").then((m) => m.chaveLigada(ctx.tenant.id, "caixa_conciliacao_por_conta")))
        ? null
        : (await tx.select({ id: schema.versions.id }).from(schema.versions).where(and(eq(schema.versions.tenantId, ctx.tenant.id), eq(schema.versions.kind, "atual"))).orderBy(schema.versions.createdAt, schema.versions.id).limit(1))[0]?.id;
      if (versionId === undefined) return { ok: false as const, error: "A empresa não tem versão Atual para receber o movimento." };
      await tx.insert(schema.cashEntries).values({ tenantId: ctx.tenant.id, versionId, bankAccountId: d.bankAccountId, externalId: d.externalId, data: d.data, descricao: d.descricao, valor: d.valor, cat: "openfinance", rec: false }).onConflictDoNothing();
    }
    await tx.update(schema.openfinancePossiveisDuplicados).set({ decisao, decididoPor: quem, decididoEm: new Date() }).where(eq(schema.openfinancePossiveisDuplicados.id, d.id));
    await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "openfinance.duplicado.decidir", entity: "openfinance_possivel_duplicado", entityId: d.id, meta: { decisao, externalId: d.externalId, valor: d.valor } }, tx);
    revalidatePath("/caixa");
    return { ok: true as const };
  });
}
