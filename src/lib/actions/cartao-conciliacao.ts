"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { conciliarPagamentoDeFaturaComQuem, vincularLinhaDoCartao } from "@/lib/cartao-conciliacao";

/**
 * Prompt AT §6 (Revisão 4) — conciliar a linha do extrato do cartão com a
 * compra lançada no cartão. Só com uma candidata calculada pelo servidor
 * (mesmo cartão, fatura da linha ou vizinha, sem outra linha da mesma fatura
 * apontando para ela): um id de fora é recusado aqui, não só escondido na tela.
 * Crédito ou estorno do extrato não passa por aqui (6.3).
 */
export async function conciliarLinhaDoCartao(input: { linhaId: string; despesaId: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "caixa", "editar")) return { ok: false, error: "Conciliar exige a permissão Caixa/editar." };
  const r = await vincularLinhaDoCartao(ctx.tenant.id, input.linhaId, input.despesaId, ctx.userEmail ?? ctx.userId ?? null);
  if (!r.ok) return r;
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "cartao.extrato.conciliar", entity: "extrato_cartao", entityId: input.linhaId, meta: { despesaId: input.despesaId, cartaoId: r.cartaoId } });
  revalidatePath("/caixa");
  return { ok: true };
}

export async function desfazerLinhaDoCartao(linhaId: string, motivo: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "conciliacao", "excluir")) return { ok: false, error: "Desfazer exige a permissão \"Conciliação — ajustar e desfazer: excluir\"." };
  const m = (motivo ?? "").trim();
  if (!m) return { ok: false, error: "Informe o motivo para desfazer (fica na auditoria)." };
  const [l] = await db.select().from(schema.extratoCartao).where(and(eq(schema.extratoCartao.id, linhaId), eq(schema.extratoCartao.tenantId, ctx.tenant.id))).limit(1);
  if (!l) return { ok: false, error: "Linha do extrato não encontrada." };
  if (!l.despesaId) return { ok: false, error: "Esta linha não está conciliada." };
  await db.update(schema.extratoCartao).set({ despesaId: null, conciliadoPor: null, conciliadoEm: null }).where(eq(schema.extratoCartao.id, l.id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "cartao.extrato.desfazer", entity: "extrato_cartao", entityId: l.id, meta: { despesaId: l.despesaId, motivo: m } });
  revalidatePath("/caixa");
  return { ok: true };
}

/**
 * Prompt AT §6.4 (AT-T11) — a saída do pagamento da fatura na conta corrente
 * concilia com o `fatura_pagamento`, sem saída nova. O núcleo está em
 * `conciliarPagamentoDeFaturaComQuem` (o lote da Cris usa o mesmo).
 */
export async function conciliarPagamentoDeFatura(input: { cashEntryId: string; faturaPagamentoId: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "caixa", "editar")) return { ok: false, error: "Conciliar exige a permissão Caixa/editar." };
  const r = await conciliarPagamentoDeFaturaComQuem({ tenantId: ctx.tenant.id, userId: ctx.userId, userEmail: ctx.userEmail }, input);
  if (r.ok) {
    revalidatePath("/caixa");
    revalidatePath("/cartoes");
  }
  return r;
}

/**
 * GA-11 §4.2 — o botão "Confirmar N conciliações" do lote que a Cris propôs
 * no cartão. A Cris não grava: cada item passa de novo pela mesma conferência
 * do servidor (`conciliarLinhaDoCartao` → candidatas da linha). Até 20 itens.
 */
export async function confirmarConciliacoesCartao(itens: { linha: string; despesaId: string }[]): Promise<{ ok: true; gravadas: number; resultados: { linha: string; ok: boolean; erro?: string }[] } | { ok: false; error: string }> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "caixa", "editar")) return { ok: false, error: "Conciliar exige a permissão Caixa/editar." };
  if (!Array.isArray(itens) || itens.length === 0) return { ok: false, error: "Nada a confirmar." };
  if (itens.length > 20) return { ok: false, error: "No máximo 20 conciliações por vez." };
  const resultados: { linha: string; ok: boolean; erro?: string }[] = [];
  for (const i of itens) {
    const r = await conciliarLinhaDoCartao({ linhaId: String(i.linha), despesaId: String(i.despesaId) });
    resultados.push(r.ok ? { linha: i.linha, ok: true } : { linha: i.linha, ok: false, erro: r.error });
  }
  return { ok: true, gravadas: resultados.filter((r) => r.ok).length, resultados };
}
