import { and, eq, inArray, isNull } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/lib/db";

/**
 * Prompt AT §3 (Revisão 4) — o movimento do extrato pertence à CONTA, não à
 * obra. A obra de um movimento sem `version_id` é a do item com que ele foi
 * conciliado:
 *
 * - despesa (vínculo com valor de `conciliacao_despesa`, ou o 1:1 antigo
 *   `conciliado_despesa_id`) → a versão da despesa;
 * - conta a receber (`conta_receber_recebimento`, ou o 1:1 antigo
 *   `conciliado_conta_receber_id`) → a versão Atual da obra da conta;
 * - parcela de venda (`recebimento_parcela`, §5) → a versão da unidade;
 * - pagamento de fatura de cartão (`fatura_pagamento`, §6.4) → a versão Atual
 *   da obra do pagamento.
 *
 * Um movimento dividido entre itens de obras diferentes tem várias obras, cada
 * uma com a parte do vínculo. O que sobra sem vínculo é "não atribuído a obra"
 * (BAT-2): entra no realizado da EMPRESA e no de nenhuma obra.
 *
 * Os movimentos antigos (com `version_id`) não passam por aqui: continuam na
 * obra que têm (§3.2), e nenhum número de antes muda (AT-T6).
 */

export interface VinculoParaObra {
  versionId: string | null;
  /** Valor do vínculo, em módulo. */
  valor: number;
}

export interface ParteDoMovimento {
  cashEntryId: string;
  /** null = não atribuído a obra. */
  versionId: string | null;
  /** Com o sinal do movimento: positivo entra, negativo sai. */
  valor: number;
  data: string | null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Divide um movimento pelos vínculos. Puro. A soma das partes é sempre o valor
 * do movimento: vínculos que passam do valor são cortados na ordem em que vêm,
 * e o resto vira a parte "não atribuída".
 */
export function partesDoMovimento(mov: { id: string; valor: number; data: string | null }, vinculos: readonly VinculoParaObra[]): ParteDoMovimento[] {
  const sinal = mov.valor < 0 ? -1 : 1;
  const total = Math.abs(mov.valor);
  const porVersao = new Map<string | null, number>();
  let usado = 0;
  for (const v of vinculos) {
    const livre = r2(total - usado);
    if (livre <= 0.005) break;
    const parte = r2(Math.min(Math.abs(v.valor), livre));
    if (parte <= 0) continue;
    porVersao.set(v.versionId, r2((porVersao.get(v.versionId) ?? 0) + parte));
    usado = r2(usado + parte);
  }
  const resto = r2(total - usado);
  if (resto > 0.005 || porVersao.size === 0) porVersao.set(null, r2((porVersao.get(null) ?? 0) + resto));
  return [...porVersao].map(([versionId, v]) => ({ cashEntryId: mov.id, versionId, valor: r2(sinal * v), data: mov.data }));
}

/**
 * As partes dos movimentos SEM obra de uma empresa (só leitura). Uma vez por
 * requisição; cada chamador recebe uma cópia.
 */
export async function partesDosMovimentosSemObra(tenantId: string): Promise<ParteDoMovimento[]> {
  return structuredClone(await partesMemorizadas(tenantId));
}

const partesMemorizadas = cache(async (tenantId: string): Promise<ParteDoMovimento[]> => {
  const movs = await db
    .select({ id: schema.cashEntries.id, valor: schema.cashEntries.valor, data: schema.cashEntries.data, despesaId: schema.cashEntries.conciliadoDespesaId, contaReceberId: schema.cashEntries.conciliadoContaReceberId })
    .from(schema.cashEntries)
    .where(and(eq(schema.cashEntries.tenantId, tenantId), isNull(schema.cashEntries.versionId)));
  if (movs.length === 0) return [];
  const ids = movs.map((m) => m.id);
  const [desp, receb, parcelas, faturas, atuais] = await Promise.all([
    db
      .select({ cashEntryId: schema.conciliacoesDespesa.cashEntryId, valor: schema.conciliacoesDespesa.valor, versionId: schema.despesas.versionId })
      .from(schema.conciliacoesDespesa)
      .innerJoin(schema.despesas, eq(schema.conciliacoesDespesa.despesaId, schema.despesas.id))
      .where(and(eq(schema.conciliacoesDespesa.tenantId, tenantId), eq(schema.conciliacoesDespesa.desfeito, false), inArray(schema.conciliacoesDespesa.cashEntryId, ids)))
      .orderBy(schema.conciliacoesDespesa.criadoEm),
    db
      .select({ cashEntryId: schema.contaReceberRecebimentos.cashEntryId, valor: schema.contaReceberRecebimentos.valor, projectId: schema.contasReceber.projectId })
      .from(schema.contaReceberRecebimentos)
      .innerJoin(schema.contasReceber, eq(schema.contaReceberRecebimentos.contaReceberId, schema.contasReceber.id))
      .where(and(eq(schema.contaReceberRecebimentos.tenantId, tenantId), eq(schema.contaReceberRecebimentos.estornado, false), inArray(schema.contaReceberRecebimentos.cashEntryId, ids)))
      .orderBy(schema.contaReceberRecebimentos.createdAt),
    vinculosDeParcela(tenantId, ids),
    // Prompt AT §6.4: a saída do pagamento da fatura vai para a obra do pagamento.
    db
      .select({ cashEntryId: schema.faturaPagamentos.cashEntryId, valor: schema.faturaPagamentos.valor, projectId: schema.faturaPagamentos.projectId })
      .from(schema.faturaPagamentos)
      .where(and(eq(schema.faturaPagamentos.tenantId, tenantId), inArray(schema.faturaPagamentos.cashEntryId, ids))),
    db
      .select({ id: schema.versions.id, projectId: schema.versions.projectId, createdAt: schema.versions.createdAt })
      .from(schema.versions)
      .where(and(eq(schema.versions.tenantId, tenantId), eq(schema.versions.kind, "atual"))),
  ]);
  // A Atual de cada obra (a mais antiga, como no resto do sistema).
  const atualDaObra = new Map<string, string>();
  for (const v of [...atuais].sort((a, b) => +a.createdAt - +b.createdAt || a.id.localeCompare(b.id))) if (!atualDaObra.has(v.projectId)) atualDaObra.set(v.projectId, v.id);

  const versaoDaDespesa = new Map<string, string | null>();
  const legadoDesp = movs.filter((m) => m.despesaId).map((m) => m.despesaId!);
  const legadoRec = movs.filter((m) => m.contaReceberId).map((m) => m.contaReceberId!);
  const [despLegado, recLegado] = await Promise.all([
    legadoDesp.length ? db.select({ id: schema.despesas.id, versionId: schema.despesas.versionId }).from(schema.despesas).where(and(eq(schema.despesas.tenantId, tenantId), inArray(schema.despesas.id, legadoDesp))) : Promise.resolve([]),
    legadoRec.length ? db.select({ id: schema.contasReceber.id, projectId: schema.contasReceber.projectId }).from(schema.contasReceber).where(and(eq(schema.contasReceber.tenantId, tenantId), inArray(schema.contasReceber.id, legadoRec))) : Promise.resolve([]),
  ]);
  for (const d of despLegado) versaoDaDespesa.set(d.id, d.versionId);
  const obraDaConta = new Map(recLegado.map((c) => [c.id, c.projectId]));

  const vinculos = new Map<string, VinculoParaObra[]>();
  const add = (id: string | null, v: VinculoParaObra) => {
    if (!id) return;
    vinculos.set(id, [...(vinculos.get(id) ?? []), v]);
  };
  for (const d of desp) add(d.cashEntryId, { versionId: d.versionId, valor: Number(d.valor) });
  for (const r of receb) add(r.cashEntryId, { versionId: r.projectId ? atualDaObra.get(r.projectId) ?? null : null, valor: Number(r.valor) });
  for (const p of parcelas) add(p.cashEntryId, { versionId: p.versionId, valor: p.valor });
  for (const f of faturas) add(f.cashEntryId, { versionId: f.projectId ? atualDaObra.get(f.projectId) ?? null : null, valor: Number(f.valor) });
  const out: ParteDoMovimento[] = [];
  for (const m of movs) {
    let vs = vinculos.get(m.id) ?? [];
    // O 1:1 antigo só vale quando não há vínculo com valor (é o caminho de antes).
    if (vs.length === 0 && m.despesaId) vs = [{ versionId: versaoDaDespesa.get(m.despesaId) ?? null, valor: Number(m.valor) }];
    else if (vs.length === 0 && m.contaReceberId) {
      const obra = obraDaConta.get(m.contaReceberId);
      vs = [{ versionId: obra ? atualDaObra.get(obra) ?? null : null, valor: Number(m.valor) }];
    }
    out.push(...partesDoMovimento({ id: m.id, valor: Number(m.valor), data: m.data }, vs));
  }
  return out;
});

/** Vínculos de parcela de venda (§5): a obra é a da unidade (versão Atual onde ela está). */
async function vinculosDeParcela(tenantId: string, ids: string[]): Promise<{ cashEntryId: string; versionId: string | null; valor: number }[]> {
  const rows = await db
    .select({ cashEntryId: schema.recebimentosParcela.cashEntryId, valor: schema.recebimentosParcela.valor, versionId: schema.units.versionId })
    .from(schema.recebimentosParcela)
    .innerJoin(schema.units, eq(schema.recebimentosParcela.unitId, schema.units.id))
    .where(and(eq(schema.recebimentosParcela.tenantId, tenantId), eq(schema.recebimentosParcela.estornado, false), inArray(schema.recebimentosParcela.cashEntryId, ids)));
  return rows.filter((r): r is typeof r & { cashEntryId: string } => !!r.cashEntryId).map((r) => ({ cashEntryId: r.cashEntryId, versionId: r.versionId, valor: Number(r.valor) }));
}

/**
 * O realizado de uma versão: os movimentos gravados nela MAIS as partes dos
 * movimentos sem obra atribuídas a ela pelo vínculo. Só valor e data, que é o
 * que o realizado usa (Fluxo de Caixa, Dashboard, status do projeto).
 */
export async function realizadoDaVersao(versionId: string): Promise<{ id: string; valor: number; data: string | null }[]> {
  const [v] = await db.select({ tenantId: schema.versions.tenantId }).from(schema.versions).where(eq(schema.versions.id, versionId)).limit(1);
  if (!v) return [];
  const tenantId = v.tenantId;
  const [proprios, partes] = await Promise.all([
    db
      .select({ id: schema.cashEntries.id, valor: schema.cashEntries.valor, data: schema.cashEntries.data })
      .from(schema.cashEntries)
      .where(and(eq(schema.cashEntries.tenantId, tenantId), eq(schema.cashEntries.versionId, versionId))),
    partesDosMovimentosSemObra(tenantId),
  ]);
  return [
    ...proprios.map((c) => ({ id: c.id, valor: Number(c.valor), data: c.data })),
    ...partes.filter((p) => p.versionId === versionId).map((p) => ({ id: p.cashEntryId, valor: p.valor, data: p.data })),
  ];
}
