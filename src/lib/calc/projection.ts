import { getIncc } from "./incc";
import { lerPlano, type OrigemDaParcela } from "./plano";
import type {
  CalcPermuta,
  CalcReembolso,
  CalcUnit,
  InccRow,
  MonthlyProjection,
  VersionTotals,
} from "./types";

// ─────────────────────────── helpers de data ────────────────────────────

interface ParsedDate {
  mo: number;
  d: number;
  yr: number;
}

/** Parse de "MM/DD/YYYY" → {mo,d,yr} (null se vazio/ inválido). */
export function parseDate(s: string | null | undefined): ParsedDate | null {
  if (!s || !s.trim()) return null;
  const p = s.split("/");
  if (p.length < 3) return null;
  return { mo: parseInt(p[0], 10), d: parseInt(p[1], 10), yr: parseInt(p[2], 10) };
}

/** Chave de mês "MM/YYYY". */
export function monthKey(mo: number, yr: number): string {
  return String(mo).padStart(2, "0") + "/" + yr;
}

/** Avança `n` meses a partir de (mo, yr), normalizando o ano. */
export function addMonths(mo: number, yr: number, n: number): ParsedDate {
  let m = mo + n;
  let y = yr;
  while (m > 12) {
    m -= 12;
    y++;
  }
  return { mo: m, d: 1, yr: y };
}

const INCC_FROM_INSTALLMENT = 4; // correção a partir da 5ª parcela (i >= 4)

// ───────────────────────────── projeção ─────────────────────────────────

/**
 * Projeta os recebíveis de uma unidade vendida mês a mês (matriz "MM/YYYY" →
 * valor). Espelha `calcProj()` do protótipo: soma as fontes de
 * `calcProjectionBySource`. Retorna {} se a unidade não estiver vendida.
 */
export function calcProjection(
  u: CalcUnit,
  incc: readonly InccRow[] = [],
): MonthlyProjection {
  const proj: MonthlyProjection = {};
  for (const fonte of Object.values(calcProjectionBySource(u, incc)))
    for (const [mm, v] of Object.entries(fonte)) proj[mm] = (proj[mm] || 0) + v;
  return proj;
}

/** Fontes de receita usadas no consolidado (quebra da projeção por tipo). */
export const PROJECTION_SOURCES = [
  "AS/Sinais",
  "Mensais",
  "Semestrais",
  "Anuais",
  "FGTS",
  "Subsídio",
  "Permuta",
] as const;
export type ProjectionSource = (typeof PROJECTION_SOURCES)[number];

/**
 * Igual a `calcProjection`, mas separando a receita projetada por tipo de fonte
 * (AS/Sinais, Mensais, …). Usado no Consolidado. Retorna um mapa vazio por
 * fonte se a unidade não estiver vendida.
 */
export function calcProjectionBySource(
  u: CalcUnit,
  incc: readonly InccRow[] = [],
): Record<ProjectionSource, MonthlyProjection> {
  const out = {
    "AS/Sinais": {},
    Mensais: {},
    Semestrais: {},
    Anuais: {},
    FGTS: {},
    Subsídio: {},
    Permuta: {},
  } as Record<ProjectionSource, MonthlyProjection>;
  const add = (key: ProjectionSource, mm: string, v: number) => {
    if (v > 0) out[key][mm] = (out[key][mm] || 0) + v;
  };
  // Prompt AR, Fase 2: lê o plano por `lerPlano`. Regras de sempre da
  // projeção: só seção com a caixinha "Usar" marcada; subsídio só quando
  // "Recebido"; o financiamento não entra; INCC nas periódicas a partir da
  // 5ª parcela.
  for (const p of lerPlano(u, u.status)) {
    if (!p.ligada || !(p.valorBase > 0) || !p.mes) continue;
    if (p.origem === "Banco") continue;
    if (p.origem === "Subsidio" && p.situacao !== "Recebido") continue;
    const fonte = FONTE_DA_ORIGEM[p.origem];
    const v = p.periodica
      ? Math.round(p.valorBase * (1 + (p.numero >= INCC_FROM_INSTALLMENT ? getIncc(incc, p.mes) : 0) / 100) * 100) / 100
      : p.valorBase;
    add(fonte, p.mes, v);
  }
  return out;
}

const FONTE_DA_ORIGEM: Record<Exclude<OrigemDaParcela, "Banco">, ProjectionSource> = {
  AS: "AS/Sinais",
  S1: "AS/Sinais",
  S2: "AS/Sinais",
  S3: "AS/Sinais",
  Mensais: "Mensais",
  Semestrais: "Semestrais",
  Anuais: "Anuais",
  FGTS: "FGTS",
  Subsidio: "Subsídio",
  Permuta: "Permuta",
};

/**
 * Total contratado da unidade (soma de todas as fontes). Comparado ao VGV
 * gera o saldo. Espelha `calcUnitTotal()`. Retorna 0 se não vendida.
 */
export function calcUnitTotal(u: CalcUnit): number {
  // Todas as fontes, com ou sem caixinha e com ou sem data (Prompt AR: leitura única).
  return lerPlano(u, u.status).reduce((t, p) => t + p.valorBase, 0);
}

/** Revenda de um bem recebido em permuta (item 10). */
export interface CalcPermutaResale {
  valorVenda: number;
  dataVenda: string; // "MM/DD/YYYY"
  formaVenda: string; // "avista" | "parcelada" | "escambo"
  parcelas: number;
  periodicidade: string; // "mensal" | "semestral" | "anual"
  dataPrimParcela: string; // "MM/DD/YYYY"
}

const STEP: Record<string, number> = { mensal: 1, semestral: 6, anual: 12 };

/**
 * Recebimentos FINANCEIROS da revenda de bens recebidos em permuta, por mês.
 * À vista: 1 recebimento na data da venda. Parcelada: N parcelas iguais a
 * partir da 1ª, na periodicidade informada. Escambo NÃO gera caixa (sem
 * entrada financeira). Alimenta Fluxo de Caixa e Caixa (previstas).
 */
export function permutaCashByMonth(
  rows: readonly CalcPermutaResale[],
): MonthlyProjection {
  const out: MonthlyProjection = {};
  const add = (mm: string, v: number) => {
    if (v > 0) out[mm] = (out[mm] || 0) + v;
  };
  for (const r of rows) {
    const forma = (r.formaVenda || "").toLowerCase();
    if (!r.valorVenda || r.valorVenda <= 0) continue;
    if (forma === "escambo") continue; // sem entrada financeira
    if (forma === "parcelada" && r.parcelas > 0) {
      const d = parseDate(r.dataPrimParcela) ?? parseDate(r.dataVenda);
      if (!d) continue;
      const step = STEP[(r.periodicidade || "mensal").toLowerCase()] ?? 1;
      const parc = Math.round((r.valorVenda / r.parcelas) * 100) / 100;
      for (let i = 0; i < r.parcelas; i++) {
        const dt = addMonths(d.mo, d.yr, i * step);
        add(monthKey(dt.mo, dt.yr), parc);
      }
    } else {
      // à vista (ou forma não informada): recebimento único na data da venda.
      const d = parseDate(r.dataVenda) ?? parseDate(r.dataPrimParcela);
      if (d) add(monthKey(d.mo, d.yr), r.valorVenda);
    }
  }
  return out;
}

/**
 * Escambo da revenda, por mês: a troca do bem por outro, na data do escambo.
 * Não gera caixa — por isso fica FORA de `permutaCashByMonth` e entra só na
 * receita contábil. Separado de propósito (Prompt P, 4.3): antes a receita
 * copiava o caixa e somava o escambo por cima, e qualquer mudança no filtro
 * do caixa reintroduziria a soma dupla sem erro visível.
 */
export function permutaEscamboByMonth(
  rows: readonly CalcPermutaResale[],
): MonthlyProjection {
  const out: MonthlyProjection = {};
  for (const r of rows) {
    if ((r.formaVenda || "").toLowerCase() !== "escambo") continue;
    if (!r.valorVenda || r.valorVenda <= 0) continue;
    const d = parseDate(r.dataVenda) ?? parseDate(r.dataPrimParcela);
    if (d) out[monthKey(d.mo, d.yr)] = (out[monthKey(d.mo, d.yr)] || 0) + r.valorVenda;
  }
  return out;
}

/**
 * Receita CONTÁBIL da revenda de permuta para a DRE, por mês, PELO VALOR CHEIO
 * — o comportamento de hoje. É a soma explícita de duas partes disjuntas:
 * o caixa (à vista e parcelada, que `permutaCashByMonth` já separa) e o
 * escambo (`permutaEscamboByMonth`). Cada ativo entra em exatamente uma.
 *
 * Pela §57.4.3 do Prompt I e pela decisão BP-3, o que deve entrar no resultado
 * é o ganho ou a perda da revenda, não o valor cheio; isso entra atrás da
 * chave única das seções 54/56/57 (I-9). Até lá, esta função é a leitura da DRE.
 */
export function permutaRevenueByMonth(
  rows: readonly CalcPermutaResale[],
): MonthlyProjection {
  const out: MonthlyProjection = {};
  for (const parte of [permutaCashByMonth(rows), permutaEscamboByMonth(rows)]) {
    for (const [mm, v] of Object.entries(parte)) if (v > 0) out[mm] = (out[mm] || 0) + v;
  }
  return out;
}

/** Agrega reembolsos por mês ("MM/YYYY"). Espelha `rembByMonth()`. */
export function reembursementsByMonth(
  reembolsos: readonly CalcReembolso[],
): MonthlyProjection {
  const m: MonthlyProjection = {};
  reembolsos.forEach((r) => {
    if (r.data && r.valor > 0) {
      const p = r.data.split("/");
      if (p.length === 3) {
        const k = p[0] + "/" + p[2];
        m[k] = (m[k] || 0) + r.valor;
      }
    }
  });
  return m;
}

/**
 * Agrega os totais de receita de uma versão (VGV, sinais, mensais, semestrais,
 * anuais, FGTS, subsídio, permuta recebida/vendida, reembolsos, banco e
 * contagem por status). Espelha `calcTotals()`, recebendo as coleções da
 * versão ao invés de ler estado global.
 */
export function calcTotals(
  units: readonly CalcUnit[],
  permutas: readonly CalcPermuta[],
  reembolsos: readonly CalcReembolso[],
  /**
   * Prompt AE — chave "resumo_definicao_nova" (nasce desligada). Ligada:
   * S1, S2 e S3 multiplicam pela quantidade, como o AS e como a Projeção
   * (2.4); permuta e liberação canceladas ficam fora (2.7). Desligada
   * (padrão): exatamente o de antes. `calcTotals` só é usada pelo Resumo.
   */
  opts: { definicaoNova?: boolean } = {},
): VersionTotals {
  const nova = !!opts.definicaoNova;
  const cancelada = (st: string | null | undefined) => nova && /cancel/i.test(st ?? "");
  let sinais = 0,
    mens = 0,
    sem = 0,
    anu = 0,
    fgts = 0,
    sub = 0,
    permRec = 0,
    permVend = 0,
    banco = 0;

  // Prompt AR, Fase 2: lê o plano por `lerPlano`. Regras de sempre do Resumo:
  // não olha caixinha nem data; a permuta do plano não entra (vem da tabela de
  // permutas); na definição antiga, S1 a S3 contam uma vez (`sinaisUmaVez`).
  units.forEach((u) => {
    for (const p of lerPlano(u, u.status, { sinaisUmaVez: !nova })) {
      if (p.origem === "AS" || p.origem === "S1" || p.origem === "S2" || p.origem === "S3") sinais += p.valorBase;
      else if (p.origem === "Mensais") mens += p.valorBase;
      else if (p.origem === "Semestrais") sem += p.valorBase;
      else if (p.origem === "Anuais") anu += p.valorBase;
      else if (p.origem === "FGTS") fgts += p.valorBase;
      else if (p.origem === "Subsidio") sub += p.valorBase;
      else if (p.origem === "Banco") banco += p.valorBase;
    }
  });

  permutas.forEach((p) => {
    if (cancelada(p.status)) return;
    permRec += p.estimado || 0;
    if (p.status === "Vendido") permVend += p.valorVenda || 0;
  });

  const reemb = reembolsos.filter((r) => !cancelada(r.status)).reduce((a, r) => a + (r.valor || 0), 0);
  const vgv = units.reduce((a, u) => a + u.valor, 0);

  return {
    vgv,
    sinais,
    mens,
    sem,
    anu,
    fgts,
    sub,
    permRec,
    permVend,
    reemb,
    banco,
    disp: units.filter((u) => u.status === "Disponivel").length,
    res: units.filter((u) => u.status === "Reservado").length,
    vend: units.filter((u) => u.status === "Vendido").length,
  };
}
