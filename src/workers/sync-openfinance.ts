/**
 * Worker de sincronização Open Finance (Pluggy → lançamentos de caixa).
 *
 * Para cada conta bancária com `openFinanceId`, busca as transações recentes e
 * insere lançamentos de caixa (não conciliados).
 *
 * Prompt AT §1 (Revisão 4, 11/2026):
 * - cada transação entra UMA vez por conta, nunca uma vez por versão. Antes,
 *   com 5 obras, cada PIX entrava 5 vezes e o saldo da empresa ficava multiplicado;
 * - a deduplicação é pelo id da transação na Pluggy (`cash_entry.external_id`,
 *   único por conta). Antes era por descrição + data, sem o valor: dois
 *   "PIX RECEBIDO" no mesmo dia, de valores diferentes, viravam um só.
 *
 * Destino provisório: até a seção 3 do Prompt AT (o movimento pertence à
 * conta, não à obra), `cash_entry.version_id` é obrigatório. O movimento vai
 * para a versão Atual mais antiga da empresa (a primeira criada). É uma regra
 * fixa, para não depender da ordem do banco; a seção 3 a substitui.
 *
 * Execução: agendado pelo Coolify (Scheduled Tasks) ou BullMQ. Ver
 * docs/STACK.md §2 (Jobs) e §7 (Fase 4). Requer PLUGGY_* configurado.
 *
 * Uso manual: `npx tsx src/workers/sync-openfinance.ts`
 */
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import {
  authenticate,
  isPluggyConfigured,
  listTransactions,
  type PluggyTransaction,
} from "@/lib/openfinance/pluggy";

/** Converte ISO "YYYY-MM-DD" → "MM/DD/YYYY" (formato usado no caixa). */
function toAppDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${m}/${d}/${y}`;
}

/** Versão Atual que recebe os movimentos da empresa até a seção 3 (ver cabeçalho). */
export async function versaoDeDestinoProvisoria(tenantId: string): Promise<string | null> {
  const [v] = await db
    .select({ id: schema.versions.id })
    .from(schema.versions)
    .where(and(eq(schema.versions.tenantId, tenantId), eq(schema.versions.kind, "atual")))
    .orderBy(asc(schema.versions.createdAt), asc(schema.versions.id))
    .limit(1);
  return v?.id ?? null;
}

/**
 * Grava as transações de UMA conta. Transação já gravada (mesmo id na mesma
 * conta) é ignorada pelo índice único; nada existente é alterado.
 */
export async function gravarTransacoesDaConta(
  conta: { id: string; tenantId: string },
  txs: PluggyTransaction[],
): Promise<number> {
  const validas = txs.filter((t) => t.id);
  if (validas.length === 0) return 0;
  const versionId = await versaoDeDestinoProvisoria(conta.tenantId);
  if (!versionId) return 0;
  const inseridos = await db
    .insert(schema.cashEntries)
    .values(
      validas.map((t) => ({
        versionId,
        tenantId: conta.tenantId,
        bankAccountId: conta.id,
        externalId: t.id,
        data: toAppDate(t.date),
        descricao: t.description,
        valor: String(t.amount),
        cat: t.category ?? "openfinance",
        rec: false,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: schema.cashEntries.id });
  return inseridos.length;
}

export async function syncOpenFinance(): Promise<{ inserted: number }> {
  if (!isPluggyConfigured()) {
    console.log("Pluggy não configurada — sync ignorado.");
    return { inserted: 0 };
  }

  const apiKey = await authenticate();
  const accounts = await db
    .select()
    .from(schema.bankAccounts)
    .where(isNotNull(schema.bankAccounts.openFinanceId));

  let inserted = 0;

  for (const acc of accounts) {
    const txs = await listTransactions(apiKey, acc.openFinanceId!);
    inserted += await gravarTransacoesDaConta(acc, txs);

    await db
      .update(schema.bankAccounts)
      .set({ lastSync: new Date() })
      .where(eq(schema.bankAccounts.id, acc.id));
  }

  console.log(`Open Finance sync: ${inserted} lançamentos inseridos.`);
  return { inserted };
}

// Permite execução direta via tsx.
if (process.argv[1]?.includes("sync-openfinance")) {
  syncOpenFinance()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Falha no sync:", err);
      process.exit(1);
    });
}
