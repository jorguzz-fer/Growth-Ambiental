"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { vincularLinhaDoCartao } from "@/lib/cartao-conciliacao";

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
 * concilia com o `fatura_pagamento`, não com as compras da fatura, e NÃO gera
 * saída nova. Como na conciliação de despesas, a linha do extrato É a saída:
 * o pagamento passa a apontar para ela, e a saída que o app tinha gerado no
 * pagamento (sem extrato, Prompt U §3.1) sai, para a mesma saída não contar
 * duas vezes. A linha removida fica inteira na auditoria. Só com confirmação
 * da pessoa; só com mesmo valor e mesma conta.
 */
export async function conciliarPagamentoDeFatura(input: { cashEntryId: string; faturaPagamentoId: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "caixa", "editar")) return { ok: false, error: "Conciliar exige a permissão Caixa/editar." };
  const tenantId = ctx.tenant.id;
  const quem = ctx.userEmail ?? ctx.userId ?? null;
  try {
    const r = await db.transaction(async (tx) => {
      const [mov] = await tx.select().from(schema.cashEntries).where(and(eq(schema.cashEntries.id, input.cashEntryId), eq(schema.cashEntries.tenantId, tenantId))).for("update");
      if (!mov) return { ok: false as const, error: "Movimento não encontrado." };
      if (!mov.importHash && !mov.externalId) return { ok: false as const, error: "Só a linha que veio do extrato concilia com o pagamento da fatura." };
      if (mov.rec || mov.conciliadoDespesaId || mov.conciliadoContaReceberId) return { ok: false as const, error: "Este movimento já está conciliado." };
      const [pag] = await tx.select().from(schema.faturaPagamentos).where(and(eq(schema.faturaPagamentos.id, input.faturaPagamentoId), eq(schema.faturaPagamentos.tenantId, tenantId))).for("update");
      if (!pag) return { ok: false as const, error: "Pagamento da fatura não encontrado." };
      if (Math.round(Number(pag.valor) * 100) !== Math.round(-Number(mov.valor) * 100)) return { ok: false as const, error: "O valor do movimento não é o do pagamento da fatura." };
      if (pag.bankAccountId && mov.bankAccountId && pag.bankAccountId !== mov.bankAccountId) return { ok: false as const, error: "O pagamento da fatura saiu de outra conta." };
      const [gerada] = pag.cashEntryId ? await tx.select().from(schema.cashEntries).where(eq(schema.cashEntries.id, pag.cashEntryId)).for("update") : [];
      if (gerada && (gerada.importHash || gerada.externalId)) return { ok: false as const, error: "Este pagamento da fatura já está conciliado com uma linha do extrato." };
      await tx.update(schema.faturaPagamentos).set({ cashEntryId: mov.id }).where(eq(schema.faturaPagamentos.id, pag.id));
      await tx.update(schema.cashEntries).set({ rec: true, cat: "fatura", conciliadoPor: quem, conciliadoEm: new Date().toISOString() }).where(eq(schema.cashEntries.id, mov.id));
      if (gerada) await tx.delete(schema.cashEntries).where(eq(schema.cashEntries.id, gerada.id));
      await logAudit(
        {
          tenantId,
          userId: ctx.userId,
          action: "cartao.fatura.conciliar",
          entity: "cash_entry",
          entityId: mov.id,
          meta: { faturaPagamentoId: pag.id, valor: pag.valor, saidaGeradaRemovida: gerada ? { ...gerada } : null },
        },
        tx,
      );
      return { ok: true as const };
    });
    if (r.ok) {
      revalidatePath("/caixa");
      revalidatePath("/cartoes");
    }
    return r;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao conciliar." };
  }
}
