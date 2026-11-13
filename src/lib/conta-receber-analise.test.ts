import { describe, it, expect } from "vitest";
import {
  analisarContasReceber,
  proporConciliacoes,
  recebidasSemConciliar,
  semUnidadeOuCliente,
  valorForaDoPadrao,
  vencidasSemRecebimento,
  type ContaParaAnalise,
} from "./conta-receber-analise";

const HOJE = 20261001; // 01/10/2026
const conta = (p: Partial<ContaParaAnalise> & { id: string }): ContaParaAnalise => ({
  projectId: "obra",
  tipo: "Parcela mensal",
  descricao: null,
  valor: 1000,
  vencimento: "09/15/2026",
  unitCode: "A-1",
  clienteId: "cli",
  clienteNome: "Maria Souza",
  recebimentos: [],
  ...p,
});

describe("Assistente de Contas a Receber — análises puras (Prompt K, 8.3)", () => {
  it("vencidas: só com saldo e vencimento antes de hoje, por faixa de idade, da mais antiga para a mais nova", () => {
    const r = vencidasSemRecebimento(
      [
        conta({ id: "a", vencimento: "09/25/2026" }),
        conta({ id: "b", vencimento: "06/01/2026" }),
        conta({ id: "c", vencimento: "08/10/2026" }),
        conta({ id: "futura", vencimento: "10/02/2026" }),
        conta({ id: "hoje", vencimento: "10/01/2026" }),
        conta({ id: "quitada", vencimento: "01/01/2026", recebimentos: [{ valor: 1000, data: "01/02/2026", cashEntryId: "m", estornado: false }] }),
        conta({ id: "parcial", vencimento: "07/01/2026", recebimentos: [{ valor: 400, data: "07/02/2026", cashEntryId: null, estornado: false }] }),
        conta({ id: "estornada", vencimento: "09/01/2026", recebimentos: [{ valor: 1000, data: "09/02/2026", cashEntryId: "m", estornado: true }] }),
      ],
      HOJE,
    );
    expect(r.map((x) => [x.id, x.dias, x.faixa, x.saldo])).toEqual([
      ["b", 122, "mais de 90 dias", 1000],
      ["parcial", 92, "mais de 90 dias", 600],
      ["c", 52, "31 a 60 dias", 1000],
      ["estornada", 30, "até 30 dias", 1000],
      ["a", 6, "até 30 dias", 1000],
    ]);
  });

  it("recebidas sem conciliar: soma só os recebimentos ativos fora do extrato e conta os dias do mais antigo", () => {
    const r = recebidasSemConciliar(
      [
        conta({
          id: "a",
          recebimentos: [
            { valor: 300, data: "09/01/2026", cashEntryId: null, estornado: false },
            { valor: 200, data: "09/20/2026", cashEntryId: null, estornado: false },
            { valor: 500, data: "09/21/2026", cashEntryId: "m", estornado: false },
            { valor: 900, data: "08/01/2026", cashEntryId: null, estornado: true },
          ],
        }),
        conta({ id: "b", recebimentos: [{ valor: 1000, data: "09/30/2026", cashEntryId: "m", estornado: false }] }),
      ],
      HOJE,
    );
    expect(r).toEqual([{ id: "a", rotulo: "Un. A-1 · Maria Souza · Parcela mensal", valor: 500, dias: 30 }]);
  });

  it("sem unidade ou cliente: 'Outras Receitas' e 'Outros' dispensam unidade, nunca o cliente", () => {
    const r = semUnidadeOuCliente([
      conta({ id: "ok" }),
      conta({ id: "semUn", unitCode: null }),
      conta({ id: "semCli", clienteId: null, clienteNome: null }),
      conta({ id: "outras", tipo: "Outras Receitas", unitCode: null, descricao: "Aluguel do stand" }),
      conta({ id: "outrasSemCli", tipo: "Outras Receitas", unitCode: null, clienteId: null, clienteNome: null, descricao: "x" }),
      // Growth Ambiental: fatura de serviço não tem unidade
      conta({ id: "fatura", tipo: "Fatura de serviço", unitCode: null }),
    ]);
    expect(r.map((x) => [x.id, x.faltaUnidade, x.faltaCliente])).toEqual([
      ["semUn", true, false],
      ["semCli", false, true],
      ["outrasSemCli", false, true],
    ]);
  });

  it("valor fora do padrão: mediana das parcelas mensais da unidade (mín. 3), desvio acima de 20 %", () => {
    const r = valorForaDoPadrao([
      conta({ id: "p1", valor: 1000 }),
      conta({ id: "p2", valor: 1000 }),
      conta({ id: "p3", valor: 1050 }),
      conta({ id: "p4", valor: 1500 }),
      conta({ id: "p5", valor: 700 }),
      conta({ id: "sinal", tipo: "Sinal", valor: 50000 }),
      conta({ id: "outraUn1", unitCode: "B-2", valor: 100 }),
      conta({ id: "outraUn2", unitCode: "B-2", valor: 900 }),
    ]);
    expect(r.map((x) => [x.id, x.padrao, Math.round(x.desvio * 100)])).toEqual([
      ["p4", 1000, 50],
      ["p5", 1000, -30],
    ]);
  });
});

describe("Assistente de Contas a Receber — proposta de conciliação (Prompt K, 8.2)", () => {
  const entradas = [
    { id: "m1", projectId: "obra", data: "09/16/2026", descricao: "PIX RECEBIDO MARIA SOUZA", valor: 1000, disponivel: 1000 },
    { id: "m2", projectId: "obra", data: "09/16/2026", descricao: "TED RECEBIDA", valor: 1000, disponivel: 1000 },
    { id: "m3", projectId: "obra", data: "05/01/2026", descricao: "DEPOSITO", valor: 2000, disponivel: 600 },
    { id: "m4", projectId: "outra-obra", data: "09/16/2026", descricao: "PIX MARIA SOUZA", valor: 1000, disponivel: 1000 },
    { id: "m5", projectId: "obra", data: "09/16/2026", descricao: "x", valor: 50, disponivel: 0 },
  ];

  it("exige valor igual ao livre (até R$ 0,05) e mesma obra; data e cliente só aumentam a confiança; cada lado entra uma vez", () => {
    const r = proporConciliacoes(
      [
        conta({ id: "a", valor: 1000 }),
        conta({ id: "b", valor: 1000, clienteNome: "João Pedro" }),
        conta({ id: "c", valor: 1000, recebimentos: [{ valor: 400, data: "09/01/2026", cashEntryId: null, estornado: false }] }), // saldo 600
        conta({ id: "d", valor: 50 }), // m5 sem valor livre
        conta({ id: "quitada", valor: 1000, recebimentos: [{ valor: 1000, data: "09/01/2026", cashEntryId: "z", estornado: false }] }),
      ],
      entradas,
    );
    expect(r.map((p) => [p.contaId, p.cashEntryId, p.valor, p.pontos, p.motivos.join("; ")])).toEqual([
      ["a", "m1", 1000, 3, "mesmo valor; 1 dia do vencimento; nome do cliente no extrato"],
      ["b", "m2", 1000, 2, "mesmo valor; 1 dia do vencimento"],
      ["c", "m3", 600, 1, "mesmo valor"],
    ]);
  });

  it("tolerância de centavos: R$ 323,97 livre casa com conta de R$ 324,00", () => {
    const r = proporConciliacoes([conta({ id: "a", valor: 324 })], [{ id: "m", projectId: "obra", data: null, descricao: null, valor: 323.97, disponivel: 323.97 }]);
    expect(r).toHaveLength(1);
    expect(r[0].valor).toBe(324);
  });

  it("analisarContasReceber junta tudo", () => {
    const a = analisarContasReceber([conta({ id: "a", vencimento: "01/01/2026" })], [], HOJE);
    expect(a.total).toBe(1);
    expect(a.vencidas).toHaveLength(1);
    expect(a.propostas).toEqual([]);
  });
});
