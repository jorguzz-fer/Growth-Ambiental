/**
 * Assistente da Medição de Obra (Prompt V, seção 6; Prompt E). Módulo PURO,
 * SOMENTE LEITURA: analisa e aponta; nunca lança, altera ou exclui medição,
 * e nunca afirma percentual que o engenheiro não declarou (6.1, 6.3).
 */
import { grupoDaChave } from "@/lib/planocontas-regras";
import { compararComMedicao, type LiberacaoParaAnalise } from "@/lib/liberacao-analise";
import { monthKeyIndex } from "@/lib/planning";
import { LIMITE_RETENCAO_PCT } from "@/lib/medicao-cef";

export interface MedicaoAnalisavel {
  competencia: string;
  grupoCode: string;
  valor: number;
}

export interface ContaOrcada {
  rowKey: string;
  label: string;
  total: number;
  /** "MM/YYYY" → % do total. */
  pct: Record<string, number>;
}

/** 6.2 · competências sem medição: meses da janela do projeto, já decorridos (até o mês atual), sem nenhuma medição. */
export function competenciasSemMedicao(months: readonly string[], medicoes: readonly MedicaoAnalisavel[], hojeMes: string): string[] {
  const h = monthKeyIndex(hojeMes);
  const com = new Set(medicoes.filter((m) => m.valor > 0).map((m) => m.competencia));
  return months.filter((m) => {
    const i = monthKeyIndex(m);
    return i != null && (h == null || i <= h) && !com.has(m);
  });
}

export type SentidoDoDesvio = "acima" | "abaixo";
export interface AvancoForaDoPrevisto {
  competencia: string;
  grupoCode: string;
  label: string;
  previsto: number;
  medido: number;
  sentido: SentidoDoDesvio;
  /** medido ÷ previsto, em %; null quando previsto = 0. */
  razaoPct: number | null;
}

export const TOLERANCIA_AVANCO = 0.5;

/**
 * 6.2 · avanço fora do previsto: por grupo e competência decorrida, medido
 * muito acima (> previsto × 1,5) ou muito abaixo (< previsto × 0,5) do
 * cronograma do Orçamento. Grupo sem previsto e com medição conta como
 * "acima"; grupo com previsto e sem medição conta como "abaixo". Só
 * competências com algo previsto OU medido.
 */
export function avancoForaDoPrevisto(contas: readonly ContaOrcada[], medicoes: readonly MedicaoAnalisavel[], months: readonly string[], hojeMes: string): AvancoForaDoPrevisto[] {
  const h = monthKeyIndex(hojeMes);
  const decorridas = months.filter((m) => {
    const i = monthKeyIndex(m);
    return i != null && (h == null || i <= h);
  });
  const medido = new Map<string, number>();
  for (const m of medicoes) medido.set(`${m.grupoCode}|${m.competencia}`, (medido.get(`${m.grupoCode}|${m.competencia}`) ?? 0) + m.valor);
  const out: AvancoForaDoPrevisto[] = [];
  const r2 = (n: number) => Math.round(n * 100) / 100;
  // 0079 — a chave do Orçamento já é o código do grupo medido ("2.3"); o prefixo só vale para chave antiga.
  const gruposMedidos = new Set(medicoes.map((m) => m.grupoCode));
  for (const c of contas) {
    const grupo = grupoDaChave(c.rowKey, gruposMedidos);
    for (const mes of decorridas) {
      const previsto = r2((c.total * (Number(c.pct[mes]) || 0)) / 100);
      const med = r2(medido.get(`${grupo}|${mes}`) ?? 0);
      if (previsto <= 0 && med <= 0) continue;
      let sentido: SentidoDoDesvio | null = null;
      if (previsto <= 0 && med > 0) sentido = "acima";
      else if (med > previsto * (1 + TOLERANCIA_AVANCO)) sentido = "acima";
      else if (med < previsto * (1 - TOLERANCIA_AVANCO)) sentido = "abaixo";
      if (!sentido) continue;
      out.push({ competencia: mes, grupoCode: grupo, label: c.label, previsto, medido: med, sentido, razaoPct: previsto > 0 ? Math.round((med / previsto) * 1000) / 10 : null });
    }
  }
  return out.sort((a, b) => (monthKeyIndex(a.competencia) ?? 0) - (monthKeyIndex(b.competencia) ?? 0) || a.grupoCode.localeCompare(b.grupoCode, undefined, { numeric: true }));
}

export interface ProximidadeDaRetencao {
  estado: "longe" | "perto" | "atingida" | "sem_orcado";
  pctMedido: number | null;
  faltam: number | null;
}

export const AVISO_RETENCAO_A_PARTIR_DE = 85;

/** 6.2 · proximidade da retenção: a partir de 85% avisa que as liberações cessam nos 95%. */
export function proximidadeDaRetencao(totalPct: number | null): ProximidadeDaRetencao {
  if (totalPct == null) return { estado: "sem_orcado", pctMedido: null, faltam: null };
  const faltam = Math.round((LIMITE_RETENCAO_PCT - totalPct) * 10) / 10;
  if (totalPct >= LIMITE_RETENCAO_PCT) return { estado: "atingida", pctMedido: totalPct, faltam: 0 };
  if (totalPct >= AVISO_RETENCAO_A_PARTIR_DE) return { estado: "perto", pctMedido: totalPct, faltam };
  return { estado: "longe", pctMedido: totalPct, faltam };
}

export interface AnaliseDeMedicoes {
  semMedicao: string[];
  foraDoPrevisto: AvancoForaDoPrevisto[];
  medicaoSemLiberacao: { competencia: string; medicao: number }[];
  liberacaoSemMedicao: { competencia: string; liberado: number }[];
  retencao: ProximidadeDaRetencao;
  /** há Orçamento para comparar o avanço? */
  temOrcamento: boolean;
  totalMedicoes: number;
}

export function analisarMedicoes(args: { months: readonly string[]; hojeMes: string; medicoes: readonly MedicaoAnalisavel[]; contas: readonly ContaOrcada[] | null; liberacoes: readonly LiberacaoParaAnalise[]; totalPct: number | null }): AnaliseDeMedicoes {
  const cmp = compararComMedicao(args.liberacoes, args.medicoes.map((m) => ({ competencia: m.competencia, valor: m.valor })));
  return {
    semMedicao: competenciasSemMedicao(args.months, args.medicoes, args.hojeMes),
    foraDoPrevisto: args.contas ? avancoForaDoPrevisto(args.contas, args.medicoes, args.months, args.hojeMes) : [],
    medicaoSemLiberacao: cmp.medicaoSemLiberacao.map((c) => ({ competencia: c.competencia, medicao: c.medicao })),
    liberacaoSemMedicao: cmp.liberacaoSemMedicao.map((c) => ({ competencia: c.competencia, liberado: c.liberado })),
    retencao: proximidadeDaRetencao(args.totalPct),
    temOrcamento: !!args.contas,
    totalMedicoes: args.medicoes.length,
  };
}
