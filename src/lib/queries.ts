import { cache } from "react";
import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lt, lte, max, ne, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { vinculosDaVersao, vinculosDosMovimentos } from "@/lib/conciliacao-vinculos";
import { partesDosMovimentosSemObra } from "@/lib/movimento-obra";
import { chaveCompetencia, chaveDataBR } from "./db/ordem-data";
import type { CalcPermutaRevenda } from "@/lib/calc/permuta-ganho";
import { db, schema } from "./db";
import { emptyUnit } from "./calc/__fixtures__";
import {
  calcProjectionBySource,
  reembursementsByMonth,
  PROJECTION_SOURCES,
  type CalcPermutaResale,
  type ProjectionSource,
} from "./calc/projection";
import { expandUnitReceivables } from "./calc/receivables";
import { receitaPorRateio, type PendenciaDoRateio } from "./calc/receita-rateio";
import { janelaDoProjeto } from "./dre";
import { naturezaDoGrupo } from "./natureza-grupo";
import { gruposDisponiveis, linhasDoBloco, totalReceitasDoProjeto, type GrupoDoPlano } from "./orcamento-regras";
import {
  calcBdi,
  calcEvolucao,
  calcIncidencias,
  calcProvisionamento,
  custoReferencial,
} from "./calc/medicao-bdi";
import { fillHorizonForward } from "./horizon";
import { OUTRAS_RECEITAS_KEY, OUTRAS_RECEITAS_PID } from "./budget/config";
import { chaveLigada } from "./chaves-tenant";
import { SERIE_DA_EMPRESA } from "./incc-empresa";
import type { FiltrosDaAuditoria } from "./auditoria-filtros";
import { mapaDeCategorias, mapaParaDespesas } from "./categoria-do-plano";
import type { CategoriaDRE } from "./calc/constants";
import { entraNosRelatorios } from "./situacao-versao";
import { saldosReaisDasDespesas } from "./acerto-saldo";
import { janelaDaMargem, naJanela, orcamentoDaObra, type OrigemDaJanela } from "./dashboard-definicao";
import { dateInRange, monthInRange } from "./utils";
import type {
  CalcPermuta,
  CalcReembolso,
  CalcUnit,
  InccRow,
  MonthlyProjection,
} from "./calc/types";

export type UnitRow = typeof schema.units.$inferSelect;
export type ReembolsoRow = typeof schema.reembolsos.$inferSelect;
export type PermutaRow = typeof schema.permutas.$inferSelect;

/** Converte uma linha de unidade do banco para o tipo consumido pelos cálculos. */
export function toCalcUnit(row: UnitRow): CalcUnit {
  // Mescla o plano salvo sobre um plano padrão COMPLETO. Assim, planos antigos
  // ou parciais (com algum subobjeto ausente, ex.: sem "S2") não quebram os
  // cálculos (dashboard, projeção, etc.) — os campos faltantes viram defaults.
  const base = stripIdentity(emptyUnit(row.code)) as Record<string, unknown>;
  const stored = (row.paymentPlan ?? {}) as Record<string, unknown>;
  const plan: Record<string, unknown> = { ...base };
  for (const k of Object.keys(base)) {
    const b = base[k];
    const s = stored[k];
    if (b && typeof b === "object" && !Array.isArray(b)) {
      plan[k] = s && typeof s === "object" ? { ...(b as object), ...(s as object) } : b;
    } else if (s !== undefined) {
      plan[k] = s;
    }
  }
  // Preserva chaves extras do plano salvo (flags de nível superior, etc.).
  for (const k of Object.keys(stored)) {
    if (!(k in plan)) plan[k] = stored[k];
  }
  return {
    ...(plan as Omit<CalcUnit, "code" | "status" | "valor">),
    code: row.code,
    status: row.status,
    valor: Number(row.valor),
  };
}

/** Remove os campos de identidade, deixando só o plano de pagamento (JSONB). */
function stripIdentity(u: CalcUnit) {
  const { code: _c, status: _s, valor: _v, ...plan } = u;
  void _c;
  void _s;
  void _v;
  return plan;
}

export function toInccRows(
  rows: (typeof schema.inccRates.$inferSelect)[],
): InccRow[] {
  return rows.map((r) => ({
    m: r.mes,
    mo: Number(r.monthly),
    ac: Number(r.accumulated),
    projected: r.projected,
  }));
}

// ─────────────────────────────── leituras ───────────────────────────────

/**
 * Unidades de uma versão. O tenant vai na cláusula (Prompt J, 5.3): a versão
 * já chega validada, mas o filtro explícito é o padrão de todas as leituras.
 */
export async function getUnits(tenantId: string, versionId: string): Promise<UnitRow[]> {
  return db
    .select()
    .from(schema.units)
    .where(and(eq(schema.units.tenantId, tenantId), eq(schema.units.versionId, versionId)))
    .orderBy(asc(schema.units.code));
}

/**
 * Todas as unidades do tenant (versão Atual de cada projeto) — para os cadastros
 * de cliente/contrato listarem unidades de qualquer projeto, não só do ativo.
 */
export async function getUnitCodesByTenant(tenantId: string): Promise<string[]> {
  const rows = await db
    .select({ code: schema.units.code })
    .from(schema.units)
    .where(eq(schema.units.tenantId, tenantId))
    .orderBy(asc(schema.units.code));
  return [...new Set(rows.map((r) => r.code))];
}

export async function getUnit(
  versionId: string,
  unitId: string,
): Promise<UnitRow | undefined> {
  const [row] = await db
    .select()
    .from(schema.units)
    .where(
      and(eq(schema.units.versionId, versionId), eq(schema.units.id, unitId)),
    )
    .limit(1);
  return row;
}

/** Unidade por id no escopo do tenant, com o projeto da sua versão. */
export async function getUnitWithProject(
  tenantId: string,
  unitId: string,
): Promise<(UnitRow & { projectId: string }) | undefined> {
  const [row] = await db
    .select({ u: schema.units, projectId: schema.versions.projectId })
    .from(schema.units)
    .innerJoin(schema.versions, eq(schema.units.versionId, schema.versions.id))
    .where(and(eq(schema.units.id, unitId), eq(schema.units.tenantId, tenantId)))
    .limit(1);
  return row ? { ...row.u, projectId: row.projectId } : undefined;
}

/**
 * Liberações de obra da versão — da empresa (Prompt O, 3.5: antes filtrava
 * só a versão). Por padrão SEM as canceladas (4.4): é o que `reembursementsByMonth`,
 * `calcTotals`, Projeção, Consolidado, Resumo, Caixa e exportação devem ler.
 * A lista da tela pede `incluirCanceladas` para mantê-las legíveis.
 */
export async function getReembolsos(tenantId: string, versionId: string, opts: { incluirCanceladas?: boolean } = {}): Promise<ReembolsoRow[]> {
  const cond = [eq(schema.reembolsos.tenantId, tenantId), eq(schema.reembolsos.versionId, versionId)];
  if (!opts.incluirCanceladas) cond.push(eq(schema.reembolsos.cancelado, false));
  return db
    .select()
    .from(schema.reembolsos)
    .where(and(...cond))
    .orderBy(asc(chaveDataBR(schema.reembolsos.data)), asc(schema.reembolsos.id));
}

/** Uma liberação da empresa, com a obra e a trava da versão (para editar e cancelar). */
export async function getReembolsoDoTenant(
  tenantId: string,
  id: string,
): Promise<{ liberacao: ReembolsoRow; projectId: string; versionLabel: string; locked: boolean } | undefined> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return undefined;
  const [row] = await db
    .select({ r: schema.reembolsos, projectId: schema.versions.projectId, versionLabel: schema.versions.label, locked: schema.versions.locked })
    .from(schema.reembolsos)
    .innerJoin(schema.versions, eq(schema.reembolsos.versionId, schema.versions.id))
    .where(and(eq(schema.reembolsos.id, id), eq(schema.reembolsos.tenantId, tenantId)))
    .limit(1);
  return row ? { liberacao: row.r, projectId: row.projectId, versionLabel: row.versionLabel, locked: !!row.locked } : undefined;
}

/**
 * Ativos de permuta da versão — da empresa (Prompt P, 3.5: antes filtrava só a
 * versão). Por padrão SEM os cancelados (2.4): é o que receita, caixa, totais
 * e exportação devem ler. A lista da tela pede `incluirCancelados` para
 * mantê-los legíveis.
 */
export async function getPermutas(
  tenantId: string,
  versionId: string,
  opts: { incluirCancelados?: boolean } = {},
): Promise<PermutaRow[]> {
  const cond = [eq(schema.permutas.tenantId, tenantId), eq(schema.permutas.versionId, versionId)];
  if (!opts.incluirCancelados) cond.push(eq(schema.permutas.cancelado, false));
  return db
    .select()
    .from(schema.permutas)
    .where(and(...cond))
    .orderBy(asc(schema.permutas.dataRecebimento), asc(schema.permutas.id));
}

export type PermutaDaTela = PermutaRow & {
  /** Nome do cadastro quando há `cliente_id`; senão o nome gravado (3.6). */
  clienteNome: string | null;
  /** Há entrada de estoque apontando para este ativo (BP-1: "no Estoque"). */
  noEstoque: boolean;
};

/** Lista da tela de Permuta: todos os ativos da versão, inclusive cancelados, com o cliente do cadastro. */
export async function getPermutasDaTela(tenantId: string, versionId: string): Promise<PermutaDaTela[]> {
  const rows = await db
    .select({
      p: schema.permutas,
      clienteCadastro: schema.clientes.nomeCompleto,
      noEstoque: sql<boolean>`exists (select 1 from ${schema.stockMovements} sm where sm.permuta_id = ${schema.permutas.id})`,
    })
    .from(schema.permutas)
    .leftJoin(schema.clientes, eq(schema.permutas.clienteId, schema.clientes.id))
    .where(and(eq(schema.permutas.tenantId, tenantId), eq(schema.permutas.versionId, versionId)))
    .orderBy(asc(schema.permutas.dataRecebimento), asc(schema.permutas.id));
  return rows.map((r) => ({ ...r.p, clienteNome: r.clienteCadastro ?? r.p.cliente, noEstoque: !!r.noEstoque }));
}

/** Um ativo da empresa, com a obra e a trava da versão (para editar e cancelar). */
export async function getPermutaDoTenant(
  tenantId: string,
  id: string,
): Promise<{ permuta: PermutaRow; projectId: string; versionLabel: string; locked: boolean } | undefined> {
  // Id que não é uuid vira "não encontrado", não erro 500 do Postgres.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return undefined;
  const [row] = await db
    .select({ p: schema.permutas, projectId: schema.versions.projectId, versionLabel: schema.versions.label, locked: schema.versions.locked })
    .from(schema.permutas)
    .innerJoin(schema.versions, eq(schema.permutas.versionId, schema.versions.id))
    .where(and(eq(schema.permutas.id, id), eq(schema.permutas.tenantId, tenantId)))
    .limit(1);
  return row ? { permuta: row.p, projectId: row.projectId, versionLabel: row.versionLabel, locked: !!row.locked } : undefined;
}

export interface InccLinhaDaTela extends InccRow {
  informadoPor: string | null;
  informadoEm: string | null;
  fonte: string | null;
}

/**
 * Prompt Q2 — as linhas de UMA série, sem olhar a chave: a da obra
 * (`projectId`) ou a da empresa (`SERIE_DA_EMPRESA`, linhas sem projeto).
 * Quem grava (actions do INCC) e a prévia da chave leem por aqui.
 */
export async function getLinhasDaSerieIncc(tenantId: string, alvo: string) {
  return db
    .select()
    .from(schema.inccRates)
    .where(and(eq(schema.inccRates.tenantId, tenantId), alvo === SERIE_DA_EMPRESA ? isNull(schema.inccRates.projectId) : eq(schema.inccRates.projectId, alvo)))
    .orderBy(asc(schema.inccRates.ordem));
}

/**
 * Prompt Q2 — a série que os relatórios leem para uma obra: a da empresa, com
 * a chave "incc_por_empresa" ligada e uma série da empresa adotada; senão, a
 * da própria obra (o comportamento de antes).
 */
export async function serieDoInccDaObra(tenantId: string, projectId: string): Promise<string> {
  if (projectId === SERIE_DA_EMPRESA) return SERIE_DA_EMPRESA;
  return (await inccDaEmpresaAtivo(tenantId)) ? SERIE_DA_EMPRESA : projectId;
}

/** A chave está ligada E a empresa já adotou uma série. */
export async function inccDaEmpresaAtivo(tenantId: string): Promise<boolean> {
  if (!(await chaveLigada(tenantId, "incc_por_empresa"))) return false;
  const [uma] = await db
    .select({ id: schema.inccRates.id })
    .from(schema.inccRates)
    .where(and(eq(schema.inccRates.tenantId, tenantId), isNull(schema.inccRates.projectId)))
    .limit(1);
  return !!uma;
}

/** Tabela INCC da obra com a origem de cada mês oficial e a variante (Prompt Q, 5.1/5.3), para a tela. */
export async function getInccTabela(tenantId: string, projectId: string): Promise<{ linhas: InccLinhaDaTela[]; variante: string | null }> {
  const rows = await getLinhasDaSerieIncc(tenantId, await serieDoInccDaObra(tenantId, projectId));
  return {
    linhas: rows.map((r) => ({ m: r.mes, mo: Number(r.monthly), ac: Number(r.accumulated), projected: r.projected, informadoPor: r.informadoPor, informadoEm: r.informadoEm, fonte: r.fonte })),
    variante: rows.find((r) => r.variante)?.variante ?? null,
  };
}

/**
 * Tabela INCC que os relatórios aplicam na obra (Prompt Q, 4.2). Prompt Q2:
 * com a chave "incc_por_empresa" ligada e série da empresa adotada, é a da
 * empresa; senão, a da obra.
 */
export async function getInccRows(tenantId: string, projectId: string): Promise<InccRow[]> {
  return toInccRows(await getLinhasDaSerieIncc(tenantId, await serieDoInccDaObra(tenantId, projectId)));
}

// helpers de conversão para agregados

export function reembToCalc(rows: ReembolsoRow[]): CalcReembolso[] {
  return rows.map((r) => ({ data: r.data ?? "", valor: Number(r.valor ?? 0) }));
}

export function permToCalc(rows: PermutaRow[]): CalcPermuta[] {
  return rows.map((p) => ({
    estimado: Number(p.estimado ?? 0),
    status: p.status ?? "",
    valorVenda: Number(p.valorVenda ?? 0),
  }));
}

/** Mapeia permutas → dados para o resultado da revenda (Prompt P, 4.1; prévia da §57). */
export function permToRevenda(rows: PermutaRow[]): CalcPermutaRevenda[] {
  return rows.map((p) => ({
    estimado: Number(p.estimado ?? 0),
    status: p.status ?? "",
    valorVenda: Number(p.valorVenda ?? 0),
    dataVenda: p.dataVenda ?? "",
    formaVenda: p.formaVenda ?? "",
    dataPrimParcela: p.dataPrimParcela ?? "",
  }));
}

/** Mapeia permutas → dados de revenda para os cálculos de caixa/DRE (item 10). */
export function permToResale(rows: PermutaRow[]): CalcPermutaResale[] {
  return rows.map((p) => ({
    valorVenda: Number(p.valorVenda ?? 0),
    dataVenda: p.dataVenda ?? "",
    formaVenda: p.formaVenda ?? "",
    parcelas: Number(p.parcelas ?? 0),
    periodicidade: p.periodicidade ?? "mensal",
    dataPrimParcela: p.dataPrimParcela ?? "",
  }));
}

// ────────────────────────── Módulo Despesas ──────────────────────────

export type StakeholderRow = typeof schema.stakeholders.$inferSelect;
export type BankAccountRow = typeof schema.bankAccounts.$inferSelect;
export type ChartAccountRow = typeof schema.chartAccounts.$inferSelect;
export type DespesaRow = typeof schema.despesas.$inferSelect;

export async function getStakeholders(
  tenantId: string,
): Promise<StakeholderRow[]> {
  return db
    .select()
    .from(schema.stakeholders)
    .where(eq(schema.stakeholders.tenantId, tenantId))
    .orderBy(asc(schema.stakeholders.nome));
}

/**
 * Uso real de cada cadastro (Prompt W, 7.2): quantas despesas tem como
 * fornecedor e quando foi a última; quantas obrigações tem como pagador por
 * terceiro. Só contagens e datas — nada de valor nem de documento.
 */
export async function getUsoDosStakeholders(tenantId: string): Promise<{ id: string; despesas: number; ultimaDespesa: string | null; obrigacoes: number }[]> {
  const [desp, obr] = await Promise.all([
    db
      .select({ id: schema.despesas.fornecedorId, n: count(), ultima: max(schema.despesas.createdAt) })
      .from(schema.despesas)
      .where(and(eq(schema.despesas.tenantId, tenantId), isNotNull(schema.despesas.fornecedorId)))
      .groupBy(schema.despesas.fornecedorId),
    db
      .select({ id: schema.despesaTerceiros.pagadorTerceiroId, n: count() })
      .from(schema.despesaTerceiros)
      .where(and(eq(schema.despesaTerceiros.tenantId, tenantId), isNotNull(schema.despesaTerceiros.pagadorTerceiroId)))
      .groupBy(schema.despesaTerceiros.pagadorTerceiroId),
  ]);
  const uso = new Map<string, { id: string; despesas: number; ultimaDespesa: string | null; obrigacoes: number }>();
  for (const d of desp) {
    if (!d.id) continue;
    uso.set(d.id, { id: d.id, despesas: Number(d.n), ultimaDespesa: d.ultima ? new Date(d.ultima).toISOString().slice(0, 10) : null, obrigacoes: 0 });
  }
  for (const o of obr) {
    if (!o.id) continue;
    const u = uso.get(o.id) ?? { id: o.id, despesas: 0, ultimaDespesa: null, obrigacoes: 0 };
    u.obrigacoes = Number(o.n);
    uso.set(o.id, u);
  }
  return [...uso.values()];
}

/**
 * Sócios do tenant: stakeholders ATIVOS com o papel "Sócio/Quotista". Usado no
 * cadastro de "despesa paga por sócio" (seleção sem digitação livre).
 */
export async function getSocios(
  tenantId: string,
): Promise<{ id: string; nome: string }[]> {
  const rows = await db
    .select({ id: schema.stakeholders.id, nome: schema.stakeholders.nome, papeis: schema.stakeholders.papeis, ativo: schema.stakeholders.ativo })
    .from(schema.stakeholders)
    .where(eq(schema.stakeholders.tenantId, tenantId))
    .orderBy(asc(schema.stakeholders.nome));
  return rows
    .filter((r) => r.ativo && (r.papeis ?? []).includes("Sócio/Quotista"))
    .map((r) => ({ id: r.id, nome: r.nome }));
}

/** Cartões de crédito do tenant, com a conta que debita a fatura (Prompt U, 1.3). */
export interface CartaoView {
  id: string;
  apelido: string;
  bandeira: string | null;
  ultimos4: string | null;
  titular: string | null;
  limite: number | null;
  diaFechamento: number;
  diaVencimento: number;
  bankAccountId: string | null;
  contaNome: string | null;
  taxaRotativo: number | null;
  ativo: boolean;
}

export async function getCartoes(tenantId: string): Promise<CartaoView[]> {
  const rows = await db
    .select({ c: schema.cartoesCredito, banco: schema.bankAccounts.banco, cc: schema.bankAccounts.cc })
    .from(schema.cartoesCredito)
    .leftJoin(schema.bankAccounts, eq(schema.cartoesCredito.bankAccountId, schema.bankAccounts.id))
    .where(eq(schema.cartoesCredito.tenantId, tenantId))
    .orderBy(desc(schema.cartoesCredito.ativo), schema.cartoesCredito.apelido);
  return rows.map(({ c, banco, cc }) => ({
    id: c.id,
    apelido: c.apelido,
    bandeira: c.bandeira,
    ultimos4: c.ultimos4,
    titular: c.titular,
    limite: c.limite == null ? null : Number(c.limite),
    diaFechamento: c.diaFechamento,
    diaVencimento: c.diaVencimento,
    bankAccountId: c.bankAccountId,
    contaNome: banco ? `${banco}${cc ? " · " + cc : ""}` : null,
    taxaRotativo: c.taxaRotativo == null ? null : Number(c.taxaRotativo),
    ativo: c.ativo,
  }));
}

/**
 * Prompt L, 6.4 — quanto está BAIXADO (pagamento registrado) sem vínculo com
 * o extrato, e há quantos dias o mais antigo espera. É o número que denuncia
 * extrato não importado. Só leitura.
 */
export async function getBaixadoSemConciliar(tenantId: string): Promise<{ total: number; despesas: number; maisAntigoISO: string | null }> {
  const pagos = await db
    .select({ despesaId: schema.pagamentos.despesaId, pago: sql<string>`coalesce(sum(${schema.pagamentos.valorTotalPago} + ${schema.pagamentos.desconto} - ${schema.pagamentos.multa} - ${schema.pagamentos.juros} - ${schema.pagamentos.outrosAcrescimos}), 0)`, primeira: sql<string | null>`min(case when ${schema.pagamentos.dataPagamento} ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' then substr(${schema.pagamentos.dataPagamento},7,4)||'-'||substr(${schema.pagamentos.dataPagamento},1,2)||'-'||substr(${schema.pagamentos.dataPagamento},4,2) end)` })
    .from(schema.pagamentos)
    .innerJoin(schema.despesas, eq(schema.pagamentos.despesaId, schema.despesas.id))
    .where(and(eq(schema.pagamentos.tenantId, tenantId), eq(schema.despesas.cancelado, false)))
    .groupBy(schema.pagamentos.despesaId);
  const ids = pagos.map((p) => p.despesaId).filter((x): x is string => !!x);
  const conciliado = ids.length
    ? await db
        .select({ id: schema.conciliacoesDespesa.despesaId, soma: sql<string>`coalesce(sum(${schema.conciliacoesDespesa.valor}), 0)` })
        .from(schema.conciliacoesDespesa)
        .where(and(eq(schema.conciliacoesDespesa.tenantId, tenantId), eq(schema.conciliacoesDespesa.desfeito, false), inArray(schema.conciliacoesDespesa.despesaId, ids)))
        .groupBy(schema.conciliacoesDespesa.despesaId)
    : [];
  const concPor = new Map(conciliado.map((c) => [c.id, Number(c.soma)]));
  let total = 0;
  let despesas = 0;
  let maisAntigo: string | null = null;
  for (const p of pagos) {
    if (!p.despesaId) continue;
    const semConc = Math.round((Number(p.pago) - (concPor.get(p.despesaId) ?? 0)) * 100) / 100;
    if (semConc <= 0.01) continue;
    total += semConc;
    despesas++;
    if (p.primeira && (!maisAntigo || p.primeira < maisAntigo)) maisAntigo = p.primeira;
  }
  return { total: Math.round(total * 100) / 100, despesas, maisAntigoISO: maisAntigo };
}

/** Prompt L, 4.2.4 — autor e momento de cada ajuste, pelo audit_log (`cash.adjust`). Só leitura. */
export async function getAutoresDosAjustes(tenantId: string, cashEntryIds: readonly string[]): Promise<Map<string, { autor: string | null; quando: string | null }>> {
  const out = new Map<string, { autor: string | null; quando: string | null }>();
  if (cashEntryIds.length === 0) return out;
  const rows = await db
    .select({ entityId: schema.auditLog.entityId, meta: schema.auditLog.meta, userId: schema.auditLog.userId, createdAt: schema.auditLog.createdAt, email: schema.users.email })
    .from(schema.auditLog)
    .leftJoin(schema.users, eq(schema.auditLog.userId, schema.users.id))
    .where(and(eq(schema.auditLog.tenantId, tenantId), eq(schema.auditLog.action, "cash.adjust"), inArray(schema.auditLog.entityId, [...cashEntryIds])));
  for (const r of rows) {
    if (!r.entityId) continue;
    const meta = (r.meta ?? {}) as { autor?: string | null };
    out.set(r.entityId, { autor: meta.autor ?? r.email ?? r.userId ?? null, quando: r.createdAt ? new Date(r.createdAt).toISOString() : null });
  }
  return out;
}

/** Prompt X, 7 — uso real das contas: lançamentos de caixa e data do último (ISO). Só leitura. */
export async function getUsoDasContas(tenantId: string): Promise<{ id: string; lancamentos: number; ultimoLancamento: string | null }[]> {
  const rows = await db
    .select({
      id: schema.cashEntries.bankAccountId,
      n: sql<number>`count(*)::int`,
      // "MM/DD/YYYY" → "YYYY-MM-DD" para comparar; datas malformadas ficam de fora do máximo
      ultimo: sql<string | null>`max(case when ${schema.cashEntries.data} ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' then substr(${schema.cashEntries.data},7,4)||'-'||substr(${schema.cashEntries.data},1,2)||'-'||substr(${schema.cashEntries.data},4,2) end)`,
    })
    .from(schema.cashEntries)
    .where(and(eq(schema.cashEntries.tenantId, tenantId), isNotNull(schema.cashEntries.bankAccountId)))
    .groupBy(schema.cashEntries.bankAccountId);
  return rows.filter((r) => !!r.id).map((r) => ({ id: r.id as string, lancamentos: Number(r.n), ultimoLancamento: r.ultimo ?? null }));
}

export async function getBankAccounts(
  tenantId: string,
): Promise<BankAccountRow[]> {
  return db
    .select()
    .from(schema.bankAccounts)
    .where(eq(schema.bankAccounts.tenantId, tenantId))
    .orderBy(asc(schema.bankAccounts.banco));
}

export async function getChartAccounts(
  tenantId: string,
): Promise<ChartAccountRow[]> {
  return db
    .select()
    .from(schema.chartAccounts)
    .where(eq(schema.chartAccounts.tenantId, tenantId));
}

/**
 * Uso real do Plano de Contas (Prompt G, Parte 2 — somente leitura).
 * Só contagens, por (conta, categoria DRE, competência) nos lançamentos de
 * despesa das obras informadas, e em quais obras cada conta tem linha de
 * Orçamento/Previsão. Nenhum valor. Filtro de tenant explícito nas duas
 * consultas (8.5); a página só chama quando o usuário vê a tela de origem.
 */
export async function getUsoDoPlanoDeContas(
  tenantId: string,
  projectIds: string[],
): Promise<{
  lancamentos: { code: string; categoria: string | null; competencia: string | null; ultimaCriacao: string; n: number }[];
  orcamento: { code: string; kind: string; categoria: string | null; projeto: string }[];
}> {
  if (projectIds.length === 0) return { lancamentos: [], orcamento: [] };
  const [lanc, orc] = await Promise.all([
    db
      .select({
        code: schema.despesas.contaCef,
        categoria: schema.despesas.categoriaDre,
        competencia: schema.despesas.competencia,
        ultima: max(schema.despesas.createdAt),
        n: count(),
      })
      .from(schema.despesas)
      .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
      .where(and(eq(schema.despesas.tenantId, tenantId), inArray(schema.versions.projectId, projectIds), isNotNull(schema.despesas.contaCef)))
      .groupBy(schema.despesas.contaCef, schema.despesas.categoriaDre, schema.despesas.competencia),
    db
      .selectDistinct({ code: schema.budgetAccounts.rowKey, kind: schema.budgetAccounts.kind, categoria: schema.budgetAccounts.dreCategory, projeto: schema.projects.name })
      .from(schema.budgetAccounts)
      .innerJoin(schema.versions, eq(schema.budgetAccounts.versionId, schema.versions.id))
      .innerJoin(schema.projects, eq(schema.versions.projectId, schema.projects.id))
      .where(and(eq(schema.budgetAccounts.tenantId, tenantId), inArray(schema.versions.projectId, projectIds))),
  ]);
  return {
    lancamentos: lanc
      .filter((l) => !!l.code)
      .map((l) => ({ code: l.code as string, categoria: l.categoria ?? null, competencia: l.competencia ?? null, ultimaCriacao: l.ultima ? new Date(l.ultima).toISOString().slice(0, 10) : "", n: Number(l.n) })),
    orcamento: orc.map((o) => ({ code: o.code, kind: o.kind, categoria: o.categoria ?? null, projeto: o.projeto })),
  };
}

export async function getDespesas(versionId: string): Promise<DespesaRow[]> {
  return db
    .select()
    .from(schema.despesas)
    .where(eq(schema.despesas.versionId, versionId))
    // §37 — competência em texto: ordem cronológica, com desempate estável.
    .orderBy(asc(chaveCompetencia(schema.despesas.competencia)), asc(schema.despesas.createdAt), asc(schema.despesas.id));
}

/**
 * Uma despesa pelo id, no escopo do TENANT (independente da versão), junto do
 * projeto a que pertence.
 *
 * Por que existe: a lista de Despesas/Lançamentos é escopada à versão "atual"
 * do projeto, enquanto Contas a Pagar é escopada ao tenant (sem filtro de kind).
 * Uma despesa gravada numa versão que não é a atual aparecia em Contas a Pagar
 * mas sumia da tela de Despesas — e o deep link "?edit=" caía silenciosamente
 * num formulário em branco, deixando o registro sem como ser editado ou
 * cancelado. Esta consulta é o fallback do deep link: o registro passa a ser
 * SEMPRE alcançável. Nada é escondido de nenhuma tela.
 */
export async function getDespesaNoTenant(
  tenantId: string,
  despesaId: string,
): Promise<(DespesaRow & { projectId: string; versionKind: string }) | undefined> {
  const [row] = await db
    .select({
      d: schema.despesas,
      projectId: schema.versions.projectId,
      versionKind: schema.versions.kind,
    })
    .from(schema.despesas)
    .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
    .where(
      and(eq(schema.despesas.id, despesaId), eq(schema.despesas.tenantId, tenantId)),
    )
    .limit(1);
  return row
    ? { ...row.d, projectId: row.projectId, versionKind: row.versionKind }
    : undefined;
}

export type DespesaComOrigem = DespesaRow & {
  projectId: string;
  projectName: string;
  projectKind: string;
  /** rótulo de origem: obra (projeto) ou "Filial/Matriz". */
  origem: string;
};

/**
 * Todas as despesas do tenant (todos os projetos/filiais), na versão Atual de
 * cada projeto, com o rótulo de origem — base da consulta consolidada.
 */
export async function getDespesasByTenant(
  tenantId: string,
): Promise<DespesaComOrigem[]> {
  const rows = await db
    .select({
      d: schema.despesas,
      projectId: schema.projects.id,
      projectName: schema.projects.name,
      projectKind: schema.projects.kind,
    })
    .from(schema.despesas)
    .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
    .innerJoin(schema.projects, eq(schema.versions.projectId, schema.projects.id))
    .where(
      and(
        eq(schema.despesas.tenantId, tenantId),
        eq(schema.versions.kind, "atual"),
      ),
    )
    .orderBy(asc(chaveCompetencia(schema.despesas.competencia)), asc(schema.despesas.createdAt), asc(schema.despesas.id));
  return rows.map((r) => ({
    ...r.d,
    projectId: r.projectId,
    projectName: r.projectName,
    projectKind: r.projectKind,
    origem: r.projectKind === "office" ? `Filial/Matriz · ${r.projectName}` : r.projectName,
  }));
}

/** Prompt R, 1.2/1.3 — a parcela que esta linha representa, quando a despesa é parcelada. */
export interface ParcelaDaLinha {
  numero: number;
  total: number;
  chequeNumero: string | null;
  bomPara: string | null;
}

export interface ContaPagarRow {
  id: string;
  /** id da despesa raiz (igual a `id` quando a linha não é de parcela). */
  despesaId?: string;
  parcela?: ParcelaDaLinha;
  numDoc: string | null;
  fornecedorNome: string | null;
  descricao: string | null;
  categoriaDre: string | null;
  contaCef: string | null;
  valor: number;
  vencimento: string | null;
  competencia: string | null;
  dataPagamento: string | null;
  formaPagamento: string | null;
  status: string | null;
  /**
   * Saldo a pagar (Prompt I, §15): valor − principal pago − abatimentos de
   * acertos ativos. É o que ainda vai sair do caixa; o "Pendente" soma isto.
   */
  saldo: number;
  /** kind da versão da despesa ("atual", "budget", "forecast"…). §10 */
  versionKind: string;
  versionLabel: string;
  projectId: string;
  projectName: string;
  clienteId: string | null;
  clienteNome: string | null;
  /**
   * "obrigacao" identifica as linhas de restituição a terceiros (§11), que a
   * tela de Contas a Pagar acrescenta às despesas. Ausente/"despesa" para tudo
   * que vem de `getContasPagar`, cujo retorno não mudou — ela também alimenta
   * Dashboard, Fechamento e a conciliação do extrato.
   */
  origem?: "despesa" | "obrigacao" | "fatura";
  /** ID da obrigação quando `origem === "obrigacao"`. */
  obrigacaoId?: string;
  /** Prompt U — a compra foi no cartão: em Contas a Pagar quem aparece é a fatura (2.6). */
  cartaoId?: string | null;
  /** Prompt U — ID da fatura quando `origem === "fatura"`. */
  faturaId?: string;
  /** Prompt U, 2.7 — fatura do ciclo aberto: obrigação prevista, o valor ainda cresce. */
  prevista?: boolean;
}

/**
 * Contas a pagar do tenant: despesas lançadas, com fornecedor, projeto (obra),
 * cliente da obra e SALDO a pagar (§15). Base do módulo Contas a Pagar, do
 * Dashboard, do Fechamento de Caixa e da conciliação do extrato.
 *
 * §10 — Contas a Pagar é exclusivamente a versão Atual. Com a chave
 * `contas_pagar_so_atual` ligada, despesas de Orçamento/Previsão/cópias ficam
 * de fora; desligada, a lista é exatamente a de antes (muda número: ver a
 * prévia na tela). Para auditoria dessas linhas, use
 * `getContasPagarEmPlanejamento` — nunca no operacional.
 */
export async function getContasPagar(tenantId: string): Promise<ContaPagarRow[]> {
  const soAtual = await chaveLigada(tenantId, "contas_pagar_so_atual");
  return lerContasPagar(tenantId, soAtual ? "atual" : "todas");
}

/**
 * Prompt R, seção 1 — as parcelas das despesas de Contas a Pagar, para a tela
 * listar POR OBRIGAÇÃO QUE VENCE. Consulta própria da tela: `getContasPagar`
 * não muda, e Dashboard, Fechamento e conciliação seguem iguais (seção 9).
 * Só leitura; respeita a mesma chave de versão.
 */
export interface ParcelaContasPagar {
  despesaId: string;
  numero: number;
  vencimento: string | null;
  valorOriginal: number;
  valorPago: number;
  status: string;
  dataPagamento: string | null;
  chequeNumero: string | null;
  bomPara: string | null;
}

export async function getParcelasContasPagar(tenantId: string): Promise<ParcelaContasPagar[]> {
  const soAtual = await chaveLigada(tenantId, "contas_pagar_so_atual");
  const rows = await db
    .select({
      despesaId: schema.despesaParcelas.despesaId,
      numero: schema.despesaParcelas.numeroParcela,
      vencimento: schema.despesaParcelas.vencimento,
      valorOriginal: schema.despesaParcelas.valorOriginal,
      valorPago: schema.despesaParcelas.valorPago,
      status: schema.despesaParcelas.status,
      dataPagamento: schema.despesaParcelas.dataPagamento,
      chequeNumero: schema.despesaParcelas.numeroCheque,
      bomPara: schema.despesaParcelas.dataBomPara,
    })
    .from(schema.despesaParcelas)
    .innerJoin(schema.despesas, eq(schema.despesaParcelas.despesaId, schema.despesas.id))
    .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
    .where(and(eq(schema.despesaParcelas.tenantId, tenantId), eq(schema.despesas.cancelado, false), soAtual ? eq(schema.versions.kind, "atual") : undefined))
    .orderBy(schema.despesaParcelas.despesaId, schema.despesaParcelas.numeroParcela);
  return rows.map((r) => ({
    despesaId: r.despesaId,
    numero: r.numero,
    vencimento: r.vencimento,
    valorOriginal: Number(r.valorOriginal),
    valorPago: Number(r.valorPago ?? 0),
    status: r.status,
    dataPagamento: r.dataPagamento ?? null,
    chequeNumero: r.chequeNumero ?? null,
    bomPara: r.bomPara ?? null,
  }));
}

/** Consulta explicitamente histórica (§10): só as despesas fora da Atual. Prévia da chave. */
export async function getContasPagarEmPlanejamento(tenantId: string): Promise<ContaPagarRow[]> {
  return lerContasPagar(tenantId, "planejamento");
}

async function lerContasPagar(tenantId: string, versoes: "atual" | "planejamento" | "todas"): Promise<ContaPagarRow[]> {
  const rows = await db
    .select({
      d: schema.despesas,
      versionKind: schema.versions.kind,
      versionLabel: schema.versions.label,
      fornecedorNome: schema.stakeholders.nome,
      projectId: schema.projects.id,
      projectName: schema.projects.name,
      clienteId: schema.projects.clienteId,
      clienteNome: schema.clientes.nomeCompleto,
    })
    .from(schema.despesas)
    .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
    .innerJoin(schema.projects, eq(schema.versions.projectId, schema.projects.id))
    .leftJoin(schema.stakeholders, eq(schema.despesas.fornecedorId, schema.stakeholders.id))
    .leftJoin(schema.clientes, eq(schema.projects.clienteId, schema.clientes.id))
    .where(
      and(
        eq(schema.despesas.tenantId, tenantId),
        eq(schema.despesas.cancelado, false),
        versoes === "atual"
          ? eq(schema.versions.kind, "atual")
          : versoes === "planejamento"
            ? ne(schema.versions.kind, "atual")
            : undefined,
      ),
    );
  // §15 — uma lógica só de saldo (a mesma do acerto contábil).
  const saldos = await saldosReaisDasDespesas(db, tenantId, rows.map((r) => r.d));
  return rows.map((r) => ({
    id: r.d.id,
    numDoc: r.d.numDoc,
    fornecedorNome: r.fornecedorNome,
    descricao: r.d.obs ?? r.d.numDoc,
    categoriaDre: r.d.categoriaDre,
    contaCef: r.d.contaCef,
    valor: Number(r.d.valor),
    saldo: saldos.get(r.d.id)?.saldo ?? Number(r.d.valor),
    versionKind: r.versionKind,
    versionLabel: r.versionLabel,
    vencimento: r.d.vencimento,
    competencia: r.d.competencia,
    dataPagamento: r.d.dataCaixa,
    formaPagamento: r.d.formaPagamento,
    status: r.d.status,
    projectId: r.projectId,
    projectName: r.projectName,
    clienteId: r.clienteId,
    clienteNome: r.clienteNome,
    cartaoId: r.d.cartaoId,
  }));
}

/**
 * Prompt U, 2 — as faturas de cartão do tenant com o acumulado das compras
 * (soma das parcelas vinculadas, só de despesas não canceladas) e o que já
 * foi pago. Estado e saldo são derivados em `calc/fatura.ts`.
 */
export interface FaturaCartaoView {
  id: string;
  cartaoId: string;
  cartaoNome: string;
  fechamento: string;
  vencimento: string;
  valorCompras: number;
  valorPago: number;
  qtdCompras: number;
  /** 4.1 — compras lançadas neste ciclo (1ª parcela) e parcelas de compras anteriores que caem nele. */
  valorNovas: number;
  valorParceladas: number;
  /** 3.4 — já tem a despesa de juros cobrados? */
  jurosDespesaId: string | null;
  /** 6.2 — créditos de estorno nesta fatura ainda não aplicados num pagamento. */
  creditos: number;
}

export async function getFaturasCartao(tenantId: string, cartaoId?: string): Promise<FaturaCartaoView[]> {
  const rows = await db
    .select({
      f: schema.faturasCartao,
      apelido: schema.cartoesCredito.apelido,
      ultimos4: schema.cartoesCredito.ultimos4,
      valorCompras: sql<string>`coalesce(sum(case when ${schema.despesas.cancelado} = false then ${schema.despesaParcelas.valorOriginal} else 0 end), 0)`,
      valorPago: sql<string>`coalesce(sum(case when ${schema.despesas.cancelado} = false then ${schema.despesaParcelas.valorPago} else 0 end), 0)`,
      qtdCompras: sql<number>`count(distinct case when ${schema.despesas.cancelado} = false then ${schema.despesas.id} end)::int`,
      valorNovas: sql<string>`coalesce(sum(case when ${schema.despesas.cancelado} = false and ${schema.despesaParcelas.numeroParcela} = 1 then ${schema.despesaParcelas.valorOriginal} else 0 end), 0)`,
      valorParceladas: sql<string>`coalesce(sum(case when ${schema.despesas.cancelado} = false and ${schema.despesaParcelas.numeroParcela} > 1 then ${schema.despesaParcelas.valorOriginal} else 0 end), 0)`,
      creditos: sql<string>`coalesce((select sum(e.valor) from estorno_cartao e where e.fatura_id = ${schema.faturasCartao.id} and e.aplicado_em is null), 0)`,
    })
    .from(schema.faturasCartao)
    .innerJoin(schema.cartoesCredito, eq(schema.faturasCartao.cartaoId, schema.cartoesCredito.id))
    .leftJoin(schema.despesaParcelas, eq(schema.despesaParcelas.faturaId, schema.faturasCartao.id))
    .leftJoin(schema.despesas, eq(schema.despesaParcelas.despesaId, schema.despesas.id))
    .where(and(eq(schema.faturasCartao.tenantId, tenantId), cartaoId ? eq(schema.faturasCartao.cartaoId, cartaoId) : undefined))
    .groupBy(schema.faturasCartao.id, schema.cartoesCredito.apelido, schema.cartoesCredito.ultimos4)
    .orderBy(schema.cartoesCredito.apelido, schema.faturasCartao.fechamento);
  return rows.map((r) => ({
    id: r.f.id,
    cartaoId: r.f.cartaoId,
    cartaoNome: `${r.apelido}${r.ultimos4 ? " •••• " + r.ultimos4 : ""}`,
    fechamento: r.f.fechamento,
    vencimento: r.f.vencimento,
    valorCompras: Number(r.valorCompras),
    valorPago: Number(r.valorPago),
    qtdCompras: Number(r.qtdCompras),
    valorNovas: Number(r.valorNovas),
    valorParceladas: Number(r.valorParceladas),
    jurosDespesaId: r.f.jurosDespesaId,
    creditos: Number(r.creditos),
  }));
}

/** Prompt U, 5 — todas as compras (parcelas) de um cartão com a fatura de cada uma, para a conferência. */
export async function getComprasDoCartao(tenantId: string, cartaoId: string): Promise<(CompraDaFatura & { faturaFechamento: string; faturaId: string })[]> {
  const rows = await db
    .select({ p: schema.despesaParcelas, d: schema.despesas, fornecedorNome: schema.stakeholders.nome, projectId: schema.projects.id, projectName: schema.projects.name, fechamento: schema.faturasCartao.fechamento, faturaId: schema.faturasCartao.id })
    .from(schema.despesaParcelas)
    .innerJoin(schema.faturasCartao, eq(schema.despesaParcelas.faturaId, schema.faturasCartao.id))
    .innerJoin(schema.despesas, eq(schema.despesaParcelas.despesaId, schema.despesas.id))
    .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
    .innerJoin(schema.projects, eq(schema.versions.projectId, schema.projects.id))
    .leftJoin(schema.stakeholders, eq(schema.despesas.fornecedorId, schema.stakeholders.id))
    .where(and(eq(schema.despesaParcelas.tenantId, tenantId), eq(schema.faturasCartao.cartaoId, cartaoId), eq(schema.despesas.cancelado, false)))
    .orderBy(schema.faturasCartao.fechamento, schema.despesas.numDoc, schema.despesaParcelas.numeroParcela);
  return rows.map((r) => ({
    parcelaId: r.p.id,
    despesaId: r.d.id,
    numDoc: r.d.numDoc,
    descricao: r.d.obs,
    fornecedorNome: r.fornecedorNome,
    projectId: r.projectId,
    projectName: r.projectName,
    competencia: r.d.competencia,
    numero: r.p.numeroParcela,
    total: r.d.qtdParcelas ?? 1,
    valor: Number(r.p.valorOriginal),
    valorPago: Number(r.p.valorPago ?? 0),
    faturaFechamento: r.fechamento,
    faturaId: r.faturaId,
  }));
}

/** Prompt U, 7 — as compras de todos os cartões do tenant (para o assistente; sem número de cartão). */
export async function getComprasDosCartoes(tenantId: string): Promise<{ despesaId: string; numDoc: string | null; descricao: string | null; projectId: string | null; projectName: string | null; fornecedorNome: string | null; valor: number; numero: number; total: number; faturaFechamento: string; cartaoId: string }[]> {
  const rows = await db
    .select({ p: schema.despesaParcelas, d: schema.despesas, fornecedorNome: schema.stakeholders.nome, projectId: schema.projects.id, projectName: schema.projects.name, fechamento: schema.faturasCartao.fechamento, cartaoId: schema.faturasCartao.cartaoId })
    .from(schema.despesaParcelas)
    .innerJoin(schema.faturasCartao, eq(schema.despesaParcelas.faturaId, schema.faturasCartao.id))
    .innerJoin(schema.despesas, eq(schema.despesaParcelas.despesaId, schema.despesas.id))
    .leftJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
    .leftJoin(schema.projects, eq(schema.versions.projectId, schema.projects.id))
    .leftJoin(schema.stakeholders, eq(schema.despesas.fornecedorId, schema.stakeholders.id))
    .where(and(eq(schema.despesaParcelas.tenantId, tenantId), eq(schema.despesas.cancelado, false)));
  return rows.map((r) => ({ despesaId: r.d.id, numDoc: r.d.numDoc, descricao: r.d.obs, projectId: r.projectId ?? null, projectName: r.projectName ?? null, fornecedorNome: r.fornecedorNome, valor: Number(r.p.valorOriginal), numero: r.p.numeroParcela, total: r.d.qtdParcelas ?? 1, faturaFechamento: r.fechamento, cartaoId: r.cartaoId }));
}

/** Prompt U, 5 — itens do extrato subido de um cartão. */
export async function getExtratoCartao(tenantId: string, cartaoId: string): Promise<{ id: string; data: string | null; descricao: string | null; valor: number; despesaId: string | null; conciliadoPor: string | null }[]> {
  const rows = await db
    .select()
    .from(schema.extratoCartao)
    .where(and(eq(schema.extratoCartao.tenantId, tenantId), eq(schema.extratoCartao.cartaoId, cartaoId)))
    .orderBy(schema.extratoCartao.data, schema.extratoCartao.createdAt);
  // Prompt AT §6: `despesaId` = a compra com que a linha foi conciliada.
  return rows.map((r) => ({ id: r.id, data: r.data, descricao: r.descricao, valor: Number(r.valor), despesaId: r.despesaId, conciliadoPor: r.conciliadoPor }));
}

/** Prompt U, 6 — estornos de um cartão (com o PED da compra). */
export interface EstornoView {
  id: string;
  despesaId: string | null;
  numDoc: string | null;
  faturaId: string | null;
  valor: number;
  data: string | null;
  origem: string;
  extratoItemId: string | null;
  aplicadoEm: string | null;
}

export async function getEstornosDoCartao(tenantId: string, cartaoId: string): Promise<EstornoView[]> {
  const rows = await db
    .select({ e: schema.estornosCartao, numDoc: schema.despesas.numDoc })
    .from(schema.estornosCartao)
    .leftJoin(schema.despesas, eq(schema.estornosCartao.despesaId, schema.despesas.id))
    .where(and(eq(schema.estornosCartao.tenantId, tenantId), eq(schema.estornosCartao.cartaoId, cartaoId)))
    .orderBy(schema.estornosCartao.createdAt);
  return rows.map((r) => ({ id: r.e.id, despesaId: r.e.despesaId, numDoc: r.numDoc, faturaId: r.e.faturaId, valor: Number(r.e.valor), data: r.e.data, origem: r.e.origem, extratoItemId: r.e.extratoItemId, aplicadoEm: r.e.aplicadoEm }));
}

/** Prompt U, 1.4 — quantas compras e faturas cada cartão tem (decide excluir × inativar). */
export async function getVinculosDosCartoes(tenantId: string): Promise<Record<string, { compras: number; faturas: number }>> {
  const n = sql<number>`count(*)::int`;
  const [compras, faturas] = await Promise.all([
    db.select({ id: schema.despesas.cartaoId, n }).from(schema.despesas).where(and(eq(schema.despesas.tenantId, tenantId), isNotNull(schema.despesas.cartaoId))).groupBy(schema.despesas.cartaoId),
    db.select({ id: schema.faturasCartao.cartaoId, n }).from(schema.faturasCartao).where(eq(schema.faturasCartao.tenantId, tenantId)).groupBy(schema.faturasCartao.cartaoId),
  ]);
  const out: Record<string, { compras: number; faturas: number }> = {};
  for (const c of compras) if (c.id) out[c.id] = { compras: Number(c.n), faturas: 0 };
  for (const f of faturas) out[f.id] = { compras: out[f.id]?.compras ?? 0, faturas: Number(f.n) };
  return out;
}

/** Prompt U, 2 — as compras (parcelas) de uma fatura, para a tela do cartão. */
export interface CompraDaFatura {
  parcelaId: string;
  despesaId: string;
  numDoc: string | null;
  descricao: string | null;
  fornecedorNome: string | null;
  projectId: string;
  projectName: string;
  competencia: string | null;
  numero: number;
  total: number;
  valor: number;
  valorPago: number;
}

export async function getComprasDaFatura(tenantId: string, faturaId: string): Promise<CompraDaFatura[]> {
  const rows = await db
    .select({
      p: schema.despesaParcelas,
      d: schema.despesas,
      fornecedorNome: schema.stakeholders.nome,
      projectId: schema.projects.id,
      projectName: schema.projects.name,
    })
    .from(schema.despesaParcelas)
    .innerJoin(schema.despesas, eq(schema.despesaParcelas.despesaId, schema.despesas.id))
    .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
    .innerJoin(schema.projects, eq(schema.versions.projectId, schema.projects.id))
    .leftJoin(schema.stakeholders, eq(schema.despesas.fornecedorId, schema.stakeholders.id))
    .where(and(eq(schema.despesaParcelas.tenantId, tenantId), eq(schema.despesaParcelas.faturaId, faturaId), eq(schema.despesas.cancelado, false)))
    .orderBy(schema.despesas.numDoc, schema.despesaParcelas.numeroParcela);
  return rows.map((r) => ({
    parcelaId: r.p.id,
    despesaId: r.d.id,
    numDoc: r.d.numDoc,
    descricao: r.d.obs,
    fornecedorNome: r.fornecedorNome,
    projectId: r.projectId,
    projectName: r.projectName,
    competencia: r.d.competencia,
    numero: r.p.numeroParcela,
    total: r.d.qtdParcelas ?? 1,
    valor: Number(r.p.valorOriginal),
    valorPago: Number(r.p.valorPago ?? 0),
  }));
}

export interface ReceivableRow {
  refId: string;
  dia: string; // "MM/DD/YYYY"
  valor: number;
  descricao: string;
  unitCode: string;
  projectId: string;
  projectName: string;
  clienteNome: string | null;
  status: string;
  /** Seção do plano de pagamento (ver `Receivable.secao`). */
  secao: string;
  /** Prompt AT §5 — a unidade e a chave estável da parcela ("Mensais#12"). */
  unitId: string;
  chave: string;
}

/**
 * Recebíveis previstos do tenant: expande os planos de pagamento das unidades
 * vendidas (versão Atual de cada obra) em recebíveis datados, com projeto e
 * cliente comprador. Base do painel "Receitas a Receber do Dia".
 */
export async function getReceivables(tenantId: string, projectId?: string): Promise<ReceivableRow[]> {
  const rows = await db
    .select({
      u: schema.units,
      projectId: schema.projects.id,
      projectName: schema.projects.name,
      clienteNome: schema.clientes.nomeCompleto,
    })
    .from(schema.units)
    .innerJoin(schema.versions, eq(schema.units.versionId, schema.versions.id))
    .innerJoin(schema.projects, eq(schema.versions.projectId, schema.projects.id))
    .leftJoin(
      schema.clientes,
      and(
        eq(schema.clientes.unitCode, schema.units.code),
        eq(schema.clientes.tenantId, tenantId),
      ),
    )
    // CR-06 — a obra filtra na consulta, não em memória depois.
    .where(
      and(
        eq(schema.units.tenantId, tenantId),
        eq(schema.versions.kind, "atual"),
        ...(projectId ? [eq(schema.versions.projectId, projectId)] : []),
      ),
    );

  const out: ReceivableRow[] = [];
  // Chave `plano_definicao_nova` (Prompt AR, Fase 2): regras das BAR-1 a BAR-4.
  const definicaoNova = await chaveLigada(tenantId, "plano_definicao_nova");
  for (const r of rows) {
    const recs = expandUnitReceivables(r.u.paymentPlan, r.u.status, { definicaoNova });
    for (let i = 0; i < recs.length; i++) {
      const rec = recs[i];
      out.push({
        refId: `${r.u.id}:${i}`,
        dia: rec.dia,
        valor: rec.valor,
        descricao: `${r.u.code} — ${rec.label}`,
        unitCode: r.u.code,
        projectId: r.projectId,
        projectName: r.projectName,
        clienteNome: r.clienteNome,
        status: "A receber",
        secao: rec.secao,
        unitId: r.u.id,
        chave: rec.chave,
      });
    }
  }
  return out;
}

export type DailyClosingRow = typeof schema.dailyClosings.$inferSelect & {
  projectName: string | null;
  clienteNome: string | null;
};

/** Fechamentos diários (Balanço do Dia) do tenant, mais recentes primeiro. */
export async function getDailyClosings(tenantId: string): Promise<DailyClosingRow[]> {
  const rows = await db
    .select({
      c: schema.dailyClosings,
      projectName: schema.projects.name,
      clienteNome: schema.clientes.nomeCompleto,
    })
    .from(schema.dailyClosings)
    .leftJoin(schema.projects, eq(schema.dailyClosings.projectId, schema.projects.id))
    .leftJoin(schema.clientes, eq(schema.projects.clienteId, schema.clientes.id))
    .where(eq(schema.dailyClosings.tenantId, tenantId))
    .orderBy(desc(schema.dailyClosings.closedAt));
  return rows.map((r) => ({
    ...r.c,
    projectName: r.projectName,
    clienteNome: r.clienteNome,
  }));
}

export type StockItemRow = typeof schema.stockItems.$inferSelect;
export type StockMovementRow = typeof schema.stockMovements.$inferSelect & {
  itemNome: string;
  unidade: string;
  projectName: string | null;
  clienteNome: string | null;
  despesaNumDoc: string | null;
  permutaDescricao: string | null;
};

export interface DespesaOption {
  id: string;
  numDoc: string;
  fornecedorNome: string | null;
  valor: number;
}
/** Despesas do tenant para vincular a uma entrada de estoque (mais recentes primeiro). */
export async function getDespesaOptions(tenantId: string): Promise<DespesaOption[]> {
  const rows = await db
    .select({
      id: schema.despesas.id,
      numDoc: schema.despesas.numDoc,
      valor: schema.despesas.valor,
      fornecedorNome: schema.stakeholders.nome,
    })
    .from(schema.despesas)
    .leftJoin(schema.stakeholders, eq(schema.despesas.fornecedorId, schema.stakeholders.id))
    .where(eq(schema.despesas.tenantId, tenantId))
    .orderBy(desc(schema.despesas.createdAt))
    .limit(500);
  return rows.map((r) => ({
    id: r.id,
    numDoc: r.numDoc ?? "—",
    fornecedorNome: r.fornecedorNome,
    valor: Number(r.valor),
  }));
}

export interface PermutaOption {
  id: string;
  descricao: string | null;
  cliente: string | null;
  estimado: number | null;
}
/** Permutas do tenant para vincular a uma entrada de estoque recebida via permuta. */
export async function getPermutaOptions(tenantId: string): Promise<PermutaOption[]> {
  const rows = await db
    .select({
      id: schema.permutas.id,
      descricao: schema.permutas.descricao,
      cliente: schema.permutas.cliente,
      estimado: schema.permutas.estimado,
    })
    .from(schema.permutas)
    .where(eq(schema.permutas.tenantId, tenantId))
    .orderBy(desc(schema.permutas.id))
    .limit(500);
  return rows.map((r) => ({
    id: r.id,
    descricao: r.descricao,
    cliente: r.cliente,
    estimado: r.estimado === null ? null : Number(r.estimado),
  }));
}

/** Prompt Y, 5.6 — saldo por item calculado na consulta (entrada soma, saída subtrai; negativo aparece). */
export async function getStockSaldos(tenantId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({ itemId: schema.stockMovements.itemId, saldo: sql<string>`coalesce(sum(case when ${schema.stockMovements.tipo} = 'saida' then -${schema.stockMovements.quantidade} else ${schema.stockMovements.quantidade} end), 0)` })
    .from(schema.stockMovements)
    .where(eq(schema.stockMovements.tenantId, tenantId))
    .groupBy(schema.stockMovements.itemId);
  return new Map(rows.map((r) => [r.itemId, Number(r.saldo)]));
}

export interface FiltroMovimentos {
  pagina?: number;
  porPagina?: number;
  itemId?: string | null;
  projectId?: string | null;
  tipo?: "entrada" | "saida" | null;
  /** ISO YYYY-MM-DD */
  de?: string | null;
  ate?: string | null;
}
export type StockMovementPageRow = StockMovementRow & { estornado: boolean; valor: number };

/** Prompt Y, 5.6 — movimentos paginados (50 por página) com filtros no SQL. */
export async function getStockMovementsPage(tenantId: string, f: FiltroMovimentos = {}): Promise<{ rows: StockMovementPageRow[]; total: number; pagina: number; porPagina: number }> {
  const porPagina = Math.min(200, Math.max(1, f.porPagina ?? 50));
  const pagina = Math.max(1, f.pagina ?? 1);
  const conds = [eq(schema.stockMovements.tenantId, tenantId)];
  if (f.itemId) conds.push(eq(schema.stockMovements.itemId, f.itemId));
  if (f.projectId) conds.push(eq(schema.stockMovements.projectId, f.projectId));
  if (f.tipo) conds.push(eq(schema.stockMovements.tipo, f.tipo));
  if (f.de) conds.push(gte(chaveDataBR(schema.stockMovements.data), f.de.replace(/-/g, "")));
  if (f.ate) conds.push(lte(chaveDataBR(schema.stockMovements.data), f.ate.replace(/-/g, "")));
  const where = and(...conds);
  const estornos = alias(schema.stockMovements, "estornos");
  const [[cnt], rows] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.stockMovements).where(where),
    db
      .select({
        m: schema.stockMovements,
        itemNome: schema.stockItems.nome,
        unidade: schema.stockItems.unidade,
        projectName: schema.projects.name,
        clienteNome: schema.clientes.nomeCompleto,
        despesaNumDoc: schema.despesas.numDoc,
        permutaDescricao: schema.permutas.descricao,
        estornadoPor: estornos.id,
      })
      .from(schema.stockMovements)
      .innerJoin(schema.stockItems, eq(schema.stockMovements.itemId, schema.stockItems.id))
      .leftJoin(schema.projects, eq(schema.stockMovements.projectId, schema.projects.id))
      .leftJoin(schema.clientes, eq(schema.projects.clienteId, schema.clientes.id))
      .leftJoin(schema.despesas, eq(schema.stockMovements.despesaId, schema.despesas.id))
      .leftJoin(schema.permutas, eq(schema.stockMovements.permutaId, schema.permutas.id))
      .leftJoin(estornos, eq(estornos.estornoDeId, schema.stockMovements.id))
      .where(where)
      .orderBy(desc(chaveDataBR(schema.stockMovements.data)), desc(schema.stockMovements.createdAt))
      .limit(porPagina)
      .offset((pagina - 1) * porPagina),
  ]);
  return {
    rows: rows.map((r) => ({ ...r.m, itemNome: r.itemNome, unidade: r.unidade, projectName: r.projectName, clienteNome: r.clienteNome, despesaNumDoc: r.despesaNumDoc, permutaDescricao: r.permutaDescricao, estornado: !!r.estornadoPor, valor: Math.round(Number(r.m.quantidade) * Number(r.m.custoUnit) * 100) / 100 })),
    total: cnt?.n ?? 0,
    pagina,
    porPagina,
  };
}

export interface DespesaParaEstoque {
  id: string;
  numDoc: string | null;
  fornecedor: string | null;
  competencia: string | null;
  valor: number;
  projectName: string | null;
  /** soma (entradas − estornos) já lançada contra esta despesa, a custo. */
  entradasSoma: number;
}
/** Prompt Y, 3.3 — despesas com o que a tela mostra para conferir a compra (fornecedor, competência, valor, obra). */
export async function getDespesasParaEstoque(tenantId: string): Promise<DespesaParaEstoque[]> {
  const rows = await db
    .select({
      id: schema.despesas.id,
      numDoc: schema.despesas.numDoc,
      fornecedor: schema.stakeholders.nome,
      competencia: schema.despesas.competencia,
      valor: schema.despesas.valor,
      projectName: schema.projects.name,
      entradasSoma: sql<string>`coalesce((select sum(case when sm.tipo = 'saida' then -1 else 1 end * sm.quantidade * sm.custo_unit) from stock_movement sm where sm.despesa_id = ${schema.despesas.id}), 0)`,
    })
    .from(schema.despesas)
    .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
    .leftJoin(schema.projects, eq(schema.versions.projectId, schema.projects.id))
    .leftJoin(schema.stakeholders, eq(schema.despesas.fornecedorId, schema.stakeholders.id))
    .where(and(eq(schema.despesas.tenantId, tenantId), eq(schema.despesas.cancelado, false)))
    .orderBy(desc(schema.despesas.createdAt))
    .limit(500);
  return rows.map((r) => ({ id: r.id, numDoc: r.numDoc, fornecedor: r.fornecedor, competencia: r.competencia, valor: Number(r.valor), projectName: r.projectName, entradasSoma: Number(r.entradasSoma) }));
}

export async function getStockItems(tenantId: string): Promise<StockItemRow[]> {
  return db
    .select()
    .from(schema.stockItems)
    .where(eq(schema.stockItems.tenantId, tenantId))
    .orderBy(asc(schema.stockItems.nome));
}

/** Movimentações de estoque do tenant, com item, obra e cliente. */
export async function getStockMovements(tenantId: string): Promise<StockMovementRow[]> {
  const rows = await db
    .select({
      m: schema.stockMovements,
      itemNome: schema.stockItems.nome,
      unidade: schema.stockItems.unidade,
      projectName: schema.projects.name,
      clienteNome: schema.clientes.nomeCompleto,
      despesaNumDoc: schema.despesas.numDoc,
      permutaDescricao: schema.permutas.descricao,
    })
    .from(schema.stockMovements)
    .innerJoin(schema.stockItems, eq(schema.stockMovements.itemId, schema.stockItems.id))
    .leftJoin(schema.projects, eq(schema.stockMovements.projectId, schema.projects.id))
    .leftJoin(schema.clientes, eq(schema.projects.clienteId, schema.clientes.id))
    .leftJoin(schema.despesas, eq(schema.stockMovements.despesaId, schema.despesas.id))
    .leftJoin(schema.permutas, eq(schema.stockMovements.permutaId, schema.permutas.id))
    .where(eq(schema.stockMovements.tenantId, tenantId))
    .orderBy(desc(schema.stockMovements.createdAt));
  return rows.map((r) => ({
    ...r.m,
    itemNome: r.itemNome,
    unidade: r.unidade,
    projectName: r.projectName,
    clienteNome: r.clienteNome,
    despesaNumDoc: r.despesaNumDoc,
    permutaDescricao: r.permutaDescricao,
  }));
}

export type BudgetLineRow = typeof schema.budgetLines.$inferSelect;

export interface CompareRowP {
  rowKey: string;
  label: string;
  /** null = a conta não existe nessa versão (ausente ≠ zero, Prompt F 5.3). */
  budget: number | null;
  forecast: number | null;
}
export interface ForecastComparisonData {
  ok: boolean;
  message?: string;
  forecastLabel: string;
  budgetLabel: string;
  months: string[];
  receitas: CompareRowP[];
  despesas: CompareRowP[];
  budgetByMonth: Record<string, number>;
  forecastByMonth: Record<string, number>;
  /** Prompt F, FC-07: a previsão não tem origem registrada; a tela oferece a escolha. */
  semOrigem?: boolean;
  /** Orçamentos do projeto, para a escolha explícita (só quando `semOrigem`). */
  orcamentos?: { id: string; label: string }[];
  /** true quando o Orçamento comparado foi escolhido pelo usuário (`?base=`), não a origem. */
  baseEscolhida?: boolean;
  /** 5.2: o que está sendo comparado. */
  forecastCriadaEm?: string | null;
  regime?: string;
  /** 5.0.4: data da última replicação do Atual em cada lado (retrato do índice), ou null. */
  replicacao?: { budget: string | null; forecast: string | null };
}

/**
 * Comparação entre um Forecast e o Budget de origem (spec §16). Reaproveita
 * getBudgetPlanning para as duas versões e calcula a variação por conta e por
 * mês. Se o Forecast não tem origem registrada, usa o Budget padrão do projeto.
 */
export async function getForecastComparison(
  tenantId: string,
  forecastVersionId: string,
  baseVersionId?: string | null,
): Promise<ForecastComparisonData> {
  const empty: ForecastComparisonData = {
    ok: false,
    forecastLabel: "",
    budgetLabel: "",
    months: [],
    receitas: [],
    despesas: [],
    budgetByMonth: {},
    forecastByMonth: {},
  };
  const [fv] = await db
    .select()
    .from(schema.versions)
    .where(
      and(
        eq(schema.versions.id, forecastVersionId),
        eq(schema.versions.tenantId, tenantId),
        eq(schema.versions.kind, "forecast"),
      ),
    )
    .limit(1);
  if (!fv) return { ...empty, message: "Forecast não encontrado." };

  // FC-07: sem origem registrada a comparação NÃO escolhe um Orçamento
  // sozinha — devolve a lista para a escolha explícita (`?base=`), validada
  // aqui contra o projeto e o tenant.
  const budgets = await getProjectVersionsByKind(tenantId, fv.projectId, "budget");
  let budgetVersionId = fv.sourceVersionId;
  let baseEscolhida = false;
  if (baseVersionId) {
    if (!budgets.some((b) => b.id === baseVersionId)) return { ...empty, forecastLabel: fv.label, message: "O Orçamento escolhido não é deste projeto." };
    budgetVersionId = baseVersionId;
    baseEscolhida = baseVersionId !== fv.sourceVersionId;
  }
  if (!budgetVersionId) {
    if (budgets.length === 0) return { ...empty, forecastLabel: fv.label, message: "Projeto sem Orçamento para comparar." };
    return { ...empty, forecastLabel: fv.label, semOrigem: true, orcamentos: budgets.map((b) => ({ id: b.id, label: b.label })), message: "Esta previsão não tem Orçamento de origem registrado. Escolha com qual Orçamento comparar." };
  }
  const [bv] = await db
    .select({ label: schema.versions.label })
    .from(schema.versions)
    .where(eq(schema.versions.id, budgetVersionId))
    .limit(1);

  const [budgetData, forecastData] = await Promise.all([
    getBudgetPlanning(tenantId, fv.projectId, "budget", budgetVersionId),
    getBudgetPlanning(tenantId, fv.projectId, "forecast", forecastVersionId),
  ]);
  const months = forecastData.months.length ? forecastData.months : budgetData.months;

  const merge = (
    bRows: import("./planning").PlanningAccountRow[],
    fRows: import("./planning").PlanningAccountRow[],
  ): CompareRowP[] => {
    // 5.3: conta de um lado só fica `null` do outro — ausente, não zero.
    const map = new Map<string, CompareRowP>();
    for (const r of bRows)
      map.set(r.rowKey, { rowKey: r.rowKey, label: r.label, budget: r.total, forecast: null });
    for (const r of fRows) {
      const cur = map.get(r.rowKey);
      if (cur) cur.forecast = r.total;
      else map.set(r.rowKey, { rowKey: r.rowKey, label: r.label, budget: null, forecast: r.total });
    }
    return [...map.values()];
  };

  const monthlyTotals = (rows: import("./planning").PlanningAccountRow[]) => {
    const out: Record<string, number> = {};
    for (const m of months) {
      let s = 0;
      for (const r of rows) s += Math.round(r.total * (Number(r.pct[m]) || 0)) / 100;
      out[m] = s;
    }
    return out;
  };
  // Prompt F, FC-09: o mês a mês é o RESULTADO (receitas − despesas) por
  // competência — antes somava os dois blocos, número sem significado.
  const resultadoMensal = (receitas: Record<string, number>, despesas: Record<string, number>) => {
    const out: Record<string, number> = {};
    for (const m of months) out[m] = Math.round(((receitas[m] || 0) - (despesas[m] || 0)) * 100) / 100;
    return out;
  };

  return {
    ok: true,
    forecastLabel: fv.label,
    budgetLabel: bv?.label ?? "Orçamento",
    months,
    semOrigem: false,
    baseEscolhida,
    forecastCriadaEm: new Date(fv.createdAt).toISOString(),
    regime: "competência",
    // 5.0.4: os dois lados são retrato (budget_line); a data da replicação
    // diz de quando é o índice de cada um.
    replicacao: { budget: budgetData.ultimaReplicacao, forecast: forecastData.ultimaReplicacao },
    receitas: merge(budgetData.receitas, forecastData.receitas),
    despesas: merge(budgetData.despesas, forecastData.despesas),
    budgetByMonth: resultadoMensal(
      monthlyTotals(budgetData.receitas),
      monthlyTotals(budgetData.despesas),
    ),
    forecastByMonth: resultadoMensal(
      monthlyTotals(forecastData.receitas),
      monthlyTotals(forecastData.despesas),
    ),
  };
}

/** Versões de um tipo (budget/forecast) de um projeto — para seletores/criação. */
export async function getProjectVersionsByKind(
  tenantId: string,
  projectId: string,
  kind: "budget" | "forecast",
): Promise<{ id: string; label: string; status: string }[]> {
  const rows = await db
    .select({
      id: schema.versions.id,
      label: schema.versions.label,
      status: schema.versions.status,
    })
    .from(schema.versions)
    .where(
      and(
        eq(schema.versions.tenantId, tenantId),
        eq(schema.versions.projectId, projectId),
        eq(schema.versions.kind, kind),
      ),
    )
    .orderBy(asc(schema.versions.createdAt));
  return rows;
}

/**
 * Lançamentos simplificados (Budget/Forecast) de uma versão.
 *
 * `respeitarSituacao` (Prompt H, 4.3): relatório passa `true` e recebe vazio
 * quando a versão está fora dos relatórios (ver `planejamentoForaDosRelatorios`);
 * a edição/exportação da própria versão passa `false` (padrão) e lê tudo.
 */
export async function getBudgetLines(versionId: string, opts: { respeitarSituacao?: boolean } = {}): Promise<BudgetLineRow[]> {
  if (opts.respeitarSituacao && (await planejamentoForaDosRelatorios(await versaoKindETenant(versionId)))) return [];
  return db
    .select()
    .from(schema.budgetLines)
    .where(eq(schema.budgetLines.versionId, versionId));
}

/**
 * Carga da tela de planejamento (Budget/Forecast) no modelo total + %, para um
 * PROJETO e uma VERSÃO específicos. As linhas são os GRUPOS do Plano de Contas
 * separados por natureza (receita/despesa); grupos inativos e chaves legadas
 * (ex.: "Receita"/"Outras Receitas") que já tenham dados aparecem como linhas
 * legadas para preservar o histórico. As colunas vêm do período do projeto.
 */
export async function getBudgetPlanning(
  tenantId: string,
  projectId: string,
  kind: "budget" | "forecast",
  wantedVersionId?: string | null,
): Promise<import("./planning").BudgetPlanningData> {
  const { projectPeriodMonths, monthKeyOfInternalDate } = await import("./planning");

  const [project] = await db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, projectId), eq(schema.projects.tenantId, tenantId)))
    .limit(1);

  // Previsão: da mais recente para a mais antiga (Prompt F, 2.1).
  const versionRows = project
    ? await db
        .select()
        .from(schema.versions)
        .where(and(eq(schema.versions.projectId, projectId), eq(schema.versions.kind, kind)))
        .orderBy(kind === "forecast" ? desc(schema.versions.createdAt) : asc(schema.versions.createdAt))
    : [];
  // Origem de cada versão (2.2): rótulo e tipo da versão apontada.
  const origemIds = [...new Set(versionRows.map((v) => v.sourceVersionId).filter((x): x is string => !!x))];
  const origens = origemIds.length
    ? await db
        .select({ id: schema.versions.id, label: schema.versions.label, kind: schema.versions.kind })
        .from(schema.versions)
        .where(and(eq(schema.versions.tenantId, tenantId), inArray(schema.versions.id, origemIds)))
    : [];
  const origemDe = new Map(origens.map((o) => [o.id, o]));
  const versions = versionRows.map((v) => ({
    id: v.id,
    label: v.label,
    kind: v.kind,
    status: v.status,
    isDefault: v.isDefault,
    locked: v.locked,
    sourceVersionId: v.sourceVersionId,
    sourceLabel: v.sourceVersionId ? origemDe.get(v.sourceVersionId)?.label ?? null : null,
    sourceKind: v.sourceVersionId ? origemDe.get(v.sourceVersionId)?.kind ?? null : null,
    createdAt: new Date(v.createdAt).toISOString(),
  }));
  const selected =
    versions.find((v) => v.id === wantedVersionId) ??
    versions.find((v) => v.isDefault) ??
    versions[0] ??
    null;

  // Período: obras usam as DATAS de início/fim do cadastro. Matriz/filiais
  // (kind "office") não têm cronograma → usam o ano atual + 5 anos à frente.
  let startMk = monthKeyOfInternalDate(project?.startDate);
  let endMk = monthKeyOfInternalDate(project?.endDate);
  if (project?.kind === "office") {
    const cy = new Date().getFullYear();
    startMk = `01/${cy}`;
    endMk = `12/${cy + 5}`;
  }
  const months = project ? projectPeriodMonths(startMk, endMk) : [];

  const emptyData: import("./planning").BudgetPlanningData = {
    project: {
      id: projectId,
      name: project?.name ?? "",
      mesInicial: startMk,
      mesFinal: endMk,
      recursosProprios: Number(project?.recursosProprios ?? 0) || 0,
      receitaDoCadastro: project ? totalReceitasDoProjeto(project) : null,
    },
    selecao: { receita: false, despesa: false },
    disponiveis: { receita: [], despesa: [] },
    ultimaReplicacao: null,
    totaisDaOrigem: null,
    hasPeriod: months.length > 0,
    months,
    versions,
    versionId: selected?.id ?? null,
    receitas: [],
    despesas: [],
  };
  if (!project || !selected) return emptyData;

  // Grupos do Plano de Contas (natureza derivada dos subitens; ativo = algum ativo).
  const accounts = await getChartAccounts(tenantId);
  const grpMap = new Map<string, GrupoDoPlano>();
  for (const a of accounts) {
    const g = grpMap.get(a.groupCode);
    const nat = a.natureza === "receita" ? "receita" : "despesa";
    if (!g) {
      grpMap.set(a.groupCode, {
        groupCode: a.groupCode,
        groupName: a.groupName,
        kind: a.kind,
        natureza: nat,
        ativo: a.ativo ?? true,
      });
    } else {
      if (a.ativo) g.ativo = true;
      // A natureza do grupo é derivada dos subitens pela MESMA regra do "ativo":
      // basta UM subitem de receita para o grupo ser de receita
      // (ver naturezaDoGrupo em src/lib/natureza-grupo.ts).
      //
      // Antes, a natureza era fixada pela primeira subconta encontrada e nunca
      // reavaliada. Como a coluna `natureza` tem default "despesa", um grupo
      // cuja primeira subconta ainda estivesse no default era classificado como
      // despesa inteiro e desaparecia do bloco de receitas do Budget/Forecast —
      // deixando a tela sem nenhuma linha para lançar ("Nenhuma conta de receita
      // ativa no Plano de Contas"), ou seja, o lançamento travado.
      g.natureza = naturezaDoGrupo([{ natureza: g.natureza }, { natureza: nat }]);
    }
  }
  const grupos = [...grpMap.values()];

  // Totais por conta (budget_account), pct por mês (budget_line) e a seleção
  // de linhas (budget_selecao, Prompt D BD-6) da versão.
  const [accRows, lineRows, selRows] = await Promise.all([
    db
      .select()
      .from(schema.budgetAccounts)
      .where(eq(schema.budgetAccounts.versionId, selected.id)),
    db
      .select()
      .from(schema.budgetLines)
      .where(eq(schema.budgetLines.versionId, selected.id)),
    db
      .select()
      .from(schema.budgetSelecoes)
      .where(and(eq(schema.budgetSelecoes.tenantId, tenantId), eq(schema.budgetSelecoes.versionId, selected.id)))
      .orderBy(asc(schema.budgetSelecoes.ordem), asc(schema.budgetSelecoes.createdAt)),
  ]);
  const pctOf = new Map<string, Record<string, number>>(); // key -> {mes: pct}
  for (const l of lineRows) {
    const key = `${l.kind}|${l.rowKey}`;
    const bag = pctOf.get(key) ?? {};
    bag[l.mes] = l.pct != null ? Number(l.pct) : 0;
    pctOf.set(key, bag);
  }

  // Linhas do bloco (Prompt D): fixa "Receitas do Projeto" + grupos ativos da
  // natureza (todos, ou só os selecionados) + tudo o que tem dado gravado. O
  // fallback antigo ("sem grupo de receita, todos viram receita") saiu: a
  // linha fixa garante que o bloco de receitas nunca fica vazio (BD-5).
  const selecaoDe = (nat: "receita" | "despesa"): string[] | null => {
    const chaves = selRows.filter((r) => r.kind === nat).map((r) => r.rowKey);
    return chaves.length > 0 ? chaves : null;
  };
  const contas = accRows.map((a) => ({ kind: a.kind, rowKey: a.rowKey, dreCategory: a.dreCategory, total: Number(a.total) }));
  const build = (nat: "receita" | "despesa") =>
    linhasDoBloco({
      nat,
      grupos,
      selecao: selecaoDe(nat),
      contas,
      pctDe: (kind, rowKey) => pctOf.get(`${kind}|${rowKey}`) ?? {},
      totalDoCadastro: totalReceitasDoProjeto(project),
    });

  const receitas = build("receita");
  const despesas = build("despesa");
  const disponiveisDe = (nat: "receita" | "despesa", rows: import("./planning").PlanningAccountRow[]) =>
    gruposDisponiveis(grupos, nat, rows.map((r) => r.rowKey)).map((g) => ({ code: g.groupCode, name: g.groupName }));
  // 2.6: a data da última replicação do Atual vem do log (nada novo é gravado).
  const [rep] = await db
    .select({ em: schema.auditLog.createdAt })
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.tenantId, tenantId), eq(schema.auditLog.action, "budget.replicateFromAtual"), eq(schema.auditLog.entityId, selected.id)))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(1);
  // Prompt F, 6.2: totais atuais do Orçamento de origem (só Previsão com origem).
  let totaisDaOrigem: import("./planning").BudgetPlanningData["totaisDaOrigem"] = null;
  if (kind === "forecast" && selected.sourceVersionId) {
    const contasOrigem = await db
      .select({ kind: schema.budgetAccounts.kind, rowKey: schema.budgetAccounts.rowKey, total: schema.budgetAccounts.total })
      .from(schema.budgetAccounts)
      .where(and(eq(schema.budgetAccounts.tenantId, tenantId), eq(schema.budgetAccounts.versionId, selected.sourceVersionId)));
    totaisDaOrigem = { receita: {}, despesa: {} };
    for (const c of contasOrigem) {
      if (c.kind === "receita" || c.kind === "despesa") totaisDaOrigem[c.kind][c.rowKey] = Number(c.total);
    }
  }
  return {
    ...emptyData,
    selecao: { receita: selecaoDe("receita") != null, despesa: selecaoDe("despesa") != null },
    disponiveis: { receita: disponiveisDe("receita", receitas), despesa: disponiveisDe("despesa", despesas) },
    ultimaReplicacao: rep?.em ? new Date(rep.em).toISOString() : null,
    totaisDaOrigem,
    receitas,
    despesas,
  };
}

/**
 * Versão "Atual" (detalhada) de um projeto, no escopo do tenant. Como não há
 * mais "versão ativa", os lançamentos de despesas/receitas sempre gravam aqui.
 */
export async function getAtualVersion(tenantId: string, projectId: string) {
  const [v] = await db
    .select()
    .from(schema.versions)
    .where(
      and(
        eq(schema.versions.tenantId, tenantId),
        eq(schema.versions.projectId, projectId),
        eq(schema.versions.kind, "atual"),
      ),
    )
    .orderBy(asc(schema.versions.createdAt))
    .limit(1);
  return v ?? null;
}

/** kind da versão (para decidir entre lançamento detalhado × simplificado). */
export async function getVersionKind(versionId: string): Promise<string | null> {
  return (await versaoKindETenant(versionId))?.kind ?? null;
}

/** Tipo, situação e empresa da versão — para as leituras que só recebem o id. */
/**
 * Tipo, tenant e situação da versão. Memorizado por requisição (React `cache`):
 * a DRE da Empresa toda pedia isto ~190 vezes por abertura.
 */
const versaoKindETenant = cache(async (versionId: string): Promise<{ kind: string; tenantId: string; status: string } | null> => {
  const [v] = await db
    .select({ kind: schema.versions.kind, tenantId: schema.versions.tenantId, status: schema.versions.status })
    .from(schema.versions)
    .where(eq(schema.versions.id, versionId))
    .limit(1);
  return v ?? null;
});

/** Tipo da versão ("atual", "budget", "forecast"…), lido uma vez por requisição. */
export async function tipoDaVersao(versionId: string): Promise<string | null> {
  return (await versaoKindETenant(versionId))?.kind ?? null;
}

/**
 * FILTRO POR SITUAÇÃO — Prompt H, seção 1.
 *
 * `true` = esta versão de PLANEJAMENTO (budget/forecast) não está Aprovada e a
 * chave "rascunho_fora_dos_relatorios" está ligada na empresa: o que ela tem
 * em `budget_line` NÃO entra em relatório. A versão `atual` devolve sempre
 * `false` (BH-2: nunca filtrada), e com a chave desligada tudo devolve `false`
 * (seção 7: mesmos números de antes). Nada aqui toca consulta de movimento.
 */
export async function planejamentoForaDosRelatorios(versao: { kind: string; status: string; tenantId: string } | null): Promise<boolean> {
  if (!versao) return false;
  if (versao.kind !== "budget" && versao.kind !== "forecast") return false;
  const ligada = await chaveLigada(versao.tenantId, "rascunho_fora_dos_relatorios");
  return !entraNosRelatorios(versao, ligada);
}

export interface ExpenseRow {
  contaCef: string | null;
  categoriaDre: string | null;
  competencia: string | null;
  valor: number;
}

/**
 * Despesas normalizadas para os relatórios (DRE/Fluxo). Para Budget/Forecast
 * vêm do lançamento simplificado (budget_line, despesa); para a detalhada, das
 * despesas reais.
 */
export async function getExpenseRows(versionId: string): Promise<ExpenseRow[]> {
  const versao = await versaoKindETenant(versionId);
  const kind = versao?.kind ?? null;
  if (kind === "budget" || kind === "forecast") {
    // FILTRO POR SITUAÇÃO (Prompt H): planejamento fora dos relatórios = vazio.
    if (await planejamentoForaDosRelatorios(versao)) return [];
    const lines = await db
      .select()
      .from(schema.budgetLines)
      .where(
        and(
          eq(schema.budgetLines.versionId, versionId),
          eq(schema.budgetLines.kind, "despesa"),
        ),
      );
    return lines.map((l) => ({
      contaCef: l.rowKey,
      categoriaDre: l.dreCategory,
      competencia: l.mes,
      valor: Number(l.valor),
    }));
  }
  const d = await getDespesas(versionId);
  // Prompt DP — com a chave ligada, a despesa conta pela categoria da conta
  // no Plano de Contas (conta fora do plano mantém a escolhida). Desligada,
  // exatamente como antes. Nada é regravado.
  const mapa = versao && (await chaveLigada(versao.tenantId, "despesa_categoria_do_plano")) ? mapaParaDespesas(await getMapaDeCategorias(versao.tenantId)) : null;
  // Despesas canceladas (exclusão lógica) não compõem a DRE/relatórios.
  return d
    .filter((x) => !x.cancelado)
    .map((x) => ({
      contaCef: x.contaCef,
      categoriaDre: (mapa && x.contaCef && mapa[x.contaCef]) || x.categoriaDre,
      competencia: x.competencia,
      valor: Number(x.valor),
    }));
}

/** Uma linha de `getExpenseRowsAgrupadas`: a soma de `quantidade` lançamentos iguais em conta, categoria e competência. */
export interface ExpenseRowAgrupada extends ExpenseRow {
  quantidade: number;
}

/**
 * As MESMAS despesas de `getExpenseRows`, já somadas no banco por conta,
 * categoria e competência (desempenho da DRE, 27/10/2026). Cada versão vinha
 * linha a linha (todas as colunas, ordenadas), duas vezes por abertura; agora
 * vem uma vez, com poucas linhas. Mesma regra: canceladas fora, planejamento
 * fora dos relatórios vazio, categoria do plano quando a chave estiver ligada.
 * Memorizada por requisição: a cascata e o rodapé leem a mesma consulta.
 */
export const getExpenseRowsAgrupadas = cache(async (versionId: string): Promise<ExpenseRowAgrupada[]> => {
  const versao = await versaoKindETenant(versionId);
  const kind = versao?.kind ?? null;
  if (kind === "budget" || kind === "forecast") {
    if (await planejamentoForaDosRelatorios(versao)) return [];
    const linhas = await db
      .select({
        contaCef: schema.budgetLines.rowKey,
        categoriaDre: schema.budgetLines.dreCategory,
        competencia: schema.budgetLines.mes,
        valor: sql<string>`sum(${schema.budgetLines.valor})::text`,
        quantidade: sql<number>`count(*)::int`,
      })
      .from(schema.budgetLines)
      .where(and(eq(schema.budgetLines.versionId, versionId), eq(schema.budgetLines.kind, "despesa")))
      .groupBy(schema.budgetLines.rowKey, schema.budgetLines.dreCategory, schema.budgetLines.mes);
    return linhas.map((l) => ({ contaCef: l.contaCef, categoriaDre: l.categoriaDre, competencia: l.competencia, valor: Number(l.valor), quantidade: Number(l.quantidade) }));
  }
  const [linhas, mapa] = await Promise.all([
    db
      .select({
        contaCef: schema.despesas.contaCef,
        categoriaDre: schema.despesas.categoriaDre,
        competencia: schema.despesas.competencia,
        valor: sql<string>`sum(${schema.despesas.valor})::text`,
        quantidade: sql<number>`count(*)::int`,
      })
      .from(schema.despesas)
      .where(and(eq(schema.despesas.versionId, versionId), eq(schema.despesas.cancelado, false)))
      .groupBy(schema.despesas.contaCef, schema.despesas.categoriaDre, schema.despesas.competencia),
    versao && (async () => (await chaveLigada(versao.tenantId, "despesa_categoria_do_plano")) ? mapaParaDespesas(await getMapaDeCategorias(versao.tenantId)) : null)(),
  ]);
  return linhas.map((x) => ({
    contaCef: x.contaCef,
    categoriaDre: (mapa && x.contaCef && mapa[x.contaCef]) || x.categoriaDre,
    competencia: x.competencia,
    valor: Number(x.valor),
    quantidade: Number(x.quantidade),
  }));
});

/** Prompt DP — código da conta → categoria da DRE que vale (escolhida ou padrão). */
export async function getMapaDeCategorias(tenantId: string): Promise<Record<string, CategoriaDRE>> {
  const contas = await getChartAccounts(tenantId);
  return mapaDeCategorias(contas);
}

export type ParcelaRow = typeof schema.despesaParcelas.$inferSelect;

/** Parcelas de contas a pagar de uma versão (join com despesa). Fase 2. */
export async function getParcelasByVersion(
  versionId: string,
): Promise<(ParcelaRow & { despesaNumDoc: string | null; contaCef: string | null; categoriaDre: string | null })[]> {
  const rows = await db
    .select({
      p: schema.despesaParcelas,
      numDoc: schema.despesas.numDoc,
      contaCef: schema.despesas.contaCef,
      categoriaDre: schema.despesas.categoriaDre,
    })
    .from(schema.despesaParcelas)
    .innerJoin(schema.despesas, eq(schema.despesaParcelas.despesaId, schema.despesas.id))
    .where(eq(schema.despesas.versionId, versionId));
  return rows.map((r) => ({
    ...r.p,
    despesaNumDoc: r.numDoc,
    contaCef: r.contaCef,
    categoriaDre: r.categoriaDre,
  }));
}

/** Parcelas de uma despesa específica. */
export async function getParcelasByDespesa(
  despesaId: string,
): Promise<ParcelaRow[]> {
  return db
    .select()
    .from(schema.despesaParcelas)
    .where(eq(schema.despesaParcelas.despesaId, despesaId))
    .orderBy(asc(schema.despesaParcelas.numeroParcela));
}

export type DocumentRow = typeof schema.documents.$inferSelect;

export async function getDocuments(tenantId: string): Promise<DocumentRow[]> {
  return db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.tenantId, tenantId))
    .orderBy(desc(schema.documents.uploadedAt));
}

/**
 * Prompt B, 13 — SÓ os documentos vinculados a projeto (`project_id`
 * preenchido), da empresa. A tela de Projetos lia `getDocuments` inteiro e
 * filtrava em memória; `getDocuments` fica como está para as outras telas.
 */
export async function getDocumentsByProjects(tenantId: string): Promise<DocumentRow[]> {
  return db
    .select()
    .from(schema.documents)
    .where(and(eq(schema.documents.tenantId, tenantId), isNotNull(schema.documents.projectId)))
    .orderBy(desc(schema.documents.uploadedAt));
}

/**
 * Prompt B, 37 — o que a exclusão física do projeto leva junto (em cascata
 * pelas versões, ou direto por `project_id`). Só contagens; nada é alterado.
 * Tenant em toda cláusula: o projeto de outro tenant devolve zeros.
 */
export async function getInventarioDoProjeto(tenantId: string, projectId: string): Promise<import("./projeto-regras").InventarioDoProjeto> {
  const versoes = db
    .select({ id: schema.versions.id })
    .from(schema.versions)
    .where(and(eq(schema.versions.tenantId, tenantId), eq(schema.versions.projectId, projectId)));
  const n = async (q: Promise<{ n: number }[]>) => Number((await q)[0]?.n ?? 0);
  const [unidades, despesas, lancamentosCaixa, medicoes, linhasOrcamento, versoesN, contasReceber, documentos, registrosDePonto] = await Promise.all([
    n(db.select({ n: count() }).from(schema.units).where(and(eq(schema.units.tenantId, tenantId), inArray(schema.units.versionId, versoes)))),
    n(db.select({ n: count() }).from(schema.despesas).where(and(eq(schema.despesas.tenantId, tenantId), inArray(schema.despesas.versionId, versoes)))),
    n(db.select({ n: count() }).from(schema.cashEntries).where(and(eq(schema.cashEntries.tenantId, tenantId), inArray(schema.cashEntries.versionId, versoes)))),
    n(db.select({ n: count() }).from(schema.medicoes).where(and(eq(schema.medicoes.tenantId, tenantId), inArray(schema.medicoes.versionId, versoes)))),
    n(db.select({ n: count() }).from(schema.budgetLines).where(and(eq(schema.budgetLines.tenantId, tenantId), inArray(schema.budgetLines.versionId, versoes)))),
    n(db.select({ n: count() }).from(schema.versions).where(and(eq(schema.versions.tenantId, tenantId), eq(schema.versions.projectId, projectId)))),
    n(db.select({ n: count() }).from(schema.contasReceber).where(and(eq(schema.contasReceber.tenantId, tenantId), eq(schema.contasReceber.projectId, projectId)))),
    n(db.select({ n: count() }).from(schema.documents).where(and(eq(schema.documents.tenantId, tenantId), eq(schema.documents.projectId, projectId)))),
    n(db.select({ n: count() }).from(schema.timeEntries).where(and(eq(schema.timeEntries.tenantId, tenantId), eq(schema.timeEntries.projectId, projectId)))),
  ]);
  return { unidades, despesas, lancamentosCaixa, medicoes, contasReceber, documentos, linhasOrcamento, registrosDePonto, versoes: versoesN };
}

/**
 * Prompt H, 5.3 — lista de conferência: versões de PLANEJAMENTO que não estão
 * Aprovadas, com projeto, nome, tipo, situação e os totais de receitas e
 * despesas (o que sairia dos relatórios com a chave ligada). Só leitura.
 */
export async function getPlanejamentoNaoAprovado(tenantId: string): Promise<{ versionId: string; projectId: string; projeto: string; nome: string; kind: string; status: string; receitas: number; despesas: number }[]> {
  const rows = await db
    .select({
      versionId: schema.versions.id,
      projectId: schema.versions.projectId,
      projeto: schema.projects.name,
      nome: schema.versions.label,
      kind: schema.versions.kind,
      status: schema.versions.status,
    })
    .from(schema.versions)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.versions.projectId))
    .where(and(eq(schema.versions.tenantId, tenantId), inArray(schema.versions.kind, ["budget", "forecast"]), ne(schema.versions.status, "Aprovado")))
    .orderBy(asc(schema.projects.name), asc(schema.versions.kind), asc(schema.versions.createdAt));
  if (rows.length === 0) return [];
  const totais = await db
    .select({ versionId: schema.budgetAccounts.versionId, kind: schema.budgetAccounts.kind, total: sql<string>`sum(${schema.budgetAccounts.total})` })
    .from(schema.budgetAccounts)
    .where(and(eq(schema.budgetAccounts.tenantId, tenantId), inArray(schema.budgetAccounts.versionId, rows.map((r) => r.versionId))))
    .groupBy(schema.budgetAccounts.versionId, schema.budgetAccounts.kind);
  const soma = new Map(totais.map((t) => [`${t.versionId}|${t.kind}`, Number(t.total)]));
  return rows.map((r) => ({ ...r, receitas: soma.get(`${r.versionId}|receita`) ?? 0, despesas: soma.get(`${r.versionId}|despesa`) ?? 0 }));
}

/** Prompt V, seção 5 — documentos vinculados às medições de uma versão (por medição). */
export async function getDocumentosDasMedicoes(tenantId: string, versionId: string): Promise<Map<string, DocumentRow[]>> {
  const rows = await db
    .select({ d: schema.documents })
    .from(schema.documents)
    .innerJoin(schema.medicoes, eq(schema.medicoes.id, schema.documents.medicaoId))
    .where(and(eq(schema.documents.tenantId, tenantId), eq(schema.medicoes.tenantId, tenantId), eq(schema.medicoes.versionId, versionId)))
    .orderBy(asc(schema.documents.tipo), asc(schema.documents.versao));
  const out = new Map<string, DocumentRow[]>();
  for (const { d } of rows) {
    if (!d.medicaoId) continue;
    (out.get(d.medicaoId) ?? out.set(d.medicaoId, []).get(d.medicaoId)!).push(d);
  }
  return out;
}

/** Prompt B, 17 — registros de ponto da obra (aviso ao mudar coordenada). */
export async function contarPontoDoProjeto(tenantId: string, projectId: string): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(schema.timeEntries)
    .where(and(eq(schema.timeEntries.tenantId, tenantId), eq(schema.timeEntries.projectId, projectId)));
  return Number(r?.n ?? 0);
}

/** Prompt S, 7.1 — documentos das despesas em tela (mais recentes primeiro). */
export async function getDocumentsByDespesaIds(tenantId: string, despesaIds: string[]): Promise<DocumentRow[]> {
  if (despesaIds.length === 0) return [];
  return db
    .select()
    .from(schema.documents)
    .where(and(eq(schema.documents.tenantId, tenantId), inArray(schema.documents.despesaId, despesaIds)))
    .orderBy(desc(schema.documents.uploadedAt));
}

/** Documentos anexados a uma despesa específica (mais recentes primeiro). */
export async function getDocumentsByDespesa(
  tenantId: string,
  despesaId: string,
): Promise<DocumentRow[]> {
  return db
    .select()
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.tenantId, tenantId),
        eq(schema.documents.despesaId, despesaId),
      ),
    )
    .orderBy(desc(schema.documents.uploadedAt));
}

/** Anexos das contas a receber listadas (Prompt K, 6.2), mais novos primeiro. */
export async function getDocumentsByContasReceber(tenantId: string, contaIds: string[]): Promise<DocumentRow[]> {
  if (contaIds.length === 0) return [];
  return db
    .select()
    .from(schema.documents)
    .where(and(eq(schema.documents.tenantId, tenantId), inArray(schema.documents.contaReceberId, contaIds)))
    .orderBy(desc(schema.documents.uploadedAt));
}

/** Documentos anexados ao ativo de permuta (Prompt P, 6.2), o mais novo primeiro. */
export async function getDocumentsByPermuta(tenantId: string, permutaId: string): Promise<DocumentRow[]> {
  return db
    .select()
    .from(schema.documents)
    .where(and(eq(schema.documents.tenantId, tenantId), eq(schema.documents.permutaId, permutaId)))
    .orderBy(desc(schema.documents.uploadedAt));
}

/** Prompt Y, 4-A — documentos de uma página de movimentos de estoque. */
export async function getDocumentsByStockMovements(tenantId: string, movementIds: readonly string[]): Promise<DocumentRow[]> {
  if (movementIds.length === 0) return [];
  return db
    .select()
    .from(schema.documents)
    .where(and(eq(schema.documents.tenantId, tenantId), inArray(schema.documents.stockMovementId, [...movementIds])))
    .orderBy(desc(schema.documents.uploadedAt));
}

/** Prompt Y, 7.3 — quantos documentos cada movimento de estoque tem (para "entrada sem comprovação"). */
export async function getContagemDocsPorMovimento(tenantId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({ id: schema.documents.stockMovementId, n: sql<number>`count(*)::int` })
    .from(schema.documents)
    .where(and(eq(schema.documents.tenantId, tenantId), isNotNull(schema.documents.stockMovementId)))
    .groupBy(schema.documents.stockMovementId);
  return new Map(rows.filter((r) => !!r.id).map((r) => [r.id as string, r.n]));
}

export interface MovimentoParaObraRow {
  id: string;
  tipo: string;
  quantidade: number;
  valor: number;
  projectId: string | null;
  despesaId: string | null;
  permutaId: string | null;
  despesaProjectId: string | null;
  estornoDeId: string | null;
  itemId: string;
  itemNome: string;
  unidade: string;
  data: string | null;
}
/** Prompt Y, 4.4 / 4.6 — movimentos com a obra da despesa de origem, no período (ISO), para consumo e confronto. Só leitura. */
export async function getMovimentosParaObra(tenantId: string, de?: string | null, ate?: string | null): Promise<MovimentoParaObraRow[]> {
  const conds = [eq(schema.stockMovements.tenantId, tenantId)];
  if (de) conds.push(gte(chaveDataBR(schema.stockMovements.data), de.replace(/-/g, "")));
  if (ate) conds.push(lte(chaveDataBR(schema.stockMovements.data), ate.replace(/-/g, "")));
  const rows = await db
    .select({ m: schema.stockMovements, itemNome: schema.stockItems.nome, unidade: schema.stockItems.unidade, despesaProjectId: schema.versions.projectId })
    .from(schema.stockMovements)
    .innerJoin(schema.stockItems, eq(schema.stockMovements.itemId, schema.stockItems.id))
    .leftJoin(schema.despesas, eq(schema.stockMovements.despesaId, schema.despesas.id))
    .leftJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
    .where(and(...conds));
  return rows.map((r) => ({
    id: r.m.id,
    tipo: r.m.tipo,
    quantidade: Number(r.m.quantidade),
    valor: Math.round(Number(r.m.quantidade) * Number(r.m.custoUnit) * 100) / 100,
    projectId: r.m.projectId,
    despesaId: r.m.despesaId,
    permutaId: r.m.permutaId,
    despesaProjectId: r.despesaProjectId ?? null,
    estornoDeId: r.m.estornoDeId,
    itemId: r.m.itemId,
    itemNome: r.itemNome,
    unidade: r.unidade,
    data: r.m.data,
  }));
}

/* ───────────── Prompt Z — Funcionários ───────────── */

export type FuncionarioRow = typeof schema.funcionarios.$inferSelect;
export type DependenteRow = typeof schema.funcionarioDependentes.$inferSelect;

/**
 * Lista de funcionários (7.1): CPF já MASCARADO e sem nenhum campo sensível —
 * a lista nunca precisa deles. A ficha (`getFuncionario`) decide pelo papel.
 */
export interface FuncionarioLista {
  id: string;
  nome: string;
  cpfMascarado: string | null;
  cargo: string | null;
  setor: string | null;
  projectName: string | null;
  admissao: string | null;
  desligamento: string | null;
  tipoContrato: string | null;
  dependentes: number;
}
export async function getFuncionarios(tenantId: string): Promise<FuncionarioLista[]> {
  const { mascararDocumento } = await import("@/lib/clientes-sensivel");
  const rows = await db
    .select({
      id: schema.funcionarios.id,
      nome: schema.funcionarios.nome,
      cpf: schema.funcionarios.cpf,
      cargo: schema.funcionarios.cargo,
      setor: schema.funcionarios.setor,
      projectName: schema.projects.name,
      admissao: schema.funcionarios.admissao,
      desligamento: schema.funcionarios.desligamento,
      tipoContrato: schema.funcionarios.tipoContrato,
      dependentes: sql<number>`(select count(*)::int from funcionario_dependente d where d.funcionario_id = ${schema.funcionarios.id})`,
    })
    .from(schema.funcionarios)
    .leftJoin(schema.projects, eq(schema.funcionarios.projectId, schema.projects.id))
    .where(eq(schema.funcionarios.tenantId, tenantId))
    .orderBy(asc(schema.funcionarios.nome));
  return rows.map((r) => ({ ...r, cpfMascarado: mascararDocumento(r.cpf), cpf: undefined })).map(({ cpf: _c, ...r }) => { void _c; return r; });
}

/** Ficha: com `podeVerSensiveis = false`, endereço, salário, jornada e banco voltam NULOS do servidor (7.2). */
export async function getFuncionario(tenantId: string, id: string, podeVerSensiveis: boolean): Promise<(FuncionarioRow & { projectName: string | null; dependentes: DependenteRow[] }) | null> {
  const { semSensiveis } = await import("@/lib/funcionario-regras");
  const [row] = await db
    .select({ f: schema.funcionarios, projectName: schema.projects.name })
    .from(schema.funcionarios)
    .leftJoin(schema.projects, eq(schema.funcionarios.projectId, schema.projects.id))
    .where(and(eq(schema.funcionarios.id, id), eq(schema.funcionarios.tenantId, tenantId)))
    .limit(1);
  if (!row) return null;
  const dependentes = podeVerSensiveis ? await db.select().from(schema.funcionarioDependentes).where(eq(schema.funcionarioDependentes.funcionarioId, id)).orderBy(asc(schema.funcionarioDependentes.nome)) : [];
  return { ...semSensiveis(row.f as unknown as Record<string, unknown>, podeVerSensiveis) as FuncionarioRow, projectName: row.projectName, dependentes };
}

/** CPFs para o aviso de duplicidade (2.5): funcionários e fornecedores PF. Só nome e CPF; nada mais sai. */
export async function getCpfsConhecidos(tenantId: string): Promise<{ origem: "funcionario" | "fornecedor"; nome: string; cpf: string | null; id: string }[]> {
  const [f, s] = await Promise.all([
    db.select({ id: schema.funcionarios.id, nome: schema.funcionarios.nome, cpf: schema.funcionarios.cpf }).from(schema.funcionarios).where(and(eq(schema.funcionarios.tenantId, tenantId), isNotNull(schema.funcionarios.cpf))),
    db.select({ id: schema.stakeholders.id, nome: schema.stakeholders.nome, cpf: schema.stakeholders.doc }).from(schema.stakeholders).where(and(eq(schema.stakeholders.tenantId, tenantId), eq(schema.stakeholders.tipo, "PF"), isNotNull(schema.stakeholders.doc))),
  ]);
  return [...f.map((x) => ({ origem: "funcionario" as const, ...x })), ...s.map((x) => ({ origem: "fornecedor" as const, ...x }))];
}

/** 2.4 — quantas alocações o funcionário tem (para recusar exclusão). */
export async function contarAlocacoesDoFuncionario(tenantId: string, funcionarioId: string): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.equipesProjeto).where(and(eq(schema.equipesProjeto.tenantId, tenantId), eq(schema.equipesProjeto.funcionarioId, funcionarioId)));
  return r?.n ?? 0;
}

/**
 * Documentos do funcionário (2.2-A). Sem `comAso`, os ASO NÃO SAEM do servidor
 * (16c): quem não tem a permissão não recebe nem a existência deles.
 */
export async function getDocumentsByFuncionario(tenantId: string, funcionarioId: string, comAso: boolean): Promise<DocumentRow[]> {
  const { tipoEhAso } = await import("@/lib/funcionario-docs-regras");
  const rows = await db
    .select()
    .from(schema.documents)
    .where(and(eq(schema.documents.tenantId, tenantId), eq(schema.documents.funcionarioId, funcionarioId)))
    .orderBy(desc(schema.documents.uploadedAt));
  return comAso ? rows : rows.filter((d) => !tipoEhAso(d.tipo));
}

export type FolhaRow = typeof schema.folhasCompetencia.$inferSelect;
export interface FolhaLista extends FolhaRow {
  documentos: number;
  despesaNumDoc: string | null;
  despesaValor: number | null;
}
/** 2.2-B — folhas por competência, com a contagem de documentos e a despesa vinculada. */
export async function getFolhas(tenantId: string): Promise<FolhaLista[]> {
  const rows = await db
    .select({ f: schema.folhasCompetencia, despesaNumDoc: schema.despesas.numDoc, despesaValor: schema.despesas.valor, documentos: sql<number>`(select count(*)::int from document d where d.folha_id = ${schema.folhasCompetencia.id})` })
    .from(schema.folhasCompetencia)
    .leftJoin(schema.despesas, eq(schema.folhasCompetencia.despesaId, schema.despesas.id))
    .where(eq(schema.folhasCompetencia.tenantId, tenantId))
    .orderBy(desc(chaveCompetencia(schema.folhasCompetencia.competencia)));
  return rows.map((r) => ({ ...r.f, documentos: r.documentos, despesaNumDoc: r.despesaNumDoc, despesaValor: r.despesaValor == null ? null : Number(r.despesaValor) }));
}
export async function getDocumentsByFolhas(tenantId: string, folhaIds: readonly string[]): Promise<DocumentRow[]> {
  if (folhaIds.length === 0) return [];
  return db.select().from(schema.documents).where(and(eq(schema.documents.tenantId, tenantId), inArray(schema.documents.folhaId, [...folhaIds]))).orderBy(desc(schema.documents.uploadedAt));
}
/** Despesas candidatas a folha/encargo (texto), para vincular e conferir (2.2-B.4 / 2.2-B.5). Só leitura. */
export async function getDespesasCandidatasAFolha(tenantId: string): Promise<{ id: string; numDoc: string | null; competencia: string | null; valor: number; texto: string }[]> {
  const rows = await db
    .select({ id: schema.despesas.id, numDoc: schema.despesas.numDoc, competencia: schema.despesas.competencia, valor: schema.despesas.valor, obs: schema.despesas.obs, fornecedor: schema.stakeholders.nome, categoria: schema.despesas.categoriaDre })
    .from(schema.despesas)
    .leftJoin(schema.stakeholders, eq(schema.despesas.fornecedorId, schema.stakeholders.id))
    .where(and(eq(schema.despesas.tenantId, tenantId), eq(schema.despesas.cancelado, false)))
    .orderBy(desc(schema.despesas.createdAt))
    .limit(1000);
  return rows.map((r) => ({ id: r.id, numDoc: r.numDoc, competencia: r.competencia, valor: Number(r.valor), texto: [r.obs, r.fornecedor, r.categoria].filter(Boolean).join(" · ") }));
}

/* ───────────── Prompt Z — Equipes ───────────── */

export interface MembroDaEquipe {
  id: string;
  projectId: string;
  origem: "autonomo" | "clt" | "socio";
  stakeholderId: string | null;
  funcionarioId: string | null;
  nome: string;
  funcaoId: string | null;
  funcaoNome: string | null;
  valorDiaria: number | null;
  entrada: string | null;
  saida: string | null;
  situacao: string;
  obs: string | null;
}
/** 3.2 — a equipe da obra, referenciando o cadastro de origem (nome vem do cadastro, nunca copiado). */
export async function getEquipeDoProjeto(tenantId: string, projectId: string): Promise<MembroDaEquipe[]> {
  const { origemDoStakeholder } = await import("@/lib/equipe-regras");
  const rows = await db
    .select({ e: schema.equipesProjeto, sNome: schema.stakeholders.nome, sPapeis: schema.stakeholders.papeis, fNome: schema.funcionarios.nome, funcaoNome: schema.funcoesEquipe.nome })
    .from(schema.equipesProjeto)
    .leftJoin(schema.stakeholders, eq(schema.equipesProjeto.stakeholderId, schema.stakeholders.id))
    .leftJoin(schema.funcionarios, eq(schema.equipesProjeto.funcionarioId, schema.funcionarios.id))
    .leftJoin(schema.funcoesEquipe, eq(schema.equipesProjeto.funcaoId, schema.funcoesEquipe.id))
    .where(and(eq(schema.equipesProjeto.tenantId, tenantId), eq(schema.equipesProjeto.projectId, projectId)));
  const lista: MembroDaEquipe[] = rows.map((r) => ({
    id: r.e.id,
    projectId: r.e.projectId,
    origem: r.e.funcionarioId ? "clt" : (origemDoStakeholder(r.sPapeis ?? []) ?? "autonomo"),
    stakeholderId: r.e.stakeholderId,
    funcionarioId: r.e.funcionarioId,
    nome: r.fNome ?? r.sNome ?? "—",
    funcaoId: r.e.funcaoId,
    funcaoNome: r.funcaoNome,
    valorDiaria: r.e.valorDiaria == null ? null : Number(r.e.valorDiaria),
    entrada: r.e.entrada,
    saida: r.e.saida,
    situacao: r.e.situacao,
    obs: r.e.obs,
  }));
  // ativas primeiro, depois por nome (o nome vem de dois cadastros diferentes)
  return lista.sort((a, b) => (a.situacao === b.situacao ? a.nome.localeCompare(b.nome) : a.situacao === "ativa" ? -1 : 1));
}

export interface Alocavel {
  id: string;
  nome: string;
  origem: "autonomo" | "clt" | "socio";
  detalhe: string | null;
}
/** 3.3 — quem pode ser alocado: autônomos e sócios (stakeholder ativo com o papel) e CLT ativo (funcionario). O seletor mostra a origem. */
export async function getAlocaveis(tenantId: string): Promise<Alocavel[]> {
  const { origemDoStakeholder } = await import("@/lib/equipe-regras");
  const [sts, fs] = await Promise.all([
    db.select({ id: schema.stakeholders.id, nome: schema.stakeholders.nome, papeis: schema.stakeholders.papeis, tipo: schema.stakeholders.tipo }).from(schema.stakeholders).where(and(eq(schema.stakeholders.tenantId, tenantId), eq(schema.stakeholders.ativo, true))),
    db.select({ id: schema.funcionarios.id, nome: schema.funcionarios.nome, cargo: schema.funcionarios.cargo }).from(schema.funcionarios).where(and(eq(schema.funcionarios.tenantId, tenantId), isNull(schema.funcionarios.desligamento))),
  ]);
  const out: Alocavel[] = [];
  for (const s of sts) {
    const origem = origemDoStakeholder(s.papeis ?? []);
    if (origem) out.push({ id: s.id, nome: s.nome, origem, detalhe: `${s.tipo} · ${(s.papeis ?? []).join(", ")}` });
  }
  for (const f of fs) out.push({ id: f.id, nome: f.nome, origem: "clt", detalhe: f.cargo });
  return out.sort((a, b) => a.nome.localeCompare(b.nome));
}

export interface DiaDaEquipe {
  id: string;
  data: string;
  obs: string | null;
  documentos: number;
  diarias: { id: string; equipeProjetoId: string; quantidade: number; valor: number | null; obs: string | null; despesaId: string | null }[];
}
/** 3.5 — os dias registrados da obra, com as diárias e a contagem de documentos (por dia, 3.6.5). Período ISO opcional. */
export async function getDiasDaEquipe(tenantId: string, projectId: string, de?: string | null, ate?: string | null): Promise<DiaDaEquipe[]> {
  const conds = [eq(schema.equipeDias.tenantId, tenantId), eq(schema.equipeDias.projectId, projectId)];
  if (de) conds.push(gte(chaveDataBR(schema.equipeDias.data), de.replace(/-/g, "")));
  if (ate) conds.push(lte(chaveDataBR(schema.equipeDias.data), ate.replace(/-/g, "")));
  const dias = await db
    .select({ d: schema.equipeDias, documentos: sql<number>`(select count(*)::int from document x where x.equipe_dia_id = ${schema.equipeDias.id})` })
    .from(schema.equipeDias)
    .where(and(...conds))
    .orderBy(desc(chaveDataBR(schema.equipeDias.data)));
  if (dias.length === 0) return [];
  const diarias = await db.select().from(schema.diarias).where(inArray(schema.diarias.equipeDiaId, dias.map((x) => x.d.id)));
  return dias.map((x) => ({
    id: x.d.id,
    data: x.d.data,
    obs: x.d.obs,
    documentos: x.documentos,
    diarias: diarias.filter((r) => r.equipeDiaId === x.d.id).map((r) => ({ id: r.id, equipeProjetoId: r.equipeProjetoId, quantidade: Number(r.quantidade), valor: r.valor == null ? null : Number(r.valor), obs: r.obs, despesaId: r.despesaId })),
  }));
}
export async function getDocumentsByEquipeDias(tenantId: string, ids: readonly string[]): Promise<DocumentRow[]> {
  if (ids.length === 0) return [];
  return db.select().from(schema.documents).where(and(eq(schema.documents.tenantId, tenantId), inArray(schema.documents.equipeDiaId, [...ids]))).orderBy(desc(schema.documents.uploadedAt));
}

/** 6.1 / 6.2 — alocações ativas do tenant com obra e nome (sem documento). */
export async function getAlocacoesAtivas(tenantId: string): Promise<{ funcionarioId: string | null; stakeholderId: string | null; projectId: string; projectName: string; funcaoId: string | null; nome: string }[]> {
  const rows = await db
    .select({ funcionarioId: schema.equipesProjeto.funcionarioId, stakeholderId: schema.equipesProjeto.stakeholderId, projectId: schema.equipesProjeto.projectId, projectName: schema.projects.name, funcaoId: schema.equipesProjeto.funcaoId, sNome: schema.stakeholders.nome, fNome: schema.funcionarios.nome })
    .from(schema.equipesProjeto)
    .innerJoin(schema.projects, eq(schema.equipesProjeto.projectId, schema.projects.id))
    .leftJoin(schema.stakeholders, eq(schema.equipesProjeto.stakeholderId, schema.stakeholders.id))
    .leftJoin(schema.funcionarios, eq(schema.equipesProjeto.funcionarioId, schema.funcionarios.id))
    .where(and(eq(schema.equipesProjeto.tenantId, tenantId), eq(schema.equipesProjeto.situacao, "ativa")));
  return rows.map((r) => ({ funcionarioId: r.funcionarioId, stakeholderId: r.stakeholderId, projectId: r.projectId, projectName: r.projectName, funcaoId: r.funcaoId, nome: r.fNome ?? r.sNome ?? "—" }));
}
/** 6.1 — SÓ tipo e validade dos documentos (nunca o arquivo): o assistente sabe que tipo existe, não o que está dentro. */
export async function getTiposDeDocPorFuncionario(tenantId: string): Promise<{ funcionarioId: string; tipo: string | null; validade: string | null }[]> {
  const rows = await db.select({ funcionarioId: schema.documents.funcionarioId, tipo: schema.documents.tipo, validade: schema.documents.validade, versao: schema.documents.versao }).from(schema.documents).where(and(eq(schema.documents.tenantId, tenantId), isNotNull(schema.documents.funcionarioId))).orderBy(asc(schema.documents.versao));
  return rows.filter((r): r is typeof r & { funcionarioId: string } => !!r.funcionarioId).map((r) => ({ funcionarioId: r.funcionarioId, tipo: r.tipo, validade: r.validade }));
}
/** 6.1 — para a análise NO SERVIDOR (o CPF é comparado aqui e nunca sai no resultado). */
export async function getFuncionariosParaAnalise(tenantId: string): Promise<{ id: string; nome: string; cpf: string | null; cargo: string | null; admissao: string | null; desligamento: string | null }[]> {
  return db.select({ id: schema.funcionarios.id, nome: schema.funcionarios.nome, cpf: schema.funcionarios.cpf, cargo: schema.funcionarios.cargo, admissao: schema.funcionarios.admissao, desligamento: schema.funcionarios.desligamento }).from(schema.funcionarios).where(eq(schema.funcionarios.tenantId, tenantId));
}

export type RecebimentoRow = typeof schema.contaReceberRecebimentos.$inferSelect;

/** Recebimentos (ativos e estornados) das contas listadas (Prompt K, seção 3). */
export async function getRecebimentosDasContas(tenantId: string, contaIds: string[]): Promise<RecebimentoRow[]> {
  if (contaIds.length === 0) return [];
  return db
    .select()
    .from(schema.contaReceberRecebimentos)
    .where(and(eq(schema.contaReceberRecebimentos.tenantId, tenantId), inArray(schema.contaReceberRecebimentos.contaReceberId, contaIds)))
    .orderBy(asc(chaveDataBR(schema.contaReceberRecebimentos.data)), asc(schema.contaReceberRecebimentos.createdAt));
}

export interface EntradaDisponivel {
  id: string;
  data: string | null;
  descricao: string | null;
  valor: number;
  /** valor − vínculos ativos com contas a receber (4.2). */
  disponivel: number;
  /** null = movimento sem obra (Prompt AT §3: da conta). */
  projectId: string | null;
}

/**
 * Entradas do extrato (crédito) que ainda têm valor livre para conciliar com
 * contas a receber, na versão Atual de cada obra (ou de uma obra).
 */
export async function getEntradasDisponiveis(tenantId: string, projectId?: string): Promise<EntradaDisponivel[]> {
  const rows = await db
    .select({ e: schema.cashEntries, projectId: schema.versions.projectId })
    .from(schema.cashEntries)
    .leftJoin(schema.versions, eq(schema.cashEntries.versionId, schema.versions.id))
    .where(
      and(
        eq(schema.cashEntries.tenantId, tenantId),
        sql`${schema.cashEntries.valor} > 0`,
        isNull(schema.cashEntries.conciliadoDespesaId),
        // Prompt AT §3: a entrada sem obra (da conta) serve a qualquer obra.
        or(
          isNull(schema.cashEntries.versionId),
          and(eq(schema.versions.kind, "atual"), ...(projectId ? [eq(schema.versions.projectId, projectId)] : [])),
        ),
      ),
    )
    .orderBy(asc(chaveDataBR(schema.cashEntries.data)), asc(schema.cashEntries.id));
  if (rows.length === 0) return [];
  const vinculos = await db
    .select({ cashEntryId: schema.contaReceberRecebimentos.cashEntryId, valor: schema.contaReceberRecebimentos.valor })
    .from(schema.contaReceberRecebimentos)
    .where(
      and(
        eq(schema.contaReceberRecebimentos.tenantId, tenantId),
        eq(schema.contaReceberRecebimentos.estornado, false),
        inArray(schema.contaReceberRecebimentos.cashEntryId, rows.map((r) => r.e.id)),
      ),
    );
  const usado = new Map<string, number>();
  for (const v of vinculos) if (v.cashEntryId) usado.set(v.cashEntryId, (usado.get(v.cashEntryId) ?? 0) + Number(v.valor));
  return rows
    .map((r) => {
      const valor = Number(r.e.valor);
      const disponivel = Math.round((valor - (usado.get(r.e.id) ?? 0)) * 100) / 100;
      return { id: r.e.id, data: r.e.data, descricao: r.e.descricao, valor, disponivel, projectId: r.projectId };
    })
    // Movimento sem vínculo novo mas já marcado conciliado pelo caminho antigo (1:1) não entra.
    .filter((r) => r.disponivel > 0.005 && !(usado.get(r.id) == null && rows.find((x) => x.e.id === r.id)!.e.rec));
}

export type CashRow = typeof schema.cashEntries.$inferSelect;

export async function getCash(versionId: string): Promise<CashRow[]> {
  return db
    .select()
    .from(schema.cashEntries)
    .where(eq(schema.cashEntries.versionId, versionId))
    // §37 — data em texto: ordem cronológica; sem createdAt na tabela, o id desempata.
    .orderBy(asc(chaveDataBR(schema.cashEntries.data)), asc(schema.cashEntries.id));
}

/**
 * Lançamentos de caixa de todas as versões Atual do tenant (caixa real), e os
 * que não têm obra (Prompt AT §3: o movimento do extrato é da conta).
 */
export async function getCashByTenant(tenantId: string): Promise<CashRow[]> {
  const rows = await db
    .select({ c: schema.cashEntries })
    .from(schema.cashEntries)
    .leftJoin(schema.versions, eq(schema.cashEntries.versionId, schema.versions.id))
    .where(and(eq(schema.cashEntries.tenantId, tenantId), or(eq(schema.versions.kind, "atual"), isNull(schema.cashEntries.versionId))))
    .orderBy(asc(chaveDataBR(schema.cashEntries.data)), asc(schema.cashEntries.id));
  return rows.map((r) => r.c);
}

/**
 * Prompt L, 9.9 — o caixa da empresa: todas as versões Atual, com a obra de
 * cada lançamento. Prompt AT §3: entram também os movimentos sem obra
 * (`projectId` nulo), que são da conta e somam no saldo da empresa.
 */
export async function getCashDaEmpresa(tenantId: string): Promise<(CashRow & { projectId: string | null })[]> {
  const rows = await db
    .select({ c: schema.cashEntries, projectId: schema.versions.projectId })
    .from(schema.cashEntries)
    .leftJoin(schema.versions, eq(schema.cashEntries.versionId, schema.versions.id))
    .where(and(eq(schema.cashEntries.tenantId, tenantId), or(eq(schema.versions.kind, "atual"), isNull(schema.cashEntries.versionId))))
    .orderBy(asc(chaveDataBR(schema.cashEntries.data)), asc(schema.cashEntries.id));
  return rows.map((r) => ({ ...r.c, projectId: r.projectId }));
}

export type ClienteRow = typeof schema.clientes.$inferSelect;

/**
 * Lista de compradores — só as colunas que as telas de lista usam (Prompt M,
 * 5.5). Antes trazia as 39, inclusive renda e score, para mostrar seis.
 * `interesse` é dado sensível: a tela só o exibe a quem tem `clientesdados`.
 */
export type ClienteLista = Pick<
  ClienteRow,
  "id" | "nomeCompleto" | "unitCode" | "statusContrato" | "cpfCnpj" | "cidadeEstado" | "interesse"
>;

export async function getClientes(tenantId: string): Promise<ClienteLista[]> {
  return db
    .select({
      id: schema.clientes.id,
      nomeCompleto: schema.clientes.nomeCompleto,
      unitCode: schema.clientes.unitCode,
      statusContrato: schema.clientes.statusContrato,
      cpfCnpj: schema.clientes.cpfCnpj,
      cidadeEstado: schema.clientes.cidadeEstado,
      interesse: schema.clientes.interesse,
    })
    .from(schema.clientes)
    .where(eq(schema.clientes.tenantId, tenantId))
    .orderBy(asc(schema.clientes.nomeCompleto));
}

/**
 * Compradores para o simulador (Prompt N, BN-3): nome e, SÓ quando a página
 * confirmou `clientesdados:ver`, a renda do cadastro (líquida; senão bruta).
 * Sem a permissão a coluna nem é selecionada — a renda não sai do servidor.
 */
export async function getClientesParaSimulador(tenantId: string, comRenda: boolean): Promise<{ id: string; nome: string; renda: number | null }[]> {
  const rows = await db
    .select({
      id: schema.clientes.id,
      nome: schema.clientes.nomeCompleto,
      ...(comRenda ? { rendaLiquida: schema.clientes.rendaLiquida, rendaBruta: schema.clientes.rendaBruta } : {}),
    })
    .from(schema.clientes)
    .where(eq(schema.clientes.tenantId, tenantId))
    .orderBy(asc(schema.clientes.nomeCompleto));
  return rows.map((r) => {
    const rl = "rendaLiquida" in r ? Number(r.rendaLiquida ?? 0) : 0;
    const rb = "rendaBruta" in r ? Number(r.rendaBruta ?? 0) : 0;
    const renda = comRenda ? rl || rb || null : null;
    return { id: r.id, nome: r.nome, renda };
  });
}

/** Texto sem acentos e minúsculo, no SQL — casa com `termosDaBusca`. */
const semAcentoSql = (col: SQL | AnyColumn) =>
  sql`translate(lower(coalesce(${col}, '')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn')`;

/**
 * Página da lista de compradores (Prompt M, 6.8): busca por nome e unidade
 * (cada termo precisa aparecer em um dos dois, sem diferenciar acento e
 * caixa), filtro por status de contrato e paginação. `total` é o que o filtro
 * encontrou; `totalGeral`, o cadastro inteiro.
 */
export async function getClientesPagina(
  tenantId: string,
  f: { termos: string[]; status: string; pagina: number; porPagina: number; statusEmBranco: string },
): Promise<{ itens: ClienteLista[]; total: number; totalGeral: number }> {
  const conds: SQL[] = [eq(schema.clientes.tenantId, tenantId)];
  for (const t of f.termos) {
    const padrao = `%${t.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    conds.push(
      sql`(${semAcentoSql(schema.clientes.nomeCompleto)} like ${padrao} or ${semAcentoSql(schema.clientes.unitCode)} like ${padrao})`,
    );
  }
  if (f.status === f.statusEmBranco) {
    conds.push(sql`coalesce(trim(${schema.clientes.statusContrato}), '') = ''`);
  } else if (f.status) {
    conds.push(sql`trim(${schema.clientes.statusContrato}) = ${f.status}`);
  }
  const where = and(...conds);
  const [[{ total }], [{ totalGeral }]] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int` }).from(schema.clientes).where(where),
    db
      .select({ totalGeral: sql<number>`count(*)::int` })
      .from(schema.clientes)
      .where(eq(schema.clientes.tenantId, tenantId)),
  ]);
  const itens = await db
    .select({
      id: schema.clientes.id,
      nomeCompleto: schema.clientes.nomeCompleto,
      unitCode: schema.clientes.unitCode,
      statusContrato: schema.clientes.statusContrato,
      cpfCnpj: schema.clientes.cpfCnpj,
      cidadeEstado: schema.clientes.cidadeEstado,
      interesse: schema.clientes.interesse,
    })
    .from(schema.clientes)
    .where(where)
    .orderBy(asc(schema.clientes.nomeCompleto), asc(schema.clientes.id))
    .limit(f.porPagina)
    .offset((f.pagina - 1) * f.porPagina);
  return { itens, total, totalGeral };
}

/** Status de contrato gravados no tenant, com a quantidade (filtro da lista). */
export async function getStatusContratoUsados(
  tenantId: string,
): Promise<{ status: string | null; qtd: number }[]> {
  const rows = await db
    .select({
      status: sql<string | null>`nullif(trim(${schema.clientes.statusContrato}), '')`,
      qtd: sql<number>`count(*)::int`,
    })
    .from(schema.clientes)
    .where(eq(schema.clientes.tenantId, tenantId))
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  return rows;
}

/**
 * Unidades de cada obra do tenant (Prompt M, 6.6), sem repetir o mesmo
 * código dentro da obra. Cobre todas as versões, como a lista anterior.
 */
export async function getUnidadesComObra(
  tenantId: string,
): Promise<{ projectId: string; code: string }[]> {
  return db
    .selectDistinct({ projectId: schema.versions.projectId, code: schema.units.code })
    .from(schema.units)
    .innerJoin(schema.versions, eq(schema.units.versionId, schema.versions.id))
    .where(and(eq(schema.units.tenantId, tenantId), eq(schema.versions.tenantId, tenantId)))
    .orderBy(asc(schema.units.code));
}

/**
 * Códigos de unidade da versão Atual de cada obra, por obra (Prompt K, CR-07):
 * o seletor de unidade de uma conta a receber só oferece as unidades da obra
 * escolhida. `getUnitCodesByTenant` (todas as obras, todas as versões)
 * continua como está para as telas que já a usam.
 */
export async function getUnidadesAtuaisPorObra(tenantId: string): Promise<Record<string, string[]>> {
  const rows = await db
    .selectDistinct({ projectId: schema.versions.projectId, code: schema.units.code })
    .from(schema.units)
    .innerJoin(schema.versions, eq(schema.units.versionId, schema.versions.id))
    .where(and(eq(schema.units.tenantId, tenantId), eq(schema.versions.tenantId, tenantId), eq(schema.versions.kind, "atual")))
    .orderBy(asc(schema.units.code));
  const out: Record<string, string[]> = {};
  for (const r of rows) (out[r.projectId] ??= []).push(r.code);
  return out;
}

export type MedicaoRow = typeof schema.medicoes.$inferSelect & { autorNome: string | null; autorEmail: string | null };

/**
 * Medições de uma versão, no tenant (4.2), com o autor (0.5).
 *
 * `autor` (0.5.2): recorte de autoria aplicado NA CONSULTA — vêm só as do
 * usuário e as SEM autor (0.5.3: medição anterior à coluna é de todos).
 * Registros de outro autor não saem do banco. O Relatório CEF NÃO passa
 * `autor` (0.5.4): soma o projeto inteiro.
 */
export async function getMedicoes(tenantId: string, versionId: string, opts: { autor?: string | null } = {}): Promise<MedicaoRow[]> {
  const rows = await db
    .select({ m: schema.medicoes, autorNome: schema.users.name, autorEmail: schema.users.email })
    .from(schema.medicoes)
    .leftJoin(schema.users, eq(schema.users.id, schema.medicoes.createdBy))
    .where(
      and(
        eq(schema.medicoes.tenantId, tenantId),
        eq(schema.medicoes.versionId, versionId),
        opts.autor ? or(isNull(schema.medicoes.createdBy), eq(schema.medicoes.createdBy, opts.autor)) : undefined,
      ),
    )
    .orderBy(asc(chaveCompetencia(schema.medicoes.competencia)), asc(schema.medicoes.grupoCode), asc(schema.medicoes.createdAt), asc(schema.medicoes.id));
  return rows.map((r) => ({ ...r.m, autorNome: r.autorNome, autorEmail: r.autorEmail }));
}

/**
 * Receita projetada mês a mês de uma versão.
 *
 * Cada versão respeita o que foi lançado NELA:
 *  - Budget/Forecast → budget_line (planejamento);
 *  - Atual → o que está efetivamente lançado, isto é, as CONTAS A RECEBER
 *    lançadas mais os recebíveis derivados dos planos de pagamento das vendas,
 *    mais os reembolsos. É daí que sai a projeção de receita futura.
 *
 * As duas origens da Atual são complementares, não duplicadas: os recebíveis de
 * venda são derivados do plano da unidade e não são copiados para conta_receber
 * (ver comentário do schema em `contasReceber`).
 */
export async function getMonthlyRevenue(
  versionId: string,
  projectId: string,
  /**
   * Prompt AD2 — balde de tempo. Ausente: mês "MM/YYYY", exatamente como
   * sempre. Com balde (ex.: semana), cada valor cai na chave que ele devolver
   * para a data ("MM/DD/YYYY") ou a competência ("MM/YYYY") de origem.
   */
  bucket?: (data: string) => string | null,
): Promise<MonthlyProjection> {
  const versao = await versaoKindETenant(versionId);
  const kind = versao?.kind ?? null;
  if (kind === "budget" || kind === "forecast") {
    // FILTRO POR SITUAÇÃO (Prompt H): planejamento fora dos relatórios = vazio.
    if (await planejamentoForaDosRelatorios(versao)) return {};
    const lines = await db
      .select({ mes: schema.budgetLines.mes, valor: schema.budgetLines.valor })
      .from(schema.budgetLines)
      .where(
        and(
          eq(schema.budgetLines.versionId, versionId),
          eq(schema.budgetLines.kind, "receita"),
        ),
      );
    const out: MonthlyProjection = {};
    for (const l of lines) {
      const k = bucket ? bucket(l.mes) : l.mes;
      if (k) out[k] = (out[k] || 0) + Number(l.valor);
    }
    return out;
  }

  // As três leituras da Atual em paralelo (antes, contas a receber esperava as outras duas).
  const [unitRows, reembRows, crRows, planoNovo] = await Promise.all([
    getUnits(versao?.tenantId ?? "", versionId),
    getReembolsos(versao?.tenantId ?? "", versionId),
    db
      .select({
        valor: schema.contasReceber.valor,
        vencimento: schema.contasReceber.vencimento,
      })
      .from(schema.contasReceber)
      .where(
        and(
          eq(schema.contasReceber.projectId, projectId),
          eq(schema.contasReceber.cancelado, false),
        ),
      ),
    versao?.tenantId ? chaveLigada(versao.tenantId, "plano_definicao_nova") : Promise.resolve(false),
  ]);
  const out: MonthlyProjection = {};
  // Receita da versão Atual = recebíveis das vendas (MESMA fonte da tela Contas
  // a Receber: expandUnitReceivables — leitura tolerante do plano, sem depender
  // das flags usar*). Assim DRE e Fluxo batem com os recebíveis exibidos.
  // Agrega por mês do vencimento ("MM/DD/YYYY" → "MM/YYYY").
  for (const r of unitRows) {
    for (const rec of expandUnitReceivables(r.paymentPlan, r.status, { definicaoNova: planoNovo })) {
      const p = rec.dia.split("/");
      if (p.length !== 3) continue;
      const mk = bucket ? bucket(rec.dia) : `${p[0]}/${p[2]}`;
      if (mk) out[mk] = (out[mk] || 0) + rec.valor;
    }
  }
  if (bucket) {
    // Mesma regra de `reembursementsByMonth` (data completa, valor > 0), no balde pedido.
    for (const r of reembToCalc(reembRows)) {
      if (!r.data || !(r.valor > 0) || r.data.split("/").length !== 3) continue;
      const k = bucket(r.data);
      if (k) out[k] = (out[k] || 0) + r.valor;
    }
  } else {
    const reemb = reembursementsByMonth(reembToCalc(reembRows));
    for (const [mm, v] of Object.entries(reemb)) out[mm] = (out[mm] || 0) + v;
  }

  // CONTAS A RECEBER lançadas do projeto — a projeção de receita futura da
  // versão Atual depende delas. Sem isto, uma receita lançada à mão (fora de um
  // plano de venda) aparecia em Contas a Receber e sumia da DRE, do Fluxo de
  // Caixa e do Dashboard. Agrega pelo mês do vencimento e ignora as canceladas.
  for (const c of crRows) {
    const p = (c.vencimento ?? "").split("/");
    if (p.length !== 3) continue;
    const mk = bucket ? bucket(c.vencimento!) : `${p[0]}/${p[2]}`;
    if (mk) out[mk] = (out[mk] || 0) + Number(c.valor);
  }
  return out;
}

/**
 * Prompt AR, Fase 2 (Revisão 4), parte 5c — receita da DRE da versão Atual
 * pelo RATEIO do contrato (chave `dre_receita_rateio`). Duas fontes, e só elas
 * (Prompt I, §57.3):
 *  1. venda de unidade: o total do contrato rateado pela janela da obra
 *     (`receitaPorRateio`), inclusive os meses passados;
 *  2. contas a receber lançadas do projeto (avulsas), pelo mês do vencimento,
 *     como sempre.
 * Saem da receita da DRE: os recebíveis do plano pelo vencimento (ficam no
 * caixa), as liberações de obra (caixa) e a revenda da permuta pelo valor cheio
 * (o bem já está no contrato rateado). Nada é gravado.
 */
export async function getReceitaDaDrePorRateio(
  tenantId: string,
  versionId: string,
  projectId: string,
): Promise<{ porMes: MonthlyProjection; pendencias: PendenciaDoRateio[]; contasComUnidade: { qtd: number; valor: number } }> {
  const [unitRows, crRows, [proj]] = await Promise.all([
    getUnits(tenantId, versionId),
    db
      .select({ valor: schema.contasReceber.valor, vencimento: schema.contasReceber.vencimento, unitCode: schema.contasReceber.unitCode })
      .from(schema.contasReceber)
      .where(and(eq(schema.contasReceber.projectId, projectId), eq(schema.contasReceber.cancelado, false))),
    db
      .select({ startDate: schema.projects.startDate, endDate: schema.projects.endDate })
      .from(schema.projects)
      .where(and(eq(schema.projects.id, projectId), eq(schema.projects.tenantId, tenantId)))
      .limit(1),
  ]);
  const { porMes, pendencias } = receitaPorRateio(unitRows, proj ? janelaDoProjeto(proj) : null);
  const out: MonthlyProjection = { ...porMes };
  // Prompt I, §54.7: conta a receber ligada a uma unidade pode repetir a venda
  // que o rateio já reconhece. NÃO é excluída: é contada e mostrada para decisão.
  const contasComUnidade = { qtd: 0, valor: 0 };
  for (const c of crRows) {
    const p = (c.vencimento ?? "").split("/");
    if (p.length !== 3) continue;
    const mk = `${p[0]}/${p[2]}`;
    out[mk] = Math.round(((out[mk] || 0) + Number(c.valor)) * 100) / 100;
    if (c.unitCode) {
      contasComUnidade.qtd++;
      contasComUnidade.valor = Math.round((contasComUnidade.valor + Number(c.valor)) * 100) / 100;
    }
  }
  return { porMes: out, pendencias, contasComUnidade };
}

export interface ReceitaProjetoRow {
  projectId: string;
  projectName: string;
  /** versão do tipo pedido (budget/forecast) do projeto; null se não existir. */
  versionId: string | null;
  /** receita consolidada por mês ("MM/YYYY" → valor). */
  values: Record<string, number>;
}
export interface ReceitaByProject {
  months: string[];
  rows: ReceitaProjetoRow[];
}

/**
 * Receita do Budget/Forecast consolidada como matriz projetos × meses: uma
 * linha por projeto (empreendimento). Cada projeto criado vira uma nova linha.
 */
export async function getReceitaByProject(
  tenantId: string,
  kind: "budget" | "forecast",
): Promise<ReceitaByProject> {
  const [projs, vers, incc] = await Promise.all([
    db
      .select()
      .from(schema.projects)
      .where(and(eq(schema.projects.tenantId, tenantId), eq(schema.projects.kind, "proj")))
      .orderBy(asc(schema.projects.createdAt)),
    db
      .select()
      .from(schema.versions)
      .where(and(eq(schema.versions.tenantId, tenantId), eq(schema.versions.kind, kind))),
    db
      .select({ mes: schema.inccRates.mes })
      .from(schema.inccRates)
      .where(eq(schema.inccRates.tenantId, tenantId)),
  ]);

  const verByProj = new Map(vers.map((v) => [v.projectId, v.id]));
  const versionIds = vers.map((v) => v.id);

  const lines = versionIds.length
    ? await db
        .select()
        .from(schema.budgetLines)
        .where(
          and(
            inArray(schema.budgetLines.versionId, versionIds),
            eq(schema.budgetLines.kind, "receita"),
          ),
        )
    : [];
  // Meses = INCC + meses lançados, estendidos PARA FRENTE até hoje + 5 anos,
  // para permitir lançamento nos próximos cinco anos. Contíguo e ordenado;
  // dados além do alvo (ex.: import multi-ano) são preservados.
  const monthSet = new Set(incc.map((r) => r.mes));
  for (const l of lines) monthSet.add(l.mes);
  const months = fillHorizonForward([...monthSet]);
  // Separa a receita do projeto ("Receita") da linha "Outras Receitas".
  const receitaByVer = new Map<string, Record<string, number>>();
  const outrasByVer = new Map<string, Record<string, number>>();
  for (const l of lines) {
    const map = l.rowKey === OUTRAS_RECEITAS_KEY ? outrasByVer : receitaByVer;
    const bag = map.get(l.versionId) ?? {};
    bag[l.mes] = (bag[l.mes] || 0) + Number(l.valor);
    map.set(l.versionId, bag);
  }

  const rows: ReceitaProjetoRow[] = projs.map((p) => {
    const vId = verByProj.get(p.id) ?? null;
    return {
      projectId: p.id,
      projectName: p.name,
      versionId: vId,
      values: vId ? receitaByVer.get(vId) ?? {} : {},
    };
  });

  // "Outras Receitas": guardada na versão do projeto mais antigo (âncora).
  const anchorVid = rows.find((r) => r.versionId)?.versionId ?? null;
  rows.push({
    projectId: OUTRAS_RECEITAS_PID,
    projectName: OUTRAS_RECEITAS_KEY,
    versionId: anchorVid,
    values: anchorVid ? outrasByVer.get(anchorVid) ?? {} : {},
  });

  return { months, rows };
}

export interface DespesaLinha {
  projectId: string;
  projectName: string;
  grupoCode: string;
  grupoLabel: string;
  dreCategory: string;
  values: Record<string, number>;
}
export interface DespesaLinhasData {
  months: string[];
  /** projetos + filiais/unidades para o "de-para" (office = filial/matriz). */
  projetos: { id: string; nome: string; office: boolean }[];
  /** grupos do plano de contas; cef = custo direto de obra (só p/ projetos). */
  grupos: { code: string; label: string; dreCategory: string; cef: boolean }[];
  lines: DespesaLinha[];
}

/**
 * Despesas do Budget/Forecast como linhas criadas pelo usuário: cada linha é
 * um grupo do plano de contas vinculado a um projeto/filial. Retorna também as
 * opções de projeto e de grupo, além das linhas já lançadas.
 */
export async function getDespesaLinhas(
  tenantId: string,
  kind: "budget" | "forecast",
): Promise<DespesaLinhasData> {
  const [projs, vers, chart, incc] = await Promise.all([
    db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.tenantId, tenantId))
      .orderBy(asc(schema.projects.createdAt)),
    db
      .select()
      .from(schema.versions)
      .where(and(eq(schema.versions.tenantId, tenantId), eq(schema.versions.kind, kind))),
    getChartAccounts(tenantId),
    db.select({ mes: schema.inccRates.mes }).from(schema.inccRates).where(eq(schema.inccRates.tenantId, tenantId)),
  ]);

  const projById = new Map(projs.map((p) => [p.id, p.name]));
  const verById = new Map(vers.map((v) => [v.id, v.projectId]));

  const grupoMap = new Map<
    string,
    { code: string; label: string; dreCategory: string; cef: boolean }
  >();
  for (const r of chart) {
    if (!grupoMap.has(r.groupCode))
      grupoMap.set(r.groupCode, {
        code: r.groupCode,
        label: `${r.groupCode} · ${r.groupName}`,
        dreCategory: r.kind === "cef" ? "Custo Variável" : "Despesa Fixa",
        cef: r.kind === "cef",
      });
  }
  const grupos = [...grupoMap.values()].sort((a, b) =>
    a.code.localeCompare(b.code, undefined, { numeric: true }),
  );
  const grupoLabel = (code: string) => grupoMap.get(code)?.label ?? code;

  const versionIds = vers.map((v) => v.id);
  const bl = versionIds.length
    ? await db
        .select()
        .from(schema.budgetLines)
        .where(
          and(
            inArray(schema.budgetLines.versionId, versionIds),
            eq(schema.budgetLines.kind, "despesa"),
          ),
        )
    : [];

  // Meses = INCC + meses lançados, estendidos PARA FRENTE até hoje + 5 anos
  // (permite lançar despesas nos próximos cinco anos). Dados além do alvo
  // (ex.: import multi-ano) são preservados.
  const monthSet = new Set(incc.map((r) => r.mes));
  for (const l of bl) monthSet.add(l.mes);
  const months = fillHorizonForward([...monthSet]);

  const lineMap = new Map<string, DespesaLinha>();
  for (const l of bl) {
    const projectId = verById.get(l.versionId);
    if (!projectId) continue;
    const key = `${projectId}|${l.rowKey}`;
    let line = lineMap.get(key);
    if (!line) {
      line = {
        projectId,
        projectName: projById.get(projectId) ?? "",
        grupoCode: l.rowKey,
        grupoLabel: grupoLabel(l.rowKey),
        dreCategory: l.dreCategory ?? grupoMap.get(l.rowKey)?.dreCategory ?? "Despesa Fixa",
        values: {},
      };
      lineMap.set(key, line);
    }
    line.values[l.mes] = (line.values[l.mes] || 0) + Number(l.valor);
    if (l.dreCategory) line.dreCategory = l.dreCategory;
  }

  return {
    months,
    projetos: projs.map((p) => ({
      id: p.id,
      nome: p.kind === "office" ? `${p.name} · Filial/Matriz` : p.name,
      office: p.kind === "office",
    })),
    grupos,
    lines: [...lineMap.values()],
  };
}

export interface RevenueBySource {
  sources: Record<ProjectionSource, MonthlyProjection>;
  reemb: MonthlyProjection;
}

function emptyBySource(): Record<ProjectionSource, MonthlyProjection> {
  return Object.fromEntries(
    PROJECTION_SOURCES.map((s) => [s, {} as MonthlyProjection]),
  ) as Record<ProjectionSource, MonthlyProjection>;
}

/**
 * Receita projetada por fonte × mês de uma versão. Para Budget/Forecast usa o
 * lançamento simplificado (budget_line, receita, rowKey = fonte); para a versão
 * detalhada usa unidades (calcProjectionBySource) + reembolsos.
 */
export async function getRevenueBySource(
  versionId: string,
  projectId: string,
): Promise<RevenueBySource> {
  const sources = emptyBySource();
  const reemb: MonthlyProjection = {};
  const versao = await versaoKindETenant(versionId);
  const kind = versao?.kind ?? null;

  if (kind === "budget" || kind === "forecast") {
    // FILTRO POR SITUAÇÃO (Prompt H): planejamento fora dos relatórios = vazio.
    if (await planejamentoForaDosRelatorios(versao)) return { sources, reemb };
    const lines = await db
      .select({
        rowKey: schema.budgetLines.rowKey,
        mes: schema.budgetLines.mes,
        valor: schema.budgetLines.valor,
      })
      .from(schema.budgetLines)
      .where(
        and(
          eq(schema.budgetLines.versionId, versionId),
          eq(schema.budgetLines.kind, "receita"),
        ),
      );
    for (const l of lines) {
      if (l.rowKey === "Reembolso") {
        reemb[l.mes] = (reemb[l.mes] || 0) + Number(l.valor);
      } else if ((PROJECTION_SOURCES as readonly string[]).includes(l.rowKey)) {
        const s = l.rowKey as ProjectionSource;
        sources[s][l.mes] = (sources[s][l.mes] || 0) + Number(l.valor);
      } else {
        // Receita lançada por projeto (linha única "Receita") ou qualquer chave
        // não mapeada: agrega na fonte primária para preservar o total nos
        // relatórios "por fonte" (Consolidado/Projeção).
        const s = PROJECTION_SOURCES[0] as ProjectionSource;
        sources[s][l.mes] = (sources[s][l.mes] || 0) + Number(l.valor);
      }
    }
    return { sources, reemb };
  }

  const [unitRows, reembRows, incc, planoNovo] = await Promise.all([
    getUnits(versao?.tenantId ?? "", versionId),
    getReembolsos(versao?.tenantId ?? "", versionId),
    getInccRows(versao?.tenantId ?? "", projectId),
    versao?.tenantId ? chaveLigada(versao.tenantId, "plano_definicao_nova") : Promise.resolve(false),
  ]);
  for (const u of unitRows) {
    const bs = calcProjectionBySource(toCalcUnit(u), incc, { definicaoNova: planoNovo });
    for (const s of PROJECTION_SOURCES)
      for (const [mm, v] of Object.entries(bs[s]))
        sources[s][mm] = (sources[s][mm] || 0) + v;
  }
  const rb = reembursementsByMonth(reembToCalc(reembRows));
  for (const [mm, v] of Object.entries(rb)) reemb[mm] = (reemb[mm] || 0) + v;
  return { sources, reemb };
}

/** Ordena chaves "MM/YYYY" cronologicamente. */
export function sortMonthKey(a: string, b: string): number {
  const [ma, ya] = a.split("/").map(Number);
  const [mb, yb] = b.split("/").map(Number);
  return ya - yb || ma - mb;
}

// ──────────────────────── Config & multi-tenant ──────────────────────────

export interface MemberRow {
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
  permissions: import("@/lib/permissions").PermMatrix | null;
  mfaEnabled: boolean;
  /** senha definida por outra pessoa, ainda não trocada (AI 1.1). */
  mustChangePassword: boolean;
  /** já definiu senha? (senão, ainda não consegue logar). */
  hasPassword: boolean;
}

export async function getMembers(tenantId: string): Promise<MemberRow[]> {
  const rows = await db
    .select({
      userId: schema.memberships.userId,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.memberships.role,
      permissions: schema.memberships.permissions,
      mfaEnabled: schema.users.mfaEnabled,
      mustChangePassword: schema.users.mustChangePassword,
      passwordHash: schema.users.passwordHash,
    })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(eq(schema.memberships.tenantId, tenantId))
    .orderBy(asc(schema.memberships.createdAt));
  return rows.map(({ passwordHash, ...m }) => ({
    ...m,
    hasPassword: Boolean(passwordHash),
  }));
}

// ──────────────────────── Super-admin (plataforma) ───────────────────────

export interface TenantOverview {
  id: string;
  name: string;
  createdAt: Date;
  members: number;
  projects: number;
  owners: string[];
}

/**
 * Visão geral de TODOS os tenants — usada apenas na tela de super-admin da
 * plataforma. Não é filtrada por tenant (é uma visão de plataforma), então o
 * chamador é responsável por restringir o acesso a super-admins.
 */
export async function getAllTenantsOverview(): Promise<TenantOverview[]> {
  const tenants = await db
    .select()
    .from(schema.tenants)
    .orderBy(desc(schema.tenants.createdAt));

  const memberCounts = await db
    .select({
      tenantId: schema.memberships.tenantId,
      n: sql<number>`count(*)::int`,
    })
    .from(schema.memberships)
    .groupBy(schema.memberships.tenantId);

  const projectCounts = await db
    .select({
      tenantId: schema.projects.tenantId,
      n: sql<number>`count(*)::int`,
    })
    .from(schema.projects)
    .groupBy(schema.projects.tenantId);

  const ownerRows = await db
    .select({
      tenantId: schema.memberships.tenantId,
      email: schema.users.email,
    })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(eq(schema.memberships.role, "owner"));

  const memberMap = new Map(memberCounts.map((r) => [r.tenantId, r.n]));
  const projectMap = new Map(projectCounts.map((r) => [r.tenantId, r.n]));
  const ownerMap = new Map<string, string[]>();
  for (const r of ownerRows) {
    if (!r.email) continue;
    const list = ownerMap.get(r.tenantId) ?? [];
    list.push(r.email);
    ownerMap.set(r.tenantId, list);
  }

  return tenants.map((t) => ({
    id: t.id,
    name: t.name,
    createdAt: t.createdAt,
    members: memberMap.get(t.id) ?? 0,
    projects: projectMap.get(t.id) ?? 0,
    owners: ownerMap.get(t.id) ?? [],
  }));
}

export type AuditRow = typeof schema.auditLog.$inferSelect;

/**
 * Prompt AH, 6.1 — histórico do cadastro fiscal e do nome (`tenant.fiscal`,
 * `tenant.rename`): quando, quem e QUAIS campos mudaram. Os valores de/para
 * não saem daqui — o painel mostra nomes de campos (8.2 fica para o módulo de
 * auditoria).
 */
export async function getHistoricoFiscal(tenantId: string, limit = 15): Promise<{ quando: Date; quem: string | null; acao: string; campos: string[] }[]> {
  const rows = await db
    .select({ action: schema.auditLog.action, meta: schema.auditLog.meta, createdAt: schema.auditLog.createdAt, email: schema.users.email })
    .from(schema.auditLog)
    .leftJoin(schema.users, eq(schema.users.id, schema.auditLog.userId))
    .where(and(eq(schema.auditLog.tenantId, tenantId), inArray(schema.auditLog.action, ["tenant.fiscal", "tenant.rename"])))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(limit);
  return rows.map((r) => ({ quando: r.createdAt, quem: r.email ?? null, acao: r.action, campos: Object.keys(((r.meta ?? {}) as { changes?: Record<string, unknown> }).changes ?? {}) }));
}

/** Prompt AH, 5.2 — último teste REAL do R2 (gravado por /api/health/r2), para o selo da tela Empresa. */
export async function getUltimoTesteR2(tenantId: string): Promise<{ ok: boolean; quando: Date; etapa: string | null } | null> {
  const [row] = await db
    .select({ meta: schema.auditLog.meta, createdAt: schema.auditLog.createdAt })
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.tenantId, tenantId), eq(schema.auditLog.action, "tenant.r2.health")))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(1);
  if (!row) return null;
  const meta = (row.meta ?? {}) as { ok?: boolean; stage?: string | null };
  return { ok: meta.ok === true, quando: row.createdAt, etapa: meta.stage ?? null };
}

export async function getAuditLog(
  tenantId: string,
  limit = 20,
  /** Prompt AK2 — filtros da tela de Auditoria (todos opcionais). */
  f: Partial<FiltrosDaAuditoria> = {},
): Promise<AuditRow[]> {
  const conds: SQL[] = [eq(schema.auditLog.tenantId, tenantId)];
  if (f.usuario === "sistema") conds.push(isNull(schema.auditLog.userId));
  else if (f.usuario) conds.push(eq(schema.auditLog.userId, f.usuario));
  if (f.entidade) conds.push(eq(schema.auditLog.entity, f.entidade));
  if (f.acao) conds.push(sql`${schema.auditLog.action} ilike ${"%" + f.acao.replace(/[%_\\]/g, "") + "%"}`);
  if (f.de) conds.push(gte(schema.auditLog.createdAt, new Date(`${f.de}T00:00:00`)));
  if (f.ate) conds.push(lt(schema.auditLog.createdAt, new Date(new Date(`${f.ate}T00:00:00`).getTime() + 86_400_000)));
  return db
    .select()
    .from(schema.auditLog)
    .where(and(...conds))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(limit);
}

/** Prompt AK2 — as entidades que aparecem no log da empresa (para o filtro). */
export async function getEntidadesDaAuditoria(tenantId: string): Promise<string[]> {
  const rows = await db.selectDistinct({ e: schema.auditLog.entity }).from(schema.auditLog).where(eq(schema.auditLog.tenantId, tenantId)).limit(100);
  return rows.map((r) => r.e).filter((e): e is string => !!e).sort();
}

// ─────────────────────── Conciliação bancária (Caixa) ───────────────────────

export interface ConciliacaoSugestao {
  despesaId: string;
  numDoc: string | null;
  fornecedor: string | null;
  descricao: string | null;
  valor: number;
  vencimento: string | null;
  /** grau de compatibilidade (só orientação — decisão é do usuário). */
  grau: "alta" | "media" | "baixa";
}
export interface MovimentoPendente {
  cashEntryId: string;
  data: string | null;
  descricao: string | null;
  doc: string | null;
  valor: number;
  /** Prompt L, Parte 2 — já vinculado com valor (parcial); o que falta é |valor| − vinculado. */
  vinculado: number;
  sugestoes: ConciliacaoSugestao[];
  /**
   * Prompt AT §6.4 — pagamentos de fatura de cartão compatíveis (mesmo valor,
   * mesma conta, data próxima): a saída da fatura concilia com o pagamento,
   * não com as compras da fatura.
   */
  faturas?: SugestaoFatura[];
}
export interface SugestaoFatura {
  faturaPagamentoId: string;
  cartao: string;
  vencimento: string;
  valor: number;
  data: string;
  grau: "alta" | "media";
}
export interface SugestaoReceber {
  contaReceberId: string;
  descricao: string | null;
  projectName: string;
  valor: number;
  vencimento: string | null;
  grau: "alta" | "media" | "baixa";
}
export interface MovimentoPendenteEntrada {
  cashEntryId: string;
  data: string | null;
  descricao: string | null;
  doc: string | null;
  valor: number;
  sugestoes: SugestaoReceber[];
  /** Prompt AT §5.2 — o que falta conciliar desta entrada (valor − já usado em contas e parcelas). */
  livre?: number;
  /** Prompt AT §5.2 — parcelas de venda em aberto compatíveis (mesma regra de grau). */
  parcelas?: import("@/lib/recebimento-parcela").SugestaoParcela[];
}
export interface MovimentoConciliado {
  cashEntryId: string;
  data: string | null;
  descricao: string | null;
  valor: number;
  despesaId: string | null;
  despesaNumDoc: string | null;
  fornecedor: string | null;
  conciliadoPor: string | null;
  conciliadoEm: string | null;
  /** Prompt L — vínculos com valor (Parte 2); vazio no caminho antigo. */
  vinculos: { despesaId: string; numDoc: string | null; fornecedor: string | null; valor: number; origem: string }[];
  /** BL-2 / 6.6 — `rec` sem nenhum vínculo: estado próprio, não "conciliado". */
  semVinculo: boolean;
}
export interface ConciliacaoData {
  pendentes: MovimentoPendente[];
  pendentesEntrada: MovimentoPendenteEntrada[];
  conciliados: MovimentoConciliado[];
}

const normStr = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
/** "MM/DD/YYYY" → dia serial UTC (para diferença em dias); null se inválido. */
const diaSerial = (s: string | null | undefined): number | null => {
  if (!s) return null;
  const p = s.split("/");
  if (p.length !== 3) return null;
  const [mo, d, y] = p.map(Number);
  if (!y || !mo || !d) return null;
  return Math.floor(Date.UTC(y, mo - 1, d) / 86400000);
};

/**
 * Dados da conciliação bancária: movimentos do extrato ainda não conciliados
 * (saídas) com SUGESTÕES de contas a pagar em aberto (com grau de
 * compatibilidade), e os movimentos já conciliados (para desfazer/histórico).
 * As sugestões são só orientação — nada é conciliado sem ação do usuário.
 */
export async function getConciliacaoData(
  tenantId: string,
  /**
   * A versão (a tela de antes, por obra) ou, com a chave
   * "caixa_conciliacao_por_conta" (Prompt AT §4), a EMPRESA: a versão Atual de
   * todas as obras e os movimentos sem obra, opcionalmente de uma conta só.
   */
  escopo: string | { conta?: string | null },
): Promise<ConciliacaoData> {
  const [entries, contas, receber] = await Promise.all([
    typeof escopo === "string"
      ? db
          .select()
          .from(schema.cashEntries)
          .where(
            and(
              eq(schema.cashEntries.tenantId, tenantId),
              eq(schema.cashEntries.versionId, escopo),
            ),
          )
      : getCashDaEmpresa(tenantId).then((xs) => (escopo.conta ? xs.filter((c) => c.bankAccountId === escopo.conta) : xs)),
    getContasPagar(tenantId),
    getContasReceber(tenantId),
  ]);
  const despById = new Map(contas.map((c) => [c.id, c]));
  const recById = new Map(receber.map((c) => [c.id, c]));
  const abertas = contas.filter((c) => c.status !== "Pago");
  // Prompt L, Parte 2 — vínculos com valor dos movimentos desta versão (ou da empresa).
  const vinculos = typeof escopo === "string" ? await vinculosDaVersao(tenantId, escopo) : await vinculosDosMovimentos(tenantId, entries.map((e) => e.id));
  const vinculosPorMov = new Map<string, typeof vinculos>();
  for (const v of vinculos) vinculosPorMov.set(v.cashEntryId, [...(vinculosPorMov.get(v.cashEntryId) ?? []), v]);
  const vinculadoDe = (id: string) => Math.round((vinculosPorMov.get(id) ?? []).reduce((a, v) => a + v.valor, 0) * 100) / 100;
  const receberAbertas = receber.filter((c) => c.status !== "Recebido" && c.status !== "Cancelada");

  // Prompt AT §6.4 — pagamentos de fatura cuja saída ainda é a que o app gerou
  // no pagamento (sem linha do extrato): candidatos das saídas pendentes.
  const pagamentosDeFatura = await db
    .select({ id: schema.faturaPagamentos.id, valor: schema.faturaPagamentos.valor, data: schema.faturaPagamentos.data, bankAccountId: schema.faturaPagamentos.bankAccountId, vencimento: schema.faturasCartao.vencimento, apelido: schema.cartoesCredito.apelido, ultimos4: schema.cartoesCredito.ultimos4 })
    .from(schema.faturaPagamentos)
    .innerJoin(schema.faturasCartao, eq(schema.faturaPagamentos.faturaId, schema.faturasCartao.id))
    .innerJoin(schema.cartoesCredito, eq(schema.faturasCartao.cartaoId, schema.cartoesCredito.id))
    .innerJoin(schema.cashEntries, eq(schema.faturaPagamentos.cashEntryId, schema.cashEntries.id))
    .where(and(eq(schema.faturaPagamentos.tenantId, tenantId), isNull(schema.cashEntries.importHash), isNull(schema.cashEntries.externalId)));
  const pendentes: MovimentoPendente[] = [];
  const rankGrau = { alta: 0, media: 1, baixa: 2 } as const;
  for (const e of entries) {
    // Movimento com vínculo PARCIAL continua pendente (3.1: só conclui quando os vínculos somam o valor).
    if (e.rec || (e.conciliadoDespesaId && vinculadoDe(e.id) === 0)) continue;
    const valor = Number(e.valor);
    if (!valor || valor >= 0) continue; // só saídas do extrato, por ora
    const movCents = Math.round(Math.abs(valor) * 100);
    const movDia = diaSerial(e.data);
    const desc = normStr(e.descricao ?? "");
    const sugestoes: (ConciliacaoSugestao & { _prox: number })[] = [];
    for (const c of abertas) {
      const cCents = Math.round(Math.abs(c.valor) * 100);
      const exato = cCents === movCents;
      const aprox = !exato && Math.abs(cCents - movCents) <= Math.max(50, movCents * 0.02);
      if (!exato && !aprox) continue;
      const vDia = diaSerial(c.vencimento);
      const prox = movDia != null && vDia != null ? Math.abs(vDia - movDia) : 9999;
      const vencida = movDia != null && vDia != null && vDia <= movDia;
      const dataProx = prox <= 7 || vencida;
      const primeiroNome = c.fornecedorNome ? normStr(c.fornecedorNome).split(/\s+/)[0] : "";
      const nomeMatch = primeiroNome.length >= 3 && desc.includes(primeiroNome);
      let grau: "alta" | "media" | "baixa";
      if (exato && (dataProx || nomeMatch)) grau = "alta";
      else if (exato || (aprox && (dataProx || nomeMatch))) grau = "media";
      else grau = "baixa";
      sugestoes.push({
        despesaId: c.id,
        numDoc: c.numDoc,
        fornecedor: c.fornecedorNome,
        descricao: c.descricao,
        valor: c.valor,
        vencimento: c.vencimento,
        grau,
        _prox: prox,
      });
    }
    sugestoes.sort((a, b) => rankGrau[a.grau] - rankGrau[b.grau] || a._prox - b._prox);
    // Só o movimento que veio do extrato (importado ou Open Finance) casa com o pagamento da fatura.
    const faturas: SugestaoFatura[] = e.importHash || e.externalId
      ? pagamentosDeFatura
          .filter((f) => Math.round(Number(f.valor) * 100) === movCents && (!f.bankAccountId || !e.bankAccountId || f.bankAccountId === e.bankAccountId))
          .map((f) => {
            const fDia = diaSerial(f.data);
            const dias = movDia != null && fDia != null ? Math.abs(fDia - movDia) : 9999;
            return { f, dias };
          })
          .filter((x) => x.dias <= 10)
          .sort((a, b) => a.dias - b.dias)
          .map(({ f, dias }) => ({ faturaPagamentoId: f.id, cartao: `${f.apelido}${f.ultimos4 ? " •••• " + f.ultimos4 : ""}`, vencimento: f.vencimento, valor: Number(f.valor), data: f.data, grau: dias <= 3 ? ("alta" as const) : ("media" as const) }))
      : [];
    pendentes.push({
      cashEntryId: e.id,
      data: e.data,
      descricao: e.descricao,
      doc: e.doc,
      valor,
      vinculado: vinculadoDe(e.id),
      sugestoes: sugestoes.slice(0, 4).map(({ _prox, ...s }) => { void _prox; return s; }),
      ...(faturas.length ? { faturas } : {}),
    });
  }

  // Entradas do extrato (crédito) ainda não conciliadas → sugere contas a
  // receber e (Prompt AT §5.2) as parcelas de venda em aberto.
  const pendentesEntrada: MovimentoPendenteEntrada[] = [];
  const rp = await import("@/lib/recebimento-parcela");
  const entradasAbertas = entries.filter((e) => !(e.rec || e.conciliadoDespesaId || e.conciliadoContaReceberId) && Number(e.valor) > 0);
  const [usadoDasEntradas, parcelasAbertas] = entradasAbertas.length
    ? await Promise.all([rp.usadoDasEntradas(db, tenantId, entradasAbertas.map((e) => e.id)), rp.parcelasDeVenda(tenantId, (await import("@/lib/despesa-status")).hojeISO())])
    : [new Map<string, number>(), []];
  for (const e of entries) {
    if (e.rec || e.conciliadoDespesaId || e.conciliadoContaReceberId) continue;
    const valor = Number(e.valor);
    if (!valor || valor <= 0) continue; // só entradas
    const livre = Math.round((valor - (usadoDasEntradas.get(e.id) ?? 0)) * 100) / 100;
    if (livre <= 0.005) continue;
    const movCents = Math.round(Math.abs(valor) * 100);
    const movDia = diaSerial(e.data);
    const desc = normStr(e.descricao ?? "");
    const sugestoes: (SugestaoReceber & { _prox: number })[] = [];
    for (const c of receberAbertas) {
      const saldo = c.valor - c.valorRecebido;
      const cCents = Math.round(Math.abs(saldo || c.valor) * 100);
      const exato = cCents === movCents;
      const aprox = !exato && Math.abs(cCents - movCents) <= Math.max(50, movCents * 0.02);
      if (!exato && !aprox) continue;
      const vDia = diaSerial(c.vencimento);
      const prox = movDia != null && vDia != null ? Math.abs(vDia - movDia) : 9999;
      const dataProx = prox <= 7 || (movDia != null && vDia != null && vDia <= movDia);
      const nomeAlvo = normStr(c.clienteNome ?? c.descricao ?? "").split(/\s+/)[0];
      const nomeMatch = nomeAlvo.length >= 3 && desc.includes(nomeAlvo);
      let grau: "alta" | "media" | "baixa";
      if (exato && (dataProx || nomeMatch)) grau = "alta";
      else if (exato || (aprox && (dataProx || nomeMatch))) grau = "media";
      else grau = "baixa";
      sugestoes.push({
        contaReceberId: c.id,
        descricao: c.descricao ?? c.tipo,
        projectName: c.projectName,
        valor: c.valor,
        vencimento: c.vencimento,
        grau,
        _prox: prox,
      });
    }
    sugestoes.sort((a, b) => rankGrau[a.grau] - rankGrau[b.grau] || a._prox - b._prox);
    const parcelas = rp.sugestoesDeParcela({ valor: livre, data: e.data, descricao: e.descricao }, parcelasAbertas);
    pendentesEntrada.push({
      cashEntryId: e.id,
      data: e.data,
      descricao: e.descricao,
      doc: e.doc,
      valor,
      sugestoes: sugestoes.slice(0, 4).map(({ _prox, ...s }) => { void _prox; return s; }),
      ...(livre < valor - 0.005 ? { livre } : {}),
      ...(parcelas.length ? { parcelas } : {}),
    });
  }

  // Conciliados: os com vínculo (novo ou antigo) e — BL-2 / 6.6 — os marcados
  // `rec` sem lastro nenhum, em estado próprio. Ajuste nasce conciliado e não entra.
  const conciliados: MovimentoConciliado[] = entries
    .filter((e) => (e.rec && e.cat !== "ajuste") || e.conciliadoDespesaId || e.conciliadoContaReceberId)
    .map((e) => {
      const d = e.conciliadoDespesaId ? despById.get(e.conciliadoDespesaId) : undefined;
      const r = e.conciliadoContaReceberId ? recById.get(e.conciliadoContaReceberId) : undefined;
      const vs = vinculosPorMov.get(e.id) ?? [];
      return {
        cashEntryId: e.id,
        data: e.data,
        descricao: e.descricao,
        valor: Number(e.valor),
        despesaId: e.conciliadoDespesaId ?? e.conciliadoContaReceberId,
        despesaNumDoc: d?.numDoc ?? (r ? "Conta a receber" : null),
        fornecedor: d?.fornecedorNome ?? r?.clienteNome ?? r?.descricao ?? null,
        conciliadoPor: e.conciliadoPor,
        conciliadoEm: e.conciliadoEm,
        vinculos: vs.map((v) => ({ despesaId: v.despesaId, numDoc: v.numDoc, fornecedor: v.fornecedor, valor: v.valor, origem: v.origem })),
        semVinculo: vs.length === 0 && !e.conciliadoDespesaId && !e.conciliadoContaReceberId,
      };
    });

  return { pendentes, pendentesEntrada, conciliados };
}

// ─────────────────────────── Contas a Receber ───────────────────────────────

export interface ContaReceberRow {
  id: string;
  projectId: string;
  projectName: string;
  unitCode: string | null;
  clienteId: string | null;
  clienteNome: string | null;
  descricao: string | null;
  tipo: string;
  valor: number;
  vencimento: string | null;
  dataRecebimento: string | null;
  valorRecebido: number;
  status: string;
  bancoId: string | null;
  origemCashEntryId: string | null;
  createdAt: string | null;
}

/** Contas a receber criadas manualmente / convertidas do extrato (não canceladas). */
export async function getContasReceber(tenantId: string, projectId?: string): Promise<ContaReceberRow[]> {
  const rows = await db
    .select({
      c: schema.contasReceber,
      projectName: schema.projects.name,
      clienteNome: schema.clientes.nomeCompleto,
    })
    .from(schema.contasReceber)
    .innerJoin(schema.projects, eq(schema.contasReceber.projectId, schema.projects.id))
    .leftJoin(schema.clientes, eq(schema.contasReceber.clienteId, schema.clientes.id))
    // CR-06 — a obra filtra na consulta, não em memória depois.
    .where(
      and(
        eq(schema.contasReceber.tenantId, tenantId),
        eq(schema.contasReceber.cancelado, false),
        ...(projectId ? [eq(schema.contasReceber.projectId, projectId)] : []),
      ),
    )
    .orderBy(asc(chaveDataBR(schema.contasReceber.vencimento)), asc(schema.contasReceber.createdAt), asc(schema.contasReceber.id));
  return rows.map((r) => ({
    id: r.c.id,
    projectId: r.c.projectId,
    projectName: r.projectName,
    unitCode: r.c.unitCode,
    clienteId: r.c.clienteId,
    clienteNome: r.clienteNome,
    descricao: r.c.descricao,
    tipo: r.c.tipo,
    valor: Number(r.c.valor),
    vencimento: r.c.vencimento,
    dataRecebimento: r.c.dataRecebimento,
    valorRecebido: Number(r.c.valorRecebido),
    status: r.c.status,
    bancoId: r.c.bancoId,
    origemCashEntryId: r.c.origemCashEntryId,
    createdAt: r.c.createdAt ? new Date(r.c.createdAt).toISOString() : null,
  }));
}

// ───────────── Indicadores físico-financeiros da obra (Dashboard) ─────────────

export interface IndicadoresObra {
  /** Parâmetros vindos do cadastro do projeto. */
  financiamentoConstrucao: number;
  financiamentoTerreno: number;
  totalAquisicao: number;
  cub: number;
  metragem: number;
  custoReferencial: number;
  parcelaReferencia: number;
  pctBdi: number;
  pctTaxa: number;
  tipoExecutor: string | null;
  /** Serviços e medição. */
  custoTotalServicos: number;
  valorBdi: number;
  custoTotalComBdi: number;
  servicosForaDosLimites: number;
  qtdServicos: number;
  /** Evolução física. */
  evolucaoAcumulada: number;
  evolucaoMes: number;
  /** Provisionamento/liberação (último mês medido). */
  liberacaoMes: number;
  liberacaoAcumulada: number;
  saldoFinanciamento: number;
  custoEstimadoMes: number;
  geracaoCaixaMes: number;
  pctRecebido: number;
  /** Há dados de medição cadastrados? */
  temMedicao: boolean;
  /** Os parâmetros do projeto (CUB, financiamento, BDI) estão preenchidos? */
  temParametros: boolean;
}

/**
 * Indicadores físico-financeiros de um projeto: BDI, evolução da obra,
 * liberação e saldo de financiamento. Base do painel do Dashboard.
 *
 * Todos os parâmetros vêm do cadastro do projeto — nada é fixado em código.
 * Quando o projeto ainda não tem serviços/medição cadastrados, os indicadores
 * voltam zerados com `temMedicao: false`, para a tela explicar o que falta em
 * vez de mostrar número inventado.
 */
export async function getIndicadoresObra(
  tenantId: string,
  projectId: string,
  /**
   * Prompt AA, 3.1 — chave "dashboard_definicao_nova". Ligada: sem medição,
   * "Liberação acumulada" e "Saldo de financiamento" NÃO assumem os valores do
   * cadastro (ficam zerados e `temMedicao` falso faz o cartão mostrar "—").
   * Desligada: os fallbacks de antes.
   */
  opts: { definicaoNova?: boolean } = {},
): Promise<IndicadoresObra> {
  const [proj] = await db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, projectId), eq(schema.projects.tenantId, tenantId)))
    .limit(1);

  const servicoRows = proj
    ? await db
        .select()
        .from(schema.servicos)
        // Prompt AA, 8.3: tenant explícito no SQL (antes vinha só pelo projeto).
        .where(and(eq(schema.servicos.tenantId, tenantId), eq(schema.servicos.projectId, projectId)))
        .orderBy(asc(schema.servicos.ordem))
    : [];
  const servicoIds = servicoRows.map((s) => s.id);
  const medRows =
    servicoIds.length > 0
      ? await db
          .select()
          .from(schema.medicaoServicos)
          // Prompt AA, 8.2/8.4: só as medições DESTES serviços, no SQL — antes
          // vinha a tabela inteira do tenant e o filtro era em memória.
          .where(and(eq(schema.medicaoServicos.tenantId, tenantId), inArray(schema.medicaoServicos.servicoId, servicoIds)))
      : [];

  const num = (v: unknown) => Number(v) || 0;
  const financiamentoConstrucao = num(proj?.financiamentoConstrucao);
  const financiamentoTerreno = num(proj?.financiamentoTerreno);
  const cub = num(proj?.cub);
  const metragem = num(proj?.metragem);
  const pctBdi = num(proj?.pctBdi);
  const pctTaxa = num(proj?.pctTaxaLiberacao);
  const parcelaReferencia = num(proj?.parcelaReferencia);

  const servicos = servicoRows.map((s) => ({
    id: s.id,
    nome: s.nome,
    custoProposto: num(s.custoProposto),
    limiteMin: s.limiteMin == null ? null : num(s.limiteMin),
    limiteMax: s.limiteMax == null ? null : num(s.limiteMax),
  }));

  const incid = calcIncidencias(servicos);
  const bdi = calcBdi(servicos, pctBdi);
  const custoRef = custoReferencial(cub, metragem);

  const medicoes = medRows
    .filter((m) => servicoIds.includes(m.servicoId))
    .map((m) => ({
      servicoId: m.servicoId,
      competencia: m.competencia,
      pctExecutadoAcum: num(m.pctExecutadoAcum),
    }));
  const evolucao = calcEvolucao(servicos, medicoes);
  const provis = calcProvisionamento(evolucao, {
    financiamentoConstrucao,
    financiamentoTerreno,
    custoReferencial: custoRef,
    parcelaReferencia,
    pctTaxa,
  });
  const ultimo = provis[provis.length - 1];
  const ultimaEvol = evolucao[evolucao.length - 1];

  return {
    financiamentoConstrucao,
    financiamentoTerreno,
    totalAquisicao: financiamentoConstrucao + financiamentoTerreno,
    cub,
    metragem,
    custoReferencial: custoRef,
    parcelaReferencia,
    pctBdi,
    pctTaxa,
    tipoExecutor: proj?.tipoExecutor ?? null,
    custoTotalServicos: bdi.custoTotalServicos,
    valorBdi: bdi.valorBdi,
    custoTotalComBdi: bdi.custoTotalComBdi,
    servicosForaDosLimites: incid.filter(
      (s) => s.status === "Abaixo do mínimo" || s.status === "Acima do máximo",
    ).length,
    qtdServicos: servicos.length,
    evolucaoAcumulada: ultimaEvol?.acumulado ?? 0,
    evolucaoMes: ultimaEvol?.variacao ?? 0,
    liberacaoMes: ultimo?.liberacao ?? 0,
    liberacaoAcumulada: ultimo?.liberacaoAcumulada ?? (opts.definicaoNova ? 0 : financiamentoTerreno),
    saldoFinanciamento:
      ultimo?.saldoFinanciamento ?? (opts.definicaoNova ? 0 : financiamentoConstrucao),
    custoEstimadoMes: ultimo?.custoEstimado ?? 0,
    geracaoCaixaMes: ultimo?.caixa ?? 0,
    pctRecebido: ultimo?.pctRecebido ?? 0,
    temMedicao: evolucao.length > 0,
    temParametros: financiamentoConstrucao > 0 || cub > 0 || pctBdi > 0,
  };
}

/**
 * Indicadores consolidados de VÁRIOS projetos (visão geral da empresa —
 * matriz e filiais).
 *
 * Valores monetários são somados. PERCENTUAIS NÃO SÃO SOMADOS: a evolução
 * física é ponderada pelo custo total dos serviços de cada obra (uma obra de
 * R$ 1 mi a 50% pesa mais que uma de R$ 100 mil a 50%), e o % recebido é
 * recalculado a partir dos totais consolidados. O %BDI consolidado é a razão
 * entre o valor total de BDI e o custo total dos serviços.
 */
export async function getIndicadoresObraConsolidado(
  tenantId: string,
  projectIds: string[],
  opts: { definicaoNova?: boolean } = {},
): Promise<IndicadoresObra> {
  const todos = await Promise.all(
    projectIds.map((id) => getIndicadoresObra(tenantId, id, opts)),
  );
  const soma = (f: (i: IndicadoresObra) => number) =>
    todos.reduce((a, i) => a + f(i), 0);

  const custoTotalServicos = soma((i) => i.custoTotalServicos);
  const valorBdi = soma((i) => i.valorBdi);
  const totalAquisicao = soma((i) => i.totalAquisicao);
  const liberacaoAcumulada = soma((i) => i.liberacaoAcumulada);

  // Média ponderada pelo custo dos serviços; sem base, cai para média simples.
  const ponderada = (f: (i: IndicadoresObra) => number) => {
    const base = custoTotalServicos;
    if (base > 0) {
      return todos.reduce((a, i) => a + f(i) * i.custoTotalServicos, 0) / base;
    }
    const comDados = todos.filter((i) => i.temMedicao);
    if (comDados.length === 0) return 0;
    return comDados.reduce((a, i) => a + f(i), 0) / comDados.length;
  };

  return {
    financiamentoConstrucao: soma((i) => i.financiamentoConstrucao),
    financiamentoTerreno: soma((i) => i.financiamentoTerreno),
    totalAquisicao,
    // CUB e metragem não se somam entre obras — não têm leitura consolidada.
    cub: 0,
    metragem: soma((i) => i.metragem),
    custoReferencial: soma((i) => i.custoReferencial),
    parcelaReferencia: soma((i) => i.parcelaReferencia),
    pctBdi: custoTotalServicos > 0 ? (valorBdi / custoTotalServicos) * 100 : 0,
    pctTaxa: 0,
    tipoExecutor: null,
    custoTotalServicos,
    valorBdi,
    custoTotalComBdi: soma((i) => i.custoTotalComBdi),
    servicosForaDosLimites: soma((i) => i.servicosForaDosLimites),
    qtdServicos: soma((i) => i.qtdServicos),
    evolucaoAcumulada: ponderada((i) => i.evolucaoAcumulada),
    evolucaoMes: ponderada((i) => i.evolucaoMes),
    liberacaoMes: soma((i) => i.liberacaoMes),
    liberacaoAcumulada,
    saldoFinanciamento: soma((i) => i.saldoFinanciamento),
    custoEstimadoMes: soma((i) => i.custoEstimadoMes),
    geracaoCaixaMes: soma((i) => i.geracaoCaixaMes),
    pctRecebido: totalAquisicao > 0 ? liberacaoAcumulada / totalAquisicao : 0,
    temMedicao: todos.some((i) => i.temMedicao),
    temParametros: todos.some((i) => i.temParametros),
  };
}

export interface StatusProjeto {
  /** Receita prevista — valor global de venda do CADASTRO do projeto. */
  receitaPrevista: number;
  /** Entradas de caixa já realizadas. */
  recebido: number;
  /** recebido ÷ receita prevista (0..1). */
  pctRecebido: number;
  /** Despesa prevista — total planejado na versão BUDGET do projeto. */
  despesaPrevista: number;
  /** Despesas lançadas (executadas), excluindo canceladas. */
  executado: number;
  /** executado ÷ despesa prevista (0..1). */
  pctExecutado: number;
  /**
   * Margem de contribuição = Receita − Custo Variável − Despesa Variável.
   * O percentual é sobre a RECEITA TOTAL DO PROJETO (valor global do cadastro),
   * não sobre a receita já realizada.
   */
  margemContribuicao: number;
  pctMargem: number;
  /** Receita e custos que compõem a margem (versão Atual). */
  receitaAtual: number;
  custoVariavel: number;
  despesaVariavel: number;
  /** Indicadores por metro quadrado (metragem do cadastro do projeto). */
  metragem: number;
  custoPorM2: number;
  receitaPorM2: number;
  /**
   * Prompt AA (2.3.3, 4-B): o que os números acima somam, para o cartão
   * DECLARAR — nenhum número muda por causa destes campos.
   */
  composicao: {
    /** Quantas versões Orçamento entram no denominador de "Executado". */
    orcamentos: number;
    /** Entradas de caixa de versões que NÃO são a Atual, já somadas em "recebido". */
    caixaForaDaAtual: number;
    /** Projetos sem versão Atual (não entram em executado nem na margem). */
    semAtual: number;
    /** Chave ligada: o rótulo do Orçamento usado em cada obra (4-B.2). */
    orcamentosUsados: string[];
    /** Chave ligada: a janela da margem (4-B.3); null com a chave desligada. */
    janela: OrigemDaJanela | null;
    /** A definição nova estava ligada nesta leitura? */
    definicaoNova: boolean;
  };
  /** 4-B.5: a leitura do Orçamento falhou — "Executado" não tem denominador. */
  erroOrcamento: boolean;
}

/** Prompt AA, 8.5 — razão com o guard de sempre (denominador ≤ 0 → 0). */
export function razao(n: number, d: number): number {
  return d > 0 ? n / d : 0;
}

/**
 * Status atual de um projeto: quanto já entrou frente ao previsto no cadastro,
 * quanto já foi gasto frente ao planejado no Budget, e a margem de contribuição.
 *
 * Quando `projectIds` traz mais de um projeto, os valores são somados e os
 * percentuais recalculados a partir dos totais — nunca somando percentuais.
 *
 * Prompt AA, 8.2/8.3: tudo é filtrado NO SQL, com o tenant explícito — antes
 * vinham `project`, `version`, `cash_entry` e `despesa` do tenant inteiro e o
 * recorte era em memória. Os resultados são os mesmos (teste-oráculo).
 */
export async function getStatusProjeto(
  tenantId: string,
  projectIds: string[],
  /**
   * Prompt AA — chave "dashboard_definicao_nova" (nasce desligada). Ligada:
   * entradas só da Atual (4-B.1), UM Orçamento por obra (4-B.2), margem na
   * mesma janela de competências (4-B.3) e o período aplicado (2.3.2).
   * Desligada (padrão): exatamente o de antes — e o teste-oráculo confere.
   */
  opts: { definicaoNova?: boolean; de?: string; ate?: string } = {},
): Promise<StatusProjeto> {
  const nova = !!opts.definicaoNova;
  const de = nova ? opts.de ?? "" : "";
  const ate = nova ? opts.ate ?? "" : "";
  const comPeriodo = !!(de || ate);
  if (projectIds.length === 0) {
    return {
      receitaPrevista: 0, recebido: 0, pctRecebido: 0,
      despesaPrevista: 0, executado: 0, pctExecutado: 0,
      margemContribuicao: 0, pctMargem: 0,
      receitaAtual: 0, custoVariavel: 0, despesaVariavel: 0,
      metragem: 0, custoPorM2: 0, receitaPorM2: 0,
      composicao: { orcamentos: 0, caixaForaDaAtual: 0, semAtual: 0, orcamentosUsados: [], janela: null, definicaoNova: nova },
      erroOrcamento: false,
    };
  }

  const [projs, versoesProj] = await Promise.all([
    db.select().from(schema.projects)
      .where(and(eq(schema.projects.tenantId, tenantId), inArray(schema.projects.id, projectIds))),
    db.select().from(schema.versions)
      .where(and(eq(schema.versions.tenantId, tenantId), inArray(schema.versions.projectId, projectIds))),
  ]);

  const num = (v: unknown) => Number(v) || 0;

  // Receita prevista = valor global de venda informado no cadastro do projeto.
  const receitaPrevista = projs.reduce((a, p) => a + num(p.valorConstrucao) + num(p.valorTerreno), 0);

  const idsAtual = versoesProj.filter((v) => v.kind === "atual").map((v) => v.id);
  // 4-B.2 (chave): um Orçamento por obra, o mais recente que não é cópia.
  const orcamentosUsados = nova
    ? projectIds.map((pid) => orcamentoDaObra(versoesProj.filter((v) => v.projectId === pid))).filter((v): v is NonNullable<typeof v> => !!v)
    : [];
  const idsBudget = nova
    ? orcamentosUsados.map((v) => v.id)
    : versoesProj.filter((v) => v.kind === "budget").map((v) => v.id);
  // 4-B.1 (chave): entradas de caixa só da Atual.
  const todosIds = nova ? idsAtual : versoesProj.map((v) => v.id);
  const janela = nova ? janelaDaMargem({ de, ate, projetos: projs }) : null;

  // 4-B.5: a falha do Orçamento não vira zero em silêncio — vira estado.
  let erroOrcamento = false;
  const [cashRows, despRows, budgetRows] = await Promise.all([
    todosIds.length
      ? Promise.all([
          db.select({ valor: schema.cashEntries.valor, versionId: schema.cashEntries.versionId, data: schema.cashEntries.data })
            .from(schema.cashEntries)
            .where(and(eq(schema.cashEntries.tenantId, tenantId), inArray(schema.cashEntries.versionId, todosIds))),
          // Prompt AT §3: a parte dos movimentos sem obra que o vínculo atribui a estas versões.
          partesDosMovimentosSemObra(tenantId),
        ]).then(([proprios, partes]) => [
          ...proprios,
          ...partes.filter((p) => p.versionId && todosIds.includes(p.versionId)).map((p) => ({ valor: String(p.valor), versionId: p.versionId, data: p.data })),
        ])
      : Promise.resolve([]),
    idsAtual.length
      ? db.select({
          valor: schema.despesas.valor,
          categoriaDre: schema.despesas.categoriaDre,
          cancelado: schema.despesas.cancelado,
          versionId: schema.despesas.versionId,
          competencia: schema.despesas.competencia,
        })
        .from(schema.despesas)
        .where(and(eq(schema.despesas.tenantId, tenantId), inArray(schema.despesas.versionId, idsAtual)))
      : Promise.resolve([]),
    idsBudget.length
      ? db.select({ valor: schema.budgetLines.valor, versionId: schema.budgetLines.versionId, mes: schema.budgetLines.mes })
          .from(schema.budgetLines)
          .where(and(
            eq(schema.budgetLines.tenantId, tenantId),
            eq(schema.budgetLines.kind, "despesa"),
            inArray(schema.budgetLines.versionId, idsBudget),
          ))
          .catch((e: unknown) => {
            console.error("[dashboard] falha ao ler o Orçamento (budget_line)", e);
            erroOrcamento = true;
            return [] as { valor: string; versionId: string; mes: string }[];
          })
      : Promise.resolve([]),
  ]);

  // Recebido = entradas de caixa das versões do projeto.
  // 2.3.2 (chave): com período, só as do período, pela data.
  const entradas = cashRows.filter((c) => num(c.valor) > 0 && (!comPeriodo || dateInRange(c.data, de, ate)));
  const recebido = entradas.reduce((a, c) => a + num(c.valor), 0);
  const atuais = new Set(idsAtual);
  const caixaForaDaAtual = entradas.filter((c) => !c.versionId || !atuais.has(c.versionId)).reduce((a, c) => a + num(c.valor), 0);

  // Despesa prevista = planejamento da versão Budget.
  const despesaPrevista = budgetRows
    .filter((b) => !comPeriodo || monthInRange(b.mes, de, ate))
    .reduce((a, b) => a + num(b.valor), 0);

  // Executado = despesas lançadas na versão Atual, exceto canceladas.
  // 2.3.2 (chave): com período, pela competência.
  const daAtual = despRows.filter((d) => !d.cancelado);
  const executadas = comPeriodo ? daAtual.filter((d) => monthInRange(d.competencia, de, ate)) : daAtual;
  const executado = executadas.reduce((a, d) => a + num(d.valor), 0);
  // 4-B.3 (chave): os custos da margem na MESMA janela da receita.
  const daMargem = janela ? daAtual.filter((d) => naJanela(d.competencia, janela, de, ate)) : daAtual;
  const porCat = (cat: string) =>
    daMargem.filter((d) => d.categoriaDre === cat).reduce((a, d) => a + num(d.valor), 0);
  const custoVariavel = porCat("Custo Variável");
  const despesaVariavel = porCat("Despesa Variável");

  // Receita realizada da versão Atual (mesma fonte da DRE). Com a chave
  // "dre_receita_rateio" (Revisão 4, parte 5c), o rateio do contrato.
  let receitaAtual = 0;
  let semAtual = 0;
  const rateio = await chaveLigada(tenantId, "dre_receita_rateio");
  for (const pid of projectIds) {
    const vid = versoesProj.find((v) => v.projectId === pid && v.kind === "atual")?.id;
    if (!vid) {
      if (projs.some((p) => p.id === pid)) semAtual++;
      continue;
    }
    const mensal = rateio ? (await getReceitaDaDrePorRateio(tenantId, vid, pid)).porMes : await getMonthlyRevenue(vid, pid);
    receitaAtual += Object.entries(mensal)
      .filter(([mm]) => !janela || naJanela(mm, janela, de, ate))
      .reduce((a, [, v]) => a + v, 0);
  }

  // Definição de negócio confirmada pelo cliente:
  // Margem de Contribuição = Receita − Custo Variável − Despesa Variável.
  const margemContribuicao = receitaAtual - custoVariavel - despesaVariavel;

  // Metragem total dos projetos selecionados (cadastro do projeto).
  const metragem = projs.reduce((a, p) => a + num(p.metragem), 0);

  return {
    receitaPrevista,
    recebido,
    pctRecebido: razao(recebido, receitaPrevista),
    despesaPrevista,
    executado,
    pctExecutado: razao(executado, despesaPrevista),
    margemContribuicao,
    // %MC = MC ÷ Receita Total do Projeto (cadastro).
    pctMargem: razao(margemContribuicao, receitaPrevista),
    receitaAtual,
    custoVariavel,
    despesaVariavel,
    metragem,
    custoPorM2: razao(executado, metragem),
    receitaPorM2: razao(receitaAtual, metragem),
    composicao: {
      orcamentos: idsBudget.length,
      caixaForaDaAtual,
      semAtual,
      orcamentosUsados: orcamentosUsados.map((v) => v.label),
      janela: janela?.origem ?? null,
      definicaoNova: nova,
    },
    erroOrcamento,
  };
}

/** Todas as versões de um projeto (para o seletor de versões das telas). */
/**
 * Versões de uma obra. Desempenho (Revisão 4): lidas uma vez por requisição
 * (o Fluxo "Empresa toda" pedia as mesmas versões seis vezes por obra); cada
 * chamador recebe cópias das linhas.
 */
export async function getVersionsDoProjeto(
  tenantId: string,
  projectId: string,
): Promise<(typeof schema.versions.$inferSelect)[]> {
  return (await versoesDoProjetoMemorizadas(tenantId, projectId)).map((v) => ({ ...v }));
}

const versoesDoProjetoMemorizadas = cache(async (tenantId: string, projectId: string): Promise<(typeof schema.versions.$inferSelect)[]> =>
  db
    .select()
    .from(schema.versions)
    .where(
      and(
        eq(schema.versions.tenantId, tenantId),
        eq(schema.versions.projectId, projectId),
      ),
    )
    .orderBy(asc(schema.versions.createdAt)),
);

/**
 * Documentos fiscais das despesas informadas, agrupados por despesa (item 1.2).
 *
 * Uma consulta só para toda a listagem — buscar por linha faria N+1 numa tela
 * que exibe centenas de lançamentos. Devolve mapa vazio para lista vazia.
 */
export async function getDocsFiscaisPorDespesa(
  tenantId: string,
  despesaIds: string[],
): Promise<Map<string, { tipo: string; numero: string | null }[]>> {
  const out = new Map<string, { tipo: string; numero: string | null }[]>();
  if (despesaIds.length === 0) return out;
  const rows = await db
    .select({
      despesaId: schema.documentosFiscais.despesaId,
      tipo: schema.documentosFiscais.tipo,
      numero: schema.documentosFiscais.numero,
    })
    .from(schema.documentosFiscais)
    .where(
      and(
        eq(schema.documentosFiscais.tenantId, tenantId),
        inArray(schema.documentosFiscais.despesaId, despesaIds),
      ),
    );
  for (const r of rows) {
    const lista = out.get(r.despesaId);
    if (lista) lista.push({ tipo: r.tipo, numero: r.numero });
    else out.set(r.despesaId, [{ tipo: r.tipo, numero: r.numero }]);
  }
  return out;
}

export interface RepositorioRow {
  id: string;
  filename: string;
  tipo: string | null;
  storageKey: string;
  size: number | null;
  uploadedBy: string | null;
  uploadedAt: string | null;
  /** Nº da nota digitado no upload OU herdado do documento fiscal da despesa. */
  numeroDocumentoFiscal: string | null;
  despesaId: string | null;
  numDoc: string | null;
  projectId: string | null;
  projectName: string | null;
  fornecedorNome: string | null;
  competencia: string | null;
  valor: number | null;
}

/**
 * Repositório de documentos com o CONTEXTO do lançamento — Módulo 3.
 *
 * A listagem antiga mostrava só "08/2026 · R$ 28" na coluna de despesa
 * vinculada, o que não permite conferir nada. Aqui cada arquivo vem com PED,
 * obra, fornecedor, nº da nota, competência e valor, numa consulta só (a tela
 * exibe centenas de linhas; buscar por linha faria N+1).
 *
 * Arquivos sem vínculo com despesa continuam aparecendo, com os campos de
 * contexto nulos — some-los esconderia documento que alguém subiu.
 */
export async function getRepositorio(tenantId: string): Promise<RepositorioRow[]> {
  const rows = await db
    .select({
      doc: schema.documents,
      numDoc: schema.despesas.numDoc,
      competencia: schema.despesas.competencia,
      valor: schema.despesas.valor,
      projectId: schema.projects.id,
      projectName: schema.projects.name,
      fornecedorNome: schema.stakeholders.nome,
      // Prompt S, 6.1 / BS-3 — o join com documento_fiscal multiplicava a linha
      // do arquivo quando a despesa tinha mais de uma nota. Uma subconsulta
      // traz só a mais recente: um arquivo, uma linha.
      numeroFiscal: sql<string | null>`(select f.numero from documento_fiscal f where f.despesa_id = ${schema.despesas.id} order by f.created_at desc limit 1)`,
    })
    .from(schema.documents)
    .leftJoin(schema.despesas, eq(schema.documents.despesaId, schema.despesas.id))
    .leftJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
    .leftJoin(schema.projects, eq(schema.versions.projectId, schema.projects.id))
    .leftJoin(schema.stakeholders, eq(schema.despesas.fornecedorId, schema.stakeholders.id))
    .where(eq(schema.documents.tenantId, tenantId))
    .orderBy(desc(schema.documents.uploadedAt));

  return rows.map((r) => ({
    id: r.doc.id,
    filename: r.doc.filename,
    tipo: r.doc.tipo,
    storageKey: r.doc.storageKey,
    size: r.doc.size,
    uploadedBy: r.doc.uploadedBy,
    uploadedAt: r.doc.uploadedAt ? r.doc.uploadedAt.toISOString() : null,
    // O número digitado no upload tem precedência; sem ele, herda o documento
    // fiscal da despesa vinculada (item 3.2).
    numeroDocumentoFiscal: r.doc.numeroDocumentoFiscal ?? r.numeroFiscal ?? null,
    despesaId: r.doc.despesaId,
    numDoc: r.numDoc,
    projectId: r.projectId,
    projectName: r.projectName,
    fornecedorNome: r.fornecedorNome,
    competencia: r.competencia,
    valor: r.valor == null ? null : Number(r.valor),
  }));
}

/**
 * Prompt AM, 5.1 e 7.3 — consumo da IA da empresa desde `desde` (só números:
 * operação, modelo, tokens) e o último teste de conexão, com quem executou.
 */
export async function getUsoDaIa(tenantId: string, desde: Date) {
  return db
    .select({
      operacao: schema.iaUso.operacao,
      modelo: schema.iaUso.modelo,
      fallback: schema.iaUso.fallback,
      entrada: schema.iaUso.entrada,
      saida: schema.iaUso.saida,
      cacheCriacao: schema.iaUso.cacheCriacao,
      cacheLida: schema.iaUso.cacheLida,
      erro: schema.iaUso.erro,
    })
    .from(schema.iaUso)
    .where(and(eq(schema.iaUso.tenantId, tenantId), gte(schema.iaUso.createdAt, desde)));
}

export async function getUltimoTesteDeIa(tenantId: string) {
  const [r] = await db
    .select({ em: schema.iaUso.createdAt, erro: schema.iaUso.erro, modelo: schema.iaUso.modelo, email: schema.users.email })
    .from(schema.iaUso)
    .leftJoin(schema.users, eq(schema.users.id, schema.iaUso.userId))
    .where(and(eq(schema.iaUso.tenantId, tenantId), eq(schema.iaUso.operacao, "teste")))
    .orderBy(desc(schema.iaUso.createdAt))
    .limit(1);
  return r ?? null;
}

/**
 * Prompt AG — notas de serviço EMITIDAS (NFS-e), da empresa, só das obras que
 * a pessoa vê. Filtro de tenant explícito em toda consulta (sem RLS).
 */
export async function getNotasServico(
  tenantId: string,
  projectIds: readonly string[],
  f: { ambiente: string; status?: string | null; projectId?: string | null; de?: string | null; ate?: string | null },
) {
  if (projectIds.length === 0) return [];
  const conds: SQL[] = [
    eq(schema.notasServico.tenantId, tenantId),
    inArray(schema.notasServico.projectId, f.projectId ? [f.projectId].filter((p) => projectIds.includes(p)) : [...projectIds]),
    eq(schema.notasServico.ambiente, f.ambiente),
  ];
  if (f.status) conds.push(eq(schema.notasServico.status, f.status));
  if (f.de) conds.push(gte(schema.notasServico.createdAt, new Date(`${f.de}T00:00:00`)));
  if (f.ate) conds.push(lte(schema.notasServico.createdAt, new Date(`${f.ate}T23:59:59`)));
  return db
    .select({
      id: schema.notasServico.id,
      status: schema.notasServico.status,
      ambiente: schema.notasServico.ambiente,
      numero: schema.notasServico.numero,
      competencia: schema.notasServico.competencia,
      tomadorNome: schema.notasServico.tomadorNome,
      valorServicos: schema.notasServico.valorServicos,
      valorLiquido: schema.notasServico.valorLiquido,
      createdAt: schema.notasServico.createdAt,
      autorizadaEm: schema.notasServico.autorizadaEm,
      projeto: schema.projects.name,
    })
    .from(schema.notasServico)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.notasServico.projectId))
    .where(and(...conds))
    .orderBy(desc(schema.notasServico.createdAt))
    .limit(500);
}

export async function getNotaServico(tenantId: string, id: string) {
  const [n] = await db
    .select()
    .from(schema.notasServico)
    .where(and(eq(schema.notasServico.tenantId, tenantId), eq(schema.notasServico.id, id)))
    .limit(1);
  return n ?? null;
}

export async function getEventosDaNota(tenantId: string, notaId: string) {
  return db
    .select({
      id: schema.notaServicoEventos.id,
      tipo: schema.notaServicoEventos.tipo,
      ref: schema.notaServicoEventos.ref,
      status: schema.notaServicoEventos.status,
      mensagem: schema.notaServicoEventos.mensagem,
      createdAt: schema.notaServicoEventos.createdAt,
      email: schema.users.email,
    })
    .from(schema.notaServicoEventos)
    .leftJoin(schema.users, eq(schema.users.id, schema.notaServicoEventos.createdBy))
    .where(and(eq(schema.notaServicoEventos.tenantId, tenantId), eq(schema.notaServicoEventos.notaId, notaId)))
    .orderBy(asc(schema.notaServicoEventos.createdAt));
}

/** Prompt AG, seção 6 — as notas que o assistente olha: em aberto, num ambiente. */
export async function getNotasParaAnalise(tenantId: string, projectIds: readonly string[], ambiente: string) {
  if (projectIds.length === 0) return [];
  const rows = await db
    .select({ n: schema.notasServico, projeto: schema.projects.name })
    .from(schema.notasServico)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.notasServico.projectId))
    .where(
      and(
        eq(schema.notasServico.tenantId, tenantId),
        inArray(schema.notasServico.projectId, [...projectIds]),
        eq(schema.notasServico.ambiente, ambiente),
        inArray(schema.notasServico.status, ["rascunho", "rejeitada", "processando"]),
      ),
    )
    .orderBy(desc(schema.notasServico.createdAt))
    .limit(500);
  return rows.map((r) => ({ ...r.n, projeto: r.projeto }));
}
