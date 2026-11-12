import { lerPlano } from "./plano";

/**
 * Prompt AR, Fase 2 (Revisão 4), parte 5c — receita da DRE pelo RATEIO do
 * contrato (Prompt I, §54/§57; decisões do dono de 11/11/2026). Módulo PURO.
 *
 * - A receita de uma unidade vendida é o TOTAL DO CONTRATO: a soma do plano de
 *   pagamento, com a permuta e o financiamento, contando só as seções com a
 *   caixinha "Usar" marcada (BAR-1). Não é o preço de tabela.
 * - Ela é dividida IGUALMENTE pelas competências da janela da obra (início e
 *   fim do cadastro do projeto), inclusive os meses que já passaram: uma venda
 *   nova revisa a DRE dos meses anteriores. O resíduo de arredondamento fica na
 *   última competência, para a soma fechar com o contrato.
 * - Unidade que deixa de estar "Vendida" (distrato) sai de todos os meses.
 * - Nada é gravado: é calculado na leitura.
 *
 * Sem janela (projeto sem início ou fim) o rateio não acontece: a unidade vai
 * para `pendencias`, e a tela avisa. Nunca vira zero calado.
 */

export interface UnidadeParaRateio {
  code: string;
  status: string;
  paymentPlan: unknown;
}

export interface PendenciaDoRateio {
  unidade: string;
  motivo: string;
  valor: number;
}

/** Total do contrato da unidade: seções com a caixinha marcada, com permuta e financiamento. */
export function totalDoContrato(plano: unknown, status: string): number {
  return Math.round(lerPlano(plano, status).filter((p) => p.ligada).reduce((a, p) => a + p.valorBase, 0) * 100) / 100;
}

/** Valor dividido em `n` partes iguais (centavos), com o resíduo na última. */
export function partesIguais(valor: number, n: number): number[] {
  if (n <= 0) return [];
  const centavos = Math.round(valor * 100);
  const base = Math.trunc(centavos / n);
  const out = Array.from({ length: n }, () => base / 100);
  out[n - 1] = (centavos - base * (n - 1)) / 100;
  return out;
}

export function receitaPorRateio(
  unidades: readonly UnidadeParaRateio[],
  /** Competências "MM/YYYY" da janela da obra, em ordem; null = sem janela. */
  janela: readonly string[] | null,
): { porMes: Record<string, number>; pendencias: PendenciaDoRateio[] } {
  const porMes: Record<string, number> = {};
  const pendencias: PendenciaDoRateio[] = [];
  for (const u of unidades) {
    if (u.status !== "Vendido") continue;
    const total = totalDoContrato(u.paymentPlan, u.status);
    if (total === 0) {
      pendencias.push({ unidade: u.code, motivo: "contrato sem valor (nenhuma seção do plano com a caixinha \"Usar\" marcada)", valor: 0 });
      continue;
    }
    if (!janela || janela.length === 0) {
      pendencias.push({ unidade: u.code, motivo: "a obra não tem início e fim cadastrados", valor: total });
      continue;
    }
    const partes = partesIguais(total, janela.length);
    janela.forEach((mm, i) => {
      porMes[mm] = Math.round(((porMes[mm] ?? 0) + partes[i]) * 100) / 100;
    });
  }
  return { porMes, pendencias };
}
