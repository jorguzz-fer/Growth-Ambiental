import type { IndicadoresDeProjecao } from "@/lib/projecao-financeira";
import Link from "next/link";
import { brl0, pct1 } from "@/lib/utils";

/** Quadro "Projeção ao término" — Orçamento original × revisado × realizado × previsão. Só leitura. */
export function ProjecaoAoTermino({ p, versoes, titulo = "Projeção ao término" }: { p: IndicadoresDeProjecao & { semPrevisaoAprovada?: boolean; semOrcamentoAprovado?: boolean }; versoes: Record<string, string | null>; titulo?: string }) {
  // GA-1 §3: sem Previsão aprovada, o "para concluir" nunca aparece como valor (R$ 0 enganaria). As estimativas
  // só aparecem se o Orçamento revisado ainda prevê custo pela frente; senão, "—".
  const peloOrcamento = p.baseDoRestante === "orcamento" && p.custoParaConcluir > 0.005;
  const semBase = (p.semPrevisaoAprovada || p.semOrcamentoAprovado) && p.baseDoRestante !== "previsao" && !peloOrcamento;
  const paraConcluir = p.semPrevisaoAprovada
    ? ["sem Previsão aprovada", peloOrcamento ? `o Orçamento revisado prevê ${brl0(p.custoParaConcluir)}` : "aprove a Previsão em Planejamento"]
    : [brl0(p.custoParaConcluir), p.baseDoRestante === "previsao" ? `da Previsão${versoes.previsao ? ` “${versoes.previsao}”` : ""}` : p.baseDoRestante === "orcamento" ? "sem Previsão: usa o Orçamento revisado" : "sem planejamento"];
  const linhas: [string, string, string?][] = [
    ["Orçamento original (custo)", p.orcamentoOriginal ? brl0(p.orcamentoOriginal.custo) : "—", versoes.original ? `“${versoes.original}”` : p.semOrcamentoAprovado ? "sem Orçamento aprovado" : "sem Orçamento"],
    ["Orçamento revisado (custo)", p.orcamentoRevisado ? brl0(p.orcamentoRevisado.custo) : "—", versoes.revisado ? `“${versoes.revisado}”` : undefined],
    ["Realizado até o mês corrente (custo)", brl0(p.realizadoAteHoje.custo), `receita ${brl0(p.realizadoAteHoje.receita)}`],
    ["Custo para concluir", paraConcluir[0], paraConcluir[1]],
    ["Custo estimado ao término", semBase ? "—" : brl0(p.custoEstimadoAoTermino), semBase ? "sem planejamento aprovado" : peloOrcamento && p.semPrevisaoAprovada ? "realizado + o que o Orçamento revisado prevê" : "realizado + para concluir"],
    ["Desvio de custo", semBase || p.desvioDeCusto == null ? "—" : `${brl0(p.desvioDeCusto)}${p.desvioDeCustoPct == null ? "" : ` (${pct1(p.desvioDeCustoPct)})`}`, "estimado ao término − Orçamento revisado"],
    ["Receita estimada", semBase ? "—" : brl0(p.receitaEstimada), "realizada + prevista"],
    ["Resultado estimado", semBase ? "—" : brl0(p.resultadoEstimado), semBase || p.margemEstimadaPct == null ? undefined : `margem ${pct1(p.margemEstimadaPct)}`],
    ["Resultado orçado (revisado)", p.resultadoOrcado == null ? "—" : brl0(p.resultadoOrcado), p.margemOrcadaPct == null ? undefined : `margem ${pct1(p.margemOrcadaPct)}`],
  ];
  return (
    <div className="rounded-[12px] border border-[var(--color-line)] bg-white p-4" data-projecao-ao-termino>
      <h3 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">{titulo}</h3>
      {(p.semPrevisaoAprovada || p.semOrcamentoAprovado) && (
        <p className="mb-2 text-[12px] text-[#92400e]" data-projecao-sem-aprovada>
          {p.semPrevisaoAprovada ? "Sem Previsão aprovada" : "Sem Orçamento aprovado"}: só versão Aprovada entra na projeção.{" "}
          <Link href={p.semPrevisaoAprovada ? "/forecast" : "/budget"} className="underline">
            Aprovar em Planejamento →
          </Link>
        </p>
      )}
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
