/**
 * A URL da Conciliação de Caixa (Prompt AT §4; GA-11 §3.1). Puro.
 *
 * - `tab`: "contas" (padrão), "cartoes" ou "ajustes". O antigo "conciliacao"
 *   (links salvos) abre a aba Contas correntes.
 * - `conta`: a conta corrente ou o cartão escolhido no seletor; vazio = todas.
 * - `de`/`ate`: o período.
 * Nunca leva `proj` nem `vs` (a tela não tem projeto nem versão).
 */
export type AbaDoCaixa = "contas" | "cartoes" | "ajustes";
export const ABAS_DO_CAIXA: { key: AbaDoCaixa; label: string }[] = [
  { key: "contas", label: "Contas correntes" },
  { key: "cartoes", label: "Cartões de crédito" },
  { key: "ajustes", label: "Ajustes" },
];

export interface ParamsDoCaixa {
  tab?: string;
  de?: string;
  ate?: string;
  conta?: string;
}

/** A aba pedida na URL; desconhecida ou o antigo "conciliacao" → Contas correntes. */
export function abaDoCaixa(tab: string | null | undefined): AbaDoCaixa {
  return tab === "cartoes" || tab === "ajustes" ? tab : "contas";
}

/** Monta a URL da Conciliação de Caixa, preservando período, aba e conta. */
export function urlDoCaixa(p: ParamsDoCaixa): string {
  const q = new URLSearchParams();
  const aba = abaDoCaixa(p.tab);
  if (aba !== "contas") q.set("tab", aba);
  if (p.conta) q.set("conta", p.conta);
  if (p.de) q.set("de", p.de);
  if (p.ate) q.set("ate", p.ate);
  const s = q.toString();
  return s ? `/caixa?${s}` : "/caixa";
}

/** Trocar de aba volta para "Todas" (§3.1): a conta escolhida não passa de uma aba para outra. */
export function urlDaAba(p: ParamsDoCaixa, aba: AbaDoCaixa): string {
  return urlDoCaixa({ de: p.de, ate: p.ate, tab: aba, conta: "" });
}
