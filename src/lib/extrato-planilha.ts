import * as XLSX from "xlsx";
import { parseSheet, type ParseResult } from "@/lib/extrato-parse";

/**
 * Prompt AT §8.3.1 — a leitura do extrato em planilha (XLSX ou CSV), a MESMA
 * do diálogo de importação (a tela chamava este código inline). Serve ao
 * navegador (o diálogo) e ao servidor (a ferramenta `ler_extrato` da Cris):
 * para o mesmo arquivo, as mesmas linhas (AT-T15).
 *
 * GA-13 K1/K2 — a planilha vira uma tabela de TEXTO antes de virar linhas:
 * - CSV/TXT: lido por um leitor próprio. A biblioteca de planilhas lia
 *   "03/07/2026" como mês/dia (e ainda deslocava um dia pelo fuso do
 *   navegador). Aqui a data fica como texto e `toInternalDate` a lê como
 *   DD/MM/AAAA. Aceita separador `,`, `;` ou tabulação e campos entre aspas.
 *   A codificação é detectada: BOM UTF-8 → UTF-8; sem BOM, bytes UTF-8
 *   válidos → UTF-8; senão Windows-1252 (Latin-1).
 * - XLSX/XLS: célula de data vira AAAA-MM-DD pelo número de série, sem `Date`
 *   (que dependia do fuso de quem abre). O resto, como antes.
 */
export function linhasDaPlanilha(dados: ArrayBuffer): ParseResult {
  return parseSheet(tabelaDaPlanilha(dados));
}

/** A primeira aba da planilha (ou o CSV) como tabela: texto, número ou data AAAA-MM-DD. */
export function tabelaDaPlanilha(dados: ArrayBuffer): unknown[][] {
  const bytes = new Uint8Array(dados);
  return ehPlanilhaBinaria(bytes) ? tabelaDoXlsx(dados) : lerCsv(decodificarTexto(bytes));
}

/** XLSX (zip, "PK\x03\x04") ou XLS (OLE, D0 CF 11 E0). O resto é texto (CSV/TXT). */
function ehPlanilhaBinaria(b: Uint8Array): boolean {
  const zip = b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
  const ole = b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;
  return zip || ole;
}

function tabelaDoXlsx(dados: ArrayBuffer): unknown[][] {
  const wb = XLSX.read(dados, { cellNF: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws || !ws["!ref"]) return [];
  const faixa = XLSX.utils.decode_range(ws["!ref"]);
  const out: unknown[][] = [];
  for (let r = faixa.s.r; r <= faixa.e.r; r++) {
    const linha: unknown[] = [];
    for (let c = faixa.s.c; c <= faixa.e.c; c++) {
      const cel = ws[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
      linha.push(valorDaCelula(cel));
    }
    if (linha.some((v) => String(v ?? "").trim() !== "")) out.push(linha);
  }
  return out;
}

const dois = (n: number) => String(n).padStart(2, "0");

function valorDaCelula(cel: XLSX.CellObject | undefined): unknown {
  if (!cel || cel.v == null) return "";
  if (cel.t === "n" && typeof cel.v === "number") {
    const formato = typeof cel.z === "string" ? cel.z : "";
    if (formato && XLSX.SSF.is_date(formato)) {
      const d = XLSX.SSF.parse_date_code(cel.v);
      if (d) return `${d.y}-${dois(d.m)}-${dois(d.d)}`;
    }
    return cel.v;
  }
  if (cel.t === "d" && cel.v instanceof Date) {
    const d = cel.v;
    return `${d.getUTCFullYear()}-${dois(d.getUTCMonth() + 1)}-${dois(d.getUTCDate())}`;
  }
  if (cel.t === "b") return cel.v ? "TRUE" : "FALSE";
  return typeof cel.v === "string" ? cel.v : (cel.w ?? String(cel.v));
}

/** GA-13 K2 — bytes do CSV em texto: BOM UTF-8, UTF-8 válido ou Windows-1252. */
export function decodificarTexto(b: Uint8Array): string {
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return new TextDecoder("utf-8").decode(b.subarray(3));
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(b);
  } catch {
    return new TextDecoder("windows-1252").decode(b);
  }
}

/** O separador do CSV pela linha de cabeçalho: `;`, `,` ou tabulação (fora de aspas). */
function separadorDe(texto: string): string {
  const primeira = texto.split(/\r?\n/).find((l) => l.trim()) ?? "";
  const conta: Record<string, number> = { ";": 0, ",": 0, "\t": 0 };
  let aspas = false;
  for (const ch of primeira) {
    if (ch === '"') aspas = !aspas;
    else if (!aspas && ch in conta) conta[ch]++;
  }
  const [maior, vezes] = Object.entries(conta).sort((a, b) => b[1] - a[1])[0];
  return vezes > 0 ? maior : ",";
}

/** GA-13 K1 — leitor de CSV: tudo como texto, campos entre aspas ("" = aspas literal), CRLF ou LF. */
export function lerCsv(texto: string): string[][] {
  const sep = separadorDe(texto);
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (aspas) {
      if (ch === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else aspas = false;
      } else campo += ch;
      continue;
    }
    if (ch === '"') aspas = true;
    else if (ch === sep) {
      linha.push(campo);
      campo = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo);
      if (linha.some((c) => c.trim() !== "")) linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += ch;
  }
  linha.push(campo);
  if (linha.some((c) => c.trim() !== "")) linhas.push(linha);
  return linhas;
}
