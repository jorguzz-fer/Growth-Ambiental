/**
 * Regras da importação de planilha na tela Versão (Prompt I, BI-3) — puras e
 * testáveis. Decisões (V2-BLOCO2-DECISOES, 30/09/2026):
 *  - lançamento (despesa, unidade, permuta, liberação) só entra na versão
 *    Atual; fora dela a planilha é recusada;
 *  - a planilha só grava numa categoria VAZIA. Antes, ela apagava tudo da
 *    categoria e regravava — e apagar despesa leva junto parcelas, pagamentos
 *    e terceiros. Agora, se já houver registro, recusa e nada é apagado.
 *  - o INCC (do projeto) segue atualizando mês a mês, em qualquer versão,
 *    quando a planilha (no formato antigo) traz as colunas dele.
 *  - Growth Ambiental: unidades, liberações e permutas são recusadas antes
 *    (version-io.ts); aqui ficam por compatibilidade.
 */

export const CATEGORIAS_DA_PLANILHA = ["units", "despesas", "permutas", "reembolsos"] as const;
export type CategoriaDaPlanilha = (typeof CATEGORIAS_DA_PLANILHA)[number];

export const ROTULO_CATEGORIA: Record<CategoriaDaPlanilha, string> = {
  units: "unidades",
  despesas: "despesas",
  permutas: "permutas",
  reembolsos: "liberações de financiamento (dados antigos)",
};

export type Contagem = Record<CategoriaDaPlanilha, number>;

/** Mensagem de recusa da importação, ou null se ela pode seguir. */
export function recusaDaImportacao(
  kindDaVersao: string,
  naPlanilha: Contagem,
  jaNaVersao: Contagem,
): string | null {
  const trazidas = CATEGORIAS_DA_PLANILHA.filter((c) => naPlanilha[c] > 0);
  if (!trazidas.length) return null;
  const lista = (cs: readonly CategoriaDaPlanilha[]) => cs.map((c) => ROTULO_CATEGORIA[c]).join(", ");
  if (kindDaVersao !== "atual") {
    return `Lançamentos só entram na versão Atual. Esta planilha traz ${lista(trazidas)}; importe-a na Atual ou deixe essas abas vazias.`;
  }
  const ocupadas = trazidas.filter((c) => jaNaVersao[c] > 0);
  if (ocupadas.length) {
    return `A importação não substitui registros: esta versão já tem ${lista(ocupadas)}. Nada foi gravado. Deixe essas abas vazias na planilha ou lance pela tela.`;
  }
  return null;
}
