import { describe, it, expect } from "vitest";
import { formularioDoMovimento, movimentoDaProposta } from "./estoque-cris";

/** Prompt Y2 — a Cris preenche a entrada ou a baixa; quem registra é a tela. */
const M = [
  { id: "m1", nome: "Cimento CP-II", sku: "CIM", unidade: "sc" },
  { id: "m2", nome: "Areia", sku: null, unidade: "m³" },
];
const O = [{ id: "p1", rotulo: "OBRA A" }];
const D = [{ id: "d1", rotulo: "EXM-1 · Concreteira · R$ 1.000" }];

describe("Prompt Y2 · Estoque com a Cris", () => {
  it("o formulário oferece materiais, obras, despesas e os dois tipos", () => {
    const f = formularioDoMovimento(M, O, D);
    expect(f.campos.find((c) => c.nome === "tipo")?.opcoes).toEqual(["entrada", "baixa"]);
    expect(f.campos.find((c) => c.nome === "material")?.opcoes).toEqual(["Cimento CP-II (CIM) · sc", "Areia · m³"]);
  });

  it("baixa para obra vira saída com motivo, obra e quantidade", () => {
    const r = movimentoDaProposta({ tipo: "baixa", material: "Cimento CP-II (CIM) · sc", quantidade: "10", motivo: "Consumo na obra", obra: "OBRA A" }, M, O, D, "entrada");
    expect(r).toEqual({ mov: { tipo: "saida", itemId: "m1", quantidade: "10", origem: "Consumo na obra", projectId: "p1" }, avisos: [] });
  });

  it("entrada aponta a despesa; motivo de baixa numa entrada é avisado", () => {
    const r = movimentoDaProposta({ tipo: "entrada", material: "Areia · m³", quantidade: "2.5", motivo: "Perda / Quebra", despesa: D[0].rotulo }, M, O, D, "saida");
    expect(r.mov).toEqual({ tipo: "entrada", itemId: "m2", quantidade: "2.5", despesaId: "d1" });
    expect(r.avisos).toHaveLength(1);
  });

  it("baixa não leva despesa; material desconhecido e quantidade inválida ficam de fora", () => {
    const r = movimentoDaProposta({ material: "Tijolo", quantidade: "0", despesa: D[0].rotulo }, M, O, D, "saida");
    expect(r.mov).toEqual({});
    expect(r.avisos).toHaveLength(3);
  });
});
