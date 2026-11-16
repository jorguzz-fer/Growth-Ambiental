/**
 * GA-2B §2 — o cartão "Montar outra análise" do painel do Assistente
 * (Dashboard e Resumo) abre a Cris com um pedido pronto. O contexto da tela
 * (os números) já vai à Cris pela `CrisDaTela`; o pedido repete o recorte
 * (projeto, versões e período) para a Cris começar por ele.
 */
export const PEDIDO_MONTAR_ANALISE = "Quero montar uma análise. Me ajude a escolher os dados.";

/** O texto que o cartão manda para a Cris. */
export function pedidoDeAnalise(tela: string, recorte: string): string {
  const r = recorte.trim();
  return r ? `${PEDIDO_MONTAR_ANALISE}\n\nTela: ${tela} · ${r}.` : `${PEDIDO_MONTAR_ANALISE}\n\nTela: ${tela}.`;
}

/** A descrição do cartão no painel. */
export const DESCRICAO_MONTAR_ANALISE = "Escolha os dados com a Cris: ela monta a análise a partir deste recorte.";
