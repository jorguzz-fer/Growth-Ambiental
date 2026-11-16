import { linhasDaPlanilha } from "@/lib/extrato-planilha";

/**
 * GA-13 K6 — a fatura do cartão em planilha (XLSX ou CSV) usa a MESMA leitura
 * do extrato bancário (`linhasDaPlanilha`), sem duplicar a lógica. Extraída de
 * `extrato-cartao.tsx`. No extrato do cartão, a convenção é a inversa do
 * bancário: positivo = compra, negativo = crédito.
 */
export function linhasDaFatura(dados: ArrayBuffer): { data: string; descricao: string; valor: number }[] {
  return linhasDaPlanilha(dados).rows.map((r) => ({ data: r.data, descricao: r.descricao, valor: r.valor }));
}
