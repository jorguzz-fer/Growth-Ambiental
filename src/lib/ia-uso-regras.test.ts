import { describe, it, expect } from "vitest";
import { avisoDeFallback, recusaPorLimite, resumoPorOperacao, type LinhaDeUso } from "./ia-uso-regras";

const l = (o: Partial<LinhaDeUso>): LinhaDeUso => ({ operacao: "chat", modelo: "m", fallback: false, entrada: 10, saida: 2, cacheCriacao: 0, cacheLida: 0, erro: false, ...o });

describe("consumo da IA (Prompt AM, Parte 5)", () => {
  it("limite por pessoa e por empresa, com mensagem clara", () => {
    expect(recusaPorLimite({ pessoa: 29, empresa: 299 })).toBeNull();
    expect(recusaPorLimite({ pessoa: 30, empresa: 0 })).toContain("30 perguntas por hora por pessoa");
    expect(recusaPorLimite({ pessoa: 0, empresa: 300 })).toContain("300 perguntas por hora da empresa");
  });

  it("totais por operação: entrada inclui a criação do cache; leitura do cache à parte", () => {
    const r = resumoPorOperacao([l({ entrada: 5, cacheCriacao: 1000 }), l({ entrada: 5, cacheLida: 1000 }), l({ operacao: "despesa", erro: true, entrada: 0, saida: 0 })]);
    expect(r[0]).toEqual({ operacao: "chat", chamadas: 2, erros: 0, entrada: 1010, saida: 4, cacheLida: 1000 });
    expect(r[1]).toMatchObject({ operacao: "despesa", chamadas: 1, erros: 1 });
  });

  it("avisa quando o primário falha sistematicamente (cadeia de fallback)", () => {
    expect(avisoDeFallback([...Array(4)].map(() => l({ fallback: true })))).toBeNull();
    expect(avisoDeFallback([...Array(6)].map(() => l({ fallback: true })).concat([l({})]))).toContain("6 de 7");
    expect(avisoDeFallback([...Array(5)].map(() => l({ fallback: true })).concat([...Array(5)].map(() => l({}))))).toBeNull();
  });
});

describe("Etapa 3 — limites configuráveis, custo estimado e alerta de orçamento", async () => {
  const { limitesEfetivos, recusaDeLimites, custoEstimado, alertaDeOrcamento, LIMITES_DE_CONVERSA } = await import("./ia-uso-regras");
  it("limite vazio usa o padrão do sistema; configurado vale", () => {
    expect(limitesEfetivos(null)).toEqual(LIMITES_DE_CONVERSA);
    expect(limitesEfetivos({ conversasPessoaHora: 5, conversasEmpresaHora: null })).toEqual({ porPessoaPorHora: 5, porEmpresaPorHora: LIMITES_DE_CONVERSA.porEmpresaPorHora });
    expect(recusaPorLimite({ pessoa: 5, empresa: 5 }, limitesEfetivos({ conversasPessoaHora: 5, conversasEmpresaHora: null }))).toMatch(/5 perguntas por hora por pessoa/);
  });
  it("recusa limites inválidos", () => {
    expect(recusaDeLimites({ conversasPessoaHora: 0, conversasEmpresaHora: null, orcamentoMensalUsd: null })).toMatch(/inteiros/);
    expect(recusaDeLimites({ conversasPessoaHora: 1.5, conversasEmpresaHora: null, orcamentoMensalUsd: null })).toMatch(/inteiros/);
    expect(recusaDeLimites({ conversasPessoaHora: 50, conversasEmpresaHora: 10, orcamentoMensalUsd: null })).toMatch(/não pode passar/);
    expect(recusaDeLimites({ conversasPessoaHora: null, conversasEmpresaHora: null, orcamentoMensalUsd: -1 })).toMatch(/orçamento/);
    expect(recusaDeLimites({ conversasPessoaHora: 10, conversasEmpresaHora: 100, orcamentoMensalUsd: 50 })).toBeNull();
  });
  it("custo estimado: modelo sem preço não vira zero, é contado à parte", () => {
    const r = custoEstimado([l({ modelo: "a" }), l({ modelo: "b" }), l({ modelo: "x" })], (x) => (x.modelo === "x" ? null : 0.0125));
    expect(r).toEqual({ usd: 0.025, semPreco: 1 });
  });
  it("alerta de orçamento a partir de 80% e acima de 100%; sem orçamento, nada", () => {
    expect(alertaDeOrcamento(10, null)).toBeNull();
    expect(alertaDeOrcamento(70, 100)).toBeNull();
    expect(alertaDeOrcamento(85, 100)).toMatch(/85% do orçamento/);
    expect(alertaDeOrcamento(120, 100)).toMatch(/passou do orçamento/);
  });
});
