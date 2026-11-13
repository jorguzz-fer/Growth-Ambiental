/**
 * Contas a Receber — domínio e validação (Prompt K, seção 7: CR-04, CR-05).
 * Módulo PURO: usado pelas actions (servidor) e pelas telas (cliente).
 *
 * Os dois campos eram `text` com lista só nos `<option>`; aqui fica a lista
 * fechada que o servidor confere. Nenhum valor gravado é convertido (a tabela
 * estava vazia em produção em 30/09/2026): o domínio vale daqui em diante.
 */

export const TIPOS_DE_RECEITA = ["Fatura de serviço", "Reembolso de despesas", "Adiantamento", "Outros", "Outras Receitas", "Sinal", "Parcela mensal"] as const;
/**
 * Growth Ambiental: "Sinal" e "Parcela mensal" eram da venda de unidades.
 * Continuam VÁLIDOS (registros antigos são editados sem conversão), mas não
 * são oferecidos para lançamento novo.
 */
export const TIPOS_DE_RECEITA_ANTIGOS: readonly string[] = ["Sinal", "Parcela mensal"];
/** O que o formulário oferece para lançamento novo; na edição, mais o tipo já gravado. */
export function tiposDeReceitaOferecidos(atual?: string | null): string[] {
  const novos = TIPOS_DE_RECEITA.filter((t) => !TIPOS_DE_RECEITA_ANTIGOS.includes(t)) as string[];
  return atual && !novos.includes(atual) ? [...novos, atual] : novos;
}
export type TipoDeReceita = (typeof TIPOS_DE_RECEITA)[number];

/**
 * Estados gravados hoje. "Cancelada" é o que o cancelamento grava (o comentário
 * antigo do schema dizia "Cancelado"; o código nunca gravou assim). Na K-2 o
 * status passa a ser derivado e deixa de ser digitado.
 */
export const STATUS_DE_CONTA_RECEBER = ["A receber", "Parcialmente recebido", "Recebido", "Cancelada"] as const;
export type StatusDeContaReceber = (typeof STATUS_DE_CONTA_RECEBER)[number];
/** Os que o formulário de edição ainda oferece (até a K-2). */
export const STATUS_EDITAVEIS: readonly StatusDeContaReceber[] = ["A receber", "Parcialmente recebido", "Recebido"];

export function ehTipoDeReceita(v: unknown): v is TipoDeReceita {
  return typeof v === "string" && (TIPOS_DE_RECEITA as readonly string[]).includes(v);
}
export function ehStatusEditavel(v: unknown): v is StatusDeContaReceber {
  return typeof v === "string" && (STATUS_EDITAVEIS as readonly string[]).includes(v);
}

/** Valor monetário BR/US em texto → número ("1.000,50" → 1000.5). NaN se ilegível. */
export function lerValor(v: string | null | undefined): number {
  const s = (v ?? "").trim();
  if (!s) return NaN;
  let t = s.replace(/[R$\s]/g, "");
  t = /,\d{1,2}$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  return Number(t);
}

/** CR-04 — vale para criar E editar: finito e maior que zero (negativo também recusa). */
export function valorDeContaValido(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

/** Valor recebido: zero ou positivo, nunca acima do valor da conta. */
export function valorRecebidoValido(recebido: number, valor: number): boolean {
  return Number.isFinite(recebido) && recebido >= 0 && recebido <= valor + 0.005;
}

export interface CamposDeConta {
  tipo: string;
  descricao: string | null;
  valor: number;
}

/** Mensagem de recusa, ou null quando os campos comuns de criação/edição estão certos. */
export function motivoDeRecusa(c: CamposDeConta): string | null {
  if (!ehTipoDeReceita(c.tipo)) return `Tipo inválido. Use: ${TIPOS_DE_RECEITA.join(", ")}.`;
  if (c.tipo === "Outras Receitas" && !(c.descricao ?? "").trim()) {
    return 'Para "Outras Receitas", informe uma descrição da origem/natureza da receita.';
  }
  if (!valorDeContaValido(c.valor)) return "Informe um valor maior que zero para a conta a receber.";
  return null;
}
