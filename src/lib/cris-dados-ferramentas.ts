import type Anthropic from "@anthropic-ai/sdk";
import { CATEGORIAS_DRE } from "@/lib/calc/constants";
import { FONTES, COLUNAS, CENARIOS_RC } from "@/lib/relatorio-custom";

/**
 * Revisão 4, Etapa 7 — as DEFINIÇÕES das ferramentas de dados da Cris (só os
 * esquemas, sem banco). Quem executa é `src/lib/cris-dados.ts`, no servidor,
 * com o acesso da pessoa.
 */
export const MAX_GRUPOS = 30;

const PERIODO = {
  de: { type: "string", description: 'Competência inicial MM/AAAA, ou "".' },
  ate: { type: "string", description: 'Competência final MM/AAAA, ou "".' },
} as const;
const OBRAS = { obras: { type: "array", items: { type: "string" }, description: "Nomes das obras como a pessoa escreveu; vazio = todas as que ela vê." } } as const;

export const FERRAMENTAS_DE_DADOS: Anthropic.Tool[] = [
  {
    name: "custos_e_despesas_da_dre",
    description:
      "Custos e despesas da DRE (versão Atual, competência) por obra, por categoria da DRE e/ou por mês — os MESMOS números da DRE. Use para análises de custo (ex.: percentual de cada obra no custo variável). Categorias: " +
      CATEGORIAS_DRE.filter((c) => c !== "Receita").join(", ") +
      ".",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        ...OBRAS,
        ...PERIODO,
        categorias: { type: "array", items: { type: "string", enum: CATEGORIAS_DRE.filter((c) => c !== "Receita") }, description: "vazio = todas" },
        agrupar: { type: "string", enum: ["obra", "categoria", "obra_categoria", "mes", "obra_mes"] },
      },
      required: ["obras", "de", "ate", "categorias", "agrupar"],
    },
  },
  {
    name: "despesas_por_fornecedor_ou_situacao",
    description:
      "Despesas lançadas (versão Atual) agregadas por fornecedor, conta do plano (código e nome), subgrupo do plano (ex.: 2.3 Mobilização e logística), grupo superior do plano (ex.: 2 Custos diretos dos serviços), obra × conta, situação (paga, a pagar, vencida) ou obra, com filtro de competência e de situação. Mostra os maiores grupos. Use para 'quanto gastamos com hospedagem', 'maiores despesas de logística', 'quais contas concentram os custos', 'hospedagem por projeto'.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: { ...OBRAS, ...PERIODO, situacao: { type: "string", enum: ["todas", "pagas", "em_aberto", "vencidas"] }, agrupar: { type: "string", enum: ["fornecedor", "conta", "grupo_do_plano", "grupo_superior", "obra_conta", "situacao", "obra"] } },
      required: ["obras", "de", "ate", "situacao", "agrupar"],
    },
  },
  {
    name: "recebiveis_e_inadimplencia",
    description:
      "Parcelas de venda das unidades vendidas (versão Atual) e contas a receber lançadas: a receber, recebido pela conciliação e vencido, por obra, por unidade ou por mês. Vencida = venceu e não tem recebimento conciliado no Caixa (parcela paga mas não conciliada aparece como vencida: diga isso).",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: { ...OBRAS, ...PERIODO, agrupar: { type: "string", enum: ["obra", "unidade", "mes"] }, somente: { type: "string", enum: ["todas", "vencidas", "a_vencer"] } },
      required: ["obras", "de", "ate", "agrupar", "somente"],
    },
  },
  {
    name: "caixa_e_conciliacao",
    description: "Saldo de cada conta da empresa (em conta), quantos movimentos faltam conciliar por conta e o mais antigo, o baixado sem conciliar e o total de ajustes. É da empresa, não de uma obra.",
    input_schema: { type: "object", additionalProperties: false, properties: {} },
  },
  {
    name: "orcado_x_realizado",
    description: "Orçado (versão Orçamento) × realizado (versão Atual) por obra e/ou por categoria da DRE, na mesma competência, com a diferença e o percentual.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: { ...OBRAS, ...PERIODO, agrupar: { type: "string", enum: ["obra", "categoria", "obra_categoria"] } },
      required: ["obras", "de", "ate", "agrupar"],
    },
  },
  {
    name: "unidades_e_vendas",
    description: "Unidades da versão Atual por obra e situação (vendida, disponível...): quantidade, valor de tabela (VGV) e, nas vendidas, o total dos contratos.",
    input_schema: { type: "object", additionalProperties: false, properties: { ...OBRAS, agrupar: { type: "string", enum: ["obra", "situacao", "obra_situacao"] } }, required: ["obras", "agrupar"] },
  },
  {
    name: "medicao_estoque_equipes",
    description: "Medição (valor medido por obra, grupo ou mês), estoque (itens, saldo e valor por obra) ou equipes (pessoas e diárias por obra e função; nunca nome nem salário).",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: { ...OBRAS, ...PERIODO, assunto: { type: "string", enum: ["medicao", "estoque", "equipes"] }, agrupar: { type: "string", enum: ["obra", "grupo", "mes", "funcao"] } },
      required: ["obras", "de", "ate", "assunto", "agrupar"],
    },
  },
  {
    name: "contratos_e_saldos",
    description:
      "Contratos da empresa (Contratos e Aditivos): valor original e atualizado, aditivos (e os que ainda não têm efeito), medições, saldo a medir, prazos e vencimentos e, para quem tem acesso financeiro, faturado, recebido, medido não faturado, custo apropriado e margem gerencial. Filtra por código ou título do contrato. Medição não é receita; faturado vem das contas a receber do contrato.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        contratos: { type: "array", items: { type: "string" }, description: "Códigos (CT-000001) ou trechos do título; vazio = todos." },
        assunto: { type: "string", enum: ["resumo", "aditivos", "medicoes", "financeiro", "prazos"] },
        somente: { type: "string", enum: ["todos", "vigentes", "vencendo_60_dias"] },
      },
      required: ["contratos", "assunto", "somente"],
    },
  },
  {
    name: "plano_de_trabalho",
    description:
      "Plano de trabalho dos projetos (Projetos → Plano de Trabalho): fases, atividades, situação, prazos planejados e de linha de base, atrasos, reprogramações, entregas e marcos e progresso físico (só quando há base para consolidar; nunca presuma peso igual). Progresso físico é separado do financeiro. Não traz nome de pessoa.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: { ...OBRAS, assunto: { type: "string", enum: ["resumo", "atrasos", "entregas", "fases"] } },
      required: ["obras", "assunto"],
    },
  },
  {
    name: "plano_de_contas",
    description:
      "Plano de Contas da empresa (só as contas DELA). assunto: 'sugerir' = contas candidatas para classificar um lançamento pela descrição (só contas ativas; a pessoa confirma no formulário); 'explicar' = finalidade, categoria da DRE, classe gerencial e custo padrão de uma conta; 'estrutura' = grupos e contas (filtro por texto); 'duplicidades' = pares de contas com nomes muito parecidos; 'sem_classificacao' = despesas da versão Atual sem conta ou com conta fora do plano; 'pouco_uso' = contas ativas de despesa com menos lançamentos (inclui as sem uso). Projeto, contrato, fase e modalidade NÃO são contas.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        assunto: { type: "string", enum: ["sugerir", "explicar", "estrutura", "duplicidades", "sem_classificacao", "pouco_uso"] },
        texto: { type: "string", description: "Descrição do lançamento (sugerir), código da conta (explicar) ou filtro (estrutura); vazio nos demais." },
        natureza: { type: "string", enum: ["despesa", "receita"] },
      },
      required: ["assunto", "texto", "natureza"],
    },
  },
  {
    name: "montar_relatorio",
    description:
      "Monta um relatório exportável em Relatórios Customizados (CSV e PDF) com a DRE, a DRE por categoria e grupo, ou o Fluxo de Caixa previsto; por cenário, mês a mês ou por obra. Devolve o link para a pessoa abrir; escreva-o como link markdown.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        titulo: { type: "string" },
        fonte: { type: "string", enum: [...FONTES] },
        colunas: { type: "string", enum: [...COLUNAS] },
        cenarios: { type: "array", items: { type: "string", enum: [...CENARIOS_RC] } },
        obra: { type: "string", description: 'Nome da obra, ou "" para todas.' },
        ...PERIODO,
        analiseVertical: { type: "boolean" },
      },
      required: ["titulo", "fonte", "colunas", "cenarios", "obra", "de", "ate", "analiseVertical"],
    },
  },
];

export const NOMES_DAS_FERRAMENTAS_DE_DADOS = new Set(FERRAMENTAS_DE_DADOS.map((f) => f.name));
