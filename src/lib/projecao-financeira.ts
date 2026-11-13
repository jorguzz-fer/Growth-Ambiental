/**
 * Budget × Forecast × Realizado — indicadores de projeção ao término
 * (Growth Ambiental). Módulo PURO.
 *
 * Entradas: os "inputs" mensais da DRE (motor `dre-cascata`) de cada versão:
 * Orçamento original (o primeiro), Orçamento revisado (o vigente), Atual
 * (realizado) e Previsão (Forecast). Nada é gravado; versões não se
 * sobrescrevem.
 *
 *  · realizado até hoje = Atual nas competências até o mês corrente;
 *  · custo para concluir (ETC) = Previsão nas competências DEPOIS do mês
 *    corrente (sem Previsão, o Orçamento revisado — dito na tela);
 *  · custo estimado ao término (EAC) = realizado + para concluir;
 *  · desvio = EAC − Orçamento revisado (custo), em valor e %;
 *  · resultado e margem estimados = receita estimada − EAC.
 * Custo = Custo Variável + Custo Fixo + Despesa Variável + Despesa Fixa +
 * Despesas Financeiras. Retiradas, Investimento e Empréstimos ficam fora
 * (não são resultado), como na DRE gerencial.
 */
import type { Inputs } from "@/lib/calc/dre-cascata";

/** As categorias que a cascata da DRE (`waterfall`) subtrai até o resultado, além do Custo Variável. */
export const CATEGORIAS_DO_CUSTO = ["Custo Fixo", "Despesa Variável", "Despesa Fixa", "Despesas Financeiras"] as const;

/** Custo do resultado: o Custo Variável (campo próprio) + as categorias acima, como na cascata. */
export const custoDe = (i: Inputs) => i.custoVar + CATEGORIAS_DO_CUSTO.reduce((s, k) => s + (i.byCat[k] || 0), 0);

/** "MM/YYYY" → AAAAMM */
const ord = (mm: string) => {
  const m = /^(\d{2})\/(\d{4})$/.exec(mm);
  return m ? Number(m[2]) * 100 + Number(m[1]) : null;
};
const c2 = (n: number) => Math.round(n * 100) / 100;

function somar(porMes: Record<string, Inputs> | null, filtro: (o: number) => boolean) {
  let receita = 0;
  let custo = 0;
  for (const [mm, i] of Object.entries(porMes ?? {})) {
    const o = ord(mm);
    if (o == null || !filtro(o)) continue;
    receita += i.receita;
    custo += custoDe(i);
  }
  return { receita: c2(receita), custo: c2(custo) };
}

export interface EntradaDeProjecao {
  orcamentoOriginal: Record<string, Inputs> | null;
  orcamentoRevisado: Record<string, Inputs> | null;
  atual: Record<string, Inputs> | null;
  previsao: Record<string, Inputs> | null;
  /** "MM/YYYY" */
  mesAtual: string;
}

export interface IndicadoresDeProjecao {
  orcamentoOriginal: { receita: number; custo: number } | null;
  orcamentoRevisado: { receita: number; custo: number } | null;
  realizadoAteHoje: { receita: number; custo: number };
  /** custo para concluir (ETC) */
  custoParaConcluir: number;
  receitaAReceberPrevista: number;
  /** custo estimado ao término (EAC) */
  custoEstimadoAoTermino: number;
  receitaEstimada: number;
  resultadoEstimado: number;
  margemEstimadaPct: number | null;
  resultadoOrcado: number | null;
  margemOrcadaPct: number | null;
  /** EAC − custo do Orçamento revisado */
  desvioDeCusto: number | null;
  desvioDeCustoPct: number | null;
  /** de onde veio o "para concluir" */
  baseDoRestante: "previsao" | "orcamento" | "nenhuma";
}

export function indicadoresDeProjecao(e: EntradaDeProjecao): IndicadoresDeProjecao {
  const hoje = ord(e.mesAtual) ?? 0;
  const tudo = () => true;
  const original = e.orcamentoOriginal ? somar(e.orcamentoOriginal, tudo) : null;
  const revisado = e.orcamentoRevisado ? somar(e.orcamentoRevisado, tudo) : original;
  const realizado = somar(e.atual, (o) => o <= hoje);
  const fonte = e.previsao ? "previsao" : e.orcamentoRevisado || e.orcamentoOriginal ? "orcamento" : "nenhuma";
  const restante = somar(e.previsao ?? e.orcamentoRevisado ?? e.orcamentoOriginal, (o) => o > hoje);
  const eac = c2(realizado.custo + restante.custo);
  const receitaEstimada = c2(realizado.receita + restante.receita);
  const resultadoEstimado = c2(receitaEstimada - eac);
  const resultadoOrcado = revisado ? c2(revisado.receita - revisado.custo) : null;
  return {
    orcamentoOriginal: original,
    orcamentoRevisado: revisado,
    realizadoAteHoje: realizado,
    custoParaConcluir: restante.custo,
    receitaAReceberPrevista: restante.receita,
    custoEstimadoAoTermino: eac,
    receitaEstimada,
    resultadoEstimado,
    margemEstimadaPct: receitaEstimada > 0 ? c2((resultadoEstimado / receitaEstimada) * 100) : null,
    resultadoOrcado,
    margemOrcadaPct: revisado && revisado.receita > 0 && resultadoOrcado != null ? c2((resultadoOrcado / revisado.receita) * 100) : null,
    desvioDeCusto: revisado ? c2(eac - revisado.custo) : null,
    desvioDeCustoPct: revisado && revisado.custo > 0 ? c2(((eac - revisado.custo) / revisado.custo) * 100) : null,
    baseDoRestante: fonte,
  };
}
