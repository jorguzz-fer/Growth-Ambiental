/**
 * Prompt DP (Fase 3 · revisão V5, decisão BDP-1/BDP-2 de 18/10): cada conta
 * do Plano de Contas tem exatamente UMA categoria da DRE, editável no cadastro
 * do plano, com um padrão de boa prática que o sistema já traz. Módulo PURO.
 *
 * "Plano sem categoria não existe": a coluna `chart_account.dre_category` só
 * guarda o que a pessoa escolheu; vazia, vale o padrão daqui. A despesa herda
 * e trava a categoria da conta só com a chave `despesa_categoria_do_plano`
 * ligada (muda número da DRE). Desligada, tudo segue como antes.
 */
import { CATEGORIAS_DRE, type CategoriaDRE } from "@/lib/calc/constants";
import { categoriaValidaParaDespesa } from "@/lib/calc/natureza-dre";

export interface ContaDoPlano {
  code: string;
  groupCode: string;
  kind: "cef" | "complementar" | string;
  natureza: "receita" | "despesa" | string;
  /** O que a pessoa escolheu; null = padrão. */
  dreCategory?: string | null;
}

/**
 * Padrão de boa prática por conta do plano de contas padrão (constants.ts).
 * Regra do Thiago: gasto de obra é custo variável, nunca despesa. O que é da
 * venda (comissão, marketing) é despesa variável; a estrutura (escritório,
 * TI, contabilidade) é despesa fixa; tarifa, juro e multa são despesa
 * financeira. Conta que não está aqui cai na regra do grupo e, por fim, na
 * do tipo (`cef` → Custo Variável; complementar → Despesa Fixa), a mesma de
 * `defaultDreCategory`.
 */
const PADRAO_POR_CONTA: Readonly<Record<string, CategoriaDRE>> = {
  "T.6": "Despesa Fixa", // Jurídico: estrutura, não a obra
  "F.2": "Despesas Financeiras",
  "F.4": "Despesas Financeiras",
  "F.6": "Despesas Financeiras",
  "F.7": "Despesas Financeiras", // desconto obtido: entra negativo na mesma linha dos encargos
  "RH.4": "Custo Variável", // EPI e uniforme vão para a obra
  "TR.3": "Despesa Variável", // IRPJ/CSLL acompanham a receita
};

const PADRAO_POR_GRUPO: Readonly<Record<string, CategoriaDRE>> = {
  T: "Custo Variável", // projetos, licenças e RT do empreendimento
  C: "Despesa Variável",
  M: "Despesa Variável",
  TI: "Despesa Fixa",
  A: "Despesa Fixa",
  F: "Despesa Fixa",
  RH: "Custo Fixo",
  P: "Custo Variável", // pós-obra é custo da obra entregue
  TR: "Custo Variável", // INSS de obra, ISS, taxas e ITBI do empreendimento
  // Plano da Growth Ambiental (plano-ambiental.ts). Códigos que o plano de
  // construção não usa — não mudam a DRE de quem está nele.
  IMP: "Despesa Variável", // imposto sobre o faturamento acompanha a receita
  J: "Despesa Fixa", // jurídico e registros da empresa: estrutura
};

export const ehCategoria = (v: unknown): v is CategoriaDRE =>
  typeof v === "string" && (CATEGORIAS_DRE as readonly string[]).includes(v);

/** O padrão de boa prática para uma conta (sem olhar o que foi escolhido). */
export function categoriaPadraoDaConta(c: Omit<ContaDoPlano, "dreCategory">): CategoriaDRE {
  if (c.natureza === "receita") return "Receita";
  return PADRAO_POR_CONTA[c.code] ?? PADRAO_POR_GRUPO[c.groupCode] ?? (c.kind === "cef" ? "Custo Variável" : "Despesa Fixa");
}

/** A categoria que vale para a conta: a escolhida, ou o padrão. */
export function categoriaDaConta(c: ContaDoPlano): CategoriaDRE {
  return ehCategoria(c.dreCategory) ? c.dreCategory : categoriaPadraoDaConta(c);
}

/** Categorias que a conta pode ter, pela natureza (despesa não é "Receita"). */
export function categoriasPermitidasDaConta(natureza: string): CategoriaDRE[] {
  return natureza === "receita" ? ["Receita"] : CATEGORIAS_DRE.filter((c) => categoriaValidaParaDespesa(c));
}

/** Recusa da escolha no cadastro do plano; null = aceita. */
export function recusaDeCategoriaDaConta(natureza: string, categoria: unknown): string | null {
  if (!ehCategoria(categoria)) return "Escolha uma categoria da DRE da lista.";
  if (!categoriasPermitidasDaConta(natureza).includes(categoria))
    return natureza === "receita" ? "Conta de receita tem a categoria Receita." : "Conta de despesa não pode ter a categoria Receita.";
  return null;
}

/** Mapa código da conta → categoria que vale (para a tela e o servidor). */
export function mapaDeCategorias(contas: readonly ContaDoPlano[]): Record<string, CategoriaDRE> {
  const out: Record<string, CategoriaDRE> = {};
  for (const c of contas) out[c.code] = categoriaDaConta(c);
  return out;
}

/**
 * O mapa para ler despesas: só as contas cuja categoria serve para despesa.
 * Despesa lançada (por engano) numa conta de receita mantém a categoria
 * escolhida, para nunca virar receita na DRE (RG-01).
 */
export function mapaParaDespesas(mapa: Readonly<Record<string, CategoriaDRE>>): Record<string, CategoriaDRE> {
  return Object.fromEntries(Object.entries(mapa).filter(([, c]) => categoriaValidaParaDespesa(c)));
}

/**
 * A categoria que a despesa grava com a chave ligada. `contaCef` sem conta
 * no plano (legado) mantém a escolhida; conta de receita não serve para
 * despesa.
 */
export function categoriaHerdada(
  mapa: Readonly<Record<string, CategoriaDRE>>,
  contaCef: string | null | undefined,
  escolhida: string | null | undefined,
): { ok: true; categoria: string | null; herdada: boolean } | { ok: false; error: string } {
  const doPlano = contaCef ? mapa[contaCef] : undefined;
  if (!doPlano) return { ok: true, categoria: escolhida ?? null, herdada: false };
  if (!categoriaValidaParaDespesa(doPlano))
    return { ok: false, error: `A conta ${contaCef} é de receita no Plano de Contas. Escolha uma conta de despesa.` };
  return { ok: true, categoria: doPlano, herdada: true };
}

export interface MudancaDeCategoria {
  conta: string;
  de: string;
  para: CategoriaDRE;
  despesas: number;
  valor: number;
}

/**
 * Prévia da chave (BDP-3): quantas despesas lançadas mudam de categoria, por
 * conta e par de categorias. Só as que têm conta no plano e categoria
 * diferente da da conta. Nada é gravado.
 */
export function despesasQueMudam(
  despesas: readonly { contaCef: string | null; categoriaDre: string | null; valor: number }[],
  mapa: Readonly<Record<string, CategoriaDRE>>,
): MudancaDeCategoria[] {
  const por = new Map<string, MudancaDeCategoria>();
  for (const d of despesas) {
    const para = d.contaCef ? mapa[d.contaCef] : undefined;
    if (!para || d.categoriaDre === para) continue;
    const de = d.categoriaDre ?? "(sem categoria)";
    const k = `${d.contaCef}|${de}`;
    const m = por.get(k) ?? { conta: d.contaCef!, de, para, despesas: 0, valor: 0 };
    m.despesas++;
    m.valor = Math.round((m.valor + d.valor) * 100) / 100;
    por.set(k, m);
  }
  return [...por.values()].sort((a, b) => a.conta.localeCompare(b.conta, undefined, { numeric: true }) || a.de.localeCompare(b.de));
}
