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
const OBRAS = { obras: { type: "array", items: { type: "string" }, description: "Nomes dos PROJETOS como a pessoa escreveu; vazio = todos os que ela vê." } } as const;
/** O valor "obra" dos agrupamentos é o PROJETO (o identificador ficou; o texto ao modelo diz projeto). */
const AGRUPAR_OBRA = 'Valores com "obra" agrupam por projeto.';

export const FERRAMENTAS_DE_DADOS: Anthropic.Tool[] = [
  {
    name: "custos_e_despesas_da_dre",
    description:
      "Custos e despesas da DRE (versão Atual, competência) por projeto, por categoria da DRE e/ou por mês — os MESMOS números da DRE. Use para análises de custo (ex.: percentual de cada projeto no custo variável). Categorias: " +
      CATEGORIAS_DRE.filter((c) => c !== "Receita").join(", ") +
      ".",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        ...OBRAS,
        ...PERIODO,
        categorias: { type: "array", items: { type: "string", enum: CATEGORIAS_DRE.filter((c) => c !== "Receita") }, description: "vazio = todas" },
        agrupar: { type: "string", enum: ["obra", "categoria", "obra_categoria", "mes", "obra_mes"], description: AGRUPAR_OBRA },
      },
      required: ["obras", "de", "ate", "categorias", "agrupar"],
    },
  },
  {
    name: "despesas_por_fornecedor_ou_situacao",
    description:
      "Despesas lançadas (versão Atual) agregadas por fornecedor, conta do plano (código e nome), subgrupo do plano (ex.: 2.3 Mobilização e logística), grupo superior do plano (ex.: 2 Custos diretos dos serviços), projeto × conta, situação (paga, a pagar, vencida) ou projeto, com filtro de competência e de situação. Mostra os maiores grupos. Use para 'quanto gastamos com hospedagem', 'maiores despesas de logística', 'quais contas concentram os custos', 'hospedagem por projeto'.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: { ...OBRAS, ...PERIODO, situacao: { type: "string", enum: ["todas", "pagas", "em_aberto", "vencidas"] }, agrupar: { type: "string", enum: ["fornecedor", "conta", "grupo_do_plano", "grupo_superior", "obra_conta", "situacao", "obra"], description: AGRUPAR_OBRA } },
      required: ["obras", "de", "ate", "situacao", "agrupar"],
    },
  },
  {
    name: "recebiveis_e_inadimplencia",
    description:
      "Contas a receber (faturas dos contratos e recebíveis lançados) da empresa: em aberto, vencido e a vencer, por projeto, por cliente contratante ou por mês de vencimento. Vencida = venceu e não foi recebida. Recebido é o que entrou; medição aprovada ainda não faturada não aparece aqui (veja contratos_e_saldos).",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: { ...OBRAS, ...PERIODO, agrupar: { type: "string", enum: ["obra", "cliente", "mes"], description: AGRUPAR_OBRA }, somente: { type: "string", enum: ["todas", "vencidas", "a_vencer"] } },
      required: ["obras", "de", "ate", "agrupar", "somente"],
    },
  },
  {
    name: "caixa_e_conciliacao",
    description: "Saldo de cada conta da empresa (em conta), quantos movimentos faltam conciliar por conta e o mais antigo, o baixado sem conciliar e o total de ajustes. É da empresa, não de um projeto.",
    input_schema: { type: "object", additionalProperties: false, properties: {} },
  },
  {
    name: "orcado_x_realizado",
    description: "Orçado (versão Orçamento) × realizado (versão Atual) por projeto e/ou por categoria da DRE, na mesma competência, com a diferença e o percentual.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: { ...OBRAS, ...PERIODO, agrupar: { type: "string", enum: ["obra", "categoria", "obra_categoria"], description: AGRUPAR_OBRA } },
      required: ["obras", "de", "ate", "agrupar"],
    },
  },
  {
    name: "medicao_estoque_equipes",
    description: "Medições de serviço dos contratos (valor medido por projeto, por contrato ou por mês, com a situação: rascunho, enviada, aprovada…), materiais e equipamentos de campo (movimentos e valor por projeto) ou equipes e presença de campo (pessoas e diárias por projeto e função; nunca nome nem salário).",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: { ...OBRAS, ...PERIODO, assunto: { type: "string", enum: ["medicao", "estoque", "equipes"] }, agrupar: { type: "string", enum: ["obra", "contrato", "situacao", "mes", "funcao"], description: AGRUPAR_OBRA } },
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
      "Monta um relatório exportável em Relatórios Customizados (CSV e PDF) com a DRE, a DRE por categoria e grupo, ou o Fluxo de Caixa previsto; por cenário, mês a mês ou por projeto (colunas obra). Devolve o link para a pessoa abrir; escreva-o como link markdown.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        titulo: { type: "string" },
        fonte: { type: "string", enum: [...FONTES] },
        colunas: { type: "string", enum: [...COLUNAS] },
        cenarios: { type: "array", items: { type: "string", enum: [...CENARIOS_RC] } },
        obra: { type: "string", description: 'Nome do projeto, ou "" para todos.' },
        ...PERIODO,
        analiseVertical: { type: "boolean" },
      },
      required: ["titulo", "fonte", "colunas", "cenarios", "obra", "de", "ate", "analiseVertical"],
    },
  },
];

export const NOMES_DAS_FERRAMENTAS_DE_DADOS = new Set(FERRAMENTAS_DE_DADOS.map((f) => f.name));
