"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  MODELO_DE_IMPLANTACAO,
  PERFIS_DE_TREINAMENTO,
  STATUS_DO_TREINAMENTO,
  ehStatusDaEtapa,
  recusaDeDependencia,
  recusaDeSituacao,
} from "@/lib/implantacao-regras";

/**
 * Implantação e treinamento (0083). Permissão: a tela Empresa (`empresa`):
 * ver acompanha; editar aplica o modelo, cria, altera e exclui etapas e
 * registra treinamentos. Tudo auditado e sempre da própria empresa.
 */
type Resultado = { ok: true; id?: string; aviso?: string } | { ok: false; error: string };

const txt = (v: unknown, max = 2000) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const dataValida = (v: string | null) => !v || /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/.test(v);

async function sessao(acao: "editar") {
  const ctx = await getTenantContext();
  if (!ctx) return { error: "Sessão expirada. Entre de novo." } as const;
  if (!can(ctx.perms, "empresa", acao)) return { error: "Sem permissão para editar a implantação." } as const;
  return { ctx } as const;
}

const etapasDa = (tenantId: string) =>
  db.select({ id: schema.implantacaoEtapas.id, codigo: schema.implantacaoEtapas.codigo, status: schema.implantacaoEtapas.status, dependeDe: schema.implantacaoEtapas.dependeDe }).from(schema.implantacaoEtapas).where(eq(schema.implantacaoEtapas.tenantId, tenantId));

/** Aplica o modelo padrão (A a H). Só inclui as etapas que a empresa ainda não tem: reaplicar não duplica nem sobrescreve. */
export async function aplicarModeloDeImplantacao(): Promise<Resultado> {
  const s = await sessao("editar");
  if ("error" in s) return { ok: false, error: s.error! };
  const tenantId = s.ctx.tenant.id;
  const novas = MODELO_DE_IMPLANTACAO.map((e, i) => ({ tenantId, grupo: e.grupo, codigo: e.codigo, titulo: e.titulo, descricao: e.descricao, ordem: i + 1, dependeDe: e.dependeDe ?? null }));
  const inseridas = await db.insert(schema.implantacaoEtapas).values(novas).onConflictDoNothing({ target: [schema.implantacaoEtapas.tenantId, schema.implantacaoEtapas.codigo] }).returning({ id: schema.implantacaoEtapas.id });
  await logAudit({ tenantId, userId: s.ctx.userId, action: "implantacao.modelo", entity: "implantacao_etapa", entityId: null, meta: { incluidas: inseridas.length } });
  revalidatePath("/implantacao");
  return { ok: true, aviso: inseridas.length ? `${inseridas.length} etapa(s) incluída(s).` : "A empresa já tinha todas as etapas do modelo." };
}

export interface DadosDaEtapa {
  id?: string | null;
  grupo: string;
  codigo: string;
  titulo: string;
  descricao?: string | null;
  responsavel?: string | null;
  previsto?: string | null;
  realizado?: string | null;
  status?: string | null;
  dependeDe?: string | null;
  observacoes?: string | null;
  evidencia?: string | null;
}

/** Cria ou altera uma etapa (o modelo é customizável por empresa). */
export async function salvarEtapaDeImplantacao(input: DadosDaEtapa): Promise<Resultado> {
  const s = await sessao("editar");
  if ("error" in s) return { ok: false, error: s.error! };
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const grupo = txt(input.grupo, 40);
  const codigo = txt(input.codigo, 20)?.toUpperCase() ?? null;
  const titulo = txt(input.titulo, 200);
  if (!grupo || !codigo || !titulo) return { ok: false, error: "Informe grupo, código e título da etapa." };
  if (!/^[A-Z0-9][A-Z0-9.-]*$/.test(codigo)) return { ok: false, error: "Código: letras, números, ponto ou hífen (ex.: C4)." };
  const previsto = txt(input.previsto, 10);
  const realizado = txt(input.realizado, 10);
  if (!dataValida(previsto) || !dataValida(realizado)) return { ok: false, error: "Datas no formato MM/DD/AAAA." };
  const status = txt(input.status, 30) ?? "nao_iniciada";
  if (!ehStatusDaEtapa(status)) return { ok: false, error: "Situação inválida." };
  const dependeDe = txt(input.dependeDe, 20)?.toUpperCase() ?? null;
  const evidencia = txt(input.evidencia);
  const observacoes = txt(input.observacoes);

  const todas = await etapasDa(tenantId);
  const atual = input.id ? todas.find((e) => e.id === input.id) : null;
  if (input.id && !atual) return { ok: false, error: "Etapa não encontrada." };
  if (todas.some((e) => e.codigo === codigo && e.id !== input.id)) return { ok: false, error: `Já existe a etapa ${codigo}.` };
  const comEsta = [...todas.filter((e) => e.id !== input.id), { codigo, status, dependeDe }];
  const rDep = recusaDeDependencia(codigo, dependeDe, comEsta);
  if (rDep) return { ok: false, error: rDep };
  if (!atual || atual.status !== status || status === "concluida") {
    const rSit = recusaDeSituacao({ codigo, status: atual?.status ?? "nao_iniciada", dependeDe, para: status, evidencia, observacoes }, comEsta);
    if (rSit) return { ok: false, error: rSit };
  }
  // Reabrir uma etapa de que outras concluídas dependem não desfaz as outras: só avisa.
  const dependentesConcluidas = atual && atual.status === "concluida" && status !== "concluida" ? todas.filter((e) => e.dependeDe === atual.codigo && e.status === "concluida").map((e) => e.codigo) : [];

  const campos = { grupo, codigo, titulo, descricao: txt(input.descricao), responsavel: txt(input.responsavel, 200), previsto, realizado, status, dependeDe, observacoes, evidencia, updatedAt: new Date() };
  let id = atual?.id;
  if (atual) {
    await db.update(schema.implantacaoEtapas).set(campos).where(and(eq(schema.implantacaoEtapas.id, atual.id), eq(schema.implantacaoEtapas.tenantId, tenantId)));
  } else {
    const ordem = todas.length + 1;
    [{ id }] = await db.insert(schema.implantacaoEtapas).values({ tenantId, ...campos, ordem }).returning({ id: schema.implantacaoEtapas.id });
  }
  await logAudit({ tenantId, userId: ctx.userId, action: atual ? "implantacao.etapa.update" : "implantacao.etapa.create", entity: "implantacao_etapa", entityId: id ?? null, meta: { codigo, status, de: atual?.status ?? null, dependeDe } });
  revalidatePath("/implantacao");
  return { ok: true, id, ...(dependentesConcluidas.length ? { aviso: `Atenção: ${dependentesConcluidas.join(", ")} já estava(m) concluída(s) e depende(m) desta etapa.` } : {}) };
}

/** Exclui uma etapa que nenhuma outra usa como dependência. */
export async function excluirEtapaDeImplantacao(id: string): Promise<Resultado> {
  const s = await sessao("editar");
  if ("error" in s) return { ok: false, error: s.error! };
  const tenantId = s.ctx.tenant.id;
  const todas = await etapasDa(tenantId);
  const e = todas.find((x) => x.id === id);
  if (!e) return { ok: false, error: "Etapa não encontrada." };
  const usam = todas.filter((x) => x.dependeDe === e.codigo).map((x) => x.codigo);
  if (usam.length) return { ok: false, error: `Antes, tire a dependência de ${usam.join(", ")}.` };
  await db.delete(schema.implantacaoEtapas).where(and(eq(schema.implantacaoEtapas.id, id), eq(schema.implantacaoEtapas.tenantId, tenantId)));
  await logAudit({ tenantId, userId: s.ctx.userId, action: "implantacao.etapa.delete", entity: "implantacao_etapa", entityId: id, meta: { codigo: e.codigo, status: e.status } });
  revalidatePath("/implantacao");
  return { ok: true };
}

export interface DadosDoTreinamento {
  id?: string | null;
  perfil: string;
  tema: string;
  participante?: string | null;
  data?: string | null;
  status?: string | null;
  pendencias?: string | null;
}

/** Registra ou atualiza um treinamento por perfil. */
export async function salvarTreinamento(input: DadosDoTreinamento): Promise<Resultado> {
  const s = await sessao("editar");
  if ("error" in s) return { ok: false, error: s.error! };
  const tenantId = s.ctx.tenant.id;
  const perfil = txt(input.perfil, 40);
  if (!perfil || !(perfil in PERFIS_DE_TREINAMENTO)) return { ok: false, error: "Perfil inválido." };
  const tema = txt(input.tema, 200);
  if (!tema) return { ok: false, error: "Informe o tema do treinamento." };
  const data = txt(input.data, 10);
  if (!dataValida(data)) return { ok: false, error: "Data no formato MM/DD/AAAA." };
  const status = txt(input.status, 20) ?? "planejado";
  if (!(STATUS_DO_TREINAMENTO as readonly string[]).includes(status)) return { ok: false, error: "Situação inválida." };
  if (status === "realizado" && !data) return { ok: false, error: "Treinamento realizado precisa da data." };
  const campos = { perfil, tema, participante: txt(input.participante, 300), data, status, pendencias: txt(input.pendencias) };
  let id = input.id ?? undefined;
  if (input.id) {
    const r = await db.update(schema.implantacaoTreinamentos).set(campos).where(and(eq(schema.implantacaoTreinamentos.id, input.id), eq(schema.implantacaoTreinamentos.tenantId, tenantId))).returning({ id: schema.implantacaoTreinamentos.id });
    if (!r.length) return { ok: false, error: "Treinamento não encontrado." };
  } else {
    [{ id }] = await db.insert(schema.implantacaoTreinamentos).values({ tenantId, ...campos }).returning({ id: schema.implantacaoTreinamentos.id });
  }
  await logAudit({ tenantId, userId: s.ctx.userId, action: input.id ? "implantacao.treinamento.update" : "implantacao.treinamento.create", entity: "implantacao_treinamento", entityId: id ?? null, meta: { perfil, tema, status } });
  revalidatePath("/implantacao");
  return { ok: true, id };
}

/** Planeja, de uma vez, os temas padrão de um perfil (não duplica temas já registrados). */
export async function planejarTreinamentosDoPerfil(perfil: string): Promise<Resultado> {
  const s = await sessao("editar");
  if ("error" in s) return { ok: false, error: s.error! };
  const tenantId = s.ctx.tenant.id;
  const p = PERFIS_DE_TREINAMENTO[perfil];
  if (!p) return { ok: false, error: "Perfil inválido." };
  const ja = await db
    .select({ tema: schema.implantacaoTreinamentos.tema })
    .from(schema.implantacaoTreinamentos)
    .where(and(eq(schema.implantacaoTreinamentos.tenantId, tenantId), eq(schema.implantacaoTreinamentos.perfil, perfil), inArray(schema.implantacaoTreinamentos.tema, p.temas)));
  const faltam = p.temas.filter((t) => !ja.some((x) => x.tema === t));
  if (faltam.length) await db.insert(schema.implantacaoTreinamentos).values(faltam.map((tema) => ({ tenantId, perfil, tema })));
  await logAudit({ tenantId, userId: s.ctx.userId, action: "implantacao.treinamento.planejar", entity: "implantacao_treinamento", entityId: null, meta: { perfil, incluidos: faltam.length } });
  revalidatePath("/implantacao");
  return { ok: true, aviso: faltam.length ? `${faltam.length} tema(s) planejado(s).` : "Os temas deste perfil já estavam registrados." };
}
