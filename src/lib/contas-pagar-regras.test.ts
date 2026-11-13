import { describe, it, expect } from "vitest";
import { ehVersaoAtual, filtrarContasPagar, linhasPorObrigacao, pendenteDaConta, totalPendente } from "./contas-pagar-regras";

describe("pendente de Contas a Pagar (Prompt I, §15)", () => {
  it("despesa de 100 com 80 pagos deve 20", () => {
    expect(pendenteDaConta({ status: "Parcialmente paga", valor: 100, saldo: 20 })).toBe(20);
  });
  it("paga: zero, mesmo com saldo residual de centavos", () => {
    expect(pendenteDaConta({ status: "Pago", valor: 100, saldo: 0.004 })).toBe(0);
  });
  it("sem saldo informado: valor cheio (linha antiga); saldo negativo não existe", () => {
    expect(pendenteDaConta({ status: "A pagar", valor: 100 })).toBe(100);
    expect(pendenteDaConta({ status: "A pagar", valor: 100, saldo: -5 })).toBe(0);
  });
  it("total em centavos exatos", () => {
    expect(
      totalPendente([
        { status: "A pagar", valor: 0.1, saldo: 0.1 },
        { status: "A pagar", valor: 0.2, saldo: 0.2 },
        { status: "Pago", valor: 50, saldo: 0 },
      ]),
    ).toBe(0.3);
  });
  it("§10 — só a Atual é obrigação", () => {
    expect(ehVersaoAtual("atual")).toBe(true);
    expect(ehVersaoAtual("forecast")).toBe(false);
    expect(ehVersaoAtual(null)).toBe(false);
  });
});

const conta = (x: Partial<{ id: string; origem: string; valor: number; saldo: number; status: string | null; vencimento: string | null; dataPagamento: string | null; descricao: string | null }> & { id: string }) => ({
  valor: 1200,
  saldo: 1200,
  status: "A pagar" as string | null,
  vencimento: "01/10/2026" as string | null,
  dataPagamento: null as string | null,
  descricao: "x" as string | null,
  ...x,
});
const parcela = (despesaId: string, numero: number, x: Partial<{ vencimento: string; valorOriginal: number; valorPago: number; status: string; dataPagamento: string | null; chequeNumero: string | null; bomPara: string | null }> = {}) => ({
  despesaId,
  numero,
  vencimento: `0${numero}/15/2026`,
  valorOriginal: 100,
  valorPago: 0,
  status: "Pendente",
  dataPagamento: null,
  chequeNumero: null,
  bomPara: null,
  ...x,
});

describe("linhasPorObrigacao (Prompt R, 1.2/1.3/1.5)", () => {
  it("1 — despesa parcelada vira uma linha por parcela, com nº, vencimento e saldo", () => {
    const linhas = linhasPorObrigacao([conta({ id: "d1" })], [parcela("d1", 1), parcela("d1", 2, { valorPago: 40 }), parcela("d1", 3)]);
    expect(linhas).toHaveLength(3);
    expect(linhas.map((l) => [l.id, l.parcela?.numero, l.parcela?.total, l.vencimento, l.saldo])).toEqual([
      ["d1#1", 1, 3, "01/15/2026", 100],
      ["d1#2", 2, 3, "02/15/2026", 60],
      ["d1#3", 3, 3, "03/15/2026", 100],
    ]);
    expect(linhas.every((l) => l.despesaId === "d1")).toBe(true);
    expect(totalPendente(linhas)).toBe(260); // 4 — saldo, não valor cheio
  });
  it("2 — despesa sem parcelamento continua uma linha, como hoje; obrigação com terceiro idem (1.5)", () => {
    const linhas = linhasPorObrigacao([conta({ id: "d2" }), conta({ id: "o1", origem: "obrigacao" })], [parcela("o1", 1)]);
    expect(linhas.map((l) => l.id)).toEqual(["d2", "o1"]);
    expect(linhas[0].parcela).toBeUndefined();
  });
  it("3 — cheque por parcela (número e bom para) acompanha a linha", () => {
    const [l] = linhasPorObrigacao([conta({ id: "d3" })], [parcela("d3", 1, { chequeNumero: "000123", bomPara: "02/01/2026" })]);
    expect(l.parcela).toEqual({ numero: 1, total: 1, chequeNumero: "000123", bomPara: "02/01/2026" });
  });
  it("parcela quitada entra como 'Pago' com saldo zero; parcialmente paga como 'Parcialmente paga'", () => {
    const linhas = linhasPorObrigacao([conta({ id: "d4" })], [parcela("d4", 1, { status: "Pago", valorPago: 100, dataPagamento: "01/10/2026" }), parcela("d4", 2, { status: "Pago parcialmente", valorPago: 30 })]);
    expect(linhas[0].status).toBe("Pago");
    expect(linhas[0].dataPagamento).toBe("01/10/2026");
    expect(pendenteDaConta(linhas[0])).toBe(0);
    expect(linhas[1].status).toBe("Parcialmente paga");
    expect(pendenteDaConta(linhas[1])).toBe(70);
  });
});

describe("filtrarContasPagar (Prompt R, seção 5)", () => {
  type Linha = { id: string; fornecedorNome: string | null; clienteNome: string | null; projectId: string; categoriaDre: string | null; vencimento: string | null; st: string };
  const rows: Linha[] = [
    { id: "1", fornecedorNome: "A", clienteNome: null, projectId: "X", categoriaDre: "Custo Fixo", vencimento: "01/10/2026", st: "Vencida" },
    { id: "2", fornecedorNome: "B", clienteNome: "Cli", projectId: "X", categoriaDre: "Custo Fixo", vencimento: "03/10/2026", st: "Em aberto" },
    { id: "3", fornecedorNome: "A", clienteNome: null, projectId: "Y", categoriaDre: "Despesa Fixa", vencimento: "05/10/2026", st: "Pago" },
  ];
  const iso = (v: string | null) => (v ? `${v.slice(6)}-${v.slice(0, 2)}-${v.slice(3, 5)}` : "");
  const f = (x: Partial<Parameters<typeof filtrarContasPagar>[1]>) => ({ fornecedores: [], clientes: [], projetos: [], categorias: [], status: [], ...x });
  it("12 — dois fornecedores marcados listam os dois", () => {
    expect(filtrarContasPagar(rows, f({ fornecedores: ["A", "B"] }), (r: Linha) => r.st, iso).map((r) => r.id)).toEqual(["1", "2", "3"]);
  });
  it("13 — fornecedor A ou B E projeto X: interseção, não união", () => {
    expect(filtrarContasPagar(rows, f({ fornecedores: ["A", "B"], projetos: ["X"] }), (r: Linha) => r.st, iso).map((r) => r.id)).toEqual(["1", "2"]);
  });
  it("14 — nenhum marcado equivale a todos; status usa o exibido; cliente nulo é 'Projeto próprio (sem cliente)'; datas são intervalo", () => {
    expect(filtrarContasPagar(rows, f({}), (r: Linha) => r.st, iso)).toHaveLength(3);
    expect(filtrarContasPagar(rows, f({ status: ["Vencida"] }), (r: Linha) => r.st, iso).map((r) => r.id)).toEqual(["1"]);
    expect(filtrarContasPagar(rows, f({ clientes: ["Projeto próprio (sem cliente)"] }), (r: Linha) => r.st, iso).map((r) => r.id)).toEqual(["1", "3"]);
    expect(filtrarContasPagar(rows, f({ de: "2026-02-01", ate: "2026-04-01" }), (r: Linha) => r.st, iso).map((r) => r.id)).toEqual(["2"]);
  });
});
