"use server";

import { capturar } from "@/lib/resultado";

import * as XLSX from "xlsx";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { grupoDaConta } from "@/lib/planocontas-regras";
import {
  getUnits,
  getReembolsos,
  getInccRows,
  getDespesas,
  toCalcUnit,
  reembToCalc,
} from "@/lib/queries";
import {
  calcProjectionBySource,
  reembursementsByMonth,
  PROJECTION_SOURCES,
} from "@/lib/calc";
import {
  isBudgetVersion,
  RECEITA_ROW_KEY,
  OUTRAS_RECEITAS_KEY,
  OUTRAS_RECEITAS_PID,
} from "@/lib/budget/config";

export interface BudgetCell {
  rowKey: string;
  dreCategory: string | null;
  mes: string;
  valor: number;
}

type Ctx = NonNullable<Awaited<ReturnType<typeof getTenantContext>>>;

/**
 * Carrega a versão-alvo do lançamento simplificado direto do banco (por id,
 * no escopo do tenant) — as telas de Budget/Forecast são por projeto e não
 * dependem mais de um "projeto ativo". Valida tipo, permissão e trava.
 */
async function loadBudgetTarget(ctx: Ctx, versionId: string) {
  const [v] = await db
    .select()
    .from(schema.versions)
    .where(
      and(
        eq(schema.versions.id, versionId),
        eq(schema.versions.tenantId, ctx.tenant.id),
      ),
    )
    .limit(1);
  if (!v) throw new Error("Versão inválida.");
  if (!isBudgetVersion(v.kind)) {
    throw new Error("Lançamento simplificado é só para Orçamento e Previsão Atualizada.");
  }
  // Permissão pela tela correspondente ao tipo da versão (budget/forecast).
  if (!can(ctx.perms, v.kind, "editar")) throw new Error("Sem permissão.");
  if (v.locked) throw new Error("Versão congelada.");
  return v;
}

/** Versão de um dado tipo no mesmo projeto da versão-alvo. */
async function siblingVersion(projectId: string, kind: string) {
  const [v] = await db
    .select()
    .from(schema.versions)
    .where(
      and(
        eq(schema.versions.projectId, projectId),
        eq(schema.versions.kind, kind as typeof schema.versions.$inferSelect.kind),
      ),
    )
    .limit(1);
  return v ?? null;
}

/** Revalida as duas telas de lançamento simplificado e os reports afetados. */
function revalidateLancamento() {
  revalidatePath("/budget");
  revalidatePath("/forecast");
  revalidatePath("/dre");
  revalidatePath("/fluxocaixa");
}

/** Substitui todas as linhas de um tipo (receita/despesa) da versão. */
async function replaceLines(
  tenantId: string,
  versionId: string,
  kind: "receita" | "despesa",
  cells: BudgetCell[],
) {
  await db.transaction(async (tx) => {
    await tx
      .delete(schema.budgetLines)
      .where(
        and(
          eq(schema.budgetLines.versionId, versionId),
          eq(schema.budgetLines.kind, kind),
        ),
      );
    const rows = cells
      .filter((c) => c.rowKey && c.mes && Number(c.valor) !== 0)
      .map((c) => ({
        tenantId,
        versionId,
        kind,
        rowKey: c.rowKey,
        dreCategory: c.dreCategory ?? (kind === "receita" ? "Receita" : null),
        mes: c.mes,
        valor: String(Number(c.valor)),
      }));
    if (rows.length) await tx.insert(schema.budgetLines).values(rows);
  });
}

/** Salva o lançamento simplificado (uma aba: receita ou despesa) de uma versão. */
async function _saveBudgetLines(
  versionId: string,
  kind: "receita" | "despesa",
  cells: BudgetCell[],
) {
  const ctx = await getTenantContext();
  if (!ctx) throw new Error("Sem permissão.");
  await loadBudgetTarget(ctx, versionId);
  await replaceLines(ctx.tenant.id, versionId, kind, cells);
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "budget.save",
    entity: "budget_line",
    entityId: versionId,
    meta: { kind, count: cells.length },
  });
  revalidateLancamento();
}

export interface ReceitaProjetoCell {
  projectId: string;
  mes: string;
  valor: number;
}

/**
 * Substitui a receita de um projeto na versão. Para a linha do projeto
 * (RECEITA_ROW_KEY) remove TODAS as linhas de receita que NÃO sejam "Outras
 * Receitas" — inclusive rowKeys legados/importados — e regrava consolidado sob
 * "Receita". Isso evita que valores "fantasma" sob outro rowKey reapareçam ao
 * recarregar (causa do valor manual que "voltava" ao anterior). Para a própria
 * linha "Outras Receitas", remove apenas ela.
 */
async function replaceReceitaRowKey(
  tenantId: string,
  versionId: string,
  rowKey: string,
  monthValues: { mes: string; valor: number }[],
) {
  const isOutras = rowKey === OUTRAS_RECEITAS_KEY;
  await db.transaction(async (tx) => {
    await tx
      .delete(schema.budgetLines)
      .where(
        and(
          eq(schema.budgetLines.versionId, versionId),
          eq(schema.budgetLines.kind, "receita"),
          isOutras
            ? eq(schema.budgetLines.rowKey, OUTRAS_RECEITAS_KEY)
            : ne(schema.budgetLines.rowKey, OUTRAS_RECEITAS_KEY),
        ),
      );
    const rows = monthValues
      .filter((c) => c.mes && Number(c.valor) !== 0)
      .map((c) => ({
        tenantId,
        versionId,
        kind: "receita",
        rowKey,
        dreCategory: "Receita",
        mes: c.mes,
        valor: String(Number(c.valor)),
      }));
    if (rows.length) await tx.insert(schema.budgetLines).values(rows);
  });
}

/** Versão do tipo pedido do projeto mais antigo (âncora para "Outras Receitas"). */
async function anchorVersion(tenantId: string, kind: string) {
  const [p] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(and(eq(schema.projects.tenantId, tenantId), eq(schema.projects.kind, "proj")))
    .orderBy(asc(schema.projects.createdAt))
    .limit(1);
  return p ? siblingVersion(p.id, kind) : null;
}

/**
 * Salva a receita do Budget/Forecast consolidada por projeto (matriz projetos
 * × meses). Cada célula grava na versão do respectivo projeto, na linha única
 * "Receita". A linha "Outras Receitas" (projectId sentinela) grava na versão
 * âncora sob a rowKey "Outras Receitas".
 */
/** Soma a receita atual de uma versão (linha do projeto ou "Outras Receitas"). */
async function receitaTotal(versionId: string, isOutras: boolean): Promise<number> {
  const rows = await db
    .select({ rowKey: schema.budgetLines.rowKey, valor: schema.budgetLines.valor })
    .from(schema.budgetLines)
    .where(
      and(
        eq(schema.budgetLines.versionId, versionId),
        eq(schema.budgetLines.kind, "receita"),
      ),
    );
  return rows
    .filter((r) => (r.rowKey === OUTRAS_RECEITAS_KEY) === isOutras)
    .reduce((a, r) => a + Number(r.valor), 0);
}

async function _saveBudgetReceita(
  kind: "budget" | "forecast",
  cells: ReceitaProjetoCell[],
): Promise< { skipped: string[] }> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, kind, "editar")) throw new Error("Sem permissão.");

  const byProject = new Map<string, ReceitaProjetoCell[]>();
  for (const c of cells) {
    if (!c.projectId || !c.mes) continue;
    const arr = byProject.get(c.projectId) ?? [];
    arr.push(c);
    byProject.set(c.projectId, arr);
  }
  // Garante que a linha "Outras Receitas" seja processada mesmo se ficou vazia
  // (para permitir zerar), desde que exista âncora.
  if (!byProject.has(OUTRAS_RECEITAS_PID)) byProject.set(OUTRAS_RECEITAS_PID, []);

  // Nomes dos projetos para mensagens claras de "não foi possível salvar".
  const projs = await db
    .select({ id: schema.projects.id, name: schema.projects.name })
    .from(schema.projects)
    .where(eq(schema.projects.tenantId, ctx.tenant.id));
  const nameOf = new Map(projs.map((p) => [p.id, p.name]));

  const skipped: string[] = [];
  const changes: { projeto: string; de: number; para: number }[] = [];
  let saved = 0;
  for (const [projectId, pcells] of byProject) {
    const isOutras = projectId === OUTRAS_RECEITAS_PID;
    const temValor = pcells.some((c) => Number(c.valor) !== 0);
    const v = isOutras
      ? await anchorVersion(ctx.tenant.id, kind)
      : await siblingVersion(projectId, kind);
    if (!v || v.tenantId !== ctx.tenant.id) {
      if (!isOutras && temValor) skipped.push(nameOf.get(projectId) ?? "Projeto");
      continue;
    }
    if (v.locked) {
      // Versão congelada: não sobrescreve. Só sinaliza se o usuário tentou lançar.
      if (!isOutras && temValor) skipped.push(`${nameOf.get(projectId) ?? "Projeto"} (congelada)`);
      continue;
    }
    const de = await receitaTotal(v.id, isOutras);
    await replaceReceitaRowKey(
      ctx.tenant.id,
      v.id,
      isOutras ? OUTRAS_RECEITAS_KEY : RECEITA_ROW_KEY,
      pcells.map((c) => ({ mes: c.mes, valor: Number(c.valor) })),
    );
    const para = pcells.reduce((a, c) => a + Number(c.valor || 0), 0);
    if (de !== para)
      changes.push({
        projeto: isOutras ? OUTRAS_RECEITAS_KEY : nameOf.get(projectId) ?? "Projeto",
        de,
        para,
      });
    saved++;
  }

  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "budget.saveReceita",
    entity: "budget_line",
    entityId: kind,
    meta: { kind, grupos: saved, changes, skipped },
  });
  revalidateLancamento();
  return { skipped };
}

/** Copia os lançamentos do Budget do projeto para a versão Forecast. */
async function _importFromBudget(forecastVersionId: string) {
  const ctx = await getTenantContext();
  if (!ctx) throw new Error("Sem permissão.");
  const target = await loadBudgetTarget(ctx, forecastVersionId);
  const budget = await siblingVersion(target.projectId, "budget");
  if (!budget) throw new Error("Este projeto não tem versão de Orçamento.");

  const lines = await db
    .select()
    .from(schema.budgetLines)
    .where(eq(schema.budgetLines.versionId, budget.id));
  await db.transaction(async (tx) => {
    await tx.delete(schema.budgetLines).where(eq(schema.budgetLines.versionId, forecastVersionId));
    if (lines.length)
      await tx.insert(schema.budgetLines).values(
        lines.map((l) => ({
          tenantId: ctx.tenant.id,
          versionId: forecastVersionId,
          kind: l.kind,
          rowKey: l.rowKey,
          dreCategory: l.dreCategory,
          mes: l.mes,
          valor: l.valor,
        })),
      );
  });
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "budget.importFromBudget",
    entity: "budget_line",
    entityId: forecastVersionId,
    meta: { from: budget.id, count: lines.length },
  });
  revalidateLancamento();
}

const numCell = (v: unknown): number => {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let raw = String(v).trim().replace(/[R$\s]/g, "");
  if (!raw) return 0;
  if (/,\d{1,2}$/.test(raw)) {
    // Decimal brasileiro: "1.500.000,50" → "1500000.50".
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else {
    // Remove separadores de milhar (vírgula) e, se sobrarem múltiplos pontos
    // (milhar em pt-BR "1.500.000"), remove-os também.
    raw = raw.replace(/,/g, "");
    if ((raw.match(/\./g) || []).length > 1) raw = raw.replace(/\./g, "");
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Normaliza um cabeçalho de mês para "MM/YYYY". Editores de planilha
 * (Excel/LibreOffice/Sheets) costumam converter "05/2025" em data — então o
 * cabeçalho pode voltar como Date, número de série ou string em vários
 * formatos. Sem isso, a chave do mês não bate e os valores "somem".
 */
const monthKey = (cell: unknown): string => {
  if (cell == null || cell === "") return "";
  if (cell instanceof Date) {
    return `${String(cell.getMonth() + 1).padStart(2, "0")}/${cell.getFullYear()}`;
  }
  if (typeof cell === "number") {
    const d = XLSX.SSF?.parse_date_code?.(cell);
    if (d && d.y) return `${String(d.m).padStart(2, "0")}/${d.y}`;
    return String(cell);
  }
  const s = String(cell).trim();
  let m = s.match(/^(\d{1,2})\/(\d{4})$/); // MM/YYYY
  if (m) return `${m[1].padStart(2, "0")}/${m[2]}`;
  m = s.match(/^(\d{4})-(\d{1,2})/); // YYYY-MM(-DD)
  if (m) return `${m[2].padStart(2, "0")}/${m[1]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // MM/DD/YYYY (data) → mês/ano
  if (m) return `${m[1].padStart(2, "0")}/${m[3]}`;
  return s;
};

/** Código do grupo a partir do rótulo "1 · Serviços…" (ou "1 Serviços…"). */
const groupCode = (label: string): string => {
  const before = label.split(/\s*·\s*/)[0].trim();
  return before.split(/\s+/)[0].trim();
};

/**
 * Importa uma planilha (mesmo formato do export: abas Receitas e Despesas,
 * linhas × meses) para o lançamento simplificado da versão.
 */
async function _importBudgetXlsx(formData: FormData) {
  const ctx = await getTenantContext();
  if (!ctx) throw new Error("Sem permissão.");
  const versionId = (formData.get("versionId") as string) || "";
  await loadBudgetTarget(ctx, versionId);
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Selecione uma planilha.");

  // cellDates: converte células de data para Date (cabeçalhos de mês que o
  // editor transformou em data voltam como Date e são normalizados abaixo).
  const wb = XLSX.read(await file.arrayBuffer(), { type: "buffer", cellDates: true });
  const readSheet = (name: string) => {
    const ws = wb.Sheets[name];
    if (!ws) return [] as unknown[][];
    return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true }).filter((r) => r.length);
  };

  const recCells: BudgetCell[] = [];
  const recRows = readSheet("Receitas");
  if (recRows.length) {
    const months = (recRows[0] as unknown[]).slice(1).map(monthKey);
    for (const row of recRows.slice(1)) {
      const rowKey = String((row as unknown[])[0] ?? "").trim();
      if (!rowKey) continue;
      months.forEach((mes, i) => {
        if (!mes) return;
        const valor = numCell((row as unknown[])[i + 1]);
        if (valor !== 0) recCells.push({ rowKey, dreCategory: "Receita", mes, valor });
      });
    }
  }

  const despCells: BudgetCell[] = [];
  const despRows = readSheet("Despesas");
  if (despRows.length) {
    const months = (despRows[0] as unknown[]).slice(2).map(monthKey);
    for (const row of despRows.slice(1)) {
      const label = String((row as unknown[])[0] ?? "").trim();
      const code = groupCode(label);
      const dre = String((row as unknown[])[1] ?? "").trim() || "Despesa Fixa";
      if (!code) continue;
      months.forEach((mes, i) => {
        if (!mes) return;
        const valor = numCell((row as unknown[])[i + 2]);
        if (valor !== 0) despCells.push({ rowKey: code, dreCategory: dre, mes, valor });
      });
    }
  }

  // Só substitui um tipo se a aba correspondente existir na planilha — evita
  // apagar a receita (agora consolidada por projeto) ao importar só despesas.
  if (recRows.length) await replaceLines(ctx.tenant.id, versionId, "receita", recCells);
  if (despRows.length) await replaceLines(ctx.tenant.id, versionId, "despesa", despCells);
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "budget.import",
    entity: "budget_line",
    entityId: versionId,
    meta: { receita: recCells.length, despesa: despCells.length },
  });
  revalidateLancamento();
}

export interface DespesaLinhaInput {
  projectId: string;
  grupoCode: string;
  dreCategory: string;
  /** true se o grupo é custo direto de obra (CEF) — não pode ser filial/matriz. */
  cef: boolean;
  values: { mes: string; valor: number }[];
}

/**
 * Salva as despesas do Budget/Forecast como linhas (grupo do plano de contas ×
 * projeto/filial). Substitui todas as despesas das versões editáveis do tenant
 * pelas linhas enviadas (trata inclusões, edições e remoções). Grupos CEF
 * (custo direto de obra) só podem ser vinculados a projetos (obras).
 */
async function _saveBudgetDespesaLinhas(
  kind: "budget" | "forecast",
  lines: DespesaLinhaInput[],
) {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, kind, "editar")) throw new Error("Sem permissão.");

  const [vers, projs] = await Promise.all([
    db
      .select()
      .from(schema.versions)
      .where(and(eq(schema.versions.tenantId, ctx.tenant.id), eq(schema.versions.kind, kind))),
    db
      .select({ id: schema.projects.id, kind: schema.projects.kind })
      .from(schema.projects)
      .where(eq(schema.projects.tenantId, ctx.tenant.id)),
  ]);
  const officeIds = new Set(projs.filter((p) => p.kind === "office").map((p) => p.id));
  const verByProj = new Map(vers.filter((v) => !v.locked).map((v) => [v.projectId, v.id]));
  const editableVerIds = [...verByProj.values()];

  // Dedup por (versão, grupo, mês) somando — respeita a unique do budget_line.
  const agg = new Map<string, { versionId: string; rowKey: string; dreCategory: string | null; mes: string; valor: number }>();
  for (const line of lines) {
    if (!line.projectId || !line.grupoCode) continue;
    // CEF (custo direto de obra) não pode ser lançado em filial/matriz.
    if (line.cef && officeIds.has(line.projectId)) continue;
    const versionId = verByProj.get(line.projectId);
    if (!versionId) continue;
    for (const c of line.values) {
      if (!c.mes || Number(c.valor) === 0) continue;
      const key = `${versionId}|${line.grupoCode}|${c.mes}`;
      const cur = agg.get(key);
      if (cur) cur.valor += Number(c.valor);
      else
        agg.set(key, {
          versionId,
          rowKey: line.grupoCode,
          dreCategory: line.dreCategory || null,
          mes: c.mes,
          valor: Number(c.valor),
        });
    }
  }

  await db.transaction(async (tx) => {
    if (editableVerIds.length)
      await tx
        .delete(schema.budgetLines)
        .where(
          and(
            inArray(schema.budgetLines.versionId, editableVerIds),
            eq(schema.budgetLines.kind, "despesa"),
          ),
        );
    const rows = [...agg.values()].map((r) => ({
      tenantId: ctx.tenant.id,
      versionId: r.versionId,
      kind: "despesa",
      rowKey: r.rowKey,
      dreCategory: r.dreCategory,
      mes: r.mes,
      valor: String(r.valor),
    }));
    if (rows.length) await tx.insert(schema.budgetLines).values(rows);
  });

  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "budget.saveDespesaLinhas",
    entity: "budget_line",
    entityId: kind,
    meta: { linhas: agg.size },
  });
  revalidateLancamento();
}

/** Deriva os lançamentos simplificados a partir da versão "atual" (detalhada). */
async function _replicateFromAtual(targetVersionId: string) {
  const ctx = await getTenantContext();
  if (!ctx) throw new Error("Sem permissão.");
  const target = await loadBudgetTarget(ctx, targetVersionId);
  const atual = await siblingVersion(target.projectId, "atual");
  if (!atual) throw new Error("Não encontrei a versão Atual.");

  const [units, reembRows, incc, despesas] = await Promise.all([
    getUnits(ctx.tenant.id, atual.id),
    getReembolsos(ctx.tenant.id, atual.id),
    getInccRows(ctx.tenant.id, target.projectId),
    getDespesas(atual.id),
  ]);

  // Receita consolidada por projeto (linha única "Receita") × mês: soma todas
  // as fontes projetadas das unidades + reembolsos.
  const receitaByMonth: Record<string, number> = {};
  for (const u of units) {
    const bs = calcProjectionBySource(toCalcUnit(u), incc);
    for (const s of PROJECTION_SOURCES)
      for (const [mm, v] of Object.entries(bs[s]))
        receitaByMonth[mm] = (receitaByMonth[mm] || 0) + v;
  }
  const reemb = reembursementsByMonth(reembToCalc(reembRows));
  for (const [mm, v] of Object.entries(reemb))
    receitaByMonth[mm] = (receitaByMonth[mm] || 0) + v;
  const receitaCells: BudgetCell[] = Object.entries(receitaByMonth).map(
    ([mes, valor]) => ({ rowKey: RECEITA_ROW_KEY, dreCategory: "Receita", mes, valor }),
  );

  // Despesa por grupo CEF × mês (com a categoria DRE já lançada).
  const despMap = new Map<string, BudgetCell>();
  // 0079 — o grupo da conta vem do cadastro (código "2.3.01" é do grupo "2.3"), não do prefixo.
  const contaParaGrupo = new Map(
    (await db.select({ code: schema.chartAccounts.code, groupCode: schema.chartAccounts.groupCode }).from(schema.chartAccounts).where(eq(schema.chartAccounts.tenantId, ctx.tenant.id))).map((c) => [c.code, c.groupCode]),
  );
  for (const d of despesas) {
    if (!d.contaCef || !d.competencia) continue;
    const grp = grupoDaConta(contaParaGrupo, d.contaCef);
    const key = `${grp}|${d.competencia}`;
    const cur = despMap.get(key);
    const val = Number(d.valor);
    if (cur) cur.valor += val;
    else despMap.set(key, { rowKey: grp, dreCategory: d.categoriaDre ?? "Custo Variável", mes: d.competencia, valor: val });
  }

  await replaceLines(ctx.tenant.id, targetVersionId, "receita", receitaCells);
  await replaceLines(ctx.tenant.id, targetVersionId, "despesa", [...despMap.values()]);

  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "budget.replicateFromAtual",
    entity: "budget_line",
    entityId: targetVersionId,
    meta: { receita: receitaCells.length, despesa: despMap.size },
  });
  revalidateLancamento();
}

// Prompt D2 — as ações da tela devolvem { ok, error } (ver lib/resultado.ts).
export async function saveBudgetLines(
  versionId: string,
  kind: "receita" | "despesa",
  cells: BudgetCell[],
) {
  return capturar(() => _saveBudgetLines(versionId, kind, cells), "saveBudgetLines");
}
export async function saveBudgetReceita(
  kind: "budget" | "forecast",
  cells: ReceitaProjetoCell[],
) {
  return capturar(() => _saveBudgetReceita(kind, cells), "saveBudgetReceita");
}
export async function importFromBudget(forecastVersionId: string) {
  return capturar(() => _importFromBudget(forecastVersionId), "importFromBudget");
}
export async function importBudgetXlsx(formData: FormData) {
  return capturar(() => _importBudgetXlsx(formData), "importBudgetXlsx");
}
export async function saveBudgetDespesaLinhas(
  kind: "budget" | "forecast",
  lines: DespesaLinhaInput[],
) {
  return capturar(() => _saveBudgetDespesaLinhas(kind, lines), "saveBudgetDespesaLinhas");
}
export async function replicateFromAtual(targetVersionId: string) {
  return capturar(() => _replicateFromAtual(targetVersionId), "replicateFromAtual");
}
