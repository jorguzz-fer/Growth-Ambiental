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
  /**
   * Prompt AT §5.1 — chave estável da parcela no plano: "origem#número"
   * (ex.: "Mensais#12", "S1#2", "FGTS#1"). Não muda quando outra seção é
   * editada; é o que o recebimento da parcela guarda.
   */
  chave: string;
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
  opts: { definicaoNova?: boolean } = {},
): Receivable[] {
  if (opts.definicaoNova) {
    // Chave `plano_definicao_nova` (Revisão 4, decisões do dono de 11/11):
    // BAR-1: só seção com a caixinha "Usar" marcada; BAR-3: o financiamento
    // não é recebível (o dinheiro do banco chega como liberação de obra);
    // BAR-4: a permuta do plano não é dinheiro. Seção periódica com
    // quantidade zero não gera parcela (a herança `periodicaMinimaUm` cai).
    return lerPlano(plan, status)
      .filter((p) => p.data && p.valorBase > 0 && p.ligada && p.origem !== "Banco" && p.origem !== "Permuta")
      .map((p) => ({ dia: p.data!, valor: p.valorBase, label: p.rotulo, secao: p.origem, chave: chaveDaParcela(p) }));
  }
  return lerPlano(plan, status, { periodicaMinimaUm: true })
    .filter((p) => p.data && p.valorBase > 0)
    .map((p) => ({ dia: p.data!, valor: p.valorBase, label: p.rotulo, secao: p.origem, chave: chaveDaParcela(p) }));
}

/** Prompt AT §5.1 — "origem#número" (1, 2, 3…), a chave estável da parcela no plano. */
export function chaveDaParcela(p: { origem: string; numero: number }): string {
  return `${p.origem}#${p.numero + 1}`;
}
