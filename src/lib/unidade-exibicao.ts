/**
 * Exibição da tela de Unidades (Prompt J, seção 3) — helpers puros, usados pela
 * lista e pelo formulário para não haver duas regras.
 */
import { brl, brl0 } from "@/lib/utils";

/**
 * Tolerância do saldo da unidade vendida (total das fontes − VGV), em reais.
 * R$ 0,01, alinhada à RG-08 (arredondamento de um centavo). Antes era R$ 1,00,
 * o que escondia diferenças reais de até 99 centavos.
 */
export const TOLERANCIA_SALDO_UNIDADE = 0.01;

/** O plano fecha com o VGV? Diferença de até um centavo é arredondamento. */
export function saldoFecha(saldo: number): boolean {
  if (!Number.isFinite(saldo)) return false;
  return Math.round(Math.abs(saldo) * 100) <= Math.round(TOLERANCIA_SALDO_UNIDADE * 100);
}

/**
 * VGV conforme a ordem de grandeza: valor cheio abaixo de um milhão
 * ("R$ 375.000"), abreviado a partir de um milhão ("R$ 12,50 mi"). Sempre
 * formatar em milhões transformava R$ 375.000 em "R$ 0,38M".
 */
export function vgvFormatado(valor: number): string {
  const v = Number.isFinite(valor) ? valor : 0;
  if (Math.abs(v) < 1_000_000) return brl0(v);
  const mi = (v / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `R$ ${mi} mi`;
}

/** "1 unidade", "12 unidades", "0 unidades". */
export function contagemDeUnidades(n: number): string {
  return `${n} ${n === 1 ? "unidade" : "unidades"}`;
}

/** Saldo do plano com centavos: a tolerância é de um centavo, então a tela precisa mostrá-los. */
export function saldoFormatado(saldo: number): string {
  return brl(saldo);
}
