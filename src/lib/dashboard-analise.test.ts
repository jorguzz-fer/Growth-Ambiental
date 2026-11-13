import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type { StatusProjeto } from "./queries";
import { divergencias, explicar, instantaneo, variacoes, type ColunaResumo } from "./dashboard-analise";

/** Prompt AA, Parte 6 — o assistente do Dashboard, somente leitura. */
const fmt = (n: number) => `R$ ${n}`;
const st = (o: Partial<StatusProjeto> = {}, c: Partial<StatusProjeto["composicao"]> = {}): StatusProjeto => ({
  receitaPrevista: 0, recebido: 800, pctRecebido: 0, despesaPrevista: 4000, executado: 200, pctExecutado: 0.05,
  margemContribuicao: -140, pctMargem: 0, receitaAtual: 0, custoVariavel: 100, despesaVariavel: 40,
  metragem: 0, custoPorM2: 0, receitaPorM2: 0, erroOrcamento: false,
  composicao: { orcamentos: 2, caixaForaDaAtual: 300, semAtual: 0, orcamentosUsados: [], janela: null, definicaoNova: false, ...c },
  ...o,
});
const col = (o: Partial<ColunaResumo>): ColunaResumo => ({ titulo: "Atual", complemento: "x", kind: "atual", vgv: 0, vgvAusente: false, realizado: 500, aReceber: 0, aPagar: 10, ...o });

describe("6.1 · divergência entre cartões — a causa que está no dado", () => {
  it("caixa de cópias, dois Orçamentos, realizado × entradas, base de receita vazia", () => {
    const d = divergencias({ status: st(), colunas: [col({}), col({ titulo: "Previsão Atualizada", kind: "forecast", vgv: 1000 })], definicaoNova: false, fmt });
    expect(d.map((x) => x.titulo)).toEqual([
      "Entradas de caixa inclui caixa de outras versões",
      "Executado dividido por mais de um Orçamento",
      "Realizado acum. (Atual) ≠ Entradas de caixa",
      "Percentuais sem base",
    ]);
    expect(d[0].texto).toContain("R$ 300");
  });
  it("chave ligada: um Orçamento, então essa divergência não existe", () => {
    const d = divergencias({ status: st({}, { definicaoNova: true, orcamentos: 1, caixaForaDaAtual: 0 }), colunas: [col({ realizado: 800 })], definicaoNova: true, fmt });
    expect(d.map((x) => x.titulo)).toEqual(["Percentuais sem base"]);
  });
  it("sem causa no dado: nada é inventado", () => {
    expect(divergencias({ status: st({ recebido: 500, receitaPrevista: 1000 }, { orcamentos: 1, caixaForaDaAtual: 0 }), colunas: [col({})], definicaoNova: false, fmt })).toEqual([]);
  });
});

describe("6.1 · explicar o indicador", () => {
  it("cada painel declara fonte, regime e janela; muda com a chave", () => {
    const off = explicar({ status: st(), definicaoNova: false });
    expect(off.find((e) => e.cartao === "Entradas de caixa")?.texto).toContain("de todas as versões da obra");
    expect(off.find((e) => e.cartao === "% executado")?.texto).toContain("a soma de 2 Orçamentos");
    const on = explicar({ status: st({}, { definicaoNova: true, orcamentosUsados: ["Orç novo"], janela: "projeto" }), definicaoNova: true });
    expect(on.find((e) => e.cartao === "% executado")?.texto).toContain("“Orç novo”");
    expect(on.find((e) => e.cartao === "Margem de contribuição")?.texto).toContain("início e o fim da obra");
  });
});

describe("6.1 · o que mudou — só números em tela, sem causa", () => {
  const agora = instantaneo({ status: st(), colunas: [col({})] });
  it("primeira visita: sem comparação", () => {
    expect(variacoes(null, agora)).toBeNull();
  });
  it("lista só o que mudou", () => {
    expect(variacoes({ ...agora, Executado: 150 }, agora)).toEqual([{ rotulo: "Executado", antes: 150, agora: 200 }]);
  });
});

describe("6.5 · nunca grava", () => {
  const painel = readFileSync("src/components/app/assistente-dashboard.tsx", "utf8");
  const modulo = readFileSync("src/lib/dashboard-analise.ts", "utf8");
  it("não importa action nem banco, e não faz fetch", () => {
    for (const src of [painel, modulo]) expect(src).not.toMatch(/@\/lib\/actions|@\/lib\/db|use server|fetch\(/);
  });
  it("selo Somente leitura; Montar outra análise é a primeira e não fala em conversa", () => {
    expect(painel).toContain("Somente leitura");
    expect(painel.indexOf("Montar outra análise")).toBeLessThan(painel.indexOf("Explicar o indicador"));
    expect(painel).not.toMatch(/convers|chat/i);
  });
});
