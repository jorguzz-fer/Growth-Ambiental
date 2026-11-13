import { describe, it, expect } from "vitest";
import { recusaDaImportacao, type Contagem } from "./versao-importacao";

const zero: Contagem = { units: 0, despesas: 0, permutas: 0, reembolsos: 0 };

describe("recusaDaImportacao (Prompt I, BI-3)", () => {
  it("planilha só com INCC passa em qualquer versão", () => {
    expect(recusaDaImportacao("budget", zero, zero)).toBeNull();
    expect(recusaDaImportacao("atual", zero, zero)).toBeNull();
  });
  it("lançamento fora da Atual é recusado, dizendo o que a planilha traz", () => {
    const r = recusaDaImportacao("budget", { ...zero, despesas: 3, units: 2 }, zero);
    expect(r).toMatch(/só entram na versão Atual/);
    expect(r).toMatch(/unidades, despesas/);
    expect(recusaDaImportacao("forecast", { ...zero, reembolsos: 1 }, zero)).toMatch(/liberações de financiamento/);
    expect(recusaDaImportacao("custom", { ...zero, permutas: 1 }, zero)).not.toBeNull();
  });
  it("na Atual, categoria vazia passa", () => {
    expect(recusaDaImportacao("atual", { ...zero, units: 5, despesas: 2 }, zero)).toBeNull();
  });
  it("na Atual, categoria que já tem registro recusa a importação inteira", () => {
    const r = recusaDaImportacao("atual", { ...zero, units: 5, despesas: 2 }, { ...zero, despesas: 40 });
    expect(r).toMatch(/já tem despesas/);
    expect(r).toMatch(/Nada foi gravado/);
  });
  it("registro existente numa categoria que a planilha não traz não atrapalha", () => {
    expect(recusaDaImportacao("atual", { ...zero, units: 5 }, { ...zero, despesas: 40 })).toBeNull();
  });
});
