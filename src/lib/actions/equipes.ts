"use server";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { getObjectBytes, isR2Configured, putObject } from "@/lib/storage/r2";
import { AI_ACCEPTED_MIME, AI_MAX_DOCS, isAiConfigured } from "@/lib/ai/despesa-extract";
import { lerFolhaDePontoComIA } from "@/lib/ai/folha-ponto";
import { casarNomesComEquipe, type PropostaDeDiaria } from "@/lib/pessoas-analise";
import { getEquipeDoProjeto } from "@/lib/queries";
import { LIMITE_UPLOAD_BYTES, LIMITE_UPLOAD_MB } from "@/lib/clientes-regras";
import { origemDoStakeholder, recusaDaAlocacao, recusaDoRegistro, TIPOS_DOC_EQUIPE_DIA, valorDaDiaria, type OrigemMembro } from "@/lib/equipe-regras";
import { numeroDoCampo } from "@/lib/estoque-regras";
import { garantirFuncoesPadrao } from "@/lib/equipes-db";
import { comUsoDeIa } from "@/lib/ai/uso";

/**
 * Equipes de Projetos (Prompt Z, Parte 3). Nenhuma action aqui cria
 * despesa (BZ-1): a diária é registrada e a tela propõe o lançamento em
 * /despesas. Sem geolocalização (3.5.3 / 7.4). O log leva nomes, datas,
 * funções e quantidades — nunca CPF, salário ou endereço.
 */

export type Resultado = { ok: true; id: string; aviso?: string | null } | { ok: false; error: string };
export type ResultadoDocs = { ok: true; added: number } | { ok: false; error: string };
const SEM_SESSAO = "Sessão expirada. Entre de novo.";
const TELA = "equipes";
const s = (v: FormDataEntryValue | null) => {
  const x = String(v ?? "").trim();
  return x ? x : null;
};
const BR = /^\d{2}\/\d{2}\/\d{4}$/;

/* ───────────── funções (BZ-3) ───────────── */

export async function addFuncao(nome: string): Promise<Resultado> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, TELA, "editar")) return { ok: false, error: "Sem permissão para editar as funções." };
  const n = (nome ?? "").trim();
  if (!n) return { ok: false, error: "Informe o nome da função." };
  await garantirFuncoesPadrao(ctx.tenant.id);
  const [ja] = await db.select({ id: schema.funcoesEquipe.id }).from(schema.funcoesEquipe).where(and(eq(schema.funcoesEquipe.tenantId, ctx.tenant.id), eq(schema.funcoesEquipe.nome, n))).limit(1);
  if (ja) return { ok: false, error: `A função "${n}" já existe.` };
  try {
    const [row] = await db.insert(schema.funcoesEquipe).values({ tenantId: ctx.tenant.id, nome: n, ordem: 99 }).returning({ id: schema.funcoesEquipe.id });
    await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "equipe.funcao.create", entity: "funcao_equipe", entityId: row.id, meta: { nome: n } });
    revalidatePath("/equipes");
    return { ok: true, id: row.id };
  } catch {
    return { ok: false, error: `A função "${n}" já existe (a lista não diferencia maiúsculas).` };
  }
}

export async function setFuncaoAtiva(id: string, ativo: boolean): Promise<Resultado> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, TELA, "editar")) return { ok: false, error: "Sem permissão para editar as funções." };
  const [f] = await db.select().from(schema.funcoesEquipe).where(and(eq(schema.funcoesEquipe.id, id), eq(schema.funcoesEquipe.tenantId, ctx.tenant.id))).limit(1);
  if (!f) return { ok: false, error: "Função não encontrada." };
  await db.update(schema.funcoesEquipe).set({ ativo }).where(eq(schema.funcoesEquipe.id, id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: ativo ? "equipe.funcao.reativar" : "equipe.funcao.inativar", entity: "funcao_equipe", entityId: id, meta: { nome: f.nome } });
  revalidatePath("/equipes");
  return { ok: true, id };
}

/* ───────────── alocação ───────────── */

async function origemDe(tenantId: string, stakeholderId: string | null, funcionarioId: string | null): Promise<{ origem: OrigemMembro | null; nome: string; desligado: boolean; ativo: boolean }> {
  if (funcionarioId) {
    const [f] = await db.select({ nome: schema.funcionarios.nome, desligamento: schema.funcionarios.desligamento }).from(schema.funcionarios).where(and(eq(schema.funcionarios.id, funcionarioId), eq(schema.funcionarios.tenantId, tenantId))).limit(1);
    return f ? { origem: "clt", nome: f.nome, desligado: !!f.desligamento, ativo: true } : { origem: null, nome: "—", desligado: false, ativo: true };
  }
  if (stakeholderId) {
    const [st] = await db.select({ nome: schema.stakeholders.nome, papeis: schema.stakeholders.papeis, ativo: schema.stakeholders.ativo }).from(schema.stakeholders).where(and(eq(schema.stakeholders.id, stakeholderId), eq(schema.stakeholders.tenantId, tenantId))).limit(1);
    return st ? { origem: origemDoStakeholder(st.papeis ?? []), nome: st.nome, desligado: false, ativo: st.ativo } : { origem: null, nome: "—", desligado: false, ativo: true };
  }
  return { origem: null, nome: "—", desligado: false, ativo: true };
}

/** 3.2 / 3.4 — aloca um membro na obra com função e (autônomo) valor da diária. Origem única garantida aqui e no CHECK do banco. */
export async function alocarMembro(fd: FormData): Promise<Resultado> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, TELA, "criar")) return { ok: false, error: "Sem permissão para alocar na equipe." };
  const projectId = s(fd.get("projectId"));
  if (!projectId || !ctx.projects.some((p) => p.id === projectId)) return { ok: false, error: "Projeto não encontrado nesta empresa." };
  const stakeholderId = s(fd.get("stakeholderId"));
  const funcionarioId = s(fd.get("funcionarioId"));
  const o = await origemDe(ctx.tenant.id, stakeholderId, funcionarioId);
  const valorStr = s(fd.get("valorDiaria"));
  const valorDiaria = valorStr == null ? null : numeroDoCampo(valorStr);
  const entrada = s(fd.get("entrada"));
  const recusa = recusaDaAlocacao({ stakeholderId, funcionarioId, origem: o.origem, valorDiaria, funcionarioDesligado: o.desligado, stakeholderAtivo: o.ativo, entrada });
  if (recusa) return { ok: false, error: recusa };
  const funcaoId = s(fd.get("funcaoId"));
  if (funcaoId) {
    const [fn] = await db.select({ id: schema.funcoesEquipe.id }).from(schema.funcoesEquipe).where(and(eq(schema.funcoesEquipe.id, funcaoId), eq(schema.funcoesEquipe.tenantId, ctx.tenant.id))).limit(1);
    if (!fn) return { ok: false, error: "Função não encontrada." };
  }
  const [row] = await db
    .insert(schema.equipesProjeto)
    .values({ tenantId: ctx.tenant.id, projectId, stakeholderId, funcionarioId, funcaoId, valorDiaria: o.origem === "autonomo" && valorDiaria != null ? String(valorDiaria) : null, entrada, obs: s(fd.get("obs")), situacao: "ativa" })
    .returning({ id: schema.equipesProjeto.id });
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "equipe.alocar", entity: "equipe_projeto", entityId: row.id, meta: { projectId, origem: o.origem, nome: o.nome, funcaoId, valorDiaria: o.origem === "autonomo" ? valorDiaria : null, entrada } });
  revalidatePath("/equipes");
  return { ok: true, id: row.id };
}

/** 3.4 / 3.5.4 — função e valor da diária da alocação; o novo valor vale para os PRÓXIMOS registros (10a). */
export async function updateAlocacao(id: string, fd: FormData): Promise<Resultado> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, TELA, "editar")) return { ok: false, error: "Sem permissão para editar a alocação." };
  const [a] = await db.select().from(schema.equipesProjeto).where(and(eq(schema.equipesProjeto.id, id), eq(schema.equipesProjeto.tenantId, ctx.tenant.id))).limit(1);
  if (!a) return { ok: false, error: "Alocação não encontrada." };
  const o = await origemDe(ctx.tenant.id, a.stakeholderId, a.funcionarioId);
  const valorStr = s(fd.get("valorDiaria"));
  const valorDiaria = valorStr == null ? null : numeroDoCampo(valorStr);
  const recusa = recusaDaAlocacao({ stakeholderId: a.stakeholderId, funcionarioId: a.funcionarioId, origem: o.origem, valorDiaria, entrada: s(fd.get("entrada")) ?? a.entrada, saida: s(fd.get("saida")) });
  if (recusa) return { ok: false, error: recusa };
  const funcaoId = s(fd.get("funcaoId"));
  const set = { funcaoId, valorDiaria: o.origem === "autonomo" && valorDiaria != null ? String(valorDiaria) : null, entrada: s(fd.get("entrada")) ?? a.entrada, obs: s(fd.get("obs")) };
  await db.update(schema.equipesProjeto).set(set).where(eq(schema.equipesProjeto.id, id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "equipe.alocacao.update", entity: "equipe_projeto", entityId: id, meta: { nome: o.nome, de: { funcaoId: a.funcaoId, valorDiaria: a.valorDiaria }, para: { funcaoId, valorDiaria: set.valorDiaria } } });
  revalidatePath("/equipes");
  return { ok: true, id, aviso: a.valorDiaria !== set.valorDiaria ? "O novo valor vale para os próximos registros; as diárias já lançadas mantêm o valor da época." : null };
}

/** 3.2 — encerrar a alocação (saída da equipe). O histórico fica. */
export async function encerrarAlocacao(id: string, saida: string): Promise<Resultado> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, TELA, "editar")) return { ok: false, error: "Sem permissão para editar a alocação." };
  const [a] = await db.select().from(schema.equipesProjeto).where(and(eq(schema.equipesProjeto.id, id), eq(schema.equipesProjeto.tenantId, ctx.tenant.id))).limit(1);
  if (!a) return { ok: false, error: "Alocação não encontrada." };
  const d = (saida ?? "").trim();
  if (!BR.test(d)) return { ok: false, error: "Informe a data de saída." };
  if (a.entrada && d.slice(6) + d.slice(0, 2) + d.slice(3, 5) < a.entrada.slice(6) + a.entrada.slice(0, 2) + a.entrada.slice(3, 5)) return { ok: false, error: "A saída não pode ser anterior à entrada." };
  await db.update(schema.equipesProjeto).set({ saida: d, situacao: "encerrada" }).where(eq(schema.equipesProjeto.id, id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "equipe.alocacao.encerrar", entity: "equipe_projeto", entityId: id, meta: { saida: d } });
  revalidatePath("/equipes");
  return { ok: true, id };
}

export async function reabrirAlocacao(id: string): Promise<Resultado> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, TELA, "editar")) return { ok: false, error: "Sem permissão para editar a alocação." };
  const [a] = await db.select().from(schema.equipesProjeto).where(and(eq(schema.equipesProjeto.id, id), eq(schema.equipesProjeto.tenantId, ctx.tenant.id))).limit(1);
  if (!a) return { ok: false, error: "Alocação não encontrada." };
  const o = await origemDe(ctx.tenant.id, a.stakeholderId, a.funcionarioId);
  if (o.desligado) return { ok: false, error: "Funcionário desligado não volta à equipe." };
  await db.update(schema.equipesProjeto).set({ saida: null, situacao: "ativa" }).where(eq(schema.equipesProjeto.id, id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "equipe.alocacao.reabrir", entity: "equipe_projeto", entityId: id, meta: { nome: o.nome } });
  revalidatePath("/equipes");
  return { ok: true, id };
}

/* ───────────── diárias (3.5) ───────────── */

export interface ItemDoDia {
  equipeProjetoId: string;
  /** 0.5 · 1 · 1.5 · 2 */
  quantidade: number;
  obs?: string | null;
}

/**
 * 3.5.2 — lançamento em LOTE: o dia inteiro de uma vez. Cria (ou reaproveita)
 * o dia da equipe e grava uma diária por membro marcado, com o VALOR DA
 * ALOCAÇÃO no momento (3.5.4). Membro já registrado no dia é atualizado.
 * Não cria despesa (BZ-1).
 */
export async function registrarDiariasDoDia(input: { projectId: string; data: string; obs?: string | null; itens: ItemDoDia[] }): Promise<{ ok: true; equipeDiaId: string; registradas: number; avisos: string[] } | { ok: false; error: string }> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, TELA, "criar")) return { ok: false, error: "Sem permissão para registrar diárias." };
  if (!ctx.projects.some((p) => p.id === input.projectId)) return { ok: false, error: "Projeto não encontrado nesta empresa." };
  const data = (input.data ?? "").trim();
  if (!BR.test(data)) return { ok: false, error: "Informe a data do dia." };
  if (!input.itens?.length) return { ok: false, error: "Marque quem trabalhou no dia." };
  const ids = input.itens.map((i) => i.equipeProjetoId);
  const membros = await db.select().from(schema.equipesProjeto).where(and(eq(schema.equipesProjeto.tenantId, ctx.tenant.id), eq(schema.equipesProjeto.projectId, input.projectId), inArray(schema.equipesProjeto.id, ids)));
  if (membros.length !== new Set(ids).size) return { ok: false, error: "Há membro que não é desta equipe." };
  const avisos: string[] = [];
  const prontos: { membro: typeof membros[number]; quantidade: number; valor: number | null; obs: string | null; nome: string }[] = [];
  for (const it of input.itens) {
    const m = membros.find((x) => x.id === it.equipeProjetoId)!;
    const o = await origemDe(ctx.tenant.id, m.stakeholderId, m.funcionarioId);
    const origem = o.origem ?? "autonomo";
    const valorAloc = m.valorDiaria == null ? null : Number(m.valorDiaria);
    const recusa = recusaDoRegistro({ origem, valorAlocacao: valorAloc, quantidade: Number(it.quantidade), situacao: m.situacao });
    if (recusa) return { ok: false, error: `${o.nome}: ${recusa}` };
    prontos.push({ membro: m, quantidade: Number(it.quantidade), valor: valorDaDiaria(origem, valorAloc), obs: (it.obs ?? "").trim() || null, nome: o.nome });
  }
  const equipeDiaId = await db.transaction(async (tx) => {
    const [existente] = await tx.select({ id: schema.equipeDias.id }).from(schema.equipeDias).where(and(eq(schema.equipeDias.projectId, input.projectId), eq(schema.equipeDias.data, data))).limit(1);
    let diaId = existente?.id;
    if (!diaId) {
      const [d] = await tx.insert(schema.equipeDias).values({ tenantId: ctx.tenant.id, projectId: input.projectId, data, obs: (input.obs ?? "").trim() || null }).returning({ id: schema.equipeDias.id });
      diaId = d.id;
    } else if (input.obs?.trim()) {
      await tx.update(schema.equipeDias).set({ obs: input.obs.trim() }).where(eq(schema.equipeDias.id, diaId));
    }
    for (const p of prontos) {
      await tx
        .insert(schema.diarias)
        .values({ tenantId: ctx.tenant.id, equipeDiaId: diaId, equipeProjetoId: p.membro.id, quantidade: String(p.quantidade), valor: p.valor == null ? null : String(p.valor), obs: p.obs, registradoPor: ctx.userEmail || ctx.userId || null })
        .onConflictDoUpdate({ target: [schema.diarias.equipeDiaId, schema.diarias.equipeProjetoId], set: { quantidade: String(p.quantidade), obs: p.obs, registradoPor: ctx.userEmail || ctx.userId || null } });
    }
    return diaId;
  });
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "equipe.diarias.registrar", entity: "equipe_dia", entityId: equipeDiaId, meta: { projectId: input.projectId, data, membros: prontos.map((p) => ({ nome: p.nome, quantidade: p.quantidade, valor: p.valor })) } });
  revalidatePath("/equipes");
  return { ok: true, equipeDiaId, registradas: prontos.length, avisos };
}

export async function removerDiaria(id: string): Promise<Resultado> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, TELA, "excluir")) return { ok: false, error: "Sem permissão para remover diária." };
  const [d] = await db.select().from(schema.diarias).where(and(eq(schema.diarias.id, id), eq(schema.diarias.tenantId, ctx.tenant.id))).limit(1);
  if (!d) return { ok: false, error: "Diária não encontrada." };
  if (d.despesaId) return { ok: false, error: "Esta diária já foi lançada em Despesas: cancele ou ajuste a despesa antes." };
  await db.delete(schema.diarias).where(eq(schema.diarias.id, id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "equipe.diaria.remover", entity: "equipe_dia", entityId: d.equipeDiaId, meta: { equipeProjetoId: d.equipeProjetoId, quantidade: d.quantidade, valor: d.valor } });
  revalidatePath("/equipes");
  return { ok: true, id };
}

/* ───────────── documentos do dia (3.6) ───────────── */

export async function addEquipeDiaDocs(fd: FormData): Promise<ResultadoDocs> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, TELA, "criar")) return { ok: false, error: "Sem permissão para anexar documentos do dia." };
  if (!isR2Configured()) return { ok: false, error: "Storage (R2) não configurado — defina as variáveis R2_*." };
  const equipeDiaId = s(fd.get("equipeDiaId"));
  if (!equipeDiaId) return { ok: false, error: "Dia não informado." };
  const [dia] = await db.select().from(schema.equipeDias).where(and(eq(schema.equipeDias.id, equipeDiaId), eq(schema.equipeDias.tenantId, ctx.tenant.id))).limit(1);
  if (!dia) return { ok: false, error: "Dia não encontrado." };
  const tipo = s(fd.get("tipo")) ?? "";
  if (!(TIPOS_DOC_EQUIPE_DIA as readonly string[]).includes(tipo)) return { ok: false, error: "Escolha o tipo do documento." };
  const files = fd.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, error: "Selecione ao menos um arquivo." };
  for (const f of files) if (f.size > LIMITE_UPLOAD_BYTES) return { ok: false, error: `"${f.name}" excede ${LIMITE_UPLOAD_MB} MB.` };
  const [ultima] = await db.select({ versao: schema.documents.versao }).from(schema.documents).where(and(eq(schema.documents.tenantId, ctx.tenant.id), eq(schema.documents.equipeDiaId, dia.id), eq(schema.documents.tipo, tipo))).orderBy(desc(schema.documents.versao)).limit(1);
  let versao = ultima?.versao ?? 0;
  const gravados: { filename: string; versao: number; storageKey: string }[] = [];
  try {
    for (const file of files) {
      versao += 1;
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const key = `tenants/${ctx.tenant.id}/equipe/${dia.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`;
      await putObject(key, new Uint8Array(await file.arrayBuffer()), file.type || "application/octet-stream");
      await db.insert(schema.documents).values({ tenantId: ctx.tenant.id, equipeDiaId: dia.id, projectId: dia.projectId, storageKey: key, filename: file.name, contentType: file.type || null, size: file.size, tipo, versao, uploadedBy: ctx.userEmail || ctx.userId || null });
      gravados.push({ filename: file.name, versao, storageKey: key });
    }
  } catch (e) {
    console.error("[equipes] falha ao anexar:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao enviar os arquivos." };
  }
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "equipe.dia.doc.upload", entity: "equipe_dia", entityId: dia.id, meta: { data: dia.data, tipo, arquivos: gravados } });
  revalidatePath("/equipes");
  return { ok: true, added: files.length };
}

export async function deleteEquipeDiaDoc(documentId: string): Promise<Resultado> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, TELA, "criar")) return { ok: false, error: "Sem permissão para remover documentos do dia." };
  const [doc] = await db.select().from(schema.documents).where(and(eq(schema.documents.id, documentId), eq(schema.documents.tenantId, ctx.tenant.id))).limit(1);
  if (!doc || !doc.equipeDiaId) return { ok: false, error: "Documento não encontrado." };
  await db.delete(schema.documents).where(eq(schema.documents.id, doc.id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "equipe.dia.doc.unlink", entity: "equipe_dia", entityId: doc.equipeDiaId, meta: { documentId: doc.id, filename: doc.filename, storageKey: doc.storageKey, tipo: doc.tipo, versao: doc.versao } });
  revalidatePath("/equipes");
  return { ok: true, id: doc.id };
}

/** BZ-1 (rastro) — depois que a despesa foi lançada em /despesas, as diárias apontam para ela. Chamado por `lancarDespesa`. */
export async function vincularDiariasADespesa(tenantId: string, diariasIds: readonly string[], despesaId: string): Promise<number> {
  if (diariasIds.length === 0) return 0;
  const rows = await db.update(schema.diarias).set({ despesaId }).where(and(eq(schema.diarias.tenantId, tenantId), inArray(schema.diarias.id, [...diariasIds]), isNull(schema.diarias.despesaId))).returning({ id: schema.diarias.id });
  return rows.length;
}

/* ───────────── 6.2 — ler a folha de ponto anexada (propõe, não grava) ───────────── */

export type ResultadoFolhaPonto = { ok: true; data: string; casados: PropostaDeDiaria[]; semPar: string[]; observacoes: string[] } | { ok: false; error: string };

/**
 * Lê SÓ os documentos do tipo "Folha de ponto assinada" do dia (nunca
 * documento de funcionário — 6.3) e propõe os registros casados com a
 * equipe. A gravação é da pessoa, por `registrarDiariasDoDia`.
 */
export async function lerFolhaDePonto(equipeDiaId: string): Promise<ResultadoFolhaPonto> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, TELA, "ver")) return { ok: false, error: "Sem permissão para ver equipes." };
  if (!isAiConfigured()) return { ok: false, error: "Leitura por IA não configurada (ANTHROPIC_API_KEY)." };
  if (!isR2Configured()) return { ok: false, error: "Storage (R2) não configurado — a folha não pode ser lida." };
  const [dia] = await db.select().from(schema.equipeDias).where(and(eq(schema.equipeDias.id, equipeDiaId), eq(schema.equipeDias.tenantId, ctx.tenant.id))).limit(1);
  if (!dia) return { ok: false, error: "Dia não encontrado." };
  const docs = await db.select().from(schema.documents).where(and(eq(schema.documents.tenantId, ctx.tenant.id), eq(schema.documents.equipeDiaId, dia.id), eq(schema.documents.tipo, "Folha de ponto assinada"))).orderBy(desc(schema.documents.uploadedAt));
  const legiveis = docs.filter((d) => (AI_ACCEPTED_MIME as readonly string[]).includes(d.contentType ?? "")).slice(0, AI_MAX_DOCS);
  if (legiveis.length === 0) return { ok: false, error: "O dia não tem folha de ponto assinada (PDF ou imagem) anexada." };
  const equipe = await getEquipeDoProjeto(ctx.tenant.id, dia.projectId);
  try {
    const paraLeitura = await Promise.all(legiveis.map(async (d) => ({ bytes: await getObjectBytes(d.storageKey), mime: d.contentType ?? "application/pdf", filename: d.filename })));
    const lido = await comUsoDeIa({ tenantId: ctx.tenant.id, userId: ctx.userId, operacao: "folha" }, () => lerFolhaDePontoComIA(paraLeitura));
    const r = casarNomesComEquipe(lido.linhas.map((l) => ({ nome: l.nome, quantidade: l.quantidade })), equipe);
    await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "equipe.ia.folha_ponto", entity: "equipe_dia", entityId: dia.id, meta: { data: dia.data, documentos: legiveis.length, casados: r.casados.length, semPar: r.semPar.length } });
    return { ok: true, data: dia.data, casados: r.casados, semPar: r.semPar, observacoes: lido.observacoes };
  } catch (e) {
    console.error("[equipes] falha na leitura da folha de ponto:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao ler a folha de ponto." };
  }
}
