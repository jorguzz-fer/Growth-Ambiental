import { describe, it, expect } from "vitest";
import { resumoDosContratos, valorContratadoDosProjetos, type ContratoParaResumo, type ContratoParaValor } from "./valor-contratado";

const c = (status: string, atualizado: number, projetos: [string, number | null][]): ContratoParaValor => ({
  status,
  saldo: { atualizado },
  projetos: projetos.map(([id, valorAlocado]) => ({ id, valorAlocado })),
});

describe("Valor contratado do Dashboard (substitui o VGV)", () => {
  it("soma o valor atualizado dos contratos dos projetos em tela; rascunho e cancelado não contam", () => {
    const lista = [c("ativo", 1000, [["p1", null]]), c("concluido", 500.5, [["p2", null]]), c("rascunho", 9999, [["p1", null]]), c("cancelado", 777, [["p1", null]])];
    expect(valorContratadoDosProjetos(lista, new Set(["p1", "p2"]))).toBe(1500.5);
    expect(valorContratadoDosProjetos(lista, new Set(["p1"]))).toBe(1000);
  });
  it("contrato com projetos fora da tela: valor alocado quando informado; senão divisão igual", () => {
    expect(valorContratadoDosProjetos([c("ativo", 900, [["p1", 600], ["p2", 300]])], new Set(["p1"]))).toBe(600);
    expect(valorContratadoDosProjetos([c("ativo", 900, [["p1", null], ["p2", null], ["p3", null]])], new Set(["p1"]))).toBe(300);
    expect(valorContratadoDosProjetos([c("ativo", 900, [["p1", 600], ["p2", 300]])], new Set(["p1", "p2"]))).toBe(900);
  });
  it("contrato sem projeto, ou só de projetos fora da tela, fica fora", () => {
    expect(valorContratadoDosProjetos([c("ativo", 900, []), c("ativo", 100, [["px", null]])], new Set(["p1"]))).toBe(0);
  });
});

describe("Resumo: números de serviço dos contratos do projeto", () => {
  const r = (status: string, at: number, projetos: [string, number | null][], x: Partial<ContratoParaResumo["saldo"]> = {}): ContratoParaResumo => ({
    status,
    projetos: projetos.map(([id, valorAlocado]) => ({ id, valorAlocado })),
    saldo: { atualizado: at, medidoAprovado: 0, faturado: 0, recebido: 0, saldoAMedir: at, medidoNaoFaturado: 0, faturadoNaoRecebido: 0, ...x },
  });
  it("soma medido, faturado, recebido e saldos; contrato dividido entra pela mesma parte do valor contratado", () => {
    const lista = [
      r("ativo", 1000, [["p1", null]], { medidoAprovado: 400, faturado: 300, recebido: 100, saldoAMedir: 600, medidoNaoFaturado: 100, faturadoNaoRecebido: 200 }),
      r("ativo", 2000, [["p1", null], ["p2", null]], { medidoAprovado: 1000, faturado: 1000, recebido: 1000, saldoAMedir: 1000 }),
      r("cancelado", 5000, [["p1", null]], { medidoAprovado: 5000 }),
    ];
    expect(resumoDosContratos(lista, new Set(["p1"]))).toEqual({
      contratos: 2, contratado: 2000, medido: 900, faturado: 800, recebido: 600, aMedir: 1100, medidoNaoFaturado: 100, aReceber: 200,
    });
  });
  it("sem contrato: tudo zero", () => {
    expect(resumoDosContratos([], new Set(["p1"])).contratos).toBe(0);
  });
});
