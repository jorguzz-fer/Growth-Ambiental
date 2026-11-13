import { describe, it, expect } from "vitest";
import { bla401 } from "./__fixtures__";
import { partesIguais, receitaPorRateio, totalDoContrato } from "./receita-rateio";
import type { CalcUnit } from "./types";

/**
 * Revisão 4, parte 5c — receita da DRE pelo rateio do contrato (decisões do
 * dono de 11/11/2026: total do contrato, dividido pelos meses da obra,
 * revisando os meses passados).
 */
const linha = (u: CalcUnit) => {
  const { code, status, valor: _v, ...plano } = u;
  return { code, status, paymentPlan: plano };
};
const meses = (de: number, ate: number, ano = 2026) => Array.from({ length: ate - de + 1 }, (_, i) => `${String(de + i).padStart(2, "0")}/${ano}`);

describe("rateio da receita pela janela da obra", () => {
  it("total do contrato = soma do plano com permuta e financiamento (não o preço de tabela)", () => {
    const u = bla401();
    expect(u.valor).toBe(537027);
    expect(totalDoContrato(linha(u).paymentPlan, "Vendido")).toBe(555000);
  });

  it("só as seções com a caixinha marcada entram no contrato (BAR-1)", () => {
    const u = bla401();
    u.S1.usarS2 = false;
    expect(totalDoContrato(linha(u).paymentPlan, "Vendido")).toBe(550000);
  });

  it("R$ 500 mil numa obra de 10 meses: R$ 50 mil em cada mês, inclusive os que já passaram", () => {
    const u = bla401();
    // contrato de exatamente 500 mil: só o Ato
    const plano = { usarAS: true, AS: { val: 500000, venc: "04/10/2026", n: 1 } };
    const r = receitaPorRateio([{ code: "A", status: "Vendido", paymentPlan: plano }], meses(1, 10));
    expect(Object.values(r.porMes)).toEqual(Array(10).fill(50000));
    expect(r.porMes["01/2026"]).toBe(50000); // mês anterior à venda: revisado
    expect(r.pendencias).toEqual([]);
    void u;
  });

  it("a soma fecha com o contrato: o resíduo de centavos vai para o último mês", () => {
    expect(partesIguais(100, 3)).toEqual([33.33, 33.33, 33.34]);
    expect(partesIguais(555000, 7).reduce((a, v) => a + v, 0)).toBeCloseTo(555000, 6);
    const r = receitaPorRateio([linha(bla401())], meses(1, 7));
    expect(Object.values(r.porMes).reduce((a, v) => a + v, 0)).toBeCloseTo(555000, 6);
  });

  it("várias unidades somam por mês; unidade não vendida (ou distratada) não reconhece nada", () => {
    const vendida = linha(bla401());
    const disponivel = { ...linha(bla401()), code: "B", status: "Disponivel" };
    const r = receitaPorRateio([vendida, vendida, disponivel], meses(1, 10));
    expect(r.porMes["05/2026"]).toBe(111000);
  });

  it("obra sem início e fim, ou contrato sem caixinha marcada: pendência explícita, nunca zero calado", () => {
    const semCaixinha = { code: "C", status: "Vendido", paymentPlan: { AS: { val: 1000, venc: "01/01/2026", n: 1 } } };
    const r = receitaPorRateio([linha(bla401()), semCaixinha], null);
    expect(r.porMes).toEqual({});
    expect(r.pendencias.map((p) => [p.unidade, p.valor])).toEqual([
      ["UNID 401", 555000],
      ["C", 0],
    ]);
    expect(r.pendencias[0].motivo).toMatch(/início e fim/);
    expect(r.pendencias[1].motivo).toMatch(/caixinha/);
  });
});
