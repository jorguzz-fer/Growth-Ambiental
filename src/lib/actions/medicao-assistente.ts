"use server";

import { grupoDaChave } from "@/lib/planocontas-regras";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { isAiConfigured } from "@/lib/ai/client";
import { legivelPelaIa } from "@/lib/ai/campos";
import { getObjectBytes, isR2Configured } from "@/lib/storage/r2";
import { getBudgetLines, getChartAccounts, getMedicoes } from "@/lib/queries";
import { extractLaudoDeMedicao } from "@/lib/ai/medicao-extract";
import { compararLaudoComLancado, type ComparacaoDoLaudo } from "@/lib/ai/medicao-doc";
import { escolherOrcamento } from "@/lib/medicao-cef";
import { TELA_RELATORIO } from "@/lib/medicao-regras";
import { comUsoDeIa } from "@/lib/ai/uso";

export type ResultadoLaudo = { ok: true; comparacao: ComparacaoDoLaudo } | { ok: false; error: string };

/**
 * "Ler o laudo anexado" (Prompt V, 6.2) — SOMENTE LEITURA. Lê o documento
 * (do tenant, vinculado à medição), extrai grupo e percentual/valor e
 * COMPARA com o que está lançado na competência da medição. Não lança, não
 * altera, não exclui (6.3). Exige a permissão do relatório: a comparação
 * traduz o % do laudo em valor pelo orçado, que o engenheiro não vê (0.5.6).
 */
export async function lerLaudoDaMedicao(medicaoId: string, documentId: string): Promise<ResultadoLaudo> {
  const falha = (error: string) => ({ ok: false as const, error });
  const ctx = await getTenantContext();
  if (!ctx) return falha("Sessão expirada. Entre de novo.");
  if (!can(ctx.perms, TELA_RELATORIO, "ver")) return falha("Sem permissão para o Relatório CEF: a leitura compara com o orçado.");
  const [row] = await db
    .select({ m: schema.medicoes, projectId: schema.versions.projectId })
    .from(schema.medicoes)
    .innerJoin(schema.versions, eq(schema.medicoes.versionId, schema.versions.id))
    .where(and(eq(schema.medicoes.id, medicaoId), eq(schema.medicoes.tenantId, ctx.tenant.id), eq(schema.versions.tenantId, ctx.tenant.id)))
    .limit(1);
  if (!row || !ctx.projects.some((p) => p.id === row.projectId)) return falha("Medição não encontrada.");
  const [doc] = await db
    .select({ storageKey: schema.documents.storageKey, contentType: schema.documents.contentType, filename: schema.documents.filename })
    .from(schema.documents)
    .where(and(eq(schema.documents.id, documentId), eq(schema.documents.tenantId, ctx.tenant.id), eq(schema.documents.medicaoId, medicaoId)))
    .limit(1);
  if (!doc) return falha("Documento não encontrado nesta medição.");
  if (!isAiConfigured()) return falha("Assistente por IA não configurado (defina ANTHROPIC_API_KEY).");
  if (!isR2Configured()) return falha("Storage (R2) não configurado.");
  const mime = doc.contentType ?? "";
  if (!legivelPelaIa(mime)) return falha("Só PDF ou imagem (PNG, JPG, WebP) podem ser lidos.");
  try {
    const [chart, lancadas, versoes] = await Promise.all([
      getChartAccounts(ctx.tenant.id),
      getMedicoes(ctx.tenant.id, row.m.versionId),
      db.select().from(schema.versions).where(and(eq(schema.versions.tenantId, ctx.tenant.id), eq(schema.versions.projectId, row.projectId))),
    ]);
    const grupos = [...new Map(chart.filter((c) => c.kind === "cef").map((c) => [c.groupCode, { code: c.groupCode, name: c.groupName }])).values()];
    const orcadoPorGrupo: Record<string, number> = {};
    const budget = escolherOrcamento(versoes, null).escolhido;
    if (budget) {
      for (const l of await getBudgetLines(budget.id, { respeitarSituacao: true })) {
        if (l.kind !== "despesa") continue;
        const g = grupoDaChave(l.rowKey, new Set(chart.map((c) => c.groupCode)), new Map(chart.map((c) => [c.code, c.groupCode])));
        orcadoPorGrupo[g] = (orcadoPorGrupo[g] ?? 0) + Number(l.valor);
      }
    }
    const bytes = await getObjectBytes(doc.storageKey);
    const lido = await comUsoDeIa({ tenantId: ctx.tenant.id, userId: ctx.userId, operacao: "medicao" }, () => extractLaudoDeMedicao({ bytes, mime, filename: doc.filename }, grupos));
    const daCompetencia = lancadas.filter((m) => m.competencia === row.m.competencia).map((m) => ({ grupoCode: m.grupoCode, competencia: m.competencia, valor: Number(m.valor) }));
    return { ok: true, comparacao: compararLaudoComLancado(lido, daCompetencia, orcadoPorGrupo) };
  } catch (e) {
    console.error("[medicao] falha na leitura do laudo:", e);
    return falha(e instanceof Error ? e.message : "Falha ao ler o laudo.");
  }
}
