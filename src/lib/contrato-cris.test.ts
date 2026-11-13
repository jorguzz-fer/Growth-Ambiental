import { describe, it, expect } from "vitest";
import { formularioDaMedicao, formularioDoContrato, itensDaProposta, medicaoDaProposta, MAX_ITENS_PROPOSTOS } from "./contrato-cris";

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

describe("Etapa 3 — medição assistida pela Cris", () => {
  const opc = {
    itens: [{ id: "i1", rotulo: "01 · Monitoramento de ruído" }],
    projetos: [{ id: "p1", nome: "Licenciamento LO" }],
    aditivos: [{ id: "a1", codigo: "AD-001" }],
  };

  it("o formulário só oferece as listas da tela e não tem campo de situação (a Cris nunca aprova)", () => {
    const f = formularioDaMedicao(opc);
    expect(f.id).toBe("medicao");
    expect(f.campos.find((c) => c.nome === "item")?.opcoes).toEqual(["01 · Monitoramento de ruído"]);
    expect(f.campos.some((c) => /status|situa|aprova/i.test(c.nome))).toBe(false);
  });

  it("converte nomes em ids e manda para conferência o que não casa", () => {
    const r = medicaoDaProposta(
      { item: "01 · Monitoramento de ruído", projeto: "Projeto inexistente", aditivo: "AD-001", competencia: "03/2026", valor: "R$ 12.500,00", periodoInicio: "03/01/2026", periodoFim: "31/03/2026", obs: "Campanha de março" },
      opc,
    );
    expect(r.campos).toMatchObject({ itemId: "i1", projectId: "", aditivoId: "a1", competencia: "03/2026", valor: "12500", periodoInicio: "03/01/2026", obs: "Campanha de março" });
    expect(r.conferir).toEqual(expect.arrayContaining(["projeto"]));
  });

  it("competência, número ou data inválidos não entram", () => {
    const r = medicaoDaProposta({ competencia: "março", percentual: "-5", periodoInicio: "2026-03-01" }, opc);
    expect(r.campos.competencia).toBe("");
    expect(r.campos.percentual).toBe("");
    expect(r.campos.periodoInicio).toBe("");
    expect(r.conferir).toEqual(expect.arrayContaining(["competencia", "percentual", "periodoInicio"]));
  });
});
