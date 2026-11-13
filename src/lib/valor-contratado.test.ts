import { describe, it, expect } from "vitest";
import { valorContratadoDosProjetos, type ContratoParaValor } from "./valor-contratado";

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
