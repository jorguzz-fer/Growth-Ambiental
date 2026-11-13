/**
 * Utilidades do módulo de planejamento (Budget/Forecast) — modelo total + %.
 *
 * O período (colunas mensais) vem SEMPRE do cadastro do projeto (mês inicial /
 * mês final). O valor mensal de cada conta é derivado do total pela distribuição
 * percentual: valor = total × pct / 100.
 */

/** "MM/YYYY" → índice absoluto de mês (ou null se inválido). */
export function monthKeyIndex(mk: string): number | null {
  const p = (mk || "").split("/");
  if (p.length !== 2) return null;
  const m = Number(p[0]);
  const y = Number(p[1]);
  if (!m || !y || m < 1 || m > 12) return null;
  return y * 12 + (m - 1);
}

function idxToKey(idx: number): string {
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return `${String(m).padStart(2, "0")}/${y}`;
}

/**
 * Competências "MM/YYYY" do período do projeto (inclusive). Vazio se o período
 * não estiver definido ou for inválido (fim antes do início).
 */
export function projectPeriodMonths(
  mesInicial: string | null | undefined,
  mesFinal: string | null | undefined,
): string[] {
  const a = monthKeyIndex((mesInicial || "").trim());
  const b = monthKeyIndex((mesFinal || "").trim());
  if (a == null || b == null || b < a) return [];
  const out: string[] = [];
  for (let i = a; i <= b; i++) out.push(idxToKey(i));
  return out;
}

/** Data interna "MM/DD/YYYY" → competência "MM/YYYY" (ou null). */
export function monthKeyOfInternalDate(d: string | null | undefined): string | null {
  const p = (d || "").trim().split("/");
  if (p.length !== 3) return null;
  const m = Number(p[0]);
  const y = Number(p[2]);
  if (!m || !y || m < 1 || m > 12) return null;
  return `${String(m).padStart(2, "0")}/${y}`;
}

/**
 * Meses do período a partir das DATAS de início e fim do projeto (fonte oficial
 * das colunas do Budget/Forecast). "MM/DD/YYYY" → competências "MM/YYYY".
 */
export function projectPeriodMonthsFromDates(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string[] {
  return projectPeriodMonths(
    monthKeyOfInternalDate(startDate),
    monthKeyOfInternalDate(endDate),
  );
}

/**
 * Recortes por ANO-CALENDÁRIO para os seletores de período dos relatórios:
 * 2025, 2026, 2027… do ano mais antigo com dados (ou o ano atual) até o ano
 * atual + `fwd` (padrão 5). Cada opção traz os 12 meses "MM/YYYY" do ano.
 */
export function calendarYearWindows(
  months: string[],
  currentYear: number,
  fwd: number = 5,
): { value: string; label: string; months: string[] }[] {
  const dataYears = months
    .map((m) => Number(m.split("/")[1]))
    .filter((y) => Number.isFinite(y) && y > 0);
  const start = Math.min(currentYear, ...(dataYears.length ? dataYears : [currentYear]));
  const end = Math.max(currentYear + fwd, ...(dataYears.length ? dataYears : [currentYear]));
  const out: { value: string; label: string; months: string[] }[] = [];
  for (let y = start; y <= end; y++) {
    out.push({
      value: String(y),
      label: String(y),
      months: Array.from({ length: 12 }, (_, i) => `${String(i + 1).padStart(2, "0")}/${y}`),
    });
  }
  return out;
}

/** Uma conta (linha) do Budget/Forecast: total + percentual/valor por mês. */
export interface PlanningAccountRow {
  /** identidade da linha = código do grupo do Plano de Contas (ou chave legada). */
  rowKey: string;
  label: string;
  dreCategory: string | null;
  /** total planejado da conta no projeto. */
  total: number;
  /** percentual por mês ("MM/YYYY" → %). */
  pct: Record<string, number>;
  /** conta ativa no Plano de Contas (legadas = true). */
  ativo: boolean;
  /** existe como grupo no Plano de Contas atual (false = linha legada). */
  fromChart: boolean;
  /** linha fixa "Receitas do Projeto" (Prompt D, 3): total do cadastro, não removível. */
  fixa?: boolean;
  /** só na fixa: o cadastro do projeto não tem valor de receita (3.5). */
  semTotalNoCadastro?: boolean;
}

export interface PlanningVersion {
  id: string;
  label: string;
  kind: string;
  status: string;
  isDefault: boolean;
  locked: boolean;
  sourceVersionId: string | null;
  /** Prompt F, 2.2: rótulo e tipo da versão de origem (null sem origem). */
  sourceLabel: string | null;
  sourceKind: string | null;
  /** ISO. */
  createdAt: string;
}

export interface BudgetPlanningData {
  project: {
    id: string;
    name: string;
    mesInicial: string | null;
    mesFinal: string | null;
    /** indicador "Recursos próprios" (valor do cadastro; 0 se não informado). */
    recursosProprios: number;
    /** BD-1: entrada financeira da empresa (total de "Receitas do Projeto"); null = falta preencher. */
    receitaDoCadastro: number | null;
  };
  /** BD-6: há seleção de linhas gravada para cada bloco? (false = padrão) */
  selecao: { receita: boolean; despesa: boolean };
  /** 4-A.2: grupos do Plano de Contas que a ação "Incluir linha" pode oferecer (ativos, da natureza, ausentes). */
  disponiveis: { receita: { code: string; name: string }[]; despesa: { code: string; name: string }[] };
  /** 2.6: quando a replicação do Atual rodou pela última vez nesta versão (ISO), ou null. */
  ultimaReplicacao: string | null;
  /**
   * Prompt F, 6.2 (só Previsão com origem): totais atuais do Orçamento de
   * origem por bloco e chave, para apontar divergência sem bloquear. null
   * em Orçamentos ou Previsão sem origem.
   */
  totaisDaOrigem: { receita: Record<string, number>; despesa: Record<string, number> } | null;
  /** true quando o período está definido no cadastro do projeto. */
  hasPeriod: boolean;
  months: string[];
  versions: PlanningVersion[];
  versionId: string | null;
  receitas: PlanningAccountRow[];
  despesas: PlanningAccountRow[];
}

/** Valor mensal a partir do total e do percentual (arredondado a centavos). */
export function monthValue(total: number, pct: number): number {
  return Math.round(total * pct) / 100;
}

/** Soma dos percentuais de uma conta no período. */
export function sumPct(pct: Record<string, number>, months: string[]): number {
  return months.reduce((a, m) => a + (Number(pct[m]) || 0), 0);
}
