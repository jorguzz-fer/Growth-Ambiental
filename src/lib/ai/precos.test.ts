import { describe, it, expect } from "vitest";
import { custoDaChamadaUsd, modeloBase, temPreco } from "./precos";

/** Prompt AU — custo de uma chamada pela tabela de preços (03/11/2026). */
describe("custo de uma chamada de IA", () => {
  it("entrada, saída e cache: 1,25× na escrita e 0,1× na leitura", () => {
    // Sonnet 4.6: US$ 3 / 15 por milhão
    const c = custoDaChamadaUsd({ modelo: "claude-sonnet-4-6", entrada: 1_000_000, saida: 1_000_000, cacheCriacao: 1_000_000, cacheLida: 1_000_000 });
    expect(c).toBeCloseTo(3 + 15 + 3.75 + 0.3, 6);
  });

  it("modelo com leitura de cache própria (Opus 5.5: US$ 0,20)", () => {
    expect(custoDaChamadaUsd({ modelo: "claude-opus-5-5", entrada: 0, saida: 0, cacheCriacao: 0, cacheLida: 1_000_000 })).toBeCloseTo(0.2, 6);
  });

  it("Haiku 5.5 acima de 100 mil tokens de prompt muda de faixa", () => {
    const abaixo = custoDaChamadaUsd({ modelo: "claude-haiku-5-5", entrada: 100_000, saida: 0, cacheCriacao: 0, cacheLida: 0 })!;
    const acima = custoDaChamadaUsd({ modelo: "claude-haiku-5-5", entrada: 100_001, saida: 0, cacheCriacao: 0, cacheLida: 0 })!;
    expect(abaixo).toBeCloseTo(0.01, 6);
    expect(acima).toBeCloseTo(100_001 * 0.5e-6, 6);
  });

  it("sufixo de data é ignorado; modelo fora da tabela tem custo desconhecido (null), nunca zero", () => {
    expect(modeloBase("claude-sonnet-4-6-20260101")).toBe("claude-sonnet-4-6");
    expect(temPreco("claude-sonnet-4-6-20260101")).toBe(true);
    expect(custoDaChamadaUsd({ modelo: "modelo-desconhecido", entrada: 10, saida: 10, cacheCriacao: 0, cacheLida: 0 })).toBeNull();
    expect(custoDaChamadaUsd({ modelo: null, entrada: 10, saida: 10, cacheCriacao: 0, cacheLida: 0 })).toBeNull();
  });
});
