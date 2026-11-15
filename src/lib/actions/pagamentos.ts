"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { composePagamento } from "@/lib/calc";
import { recusaDePagamento, statusDaDespesaPelasParcelas, statusDaParcela } from "@/lib/pagamento-regras";

export interface RegistrarPagamentoInput {
  parcelaId: string;
  /**
   * Ignorado desde o Prompt I (§14): o servidor usa o valor PERSISTIDO da
   * parcela. Mantido no tipo para o formulário antigo continuar compilando.
   */
  valorOriginal?: number;
  desconto?: number;
  multa?: number;
  juros?: number;
  outrosAcrescimos?: number;
  dataPagamento: string; // "MM/DD/YYYY"
  bankAccountId?: string | null;
  obs?: string;
  /** Mesmo fato reenviado (duplo clique, retry, timeout) não vira dois pagamentos. */
  idempotencyKey?: string | null;
}

export type ResultadoPagamento = { ok: true; pagamentoId: string; jaExistia?: boolean } | { ok: false; error: string };

/**
 * Registra o pagamento de uma parcela (§14), com desconto/multa/juros.
 * Numa transação: o registro do pagamento, a parcela (acumulado e status), a
 * despesa-mãe (status pelas parcelas) e a saída REAL na Conciliação de Caixa.
 * Idempotente pela chave; o valor original é o da parcela no banco, nunca o
 * do navegador. Os encargos são reconhecidos separadamente na DRE.
 */
export async function registrarPagamento(input: RegistrarPagamentoInput): Promise<ResultadoPagamento> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "despesas", "editar")) {
    return { ok: false, error: "Sem permissão para registrar pagamentos." };
  }
  const idem = input.idempotencyKey?.trim() || null;
  if (idem) {
    const [existente] = await db
      .select({ id: schema.pagamentos.id })
      .from(schema.pagamentos)
      .where(and(eq(schema.pagamentos.tenantId, ctx.tenant.id), eq(schema.pagamentos.idempotencyKey, idem)))
      .limit(1);
    if (existente) return { ok: true, pagamentoId: existente.id, jaExistia: true };
  }

  // A versão vem da PRÓPRIA parcela (despesa → versão), validada no tenant —
  // não do "projeto ativo" (Prompt A). Pagamento é fato real: só na Atual (§14).
  const [parc] = await db
    .select({
      p: schema.despesaParcelas,
      versionId: schema.despesas.versionId,
      despesaCancelada: schema.despesas.cancelado,
      locked: schema.versions.locked,
      kind: schema.versions.kind,
    })
    .from(schema.despesaParcelas)
    .innerJoin(schema.despesas, eq(schema.despesaParcelas.despesaId, schema.despesas.id))
    .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
    .where(
      and(
        eq(schema.despesaParcelas.id, input.parcelaId),
        eq(schema.despesaParcelas.tenantId, ctx.tenant.id),
        eq(schema.despesas.tenantId, ctx.tenant.id),
        eq(schema.versions.tenantId, ctx.tenant.id),
      ),
    )
    .limit(1);
  if (!parc) return { ok: false, error: "Parcela não encontrada." };
  if (parc.despesaCancelada) return { ok: false, error: "Despesa cancelada não pode ser paga." };
  if (parc.locked) return { ok: false, error: "Versão congelada — pagamento bloqueado." };
  if (parc.kind !== "atual") {
    return { ok: false, error: "Esta parcela está numa versão de planejamento; pagamento só na versão Atual." };
  }

  // §14 — o valor original é o persistido. O navegador só manda encargos.
  const original = Number(parc.p.valorOriginal);
  const desconto = input.desconto || 0;
  const multa = input.multa || 0;
  const juros = input.juros || 0;
  const outros = input.outrosAcrescimos || 0;
  const { valorTotalPago } = composePagamento({ valorOriginal: original, desconto, multa, juros, outrosAcrescimos: outros });
  const recusa = recusaDePagamento({ valorTotalPago, dataPagamento: input.dataPagamento });
  if (recusa) return { ok: false, error: recusa };

  try {
    const pagamentoId = await db.transaction(async (tx) => {
      // Trava a parcela: dois pagamentos simultâneos não leem o mesmo acumulado.
      const [atual] = await tx
        .select()
        .from(schema.despesaParcelas)
        .where(eq(schema.despesaParcelas.id, parc.p.id))
        .for("update")
        .limit(1);
      const [pag] = await tx
        .insert(schema.pagamentos)
        .values({
          tenantId: ctx.tenant.id,
          parcelaId: atual.id,
          despesaId: atual.despesaId,
          valorOriginal: String(original),
          desconto: String(desconto),
          multa: String(multa),
          juros: String(juros),
          outrosAcrescimos: String(outros),
          valorTotalPago: String(valorTotalPago),
          dataPagamento: input.dataPagamento,
          bankAccountId: input.bankAccountId || null,
          obs: input.obs || null,
          idempotencyKey: idem,
          usuarioId: ctx.userId,
        })
        .returning();

      // Parcela: acumula pago/encargos e recalcula o status pelo acumulado.
      const novoPago = Number(atual.valorPago) + valorTotalPago;
      await tx
        .update(schema.despesaParcelas)
        .set({
          valorPago: String(novoPago),
          multa: String(Number(atual.multa) + multa),
          juros: String(Number(atual.juros) + juros),
          desconto: String(Number(atual.desconto) + desconto),
          outrosAcrescimos: String(Number(atual.outrosAcrescimos) + outros),
          dataPagamento: input.dataPagamento,
          status: statusDaParcela(Number(atual.valorOriginal), novoPago),
        })
        .where(eq(schema.despesaParcelas.id, atual.id));

      // Despesa-mãe: todas quitadas = Pago; parte = Parcialmente paga (§14).
      const irmas = await tx
        .select({ status: schema.despesaParcelas.status, valorPago: schema.despesaParcelas.valorPago })
        .from(schema.despesaParcelas)
        .where(eq(schema.despesaParcelas.despesaId, atual.despesaId));
      await tx
        .update(schema.despesas)
        .set({
          status: statusDaDespesaPelasParcelas(irmas.map((i) => ({ status: i.status, valorPago: Number(i.valorPago) }))),
          dataCaixa: input.dataPagamento,
        })
        .where(and(eq(schema.despesas.id, atual.despesaId), eq(schema.despesas.tenantId, ctx.tenant.id)));

      // Saída REAL na Conciliação de Caixa (valor efetivamente pago, na data real).
      await tx.insert(schema.cashEntries).values({
        versionId: parc.versionId,
        tenantId: ctx.tenant.id,
        bankAccountId: input.bankAccountId || null,
        data: input.dataPagamento,
        descricao: `Pagamento parcela #${atual.numeroParcela}`,
        valor: String(-Math.abs(valorTotalPago)),
        cat: "despesa",
        rec: true,
      });

      await logAudit(
        {
          tenantId: ctx.tenant.id,
          userId: ctx.userId,
          action: "pagamento.create",
          entity: "pagamento",
          entityId: pag.id,
          meta: { parcelaId: atual.id, valorTotalPago, multa, juros, desconto, outros },
        },
        tx,
      );
      return pag.id;
    });
    revalidatePath("/despesas");
    revalidatePath("/contaspagar");
    revalidatePath("/caixa");
    revalidatePath("/fluxocaixa");
    revalidatePath("/dre");
    return { ok: true, pagamentoId };
  } catch (e) {
    // Colisão no índice de idempotência: o mesmo fato chegou duas vezes ao
    // mesmo tempo. Devolve o que já existe.
    if (idem && /pagamento_idem_uq|duplicate key/i.test(e instanceof Error ? e.message : String(e))) {
      const [existente] = await db
        .select({ id: schema.pagamentos.id })
        .from(schema.pagamentos)
        .where(and(eq(schema.pagamentos.tenantId, ctx.tenant.id), eq(schema.pagamentos.idempotencyKey, idem)))
        .limit(1);
      if (existente) return { ok: true, pagamentoId: existente.id, jaExistia: true };
    }
    throw e;
  }
}

/**
 * Encargos financeiros (multa+juros+outros−desconto) por mês de pagamento.
 * Somado no banco por mês (desempenho da DRE, 27/10/2026); mesma chave de
 * antes: "MM/AAAA" a partir de "MM/DD/AAAA", só quando a data tem três partes.
 */
export async function getEncargosByVersion(
  versionId: string,
): Promise<Record<string, number>> {
  const data = schema.pagamentos.dataPagamento;
  const mes = sql<string | null>`case when ${data} ~ '^[^/]*/[^/]*/[^/]*$' then split_part(${data}, '/', 1) || '/' || split_part(${data}, '/', 3) end`;
  const rows = await db
    .select({
      mes,
      enc: sql<string>`sum(coalesce(${schema.pagamentos.multa}, 0) + coalesce(${schema.pagamentos.juros}, 0) + coalesce(${schema.pagamentos.outrosAcrescimos}, 0) - coalesce(${schema.pagamentos.desconto}, 0))::text`,
    })
    .from(schema.pagamentos)
    .innerJoin(schema.despesas, eq(schema.pagamentos.despesaId, schema.despesas.id))
    .where(eq(schema.despesas.versionId, versionId))
    .groupBy(mes);
  const out: Record<string, number> = {};
  for (const r of rows) if (r.mes) out[r.mes] = (out[r.mes] || 0) + Number(r.enc);
  return out;
}
