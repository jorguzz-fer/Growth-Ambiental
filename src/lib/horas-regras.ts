/**
 * Apontamento de horas (Growth Ambiental, 0082). Módulo PURO.
 *
 * Três coisas que NÃO se confundem:
 *  · apontamento operacional: quem trabalhou quantas horas, onde;
 *  · apropriação gerencial: horas × custo-hora da alocação (quando há base
 *    válida) — vira custo de PESSOAL gerencial por projeto/contrato/fase;
 *  · lançamento financeiro: a remuneração em Folha/Despesas. Apontar horas
 *    NUNCA cria despesa (não duplica o que já foi pago).
 */

export const TIPOS_DE_APONTAMENTO = ["planejado", "realizado"] as const;
export type TipoDeApontamento = (typeof TIPOS_DE_APONTAMENTO)[number];

/** Atividades internas (sem projeto) sugeridas; a lista é aberta. */
export const ATIVIDADES_INTERNAS = ["Administrativo", "Comercial e propostas", "Treinamento", "Gestão da empresa"] as const;

export interface ApontamentoParaValidar {
  tipo: string;
  funcionarioId: string | null;
  stakeholderId: string | null;
  projectId: string | null;
  atividadeInterna: string | null;
  data: string | null;
  horas: number | null;
}

const DATA = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** Motivo da recusa ou null. */
export function recusaDoApontamento(a: ApontamentoParaValidar): string | null {
  if (!(TIPOS_DE_APONTAMENTO as readonly string[]).includes(a.tipo)) return "Tipo de apontamento inválido (planejado ou realizado).";
  if (!a.funcionarioId === !a.stakeholderId) return "Escolha um profissional (funcionário ou prestador).";
  if (!a.projectId && !(a.atividadeInterna ?? "").trim()) return "Informe o projeto ou a atividade interna (ex.: Administrativo).";
  if (!a.data || !DATA.test(a.data)) return "Informe a data (MM/DD/AAAA).";
  const [, mm, dd] = DATA.exec(a.data)!;
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return "Data inválida.";
  if (a.horas == null || !Number.isFinite(a.horas) || a.horas <= 0) return "Informe as horas (maior que zero).";
  // Realizado é de um dia (até 24 h); planejado pode ser o total do período (até um mês, 744 h).
  if (a.tipo === "realizado" && a.horas > 24) return "Um apontamento realizado é de um dia: não passa de 24 horas.";
  if (a.horas > 744) return "O planejado não passa de 744 horas (um mês) por apontamento.";
  return null;
}

/** "MM/DD/YYYY" → "MM/YYYY" */
export const competenciaDaData = (data: string) => {
  const m = DATA.exec(data);
  return m ? `${m[1]}/${m[3]}` : "";
};

export interface ApontamentoLido {
  tipo: string;
  profissional: string;
  destino: string;
  horas: number;
  custoHora: number | null;
}

export interface LinhaDeDistribuicao {
  profissional: string;
  destino: string;
  planejadas: number;
  realizadas: number;
  /** realizadas − planejadas */
  desvio: number;
  /** horas realizadas × custo-hora; null quando alguma hora realizada não tem base */
  custoGerencial: number | null;
  horasSemBase: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Distribuição profissional × destino, previsto × realizado e custo gerencial. */
export function distribuicaoDeHoras(lista: readonly ApontamentoLido[]): { linhas: LinhaDeDistribuicao[]; total: Omit<LinhaDeDistribuicao, "profissional" | "destino"> } {
  const mapa = new Map<string, LinhaDeDistribuicao>();
  for (const a of lista) {
    const k = `${a.profissional}|${a.destino}`;
    const l = mapa.get(k) ?? { profissional: a.profissional, destino: a.destino, planejadas: 0, realizadas: 0, desvio: 0, custoGerencial: 0, horasSemBase: 0 };
    if (a.tipo === "planejado") l.planejadas += a.horas;
    else {
      l.realizadas += a.horas;
      if (a.custoHora == null) l.horasSemBase += a.horas;
      else l.custoGerencial = (l.custoGerencial ?? 0) + a.horas * a.custoHora;
    }
    mapa.set(k, l);
  }
  const linhas = [...mapa.values()]
    .map((l) => ({ ...l, planejadas: r2(l.planejadas), realizadas: r2(l.realizadas), desvio: r2(l.realizadas - l.planejadas), custoGerencial: l.horasSemBase > 0 ? null : r2(l.custoGerencial ?? 0), horasSemBase: r2(l.horasSemBase) }))
    .sort((a, b) => a.profissional.localeCompare(b.profissional) || b.realizadas - a.realizadas);
  const total = {
    planejadas: r2(linhas.reduce((s, l) => s + l.planejadas, 0)),
    realizadas: r2(linhas.reduce((s, l) => s + l.realizadas, 0)),
    desvio: r2(linhas.reduce((s, l) => s + l.desvio, 0)),
    custoGerencial: r2(lista.filter((a) => a.tipo === "realizado" && a.custoHora != null).reduce((s, a) => s + a.horas * a.custoHora!, 0)),
    horasSemBase: r2(linhas.reduce((s, l) => s + l.horasSemBase, 0)),
  };
  return { linhas, total };
}

/**
 * Base de rateio por horas REALIZADAS: percentual de cada projeto, em duas
 * casas, que fecha 100% (a diferença de arredondamento vai para o maior).
 * Atividades internas (sem projeto) ficam fora: não recebem custo de projeto.
 */
export function baseDeRateioPorHoras(lista: readonly { projectId: string | null; horas: number; tipo: string }[]): { projectId: string; horas: number; percentual: number }[] {
  const porProjeto = new Map<string, number>();
  for (const a of lista) if (a.tipo === "realizado" && a.projectId) porProjeto.set(a.projectId, (porProjeto.get(a.projectId) ?? 0) + a.horas);
  const total = [...porProjeto.values()].reduce((s, h) => s + h, 0);
  if (total <= 0) return [];
  const linhas = [...porProjeto.entries()].map(([projectId, horas]) => ({ projectId, horas: r2(horas), percentual: Math.round((horas / total) * 10000) / 100 }));
  const soma = r2(linhas.reduce((s, l) => s + l.percentual, 0));
  if (soma !== 100) {
    const maior = linhas.reduce((m, l) => (l.horas > m.horas ? l : m), linhas[0]);
    maior.percentual = r2(maior.percentual + (100 - soma));
  }
  return linhas.sort((a, b) => b.horas - a.horas);
}
