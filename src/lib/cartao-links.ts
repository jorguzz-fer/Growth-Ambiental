import { TODOS_OS_PROJETOS } from "@/lib/projeto-selecao";

/**
 * Link para lançar em Despesas a compra que está na fatura do cartão e não foi
 * lançada: abre o formulário já preenchido (valor, forma "Cartão de crédito",
 * cartão, data, histórico e competência). Quem grava é o botão Salvar de
 * Despesas — nenhuma despesa nasce sozinha (Prompt AT §6.2; GA-11 §3.3 e §4.2).
 * Puro: serve à tela e às ferramentas da Cris.
 */
export function linkParaLancarCompra(cartaoId: string, linha: { id?: string | null; data: string | null; descricao: string | null; valor: number }): string {
  const q = new URLSearchParams({
    // A obra é escolhida no formulário ("Todos os projetos").
    proj: TODOS_OS_PROJETOS,
    tab: "lancamentos",
    novo: "1",
    pf_valor: Math.abs(linha.valor).toFixed(2),
    pf_forma: "Cartão de crédito",
    pf_cartao: cartaoId,
    pf_data: linha.data ?? "",
    pf_obs: linha.descricao ?? "",
    pf_comp: linha.data ? `${linha.data.slice(0, 2)}/${linha.data.slice(6)}` : "",
  });
  if (linha.id) q.set("pf_extrato_cartao", linha.id);
  return `/despesas?${q.toString()}`;
}
