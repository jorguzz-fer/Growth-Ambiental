/**
 * Consumo e limite da IA (Prompt AM, Parte 5). Módulo PURO.
 *
 * O limite vale para as CONVERSAS (o chat com dados e o Assistente do
 * produto): são muitas perguntas curtas. As leituras de documento não têm
 * limite — só são medidas — para não travar lançamento em produção.
 */
export const OPERACOES_DE_CONVERSA = ["chat", "assistente", "cris", "relatorio"] as const;

/** Números adotados (decisão pendente com o dono — ver o relatório do AM). */
export const LIMITES_DE_CONVERSA = { porPessoaPorHora: 30, porEmpresaPorHora: 300 } as const;

export const ROTULO_DA_OPERACAO: Record<string, string> = {
  despesa: "Leitura de despesa",
  extrato: "Leitura de extrato",
  fornecedor: "Leitura de fornecedor",
  projeto: "Leitura de documento do projeto",
  venda: "Venda por texto",
  permuta: "Permuta por texto",
  estoque: "Nota de materiais e equipamentos",
  folha: "Folha de ponto",
  medicao: "Laudo de medição",
  chat: "Chat com dados",
  assistente: "Assistente do produto",
  cris: "Cris (chat)",
  relatorio: "Relatórios Customizados (chat)",
  teste: "Teste de conexão",
};

/** Recusa (texto) quando a pessoa ou a empresa passou do limite na última hora; null = pode. */
export function recusaPorLimite(
  usadas: { pessoa: number; empresa: number },
  limites: { porPessoaPorHora: number; porEmpresaPorHora: number } = LIMITES_DE_CONVERSA,
): string | null {
  if (usadas.pessoa >= limites.porPessoaPorHora)
    return `Limite de ${limites.porPessoaPorHora} perguntas por hora por pessoa atingido. Tente de novo daqui a pouco.`;
  if (usadas.empresa >= limites.porEmpresaPorHora)
    return `Limite de ${limites.porEmpresaPorHora} perguntas por hora da empresa atingido. Tente de novo daqui a pouco.`;
  return null;
}

export interface LinhaDeUso {
  operacao: string;
  modelo: string | null;
  fallback: boolean;
  entrada: number;
  saida: number;
  cacheCriacao: number;
  cacheLida: number;
  erro: boolean;
}

export interface ResumoDoUso {
  operacao: string;
  chamadas: number;
  erros: number;
  entrada: number;
  saida: number;
  cacheLida: number;
}

/** Totais por operação, na ordem de mais chamadas. */
export function resumoPorOperacao(linhas: readonly LinhaDeUso[]): ResumoDoUso[] {
  const m = new Map<string, ResumoDoUso>();
  for (const l of linhas) {
    const r = m.get(l.operacao) ?? { operacao: l.operacao, chamadas: 0, erros: 0, entrada: 0, saida: 0, cacheLida: 0 };
    r.chamadas += 1;
    if (l.erro) r.erros += 1;
    r.entrada += l.entrada + l.cacheCriacao;
    r.saida += l.saida;
    r.cacheLida += l.cacheLida;
    m.set(l.operacao, r);
  }
  return [...m.values()].sort((a, b) => b.chamadas - a.chamadas);
}

/**
 * 5.4 — o primário está falhando sistematicamente? Avisa quando, entre as
 * chamadas que responderam, mais da metade (e ao menos 5) veio de um modelo
 * alternativo da cadeia.
 */
export function avisoDeFallback(linhas: readonly LinhaDeUso[]): string | null {
  const ok = linhas.filter((l) => !l.erro);
  const alt = ok.filter((l) => l.fallback);
  if (alt.length >= 5 && alt.length / ok.length > 0.5)
    return `${alt.length} de ${ok.length} chamadas foram respondidas por um modelo alternativo: o modelo configurado está indisponível para a conta. Confira ANTHROPIC_MODEL.`;
  return null;
}

// ── Limites por empresa e custo estimado (implementação integrada, 0083) ──

/** Override da empresa (nulo = o padrão do sistema). */
export interface LimitesDaEmpresa {
  conversasPessoaHora: number | null;
  conversasEmpresaHora: number | null;
  orcamentoMensalUsd: number | null;
}

/** Limites que valem para a empresa: o configurado ou o padrão. */
export function limitesEfetivos(o: Partial<LimitesDaEmpresa> | null | undefined): { porPessoaPorHora: number; porEmpresaPorHora: number } {
  return {
    porPessoaPorHora: o?.conversasPessoaHora ?? LIMITES_DE_CONVERSA.porPessoaPorHora,
    porEmpresaPorHora: o?.conversasEmpresaHora ?? LIMITES_DE_CONVERSA.porEmpresaPorHora,
  };
}

/** Recusa (texto) de uma configuração de limites inválida; null = aceita. */
export function recusaDeLimites(o: LimitesDaEmpresa): string | null {
  const inteiro = (n: number | null) => n == null || (Number.isInteger(n) && n >= 1 && n <= 10000);
  if (!inteiro(o.conversasPessoaHora) || !inteiro(o.conversasEmpresaHora)) return "Os limites por hora são números inteiros de 1 a 10.000 (ou vazio para o padrão).";
  if (o.conversasPessoaHora != null && o.conversasEmpresaHora != null && o.conversasPessoaHora > o.conversasEmpresaHora) return "O limite por pessoa não pode passar do limite da empresa.";
  if (o.orcamentoMensalUsd != null && (!Number.isFinite(o.orcamentoMensalUsd) || o.orcamentoMensalUsd < 0)) return "O orçamento mensal é um valor em US$ maior ou igual a zero (ou vazio).";
  return null;
}

/**
 * Custo ESTIMADO (US$) pela tabela de preços (`ai/precos.ts`). Chamada de
 * modelo fora da tabela não vira zero: é contada à parte (custo desconhecido).
 */
export function custoEstimado(uso: readonly LinhaDeUso[], precoDe: (l: LinhaDeUso) => number | null): { usd: number; semPreco: number } {
  let usd = 0;
  let semPreco = 0;
  for (const l of uso) {
    const c = precoDe(l);
    if (c == null) semPreco += 1;
    else usd += c;
  }
  return { usd: Math.round(usd * 10000) / 10000, semPreco };
}

/** Aviso quando o custo estimado do mês passa de 80% ou de 100% do orçamento; null = sem orçamento ou dentro. */
export function alertaDeOrcamento(custoDoMesUsd: number, orcamentoUsd: number | null): string | null {
  if (orcamentoUsd == null || orcamentoUsd <= 0) return null;
  const pct = (custoDoMesUsd / orcamentoUsd) * 100;
  if (pct >= 100) return `Custo estimado do mês (US$ ${custoDoMesUsd.toFixed(2)}) passou do orçamento de US$ ${orcamentoUsd.toFixed(2)}.`;
  if (pct >= 80) return `Custo estimado do mês em ${pct.toFixed(0)}% do orçamento (US$ ${custoDoMesUsd.toFixed(2)} de US$ ${orcamentoUsd.toFixed(2)}).`;
  return null;
}
