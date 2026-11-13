"use server";

import { and, eq, inArray, isNull, max, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext, type TenantContext } from "@/lib/context";
import { can, type PermAction } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { reservarNumero } from "@/lib/db/numbering";
import { ehIndiceDeReajuste } from "@/lib/incc-regras";
import { ymd } from "@/lib/utils";
import { dataValida } from "@/lib/plano-regras";
import { isR2Configured, putObject } from "@/lib/storage/r2";
import { LIMITE_UPLOAD_BYTES, LIMITE_UPLOAD_MB } from "@/lib/clientes-regras";
import {
  codigoDoAditivo,
  contratoEmExecucao,
  contratoEmPreparo,
  ehCriterio,
  ehStatusMarco,
  ehTipoAditivo,
  ehTipoContrato,
  ehVinculo,
  hojeMDY,
  limitesDosItens,
  recusaDeComprometimento,
  recusaDeLimite,
  recusaTransicaoAditivo,
  recusaTransicaoContrato,
  recusaTransicaoMedicao,
  recusaTransicaoReembolso,
  statusDoAditivoEditavel,
  totalDoItem,
  valorDaMedicao,
  valorDoContrato,
  cents,
  TIPOS_DOC_CONTRATO,
} from "@/lib/contrato-regras";

/**
 * Contratos e Aditivos — ações do servidor. Regras em `contrato-regras.ts`
 * (puro). Toda ação: sessão → permissão → o registro é da empresa (nunca
 * confia no id vindo da tela) → validação → gravação → auditoria.
 */
export type Resultado = { ok: true; id?: string; aviso?: string } | { ok: false; error: string };
type Exec = Pick<typeof db, "select" | "insert" | "update" | "delete">;

const SEM_SESSAO = "Sessão expirada. Entre de novo.";
const falha = (error: string): Resultado => ({ ok: false, error });
const txt = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);
const quem = (ctx: TenantContext) => ctx.userEmail || ctx.userId || null;
/** Data "MM/DD/YYYY" válida, vazia (null) ou recusa. */
function data(v: unknown, rotulo: string): { ok: true; v: string | null } | { ok: false; error: string } {
  const s = txt(v);
  if (!s) return { ok: true, v: null };
  return dataValida(s) ? { ok: true, v: s } : { ok: false, error: `${rotulo}: data inválida.` };
}
const competenciaValida = (v: unknown) => typeof v === "string" && /^(0[1-9]|1[0-2])\/\d{4}$/.test(v.trim());

function revalidar(id?: string) {
  revalidatePath("/contratos");
  if (id) revalidatePath(`/contratos/${id}`);
}

async function sessao(tela: string, acao: PermAction, msg: string): Promise<{ ctx: TenantContext } | { error: string }> {
  const ctx = await getTenantContext();
  if (!ctx) return { error: SEM_SESSAO };
  if (!can(ctx.perms, tela, acao)) return { error: msg };
  return { ctx };
}

async function contratoDaEmpresa(tenantId: string, id: string, exec: Exec = db, travar = false) {
  if (!id) return null;
  const q = exec.select().from(schema.contratos).where(and(eq(schema.contratos.id, id), eq(schema.contratos.tenantId, tenantId))).limit(1);
  const [c] = travar ? await q.for("update") : await q;
  return c ?? null;
}

/** Aditivos, itens, variações e medições do contrato — a base dos limites. */
async function baseDoContrato(tenantId: string, contratoId: string, exec: Exec = db) {
  const [aditivos, itens, medicoes] = await Promise.all([
    exec.select().from(schema.contratoAditivos).where(and(eq(schema.contratoAditivos.tenantId, tenantId), eq(schema.contratoAditivos.contratoId, contratoId))),
    exec.select().from(schema.contratoItens).where(and(eq(schema.contratoItens.tenantId, tenantId), eq(schema.contratoItens.contratoId, contratoId))),
    exec.select().from(schema.contratoMedicoes).where(and(eq(schema.contratoMedicoes.tenantId, tenantId), eq(schema.contratoMedicoes.contratoId, contratoId))),
  ]);
  const variacoes = aditivos.length
    ? await exec.select().from(schema.contratoAditivoItens).where(and(eq(schema.contratoAditivoItens.tenantId, tenantId), inArray(schema.contratoAditivoItens.aditivoId, aditivos.map((a) => a.id))))
    : [];
  return { aditivos, itens, medicoes, variacoes };
}

/** Valor atualizado dos derivados que consomem o limite de um principal (exceto `excetoId`). */
async function comprometidoNoPrincipal(tenantId: string, principalId: string, excetoId: string | null, hoje: string, exec: Exec = db): Promise<number> {
  const filhos = await exec
    .select()
    .from(schema.contratos)
    .where(and(eq(schema.contratos.tenantId, tenantId), eq(schema.contratos.contratoPrincipalId, principalId), eq(schema.contratos.vinculoValor, "consome_limite"), ne(schema.contratos.status, "cancelado")));
  let total = 0;
  for (const f of filhos) {
    if (f.id === excetoId) continue;
    const ads = await exec.select().from(schema.contratoAditivos).where(and(eq(schema.contratoAditivos.tenantId, tenantId), eq(schema.contratoAditivos.contratoId, f.id)));
    total += cents(valorDoContrato(f, ads, hoje).atualizado);
  }
  return total / 100;
}

// ───────────────────────────── Modalidades ─────────────────────────────

export async function salvarModalidade(input: { id?: string | null; nome: string; ativo?: boolean }): Promise<Resultado> {
  const s = await sessao("contratos", "editar", "Sem permissão para configurar modalidades.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const nome = txt(input.nome);
  if (!nome) return falha("Informe o nome da modalidade.");
  try {
    if (input.id) {
      const [m] = await db
        .update(schema.contratoModalidades)
        .set({ nome, ativo: input.ativo ?? true })
        .where(and(eq(schema.contratoModalidades.id, input.id), eq(schema.contratoModalidades.tenantId, ctx.tenant.id)))
        .returning({ id: schema.contratoModalidades.id });
      if (!m) return falha("Modalidade não encontrada.");
      await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "contrato.modalidade.update", entity: "contrato_modalidade", entityId: m.id, meta: { nome, ativo: input.ativo ?? true } });
      revalidatePath("/contratos/modalidades");
      return { ok: true, id: m.id };
    }
    const [{ ordem }] = await db.select({ ordem: max(schema.contratoModalidades.ordem) }).from(schema.contratoModalidades).where(eq(schema.contratoModalidades.tenantId, ctx.tenant.id));
    const [m] = await db.insert(schema.contratoModalidades).values({ tenantId: ctx.tenant.id, nome, ordem: (ordem ?? 0) + 1 }).returning({ id: schema.contratoModalidades.id });
    await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "contrato.modalidade.create", entity: "contrato_modalidade", entityId: m.id, meta: { nome } });
    revalidatePath("/contratos/modalidades");
    return { ok: true, id: m.id };
  } catch (e) {
    if (String((e as { code?: string })?.code) === "23505") return falha("Já existe uma modalidade com esse nome.");
    throw e;
  }
}

// ───────────────────────────── Contrato ─────────────────────────────

export interface DadosDoContrato {
  id?: string | null;
  versao?: number | null;
  titulo: string;
  numeroCliente?: string | null;
  clienteId?: string | null;
  objeto?: string | null;
  escopo?: string | null;
  modalidadeId?: string | null;
  tipo?: string | null;
  contratoPrincipalId?: string | null;
  vinculoValor?: string | null;
  gestor?: string | null;
  coordenadorTecnico?: string | null;
  responsavelComercial?: string | null;
  responsavelFinanceiro?: string | null;
  dataAssinatura?: string | null;
  dataInicio?: string | null;
  dataTerminoPrevista?: string | null;
  dataEncerramento?: string | null;
  dataBaseReajuste?: string | null;
  valorOriginal: number | string;
  moeda?: string | null;
  formaFaturamento?: string | null;
  condicaoPagamento?: string | null;
  periodicidadeMedicao?: string | null;
  prazoPagamentoDias?: number | string | null;
  indiceReajuste?: string | null;
  retencaoPct?: number | string | null;
  regrasReembolso?: string | null;
  /** projetos vinculados (só na criação; depois, por `vincularProjetos`). */
  projetos?: { projectId: string; valorAlocado?: number | string | null }[];
}

/**
 * Cria ou edita o cadastro. Depois de o contrato valer (ativo em diante), o
 * valor original e o prazo original não mudam mais: mudam por aditivo.
 * Edição com `versao` diferente da gravada é recusada (outra pessoa salvou).
 */
export async function salvarContrato(input: DadosDoContrato): Promise<Resultado> {
  const editando = !!input.id;
  const s = await sessao("contratos", editando ? "editar" : "criar", editando ? "Sem permissão para editar contratos." : "Sem permissão para criar contratos.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;

  const titulo = txt(input.titulo);
  if (!titulo) return falha("Informe o título do contrato.");
  const valorOriginal = num(input.valorOriginal);
  if (valorOriginal == null || valorOriginal < 0) return falha("Informe o valor original (zero ou mais).");
  const tipo = txt(input.tipo) ?? "contrato";
  if (!ehTipoContrato(tipo)) return falha("Tipo de contrato inválido.");
  const principalId = txt(input.contratoPrincipalId);
  const vinculo = txt(input.vinculoValor);
  if (tipo === "contrato" && principalId) return falha("Contrato com principal deve ser do tipo derivado ou ordem de serviço.");
  if (tipo !== "contrato") {
    if (!principalId) return falha("Derivado e ordem de serviço precisam do contrato principal.");
    if (!vinculo || !ehVinculo(vinculo)) return falha("Diga se o derivado consome o limite do principal ou se é valor adicional.");
  }
  const datas: Record<string, string | null> = {};
  for (const [k, rot] of [
    ["dataAssinatura", "Assinatura"],
    ["dataInicio", "Início"],
    ["dataTerminoPrevista", "Término previsto"],
    ["dataEncerramento", "Encerramento"],
    ["dataBaseReajuste", "Data-base de reajuste"],
  ] as const) {
    const d = data(input[k], rot);
    if (!d.ok) return falha(d.error);
    datas[k] = d.v;
  }
  if (datas.dataInicio && datas.dataTerminoPrevista && ymd(datas.dataTerminoPrevista)! < ymd(datas.dataInicio)!) return falha("O término previsto não pode ser antes do início.");
  const indice = txt(input.indiceReajuste);
  if (indice && !ehIndiceDeReajuste(indice)) return falha("Índice de reajuste inválido.");
  const retencao = input.retencaoPct == null || input.retencaoPct === "" ? null : num(input.retencaoPct);
  if (retencao != null && (retencao < 0 || retencao > 100)) return falha("Retenção deve ficar entre 0% e 100%.");
  const prazo = input.prazoPagamentoDias == null || input.prazoPagamentoDias === "" ? null : num(input.prazoPagamentoDias);
  if (prazo != null && (prazo < 0 || !Number.isInteger(prazo))) return falha("Prazo de pagamento em dias inteiros.");

  const clienteId = txt(input.clienteId);
  if (clienteId) {
    const [c] = await db.select({ id: schema.clientes.id }).from(schema.clientes).where(and(eq(schema.clientes.id, clienteId), eq(schema.clientes.tenantId, tenantId))).limit(1);
    if (!c) return falha("Cliente não encontrado.");
  }
  const modalidadeId = txt(input.modalidadeId);
  if (modalidadeId) {
    const [m] = await db.select({ id: schema.contratoModalidades.id }).from(schema.contratoModalidades).where(and(eq(schema.contratoModalidades.id, modalidadeId), eq(schema.contratoModalidades.tenantId, tenantId))).limit(1);
    if (!m) return falha("Modalidade não encontrada.");
  }
  const hoje = hojeMDY();
  if (principalId) {
    if (principalId === input.id) return falha("O contrato não pode ser principal de si mesmo.");
    const p = await contratoDaEmpresa(tenantId, principalId);
    if (!p) return falha("Contrato principal não encontrado.");
    if (p.tipo !== "contrato") return falha("O principal precisa ser um contrato (não um derivado ou ordem de serviço).");
    if (p.status === "cancelado" || p.status === "encerrado") return falha("O contrato principal está cancelado ou encerrado.");
    if (vinculo === "consome_limite") {
      const base = await db.select().from(schema.contratoAditivos).where(and(eq(schema.contratoAditivos.tenantId, tenantId), eq(schema.contratoAditivos.contratoId, p.id)));
      const valorPrincipal = valorDoContrato(p, base, hoje).atualizado;
      const outros = await comprometidoNoPrincipal(tenantId, p.id, input.id ?? null, hoje);
      let valorDeste = valorOriginal;
      if (input.id) {
        const ads = await db.select().from(schema.contratoAditivos).where(and(eq(schema.contratoAditivos.tenantId, tenantId), eq(schema.contratoAditivos.contratoId, input.id)));
        valorDeste = valorDoContrato({ valorOriginal }, ads, hoje).atualizado;
      }
      const r = recusaDeComprometimento(valorPrincipal, outros, valorDeste);
      if (r) return falha(r);
    }
  }
  const projetos = (input.projetos ?? []).filter((p) => p.projectId);
  for (const p of projetos) if (!ctx.projects.some((x) => x.id === p.projectId)) return falha("Projeto inválido.");

  const campos = {
    titulo,
    numeroCliente: txt(input.numeroCliente),
    clienteId,
    objeto: txt(input.objeto),
    escopo: txt(input.escopo),
    modalidadeId,
    tipo,
    contratoPrincipalId: principalId,
    vinculoValor: tipo === "contrato" ? null : vinculo,
    gestor: txt(input.gestor),
    coordenadorTecnico: txt(input.coordenadorTecnico),
    responsavelComercial: txt(input.responsavelComercial),
    responsavelFinanceiro: txt(input.responsavelFinanceiro),
    ...datas,
    moeda: txt(input.moeda) ?? "BRL",
    formaFaturamento: txt(input.formaFaturamento),
    condicaoPagamento: txt(input.condicaoPagamento),
    periodicidadeMedicao: txt(input.periodicidadeMedicao),
    prazoPagamentoDias: prazo,
    indiceReajuste: indice,
    retencaoPct: retencao == null ? null : String(retencao),
    regrasReembolso: txt(input.regrasReembolso),
  };

  if (!editando) {
    const codigo = await reservarNumero(tenantId, "contrato", "CT");
    const id = await db.transaction(async (tx) => {
      const [c] = await tx
        .insert(schema.contratos)
        .values({ tenantId, codigo, ...campos, valorOriginal: String(valorOriginal), createdBy: quem(ctx) })
        .returning({ id: schema.contratos.id });
      if (projetos.length)
        await tx.insert(schema.contratoProjetos).values(projetos.map((p) => ({ tenantId, contratoId: c.id, projectId: p.projectId, valorAlocado: num(p.valorAlocado) == null ? null : String(num(p.valorAlocado)) })));
      await logAudit({ tenantId, userId: ctx.userId, action: "contrato.create", entity: "contrato", entityId: c.id, meta: { codigo, titulo, valorOriginal, tipo, principalId, projetos: projetos.map((p) => p.projectId) } }, tx);
      return c.id;
    });
    revalidar(id);
    return { ok: true, id };
  }

  return db.transaction(async (tx) => {
    const atual = await contratoDaEmpresa(tenantId, input.id!, tx, true);
    if (!atual) return falha("Contrato não encontrado.");
    if (input.versao != null && atual.versao !== input.versao) return falha("O contrato foi alterado por outra pessoa. Recarregue a página e confira antes de salvar.");
    if (atual.status === "cancelado" || atual.status === "encerrado") return falha("Contrato cancelado ou encerrado não se edita.");
    const mudaValor = cents(atual.valorOriginal) !== cents(valorOriginal);
    const mudaPrazo = (atual.dataTerminoPrevista ?? null) !== datas.dataTerminoPrevista;
    if (!contratoEmPreparo(atual.status) && (mudaValor || mudaPrazo))
      return falha("Depois de o contrato valer, valor e prazo originais não mudam: registre um aditivo.");
    const depois = { ...campos, valorOriginal: String(valorOriginal) };
    await tx
      .update(schema.contratos)
      .set({ ...depois, versao: atual.versao + 1, updatedAt: new Date() })
      .where(and(eq(schema.contratos.id, atual.id), eq(schema.contratos.tenantId, tenantId)));
    const mudou: Record<string, { de: unknown; para: unknown }> = {};
    for (const [k, v] of Object.entries(campos)) {
      const de = (atual as Record<string, unknown>)[k] ?? null;
      const igual = k === "retencaoPct" ? cents(de as string) === cents(v as string) : String(de) === String(v ?? null);
      if (!igual) mudou[k] = { de, para: v };
    }
    if (mudaValor) mudou.valorOriginal = { de: atual.valorOriginal, para: valorOriginal };
    await logAudit({ tenantId, userId: ctx.userId, action: "contrato.update", entity: "contrato", entityId: atual.id, meta: { codigo: atual.codigo, mudou } }, tx);
    revalidar(atual.id);
    return { ok: true as const, id: atual.id };
  });
}

/** Muda a situação do contrato. Cancelar, suspender e encerrar pedem motivo. */
export async function mudarStatusContrato(input: { id: string; para: string; motivo?: string | null; dataEncerramento?: string | null }): Promise<Resultado> {
  const s = await sessao("contratos", "editar", "Sem permissão para mudar a situação do contrato.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const motivo = txt(input.motivo);
  if (["cancelado", "suspenso", "encerrado"].includes(input.para) && !motivo) return falha("Informe o motivo.");
  return db.transaction(async (tx) => {
    const c = await contratoDaEmpresa(ctx.tenant.id, input.id, tx, true);
    if (!c) return falha("Contrato não encontrado.");
    const r = recusaTransicaoContrato(c.status, input.para);
    if (r) return falha(r);
    if (input.para === "cancelado") {
      const [m] = await tx
        .select({ id: schema.contratoMedicoes.id })
        .from(schema.contratoMedicoes)
        .where(and(eq(schema.contratoMedicoes.contratoId, c.id), eq(schema.contratoMedicoes.status, "aprovada")))
        .limit(1);
      if (m) return falha("Há medições aprovadas: cancele-as antes de cancelar o contrato (ou encerre-o).");
    }
    const enc = data(input.dataEncerramento, "Encerramento");
    if (!enc.ok) return falha(enc.error);
    await tx
      .update(schema.contratos)
      .set({ status: input.para, motivoStatus: motivo, versao: c.versao + 1, updatedAt: new Date(), ...(input.para === "encerrado" ? { dataEncerramento: enc.v ?? hojeMDY() } : {}) })
      .where(eq(schema.contratos.id, c.id));
    await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "contrato.status", entity: "contrato", entityId: c.id, meta: { codigo: c.codigo, de: c.status, para: input.para, motivo } }, tx);
    revalidar(c.id);
    return { ok: true as const, id: c.id };
  });
}

/**
 * Projetos do contrato (substitui a lista). Projeto com medição ou fatura do
 * contrato não sai. Alocações não passam do valor atualizado (aviso, não bloqueio).
 */
export async function vincularProjetos(input: { contratoId: string; projetos: { projectId: string; valorAlocado?: number | string | null }[] }): Promise<Resultado> {
  const s = await sessao("contratos", "editar", "Sem permissão para editar contratos.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const lista = input.projetos.filter((p) => p.projectId);
  if (new Set(lista.map((p) => p.projectId)).size !== lista.length) return falha("Projeto repetido.");
  for (const p of lista) {
    if (!ctx.projects.some((x) => x.id === p.projectId)) return falha("Projeto inválido.");
    const v = p.valorAlocado == null || p.valorAlocado === "" ? null : num(p.valorAlocado);
    if (v != null && v < 0) return falha("Valor alocado não pode ser negativo.");
  }
  return db.transaction(async (tx) => {
    const c = await contratoDaEmpresa(tenantId, input.contratoId, tx, true);
    if (!c) return falha("Contrato não encontrado.");
    const atuais = await tx.select().from(schema.contratoProjetos).where(and(eq(schema.contratoProjetos.tenantId, tenantId), eq(schema.contratoProjetos.contratoId, c.id)));
    const saem = atuais.filter((a) => !lista.some((p) => p.projectId === a.projectId)).map((a) => a.projectId);
    if (saem.length) {
      const [m] = await tx.select({ id: schema.contratoMedicoes.id }).from(schema.contratoMedicoes).where(and(eq(schema.contratoMedicoes.contratoId, c.id), inArray(schema.contratoMedicoes.projectId, saem), ne(schema.contratoMedicoes.status, "cancelada"))).limit(1);
      const [f] = await tx.select({ id: schema.contasReceber.id }).from(schema.contasReceber).where(and(eq(schema.contasReceber.contratoId, c.id), inArray(schema.contasReceber.projectId, saem), eq(schema.contasReceber.cancelado, false))).limit(1);
      if (m || f) return falha("Um dos projetos retirados tem medição ou fatura deste contrato: ele não pode sair.");
      await tx.delete(schema.contratoProjetos).where(and(eq(schema.contratoProjetos.contratoId, c.id), inArray(schema.contratoProjetos.projectId, saem)));
    }
    for (const p of lista) {
      const v = p.valorAlocado == null || p.valorAlocado === "" ? null : String(num(p.valorAlocado));
      await tx
        .insert(schema.contratoProjetos)
        .values({ tenantId, contratoId: c.id, projectId: p.projectId, valorAlocado: v })
        .onConflictDoUpdate({ target: [schema.contratoProjetos.contratoId, schema.contratoProjetos.projectId], set: { valorAlocado: v } });
    }
    await logAudit({ tenantId, userId: ctx.userId, action: "contrato.projetos", entity: "contrato", entityId: c.id, meta: { codigo: c.codigo, de: atuais.map((a) => ({ projectId: a.projectId, valorAlocado: a.valorAlocado })), para: lista } }, tx);
    const base = await baseDoContrato(tenantId, c.id, tx);
    const atualizado = valorDoContrato(c, base.aditivos, hojeMDY()).atualizado;
    const alocado = lista.reduce((s2, p) => s2 + cents(num(p.valorAlocado) ?? 0), 0) / 100;
    revalidar(c.id);
    return { ok: true as const, id: c.id, aviso: alocado > atualizado + 0.005 ? "A soma alocada aos projetos passa do valor atualizado do contrato." : undefined };
  });
}

// ───────────────────────────── Itens ─────────────────────────────

export interface DadosDoItem {
  id?: string | null;
  contratoId: string;
  /** item novo incluído por aditivo (só com o aditivo em rascunho/negociação). */
  origemAditivoId?: string | null;
  codigo: string;
  descricao: string;
  unidade?: string | null;
  quantidade: number | string;
  valorUnitario: number | string;
  projectId?: string | null;
  etapa?: string | null;
  inicioPrevisto?: string | null;
  conclusaoPrevista?: string | null;
  criterioMedicao: string;
  condicaoFaturamento?: string | null;
  responsavel?: string | null;
  status?: string | null;
}

/**
 * Item contratual. Antes de o contrato valer, livre. Depois, item novo só
 * por aditivo, e quantidade/valor dos itens existentes só mudam por variação
 * de aditivo; o resto (etapa, datas, responsável, situação) segue editável.
 */
export async function salvarItem(input: DadosDoItem): Promise<Resultado> {
  const s = await sessao("contratos", input.id ? "editar" : "criar", "Sem permissão para editar itens do contrato.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const codigo = txt(input.codigo);
  const descricao = txt(input.descricao);
  if (!codigo || !descricao) return falha("Informe código e descrição do item.");
  const quantidade = num(input.quantidade);
  const unitario = num(input.valorUnitario);
  if (quantidade == null || quantidade <= 0) return falha("Quantidade deve ser maior que zero.");
  if (unitario == null || unitario < 0) return falha("Valor unitário deve ser zero ou mais.");
  if (!ehCriterio(input.criterioMedicao)) return falha("Escolha o critério de medição.");
  const projectId = txt(input.projectId);
  const ini = data(input.inicioPrevisto, "Início previsto");
  const fim = data(input.conclusaoPrevista, "Conclusão prevista");
  if (!ini.ok) return falha(ini.error);
  if (!fim.ok) return falha(fim.error);
  return db.transaction(async (tx) => {
    const c = await contratoDaEmpresa(tenantId, input.contratoId, tx, true);
    if (!c) return falha("Contrato não encontrado.");
    if (c.status === "cancelado" || c.status === "encerrado") return falha("Contrato cancelado ou encerrado não se edita.");
    if (projectId) {
      const [vp] = await tx.select({ id: schema.contratoProjetos.id }).from(schema.contratoProjetos).where(and(eq(schema.contratoProjetos.contratoId, c.id), eq(schema.contratoProjetos.projectId, projectId))).limit(1);
      if (!vp) return falha("O projeto do item precisa estar vinculado ao contrato.");
    }
    const origem = txt(input.origemAditivoId);
    if (origem) {
      const [a] = await tx.select().from(schema.contratoAditivos).where(and(eq(schema.contratoAditivos.id, origem), eq(schema.contratoAditivos.contratoId, c.id))).limit(1);
      if (!a) return falha("Aditivo não encontrado.");
      if (!statusDoAditivoEditavel(a.status)) return falha("O aditivo já saiu de rascunho/negociação: os itens dele não mudam mais.");
    }
    const total = totalDoItem(quantidade, unitario);
    const comum = {
      descricao,
      unidade: txt(input.unidade),
      projectId,
      etapa: txt(input.etapa),
      inicioPrevisto: ini.v,
      conclusaoPrevista: fim.v,
      criterioMedicao: input.criterioMedicao,
      condicaoFaturamento: txt(input.condicaoFaturamento),
      responsavel: txt(input.responsavel),
      status: txt(input.status) ?? "ativo",
    };
    try {
      if (!input.id) {
        if (!origem && !contratoEmPreparo(c.status)) return falha("Com o contrato valendo, item novo entra por aditivo (inclusão de serviços).");
        const [{ ordem }] = await tx.select({ ordem: max(schema.contratoItens.ordem) }).from(schema.contratoItens).where(eq(schema.contratoItens.contratoId, c.id));
        const [i] = await tx
          .insert(schema.contratoItens)
          .values({ tenantId, contratoId: c.id, codigo, ...comum, quantidade: String(quantidade), valorUnitario: String(unitario), valorTotal: String(total), origemAditivoId: origem, ordem: (ordem ?? 0) + 1 })
          .returning({ id: schema.contratoItens.id });
        await logAudit({ tenantId, userId: ctx.userId, action: "contrato.item.create", entity: "contrato_item", entityId: i.id, meta: { contrato: c.codigo, codigo, descricao, quantidade, valorUnitario: unitario, valorTotal: total, origemAditivoId: origem } }, tx);
        revalidar(c.id);
        return { ok: true as const, id: i.id };
      }
      const [atual] = await tx.select().from(schema.contratoItens).where(and(eq(schema.contratoItens.id, input.id), eq(schema.contratoItens.contratoId, c.id), eq(schema.contratoItens.tenantId, tenantId))).limit(1);
      if (!atual) return falha("Item não encontrado.");
      if (atual.cancelado) return falha("Item cancelado não se edita.");
      const mudaValor = cents(atual.valorTotal) !== cents(total) || Number(atual.quantidade) !== quantidade || atual.codigo !== codigo;
      let livre = contratoEmPreparo(c.status);
      if (atual.origemAditivoId) {
        const [a] = await tx.select({ status: schema.contratoAditivos.status }).from(schema.contratoAditivos).where(eq(schema.contratoAditivos.id, atual.origemAditivoId)).limit(1);
        livre = !!a && statusDoAditivoEditavel(a.status);
      }
      if (mudaValor && !livre) return falha("Com o contrato valendo, código, quantidade e valor do item mudam por aditivo.");
      await tx
        .update(schema.contratoItens)
        .set({ ...comum, codigo, quantidade: String(quantidade), valorUnitario: String(unitario), valorTotal: String(total) })
        .where(eq(schema.contratoItens.id, atual.id));
      await logAudit({ tenantId, userId: ctx.userId, action: "contrato.item.update", entity: "contrato_item", entityId: atual.id, meta: { contrato: c.codigo, codigo, de: { quantidade: atual.quantidade, valorTotal: atual.valorTotal }, para: { quantidade, valorTotal: total } } }, tx);
      revalidar(c.id);
      return { ok: true as const, id: atual.id };
    } catch (e) {
      if (String((e as { code?: string })?.code) === "23505") return falha("Já existe um item com esse código neste contrato.");
      throw e;
    }
  });
}

/** Cancela (logicamente) um item sem medição ativa. */
export async function cancelarItem(input: { id: string; motivo: string }): Promise<Resultado> {
  const s = await sessao("contratos", "excluir", "Sem permissão para cancelar itens.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  if (!txt(input.motivo)) return falha("Informe o motivo.");
  return db.transaction(async (tx) => {
    const [i] = await tx.select().from(schema.contratoItens).where(and(eq(schema.contratoItens.id, input.id), eq(schema.contratoItens.tenantId, ctx.tenant.id))).limit(1);
    if (!i) return falha("Item não encontrado.");
    const c = await contratoDaEmpresa(ctx.tenant.id, i.contratoId, tx, true);
    if (!c) return falha("Contrato não encontrado.");
    if (!contratoEmPreparo(c.status) && !i.origemAditivoId) return falha("Com o contrato valendo, item sai por aditivo (exclusão de serviços).");
    const [m] = await tx.select({ id: schema.contratoMedicoes.id }).from(schema.contratoMedicoes).where(and(eq(schema.contratoMedicoes.itemId, i.id), ne(schema.contratoMedicoes.status, "cancelada"), ne(schema.contratoMedicoes.status, "rejeitada"))).limit(1);
    if (m) return falha("O item tem medição: não pode ser cancelado.");
    await tx.update(schema.contratoItens).set({ cancelado: true, status: "cancelado" }).where(eq(schema.contratoItens.id, i.id));
    await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "contrato.item.cancel", entity: "contrato_item", entityId: i.id, meta: { contrato: c.codigo, codigo: i.codigo, motivo: input.motivo } }, tx);
    revalidar(c.id);
    return { ok: true as const, id: i.id };
  });
}

// ───────────────────────────── Aditivos ─────────────────────────────

export interface DadosDoAditivo {
  id?: string | null;
  contratoId: string;
  tipos: string[];
  descricao?: string | null;
  justificativa?: string | null;
  valorDelta: number | string;
  novoTermino?: string | null;
  dataSolicitacao?: string | null;
  inicioVigencia?: string | null;
  responsavel?: string | null;
  /** variações de itens existentes. */
  variacoes?: { itemId: string; deltaQuantidade?: number | string | null; deltaValor: number | string }[];
}

/** Cria ou edita um aditivo em rascunho/negociação. O número é sequencial por contrato. */
export async function salvarAditivo(input: DadosDoAditivo): Promise<Resultado> {
  const s = await sessao("contratosaditivos", input.id ? "editar" : "criar", "Sem permissão para registrar aditivos.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const tipos = [...new Set(input.tipos ?? [])];
  if (!tipos.length || !tipos.every(ehTipoAditivo)) return falha("Escolha ao menos um tipo de alteração válido.");
  const delta = num(input.valorDelta) ?? 0;
  if (tipos.includes("acrescimo_valor") && delta <= 0) return falha("Acréscimo de valor precisa de variação positiva.");
  if (tipos.includes("reducao_valor") && delta >= 0) return falha("Redução de valor precisa de variação negativa.");
  if (delta !== 0 && !tipos.includes("acrescimo_valor") && !tipos.includes("reducao_valor") && !tipos.includes("inclusao_servicos") && !tipos.includes("exclusao_servicos"))
    return falha("Variação de valor pede o tipo acréscimo, redução, inclusão ou exclusão de serviços.");
  const novo = data(input.novoTermino, "Novo término");
  const sol = data(input.dataSolicitacao, "Solicitação");
  const vig = data(input.inicioVigencia, "Início de vigência");
  for (const d of [novo, sol, vig]) if (!d.ok) return falha(d.error);
  if (tipos.includes("prorrogacao_prazo") && !(novo.ok && novo.v)) return falha("Prorrogação de prazo precisa do novo término.");
  if (!txt(input.justificativa)) return falha("Informe a justificativa do aditivo.");
  const variacoes = (input.variacoes ?? []).filter((v) => v.itemId && (num(v.deltaValor) || num(v.deltaQuantidade)));

  return db.transaction(async (tx) => {
    const c = await contratoDaEmpresa(tenantId, input.contratoId, tx, true);
    if (!c) return falha("Contrato não encontrado.");
    if (!contratoEmExecucao(c.status) && c.status !== "suspenso") return falha("Aditivo só em contrato ativo, suspenso ou concluído.");
    if (variacoes.length) {
      const ids = variacoes.map((v) => v.itemId);
      const itens = await tx.select({ id: schema.contratoItens.id }).from(schema.contratoItens).where(and(eq(schema.contratoItens.contratoId, c.id), inArray(schema.contratoItens.id, ids), eq(schema.contratoItens.cancelado, false)));
      if (itens.length !== new Set(ids).size) return falha("Item da variação não encontrado neste contrato.");
    }
    const campos = {
      tipos,
      descricao: txt(input.descricao),
      justificativa: txt(input.justificativa),
      valorDelta: String(delta),
      novoTermino: novo.ok ? novo.v : null,
      dataSolicitacao: sol.ok ? sol.v : null,
      inicioVigencia: vig.ok ? vig.v : null,
      responsavel: txt(input.responsavel),
    };
    let id = input.id ?? "";
    if (!input.id) {
      const [{ n }] = await tx.select({ n: max(schema.contratoAditivos.numero) }).from(schema.contratoAditivos).where(eq(schema.contratoAditivos.contratoId, c.id));
      const numero = (n ?? 0) + 1;
      const [a] = await tx
        .insert(schema.contratoAditivos)
        .values({ tenantId, contratoId: c.id, numero, codigo: codigoDoAditivo(c.codigo, numero), ...campos, createdBy: quem(ctx) })
        .returning({ id: schema.contratoAditivos.id });
      id = a.id;
      await logAudit({ tenantId, userId: ctx.userId, action: "contrato.aditivo.create", entity: "contrato_aditivo", entityId: id, meta: { contrato: c.codigo, numero, ...campos, variacoes } }, tx);
    } else {
      const [a] = await tx.select().from(schema.contratoAditivos).where(and(eq(schema.contratoAditivos.id, input.id), eq(schema.contratoAditivos.contratoId, c.id), eq(schema.contratoAditivos.tenantId, tenantId))).limit(1);
      if (!a) return falha("Aditivo não encontrado.");
      if (!statusDoAditivoEditavel(a.status)) return falha("Aditivo fora de rascunho/negociação não se edita: cancele com motivo ou registre outro aditivo.");
      await tx.update(schema.contratoAditivos).set({ ...campos, updatedAt: new Date() }).where(eq(schema.contratoAditivos.id, a.id));
      await tx.delete(schema.contratoAditivoItens).where(eq(schema.contratoAditivoItens.aditivoId, a.id));
      await logAudit({ tenantId, userId: ctx.userId, action: "contrato.aditivo.update", entity: "contrato_aditivo", entityId: a.id, meta: { contrato: c.codigo, numero: a.numero, de: { valorDelta: a.valorDelta, novoTermino: a.novoTermino, tipos: a.tipos }, para: campos, variacoes } }, tx);
    }
    if (variacoes.length)
      await tx.insert(schema.contratoAditivoItens).values(variacoes.map((v) => ({ tenantId, aditivoId: id, itemId: v.itemId, deltaQuantidade: String(num(v.deltaQuantidade) ?? 0), deltaValor: String(num(v.deltaValor) ?? 0) })));
    revalidar(c.id);
    revalidatePath("/contratos/aditivos");
    return { ok: true as const, id };
  });
}

/**
 * Situação do aditivo. Aprovar/rejeitar e cancelar o formalizado exigem
 * `contratosaprovar`. Assinar exige a data de assinatura e confere que a
 * redução não deixa item nem contrato abaixo do já medido e aprovado.
 */
export async function mudarStatusAditivo(input: { id: string; para: string; motivo?: string | null; dataAssinatura?: string | null; dataAprovacao?: string | null; inicioVigencia?: string | null }): Promise<Resultado> {
  const ctx = await getTenantContext();
  if (!ctx) return falha(SEM_SESSAO);
  if (!can(ctx.perms, "contratosaditivos", "editar") && !can(ctx.perms, "contratosaprovar", "editar")) return falha("Sem permissão para mudar aditivos.");
  const podeAprovar = can(ctx.perms, "contratosaprovar", "editar");
  const tenantId = ctx.tenant.id;
  const motivo = txt(input.motivo);
  if (["cancelado", "rejeitado"].includes(input.para) && !motivo) return falha("Informe o motivo.");
  return db.transaction(async (tx) => {
    const [a0] = await tx.select().from(schema.contratoAditivos).where(and(eq(schema.contratoAditivos.id, input.id), eq(schema.contratoAditivos.tenantId, tenantId))).limit(1);
    if (!a0) return falha("Aditivo não encontrado.");
    const c = await contratoDaEmpresa(tenantId, a0.contratoId, tx, true);
    if (!c) return falha("Contrato não encontrado.");
    const [a] = await tx.select().from(schema.contratoAditivos).where(eq(schema.contratoAditivos.id, a0.id)).limit(1).for("update");
    const r = recusaTransicaoAditivo(a.status, input.para, podeAprovar);
    if (r) return falha(r);
    const set: Partial<typeof schema.contratoAditivos.$inferInsert> = { status: input.para, motivoStatus: motivo, updatedAt: new Date() };
    if (input.para === "aprovado") {
      const d = data(input.dataAprovacao, "Aprovação");
      if (!d.ok) return falha(d.error);
      set.dataAprovacao = d.v ?? hojeMDY();
      set.aprovadoPor = quem(ctx);
    }
    if (input.para === "assinado") {
      const d = data(input.dataAssinatura, "Assinatura");
      if (!d.ok) return falha(d.error);
      if (!d.v) return falha("Informe a data de assinatura.");
      set.dataAssinatura = d.v;
      const v = data(input.inicioVigencia, "Início de vigência");
      if (!v.ok) return falha(v.error);
      if (v.v) set.inicioVigencia = v.v;
    }
    // Assinar (ou cancelar um aditivo assinado) muda o limite: o já aprovado precisa caber.
    if (input.para === "assinado" || (a.status === "assinado" && input.para === "cancelado")) {
      const base = await baseDoContrato(tenantId, c.id, tx);
      const simulados = base.aditivos.map((x) => (x.id === a.id ? { ...x, ...set, status: input.para === "assinado" ? "assinado" : "cancelado" } : x));
      const hojeRef = "12/31/9999"; // o limite que o aditivo vai produzir quando valer
      const lim = limitesDosItens(base.itens.map((i) => ({ ...i, cancelado: i.cancelado })), base.variacoes, simulados, hojeRef);
      const total = valorDoContrato(c, simulados, hojeRef).atualizado;
      const aprovadas = base.medicoes.filter((m) => m.status === "aprovada");
      const medidoTotal = aprovadas.reduce((s2, m) => s2 + cents(m.valor), 0);
      if (medidoTotal > cents(total)) return falha("Com este aditivo o valor do contrato fica abaixo do já medido e aprovado.");
      for (const [itemId, l] of lim) {
        const medido = aprovadas.filter((m) => m.itemId === itemId).reduce((s2, m) => s2 + cents(m.valor), 0);
        if (medido > cents(l.limite)) return falha("Com este aditivo um item fica abaixo do já medido e aprovado nele.");
      }
      if (c.contratoPrincipalId && c.vinculoValor === "consome_limite" && input.para === "assinado" && cents(a.valorDelta) > 0) {
        const p = await contratoDaEmpresa(tenantId, c.contratoPrincipalId, tx);
        if (p) {
          const ap = await tx.select().from(schema.contratoAditivos).where(eq(schema.contratoAditivos.contratoId, p.id));
          const outros = await comprometidoNoPrincipal(tenantId, p.id, c.id, hojeRef, tx);
          const rr = recusaDeComprometimento(valorDoContrato(p, ap, hojeRef).atualizado, outros, total);
          if (rr) return falha(rr);
        }
      }
    }
    await tx.update(schema.contratoAditivos).set(set).where(eq(schema.contratoAditivos.id, a.id));
    await logAudit({ tenantId, userId: ctx.userId, action: "contrato.aditivo.status", entity: "contrato_aditivo", entityId: a.id, meta: { contrato: c.codigo, aditivo: a.codigo, de: a.status, para: input.para, motivo, valorDelta: a.valorDelta, dataAssinatura: set.dataAssinatura ?? a.dataAssinatura } }, tx);
    revalidar(c.id);
    revalidatePath("/contratos/aditivos");
    return { ok: true as const, id: a.id };
  });
}

// ───────────────────────────── Cronograma ─────────────────────────────

export async function salvarMarco(input: {
  id?: string | null;
  contratoId: string;
  itemId?: string | null;
  etapa: string;
  descricao?: string | null;
  dataPlanejada?: string | null;
  dataRealizada?: string | null;
  valorPrevisto: number | string;
  responsavel?: string | null;
  status?: string | null;
}): Promise<Resultado> {
  const s = await sessao("contratos", input.id ? "editar" : "criar", "Sem permissão para editar o cronograma.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const etapa = txt(input.etapa);
  if (!etapa) return falha("Informe a etapa ou marco.");
  const valor = num(input.valorPrevisto) ?? 0;
  if (valor < 0) return falha("Valor previsto não pode ser negativo.");
  const status = txt(input.status) ?? "previsto";
  if (!ehStatusMarco(status)) return falha("Situação do marco inválida.");
  const dp = data(input.dataPlanejada, "Data planejada");
  const dr = data(input.dataRealizada, "Data realizada");
  if (!dp.ok) return falha(dp.error);
  if (!dr.ok) return falha(dr.error);
  const c = await contratoDaEmpresa(tenantId, input.contratoId);
  if (!c) return falha("Contrato não encontrado.");
  const itemId = txt(input.itemId);
  if (itemId) {
    const [i] = await db.select({ id: schema.contratoItens.id }).from(schema.contratoItens).where(and(eq(schema.contratoItens.id, itemId), eq(schema.contratoItens.contratoId, c.id))).limit(1);
    if (!i) return falha("Item não encontrado neste contrato.");
  }
  const campos = { itemId, etapa, descricao: txt(input.descricao), dataPlanejada: dp.v, dataRealizada: dr.v, valorPrevisto: String(valor), responsavel: txt(input.responsavel), status };
  let id = input.id ?? "";
  if (input.id) {
    const [m] = await db.update(schema.contratoMarcos).set(campos).where(and(eq(schema.contratoMarcos.id, input.id), eq(schema.contratoMarcos.contratoId, c.id), eq(schema.contratoMarcos.tenantId, tenantId))).returning({ id: schema.contratoMarcos.id });
    if (!m) return falha("Marco não encontrado.");
  } else {
    const [{ ordem }] = await db.select({ ordem: max(schema.contratoMarcos.ordem) }).from(schema.contratoMarcos).where(eq(schema.contratoMarcos.contratoId, c.id));
    const [m] = await db.insert(schema.contratoMarcos).values({ tenantId, contratoId: c.id, ...campos, ordem: (ordem ?? 0) + 1 }).returning({ id: schema.contratoMarcos.id });
    id = m.id;
  }
  await logAudit({ tenantId, userId: ctx.userId, action: input.id ? "contrato.marco.update" : "contrato.marco.create", entity: "contrato_marco", entityId: id, meta: { contrato: c.codigo, ...campos } });
  revalidar(c.id);
  return { ok: true, id };
}

// ───────────────────────────── Medições ─────────────────────────────

export interface DadosDaMedicao {
  id?: string | null;
  contratoId: string;
  itemId?: string | null;
  projectId?: string | null;
  marcoId?: string | null;
  etapa?: string | null;
  competencia: string;
  quantidade?: number | string | null;
  percentual?: number | string | null;
  valor?: number | string | null;
  responsavel?: string | null;
  dataMedicao?: string | null;
  obs?: string | null;
  /** "enviar" já envia para análise; senão fica em rascunho. */
  enviar?: boolean;
  /** chave gerada pela tela: a mesma medição enviada duas vezes entra uma vez. */
  idempotencyKey?: string | null;
}

/** Cria ou edita (só em rascunho) uma medição. O valor sai do critério do item. */
export async function salvarMedicao(input: DadosDaMedicao): Promise<Resultado> {
  const s = await sessao("contratosmedicao", input.id ? "editar" : "criar", "Sem permissão para lançar medições de contrato.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  if (!competenciaValida(input.competencia)) return falha("Informe o período de referência (MM/AAAA).");
  const dm = data(input.dataMedicao, "Data da medição");
  if (!dm.ok) return falha(dm.error);
  const idem = txt(input.idempotencyKey);
  if (idem && !input.id) {
    const [ja] = await db.select({ id: schema.contratoMedicoes.id }).from(schema.contratoMedicoes).where(and(eq(schema.contratoMedicoes.tenantId, tenantId), eq(schema.contratoMedicoes.idempotencyKey, idem))).limit(1);
    if (ja) return { ok: true, id: ja.id, aviso: "Esta medição já tinha sido registrada." };
  }
  const c = await contratoDaEmpresa(tenantId, input.contratoId);
  if (!c) return falha("Contrato não encontrado.");
  if (!contratoEmExecucao(c.status)) return falha("Medição só em contrato ativo ou concluído.");
  const base = await baseDoContrato(tenantId, c.id);
  const hoje = hojeMDY();
  const limites = limitesDosItens(base.itens, base.variacoes, base.aditivos, hoje);
  const itemId = txt(input.itemId);
  const itensVigentes = base.itens.filter((i) => limites.get(i.id)?.vigente);
  if (!itemId && itensVigentes.length) return falha("Escolha o item contratual medido.");
  const item = itemId ? base.itens.find((i) => i.id === itemId) : null;
  if (itemId && (!item || !limites.get(itemId)?.vigente)) return falha("Item não vigente neste contrato.");
  const projectId = txt(input.projectId) ?? item?.projectId ?? null;
  if (projectId) {
    const [vp] = await db.select({ id: schema.contratoProjetos.id }).from(schema.contratoProjetos).where(and(eq(schema.contratoProjetos.contratoId, c.id), eq(schema.contratoProjetos.projectId, projectId))).limit(1);
    if (!vp) return falha("O projeto precisa estar vinculado ao contrato.");
  }
  const marcoId = txt(input.marcoId);
  if (marcoId) {
    const [m] = await db.select({ id: schema.contratoMarcos.id }).from(schema.contratoMarcos).where(and(eq(schema.contratoMarcos.id, marcoId), eq(schema.contratoMarcos.contratoId, c.id))).limit(1);
    if (!m) return falha("Marco não encontrado neste contrato.");
  }
  const criterio = item?.criterioMedicao ?? "entrega";
  const quantidade = num(input.quantidade);
  const percentual = num(input.percentual);
  const calc = valorDaMedicao(criterio, { quantidade, percentual, valorInformado: num(input.valor) }, item ? { valorUnitario: item.valorUnitario, limite: limites.get(item.id)!.limite } : null);
  if ("erro" in calc) return falha(calc.erro);
  const campos = {
    itemId,
    projectId,
    marcoId,
    etapa: txt(input.etapa) ?? item?.etapa ?? null,
    competencia: input.competencia.trim(),
    quantidade: quantidade == null ? null : String(quantidade),
    percentual: percentual == null ? null : String(percentual),
    valor: String(calc.valor),
    responsavel: txt(input.responsavel),
    dataMedicao: dm.v ?? hoje,
    obs: txt(input.obs),
  };
  // Aviso cedo (a trava de verdade é na aprovação): já passaria do limite?
  const aviso = recusaDeLimite({ id: input.id ?? "nova", itemId, valor: calc.valor }, base.medicoes, valorDoContrato(c, base.aditivos, hoje).atualizado, limites) ?? undefined;
  if (!input.id) {
    try {
      const [m] = await db
        .insert(schema.contratoMedicoes)
        .values({ tenantId, contratoId: c.id, ...campos, status: input.enviar ? "enviada" : "rascunho", idempotencyKey: idem, createdBy: quem(ctx) })
        .returning({ id: schema.contratoMedicoes.id });
      await logAudit({ tenantId, userId: ctx.userId, action: "contrato.medicao.create", entity: "contrato_medicao", entityId: m.id, meta: { contrato: c.codigo, ...campos, status: input.enviar ? "enviada" : "rascunho" } });
      revalidar(c.id);
      revalidatePath("/contratos/medicoes");
      return { ok: true, id: m.id, aviso };
    } catch (e) {
      if (idem && String((e as { code?: string })?.code) === "23505") {
        const [ja] = await db.select({ id: schema.contratoMedicoes.id }).from(schema.contratoMedicoes).where(and(eq(schema.contratoMedicoes.tenantId, tenantId), eq(schema.contratoMedicoes.idempotencyKey, idem))).limit(1);
        return { ok: true, id: ja?.id, aviso: "Esta medição já tinha sido registrada." };
      }
      throw e;
    }
  }
  const atual = base.medicoes.find((m) => m.id === input.id);
  if (!atual) return falha("Medição não encontrada.");
  if (atual.status !== "rascunho") return falha("Só medição em rascunho se edita.");
  await db.update(schema.contratoMedicoes).set({ ...campos, ...(input.enviar ? { status: "enviada" } : {}) }).where(eq(schema.contratoMedicoes.id, atual.id));
  await logAudit({ tenantId, userId: ctx.userId, action: "contrato.medicao.update", entity: "contrato_medicao", entityId: atual.id, meta: { contrato: c.codigo, de: { valor: atual.valor }, para: campos } });
  revalidar(c.id);
  revalidatePath("/contratos/medicoes");
  return { ok: true, id: atual.id, aviso };
}

/**
 * Situação da medição. Aprovar trava o contrato (FOR UPDATE): duas
 * aprovações simultâneas do mesmo contrato acontecem uma depois da outra e a
 * segunda já enxerga a primeira — o limite nunca é ultrapassado.
 */
export async function mudarStatusMedicao(input: { id: string; para: string; motivo?: string | null }): Promise<Resultado> {
  const ctx = await getTenantContext();
  if (!ctx) return falha(SEM_SESSAO);
  const podeAprovar = can(ctx.perms, "contratosaprovar", "editar");
  if (!can(ctx.perms, "contratosmedicao", "editar") && !podeAprovar) return falha("Sem permissão para mudar medições.");
  const motivo = txt(input.motivo);
  if (["rejeitada", "cancelada"].includes(input.para) && !motivo) return falha("Informe o motivo.");
  const tenantId = ctx.tenant.id;
  return db.transaction(async (tx) => {
    const [m0] = await tx.select().from(schema.contratoMedicoes).where(and(eq(schema.contratoMedicoes.id, input.id), eq(schema.contratoMedicoes.tenantId, tenantId))).limit(1);
    if (!m0) return falha("Medição não encontrada.");
    const c = await contratoDaEmpresa(tenantId, m0.contratoId, tx, true);
    if (!c) return falha("Contrato não encontrado.");
    const [m] = await tx.select().from(schema.contratoMedicoes).where(eq(schema.contratoMedicoes.id, m0.id)).limit(1);
    const r = recusaTransicaoMedicao(m.status, input.para, podeAprovar);
    if (r) return falha(r);
    if (input.para === "aprovada") {
      if (!contratoEmExecucao(c.status)) return falha("Medição só se aprova em contrato ativo ou concluído.");
      const base = await baseDoContrato(tenantId, c.id, tx);
      const hoje = hojeMDY();
      const limites = limitesDosItens(base.itens, base.variacoes, base.aditivos, hoje);
      const rr = recusaDeLimite({ id: m.id, itemId: m.itemId, valor: m.valor }, base.medicoes, valorDoContrato(c, base.aditivos, hoje).atualizado, limites);
      if (rr) return falha(rr);
    }
    await tx
      .update(schema.contratoMedicoes)
      .set({ status: input.para, motivoStatus: motivo, ...(input.para === "aprovada" ? { aprovadoPor: quem(ctx), aprovadoEm: new Date() } : {}) })
      .where(eq(schema.contratoMedicoes.id, m.id));
    await logAudit({ tenantId, userId: ctx.userId, action: "contrato.medicao.status", entity: "contrato_medicao", entityId: m.id, meta: { contrato: c.codigo, de: m.status, para: input.para, valor: m.valor, motivo } }, tx);
    revalidar(c.id);
    revalidatePath("/contratos/medicoes");
    return { ok: true as const, id: m.id };
  });
}

// ───────────────────────────── Faturamento ─────────────────────────────

/**
 * Fatura do contrato = conta a receber com `contrato_id`. É o MESMO registro
 * que a tela de Contas a Receber cria, com as mesmas consequências de sempre
 * (DRE e Fluxo leem a conta pelo vencimento). Recebimento e conciliação
 * continuam em Contas a Receber. Idempotente pela chave da tela.
 */
export async function faturarContrato(input: { contratoId: string; projectId: string; valor: number | string; vencimento: string; descricao?: string | null; idempotencyKey?: string | null }): Promise<Resultado> {
  const s = await sessao("contratosfinanceiro", "criar", "Sem permissão para faturar contratos.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  if (!can(ctx.perms, "contasreceber", "criar")) return falha("A fatura vira conta a receber: falta a permissão de criar contas a receber.");
  const tenantId = ctx.tenant.id;
  const valor = num(input.valor);
  if (valor == null || valor <= 0) return falha("Informe o valor da fatura.");
  const venc = data(input.vencimento, "Vencimento");
  if (!venc.ok) return falha(venc.error);
  if (!venc.v) return falha("Informe o vencimento.");
  const idem = txt(input.idempotencyKey);
  if (idem) {
    const [ja] = await db.select({ id: schema.contasReceber.id }).from(schema.contasReceber).where(and(eq(schema.contasReceber.tenantId, tenantId), eq(schema.contasReceber.idempotencyKey, idem))).limit(1);
    if (ja) return { ok: true, id: ja.id, aviso: "Esta fatura já tinha sido registrada." };
  }
  return db.transaction(async (tx) => {
    const c = await contratoDaEmpresa(tenantId, input.contratoId, tx, true);
    if (!c) return falha("Contrato não encontrado.");
    if (!contratoEmExecucao(c.status) && c.status !== "encerrado") return falha("Faturamento só em contrato ativo, concluído ou encerrado.");
    const [vp] = await tx.select({ id: schema.contratoProjetos.id }).from(schema.contratoProjetos).where(and(eq(schema.contratoProjetos.contratoId, c.id), eq(schema.contratoProjetos.projectId, input.projectId))).limit(1);
    if (!vp || !ctx.projects.some((p) => p.id === input.projectId)) return falha("Escolha um projeto vinculado ao contrato.");
    const [f] = await tx
      .insert(schema.contasReceber)
      .values({
        tenantId,
        projectId: input.projectId,
        clienteId: c.clienteId,
        contratoId: c.id,
        descricao: txt(input.descricao) ?? `Fatura do contrato ${c.codigo} — ${c.titulo}`,
        tipo: "Fatura de serviço",
        valor: String(valor),
        vencimento: venc.v,
        status: "A receber",
        idempotencyKey: idem,
        createdBy: quem(ctx),
      })
      .returning({ id: schema.contasReceber.id });
    // Medido aprovado × faturado: faturar à frente da medição é permitido (adiantamento), mas avisa.
    const [{ medido }] = await tx.select({ medido: sql<string>`coalesce(sum(${schema.contratoMedicoes.valor}), 0)` }).from(schema.contratoMedicoes).where(and(eq(schema.contratoMedicoes.contratoId, c.id), eq(schema.contratoMedicoes.status, "aprovada")));
    const [{ faturado }] = await tx.select({ faturado: sql<string>`coalesce(sum(${schema.contasReceber.valor}), 0)` }).from(schema.contasReceber).where(and(eq(schema.contasReceber.contratoId, c.id), eq(schema.contasReceber.cancelado, false)));
    await logAudit({ tenantId, userId: ctx.userId, action: "contrato.fatura.create", entity: "conta_receber", entityId: f.id, meta: { contrato: c.codigo, projectId: input.projectId, valor, vencimento: venc.v } }, tx);
    revalidar(c.id);
    revalidatePath("/contasreceber");
    return { ok: true as const, id: f.id, aviso: cents(faturado) > cents(medido) ? "O faturado do contrato passou do medido aprovado (faturamento à frente da medição)." : undefined };
  });
}

// ───────────────────────────── Custos e reembolsos ─────────────────────────────

async function despesaDoContrato(tenantId: string, despesaId: string, contratoId: string, exec: Exec = db) {
  const [d] = await exec
    .select({ d: schema.despesas, projectId: schema.versions.projectId })
    .from(schema.despesas)
    .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
    .where(and(eq(schema.despesas.id, despesaId), eq(schema.despesas.tenantId, tenantId)))
    .limit(1);
  if (!d) return { erro: "Despesa não encontrada." } as const;
  const [vp] = await exec.select({ id: schema.contratoProjetos.id }).from(schema.contratoProjetos).where(and(eq(schema.contratoProjetos.contratoId, contratoId), eq(schema.contratoProjetos.projectId, d.projectId))).limit(1);
  if (!vp) return { erro: "A despesa é de um projeto que não está vinculado ao contrato." } as const;
  return { despesa: d.d } as const;
}

/** Apropria (ou desapropria, com `contratoId` nulo) uma despesa a um contrato. Não muda valor, conta nem DRE. */
export async function apropriarDespesa(input: { despesaId: string; contratoId: string | null }): Promise<Resultado> {
  const s = await sessao("contratosfinanceiro", "editar", "Sem permissão para apropriar custos a contratos.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  let codigo: string | null = null;
  if (input.contratoId) {
    const c = await contratoDaEmpresa(tenantId, input.contratoId);
    if (!c) return falha("Contrato não encontrado.");
    const r = await despesaDoContrato(tenantId, input.despesaId, c.id);
    if ("erro" in r) return falha(r.erro!);
    codigo = c.codigo;
  } else {
    const [d] = await db.select({ id: schema.despesas.id }).from(schema.despesas).where(and(eq(schema.despesas.id, input.despesaId), eq(schema.despesas.tenantId, tenantId))).limit(1);
    if (!d) return falha("Despesa não encontrada.");
  }
  const [antes] = await db.select({ contratoId: schema.despesas.contratoId }).from(schema.despesas).where(eq(schema.despesas.id, input.despesaId)).limit(1);
  await db.update(schema.despesas).set({ contratoId: input.contratoId }).where(and(eq(schema.despesas.id, input.despesaId), eq(schema.despesas.tenantId, tenantId)));
  await logAudit({ tenantId, userId: ctx.userId, action: "contrato.custo.apropriar", entity: "despesa", entityId: input.despesaId, meta: { de: antes?.contratoId ?? null, para: input.contratoId, contrato: codigo } });
  if (input.contratoId) revalidar(input.contratoId);
  if (antes?.contratoId) revalidar(antes.contratoId);
  return { ok: true, id: input.despesaId };
}

/** Marca uma despesa como reembolsável pelo contratante. Uma despesa ativa em um reembolso só. */
export async function incluirReembolso(input: { contratoId: string; despesaId: string; valorSolicitado?: number | string | null; condicao?: string | null; obs?: string | null }): Promise<Resultado> {
  const s = await sessao("contratosfinanceiro", "editar", "Sem permissão para controlar reembolsos.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const c = await contratoDaEmpresa(tenantId, input.contratoId);
  if (!c) return falha("Contrato não encontrado.");
  const r = await despesaDoContrato(tenantId, input.despesaId, c.id);
  if ("erro" in r) return falha(r.erro!);
  const valor = input.valorSolicitado == null || input.valorSolicitado === "" ? Number(r.despesa.valor) : num(input.valorSolicitado);
  if (valor == null || valor <= 0) return falha("Valor a reembolsar deve ser maior que zero.");
  if (cents(valor) > cents(r.despesa.valor)) return falha("O reembolso não pode passar do valor da despesa.");
  try {
    const [x] = await db
      .insert(schema.contratoReembolsos)
      .values({ tenantId, contratoId: c.id, despesaId: r.despesa.id, valorSolicitado: String(valor), condicao: txt(input.condicao), obs: txt(input.obs), createdBy: quem(ctx) })
      .returning({ id: schema.contratoReembolsos.id });
    if (!r.despesa.contratoId) await db.update(schema.despesas).set({ contratoId: c.id }).where(eq(schema.despesas.id, r.despesa.id));
    await logAudit({ tenantId, userId: ctx.userId, action: "contrato.reembolso.create", entity: "contrato_reembolso", entityId: x.id, meta: { contrato: c.codigo, despesaId: r.despesa.id, numDoc: r.despesa.numDoc, valor } });
    revalidar(c.id);
    revalidatePath("/contratos/reembolsos");
    return { ok: true, id: x.id };
  } catch (e) {
    if (String((e as { code?: string })?.code) === "23505") return falha("Esta despesa já está em um reembolso ativo.");
    throw e;
  }
}

/**
 * Andamento do reembolso. "Faturado" pede a conta a receber DO MESMO contrato
 * que cobrou (o sistema não cria receita aqui; ver pendência de política
 * contábil no documento do módulo). Cancelar pede motivo.
 */
export async function mudarStatusReembolso(input: { id: string; para?: string | null; valorAprovado?: number | string | null; contaReceberId?: string | null; cancelar?: boolean; motivo?: string | null }): Promise<Resultado> {
  const s = await sessao("contratosfinanceiro", "editar", "Sem permissão para controlar reembolsos.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const [x] = await db.select().from(schema.contratoReembolsos).where(and(eq(schema.contratoReembolsos.id, input.id), eq(schema.contratoReembolsos.tenantId, tenantId))).limit(1);
  if (!x || x.cancelado) return falha("Reembolso não encontrado ou cancelado.");
  if (input.cancelar) {
    if (!txt(input.motivo)) return falha("Informe o motivo.");
    if (x.status === "faturado" || x.status === "recebido") return falha("Reembolso faturado não se cancela aqui: cancele a fatura antes e volte a situação.");
    await db.update(schema.contratoReembolsos).set({ cancelado: true, motivoCancelamento: txt(input.motivo) }).where(eq(schema.contratoReembolsos.id, x.id));
    await logAudit({ tenantId, userId: ctx.userId, action: "contrato.reembolso.cancel", entity: "contrato_reembolso", entityId: x.id, meta: { motivo: input.motivo } });
    revalidar(x.contratoId);
    revalidatePath("/contratos/reembolsos");
    return { ok: true, id: x.id };
  }
  const para = txt(input.para) ?? x.status;
  const r = recusaTransicaoReembolso(x.status, para);
  if (r) return falha(r);
  const set: Partial<typeof schema.contratoReembolsos.$inferInsert> = { status: para };
  if (para === "aprovado") {
    const v = input.valorAprovado == null || input.valorAprovado === "" ? Number(x.valorSolicitado) : num(input.valorAprovado);
    if (v == null || v < 0 || cents(v) > cents(x.valorSolicitado)) return falha("O aprovado fica entre zero e o solicitado.");
    set.valorAprovado = String(v);
  }
  if (para === "faturado") {
    const cr = txt(input.contaReceberId);
    if (!cr) return falha("Escolha a conta a receber do contrato que cobrou o reembolso.");
    const [conta] = await db.select({ id: schema.contasReceber.id }).from(schema.contasReceber).where(and(eq(schema.contasReceber.id, cr), eq(schema.contasReceber.tenantId, tenantId), eq(schema.contasReceber.contratoId, x.contratoId), eq(schema.contasReceber.cancelado, false))).limit(1);
    if (!conta) return falha("A conta a receber precisa ser deste contrato e não estar cancelada.");
    set.contaReceberId = cr;
  }
  if (para === "aprovado" && x.status === "faturado") set.contaReceberId = null;
  await db.update(schema.contratoReembolsos).set(set).where(eq(schema.contratoReembolsos.id, x.id));
  await logAudit({ tenantId, userId: ctx.userId, action: "contrato.reembolso.status", entity: "contrato_reembolso", entityId: x.id, meta: { de: x.status, para, valorAprovado: set.valorAprovado, contaReceberId: set.contaReceberId } });
  revalidar(x.contratoId);
  revalidatePath("/contratos/reembolsos");
  return { ok: true, id: x.id };
}

// ───────────────────────────── Documentos ─────────────────────────────

/** Anexa um documento ao contrato (e, opcionalmente, a um aditivo ou medição dele). Versão por tipo. */
export async function anexarDocumentoContrato(formData: FormData): Promise<Resultado> {
  const s = await sessao("contratos", "editar", "Sem permissão para anexar documentos ao contrato.");
  if ("error" in s) return falha(s.error);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const contratoId = txt(formData.get("contratoId"));
  const aditivoId = txt(formData.get("aditivoId"));
  const medicaoId = txt(formData.get("medicaoId"));
  const tipo = txt(formData.get("tipo"));
  if (!contratoId) return falha("Contrato não informado.");
  if (!tipo || !(TIPOS_DOC_CONTRATO as readonly string[]).includes(tipo)) return falha("Escolha o tipo do documento.");
  const c = await contratoDaEmpresa(tenantId, contratoId);
  if (!c) return falha("Contrato não encontrado.");
  if (aditivoId) {
    const [a] = await db.select({ id: schema.contratoAditivos.id }).from(schema.contratoAditivos).where(and(eq(schema.contratoAditivos.id, aditivoId), eq(schema.contratoAditivos.contratoId, c.id))).limit(1);
    if (!a) return falha("Aditivo não encontrado neste contrato.");
  }
  if (medicaoId) {
    const [m] = await db.select({ id: schema.contratoMedicoes.id }).from(schema.contratoMedicoes).where(and(eq(schema.contratoMedicoes.id, medicaoId), eq(schema.contratoMedicoes.contratoId, c.id))).limit(1);
    if (!m) return falha("Medição não encontrada neste contrato.");
  }
  if (!isR2Configured()) return falha("Storage (R2) não configurado — defina as variáveis R2_*.");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return falha("Selecione um arquivo.");
  if (file.size > LIMITE_UPLOAD_BYTES) return falha(`Arquivo deve ter até ${LIMITE_UPLOAD_MB} MB.`);
  const existentes = await db
    .select({ versao: schema.documents.versao })
    .from(schema.documents)
    .where(and(eq(schema.documents.tenantId, tenantId), eq(schema.documents.contratoId, c.id), eq(schema.documents.tipo, tipo), aditivoId ? eq(schema.documents.contratoAditivoId, aditivoId) : isNull(schema.documents.contratoAditivoId)));
  const versao = existentes.reduce((m, d) => Math.max(m, d.versao), 0) + 1;
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const key = `tenants/${tenantId}/contrato/${c.id}/${Date.now()}_${safe}`;
  try {
    await putObject(key, new Uint8Array(await file.arrayBuffer()), file.type || "application/octet-stream");
  } catch (e) {
    console.error("[contrato] falha ao enviar o arquivo:", e);
    return falha(e instanceof Error ? e.message : "Falha ao enviar o arquivo.");
  }
  const [doc] = await db
    .insert(schema.documents)
    .values({ tenantId, contratoId: c.id, contratoAditivoId: aditivoId, contratoMedicaoId: medicaoId, storageKey: key, filename: file.name, contentType: file.type || null, size: file.size, tipo, versao, uploadedBy: quem(ctx) })
    .returning({ id: schema.documents.id });
  await logAudit({ tenantId, userId: ctx.userId, action: "contrato.doc.upload", entity: "contrato", entityId: c.id, meta: { documentId: doc.id, filename: file.name, tipo, versao, aditivoId, medicaoId } });
  revalidar(c.id);
  return { ok: true, id: doc.id };
}
