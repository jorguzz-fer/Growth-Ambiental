"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { getAtualVersion, getBudgetPlanning, getChartAccounts, getDespesas, getMonthlyRevenue } from "@/lib/queries";
import { grupoDaConta } from "@/lib/planocontas-regras";
import { hojeISO } from "@/lib/despesa-status";
import { contasParaGravar, proporDoOrcamento, proporDoRealizado, recusaDaProposta, type OrigemDaReprojecao, type PropostaDeReprojecao } from "@/lib/previsao-reprojecao";
import { duplicateForecast, saveBudgetPlanning } from "@/lib/actions/planning";
import { dadosOuErro } from "@/lib/resultado";

/**
 * Reprojeção sugerida pelo assistente (Prompt F, 8.1–8.5).
 *
 * `proporReprojecao` só LÊ e devolve a proposta (comparação antes/depois por
 * conta). `criarRevisaoComReprojecao` recalcula a proposta no servidor
 * (nunca confia no que veio do cliente), cria uma REVISÃO NOVA pelo caminho
 * que já existe (`duplicateForecast`: copia totais, seleção e origem) e
 * aplica só a distribuição mensal com `saveBudgetPlanning` — a revisão
 * aberta permanece intacta (8.3). Estouro de 100% é detectado antes (8.4).
 * Nunca: excluir revisão, trocar situação, alterar total por conta (8.5).
 */
export type ResultadoProposta = { ok: true; proposta: PropostaDeReprojecao } | { ok: false; error: string };
export type ResultadoRevisao = { ok: true; id: string; aviso?: string } | { ok: false; error: string };

const mesDeHoje = () => {
  const [y, m] = hojeISO().split("-");
  return `${m}/${y}`;
};

async function versaoDePrevisao(versionId: string) {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false as const, error: "Sessão expirada. Entre de novo." };
  if (!can(ctx.perms, "forecast", "ver")) return { ok: false as const, error: "Sem permissão para ver a Previsão." };
  const [v] = await db
    .select()
    .from(schema.versions)
    .where(and(eq(schema.versions.id, versionId), eq(schema.versions.tenantId, ctx.tenant.id), eq(schema.versions.kind, "forecast")))
    .limit(1);
  if (!v) return { ok: false as const, error: "Previsão não encontrada." };
  if (!ctx.projects.some((p) => p.id === v.projectId)) return { ok: false as const, error: "Projeto não encontrado nesta empresa." };
  return { ok: true as const, ctx, v };
}

async function montarProposta(tenantId: string, v: typeof schema.versions.$inferSelect, origem: OrigemDaReprojecao): Promise<ResultadoProposta> {
  const previsao = await getBudgetPlanning(tenantId, v.projectId, "forecast", v.id);
  if (!previsao.hasPeriod) return { ok: false, error: "O período do projeto não está definido no cadastro." };
  if (origem === "orcamento") {
    if (!v.sourceVersionId) return { ok: false, error: "Esta previsão não tem Orçamento de origem registrado; não há de onde partir." };
    const orcamento = await getBudgetPlanning(tenantId, v.projectId, "budget", v.sourceVersionId);
    return { ok: true, proposta: proporDoOrcamento({ months: previsao.months, previsao: { receitas: previsao.receitas, despesas: previsao.despesas }, orcamento: { receitas: orcamento.receitas, despesas: orcamento.despesas } }) };
  }
  const atual = await getAtualVersion(tenantId, v.projectId);
  if (!atual) return { ok: false, error: "O projeto não tem versão Atual." };
  // Despesas reais por grupo do Plano de Contas (chave da grade) e competência.
  const realizado: Record<string, Record<string, number>> = {};
  // 0079 — grupo pelo cadastro da conta, não pelo prefixo do código.
  const contaParaGrupo = new Map((await getChartAccounts(tenantId)).map((c) => [c.code, c.groupCode]));
  for (const d of await getDespesas(atual.id)) {
    if (d.cancelado || !d.contaCef || !d.competencia) continue;
    const grupo = grupoDaConta(contaParaGrupo, d.contaCef);
    (realizado[grupo] ??= {})[d.competencia] = (realizado[grupo]?.[d.competencia] ?? 0) + Number(d.valor);
  }
  // Prompt F2: a receita da Atual (a mesma da DRE, por competência) substitui os meses passados.
  const receitaRealizada = await getMonthlyRevenue(atual.id, v.projectId);
  return { ok: true, proposta: proporDoRealizado({ months: previsao.months, hojeMes: mesDeHoje(), previsao: { receitas: previsao.receitas, despesas: previsao.despesas }, realizado, receitaRealizada }) };
}

export async function proporReprojecao(versionId: string, origem: OrigemDaReprojecao): Promise<ResultadoProposta> {
  const alvo = await versaoDePrevisao(versionId);
  if (!alvo.ok) return alvo;
  return montarProposta(alvo.ctx.tenant.id, alvo.v, origem);
}

export async function criarRevisaoComReprojecao(versionId: string, origem: OrigemDaReprojecao, nome: string): Promise<ResultadoRevisao> {
  const alvo = await versaoDePrevisao(versionId);
  if (!alvo.ok) return alvo;
  const { ctx, v } = alvo;
  if (!can(ctx.perms, "forecast", "criar")) return { ok: false, error: "Sem permissão para criar uma revisão." };
  const proposta = await montarProposta(ctx.tenant.id, v, origem);
  if (!proposta.ok) return proposta;
  const recusa = recusaDaProposta(proposta.proposta);
  if (recusa) return { ok: false, error: recusa };

  // Revisão nova pelo caminho existente: a atual fica intacta (8.3).
  const criada = await duplicateForecast(versionId, nome);
  if (!criada.ok) return criada;
  const nova = await getBudgetPlanning(ctx.tenant.id, v.projectId, "forecast", criada.id);
  try {
    for (const bloco of ["receita", "despesa"] as const) {
      const contas = contasParaGravar(proposta.proposta, bloco, bloco === "receita" ? nova.receitas : nova.despesas, nova.months);
      if (contas.length > 0) dadosOuErro(await saveBudgetPlanning(criada.id, bloco, contas));
    }
  } catch (e) {
    return { ok: false, error: `A revisão “${nome}” foi criada, mas a distribuição não pôde ser aplicada: ${e instanceof Error ? e.message : "falha ao salvar"}.` };
  }
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "forecast.reprojecao",
    entity: "version",
    entityId: criada.id,
    meta: { origem: "assistente", base: origem, de: versionId, contas: proposta.proposta.contas.filter((c) => c.mudou).map((c) => c.rowKey), decorridas: proposta.proposta.decorridas },
  });
  revalidatePath("/forecast");
  return { ok: true, id: criada.id, aviso: criada.aviso };
}
