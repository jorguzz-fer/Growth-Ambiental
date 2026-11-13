"use server";

import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext, type TenantContext } from "@/lib/context";
import { can, type PermAction } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { ymd } from "@/lib/utils";
import { isR2Configured, putObject } from "@/lib/storage/r2";
import { LIMITE_UPLOAD_BYTES, LIMITE_UPLOAD_MB } from "@/lib/clientes-regras";
import { inserirModelo } from "@/lib/plano-biblioteca";
import {
  dataValida,
  ehStatusEntrega,
  ehStatusItem,
  filtrarSelecao,
  linhaDeBase,
  MODELOS_SUGERIDOS,
  recusaDaSelecao,
  recusaDeHierarquia,
  notaDaCris,
  type FaseSelecionada,
  type OrigemProposta,
} from "@/lib/plano-regras";

/**
 * Planejamento de projetos — ações do servidor. Sessão → permissão → o
 * registro é da empresa e do projeto (nunca confia no id da tela) →
 * validação → gravação → auditoria. Biblioteca/modelos e plano do projeto são
 * independentes: nada aqui altera um a partir do outro, exceto COPIAR uma
 * sugestão para o plano no momento da escolha.
 */
export type Resultado = { ok: true; id?: string; aviso?: string } | { ok: false; error: string };
type Exec = Pick<typeof db, "select" | "insert" | "update" | "delete">;

const SEM_SESSAO = "Sessão expirada. Entre de novo.";
const falha = (error: string): Resultado => ({ ok: false, error });
const txt = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (v == null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : NaN);
const quem = (ctx: TenantContext) => ctx.userEmail || ctx.userId || null;
function data(v: unknown, rotulo: string): { ok: true; v: string | null } | { ok: false; error: string } {
  const s = txt(v);
  if (!s) return { ok: true, v: null };
  return dataValida(s) ? { ok: true, v: s } : { ok: false, error: `${rotulo}: data inválida.` };
}

async function sessao(tela: string, acao: PermAction, msg: string): Promise<{ ctx: TenantContext } | { error: string }> {
  const ctx = await getTenantContext();
  if (!ctx) return { error: SEM_SESSAO };
  if (!can(ctx.perms, tela, acao)) return { error: msg };
  return { ctx };
}
const revalidarPlano = () => revalidatePath("/plano");
const revalidarModelos = () => revalidatePath("/modelos");

// ═════════════════════════════ Biblioteca e modelos ═════════════════════════════

async function modeloDaEmpresa(tenantId: string, id: string, exec: Exec = db) {
  const [m] = await exec.select().from(schema.planoModelos).where(and(eq(schema.planoModelos.id, id), eq(schema.planoModelos.tenantId, tenantId))).limit(1);
  return m ?? null;
}
async function faseDeModeloDaEmpresa(tenantId: string, id: string, exec: Exec = db) {
  const [f] = await exec.select().from(schema.planoModeloFases).where(and(eq(schema.planoModeloFases.id, id), eq(schema.planoModeloFases.tenantId, tenantId))).limit(1);
  return f ?? null;
}

export async function salvarModelo(input: { id?: string | null; nome: string; descricao?: string | null; modalidadeId?: string | null; ativo?: boolean }): Promise<Resultado> {
  const s = await sessao("modelos", input.id ? "editar" : "criar", "Sem permissão para gerenciar modelos.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const nome = txt(input.nome);
  if (!nome) return falha("Informe o nome do modelo.");
  const modalidadeId = txt(input.modalidadeId);
  if (modalidadeId) {
    const [m] = await db.select({ id: schema.contratoModalidades.id }).from(schema.contratoModalidades).where(and(eq(schema.contratoModalidades.id, modalidadeId), eq(schema.contratoModalidades.tenantId, ctx.tenant.id))).limit(1);
    if (!m) return falha("Modalidade não encontrada.");
  }
  if (input.id) {
    const m = await modeloDaEmpresa(ctx.tenant.id, input.id);
    if (!m) return falha("Modelo não encontrado.");
    if (m.biblioteca && input.ativo === false) return falha("A biblioteca padrão não se desativa (desative as fases que não quiser sugerir).");
    await db.update(schema.planoModelos).set({ nome, descricao: txt(input.descricao), modalidadeId, ativo: input.ativo ?? m.ativo }).where(eq(schema.planoModelos.id, m.id));
    await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "modelo.update", entity: "plano_modelo", entityId: m.id, meta: { de: { nome: m.nome, ativo: m.ativo }, para: { nome, ativo: input.ativo ?? m.ativo } } });
    revalidarModelos();
    return { ok: true, id: m.id };
  }
  const [{ ordem }] = await db.select({ ordem: max(schema.planoModelos.ordem) }).from(schema.planoModelos).where(eq(schema.planoModelos.tenantId, ctx.tenant.id));
  const [novo] = await db.insert(schema.planoModelos).values({ tenantId: ctx.tenant.id, nome, descricao: txt(input.descricao), modalidadeId, ordem: (ordem ?? 0) + 1, createdBy: quem(ctx) }).returning({ id: schema.planoModelos.id });
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "modelo.create", entity: "plano_modelo", entityId: novo.id, meta: { nome } });
  revalidarModelos();
  return { ok: true, id: novo.id };
}

/** Adiciona à empresa um dos modelos sugeridos por modalidade (cópia editável). */
export async function adicionarModeloSugerido(chave: string): Promise<Resultado> {
  const s = await sessao("modelos", "criar", "Sem permissão para gerenciar modelos.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const sug = MODELOS_SUGERIDOS.find((m) => m.chave === chave);
  if (!sug) return falha("Modelo sugerido não encontrado.");
  const [mod] = await db.select({ id: schema.contratoModalidades.id }).from(schema.contratoModalidades).where(and(eq(schema.contratoModalidades.tenantId, ctx.tenant.id), eq(schema.contratoModalidades.nome, sug.modalidade))).limit(1);
  const id = await db.transaction(async (tx) => {
    const [{ ordem }] = await tx.select({ ordem: max(schema.planoModelos.ordem) }).from(schema.planoModelos).where(eq(schema.planoModelos.tenantId, ctx.tenant.id));
    const novo = await inserirModelo(tx, ctx.tenant.id, { nome: sug.nome, modalidadeId: mod?.id ?? null, ordem: (ordem ?? 0) + 1, createdBy: quem(ctx) }, sug.fases);
    await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "modelo.create", entity: "plano_modelo", entityId: novo, meta: { nome: sug.nome, sugerido: chave } }, tx);
    return novo;
  });
  revalidarModelos();
  return { ok: true, id };
}

/** Duplica um modelo inteiro (fases, atividades, subatividades e entregas). */
export async function duplicarModelo(id: string): Promise<Resultado> {
  const s = await sessao("modelos", "criar", "Sem permissão para gerenciar modelos.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const m = await modeloDaEmpresa(ctx.tenant.id, id);
  if (!m) return falha("Modelo não encontrado.");
  const novoId = await db.transaction(async (tx) => {
    const [{ ordem }] = await tx.select({ ordem: max(schema.planoModelos.ordem) }).from(schema.planoModelos).where(eq(schema.planoModelos.tenantId, ctx.tenant.id));
    const [novo] = await tx.insert(schema.planoModelos).values({ tenantId: ctx.tenant.id, nome: `${m.nome} (cópia)`, descricao: m.descricao, modalidadeId: m.modalidadeId, ordem: (ordem ?? 0) + 1, createdBy: quem(ctx) }).returning({ id: schema.planoModelos.id });
    const fases = await tx.select().from(schema.planoModeloFases).where(eq(schema.planoModeloFases.modeloId, m.id)).orderBy(asc(schema.planoModeloFases.ordem));
    for (const f of fases) await copiarFaseDeModelo(tx, ctx.tenant.id, f, novo.id, f.nome, f.ordem);
    await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "modelo.duplicar", entity: "plano_modelo", entityId: novo.id, meta: { de: m.id, nome: m.nome } }, tx);
    return novo.id;
  });
  revalidarModelos();
  return { ok: true, id: novoId };
}

async function copiarFaseDeModelo(tx: Exec, tenantId: string, f: typeof schema.planoModeloFases.$inferSelect, modeloId: string, nome: string, ordem: number) {
  const [nf] = await tx.insert(schema.planoModeloFases).values({ tenantId, modeloId, nome, descricao: f.descricao, ordem, ativo: f.ativo, sugerida: f.sugerida }).returning({ id: schema.planoModeloFases.id });
  const ats = await tx.select().from(schema.planoModeloAtividades).where(eq(schema.planoModeloAtividades.faseId, f.id)).orderBy(asc(schema.planoModeloAtividades.ordem));
  const mapa = new Map<string, string>();
  for (const a of ats.filter((x) => !x.parentId)) {
    const [na] = await tx.insert(schema.planoModeloAtividades).values({ tenantId, faseId: nf.id, tipo: a.tipo, nome: a.nome, descricao: a.descricao, ordem: a.ordem, ativo: a.ativo, sugerida: a.sugerida }).returning({ id: schema.planoModeloAtividades.id });
    mapa.set(a.id, na.id);
  }
  for (const a of ats.filter((x) => x.parentId && mapa.has(x.parentId)))
    await tx.insert(schema.planoModeloAtividades).values({ tenantId, faseId: nf.id, parentId: mapa.get(a.parentId!)!, tipo: a.tipo, nome: a.nome, descricao: a.descricao, ordem: a.ordem, ativo: a.ativo, sugerida: a.sugerida });
  return nf.id;
}

/**
 * Exclui um modelo. Projetos que usaram as sugestões NÃO são afetados: o
 * plano guarda a cópia do texto, e a origem vira nula (ON DELETE SET NULL).
 */
export async function excluirModelo(id: string): Promise<Resultado> {
  const s = await sessao("modelos", "excluir", "Sem permissão para excluir modelos.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const m = await modeloDaEmpresa(ctx.tenant.id, id);
  if (!m) return falha("Modelo não encontrado.");
  if (m.biblioteca) return falha("A biblioteca padrão não se exclui: desative as sugestões que não quiser.");
  await db.delete(schema.planoModelos).where(eq(schema.planoModelos.id, m.id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "modelo.delete", entity: "plano_modelo", entityId: m.id, meta: { nome: m.nome } });
  revalidarModelos();
  return { ok: true, id: m.id };
}

export async function salvarFaseDeModelo(input: { id?: string | null; modeloId: string; nome: string; descricao?: string | null; ativo?: boolean; sugerida?: boolean }): Promise<Resultado> {
  const s = await sessao("modelos", input.id ? "editar" : "criar", "Sem permissão para gerenciar modelos.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const nome = txt(input.nome);
  if (!nome) return falha("Informe o nome da fase.");
  const m = await modeloDaEmpresa(ctx.tenant.id, input.modeloId);
  if (!m) return falha("Modelo não encontrado.");
  if (input.id) {
    const f = await faseDeModeloDaEmpresa(ctx.tenant.id, input.id);
    if (!f || f.modeloId !== m.id) return falha("Fase não encontrada.");
    await db.update(schema.planoModeloFases).set({ nome, descricao: txt(input.descricao), ativo: input.ativo ?? f.ativo, sugerida: input.sugerida ?? f.sugerida }).where(eq(schema.planoModeloFases.id, f.id));
    await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "modelo.fase.update", entity: "plano_modelo_fase", entityId: f.id, meta: { modelo: m.nome, de: { nome: f.nome, ativo: f.ativo, sugerida: f.sugerida }, para: { nome, ativo: input.ativo ?? f.ativo, sugerida: input.sugerida ?? f.sugerida } } });
    revalidarModelos();
    return { ok: true, id: f.id };
  }
  const [{ ordem }] = await db.select({ ordem: max(schema.planoModeloFases.ordem) }).from(schema.planoModeloFases).where(eq(schema.planoModeloFases.modeloId, m.id));
  const [f] = await db.insert(schema.planoModeloFases).values({ tenantId: ctx.tenant.id, modeloId: m.id, nome, descricao: txt(input.descricao), ordem: (ordem ?? 0) + 1, sugerida: input.sugerida ?? true }).returning({ id: schema.planoModeloFases.id });
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "modelo.fase.create", entity: "plano_modelo_fase", entityId: f.id, meta: { modelo: m.nome, nome } });
  revalidarModelos();
  return { ok: true, id: f.id };
}

export async function duplicarFaseDeModelo(id: string): Promise<Resultado> {
  const s = await sessao("modelos", "criar", "Sem permissão para gerenciar modelos.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const f = await faseDeModeloDaEmpresa(ctx.tenant.id, id);
  if (!f) return falha("Fase não encontrada.");
  const novo = await db.transaction(async (tx) => {
    const [{ ordem }] = await tx.select({ ordem: max(schema.planoModeloFases.ordem) }).from(schema.planoModeloFases).where(eq(schema.planoModeloFases.modeloId, f.modeloId));
    return copiarFaseDeModelo(tx, ctx.tenant.id, f, f.modeloId, `${f.nome} (cópia)`, (ordem ?? 0) + 1);
  });
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "modelo.fase.duplicar", entity: "plano_modelo_fase", entityId: novo, meta: { de: f.id, nome: f.nome } });
  revalidarModelos();
  return { ok: true, id: novo };
}

export async function excluirFaseDeModelo(id: string): Promise<Resultado> {
  const s = await sessao("modelos", "excluir", "Sem permissão para gerenciar modelos.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const f = await faseDeModeloDaEmpresa(ctx.tenant.id, id);
  if (!f) return falha("Fase não encontrada.");
  await db.delete(schema.planoModeloFases).where(eq(schema.planoModeloFases.id, f.id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "modelo.fase.delete", entity: "plano_modelo_fase", entityId: f.id, meta: { nome: f.nome } });
  revalidarModelos();
  return { ok: true, id: f.id };
}

export async function salvarAtividadeDeModelo(input: { id?: string | null; faseId: string; parentId?: string | null; tipo?: string; nome: string; descricao?: string | null; ativo?: boolean; sugerida?: boolean }): Promise<Resultado> {
  const s = await sessao("modelos", input.id ? "editar" : "criar", "Sem permissão para gerenciar modelos.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const nome = txt(input.nome);
  if (!nome) return falha("Informe o nome.");
  const tipo = input.tipo === "entrega" ? "entrega" : "atividade";
  const f = await faseDeModeloDaEmpresa(ctx.tenant.id, input.faseId);
  if (!f) return falha("Fase não encontrada.");
  const parentId = txt(input.parentId);
  if (parentId) {
    const [p] = await db.select().from(schema.planoModeloAtividades).where(and(eq(schema.planoModeloAtividades.id, parentId), eq(schema.planoModeloAtividades.tenantId, ctx.tenant.id))).limit(1);
    if (!p || p.faseId !== f.id || p.parentId || p.id === input.id) return falha("Atividade superior inválida.");
  }
  if (input.id) {
    const [a] = await db.select().from(schema.planoModeloAtividades).where(and(eq(schema.planoModeloAtividades.id, input.id), eq(schema.planoModeloAtividades.tenantId, ctx.tenant.id))).limit(1);
    if (!a || a.faseId !== f.id) return falha("Atividade não encontrada.");
    await db.update(schema.planoModeloAtividades).set({ nome, descricao: txt(input.descricao), tipo, parentId, ativo: input.ativo ?? a.ativo, sugerida: input.sugerida ?? a.sugerida }).where(eq(schema.planoModeloAtividades.id, a.id));
    await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "modelo.atividade.update", entity: "plano_modelo_atividade", entityId: a.id, meta: { de: { nome: a.nome, ativo: a.ativo }, para: { nome, ativo: input.ativo ?? a.ativo } } });
    revalidarModelos();
    return { ok: true, id: a.id };
  }
  const [{ ordem }] = await db.select({ ordem: max(schema.planoModeloAtividades.ordem) }).from(schema.planoModeloAtividades).where(eq(schema.planoModeloAtividades.faseId, f.id));
  const [a] = await db.insert(schema.planoModeloAtividades).values({ tenantId: ctx.tenant.id, faseId: f.id, parentId, tipo, nome, descricao: txt(input.descricao), ordem: (ordem ?? 0) + 1, sugerida: input.sugerida ?? true }).returning({ id: schema.planoModeloAtividades.id });
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "modelo.atividade.create", entity: "plano_modelo_atividade", entityId: a.id, meta: { fase: f.nome, nome, tipo } });
  revalidarModelos();
  return { ok: true, id: a.id };
}

export async function excluirAtividadeDeModelo(id: string): Promise<Resultado> {
  const s = await sessao("modelos", "excluir", "Sem permissão para gerenciar modelos.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const [a] = await db.select().from(schema.planoModeloAtividades).where(and(eq(schema.planoModeloAtividades.id, id), eq(schema.planoModeloAtividades.tenantId, ctx.tenant.id))).limit(1);
  if (!a) return falha("Atividade não encontrada.");
  await db.delete(schema.planoModeloAtividades).where(eq(schema.planoModeloAtividades.id, a.id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "modelo.atividade.delete", entity: "plano_modelo_atividade", entityId: a.id, meta: { nome: a.nome } });
  revalidarModelos();
  return { ok: true, id: a.id };
}

/** Move uma fase ou atividade de modelo para cima/baixo (troca a ordem com a vizinha). */
export async function moverNoModelo(input: { tipo: "fase" | "atividade"; id: string; direcao: "cima" | "baixo" }): Promise<Resultado> {
  const s = await sessao("modelos", "editar", "Sem permissão para gerenciar modelos.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const r = await db.transaction(async (tx) => {
    if (input.tipo === "fase") {
      const f = await faseDeModeloDaEmpresa(ctx.tenant.id, input.id, tx);
      if (!f) return null;
      const irmas = await tx.select().from(schema.planoModeloFases).where(eq(schema.planoModeloFases.modeloId, f.modeloId)).orderBy(asc(schema.planoModeloFases.ordem));
      await trocar(tx, irmas, f.id, input.direcao, (id, ordem) => tx.update(schema.planoModeloFases).set({ ordem }).where(eq(schema.planoModeloFases.id, id)));
      return f.id;
    }
    const [a] = await tx.select().from(schema.planoModeloAtividades).where(and(eq(schema.planoModeloAtividades.id, input.id), eq(schema.planoModeloAtividades.tenantId, ctx.tenant.id))).limit(1);
    if (!a) return null;
    const irmas = (await tx.select().from(schema.planoModeloAtividades).where(eq(schema.planoModeloAtividades.faseId, a.faseId)).orderBy(asc(schema.planoModeloAtividades.ordem))).filter((x) => (x.parentId ?? null) === (a.parentId ?? null) && x.tipo === a.tipo);
    await trocar(tx, irmas, a.id, input.direcao, (id, ordem) => tx.update(schema.planoModeloAtividades).set({ ordem }).where(eq(schema.planoModeloAtividades.id, id)));
    return a.id;
  });
  if (!r) return falha("Item não encontrado.");
  revalidarModelos();
  return { ok: true, id: r };
}

/** Renumera a lista (1..n) com o item trocado de lugar com o vizinho. */
async function trocar<T extends { id: string }>(_tx: Exec, lista: T[], id: string, dir: "cima" | "baixo", gravar: (id: string, ordem: number) => Promise<unknown>) {
  const i = lista.findIndex((x) => x.id === id);
  const j = dir === "cima" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= lista.length) return;
  const nova = [...lista];
  [nova[i], nova[j]] = [nova[j], nova[i]];
  for (const [k, x] of nova.entries()) await gravar(x.id, k + 1);
}

// ═════════════════════════════ Plano de trabalho do projeto ═════════════════════════════

function projetoDaSessao(ctx: TenantContext, projectId: string) {
  return ctx.projects.find((p) => p.id === projectId) ?? null;
}
async function faseDoPlano(tenantId: string, id: string, exec: Exec = db) {
  const [f] = await exec.select().from(schema.projetoFases).where(and(eq(schema.projetoFases.id, id), eq(schema.projetoFases.tenantId, tenantId))).limit(1);
  return f ?? null;
}
async function atividadeDoPlano(tenantId: string, id: string, exec: Exec = db) {
  const [a] = await exec.select().from(schema.projetoAtividades).where(and(eq(schema.projetoAtividades.id, id), eq(schema.projetoAtividades.tenantId, tenantId))).limit(1);
  return a ?? null;
}

/**
 * Cria o plano (ou acrescenta ao existente) a partir da seleção — em branco,
 * da biblioteca/modelos ou da proposta conferida da Cris. Grava SÓ o que está
 * marcado, como cópia editável. Idempotente pela chave da tela: a mesma
 * confirmação enviada duas vezes grava uma vez.
 */
export async function criarPlano(input: { projectId: string; origem: "branco" | "biblioteca" | "cris"; chave: string; fases: FaseSelecionada[] }): Promise<Resultado> {
  const s = await sessao("plano", "criar", "Sem permissão para criar o plano de trabalho.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const projeto = projetoDaSessao(ctx, input.projectId);
  if (!projeto) return falha("Projeto não encontrado.");
  if (!["branco", "biblioteca", "cris"].includes(input.origem)) return falha("Origem inválida.");
  const chave = txt(input.chave);
  if (!chave) return falha("Chave da operação ausente.");
  const fases = filtrarSelecao(input.fases ?? []);
  const r = recusaDaSelecao(fases);
  if (r) return falha(r);

  // Só aceita como "origem" ids de modelo DESTA empresa (o resto vira nulo).
  const idsFase = fases.map((f) => f.origemModeloId).filter((x): x is string => !!x);
  const idsAtiv = fases.flatMap((f) => [...f.atividades.flatMap((a) => [a.origemModeloId, ...a.subatividades.map((x) => x.origemModeloId)]), ...f.entregas.map((e) => e.origemModeloId)]).filter((x): x is string => !!x);
  const fasesOk = new Set(idsFase.length ? (await db.select({ id: schema.planoModeloFases.id }).from(schema.planoModeloFases).where(and(eq(schema.planoModeloFases.tenantId, tenantId), inArray(schema.planoModeloFases.id, idsFase)))).map((x) => x.id) : []);
  const ativOk = new Set(idsAtiv.length ? (await db.select({ id: schema.planoModeloAtividades.id }).from(schema.planoModeloAtividades).where(and(eq(schema.planoModeloAtividades.tenantId, tenantId), inArray(schema.planoModeloAtividades.id, idsAtiv)))).map((x) => x.id) : []);
  const origemFase = (id?: string | null) => (id && fasesOk.has(id) ? id : null);
  const origemAtiv = (id?: string | null) => (id && ativOk.has(id) ? id : null);

  const contagem = { fases: fases.length, atividades: 0, subatividades: 0, entregas: 0 };
  const res = await db.transaction(async (tx) => {
    const [imp] = await tx
      .insert(schema.projetoPlanoImportacoes)
      .values({ tenantId, projectId: projeto.id, chave, origem: input.origem, createdBy: quem(ctx) })
      .onConflictDoNothing()
      .returning({ id: schema.projetoPlanoImportacoes.id });
    if (!imp) return { repetida: true as const };
    const [{ ordem }] = await tx.select({ ordem: max(schema.projetoFases.ordem) }).from(schema.projetoFases).where(eq(schema.projetoFases.projectId, projeto.id));
    let ordemFase = ordem ?? 0;
    const nota = (no: { origem?: OrigemProposta; trecho?: string | null }) => (input.origem === "cris" ? notaDaCris(no) : null);
    for (const f of fases) {
      ordemFase++;
      const [fase] = await tx
        .insert(schema.projetoFases)
        .values({ tenantId, projectId: projeto.id, nome: f.nome, descricao: f.descricao ?? null, ordem: ordemFase, responsavel: f.responsavel ?? null, inicioPrevisto: f.inicio ?? null, terminoPrevisto: f.termino ?? null, inicioOriginal: f.inicio ?? null, terminoOriginal: f.termino ?? null, obs: nota(f), origemModeloFaseId: origemFase(f.origemModeloId) })
        .returning({ id: schema.projetoFases.id });
      for (const [i, a] of f.atividades.entries()) {
        const [at] = await tx
          .insert(schema.projetoAtividades)
          .values({ tenantId, projectId: projeto.id, faseId: fase.id, nome: a.nome, descricao: a.descricao ?? null, ordem: i + 1, responsavel: a.responsavel ?? null, inicioPrevisto: a.inicio ?? null, terminoPrevisto: a.termino ?? null, inicioOriginal: a.inicio ?? null, terminoOriginal: a.termino ?? null, obs: nota(a), origemModeloAtividadeId: origemAtiv(a.origemModeloId) })
          .returning({ id: schema.projetoAtividades.id });
        contagem.atividades++;
        for (const [j, sAt] of a.subatividades.entries()) {
          await tx.insert(schema.projetoAtividades).values({ tenantId, projectId: projeto.id, faseId: fase.id, parentId: at.id, nome: sAt.nome, descricao: sAt.descricao ?? null, ordem: j + 1, obs: nota(sAt), origemModeloAtividadeId: origemAtiv(sAt.origemModeloId) });
          contagem.subatividades++;
        }
      }
      for (const [i, e] of f.entregas.entries()) {
        await tx.insert(schema.projetoEntregas).values({ tenantId, projectId: projeto.id, faseId: fase.id, nome: e.nome, descricao: [e.descricao, nota(e)].filter(Boolean).join(" — ") || null, dataPrevista: (e as { data?: string | null }).data ?? null, dataOriginal: (e as { data?: string | null }).data ?? null, ordem: i + 1 });
        contagem.entregas++;
      }
    }
    await tx.update(schema.projetoPlanoImportacoes).set({ resumo: contagem }).where(eq(schema.projetoPlanoImportacoes.id, imp.id));
    await logAudit({ tenantId, userId: ctx.userId, action: "plano.criar", entity: "projeto_plano", entityId: projeto.id, meta: { projectId: projeto.id, origem: input.origem, ...contagem } }, tx);
    return { repetida: false as const };
  });
  revalidarPlano();
  if (res.repetida) return { ok: true, id: projeto.id, aviso: "Esta confirmação já tinha sido gravada: nada foi duplicado." };
  return { ok: true, id: projeto.id };
}

export interface DadosDaFase {
  id?: string | null;
  projectId: string;
  codigo?: string | null;
  nome: string;
  descricao?: string | null;
  responsavel?: string | null;
  inicioPrevisto?: string | null;
  terminoPrevisto?: string | null;
  inicioReal?: string | null;
  terminoReal?: string | null;
  status?: string | null;
  percentual?: number | string | null;
  peso?: number | string | null;
  obs?: string | null;
  /** motivo da reprogramação (quando muda data planejada já com linha de base). */
  justificativa?: string | null;
}

/** Diferença campo a campo, para o histórico. */
function diferencas(antes: Record<string, unknown>, depois: Record<string, unknown>) {
  const out: Record<string, { de: unknown; para: unknown }> = {};
  for (const [k, v] of Object.entries(depois)) if (String(antes[k] ?? "") !== String(v ?? "")) out[k] = { de: antes[k] ?? null, para: v ?? null };
  return out;
}

function camposComuns(input: { nome: string; descricao?: string | null; responsavel?: string | null; status?: string | null; percentual?: number | string | null; peso?: number | string | null; obs?: string | null; codigo?: string | null }) {
  const nome = txt(input.nome);
  if (!nome) return { erro: "Informe o nome." } as const;
  const status = txt(input.status) ?? "planejada";
  if (!ehStatusItem(status)) return { erro: "Situação inválida." } as const;
  const pct = num(input.percentual);
  if (pct != null && (Number.isNaN(pct) || pct < 0 || pct > 100)) return { erro: "Percentual entre 0 e 100." } as const;
  const peso = num(input.peso);
  if (peso != null && (Number.isNaN(peso) || peso < 0)) return { erro: "Peso não pode ser negativo." } as const;
  return { campos: { nome, codigo: txt(input.codigo), descricao: txt(input.descricao), responsavel: txt(input.responsavel), status, percentual: pct == null ? null : String(pct), peso: peso == null ? null : String(peso), obs: txt(input.obs) } } as const;
}
function datasDoItem(input: { inicioPrevisto?: string | null; terminoPrevisto?: string | null; inicioReal?: string | null; terminoReal?: string | null }) {
  const d: Record<string, string | null> = {};
  for (const [k, rot] of [["inicioPrevisto", "Início planejado"], ["terminoPrevisto", "Término planejado"], ["inicioReal", "Início real"], ["terminoReal", "Conclusão real"]] as const) {
    const r = data(input[k], rot);
    if (!r.ok) return { erro: r.error } as const;
    d[k] = r.v;
  }
  if (d.inicioPrevisto && d.terminoPrevisto && ymd(d.terminoPrevisto)! < ymd(d.inicioPrevisto)!) return { erro: "O término planejado não pode ser antes do início." } as const;
  return { datas: d } as const;
}

/** Cria/edita uma fase. Nada é obrigatório além do nome; datas mudadas depois da linha de base viram reprogramação. */
export async function salvarFase(input: DadosDaFase): Promise<Resultado> {
  const s = await sessao("plano", input.id ? "editar" : "criar", "Sem permissão para editar o plano de trabalho.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const projeto = projetoDaSessao(ctx, input.projectId);
  if (!projeto) return falha("Projeto não encontrado.");
  const c = camposComuns(input);
  if ("erro" in c) return falha(c.erro!);
  const d = datasDoItem(input);
  if ("erro" in d) return falha(d.erro!);
  if (!input.id) {
    const [{ ordem }] = await db.select({ ordem: max(schema.projetoFases.ordem) }).from(schema.projetoFases).where(eq(schema.projetoFases.projectId, projeto.id));
    const [f] = await db
      .insert(schema.projetoFases)
      .values({ tenantId, projectId: projeto.id, ...c.campos, ...d.datas, inicioOriginal: d.datas.inicioPrevisto, terminoOriginal: d.datas.terminoPrevisto, ordem: (ordem ?? 0) + 1 })
      .returning({ id: schema.projetoFases.id });
    await logAudit({ tenantId, userId: ctx.userId, action: "plano.fase.create", entity: "projeto_fase", entityId: f.id, meta: { projectId: projeto.id, nome: c.campos.nome } });
    revalidarPlano();
    return { ok: true, id: f.id };
  }
  const f = await faseDoPlano(tenantId, input.id);
  if (!f || f.projectId !== projeto.id) return falha("Fase não encontrada.");
  const bi = linhaDeBase(f.inicioOriginal, f.inicioPrevisto, d.datas.inicioPrevisto);
  const bt = linhaDeBase(f.terminoOriginal, f.terminoPrevisto, d.datas.terminoPrevisto);
  const depois = { ...c.campos, ...d.datas, inicioOriginal: bi.original, terminoOriginal: bt.original };
  const mudou = diferencas(f as unknown as Record<string, unknown>, depois);
  await db.update(schema.projetoFases).set({ ...depois, updatedAt: new Date() }).where(eq(schema.projetoFases.id, f.id));
  const reprogramou = bi.reprogramou || bt.reprogramou;
  if (Object.keys(mudou).length)
    await logAudit({ tenantId, userId: ctx.userId, action: reprogramou ? "plano.fase.reprogramar" : "plano.fase.update", entity: "projeto_fase", entityId: f.id, meta: { projectId: projeto.id, nome: c.campos.nome, mudou, justificativa: txt(input.justificativa) } });
  revalidarPlano();
  return { ok: true, id: f.id };
}

export interface DadosDaAtividade extends Omit<DadosDaFase, "projectId"> {
  faseId: string;
  parentId?: string | null;
  funcionarioId?: string | null;
  funcaoId?: string | null;
  horasPrevistas?: number | string | null;
  horasRealizadas?: number | string | null;
  contratoItemId?: string | null;
}

async function validarVinculosDaAtividade(tx: Exec, tenantId: string, projectId: string, input: DadosDaAtividade): Promise<string | null> {
  const funcionarioId = txt(input.funcionarioId);
  if (funcionarioId) {
    const [f] = await tx.select({ id: schema.funcionarios.id }).from(schema.funcionarios).where(and(eq(schema.funcionarios.id, funcionarioId), eq(schema.funcionarios.tenantId, tenantId))).limit(1);
    if (!f) return "Profissional não encontrado.";
  }
  const funcaoId = txt(input.funcaoId);
  if (funcaoId) {
    const [f] = await tx.select({ id: schema.funcoesEquipe.id }).from(schema.funcoesEquipe).where(and(eq(schema.funcoesEquipe.id, funcaoId), eq(schema.funcoesEquipe.tenantId, tenantId))).limit(1);
    if (!f) return "Função não encontrada.";
  }
  const itemId = txt(input.contratoItemId);
  if (itemId && !(await itemDeContratoDoProjeto(tx, tenantId, projectId, itemId))) return "O item contratual precisa ser de um contrato vinculado a este projeto.";
  for (const [k, rot] of [["horasPrevistas", "Horas previstas"], ["horasRealizadas", "Horas realizadas"]] as const) {
    const h = num(input[k]);
    if (h != null && (Number.isNaN(h) || h < 0)) return `${rot}: valor inválido.`;
  }
  return null;
}
async function itemDeContratoDoProjeto(tx: Exec, tenantId: string, projectId: string, itemId: string) {
  const [r] = await tx
    .select({ id: schema.contratoItens.id, contratoId: schema.contratoItens.contratoId })
    .from(schema.contratoItens)
    .innerJoin(schema.contratoProjetos, eq(schema.contratoProjetos.contratoId, schema.contratoItens.contratoId))
    .where(and(eq(schema.contratoItens.id, itemId), eq(schema.contratoItens.tenantId, tenantId), eq(schema.contratoProjetos.projectId, projectId)))
    .limit(1);
  return r ?? null;
}

/** Cria/edita atividade ou subatividade (`parentId`). Recusa hierarquia inválida e vínculos de fora. */
export async function salvarAtividade(input: DadosDaAtividade): Promise<Resultado> {
  const s = await sessao("plano", input.id ? "editar" : "criar", "Sem permissão para editar o plano de trabalho.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const c = camposComuns(input);
  if ("erro" in c) return falha(c.erro!);
  const d = datasDoItem(input);
  if ("erro" in d) return falha(d.erro!);
  return db.transaction(async (tx) => {
    const fase = await faseDoPlano(tenantId, input.faseId, tx);
    if (!fase || !projetoDaSessao(ctx, fase.projectId)) return falha("Fase não encontrada.");
    const atual = input.id ? await atividadeDoPlano(tenantId, input.id, tx) : null;
    if (input.id && (!atual || atual.projectId !== fase.projectId)) return falha("Atividade não encontrada.");
    const parentId = txt(input.parentId);
    const parent = parentId ? await atividadeDoPlano(tenantId, parentId, tx) : null;
    if (parentId && !parent) return falha("Atividade superior não encontrada.");
    let temFilhos = false;
    if (atual && parent) {
      const [f] = await tx.select({ id: schema.projetoAtividades.id }).from(schema.projetoAtividades).where(eq(schema.projetoAtividades.parentId, atual.id)).limit(1);
      temFilhos = !!f;
    }
    const rh = recusaDeHierarquia({ id: atual?.id, faseId: fase.id, projectId: fase.projectId }, parent, temFilhos);
    if (rh) return falha(rh);
    const rv = await validarVinculosDaAtividade(tx, tenantId, fase.projectId, input);
    if (rv) return falha(rv);
    const vinculos = {
      funcionarioId: txt(input.funcionarioId),
      funcaoId: txt(input.funcaoId),
      horasPrevistas: num(input.horasPrevistas) == null ? null : String(num(input.horasPrevistas)),
      horasRealizadas: num(input.horasRealizadas) == null ? null : String(num(input.horasRealizadas)),
      contratoItemId: txt(input.contratoItemId),
    };
    if (!atual) {
      const [{ ordem }] = await tx.select({ ordem: max(schema.projetoAtividades.ordem) }).from(schema.projetoAtividades).where(and(eq(schema.projetoAtividades.faseId, fase.id), parentId ? eq(schema.projetoAtividades.parentId, parentId) : isNull(schema.projetoAtividades.parentId)));
      const [a] = await tx
        .insert(schema.projetoAtividades)
        .values({ tenantId, projectId: fase.projectId, faseId: fase.id, parentId, ...c.campos, ...d.datas, ...vinculos, inicioOriginal: d.datas.inicioPrevisto, terminoOriginal: d.datas.terminoPrevisto, ordem: (ordem ?? 0) + 1 })
        .returning({ id: schema.projetoAtividades.id });
      await logAudit({ tenantId, userId: ctx.userId, action: parentId ? "plano.subatividade.create" : "plano.atividade.create", entity: "projeto_atividade", entityId: a.id, meta: { projectId: fase.projectId, fase: fase.nome, nome: c.campos.nome } }, tx);
      revalidarPlano();
      return { ok: true as const, id: a.id };
    }
    const bi = linhaDeBase(atual.inicioOriginal, atual.inicioPrevisto, d.datas.inicioPrevisto);
    const bt = linhaDeBase(atual.terminoOriginal, atual.terminoPrevisto, d.datas.terminoPrevisto);
    const depois = { ...c.campos, ...d.datas, ...vinculos, parentId, inicioOriginal: bi.original, terminoOriginal: bt.original };
    const mudou = diferencas(atual as unknown as Record<string, unknown>, depois);
    await tx.update(schema.projetoAtividades).set({ ...depois, updatedAt: new Date() }).where(eq(schema.projetoAtividades.id, atual.id));
    if (Object.keys(mudou).length)
      await logAudit({ tenantId, userId: ctx.userId, action: bi.reprogramou || bt.reprogramou ? "plano.atividade.reprogramar" : "plano.atividade.update", entity: "projeto_atividade", entityId: atual.id, meta: { projectId: fase.projectId, nome: c.campos.nome, mudou, justificativa: txt(input.justificativa) } }, tx);
    revalidarPlano();
    return { ok: true as const, id: atual.id };
  });
}

/** Atualização rápida de andamento (situação e %), sem abrir o formulário. */
export async function atualizarAndamento(input: { tipo: "fase" | "atividade"; id: string; status?: string | null; percentual?: number | string | null; inicioReal?: string | null; terminoReal?: string | null }): Promise<Resultado> {
  const s = await sessao("plano", "editar", "Sem permissão para atualizar o andamento.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const item = input.tipo === "fase" ? await faseDoPlano(tenantId, input.id) : await atividadeDoPlano(tenantId, input.id);
  if (!item || !projetoDaSessao(ctx, item.projectId)) return falha("Item não encontrado.");
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.status !== undefined) {
    if (!ehStatusItem(input.status)) return falha("Situação inválida.");
    set.status = input.status;
  }
  if (input.percentual !== undefined) {
    const p = num(input.percentual);
    if (p != null && (Number.isNaN(p) || p < 0 || p > 100)) return falha("Percentual entre 0 e 100.");
    set.percentual = p == null ? null : String(p);
  }
  for (const k of ["inicioReal", "terminoReal"] as const)
    if (input[k] !== undefined) {
      const r = data(input[k], k === "inicioReal" ? "Início real" : "Conclusão real");
      if (!r.ok) return falha(r.error);
      set[k] = r.v;
    }
  if (set.status === "concluida" && !item.terminoReal && input.terminoReal === undefined) {
    const h = new Date();
    set.terminoReal = `${String(h.getMonth() + 1).padStart(2, "0")}/${String(h.getDate()).padStart(2, "0")}/${h.getFullYear()}`;
  }
  const tabela = input.tipo === "fase" ? schema.projetoFases : schema.projetoAtividades;
  await db.update(tabela).set(set).where(eq(tabela.id, item.id));
  const { updatedAt: _u, ...semData } = set;
  void _u;
  await logAudit({ tenantId, userId: ctx.userId, action: `plano.${input.tipo}.andamento`, entity: input.tipo === "fase" ? "projeto_fase" : "projeto_atividade", entityId: item.id, meta: { projectId: item.projectId, nome: item.nome, mudou: diferencas(item as unknown as Record<string, unknown>, semData) } });
  revalidarPlano();
  return { ok: true, id: item.id };
}

/**
 * Reorganiza: sobe/desce entre as irmãs, ou move a atividade (com as
 * subatividades) para outra fase do mesmo projeto. Não muda nada no modelo.
 */
export async function moverNoPlano(input: { tipo: "fase" | "atividade"; id: string; direcao?: "cima" | "baixo"; paraFaseId?: string | null }): Promise<Resultado> {
  const s = await sessao("plano", "editar", "Sem permissão para editar o plano de trabalho.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const r = await db.transaction(async (tx) => {
    if (input.tipo === "fase") {
      const f = await faseDoPlano(tenantId, input.id, tx);
      if (!f || !projetoDaSessao(ctx, f.projectId)) return "Fase não encontrada.";
      const irmas = await tx.select().from(schema.projetoFases).where(eq(schema.projetoFases.projectId, f.projectId)).orderBy(asc(schema.projetoFases.ordem));
      await trocar(tx, irmas, f.id, input.direcao ?? "cima", (id, ordem) => tx.update(schema.projetoFases).set({ ordem }).where(eq(schema.projetoFases.id, id)));
      return null;
    }
    const a = await atividadeDoPlano(tenantId, input.id, tx);
    if (!a || !projetoDaSessao(ctx, a.projectId)) return "Atividade não encontrada.";
    if (input.paraFaseId) {
      const destino = await faseDoPlano(tenantId, input.paraFaseId, tx);
      if (!destino || destino.projectId !== a.projectId) return "A fase de destino precisa ser do mesmo projeto.";
      if (a.parentId) return "Mova a atividade principal: a subatividade acompanha a dela.";
      const [{ ordem }] = await tx.select({ ordem: max(schema.projetoAtividades.ordem) }).from(schema.projetoAtividades).where(and(eq(schema.projetoAtividades.faseId, destino.id), isNull(schema.projetoAtividades.parentId)));
      await tx.update(schema.projetoAtividades).set({ faseId: destino.id, ordem: (ordem ?? 0) + 1, updatedAt: new Date() }).where(eq(schema.projetoAtividades.id, a.id));
      await tx.update(schema.projetoAtividades).set({ faseId: destino.id }).where(eq(schema.projetoAtividades.parentId, a.id));
      await logAudit({ tenantId, userId: ctx.userId, action: "plano.atividade.mover", entity: "projeto_atividade", entityId: a.id, meta: { projectId: a.projectId, nome: a.nome, de: a.faseId, para: destino.id } }, tx);
      return null;
    }
    const irmas = (await tx.select().from(schema.projetoAtividades).where(eq(schema.projetoAtividades.faseId, a.faseId)).orderBy(asc(schema.projetoAtividades.ordem))).filter((x) => (x.parentId ?? null) === (a.parentId ?? null));
    await trocar(tx, irmas, a.id, input.direcao ?? "cima", (id, ordem) => tx.update(schema.projetoAtividades).set({ ordem }).where(eq(schema.projetoAtividades.id, id)));
    return null;
  });
  if (r) return falha(r);
  revalidarPlano();
  return { ok: true, id: input.id };
}

/** Duplica uma atividade (e as subatividades) na mesma fase, sem datas reais nem andamento. */
export async function duplicarAtividade(id: string): Promise<Resultado> {
  const s = await sessao("plano", "criar", "Sem permissão para editar o plano de trabalho.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const a = await atividadeDoPlano(tenantId, id);
  if (!a || !projetoDaSessao(ctx, a.projectId)) return falha("Atividade não encontrada.");
  const novo = await db.transaction(async (tx) => {
    const base = (x: typeof a, extra: Record<string, unknown>) => ({
      tenantId, projectId: x.projectId, faseId: x.faseId, nome: x.nome, descricao: x.descricao, responsavel: x.responsavel, funcionarioId: x.funcionarioId, funcaoId: x.funcaoId,
      inicioPrevisto: x.inicioPrevisto, terminoPrevisto: x.terminoPrevisto, inicioOriginal: x.inicioPrevisto, terminoOriginal: x.terminoPrevisto, peso: x.peso, horasPrevistas: x.horasPrevistas, contratoItemId: x.contratoItemId, obs: x.obs, ...extra,
    });
    const [{ ordem }] = await tx.select({ ordem: max(schema.projetoAtividades.ordem) }).from(schema.projetoAtividades).where(eq(schema.projetoAtividades.faseId, a.faseId));
    const [n] = await tx.insert(schema.projetoAtividades).values(base(a, { nome: `${a.nome} (cópia)`, parentId: a.parentId, ordem: (ordem ?? 0) + 1 })).returning({ id: schema.projetoAtividades.id });
    if (!a.parentId) {
      const subs = await tx.select().from(schema.projetoAtividades).where(eq(schema.projetoAtividades.parentId, a.id)).orderBy(asc(schema.projetoAtividades.ordem));
      for (const sAt of subs) await tx.insert(schema.projetoAtividades).values(base(sAt, { parentId: n.id, ordem: sAt.ordem }));
    }
    await logAudit({ tenantId, userId: ctx.userId, action: "plano.atividade.duplicar", entity: "projeto_atividade", entityId: n.id, meta: { projectId: a.projectId, de: a.id, nome: a.nome } }, tx);
    return n.id;
  });
  revalidarPlano();
  return { ok: true, id: novo };
}

/** Exclui fase ou atividade do plano (com o que estiver dentro). Entregas ligadas ficam, sem o vínculo. */
export async function excluirDoPlano(input: { tipo: "fase" | "atividade" | "entrega"; id: string }): Promise<Resultado> {
  const s = await sessao("plano", "excluir", "Sem permissão para excluir itens do plano.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const tabela = input.tipo === "fase" ? schema.projetoFases : input.tipo === "atividade" ? schema.projetoAtividades : schema.projetoEntregas;
  const [item] = await db.select().from(tabela).where(and(eq(tabela.id, input.id), eq(tabela.tenantId, tenantId))).limit(1);
  if (!item || !projetoDaSessao(ctx, item.projectId)) return falha("Item não encontrado.");
  await db.delete(tabela).where(eq(tabela.id, item.id));
  await logAudit({ tenantId, userId: ctx.userId, action: `plano.${input.tipo}.delete`, entity: input.tipo === "fase" ? "projeto_fase" : input.tipo === "atividade" ? "projeto_atividade" : "projeto_entrega", entityId: item.id, meta: { projectId: item.projectId, nome: item.nome } });
  revalidarPlano();
  return { ok: true, id: item.id };
}

// ───────────────────────────── Entregas e marcos ─────────────────────────────

export interface DadosDaEntrega {
  id?: string | null;
  projectId: string;
  faseId?: string | null;
  atividadeId?: string | null;
  tipo?: string | null;
  nome: string;
  descricao?: string | null;
  responsavel?: string | null;
  dataPrevista?: string | null;
  dataEfetiva?: string | null;
  status?: string | null;
  contratoId?: string | null;
  contratoItemId?: string | null;
  valor?: number | string | null;
  justificativa?: string | null;
}

/**
 * Entrega técnica ou marco. Concluir/aceitar NÃO cria medição, fatura nem
 * receita: esses eventos são do módulo de Contratos, com as regras de lá.
 */
export async function salvarEntrega(input: DadosDaEntrega): Promise<Resultado> {
  const s = await sessao("plano", input.id ? "editar" : "criar", "Sem permissão para editar entregas.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const projeto = projetoDaSessao(ctx, input.projectId);
  if (!projeto) return falha("Projeto não encontrado.");
  const nome = txt(input.nome);
  if (!nome) return falha("Informe o nome da entrega.");
  const status = txt(input.status) ?? "prevista";
  if (!ehStatusEntrega(status)) return falha("Situação inválida.");
  const tipo = input.tipo === "marco" ? "marco" : "entrega";
  const dp = data(input.dataPrevista, "Data prevista");
  const de = data(input.dataEfetiva, "Data efetiva");
  if (!dp.ok) return falha(dp.error);
  if (!de.ok) return falha(de.error);
  const valor = num(input.valor);
  if (valor != null && (Number.isNaN(valor) || valor < 0)) return falha("Valor inválido.");
  const faseId = txt(input.faseId);
  if (faseId) {
    const f = await faseDoPlano(tenantId, faseId);
    if (!f || f.projectId !== projeto.id) return falha("Fase não encontrada neste projeto.");
  }
  const atividadeId = txt(input.atividadeId);
  if (atividadeId) {
    const a = await atividadeDoPlano(tenantId, atividadeId);
    if (!a || a.projectId !== projeto.id) return falha("Atividade não encontrada neste projeto.");
  }
  const contratoId = txt(input.contratoId);
  if (contratoId) {
    const [v] = await db.select({ id: schema.contratoProjetos.id }).from(schema.contratoProjetos).where(and(eq(schema.contratoProjetos.contratoId, contratoId), eq(schema.contratoProjetos.projectId, projeto.id), eq(schema.contratoProjetos.tenantId, tenantId))).limit(1);
    if (!v) return falha("O contrato precisa estar vinculado a este projeto.");
  }
  const contratoItemId = txt(input.contratoItemId);
  if (contratoItemId) {
    const it = await itemDeContratoDoProjeto(db, tenantId, projeto.id, contratoItemId);
    if (!it || (contratoId && it.contratoId !== contratoId)) return falha("O item contratual precisa ser do contrato escolhido e vinculado ao projeto.");
  }
  const campos = { faseId, atividadeId, tipo, nome, descricao: txt(input.descricao), responsavel: txt(input.responsavel), dataPrevista: dp.v, dataEfetiva: de.v, status, contratoId, contratoItemId, valor: valor == null ? null : String(valor) };
  if (!input.id) {
    const [{ ordem }] = await db.select({ ordem: max(schema.projetoEntregas.ordem) }).from(schema.projetoEntregas).where(eq(schema.projetoEntregas.projectId, projeto.id));
    const [e] = await db.insert(schema.projetoEntregas).values({ tenantId, projectId: projeto.id, ...campos, dataOriginal: dp.v, ordem: (ordem ?? 0) + 1 }).returning({ id: schema.projetoEntregas.id });
    await logAudit({ tenantId, userId: ctx.userId, action: "plano.entrega.create", entity: "projeto_entrega", entityId: e.id, meta: { projectId: projeto.id, nome, tipo } });
    revalidarPlano();
    return { ok: true, id: e.id };
  }
  const [atual] = await db.select().from(schema.projetoEntregas).where(and(eq(schema.projetoEntregas.id, input.id), eq(schema.projetoEntregas.tenantId, tenantId))).limit(1);
  if (!atual || atual.projectId !== projeto.id) return falha("Entrega não encontrada.");
  const base = linhaDeBase(atual.dataOriginal, atual.dataPrevista, dp.v);
  const depois = { ...campos, dataOriginal: base.original };
  const mudou = diferencas(atual as unknown as Record<string, unknown>, depois);
  await db.update(schema.projetoEntregas).set(depois).where(eq(schema.projetoEntregas.id, atual.id));
  if (Object.keys(mudou).length)
    await logAudit({ tenantId, userId: ctx.userId, action: base.reprogramou ? "plano.entrega.reprogramar" : "plano.entrega.update", entity: "projeto_entrega", entityId: atual.id, meta: { projectId: projeto.id, nome, mudou, justificativa: txt(input.justificativa) } });
  revalidarPlano();
  return { ok: true, id: atual.id };
}

// ───────────────────────────── Custos e documentos ─────────────────────────────

/**
 * Apropria (ou tira, com ids nulos) uma despesa a uma fase/atividade do plano.
 * Opcional: despesa transversal fica só no projeto. Não muda valor, conta,
 * categoria, DRE nem caixa.
 */
export async function apropriarDespesaNoPlano(input: { despesaId: string; faseId: string | null; atividadeId?: string | null }): Promise<Resultado> {
  const s = await sessao("plano", "editar", "Sem permissão para apropriar custos ao plano.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const [d] = await db
    .select({ id: schema.despesas.id, projectId: schema.versions.projectId, faseAntes: schema.despesas.projetoFaseId, atividadeAntes: schema.despesas.projetoAtividadeId })
    .from(schema.despesas)
    .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
    .where(and(eq(schema.despesas.id, input.despesaId), eq(schema.despesas.tenantId, tenantId)))
    .limit(1);
  if (!d || !projetoDaSessao(ctx, d.projectId)) return falha("Despesa não encontrada.");
  let faseId = txt(input.faseId);
  const atividadeId = txt(input.atividadeId);
  if (atividadeId) {
    const a = await atividadeDoPlano(tenantId, atividadeId);
    if (!a || a.projectId !== d.projectId) return falha("A atividade precisa ser do projeto da despesa.");
    faseId = a.faseId;
  }
  if (faseId) {
    const f = await faseDoPlano(tenantId, faseId);
    if (!f || f.projectId !== d.projectId) return falha("A fase precisa ser do projeto da despesa.");
  }
  await db.update(schema.despesas).set({ projetoFaseId: faseId, projetoAtividadeId: atividadeId }).where(eq(schema.despesas.id, d.id));
  await logAudit({ tenantId, userId: ctx.userId, action: "plano.custo.apropriar", entity: "despesa", entityId: d.id, meta: { projectId: d.projectId, de: { faseId: d.faseAntes, atividadeId: d.atividadeAntes }, para: { faseId, atividadeId } } });
  revalidarPlano();
  return { ok: true, id: d.id };
}

/** Anexa documento a uma fase, atividade ou entrega do plano (repositório de documentos de sempre). */
export async function anexarDocumentoDoPlano(formData: FormData): Promise<Resultado> {
  const s = await sessao("plano", "editar", "Sem permissão para anexar documentos ao plano.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const alvo = txt(formData.get("alvo")) as "fase" | "atividade" | "entrega" | null;
  const id = txt(formData.get("id"));
  const tipo = txt(formData.get("tipo")) ?? "Documento do plano";
  if (!alvo || !id || !["fase", "atividade", "entrega"].includes(alvo)) return falha("Escolha onde anexar.");
  const tabela = alvo === "fase" ? schema.projetoFases : alvo === "atividade" ? schema.projetoAtividades : schema.projetoEntregas;
  const [item] = await db.select({ id: tabela.id, projectId: tabela.projectId }).from(tabela).where(and(eq(tabela.id, id), eq(tabela.tenantId, tenantId))).limit(1);
  if (!item || !projetoDaSessao(ctx, item.projectId)) return falha("Item não encontrado.");
  if (!isR2Configured()) return falha("Storage (R2) não configurado — defina as variáveis R2_*.");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return falha("Selecione um arquivo.");
  if (file.size > LIMITE_UPLOAD_BYTES) return falha(`Arquivo deve ter até ${LIMITE_UPLOAD_MB} MB.`);
  const key = `tenants/${tenantId}/plano/${item.projectId}/${Date.now()}_${file.name.replace(/[^\w.\-]+/g, "_")}`;
  try {
    await putObject(key, new Uint8Array(await file.arrayBuffer()), file.type || "application/octet-stream");
  } catch (e) {
    return falha(e instanceof Error ? e.message : "Falha ao enviar o arquivo.");
  }
  const [doc] = await db
    .insert(schema.documents)
    .values({ tenantId, projectId: item.projectId, storageKey: key, filename: file.name, contentType: file.type || null, size: file.size, tipo, uploadedBy: quem(ctx), ...(alvo === "fase" ? { projetoFaseId: item.id } : alvo === "atividade" ? { projetoAtividadeId: item.id } : { projetoEntregaId: item.id }) })
    .returning({ id: schema.documents.id });
  await logAudit({ tenantId, userId: ctx.userId, action: "plano.doc.upload", entity: `projeto_${alvo}`, entityId: item.id, meta: { projectId: item.projectId, documentId: doc.id, filename: file.name } });
  revalidarPlano();
  return { ok: true, id: doc.id };
}

