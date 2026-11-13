import { describe, it, expect } from "vitest";
import { recusaDeAcerto, recusaDeObrasDoRateio, saldoRealDaDespesa, type DespesaParaAcerto } from "./acerto-regras";

const ped = (extra: Partial<DespesaParaAcerto> = {}): DespesaParaAcerto => ({
  id: "d1",
  numDoc: "PED-1",
  saldo: 100,
  cancelado: false,
  versionKind: "atual",
  locked: false,
  ...extra,
});
const mapa = (...ds: DespesaParaAcerto[]) => new Map(ds.map((d) => [d.id, d]));

describe("saldo real do PED (Prompt I, §17)", () => {
  it("valor − abatimentos ativos − principal pago, nunca negativo", () => {
    expect(saldoRealDaDespesa({ valor: 100, abatidoAtivo: 0, principalPago: 0 })).toBe(100);
    expect(saldoRealDaDespesa({ valor: 100, abatidoAtivo: 60, principalPago: 0 })).toBe(40);
    expect(saldoRealDaDespesa({ valor: 100, abatidoAtivo: 30, principalPago: 30 })).toBe(40);
    expect(saldoRealDaDespesa({ valor: 100, abatidoAtivo: 70, principalPago: 50 })).toBe(0);
    expect(saldoRealDaDespesa({ valor: 0.3, abatidoAtivo: 0.1, principalPago: 0.1 })).toBe(0.1);
  });
});

describe("recusa do acerto (Prompt I, §17)", () => {
  it("cabe no saldo real: passa", () => {
    expect(recusaDeAcerto([{ despesaId: "d1", valor: 40 }], mapa(ped({ saldo: 40 })))).toBeNull();
    expect(recusaDeAcerto([{ despesaId: "d1", valor: 40.005 }], mapa(ped({ saldo: 40 })))).toBeNull();
  });
  it("abatimento maior que o saldo real: recusa dizendo os dois valores", () => {
    const r = recusaDeAcerto([{ despesaId: "d1", valor: 60 }], mapa(ped({ saldo: 40 })));
    expect(r).toMatch(/60\.00/);
    expect(r).toMatch(/40\.00/);
    expect(r).toMatch(/PED-1/);
  });
  it("PED já quitado, cancelado, fora da Atual ou congelado: recusa", () => {
    expect(recusaDeAcerto([{ despesaId: "d1", valor: 1 }], mapa(ped({ saldo: 0 })))).toMatch(/quitada/);
    expect(recusaDeAcerto([{ despesaId: "d1", valor: 1 }], mapa(ped({ cancelado: true })))).toMatch(/cancelada/);
    expect(recusaDeAcerto([{ despesaId: "d1", valor: 1 }], mapa(ped({ versionKind: "forecast" })))).toMatch(/Atual/);
    expect(recusaDeAcerto([{ despesaId: "d1", valor: 1 }], mapa(ped({ locked: true })))).toMatch(/congelada/);
  });
  it("lista vazia, PED repetido, desconhecido ou valor inválido: recusa", () => {
    expect(recusaDeAcerto([], mapa(ped()))).toMatch(/ao menos uma/);
    expect(
      recusaDeAcerto(
        [
          { despesaId: "d1", valor: 1 },
          { despesaId: "d1", valor: 1 },
        ],
        mapa(ped()),
      ),
    ).toMatch(/duas vezes/);
    expect(recusaDeAcerto([{ despesaId: "x", valor: 1 }], mapa(ped()))).toMatch(/não foi encontrada/);
    expect(recusaDeAcerto([{ despesaId: "d1", valor: 0 }], mapa(ped()))).toMatch(/maior que zero/);
    expect(recusaDeAcerto([{ despesaId: "d1", valor: NaN }], mapa(ped()))).toMatch(/maior que zero/);
  });
});

describe("obras do rateio (Prompt I, §18)", () => {
  const empresa = new Set(["p1", "p2"]);
  it("obras distintas da empresa: passa", () => {
    expect(recusaDeObrasDoRateio([{ projectId: "p1" }, { projectId: "p2" }], empresa)).toBeNull();
  });
  it("obra vazia, repetida ou de outra empresa: recusa", () => {
    expect(recusaDeObrasDoRateio([{ projectId: "" }], empresa)).toMatch(/Escolha o projeto/);
    expect(recusaDeObrasDoRateio([{ projectId: "p1" }, { projectId: "p1" }], empresa)).toMatch(/duas vezes/);
    expect(recusaDeObrasDoRateio([{ projectId: "p9" }], empresa)).toMatch(/não pertence/);
  });
});
