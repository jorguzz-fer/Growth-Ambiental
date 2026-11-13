import { describe, it, expect } from "vitest";
import { cincoValores, mesOrdenavel, receitaReconhecida } from "./receita-servicos";

describe("Núcleo financeiro — os cinco valores do contrato", () => {
  it("exemplo da especificação: 600 contratado, 350 medido, 300 faturado, 250 recebido", () => {
    const faturas = [
      { valor: 200000, vencimento: "03/10/2027", cancelado: false },
      { valor: 100000, vencimento: "05/10/2027", cancelado: false },
      { valor: 999999, vencimento: "03/10/2027", cancelado: true },
    ];
    const v = cincoValores({ atualizado: 600000, medidoAprovado: 350000, faturado: 300000, recebido: 250000 }, faturas, "04/30/2027");
    expect(v.saldoAMedir).toBe(250000);
    expect(v.medidoNaoFaturado).toBe(50000);
    expect(v.faturadoNaoRecebido).toBe(50000);
    // receita reconhecida é apurada à parte: até abril, só a fatura de março
    expect(v.receitaReconhecida).toBe(200000);
    expect(v.faturadoAReconhecer).toBe(100000);
  });

  it("medição aprovada sem fatura não vira receita; cancelada e sem vencimento ficam fora", () => {
    expect(receitaReconhecida([], "12/31/2027")).toBe(0);
    expect(receitaReconhecida([{ valor: 10, vencimento: null, cancelado: false }, { valor: 20, vencimento: "01/01/2027", cancelado: true }], "12/31/2027")).toBe(0);
    const v = cincoValores({ atualizado: 100, medidoAprovado: 100, faturado: 0, recebido: 0 }, [], "12/31/2027");
    expect(v.receitaReconhecida).toBe(0);
    expect(v.medidoNaoFaturado).toBe(100);
  });

  it("faturamento à frente da medição aparece negativo, sem esconder", () => {
    expect(cincoValores({ atualizado: 100, medidoAprovado: 20, faturado: 50, recebido: 0 }, [], "01/01/2027").medidoNaoFaturado).toBe(-30);
  });

  it("mês ordenável aceita data e competência", () => {
    expect(mesOrdenavel("03/10/2027")).toBe(202703);
    expect(mesOrdenavel("03/2027")).toBe(202703);
    expect(mesOrdenavel("x")).toBeNull();
  });
});
