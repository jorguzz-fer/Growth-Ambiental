import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { gravarVinculos } from "@/lib/conciliacao-db";
import { gravarRecebimentoDeParcela } from "@/lib/recebimento-parcela";
import { validarLote, type ItemDoLote, type ItemValidado } from "@/lib/conciliacao-cris";

/**
 * Prompt AT §8.3.4 (Revisão 4) — grava o lote que a pessoa CONFIRMOU no botão
 * "Confirmar N conciliações". Valida de novo contra os candidatos do servidor
 * (AT-T16); cada vínculo é atômico e auditado pelo caminho próprio da tela; uma
 * falha não desfaz as outras e o resultado diz qual falhou (AT-T17). Só a
 * ação da tela chama este módulo; a Cris não (AQ-T6).
 */
export interface Quem {
  tenantId: string;
  userId: string | null;
  userEmail: string | null;
}

/** Aplica UM item já validado. Cada tipo usa o caminho próprio da tela, atômico e auditado. */
async function aplicarItem(quem: Quem, it: ItemValidado): Promise<{ ok: true } | { ok: false; error: string }> {
  const [tipo, resto] = [it.ref.slice(0, 1), it.ref.slice(2)];
  if (tipo === "D") {
    const valor = it.valor && it.valor > 0 ? it.valor : Math.abs(it.valorMovimento);
    const r = await gravarVinculos(quem, { cashEntryId: it.movimento, itens: [{ despesaId: resto, valor }], origem: "assistente" });
    return r.ok ? { ok: true } : r;
  }
  if (tipo === "P") {
    const [unitId, chave] = resto.split("|");
    const r = await gravarRecebimentoDeParcela(quem, { cashEntryId: it.movimento, unitId, chave, valor: it.valor ?? null });
    return r.ok ? { ok: true } : r;
  }
  if (tipo === "R") {
    const { gravarRecebimento } = await import("@/lib/conta-receber-recebimento");
    const [cr] = await db.select().from(schema.contasReceber).where(and(eq(schema.contasReceber.id, resto), eq(schema.contasReceber.tenantId, quem.tenantId))).limit(1);
    if (!cr) return { ok: false, error: "Conta a receber não encontrada." };
    const [mov] = await db.select().from(schema.cashEntries).where(and(eq(schema.cashEntries.id, it.movimento), eq(schema.cashEntries.tenantId, quem.tenantId))).limit(1);
    if (!mov) return { ok: false, error: "Movimento não encontrado." };
    const valor = it.valor && it.valor > 0 ? it.valor : Math.min(Number(mov.valor), Number(cr.valor) - Number(cr.valorRecebido ?? 0));
    const r = await gravarRecebimento(quem, { contaReceberId: cr.id, valor, data: mov.data ?? null, forma: "Extrato bancário", justificativa: null, cashEntryId: mov.id });
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }
  if (tipo === "F") {
    const { conciliarPagamentoDeFaturaComQuem } = await import("@/lib/cartao-conciliacao");
    return conciliarPagamentoDeFaturaComQuem(quem, { cashEntryId: it.movimento, faturaPagamentoId: resto });
  }
  return { ok: false, error: "Tipo de alvo desconhecido." };
}

/** AT-T17 — cada vínculo por si: o resultado diz qual falhou; nenhuma falha desfaz as outras. */
export async function aplicarLote(quem: Quem, itens: readonly ItemDoLote[]): Promise<{ ok: number; resultados: { movimento: string; ref: string; ok: boolean; erro?: string }[] }> {
  const { validos, recusados } = await validarLote(quem.tenantId, itens);
  const resultados: { movimento: string; ref: string; ok: boolean; erro?: string }[] = recusados.map((r) => ({ movimento: r.item.movimento, ref: r.item.ref, ok: false, erro: r.motivo }));
  let ok = 0;
  for (const it of validos) {
    try {
      const r = await aplicarItem(quem, it);
      if (r.ok) ok++;
      resultados.push({ movimento: it.movimento, ref: it.ref, ok: r.ok, ...(r.ok ? {} : { erro: r.error }) });
    } catch (e) {
      resultados.push({ movimento: it.movimento, ref: it.ref, ok: false, erro: e instanceof Error ? e.message : "falha" });
    }
  }
  return { ok, resultados };
}

