import { describe, expect, it } from "vitest";
import { analisarContas, type ContaParaAnalise } from "./contas-analise";

const HOJE = "2026-09-30";
const conta = (p: Partial<ContaParaAnalise> & { id: string }): ContaParaAnalise => ({ banco: "Banco Exemplo", ag: "0001", cc: "12345-6", tipo: "Imobiliária", saldo: 0, saldoSource: "manual", openFinanceId: null, lastSync: null, ativo: true, ...p });

describe("assistente de Contas Correntes (Prompt X, 7) — puro, somente leitura", () => {
  it("aponta cadastros que não parecem conta, sem movimento, saldo parado e auto não conectada", () => {
    const contas = [
      conta({ id: "a", lastSync: "2026-09-01" }), // ok
      conta({ id: "b", banco: "SOCIO MESSIAS", ag: "", cc: "", lastSync: "2026-01-01" }), // não parece conta; saldo parado
      conta({ id: "c", banco: "Caixa", saldoSource: "auto", lastSync: "2026-09-20" }), // auto não conectada
      conta({ id: "d", banco: "Inter", saldoSource: "auto", openFinanceId: "x", lastSync: "2026-09-20" }), // auto conectada
      conta({ id: "e", banco: "Velha", ativo: false, ag: "", cc: "" }), // inativa: fora de tudo
    ];
    const uso = [
      { id: "a", lancamentos: 10, ultimoLancamento: "2026-09-10" },
      { id: "c", lancamentos: 3, ultimoLancamento: "2026-01-10" }, // > 180 dias
    ];
    const a = analisarContas(contas, uso, HOJE);
    expect(a.naoParecemConta).toEqual([{ id: "b", banco: "SOCIO MESSIAS", motivo: "sem agência e sem número", saldo: 0 }]);
    expect(a.semMovimento.map((x) => x.id)).toEqual(["b", "c", "d"]);
    expect(a.saldoParado.map((x) => [x.id, x.dias])).toEqual([["b", 272]]);
    expect(a.autoNaoConectada.map((x) => x.id)).toEqual(["c"]);
    expect(a.total).toBe(4);
  });
  it("nunca atualizado conta como parado, com dias nulos", () => {
    const a = analisarContas([conta({ id: "n" })], [], HOJE);
    expect(a.saldoParado).toEqual([{ id: "n", banco: "Banco Exemplo · 12345-6", saldo: 0, lastSync: null, dias: null }]);
  });
});
