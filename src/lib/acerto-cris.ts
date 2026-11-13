/**
 * Prompt T2 (Fase 3 · revisão V5): "Acerto: seleção por voz e marcação em
 * lote, com confirmação". Módulo PURO: a partir do que a Cris propôs (PEDs e
 * um fornecedor), quais despesas da lista marcar. Só marca; a confirmação é
 * o botão Concluir da tela.
 */
export function marcarDespesas(
  despesas: readonly { id: string; numDoc: string | null; fornecedorNome: string | null }[],
  pedido: { peds?: string | null; fornecedorNome?: string | null },
): { ids: string[]; naoAchados: string[] } {
  const ids = new Set<string>();
  const naoAchados: string[] = [];
  const norm = (s: string) => s.replace(/\s+/g, "").toUpperCase();
  for (const bruto of (pedido.peds ?? "").split(/[,;\n]/)) {
    const ped = bruto.trim();
    if (!ped) continue;
    const alvo = norm(ped);
    // Aceita o número inteiro ou o final dele (ex.: "1682" acha "EXM-2026-001682").
    const achadas = despesas.filter((d) => d.numDoc && (norm(d.numDoc) === alvo || norm(d.numDoc).endsWith(alvo.replace(/^0+/, ""))));
    if (achadas.length === 1) ids.add(achadas[0].id);
    else naoAchados.push(achadas.length > 1 ? `${ped} (mais de um)` : ped);
  }
  if (pedido.fornecedorNome) for (const d of despesas) if (d.fornecedorNome === pedido.fornecedorNome) ids.add(d.id);
  return { ids: [...ids], naoAchados };
}
