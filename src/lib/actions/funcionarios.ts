"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { diffAudit } from "@/lib/audit-diff";
import { avisoDeCpfDuplicado, changesSemValorPessoal, recusaDaExclusao, recusaDoFuncionario, soCamposPermitidos, soDigitos, TELA_DADOS_FUNCIONARIO, TELA_FUNCIONARIOS } from "@/lib/funcionario-regras";
import { contarAlocacoesDoFuncionario, getCpfsConhecidos } from "@/lib/queries";
import { numeroDoCampo } from "@/lib/estoque-regras";

/**
 * Funcionários (Prompt Z, Parte 2). Registro, não folha. Campos sensíveis
 * só gravam com `funcionariosdados:editar`; o log nunca leva CPF, salário,
 * endereço ou banco em claro (7.3). Desligar em vez de excluir (2.4).
 */

export type ResultadoFuncionario = { ok: true; id: string; aviso?: string | null } | { ok: false; error: string };
const SEM_SESSAO = "Sessão expirada. Entre de novo.";
const s = (fd: FormData, k: string): string | null => {
  const v = String(fd.get(k) ?? "").trim();
  return v ? v : null;
};

const CAMPOS_TEXTO = ["nome", "nascimento", "nacionalidade", "estadoCivil", "nomeMae", "cpf", "rg", "rgOrgao", "rgUf", "ctpsNumero", "ctpsSerie", "pis", "tituloEleitor", "reservista", "cnh", "cnhCategoria", "cnhValidade", "endereco", "numero", "complemento", "bairro", "cidade", "estado", "cep", "admissao", "cargo", "setor", "projectId", "tipoContrato", "prazoContrato", "jornada", "bancoNome", "bancoAgencia", "bancoConta", "bancoTipoConta", "pixTipo", "pixChave", "obs"] as const;

/** Só os campos PRESENTES no formulário entram (campo ausente não vira nulo). */
function lerCampos(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of CAMPOS_TEXTO) if (fd.has(k)) out[k] = s(fd, k);
  if (out.cpf) out.cpf = soDigitos(out.cpf as string);
  if (fd.has("salario")) {
    const salarioStr = s(fd, "salario");
    out.salario = salarioStr == null ? null : numeroDoCampo(salarioStr);
  }
  return out;
}

async function funcionarioDoTenant(tenantId: string, id: string) {
  const [f] = await db.select().from(schema.funcionarios).where(and(eq(schema.funcionarios.id, id), eq(schema.funcionarios.tenantId, tenantId))).limit(1);
  return f ?? null;
}

export async function addFuncionario(fd: FormData): Promise<ResultadoFuncionario> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, TELA_FUNCIONARIOS, "criar")) return { ok: false, error: "Sem permissão para cadastrar funcionário." };
  const campos = lerCampos(fd);
  const recusa = recusaDoFuncionario({ nome: campos.nome as string | null, cpf: campos.cpf as string | null, admissao: campos.admissao as string | null, salario: campos.salario as number | null });
  if (recusa) return { ok: false, error: recusa };
  if (campos.projectId && !ctx.projects.some((p) => p.id === campos.projectId)) return { ok: false, error: "Projeto não encontrado nesta empresa." };
  const podeSensivel = can(ctx.perms, TELA_DADOS_FUNCIONARIO, "editar");
  const dados = soCamposPermitidos(campos, podeSensivel);
  const aviso = avisoDeCpfDuplicado(campos.cpf as string | null, await getCpfsConhecidos(ctx.tenant.id));
  const [row] = await db
    .insert(schema.funcionarios)
    .values({ tenantId: ctx.tenant.id, ...(dados as Record<string, string | null>), nome: campos.nome as string, salario: dados.salario == null ? null : String(dados.salario) } as typeof schema.funcionarios.$inferInsert)
    .returning({ id: schema.funcionarios.id });
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "funcionario.create", entity: "funcionario", entityId: row.id, meta: { nome: campos.nome, cargo: campos.cargo, admissao: campos.admissao, comDadosSensiveis: podeSensivel, cpfDuplicado: !!aviso } });
  revalidatePath("/funcionarios");
  return { ok: true, id: row.id, aviso };
}

export async function updateFuncionario(id: string, fd: FormData): Promise<ResultadoFuncionario> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, TELA_FUNCIONARIOS, "editar")) return { ok: false, error: "Sem permissão para editar funcionário." };
  const atual = await funcionarioDoTenant(ctx.tenant.id, id);
  if (!atual) return { ok: false, error: "Funcionário não encontrado." };
  const campos = lerCampos(fd);
  const depois = { ...(atual as Record<string, unknown>), ...campos };
  const recusa = recusaDoFuncionario({ nome: depois.nome as string | null, cpf: depois.cpf as string | null, admissao: depois.admissao as string | null, desligamento: atual.desligamento, salario: campos.salario == null ? null : (campos.salario as number) });
  if (recusa) return { ok: false, error: recusa };
  if (campos.projectId && !ctx.projects.some((p) => p.id === campos.projectId)) return { ok: false, error: "Projeto não encontrado nesta empresa." };
  const podeSensivel = can(ctx.perms, TELA_DADOS_FUNCIONARIO, "editar");
  const dados = soCamposPermitidos(campos, podeSensivel) as Record<string, unknown>;
  if ("salario" in dados) dados.salario = dados.salario == null ? null : String(dados.salario);
  const antes: Record<string, unknown> = {};
  for (const k of Object.keys(dados)) antes[k] = (atual as Record<string, unknown>)[k] ?? null;
  const changes = diffAudit(antes, dados);
  if (Object.keys(changes).length === 0) return { ok: true, id, aviso: "Nada mudou." };
  const aviso = avisoDeCpfDuplicado(campos.cpf as string | null, await getCpfsConhecidos(ctx.tenant.id), { origem: "funcionario", nome: atual.nome });
  await db.update(schema.funcionarios).set({ ...(dados as Partial<typeof schema.funcionarios.$inferInsert>), updatedAt: new Date() }).where(eq(schema.funcionarios.id, id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "funcionario.update", entity: "funcionario", entityId: id, meta: { nome: atual.nome, changes: changesSemValorPessoal(changes) } });
  revalidatePath("/funcionarios");
  revalidatePath(`/funcionarios/${id}`);
  return { ok: true, id, aviso };
}

/** 2.4 — desligar: data e motivo; sai das listas de alocação; o histórico fica. */
export async function desligarFuncionario(id: string, desligamento: string, motivo: string | null): Promise<ResultadoFuncionario> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, TELA_FUNCIONARIOS, "editar")) return { ok: false, error: "Sem permissão para desligar funcionário." };
  const f = await funcionarioDoTenant(ctx.tenant.id, id);
  if (!f) return { ok: false, error: "Funcionário não encontrado." };
  const data = (desligamento ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { ok: false, error: "Informe a data do desligamento." };
  if (f.admissao && data < f.admissao) return { ok: false, error: "A data de desligamento não pode ser anterior à admissão." };
  await db.update(schema.funcionarios).set({ desligamento: data, motivoDesligamento: (motivo ?? "").trim() || null, updatedAt: new Date() }).where(eq(schema.funcionarios.id, id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "funcionario.desligar", entity: "funcionario", entityId: id, meta: { nome: f.nome, desligamento: data, motivo: (motivo ?? "").trim() || null } });
  revalidatePath("/funcionarios");
  revalidatePath(`/funcionarios/${id}`);
  return { ok: true, id };
}

export async function reativarFuncionario(id: string): Promise<ResultadoFuncionario> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, TELA_FUNCIONARIOS, "editar")) return { ok: false, error: "Sem permissão para editar funcionário." };
  const f = await funcionarioDoTenant(ctx.tenant.id, id);
  if (!f) return { ok: false, error: "Funcionário não encontrado." };
  if (!f.desligamento) return { ok: true, id };
  await db.update(schema.funcionarios).set({ desligamento: null, motivoDesligamento: null, updatedAt: new Date() }).where(eq(schema.funcionarios.id, id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "funcionario.reativar", entity: "funcionario", entityId: id, meta: { nome: f.nome, desligamentoAnterior: f.desligamento } });
  revalidatePath("/funcionarios");
  revalidatePath(`/funcionarios/${id}`);
  return { ok: true, id };
}

/** 2.4 — excluir só sem alocação, com o nome digitado; auditoria sem dado pessoal. */
export async function deleteFuncionario(id: string, nomeDigitado: string): Promise<ResultadoFuncionario> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, TELA_FUNCIONARIOS, "excluir")) return { ok: false, error: "Sem permissão para excluir funcionário." };
  const f = await funcionarioDoTenant(ctx.tenant.id, id);
  if (!f) return { ok: false, error: "Funcionário não encontrado." };
  const alocacoes = await contarAlocacoesDoFuncionario(ctx.tenant.id, id);
  const recusa = recusaDaExclusao(f, alocacoes, nomeDigitado ?? "");
  if (recusa) return { ok: false, error: recusa };
  await db.delete(schema.funcionarios).where(eq(schema.funcionarios.id, id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "funcionario.delete", entity: "funcionario", entityId: id, meta: { nome: f.nome, cargo: f.cargo, admissao: f.admissao, desligamento: f.desligamento } });
  revalidatePath("/funcionarios");
  return { ok: true, id };
}

/* dependentes — dado sensível (7.2): exigem a permissão de campo */

export async function addDependente(funcionarioId: string, fd: FormData): Promise<ResultadoFuncionario> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, TELA_DADOS_FUNCIONARIO, "editar")) return { ok: false, error: "Dependentes exigem a permissão de dados do funcionário." };
  const f = await funcionarioDoTenant(ctx.tenant.id, funcionarioId);
  if (!f) return { ok: false, error: "Funcionário não encontrado." };
  const nome = s(fd, "nome");
  if (!nome) return { ok: false, error: "Informe o nome do dependente." };
  const [row] = await db
    .insert(schema.funcionarioDependentes)
    .values({ tenantId: ctx.tenant.id, funcionarioId, nome, nascimento: s(fd, "nascimento"), parentesco: s(fd, "parentesco"), dependenteIr: fd.get("dependenteIr") === "1", salarioFamilia: fd.get("salarioFamilia") === "1" })
    .returning({ id: schema.funcionarioDependentes.id });
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "funcionario.dependente.create", entity: "funcionario", entityId: funcionarioId, meta: { funcionario: f.nome, dependenteId: row.id } });
  revalidatePath(`/funcionarios/${funcionarioId}`);
  return { ok: true, id: row.id };
}

export async function deleteDependente(id: string): Promise<ResultadoFuncionario> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, TELA_DADOS_FUNCIONARIO, "editar")) return { ok: false, error: "Dependentes exigem a permissão de dados do funcionário." };
  const [d] = await db.select().from(schema.funcionarioDependentes).where(and(eq(schema.funcionarioDependentes.id, id), eq(schema.funcionarioDependentes.tenantId, ctx.tenant.id))).limit(1);
  if (!d) return { ok: false, error: "Dependente não encontrado." };
  await db.delete(schema.funcionarioDependentes).where(eq(schema.funcionarioDependentes.id, id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "funcionario.dependente.delete", entity: "funcionario", entityId: d.funcionarioId, meta: { dependenteId: id } });
  revalidatePath(`/funcionarios/${d.funcionarioId}`);
  return { ok: true, id };
}

