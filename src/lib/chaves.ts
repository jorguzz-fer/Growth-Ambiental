/**
 * Catálogo das chaves de mudança por empresa (V2-BLOQUEIOS B4; regra 3.3 do
 * pacote V2). Puro, sem banco.
 *
 * Regra: mudança que altera número de relatório ou acesso em produção entra
 * atrás de uma chave DESLIGADA. Com ela desligada, o sistema devolve
 * exatamente o de hoje. Liga-se por empresa, depois de ver a prévia.
 *
 * Toda chave nova entra AQUI, com o que ela muda e onde está a prévia. Chave
 * gravada no banco que não está no catálogo é ignorada (vale desligada).
 */
export interface Chave {
  id: string;
  titulo: string;
  /** O que muda quando liga, em uma ou duas frases. */
  efeito: string;
  /** De onde vem a regra (prompt e seção). */
  origem: string;
  /** Tela onde está a prévia do efeito, conferida antes de ligar. */
  previa: { href: string; rotulo: string };
}

export const CHAVES = [
  {
    id: "membro_padrao_restrito",
    titulo: "Padrão novo do papel “membro”",
    efeito:
      "O membro passa a alcançar só as telas de lançamento e receita. Telas personalizadas na Gestão de Acessos continuam como estão.",
    origem: "Prompt AJ, Parte 1 (1.4)",
    previa: { href: "/acessos", rotulo: "Gestão de Acessos — quem perde o quê" },
  },
  {
    id: "contas_pagar_so_atual",
    titulo: "Contas a Pagar só com a versão Atual",
    efeito:
      "Despesas gravadas em Orçamento, Previsão ou versão copiada deixam de contar como obrigação — em Contas a Pagar, no Dashboard, no Fechamento e na conciliação do extrato. Nada é apagado: elas continuam nas versões delas.",
    origem: "Prompt I, §10",
    previa: { href: "/contaspagar#previa", rotulo: "Contas a Pagar — as linhas de planejamento que deixam de aparecer" },
  },
  {
    id: "restituicao_segue_despesa",
    titulo: "Saída da restituição segue a despesa",
    efeito:
      "A saída de caixa de uma restituição avulsa (e o estorno dela) cai no projeto da despesa restituída; a entrada de um repasse cai no projeto do recebimento. Antes, caíam no projeto aberto na tela. Só daqui em diante: nada já lançado muda. O lote continua no projeto da tela até a decisão B11.",
    origem: "Prompt I, §21 (decisão B11, opção 2)",
    previa: { href: "/restituicoes#previa", rotulo: "Restituições — em que projeto cairão as próximas saídas" },
  },
  {
    id: "rascunho_fora_dos_relatorios",
    titulo: "Orçamento em Rascunho não entra em relatório",
    efeito:
      "Versões de Orçamento e Previsão Atualizada que não estejam Aprovadas deixam de alimentar DRE, Fluxo de Caixa, Dashboard, Projeção, Resumo, Medição e Contabilidade. A versão Atual (movimento real) nunca é filtrada. Nada é apagado: o rascunho continua nas telas de edição.",
    origem: "Prompt H, seções 1 e 5",
    previa: { href: "/chaves#previa-rascunho", rotulo: "Lista de conferência — o que sairia dos relatórios" },
  },
  {
    id: "dre_definicao_nova",
    titulo: "DRE pela definição nova",
    efeito:
      "Na DRE (e no card Orçado x Realizado de Projetos): despesa classificada como “Receita” deixa de somar na receita e passa a ser listada à parte; multa, juros e outros encargos entram na competência da despesa que os gerou, não no mês do pagamento; na Empresa toda, projeto sem o cenário escolhido fica fora da coluna (antes entrava com o Realizado); o período personalizado com limite aberto passa a usar o eixo do projeto. Nada é gravado nem reclassificado.",
    origem: "Prompt AC, Partes 2, 3.1, 1.3 e 10",
    previa: { href: "/chaves#previa-dre", rotulo: "Prévia — resultado de hoje × definição nova, por projeto e competência" },
  },
  {
    id: "fluxo_definicao_nova",
    titulo: "Fluxo de Caixa pela definição nova",
    efeito:
      "No Fluxo de Caixa: o realizado vem sempre da versão Atual (antes, da primeira versão marcada); a permuta deixa de somar nas colunas de Orçamento e Previsão; projeto sem Atual mostra a ausência em vez de usar outra versão; o saldo acumulado de um projeto parte do caixa dele (não das contas da empresa) e corre pelo realizado nos meses fechados. Nada é gravado.",
    origem: "Prompt AD, Partes 1, 2 e BAD-1 (8.1)",
    previa: { href: "/chaves#previa-fluxo", rotulo: "Prévia — saldo e acumulado de hoje × definição nova, por projeto" },
  },
  {
    id: "dashboard_definicao_nova",
    titulo: "Dashboard pela definição nova",
    efeito:
      "No Dashboard: \"Entradas de caixa\" soma só a versão Atual (antes, todas as versões do projeto); \"Executado\" é dividido por UM Orçamento, o mais recente que não é cópia (antes, a soma de todos); a margem usa a mesma janela de competências na receita e nos custos; o VGV vem da Atual em toda coluna; \"A receber\" do planejamento mostra o negativo; e os painéis de status passam a seguir o período. Nada é gravado.",
    origem: "Prompt AA, 4-B.1, 4-B.2, 4-B.3, 4.5, 4.2 e 2.3.2 (10.2)",
    previa: { href: "/chaves#previa-dashboard", rotulo: "Prévia — cada cartão hoje × definição nova, por projeto" },
  },
  {
    id: "resumo_definicao_nova",
    titulo: "Resumo Executivo pela definição nova",
    efeito:
      "No Resumo Executivo: os sinais S1, S2 e S3 multiplicam pela quantidade (como o Ato e como a Projeção); permuta e liberação canceladas saem dos totais; a permuta por tipo compara com o cadastro e mostra \"outros tipos\" (a soma fecha); unidades Permutadas aparecem e o Total é a contagem de unidades; e a tela ganha os blocos Vendas, Exposição e Atenção. Nada é gravado.",
    origem: "Prompt AE, Partes 1, 2.3, 2.4, 2.6 e 2.7 (seção 6)",
    previa: { href: "/chaves#previa-resumo", rotulo: "Prévia — os indicadores de hoje × definição nova, por projeto" },
  },
  {
    id: "despesa_categoria_do_plano",
    titulo: "Despesa herda a categoria da DRE do Plano de Contas",
    efeito:
      "Cada despesa passa a usar a categoria da DRE da sua conta no Plano de Contas: no lançamento, o campo aparece travado; nos relatórios (DRE e card Orçado x Realizado), as despesas já lançadas contam pela categoria da conta. Nada é regravado: desligar volta à categoria escolhida em cada despesa. Antes de ligar, confira no Plano de Contas a categoria de cada conta.",
    origem: "Prompt DP (Fase 3, BDP-1 a BDP-3)",
    previa: { href: "/chaves#previa-categoria", rotulo: "Prévia — despesas que mudam de categoria, por conta" },
  },
  {
    id: "orcamento_categoria_do_plano",
    titulo: "Orçamento usa a categoria da DRE do Plano de Contas",
    efeito:
      "Linha NOVA de Orçamento/Previsão (um grupo do Plano de Contas) passa a nascer com a categoria da DRE que todas as contas ativas do grupo têm, em vez do padrão por tipo (custo direto = Custo Variável; o resto = Despesa Fixa). Linhas já gravadas mantêm a categoria delas. Empresa nova já nasce com a chave ligada.",
    origem: "Plano de Contas para consultorias ambientais (§9)",
    previa: { href: "/planocontas#previa-orcamento", rotulo: "Plano de Contas — grupos cuja categoria de orçamento muda" },
  },
  {
    id: "incc_por_empresa",
    titulo: "INCC da empresa: uma série para todos os projetos",
    efeito:
      "Todos os projetos passam a ler a série do INCC da empresa (adotada na tela de INCC a partir da série de um projeto) onde o INCC corrige as parcelas: Caixa, comparação da Projeção e Simulador. O seletor de projeto sai da tela de INCC. As séries de cada projeto ficam guardadas, sem alteração: desligar volta a elas. Sem série da empresa adotada, ligar não muda nada.",
    origem: "Prompt Q2 (Fase 3, BQ2-1)",
    previa: { href: "/chaves#previa-incc", rotulo: "Prévia — projetos cuja série difere da série da empresa" },
  },
  {
    id: "plano_definicao_nova",
    titulo: "Plano de pagamento pela definição nova (caixa)",
    efeito:
      "Nos recebíveis das vendas (Contas a Receber, Fluxo de Caixa, Caixa, \"A receber\" do Dashboard e Projeção): só contam as seções do plano com a caixinha \"Usar\" marcada; o financiamento do banco sai (o dinheiro chega como liberação de obra); a permuta do plano sai (não é dinheiro). Na Projeção, o subsídio ainda não recebido entra como previsto. O INCC continua só na Projeção. Nada é gravado. Antes de ligar, confira na prévia as unidades com seção preenchida e caixinha desmarcada: elas perdem essas parcelas até a caixinha ser marcada na tela de Unidades.",
    origem: "Prompt AR, Fase 2 (BAR-1 a BAR-5, decisões de 11/11/2026)",
    previa: { href: "/chaves#previa-plano", rotulo: "Prévia — recebíveis de hoje × definição nova, e as unidades a conferir" },
  },
  {
    id: "dre_receita_rateio",
    titulo: "Receita da DRE pelo rateio do contrato",
    efeito:
      "Na DRE (e onde ela aparece: DRE Analítica, gráfico do Dashboard, card Orçado x Realizado de Projetos), a receita da versão Atual passa a ser o total do contrato de cada unidade vendida (soma do plano de pagamento, só as seções com a caixinha \"Usar\" marcada), dividido igualmente pelos meses do projeto, inclusive os que já passaram: cada venda nova revisa a DRE dos meses anteriores. Somam-se as contas a receber lançadas. Saem da receita da DRE as parcelas pelo vencimento, as liberações de obra e a revenda da permuta (o bem já está no contrato). O caixa (Fluxo, Contas a Receber, Caixa) não muda. Nada é gravado.",
    origem: "Prompt AR, Fase 2 (BAR-6 e decisões de 11/11/2026); Prompt I, §54 e §57",
    previa: { href: "/chaves#previa-rateio", rotulo: "Prévia — receita da DRE de hoje × rateio, por projeto, e as pendências" },
  },
  {
    id: "caixa_conciliacao_por_conta",
    titulo: "Caixa: conciliação por conta, sem projeto no extrato",
    efeito:
      "O Caixa vira a tela de conciliação da empresa: saem o seletor de projeto, o de versão e o modo comparação; a tela mostra a versão Atual de todos os projetos; os cartões entram no bloco de saldos e cada conta ou cartão vira o filtro da tela. O extrato importado (e o do Open Finance) passa a nascer só com a conta: o projeto de cada movimento vem do vínculo (a despesa, a conta a receber ou a parcela com que foi conciliado). Movimento sem vínculo aparece no realizado da empresa como \"não atribuído a projeto\". Os movimentos que já existem mantêm o projeto que têm: nenhum número antigo muda.",
    origem: "Prompt AT, seções 3 e 4 (decisão do dono de 08/11/2026)",
    previa: { href: "/chaves#previa-caixa-conta", rotulo: "Prévia — movimentos e pendências por conta, e os movimentos sem projeto" },
  },
  {
    id: "parcela_recebida_situacao",
    titulo: "Parcela do comprador: situação, atrasados e previsto do Fluxo",
    efeito:
      "As parcelas de venda passam a ter situação em Contas a Receber (a vencer, recebida, parcial, vencida), pelos recebimentos conciliados no Caixa. A faixa do Caixa passa a contar nos atrasados as parcelas vencidas e não recebidas. No Fluxo de Caixa, a parte recebida da parcela sai do previsto (ela já está no realizado, pela entrada do extrato). Atenção: parcela antiga paga mas nunca conciliada aparece como vencida até ser conciliada. Conciliar a parcela no Caixa não depende desta chave.",
    origem: "Prompt AT, seção 5.3, e BAT-6 (decisão do dono de 12/11/2026)",
    previa: { href: "/chaves#previa-parcela", rotulo: "Prévia — parcelas vencidas sem recebimento, por projeto" },
  },
] as const satisfies readonly Chave[];

export type ChaveId = (typeof CHAVES)[number]["id"];

export function ehChave(id: unknown): id is ChaveId {
  return typeof id === "string" && CHAVES.some((c) => c.id === id);
}

/** Estado vindo do banco → só as chaves do catálogo que estão ligadas. */
export function chavesLigadasDe(linhas: readonly { chave: string; ligada: boolean }[]): Set<ChaveId> {
  const out = new Set<ChaveId>();
  for (const l of linhas) if (l.ligada && ehChave(l.chave)) out.add(l.chave);
  return out;
}
