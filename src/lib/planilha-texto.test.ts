import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { MAX_TEXTO_DA_PLANILHA, textoDaPlanilha } from "./planilha-texto";

describe("Planilha → texto para a Cris", () => {
  it("XLSX vira CSV por aba, com o valor da célula (fórmula não é executada)", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Despesa", "Valor"], ["Hospedagem", 1200], ["Combustível", 300]]), "Despesas");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const r = textoDaPlanilha(new Uint8Array(buf), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(r.ok && r.texto).toContain("### Aba: Despesas");
    expect(r.ok && r.texto).toContain("Hospedagem,1200");
  });
  it("CSV passa como texto; o que passa do limite é cortado e dito", () => {
    const longo = "a,b\n".repeat(MAX_TEXTO_DA_PLANILHA);
    const r = textoDaPlanilha(new TextEncoder().encode(longo), "text/csv");
    expect(r.ok && r.cortado).toBe(true);
    expect(r.ok && r.texto.length).toBe(MAX_TEXTO_DA_PLANILHA);
  });
  it("arquivo ilegível não quebra", () => {
    const r = textoDaPlanilha(new Uint8Array([1, 2, 3]), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(r.ok === false || typeof r.texto === "string").toBe(true);
  });
});
