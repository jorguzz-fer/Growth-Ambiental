import { describe, it, expect } from "vitest";
import { bloqueiosDeExclusaoUnidade, confirmacaoDeUnidadeConfere, unidadeVendida } from "./unidade-regras";

const livre = { clienteComContrato: null, vendida: false, contasReceber: 0, documentos: 0, permutas: 0 };

describe("exclusão de unidade (Prompt I, §12)", () => {
  it("sem vínculo, pode", () => {
    expect(bloqueiosDeExclusaoUnidade(livre)).toEqual([]);
  });
  it("cada vínculo vira um motivo", () => {
    expect(bloqueiosDeExclusaoUnidade({ ...livre, clienteComContrato: "Ana" })[0]).toMatch(/Ana/);
    expect(bloqueiosDeExclusaoUnidade({ ...livre, vendida: true })[0]).toMatch(/vendida/);
    expect(bloqueiosDeExclusaoUnidade({ ...livre, contasReceber: 2 })[0]).toMatch(/2 conta/);
    expect(bloqueiosDeExclusaoUnidade({ ...livre, documentos: 1, permutas: 1 })).toHaveLength(2);
  });
  it("confirmação pelo código, sem diferenciar caixa e espaços", () => {
    expect(confirmacaoDeUnidadeConfere(" unid 401 ", "UNID 401")).toBe(true);
    expect(confirmacaoDeUnidadeConfere("UNID 402", "UNID 401")).toBe(false);
    expect(confirmacaoDeUnidadeConfere("", "UNID 401")).toBe(false);
    expect(confirmacaoDeUnidadeConfere(undefined, "UNID 401")).toBe(false);
  });
  it("vendida: por status ou por data de venda", () => {
    expect(unidadeVendida({ status: "Vendido", mesVenda: null })).toBe(true);
    expect(unidadeVendida({ status: "Permutado", mesVenda: null })).toBe(true);
    expect(unidadeVendida({ status: "Disponivel", mesVenda: "09/10/2026" })).toBe(true);
    expect(unidadeVendida({ status: "Disponivel", mesVenda: " " })).toBe(false);
    expect(unidadeVendida({ status: "Reservado", mesVenda: null })).toBe(false);
  });
});
