/**
 * Worker de sincronização Open Finance (Pluggy → lançamentos de caixa).
 *
 * Prompt AT §1 (Revisão 4, 11/2026):
 * - cada transação entra UMA vez por conta, nunca uma vez por versão;
 * - a deduplicação é pelo id da transação na Pluggy (`cash_entry.external_id`,
 *   único por conta), nunca por descrição + data.
 *
 * Prompt AT §1-B: as regras de gravação moram em
 * `src/lib/openfinance/sincronizar.ts` e são as mesmas do webhook e da
 * sincronização diária (a rota `/api/openfinance/sync`, chamada pelo agendador
 * do Coolify). Este arquivo mantém o uso manual:
 *
 *   npx tsx src/workers/sync-openfinance.ts
 */
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { isPluggyConfigured, type PluggyTransaction } from "@/lib/openfinance/pluggy";
import { gravarTransacoesDaConta as gravar, sincronizarTodos } from "@/lib/openfinance/sincronizar";
import { hojeISO } from "@/lib/despesa-status";

/** Versão Atual que recebe os movimentos quando a chave da §3 está desligada: a mais antiga. */
export async function versaoDeDestinoProvisoria(tenantId: string): Promise<string | null> {
  const [v] = await db
    .select({ id: schema.versions.id })
    .from(schema.versions)
    .where(and(eq(schema.versions.tenantId, tenantId), eq(schema.versions.kind, "atual")))
    .orderBy(asc(schema.versions.createdAt), asc(schema.versions.id))
    .limit(1);
  return v?.id ?? null;
}

/** Grava as transações de UMA conta; devolve quantas entraram. */
export async function gravarTransacoesDaConta(conta: { id: string; tenantId: string }, txs: PluggyTransaction[]): Promise<number> {
  return (await gravar(conta, txs)).inseridos;
}

export async function syncOpenFinance(): Promise<{ itens: number; inseridos: number }> {
  if (!isPluggyConfigured()) {
    console.log("[sync-openfinance] Pluggy não configurada — nada a fazer.");
    return { itens: 0, inseridos: 0 };
  }
  const r = await sincronizarTodos(hojeISO());
  console.log(`[sync-openfinance] ${r.itens} conexão(ões), ${r.resultado.inseridos} movimento(s) novo(s), ${r.falhas} falha(s).`);
  return { itens: r.itens, inseridos: r.resultado.inseridos };
}

// Permite execução direta via tsx.
if (process.argv[1]?.includes("sync-openfinance")) {
  syncOpenFinance()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
