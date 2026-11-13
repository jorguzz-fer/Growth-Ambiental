import { describe, it, expect } from "vitest";
import { formularioDoContrato, itensDaProposta, MAX_ITENS_PROPOSTOS } from "./contrato-cris";

describe("Contratos × Cris — formulário de extração", () => {
  it("traz os campos do contrato e até 10 itens, com as listas da empresa", () => {
    const f = formularioDoContrato({ clientes: ["Mineradora X"], modalidades: ["Licenciamento ambiental"] });
    const nomes = f.campos.map((c) => c.nome);
    for (const k of ["titulo", "cliente", "objeto", "valorOriginal", "dataInicio", "dataTerminoPrevista", "indiceReajuste", "regrasReembolso", "regrasMedicao", "condicaoPagamento"]) expect(nomes).toContain(k);
    expect(nomes.filter((n) => n.endsWith("_descricao"))).toHaveLength(MAX_ITENS_PROPOSTOS);
    expect(f.campos.find((c) => c.nome === "cliente")?.opcoes).toEqual(["Mineradora X"]);
    expect(f.campos.find((c) => c.nome === "indiceReajuste")?.opcoes).toContain("IPCA");
  });

  it("itens: só os completos entram; números em pt-BR; critério pelo rótulo", () => {
    const itens = itensDaProposta({
      item1_codigo: "01",
      item1_descricao: "Mobilização da equipe",
      item1_valorUnitario: "40.000,00",
      item1_criterio: "Marco contratual",
      item2_descricao: "Monitoramento arqueológico",
      item2_quantidade: "12",
      item2_valorUnitario: "17500",
      item2_unidade: "mês",
      item2_criterio: "Valor fixo periódico",
      item3_descricao: "Sem valor",
      item4_valorUnitario: "10",
    });
    expect(itens).toEqual([
      { codigo: "01", descricao: "Mobilização da equipe", unidade: null, quantidade: 1, valorUnitario: 40000, criterio: "marco" },
      { codigo: "02", descricao: "Monitoramento arqueológico", unidade: "mês", quantidade: 12, valorUnitario: 17500, criterio: "periodico" },
    ]);
  });
});
