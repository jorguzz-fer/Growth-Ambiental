import type { InccRow } from "./types";

/**
 * Constantes de domínio portadas do protótipo (growth-tools-construction.html).
 * Usadas no seed do banco (docs/STACK.md §6) e nas telas de Plano de Contas,
 * Despesas e Parâmetros/INCC.
 */

export interface ChartSubitem {
  id: string;
  nome: string;
}
export interface ChartGroup {
  id: string;
  nome: string;
  /** Natureza das contas do grupo; ausente = "despesa". */
  natureza?: "receita" | "despesa";
  sub: ChartSubitem[];
}

/** Plano de Contas: grupos de obra (CEF) + grupos complementares. §8.3 */
export const PLANO_CONTAS: {
  obra: ChartGroup[];
  complementar: ChartGroup[];
} = {
  obra: [
    {
      id: "1",
      nome: "Serviços Preliminares Gerais",
      sub: [
        { id: "1.1", nome: "Serviços técnicos (projetos, sondagem, licenças)" },
        { id: "1.2", nome: "Instalações e canteiros" },
        { id: "1.3", nome: "Ligações provisórias" },
        { id: "1.4", nome: "Manutenção canteiro/consumo" },
        { id: "1.5", nome: "Transportes máquinas e equipamentos" },
        { id: "1.6", nome: "Controle tecnológico" },
        { id: "1.7", nome: "Gestão de resíduos" },
        { id: "1.8", nome: "Gestão da qualidade" },
        { id: "1.9", nome: "Equipamentos de proteção coletivos" },
        { id: "1.10", nome: "Administração local (engenheiros, mestres)" },
      ],
    },
    {
      id: "2",
      nome: "Fundações e Contenções",
      sub: [
        { id: "2.1", nome: "Fundações" },
        { id: "2.2", nome: "Contenções/arrimos especiais" },
      ],
    },
    {
      id: "3",
      nome: "Supraestrutura",
      sub: [
        { id: "3.1", nome: "Estrutura de concreto" },
        { id: "3.2", nome: "Estrutura metálica" },
        { id: "3.3", nome: "Pré-moldados" },
      ],
    },
    {
      id: "4",
      nome: "Paredes e Painéis",
      sub: [
        { id: "4.1", nome: "Alvenaria/fechamentos" },
        { id: "4.2", nome: "Esquadrias metálicas" },
        { id: "4.3", nome: "Esquadrias de madeira" },
        { id: "4.4", nome: "Vidros/esquadrias especiais" },
      ],
    },
    {
      id: "5",
      nome: "Cobertura e Proteções",
      sub: [
        { id: "5.1", nome: "Telhados" },
        { id: "5.2", nome: "Impermeabilizações" },
      ],
    },
    {
      id: "6",
      nome: "Revestimentos",
      sub: [
        { id: "6.1", nome: "Revestimentos internos" },
        { id: "6.2", nome: "Azulejos" },
        { id: "6.3", nome: "Revestimentos externos" },
        { id: "6.4", nome: "Forros" },
        { id: "6.5", nome: "Pinturas" },
      ],
    },
    {
      id: "7",
      nome: "Pavimentação",
      sub: [
        { id: "7.1", nome: "Cerâmica" },
        { id: "7.2", nome: "Cimentados" },
        { id: "7.3", nome: "Rodapés, soleiras, peitoris" },
      ],
    },
    {
      id: "8",
      nome: "Instalações",
      sub: [
        { id: "8.1", nome: "Elétricas/telefônicas" },
        { id: "8.2", nome: "Hidráulicas/gás/incêndio" },
        { id: "8.3", nome: "Sanitárias/pluvial" },
        { id: "8.4", nome: "Aparelhos, metais e bancadas" },
        { id: "8.5", nome: "Elevadores/bombas" },
        { id: "8.6", nome: "Lógica/automação" },
      ],
    },
    {
      id: "9",
      nome: "Complementações",
      sub: [
        { id: "9.1", nome: "Calafete/limpeza" },
        { id: "9.2", nome: "Ligações definitivas" },
        { id: "9.3", nome: "Outros acabamentos" },
      ],
    },
    {
      id: "10",
      nome: "Infraestrutura e Urbanização",
      sub: [
        { id: "10.1", nome: "Terraplenagem" },
        { id: "10.2", nome: "Água potável" },
        { id: "10.3", nome: "Esgoto sanitário" },
        { id: "10.4", nome: "Drenagem pluvial" },
        { id: "10.5", nome: "Pavimentação externa" },
        { id: "10.6", nome: "Energia e iluminação" },
        { id: "10.7", nome: "Paisagismo e ambientação" },
      ],
    },
  ],
  complementar: [
    {
      id: "T",
      nome: "Técnicos / Projetos",
      sub: [
        { id: "T.1", nome: "Arquitetura" },
        { id: "T.2", nome: "Estrutural" },
        { id: "T.3", nome: "Hidro/elétrico/SPDA" },
        { id: "T.4", nome: "Licenças e alvarás" },
        { id: "T.5", nome: "Responsável Técnico (RT)" },
        { id: "T.6", nome: "Jurídico" },
        { id: "T.7", nome: "Cartório/RI" },
      ],
    },
    {
      id: "C",
      nome: "Comercial / Vendas",
      sub: [
        { id: "C.1", nome: "Comissão imobiliária" },
        { id: "C.2", nome: "CRM/plataforma de vendas" },
        { id: "C.3", nome: "Stand e decorado" },
        { id: "C.4", nome: "Material de vendas" },
        { id: "C.5", nome: "Foto/vídeo" },
      ],
    },
    {
      id: "M",
      nome: "Marketing / Comunicação",
      sub: [
        { id: "M.1", nome: "Agência de marketing" },
        { id: "M.2", nome: "Mídia paga (Meta/Google)" },
        { id: "M.3", nome: "Redes sociais" },
        { id: "M.4", nome: "Gráfica/impressão" },
        { id: "M.5", nome: "Outdoor/mídia física" },
      ],
    },
    {
      id: "TI",
      nome: "Tecnologia",
      sub: [
        { id: "TI.1", nome: "Software/SaaS" },
        { id: "TI.2", nome: "Hospedagem/cloud" },
        { id: "TI.3", nome: "Assinatura digital" },
        { id: "TI.4", nome: "TI/suporte" },
        { id: "TI.5", nome: "Hardware/equipamentos" },
      ],
    },
    {
      id: "A",
      nome: "Administrativo / Escritório",
      sub: [
        { id: "A.1", nome: "Aluguel escritório" },
        { id: "A.2", nome: "Água/luz/internet" },
        { id: "A.3", nome: "Telefonia" },
        { id: "A.4", nome: "Material de escritório" },
        { id: "A.5", nome: "Serviços de limpeza/segurança" },
      ],
    },
    {
      id: "F",
      nome: "Financeiro / Contábil",
      sub: [
        { id: "F.1", nome: "Honorários contábeis" },
        { id: "F.2", nome: "Tarifas bancárias" },
        { id: "F.3", nome: "Seguros" },
        { id: "F.4", nome: "IOF/juros/multas" },
        { id: "F.5", nome: "Cartório/reconhecimento de firma" },
        // Contas exigidas pelo pacote de Controladoria. Entram no grupo
        // Financeiro/Contábil que JÁ EXISTE — não se cria plano de contas novo,
        // os planos atuais servem a todos os projetos.
        //
        // RG-07: juros de mora por atraso são perda operacional do período, não
        // custo de obra. O CPC 20 só autoriza capitalizar encargos de
        // financiamento diretamente atribuíveis à construção — juros punitivos
        // por inadimplência não se enquadram.
        { id: "F.6", nome: "Despesas financeiras — juros e multas de mora" },
        // Espelho de F.6: desconto obtido por antecipação/negociação é receita
        // financeira, também fora do custo da obra.
        { id: "F.7", nome: "Receitas financeiras — descontos obtidos" },
        // RG-03: obrigação com quem desembolsou pela empresa. É PASSIVO, baixado
        // contra caixa na restituição — nunca despesa nova, nunca receita.
        { id: "F.8", nome: "Terceiros a restituir (passivo)" },
        // RG-04: espelho do anterior. Dinheiro que o terceiro recebeu do cliente
        // em nome da empresa e ainda não repassou. É ATIVO; a receita já foi
        // reconhecida na venda.
        { id: "F.9", nome: "Valores a receber de terceiros (ativo)" },
      ],
    },
    {
      id: "RH",
      nome: "Recursos Humanos",
      sub: [
        { id: "RH.1", nome: "Folha de pagamento CLT" },
        { id: "RH.2", nome: "Pagamento RPA" },
        { id: "RH.3", nome: "Medicina do trabalho" },
        { id: "RH.4", nome: "EPI/uniformes" },
        { id: "RH.5", nome: "Seguro de vida" },
      ],
    },
    {
      id: "P",
      nome: "Pós-obra",
      sub: [
        { id: "P.1", nome: "Habite-se/AVCB" },
        { id: "P.2", nome: "Vistoria de entrega" },
        { id: "P.3", nome: "Assistência técnica/garantia" },
        { id: "P.4", nome: "CND/certidões" },
      ],
    },
    {
      id: "TR",
      nome: "Tributos",
      sub: [
        { id: "TR.1", nome: "INSS obra" },
        { id: "TR.2", nome: "ISS" },
        { id: "TR.3", nome: "IRPJ/CSLL" },
        { id: "TR.4", nome: "Alvará/taxas municipais" },
        { id: "TR.5", nome: "ITBI" },
      ],
    },
  ],
};

/** As 7 categorias da DRE. §8.3 */
export const CATEGORIAS_DRE = [
  "Receita",
  "Custo Variável",
  "Custo Fixo",
  "Despesa Variável",
  "Despesa Fixa",
  "Retiradas",
  "Investimento",
  "Empréstimos",
  "Despesas Financeiras",
] as const;
export type CategoriaDRE = (typeof CATEGORIAS_DRE)[number];

/** Tipos de bem/serviço aceitos como permuta (aba Permuta). */
export const TIPOS_PERMUTA = [
  "Imóvel",
  "Veículo",
  "Materiais",
  "Serviços",
  "Equipamentos",
  "Máquinas",
  "Móveis",
  "Terrenos",
  "Outros bens",
  "Outros",
] as const;

/**
 * Os 20 papéis possíveis de um stakeholder. §3
 * "Pagador por Terceiro" (Prompt W, 1.1): quem desembolsa pela empresa —
 * nem sempre é sócio. É o papel que filtra "Quem desembolsou" em Despesas e
 * Restituições; concedido só nesta tela, item a item.
 */
export const PAPEIS_STAKEHOLDER = [
  "Fornecedor de Material",
  "Prestador de Serviço",
  "Mão de Obra CLT",
  "Mão de Obra RPA",
  "Banco/Financiador",
  "Comprador de Unidade",
  "Sócio/Quotista",
  "Responsável Técnico (RT)",
  "Imobiliária Parceira",
  "Corretor Autônomo",
  "Incorporador",
  "Construtora",
  "Escritório Contábil",
  "Escritório Jurídico",
  "Agência de Marketing",
  "Empresa de Tecnologia",
  "Órgão Público",
  "Consultor/Assessor",
  "Seguradora",
  "Pagador por Terceiro",
] as const;
export type PapelStakeholder = (typeof PAPEIS_STAKEHOLDER)[number];

/** Custo de edificações de referência (SIGNATURE SUARÃO). §1 */
export const CUSTO_EDIFICACOES_REF = 46789988.9;

/**
 * Percentuais de referência CEF por grupo de obra (alinhados a PLANO_CONTAS.obra,
 * grupos 1..10). Usados na Medição de Obra para o orçado. Ver docs/SPEC.md §9.7.
 */
export const PCT_REF_CEF = [
  11.79, 5.74, 32.21, 16.05, 1.09, 14.75, 0.33, 17.23, 0.46, 0.01,
];

/**
 * Tabela INCC padrão de 48 meses (05/2025 → 04/2029). Variação mensal (`mo`) e
 * acumulada (`ac`) em %. Editável por projeto na tela Parâmetros/INCC. §6
 */
export const DEFAULT_INCC: InccRow[] = [
  { m: "05/2025", mo: 0.26, ac: 0.26 },
  { m: "06/2025", mo: 0.96, ac: 1.222 },
  { m: "07/2025", mo: 0.91, ac: 2.144 },
  { m: "08/2025", mo: 0.7, ac: 2.859 },
  { m: "09/2025", mo: 0.21, ac: 3.075 },
  { m: "10/2025", mo: 0.21, ac: 3.291 },
  { m: "11/2025", mo: 0.28, ac: 3.58 },
  { m: "12/2025", mo: 0.21, ac: 3.798 },
  { m: "01/2026", mo: 0.63, ac: 4.452 },
  { m: "02/2026", mo: 0.34, ac: 4.807 },
  { m: "03/2026", mo: 0.36, ac: 5.184 },
  { m: "04/2026", mo: 1.04, ac: 6.278 },
  { m: "05/2026", mo: 0.51, ac: 6.82 },
  { m: "06/2026", mo: 0.53, ac: 7.386 },
  { m: "07/2026", mo: 0.49, ac: 7.912 },
  { m: "08/2026", mo: 0.46, ac: 8.409 },
  { m: "09/2026", mo: 0.44, ac: 8.886 },
  { m: "10/2026", mo: 0.46, ac: 9.387 },
  { m: "11/2026", mo: 0.48, ac: 9.912 },
  { m: "12/2026", mo: 0.5, ac: 10.461 },
  { m: "01/2027", mo: 0.52, ac: 11.036 },
  { m: "02/2027", mo: 0.51, ac: 11.602 },
  { m: "03/2027", mo: 0.52, ac: 12.182 },
  { m: "04/2027", mo: 0.54, ac: 12.788 },
  { m: "05/2027", mo: 0.5, ac: 13.352 },
  { m: "06/2027", mo: 0.5, ac: 13.919 },
  { m: "07/2027", mo: 0.49, ac: 14.477 },
  { m: "08/2027", mo: 0.49, ac: 15.038 },
  { m: "09/2027", mo: 0.5, ac: 15.613 },
  { m: "10/2027", mo: 0.5, ac: 16.191 },
  { m: "11/2027", mo: 0.5, ac: 16.772 },
  { m: "12/2027", mo: 0.51, ac: 17.368 },
  { m: "01/2028", mo: 0.51, ac: 17.966 },
  { m: "02/2028", mo: 0.51, ac: 18.568 },
  { m: "03/2028", mo: 0.5, ac: 19.161 },
  { m: "04/2028", mo: 0.5, ac: 19.757 },
  { m: "05/2028", mo: 0.5, ac: 20.355 },
  { m: "06/2028", mo: 0.5, ac: 20.957 },
  { m: "07/2028", mo: 0.5, ac: 21.562 },
  { m: "08/2028", mo: 0.5, ac: 22.17 },
  { m: "09/2028", mo: 0.5, ac: 22.781 },
  { m: "10/2028", mo: 0.5, ac: 23.394 },
  { m: "11/2028", mo: 0.5, ac: 24.011 },
  { m: "12/2028", mo: 0.5, ac: 24.632 },
  { m: "01/2029", mo: 0.5, ac: 25.255 },
  { m: "02/2029", mo: 0.5, ac: 25.881 },
  { m: "03/2029", mo: 0.5, ac: 26.51 },
  { m: "04/2029", mo: 0.5, ac: 27.143 },
];

/**
 * Contas do plano usadas pelas regras contábeis do pacote de Controladoria.
 *
 * Ficam nomeadas aqui para que o código nunca dependa de string solta espalhada
 * e para que a correspondência com as RGs seja rastreável. Todas pertencem ao
 * grupo "Financeiro / Contábil", que já existia.
 */
export const CONTAS_CONTROLADORIA = {
  /** RG-07 — juros e multas de mora. Despesa financeira do período. */
  jurosMora: "F.6",
  /** RG-07 — descontos obtidos. Receita financeira do período. */
  descontosObtidos: "F.7",
  /** RG-03 — obrigação com quem desembolsou pela empresa (passivo). */
  terceirosARestituir: "F.8",
  /** RG-04 — valores que um terceiro recebeu e ainda não repassou (ativo). */
  valoresAReceberDeTerceiros: "F.9",
} as const;
