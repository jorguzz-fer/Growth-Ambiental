"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { baseDeRateioPorHoras, competenciaDaData, recusaDoApontamento } from "@/lib/horas-regras";

/**
 * Apontamento de horas (0082). Permissão: a tela Equipes e Presença de Campo
 * (`equipes`: ver / criar / excluir). Apontar horas NÃO cria despesa nem
 * lançamento: a remuneração continua em Folha e Despesas.
 */
type Resultado = { ok: true; id?: string; aviso?: string } | { ok: false; error: string };

export interface DadosDoApontamento {
  tipo: string;
  /** "f:<id>" (funcionário) ou "s:<id>" (prestador / sócio) */
  profissional: string;
  projectId?: string | null;
  atividadeInterna?: string | null;
  contratoId?: string | null;
  projetoFaseId?: string | null;
  projetoAtividadeId?: string | null;
  data: string;
  horas: number | string;
  descricao?: string | null;
  idempotencyKey?: string | null;
}

const txt = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function registrarHoras(input: DadosDoApontamento): Promise<Resultado> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: "Sessão expirada. Entre de novo." };
  if (!can(ctx.perms, "equipes", "criar")) return { ok: false, error: "Sem permissão para apontar horas." };
  const tenantId = ctx.tenant.id;
  const [prefixo, profId] = (input.profissional ?? "").split(":");
  const funcionarioId = prefixo === "f" && profId ? profId : null;
  const stakeholderId = prefixo === "s" && profId ? profId : null;
  const projectId = txt(input.projectId);
  const atividadeInterna = projectId ? null : txt(input.atividadeInterna);
  const horas = typeof input.horas === "number" ? input.horas : Number(String(input.horas ?? "").replace(",", "."));
  const recusa = recusaDoApontamento({ tipo: input.tipo, funcionarioId, stakeholderId, projectId, atividadeInterna, data: txt(input.data), horas: Number.isFinite(horas) ? horas : null });
  if (recusa) return { ok: false, error: recusa };

  // Tudo da própria empresa: profissional, projeto (que a pessoa vê), contrato do projeto, fase/atividade do plano do projeto.
  if (funcionarioId) {
    const [f] = await db.select({ id: schema.funcionarios.id }).from(schema.funcionarios).where(and(eq(schema.funcionarios.id, funcionarioId), eq(schema.funcionarios.tenantId, tenantId))).limit(1);
    if (!f) return { ok: false, error: "Profissional não encontrado nesta empresa." };
  } else {
    const [s] = await db.select({ id: schema.stakeholders.id }).from(schema.stakeholders).where(and(eq(schema.stakeholders.id, stakeholderId!), eq(schema.stakeholders.tenantId, tenantId))).limit(1);
    if (!s) return { ok: false, error: "Profissional não encontrado nesta empresa." };
  }
  if (projectId && !ctx.projects.some((p) => p.id === projectId)) return { ok: false, error: "Projeto não encontrado." };
  const contratoId = projectId ? txt(input.contratoId) : null;
  if (contratoId) {
    const [v] = await db.select({ id: schema.contratoProjetos.id }).from(schema.contratoProjetos).where(and(eq(schema.contratoProjetos.contratoId, contratoId), eq(schema.contratoProjetos.projectId, projectId!), eq(schema.contratoProjetos.tenantId, tenantId))).limit(1);
    if (!v) return { ok: false, error: "O contrato não está vinculado a este projeto." };
  }
  let faseId = projectId ? txt(input.projetoFaseId) : null;
  const atividadeId = projectId ? txt(input.projetoAtividadeId) : null;
  if (atividadeId) {
    const [a] = await db.select({ faseId: schema.projetoAtividades.faseId }).from(schema.projetoAtividades).where(and(eq(schema.projetoAtividades.id, atividadeId), eq(schema.projetoAtividades.tenantId, tenantId), eq(schema.projetoAtividades.projectId, projectId!))).limit(1);
    if (!a) return { ok: false, error: "Atividade não encontrada no plano deste projeto." };
    if (faseId && a.faseId && a.faseId !== faseId) return { ok: false, error: "A atividade não é da fase informada." };
    faseId = faseId ?? a.faseId ?? null;
  }
  if (faseId) {
    const [f] = await db.select({ id: schema.projetoFases.id }).from(schema.projetoFases).where(and(eq(schema.projetoFases.id, faseId), eq(schema.projetoFases.tenantId, tenantId), eq(schema.projetoFases.projectId, projectId!))).limit(1);
    if (!f) return { ok: false, error: "Fase não encontrada no plano deste projeto." };
  }
  // Custo-hora: só a base informada na alocação ativa do profissional no projeto. Sem ela, fica nulo (nada inventado).
  let custoHora: string | null = null;
  if (projectId) {
    const [aloc] = await db
      .select({ custoHora: schema.equipesProjeto.custoHora })
      .from(schema.equipesProjeto)
      .where(
        and(
          eq(schema.equipesProjeto.tenantId, tenantId),
          eq(schema.equipesProjeto.projectId, projectId),
          funcionarioId ? eq(schema.equipesProjeto.funcionarioId, funcionarioId) : eq(schema.equipesProjeto.stakeholderId, stakeholderId!),
          eq(schema.equipesProjeto.situacao, "ativa"),
        ),
      )
      .limit(1);
    custoHora = aloc?.custoHora ?? null;
  }
  const idem = txt(input.idempotencyKey);
  if (idem) {
    const [ja] = await db.select({ id: schema.apontamentosHora.id }).from(schema.apontamentosHora).where(and(eq(schema.apontamentosHora.tenantId, tenantId), eq(schema.apontamentosHora.idempotencyKey, idem))).limit(1);
    if (ja) return { ok: true, id: ja.id, aviso: "Este apontamento já tinha sido registrado." };
  }
  const data = txt(input.data)!;
  try {
    const [novo] = await db
      .insert(schema.apontamentosHora)
      .values({
        tenantId,
        tipo: input.tipo,
        funcionarioId,
        stakeholderId,
        projectId,
        atividadeInterna,
        contratoId,
        projetoFaseId: faseId,
        projetoAtividadeId: atividadeId,
        data,
        competencia: competenciaDaData(data),
        horas: String(horas),
        custoHora,
        descricao: txt(input.descricao),
        idempotencyKey: idem,
        createdBy: ctx.userEmail ?? ctx.userId ?? null,
      })
      .returning({ id: schema.apontamentosHora.id });
    await logAudit({ tenantId, userId: ctx.userId, action: "horas.apontar", entity: "apontamento_hora", entityId: novo.id, meta: { tipo: input.tipo, horas, projectId, atividadeInterna, contratoId, faseId, atividadeId, data } });
    revalidatePath("/equipes/horas");
    return { ok: true, id: novo.id, aviso: projectId && !custoHora ? "Sem custo-hora na alocação deste profissional no projeto: as horas entram sem custo gerencial." : undefined };
  } catch (e) {
    if (idem && String((e as { code?: string })?.code) === "23505") return { ok: true, aviso: "Este apontamento já tinha sido registrado." };
    throw e;
  }
}

export async function excluirApontamento(id: string): Promise<Resultado> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: "Sessão expirada. Entre de novo." };
  if (!can(ctx.perms, "equipes", "excluir")) return { ok: false, error: "Sem permissão para excluir apontamentos." };
  const [a] = await db.select().from(schema.apontamentosHora).where(and(eq(schema.apontamentosHora.id, id), eq(schema.apontamentosHora.tenantId, ctx.tenant.id))).limit(1);
  if (!a) return { ok: false, error: "Apontamento não encontrado." };
  await db.delete(schema.apontamentosHora).where(eq(schema.apontamentosHora.id, a.id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "horas.excluir", entity: "apontamento_hora", entityId: a.id, meta: { tipo: a.tipo, horas: a.horas, projectId: a.projectId, data: a.data } });
  revalidatePath("/equipes/horas");
  return { ok: true, id: a.id };
}

/** Custo-hora (base gerencial) de uma alocação. Quem edita a equipe edita a base. */
export async function definirCustoHora(alocacaoId: string, valor: number | string | null): Promise<Resultado> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: "Sessão expirada. Entre de novo." };
  if (!can(ctx.perms, "equipes", "editar")) return { ok: false, error: "Sem permissão para editar a equipe." };
  const n = valor == null || valor === "" ? null : Number(String(valor).replace(",", "."));
  if (n != null && (!Number.isFinite(n) || n < 0)) return { ok: false, error: "Custo-hora inválido." };
  const [a] = await db.select({ id: schema.equipesProjeto.id, custoHora: schema.equipesProjeto.custoHora }).from(schema.equipesProjeto).where(and(eq(schema.equipesProjeto.id, alocacaoId), eq(schema.equipesProjeto.tenantId, ctx.tenant.id))).limit(1);
  if (!a) return { ok: false, error: "Alocação não encontrada." };
  await db.update(schema.equipesProjeto).set({ custoHora: n == null ? null : String(n) }).where(eq(schema.equipesProjeto.id, a.id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "equipe.custo_hora", entity: "equipe_projeto", entityId: a.id, meta: { de: a.custoHora, para: n } });
  revalidatePath("/equipes/horas");
  return { ok: true, id: a.id };
}

/**
 * Base de rateio por horas realizadas numa competência (e, opcionalmente, de
 * um profissional): os percentuais por projeto que o Acerto e Rateio usa.
 * Só sugere — quem grava o rateio continua sendo a tela de Acertos e Rateios,
 * com a memória de cálculo.
 */
export async function sugerirRateioPorHoras(input: { competencia: string; profissional?: string | null }): Promise<{ ok: true; linhas: { projectId: string; nome: string; horas: number; percentual: number }[]; base: string } | { ok: false; error: string }> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: "Sessão expirada. Entre de novo." };
  if (!can(ctx.perms, "equipes", "ver")) return { ok: false, error: "Sem permissão para ver as horas." };
  if (!/^\d{2}\/\d{4}$/.test(input.competencia ?? "")) return { ok: false, error: "Informe a competência (MM/AAAA)." };
  const [prefixo, profId] = (input.profissional ?? "").split(":");
  const linhas = await db
    .select({ projectId: schema.apontamentosHora.projectId, horas: schema.apontamentosHora.horas, tipo: schema.apontamentosHora.tipo })
    .from(schema.apontamentosHora)
    .where(
      and(
        eq(schema.apontamentosHora.tenantId, ctx.tenant.id),
        eq(schema.apontamentosHora.competencia, input.competencia),
        ...(prefixo === "f" && profId ? [eq(schema.apontamentosHora.funcionarioId, profId)] : prefixo === "s" && profId ? [eq(schema.apontamentosHora.stakeholderId, profId)] : []),
      ),
    );
  const base = baseDeRateioPorHoras(linhas.map((l) => ({ projectId: l.projectId, horas: Number(l.horas), tipo: l.tipo }))).filter((l) => ctx.projects.some((p) => p.id === l.projectId));
  const nomes = new Map(ctx.projects.map((p) => [p.id, p.name]));
  return { ok: true, linhas: base.map((l) => ({ ...l, nome: nomes.get(l.projectId) ?? l.projectId })), base: `horas realizadas apontadas em ${input.competencia}${profId ? " (um profissional)" : ""}` };
}
