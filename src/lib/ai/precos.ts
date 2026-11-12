/**
 * Preços dos modelos de IA (Prompt AU, Revisão 4). Módulo PURO.
 *
 * Fonte: tabela de preços da API da Anthropic (platform.claude.com, "Pricing"),
 * na versão de 03/11/2026. Valores em US$ por milhão de tokens. Revise esta
 * tabela quando a Anthropic mudar preços ou quando o app passar a usar outro
 * modelo: modelo fora da tabela tem custo DESCONHECIDO (null), nunca zero.
 *
 * Cache (mesma fonte): escrita no cache de 5 minutos (o que o app usa, com
 * `cache_control: ephemeral`) custa 1,25× a entrada; leitura custa 0,1× a
 * entrada, exceto onde a tabela indica outro valor.
 */
export const DATA_DA_TABELA_DE_PRECOS = "03/11/2026";
export const FONTE_DA_TABELA_DE_PRECOS = "Anthropic, tabela de preços da API (platform.claude.com/docs/en/about-claude/pricing)";

interface Preco {
  entrada: number;
  saida: number;
  /** Leitura de cache, US$/MTok. Ausente = 0,1 × entrada. */
  cacheLida?: number;
  /** Faixa acima de 100 mil tokens de prompt (Haiku 5.5). */
  acima100k?: { entrada: number; saida: number };
}

const PRECOS: Record<string, Preco> = {
  "claude-fable-5-2": { entrada: 8, saida: 40, cacheLida: 0.2 },
  "claude-fable-5-1": { entrada: 10, saida: 50, cacheLida: 0.25 },
  "claude-fable-5": { entrada: 10, saida: 50, cacheLida: 1 },
  "claude-opus-5-5": { entrada: 4, saida: 20, cacheLida: 0.2 },
  "claude-opus-5": { entrada: 5, saida: 25 },
  "claude-opus-4-8": { entrada: 5, saida: 25 },
  "claude-opus-4-7": { entrada: 5, saida: 25 },
  "claude-opus-4-6": { entrada: 5, saida: 25 },
  "claude-sonnet-5-5": { entrada: 2, saida: 10, cacheLida: 0.1 },
  "claude-sonnet-5": { entrada: 2, saida: 10 },
  "claude-sonnet-4-6": { entrada: 3, saida: 15 },
  "claude-haiku-5-5": { entrada: 0.1, saida: 0.5, acima100k: { entrada: 0.5, saida: 2.5 } },
  "claude-haiku-4-5": { entrada: 1, saida: 5 },
};

/** Id do modelo sem sufixo de data ("claude-sonnet-4-6-20260101" → "claude-sonnet-4-6"). */
export function modeloBase(modelo: string | null | undefined): string | null {
  if (!modelo) return null;
  return modelo.trim().toLowerCase().replace(/-\d{8}$/, "");
}

export function temPreco(modelo: string | null | undefined): boolean {
  const m = modeloBase(modelo);
  return !!m && m in PRECOS;
}

/** Custo de uma chamada em US$; null se o modelo não estiver na tabela. */
export function custoDaChamadaUsd(c: { modelo: string | null; entrada: number; saida: number; cacheCriacao: number; cacheLida: number }): number | null {
  const m = modeloBase(c.modelo);
  if (!m || !(m in PRECOS)) return null;
  const p = PRECOS[m];
  const prompt = c.entrada + c.cacheCriacao + c.cacheLida;
  const faixa = p.acima100k && prompt > 100_000 ? p.acima100k : p;
  const lida = p.cacheLida != null && faixa === p ? p.cacheLida : faixa.entrada * 0.1;
  const porToken = (usdPorMilhao: number) => usdPorMilhao / 1_000_000;
  return c.entrada * porToken(faixa.entrada) + c.cacheCriacao * porToken(faixa.entrada * 1.25) + c.cacheLida * porToken(lida) + c.saida * porToken(faixa.saida);
}
