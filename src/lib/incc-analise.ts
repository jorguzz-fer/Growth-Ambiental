/**
 * Análises do assistente de Índices de Reajuste (antiga Parâmetros / INCC) (Prompt Q, 6.3) — código puro,
 * sem modelo de IA. Nada grava, nada sai do sistema, nada é inventado (regra
 * global 3): o assistente identifica meses faltantes e PEDE que o usuário
 * informe; não estima, não interpola, não usa a média móvel como oficial.
 */
import { projectIncc } from "@/lib/calc/incc";
import type { InccRow } from "@/lib/calc/types";
import { diffDeIncc, JANELA_DA_MEDIA, mesesEncerradosSemOficial, mesesNaMedia, ordDoMes, type MudancaDeMes } from "@/lib/incc-regras";

const round3 = (v: number) => Math.round(v * 1000) / 1000;

export interface CurvaProjetada {
  /** Média das últimas 12 variações OFICIAIS (o comportamento recente). */
  mediaRecente: number | null;
  /** Variação mensal usada nos meses projetados (a média móvel, inclui projeções anteriores). */
  mediaProjetada: number | null;
  /** mediaProjetada − mediaRecente, em pontos percentuais. */
  distancia: number | null;
  /** Há quantos meses (contando do fim) a série é só projeção. */
  mesesSoProjecao: number;
  /** Primeiro mês projetado da cauda, se houver. */
  desde: string | null;
  /** Quantos meses entraram na média do primeiro projetado (sinaliza histórico curto). */
  mesesNaPrimeiraMedia: number | null;
}

/** 6.3 · curva projetada × histórico. */
export function curvaProjetadaVsHistorico(rows: readonly InccRow[]): CurvaProjetada {
  const oficiais = rows.filter((r) => !r.projected);
  const ultimas = oficiais.slice(-JANELA_DA_MEDIA);
  const mediaRecente = ultimas.length ? round3(ultimas.reduce((a, r) => a + r.mo, 0) / ultimas.length) : null;
  let cauda = 0;
  for (let i = rows.length - 1; i >= 0 && rows[i].projected; i--) cauda++;
  const primeiroProjetado = rows.findIndex((r) => r.projected);
  const projetados = rows.filter((r) => r.projected);
  const mediaProjetada = projetados.length ? round3(projetados.reduce((a, r) => a + r.mo, 0) / projetados.length) : null;
  return {
    mediaRecente,
    mediaProjetada,
    distancia: mediaRecente != null && mediaProjetada != null ? round3(mediaProjetada - mediaRecente) : null,
    mesesSoProjecao: cauda,
    desde: cauda ? rows[rows.length - cauda].m : null,
    mesesNaPrimeiraMedia: primeiroProjetado >= 0 ? mesesNaMedia(primeiroProjetado) : null,
  };
}

export interface EfeitoDaAlteracao {
  mes: string;
  mensal: { de: number; para: number };
  acumulado: { de: number; para: number };
  /** Meses projetados que seriam reescritos (mensal e acumulado de/para). */
  reescritos: MudancaDeMes[];
  /** Acumulado do último mês da tabela, antes e depois. */
  acumuladoFinal: { de: number; para: number };
}

/** 6.3 · efeito de uma alteração, ANTES de confirmar: mesma regra da gravação (`projectIncc`), sem gravar. */
export function efeitoDaAlteracao(rows: readonly InccRow[], mes: string, mo: number): EfeitoDaAlteracao | null {
  const alvo = rows.find((r) => r.m === mes);
  if (!alvo || !Number.isFinite(mo)) return null;
  const depois = projectIncc(rows.map((r) => (r.m === mes ? { ...r, mo, projected: false } : r)));
  const mudancas = diffDeIncc(rows, depois);
  const novoAlvo = depois.find((r) => r.m === mes)!;
  return {
    mes,
    mensal: { de: alvo.mo, para: mo },
    acumulado: { de: alvo.ac, para: novoAlvo.ac },
    reescritos: mudancas.filter((m) => m.mes !== mes && rows.find((r) => r.m === m.mes)?.projected),
    acumuladoFinal: { de: rows[rows.length - 1]?.ac ?? 0, para: depois[depois.length - 1]?.ac ?? 0 },
  };
}

export interface Cobertura {
  primeiro: string | null;
  ultimo: string | null;
  /** Meses com vencimento de recebível (das vendas) que NÃO estão na tabela — corrigidos por zero. */
  vencimentosForaDaTabela: string[];
  /** Janela da obra (início/fim) fora da tabela, quando cadastrada. */
  janelaForaDaTabela: { inicio: string | null; fim: string | null } | null;
}

/**
 * 6.3 · cobertura: a tabela cobre a janela de competências da obra e os
 * vencimentos dos recebíveis das vendas? "MM/YYYY" para meses; a janela vem
 * em "MM/YYYY" (derivada das datas da obra) ou nula quando não cadastrada.
 */
export function cobertura(rows: readonly InccRow[], mesesComVencimento: readonly string[], janela: { inicio: string | null; fim: string | null } | null): Cobertura {
  const meses = new Set(rows.map((r) => r.m));
  const ords = rows.map((r) => ordDoMes(r.m));
  const min = ords.length ? Math.min(...ords) : null;
  const max = ords.length ? Math.max(...ords) : null;
  const fora = [...new Set(mesesComVencimento)].filter((m) => !meses.has(m)).sort((a, b) => ordDoMes(a) - ordDoMes(b));
  let janelaFora: Cobertura["janelaForaDaTabela"] = null;
  if (janela && (janela.inicio || janela.fim) && min != null && max != null) {
    const ini = janela.inicio && ordDoMes(janela.inicio) < min ? janela.inicio : null;
    const fim = janela.fim && ordDoMes(janela.fim) > max ? janela.fim : null;
    if (ini || fim) janelaFora = { inicio: ini, fim };
  }
  return { primeiro: rows[0]?.m ?? null, ultimo: rows[rows.length - 1]?.m ?? null, vencimentosForaDaTabela: fora, janelaForaDaTabela: janelaFora };
}

export interface AnaliseDeIncc {
  /** 6.2/6.3 · períodos encerrados ainda sem índice oficial — o assistente pede que o usuário informe. */
  faltantes: string[];
  curva: CurvaProjetada;
  cobertura: Cobertura;
  total: number;
}

export function analisarIncc(rows: readonly InccRow[], hojeOrd: number, mesesComVencimento: readonly string[], janela: { inicio: string | null; fim: string | null } | null): AnaliseDeIncc {
  return {
    faltantes: mesesEncerradosSemOficial(rows, hojeOrd),
    curva: curvaProjetadaVsHistorico(rows),
    cobertura: cobertura(rows, mesesComVencimento, janela),
    total: rows.length,
  };
}

/** "MM/DD/YYYY" → "MM/YYYY"; null se inválida. */
export function mesDaData(data: string | null | undefined): string | null {
  const m = (data ?? "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[1].padStart(2, "0")}/${m[3]}` : null;
}
