import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCartoes, getFaturasCartao } from "@/lib/queries";
import { comRotativo, estadoDaFatura, saldoDaFatura } from "@/lib/calc/fatura";
import { ymd } from "@/lib/utils";

/**
 * Prompt AT §4.2 — a linha de cada cartão de crédito no bloco de saldos do
 * Caixa, no mesmo formato das contas: fatura aberta, conciliado, pendentes e
 * data do último extrato. Só leitura.
 *
 * - Fatura aberta: o que falta pagar da fatura do ciclo em curso (com o
 *   rotativo que ela traz e sem estimativa de juros), pela mesma regra de
 *   Cartões e Contas a Pagar.
 * - Conciliado: soma das linhas do extrato da fatura já conciliadas com a
 *   compra lançada no cartão (§6).
 * - Pendentes: linhas do extrato sem compra conciliada (os créditos ligados a
 *   um estorno não contam: já seguiram o fluxo de estorno, §6.3).
 */
export interface SaldoDoCartao {
  id: string;
  nome: string;
  faturaAberta: number;
  conciliado: number;
  pendentes: number;
  /** "YYYY-MM-DD" da linha mais recente do extrato; null = nunca subiu extrato. */
  ultimoExtrato: string | null;
  conectado: boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function saldosDosCartoes(tenantId: string, hojeISO: string): Promise<SaldoDoCartao[]> {
  const cartoes = (await getCartoes(tenantId)).filter((c) => c.ativo);
  if (cartoes.length === 0) return [];
  const ids = cartoes.map((c) => c.id);
  const [faturas, linhas, estornos, ofs] = await Promise.all([
    getFaturasCartao(tenantId),
    db
      .select({ id: schema.extratoCartao.id, cartaoId: schema.extratoCartao.cartaoId, data: schema.extratoCartao.data, valor: schema.extratoCartao.valor, despesaId: schema.extratoCartao.despesaId })
      .from(schema.extratoCartao)
      .where(and(eq(schema.extratoCartao.tenantId, tenantId), inArray(schema.extratoCartao.cartaoId, ids))),
    db
      .select({ extratoItemId: schema.estornosCartao.extratoItemId })
      .from(schema.estornosCartao)
      .where(and(eq(schema.estornosCartao.tenantId, tenantId), inArray(schema.estornosCartao.cartaoId, ids))),
    db.select({ id: schema.cartoesCredito.id, of: schema.cartoesCredito.openFinanceId }).from(schema.cartoesCredito).where(inArray(schema.cartoesCredito.id, ids)),
  ]);
  const comEstorno = new Set(estornos.map((e) => e.extratoItemId).filter((x): x is string => !!x));
  const conectado = new Map(ofs.map((o) => [o.id, !!o.of]));
  const fs = comRotativo(faturas, hojeISO);
  return cartoes.map((c) => {
    const aberta = fs.filter((f) => f.cartaoId === c.id && estadoDaFatura(f, hojeISO) === "aberta").sort((a, b) => (ymd(a.fechamento) ?? 0) - (ymd(b.fechamento) ?? 0))[0];
    const doCartao = linhas.filter((l) => l.cartaoId === c.id);
    const ultimo = doCartao.reduce<number | null>((m, l) => {
      const d = ymd(l.data);
      return d != null && (m == null || d > m) ? d : m;
    }, null);
    return {
      id: c.id,
      nome: `${c.apelido}${c.ultimos4 ? " •••• " + c.ultimos4 : ""}`,
      faturaAberta: aberta ? saldoDaFatura(aberta) : 0,
      conciliado: r2(doCartao.filter((l) => l.despesaId).reduce((a, l) => a + Number(l.valor), 0)),
      pendentes: doCartao.filter((l) => !l.despesaId && !comEstorno.has(l.id)).length,
      ultimoExtrato: ultimo == null ? null : `${String(ultimo).slice(0, 4)}-${String(ultimo).slice(4, 6)}-${String(ultimo).slice(6, 8)}`,
      conectado: conectado.get(c.id) ?? false,
    };
  });
}
