/**
 * Prompt RC (Fase 3 · revisão V5): Relatórios Customizados. Módulo PURO.
 *
 * Um relatório é uma RECEITA validada — fonte (DRE, DRE analítica ou Fluxo),
 * colunas (por cenário, por mês ou por obra), escopo, período e análise
 * vertical. A receita mora na URL: o relatório se refaz ao abrir o link, com
 * o acesso de quem abre. O chat da tela só propõe a receita; quem calcula é o
 * servidor, pelas mesmas funções da DRE e do Fluxo. Nada é gravado (BRC-1 em
 * aberto: salvar com nome e dono fica para a resposta).
 */
import type { EntradaAnalitica, ContaAnalitica } from "@/lib/dre-analitica";
import { linhasDaDreAnalitica } from "@/lib/dre-analitica";

import { DIMENSOES, METRICAS, METRICAS_PADRAO, ROTULO_DIMENSAO, ROTULO_METRICA, noPeriodo, pivotar, type Dimensao, type Fato, type Metrica } from "@/lib/relatorio-gerencial";

export const FONTES = ["dre", "dreanalitica", "fluxo", "gerencial"] as const;
export type Fonte = (typeof FONTES)[number];
export const COLUNAS = ["cenario", "mes", "obra"] as const;
export type Colunas = (typeof COLUNAS)[number];
export const CENARIOS_RC = ["atual", "forecast", "budget"] as const;
export type CenarioRC = (typeof CENARIOS_RC)[number];

export const ROTULO_FONTE: Record<Fonte, string> = { dre: "DRE", dreanalitica: "DRE por categoria e grupo", fluxo: "Fluxo de Caixa (previsto)", gerencial: "Gerencial (tabela dinâmica)" };
export const ROTULO_COLUNAS: Record<Colunas, string> = { cenario: "por cenário", mes: "mês a mês", obra: "por projeto" };
export const ROTULO_CENARIO_RC: Record<CenarioRC, string> = { atual: "Atual", forecast: "Previsão Atualizada", budget: "Orçamento" };
/** Teto de colunas de valor (meses ou obras): além disso, a tela avisa e corta. */
export const MAX_COLUNAS = 24;

export interface ReceitaDeRelatorio {
  titulo: string;
  fonte: Fonte;
  colunas: Colunas;
  /** Por cenário: os cenários (1 a 3). Por mês ou obra: só o primeiro vale. */
  cenarios: CenarioRC[];
  /** "all", "ativos", "finalizados" ou o id de uma obra. */
  proj: string;
  /** "MM/YYYY" ou "". */
  de: string;
  ate: string;
  /** Análise vertical: % da receita (DRE) ou das entradas (Fluxo). */
  av: boolean;
  /** Fonte "gerencial": a dimensão das linhas e as métricas das colunas. */
  dim?: Dimensao;
  metricas?: Metrica[];
}

export const RECEITA_PADRAO: ReceitaDeRelatorio = { titulo: "", fonte: "dre", colunas: "cenario", cenarios: ["atual"], proj: "all", de: "", ate: "", av: false };

const competencia = (v: unknown): string => {
  if (typeof v !== "string") return "";
  const m = /^(\d{1,2})\/(\d{4})$/.exec(v.trim());
  if (!m) return "";
  const mes = Number(m[1]);
  return mes >= 1 && mes <= 12 ? `${String(mes).padStart(2, "0")}/${m[2]}` : "";
};
const deLista = <T extends string>(lista: readonly T[], v: unknown, padrao: T): T => (typeof v === "string" && (lista as readonly string[]).includes(v) ? (v as T) : padrao);

/**
 * A receita validada, venha da URL ou do modelo. Campo fora do domínio cai no
 * padrão; o escopo só vale se for um dos escopos ou uma obra que a pessoa vê.
 */
export function receitaValida(entrada: unknown, obrasVisiveis: readonly string[]): ReceitaDeRelatorio {
  const o = (entrada && typeof entrada === "object" ? entrada : {}) as Record<string, unknown>;
  const cens = (Array.isArray(o.cenarios) ? o.cenarios : typeof o.cenarios === "string" ? o.cenarios.split(",") : [])
    .filter((c): c is CenarioRC => typeof c === "string" && (CENARIOS_RC as readonly string[]).includes(c));
  const unicos = [...new Set(cens)].slice(0, 3);
  const proj = typeof o.proj === "string" && (["all", "ativos", "finalizados"].includes(o.proj) || obrasVisiveis.includes(o.proj)) ? o.proj : "all";
  const av = o.av === true || o.av === "1" || o.av === "true";
  const fonte = deLista(FONTES, o.fonte, "dre");
  return {
    titulo: typeof o.titulo === "string" ? o.titulo.trim().slice(0, 120) : "",
    fonte,
    colunas: deLista(COLUNAS, o.colunas, "cenario"),
    cenarios: unicos.length ? unicos : ["atual"],
    proj,
    de: competencia(o.de),
    ate: competencia(o.ate),
    av,
    ...(fonte === "gerencial"
      ? (() => {
          const ms = (Array.isArray(o.metricas) ? o.metricas : typeof o.metricas === "string" ? o.metricas.split(",") : []).filter((m): m is Metrica => typeof m === "string" && (METRICAS as readonly string[]).includes(m));
          return { dim: deLista(DIMENSOES, o.dim, "contrato"), metricas: ms.length ? [...new Set(ms)].slice(0, 10) : [...METRICAS_PADRAO] };
        })()
      : {}),
  };
}

/** A receita como parâmetros de URL (o link do relatório). */
export function urlDaReceita(r: ReceitaDeRelatorio): string {
  const p = new URLSearchParams();
  if (r.titulo) p.set("titulo", r.titulo);
  p.set("fonte", r.fonte);
  p.set("colunas", r.colunas);
  p.set("cenarios", r.cenarios.join(","));
  p.set("proj", r.proj);
  if (r.de) p.set("de", r.de);
  if (r.ate) p.set("ate", r.ate);
  if (r.av) p.set("av", "1");
  if (r.fonte === "gerencial") {
    if (r.dim) p.set("dim", r.dim);
    if (r.metricas?.length) p.set("metricas", r.metricas.join(","));
  }
  return `/relatorios?${p.toString()}`;
}

/** Descrição de uma linha da receita, para o cabeçalho e a Cris. */
export function descricaoDaReceita(r: ReceitaDeRelatorio, escopo: string): string {
  if (r.fonte === "gerencial") {
    const periodo = r.de || r.ate ? `${r.de || "início"} a ${r.ate || "fim"}` : "todo o período";
    return `Gerencial por ${ROTULO_DIMENSAO[r.dim ?? "contrato"].toLowerCase()} · ${(r.metricas ?? METRICAS_PADRAO).map((m) => ROTULO_METRICA[m]).join(", ")} · ${escopo} · ${periodo}`;
  }
  const cen = r.colunas === "cenario" ? r.cenarios.map((c) => ROTULO_CENARIO_RC[c]).join(" × ") : ROTULO_CENARIO_RC[r.cenarios[0]];
  const periodo = r.de || r.ate ? `${r.de || "início"} a ${r.ate || "fim"}` : r.colunas === "mes" ? "5 meses antes, o atual e 6 depois" : "todo o horizonte";
  return `${ROTULO_FONTE[r.fonte]} ${ROTULO_COLUNAS[r.colunas]} · ${cen} · ${escopo} · ${periodo}${r.av ? " · com análise vertical" : ""}`;
}

// ── A tabela ────────────────────────────────────────────────────────────────

export interface ColunaDeDados {
  chave: string;
  titulo: string;
  /** Para DRE: a entrada somada da coluna. */
  dre?: EntradaAnalitica;
  /** Para Fluxo: entradas e saídas somadas da coluna. */
  fluxo?: { entradas: number; saidas: number };
}

export interface LinhaDaTabela {
  id: string;
  nivel: number;
  label: string;
  destaque: boolean;
  /** Um valor por coluna (mesma ordem de `colunas`). */
  valores: number[];
  /** % por coluna, quando a análise vertical está ligada. */
  pcts: (number | null)[] | null;
}

export interface TabelaDeRelatorio {
  colunas: string[];
  linhas: LinhaDaTabela[];
  rotuloPct: string;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Monta a tabela a partir das colunas já calculadas. As linhas são as da DRE
 * (cascata), as da DRE analítica até o grupo, ou entradas, saídas e saldo do
 * Fluxo. A ordem das linhas vem da soma de todas as colunas, para que um
 * grupo que só existe numa coluna também apareça.
 */
export function montarTabela(fonte: Fonte, colunas: readonly ColunaDeDados[], contas: readonly ContaAnalitica[], av: boolean): TabelaDeRelatorio {
  if (fonte === "fluxo") {
    const vals = (f: (c: { entradas: number; saidas: number }) => number) => colunas.map((c) => r2(f(c.fluxo ?? { entradas: 0, saidas: 0 })));
    const entradas = vals((c) => c.entradas);
    const pctDe = (v: number[]) => (av ? v.map((x, i) => (entradas[i] > 0 ? (x / entradas[i]) * 100 : null)) : null);
    const linhas: LinhaDaTabela[] = [
      { id: "entradas", nivel: 0, label: "Entradas", destaque: false, valores: entradas, pcts: pctDe(entradas) },
      { id: "saidas", nivel: 0, label: "(−) Saídas", destaque: false, valores: vals((c) => c.saidas), pcts: pctDe(vals((c) => c.saidas)) },
      { id: "saldo", nivel: 0, label: "= Saldo do período", destaque: true, valores: vals((c) => c.entradas - c.saidas), pcts: pctDe(vals((c) => c.entradas - c.saidas)) },
    ];
    return { colunas: colunas.map((c) => c.titulo), linhas, rotuloPct: "% Entradas" };
  }
  const porColuna = colunas.map((c) => linhasDaDreAnalitica(c.dre ?? { receitaVendas: 0, receitaPermuta: 0, encargos: 0, lancamentos: [] }, contas));
  const filtro = (l: { nivel: number; tipo: string }) => (fonte === "dre" ? l.nivel === 0 : l.nivel <= 1 && l.tipo !== "conta");
  // Ordem: a união, na ordem em que aparecem; linhas de nível 1 logo depois do pai.
  const ordem: { id: string; nivel: number; label: string; destaque: boolean; pai: string | null }[] = [];
  const vistos = new Set<string>();
  for (const linhas of porColuna)
    for (const l of linhas.filter(filtro)) {
      if (vistos.has(l.id)) continue;
      vistos.add(l.id);
      const item = { id: l.id, nivel: l.nivel, label: l.label, destaque: l.tipo === "sub" || l.tipo === "final", pai: l.pai };
      if (l.pai) {
        // depois do último irmão já posto, ou do pai
        let i = ordem.findIndex((o) => o.id === l.pai);
        while (i + 1 < ordem.length && ordem[i + 1].pai === l.pai) i++;
        ordem.splice(i + 1, 0, item);
      } else ordem.push(item);
    }
  const linhas: LinhaDaTabela[] = ordem.map((o) => {
    const valores = porColuna.map((ls) => ls.find((l) => l.id === o.id)?.valor ?? 0);
    const pcts = av ? porColuna.map((ls) => ls.find((l) => l.id === o.id)?.pct ?? null) : null;
    return { id: o.id, nivel: o.nivel, label: o.label, destaque: o.destaque, valores, pcts };
  });
  return { colunas: colunas.map((c) => c.titulo), linhas, rotuloPct: "% Receita" };
}

/**
 * Fonte "gerencial": a tabela dinâmica sobre os FATOS (relatorio-gerencial.ts),
 * já filtrados por escopo; aqui entram o período e as métricas permitidas.
 * Linhas = valores da dimensão; colunas = métricas; última linha = Total.
 */
export function tabelaGerencial(fatos: readonly Fato[], r: ReceitaDeRelatorio, metricasPermitidas: readonly Metrica[]): TabelaDeRelatorio {
  const metricas = (r.metricas ?? METRICAS_PADRAO).filter((m) => metricasPermitidas.includes(m));
  const ord = (s: string) => {
    const m = /^(\d{2})\/(\d{4})$/.exec(s);
    return m ? Number(m[2]) * 100 + Number(m[1]) : null;
  };
  const de = r.de ? ord(r.de) : null;
  const ate = r.ate ? ord(r.ate) : null;
  const p = pivotar(fatos.filter((f) => noPeriodo(f, de, ate)), r.dim ?? "contrato", metricas);
  return {
    colunas: metricas.map((m) => ROTULO_METRICA[m]),
    linhas: [
      ...p.linhas.map((l, i) => ({ id: `g${i}`, nivel: 0, label: l.rotulo, destaque: false, valores: l.valores, pcts: null })),
      { id: "total", nivel: 0, label: "Total", destaque: true, valores: p.total, pcts: null },
    ],
    rotuloPct: "",
  };
}

/** CSV (separador ";", vírgula decimal) para baixar a tabela. */
export function csvDaTabela(t: TabelaDeRelatorio): string {
  const n = (v: number) => v.toFixed(2).replace(".", ",");
  const cab = ["Item", ...t.colunas.flatMap((c) => (t.linhas[0]?.pcts ? [c, `${c} ${t.rotuloPct}`] : [c]))];
  const linhas = t.linhas.map((l) => [
    `${"  ".repeat(l.nivel)}${l.label}`,
    ...l.valores.flatMap((v, i) => (l.pcts ? [n(v), l.pcts[i] == null ? "" : n(l.pcts[i]!)] : [n(v)])),
  ]);
  const esc = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  return [cab, ...linhas].map((r) => r.map(esc).join(";")).join("\n");
}
