import { describe, it, expect } from "vitest";
import { NAO_INFORMADO, noPeriodo, pivotar, type Fato } from "./relatorio-gerencial";

const fatos: Fato[] = [
  { atributos: { cliente: "Mina", contrato: "CT-1", projeto: "P1", competencia: "02/2027" }, valores: { medido: 300 }, mes: 202702 },
  { atributos: { cliente: "Mina", contrato: "CT-1", projeto: "P1", competencia: "03/2027" }, valores: { faturado: 200, receitaReconhecida: 200 }, mes: 202703 },
  { atributos: { cliente: "Mina", contrato: "CT-2", projeto: "P2", competencia: "03/2027" }, valores: { custoApropriado: 50 }, mes: 202703 },
  { atributos: { cliente: "Rodovia", contrato: "CT-3", projeto: "P2", competencia: "03/2027" }, valores: { receitaReconhecida: 100, custoApropriado: 30 }, mes: 202703 },
  { atributos: { projeto: "P2", competencia: "03/2027" }, valores: { horasRealizadas: 8 }, mes: 202703 },
  { atributos: { cliente: "Mina", contrato: "CT-1" }, valores: { contratado: 1000 }, mes: null },
];

describe("Relatório gerencial — tabela dinâmica", () => {
  it("por cliente: soma por linha, margem derivada, total = soma das linhas = soma dos fatos", () => {
    const p = pivotar(fatos, "cliente", ["receitaReconhecida", "custoApropriado", "margem", "contratado"]);
    expect(p.linhas.find((l) => l.rotulo === "Mina")!.valores).toEqual([200, 50, 150, 1000]);
    expect(p.linhas.find((l) => l.rotulo === "Rodovia")!.valores).toEqual([100, 30, 70, 0]);
    expect(p.total).toEqual([300, 80, 220, 1000]);
  });

  it("atributo ausente cai em (não informado), não some", () => {
    const p = pivotar(fatos, "cliente", ["horasRealizadas"]);
    expect(p.linhas).toEqual([{ rotulo: NAO_INFORMADO, valores: [8] }]);
  });

  it("por competência: em ordem cronológica", () => {
    const p = pivotar(fatos.filter((f) => f.mes != null), "competencia", ["medido", "faturado"]);
    expect(p.linhas.map((l) => l.rotulo)).toEqual(["02/2027", "03/2027"]);
  });

  it("período: fatos datados filtrados; posição sempre entra", () => {
    const dentro = fatos.filter((f) => noPeriodo(f, 202703, 202703));
    expect(dentro.length).toBe(5);
    expect(pivotar(dentro, "contrato", ["medido", "contratado"]).total).toEqual([0, 1000]);
  });
});
