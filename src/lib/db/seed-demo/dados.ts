/**
 * Catálogo da empresa de DEMONSTRAÇÃO (consultoria ambiental), com EXATAMENTE
 * cinco projetos de portes, prazos, equipes e situações diferentes.
 *
 * Tudo aqui é FICTÍCIO: empresas, pessoas, municípios e documentos foram
 * inventados para a demonstração. CPFs e CNPJs são sintéticos (raiz 000.000.xxx
 * / 00.000.xxx), com dígitos verificadores válidos só para passar nas
 * validações do app — não pertencem a ninguém.
 *
 * As datas são RELATIVAS ao dia em que o seed roda: o mês 0 é 12 meses antes
 * do mês corrente (o mês corrente é o 12). `inicio` de cada projeto é absoluto;
 * os meses de custos, equipes e fases são RELATIVOS ao início do projeto.
 *
 * Os valores-alvo de Budget e Forecast (receita e custo) são os da matriz da
 * demonstração. O seed distribui esses totais por subgrupo do plano de contas
 * e por mês, e o Forecast é montado a partir do REALIZADO (as despesas que o
 * seed lança pelas ações do app) mais a reprojeção dos meses seguintes.
 */

/** Nomes que a empresa de demonstração já teve (só para IDENTIFICAR; apagar exige o id). */
export const NOMES_ANTERIORES = ["Veredas Consultoria Ambiental"];
/** E-mails da equipe em versões anteriores (removidos na recriação, se ficarem sem empresa). */
export const EMAILS_ANTERIORES = ["helena.duarte", "fernanda.rocha", "rafael.moura"].map((u) => `${u}@veredas-ambiental.exemplo`);

export const EMPRESA = {
  nome: "Consultoria Ambiental",
  nomeFantasia: "Consultoria Ambiental",
  municipio: "Curitiba",
  uf: "PR",
  cnae: "7119-7/03",
};

// ─────────────────────────────── documentos ───────────────────────────────

function dvCnpj(base12: string): string {
  const calc = (s: string, pesos: number[]) => {
    const soma = s.split("").reduce((a, d, i) => a + Number(d) * pesos[i], 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(base12 + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${d1}${d2}`;
}
/** CNPJ sintético e válido: 00.000.<n>/0001-DV. */
export function cnpj(n: number): string {
  const raiz = `00000${String(n).padStart(3, "0")}0001`;
  const d = raiz + dvCnpj(raiz);
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
function dvCpf(base9: string): string {
  const calc = (s: string) => {
    const soma = s.split("").reduce((a, d, i) => a + Number(d) * (s.length + 1 - i), 0);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = calc(base9);
  return `${d1}${calc(base9 + d1)}`;
}
/** CPF sintético e válido: 000.000.<n>-DV. */
export function cpf(n: number): string {
  const base = `000000${String(n).padStart(3, "0")}`;
  const d = base + dvCpf(base);
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// ─────────────────────────────── cadastros ───────────────────────────────

export const CLIENTES = [
  { chave: "rodovia", nome: "Concessionária Rodovia das Araucárias S.A.", doc: cnpj(101), cidade: "Ponta Alta / PR", email: "meioambiente@rodoviaaraucarias.exemplo", ramo: "Concessão rodoviária" },
  { chave: "quimica", nome: "Química Araucária Indústria e Comércio Ltda", doc: cnpj(103), cidade: "Araucária / PR", email: "sesmt@quimicaaraucaria.exemplo", ramo: "Indústria química" },
  { chave: "eolica", nome: "Ventos do Sul Energia Renovável S.A.", doc: cnpj(104), cidade: "Campos Altos do Sul / RS", email: "licenciamento@ventosdosul.exemplo", ramo: "Energia eólica" },
  { chave: "incorporadora", nome: "Horizonte Verde Empreendimentos Imobiliários Ltda", doc: cnpj(105), cidade: "São José dos Pinhais / PR", email: "projetos@horizonteverde.exemplo", ramo: "Incorporação imobiliária" },
  { chave: "mina", nome: "Mineração Serra do Cobre S.A.", doc: cnpj(102), cidade: "Ouro Branco do Sul / MG", email: "meioambiente@serradocobre.exemplo", ramo: "Mineração" },
  { chave: "saneamento", nome: "Companhia de Saneamento Vale Verde", doc: cnpj(106), cidade: "Vale Verde / PR", email: "contratos@valeverde.exemplo", ramo: "Saneamento" },
] as const;
export type ChaveCliente = (typeof CLIENTES)[number]["chave"];

/**
 * 24 fornecedores. Os 11 primeiros são PRESTADORES TÉCNICOS TERCEIRIZADOS
 * (entram nas equipes como terceiros: papel de serviço ou mão de obra RPA);
 * os demais são fornecedores de logística, materiais, sede e governo.
 */
export const FORNECEDORES = [
  { chave: "arqueologo", nome: "André Kowalski Neto (arqueólogo autônomo)", tipo: "PF", doc: cpf(301), papeis: ["Mão de Obra RPA", "Consultor/Assessor"], cidade: "Curitiba", estado: "PR", terceiro: true },
  { chave: "arqueosul", nome: "Arqueo Sul Pesquisa e Patrimônio Ltda", tipo: "PJ", doc: cnpj(201), papeis: ["Prestador de Serviço"], cidade: "Curitiba", estado: "PR", terceiro: true },
  { chave: "campoforte", nome: "Campo Forte Serviços Técnicos de Campo Ltda", tipo: "PJ", doc: cnpj(202), papeis: ["Prestador de Serviço"], cidade: "Ponta Grossa", estado: "PR", terceiro: true },
  { chave: "aeromapa", nome: "AeroMapa Geotecnologia Ltda", tipo: "PJ", doc: cnpj(205), papeis: ["Prestador de Serviço", "Empresa de Tecnologia"], cidade: "Curitiba", estado: "PR", terceiro: true },
  { chave: "hidrolab", nome: "Hidrolab Análises Ambientais Ltda", tipo: "PJ", doc: cnpj(203), papeis: ["Prestador de Serviço"], cidade: "Curitiba", estado: "PR", terceiro: true },
  { chave: "biotasul", nome: "Biota Sul Consultoria em Fauna Ltda", tipo: "PJ", doc: cnpj(206), papeis: ["Prestador de Serviço", "Consultor/Assessor"], cidade: "Porto Alegre", estado: "RS", terceiro: true },
  { chave: "biologa", nome: "Marina Teixeira Lacerda (bióloga consultora)", tipo: "PF", doc: cpf(302), papeis: ["Mão de Obra RPA", "Consultor/Assessor"], cidade: "Florianópolis", estado: "SC", terceiro: true },
  { chave: "avis", nome: "Avis Monitoramento de Avifauna Ltda", tipo: "PJ", doc: cnpj(207), papeis: ["Prestador de Serviço"], cidade: "Porto Alegre", estado: "RS", terceiro: true },
  { chave: "botanico", nome: "Renato Albuquerque Siqueira (botânico)", tipo: "PF", doc: cpf(303), papeis: ["Mão de Obra RPA", "Consultor/Assessor"], cidade: "Curitiba", estado: "PR", terceiro: true },
  { chave: "ecotec", nome: "Ecotec Consultoria em Gestão Ambiental Ltda", tipo: "PJ", doc: cnpj(208), papeis: ["Prestador de Serviço", "Consultor/Assessor"], cidade: "Belo Horizonte", estado: "MG", terceiro: true },
  { chave: "socio", nome: "Lívia Prado Consultoria Socioeconômica Ltda", tipo: "PJ", doc: cnpj(209), papeis: ["Prestador de Serviço", "Consultor/Assessor"], cidade: "Belo Horizonte", estado: "MG", terceiro: true },
  { chave: "locadora", nome: "Rota Campo Locação de Veículos 4x4 Ltda", tipo: "PJ", doc: cnpj(210), papeis: ["Prestador de Serviço"], cidade: "Curitiba", estado: "PR", terceiro: false },
  { chave: "posto", nome: "Auto Posto Rodovia Verde Ltda", tipo: "PJ", doc: cnpj(211), papeis: ["Fornecedor de Material"], cidade: "Campo Largo", estado: "PR", terceiro: false },
  { chave: "hotel", nome: "Hotel Pousada do Viajante Ltda", tipo: "PJ", doc: cnpj(212), papeis: ["Fornecedor de Material"], cidade: "Ponta Alta", estado: "PR", terceiro: false },
  { chave: "insumos", nome: "Coleta Certa Materiais de Campo Ltda", tipo: "PJ", doc: cnpj(213), papeis: ["Fornecedor de Material"], cidade: "Curitiba", estado: "PR", terceiro: false },
  { chave: "grafica", nome: "Gráfica Folha Nova Ltda", tipo: "PJ", doc: cnpj(214), papeis: ["Fornecedor de Material"], cidade: "Curitiba", estado: "PR", terceiro: false },
  { chave: "imobiliaria", nome: "Condomínio Empresarial Batel Office", tipo: "PJ", doc: cnpj(215), papeis: ["Fornecedor de Material"], cidade: "Curitiba", estado: "PR", terceiro: false },
  { chave: "contabil", nome: "Exata Contabilidade e Assessoria Ltda", tipo: "PJ", doc: cnpj(216), papeis: ["Escritório Contábil"], cidade: "Curitiba", estado: "PR", terceiro: false },
  { chave: "software", nome: "GeoSoft Licenciamento de Software Ltda", tipo: "PJ", doc: cnpj(217), papeis: ["Empresa de Tecnologia"], cidade: "São Paulo", estado: "SP", terceiro: false },
  { chave: "telecom", nome: "ConectaNet Telecomunicações Ltda", tipo: "PJ", doc: cnpj(218), papeis: ["Empresa de Tecnologia"], cidade: "Curitiba", estado: "PR", terceiro: false },
  { chave: "beneficios", nome: "VidaPlena Benefícios e Saúde Ltda", tipo: "PJ", doc: cnpj(219), papeis: ["Fornecedor de Material"], cidade: "Curitiba", estado: "PR", terceiro: false },
  { chave: "orgao", nome: "Instituto Estadual de Meio Ambiente (taxas)", tipo: "PJ", doc: cnpj(220), papeis: ["Órgão Público"], cidade: "Curitiba", estado: "PR", terceiro: false },
  { chave: "conselho", nome: "Conselho Regional de Engenharia (anuidades e ART)", tipo: "PJ", doc: cnpj(221), papeis: ["Órgão Público"], cidade: "Curitiba", estado: "PR", terceiro: false },
  { chave: "governo", nome: "Receita Federal — Simples Nacional (DAS)", tipo: "PJ", doc: cnpj(222), papeis: ["Órgão Público"], cidade: "Brasília", estado: "DF", terceiro: false },
] as const;
export type ChaveFornecedor = (typeof FORNECEDORES)[number]["chave"];

/**
 * 11 funcionários CLT (fictícios). `admissao` é o mês de admissão (pode ser
 * negativo: antes do histórico). O custo-hora do pessoal próprio é o salário
 * mais FGTS (8%) e benefícios (15%), sobre 168 horas no mês.
 */
export const FUNCIONARIOS = [
  { nome: "Helena Martins Duarte", cargo: "Diretora técnica — engenheira ambiental", setor: "Diretoria", salario: 16500, admissao: -60 },
  { nome: "Rafael Tavares Moura", cargo: "Coordenador de projetos", setor: "Técnico", salario: 13200, admissao: -40 },
  { nome: "Gustavo Lemos Barreto", cargo: "Arqueólogo sênior", setor: "Técnico", salario: 11800, admissao: 2 },
  { nome: "Aline Souza Vasconcelos", cargo: "Arqueóloga", setor: "Técnico", salario: 8900, admissao: 2 },
  { nome: "Camila Ferraz Lopes", cargo: "Bióloga sênior — fauna", setor: "Técnico", salario: 10800, admissao: 2 },
  { nome: "Juliana Ribeiro Antunes", cargo: "Especialista em flora — engenheira florestal", setor: "Técnico", salario: 9400, admissao: 5 },
  { nome: "Marcos Vinícius Pacheco", cargo: "Analista de geoprocessamento", setor: "Técnico", salario: 7600, admissao: 2 },
  { nome: "Patrícia Gomes Salles", cargo: "Analista ambiental", setor: "Técnico", salario: 7200, admissao: 2 },
  { nome: "Diego Santana Freitas", cargo: "Técnico de campo", setor: "Campo", salario: 4600, admissao: 2 },
  { nome: "Bruna Carvalho Mendes", cargo: "Assistente técnica", setor: "Campo", salario: 4200, admissao: 2 },
  { nome: "Fernanda Lima Rocha", cargo: "Analista administrativo-financeira", setor: "Administrativo", salario: 6200, admissao: -36 },
] as const;
export type NomeFuncionario = (typeof FUNCIONARIOS)[number]["nome"];
/** Encargos (FGTS) e benefícios sobre o salário: compõem o custo-hora e a folha apropriada. */
export const FATOR_ENCARGOS = 0.08;
export const FATOR_BENEFICIOS = 0.15;
export const HORAS_MES = 168;
export function custoHora(salario: number): number {
  return Math.round(((salario * (1 + FATOR_ENCARGOS + FATOR_BENEFICIOS)) / HORAS_MES) * 100) / 100;
}

/** Membros da equipe com login (sem senha: só aparecem em Usuários). */
export const EQUIPE_COM_ACESSO = [
  { nome: "Helena Martins Duarte", email: "helena.duarte@consultoria-ambiental.exemplo", role: "admin" },
  { nome: "Fernanda Lima Rocha", email: "fernanda.rocha@consultoria-ambiental.exemplo", role: "membro" },
  { nome: "Rafael Tavares Moura", email: "rafael.moura@consultoria-ambiental.exemplo", role: "engenheiro" },
] as const;

/**
 * Materiais de estoque. A compra é custo do projeto que recebe o lote
 * (`projeto`, mês absoluto); a saída para campo não gera custo (só movimenta).
 */
export const ESTOQUE = [
  { nome: "Saco plástico de coleta 30x40 (caixa c/ 100)", unidade: "cx", categoria: "Coleta", custo: 38, minimo: 10 },
  { nome: "Etiqueta de identificação resistente (rolo)", unidade: "rolo", categoria: "Coleta", custo: 46, minimo: 8 },
  { nome: "Frasco com álcool 70% para preservação 500 mL", unidade: "un", categoria: "Coleta", custo: 12.5, minimo: 60 },
  { nome: "Luva nitrílica (caixa c/ 100)", unidade: "cx", categoria: "EPI", custo: 42, minimo: 10 },
  { nome: "Bota de PVC cano longo", unidade: "par", categoria: "EPI", custo: 68, minimo: 6 },
  { nome: "Perneira de proteção contra picadas", unidade: "par", categoria: "EPI", custo: 95, minimo: 6 },
  { nome: "Colete refletivo de campo", unidade: "un", categoria: "EPI", custo: 38, minimo: 10 },
  { nome: "Fita zebrada de sinalização (rolo)", unidade: "rolo", categoria: "Campo", custo: 12.5, minimo: 20 },
] as const;
export const COMPRAS_DE_ESTOQUE: { mes: number; categoria: "Coleta" | "EPI" | "Campo"; projeto: string; conta: string; multiplo: number }[] = [
  { mes: 2, categoria: "EPI", projeto: "arqueologia", conta: "2.4.07", multiplo: 2.5 },
  { mes: 2, categoria: "Campo", projeto: "arqueologia", conta: "2.4.03", multiplo: 3 },
  { mes: 5, categoria: "Coleta", projeto: "fauna", conta: "2.4.04", multiplo: 3 },
  { mes: 8, categoria: "EPI", projeto: "gestao", conta: "2.4.07", multiplo: 2 },
  { mes: 10, categoria: "Coleta", projeto: "fauna", conta: "2.4.04", multiplo: 2 },
];
export function valorDaCompra(c: (typeof COMPRAS_DE_ESTOQUE)[number]): number {
  return Math.round(ESTOQUE.filter((e) => e.categoria === c.categoria).reduce((a, e) => a + Math.round(e.minimo * c.multiplo) * e.custo, 0) * 100) / 100;
}

// ─────────────────────────────── projetos e contratos ───────────────────────────────

/**
 * Item de contrato com cronograma de medição. `medicoes` lista [mês ABSOLUTO,
 * valor]: percentual (0–100) para "percentual", quantidade para
 * "quantidade"/"entrega". Mês corrente (12): medição enviada, em análise.
 * Meses futuros: só cronograma (orçamento e previsão).
 */
export interface ItemDemo {
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  criterio: "percentual" | "quantidade" | "entrega";
  etapa: string;
  medicoes: [number, number][];
}

/**
 * Linha de custo do projeto (não inclui a folha CLT, que vem das horas).
 * `valor` por ocorrência; `meses` relativos ao início. `via`:
 *  · "despesa" (padrão): lançada pela ação de despesas e paga no vencimento;
 *  · "cartao": compra no cartão corporativo (passagens);
 *  · "estoque": a compra do lote de estoque (ver COMPRAS_DE_ESTOQUE);
 *  · "rateio": parcela de um custo compartilhado (ver RATEIOS).
 * `soPrevisao`: custo do escopo do aditivo — entra só no Forecast.
 * `reembolsavel`: a despesa é cobrada do cliente (Contratos → Reembolsos).
 */
export interface CustoDemo {
  conta: string;
  fornecedor?: ChaveFornecedor;
  descricao: string;
  valor: number;
  meses: number[] | "todos";
  variacao?: number;
  via?: "despesa" | "cartao" | "estoque" | "rateio";
  soPrevisao?: boolean;
  reembolsavel?: "solicitado" | "aprovado";
}

/** Alocação CLT: horas planejadas por mês (meses relativos; padrão = todo o projeto). */
export interface MembroClt {
  nome: NomeFuncionario;
  funcao: string;
  horasMes: number;
  meses?: [number, number];
  /** fase preferida para apontar as horas (nome da fase do plano). */
  fase: string;
}
/** Alocação de terceiro: o custo é o serviço contratado (linhas de custo com o mesmo fornecedor). */
export interface MembroTerceiro {
  fornecedor: ChaveFornecedor;
  funcao: string;
  /** diária combinada (prestador PF por RPA); PJ é por contrato de serviço. */
  diaria?: number;
}

export interface FaseDemo {
  nome: string;
  /** [início, fim] relativos ao início do projeto. */
  meses: [number, number];
  responsavel: NomeFuncionario;
  atividades: { nome: string; responsavel?: string }[];
  entregas: { nome: string; mes: number }[];
}

export interface ProjetoDemo {
  chave: string;
  numero: number;
  nome: string;
  porte: string;
  cliente: ChaveCliente;
  modalidade: string;
  local: { endereco: string; municipio: string; uf: string; codigoIbge: string | null };
  /** mês ABSOLUTO de início (0 = 12 meses atrás; 12 = mês corrente). */
  inicio: number;
  duracao: number;
  situacao: "em_execucao" | "concluido" | "proximo_da_conclusao";
  titulo: string;
  objeto: string;
  numeroCliente: string;
  gestor: NomeFuncionario;
  coordenador: NomeFuncionario;
  prazoPagamentoDias: number;
  itens: ItemDemo[];
  /** aditivo de escopo: `meses` = medições (absolutas) das unidades acrescidas. */
  aditivo?: { mes: number; item: string; quantidade: number; valor: number; meses: number[]; objeto: string; justificativa: string };
  clt: MembroClt[];
  terceiros: MembroTerceiro[];
  custos: CustoDemo[];
  fases: FaseDemo[];
  /** Matriz da demonstração. */
  budget: { receita: number; custo: number };
  forecast: { receita: number; custo: number };
  /** pressão do Forecast por subgrupo do plano (1 = como orçado). */
  pressao: Record<string, number>;
  /** pressão sobre as horas da equipe própria (1 = como planejado). */
  pressaoHoras?: number;
  /** meses (absolutos) de medição cuja fatura fica vencida e em aberto. */
  faturasEmAtraso?: number[];
  /** meses (absolutos) de medição com recebimento parcial (fração recebida). */
  recebimentoParcial?: Record<number, number>;
  /** situação da medição do mês corrente. */
  medicaoCorrente?: "enviada" | "em_analise";
  descricaoDemo: string;
}

const seq = (de: number, ate: number) => Array.from({ length: ate - de + 1 }, (_, i) => de + i);

export const PROJETOS: ProjetoDemo[] = [
  // ───────────── Projeto 1 — grande, 18 meses, em execução, pressão de custos ─────────────
  {
    chave: "arqueologia",
    numero: 1,
    nome: "Monitoramento Arqueológico — Rodovia das Araucárias",
    porte: "Grande",
    cliente: "rodovia",
    modalidade: "Arqueologia e patrimônio cultural",
    local: { endereco: "Rodovia PR-090, km 38 a km 112 — frentes de duplicação", municipio: "Ponta Grossa", uf: "PR", codigoIbge: "4119905" },
    inicio: 2,
    duracao: 18,
    situacao: "em_execucao",
    titulo: "Programa de monitoramento arqueológico das obras de duplicação",
    objeto: "Planejamento técnico, monitoramento arqueológico das frentes de obra, registro de ocorrências, coleta e análise de materiais, relatórios trimestrais e relatório final ao órgão de patrimônio.",
    numeroCliente: "RA-CT-2026/014",
    gestor: "Helena Martins Duarte",
    coordenador: "Rafael Tavares Moura",
    prazoPagamentoDias: 30,
    itens: [
      { codigo: "01", descricao: "Planejamento técnico e levantamento documental", unidade: "un", quantidade: 1, valorUnitario: 60000, criterio: "entrega", etapa: "Planejamento", medicoes: [[3, 1]] },
      { codigo: "02", descricao: "Monitoramento arqueológico das frentes de obra (mensal)", unidade: "mês", quantidade: 16, valorUnitario: 57500, criterio: "quantidade", etapa: "Monitoramento", medicoes: seq(4, 19).map((m) => [m, 1] as [number, number]) },
      { codigo: "03", descricao: "Relatórios trimestrais de acompanhamento", unidade: "un", quantidade: 5, valorUnitario: 16000, criterio: "entrega", etapa: "Relatórios", medicoes: [[6, 1], [9, 1], [12, 1], [15, 1], [18, 1]] },
      { codigo: "04", descricao: "Consolidação dos resultados e relatório final", unidade: "un", quantidade: 1, valorUnitario: 140000, criterio: "entrega", etapa: "Relatório final", medicoes: [[19, 1]] },
    ],
    clt: [
      { nome: "Rafael Tavares Moura", funcao: "Coordenador de campo", horasMes: 30, fase: "Relatórios de acompanhamento" },
      { nome: "Gustavo Lemos Barreto", funcao: "Arqueólogo(a)", horasMes: 120, fase: "Monitoramento arqueológico" },
      { nome: "Aline Souza Vasconcelos", funcao: "Arqueólogo(a)", horasMes: 120, fase: "Monitoramento arqueológico" },
      { nome: "Diego Santana Freitas", funcao: "Técnico de campo", horasMes: 95, meses: [1, 17], fase: "Monitoramento arqueológico" },
      { nome: "Marcos Vinícius Pacheco", funcao: "Analista de geoprocessamento", horasMes: 95, fase: "Monitoramento arqueológico" },
    ],
    terceiros: [
      { fornecedor: "arqueologo", funcao: "Arqueólogo(a)", diaria: 650 },
      { fornecedor: "arqueosul", funcao: "Arqueólogo(a)" },
      { fornecedor: "campoforte", funcao: "Técnico de campo" },
      { fornecedor: "aeromapa", funcao: "Analista de geoprocessamento (terceiro)" },
    ],
    custos: [
      { conta: "2.2.02", fornecedor: "arqueologo", descricao: "Arqueólogo autônomo — acompanhamento das frentes (RPA)", valor: 5000, meses: seq(1, 17) },
      { conta: "2.2.02", fornecedor: "arqueosul", descricao: "Equipe de prospecção e salvamento arqueológico", valor: 6200, meses: seq(2, 17), variacao: 0.05 },
      { conta: "2.2.08", fornecedor: "campoforte", descricao: "Técnicos de campo terceirizados — apoio às frentes", valor: 3200, meses: seq(2, 17), variacao: 0.05 },
      { conta: "2.2.05", fornecedor: "aeromapa", descricao: "Mapeamento e georreferenciamento das frentes de obra", valor: 9000, meses: [1, 9, 17] },
      { conta: "2.3.04", fornecedor: "hotel", descricao: "Hospedagem da equipe de campo", valor: 2900, meses: seq(1, 17), variacao: 0.12 },
      { conta: "2.3.05", fornecedor: "hotel", descricao: "Alimentação em campo", valor: 1150, meses: seq(1, 17), variacao: 0.1 },
      { conta: "2.3.08", fornecedor: "locadora", descricao: "Locação de caminhonete 4x4", valor: 3900, meses: seq(1, 17) },
      { conta: "2.3.06", fornecedor: "posto", descricao: "Combustível — frentes de obra", valor: 1350, meses: seq(1, 17), variacao: 0.2 },
      { conta: "2.3.02", descricao: "Passagens aéreas — equipe de laboratório e análise", valor: 2100, meses: [2, 5, 8, 11, 14], via: "cartao" },
      { conta: "2.4.07", descricao: "EPIs de campo (lote de estoque)", valor: 0, meses: [0], via: "estoque" },
      { conta: "2.4.03", descricao: "Materiais de campo (lote de estoque)", valor: 0, meses: [0], via: "estoque" },
      { conta: "2.4.01", fornecedor: "aeromapa", descricao: "Locação de GPS de precisão", valor: 420, meses: seq(2, 17) },
      { conta: "2.6.03", fornecedor: "orgao", descricao: "Taxa de autorização de pesquisa arqueológica", valor: 2400, meses: [0], reembolsavel: "solicitado" },
      { conta: "2.6.05", fornecedor: "conselho", descricao: "ART do programa de monitoramento", valor: 262.55, meses: [0] },
      { conta: "2.7.05", descricao: "Base de apoio de campo compartilhada (rateio 40%)", valor: 2400, meses: seq(1, 17), via: "rateio" },
      { conta: "2.8.01", fornecedor: "grafica", descricao: "Impressão dos relatórios de acompanhamento", valor: 1250, meses: [4, 7, 10, 13, 16, 17] },
    ],
    fases: [
      { nome: "Planejamento técnico", meses: [0, 1], responsavel: "Rafael Tavares Moura", atividades: [{ nome: "Planejamento técnico" }, { nome: "Levantamento documental" }, { nome: "Autorização de pesquisa arqueológica" }], entregas: [{ nome: "Plano de trabalho aprovado", mes: 1 }] },
      { nome: "Preparação e mobilização", meses: [1, 2], responsavel: "Rafael Tavares Moura", atividades: [{ nome: "Preparação das campanhas" }, { nome: "Mobilização de equipes" }, { nome: "Treinamento de segurança das equipes" }], entregas: [] },
      { nome: "Monitoramento arqueológico", meses: [2, 16], responsavel: "Gustavo Lemos Barreto", atividades: [{ nome: "Monitoramento das frentes — trecho norte", responsavel: "Gustavo Lemos Barreto" }, { nome: "Monitoramento das frentes — trecho sul", responsavel: "Aline Souza Vasconcelos" }, { nome: "Registro de ocorrências" }, { nome: "Coleta e análise de materiais" }], entregas: [] },
      { nome: "Relatórios de acompanhamento", meses: [4, 16], responsavel: "Rafael Tavares Moura", atividades: [{ nome: "Relatórios trimestrais de acompanhamento" }, { nome: "Comunicações de ocorrência ao órgão de patrimônio" }], entregas: [{ nome: "Relatório trimestral 1", mes: 4 }, { nome: "Relatório trimestral 2", mes: 7 }, { nome: "Relatório trimestral 3", mes: 10 }, { nome: "Relatório trimestral 4", mes: 13 }, { nome: "Relatório trimestral 5", mes: 16 }] },
      { nome: "Consolidação dos resultados", meses: [15, 17], responsavel: "Gustavo Lemos Barreto", atividades: [{ nome: "Consolidação dos resultados" }, { nome: "Análise do acervo coletado" }], entregas: [] },
      { nome: "Relatório final", meses: [17, 17], responsavel: "Rafael Tavares Moura", atividades: [{ nome: "Elaboração do relatório final" }, { nome: "Entrega do relatório final" }], entregas: [{ nome: "Relatório final ao órgão de patrimônio", mes: 17 }] },
    ],
    budget: { receita: 1200000, custo: 840000 },
    forecast: { receita: 1200000, custo: 915000 },
    pressao: { "2.2": 1.12, "2.3": 1.2 },
    medicaoCorrente: "enviada",
    descricaoDemo: "Grande porte; pressão de custos em logística e terceiros; medição do mês em análise.",
  },

  // ───────────── Projeto 2 — pequeno, 3 meses, concluído, economia ─────────────
  {
    chave: "diagnostico",
    numero: 2,
    nome: "Diagnóstico Ambiental — Unidade Industrial Araucária",
    porte: "Pequeno",
    cliente: "quimica",
    modalidade: "Consultoria e estudos ambientais",
    local: { endereco: "Av. das Indústrias, 2200 — Distrito Industrial", municipio: "Araucária", uf: "PR", codigoIbge: "4101804" },
    inicio: 8,
    duracao: 3,
    situacao: "concluido",
    titulo: "Diagnóstico ambiental para implantação de unidade industrial",
    objeto: "Levantamento documental, visita técnica, diagnóstico das condições ambientais do terreno, análises de solo e água e relatório técnico de diagnóstico.",
    numeroCliente: "QA-PO-2026-031",
    gestor: "Helena Martins Duarte",
    coordenador: "Helena Martins Duarte",
    prazoPagamentoDias: 30,
    itens: [
      { codigo: "01", descricao: "Reunião inicial e plano de trabalho", unidade: "un", quantidade: 1, valorUnitario: 18000, criterio: "entrega", etapa: "Mobilização", medicoes: [[8, 1]] },
      { codigo: "02", descricao: "Diagnóstico das condições ambientais (levantamento, visita e análises)", unidade: "vb", quantidade: 1, valorUnitario: 102000, criterio: "percentual", etapa: "Diagnóstico", medicoes: [[8, 40], [9, 60]] },
      { codigo: "03", descricao: "Relatório de diagnóstico ambiental (versão final revisada)", unidade: "un", quantidade: 1, valorUnitario: 60000, criterio: "entrega", etapa: "Relatório", medicoes: [[10, 1]] },
    ],
    clt: [
      { nome: "Helena Martins Duarte", funcao: "Engenheiro(a) ambiental", horasMes: 80, fase: "Diagnóstico" },
      { nome: "Patrícia Gomes Salles", funcao: "Engenheiro(a) ambiental", horasMes: 60, fase: "Diagnóstico" },
    ],
    terceiros: [{ fornecedor: "hidrolab", funcao: "Laboratório de análises" }],
    custos: [
      { conta: "2.2.06", fornecedor: "hidrolab", descricao: "Análises laboratoriais de solo e água subterrânea", valor: 26000, meses: [1] },
      { conta: "2.2.07", fornecedor: "hidrolab", descricao: "Análises especializadas de ar e ruído", valor: 13500, meses: [1] },
      { conta: "2.3.08", fornecedor: "locadora", descricao: "Locação de veículo — visita técnica", valor: 1800, meses: [0, 1] },
      { conta: "2.3.06", fornecedor: "posto", descricao: "Combustível — deslocamentos à planta", valor: 650, meses: [0, 1, 2], variacao: 0.2 },
      { conta: "2.3.04", fornecedor: "hotel", descricao: "Hospedagem — visita técnica", valor: 1600, meses: [1] },
      { conta: "2.8.02", fornecedor: "aeromapa", descricao: "Bases cartográficas e imagens do terreno", valor: 3200, meses: [0] },
      { conta: "2.8.01", fornecedor: "grafica", descricao: "Elaboração documental — impressão e encadernação do relatório", valor: 1900, meses: [2] },
      { conta: "2.6.05", fornecedor: "conselho", descricao: "ART do diagnóstico", valor: 262.55, meses: [0] },
    ],
    fases: [
      { nome: "Mobilização e levantamento", meses: [0, 0], responsavel: "Helena Martins Duarte", atividades: [{ nome: "Reunião inicial" }, { nome: "Levantamento documental" }, { nome: "Visita técnica", responsavel: "Patrícia Gomes Salles" }], entregas: [{ nome: "Plano de trabalho", mes: 0 }] },
      { nome: "Diagnóstico", meses: [0, 1], responsavel: "Patrícia Gomes Salles", atividades: [{ nome: "Diagnóstico das condições ambientais" }, { nome: "Análise das informações coletadas" }], entregas: [] },
      { nome: "Relatório", meses: [1, 2], responsavel: "Helena Martins Duarte", atividades: [{ nome: "Elaboração de relatório", responsavel: "Patrícia Gomes Salles" }, { nome: "Revisão" }, { nome: "Entrega final" }], entregas: [{ nome: "Relatório de diagnóstico ambiental", mes: 2 }] },
    ],
    budget: { receita: 180000, custo: 115000 },
    forecast: { receita: 180000, custo: 110000 },
    pressao: { "2.2": 0.97, "2.3": 0.9 },
    recebimentoParcial: { 10: 0.5 },
    descricaoDemo: "Pequeno porte; concluído abaixo do orçamento; última fatura com recebimento parcial.",
  },

  // ───────────── Projeto 3 — médio-grande, 12 meses, campanhas sazonais, terceiros ─────────────
  {
    chave: "fauna",
    numero: 3,
    nome: "Programa de Monitoramento de Fauna — Parque Eólico Ventos do Sul",
    porte: "Médio-grande",
    cliente: "eolica",
    modalidade: "Monitoramento de fauna",
    local: { endereco: "Estrada Geral da Serra, s/n — Parque Eólico", municipio: "Osório", uf: "RS", codigoIbge: "4313508" },
    inicio: 5,
    duracao: 12,
    situacao: "em_execucao",
    titulo: "Programa de monitoramento de fauna terrestre e alada — fase de operação",
    objeto: "Planejamento e definição de pontos amostrais, quatro campanhas sazonais de campo, instalação e retirada de equipamentos, registro de fauna, análise técnica, relatórios periódicos e relatório final.",
    numeroCliente: "VDS-2026-0009",
    gestor: "Helena Martins Duarte",
    coordenador: "Camila Ferraz Lopes",
    prazoPagamentoDias: 45,
    itens: [
      { codigo: "01", descricao: "Plano de trabalho e definição dos pontos amostrais", unidade: "un", quantidade: 1, valorUnitario: 40000, criterio: "entrega", etapa: "Planejamento", medicoes: [[5, 1]] },
      { codigo: "02", descricao: "Campanha sazonal de monitoramento de fauna", unidade: "campanha", quantidade: 4, valorUnitario: 115000, criterio: "quantidade", etapa: "Campanhas", medicoes: [[6, 1], [9, 1], [12, 1], [15, 1]] },
      { codigo: "03", descricao: "Relatórios periódicos de campanha", unidade: "un", quantidade: 3, valorUnitario: 20000, criterio: "entrega", etapa: "Relatórios", medicoes: [[7, 1], [10, 1], [13, 1]] },
      { codigo: "04", descricao: "Relatório final consolidado", unidade: "un", quantidade: 1, valorUnitario: 60000, criterio: "entrega", etapa: "Relatório final", medicoes: [[16, 1]] },
    ],
    clt: [
      { nome: "Camila Ferraz Lopes", funcao: "Biólogo(a)", horasMes: 105, fase: "Campanhas sazonais de campo" },
      { nome: "Diego Santana Freitas", funcao: "Técnico de campo", horasMes: 60, fase: "Campanhas sazonais de campo" },
      { nome: "Bruna Carvalho Mendes", funcao: "Auxiliar de campo", horasMes: 85, fase: "Consolidação e análise" },
    ],
    terceiros: [
      { fornecedor: "biotasul", funcao: "Biólogo(a)" },
      { fornecedor: "biologa", funcao: "Biólogo(a)", diaria: 700 },
      { fornecedor: "avis", funcao: "Biólogo(a)" },
      { fornecedor: "hidrolab", funcao: "Laboratório de análises" },
      { fornecedor: "campoforte", funcao: "Técnico de campo" },
    ],
    custos: [
      { conta: "2.2.03", fornecedor: "biotasul", descricao: "Equipe de campo — herpetofauna e mastofauna (campanha)", valor: 23000, meses: [1, 4, 7, 10] },
      { conta: "2.2.03", fornecedor: "avis", descricao: "Monitoramento de avifauna e quirópteros (campanha)", valor: 14500, meses: [1, 4, 7, 10] },
      { conta: "2.2.01", fornecedor: "biologa", descricao: "Bióloga consultora — análise de dados e relatórios (RPA)", valor: 4500, meses: seq(0, 11) },
      { conta: "2.2.08", fornecedor: "campoforte", descricao: "Técnicos de campo — instalação e retirada de armadilhas", valor: 6000, meses: [1, 4, 7, 10] },
      { conta: "2.2.06", fornecedor: "hidrolab", descricao: "Análises laboratoriais de amostras biológicas", valor: 4200, meses: [1, 4, 7, 10] },
      { conta: "2.3.04", fornecedor: "hotel", descricao: "Hospedagem — campanha de campo", valor: 6400, meses: [1, 4, 7, 10], variacao: 0.1 },
      { conta: "2.3.05", fornecedor: "hotel", descricao: "Alimentação — campanha de campo", valor: 2200, meses: [1, 4, 7, 10], variacao: 0.1 },
      { conta: "2.3.08", fornecedor: "locadora", descricao: "Locação de veículos 4x4 — campanha", valor: 4200, meses: [1, 4, 7, 10] },
      { conta: "2.3.06", fornecedor: "posto", descricao: "Combustível — campanha", valor: 1600, meses: [1, 4, 7, 10], variacao: 0.15 },
      { conta: "2.4.01", fornecedor: "avis", descricao: "Locação de armadilhas fotográficas e gravadores ultrassônicos", valor: 3200, meses: [1, 4, 7, 10] },
      { conta: "2.4.04", descricao: "Materiais de coleta e preservação (lote de estoque)", valor: 0, meses: [0, 5], via: "estoque" },
      { conta: "2.6.01", fornecedor: "orgao", descricao: "Autorização de captura, coleta e transporte de fauna", valor: 3800, meses: [0] },
      { conta: "2.6.05", fornecedor: "conselho", descricao: "ART do programa de monitoramento", valor: 262.55, meses: [0] },
      { conta: "2.8.01", fornecedor: "grafica", descricao: "Impressão dos relatórios de campanha", valor: 900, meses: [2, 5, 8, 11] },
    ],
    fases: [
      { nome: "Planejamento", meses: [0, 0], responsavel: "Camila Ferraz Lopes", atividades: [{ nome: "Planejamento das campanhas" }, { nome: "Definição de pontos de amostragem" }, { nome: "Autorização de captura e coleta" }], entregas: [{ nome: "Plano de trabalho e mapa de pontos", mes: 0 }] },
      { nome: "Campanhas sazonais de campo", meses: [1, 10], responsavel: "Camila Ferraz Lopes", atividades: [{ nome: "Campanha 1 — verão" }, { nome: "Campanha 2 — outono" }, { nome: "Campanha 3 — inverno" }, { nome: "Campanha 4 — primavera" }, { nome: "Mobilização das equipes", responsavel: "Diego Santana Freitas" }, { nome: "Instalação e retirada de equipamentos", responsavel: "Diego Santana Freitas" }, { nome: "Registro de fauna e busca ativa" }], entregas: [] },
      { nome: "Consolidação e análise", meses: [2, 11], responsavel: "Camila Ferraz Lopes", atividades: [{ nome: "Consolidação dos dados", responsavel: "Bruna Carvalho Mendes" }, { nome: "Análise técnica" }], entregas: [] },
      { nome: "Relatórios", meses: [2, 11], responsavel: "Camila Ferraz Lopes", atividades: [{ nome: "Relatórios periódicos" }, { nome: "Relatório final" }], entregas: [{ nome: "Relatório da campanha 1", mes: 2 }, { nome: "Relatório da campanha 2", mes: 5 }, { nome: "Relatório da campanha 3", mes: 8 }, { nome: "Relatório final consolidado", mes: 11 }] },
    ],
    budget: { receita: 620000, custo: 445000 },
    forecast: { receita: 620000, custo: 490000 },
    pressao: { "2.2": 1.14, "2.3": 1.16, "2.4": 1.1 },
    medicaoCorrente: "em_analise",
    descricaoDemo: "Campanhas sazonais; grande participação de terceiros; aumento previsto nas próximas campanhas.",
  },

  // ───────────── Projeto 4 — médio, 7 meses, próximo da conclusão, economia moderada ─────────────
  {
    chave: "flora",
    numero: 4,
    nome: "Inventário e Diagnóstico de Flora — Loteamento Reserva das Araucárias",
    porte: "Médio",
    cliente: "incorporadora",
    modalidade: "Inventário e manejo de flora",
    local: { endereco: "Estrada do Mergulhão, s/n — Gleba Reserva das Araucárias", municipio: "São José dos Pinhais", uf: "PR", codigoIbge: "4125506" },
    inicio: 7,
    duracao: 7,
    situacao: "proximo_da_conclusao",
    titulo: "Inventário florístico e diagnóstico de flora da gleba",
    objeto: "Planejamento e metodologia, campanhas de coleta, identificação de espécies, processamento dos registros, georreferenciamento, mapas, tabelas e relatório final.",
    numeroCliente: "HV-FLO-2026/07",
    gestor: "Rafael Tavares Moura",
    coordenador: "Juliana Ribeiro Antunes",
    prazoPagamentoDias: 30,
    itens: [
      { codigo: "01", descricao: "Planejamento e metodologia do levantamento", unidade: "un", quantidade: 1, valorUnitario: 30000, criterio: "entrega", etapa: "Planejamento", medicoes: [[7, 1]] },
      { codigo: "02", descricao: "Campanhas de campo — levantamento florístico", unidade: "ha", quantidade: 120, valorUnitario: 1500, criterio: "quantidade", etapa: "Campanhas", medicoes: [[8, 40], [9, 45], [10, 35]] },
      { codigo: "03", descricao: "Identificação, processamento e georreferenciamento", unidade: "vb", quantidade: 1, valorUnitario: 60000, criterio: "percentual", etapa: "Processamento", medicoes: [[10, 30], [11, 40], [12, 30]] },
      { codigo: "04", descricao: "Mapas, tabelas e relatório final", unidade: "un", quantidade: 1, valorUnitario: 60000, criterio: "entrega", etapa: "Relatório final", medicoes: [[13, 1]] },
    ],
    clt: [
      { nome: "Juliana Ribeiro Antunes", funcao: "Engenheiro(a) ambiental", horasMes: 125, fase: "Campanhas de campo" },
      { nome: "Marcos Vinícius Pacheco", funcao: "Analista de geoprocessamento", horasMes: 70, fase: "Processamento e análise" },
    ],
    terceiros: [
      { fornecedor: "botanico", funcao: "Botânico(a) especialista", diaria: 750 },
      { fornecedor: "aeromapa", funcao: "Analista de geoprocessamento (terceiro)" },
      { fornecedor: "campoforte", funcao: "Técnico de campo" },
    ],
    custos: [
      { conta: "2.2.03", fornecedor: "botanico", descricao: "Botânico especialista — identificação de espécies (RPA)", valor: 6500, meses: seq(0, 5) },
      { conta: "2.2.05", fornecedor: "aeromapa", descricao: "Georreferenciamento e processamento cartográfico", valor: 8000, meses: [3, 4, 5] },
      { conta: "2.2.08", fornecedor: "campoforte", descricao: "Técnicos de campo — parcelas de inventário", valor: 5500, meses: [1, 2, 3] },
      { conta: "2.3.08", fornecedor: "locadora", descricao: "Locação de caminhonete 4x4 — campanhas", valor: 3600, meses: [1, 2, 3] },
      { conta: "2.3.06", fornecedor: "posto", descricao: "Combustível — deslocamentos à gleba", valor: 1100, meses: seq(0, 5), variacao: 0.2 },
      { conta: "2.3.04", fornecedor: "hotel", descricao: "Hospedagem — campanhas", valor: 2400, meses: [1, 2, 3], variacao: 0.1 },
      { conta: "2.3.05", fornecedor: "hotel", descricao: "Alimentação em campo", valor: 900, meses: [1, 2, 3] },
      { conta: "2.4.04", fornecedor: "insumos", descricao: "Materiais de coleta botânica (prensas, jornal, sacos)", valor: 1400, meses: [1, 2, 3] },
      { conta: "2.6.06", fornecedor: "orgao", descricao: "Autorização de coleta de material botânico", valor: 1200, meses: [0] },
      { conta: "2.6.05", fornecedor: "conselho", descricao: "ART do inventário florístico", valor: 262.55, meses: [0] },
      { conta: "2.8.02", fornecedor: "aeromapa", descricao: "Imagens de satélite e bases cartográficas", valor: 4200, meses: [0] },
      { conta: "2.8.01", fornecedor: "grafica", descricao: "Impressão de mapas, tabelas e relatório final", valor: 2500, meses: [6] },
      { conta: "2.2.03", fornecedor: "botanico", descricao: "Revisão técnica final das identificações (RPA)", valor: 3200, meses: [6] },
      { conta: "2.2.05", fornecedor: "aeromapa", descricao: "Mapas temáticos finais e base georreferenciada", valor: 4800, meses: [6] },
    ],
    fases: [
      { nome: "Planejamento", meses: [0, 0], responsavel: "Juliana Ribeiro Antunes", atividades: [{ nome: "Planejamento do levantamento" }, { nome: "Definição da metodologia" }], entregas: [{ nome: "Plano amostral", mes: 0 }] },
      { nome: "Campanhas de campo", meses: [1, 3], responsavel: "Juliana Ribeiro Antunes", atividades: [{ nome: "Instalação de parcelas" }, { nome: "Campanha de coleta — área norte" }, { nome: "Campanha de coleta — área sul" }], entregas: [] },
      { nome: "Processamento e análise", meses: [3, 5], responsavel: "Juliana Ribeiro Antunes", atividades: [{ nome: "Identificação de espécies" }, { nome: "Processamento dos registros" }, { nome: "Análise técnica" }, { nome: "Georreferenciamento", responsavel: "Marcos Vinícius Pacheco" }], entregas: [] },
      { nome: "Mapas e relatório", meses: [5, 6], responsavel: "Juliana Ribeiro Antunes", atividades: [{ nome: "Elaboração de mapas e tabelas", responsavel: "Marcos Vinícius Pacheco" }, { nome: "Relatório final" }], entregas: [{ nome: "Mapas temáticos", mes: 5 }, { nome: "Relatório final de inventário", mes: 6 }] },
    ],
    budget: { receita: 330000, custo: 235000 },
    forecast: { receita: 330000, custo: 225000 },
    pressao: { "2.2": 0.94, "2.3": 0.9 },
    medicaoCorrente: "em_analise",
    descricaoDemo: "Médio porte; termina no mês seguinte; economia moderada prevista.",
  },

  // ───────────── Projeto 5 — muito grande, 24 meses, aditivo, frentes simultâneas ─────────────
  {
    chave: "gestao",
    numero: 5,
    nome: "Programa Integrado de Gestão Ambiental — Complexo Serra do Cobre",
    porte: "Muito grande",
    cliente: "mina",
    modalidade: "Licenciamento ambiental",
    local: { endereco: "Estrada da Mina, km 14 — Zona Rural", municipio: "Itabira", uf: "MG", codigoIbge: "3131703" },
    inicio: 2,
    duracao: 24,
    situacao: "em_execucao",
    titulo: "Gestão integrada dos programas ambientais da licença de operação",
    objeto: "Planejamento e coordenação dos programas ambientais, supervisão ambiental das frentes, monitoramento de indicadores, comunicação social, relatórios semestrais e consolidação final.",
    numeroCliente: "SC-CT-2026/118",
    gestor: "Helena Martins Duarte",
    coordenador: "Rafael Tavares Moura",
    prazoPagamentoDias: 30,
    itens: [
      { codigo: "01", descricao: "Planejamento dos programas ambientais e mobilização", unidade: "un", quantidade: 1, valorUnitario: 90000, criterio: "entrega", etapa: "Planejamento", medicoes: [[2, 1]] },
      { codigo: "02", descricao: "Coordenação técnica e gestão de equipes (mensal)", unidade: "mês", quantidade: 24, valorUnitario: 28000, criterio: "quantidade", etapa: "Coordenação", medicoes: seq(2, 25).map((m) => [m, 1] as [number, number]) },
      { codigo: "03", descricao: "Supervisão ambiental e acompanhamento das frentes (mensal)", unidade: "mês", quantidade: 22, valorUnitario: 30000, criterio: "quantidade", etapa: "Supervisão", medicoes: seq(4, 25).map((m) => [m, 1] as [number, number]) },
      { codigo: "04", descricao: "Monitoramento de indicadores ambientais (campanhas)", unidade: "campanha", quantidade: 8, valorUnitario: 30000, criterio: "quantidade", etapa: "Monitoramento", medicoes: [[4, 1], [7, 1], [10, 1], [12, 1], [13, 1], [14, 1], [16, 1], [17, 1], [19, 1], [20, 1], [22, 1], [25, 1]] },
      { codigo: "05", descricao: "Relatórios semestrais consolidados", unidade: "un", quantidade: 4, valorUnitario: 32000, criterio: "entrega", etapa: "Relatórios", medicoes: [[7, 1], [13, 1], [19, 1], [25, 1]] },
      { codigo: "06", descricao: "Consolidação final dos programas", unidade: "un", quantidade: 1, valorUnitario: 90000, criterio: "entrega", etapa: "Consolidação", medicoes: [[25, 1]] },
    ],
    aditivo: {
      mes: 9,
      item: "04",
      quantidade: 4,
      valor: 120000,
      meses: [12, 14, 17, 20],
      objeto: "Ampliação do monitoramento de indicadores: 4 campanhas adicionais de qualidade da água nas novas frentes de lavra",
      justificativa: "Novas frentes de lavra licenciadas exigem campanhas adicionais de qualidade da água (condicionante da LO renovada). Prazo mantido.",
    },
    clt: [
      { nome: "Helena Martins Duarte", funcao: "Coordenador de campo", horasMes: 50, fase: "Coordenação técnica e gestão" },
      { nome: "Rafael Tavares Moura", funcao: "Coordenador de campo", horasMes: 100, fase: "Coordenação técnica e gestão" },
      { nome: "Patrícia Gomes Salles", funcao: "Engenheiro(a) ambiental", horasMes: 90, fase: "Monitoramento de indicadores" },
      { nome: "Camila Ferraz Lopes", funcao: "Biólogo(a)", horasMes: 45, fase: "Monitoramento de indicadores" },
      { nome: "Bruna Carvalho Mendes", funcao: "Auxiliar de campo", horasMes: 70, fase: "Supervisão ambiental" },
      { nome: "Juliana Ribeiro Antunes", funcao: "Engenheiro(a) ambiental", horasMes: 36, meses: [3, 23], fase: "Supervisão ambiental" },
    ],
    terceiros: [
      { fornecedor: "ecotec", funcao: "Consultoria especializada" },
      { fornecedor: "socio", funcao: "Consultoria especializada" },
      { fornecedor: "hidrolab", funcao: "Laboratório de análises" },
      { fornecedor: "aeromapa", funcao: "Analista de geoprocessamento (terceiro)" },
      { fornecedor: "campoforte", funcao: "Técnico de campo" },
      { fornecedor: "biotasul", funcao: "Biólogo(a)" },
    ],
    custos: [
      { conta: "2.2.01", fornecedor: "ecotec", descricao: "Consultoria em gestão de programas ambientais", valor: 6500, meses: seq(0, 23) },
      { conta: "2.2.01", fornecedor: "socio", descricao: "Programa de comunicação social e socioeconomia", valor: 4200, meses: seq(2, 23) },
      { conta: "2.2.06", fornecedor: "hidrolab", descricao: "Análises do monitoramento de indicadores (água e efluentes)", valor: 7500, meses: [2, 5, 8, 11, 14, 17, 20, 23] },
      { conta: "2.2.06", fornecedor: "hidrolab", descricao: "Análises das campanhas adicionais (aditivo)", valor: 7500, meses: [10, 12, 15, 18], soPrevisao: true },
      { conta: "2.2.05", fornecedor: "aeromapa", descricao: "Geoprocessamento e painel de indicadores", valor: 2200, meses: seq(0, 23) },
      { conta: "2.2.08", fornecedor: "campoforte", descricao: "Serviços de campo — supervisão de frentes", valor: 5200, meses: seq(2, 23), variacao: 0.05 },
      { conta: "2.2.03", fornecedor: "biotasul", descricao: "Programa de monitoramento de biota (campanha)", valor: 8000, meses: [2, 5, 8, 11, 14, 17, 20, 23] },
      { conta: "2.2.08", fornecedor: "campoforte", descricao: "Coletas das campanhas adicionais (aditivo)", valor: 3500, meses: [10, 12, 15, 18], soPrevisao: true },
      { conta: "2.3.08", fornecedor: "locadora", descricao: "Locação de dois veículos 4x4", valor: 5800, meses: seq(0, 23) },
      { conta: "2.3.06", fornecedor: "posto", descricao: "Combustível — frentes e campanhas", valor: 1800, meses: seq(0, 23), variacao: 0.2 },
      { conta: "2.3.04", fornecedor: "hotel", descricao: "Hospedagem — equipe de supervisão", valor: 3000, meses: seq(1, 23), variacao: 0.12 },
      { conta: "2.3.02", descricao: "Passagens aéreas — coordenação (Curitiba ⇄ Belo Horizonte)", valor: 2600, meses: [1, 4, 7, 10, 13, 16, 19, 22], via: "cartao" },
      { conta: "2.4.01", fornecedor: "hidrolab", descricao: "Locação de sondas multiparâmetro", valor: 1500, meses: seq(2, 23) },
      { conta: "2.4.07", descricao: "EPIs de campo (lote de estoque)", valor: 0, meses: [6], via: "estoque" },
      { conta: "2.7.03", fornecedor: "telecom", descricao: "Comunicação operacional (rádios e chips de dados)", valor: 900, meses: seq(0, 23) },
      { conta: "2.7.05", descricao: "Base de apoio de campo compartilhada (rateio 60%)", valor: 3600, meses: seq(1, 23), via: "rateio" },
      { conta: "2.8.04", fornecedor: "software", descricao: "Plataforma de gestão de indicadores (licença do projeto)", valor: 1200, meses: seq(0, 23) },
      { conta: "2.6.01", fornecedor: "orgao", descricao: "Taxa de análise de relatório de condicionantes", valor: 4500, meses: [5, 11, 17, 23], reembolsavel: "aprovado" },
      { conta: "2.6.05", fornecedor: "conselho", descricao: "ART do programa integrado", valor: 262.55, meses: [0] },
      { conta: "2.8.01", fornecedor: "grafica", descricao: "Impressão dos relatórios semestrais", valor: 1500, meses: [5, 11, 17, 23] },
    ],
    fases: [
      { nome: "Planejamento e mobilização", meses: [0, 1], responsavel: "Rafael Tavares Moura", atividades: [{ nome: "Planejamento dos programas ambientais" }, { nome: "Mobilização" }, { nome: "Plano de comunicação com as comunidades" }], entregas: [{ nome: "Plano de gestão ambiental", mes: 1 }] },
      { nome: "Coordenação técnica e gestão", meses: [0, 23], responsavel: "Helena Martins Duarte", atividades: [{ nome: "Coordenação técnica" }, { nome: "Gestão de equipes", responsavel: "Rafael Tavares Moura" }, { nome: "Controle gerencial de entregas", responsavel: "Rafael Tavares Moura" }, { nome: "Gestão de solicitações adicionais" }], entregas: [] },
      { nome: "Supervisão ambiental", meses: [2, 23], responsavel: "Juliana Ribeiro Antunes", atividades: [{ nome: "Supervisão ambiental das frentes" }, { nome: "Acompanhamento de atividades de campo", responsavel: "Bruna Carvalho Mendes" }, { nome: "Acompanhamento de serviços complementares" }], entregas: [] },
      { nome: "Monitoramento de indicadores", meses: [2, 23], responsavel: "Patrícia Gomes Salles", atividades: [{ nome: "Campanhas de qualidade da água" }, { nome: "Monitoramento de biota", responsavel: "Camila Ferraz Lopes" }, { nome: "Painel de indicadores" }, { nome: "Campanhas adicionais (aditivo)" }], entregas: [] },
      { nome: "Comunicação social e socioeconomia", meses: [2, 23], responsavel: "Rafael Tavares Moura", atividades: [{ nome: "Programa de comunicação social" }, { nome: "Atendimento às comunidades" }], entregas: [] },
      { nome: "Relatórios periódicos", meses: [5, 23], responsavel: "Rafael Tavares Moura", atividades: [{ nome: "Consolidação de informações" }, { nome: "Relatórios semestrais" }], entregas: [{ nome: "Relatório semestral 1", mes: 5 }, { nome: "Relatório semestral 2", mes: 11 }, { nome: "Relatório semestral 3", mes: 17 }, { nome: "Relatório semestral 4", mes: 23 }] },
      { nome: "Consolidação final", meses: [22, 23], responsavel: "Helena Martins Duarte", atividades: [{ nome: "Consolidação final" }, { nome: "Relatório final dos programas" }], entregas: [{ nome: "Relatório final dos programas", mes: 23 }] },
    ],
    budget: { receita: 1880000, custo: 1430000 },
    forecast: { receita: 2000000, custo: 1560000 },
    pressao: { "2.2": 1.06, "2.3": 1.1 },
    faturasEmAtraso: [9],
    medicaoCorrente: "enviada",
    descricaoDemo: "Maior contrato; aditivo de escopo de R$ 120 mil; frentes simultâneas; custo compartilhado por rateio; uma fatura vencida.",
  },
];

/**
 * Custo compartilhado: a base de apoio de campo (escritório, almoxarifado e
 * vigilância) atende os Projetos 1 e 5; o pagamento mensal é RATEADO por
 * horas (60% Projeto 5, 40% Projeto 1), com memória de cálculo.
 */
export const RATEIOS = [{ conta: "2.7.05", descricao: "Base de apoio de campo compartilhada — aluguel, almoxarifado e vigilância", valorMes: 6000, meses: seq(3, 12), linhas: [{ projeto: "gestao", percentual: 60 }, { projeto: "arqueologia", percentual: 40 }] }];

/** Despesas fixas mensais da sede: [conta, fornecedor, descrição, valor, variação]. */
export const FIXAS_DA_SEDE: [string, ChaveFornecedor | null, string, number, number][] = [
  ["3.1.01", "imobiliaria", "Aluguel, condomínio e energia — sala comercial", 7800, 0.02],
  ["3.1.06", "telecom", "Internet e telefonia corporativa", 690, 0.03],
  ["3.4.01", "contabil", "Honorários contábeis e departamento pessoal", 2900, 0],
  ["3.3.02", "software", "Sistemas SaaS (e-mail, nuvem e gestão)", 980, 0.03],
  ["3.3.01", "software", "Licenças GIS e CAD", 1650, 0],
  ["3.7.03", null, "Seguro de responsabilidade civil profissional", 820, 0],
];
/** Alíquota efetiva estimada do Simples Nacional sobre o faturamento (DAS). */
export const ALIQUOTA_DAS = 0.06;
