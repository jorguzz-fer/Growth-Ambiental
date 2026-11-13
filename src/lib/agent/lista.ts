import { brl } from "@/lib/utils";

/**
 * Toda rota devolve no máximo `limite` itens — o contexto do modelo é
 * finito e Contas a Pagar já passa de 360 linhas.
 *
 * Mas truncar em silêncio é pior do que não responder: o agente diria "são
 * estas 50" com a mesma confiança com que diria a lista inteira. Por isso o
 * total e a soma são calculados **antes** do corte e vão junto, com
 * `truncado: true` — assim a Cris consegue dizer "são 366, somando R$ 533.205;
 * te mostro as 50 mais próximas do vencimento".
 */
export function empacotar<T>(
  itens: T[],
  opts: { limite: number; valor?: (item: T) => number },
) {
  const total = itens.length;
  const soma = opts.valor ? itens.reduce((s, i) => s + (opts.valor?.(i) ?? 0), 0) : undefined;
  const cortados = itens.slice(0, opts.limite);
  return {
    total,
    exibidos: cortados.length,
    truncado: total > cortados.length,
    ...(soma !== undefined ? { somaValor: soma, somaValorBRL: brl(soma) } : {}),
    itens: cortados,
  };
}

/** Limite pedido na query, com teto rígido para não estourar o contexto. */
export function limiteDe(url: URL, padrao = 50, teto = 200): number {
  const n = Number(url.searchParams.get("limite"));
  if (!Number.isFinite(n) || n <= 0) return padrao;
  return Math.min(Math.floor(n), teto);
}

/** Comparação de nome de projeto tolerante a acento/caixa ("monitoramento são joão" ↔ "MONITORAMENTO SAO JOAO"). */
export function casaNome(valor: string | null | undefined, busca: string | null): boolean {
  if (!busca) return true;
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  return norm(valor ?? "").includes(norm(busca));
}
