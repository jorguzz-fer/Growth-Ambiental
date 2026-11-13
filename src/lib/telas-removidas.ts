/**
 * Telas que saíram do sistema e viraram redirecionamento (Prompt AL, BAL-3).
 * Módulo PURO.
 *
 * Quem tem a URL antiga no favorito cai na tela que assumiu a função, com um
 * aviso de uma linha dizendo o que mudou. O redirecionamento em si mora em
 * `next.config.ts` (antes de qualquer página): a rota antiga não existe mais
 * como página, então não há tela sem id de permissão (AL 1.4).
 */
export const TELAS_REMOVIDAS = {
  contabilidade: {
    rotaAntiga: "/contabilidade",
    destino: "/usuarios",
    aviso:
      "A tela Acesso Contabilidade saiu. Convide o contador aqui, com o papel “contador”; o que ele vê se ajusta em Gestão de Acessos.",
  },
  // Prompt AP: a Configuração da Versão saiu. Cada versão é construída na
  // própria tela; a trava e a planilha da Atual moram na tela Projetos.
  versao: {
    rotaAntiga: "/versao",
    destino: "/projeto",
    aviso:
      "A tela Configuração da Versão saiu. Escolha o projeto aqui: a trava das versões e a planilha da versão Atual (modelo, exportação e importação) ficam no cartão “Versões do projeto”.",
  },
  // Prompt AN, Parte 6: a carência saiu (detectava a operação normal); a data
  // impossível virou aviso no cadastro do plano de pagamento da unidade.
  // Growth Ambiental: a conferência era dos planos de pagamento de unidades
  // imobiliárias, que saíram. Os vencimentos ficam em Contas a Receber.
  "planos-recebiveis": {
    rotaAntiga: "/diagnostico/planos-recebiveis",
    destino: "/contasreceber",
    parametro: "saiu",
    aviso:
      "A Conferência de planos de venda saiu (era das unidades imobiliárias). Os recebíveis e os vencimentos ficam aqui, em Contas a Receber.",
  },
  // Prompt AB2 (Fase 3, BAB-1): o Consolidado saiu. Growth Ambiental: a
  // Projeção de Receitas (por unidade) também saiu; o destino é o Painel de
  // Contratos. Aviso em `?saiu=` (as telas usam `?de=` como data).
  consolidado: {
    rotaAntiga: "/consolidado",
    destino: "/contratos/painel",
    parametro: "saiu",
    aviso:
      "A tela Consolidado saiu. A receita por contrato (contratado, medido, faturado e a receber) está aqui, no Painel de Contratos; a comparação entre versões fica na DRE. Para outra pergunta, abra a Cris.",
  },
  // Prompt AB2: o Balanço do Dia saiu; o histórico dos dias fechados mora no
  // Caixa (Prompt L2). O Caixa também usa `?de=` para data.
  balancodia: {
    rotaAntiga: "/balancodia",
    destino: "/caixa",
    parametro: "saiu",
    aviso:
      "A tela Balanço do Dia saiu. Os dias fechados ficam aqui no Caixa, em “Dias fechados”, com o mesmo filtro, impressão e exportação.",
  },
  // ── Growth Ambiental: módulos exclusivos de construção e incorporação ──
  // As telas saem; os dados gravados ficam (nada é apagado) e os relatórios
  // históricos continuam lendo o que já existe. Ver
  // docs/ADEQUACAO_FUNCIONAL_GROWTH_AMBIENTAL.md.
  unidades: {
    rotaAntiga: "/unidades",
    destino: "/contasreceber",
    parametro: "saiu",
    aviso:
      "O cadastro de unidades imobiliárias saiu: a receita vem dos contratos de serviço (Contratos → medições e faturamento) e é acompanhada aqui, em Contas a Receber.",
  },
  simulador: {
    rotaAntiga: "/simulador",
    destino: "/contratos",
    parametro: "saiu",
    aviso: "O simulador de financiamento imobiliário (SAC/PRICE) saiu. Condições de pagamento e reajuste ficam no cadastro de cada contrato.",
  },
  permuta: {
    rotaAntiga: "/permuta",
    destino: "/contasreceber",
    parametro: "saiu",
    aviso: "O módulo de permutas imobiliárias saiu. As receitas e os recebíveis ficam aqui, em Contas a Receber; os registros antigos continuam no histórico dos relatórios.",
  },
  parametros: {
    rotaAntiga: "/parametros",
    destino: "/contratos",
    parametro: "saiu",
    aviso: "A tabela de INCC saiu. O reajuste é do contrato: índice (IPCA, IGP-M, INPC) e data-base ficam no cadastro de cada contrato.",
  },
  medicao: {
    rotaAntiga: "/medicao",
    destino: "/contratos/medicoes",
    parametro: "saiu",
    aviso: "A Medição por grupo de obra e o Relatório CEF saíram. As medições de serviço são por contrato, item, aditivo e período, com aprovação e documentos — aqui.",
  },
  medicaolanc: {
    rotaAntiga: "/medicaolanc",
    destino: "/contratos/medicoes",
    parametro: "saiu",
    aviso: "O lançamento de medição por grupo de obra saiu. Lance a medição do serviço aqui, no contrato: item, período, quantidade ou percentual e valor.",
  },
  reembolso: {
    rotaAntiga: "/reembolso",
    destino: "/contratos/reembolsos",
    parametro: "saiu",
    aviso: "As Liberações de Obra (financiamento imobiliário) saíram. Despesas reembolsáveis pelo cliente ficam aqui, por contrato e projeto, com documentos e prestação de contas.",
  },
  projecao: {
    rotaAntiga: "/projecao",
    destino: "/contratos/painel",
    parametro: "saiu",
    aviso: "A Projeção de Receitas por unidade imobiliária saiu. A receita dos serviços — contratado, medido, faturado, recebido e a receber — está aqui, no Painel de Contratos; a comparação entre versões fica na DRE.",
  },
} as const;

export type TelaRemovida = keyof typeof TELAS_REMOVIDAS;

/** Aviso para o parâmetro `?de=` (ou `?saiu=`) do redirecionamento; null se não houver. */
export function avisoDeTelaRemovida(de: string | string[] | undefined | null): string | null {
  const id = Array.isArray(de) ? de[0] : de;
  if (!id || !Object.prototype.hasOwnProperty.call(TELAS_REMOVIDAS, id)) return null;
  return TELAS_REMOVIDAS[id as TelaRemovida].aviso;
}

/** Regras de redirecionamento no formato de `next.config.ts` (307, reversível). */
export function redirecionamentosDeTelasRemovidas() {
  return Object.entries(TELAS_REMOVIDAS).flatMap(([id, t]) => {
    const param = "parametro" in t ? t.parametro : "de";
    return [
      { source: t.rotaAntiga, destination: `${t.destino}?${param}=${id}`, permanent: false },
      { source: `${t.rotaAntiga}/:path*`, destination: `${t.destino}?${param}=${id}`, permanent: false },
    ];
  });
}
