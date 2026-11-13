/**
 * Regras puras da tela de Índices de Reajuste (antiga Parâmetros / INCC, Prompt Q). Sem banco.
 *
 * Índice não se inventa (regra global 3): nada aqui gera ou completa índice
 * oficial. O que há é faixa de plausibilidade (aviso, não bloqueio), ordem
 * dos meses, e a leitura de quantos meses entram na média móvel.
 */
import type { InccRow } from "@/lib/calc/types";

/** Faixa plausível da variação mensal (%). Fora dela avisa; só o impossível (não finito) é recusado (4.3). */
export const FAIXA_PLAUSIVEL = { min: -5, max: 5 } as const;

/**
 * Growth Ambiental — a tela virou "Índices de Reajuste": a série declara qual
 * índice guarda. Contrato de serviço reajusta por IPCA, IGP-M ou INPC; as três
 * variantes do INCC (BQ-1) continuam aceitas. Nulo na tabela = "a confirmar".
 * A coluna no banco segue `incc_rate.variante` (texto): nada muda no schema.
 */
export const INDICES_DE_REAJUSTE = ["IPCA", "IGP-M", "INPC", "INCC-DI", "INCC-M", "INCC-10"] as const;
export type IndiceDeReajuste = (typeof INDICES_DE_REAJUSTE)[number];
export function ehIndiceDeReajuste(v: unknown): v is IndiceDeReajuste {
  return typeof v === "string" && (INDICES_DE_REAJUSTE as readonly string[]).includes(v);
}

/**
 * Growth Ambiental: índices oferecidos no reajuste de um contrato de serviço.
 * As variantes do INCC (custo da construção civil) continuam VÁLIDAS para os
 * registros antigos, mas não são oferecidas em contrato novo. Na edição, o
 * índice já gravado continua na lista.
 */
export const INDICES_PARA_CONTRATO_DE_SERVICO = ["IPCA", "IGP-M", "INPC"] as const;
export function indicesOferecidosNoContrato(atual?: string | null): string[] {
  const base: string[] = [...INDICES_PARA_CONTRATO_DE_SERVICO];
  return atual && !base.includes(atual) && ehIndiceDeReajuste(atual) ? [...base, atual] : base;
}

/** Quem publica o índice — para a dica da fonte. */
export function publicadorDoIndice(v: string | null | undefined): "IBGE" | "FGV" | null {
  if (v === "IPCA" || v === "INPC") return "IBGE";
  if (v === "IGP-M" || (v ?? "").startsWith("INCC")) return "FGV";
  return null;
}

/** Nomes antigos (Prompt Q), mantidos para o código que já os usa. */
export const VARIANTES_DO_INCC = INDICES_DE_REAJUSTE;
export type VarianteDoIncc = IndiceDeReajuste;
export const ehVarianteDoIncc = ehIndiceDeReajuste;

/** Tamanho da janela da média móvel (meses). */
export const JANELA_DA_MEDIA = 12;

/** "MM/YYYY" → ordinal (ano × 12 + mês − 1), para comparar meses. */
export function ordDoMes(mes: string): number {
  const [m, y] = mes.split("/").map(Number);
  return y * 12 + (m - 1);
}

/** Ordinal do mês corrente (hoje). */
export function ordDeHoje(hoje = new Date()): number {
  return hoje.getFullYear() * 12 + hoje.getMonth();
}

/** 4.3 · aviso para índice fora da faixa plausível; null quando está dentro. Negativo é aceito: deflação existe. */
export function avisoDeFaixa(mo: number): string | null {
  if (!Number.isFinite(mo)) return "Valor inválido.";
  if (mo < FAIXA_PLAUSIVEL.min || mo > FAIXA_PLAUSIVEL.max) {
    return `${mo}% ao mês está fora da faixa usual (${FAIXA_PLAUSIVEL.min}% a +${FAIXA_PLAUSIVEL.max}%). Confira se não é erro de digitação.`;
  }
  return null;
}

/** 4.6 · quantos meses entram na média móvel do mês na posição `i` (a janela são os `i` anteriores, até 12). */
export function mesesNaMedia(i: number): number {
  return Math.max(0, Math.min(i, JANELA_DA_MEDIA));
}

/** 1.2/2.3 · meses estritamente futuros ainda marcados como oficiais (candidatos a virar projeção, só por ação explícita). */
export function mesesFuturosOficiais(rows: readonly InccRow[], hojeOrd: number): string[] {
  return rows.filter((r) => !r.projected && ordDoMes(r.m) > hojeOrd).map((r) => r.m);
}

/** 6.3 · períodos encerrados (antes do mês corrente) ainda sem índice oficial — ou seja, projetados. */
export function mesesEncerradosSemOficial(rows: readonly InccRow[], hojeOrd: number): string[] {
  return rows.filter((r) => r.projected && ordDoMes(r.m) < hojeOrd).map((r) => r.m);
}

export interface MudancaDeMes {
  mes: string;
  mensal: { de: number; para: number };
  acumulado: { de: number; para: number };
}

/** 3.2 · de/para de cada mês cujo mensal ou acumulado mudou (na escala da coluna, 4 casas). */
export function diffDeIncc(antes: readonly InccRow[], depois: readonly InccRow[]): MudancaDeMes[] {
  const a = new Map(antes.map((r) => [r.m, r]));
  const dif = (x: number, y: number) => Math.round(x * 1e4) !== Math.round(y * 1e4);
  const out: MudancaDeMes[] = [];
  for (const r of depois) {
    const o = a.get(r.m);
    if (!o) continue;
    if (dif(o.mo, r.mo) || dif(o.ac, r.ac)) out.push({ mes: r.m, mensal: { de: o.mo, para: r.mo }, acumulado: { de: o.ac, para: r.ac } });
  }
  return out;
}
