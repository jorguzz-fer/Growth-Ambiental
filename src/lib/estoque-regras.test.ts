import { describe, expect, it } from "vitest";
import { avisoDaDespesa, avisoDeSaldo, movimentoInverso, numeroDoCampo, recusaDaExclusaoDoItem, recusaDoEstorno, recusaDoItem, recusaDoMovimento, saldoPorItem, valorDoMovimento } from "./estoque-regras";

describe("Estoque — regras (Prompt Y)", () => {
  it("1 / 2 — entrada aumenta, saída diminui; saldo negativo aparece", () => {
    const s = saldoPorItem([
      { itemId: "a", tipo: "entrada", quantidade: 10 },
      { itemId: "a", tipo: "saida", quantidade: 3 },
      { itemId: "b", tipo: "saida", quantidade: 4 },
    ]);
    expect(s.get("a")).toBe(7);
    expect(s.get("b")).toBe(-4); // não é escondido
  });
  it("6 / 7 / 10 — entrada sem origem e com as duas são recusadas; saída exige obra", () => {
    const base = { itemId: "i", quantidade: 1 };
    expect(recusaDoMovimento({ ...base, tipo: "entrada", despesaId: null, permutaId: null, projectId: null })).toMatch(/sem origem/);
    expect(recusaDoMovimento({ ...base, tipo: "entrada", despesaId: "d", permutaId: "p", projectId: null })).toMatch(/não as duas/);
    expect(recusaDoMovimento({ ...base, tipo: "entrada", despesaId: "d", permutaId: null, projectId: null })).toBeNull();
    expect(recusaDoMovimento({ ...base, tipo: "entrada", despesaId: null, permutaId: "p", projectId: null })).toBeNull();
    expect(recusaDoMovimento({ ...base, tipo: "saida", despesaId: null, permutaId: null, projectId: null })).toMatch(/qual projeto/);
    expect(recusaDoMovimento({ ...base, tipo: "saida", despesaId: null, permutaId: null, projectId: "obra" })).toBeNull();
    expect(recusaDoMovimento({ itemId: "i", quantidade: 0, tipo: "saida", despesaId: null, permutaId: null, projectId: "obra" })).toMatch(/quantidade/);
  });
  it("12 — saída maior que o saldo avisa (permite com confirmação); 9 — soma acima da despesa avisa", () => {
    expect(avisoDeSaldo(5, "saida", 8, "sc")).toMatch(/fica em -3 sc/);
    expect(avisoDeSaldo(5, "saida", 5, "sc")).toBeNull();
    expect(avisoDeSaldo(0, "entrada", 8, "sc")).toBeNull();
    expect(avisoDaDespesa(1000, 800, 300)).toMatch(/acima do valor lançado/);
    expect(avisoDaDespesa(1000, 800, 200)).toBeNull();
  });
  it("11 / 2.4 — o valor do movimento é quantidade × custo gravado", () => {
    expect(valorDoMovimento(3, 12.5)).toBe(37.5);
  });
  it("5.1 — número do campo: ponto decimal do input, vírgula brasileira e milhar; texto inválido não vira zero", () => {
    expect(numeroDoCampo("32.5")).toBe(32.5);
    expect(numeroDoCampo("32,5")).toBe(32.5);
    expect(numeroDoCampo("1.250,75")).toBe(1250.75);
    expect(numeroDoCampo("")).toBe(0);
    expect(Number.isNaN(numeroDoCampo("abc"))).toBe(true);
    expect(recusaDoItem({ nome: "X", unidade: "un", custoUnit: numeroDoCampo("abc"), minimo: 0 })).toMatch(/custo/);
  });
  it("13 — estorno é lançamento inverso que aponta o original; estorno de estorno é recusado", () => {
    const m = { id: "m1", itemId: "i", tipo: "entrada", quantidade: 4, custoUnit: 10, projectId: null, despesaId: "d", permutaId: null, estornoDeId: null };
    expect(movimentoInverso(m, "09/30/2026", "nota errada")).toMatchObject({ tipo: "saida", quantidade: "4", custoUnit: "10", despesaId: "d", origem: "Estorno", estornoDeId: "m1" });
    expect(recusaDoEstorno(m, false, "x")).toBeNull();
    expect(recusaDoEstorno(m, true, "x")).toMatch(/já foi estornado/);
    expect(recusaDoEstorno({ ...m, estornoDeId: "m0" }, false, "x")).toMatch(/já é um estorno/);
    expect(recusaDoEstorno(m, false, " ")).toMatch(/motivo/);
  });
  it("14 / 15 — nome vazio recusado; custo negativo recusado; unidade da lista; item com movimento não é excluído", () => {
    expect(recusaDoItem({ nome: "  ", unidade: "un", custoUnit: 0, minimo: 0 })).toMatch(/nome/);
    expect(recusaDoItem({ nome: "Cimento", unidade: "un", custoUnit: -1, minimo: 0 })).toMatch(/negativo/);
    expect(recusaDoItem({ nome: "Cimento", unidade: "sacos", custoUnit: 1, minimo: 0 })).toMatch(/unidade/);
    expect(recusaDoItem({ nome: "Cimento", unidade: "sc", custoUnit: 1, minimo: 0 })).toBeNull();
    expect(recusaDaExclusaoDoItem(2)).toMatch(/inative/);
    expect(recusaDaExclusaoDoItem(0)).toBeNull();
  });
});
