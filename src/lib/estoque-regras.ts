/**
 * Regras do Estoque (Prompt Y). Tudo PURO e testável. A saída NÃO realoca
 * custo (BY-1): nada aqui gera despesa, lançamento ou efeito na DRE — o
 * módulo registra onde o material entrou e para onde foi.
 */

export const UNIDADES = ["un", "kg", "g", "t", "m", "m²", "m³", "L", "sc", "cx", "pç", "rolo", "lata", "galão", "barra", "par", "jg"] as const;
export type Unidade = (typeof UNIDADES)[number];

/** Origens (entrada) e motivos (saída) padronizados — reduzem erro de quem lança na ponta. */
export const ENTRADA_ORIGENS = ["Compra", "Permuta", "Devolução ao estoque", "Ajuste (inventário)", "Transferência entre obras"] as const;
export const SAIDA_MOTIVOS = ["Consumo na obra", "Perda / Quebra", "Devolução ao fornecedor", "Transferência entre obras", "Ajuste (inventário)"] as const;
export const ORIGEM_ESTORNO = "Estorno";

/** 4-A.4 — tipos de documento do movimento. A nota fiscal já vive na despesa; aqui vai o RECEBIMENTO. */
export const TIPOS_DOC_ESTOQUE = ["Nota do fornecedor", "Romaneio ou canhoto de entrega", "Foto do recebimento", "Requisição de saída", "Outros"] as const;

/**
 * Número vindo de campo de formulário: aceita "32.5" (input type=number),
 * "32,5" e "1.250,75" (digitado à brasileira). Vazio = 0; inválido = NaN.
 */
export function numeroDoCampo(v: string | null | undefined): number {
  const s = (v ?? "").trim();
  if (s === "") return 0;
  const temVirgula = s.includes(",");
  const temPonto = s.includes(".");
  const normalizado = temVirgula && temPonto ? s.replace(/\./g, "").replace(",", ".") : temVirgula ? s.replace(",", ".") : s;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : NaN;
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

export interface ItemParaValidar {
  nome: string | null | undefined;
  unidade: string | null | undefined;
  custoUnit: number;
  minimo: number;
}

/** 5.1 — nome obrigatório, custo e mínimo não negativos, unidade da lista. */
export function recusaDoItem(i: ItemParaValidar): string | null {
  if (!(i.nome ?? "").trim()) return "Informe o nome do material.";
  if (!Number.isFinite(i.custoUnit) || i.custoUnit < 0) return "O custo unitário não pode ser negativo.";
  if (!Number.isFinite(i.minimo) || i.minimo < 0) return "O estoque mínimo não pode ser negativo.";
  if (!(UNIDADES as readonly string[]).includes((i.unidade ?? "").trim())) return `Escolha a unidade entre: ${UNIDADES.join(", ")}.`;
  return null;
}

export interface MovimentoParaValidar {
  tipo: "entrada" | "saida";
  itemId: string | null | undefined;
  quantidade: number;
  despesaId: string | null | undefined;
  permutaId: string | null | undefined;
  projectId: string | null | undefined;
}

/**
 * 3.2 — toda entrada aponta para UMA despesa OU UMA permuta (nunca as duas,
 * nunca nenhuma). 4.1 — toda saída informa a obra. Quantidade > 0.
 */
export function recusaDoMovimento(m: MovimentoParaValidar): string | null {
  if (!m.itemId) return "Selecione o material.";
  if (!(m.quantidade > 0)) return "Informe a quantidade (maior que zero).";
  if (m.tipo === "entrada") {
    const temDespesa = !!m.despesaId;
    const temPermuta = !!m.permutaId;
    if (temDespesa && temPermuta) return "A entrada aponta para uma despesa OU para uma permuta — não as duas.";
    if (!temDespesa && !temPermuta) return "Entrada sem origem não tem lastro: vincule a despesa (compra) ou a permuta que trouxe o material.";
  } else if (!m.projectId) {
    return "Informe para qual projeto o material foi. A saída não gera custo — a despesa já é do projeto dele —, mas registra onde o material foi parar.";
  }
  return null;
}

/** 1 — entrada soma, saída subtrai. Saldo negativo é informação, nunca escondido. */
export function saldoPorItem(movs: readonly { itemId: string; tipo: string; quantidade: number }[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of movs) out.set(m.itemId, r3((out.get(m.itemId) ?? 0) + (m.tipo === "saida" ? -m.quantidade : m.quantidade)));
  return out;
}

/** 2.4 — o movimento é valorizado pelo custo do cadastro NO MOMENTO (gravado). */
export function valorDoMovimento(quantidade: number, custoUnit: number): number {
  return r2(quantidade * custoUnit);
}

/** 2.5 — saída maior que o disponível: avisa e permite com confirmação. */
export function avisoDeSaldo(saldoAtual: number, tipo: "entrada" | "saida", quantidade: number, unidade: string): string | null {
  if (tipo !== "saida") return null;
  const depois = r3(saldoAtual - quantidade);
  if (depois >= 0) return null;
  return `Saída de ${quantidade.toLocaleString("pt-BR")} ${unidade} com saldo de ${saldoAtual.toLocaleString("pt-BR")} ${unidade}: o saldo fica em ${depois.toLocaleString("pt-BR")} ${unidade}. Material pode ter entrado sem registro — confirme para lançar mesmo assim.`;
}

/** 3.5 — soma das entradas acima do valor da despesa: avisa, não bloqueia (frete, desconto, custo aproximado). */
export function avisoDaDespesa(valorDespesa: number, somaAnterior: number, valorNovo: number): string | null {
  const soma = r2(somaAnterior + valorNovo);
  if (soma <= valorDespesa + 0.005) return null;
  return `As entradas vinculadas a esta despesa somam ${soma.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}, acima do valor lançado (${valorDespesa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}). Pode ser frete, desconto ou custo aproximado — confira.`;
}

export interface MovimentoParaEstornar {
  id: string;
  itemId: string;
  tipo: string;
  quantidade: number;
  custoUnit: number;
  projectId: string | null;
  despesaId: string | null;
  permutaId: string | null;
  estornoDeId: string | null;
}

/** 2.6 — estorno = lançamento inverso (mesma quantidade e custo), apontando o original. Não apaga. */
export function movimentoInverso(m: MovimentoParaEstornar, data: string, motivo: string): { itemId: string; tipo: "entrada" | "saida"; quantidade: string; custoUnit: string; projectId: string | null; despesaId: string | null; permutaId: string | null; origem: string; data: string; obs: string; estornoDeId: string } {
  return {
    itemId: m.itemId,
    tipo: m.tipo === "entrada" ? "saida" : "entrada",
    quantidade: String(m.quantidade),
    custoUnit: String(m.custoUnit),
    projectId: m.projectId,
    despesaId: m.despesaId,
    permutaId: m.permutaId,
    origem: ORIGEM_ESTORNO,
    data,
    obs: `Estorno de ${m.tipo} · ${motivo}`,
    estornoDeId: m.id,
  };
}

/** Um movimento que já é estorno, ou que já foi estornado, não se estorna de novo. */
export function recusaDoEstorno(m: MovimentoParaEstornar, jaEstornado: boolean, motivo: string): string | null {
  if (m.estornoDeId) return "Este lançamento já é um estorno. Para corrigir, lance o movimento de novo.";
  if (jaEstornado) return "Este movimento já foi estornado.";
  if (!motivo.trim()) return "Informe o motivo do estorno — ele fica na auditoria e no histórico.";
  return null;
}

/** 5.2 — item com movimento não é apagado: oferece inativar. */
export function recusaDaExclusaoDoItem(movimentos: number): string | null {
  if (movimentos > 0) return `Este material tem ${movimentos} movimento(s). Excluir apagaria o histórico — inative o item em vez disso (ele some das opções e o histórico fica).`;
  return null;
}
