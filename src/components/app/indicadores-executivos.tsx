import Link from "next/link";
import type { IndicadoresExecutivos } from "@/lib/indicadores-executivos";
import { brl0, pct1 } from "@/lib/utils";

/** Painel executivo de contratos e operação (Dashboard). Só leitura; cada número declara a fonte. */
export function IndicadoresExecutivosPainel({
  i,
  clientes,
  contratos,
  filtro,
  preservar,
}: {
  i: IndicadoresExecutivos;
  clientes: { id: string; nome: string }[];
  contratos: { id: string; rotulo: string }[];
  filtro: { cli: string; ctr: string };
  /** parâmetros da URL a manter no filtro (proj, vs, de, ate) */
  preservar: Record<string, string>;
}) {
  const card = (rotulo: string, valor: string, dica: string, alerta = false) => (
    <div key={rotulo} className="rounded-[12px] border border-[var(--color-line)] bg-white px-4 py-3" title={dica}>
      <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">{rotulo}</div>
      <div className={`mt-0.5 text-[17px] font-semibold ${alerta ? "text-[#b45309]" : "text-[var(--color-ink)]"}`}>{valor}</div>
      <div className="text-[10.5px] leading-snug text-[var(--color-ink4)]">{dica}</div>
    </div>
  );
  return (
    <section className="mt-6" data-indicadores-executivos>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">Contratos e operação</h2>
        <form method="get" className="flex flex-wrap items-end gap-2 text-[12px]">
          {Object.entries(preservar).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <select name="cli" defaultValue={filtro.cli} className="h-8 rounded-[8px] border border-[var(--color-line)] px-2" aria-label="Cliente">
            <option value="">Todos os clientes</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <select name="ctr" defaultValue={filtro.ctr} className="h-8 rounded-[8px] border border-[var(--color-line)] px-2" aria-label="Contrato">
            <option value="">Todos os contratos</option>
            {contratos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.rotulo}
              </option>
            ))}
          </select>
          <button className="h-8 rounded-[8px] border border-[var(--color-line)] px-3">Filtrar</button>
        </form>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        {card("Projetos ativos", String(i.projetosAtivos), "projetos com status Ativo em tela")}
        {card("Contratos ativos", String(i.contratosAtivos), "contratos ativos dos projetos em tela")}
        {card("Valor contratado", brl0(i.contratado), "original + aditivos eficazes")}
        {card("Aditivos (líquido)", brl0(i.aditivos), "acréscimos − reduções eficazes")}
        {card("Medido", brl0(i.medido), "medições aprovadas")}
        {card("Saldo a medir", brl0(i.saldoAMedir), `${i.contratosComSaldoAMedir} contrato(s) ativo(s) com saldo`)}
        {card("Faturado", brl0(i.faturado), "faturas dos contratos")}
        {card("Receita reconhecida", brl0(i.receitaReconhecida), "regra atual: fatura pelo vencimento, até hoje")}
        {card("Recebido", brl0(i.recebido), "recebimentos das faturas")}
        {card("Faturado a receber", brl0(i.aReceber), "faturado − recebido", i.aReceber > 0)}
        {card("Reembolsos pendentes", brl0(i.reembolsoPendente), "solicitado, aprovado ou faturado, não recebido", i.reembolsoPendente > 0)}
        {card(`Horas ${i.horas.competencia}`, `${i.horas.realizadas} / ${i.horas.planejadas} h`, `realizadas / planejadas · custo de pessoal gerencial ${brl0(i.horas.custoPessoalGerencial)}`)}
      </div>
      <div className="mt-3 rounded-[12px] border border-[var(--color-line)] bg-white px-4 py-3 text-[12.5px]" data-projetos-com-desvio>
        <div className="mb-1 font-semibold">Projetos com desvio de custo</div>
        {i.projetosComDesvio.length === 0 ? (
          <p className="text-[var(--color-ink3)]">Nenhum dos {i.projetosAnalisados} projeto(s) em andamento estima custo acima do Orçamento revisado.</p>
        ) : (
          <ul className="space-y-0.5">
            {i.projetosComDesvio.map((p) => (
              <li key={p.nome}>
                {p.nome}: +{brl0(p.desvio)}
                {p.desvioPct != null ? ` (${pct1(p.desvioPct)})` : ""} sobre o Orçamento revisado ·{" "}
                <Link href="/forecast" className="text-[var(--color-accent2)] hover:underline">
                  Previsão
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-2 text-[11.5px] text-[var(--color-ink3)]">
        Contratos que atendem vários projetos entram pela parte de cada projeto em tela; os valores não seguem o seletor de versão nem o período. Margem por contrato e por cliente:{" "}
        <Link href="/dre/contratos" className="text-[var(--color-accent2)] hover:underline">DRE por Contrato e Cliente</Link>.
      </p>
    </section>
  );
}
