"use client";

import { useMemo, useState } from "react";
import { brl0, dateBR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

export interface BalancoRow {
  id: string;
  dia: string; // "MM/DD/YYYY"
  saldoInicial: number;
  totalEntradas: number;
  totalSaidas: number;
  saldoFinal: number;
  divergencias: number;
  responsavelNome: string | null;
  projectName: string | null;
  clienteNome: string | null;
  fechadoEm: string;
  // Prompt L, Parte 9
  saldoEmConta?: number | null;
  reabertoEm?: string | null;
  reabertoPor?: string | null;
  motivoReabertura?: string | null;
}

function toISO(d: string | null): string {
  if (!d) return "";
  const p = d.split("/");
  return p.length === 3 ? `${p[2]}-${p[0].padStart(2, "0")}-${p[1].padStart(2, "0")}` : "";
}

export function BalancoDiaTable({ rows }: { rows: BalancoRow[] }) {
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [obra, setObra] = useState("");
  const [cliente, setCliente] = useState("");

  const opts = useMemo(() => {
    const uniq = (xs: (string | null)[]) =>
      [...new Set(xs.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b));
    return {
      obras: uniq(rows.map((r) => r.projectName)),
      clientes: uniq(rows.map((r) => r.clienteNome)),
    };
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const iso = toISO(r.dia);
        if (de && (!iso || iso < de)) return false;
        if (ate && (!iso || iso > ate)) return false;
        if (obra && r.projectName !== obra) return false;
        if (cliente && r.clienteNome !== cliente) return false;
        return true;
      }),
    [rows, de, ate, obra, cliente],
  );

  const exportCsv = () => {
    const head = [
      "Dia", "Projeto", "Cliente", "Saldo inicial", "Entradas", "Saidas",
      "Saldo final", "Divergencias", "Responsavel", "Fechado em",
    ];
    const lines = filtered.map((r) =>
      [
        dateBR(r.dia), r.projectName ?? "Consolidado", r.clienteNome ?? "",
        r.saldoInicial, r.totalEntradas, r.totalSaidas, r.saldoFinal,
        r.divergencias, r.responsavelNome ?? "", r.fechadoEm,
      ].join(";"),
    );
    const csv = [head.join(";"), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "balanco-do-dia.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-4">
      <Card className="print:hidden">
        <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-6">
          <div>
            <Label>De</Label>
            <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div>
            <Label>Até</Label>
            <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <div>
            <Label>Projeto</Label>
            <Select value={obra} onChange={(e) => setObra(e.target.value)}>
              <option value="">Todos</option>
              {opts.obras.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
          </div>
          <div>
            <Label>Cliente</Label>
            <Select value={cliente} onChange={(e) => setCliente(e.target.value)}>
              <option value="">Todos</option>
              {opts.clientes.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
          </div>
          <div className="flex items-end gap-2 lg:col-span-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>Imprimir</Button>
            <Button variant="outline" size="sm" onClick={exportCsv}>Exportar CSV</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="tbl-scroll overflow-x-auto">
            <Table>
              <THead>
                <tr>
                  <TH>Dia</TH>
                  <TH>Projeto</TH>
                  <TH>Cliente</TH>
                  <TH className="text-right">Saldo inicial</TH>
                  <TH className="text-right">Entradas</TH>
                  <TH className="text-right">Saídas</TH>
                  <TH className="text-right">Saldo final</TH>
                  <TH className="text-right">Diverg.</TH>
                  <TH>Responsável</TH>
                  <TH>Fechado em</TH>
                  <TH>Situação</TH>
                </tr>
              </THead>
              <tbody>
                {filtered.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-[family-name:var(--font-mono)] font-medium text-[var(--color-ink)]">{dateBR(r.dia)}</TD>
                    <TD>{r.projectName ?? "Consolidado"}</TD>
                    <TD className="text-[var(--color-ink3)]">{r.clienteNome ?? "—"}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(r.saldoInicial)}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)] text-[var(--color-success)]">{brl0(r.totalEntradas)}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)] text-[var(--color-danger)]">{brl0(r.totalSaidas)}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)] font-semibold text-[var(--color-accent)]">{brl0(r.saldoFinal)}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(r.divergencias)}</TD>
                    <TD className="text-[var(--color-ink2)]">{r.responsavelNome ?? "—"}</TD>
                    <TD className="font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">{r.fechadoEm}</TD>
                    <TD className="text-[11px]">
                      {r.reabertoEm ? (
                        <span className="text-[#92400e]" title={r.motivoReabertura ?? ""}>reaberto em {r.reabertoEm}{r.reabertoPor ? ` por ${r.reabertoPor}` : ""}{r.motivoReabertura ? ` · ${r.motivoReabertura}` : ""}</span>
                      ) : (
                        <span className="text-[var(--color-success)]">fechado</span>
                      )}
                    </TD>
                  </TR>
                ))}
                {filtered.length === 0 && (
                  <TR><TD colSpan={11} className="py-8 text-center text-[var(--color-ink4)]">Nenhum fechamento registrado.</TD></TR>
                )}
              </tbody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
