/**
 * Assistente do Dashboard (Prompt AA, Parte 6; Prompt E, Etapa 1).
 * Módulo PURO, SOMENTE LEITURA. Recebe os números que a tela JÁ calculou
 * (resumos por versão, getStatusProjeto, getIndicadoresObra) e só os
 * organiza e explica. Não soma nada que a tela não some, não projeta, não
 * afirma causa sem base no dado e não grava. Nada daqui vai a modelo de IA.
 */
import type { StatusProjeto, IndicadoresObra } from "@/lib/queries";
import { TEXTO_DA_JANELA } from "@/lib/dashboard-definicao";

export interface ColunaResumo {
  titulo: string;
  complemento: string;
  kind: string;
  vgv: number;
  vgvAusente: boolean;
  realizado: number;
  aReceber: number;
  aPagar: number;
}

export interface Explicacao {
  painel: string;
  cartao: string;
  /** De onde vem, qual cenário, qual regime, qual janela. */
  texto: string;
}

export interface Divergencia {
  titulo: string;
  texto: string;
}

export interface ObraEmAtencao {
  obra: string;
  motivo: string;
}

/** Os indicadores que "o que mudou" compara entre visitas (só números em tela). */
export interface Instantaneo {
  [rotulo: string]: number;
}

export interface AnaliseDoDashboard {
  definicaoNova: boolean;
  explicacoes: Explicacao[];
  divergencias: Divergencia[];
  atencao: ObraEmAtencao[];
  /** Por que alguma leitura de atenção não pôde ser feita. */
  atencaoLimites: string[];
  instantaneo: Instantaneo;
  /** Chave do recorte (projetos + versões + período) para "o que mudou". */
  recorte: string;
}

export function explicar(o: { status: StatusProjeto; definicaoNova: boolean }): Explicacao[] {
  const { status: st, definicaoNova: nova } = o;
  const c = st.composicao;
  const caixa = nova ? "só da versão Atual" : "de todas as versões da obra";
  const per = nova ? "segue o período (pela data)" : "não segue o período (acumulado)";
  const orc = nova
    ? `um Orçamento por obra, o mais recente que não é cópia${c.orcamentosUsados.length ? ` (${c.orcamentosUsados.map((l) => `“${l}”`).join(", ")})` : ""}`
    : c.orcamentos > 1
      ? `a soma de ${c.orcamentos} Orçamentos`
      : "o Orçamento da obra";
  const janela = nova && c.janela ? TEXTO_DA_JANELA[c.janela] : "receita de todo o horizonte contra custos lançados de qualquer competência";
  return [
    { painel: "Os quatro de cima", cartao: "Valor contratado", texto: "Valor atualizado (original + aditivos eficazes) dos contratos de serviço dos projetos, sem rascunho e cancelado. É o mesmo em toda coluna; sem regime de caixa." },
    { painel: "Os quatro de cima", cartao: "Realizado acum.", texto: "Entradas de caixa da própria versão, pela data, conciliadas ou não. Regime de caixa; segue versão e período." },
    { painel: "Os quatro de cima", cartao: "A receber", texto: "Na Atual: recebíveis em aberto (Contas a Receber), pela data. No planejamento: receita planejada menos o realizado — saldo a realizar, não recebível." },
    { painel: "Os quatro de cima", cartao: "A pagar", texto: "Só na Atual: contas a pagar em aberto, pelo saldo das parcelas, com vencimento no período. Planejamento não tem conta a pagar." },
    { painel: "Status atual", cartao: "Entradas de caixa", texto: `Toda entrada de caixa (não só venda), ${caixa}, conciliada ou não. Regime de caixa; ${per}.` },
    { painel: "Status atual", cartao: "% entradas de caixa", texto: "Entradas de caixa ÷ receita prevista no cadastro do projeto. O cadastro não tem data nem regime." },
    { painel: "Status atual", cartao: "Executado", texto: `Despesas da Atual, sem canceladas, ${nova ? "pela competência quando há período" : "de qualquer competência"}.` },
    { painel: "Status atual", cartao: "% executado", texto: `Executado ÷ despesa planejada em ${orc}.` },
    { painel: "Margem e produtividade", cartao: "Margem de contribuição", texto: `Receita da Atual (pelo vencimento) − custo e despesa variáveis da Atual; janela: ${janela}.` },
    { painel: "Margem e produtividade", cartao: "% margem de contribuição", texto: "Margem ÷ receita do cadastro do projeto — uma terceira base de receita, diferente das duas acima." },
  ];
}

/**
 * 6.1 · Divergência entre cartões: quando dois números que parecem dever
 * bater não batem, aponta a causa que ESTÁ NO DADO (composição declarada) —
 * nunca uma suposta causa de negócio.
 */
export function divergencias(o: { status: StatusProjeto; colunas: readonly ColunaResumo[]; definicaoNova: boolean; fmt: (n: number) => string }): Divergencia[] {
  const { status: st, colunas, fmt } = o;
  const out: Divergencia[] = [];
  const c = st.composicao;
  if (c.caixaForaDaAtual > 0)
    out.push({
      titulo: "Entradas de caixa inclui caixa de outras versões",
      texto: `${fmt(c.caixaForaDaAtual)} das entradas estão gravados em versões que não são a Atual (cópias). Por isso "Entradas de caixa" pode ficar acima do "Realizado acum." da Atual.`,
    });
  if (!c.definicaoNova && c.orcamentos > 1)
    out.push({
      titulo: "Executado dividido por mais de um Orçamento",
      texto: `O denominador soma ${c.orcamentos} Orçamentos; o "% executado" aparece menor do que contra um só.`,
    });
  const atual = colunas.find((x) => x.kind === "atual");
  if (atual && Math.abs(atual.realizado - st.recebido) > 0.005)
    out.push({
      titulo: "Realizado acum. (Atual) ≠ Entradas de caixa",
      texto: `${fmt(atual.realizado)} contra ${fmt(st.recebido)}. O primeiro segue a versão e o período escolhidos; o segundo ${c.definicaoNova ? "lê só a Atual e segue o período" : "soma todas as versões e todo o período"}.`,
    });
  if (st.receitaPrevista === 0 && (st.receitaAtual !== 0 || st.recebido !== 0))
    out.push({
      titulo: "Percentuais sem base",
      texto: `A receita do cadastro está vazia, então "% entradas" e "% margem" ficam "—", embora haja ${fmt(st.recebido)} de entradas e ${fmt(st.receitaAtual)} de receita na Atual. São três bases diferentes de receita.`,
    });
  return out;
}

export function instantaneo(o: { status: StatusProjeto; colunas: readonly ColunaResumo[] }): Instantaneo {
  const out: Instantaneo = {
    "Entradas de caixa": o.status.recebido,
    Executado: o.status.executado,
    "Margem de contribuição": o.status.margemContribuicao,
  };
  for (const c of o.colunas) {
    if (c.kind !== "atual") continue;
    out["Realizado acum. (Atual)"] = c.realizado;
    out["A receber (Atual)"] = c.aReceber;
    out["A pagar (Atual)"] = c.aPagar;
  }
  return out;
}

export interface Variacao {
  rotulo: string;
  antes: number;
  agora: number;
}

/** 6.1 · O que mudou desde a última visita — só o que a tela mostra, lado a lado. */
export function variacoes(antes: Instantaneo | null, agora: Instantaneo): Variacao[] | null {
  if (!antes) return null;
  return Object.keys(agora)
    .filter((k) => k in antes && Math.abs(antes[k] - agora[k]) > 0.005)
    .map((k) => ({ rotulo: k, antes: antes[k], agora: agora[k] }));
}

export function analisarDashboard(o: {
  status: StatusProjeto;
  /** Growth Ambiental: o painel de indicadores de obra saiu da tela; opcional. */
  indicadores?: IndicadoresObra;
  colunas: readonly ColunaResumo[];
  definicaoNova: boolean;
  atencao: ObraEmAtencao[];
  atencaoLimites: string[];
  recorte: string;
  fmt: (n: number) => string;
}): AnaliseDoDashboard {
  return {
    definicaoNova: o.definicaoNova,
    explicacoes: explicar(o),
    divergencias: divergencias(o),
    atencao: o.atencao,
    atencaoLimites: o.atencaoLimites,
    instantaneo: instantaneo(o),
    recorte: o.recorte,
  };
}
