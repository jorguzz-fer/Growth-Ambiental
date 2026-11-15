import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { brl0 } from "@/lib/utils";
import { ROTULO_NATUREZA, type CadeiaDeSaldo, type Natureza } from "@/lib/calc/cadeia-caixa";
import { FecharDia } from "@/components/app/fechar-dia";
import type { Atrasados, PrevistoDoDia } from "@/lib/calc/previsto-caixa";

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * Faixa de dias do caixa (Prompt L, 1.4-A): cada cartão mostra saldo inicial
 * e final EM CONTA (extrato) e CONCILIADO; onde não coincidem, a diferença e
 * as naturezas aparecem no próprio cartão. Dia futuro é só projeção (1.4-A.5).
 * Dia passado com pendência é distinguido do fechado (1.6).
 * A faixa é fixa (2 realizados, hoje e 7 à frente) e diz isso na tela.
 */
const quando = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function CadeiaDias({
  cadeia,
  canFechar = false,
  canReabrir = false,
  previsto,
}: {
  cadeia: CadeiaDeSaldo;
  canFechar?: boolean;
  canReabrir?: boolean;
  /** Prompt L2 — o que vence em cada dia (a receber e a pagar em aberto) e o saldo projetado. */
  previsto?: { porDia: Record<string, PrevistoDoDia>; saldo: Record<string, number>; atrasados: Atrasados };
}) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">Cadeia de saldo — 2 dias realizados, hoje e 7 à frente</h2>
        {previsto && (previsto.atrasados.aPagar.qtd > 0 || previsto.atrasados.aReceber.qtd > 0) && (
          <p className="w-full text-[11.5px] text-[var(--color-warning)]" data-atrasados>
            Em atraso, fora da projeção: {previsto.atrasados.aPagar.qtd} a pagar ({brl0(previsto.atrasados.aPagar.valor)}) e{" "}
            {previsto.atrasados.aReceber.qtd} a receber ({brl0(previsto.atrasados.aReceber.valor)}).
          </p>
        )}
        <p className="text-[11px] text-[var(--color-ink3)]">
          Faixa fixa: 2 dias realizados, hoje e 7 à frente. Parte do {cadeia.inicio.fonte === "fechamento" ? "saldo final gravado no fechamento" : "saldo em conta calculado"} de {cadeia.inicio.dia.split("-").reverse().join("/")}: {brl0(cadeia.inicio.conciliado)}. Fechar o dia registra os números; não trava lançamento.
        </p>
      </div>
      <div className="-mx-1 overflow-x-auto pb-1">
        <div className="flex gap-3 px-1">
          {cadeia.dias.map((x) => {
            const [y, m, d] = x.dia.split("-").map(Number);
            const dow = DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
            const tom = x.rotulo === "Hoje" ? "text-[var(--color-accent)]" : x.rotulo === "Projeção" ? "text-[var(--color-warning)]" : x.rotulo === "Realizado · pendente" ? "text-[#92400e]" : "text-[var(--color-ink4)]";
            const naturezas = (Object.keys(x.naturezas) as Natureza[]).filter((k) => x.naturezas[k].itens.length > 0);
            return (
              <Card key={x.dia} className={`w-56 shrink-0 ${x.rotulo === "Hoje" ? "ring-2 ring-[var(--color-accent2)]" : ""}`} data-dia={x.dia} data-rotulo={x.rotulo}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-1">
                    <div className={`font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-wide ${tom}`}>{x.rotulo}</div>
                    {x.fechado && <Badge tone="success">fechado</Badge>}
                    {x.buraco && <Badge tone="warning" title="Dia aberto antes de um dia fechado: a cadeia tem buraco (9.3).">aberto antes de um fechado</Badge>}
                  </div>
                  <div className="text-sm font-semibold text-[var(--color-ink)]">
                    {dow} <span className="font-[family-name:var(--font-mono)] text-[11px] font-normal text-[var(--color-ink3)]">{String(d).padStart(2, "0")}/{String(m).padStart(2, "0")}</span>
                  </div>
                  <table className="mt-2 w-full text-[11px]">
                    <thead>
                      <tr className="text-[9px] uppercase tracking-wide text-[var(--color-ink4)]">
                        <th className="text-left font-normal"></th>
                        <th className="text-right font-normal">Em conta</th>
                        <th className="text-right font-normal">Conciliado</th>
                      </tr>
                    </thead>
                    <tbody className="font-[family-name:var(--font-mono)]">
                      <tr>
                        <td className="text-[var(--color-ink3)]">Saldo inicial</td>
                        <td className="text-right">{x.emConta ? brl0(x.emConta.inicial) : "—"}</td>
                        <td className="text-right">{brl0(x.conciliado.inicial)}</td>
                      </tr>
                      <tr>
                        <td className="text-[var(--color-success)]">↓ Entradas</td>
                        <td className="text-right text-[var(--color-ink3)]">{x.entradas > 0 ? brl0(x.entradas) : "—"}</td>
                        <td className="text-right">{x.rotulo === "Projeção" ? brl0(x.entradas) : x.entradasConciliadas > 0 ? brl0(x.entradasConciliadas) : "—"}</td>
                      </tr>
                      <tr>
                        <td className="text-[var(--color-danger)]">↑ Saídas</td>
                        <td className="text-right text-[var(--color-ink3)]">{x.saidas > 0 ? brl0(x.saidas) : "—"}</td>
                        <td className="text-right">{x.rotulo === "Projeção" ? brl0(x.saidas) : x.saidasConciliadas > 0 ? brl0(x.saidasConciliadas) : "—"}</td>
                      </tr>
                      {x.ajustes !== 0 && (
                        <tr>
                          <td className="text-[var(--color-ink3)]">Ajustes</td>
                          <td className="text-right text-[var(--color-ink4)]">—</td>
                          <td className="text-right">{brl0(x.ajustes)}</td>
                        </tr>
                      )}
                      <tr className="border-t border-[var(--color-line)] font-semibold text-[var(--color-ink)]">
                        <td>Saldo final</td>
                        <td className="text-right">{x.emConta ? brl0(x.emConta.final) : "—"}</td>
                        <td className="text-right">{brl0(x.conciliado.final)}</td>
                      </tr>
                    </tbody>
                  </table>
                  {x.diferenca != null && (
                    <div className={`mt-2 text-[11px] ${Math.abs(x.diferenca) > 0.005 ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"}`}>
                      {Math.abs(x.diferenca) > 0.005 ? `Diferença ${brl0(x.diferenca)}` : "Os dois saldos coincidem"}
                    </div>
                  )}
                  {naturezas.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-[10.5px] text-[var(--color-ink2)]">
                      {naturezas.map((k) => (
                        <li key={k}>
                          {x.naturezas[k].itens.length} {ROTULO_NATUREZA[k]} · {brl0(x.naturezas[k].valor)}
                        </li>
                      ))}
                    </ul>
                  )}
                  {x.rotulo === "Projeção" && <div className="mt-1 text-[10px] text-[var(--color-ink4)]">Projeção: o banco ainda não registrou nada neste dia.</div>}
                  {previsto && previsto.saldo[x.dia] != null && (
                    <div className="mt-2 rounded-[8px] bg-[var(--color-surface2)] px-2 py-1.5 text-[10.5px]" data-previsto-dia>
                      <div className="flex justify-between text-[var(--color-success)]">
                        <span>Vence a receber</span>
                        <span className="font-[family-name:var(--font-mono)]">{previsto.porDia[x.dia]?.aReceber ? brl0(previsto.porDia[x.dia].aReceber) : "—"}</span>
                      </div>
                      <div className="flex justify-between text-[var(--color-danger)]">
                        <span>Vence a pagar</span>
                        <span className="font-[family-name:var(--font-mono)]">{previsto.porDia[x.dia]?.aPagar ? brl0(previsto.porDia[x.dia].aPagar) : "—"}</span>
                      </div>
                      <div className="mt-0.5 flex justify-between border-t border-[var(--color-line)] pt-0.5 font-semibold text-[var(--color-ink)]">
                        <span>Saldo projetado</span>
                        <span className="font-[family-name:var(--font-mono)]">{brl0(previsto.saldo[x.dia])}</span>
                      </div>
                    </div>
                  )}
                  {x.fechamento && (
                    <div className="mt-2 rounded-[8px] border border-[var(--color-line)] bg-[var(--color-bg)] px-2 py-1.5 text-[10.5px] text-[var(--color-ink2)]" data-fechado="1">
                      <div>
                        <strong>Gravado:</strong> final {brl0(x.fechamento.saldoFinal)}
                        {x.fechamento.saldoEmConta != null ? ` · em conta ${brl0(x.fechamento.saldoEmConta)}` : ""}
                        {x.fechamento.divergencia != null ? ` · divergência ${brl0(x.fechamento.divergencia)}` : ""}
                      </div>
                      <div className="text-[var(--color-ink3)]">
                        por {x.fechamento.responsavel ?? "—"}{x.fechamento.fechadoEm ? ` em ${quando(x.fechamento.fechadoEm)}` : ""}
                      </div>
                      {x.divergeDoGravado && (
                        <div className="mt-1 text-[var(--color-danger)]" role="status">
                          Lançado depois do fechamento: o recalculado ({brl0(x.conciliado.final)}) difere do gravado.
                        </div>
                      )}
                    </div>
                  )}
                  {x.rotulo !== "Projeção" && (canFechar || canReabrir) && (
                    <FecharDia dia={x.dia} resumo={{ saldoFinal: x.conciliado.final, saldoEmConta: x.emConta?.final ?? null, diferenca: x.diferenca }} fechamento={x.fechamento?.id ? { id: x.fechamento.id } : null} canFechar={canFechar} canReabrir={canReabrir} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
