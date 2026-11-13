import { describe, it, expect } from "vitest";
import {
  aditivoEficaz,
  aditivoPendenteDeEficacia,
  consolidarGuardaChuva,
  evolucaoDoContrato,
  lerNumero,
  limitesDosItens,
  recusaDeComprometimento,
  recusaDeLimite,
  recusaTransicaoAditivo,
  recusaTransicaoContrato,
  recusaTransicaoMedicao,
  recusaTransicaoReembolso,
  saldoDoContrato,
  valorDaMedicao,
  valorDoContrato,
  venceEm,
  codigoDoAditivo,
  MODALIDADES_INICIAIS,
} from "./contrato-regras";

const HOJE = "06/15/2027";
const ad = (numero: number, valorDelta: number, status = "assinado", extra: Record<string, string | null> = {}) => ({
  id: `a${numero}`,
  numero,
  valorDelta,
  status,
  inicioVigencia: null,
  dataAssinatura: "01/10/2027",
  novoTermino: null,
  ...extra,
});

describe("Contratos — aditivos e valor atualizado (§6.3)", () => {
  it("exemplo do prompt: 500 mil + 80 + 35 − 15 = 600 mil, sem reescrever o original", () => {
    const contrato = { valorOriginal: "500000.00", dataTerminoPrevista: "12/31/2027" };
    const aditivos = [ad(1, 80000), ad(2, 35000), ad(3, -15000)];
    const v = valorDoContrato(contrato, aditivos, HOJE);
    expect(v).toMatchObject({ original: 500000, acrescimos: 115000, reducoes: 15000, atualizado: 600000, pendente: 0 });
    expect(contrato.valorOriginal).toBe("500000.00");
    expect(evolucaoDoContrato(contrato, aditivos, HOJE).map((e) => [e.evento, e.variacao, e.acumulado])).toEqual([
      ["Contrato original", 500000, 500000],
      ["Aditivo 01", 80000, 580000],
      ["Aditivo 02", 35000, 615000],
      ["Aditivo 03", -15000, 600000],
    ]);
  });

  it("só aditivo assinado e com vigência iniciada é eficaz; aprovado ou vigência futura fica pendente", () => {
    expect(aditivoEficaz(ad(1, 10, "aprovado"), HOJE)).toBe(false);
    expect(aditivoPendenteDeEficacia(ad(1, 10, "aprovado"), HOJE)).toBe(true);
    expect(aditivoEficaz(ad(1, 10, "assinado", { inicioVigencia: "07/01/2027" }), HOJE)).toBe(false);
    expect(aditivoEficaz(ad(1, 10, "assinado", { inicioVigencia: "06/15/2027" }), HOJE)).toBe(true);
    for (const s of ["rascunho", "negociacao", "aguardando_aprovacao", "rejeitado", "cancelado"]) expect(aditivoEficaz(ad(1, 10, s), HOJE), s).toBe(false);
    const v = valorDoContrato({ valorOriginal: 100 }, [ad(1, 50, "aprovado"), ad(2, 20, "assinado", { inicioVigencia: "12/01/2027" }), ad(3, 7, "rascunho")], HOJE);
    expect(v).toMatchObject({ atualizado: 100, pendente: 70, aditivosPendentes: 2 });
  });

  it("prorrogação: o término atualizado é o do último aditivo eficaz", () => {
    const v = valorDoContrato({ valorOriginal: 1, dataTerminoPrevista: "12/31/2027" }, [ad(1, 0, "assinado", { novoTermino: "06/30/2028" }), ad(2, 0, "aprovado", { novoTermino: "12/31/2028" })], HOJE);
    expect(v.terminoAtualizado).toBe("06/30/2028");
  });

  it("aditivo formalizado não volta nem se edita: só cancelamento, e só por quem aprova", () => {
    expect(recusaTransicaoAditivo("assinado", "rascunho", true)).toMatch(/não passa/);
    expect(recusaTransicaoAditivo("assinado", "cancelado", false)).toMatch(/Só quem aprova/);
    expect(recusaTransicaoAditivo("assinado", "cancelado", true)).toBeNull();
    expect(recusaTransicaoAditivo("aguardando_aprovacao", "aprovado", false)).toMatch(/Só quem aprova/);
    expect(recusaTransicaoAditivo("aguardando_aprovacao", "aprovado", true)).toBeNull();
    expect(recusaTransicaoAditivo("rascunho", "assinado", true)).toMatch(/não passa/);
    expect(recusaTransicaoAditivo("rejeitado", "rascunho", true)).toMatch(/não passa/);
  });

  it("código do aditivo", () => expect(codigoDoAditivo("CT-000012", 3)).toBe("CT-000012-AD03"));
});

describe("Contratos — saldo (§7)", () => {
  it("exemplo do prompt: 600 mil, medido 350, faturado 300, recebido 250", () => {
    const s = saldoDoContrato({
      contrato: { valorOriginal: 500000 },
      aditivos: [ad(1, 100000)],
      medicoes: [
        { id: "m1", itemId: null, valor: 200000, status: "aprovada" },
        { id: "m2", itemId: null, valor: 150000, status: "aprovada" },
        { id: "m3", itemId: null, valor: 40000, status: "enviada" },
        { id: "m4", itemId: null, valor: 99999, status: "rejeitada" },
        { id: "m5", itemId: null, valor: 88888, status: "cancelada" },
      ],
      faturas: [
        { valor: 200000, cancelado: false, recebido: 200000 },
        { valor: 100000, cancelado: false, recebido: 50000 },
        { valor: 70000, cancelado: true, recebido: 0 },
      ],
      hoje: HOJE,
    });
    expect(s).toMatchObject({ atualizado: 600000, medidoAprovado: 350000, medidoEmAprovacao: 40000, faturado: 300000, recebido: 250000, saldoAMedir: 250000, medidoNaoFaturado: 50000, faturadoNaoRecebido: 50000 });
    expect(s.pctMedido).toBeCloseTo(58.33, 2);
  });

  it("retenção é informativa, sobre o faturado; centavos não acumulam erro", () => {
    const s = saldoDoContrato({ contrato: { valorOriginal: "0.30", retencaoPct: "5" }, aditivos: [], medicoes: [0.1, 0.1, 0.1].map((v, i) => ({ id: String(i), itemId: null, valor: v, status: "aprovada" })), faturas: [{ valor: 1000, cancelado: false, recebido: 0 }], hoje: HOJE });
    expect(s.saldoAMedir).toBe(0);
    expect(s.retido).toBe(50);
  });
});

describe("Contratos — itens e limite de medição (§5, §8.2)", () => {
  const itens = [
    { id: "i1", valorTotal: 40000, quantidade: 1 },
    { id: "i2", valorTotal: 120000, quantidade: 12, valorUnitario: 10000 },
    { id: "i3", valorTotal: 30000, origemAditivoId: "a2" },
    { id: "i4", valorTotal: 9999, cancelado: true },
  ];
  const aditivos = [ad(1, 20000), ad(2, 30000, "aprovado")];
  const variacoes = [{ aditivoId: "a1", itemId: "i2", deltaValor: 20000, deltaQuantidade: 2 }];

  it("limite do item = original + variações eficazes; item de aditivo sem eficácia não vale; cancelado é zero", () => {
    const l = limitesDosItens(itens, variacoes, aditivos, HOJE);
    expect(l.get("i1")).toEqual({ limite: 40000, quantidade: 1, vigente: true });
    expect(l.get("i2")).toEqual({ limite: 140000, quantidade: 14, vigente: true });
    expect(l.get("i3")).toEqual({ limite: 0, quantidade: 0, vigente: false });
    expect(l.get("i4")?.vigente).toBe(false);
    const depois = limitesDosItens(itens, variacoes, [ad(1, 20000), ad(2, 30000, "assinado")], HOJE);
    expect(depois.get("i3")).toMatchObject({ limite: 30000, vigente: true });
  });

  it("medições parciais até o limite; acima é recusada; após aditivo eficaz, passa", () => {
    const antes = limitesDosItens(itens, variacoes, [ad(2, 30000, "aprovado")], HOJE);
    const medicoes = [{ id: "m1", itemId: "i2", valor: 100000, status: "aprovada" }];
    expect(recusaDeLimite({ id: "n", itemId: "i2", valor: 20000 }, medicoes, 500000, antes)).toBeNull();
    expect(recusaDeLimite({ id: "n", itemId: "i2", valor: 20000.01 }, medicoes, 500000, antes)).toMatch(/limite do item/);
    const comAditivo = limitesDosItens(itens, variacoes, aditivos, HOJE);
    expect(recusaDeLimite({ id: "n", itemId: "i2", valor: 40000 }, medicoes, 500000, comAditivo)).toBeNull();
    expect(recusaDeLimite({ id: "n", itemId: "i3", valor: 1 }, [], 500000, comAditivo)).toMatch(/não está vigente/);
    expect(recusaDeLimite({ id: "n", itemId: null, valor: 400001 }, medicoes, 500000, comAditivo)).toMatch(/valor atualizado do contrato/);
    // a própria medição (re-aprovação) não conta duas vezes
    expect(recusaDeLimite({ id: "m1", itemId: "i2", valor: 100000 }, medicoes, 100000, antes)).toBeNull();
  });

  it("valor pelo critério do item", () => {
    expect(valorDaMedicao("quantidade", { quantidade: 3 }, { valorUnitario: 10000, limite: 120000 })).toEqual({ valor: 30000 });
    expect(valorDaMedicao("percentual", { percentual: 12.5 }, { limite: 210000 })).toEqual({ valor: 26250 });
    expect(valorDaMedicao("percentual", { percentual: 120 }, { limite: 1 })).toHaveProperty("erro");
    expect(valorDaMedicao("entrega", { valorInformado: 80000 }, { limite: 80000 })).toEqual({ valor: 80000 });
    expect(valorDaMedicao("marco", {}, { limite: 80000 })).toHaveProperty("erro");
  });
});

describe("Contratos — guarda-chuva (§3.2)", () => {
  const saldo = (valor: number, medido = 0) => saldoDoContrato({ contrato: { valorOriginal: valor }, aditivos: [], medicoes: medido ? [{ id: "x", itemId: null, valor: medido, status: "aprovada" }] : [], faturas: [], hoje: HOJE });

  it("exemplo do prompt: 2 milhões, 650 + 480 + 370 consumidos, 500 mil livres; sem dupla contagem", () => {
    const filhos = [650000, 480000, 370000].map((v) => ({ valorAtualizado: v }));
    const principal = saldoDoContrato({ contrato: { valorOriginal: 2000000 }, aditivos: [], medicoes: [], faturas: [], derivadosQueConsomem: filhos, hoje: HOJE });
    expect(principal.comprometido).toBe(1500000);
    expect(principal.saldoNaoComprometido).toBe(500000);
    const c = consolidarGuardaChuva(principal, [
      { vinculo: "consome_limite", saldo: saldo(650000, 100000) },
      { vinculo: "consome_limite", saldo: saldo(480000) },
      { vinculo: "consome_limite", saldo: saldo(370000) },
    ]);
    expect(c.valorTotal).toBe(2000000);
    expect(c.medido).toBe(100000);
    const comAdicional = consolidarGuardaChuva(principal, [{ vinculo: "adicional", saldo: saldo(300000) }]);
    expect(comAdicional.valorTotal).toBe(2300000);
  });

  it("derivado que consome não passa do saldo livre do principal", () => {
    expect(recusaDeComprometimento(2000000, 1500000, 500000)).toBeNull();
    expect(recusaDeComprometimento(2000000, 1500000, 500000.01)).toMatch(/saldo do contrato principal/);
  });
});

describe("Contratos — transições e utilidades", () => {
  it("contrato: encerrado e cancelado são finais", () => {
    expect(recusaTransicaoContrato("rascunho", "ativo")).toBeNull();
    expect(recusaTransicaoContrato("encerrado", "ativo")).toMatch(/não passa/);
    expect(recusaTransicaoContrato("cancelado", "rascunho")).toMatch(/não passa/);
    expect(recusaTransicaoContrato("x", "ativo")).toBe("Situação inválida.");
  });
  it("medição: aprovar e rejeitar exigem aprovador; aprovada só sai por cancelamento", () => {
    expect(recusaTransicaoMedicao("enviada", "aprovada", false)).toMatch(/Só quem aprova/);
    expect(recusaTransicaoMedicao("enviada", "aprovada", true)).toBeNull();
    expect(recusaTransicaoMedicao("aprovada", "rascunho", true)).toMatch(/não passa/);
    expect(recusaTransicaoMedicao("rascunho", "aprovada", true)).toMatch(/não passa/);
  });
  it("reembolso segue a ordem pendente → solicitado → aprovado → faturado → recebido", () => {
    expect(recusaTransicaoReembolso("pendente", "solicitado")).toBeNull();
    expect(recusaTransicaoReembolso("pendente", "recebido")).toMatch(/não passa/);
    expect(recusaTransicaoReembolso("faturado", "recebido")).toBeNull();
  });
  it("lê números em pt-BR e normalizados", () => {
    expect(lerNumero("1.234,56")).toBe(1234.56);
    expect(lerNumero("R$ 80.000,00")).toBe(80000);
    expect(lerNumero("1234.5")).toBe(1234.5);
    expect(lerNumero("12,5")).toBe(12.5);
    expect(lerNumero("abc")).toBeNull();
    expect(lerNumero("")).toBeNull();
  });
  it("vencimento nos próximos dias", () => {
    expect(venceEm("07/10/2027", HOJE, 30)).toBe(true);
    expect(venceEm("08/20/2027", HOJE, 30)).toBe(false);
    expect(venceEm("06/01/2027", HOJE, 30)).toBe(false);
  });
  it("13 modalidades iniciais", () => expect(MODALIDADES_INICIAIS).toHaveLength(13));
});
