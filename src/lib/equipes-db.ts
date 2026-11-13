import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { FUNCOES_PADRAO } from "@/lib/equipe-regras";

/**
 * BZ-3 — lista fechada de funções por tenant. As funções padrão (de campo) são
 * criadas na PRIMEIRA leitura do tenant (sem migração de dado); depois a
 * lista é editável na tela. Página e action usam esta mesma função.
 */
export async function garantirFuncoesPadrao(tenantId: string): Promise<(typeof schema.funcoesEquipe.$inferSelect)[]> {
  const atuais = await db.select().from(schema.funcoesEquipe).where(eq(schema.funcoesEquipe.tenantId, tenantId)).orderBy(asc(schema.funcoesEquipe.ordem), asc(schema.funcoesEquipe.nome));
  if (atuais.length > 0) return atuais;
  await db.insert(schema.funcoesEquipe).values(FUNCOES_PADRAO.map((nome, i) => ({ tenantId, nome, ordem: i + 1 }))).onConflictDoNothing();
  return db.select().from(schema.funcoesEquipe).where(and(eq(schema.funcoesEquipe.tenantId, tenantId))).orderBy(asc(schema.funcoesEquipe.ordem), asc(schema.funcoesEquipe.nome));
}
