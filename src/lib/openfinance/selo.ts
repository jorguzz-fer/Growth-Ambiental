/** Prompt AT §1-B.9 — o selo do Open Finance diz a verdade. Puro (serve à tela e ao servidor). */
export function seloDoOpenFinance(configurado: boolean, contasConectadas: number): string | null {
  if (!configurado) return null;
  if (contasConectadas === 0) return "Open Finance disponível";
  return contasConectadas === 1 ? "1 conta conectada" : `${contasConectadas} contas conectadas`;
}
