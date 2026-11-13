/**
 * Regras do acerto contábil (Prompt I, §17 e §18) — puras e testáveis.
 *
 * O saldo disponível de um PED NUNCA é `despesa.valor`: é o valor menos o
 * que acertos anteriores (não estornados) já abateram e menos o principal
 * dos pagamentos registrados. Tela e servidor usam esta mesma conta.
 */
import { TOLERANCIA_QUITACAO } from "@/lib/pagamento-regras";

const round2 = (v: number) => Math.round(v * 100) / 100;

export interface ComposicaoDoSaldo {
  valor: number;
  /** soma dos abatimentos de acertos ativos (não estornados). */
  abatidoAtivo: number;
  /** principal dos pagamentos registrados (encargos não abatem; desconto abate). */
  principalPago: number;
}

/** Saldo real do PED: o que ainda falta pagar. Nunca negativo. */
export function saldoRealDaDespesa(c: ComposicaoDoSaldo): number {
  return round2(Math.max(0, c.valor - c.abatidoAtivo - c.principalPago));
}

export interface ItemDeAcerto {
  despesaId: string;
  valor: number;
}

export interface DespesaParaAcerto {
  id: string;
  numDoc: string | null;
  saldo: number;
  cancelado: boolean;
  /** kind da versão: só "atual" recebe acerto. */
  versionKind: string;
  locked: boolean;
}

/**
 * §17 — o que o servidor recusa antes de efetivar, com a despesa travada:
 * PED repetido, valor inválido, PED cancelado, fora da Atual, versão
 * congelada, sem saldo, ou abatimento maior que o saldo real. Retorna a
 * mensagem, ou null quando tudo cabe.
 */
export function recusaDeAcerto(itens: readonly ItemDeAcerto[], despesas: ReadonlyMap<string, DespesaParaAcerto>): string | null {
  if (itens.length === 0) return "Vincule ao menos uma despesa ao acerto.";
  const vistos = new Set<string>();
  for (const i of itens) {
    if (vistos.has(i.despesaId)) return "A mesma despesa aparece duas vezes no acerto.";
    vistos.add(i.despesaId);
    const d = despesas.get(i.despesaId);
    if (!d) return "Alguma despesa vinculada não foi encontrada.";
    const nome = d.numDoc ? `PED ${d.numDoc}` : "uma despesa";
    if (!Number.isFinite(i.valor) || i.valor <= 0) return `Informe um valor maior que zero para ${nome}.`;
    if (d.cancelado) return `${nome} está cancelada e não recebe acerto.`;
    if (d.versionKind !== "atual") return `${nome} não está na versão Atual — acerto só sobre o realizado.`;
    if (d.locked) return `${nome} está em versão congelada — acerto bloqueado.`;
    if (d.saldo <= TOLERANCIA_QUITACAO) return `${nome} já está quitada (saldo zero). Recarregue a tela.`;
    if (i.valor > d.saldo + TOLERANCIA_QUITACAO) {
      return `O abatimento de ${i.valor.toFixed(2)} em ${nome} excede o saldo real de ${d.saldo.toFixed(2)}. Recarregue a tela e confira.`;
    }
  }
  return null;
}

/**
 * §18 — conferência do rateio no servidor: obra repetida ou fora da empresa
 * não passa; a soma é conferida por `validarRateio`.
 */
export function recusaDeObrasDoRateio(linhas: readonly { projectId: string }[], projetosDaEmpresa: ReadonlySet<string>): string | null {
  const vistos = new Set<string>();
  for (const l of linhas) {
    if (!l.projectId) return "Escolha o projeto em todas as linhas do rateio.";
    if (vistos.has(l.projectId)) return "O mesmo projeto aparece duas vezes no rateio.";
    vistos.add(l.projectId);
    if (!projetosDaEmpresa.has(l.projectId)) return "Um dos projetos do rateio não pertence a esta empresa.";
  }
  return null;
}
