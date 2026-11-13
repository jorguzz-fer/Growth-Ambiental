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
