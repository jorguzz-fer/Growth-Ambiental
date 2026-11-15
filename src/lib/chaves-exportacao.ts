import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getBankAccounts, getPlanejamentoNaoAprovado } from "@/lib/queries";
import { saldoDisponivel } from "@/lib/contas-saldo";
import { previaDreDefinicaoNova } from "@/lib/dre-inputs";
import { previaFluxoDefinicaoNova } from "@/lib/fluxo-caixa";
import { previaDashboardDefinicaoNova } from "@/lib/dashboard-previa";
import { previaResumoDefinicaoNova } from "@/lib/resumo-previa";
import {
  tabelaDashboard,
  tabelaDre,
  tabelaFluxo,
  tabelaRascunho,
  tabelaResumo,
  type ChaveComPrevia,
  type TabelaDaPrevia,
} from "@/lib/chaves-previa";

/** Ação de auditoria gravada a cada exportação da prévia de uma chave. */
export const ACAO_EXPORTAR_PREVIA = "chave.previa.exportar";

/** A tabela da prévia, pelas MESMAS funções que a tela /chaves usa. */
export async function tabelaDaPrevia(
  tenantId: string,
  chave: ChaveComPrevia,
  projetos: readonly { id: string; name: string; startDate: string | null; endDate: string | null }[],
): Promise<TabelaDaPrevia> {
  switch (chave) {
    case "rascunho_fora_dos_relatorios":
      return tabelaRascunho(await getPlanejamentoNaoAprovado(tenantId));
    case "dre_definicao_nova":
      return tabelaDre(await previaDreDefinicaoNova(tenantId, projetos));
    case "fluxo_definicao_nova":
      return tabelaFluxo(await previaFluxoDefinicaoNova(tenantId, projetos, saldoDisponivel(await getBankAccounts(tenantId))));
    case "dashboard_definicao_nova":
      return tabelaDashboard(await previaDashboardDefinicaoNova(tenantId, projetos));
    case "resumo_definicao_nova":
      return tabelaResumo(await previaResumoDefinicaoNova(tenantId, projetos));
  }
}

export interface ExportacaoDaPrevia {
  em: Date;
  por: string;
}

/** Última exportação da prévia de cada chave nesta empresa (pela Auditoria). */
export async function ultimasExportacoes(tenantId: string): Promise<Map<string, ExportacaoDaPrevia>> {
  const rows = await db
    .select({ chave: schema.auditLog.entityId, em: schema.auditLog.createdAt, email: schema.users.email, userId: schema.auditLog.userId })
    .from(schema.auditLog)
    .leftJoin(schema.users, eq(schema.users.id, schema.auditLog.userId))
    .where(and(eq(schema.auditLog.tenantId, tenantId), eq(schema.auditLog.action, ACAO_EXPORTAR_PREVIA)))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(200);
  const out = new Map<string, ExportacaoDaPrevia>();
  for (const r of rows) if (r.chave && !out.has(r.chave)) out.set(r.chave, { em: r.em, por: r.email ?? r.userId ?? "—" });
  return out;
}
