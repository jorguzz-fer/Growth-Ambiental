/**
 * Decisão de 01/10/2026 (as quatro chaves): "Guarda a prévia. Exporta ou
 * imprime a comparação antes/depois de cada uma antes de ligar, e registra
 * quem ligou e quando." Aqui ficam as tabelas da exportação (puras) e as
 * regras de ligar: a prévia exportada há pouco e a ordem combinada.
 */
import type { PreviaDreProjeto } from "@/lib/dre-inputs";
import type { PreviaFluxoObra } from "@/lib/fluxo-caixa";
import type { PreviaDashboardObra } from "@/lib/dashboard-previa";
import type { PreviaResumoObra } from "@/lib/resumo-previa";

/** Chaves cuja prévia está em /chaves e pode ser exportada. */
export const CHAVES_COM_PREVIA = [
  "rascunho_fora_dos_relatorios",
  "dashboard_definicao_nova",
  "fluxo_definicao_nova",
  "resumo_definicao_nova",
  "dre_definicao_nova",
] as const;
export type ChaveComPrevia = (typeof CHAVES_COM_PREVIA)[number];
export const temPreviaExportavel = (c: unknown): c is ChaveComPrevia =>
  typeof c === "string" && (CHAVES_COM_PREVIA as readonly string[]).includes(c);

/** Ordem combinada em 01/10: uma de cada vez, com alguns dias entre elas. */
export const ORDEM_DAS_CHAVES = ["dashboard_definicao_nova", "fluxo_definicao_nova", "resumo_definicao_nova", "dre_definicao_nova"] as const;
export const DIAS_ENTRE_CHAVES = 3;
/** A prévia exportada vale como "antes" por este tempo. */
export const VALIDADE_DA_EXPORTACAO_DIAS = 7;

const DIA = 24 * 60 * 60 * 1000;

/** Há exportação da prévia desta chave recente o bastante para ligar? */
export function exportacaoValida(exportadaEm: Date | null | undefined, agora: Date): boolean {
  return !!exportadaEm && agora.getTime() - exportadaEm.getTime() <= VALIDADE_DA_EXPORTACAO_DIAS * DIA;
}

/**
 * Avisos (não travam) sobre a ordem combinada: chave anterior ainda
 * desligada, ou outra das quatro ligada há menos de DIAS_ENTRE_CHAVES dias.
 */
export function avisosDaOrdem(
  chave: string,
  estado: ReadonlyMap<string, { ligada: boolean; alteradaEm: Date }>,
  titulos: Readonly<Record<string, string>>,
  agora: Date,
): string[] {
  const i = (ORDEM_DAS_CHAVES as readonly string[]).indexOf(chave);
  if (i < 0) return [];
  const avisos: string[] = [];
  const antes = ORDEM_DAS_CHAVES.slice(0, i).filter((c) => !estado.get(c)?.ligada);
  if (antes.length) avisos.push(`Pela ordem combinada, antes desta vem: ${antes.map((c) => titulos[c] ?? c).join(", ")}.`);
  for (const c of ORDEM_DAS_CHAVES) {
    const e = estado.get(c);
    if (c === chave || !e?.ligada) continue;
    const dias = Math.floor((agora.getTime() - e.alteradaEm.getTime()) / DIA);
    if (dias < DIAS_ENTRE_CHAVES) avisos.push(`${titulos[c] ?? c} foi ligada há ${dias === 0 ? "menos de um dia" : `${dias} dia(s)`}; o combinado é esperar alguns dias entre uma e outra.`);
  }
  return avisos;
}

export type Celula = string | number | null;
export interface TabelaDaPrevia {
  cabecalho: string[];
  linhas: Celula[][];
}

export interface PlanejamentoNaoAprovado {
  projeto: string;
  nome: string;
  kind: string;
  status: string;
  receitas: number;
  despesas: number;
}

const dif = (hoje: number | null, nova: number | null): number | null => (hoje == null || nova == null ? null : nova - hoje);

export function tabelaRascunho(vs: readonly PlanejamentoNaoAprovado[]): TabelaDaPrevia {
  return {
    cabecalho: ["Projeto", "Versão", "Tipo", "Situação", "Total receitas", "Total despesas"],
    linhas: vs.map((v) => [v.projeto, v.nome, v.kind === "budget" ? "Orçamento" : "Previsão Atualizada", v.status, v.receitas, v.despesas]),
  };
}

export function tabelaDre(ps: readonly PreviaDreProjeto[]): TabelaDaPrevia {
  const linhas: Celula[][] = [];
  for (const p of ps) {
    linhas.push([p.projeto, "Resultado Final", p.hoje, p.nova, p.nova - p.hoje]);
    for (const m of p.meses) linhas.push([p.projeto, `Competência ${m.mes}`, m.hoje, m.nova, m.nova - m.hoje]);
    for (const r of p.comoReceita) linhas.push([p.projeto, `Sai da receita: ${r.numDoc ?? "sem PED"} · ${r.competencia ?? "sem competência"}`, r.valor, null, null]);
    if (p.semCenario.length) {
      const nomes = p.semCenario.map((k) => (k === "budget" ? "Orçamento" : k === "forecast" ? "Previsão Atualizada" : "Atual")).join(" e ");
      linhas.push([p.projeto, `Sem ${nomes}: na Empresa toda, fica fora dessa coluna`, null, null, null]);
    }
  }
  return { cabecalho: ["Projeto", "Linha", "Hoje", "Definição nova", "Diferença"], linhas };
}

export function tabelaFluxo(ps: readonly PreviaFluxoObra[]): TabelaDaPrevia {
  return {
    cabecalho: ["Projeto", "Tem Atual", "Partida hoje", "Partida nova", "Acumulado hoje", "Acumulado novo", "Permuta no planejamento", "Caixa fora da Atual"],
    linhas: ps.map((p) => [p.projeto, p.temAtual ? "sim" : "não", p.partidaHoje, p.partidaNova, p.acumuladoHoje, p.acumuladoNovo, p.permutaNoPlanejamento, p.caixaForaDaAtual]),
  };
}

export function tabelaDashboard(os: readonly PreviaDashboardObra[]): TabelaDaPrevia {
  return {
    cabecalho: ["Projeto", "Cartão", "Unidade", "Hoje", "Definição nova", "Diferença"],
    linhas: os.flatMap((o) => o.linhas.map((l): Celula[] => [o.projeto, l.cartao, l.tipo === "pct" ? "%" : "R$", l.hoje, l.nova, dif(l.hoje, l.nova)])),
  };
}

export function tabelaResumo(os: readonly PreviaResumoObra[]): TabelaDaPrevia {
  return {
    cabecalho: ["Projeto", "Indicador", "Hoje", "Definição nova", "Diferença"],
    linhas: os.flatMap((o) =>
      o.temAtual ? o.linhas.map((l): Celula[] => [o.projeto, l.label, l.hoje, l.nova, dif(l.hoje, l.nova)]) : [[o.projeto, "sem versão Atual: nada a comparar", null, null, null]],
    ),
  };
}

/** Nome do arquivo: chave e data, para guardar lado a lado. */
export function nomeDoArquivo(chave: string, agora: Date): string {
  return `previa-${chave}-${agora.toISOString().slice(0, 10)}.xlsx`;
}
