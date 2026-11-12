import { describe, it, expect } from "vitest";
import { bla401 } from "./__fixtures__";
import { calcProjectionBySource } from "./projection";
import { expandUnitReceivables } from "./receivables";
import { previaDasUnidades } from "@/lib/plano-previa";
import type { CalcUnit } from "./types";

/**
 * Prompt AR, Fase 2 (Revisão 4) — chave `plano_definicao_nova`, com as
 * decisões do dono de 11/11/2026 (BAR-1 a BAR-5). AR-T1: pela definição nova,
 * recebíveis e projeção dão o MESMO total; a diferença que sobra é o INCC, só
 * na projeção (BAR-5), documentada em `opts`.
 */
const somaReceb = (u: CalcUnit, definicaoNova: boolean) => expandUnitReceivables(u, u.status, { definicaoNova }).reduce((a, r) => a + r.valor, 0);
const somaProj = (u: CalcUnit, definicaoNova: boolean) =>
  Object.values(calcProjectionBySource(u, [], { definicaoNova })).reduce((a, m) => a + Object.values(m).reduce((b, v) => b + v, 0), 0);
const variacao = (mexer: (u: CalcUnit) => void) => {
  const u = bla401();
  mexer(u);
  return u;
};

describe("plano pela definição nova (BAR-1 a BAR-5)", () => {
  it("AR-T1: os quatro cenários da spec — recebíveis e projeção passam a bater", () => {
    const A = bla401();
    const B = variacao((u) => (u.S1.usarS2 = false));
    const C = variacao((u) => (u.Subsidio.statusSub = "Aguardando Caixa"));
    const D = variacao((u) => (u.S1.n = 3));
    // antes (chave desligada): 555 / 530, 555 / 525, 555 / 520, 565 / 540
    expect([A, B, C, D].map((u) => [somaReceb(u, false), somaProj(u, false)])).toEqual([[555000, 530000], [555000, 525000], [555000, 520000], [565000, 540000]]);
    // definição nova: sem financiamento (25 mil) e sem permuta (90 mil); B perde o Sinal 2 (caixinha); C mantém o subsídio
    expect([A, B, C, D].map((u) => [somaReceb(u, true), somaProj(u, true)])).toEqual([[440000, 440000], [435000, 435000], [440000, 440000], [450000, 450000]]);
  });

  it("BAR-1: seção preenchida com a caixinha desmarcada não é recebível", () => {
    const u = variacao((x) => (x.Mensais.usarSem = false));
    const secoes = new Set(expandUnitReceivables(u, u.status, { definicaoNova: true }).map((r) => r.secao));
    expect(secoes.has("Semestrais")).toBe(false);
    expect(secoes.has("Mensais")).toBe(true);
  });

  it("BAR-3 e BAR-4: financiamento e permuta do plano saem dos recebíveis; a permuta sai da projeção", () => {
    const u = bla401();
    const secoes = new Set(expandUnitReceivables(u, u.status, { definicaoNova: true }).map((r) => r.secao));
    expect(secoes.has("Banco")).toBe(false);
    expect(secoes.has("Permuta")).toBe(false);
    expect(Object.keys(calcProjectionBySource(u, [], { definicaoNova: true }).Permuta)).toEqual([]);
  });

  it("BAR-2: subsídio ainda não recebido entra como previsto na projeção", () => {
    const u = variacao((x) => (x.Subsidio.statusSub = "Aguardando Caixa"));
    expect(calcProjectionBySource(u, [], { definicaoNova: false })["Subsídio"]).toEqual({});
    expect(calcProjectionBySource(u, [], { definicaoNova: true })["Subsídio"]).toEqual({ "02/2026": 10000 });
  });

  it("BAR-5: o INCC continua só na projeção", () => {
    const u = bla401();
    const incc = [{ m: "07/2026", mo: 1, ac: 10 }];
    const proj = calcProjectionBySource(u, incc, { definicaoNova: true }).Mensais["07/2026"];
    const receb = expandUnitReceivables(u, u.status, { definicaoNova: true }).filter((r) => r.secao === "Mensais" && r.dia === "07/27/2026");
    expect(proj).toBe(5500); // 6ª mensal, corrigida em 10%
    expect(receb.map((r) => r.valor)).toEqual([5000]); // nominal
  });

  it("unidade não vendida continua sem recebível", () => {
    const u = variacao((x) => (x.status = "Disponivel"));
    expect(somaReceb(u, true)).toBe(0);
  });
});

describe("prévia da chave e lista de conferência", () => {
  it("separa o que sai por financiamento, por permuta e por caixinha, e lista as unidades a conferir", () => {
    const comoLinha = (u: CalcUnit) => {
      const { code, status, valor: _v, ...plano } = u;
      return { code, status, paymentPlan: plano };
    };
    const ok = bla401();
    const semCaixinha = variacao((x) => {
      x.code = "B-202";
      x.S1.usarS2 = false;
      x.Mensais.usarSem = false;
    });
    const p = previaDasUnidades([comoLinha(ok), comoLinha(semCaixinha)]);
    expect(p.hoje).toBe(1110000);
    expect(p.saiFinanciamento).toBe(50000);
    expect(p.saiPermuta).toBe(180000);
    expect(p.saiCaixinha).toBe(5000 + 120000);
    expect(p.nova).toBe(p.hoje - p.saiFinanciamento - p.saiPermuta - p.saiCaixinha);
    expect(p.aConferir).toEqual([{ unidade: "B-202", secoes: ["Sinal 2", "Semestrais"], valor: 125000 }]);
  });
});
