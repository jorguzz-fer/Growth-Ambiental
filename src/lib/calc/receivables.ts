import { lerPlano } from "./plano";
import type { PaymentPlan, UnitStatus } from "./types";

export interface Receivable {
  /** data prevista, "MM/DD/YYYY". */
  dia: string;
  valor: number;
  label: string;
  /**
   * Seção do plano de onde veio ("AS", "S1", "S2", "S3", "Mensais",
   * "Semestrais", "Anuais", "FGTS", "Subsidio", "Permuta", "Banco"). Prompt AT
   * §2.1: quem projeta dinheiro precisa separar a permuta, que não entra no caixa.
   */
  secao: string;
}

/**
 * Expande o plano de pagamento de uma unidade vendida em recebíveis datados
 * (uma linha por vencimento). Base do painel "Receitas a Receber do Dia".
 * Só gera recebíveis para unidades com status "Vendido".
 *
 * Prompt AR, Fase 2: lê o plano por `lerPlano` (leitura única). Mantém a
 * regra de sempre: não olha as caixinhas "Usar …", conta o financiamento e a
 * permuta do plano, e seção periódica com quantidade zero vira uma parcela
 * (`periodicaMinimaUm`). O dia de vencimento é encolhido ao fim do mês quando
 * o mês de destino não o tem (31/01 → 28/02 → 31/03).
 */
export function expandUnitReceivables(
  plan: PaymentPlan | null | undefined,
  status: UnitStatus,
): Receivable[] {
  return lerPlano(plan, status, { periodicaMinimaUm: true })
    .filter((p) => p.data && p.valorBase > 0)
    .map((p) => ({ dia: p.data!, valor: p.valorBase, label: p.rotulo, secao: p.origem }));
}
