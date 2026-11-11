import { describe, it, expect } from "vitest";
import { BASE_DE_CONHECIMENTO } from "@/lib/assistente-base";
import { regrasDaCris } from "@/lib/cris";

/**
 * Prompt AQ §1 (Revisão 4) — a Cris repete a base de conhecimento. Se a base
 * disser que "só a pergunta vai ao modelo", ela diz isso ao usuário, e é falso
 * desde 15/10 (BE-2 reaberta). Estes testes travam o texto verdadeiro.
 */
const secaoDoAssistente = (() => {
  const i = BASE_DE_CONHECIMENTO.indexOf("### O assistente");
  const fim = BASE_DE_CONHECIMENTO.indexOf("\n---", i);
  return BASE_DE_CONHECIMENTO.slice(i, fim);
})();

describe("A base diz a verdade sobre o que vai ao modelo (AQ §1)", () => {
  it("nenhuma frase diz que só a pergunta vai ao modelo, nem que dado pessoal nunca vai", () => {
    expect(BASE_DE_CONHECIMENTO).not.toMatch(/só o texto da pergunta vai ao modelo/i);
    expect(BASE_DE_CONHECIMENTO).not.toMatch(/números, nomes e cadastros não vão/i);
    expect(BASE_DE_CONHECIMENTO).not.toMatch(/o nome do comprador não vai ao modelo/i);
    expect(BASE_DE_CONHECIMENTO).not.toMatch(/o nome não vai ao modelo/i);
    expect(BASE_DE_CONHECIMENTO).not.toMatch(/dado pessoal do funcionário não vai ao modelo/i);
    expect(BASE_DE_CONHECIMENTO).not.toMatch(/nem lê documento pessoal dele/i);
  });

  it("a seção 'O assistente' traz, em ordem: o que faz, o que vai, o que não vai, a exceção do anexo e o registro", () => {
    const marcos = ["O que ela faz:", "O que vai ao modelo de IA:", "O que não vai:", "A exceção é o anexo:", "A conversa não é gravada."];
    const posicoes = marcos.map((m) => secaoDoAssistente.indexOf(m));
    expect(posicoes.every((p) => p >= 0)).toBe(true);
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });

  it("o que vai ao modelo está completo: histórico, resumo da tela, resultado das buscas e o documento inteiro", () => {
    expect(secaoDoAssistente).toMatch(/histórico da conversa nesta aba \(até 12 falas\)/);
    expect(secaoDoAssistente).toMatch(/resumo dos números da tela/);
    expect(secaoDoAssistente).toMatch(/resultado das buscas/);
    expect(secaoDoAssistente).toMatch(/documento anexado, inteiro/);
  });

  it("a regra da Cris manda responder pela seção completa", () => {
    expect(regrasDaCris()).toContain("Nunca diga que só a pergunta vai ao modelo.");
    expect(regrasDaCris()).not.toMatch(/documento de cliente ou funcionário\) não chega até você/);
  });
});

describe("O texto do chat também não promete o que não cumpre (AQ §1)", () => {
  it("o aviso do chat diz que o documento anexado vai inteiro", async () => {
    const { readFileSync } = await import("node:fs");
    const chat = readFileSync("src/components/app/chat-assistente.tsx", "utf8");
    expect(chat).not.toMatch(/Dado pessoal não vai\./);
    expect(chat).toMatch(/o documento que você anexar, inteiro/);
  });
});
