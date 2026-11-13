/**
 * Catálogo da empresa de DEMONSTRAÇÃO (consultoria ambiental).
 *
 * Tudo aqui é FICTÍCIO: empresas, pessoas, municípios e documentos foram
 * inventados para a demonstração. CPFs e CNPJs são sintéticos (raiz 000.000.xxx
 * / 00.000.xxx), com dígitos verificadores válidos só para passar nas
 * validações do app — não pertencem a ninguém.
 *
 * As datas são RELATIVAS ao dia em que o seed roda: `inicio` e os meses de
 * medição contam a partir de 12 meses antes do mês corrente (mês 0). Assim a
 * demonstração tem sempre ~12 meses de histórico e ~12 meses de projeção.
 */

/** Nomes que a empresa de demonstração já teve: a recriação também os apaga. */
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
  { chave: "mina", nome: "Mineração Serra do Cobre S.A.", doc: cnpj(101), cidade: "Ouro Branco do Sul / MG", email: "meioambiente@serradocobre.exemplo", ramo: "Mineração" },
  { chave: "saneamento", nome: "Companhia de Saneamento Vale Verde", doc: cnpj(102), cidade: "Ponta Alta / PR", email: "contratos@valeverde.exemplo", ramo: "Saneamento" },
  { chave: "quimica", nome: "Química Araucária Indústria e Comércio Ltda", doc: cnpj(103), cidade: "Araucária / PR", email: "sesmt@quimicaaraucaria.exemplo", ramo: "Indústria química" },
  { chave: "eolica", nome: "Ventos do Sul Energia Renovável S.A.", doc: cnpj(104), cidade: "Campos Altos do Sul / RS", email: "licenciamento@ventosdosul.exemplo", ramo: "Energia eólica" },
  { chave: "incorporadora", nome: "Horizonte Verde Empreendimentos Imobiliários Ltda", doc: cnpj(105), cidade: "São José dos Pinhais / PR", email: "projetos@horizonteverde.exemplo", ramo: "Incorporação imobiliária" },
  { chave: "prefeitura", nome: "Prefeitura Municipal de Santa Clara do Oeste", doc: cnpj(106), cidade: "Santa Clara do Oeste / PR", email: "planejamento@santaclaradooeste.exemplo", ramo: "Administração pública" },
] as const;
export type ChaveCliente = (typeof CLIENTES)[number]["chave"];

export const FORNECEDORES = [
  { chave: "lab", nome: "Hidrolab Análises Ambientais Ltda", tipo: "PJ", doc: cnpj(201), papeis: ["Prestador de Serviço"], cidade: "Curitiba", estado: "PR" },
  { chave: "locadora", nome: "Rota Campo Locação de Veículos 4x4 Ltda", tipo: "PJ", doc: cnpj(202), papeis: ["Prestador de Serviço"], cidade: "Curitiba", estado: "PR" },
  { chave: "posto", nome: "Auto Posto Rodovia Verde Ltda", tipo: "PJ", doc: cnpj(203), papeis: ["Fornecedor de Material"], cidade: "Campo Largo", estado: "PR" },
  { chave: "hotel", nome: "Hotel Pousada do Viajante Ltda", tipo: "PJ", doc: cnpj(204), papeis: ["Prestador de Serviço"], cidade: "Ouro Branco do Sul", estado: "MG" },
  { chave: "drone", nome: "AeroMapa Geotecnologia Ltda", tipo: "PJ", doc: cnpj(205), papeis: ["Prestador de Serviço", "Empresa de Tecnologia"], cidade: "Curitiba", estado: "PR" },
  { chave: "fauna", nome: "Biota Sul Consultoria em Fauna Ltda", tipo: "PJ", doc: cnpj(206), papeis: ["Prestador de Serviço", "Consultor/Assessor"], cidade: "Porto Alegre", estado: "RS" },
  { chave: "botanico", nome: "Renato Albuquerque Siqueira (botânico)", tipo: "PF", doc: cpf(301), papeis: ["Consultor/Assessor", "Mão de Obra RPA"], cidade: "Curitiba", estado: "PR" },
  { chave: "socio", nome: "Lívia Prado Consultoria Socioeconômica Ltda", tipo: "PJ", doc: cnpj(207), papeis: ["Consultor/Assessor"], cidade: "Belo Horizonte", estado: "MG" },
  { chave: "grafica", nome: "Gráfica Folha Nova Ltda", tipo: "PJ", doc: cnpj(208), papeis: ["Fornecedor de Material"], cidade: "Curitiba", estado: "PR" },
  { chave: "viveiro", nome: "Viveiro Mata Nativa Ltda", tipo: "PJ", doc: cnpj(209), papeis: ["Fornecedor de Material"], cidade: "São José dos Pinhais", estado: "PR" },
  { chave: "insumos", nome: "Coleta Certa Materiais de Laboratório Ltda", tipo: "PJ", doc: cnpj(210), papeis: ["Fornecedor de Material"], cidade: "Curitiba", estado: "PR" },
  { chave: "imobiliaria", nome: "Condomínio Empresarial Batel Office", tipo: "PJ", doc: cnpj(211), papeis: ["Prestador de Serviço"], cidade: "Curitiba", estado: "PR" },
  { chave: "contabil", nome: "Exata Contabilidade e Assessoria Ltda", tipo: "PJ", doc: cnpj(212), papeis: ["Escritório Contábil"], cidade: "Curitiba", estado: "PR" },
  { chave: "software", nome: "GeoSoft Licenciamento de Software Ltda", tipo: "PJ", doc: cnpj(213), papeis: ["Empresa de Tecnologia"], cidade: "São Paulo", estado: "SP" },
  { chave: "telecom", nome: "ConectaNet Telecomunicações Ltda", tipo: "PJ", doc: cnpj(214), papeis: ["Empresa de Tecnologia"], cidade: "Curitiba", estado: "PR" },
  { chave: "energia", nome: "Companhia Paranaense de Energia Elétrica (fatura)", tipo: "PJ", doc: cnpj(215), papeis: ["Prestador de Serviço"], cidade: "Curitiba", estado: "PR" },
  { chave: "seguradora", nome: "Amparo Seguros S.A.", tipo: "PJ", doc: cnpj(216), papeis: ["Seguradora"], cidade: "São Paulo", estado: "SP" },
  { chave: "orgao", nome: "Instituto Estadual de Meio Ambiente (taxas)", tipo: "PJ", doc: cnpj(217), papeis: ["Órgão Público"], cidade: "Belo Horizonte", estado: "MG" },
  { chave: "conselho", nome: "Conselho Regional de Engenharia (anuidades e ART)", tipo: "PJ", doc: cnpj(218), papeis: ["Órgão Público"], cidade: "Curitiba", estado: "PR" },
  { chave: "beneficios", nome: "VidaPlena Benefícios e Saúde Ltda", tipo: "PJ", doc: cnpj(219), papeis: ["Prestador de Serviço"], cidade: "Curitiba", estado: "PR" },
  { chave: "sst", nome: "Segura Medicina e Segurança do Trabalho Ltda", tipo: "PJ", doc: cnpj(220), papeis: ["Prestador de Serviço"], cidade: "Curitiba", estado: "PR" },
  { chave: "marketing", nome: "Clareira Comunicação Digital Ltda", tipo: "PJ", doc: cnpj(221), papeis: ["Agência de Marketing"], cidade: "Curitiba", estado: "PR" },
  { chave: "governo", nome: "Receita Federal — Simples Nacional (DAS)", tipo: "PJ", doc: cnpj(222), papeis: ["Órgão Público"], cidade: "Brasília", estado: "DF" },
  { chave: "folha", nome: "Folha de pagamento — colaboradores CLT", tipo: "PJ", doc: cnpj(223), papeis: ["Mão de Obra CLT"], cidade: "Curitiba", estado: "PR" },
] as const;
export type ChaveFornecedor = (typeof FORNECEDORES)[number]["chave"];

export const FUNCIONARIOS = [
  { nome: "Helena Martins Duarte", cargo: "Diretora técnica — Eng. ambiental", setor: "Diretoria", salario: 18500, admissao: -60 },
  { nome: "Rafael Tavares Moura", cargo: "Coordenador de licenciamento", setor: "Técnico", salario: 13200, admissao: -40 },
  { nome: "Camila Ferraz Lopes", cargo: "Bióloga sênior — fauna", setor: "Técnico", salario: 10800, admissao: -30 },
  { nome: "Thiago Nogueira Bastos", cargo: "Geólogo", setor: "Técnico", salario: 10200, admissao: -26 },
  { nome: "Juliana Ribeiro Antunes", cargo: "Engenheira florestal", setor: "Técnico", salario: 9400, admissao: -18 },
  { nome: "Marcos Vinícius Pacheco", cargo: "Analista de geoprocessamento", setor: "Técnico", salario: 7600, admissao: -15 },
  { nome: "Patrícia Gomes Salles", cargo: "Química — qualidade da água", setor: "Técnico", salario: 8300, admissao: -12 },
  { nome: "Diego Santana Freitas", cargo: "Técnico de campo", setor: "Campo", salario: 4600, admissao: -10 },
  { nome: "Bruna Carvalho Mendes", cargo: "Técnica de campo", setor: "Campo", salario: 4400, admissao: 4 },
  { nome: "Fernanda Lima Rocha", cargo: "Analista administrativo-financeira", setor: "Administrativo", salario: 6200, admissao: -36 },
  { nome: "Lucas Andrade Pires", cargo: "Estagiário de engenharia ambiental", setor: "Técnico", salario: 1900, admissao: 6 },
] as const;

/** Membros da equipe com login (sem senha: só aparecem em Usuários). */
export const EQUIPE_COM_ACESSO = [
  { nome: "Helena Martins Duarte", email: "helena.duarte@consultoria-ambiental.exemplo", role: "admin" },
  { nome: "Fernanda Lima Rocha", email: "fernanda.rocha@consultoria-ambiental.exemplo", role: "membro" },
  { nome: "Rafael Tavares Moura", email: "rafael.moura@consultoria-ambiental.exemplo", role: "engenheiro" },
] as const;

export const ESTOQUE = [
  { nome: "Frasco de coleta âmbar 1 L", unidade: "un", categoria: "Coleta", custo: 9.8, minimo: 120 },
  { nome: "Frasco estéril 250 mL (microbiologia)", unidade: "un", categoria: "Coleta", custo: 4.6, minimo: 150 },
  { nome: "Gelo reciclável (placa)", unidade: "un", categoria: "Coleta", custo: 7.2, minimo: 40 },
  { nome: "Luva nitrílica (caixa c/ 100)", unidade: "cx", categoria: "EPI", custo: 42, minimo: 10 },
  { nome: "Bota de PVC cano longo", unidade: "par", categoria: "EPI", custo: 68, minimo: 6 },
  { nome: "Perneira de proteção contra picadas", unidade: "par", categoria: "EPI", custo: 95, minimo: 4 },
  { nome: "Colete refletivo de campo", unidade: "un", categoria: "EPI", custo: 38, minimo: 8 },
  { nome: "Fita de marcação (rolo)", unidade: "rolo", categoria: "Campo", custo: 12.5, minimo: 20 },
] as const;

// ─────────────────────────────── projetos e contratos ───────────────────────────────

/**
 * Item de contrato com cronograma de medição. `medicoes` lista [mês, valor]:
 * percentual (0–100) para critério "percentual", quantidade para
 * "quantidade"/"entrega". O mês conta a partir do mês 0 (12 meses atrás);
 * meses ≥ 12 são futuros e entram só no orçamento/previsão.
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

/** Custo recorrente do projeto: [conta, fornecedor, valor base, meses ativos (relativos ao início)]. */
export interface CustoDemo {
  conta: string;
  fornecedor: ChaveFornecedor;
  descricao: string;
  valor: number;
  /** meses relativos ao início do projeto em que o custo ocorre. */
  meses: number[] | "todos";
  variacao?: number;
}

export interface ProjetoDemo {
  chave: string;
  /** onde o serviço acontece (o município fictício do PMSB não tem código IBGE). */
  local: { endereco: string; municipio: string; uf: string; codigoIbge: string | null };
  nome: string;
  cliente: ChaveCliente;
  contaReceita: string;
  modalidade: string;
  /** mês de início (0 = 12 meses atrás). */
  inicio: number;
  duracao: number;
  titulo: string;
  objeto: string;
  numeroCliente: string;
  gestor: string;
  coordenador: string;
  prazoPagamentoDias: number;
  itens: ItemDemo[];
  custos: CustoDemo[];
  /** meses de medição (absolutos) cuja fatura fica em aberto, vencida. */
  faturasEmAtraso?: number[];
  aditivo?: { mes: number; tipos: string[]; valor: number; mesesExtras: number; justificativa: string; item: string };
  concluido?: boolean;
}

const seq = (de: number, ate: number) => Array.from({ length: ate - de + 1 }, (_, i) => de + i);
const pctIgual = (meses: number[], total = 100): [number, number][] => {
  const base = Math.floor((total / meses.length) * 100) / 100;
  return meses.map((m, i) => [m, i === meses.length - 1 ? Math.round((total - base * (meses.length - 1)) * 100) / 100 : base]);
};

export const PROJETOS: ProjetoDemo[] = [
  {
    chave: "mina",
    local: { endereco: "Estrada da Mina, km 14 — Zona Rural", municipio: "Itabira", uf: "MG", codigoIbge: "3131703" },
    nome: "Licenciamento Ambiental — Mina Serra do Cobre",
    cliente: "mina",
    contaReceita: "R.2",
    modalidade: "Licenciamento ambiental",
    inicio: 0,
    duracao: 18,
    titulo: "EIA/RIMA e Licença Prévia — Expansão da Cava Norte",
    objeto: "Elaboração do EIA/RIMA, diagnóstico dos meios físico, biótico e socioeconômico e acompanhamento do processo de Licença Prévia junto ao órgão ambiental estadual.",
    numeroCliente: "SC-CT-2025/118",
    gestor: "Helena Martins Duarte",
    coordenador: "Rafael Tavares Moura",
    prazoPagamentoDias: 30,
    itens: [
      { codigo: "01", descricao: "Diagnóstico do meio físico (geologia, hidrogeologia, qualidade do ar e ruído)", unidade: "vb", quantidade: 1, valorUnitario: 248000, criterio: "percentual", etapa: "Diagnóstico", medicoes: pctIgual(seq(0, 8)) },
      { codigo: "02", descricao: "Diagnóstico do meio biótico (flora e fauna, 4 campanhas)", unidade: "vb", quantidade: 1, valorUnitario: 276000, criterio: "percentual", etapa: "Diagnóstico", medicoes: pctIgual(seq(1, 11)) },
      { codigo: "03", descricao: "Diagnóstico socioeconômico e patrimônio cultural", unidade: "vb", quantidade: 1, valorUnitario: 184000, criterio: "percentual", etapa: "Diagnóstico", medicoes: pctIgual(seq(3, 11)) },
      { codigo: "04", descricao: "Avaliação de impactos, programas ambientais e consolidação do EIA/RIMA", unidade: "un", quantidade: 1, valorUnitario: 232000, criterio: "entrega", etapa: "Consolidação", medicoes: [[14, 1]] },
      { codigo: "05", descricao: "Apoio às audiências públicas e respostas ao órgão ambiental", unidade: "un", quantidade: 2, valorUnitario: 46000, criterio: "entrega", etapa: "Licença Prévia", medicoes: [[16, 1], [17, 1]] },
    ],
    custos: [
      { conta: "1.1", fornecedor: "socio", descricao: "Consultoria socioeconômica — diagnóstico", valor: 14200, meses: seq(3, 11) },
      { conta: "1.4", fornecedor: "fauna", descricao: "Campanha de fauna — EIA", valor: 21500, meses: [2, 5, 8, 11] },
      { conta: "1.4", fornecedor: "botanico", descricao: "Levantamento florístico (RPA)", valor: 7800, meses: [1, 4, 7, 10] },
      { conta: "1.2", fornecedor: "lab", descricao: "Análises de água subterrânea e superficial", valor: 9200, meses: [1, 3, 5, 7] },
      { conta: "1.3", fornecedor: "drone", descricao: "Levantamento topográfico e ortofoto com drone", valor: 18600, meses: [1] },
      { conta: "2.3", fornecedor: "locadora", descricao: "Locação de caminhonete 4x4", valor: 6900, meses: seq(0, 11), variacao: 0.03 },
      { conta: "2.1", fornecedor: "posto", descricao: "Combustível — campo", valor: 2400, meses: seq(0, 11), variacao: 0.25 },
      { conta: "2.2", fornecedor: "hotel", descricao: "Hospedagem da equipe de campo", valor: 4800, meses: [1, 2, 4, 5, 7, 8, 10, 11], variacao: 0.2 },
      { conta: "3.1", fornecedor: "orgao", descricao: "Taxa de análise do processo de LP", valor: 18740, meses: [2] },
      { conta: "3.2", fornecedor: "conselho", descricao: "ART do EIA/RIMA", valor: 262.55, meses: [0] },
      { conta: "3.3", fornecedor: "grafica", descricao: "Publicação do requerimento de LP", valor: 2350, meses: [2] },
    ],
  },
  {
    chave: "agua",
    local: { endereco: "Rodovia PR-151, s/n — ETE Vale Verde", municipio: "Ponta Grossa", uf: "PR", codigoIbge: "4119905" },
    nome: "Monitoramento da Qualidade da Água — ETE Vale Verde",
    cliente: "saneamento",
    contaReceita: "R.3",
    modalidade: "Monitoramento ambiental",
    inicio: 0,
    duracao: 12,
    titulo: "Programa de monitoramento de efluentes e corpo receptor — ETE Vale Verde",
    objeto: "Campanhas mensais de coleta e análise de efluente bruto/tratado e do corpo receptor, com relatórios mensais e relatório anual de atendimento às condicionantes da Licença de Operação.",
    numeroCliente: "VV-0417/2025",
    gestor: "Helena Martins Duarte",
    coordenador: "Patrícia Gomes Salles",
    prazoPagamentoDias: 28,
    itens: [
      { codigo: "01", descricao: "Campanha mensal de monitoramento (coleta, análises e relatório)", unidade: "campanha", quantidade: 12, valorUnitario: 31800, criterio: "quantidade", etapa: "Monitoramento", medicoes: seq(0, 17).map((m) => [m, 1] as [number, number]) }, // 12 do contrato + 6 do aditivo
      { codigo: "02", descricao: "Relatório anual de atendimento às condicionantes", unidade: "un", quantidade: 1, valorUnitario: 24000, criterio: "entrega", etapa: "Relatórios", medicoes: [[11, 1]] },
    ],
    aditivo: { mes: 10, tipos: ["acrescimo_valor", "prorrogacao_prazo"], valor: 190800, mesesExtras: 6, justificativa: "Prorrogação do programa por 6 campanhas, conforme renovação da LO.", item: "01" },
    custos: [
      { conta: "1.2", fornecedor: "lab", descricao: "Análises laboratoriais — campanha mensal", valor: 10400, meses: "todos", variacao: 0.08 },
      { conta: "2.5", fornecedor: "insumos", descricao: "Frascos, reagentes e gelo para coleta", valor: 1650, meses: "todos", variacao: 0.15 },
      { conta: "2.6", fornecedor: "lab", descricao: "Envio refrigerado de amostras", valor: 480, meses: "todos", variacao: 0.1 },
      { conta: "2.1", fornecedor: "posto", descricao: "Combustível — coletas", valor: 950, meses: "todos", variacao: 0.2 },
      { conta: "3.2", fornecedor: "conselho", descricao: "ART do programa de monitoramento", valor: 262.55, meses: [0] },
    ],
  },
  {
    chave: "pgrs",
    local: { endereco: "Av. das Indústrias, 2200 — Distrito Industrial", municipio: "Araucária", uf: "PR", codigoIbge: "4101804" },
    nome: "PGRS e Auditoria de Conformidade — Planta Araucária",
    cliente: "quimica",
    contaReceita: "R.5",
    modalidade: "Consultoria e estudos ambientais",
    inicio: 2,
    duracao: 8,
    titulo: "Plano de Gerenciamento de Resíduos Sólidos e auditoria de conformidade legal",
    objeto: "Inventário de resíduos, elaboração do PGRS, auditoria de conformidade legal ambiental e treinamento das equipes da planta industrial.",
    numeroCliente: "QA-PO-2026-031",
    gestor: "Rafael Tavares Moura",
    coordenador: "Juliana Ribeiro Antunes",
    prazoPagamentoDias: 30,
    concluido: true,
    itens: [
      { codigo: "01", descricao: "Inventário de resíduos e diagnóstico da planta", unidade: "vb", quantidade: 1, valorUnitario: 52000, criterio: "percentual", etapa: "Diagnóstico", medicoes: pctIgual([2, 3, 4]) },
      { codigo: "02", descricao: "Elaboração do PGRS", unidade: "un", quantidade: 1, valorUnitario: 68000, criterio: "entrega", etapa: "PGRS", medicoes: [[6, 1]] },
      { codigo: "03", descricao: "Auditoria de conformidade legal ambiental", unidade: "un", quantidade: 1, valorUnitario: 46000, criterio: "entrega", etapa: "Auditoria", medicoes: [[8, 1]] },
      { codigo: "04", descricao: "Treinamento das equipes operacionais", unidade: "turma", quantidade: 4, valorUnitario: 5200, criterio: "quantidade", etapa: "Treinamento", medicoes: [[8, 2], [9, 2]] },
    ],
    custos: [
      { conta: "1.2", fornecedor: "lab", descricao: "Caracterização de resíduos (NBR 10.004)", valor: 12800, meses: [1, 2] },
      { conta: "2.1", fornecedor: "posto", descricao: "Deslocamentos à planta", valor: 620, meses: "todos", variacao: 0.3 },
      { conta: "4.1", fornecedor: "grafica", descricao: "Impressão e encadernação do PGRS", valor: 1480, meses: [4] },
      { conta: "3.2", fornecedor: "conselho", descricao: "ART do PGRS", valor: 262.55, meses: [0] },
    ],
  },
  {
    chave: "eolica",
    local: { endereco: "Estrada Geral da Serra, s/n — Parque Eólico", municipio: "Osório", uf: "RS", codigoIbge: "4313508" },
    nome: "Monitoramento de Fauna — Parque Eólico Ventos do Sul",
    cliente: "eolica",
    contaReceita: "R.3",
    modalidade: "Monitoramento ambiental",
    inicio: 2,
    duracao: 15,
    titulo: "Programa de monitoramento de avifauna e quiropterofauna — fase de operação",
    objeto: "Quatro campanhas sazonais de monitoramento de aves e morcegos, busca de carcaças sob aerogeradores e relatório consolidado para a renovação da LO.",
    numeroCliente: "VDS-2026-0009",
    gestor: "Helena Martins Duarte",
    coordenador: "Camila Ferraz Lopes",
    prazoPagamentoDias: 45,
    faturasEmAtraso: [11],
    itens: [
      { codigo: "01", descricao: "Campanha sazonal de monitoramento de fauna", unidade: "campanha", quantidade: 4, valorUnitario: 98500, criterio: "quantidade", etapa: "Campanhas", medicoes: [[2, 1], [5, 1], [8, 1], [11, 1]] },
      { codigo: "02", descricao: "Relatório consolidado anual", unidade: "un", quantidade: 1, valorUnitario: 38000, criterio: "entrega", etapa: "Relatórios", medicoes: [[15, 1]] },
    ],
    custos: [
      { conta: "1.4", fornecedor: "fauna", descricao: "Equipe de apoio — campanha de fauna", valor: 26500, meses: [0, 3, 6, 9] },
      { conta: "2.2", fornecedor: "hotel", descricao: "Hospedagem e alimentação — campanha", valor: 7200, meses: [0, 3, 6, 9], variacao: 0.12 },
      { conta: "2.3", fornecedor: "locadora", descricao: "Locação de veículo 4x4 — campanha", valor: 4900, meses: [0, 3, 6, 9] },
      { conta: "2.1", fornecedor: "posto", descricao: "Combustível — campanha", valor: 2100, meses: [0, 3, 6, 9], variacao: 0.2 },
      { conta: "2.4", fornecedor: "drone", descricao: "Locação de detectores ultrassônicos", valor: 3800, meses: [0, 3, 6, 9] },
      { conta: "3.2", fornecedor: "conselho", descricao: "ART do programa de monitoramento", valor: 262.55, meses: [0] },
    ],
  },
  {
    chave: "prad",
    local: { endereco: "Estrada do Mergulhão, s/n — Gleba Reserva das Araucárias", municipio: "São José dos Pinhais", uf: "PR", codigoIbge: "4125506" },
    nome: "Inventário Florestal e PRAD — Reserva das Araucárias",
    cliente: "incorporadora",
    contaReceita: "R.2",
    modalidade: "Consultoria e estudos ambientais",
    inicio: 5,
    duracao: 12,
    titulo: "Inventário florestal, autorização de supressão e PRAD do loteamento",
    objeto: "Inventário florestal da gleba, pedido de autorização de supressão de vegetação, elaboração e execução do Plano de Recuperação de Áreas Degradadas (plantio compensatório).",
    numeroCliente: "HV-SUP-2026/07",
    gestor: "Rafael Tavares Moura",
    coordenador: "Juliana Ribeiro Antunes",
    prazoPagamentoDias: 30,
    itens: [
      { codigo: "01", descricao: "Inventário florestal (100% da gleba)", unidade: "ha", quantidade: 42, valorUnitario: 1850, criterio: "quantidade", etapa: "Inventário", medicoes: [[5, 14], [6, 16], [7, 12]] },
      { codigo: "02", descricao: "Pedido de autorização de supressão de vegetação", unidade: "un", quantidade: 1, valorUnitario: 38000, criterio: "entrega", etapa: "Autorização", medicoes: [[8, 1]] },
      { codigo: "03", descricao: "Elaboração do PRAD", unidade: "un", quantidade: 1, valorUnitario: 42000, criterio: "entrega", etapa: "PRAD", medicoes: [[9, 1]] },
      { codigo: "04", descricao: "Execução do plantio compensatório (implantação e manutenção)", unidade: "vb", quantidade: 1, valorUnitario: 110300, criterio: "percentual", etapa: "Execução do PRAD", medicoes: [[11, 25], [13, 25], [15, 25], [16, 25]] },
    ],
    custos: [
      { conta: "1.4", fornecedor: "botanico", descricao: "Identificação botânica — inventário (RPA)", valor: 6400, meses: [0, 1, 2] },
      { conta: "1.5", fornecedor: "drone", descricao: "Ortofoto e modelo digital de terreno", valor: 9800, meses: [0] },
      { conta: "3.1", fornecedor: "orgao", descricao: "Taxa de autorização de supressão", valor: 4120, meses: [3] },
      { conta: "5.3", fornecedor: "viveiro", descricao: "Mudas nativas e insumos de plantio", valor: 21800, meses: [6, 8, 10] },
      { conta: "2.1", fornecedor: "posto", descricao: "Deslocamentos — inventário e plantio", valor: 780, meses: "todos", variacao: 0.25 },
      { conta: "3.2", fornecedor: "conselho", descricao: "ART do inventário e PRAD", valor: 262.55, meses: [0] },
    ],
  },
  {
    chave: "pmsb",
    local: { endereco: "Praça da Matriz, 100 — Centro", municipio: "Santa Clara do Oeste", uf: "PR", codigoIbge: null },
    nome: "Plano Municipal de Saneamento Básico — Santa Clara do Oeste",
    cliente: "prefeitura",
    contaReceita: "R.5",
    modalidade: "Consultoria e estudos ambientais",
    inicio: 8,
    duracao: 12,
    titulo: "Revisão do Plano Municipal de Saneamento Básico (PMSB)",
    objeto: "Diagnóstico dos quatro eixos do saneamento, prognóstico, programas e ações, minuta de lei e audiências públicas para a revisão do PMSB.",
    numeroCliente: "Contrato nº 087/2026 — Pregão Eletrônico 41/2026",
    gestor: "Helena Martins Duarte",
    coordenador: "Thiago Nogueira Bastos",
    prazoPagamentoDias: 30,
    faturasEmAtraso: [10],
    itens: [
      { codigo: "01", descricao: "Plano de trabalho e mobilização social", unidade: "un", quantidade: 1, valorUnitario: 28000, criterio: "entrega", etapa: "Plano de trabalho", medicoes: [[8, 1]] },
      { codigo: "02", descricao: "Diagnóstico técnico-participativo (4 eixos)", unidade: "vb", quantidade: 1, valorUnitario: 118000, criterio: "percentual", etapa: "Diagnóstico", medicoes: [[9, 30], [10, 35], [11, 35]] },
      { codigo: "03", descricao: "Prognóstico, programas, projetos e ações", unidade: "un", quantidade: 1, valorUnitario: 96000, criterio: "entrega", etapa: "Prognóstico", medicoes: [[14, 1]] },
      { codigo: "04", descricao: "Minuta de lei e audiências públicas", unidade: "un", quantidade: 1, valorUnitario: 72000, criterio: "entrega", etapa: "Consolidação", medicoes: [[18, 1]] },
    ],
    custos: [
      { conta: "1.1", fornecedor: "socio", descricao: "Mobilização social e oficinas comunitárias", valor: 8900, meses: [0, 2, 3] },
      { conta: "2.1", fornecedor: "posto", descricao: "Deslocamentos ao município", valor: 1350, meses: "todos", variacao: 0.2 },
      { conta: "2.2", fornecedor: "hotel", descricao: "Hospedagem — visitas técnicas", valor: 2600, meses: [1, 2, 3], variacao: 0.15 },
      { conta: "4.2", fornecedor: "drone", descricao: "Bases cartográficas e imagens de satélite", valor: 5400, meses: [1] },
      { conta: "3.2", fornecedor: "conselho", descricao: "ART do PMSB", valor: 262.55, meses: [0] },
    ],
  },
];

/** Despesas fixas mensais da sede: [conta, fornecedor, descrição, valor, variação]. */
export const FIXAS_DA_SEDE: [string, ChaveFornecedor, string, number, number][] = [
  ["A.1", "imobiliaria", "Aluguel e condomínio — sala comercial", 9800, 0],
  ["A.2", "energia", "Energia elétrica — escritório", 860, 0.15],
  ["A.2", "telecom", "Internet fibra 600 Mb", 349.9, 0],
  ["A.3", "telecom", "Telefonia móvel corporativa (8 linhas)", 612, 0.05],
  ["F.1", "contabil", "Honorários contábeis e folha", 3400, 0],
  ["TI.1", "software", "SaaS (e-mail, nuvem, gestão de projetos)", 1280, 0.03],
  ["TI.3", "software", "Licenças GIS e CAD", 2350, 0],
  ["F.3", "seguradora", "Seguro de RC profissional e equipamentos", 1420, 0],
  ["RH.6", "beneficios", "Plano de saúde e vale-refeição", 12600, 0.04],
  ["M.3", "marketing", "Site, redes sociais e conteúdo técnico", 1900, 0],
];

/**
 * Ajuste de porte: os preços acima estão na base da proposta; a escala leva o
 * faturamento a ~R$ 3,5 mi/ano, coerente com uma consultoria de 11 pessoas
 * (margem operacional na casa dos 15%). O aditivo acompanha o preço do item.
 */
const ESCALA_DE_PRECO = 1.72;
for (const p of PROJETOS) {
  for (const it of p.itens) it.valorUnitario = Math.round((it.valorUnitario * ESCALA_DE_PRECO) / 100) * 100;
  if (p.aditivo) {
    const item = p.itens.find((i) => i.codigo === p.aditivo!.item)!;
    p.aditivo.valor = item.valorUnitario * p.aditivo.mesesExtras;
  }
}
