"use client";

import { dadosOuErro } from "@/lib/resultado";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { saveBudgetReceita, type ReceitaProjetoCell } from "@/lib/actions/budget";
import { brl0 } from "@/lib/utils";
import { baixarXlsx } from "@/lib/download";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";

export interface ReceitaProjetoRowView {
  projectId: string;
  projectName: string;
  values: Record<string, number>;
}

// ── parsing tolerante (mesma lógica do import de despesas) ──
function monthKey(cell: unknown): string {
  if (cell == null || cell === "") return "";
  if (cell instanceof Date)
    return `${String(cell.getMonth() + 1).padStart(2, "0")}/${cell.getFullYear()}`;
  const s = String(cell).trim();
  let m = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[1].padStart(2, "0")}/${m[2]}`;
  m = s.match(/^(\d{4})-(\d{1,2})/);
  if (m) return `${m[2].padStart(2, "0")}/${m[1]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[1].padStart(2, "0")}/${m[3]}`;
  return s;
}
function numCell(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let raw = String(v).trim().replace(/[R$\s]/g, "");
  if (!raw) return 0;
  if (/,\d{1,2}$/.test(raw)) raw = raw.replace(/\./g, "").replace(",", ".");
  else {
    raw = raw.replace(/,/g, "");
    if ((raw.match(/\./g) || []).length > 1) raw = raw.replace(/\./g, "");
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function ReceitaProjetosMatrix({
  kind,
  months,
  rows,
  canEdit,
}: {
  kind: "budget" | "forecast";
  months: string[];
  rows: ReceitaProjetoRowView[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, Record<string, string>>>(() => {
    const o: Record<string, Record<string, string>> = {};
    for (const r of rows) {
      o[r.projectId] = {};
      for (const [mes, v] of Object.entries(r.values)) o[r.projectId][mes] = String(v);
    }
    return o;
  });

  const setCell = (pid: string, mes: string, v: string) =>
    setData((s) => ({ ...s, [pid]: { ...(s[pid] || {}), [mes]: v } }));

  const totalRow = (pid: string) =>
    months.reduce((a, m) => a + (Number(data[pid]?.[m]) || 0), 0);
  const totalMes = (m: string) =>
    rows.reduce((a, r) => a + (Number(data[r.projectId]?.[m]) || 0), 0);
  const totalGeral = useMemo(
    () => rows.reduce((a, r) => a + totalRow(r.projectId), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, rows, months],
  );

  const collectCells = (): ReceitaProjetoCell[] => {
    const cells: ReceitaProjetoCell[] = [];
    for (const r of rows)
      for (const m of months) {
        const v = Number(data[r.projectId]?.[m]) || 0;
        if (v !== 0) cells.push({ projectId: r.projectId, mes: m, valor: v });
      }
    return cells;
  };

  const salvar = () => {
    setMsg(null);
    start(async () => {
      try {
        const res = dadosOuErro(await saveBudgetReceita(kind, collectCells()));
        if (res?.skipped?.length)
          setMsg(`Salvo — exceto: ${res.skipped.join(", ")}. Descongele a versão para editar.`);
        else setMsg("Receitas salvas.");
        router.refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Falha ao salvar.");
      }
    });
  };

  const exportar = () => {
    const aoa: (string | number)[][] = [["Projeto", ...months]];
    for (const r of rows)
      aoa.push([r.projectName, ...months.map((m) => Number(data[r.projectId]?.[m]) || 0)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Receitas");
    baixarXlsx(wb, `receitas-${kind}.xlsx`);
  };

  const importar = (file: File) => {
    setMsg(null);
    const byName = new Map(rows.map((r) => [r.projectName.trim().toLowerCase(), r.projectId]));
    start(async () => {
      try {
        const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
        const ws = wb.Sheets["Receitas"] ?? wb.Sheets[wb.SheetNames[0]];
        const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true }).filter((r) => r.length);
        if (!grid.length) throw new Error("Planilha vazia.");
        const cols = (grid[0] as unknown[]).slice(1).map(monthKey);
        // Todos os meses/anos reconhecidos no cabeçalho (para o resumo).
        const mesesValidos = cols.filter(Boolean);
        const anos = [...new Set(mesesValidos.map((m) => m.split("/")[1]).filter(Boolean))].sort();
        const colsInvalidas = cols.filter((c) => !c).length;
        const next: Record<string, Record<string, string>> = { ...data };
        const cells: ReceitaProjetoCell[] = [];
        const naoEncontrados: string[] = [];
        let linhasDados = 0;
        for (const row of grid.slice(1)) {
          const nomeRaw = String((row as unknown[])[0] ?? "").trim();
          if (!nomeRaw) continue;
          linhasDados++;
          const pid = byName.get(nomeRaw.toLowerCase());
          if (!pid) {
            naoEncontrados.push(nomeRaw);
            continue;
          }
          next[pid] = { ...(next[pid] || {}) };
          cols.forEach((mes, i) => {
            if (!mes) return;
            const valor = numCell((row as unknown[])[i + 1]);
            next[pid][mes] = String(valor);
            if (valor !== 0) cells.push({ projectId: pid, mes, valor });
          });
        }
        setData(next);
        const res = dadosOuErro(await saveBudgetReceita(kind, cells));
        // Resumo do processamento (item 3): anos, valores, linhas, não encontrados.
        const partes = [
          `${linhasDados} linha(s) lida(s)`,
          `${cells.length} valor(es) importado(s)`,
          `anos ${anos.join(", ") || "—"} (${mesesValidos.length} períodos)`,
        ];
        if (colsInvalidas > 0) partes.push(`${colsInvalidas} coluna(s) de mês não reconhecida(s)`);
        if (naoEncontrados.length)
          partes.push(`projetos não encontrados: ${[...new Set(naoEncontrados)].join(", ")}`);
        if (res?.skipped?.length) partes.push(`não gravados (congelados): ${res.skipped.join(", ")}`);
        setMsg(partes.join(" · ") + ".");
        router.refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Falha ao importar.");
      }
    });
  };

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" disabled={pending} onClick={exportar}>
            ⬇ Exportar planilha
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) importar(f);
            }}
          />
          <Button variant="outline" size="sm" disabled={pending} onClick={() => fileRef.current?.click()}>
            ⬆ Importar planilha
          </Button>
          <div className="ml-auto flex items-center gap-3">
            {msg && <span className="text-xs text-[var(--color-ink3)]">{msg}</span>}
            <Button disabled={pending} onClick={salvar}>
              {pending ? "Salvando…" : "Salvar receitas"}
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="tbl-scroll overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--color-accent2)]/12">
                  <th className="sticky left-0 z-10 min-w-[200px] bg-white px-3 py-2 text-left font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
                    Projeto
                  </th>
                  {months.map((m) => (
                    <th key={m} className="min-w-[92px] px-2 py-2 text-right font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-ink3)]">
                      {m}
                    </th>
                  ))}
                  <th className="min-w-[110px] px-3 py-2 text-right font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-accent)]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.projectId} className="border-b border-[var(--color-accent2)]/8">
                    <td className="sticky left-0 z-10 bg-white px-3 py-1.5 text-[13px] font-medium text-[var(--color-ink)]">
                      {r.projectName}
                    </td>
                    {months.map((m) => (
                      <td key={m} className="px-1 py-1">
                        <MoneyInput
                          disabled={!canEdit}
                          value={data[r.projectId]?.[m] ?? ""}
                          onChange={(v) => setCell(r.projectId, m, v)}
                          placeholder=""
                          className="h-7 rounded-[6px] border-[var(--color-accent2)]/15 px-1.5 text-[12px]"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-right font-[family-name:var(--font-mono)] text-[12px] font-semibold text-[var(--color-ink)]">
                      {brl0(totalRow(r.projectId))}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={months.length + 2} className="px-3 py-6 text-center text-[var(--color-ink4)]">
                      Nenhum projeto cadastrado.
                    </td>
                  </tr>
                )}
                <tr className="bg-[var(--color-surface2)] font-semibold">
                  <td className="sticky left-0 z-10 bg-[var(--color-surface2)] px-3 py-2 text-[12px] text-[var(--color-ink)]">TOTAL</td>
                  {months.map((m) => (
                    <td key={m} className="px-2 py-2 text-right font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink2)]">
                      {totalMes(m) ? brl0(totalMes(m)) : "—"}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-accent)]">
                    {brl0(totalGeral)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
