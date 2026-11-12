import { TODOS_OS_PROJETOS } from "@/lib/projeto-selecao";
/**
 * Prompt L, 3-A.2 / 7.2 — o movimento do extrato sem contraparte é
 * ENCAMINHADO para a tela certa, com data, valor e histórico preenchidos:
 * saída → Despesas; entrada → Contas a Receber. O lançamento acontece lá,
 * com a competência, a categoria e o documento fiscal que a conciliação não
 * tem como saber. Puro.
 */
export interface MovimentoParaEncaminhar {
  id: string;
  /** "MM/DD/YYYY" */
  data: string | null;
  descricao: string | null;
  valor: number;
}

export function linkParaLancar(m: MovimentoParaEncaminhar, projectId: string): { href: string; destino: "Despesas" | "Contas a Receber" } {
  const valor = Math.abs(m.valor).toFixed(2);
  const data = m.data ?? "";
  const competencia = data ? `${data.slice(0, 2)}/${data.slice(6)}` : "";
  // Prompt AT §3: o movimento da conta não tem obra; vai com "Todos os
  // projetos" e a obra é escolhida no próprio formulário de lançamento.
  const obra = { proj: projectId || TODOS_OS_PROJETOS };
  if (m.valor < 0) {
    const q = new URLSearchParams({ ...obra, tab: "lancamentos", novo: "1", pf_valor: valor, pf_venc: data, pf_comp: competencia, pf_obs: m.descricao ?? "", pf_cash: m.id });
    return { href: `/despesas?${q.toString()}`, destino: "Despesas" };
  }
  const q = new URLSearchParams({ ...obra, pf_valor: valor, pf_venc: data, pf_desc: m.descricao ?? "", pf_cash: m.id });
  return { href: `/contasreceber?${q.toString()}`, destino: "Contas a Receber" };
}
