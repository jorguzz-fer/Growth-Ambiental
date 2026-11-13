import { AsyncLocalStorage } from "node:async_hooks";
import { and, eq, gte, inArray, count } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { OPERACOES_DE_CONVERSA, recusaPorLimite, limitesEfetivos } from "@/lib/ia-uso-regras";

/**
 * Prompt AM, Parte 5 — registro do consumo da IA. A action MARCA a chamada
 * (`comUsoDeIa`) e `createMessageWithFallback` grava, ao fim, o modelo que
 * respondeu e os tokens. Sem marca (testes, scripts), nada é gravado. Nunca
 * grava conteúdo, e falha de gravação nunca derruba a leitura.
 */
export interface MarcaDeUso {
  tenantId: string;
  userId: string | null;
  operacao: string;
}

const marca = new AsyncLocalStorage<MarcaDeUso>();

export function comUsoDeIa<T>(m: MarcaDeUso, fn: () => Promise<T>): Promise<T> {
  return marca.run(m, fn);
}

export interface UsoDaChamada {
  modelo: string | null;
  fallback: boolean;
  erro: boolean;
  usage?: { input_tokens?: number | null; output_tokens?: number | null; cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null } | null;
}

export async function registrarUso(u: UsoDaChamada): Promise<void> {
  const m = marca.getStore();
  if (!m) return;
  try {
    await db.insert(schema.iaUso).values({
      tenantId: m.tenantId,
      userId: m.userId,
      operacao: m.operacao,
      modelo: u.modelo,
      fallback: u.fallback,
      erro: u.erro,
      entrada: u.usage?.input_tokens ?? 0,
      saida: u.usage?.output_tokens ?? 0,
      cacheCriacao: u.usage?.cache_creation_input_tokens ?? 0,
      cacheLida: u.usage?.cache_read_input_tokens ?? 0,
    });
  } catch (e) {
    console.error("[ia] falha ao registrar consumo:", e instanceof Error ? e.name : "erro");
  }
}

/** Limite das conversas (5.2): recusa em texto, ou null quando pode perguntar. */
export async function limiteDeConversa(tenantId: string, userId: string | null): Promise<string | null> {
  const desde = new Date(Date.now() - 60 * 60 * 1000);
  const base = and(eq(schema.iaUso.tenantId, tenantId), gte(schema.iaUso.createdAt, desde), inArray(schema.iaUso.operacao, [...OPERACOES_DE_CONVERSA]));
  const [empresa] = await db.select({ n: count() }).from(schema.iaUso).where(base);
  const [pessoa] = userId ? await db.select({ n: count() }).from(schema.iaUso).where(and(base, eq(schema.iaUso.userId, userId))) : [{ n: 0 }];
  // 0083 — limites configurados pela empresa (nulo = o padrão).
  const [cfg] = await db.select().from(schema.iaLimites).where(eq(schema.iaLimites.tenantId, tenantId)).limit(1);
  return recusaPorLimite({ pessoa: Number(pessoa?.n ?? 0), empresa: Number(empresa?.n ?? 0) }, limitesEfetivos(cfg ? { conversasPessoaHora: cfg.conversasPessoaHora, conversasEmpresaHora: cfg.conversasEmpresaHora } : null));
}
