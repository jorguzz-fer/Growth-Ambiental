import * as XLSX from "xlsx";

/**
 * Planilha (XLSX ou CSV) → texto CSV, para a Cris ler como DOCUMENTO (dado,
 * não instrução). Até 3 abas e ~60 mil caracteres; o que passar é cortado e
 * dito. Fórmulas não são executadas: lê o valor gravado na célula.
 */
export const MAX_TEXTO_DA_PLANILHA = 60_000;

export function textoDaPlanilha(bytes: Uint8Array, tipo: string): { ok: true; texto: string; cortado: boolean } | { ok: false; erro: string } {
  try {
    if (tipo === "text/csv" || tipo === "application/csv") {
      const t = new TextDecoder("utf-8").decode(bytes);
      return { ok: true, texto: t.slice(0, MAX_TEXTO_DA_PLANILHA), cortado: t.length > MAX_TEXTO_DA_PLANILHA };
    }
    const wb = XLSX.read(bytes, { type: "array", cellFormula: false });
    const partes: string[] = [];
    for (const nome of wb.SheetNames.slice(0, 3)) {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[nome], { blankrows: false });
      partes.push(`### Aba: ${nome}\n${csv}`);
    }
    const texto = partes.join("\n\n");
    const cortado = texto.length > MAX_TEXTO_DA_PLANILHA || wb.SheetNames.length > 3;
    return { ok: true, texto: texto.slice(0, MAX_TEXTO_DA_PLANILHA), cortado };
  } catch {
    return { ok: false, erro: "planilha ilegível ou protegida" };
  }
}
