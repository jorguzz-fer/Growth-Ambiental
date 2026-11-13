import { describe, it, expect } from "vitest";
import { ROTAS_CONHECIDAS } from "./cris";
import { BASE_DE_CONHECIMENTO } from "./assistente-base";

/** A base de conhecimento que a Cris usa (antes, a do Assistente do produto, Prompt AM 2.2). */
describe("Base de conhecimento", () => {
  it("não tem dado de empresa nem exemplo com valor", () => {
    // "R$ 0" e tolerâncias de centavos são regra de exibição; valor a partir de R$ 1 seria exemplo de dado.
    expect(BASE_DE_CONHECIMENTO).not.toMatch(/R\$\s?[1-9]/);
    expect(BASE_DE_CONHECIMENTO).not.toMatch(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
    expect(BASE_DE_CONHECIMENTO).not.toMatch(/OBRA \d/i);
  });
  it("toda rota citada como link existe no menu", () => {
    for (const m of BASE_DE_CONHECIMENTO.matchAll(/\]\((\/[a-z0-9-]+)\)/g)) expect(ROTAS_CONHECIDAS.has(m[1]), m[1]).toBe(true);
  });
  it("Growth Ambiental: as telas de construção que saíram não são descritas como telas de hoje", () => {
    for (const titulo of [/## Unidades \(\/unidades\)/, /## Simulador \(\/simulador\)/, /## Permuta \(\/permuta\)/, /## Liberações de Obra/, /## Projeção de Receitas \(\/projecao\)/, /## Medição de Projeto/, /## Índices de Reajuste/]) {
      expect(BASE_DE_CONHECIMENTO).not.toMatch(titulo);
    }
    // cada uma aparece só no aviso de que saiu, com o destino da função
    expect(BASE_DE_CONHECIMENTO).toMatch(/## Telas que saíram/);
    expect(BASE_DE_CONHECIMENTO).toMatch(/Liberações de Obra\*\* \(\/reembolso, financiamento imobiliário\): saiu/);
    // o objeto gerido é o projeto, e a empresa usuária é uma consultoria ambiental
    expect(BASE_DE_CONHECIMENTO).toMatch(/consultorias ambientais/);
    expect(BASE_DE_CONHECIMENTO).not.toMatch(/escolha a obra|por obra\b|Rateio entre obras|construtora que lança/i);
    expect(BASE_DE_CONHECIMENTO).not.toMatch(/\bcompradores\b/i);
  });
  it("não fala mais da tela Assistente como tela de chat", () => {
    expect(BASE_DE_CONHECIMENTO).not.toMatch(/## Assistente \(\/diagnosticoia\)/);
    expect(BASE_DE_CONHECIMENTO).toMatch(/Cris/);
  });
});
