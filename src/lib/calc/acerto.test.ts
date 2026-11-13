import { describe, it, expect } from "vitest";
import {
  abaterFifo,
  abaterManual,
  acertoFecha,
  calcularAging,
  calcularDiferenca,
  calcularRateio,
  impactoNoCustoDaObra,
  ordemFifo,
  rateioFecha,
  validarRateio,
} from "./acerto";

const item = (id: string, competencia: string | null, saldo: number, numDoc = id) => ({
  id,
  competencia,
  numDoc,
  saldo,
});

describe("ordem do FIFO", () => {
  it("competência mais antiga primeiro", () => {
    const itens = [item("c", "03/2026", 100), item("a", "01/2026", 100), item("b", "02/2026", 100)];
    expect(ordemFifo(itens).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("dentro da mesma competência, desempata pelo nº do documento", () => {
    const itens = [
      item("x", "01/2026", 100, "PED-000010"),
      item("y", "01/2026", 100, "PED-000002"),
    ];
    expect(ordemFifo(itens).map((i) => i.id)).toEqual(["y", "x"]);
  });

  it("sem competência vai para o fim da fila", () => {
    const itens = [item("sem", null, 100), item("com", "12/2026", 100)];
    expect(ordemFifo(itens).map((i) => i.id)).toEqual(["com", "sem"]);
  });

  it("não altera o array recebido", () => {
    const itens = [item("b", "02/2026", 100), item("a", "01/2026", 100)];
    ordemFifo(itens);
    expect(itens.map((i) => i.id)).toEqual(["b", "a"]);
  });
});

describe("abatimento FIFO — CA-20", () => {
  it("R$ 5.000 contra 4 PEDs (2.000/1.500/1.000/1.200) quita 3 e abate 500 do 4º", () => {
    const itens = [
      item("p1", "01/2026", 2000),
      item("p2", "02/2026", 1500),
      item("p3", "03/2026", 1000),
      item("p4", "04/2026", 1200),
    ];
    const r = abaterFifo(5000, itens);
    expect(r.abatimentos).toEqual([
      { id: "p1", valorAbatido: 2000, saldoRestante: 0, quitado: true },
      { id: "p2", valorAbatido: 1500, saldoRestante: 0, quitado: true },
      { id: "p3", valorAbatido: 1000, saldoRestante: 0, quitado: true },
      { id: "p4", valorAbatido: 500, saldoRestante: 700, quitado: false },
    ]);
    expect(r.totalAbatido).toBe(5000);
    expect(r.sobra).toBe(0);
  });

  it("valor maior que a dívida devolve a sobra em vez de forçá-la num item", () => {
    const r = abaterFifo(3000, [item("p1", "01/2026", 1000)]);
    expect(r.totalAbatido).toBe(1000);
    expect(r.sobra).toBe(2000);
  });

  it("itens sem saldo são ignorados", () => {
    const r = abaterFifo(500, [item("quitado", "01/2026", 0), item("aberto", "02/2026", 500)]);
    expect(r.abatimentos.map((a) => a.id)).toEqual(["aberto"]);
  });

  it("valor zero não abate nada", () => {
    expect(abaterFifo(0, [item("p1", "01/2026", 1000)]).abatimentos).toEqual([]);
  });

  it("respeita centavos sem acumular erro", () => {
    const itens = [item("p1", "01/2026", 33.33), item("p2", "02/2026", 33.33)];
    const r = abaterFifo(66.66, itens);
    expect(r.totalAbatido).toBe(66.66);
    expect(r.sobra).toBe(0);
  });
});

describe("abatimento manual", () => {
  it("respeita a escolha do usuário", () => {
    const itens = [item("p1", "01/2026", 2000), item("p2", "02/2026", 1500)];
    const r = abaterManual([{ id: "p2", valor: 1500 }], itens);
    expect(r.abatimentos).toEqual([
      { id: "p2", valorAbatido: 1500, saldoRestante: 0, quitado: true },
    ]);
  });

  it("nunca abate mais do que o saldo do item", () => {
    const r = abaterManual([{ id: "p1", valor: 9999 }], [item("p1", "01/2026", 2000)]);
    expect(r.abatimentos[0].valorAbatido).toBe(2000);
  });

  it("ignora item inexistente e valor não positivo", () => {
    const itens = [item("p1", "01/2026", 2000)];
    expect(abaterManual([{ id: "xxx", valor: 100 }], itens).abatimentos).toEqual([]);
    expect(abaterManual([{ id: "p1", valor: 0 }], itens).abatimentos).toEqual([]);
  });
});

describe("diferença do acerto — CA-24 / RG-07", () => {
  it("caso Casarão: 67.000 vinculados, 70.000 transferidos → 3.000 de juros", () => {
    const d = calcularDiferenca(70000, 67000);
    expect(d).toEqual({ valor: 3000, tipo: "JUROS" });
  });

  it("pagou menos → desconto obtido (receita financeira)", () => {
    expect(calcularDiferenca(65000, 67000)).toEqual({ valor: 2000, tipo: "DESCONTO" });
  });

  it("fechou na vírgula → sem diferença", () => {
    expect(calcularDiferenca(67000, 67000)).toEqual({ valor: 0, tipo: "NENHUMA" });
  });

  it("1 centavo é arredondamento, não diferença", () => {
    expect(calcularDiferenca(67000.01, 67000).tipo).toBe("NENHUMA");
  });

  it("a diferença NUNCA entra no custo da obra", () => {
    // Juros de mora são perda operacional do período. O CPC 20 só autoriza
    // capitalizar encargos de financiamento atribuíveis à construção.
    expect(impactoNoCustoDaObra()).toBe(0);
  });

  it("RG-08 — vinculado + diferença = valor transferido", () => {
    expect(acertoFecha(70000, 67000, calcularDiferenca(70000, 67000))).toBe(true);
    expect(acertoFecha(65000, 67000, calcularDiferenca(65000, 67000))).toBe(true);
    expect(acertoFecha(70000, 67000, { valor: 500, tipo: "JUROS" })).toBe(false);
  });
});

describe("rateio entre obras — CA-26 / CA-27", () => {
  it("R$ 12.000 em 50/30/20 gera 6.000 / 3.600 / 2.400", () => {
    const r = calcularRateio(12000, [
      { projectId: "obra5", percentual: 50 },
      { projectId: "obra26", percentual: 30 },
      { projectId: "obra28", percentual: 20 },
    ]);
    expect(r.map((x) => x.valor)).toEqual([6000, 3600, 2400]);
    expect(rateioFecha(12000, r)).toBe(true);
  });

  it("percentual com dízima fecha exatamente, com a sobra na última obra", () => {
    const r = calcularRateio(1000, [
      { projectId: "a", percentual: 33.33 },
      { projectId: "b", percentual: 33.33 },
      { projectId: "c", percentual: 33.34 },
    ]);
    expect(r.reduce((a, x) => a + x.valor, 0)).toBe(1000);
  });

  it("rateio por valor calcula o percentual de cada obra", () => {
    const r = calcularRateio(1000, [
      { projectId: "a", valor: 250 },
      { projectId: "b", valor: 750 },
    ]);
    expect(r.map((x) => x.percentual)).toEqual([25, 75]);
  });

  it("rateio que não fecha é BLOQUEADO com mensagem clara", () => {
    const r = calcularRateio(12000, [
      { projectId: "a", valor: 6000 },
      { projectId: "b", valor: 3000 },
    ]);
    expect(rateioFecha(12000, r)).toBe(false);
    const erro = validarRateio(12000, r);
    expect(erro).toContain("diferença");
    expect(erro).toContain("Ajuste antes de confirmar");
  });

  it("rateio vazio e valor negativo são recusados", () => {
    expect(validarRateio(1000, [])).toContain("ao menos um projeto");
    expect(
      validarRateio(1000, [{ projectId: "a", valor: -100, percentual: -10 }]),
    ).toContain("negativo");
  });

  it("rateio que fecha passa sem mensagem", () => {
    const r = calcularRateio(12000, [
      { projectId: "a", percentual: 50 },
      { projectId: "b", percentual: 50 },
    ]);
    expect(validarRateio(12000, r)).toBeNull();
  });
});

describe("aging do saldo do terceiro", () => {
  it("distribui pelas quatro faixas", () => {
    const f = calcularAging([
      { saldo: 100, diasEmAberto: 10 },
      { saldo: 200, diasEmAberto: 45 },
      { saldo: 300, diasEmAberto: 75 },
      { saldo: 400, diasEmAberto: 200 },
    ]);
    expect(f).toEqual({ ate30: 100, de31a60: 200, de61a90: 300, acima90: 400 });
  });

  it("as bordas caem na faixa de baixo", () => {
    const f = calcularAging([
      { saldo: 10, diasEmAberto: 30 },
      { saldo: 20, diasEmAberto: 60 },
      { saldo: 30, diasEmAberto: 90 },
      { saldo: 40, diasEmAberto: 91 },
    ]);
    expect(f).toEqual({ ate30: 10, de31a60: 20, de61a90: 30, acima90: 40 });
  });

  it("saldo quitado não entra no aging", () => {
    expect(calcularAging([{ saldo: 0, diasEmAberto: 200 }]).acima90).toBe(0);
  });
});
