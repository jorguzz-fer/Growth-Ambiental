import { describe, expect, it } from "vitest";
import { avisoDeCadastro, bloqueiosDeExclusaoDaConta, recusaDaConta, rotuloDaAtualizacao, totaisPorTipo } from "./contas-regras";
import { saldoDisponivel, saldoDevidoTerceiros } from "./contas-saldo";

describe("contas correntes — regras puras (Prompt X)", () => {
  it("9 / 5.2 — banco obrigatório; saldo negativo aceito; texto e vazio recusados", () => {
    expect(recusaDaConta({ banco: " ", saldo: "0" })).toMatch(/banco/);
    expect(recusaDaConta({ banco: "Itaú", saldo: "-1500.25" })).toBeNull();
    expect(recusaDaConta({ banco: "Itaú", saldo: "1.500,00".replace(".", "") })).toBeNull(); // "1500,00"
    expect(recusaDaConta({ banco: "Itaú", saldo: "" })).toMatch(/saldo/i);
    expect(recusaDaConta({ banco: "Itaú", saldo: "abc" })).toMatch(/número/);
    expect(recusaDaConta({ banco: "Itaú", saldo: null })).toMatch(/saldo/i);
  });
  it("2 / 1.3 — sem agência e conta avisa (não bloqueia)", () => {
    expect(avisoDeCadastro({ ag: "", cc: "" })).toMatch(/Sem agência e sem número/);
    expect(avisoDeCadastro({ ag: "0001", cc: "" })).toMatch(/Sem número/);
    expect(avisoDeCadastro({ ag: "0001", cc: "12345-6" })).toBeNull();
  });
  it("7 / 4.1 — o rótulo não promete automático sem conexão", () => {
    expect(rotuloDaAtualizacao({ saldoSource: "manual", openFinanceId: null })).toEqual({ rotulo: "Manual", conectada: null });
    expect(rotuloDaAtualizacao({ saldoSource: "auto", openFinanceId: null })).toEqual({ rotulo: "Automático (quando conectado) — não conectada", conectada: false });
    expect(rotuloDaAtualizacao({ saldoSource: "auto", openFinanceId: "abc" }).conectada).toBe(true);
  });
  it("3 / 6 — o total soma só contas ativas, e por tipo", () => {
    const contas = [
      { tipo: "Construtora", saldo: 1000, ativo: true },
      { tipo: "Imobiliária", saldo: "500", ativo: true },
      { tipo: "Imobiliária", saldo: 300, ativo: false },
      { tipo: "Terceiros", saldo: 99, ativo: true },
      { tipo: "Construtora", saldo: 10 }, // ausente = ativa
    ];
    expect(totaisPorTipo(contas)).toEqual([
      { tipo: "Construtora", total: 1010, contas: 2 },
      { tipo: "Imobiliária", total: 500, contas: 1 },
      { tipo: "Terceiros", total: 99, contas: 1 },
    ]);
    expect(saldoDisponivel(contas)).toBe(1510); // sem a inativa e sem Terceiros
    expect(saldoDevidoTerceiros(contas)).toBe(99);
  });
  it("4 / 5 — bloqueios dizem qual vínculo impede; sem vínculo, lista vazia", () => {
    const zero = { despesas: 0, parcelas: 0, pagamentos: 0, restituicoes: 0, acertos: 0, repasses: 0, caixa: 0, contasReceber: 0, cartoes: 0, pagamentosDeFatura: 0 };
    expect(bloqueiosDeExclusaoDaConta(zero)).toEqual([]);
    expect(bloqueiosDeExclusaoDaConta({ ...zero, caixa: 3, cartoes: 1 })).toEqual(["3 lançamento(s) de caixa", "1 cartão(ões) de crédito"]);
  });
});
