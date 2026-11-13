import type { IndicadoresDeProjecao } from "@/lib/projecao-financeira";
import { brl0, pct1 } from "@/lib/utils";

/** Quadro "Projeção ao término" — Orçamento original × revisado × realizado × previsão. Só leitura. */
export function ProjecaoAoTermino({ p, versoes, titulo = "Projeção ao término" }: { p: IndicadoresDeProjecao; versoes: Record<string, string | null>; titulo?: string }) {
  const linhas: [string, string, string?][] = [
    ["Orçamento original (custo)", p.orcamentoOriginal ? brl0(p.orcamentoOriginal.custo) : "—", versoes.original ? `“${versoes.original}”` : "sem Orçamento"],
    ["Orçamento revisado (custo)", p.orcamentoRevisado ? brl0(p.orcamentoRevisado.custo) : "—", versoes.revisado ? `“${versoes.revisado}”` : undefined],
    ["Realizado até o mês corrente (custo)", brl0(p.realizadoAteHoje.custo), `receita ${brl0(p.realizadoAteHoje.receita)}`],
    ["Custo para concluir", brl0(p.custoParaConcluir), p.baseDoRestante === "previsao" ? `da Previsão${versoes.previsao ? ` “${versoes.previsao}”` : ""}` : p.baseDoRestante === "orcamento" ? "sem Previsão: usa o Orçamento revisado" : "sem planejamento"],
    ["Custo estimado ao término", brl0(p.custoEstimadoAoTermino), "realizado + para concluir"],
    ["Desvio de custo", p.desvioDeCusto == null ? "—" : `${brl0(p.desvioDeCusto)}${p.desvioDeCustoPct == null ? "" : ` (${pct1(p.desvioDeCustoPct)})`}`, "estimado ao término − Orçamento revisado"],
    ["Receita estimada", brl0(p.receitaEstimada), "realizada + prevista"],
    ["Resultado estimado", brl0(p.resultadoEstimado), p.margemEstimadaPct == null ? undefined : `margem ${pct1(p.margemEstimadaPct)}`],
    ["Resultado orçado (revisado)", p.resultadoOrcado == null ? "—" : brl0(p.resultadoOrcado), p.margemOrcadaPct == null ? undefined : `margem ${pct1(p.margemOrcadaPct)}`],
  ];
  return (
    <div className="rounded-[12px] border border-[var(--color-line)] bg-white p-4" data-projecao-ao-termino>
      <h3 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">{titulo}</h3>
      <table className="w-full text-[12.5px]">
        <tbody>
          {linhas.map(([rotulo, valor, nota]) => (
            <tr key={rotulo} className="border-t border-[var(--color-line)]">
              <td className="px-2 py-1.5">{rotulo}</td>
              <td className="px-2 py-1.5 text-right font-[family-name:var(--font-mono)]">{valor}</td>
              <td className="px-2 py-1.5 text-[11.5px] text-[var(--color-ink3)]">{nota ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-[var(--color-ink3)]">
        Custo = custos e despesas do resultado (sem retiradas, investimentos e empréstimos). As versões não se sobrescrevem: o Orçamento original é o primeiro criado.
      </p>
    </div>
  );
}
