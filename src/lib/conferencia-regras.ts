/**
 * Regras da Conferência de lançamentos (Prompt AN). Módulo PURO.
 *
 * O motivo tem CÓDIGO e TEXTO (4.4): o código governa o comportamento (quem
 * pode ser selecionado, o que conta como pendência); o texto é só
 * apresentação. Renomear um texto não muda a seleção.
 *
 * A regra de qual categoria é credora continua em `calc/natureza-dre.ts`
 * (que não muda, 10.4). Aqui ela só é APLICADA à lista de categorias do
 * sistema, para a consulta receber o conjunto como parâmetro (4.2) — sem
 * copiar a lista.
 */
import { CATEGORIAS_DRE } from "@/lib/calc/constants";
import { categoriaValidaParaDespesa, naturezaCategoriaDre } from "@/lib/calc/natureza-dre";

export type MotivoCodigo = "categoria_credora" | "sem_categoria" | "valor_zero" | "sem_competencia" | "cancelado";

export interface Motivo {
  codigo: MotivoCodigo;
  texto: string;
}

export const TEXTO_MOTIVO: Record<MotivoCodigo, string> = {
  categoria_credora: "categoria de receita em lançamento de despesa",
  sem_categoria: "sem categoria DRE",
  valor_zero: "valor zero",
  // Parte 1.3 — o texto diz a CONSEQUÊNCIA. A DRE põe a despesa sem
  // competência só no Acumulado (balde NO_COMP): ela some de toda visão por
  // ano, por período e mensal. Ver V2-PROMPT-AN-FASE1.md, conflito.
  sem_competencia: "sem competência — fica fora da DRE por mês e por ano",
  cancelado: "lançamento cancelado",
};

/** As categorias que `natureza-dre.ts` chama de credoras, dentre as do sistema. */
export const CATEGORIAS_CREDORAS: string[] = CATEGORIAS_DRE.filter((c) => naturezaCategoriaDre(c) === "credora");

export function semCompetencia(c: string | null | undefined): boolean {
  return !c || c.trim() === "";
}

/**
 * Motivos de uma despesa estar na Conferência; `null` quando não está.
 *
 * As três condições antigas ficam exatamente como eram (10.1), inclusive a
 * cancelada: aparece só se já houver outro motivo. A quarta condição — sem
 * competência — NÃO conta para a cancelada: cancelada não entra na DRE, então
 * a competência ausente não tem efeito nela.
 */
export function motivosDaDespesa(d: {
  categoriaDre: string | null;
  valor: number | string;
  competencia: string | null;
  cancelado: boolean;
}): Motivo[] | null {
  const codigos: MotivoCodigo[] = [];
  if (d.categoriaDre && !categoriaValidaParaDespesa(d.categoriaDre)) codigos.push("categoria_credora");
  if (!d.categoriaDre) codigos.push("sem_categoria");
  if (Number(d.valor) === 0) codigos.push("valor_zero");
  if (!d.cancelado && semCompetencia(d.competencia)) codigos.push("sem_competencia");
  if (d.cancelado) {
    if (codigos.length === 0) return null;
    codigos.push("cancelado");
  }
  if (codigos.length === 0) return null;
  return codigos.map((codigo) => ({ codigo, texto: TEXTO_MOTIVO[codigo] }));
}

export function temMotivo(motivos: readonly Motivo[], codigo: MotivoCodigo): boolean {
  return motivos.some((m) => m.codigo === codigo);
}

/** Pode entrar na seleção do lote? Cancelada fica visível, mas fora. */
export function selecionavel(motivos: readonly Motivo[]): boolean {
  return !temMotivo(motivos, "cancelado");
}

// ── Paginação por cursor (4.3) ────────────────────────────────────────────
// Ordem: maior valor primeiro (é por onde a conferência começa), e id para
// desempate. O cursor é o último item da página: "valor~id".

export const TAMANHO_DA_PAGINA = 100;

export function codificarCursor(valor: number, id: string): string {
  return `${valor.toFixed(2)}~${id}`;
}

export function lerCursor(c: string | null | undefined): { valor: string; id: string } | null {
  if (!c) return null;
  const m = /^(-?\d+(?:\.\d{1,2})?)~([0-9a-f-]{36})$/i.exec(c.trim());
  return m ? { valor: m[1], id: m[2] } : null;
}

/** Competência do filtro: "MM/AAAA" (aceita "M/AAAA"); null se inválida. */
export function lerCompetenciaDoFiltro(v: string | null | undefined): string | null {
  const m = /^(\d{1,2})\/(\d{4})$/.exec((v ?? "").trim());
  if (!m) return null;
  const mes = Number(m[1]);
  if (mes < 1 || mes > 12) return null;
  return `${String(mes).padStart(2, "0")}/${m[2]}`;
}

// ── Resultado do lote (2.3) ───────────────────────────────────────────────

export type MotivoPulada = "cancelada" | "ja_na_categoria" | "nao_encontrada";

export const TEXTO_PULADA: Record<MotivoPulada, string> = {
  cancelada: "cancelada — o registro está encerrado",
  ja_na_categoria: "já estava nessa categoria",
  nao_encontrada: "não encontrada nesta empresa",
};

export interface Pulada {
  id: string;
  numDoc: string | null;
  motivo: MotivoPulada;
}

/** Mensagem da tela com os três números: selecionadas, alteradas e puladas. */
export function mensagemDoLote(r: { selecionadas: number; alteradas: number; puladas: readonly Pulada[] }): string {
  const base = `${r.selecionadas} selecionado(s) · ${r.alteradas} reclassificado(s)`;
  if (r.puladas.length === 0) return `${base}. A alteração está registrada na auditoria.`;
  const porMotivo = new Map<MotivoPulada, number>();
  for (const p of r.puladas) porMotivo.set(p.motivo, (porMotivo.get(p.motivo) ?? 0) + 1);
  const detalhe = [...porMotivo].map(([m, n]) => `${n} ${TEXTO_PULADA[m]}`).join("; ");
  return `${base} · ${r.puladas.length} pulado(s): ${detalhe}.`;
}

// ── Lote híbrido (Prompt AN, Parte 3 · BAN-2 = opção 3) ───────────────────

export interface Homogeneidade {
  /** Fornecedores distintos na seleção (lançamento sem fornecedor conta como um a mais, cada). */
  fornecedores: number;
  contasCef: number;
  /** Mesmo fornecedor, ou mesma conta do plano, em TODA a seleção. */
  homogenea: boolean;
  criterio: "fornecedor" | "conta do plano" | null;
}

/**
 * A seleção é homogênea? O lote é legítimo quando dez notas do mesmo
 * fornecedor caíram sem categoria; é perigoso quando fornecedores diferentes
 * viram uma categoria só (3.2). Lançamento SEM fornecedor (ou sem conta do plano)
 * não prova nada — conta como distinto de todos.
 */
export function homogeneidade(sel: readonly { id: string; fornecedorId: string | null; contaCef: string | null }[]): Homogeneidade {
  const distintos = (chave: (r: (typeof sel)[number]) => string | null) => {
    const s = new Set<string>();
    for (const r of sel) {
      const v = chave(r);
      s.add(v && v.trim() ? `v:${v.trim()}` : `vazio:${r.id}`);
    }
    return s.size;
  };
  const fornecedores = distintos((r) => r.fornecedorId);
  const contasCef = distintos((r) => r.contaCef);
  const porFornecedor = sel.length > 0 && fornecedores === 1;
  const porConta = sel.length > 0 && contasCef === 1;
  return {
    fornecedores,
    contasCef,
    homogenea: porFornecedor || porConta,
    criterio: porFornecedor ? "fornecedor" : porConta ? "conta do plano" : null,
  };
}

/** Aviso antes do preview quando a seleção mistura fornecedores (3.2). */
export function avisoDaSelecao(h: Homogeneidade, quantos: number): string | null {
  if (quantos <= 1 || h.homogenea) return null;
  return `A seleção tem ${h.fornecedores} fornecedores diferentes. O lote só vale para um fornecedor ou uma conta do plano — escolha a categoria linha a linha, ou marque só um fornecedor.`;
}
