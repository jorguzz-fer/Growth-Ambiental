/**
 * Núcleo financeiro (Growth Ambiental) — os CINCO valores de um contrato de
 * serviço e a receita reconhecida. Módulo PURO.
 *
 *   contratado → medido (aprovado) → faturado → receita reconhecida → recebido
 *
 * Os cinco não se confundem. A receita reconhecida segue a regra que a DRE
 * usa HOJE: a fatura do contrato (conta a receber) entra no mês do
 * vencimento. A adoção de outra política (por exemplo, a competência da
 * medição aprovada, CPC 47) aguarda validação contábil — ver
 * docs/NUCLEO_FINANCEIRO_AMBIENTAL.md. Nada aqui reconhece receita só porque
 * uma medição foi aprovada.
 */

export const REGRA_DE_RECONHECIMENTO =
  "Receita reconhecida pela regra atual da DRE: a fatura do contrato entra no mês do vencimento. Medição aprovada não gera receita sozinha; outra política aguarda validação contábil.";

export interface FaturaParaReceita {
  valor: number;
  /** MM/DD/YYYY */
  vencimento: string | null;
  cancelado: boolean;
}

/** "MM/DD/YYYY" ou "MM/YYYY" → AAAAMM; null se ilegível. */
export function mesOrdenavel(s: string | null | undefined): number | null {
  if (!s) return null;
  const p = s.trim().split("/");
  if (p.length === 3) return Number(p[2]) * 100 + Number(p[0]);
  if (p.length === 2) return Number(p[1]) * 100 + Number(p[0]);
  return null;
}

const c2 = (n: number) => Math.round(n * 100) / 100;

/** Receita reconhecida até o mês de `ate` (inclusive), pela regra atual (vencimento). */
export function receitaReconhecida(faturas: readonly FaturaParaReceita[], ate: string): number {
  const limite = mesOrdenavel(ate);
  return c2(
    faturas
      .filter((f) => !f.cancelado)
      .filter((f) => {
        const m = mesOrdenavel(f.vencimento);
        return m != null && limite != null && m <= limite;
      })
      .reduce((s, f) => s + f.valor, 0),
  );
}

export interface CincoValores {
  contratado: number;
  medido: number;
  faturado: number;
  receitaReconhecida: number;
  recebido: number;
  /** contratado − medido */
  saldoAMedir: number;
  /** medido − faturado (negativo = faturamento à frente da medição) */
  medidoNaoFaturado: number;
  /** faturado − recebido */
  faturadoNaoRecebido: number;
  /** faturado − reconhecido (faturas com vencimento futuro) */
  faturadoAReconhecer: number;
}

export function cincoValores(
  s: { atualizado: number; medidoAprovado: number; faturado: number; recebido: number },
  faturas: readonly FaturaParaReceita[],
  ate: string,
): CincoValores {
  const reconhecida = receitaReconhecida(faturas, ate);
  return {
    contratado: c2(s.atualizado),
    medido: c2(s.medidoAprovado),
    faturado: c2(s.faturado),
    receitaReconhecida: reconhecida,
    recebido: c2(s.recebido),
    saldoAMedir: c2(s.atualizado - s.medidoAprovado),
    medidoNaoFaturado: c2(s.medidoAprovado - s.faturado),
    faturadoNaoRecebido: c2(s.faturado - s.recebido),
    faturadoAReconhecer: c2(s.faturado - reconhecida),
  };
}
