/**
 * Regras de exibição do Dashboard (Prompt AA, Partes 1, 2.3.3, 4.1, 4-B.4).
 * Módulo PURO. Nenhum número é calculado aqui — só rótulos, seleção e as
 * frases que declaram de onde cada número vem.
 */
import { ehCopia, selecaoPadrao, type VersaoLeve } from "@/lib/dre";
import { dateBR } from "@/lib/utils";

/** 1.1 — a natureza é o rótulo principal; o nome digitado, complemento. */
export const ROTULO_DA_NATUREZA: Record<string, string> = {
  atual: "Atual",
  budget: "Orçamento",
  forecast: "Previsão Atualizada",
  custom: "Cópia",
};

export function rotuloDaVersao(v: Pick<VersaoLeve, "kind" | "label" | "sourceVersionId">): { titulo: string; complemento: string; copia: boolean } {
  const copia = ehCopia(v as VersaoLeve);
  const base = ROTULO_DA_NATUREZA[v.kind] ?? v.kind;
  return { titulo: copia && v.kind !== "custom" ? `${base} (cópia)` : base, complemento: v.label, copia };
}

/** Limite de colunas (1.4): é largura do cartão. */
export const MAX_VERSOES_DASHBOARD = 3;

/**
 * 1.2 — padrão: Atual + o Orçamento e a Previsão mais recentes que não são
 * cópia (a mesma regra de `selecaoPadrao`). Nunca as três mais antigas.
 * Com `?vs=`, os ids válidos DESTE projeto, até o limite.
 */
export function selecaoDoDashboard<V extends VersaoLeve>(versoes: readonly V[], pedidos: readonly string[]): { selecionadas: V[]; descartadas: number } {
  const validos = versoes.filter((v) => pedidos.includes(v.id));
  if (validos.length === 0) return { selecionadas: selecaoPadrao(versoes), descartadas: 0 };
  return { selecionadas: validos.slice(0, MAX_VERSOES_DASHBOARD), descartadas: Math.max(0, validos.length - MAX_VERSOES_DASHBOARD) };
}

/**
 * 1.4 — marcar/desmarcar no seletor. No limite, NÃO troca em silêncio: a
 * seleção fica como está e volta um aviso.
 */
export function proximaSelecao(atual: readonly string[], id: string, max: number): { proxima: string[]; aviso: string | null } {
  if (atual.includes(id)) {
    const proxima = atual.filter((x) => x !== id);
    return proxima.length === 0 ? { proxima: [...atual], aviso: "Ao menos uma versão fica marcada." } : { proxima, aviso: null };
  }
  if (atual.length >= max) return { proxima: [...atual], aviso: `No máximo ${max} versões cabem no cartão. Desmarque uma para marcar outra.` };
  return { proxima: [...atual, id], aviso: null };
}

// `de`/`ate` vêm do filtro no formato interno MM/DD/YYYY.
const dataBR = (d: string) => (d ? dateBR(d) : "");

/** 1.6 — o recorte em texto: projetos, versões e período. */
export function textoDoRecorte(o: { projetos: number; nomeDoProjeto?: string; versoes: string[]; de: string; ate: string }): string {
  const proj = o.nomeDoProjeto ? `Projeto ${o.nomeDoProjeto}` : `${o.projetos} projeto(s) somado(s)`;
  const vers = o.versoes.length ? `versões: ${o.versoes.join(", ")}` : "nenhuma versão";
  const per = o.de || o.ate ? `período ${o.de ? `de ${dataBR(o.de)}` : "do início"} ${o.ate ? `a ${dataBR(o.ate)}` : "em diante"}` : "todo o período";
  return `${proj} · ${vers} · ${per}`;
}

/** 4.1 — cada KPI declara a definição de cada natureza. */
export const DEFINICAO_DO_KPI: Record<"vgv" | "realizado" | "aReceber" | "aPagar", { atual: string; planejamento: string }> = {
  // Growth Ambiental: a chave interna `vgv` é o VALOR CONTRATADO.
  vgv: {
    atual: "Valor atualizado (original + aditivos eficazes) dos contratos de serviço do projeto; rascunho e cancelado não contam.",
    planejamento: "Orçamento/Previsão: o mesmo valor contratado — é fato do contrato, não cenário.",
  },
  realizado: {
    atual: "Entradas de caixa da própria versão, pela data, conciliadas ou não.",
    planejamento: "Entradas de caixa gravadas na versão, pela data (planejamento normalmente não tem).",
  },
  aReceber: {
    atual: "Atual: recebíveis em aberto (Contas a Receber), pela data.",
    planejamento: "Orçamento/Previsão: receita planejada menos o realizado, nunca abaixo de zero — é saldo a realizar, não recebível.",
  },
  aPagar: {
    atual: "Atual: contas a pagar em aberto, pelo saldo das parcelas, de todas as versões do projeto.",
    planejamento: "Orçamento/Previsão: “—”, porque planejamento não tem conta a pagar.",
  },
};

/** Chave "dashboard_definicao_nova" ligada: as definições que mudam (4.5, 4.2). */
export const DEFINICAO_NOVA_DO_KPI: Pick<typeof DEFINICAO_DO_KPI, "vgv" | "aReceber"> = {
  vgv: {
    atual: "Valor atualizado dos contratos de serviço do projeto, em toda coluna: é fato do contrato, não cenário.",
    planejamento: "Orçamento/Previsão: o mesmo valor contratado da Atual.",
  },
  aReceber: {
    atual: "Atual: recebíveis em aberto (Contas a Receber), pela data.",
    planejamento: "Orçamento/Previsão: receita planejada menos o realizado — saldo a realizar, não recebível. Negativo quando o realizado passou do planejado.",
  },
};
