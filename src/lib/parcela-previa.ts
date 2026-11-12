import { hojeISO } from "@/lib/despesa-status";
import { parcelasDeVenda, SECOES_FORA_DA_CONCILIACAO } from "@/lib/recebimento-parcela";

/**
 * Prévia da chave "parcela_recebida_situacao" (Prompt AT §5.3, BAT-6). SOMENTE
 * LEITURA. Por obra: quantas parcelas de venda vencidas não têm recebimento
 * conciliado (passam a aparecer como vencidas e nos atrasados do Caixa) e
 * quanto já foi recebido pela conciliação (sai do previsto do Fluxo).
 */
export interface PreviaParcela {
  projeto: string;
  vencidasSemRecebimento: number;
  valorVencido: number;
  recebidoConciliado: number;
}

export async function previaParcelaRecebida(tenantId: string): Promise<PreviaParcela[]> {
  const hoje = hojeISO();
  const parcelas = (await parcelasDeVenda(tenantId, hoje)).filter((p) => !SECOES_FORA_DA_CONCILIACAO.has(p.secao));
  const porObra = new Map<string, PreviaParcela>();
  for (const p of parcelas) {
    const o = porObra.get(p.projectName) ?? { projeto: p.projectName, vencidasSemRecebimento: 0, valorVencido: 0, recebidoConciliado: 0 };
    if (p.situacao === "vencida") {
      o.vencidasSemRecebimento++;
      o.valorVencido = Math.round((o.valorVencido + p.saldo) * 100) / 100;
    }
    o.recebidoConciliado = Math.round((o.recebidoConciliado + p.recebido) * 100) / 100;
    porObra.set(p.projectName, o);
  }
  return [...porObra.values()].sort((a, b) => a.projeto.localeCompare(b.projeto, "pt-BR"));
}
