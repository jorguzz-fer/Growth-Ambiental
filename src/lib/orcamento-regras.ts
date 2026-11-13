/**
 * Regras da grade de Orçamentos / Previsão Atualizada (Prompt D). Módulo PURO.
 *
 * - "Receitas do Projeto" é linha FIXA do sistema (BD-5): o total vem do
 *   cadastro do projeto (BD-1: entrada financeira da empresa) e a
 *   distribuição mensal é do usuário. Não é grupo do Plano de Contas e não
 *   pode ser removida (4-A.4).
 * - As demais linhas vêm dos grupos do Plano de Contas da natureza do bloco,
 *   filtrados pela SELEÇÃO gravada (BD-6) quando ela existe; sem seleção, o
 *   padrão: todos os grupos ativos. O fallback antigo ("se nenhum grupo é
 *   receita, todos viram receita") deixa de existir: o bloco de receitas nunca
 *   fica vazio por causa da linha fixa.
 * - Linha com dado gravado SEMPRE aparece (legada ou não selecionada): nada
 *   some da tela sem decisão humana (BD-2, 4-A.5).
 */
import { entradaFinanceira } from "@/lib/projeto-regras";
import { RECEITAS_PROJETO_KEY, RECEITAS_PROJETO_LABEL, defaultDreCategory } from "@/lib/budget/config";
import type { PlanningAccountRow } from "@/lib/planning";

export interface GrupoDoPlano {
  groupCode: string;
  groupName: string;
  kind: "cef" | "complementar";
  natureza: "receita" | "despesa";
  ativo: boolean;
  /**
   * 0079 — com a chave "orcamento_categoria_do_plano": a categoria da DRE que
   * TODAS as contas ativas do grupo têm (null = não são homogêneas ou chave
   * desligada). Vale para linha nova; a categoria gravada na linha manda.
   */
  categoria?: string | null;
}

export interface ContaGravada {
  kind: string;
  rowKey: string;
  dreCategory: string | null;
  total: number;
}

export interface CadastroDeReceita {
  valorConstrucao: string | number | null | undefined;
  valorTerreno: string | number | null | undefined;
  terrenoForaCaixa: boolean | null | undefined;
}

const informado = (v: string | number | null | undefined) => !(v === null || v === undefined || String(v).trim() === "");

/**
 * BD-1: o total de "Receitas do Projeto" = entrada financeira da empresa
 * (regra que a tela de Projetos já mostra). `null` = o cadastro não tem valor
 * de receita — a célula mostra "falta preencher", nunca R$ 0,00 (3.5).
 */
export function totalReceitasDoProjeto(p: CadastroDeReceita): number | null {
  const temConstrucao = informado(p.valorConstrucao);
  const temTerreno = informado(p.valorTerreno);
  if (!temConstrucao && !(p.terrenoForaCaixa === false && temTerreno)) return null;
  return entradaFinanceira(p);
}

/** Linha fixa de receita (3.1). `total` vem do cadastro; `pct` do gravado. */
export function linhaFixaDeReceita(totalDoCadastro: number | null, pct: Record<string, number>): PlanningAccountRow {
  return {
    rowKey: RECEITAS_PROJETO_KEY,
    label: RECEITAS_PROJETO_LABEL,
    dreCategory: "Receita",
    total: totalDoCadastro ?? 0,
    pct,
    ativo: true,
    fromChart: false,
    fixa: true,
    semTotalNoCadastro: totalDoCadastro == null,
  };
}

/**
 * Monta as linhas de um bloco. `selecao` = chaves gravadas em budget_selecao
 * para (versão, bloco); `null` = sem seleção (padrão).
 */
export function linhasDoBloco(args: {
  nat: "receita" | "despesa";
  grupos: GrupoDoPlano[];
  selecao: string[] | null;
  contas: ContaGravada[];
  pctDe: (kind: string, rowKey: string) => Record<string, number>;
  totalDoCadastro: number | null;
}): PlanningAccountRow[] {
  const { nat, grupos, selecao, contas, pctDe, totalDoCadastro } = args;
  const rows: PlanningAccountRow[] = [];
  const seen = new Set<string>();
  const contasDoBloco = contas.filter((c) => c.kind === nat);
  const totalOf = new Map(contasDoBloco.map((c) => [c.rowKey, c.total]));
  const dreOf = new Map(contasDoBloco.map((c) => [c.rowKey, c.dreCategory]));

  if (nat === "receita") {
    rows.push(linhaFixaDeReceita(totalDoCadastro, pctDe(nat, RECEITAS_PROJETO_KEY)));
    seen.add(RECEITAS_PROJETO_KEY);
  }

  // Grupos ativos da natureza — todos (padrão) ou só os selecionados (BD-6).
  const ativos = grupos.filter((g) => g.ativo && g.natureza === nat);
  const escolhidos = selecao ? ativos.filter((g) => selecao.includes(g.groupCode)) : ativos;
  // Com seleção gravada, a ordem é a da seleção; sem, a do plano.
  if (selecao) escolhidos.sort((a, b) => selecao.indexOf(a.groupCode) - selecao.indexOf(b.groupCode));
  for (const g of escolhidos) {
    seen.add(g.groupCode);
    rows.push({
      rowKey: g.groupCode,
      label: g.groupName,
      dreCategory: nat === "receita" ? "Receita" : dreOf.get(g.groupCode) ?? g.categoria ?? defaultDreCategory(g.kind),
      total: totalOf.get(g.groupCode) ?? 0,
      pct: pctDe(nat, g.groupCode),
      ativo: true,
      fromChart: true,
      fixa: false,
    });
  }

  // Tudo o que tem dado gravado e não entrou acima: legado (chave sem grupo
  // ativo) ou grupo fora da seleção com valor. Aparece, nunca some (4-A.5).
  const porCodigo = new Map(grupos.map((g) => [g.groupCode, g]));
  for (const c of contasDoBloco) {
    if (seen.has(c.rowKey)) continue;
    seen.add(c.rowKey);
    const g = porCodigo.get(c.rowKey);
    rows.push({
      rowKey: c.rowKey,
      label: g?.groupName ?? c.rowKey,
      dreCategory: c.dreCategory ?? (nat === "receita" ? "Receita" : null),
      total: c.total,
      pct: pctDe(nat, c.rowKey),
      ativo: false,
      fromChart: false,
      fixa: false,
    });
  }
  return rows;
}

/* ─── incluir / excluir linha (4-A) ──────────────────────────────────── */

/** Grupos que a lista de inclusão oferece (4-A.2): ativos, da natureza, ausentes da grade. */
export function gruposDisponiveis(grupos: GrupoDoPlano[], nat: "receita" | "despesa", naGrade: string[]): GrupoDoPlano[] {
  const presentes = new Set(naGrade);
  return grupos.filter((g) => g.ativo && g.natureza === nat && !presentes.has(g.groupCode));
}

export function recusaDaInclusao(grupo: GrupoDoPlano | undefined, nat: "receita" | "despesa", naGrade: string[]): string | null {
  if (!grupo) return "Grupo não encontrado no Plano de Contas. Cadastre-o lá antes de incluir.";
  if (!grupo.ativo) return "Grupo inativo no Plano de Contas.";
  if (grupo.natureza !== nat) return `O grupo é de ${grupo.natureza}; este bloco é de ${nat}.`;
  if (naGrade.includes(grupo.groupCode)) return "Esse grupo já está na grade.";
  return null;
}

/** 4-A.4: a linha fixa e as legadas não podem ser removidas. */
export function recusaDaRemocao(row: Pick<PlanningAccountRow, "fixa" | "fromChart">): string | null {
  if (row.fixa) return "“Receitas do Projeto” é fixa: carrega o total do cadastro e é a origem da receita reconhecida.";
  if (!row.fromChart) return "Linha legada: aparece e é legível, e só muda por decisão humana registrada no Plano de Contas.";
  return null;
}

export interface ResumoDaRemocao {
  total: number;
  competencias: number;
  temValor: boolean;
}

/** O que a remoção de uma linha com dado perde (4-A.3): total e competências. */
export function resumoDaRemocao(total: number, pct: Record<string, number>): ResumoDaRemocao {
  const competencias = Object.values(pct).filter((p) => (Number(p) || 0) !== 0).length;
  return { total, competencias, temValor: Math.abs(total) > 0.005 || competencias > 0 };
}

export function textoDaRemocao(label: string, r: ResumoDaRemocao, brl: (n: number) => string): string {
  if (!r.temValor) return `Retirar “${label}” da grade. O grupo continua no Plano de Contas e pode voltar.`;
  return `Remover o lançamento de “${label}”: ${r.competencias} competência(s) distribuída(s) e o total de ${brl(r.total)} serão apagados desta versão. O grupo continua no Plano de Contas.`;
}
