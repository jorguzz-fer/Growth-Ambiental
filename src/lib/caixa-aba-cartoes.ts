import { getCartoes, getComprasDoCartao, getComprasDosCartoes, getEstornosDoCartao, getExtratoCartao, getFaturasCartao } from "@/lib/queries";
import { conferirExtrato, type CompraParaConferir, type Conferencia } from "@/lib/calc/conferencia-cartao";
import { conciliacaoDoCartao, type FaturaNaConciliacao } from "@/lib/cartao-conciliacao";
import { estadoDaFatura } from "@/lib/calc/fatura";
import { analisarCartoes, type AnaliseDeCartoes } from "@/lib/cartao-analise";
import type { SaldoDoCartao } from "@/lib/caixa-cartoes";
import { ymd } from "@/lib/utils";

/**
 * GA-11 §3.3 — os dados da aba Cartões de crédito da Conciliação de Caixa,
 * de UM cartão ou de todos. Só leitura. Junta o que estava espalhado entre o
 * Caixa (conciliação linha a linha, `conciliacaoDoCartao`) e /cartoes
 * (conferência do extrato, `conferirExtrato`), sem mudar nenhuma regra.
 *
 * Quadro por cartão: limite, a fatura de referência (a mais recente com
 * fatura importada; sem nenhuma, a do ciclo em curso), o valor da fatura
 * importada, o valor lançado, a diferença e a situação.
 */
export type SituacaoDaFatura = "conciliada" | "aberta" | "fechada" | "paga" | "paga parcialmente" | "sem fatura";

export interface LinhaDoQuadroDeCartao {
  id: string;
  nome: string;
  limite: number | null;
  fatura: { fechamento: string; vencimento: string | null } | null;
  /** soma das linhas da fatura importada nessa fatura (null = nenhuma importada). */
  extrato: number | null;
  /** compras e parcelas lançadas nessa fatura. */
  lancado: number;
  /** extrato − lançado (null sem fatura importada). */
  diferenca: number | null;
  situacao: SituacaoDaFatura;
  pendentes: number;
}

export interface CartaoNaAba {
  id: string;
  nome: string;
  faturas: FaturaNaConciliacao[];
  conferencia: Conferencia;
  compras: CompraParaConferir[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function dadosDaAbaCartoes(
  tenantId: string,
  hojeISO: string,
  saldos: readonly SaldoDoCartao[],
  cartaoSel: string | null,
): Promise<{ quadro: LinhaDoQuadroDeCartao[]; cartoes: CartaoNaAba[]; analise: AnaliseDeCartoes }> {
  const [todos, faturas, comprasDeTodos] = await Promise.all([getCartoes(tenantId), getFaturasCartao(tenantId), getComprasDosCartoes(tenantId)]);
  const ativos = todos.filter((c) => saldos.some((s) => s.id === c.id));
  const porCartao = await Promise.all(
    ativos.map(async (c) => {
      const [itens, compras, estornos, faturasDaConciliacao] = await Promise.all([
        getExtratoCartao(tenantId, c.id),
        getComprasDoCartao(tenantId, c.id),
        getEstornosDoCartao(tenantId, c.id),
        conciliacaoDoCartao(tenantId, c.id),
      ]);
      const conferencia = conferirExtrato(
        itens.map((i) => ({ id: i.id, data: i.data, descricao: i.descricao, valor: i.valor })),
        compras,
        estornos,
        c,
      );
      return { cartao: c, compras, conferencia, faturas: faturasDaConciliacao };
    }),
  );

  const quadro: LinhaDoQuadroDeCartao[] = porCartao.map(({ cartao, faturas: fs }) => {
    const saldo = saldos.find((s) => s.id === cartao.id)!;
    const importadas = fs.filter((f) => f.fechamento);
    const ref = importadas[0]?.fechamento ?? saldo.faturaDoCiclo?.fechamento ?? null;
    const daFatura = ref ? faturas.find((f) => f.cartaoId === cartao.id && f.fechamento === ref) ?? null : null;
    const grupo = ref ? fs.find((f) => f.fechamento === ref) ?? null : null;
    const lancado = r2(daFatura?.valorCompras ?? 0);
    const extrato = grupo ? grupo.totalExtrato : null;
    const conciliada = !!grupo && grupo.linhas.length > 0 && grupo.linhas.every((l) => l.despesaId || l.creditoComEstorno) && Math.abs(grupo.diferenca) < 0.005;
    const situacao: SituacaoDaFatura = !ref ? "sem fatura" : conciliada ? "conciliada" : daFatura ? estadoDaFatura(daFatura, hojeISO) : (ymd(ref) ?? 0) >= Number(hojeISO.replaceAll("-", "")) ? "aberta" : "fechada";
    return {
      id: cartao.id,
      nome: saldo.nome,
      limite: saldo.limite,
      fatura: ref ? { fechamento: ref, vencimento: daFatura?.vencimento ?? (saldo.faturaDoCiclo?.fechamento === ref ? saldo.faturaDoCiclo.vencimento : null) } : null,
      extrato,
      lancado,
      diferenca: extrato == null ? null : r2(extrato - lancado),
      situacao,
      pendentes: saldo.pendentes,
    };
  });

  const escolhidos = porCartao.filter((p) => !cartaoSel || p.cartao.id === cartaoSel);
  const cartoes: CartaoNaAba[] = escolhidos.map((p) => ({
    id: p.cartao.id,
    nome: saldos.find((s) => s.id === p.cartao.id)!.nome,
    faturas: p.faturas,
    conferencia: p.conferencia,
    compras: p.compras,
  }));
  const unico = cartoes.length === 1 ? cartoes[0] : null;
  const analise = analisarCartoes(
    ativos,
    faturas,
    comprasDeTodos.filter((c) => !cartaoSel || c.cartaoId === cartaoSel),
    unico ? { cartao: unico.nome, resultado: unico.conferencia } : null,
    hojeISO,
  );
  return { quadro, cartoes, analise };
}
