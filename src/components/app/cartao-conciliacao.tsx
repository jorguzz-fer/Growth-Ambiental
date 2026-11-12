import { conciliacaoDoCartao } from "@/lib/cartao-conciliacao";
import { CartaoConciliacaoLista } from "@/components/app/cartao-conciliacao-lista";

/**
 * Prompt AT §4.5 e §6 — com um cartão escolhido no bloco de saldos, a aba
 * Conciliação mostra, na mesma estrutura (pendentes com sugestões,
 * conciliados), as linhas do extrato da fatura e as compras lançadas no
 * cartão. Servidor: carrega; a lista (cliente) só chama as ações.
 */
export async function CartaoNaConciliacao({ tenantId, cartaoId, canConciliar, canLancar }: { tenantId: string; cartaoId: string; hojeISO: string; canConciliar: boolean; canLancar: boolean }) {
  const faturas = await conciliacaoDoCartao(tenantId, cartaoId);
  return <CartaoConciliacaoLista cartaoId={cartaoId} faturas={faturas} canConciliar={canConciliar} canLancar={canLancar} />;
}
