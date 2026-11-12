import * as XLSX from "xlsx";
import { parseSheet, type ParseResult } from "@/lib/extrato-parse";

/**
 * Prompt AT §8.3.1 — a leitura do extrato em planilha (XLSX ou CSV), a MESMA
 * do diálogo de importação (a tela chamava este código inline). Serve ao
 * navegador (o diálogo) e ao servidor (a ferramenta `ler_extrato` da Cris):
 * para o mesmo arquivo, as mesmas linhas (AT-T15).
 */
export function linhasDaPlanilha(dados: ArrayBuffer): ParseResult {
  const wb = XLSX.read(dados, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  return parseSheet(aoa);
}
