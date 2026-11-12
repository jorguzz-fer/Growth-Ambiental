import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

type Exec = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Soma dos vínculos ATIVOS (não desfeitos) por movimento. Só leitura. */
export async function somaDosVinculosPorMovimento(exec: Exec, tenantId: string, cashEntryIds: readonly string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (cashEntryIds.length === 0) return out;
  const rows = await exec
    .select({ id: schema.conciliacoesDespesa.cashEntryId, soma: sql<string>`coalesce(sum(${schema.conciliacoesDespesa.valor}), 0)` })
    .from(schema.conciliacoesDespesa)
    .where(and(eq(schema.conciliacoesDespesa.tenantId, tenantId), eq(schema.conciliacoesDespesa.desfeito, false), inArray(schema.conciliacoesDespesa.cashEntryId, [...cashEntryIds])))
    .groupBy(schema.conciliacoesDespesa.cashEntryId);
  for (const r of rows) out.set(r.id, Math.round(Number(r.soma) * 100) / 100);
  return out;
}

/** Soma dos vínculos ATIVOS por despesa (o "conciliado" do estado derivado). Só leitura. */
export async function conciliadoPorDespesa(exec: Exec, tenantId: string, despesaIds: readonly string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (despesaIds.length === 0) return out;
  const rows = await exec
    .select({ id: schema.conciliacoesDespesa.despesaId, soma: sql<string>`coalesce(sum(${schema.conciliacoesDespesa.valor}), 0)` })
    .from(schema.conciliacoesDespesa)
    .where(and(eq(schema.conciliacoesDespesa.tenantId, tenantId), eq(schema.conciliacoesDespesa.desfeito, false), inArray(schema.conciliacoesDespesa.despesaId, [...despesaIds])))
    .groupBy(schema.conciliacoesDespesa.despesaId);
  for (const r of rows) out.set(r.id, Math.round(Number(r.soma) * 100) / 100);
  return out;
}

export interface VinculoView {
  id: string;
  cashEntryId: string;
  despesaId: string;
  numDoc: string | null;
  fornecedor: string | null;
  valor: number;
  origem: string;
  criadoPor: string | null;
  criadoEm: string;
}

/** Vínculos ativos dos movimentos de uma versão, com o PED e o fornecedor da despesa. */
export async function vinculosDaVersao(tenantId: string, versionId: string): Promise<VinculoView[]> {
  const rows = await db
    .select({ v: schema.conciliacoesDespesa, numDoc: schema.despesas.numDoc, fornecedor: schema.stakeholders.nome })
    .from(schema.conciliacoesDespesa)
    .innerJoin(schema.cashEntries, eq(schema.conciliacoesDespesa.cashEntryId, schema.cashEntries.id))
    .innerJoin(schema.despesas, eq(schema.conciliacoesDespesa.despesaId, schema.despesas.id))
    .leftJoin(schema.stakeholders, eq(schema.despesas.fornecedorId, schema.stakeholders.id))
    .where(and(eq(schema.conciliacoesDespesa.tenantId, tenantId), eq(schema.conciliacoesDespesa.desfeito, false), eq(schema.cashEntries.versionId, versionId)))
    .orderBy(schema.conciliacoesDespesa.criadoEm);
  return rows.map((r) => ({ id: r.v.id, cashEntryId: r.v.cashEntryId, despesaId: r.v.despesaId, numDoc: r.numDoc, fornecedor: r.fornecedor, valor: Number(r.v.valor), origem: r.v.origem, criadoPor: r.v.criadoPor, criadoEm: r.v.criadoEm.toISOString() }));
}

/** Vínculos ativos de um conjunto de movimentos (Prompt AT §4: a conciliação da empresa). */
export async function vinculosDosMovimentos(tenantId: string, cashEntryIds: readonly string[]): Promise<VinculoView[]> {
  if (cashEntryIds.length === 0) return [];
  const rows = await db
    .select({ v: schema.conciliacoesDespesa, numDoc: schema.despesas.numDoc, fornecedor: schema.stakeholders.nome })
    .from(schema.conciliacoesDespesa)
    .innerJoin(schema.despesas, eq(schema.conciliacoesDespesa.despesaId, schema.despesas.id))
    .leftJoin(schema.stakeholders, eq(schema.despesas.fornecedorId, schema.stakeholders.id))
    .where(and(eq(schema.conciliacoesDespesa.tenantId, tenantId), eq(schema.conciliacoesDespesa.desfeito, false), inArray(schema.conciliacoesDespesa.cashEntryId, [...cashEntryIds])))
    .orderBy(schema.conciliacoesDespesa.criadoEm);
  return rows.map((r) => ({ id: r.v.id, cashEntryId: r.v.cashEntryId, despesaId: r.v.despesaId, numDoc: r.numDoc, fornecedor: r.fornecedor, valor: Number(r.v.valor), origem: r.v.origem, criadoPor: r.v.criadoPor, criadoEm: r.v.criadoEm.toISOString() }));
}
