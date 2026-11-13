import { brl0, dateBR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { AjusteCaixaForm } from "@/components/app/ajuste-caixa-form";

export interface AjusteLinha {
  id: string;
  data: string | null;
  obra: string | null;
  conta: string | null;
  valor: number;
  motivo: string | null;
  autor: string | null;
  quando: string | null;
  /** saldo conciliado ao fim do dia, antes dos ajustes do dia e depois (null fora da cadeia calculada). */
  saldoAntes: number | null;
  saldoDepois: number | null;
}

/**
 * Aba Ajustes (Prompt L, 4.2.4): o único lançamento desta tela e o seu
 * histórico completo (da empresa, todas as obras — como a cadeia, 9.9) —
 * data, obra, conta, valor, motivo, autor e o saldo
 * conciliado antes e depois. Com filtro por período (o da tela) e por conta,
 * e o total sempre à vista no topo. Se esse total cresce, não é o ajuste que
 * está errado: é o lançamento que não está sendo feito.
 */
export function AjustesCaixa({ ajustes, contas, contaFiltro, projectId = "", projetos, canAjustar, de, ate }: { ajustes: AjusteLinha[]; contas: { id: string; banco: string; cc: string | null }[]; contaFiltro: string; projectId?: string; projetos?: { id: string; nome: string }[]; canAjustar: boolean; de: string; ate: string }) {
  const total = Math.round(ajustes.reduce((a, x) => a + x.valor, 0) * 100) / 100;
  return (
    <>
      {canAjustar ? <AjusteCaixaForm contas={contas} projectId={projectId} projetos={projetos} contaInicial={contaFiltro} /> : <p className="mb-4 text-[12.5px] text-[var(--color-ink3)]">Lançar ajuste exige a permissão própria &quot;Conciliação — ajustar e desfazer: criar&quot;.</p>}
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">
              Histórico de ajustes <span className="font-normal text-[var(--color-ink3)]">({ajustes.length})</span>
            </h3>
            <form method="get" action="/caixa" className="flex items-center gap-2 text-[12px]">
              <input type="hidden" name="tab" value="ajustes" />
              {projectId && <input type="hidden" name="proj" value={projectId} />}
              {de && <input type="hidden" name="de" value={de} />}
              {ate && <input type="hidden" name="ate" value={ate} />}
              <label className="text-[var(--color-ink3)]">Conta</label>
              <select name="conta" defaultValue={contaFiltro} className="h-8 rounded-[8px] border border-[var(--color-line)] bg-white px-2 text-xs" aria-label="Filtrar ajustes por conta">
                <option value="">todas</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.banco} · {c.cc || "s/ conta"}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-[8px] border border-[var(--color-line)] bg-white px-2 py-1 text-xs">Filtrar</button>
            </form>
          </div>
          <Table>
            <THead>
              <tr>
                <TH>Data</TH>
                <TH>Projeto</TH>
                <TH>Conta</TH>
                <TH className="text-right">Valor</TH>
                <TH>Motivo</TH>
                <TH>Autor</TH>
                <TH className="text-right">Saldo conciliado antes</TH>
                <TH className="text-right">Depois</TH>
              </tr>
            </THead>
            <tbody>
              {ajustes.map((a) => (
                <TR key={a.id}>
                  <TD className="font-[family-name:var(--font-mono)]">{dateBR(a.data)}</TD>
                  <TD>{a.obra ?? "—"}</TD>
                  <TD>{a.conta ?? "—"}</TD>
                  <TD className={`text-right font-[family-name:var(--font-mono)] ${a.valor < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"}`}>{brl0(a.valor)}</TD>
                  <TD>{a.motivo ?? "—"}</TD>
                  <TD className="text-[11.5px] text-[var(--color-ink3)]">
                    {a.autor ?? "—"}
                    {a.quando ? ` · ${a.quando.slice(0, 10).split("-").reverse().join("/")}` : ""}
                  </TD>
                  <TD className="text-right font-[family-name:var(--font-mono)]">{a.saldoAntes == null ? "—" : brl0(a.saldoAntes)}</TD>
                  <TD className="text-right font-[family-name:var(--font-mono)]">{a.saldoDepois == null ? "—" : brl0(a.saldoDepois)}</TD>
                </TR>
              ))}
              {ajustes.length === 0 && (
                <TR>
                  <TD colSpan={8} className="py-6 text-center text-[var(--color-ink4)]">Nenhum ajuste no período.</TD>
                </TR>
              )}
              <TR>
                <TD colSpan={3} className="font-semibold text-[var(--color-ink)]">Total de ajustes no filtro</TD>
                <TD className="text-right font-[family-name:var(--font-mono)] font-semibold">{brl0(total)}</TD>
                <TD colSpan={4} className="text-[11px] text-[var(--color-ink3)]">Se este total cresce, o problema é lançamento que não está sendo feito — o ajuste é o último recurso.</TD>
              </TR>
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
