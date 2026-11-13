import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { analisarResumo, fotografiaDoMesPassado } from "./resumo-analise";
import type { IndicadorDoResumo } from "./resumo-tela";

/** Prompt AE, Parte 5 — o assistente do Resumo, somente leitura. */
const ind = (label: string, value: number, vazio = false): IndicadorDoResumo => ({ label, value, vazio, base: "vendidas" });
const fmt = (n: number) => `R$ ${n}`;
const base = {
  obra: "OBRA",
  versao: "Atual “A”",
  definicaoNova: false,
  indicadores: [ind("VGV total (tabela de preços, todas as unidades)", 900), ind("FGTS", 0, true)],
  unidades: { total: 3, vendidas: 1 },
  vendas: null,
  exposicao: null,
  atencao: null,
  recorte: "r",
  fmt,
};

describe("5.1 — a abertura traz o achado, com número da tela", () => {
  it("sem exceção: o critério VGV × vendidas", () => {
    expect(analisarResumo(base).abertura).toBe("OBRA (Atual “A”): 1 de 3 unidade(s) vendida(s). O VGV de R$ 900 conta todas; Sinais a Subsídio contam só as vendidas.");
  });
  it("com exceção categórica: a primeira, e quantas mais", () => {
    const a = analisarResumo({ ...base, definicaoNova: true, atencao: [{ texto: "2 unidade(s) vendida(s) sem data de venda.", href: "/u" }, { texto: "x", href: "/x" }] });
    expect(a.abertura).toBe("OBRA: 2 unidade(s) vendida(s) sem data de venda. E mais 1 exceção(ões) no bloco Atenção.");
  });
  it("Growth Ambiental — sem unidade: a abertura fala dos contratos de serviço", () => {
    expect(analisarResumo({ ...base, unidades: { total: 0, vendidas: 0 } }).abertura).toBe("OBRA: nenhum contrato de serviço ligado ao projeto. Cadastre em Contratos para ver contratado, medido, faturado e a receber.");
    const servicos = { contratos: 2, contratado: 1000, medido: 250, faturado: 200, recebido: 150, aMedir: 750, medidoNaoFaturado: 50, aReceber: 50 };
    const a = analisarResumo({ ...base, unidades: { total: 0, vendidas: 0 }, servicos });
    expect(a.abertura).toBe("OBRA: 2 contrato(s), R$ 1000 contratado(s); medido R$ 250 (25%); faturado a receber R$ 50.");
    expect(a.explicacoes.map((x) => x.bloco)).toEqual(["Contratos de serviço do projeto"]);
    expect(a.explicacoes.map((x) => x.bloco).join(" ")).not.toMatch(/Vendas|Unidades|Financiamento/);
  });
});

describe("5.3 — bloco pendente não recebe número; a fotografia só leva o que a tela mostra", () => {
  it("explicação dos pendentes é o motivo, sem valor", () => {
    const e = analisarResumo({ ...base, definicaoNova: true }).explicacoes;
    expect(e.find((x) => x.bloco === "Resultado")?.texto).not.toMatch(/R\$/);
    expect(e.find((x) => x.bloco === "Caixa")?.texto).not.toMatch(/R\$/);
  });
  it("linha vazia não entra na fotografia", () => {
    expect(analisarResumo(base).instantaneo).toEqual({ "VGV total (tabela de preços, todas as unidades)": 900 });
  });
  it("o mês passado é a fotografia mais recente de um mês ANTERIOR", () => {
    const f = { "2026-08": { a: 1 }, "2026-09": { a: 2 }, "2026-10": { a: 3 } };
    expect(fotografiaDoMesPassado(f, "2026-10")).toEqual({ mes: "2026-09", valores: { a: 2 } });
    expect(fotografiaDoMesPassado({ "2026-10": { a: 3 } }, "2026-10")).toBeNull();
  });
});

describe("nunca grava", () => {
  it("o painel não importa action nem banco; Montar outra análise é a primeira e não fala em conversa", () => {
    const painel = readFileSync("src/components/app/assistente-resumo.tsx", "utf8");
    expect(painel).not.toMatch(/@\/lib\/actions|@\/lib\/db|use server|fetch\(/);
    expect(painel.indexOf("Montar outra análise")).toBeLessThan(painel.indexOf("Explicar o bloco"));
    expect(painel).not.toMatch(/convers|chat/i);
    expect(painel).toContain("Somente leitura");
  });
});
