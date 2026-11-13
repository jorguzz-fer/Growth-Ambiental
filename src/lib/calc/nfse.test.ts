import { describe, it, expect } from "vitest";
import {
  calcularNfse,
  naturezaPorMunicipio,
  validarNfse,
  type EntradaNfse,
} from "./nfse";

const BASE: EntradaNfse = {
  valorServicos: 100_000,
  aliquotaIss: 3,
  issRetido: false,
};

describe("calcularNfse — ISS", () => {
  it("ISS sobre o valor dos serviços quando não há dedução", () => {
    const r = calcularNfse(BASE);
    expect(r.baseCalculo).toBe(100_000);
    expect(r.valorIss).toBe(3_000);
    expect(r.valorIssRetido).toBe(0);
    expect(r.valorLiquido).toBe(100_000);
  });

  it("ISS retido sai do líquido; o valor do ISS continua o mesmo", () => {
    const r = calcularNfse({ ...BASE, issRetido: true });
    expect(r.valorIss).toBe(3_000);
    expect(r.valorIssRetido).toBe(3_000);
    expect(r.totalRetencoes).toBe(3_000);
    expect(r.valorLiquido).toBe(97_000);
  });

  it("dedução de material reduz a base do ISS, não o valor da nota", () => {
    const r = calcularNfse({ ...BASE, valorDeducoes: 40_000, issRetido: true });
    expect(r.baseCalculo).toBe(60_000);
    expect(r.valorIss).toBe(1_800);
    // O tomador paga os R$ 100.000 menos o ISS retido — a dedução é só da base.
    expect(r.valorLiquido).toBe(98_200);
  });

  it("desconto incondicionado reduz base e líquido", () => {
    const r = calcularNfse({ ...BASE, descontoIncondicionado: 10_000 });
    expect(r.baseCalculo).toBe(90_000);
    expect(r.valorIss).toBe(2_700);
    expect(r.valorLiquido).toBe(90_000);
  });

  it("desconto condicionado só aparece no cenário em que se concretiza", () => {
    const r = calcularNfse({ ...BASE, descontoCondicionado: 2_000 });
    expect(r.valorLiquido).toBe(100_000);
    expect(r.valorLiquidoComDescontoCondicionado).toBe(98_000);
  });
});

describe("calcularNfse — retenções federais", () => {
  it("incidem sobre o bruto, não sobre a base do ISS", () => {
    const r = calcularNfse({
      ...BASE,
      valorDeducoes: 40_000,
      retencoes: { ir: { aliquota: 1.5 } },
    });
    expect(r.baseCalculo).toBe(60_000);
    expect(r.retencoes.ir).toBe(1_500); // 1,5% de 100.000
  });

  it("aceita base própria — INSS sobre a parcela de mão de obra", () => {
    const r = calcularNfse({
      ...BASE,
      retencoes: { inss: { aliquota: 11, base: 30_000 } },
    });
    expect(r.retencoes.inss).toBe(3_300);
    expect(r.valorLiquido).toBe(96_700);
  });

  it("soma o pacote PIS/COFINS/CSLL e desconta do líquido junto com o ISS retido", () => {
    const r = calcularNfse({
      ...BASE,
      issRetido: true,
      retencoes: {
        pis: { aliquota: 0.65 },
        cofins: { aliquota: 3 },
        csll: { aliquota: 1 },
      },
    });
    expect(r.retencoes.pis).toBe(650);
    expect(r.retencoes.cofins).toBe(3_000);
    expect(r.retencoes.csll).toBe(1_000);
    expect(r.totalRetencoesFederais).toBe(4_650);
    expect(r.totalRetencoes).toBe(7_650); // 3.000 de ISS + 4.650
    expect(r.valorLiquido).toBe(92_350);
  });

  it("nenhuma retenção é presumida — sem configuração, tudo zero", () => {
    const r = calcularNfse(BASE);
    expect(r.retencoes).toEqual({ pis: 0, cofins: 0, csll: 0, ir: 0, inss: 0 });
    expect(r.totalRetencoesFederais).toBe(0);
  });

  it("outras retenções entram no total e no líquido", () => {
    const r = calcularNfse({ ...BASE, outrasRetencoes: 500 });
    expect(r.totalRetencoes).toBe(500);
    expect(r.valorLiquido).toBe(99_500);
  });
});

describe("calcularNfse — arredondamento", () => {
  it("arredonda cada tributo em 2 casas", () => {
    const r = calcularNfse({
      valorServicos: 3_333.33,
      aliquotaIss: 2.5,
      issRetido: true,
      retencoes: { ir: { aliquota: 1.5 } },
    });
    expect(r.valorIss).toBe(83.33);
    expect(r.retencoes.ir).toBe(50);
    expect(r.valorLiquido).toBe(3_200);
  });

  it("valor negativo em campo auxiliar é tratado como zero", () => {
    const r = calcularNfse({ ...BASE, valorDeducoes: -5_000, outrasRetencoes: -10 });
    expect(r.baseCalculo).toBe(100_000);
    expect(r.outrasRetencoes).toBe(0);
  });
});

describe("validarNfse", () => {
  it("aceita entrada consistente", () => {
    expect(validarNfse(BASE)).toBeNull();
  });

  it("recusa valor zero ou negativo", () => {
    expect(validarNfse({ ...BASE, valorServicos: 0 })).toMatch(/maior que zero/);
    expect(validarNfse({ ...BASE, valorServicos: -1 })).toMatch(/maior que zero/);
  });

  it("recusa alíquota fora de 0–5%", () => {
    expect(validarNfse({ ...BASE, aliquotaIss: 7 })).toMatch(/entre 0 e 5/);
  });

  it("recusa dedução maior que o serviço", () => {
    expect(validarNfse({ ...BASE, valorDeducoes: 120_000 })).toMatch(/não podem superar/);
    expect(
      validarNfse({ ...BASE, valorDeducoes: 60_000, descontoIncondicionado: 50_000 }),
    ).toMatch(/não podem superar/);
  });
});

describe("naturezaPorMunicipio", () => {
  it("mesmo município do prestador → tributação no município", () => {
    expect(naturezaPorMunicipio("3509502", "3509502")).toBe("1");
  });

  it("obra em outro município → tributação fora do município (LC 116 art. 3º III)", () => {
    expect(naturezaPorMunicipio("3509502", "3550308")).toBe("2");
  });

  it("sem o município da obra, não presume operação fora", () => {
    expect(naturezaPorMunicipio("3509502", null)).toBe("1");
    expect(naturezaPorMunicipio(null, "3550308")).toBe("1");
  });
});
