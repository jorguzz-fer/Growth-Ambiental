import { serieVencimentos } from "./carencia";
import type { UnitStatus } from "./types";

/**
 * Prompt AR, Fase 2 (Revisão 4) — LEITURA ÚNICA do plano de pagamento.
 *
 * É o único lugar que abre o JSON `payment_plan` para cálculo. As leituras
 * (recebíveis, projeção, totais do Resumo, total contratado, importação de
 * extrato) consomem a lista canônica de parcelas daqui e aplicam só o que é
 * delas: a projeção aplica o INCC, os totais agregam, os recebíveis listam as
 * datas.
 *
 * Tolerante a plano antigo ou parcial: seção ausente vale zero, número em texto
 * vira número, data inválida vira parcela sem data.
 *
 * Onde as leituras divergiam por herança (e com a chave da empresa desligada
 * continuam divergindo, para nenhum número mudar), a diferença é um parâmetro
 * de `OpcoesDeLeitura`, com o motivo.
 */

export type OrigemDaParcela = "AS" | "S1" | "S2" | "S3" | "Mensais" | "Semestrais" | "Anuais" | "FGTS" | "Subsidio" | "Permuta" | "Banco";

export interface ParcelaDoPlano {
  origem: OrigemDaParcela;
  /** Posição da parcela na seção (0, 1, 2…). */
  numero: number;
  /** Quantas parcelas a seção tem (para o rótulo "Mensal #3"). */
  deTotal: number;
  /** Vencimento "MM/DD/YYYY" (dia encolhido ao fim do mês quando preciso); null sem data-base. */
  data: string | null;
  /** Mês "MM/YYYY" do vencimento; null sem data-base. */
  mes: string | null;
  /** Valor nominal da parcela, sem correção. */
  valorBase: number;
  /** A caixinha "Usar …" da seção está marcada? */
  ligada: boolean;
  /** Subsídio: `statusSub`; Financiamento: `statusFinanc`; demais: null. */
  situacao: string | null;
  /** Mensais, Semestrais e Anuais: as que o INCC corrige. */
  periodica: boolean;
  /** Rótulo da parcela ("Ato", "Sinal 1", "Mensal #3", "FGTS", "Financiamento"…). */
  rotulo: string;
}

export interface OpcoesDeLeitura {
  /**
   * HERANÇA dos recebíveis (`expandUnitReceivables`): seção periódica com
   * `n` = 0 gerava UMA parcela; na projeção e nos totais gerava nenhuma.
   * Ligado só onde a leitura antiga fazia assim, para nenhum número mudar
   * com a chave desligada.
   */
  periodicaMinimaUm?: boolean;
  /**
   * HERANÇA do Resumo na definição antiga (`calcTotals` sem
   * `resumo_definicao_nova`): S1, S2 e S3 contavam UMA vez, sem multiplicar
   * pela quantidade. Ligado só lá.
   */
  sinaisUmaVez?: boolean;
  /**
   * HERANÇA da importação de extrato (`importCash`): os valores esperados de
   * parcela vinham de TODAS as unidades, vendidas ou não. As demais leituras
   * só leem unidade vendida.
   */
  qualquerStatus?: boolean;
}

const num = (v: unknown) => Number(v) || 0;
const txt = (v: unknown) => (typeof v === "string" ? v : "");

/** "MM/DD/YYYY" → {mo,d,yr}, como `parseDate` da projeção (aceita qualquer texto com 3 partes). */
function partes(s: string): { mo: number; d: number; yr: number } | null {
  if (!s || !s.trim()) return null;
  const p = s.split("/");
  if (p.length < 3) return null;
  return { mo: parseInt(p[0], 10), d: parseInt(p[1], 10), yr: parseInt(p[2], 10) };
}

const dd = (n: number) => String(n).padStart(2, "0");

/** Mês "MM/YYYY" de (mo, yr) + `n` meses, como `addMonths` + `monthKey` da projeção. */
function mesMais(mo: number, yr: number, n: number): string {
  let m = mo + n;
  let y = yr;
  while (m > 12) {
    m -= 12;
    y++;
  }
  return `${dd(m)}/${y}`;
}

const PERIODICAS: { origem: OrigemDaParcela; usar: (p: Record<string, Record<string, unknown>> & { usarAS?: unknown }) => unknown; rotulo: string; passo: number; periodica: boolean }[] = [
  { origem: "AS", usar: (p) => p.usarAS, rotulo: "Ato", passo: 1, periodica: false },
  { origem: "S1", usar: (p) => p.AS?.usarS1, rotulo: "Sinal 1", passo: 1, periodica: false },
  { origem: "S2", usar: (p) => p.S1?.usarS2, rotulo: "Sinal 2", passo: 1, periodica: false },
  { origem: "S3", usar: (p) => p.S2?.usarS3, rotulo: "Sinal 3", passo: 1, periodica: false },
  { origem: "Mensais", usar: (p) => p.S3?.usarMens, rotulo: "Mensal", passo: 1, periodica: true },
  { origem: "Semestrais", usar: (p) => p.Mensais?.usarSem, rotulo: "Semestral", passo: 6, periodica: true },
  { origem: "Anuais", usar: (p) => p.Semestrais?.usarAnu, rotulo: "Anual", passo: 12, periodica: true },
];

/**
 * O plano → lista canônica de parcelas, na ordem do plano (Ato, Sinais,
 * Mensais, Semestrais, Anuais, FGTS, Subsídio, Permuta, Financiamento).
 * Unidade não vendida → lista vazia (salvo `qualquerStatus`). Seção com valor
 * zero não gera parcela. Parcela sem data-base válida sai com `data` nula: os
 * totais a contam, os recebíveis e a projeção não.
 */
export function lerPlano(plan: unknown, status: UnitStatus | string | null | undefined, opts: OpcoesDeLeitura = {}): ParcelaDoPlano[] {
  if ((!opts.qualquerStatus && status !== "Vendido") || !plan || typeof plan !== "object") return [];
  const p = plan as Record<string, Record<string, unknown>> & { usarAS?: unknown };
  const sec = (k: string) => (p[k] && typeof p[k] === "object" ? p[k] : {}) as Record<string, unknown>;
  const out: ParcelaDoPlano[] = [];

  for (const s of PERIODICAS) {
    const x = sec(s.origem);
    const val = num(x.val);
    if (val === 0) continue;
    const nBruto = num(x.n);
    const sinal = !s.periodica;
    let qtd: number;
    if (sinal) qtd = opts.sinaisUmaVez && s.origem !== "AS" ? 1 : Math.max(1, nBruto || 1);
    else qtd = opts.periodicaMinimaUm ? Math.max(1, nBruto || 1) : Math.max(0, nBruto);
    const venc = txt(x.venc);
    const base = partes(venc);
    // Mesma série de datas dos recebíveis (dia encolhido ao fim do mês: 31/01 → 28/02 → 31/03).
    const datas = base ? serieVencimentos(venc, qtd, s.passo) : [];
    for (let i = 0; i < qtd; i++) {
      out.push({
        origem: s.origem,
        numero: i,
        deTotal: qtd,
        data: base ? (datas[i] ?? `${dd(base.mo)}/${dd(base.d)}/${base.yr}`) : null,
        mes: base ? mesMais(base.mo, base.yr, i * s.passo) : null,
        valorBase: val,
        ligada: !!s.usar(p),
        situacao: null,
        periodica: s.periodica,
        rotulo: qtd > 1 ? `${s.rotulo} #${i + 1}` : s.rotulo,
      });
    }
  }

  const avulsas: { origem: OrigemDaParcela; val: unknown; data: unknown; ligada: unknown; situacao: unknown; rotulo: string }[] = [
    { origem: "FGTS", val: sec("FGTS").val, data: sec("FGTS").dataPrev, ligada: sec("Anuais").usarFGTS, situacao: null, rotulo: "FGTS" },
    { origem: "Subsidio", val: sec("Subsidio").val, data: sec("Subsidio").dataPrev, ligada: sec("FGTS").usarSub, situacao: sec("Subsidio").statusSub ?? null, rotulo: "Subsídio" },
    { origem: "Permuta", val: sec("Permuta").val, data: sec("Permuta").dataPrev, ligada: sec("Subsidio").usarPer, situacao: null, rotulo: "Permuta" },
    { origem: "Banco", val: sec("Banco").valFinanc, data: sec("Banco").dataPrimParc, ligada: sec("Permuta").usarFinanc, situacao: sec("Banco").statusFinanc ?? null, rotulo: "Financiamento" },
  ];
  for (const a of avulsas) {
    const val = num(a.val);
    if (val === 0) continue;
    const d = partes(txt(a.data));
    out.push({
      origem: a.origem,
      numero: 0,
      deTotal: 1,
      data: d ? `${dd(d.mo)}/${dd(d.d)}/${d.yr}` : null,
      mes: d ? `${dd(d.mo)}/${d.yr}` : null,
      valorBase: val,
      ligada: !!a.ligada,
      situacao: typeof a.situacao === "string" ? a.situacao : null,
      periodica: false,
      rotulo: a.rotulo,
    });
  }
  return out;
}
