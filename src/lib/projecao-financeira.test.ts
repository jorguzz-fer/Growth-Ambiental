import { describe, it, expect } from "vitest";
import { custoDe, indicadoresDeProjecao } from "./projecao-financeira";
import type { Inputs } from "@/lib/calc/dre-cascata";

const i = (receita: number, custoVar: number, byCat: Record<string, number> = {}): Inputs => ({ receita, custoVar, byCat });

describe("Budget × Forecast × Realizado — projeção ao término", () => {
  const orcamento = { "01/2027": i(100, 60), "02/2027": i(100, 60), "03/2027": i(100, 60) };
  const revisado = { "01/2027": i(100, 70), "02/2027": i(100, 70), "03/2027": i(100, 70) };
  const atual = { "01/2027": i(100, 80), "02/2027": i(90, 75), "03/2027": i(0, 5) };
  const previsao = { "01/2027": i(100, 80), "02/2027": i(90, 75), "03/2027": i(110, 90) };

  it("realizado até hoje + previsão dos meses que faltam = estimativa ao término; desvio contra o revisado", () => {
    const r = indicadoresDeProjecao({ orcamentoOriginal: orcamento, orcamentoRevisado: revisado, atual, previsao, mesAtual: "02/2027" });
    expect(r.orcamentoOriginal).toEqual({ receita: 300, custo: 180 });
    expect(r.orcamentoRevisado).toEqual({ receita: 300, custo: 210 });
    expect(r.realizadoAteHoje).toEqual({ receita: 190, custo: 155 }); // março do Atual fica fora (futuro)
    expect(r.custoParaConcluir).toBe(90);
    expect(r.custoEstimadoAoTermino).toBe(245);
    expect(r.receitaEstimada).toBe(300);
    expect(r.resultadoEstimado).toBe(55);
    expect(r.margemEstimadaPct).toBeCloseTo(18.33, 2);
    expect(r.desvioDeCusto).toBe(35);
    expect(r.desvioDeCustoPct).toBeCloseTo(16.67, 2);
    expect(r.resultadoOrcado).toBe(90);
    expect(r.baseDoRestante).toBe("previsao");
  });

  it("sem Previsão, o restante vem do Orçamento revisado, e a tela diz isso", () => {
    const r = indicadoresDeProjecao({ orcamentoOriginal: orcamento, orcamentoRevisado: revisado, atual, previsao: null, mesAtual: "02/2027" });
    expect(r.baseDoRestante).toBe("orcamento");
    expect(r.custoParaConcluir).toBe(70);
  });

  it("retiradas, investimentos e empréstimos não são custo do resultado", () => {
    expect(custoDe(i(0, 10, { "Custo Fixo": 5, Retiradas: 100, Investimento: 50, "Empréstimos": 20, "Despesa Fixa": 3 }))).toBe(18);
    // byCat também carrega "Custo Variável" (espelho do custoVar): não conta duas vezes
    expect(custoDe(i(0, 10, { "Custo Variável": 10 }))).toBe(10);
  });

  it("sem nada lançado, nada é inventado", () => {
    const r = indicadoresDeProjecao({ orcamentoOriginal: null, orcamentoRevisado: null, atual: null, previsao: null, mesAtual: "02/2027" });
    expect(r.custoEstimadoAoTermino).toBe(0);
    expect(r.desvioDeCusto).toBeNull();
    expect(r.margemEstimadaPct).toBeNull();
    expect(r.baseDoRestante).toBe("nenhuma");
  });
});
