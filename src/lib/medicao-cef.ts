/**
 * Relatório CEF — orçado × medido por grupo de custo direto (Prompt V, seção 3).
 * As linhas são os grupos de custo direto do Plano de Contas DA EMPRESA (os
 * mesmos que a Medição oferece) — não mais o plano fixo de obra.
 * Módulo PURO: recebe linhas de orçamento e medições já carregadas.
 *
 * O que ele diz, e só isso:
 *  - "% do orçado medido" (3.2): razão FINANCEIRA valor medido ÷ valor
 *    orçado. Não é percentual físico declarado — o rótulo diz o que o número é.
 *  - Grupo sem orçado não é 0%: é estado vazio (3.3). Orçado, realizado e
 *    percentual ausentes aparecem iguais ("—", 3.10).
 *  - O Total não esconde excedente (3.4): acima de 100% é sinalizado, não
 *    truncado.
 *  - Retenção final (3.6): a Caixa libera até 95%; a partir daí mede-se sem
 *    liberação — o relatório avisa quando o total chega lá.
 *  - A coluna "% Ref. CEF" SAIU (3.5, opção 2): a constante era do piloto,
 *    indexada por posição e somava 99,66 — não é desta obra.
 *  - Acumulado desde o início da obra por padrão (3.9); recorte por
 *    competência só quando os DOIS limites vêm informados, e rotulado.
 */
import { monthKeyIndex } from "@/lib/planning";
import { grupoDaChave } from "@/lib/planocontas-regras";

export const LIMITE_RETENCAO_PCT = 95;

export interface LinhaOrcada {
  kind: string;
  rowKey: string | null;
  mes: string | null;
  valor: string | number | null;
}
export interface MedicaoDoRelatorio {
  grupoCode: string;
  competencia: string;
  valor: string | number | null;
}

export interface LinhaCef {
  codigo: string;
  nome: string;
  orcado: number | null;
  realizado: number | null;
  /** % do orçado medido; null quando não há orçado ou não há medição. */
  pct: number | null;
  /** motivo do "—" na coluna de %, para a legenda. */
  estado: "ok" | "sem_orcado" | "sem_medicao" | "vazio";
  excedeu: boolean;
}

export interface RelatorioCef {
  linhas: LinhaCef[];
  totalOrcado: number;
  totalRealizado: number;
  totalPct: number | null;
  totalExcedeu: boolean;
  /** quanto o medido passa do orçado, em R$ (0 quando não passa). */
  excedente: number;
  retencao: { atingida: boolean; limite: number };
  recorte: { ativo: boolean; de: string | null; ate: string | null };
}

/** 3.9 — recorte por competência só com os dois limites válidos ("MM/YYYY"). */
export function recorteDeCompetencia(de: string | null | undefined, ate: string | null | undefined): { ativo: boolean; de: string | null; ate: string | null } {
  const lo = de ? monthKeyIndex(de) : null;
  const hi = ate ? monthKeyIndex(ate) : null;
  if (lo == null || hi == null || lo > hi) return { ativo: false, de: null, ate: null };
  return { ativo: true, de: de!, ate: ate! };
}

function dentro(mes: string | null, recorte: { ativo: boolean; de: string | null; ate: string | null }): boolean {
  if (!recorte.ativo) return true;
  const i = mes ? monthKeyIndex(mes) : null;
  if (i == null) return false;
  return i >= monthKeyIndex(recorte.de!)! && i <= monthKeyIndex(recorte.ate!)!;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Grupo do relatório: código e nome, na ordem do plano. */
export interface GrupoDoRelatorio {
  codigo: string;
  nome: string;
}

export function montarRelatorioCef(args: { grupos: readonly GrupoDoRelatorio[]; orcamento: readonly LinhaOrcada[]; medicoes: readonly MedicaoDoRelatorio[]; recorte?: { ativo: boolean; de: string | null; ate: string | null }; nomes?: ReadonlyMap<string, string> }): RelatorioCef {
  const recorte = args.recorte ?? { ativo: false, de: null, ate: null };
  const codigos = new Set(args.grupos.map((g) => g.codigo));
  const orcadoPorGrupo = new Map<string, number>();
  for (const l of args.orcamento) {
    if (l.kind !== "despesa" || !dentro(l.mes, recorte)) continue;
    const grp = grupoDaChave(l.rowKey, codigos);
    orcadoPorGrupo.set(grp, (orcadoPorGrupo.get(grp) || 0) + Number(l.valor ?? 0));
  }
  const realizadoPorGrupo = new Map<string, number>();
  for (const m of args.medicoes) {
    if (!dentro(m.competencia, recorte)) continue;
    realizadoPorGrupo.set(m.grupoCode, (realizadoPorGrupo.get(m.grupoCode) || 0) + Number(m.valor ?? 0));
  }
  // Orçado ou medido num grupo inativo/fora do plano (ex.: plano anterior
  // arquivado) não some do relatório nem do total: ganha linha própria.
  const nomeDaMedicao = new Map(args.medicoes.map((m) => [m.grupoCode, (m as { grupoName?: string }).grupoName]));
  const extras = [...new Set([...realizadoPorGrupo.keys(), ...orcadoPorGrupo.keys()])]
    // medição é sempre de custo direto; orçado, só de grupo de custo direto (ativo ou inativo, em `nomes`)
    .filter((c) => c && !codigos.has(c) && ((realizadoPorGrupo.get(c) ?? 0) > 0 || ((orcadoPorGrupo.get(c) ?? 0) > 0 && !!args.nomes?.has(c))))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((c) => ({ codigo: c, nome: args.nomes?.get(c) ?? nomeDaMedicao.get(c) ?? "Grupo fora do plano" }));
  const linhas: LinhaCef[] = [...args.grupos, ...extras].map((g) => {
    const orcado = orcadoPorGrupo.has(g.codigo) && (orcadoPorGrupo.get(g.codigo) || 0) > 0 ? r2(orcadoPorGrupo.get(g.codigo)!) : null;
    const realizado = realizadoPorGrupo.has(g.codigo) && (realizadoPorGrupo.get(g.codigo) || 0) > 0 ? r2(realizadoPorGrupo.get(g.codigo)!) : null;
    const pct = orcado != null && realizado != null ? r2((realizado / orcado) * 100) : null;
    const estado: LinhaCef["estado"] = orcado == null && realizado == null ? "vazio" : orcado == null ? "sem_orcado" : realizado == null ? "sem_medicao" : "ok";
    return { codigo: g.codigo, nome: g.nome, orcado, realizado, pct, estado, excedeu: pct != null && pct > 100 };
  });
  const totalOrcado = r2(linhas.reduce((a, l) => a + (l.orcado ?? 0), 0));
  const totalRealizado = r2(linhas.reduce((a, l) => a + (l.realizado ?? 0), 0));
  const totalPct = totalOrcado > 0 ? r2((totalRealizado / totalOrcado) * 100) : null;
  return {
    linhas,
    totalOrcado,
    totalRealizado,
    totalPct,
    totalExcedeu: totalPct != null && totalPct > 100,
    excedente: totalRealizado > totalOrcado ? r2(totalRealizado - totalOrcado) : 0,
    retencao: { atingida: totalPct != null && totalPct >= LIMITE_RETENCAO_PCT, limite: LIMITE_RETENCAO_PCT },
    recorte,
  };
}

/**
 * 3.8 — qual Orçamento o relatório usa: o pedido na URL (se for desta obra),
 * senão o marcado como padrão, senão o mais recente. A escolha é declarada
 * no cabeçalho; com mais de um, a tela mostra o seletor.
 */
export function escolherOrcamento<V extends { id: string; kind: string; isDefault: boolean; createdAt: Date }>(versions: readonly V[], pedido: string | null | undefined): { escolhido: V | null; opcoes: V[]; motivo: "pedido" | "padrao" | "mais_recente" | "unico" | "nenhum" } {
  const opcoes = versions.filter((v) => v.kind === "budget").sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  if (opcoes.length === 0) return { escolhido: null, opcoes, motivo: "nenhum" };
  if (opcoes.length === 1) return { escolhido: opcoes[0], opcoes, motivo: "unico" };
  const p = pedido ? opcoes.find((v) => v.id === pedido) : null;
  if (p) return { escolhido: p, opcoes, motivo: "pedido" };
  const d = opcoes.find((v) => v.isDefault);
  if (d) return { escolhido: d, opcoes, motivo: "padrao" };
  return { escolhido: opcoes[0], opcoes, motivo: "mais_recente" };
}

export function textoDaEscolha(motivo: ReturnType<typeof escolherOrcamento>["motivo"]): string {
  switch (motivo) {
    case "pedido":
      return "orçamento escolhido no seletor";
    case "padrao":
      return "orçamento marcado como padrão (há mais de um; troque no seletor)";
    case "mais_recente":
      return "orçamento mais recente (há mais de um; troque no seletor)";
    case "unico":
      return "único orçamento da obra";
    default:
      return "sem versão de Orçamento";
  }
}

export const LEGENDA_ESTADO: Record<LinhaCef["estado"], string> = {
  ok: "",
  sem_orcado: "sem orçado no Orçamento (há medição)",
  sem_medicao: "sem medição lançada",
  vazio: "sem orçado e sem medição",
};

/** Grupos de custo direto (bloco "cef") ATIVOS do plano da empresa, na ordem do código. */
export function gruposDoRelatorioCef(contas: readonly { kind: string; groupCode: string; groupName: string; ativo?: boolean | null }[]): GrupoDoRelatorio[] {
  return [...new Map(contas.filter((c) => c.kind === "cef" && c.ativo !== false).map((c) => [c.groupCode, { codigo: c.groupCode, nome: c.groupName }])).values()].sort((a, b) =>
    a.codigo.localeCompare(b.codigo, undefined, { numeric: true }),
  );
}

/** Nome de todo grupo de CUSTO DIRETO do plano (inclusive inativo), para a linha extra. */
export function nomesDosGrupos(contas: readonly { kind: string; groupCode: string; groupName: string }[]): Map<string, string> {
  return new Map(contas.filter((c) => c.kind === "cef").map((c) => [c.groupCode, c.groupName]));
}
