import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { versionInputsByMonth } from "@/lib/dre-inputs";
import { chaveLigada } from "@/lib/chaves-tenant";
import { indicadoresDeProjecao, type IndicadoresDeProjecao } from "@/lib/projecao-financeira";
import { entraNosRelatorios } from "@/lib/situacao-versao";

/**
 * As versões que entram na projeção de um projeto:
 *  · Orçamento original: o PRIMEIRO Orçamento criado (preservado);
 *  · Orçamento revisado: o último Aprovado; sem aprovado, o padrão; sem
 *    padrão, o mais recente;
 *  · Previsão: a mais recente; Atual: a do projeto.
 * GA-1 §3: com "rascunho_fora_dos_relatorios" ligada, só versão Aprovada
 * entra (como nos demais relatórios). Sem Previsão aprovada, a tela diz
 * "sem Previsão aprovada" — nunca "para concluir R$ 0,00".
 */
export type ProjecaoDoProjeto = IndicadoresDeProjecao & {
  versoes: Record<string, string | null>;
  /** existe Previsão, mas nenhuma Aprovada (com a chave ligada). */
  semPrevisaoAprovada: boolean;
  /** existe Orçamento, mas nenhum Aprovado (com a chave ligada). */
  semOrcamentoAprovado: boolean;
};
export async function projecaoDoProjeto(tenantId: string, projectId: string, hoje = new Date()): Promise<ProjecaoDoProjeto | null> {
  const versoes = await db
    .select({ id: schema.versions.id, kind: schema.versions.kind, label: schema.versions.label, status: schema.versions.status, isDefault: schema.versions.isDefault })
    .from(schema.versions)
    .where(and(eq(schema.versions.tenantId, tenantId), eq(schema.versions.projectId, projectId)))
    .orderBy(asc(schema.versions.createdAt));
  if (!versoes.length) return null;
  const rascunhoFora = await chaveLigada(tenantId, "rascunho_fora_dos_relatorios");
  const entra = (v: { kind: string; status: string } | null) => !!v && entraNosRelatorios(v, rascunhoFora);
  const budgets = versoes.filter((v) => v.kind === "budget");
  const previsoes = versoes.filter((v) => v.kind === "forecast");
  const original = entra(budgets[0] ?? null) ? budgets[0] : null;
  const revisado = [...budgets].reverse().find((v) => v.status === "Aprovado") ?? (rascunhoFora ? null : (budgets.find((v) => v.isDefault) ?? budgets.at(-1) ?? null));
  const previsao = [...previsoes].reverse().find(entra) ?? null;
  const atual = versoes.find((v) => v.kind === "atual") ?? null;
  const definicaoNova = await chaveLigada(tenantId, "dre_definicao_nova");
  const ler = (v: { id: string } | null) => (v ? versionInputsByMonth(tenantId, v.id, projectId, { definicaoNova }) : Promise.resolve(null));
  const [o, r, a, p] = await Promise.all([ler(original), ler(revisado && revisado.id !== original?.id ? revisado : null), ler(atual), ler(previsao)]);
  const mesAtual = `${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`;
  return {
    ...indicadoresDeProjecao({ orcamentoOriginal: o, orcamentoRevisado: r ?? o, atual: a, previsao: p, mesAtual }),
    versoes: { original: original?.label ?? null, revisado: revisado?.label ?? null, previsao: previsao?.label ?? null },
    semPrevisaoAprovada: previsoes.length > 0 && !previsao,
    semOrcamentoAprovado: budgets.length > 0 && !budgets.some(entra),
  };
}
