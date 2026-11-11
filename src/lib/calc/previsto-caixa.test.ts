import { describe, it, expect } from "vitest";
import { aReceberDaFaixa, isoDaData, previstoPorDia, saldosProjetados } from "./previsto-caixa";
import { expandUnitReceivables } from "./receivables";
import type { PaymentPlan } from "./types";

describe("Prompt L2 — previsto dos próximos dias no Caixa", () => {
  const faixa = ["2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19", "2026-10-20"];

  it("soma o que vence em cada dia de hoje em diante; o atrasado vai à parte", () => {
    const { porDia, atrasados } = previstoPorDia(
      faixa,
      "2026-10-18",
      [{ vencimento: "10/19/2026", saldo: 500 }, { vencimento: "10/19/2026", saldo: 100 }, { vencimento: "10/10/2026", saldo: 70 }],
      [{ vencimento: "10/18/2026", saldo: 200 }, { vencimento: "10/20/2026", saldo: 0 }, { vencimento: null, saldo: 9 }, { vencimento: "12/01/2026", saldo: 30 }],
    );
    expect(porDia).toEqual({
      "2026-10-18": { aReceber: 0, aPagar: 200 },
      "2026-10-19": { aReceber: 600, aPagar: 0 },
      "2026-10-20": { aReceber: 0, aPagar: 0 },
    });
    expect(atrasados).toEqual({ aReceber: { qtd: 1, valor: 70 }, aPagar: { qtd: 0, valor: 0 } });
  });

  it("saldo projetado parte do inicial de hoje e acumula caixa lançado + vencimentos", () => {
    const dias = [
      { dia: "2026-10-17", conciliado: { inicial: 900, final: 1000 } },
      { dia: "2026-10-18", conciliado: { inicial: 1000, final: 1050 } }, // +50 lançado hoje
      { dia: "2026-10-19", conciliado: { inicial: 1050, final: 1050 } },
    ];
    const s = saldosProjetados(dias, "2026-10-18", { "2026-10-18": { aReceber: 0, aPagar: 200 }, "2026-10-19": { aReceber: 600, aPagar: 0 } });
    expect(s).toEqual({ "2026-10-18": 850, "2026-10-19": 1450 });
  });

  it("data em formato errado não entra", () => {
    expect(isoDaData("2026-10-18")).toBeNull();
    expect(isoDaData("10/18/2026")).toBe("2026-10-18");
  });
});

describe("Prompt AT §2.1 — a permuta não entra na projeção de 7 dias do Caixa", () => {
  const hoje = "2026-11-11";
  const faixa = ["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"];
  const dias = faixa.map((dia) => ({ dia, conciliado: { inicial: 1000, final: 1000 } }));
  const saldoDeAmanha = (plano: Record<string, unknown>) => {
    const recebiveis = expandUnitReceivables(plano as unknown as PaymentPlan, "Vendido");
    const aReceber = aReceberDaFaixa([], recebiveis, hoje);
    const { porDia } = previstoPorDia(faixa, hoje, aReceber, []);
    return saldosProjetados(dias, hoje, porDia)["2026-11-12"];
  };

  it("AT-T3: unidade com permuta prevista para amanhã — o saldo projetado de amanhã não muda por causa dela", () => {
    const semPermuta = saldoDeAmanha({ Mensais: { venc: "11/12/2026", val: 500, n: 1 } });
    const comPermuta = saldoDeAmanha({ Mensais: { venc: "11/12/2026", val: 500, n: 1 }, Permuta: { dataPrev: "11/12/2026", val: 80000 } });
    expect(semPermuta).toBe(1500);
    expect(comPermuta).toBe(1500);
  });

  it("o resto do plano continua: financiamento (até a BAR-3), FGTS e contas lançadas em aberto", () => {
    const recebiveis = expandUnitReceivables(
      { Banco: { dataPrimParc: "11/12/2026", valFinanc: 2000 }, FGTS: { dataPrev: "11/13/2026", val: 300 }, Permuta: { dataPrev: "11/13/2026", val: 9000 } } as unknown as PaymentPlan,
      "Vendido",
    );
    const r = aReceberDaFaixa(
      [{ status: "Aberto", vencimento: "11/12/2026", valor: 100, valorRecebido: 40 }, { status: "Recebido", vencimento: "11/12/2026", valor: 999, valorRecebido: 999 }],
      recebiveis,
      hoje,
    );
    expect(r).toEqual([
      { vencimento: "11/12/2026", saldo: 60 },
      { vencimento: "11/13/2026", saldo: 300 },
      { vencimento: "11/12/2026", saldo: 2000 },
    ]);
  });
});
