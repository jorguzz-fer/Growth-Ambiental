import type { InccRow } from "./types";

/**
 * Constantes de domínio. O plano de contas padrão (consultoria ambiental)
 * mora em `plano-ambiental.ts`; aqui ficam só os tipos do formato antigo.
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

