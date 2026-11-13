"use server";

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { isAiConfigured } from "@/lib/ai/client";
import { legivelPelaIa } from "@/lib/ai/campos";
import { extractProjetoFromDocuments } from "@/lib/ai/projeto-extract";
import { montarPropostaDeProjeto, type PropostaDeProjeto } from "@/lib/ai/projeto-doc";
import { getObjectBytes, isR2Configured } from "@/lib/storage/r2";
import { TELA_PROJETO } from "@/lib/projeto-regras";
import { comUsoDeIa } from "@/lib/ai/uso";

export type ResultadoPropostaProjeto = { ok: true; proposta: PropostaDeProjeto } | { ok: false; error: string };

/**
 * "Extrair dados de documentos" (Prompt B, 25–26, 29). Esta action NÃO grava
 * nada: devolve uma PROPOSTA campo a campo, comparada com o cadastro atual.
 * Quem grava é o usuário, pelo Salvar da obra, pela mesma `updateProject`
 * (que confere a permissão de novo e marca `origem: "assistente"` no log).
 *
 * Guardas, todas no servidor e contra o banco (26): permissão de `editar`
 * (sem ela a proposta não poderia ser aplicada — o assistente não é porta
 * lateral); o projeto pertence ao tenant; o documento pertence ao tenant E
 * ao projeto em tela — um id de outro projeto ou de outra empresa é recusado.
 */
export async function proporDadosDoProjetoPorDocumento(projectId: string, documentId: string): Promise<ResultadoPropostaProjeto> {
  const falha = (error: string) => ({ ok: false as const, error });
  const ctx = await getTenantContext();
  if (!ctx) return falha("Sessão expirada. Entre de novo.");
  if (!can(ctx.perms, TELA_PROJETO, "editar")) return falha("Sem permissão para editar o projeto: a proposta não poderia ser aplicada.");
  const projeto = ctx.projects.find((p) => p.id === projectId);
  if (!projeto) return falha("Projeto não encontrado nesta empresa.");
  if (!isAiConfigured()) return falha("Assistente por IA não configurado (defina ANTHROPIC_API_KEY).");
  if (!isR2Configured()) return falha("Storage (R2) não configurado.");
  const [doc] = await db
    .select({ id: schema.documents.id, storageKey: schema.documents.storageKey, contentType: schema.documents.contentType, filename: schema.documents.filename })
    .from(schema.documents)
    .where(and(eq(schema.documents.id, documentId), eq(schema.documents.tenantId, ctx.tenant.id), eq(schema.documents.projectId, projectId)))
    .limit(1);
  if (!doc) return falha("Documento não encontrado neste projeto.");
  const mime = doc.contentType ?? "";
  if (!legivelPelaIa(mime)) return falha("Só PDF ou imagem (PNG, JPG, WebP) podem ser lidos.");
  try {
    const bytes = await getObjectBytes(doc.storageKey);
    const lido = await comUsoDeIa({ tenantId: ctx.tenant.id, userId: ctx.userId, operacao: "projeto" }, () => extractProjetoFromDocuments([{ bytes, mime, filename: doc.filename }], new Date().toISOString().slice(0, 10)));
    const proposta = montarPropostaDeProjeto(lido, {
      name: projeto.name,
      endereco: projeto.endereco,
      cep: projeto.cep,
      municipioObra: projeto.municipioObra,
      ufObra: projeto.ufObra,
      startDate: projeto.startDate,
      endDate: projeto.endDate,
      valorConstrucao: projeto.valorConstrucao,
      custoConstrucao: projeto.custoConstrucao,
    });
    return { ok: true, proposta };
  } catch (e) {
    console.error("[projetos] falha na leitura por IA:", e);
    return falha(e instanceof Error ? e.message : "Falha ao ler o documento.");
  }
}
