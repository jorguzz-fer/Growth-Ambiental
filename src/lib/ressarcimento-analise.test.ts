import { describe, expect, it } from "vitest";
import { agingPorTerceiro, analisarRessarcimentos, concentracaoDoSaldo, encontrosDisponiveis, obrigacoesAConferir, type ObrigacaoParaAnalise } from "./ressarcimento-analise";
import { agingDasObrigacoes } from "./calc/aging";

const HOJE = "2026-09-30";
const ob = (p: Partial<ObrigacaoParaAnalise> & { id: string }): ObrigacaoParaAnalise => ({
  numDoc: `PED-${p.id}`, pagador: "Ivo", projectName: "Obra A", valorTotal: 100, valorRestituido: 0, saldoPendente: 100,
  dataPagamentoOriginal: "08/01/2026", dataPrevistaRestituicao: null, status: "Pendente", ...p,
});

describe("assistente de Ressarcimentos (Prompt T, seção 10) — puro, somente leitura", () => {
  it("aging por terceiro usa a mesma função do lote e da conta corrente; cancelada e quitada não entram", () => {
    const lista = [
      ob({ id: "1", dataPrevistaRestituicao: "09/20/2026" }), // 10 d
      ob({ id: "2", saldoPendente: 50, valorRestituido: 50, dataPrevistaRestituicao: "07/15/2026" }), // 77 d
      ob({ id: "3", pagador: "Construtora X", dataPagamentoOriginal: "05/01/2026" }), // 152 d
      ob({ id: "4", status: "Cancelado", dataPagamentoOriginal: "01/01/2026" }),
      ob({ id: "5", saldoPendente: 0, valorRestituido: 100, dataPagamentoOriginal: "01/01/2026" }),
    ];
    const a = agingPorTerceiro(lista, HOJE);
    expect(a.map((x) => x.terceiro)).toEqual(["Construtora X", "Ivo"]); // quem tem mais acima de 30 primeiro
    const inacio = a[1];
    expect(inacio.faixas).toEqual(agingDasObrigacoes([lista[0], lista[1]].map((o) => ({ saldo: o.saldoPendente, dataPrevistaRestituicao: o.dataPrevistaRestituicao, dataPagamentoOriginal: o.dataPagamentoOriginal })), HOJE));
    expect(inacio.faixas).toEqual({ ate30: 100, de31a60: 0, de61a90: 50, acima90: 0 });
    expect(inacio.total).toBe(150);
    expect(inacio.acimaDe30).toBe(50);
    expect(a[0].faixas.acima90).toBe(100);
  });

  it("encontro de contas disponível só para quem tem saldo nos dois lados", () => {
    const e = encontrosDisponiveis([
      { terceiro: "Ivo", saldoARestituir: 300, saldoARepassar: 120 },
      { terceiro: "Construtora X", saldoARestituir: 500, saldoARepassar: 0 },
      { terceiro: "Mix", saldoARestituir: 0, saldoARepassar: 80 },
      { terceiro: "Zé", saldoARestituir: 10, saldoARepassar: 40 },
    ]);
    expect(e.map((x) => [x.terceiro, x.compensavel])).toEqual([["Ivo", 120], ["Zé", 10]]);
  });

  it("conferir: sem previsão, sem pagador e saldo negativo (restituído a mais)", () => {
    const c = obrigacoesAConferir([
      ob({ id: "1", dataPrevistaRestituicao: "09/20/2026" }), // ok
      ob({ id: "2" }), // sem previsão
      ob({ id: "3", pagador: null }), // sem previsão + sem pagador
      ob({ id: "4", valorRestituido: 130, saldoPendente: 0, dataPrevistaRestituicao: "09/20/2026" }), // negativo
      ob({ id: "5", status: "Cancelado" }),
      ob({ id: "6", saldoPendente: 0, valorRestituido: 100 }), // quitada sem previsão: nada a conferir
    ]);
    expect(c.map((x) => [x.id, x.motivos])).toEqual([
      ["3", ["sem previsão", "sem pagador"]],
      ["2", ["sem previsão"]],
      ["4", ["saldo negativo"]],
    ]);
    expect(c.find((x) => x.id === "4")?.valor).toBe(30);
    expect(c.find((x) => x.id === "3")?.terceiro).toBe("Sem pagador");
  });

  it("concentração: principais até 80% e dominante acima de metade", () => {
    const k = concentracaoDoSaldo([
      { terceiro: "A", saldoARestituir: 600, saldoARepassar: 0 },
      { terceiro: "B", saldoARestituir: 250, saldoARepassar: 0 },
      { terceiro: "C", saldoARestituir: 150, saldoARepassar: 0 },
      { terceiro: "D", saldoARestituir: 0, saldoARepassar: 99 },
    ]);
    expect(k.totalDevido).toBe(1000);
    expect(k.principais.map((p) => [p.terceiro, p.fatia])).toEqual([["A", 60], ["B", 25]]);
    expect(k.dominante).toEqual({ terceiro: "A", fatia: 60 });
    expect(concentracaoDoSaldo([])).toEqual({ totalDevido: 0, principais: [], dominante: null });
  });

  it("12d / 15 — a análise nunca vê nem devolve dados bancários ou PIX, e não grava nada", () => {
    const a = analisarRessarcimentos([ob({ id: "1" })], [{ terceiro: "Ivo", saldoARestituir: 100, saldoARepassar: 0 }], HOJE);
    const texto = JSON.stringify(a).toLowerCase();
    for (const proibido of ["pix", "banco", "agencia", "conta"]) expect(texto).not.toContain(proibido);
    expect(a.totalObrigacoes).toBe(1);
  });
});
