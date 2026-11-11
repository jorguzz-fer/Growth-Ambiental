/**
 * Catálogo de métricas e leitura de intenção que a Cris usa. Módulo PURO.
 *
 * Origem: o chat somente leitura do Prompt E, Etapa 2 (decisão de 01/10/2026),
 * em que o modelo só classificava a pergunta. Esse chat SAIU (Revisão 4,
 * Prompt AQ §1.4): a decisão BE-2 foi reaberta em 15/10 e a Cris de hoje
 * manda mais coisas ao modelo (ver `src/lib/cris.ts` e a seção "O assistente"
 * da base de conhecimento). Daqui ficam só o catálogo das quatro métricas
 * (`CATALOGO`), a normalização da intenção e a leitura local da pergunta.
 *
 * O catálogo continua sem dado pessoal: métrica nova que precise de dado de
 * pessoa (ex.: nome de comprador) NÃO entra sem perguntar antes ao dono.
 */
import { enumMonths, monthIndex } from "@/lib/dre";

export type IdDaMetrica = "receita" | "custo" | "saldo" | "desvio";
export type CenarioDoChat = "atual" | "budget" | "forecast";

export interface MetricaDoCatalogo {
  id: IdDaMetrica;
  nome: string;
  /** O que o número é — vai ao modelo (texto fixo, sem dado) e à resposta. */
  definicao: string;
  /** Telas que o usuário precisa poder VER para receber o número (3.4). */
  exige: readonly string[];
  /** Tela que detalha o número. */
  href: string;
  /** A métrica é por obra (true) ou da empresa (false)? */
  porObra: boolean;
}

export const CATALOGO: readonly MetricaDoCatalogo[] = [
  {
    id: "receita",
    nome: "Receita",
    definicao: "Receita da DRE (regime de competência) do cenário pedido: Atual (o movimento real), Orçamento ou Previsão Atualizada.",
    exige: ["dre"],
    href: "/dre",
    porObra: true,
  },
  {
    id: "custo",
    nome: "Custo",
    definicao: "Custo Variável + Custo Fixo da DRE (competência) do cenário pedido.",
    exige: ["dre", "despesas"],
    href: "/dre",
    porObra: true,
  },
  {
    id: "desvio",
    nome: "Desvio de custo",
    definicao: "Custo realizado (versão Atual) menos o custo do Orçamento, nas mesmas competências; sem período, até o mês corrente.",
    exige: ["dre", "despesas"],
    href: "/projeto",
    porObra: true,
  },
  {
    id: "saldo",
    nome: "Saldo das contas",
    definicao: "Saldo disponível hoje nas contas bancárias da empresa (sem as contas de terceiros). É da empresa, não de uma obra.",
    exige: ["caixa"],
    href: "/caixa",
    porObra: false,
  },
] as const;

export const ROTULO_DO_CENARIO: Record<CenarioDoChat, string> = { atual: "Atual", budget: "Orçamento", forecast: "Previsão Atualizada" };


export interface IntencaoDoChat {
  metrica: IdDaMetrica | null;
  cenario: CenarioDoChat | null;
  /** Nome da obra como o usuário escreveu; o casamento com o cadastro é local. */
  obra: string | null;
  /** O usuário pediu todas as obras / a empresa toda. */
  todas: boolean;
  /** Competências "MM/YYYY". */
  de: string | null;
  ate: string | null;
}

export const INTENCAO_VAZIA: IntencaoDoChat = { metrica: null, cenario: null, obra: null, todas: false, de: null, ate: null };

/** Quais métricas o usuário pode receber (permissão de VER de cada tela de origem). */
export function metricasPermitidas(pode: (tela: string) => boolean): MetricaDoCatalogo[] {
  return CATALOGO.filter((m) => m.exige.every(pode));
}

const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** "MM/YYYY" válido, ou null. */
export function competenciaValida(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const m = s.trim().match(/^(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const mes = Number(m[1]);
  if (mes < 1 || mes > 12) return null;
  return `${String(mes).padStart(2, "0")}/${m[2]}`;
}

/** Normaliza a saída do modelo (ou de quem for): campo estranho vira vazio. */
export function normalizarIntencao(bruto: unknown): IntencaoDoChat {
  const o = (bruto ?? {}) as Record<string, unknown>;
  const metrica = CATALOGO.some((m) => m.id === o.metrica) ? (o.metrica as IdDaMetrica) : null;
  const cenario = o.cenario === "atual" || o.cenario === "budget" || o.cenario === "forecast" ? o.cenario : null;
  const obra = typeof o.obra === "string" && o.obra.trim() ? o.obra.trim().slice(0, 120) : null;
  let de = competenciaValida(o.de);
  let ate = competenciaValida(o.ate);
  if (de && ate && (monthIndex(de) ?? 0) > (monthIndex(ate) ?? 0)) [de, ate] = [ate, de];
  return { metrica, cenario, obra, todas: o.todas === true, de, ate };
}

const MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/**
 * Leitura LOCAL da pergunta (sem modelo) — usada quando a IA não está
 * configurada ou falha. Palavras-chave simples; o que não entende fica vazio.
 */
export function interpretarLocalmente(pergunta: string, hoje: Date): IntencaoDoChat {
  const t = sem(pergunta);
  const metrica: IdDaMetrica | null = /desvi|estour|acima do orcad|contra o orcad/.test(t)
    ? "desvio"
    : /saldo|caixa|banco/.test(t)
      ? "saldo"
      : /custo|gast/.test(t)
        ? "custo"
        : /receita|fatur|recebi|vend/.test(t)
          ? "receita"
          : null;
  const cenario: CenarioDoChat | null = /previs|forecast/.test(t) ? "forecast" : /orcad|orcament|budget|previsto/.test(t) ? "budget" : /realiz|atual|ate agora|ja /.test(t) ? "atual" : null;
  const todas = /todas|todos|empresa toda|consolidad|geral/.test(t);
  const ano = hoje.getFullYear();
  let de: string | null = null;
  let ate: string | null = null;
  const anoDito = t.match(/\b(20\d{2})\b/);
  const mesDito = MESES.findIndex((m) => new RegExp(`\\b${m}\\b`).test(t));
  if (/este mes|neste mes|mes atual/.test(t)) de = ate = `${String(hoje.getMonth() + 1).padStart(2, "0")}/${ano}`;
  else if (mesDito >= 0) de = ate = `${String(mesDito + 1).padStart(2, "0")}/${anoDito ? anoDito[1] : ano}`;
  else if (/este ano|neste ano/.test(t) || anoDito) {
    const y = anoDito ? anoDito[1] : String(ano);
    de = `01/${y}`;
    ate = `12/${y}`;
  }
  // "nesta obra", "desta obra", "essa obra" = a obra da tela, não um nome.
  const obraDita = pergunta.match(/(?<!\b(?:n|d)?(?:esta|essa)\s)\b(?:obra|projeto|empreendimento)\s+(?:do\s+|da\s+|de\s+)?["“]?([^"”?,.]+)/i);
  const nome = obraDita ? obraDita[1].trim() : "";
  const soPeriodo = /^(este|neste|esse|nesse|em|no|na|ate|até|contra|de|do|da)\b/i.test(nome);
  return { metrica, cenario, obra: nome && !soPeriodo ? nome : null, todas, de, ate };
}

export type ObraResolvida<T> = { tipo: "uma"; projeto: T } | { tipo: "varias"; candidatos: T[] } | { tipo: "nenhuma" };

/** Casa o nome digitado com as obras QUE O USUÁRIO VÊ (lista já filtrada). Local. */
export function resolverObra<T extends { id: string; name: string }>(texto: string, projetos: readonly T[]): ObraResolvida<T> {
  const alvo = sem(texto).trim();
  if (!alvo) return { tipo: "nenhuma" };
  const exatos = projetos.filter((p) => sem(p.name).trim() === alvo);
  if (exatos.length === 1) return { tipo: "uma", projeto: exatos[0] };
  const contem = projetos.filter((p) => sem(p.name).includes(alvo) || alvo.includes(sem(p.name).trim()));
  if (contem.length === 1) return { tipo: "uma", projeto: contem[0] };
  if (contem.length > 1) return { tipo: "varias", candidatos: contem };
  // Palavra a palavra (ex.: "signature" → "SIGNATURE SUARÃO").
  const palavras = alvo.split(/\s+/).filter((w) => w.length >= 3);
  const porPalavra = projetos.filter((p) => palavras.some((w) => sem(p.name).split(/\s+/).includes(w)));
  if (porPalavra.length === 1) return { tipo: "uma", projeto: porPalavra[0] };
  if (porPalavra.length > 1) return { tipo: "varias", candidatos: porPalavra };
  return { tipo: "nenhuma" };
}

/** Competências do período pedido, ou null (= acumulado). */
export function mesesDoPeriodo(de: string | null, ate: string | null): Set<string> | null {
  if (!de && !ate) return null;
  return new Set(enumMonths(de ?? ate!, ate ?? de!));
}

export function textoDoPeriodo(de: string | null, ate: string | null, padrao: string): string {
  if (!de && !ate) return padrao;
  if (de && ate && de === ate) return `em ${de}`;
  return `de ${de ?? ate} a ${ate ?? de}`;
}
