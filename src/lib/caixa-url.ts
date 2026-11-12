/**
 * Prompt AT §4 — a URL do Caixa por conta. Puro.
 */
export interface ParamsDoCaixa {
  tab?: string;
  de?: string;
  ate?: string;
  conta?: string;
}

/** Monta a URL do Caixa por conta, preservando período e aba. 4.7: nunca leva `proj` nem `vs`. */
export function urlDoCaixa(p: ParamsDoCaixa): string {
  const q = new URLSearchParams();
  if (p.tab && p.tab !== "conciliacao") q.set("tab", p.tab);
  if (p.conta) q.set("conta", p.conta);
  if (p.de) q.set("de", p.de);
  if (p.ate) q.set("ate", p.ate);
  const s = q.toString();
  return s ? `/caixa?${s}` : "/caixa";
}
