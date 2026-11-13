import { describe, it, expect } from "vitest";
import { contagemDeUnidades, saldoFecha, saldoFormatado, vgvFormatado, TOLERANCIA_SALDO_UNIDADE } from "./unidade-exibicao";

describe("exibição de Unidades (Prompt J, seção 3)", () => {
  it("3.4 · tolerância do saldo é R$ 0,01, não R$ 1,00", () => {
    expect(TOLERANCIA_SALDO_UNIDADE).toBe(0.01);
    expect(saldoFecha(0)).toBe(true);
    expect(saldoFecha(0.01)).toBe(true);
    expect(saldoFecha(-0.01)).toBe(true);
    expect(saldoFecha(0.004)).toBe(true);
    expect(saldoFecha(0.02)).toBe(false);
    expect(saldoFecha(0.99)).toBe(false); // fechava antes, com a tolerância de R$ 1
    expect(saldoFecha(-0.5)).toBe(false);
    expect(saldoFecha(NaN)).toBe(false);
  });

  it("3.4 · ponto flutuante não engana a tolerância", () => {
    // 375000.01 − 375000 em JS dá 0.010000000009313226
    expect(saldoFecha(375000.01 - 375000)).toBe(true);
    expect(saldoFecha(0.1 + 0.2 - 0.3)).toBe(true);
  });

  it("3.3 · VGV por ordem de grandeza", () => {
    expect(vgvFormatado(375000)).toBe(brlSemEspacos("R$ 375.000"));
    expect(vgvFormatado(999999.99)).toBe(brlSemEspacos("R$ 1.000.000")); // arredonda para cima, ainda sem "mi"
    expect(vgvFormatado(1_000_000)).toBe("R$ 1,00 mi");
    expect(vgvFormatado(12_500_000)).toBe("R$ 12,50 mi");
    expect(vgvFormatado(0)).toBe(brlSemEspacos("R$ 0"));
    expect(vgvFormatado(NaN)).toBe(brlSemEspacos("R$ 0"));
  });

  it("3.4 · plural", () => {
    expect(contagemDeUnidades(0)).toBe("0 unidades");
    expect(contagemDeUnidades(1)).toBe("1 unidade");
    expect(contagemDeUnidades(12)).toBe("12 unidades");
  });

  it("saldo mostra centavos, porque a tolerância é de um centavo", () => {
    expect(saldoFormatado(0.5)).toBe(brlSemEspacos("R$ 0,50"));
  });
});

/** Intl usa espaço não separável entre "R$" e o número. */
function brlSemEspacos(s: string): string {
  return s.replace("R$ ", "R$ ");
}
