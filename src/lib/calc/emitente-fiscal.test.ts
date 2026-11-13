import { describe, it, expect } from "vitest";
import {
  aliquotaIssValida,
  checarProntidaoFiscal,
  cepValido,
  cnpjValido,
  codigoMunicipioValido,
  emitentePronto,
  formatarCnpj,
  normalizarCnpj,
  ufValida,
  type EmitenteFiscal,
} from "./emitente-fiscal";

/**
 * `11.222.333/0001-81` é o CNPJ numérico usado como exemplo em toda a
 * literatura de validação. `12.ABC.345/01DE-35` é o exemplo ALFANUMÉRICO
 * publicado pela Receita junto da IN RFB 2.229/2024 — os dois passam pelo mesmo
 * cálculo de dígito, que é exatamente o ponto da mudança.
 */
const CNPJ_OK = "11222333000181";
const CNPJ_ALFA_OK = "12ABC34501DE35";

describe("cnpjValido", () => {
  it("aceita CNPJ numérico com dígitos corretos", () => {
    expect(cnpjValido(CNPJ_OK)).toBe(true);
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
  });

  it("aceita CNPJ alfanumérico (IN RFB 2.229/2024)", () => {
    expect(cnpjValido(CNPJ_ALFA_OK)).toBe(true);
    expect(cnpjValido("12.abc.345/01de-35")).toBe(true);
  });

  it("recusa dígito verificador errado", () => {
    expect(cnpjValido("11222333000182")).toBe(false);
    expect(cnpjValido("12ABC34501DE36")).toBe(false);
  });

  it("recusa tamanho diferente de 14", () => {
    expect(cnpjValido("1122233300018")).toBe(false);
    expect(cnpjValido("112223330001811")).toBe(false);
  });

  it("recusa vazio e sequência repetida", () => {
    expect(cnpjValido(null)).toBe(false);
    expect(cnpjValido("")).toBe(false);
    expect(cnpjValido("00000000000000")).toBe(false);
    expect(cnpjValido("11111111111111")).toBe(false);
  });

  it("recusa letra na posição dos dígitos verificadores", () => {
    expect(cnpjValido("12ABC34501DEA5")).toBe(false);
  });
});

describe("normalizarCnpj / formatarCnpj", () => {
  it("tira máscara e sobe para maiúsculas", () => {
    expect(normalizarCnpj("12.abc.345/01de-35")).toBe(CNPJ_ALFA_OK);
    expect(normalizarCnpj("   ")).toBe(null);
  });

  it("aplica a máscara para exibição", () => {
    expect(formatarCnpj(CNPJ_OK)).toBe("11.222.333/0001-81");
    expect(formatarCnpj(CNPJ_ALFA_OK)).toBe("12.ABC.345/01DE-35");
  });

  it("devolve o valor cru quando não dá para formatar", () => {
    expect(formatarCnpj("123")).toBe("123");
  });
});

describe("campos de endereço", () => {
  it("CEP exige 8 dígitos", () => {
    expect(cepValido("13010-000")).toBe(true);
    expect(cepValido("13010000")).toBe(true);
    expect(cepValido("1301000")).toBe(false);
    expect(cepValido(null)).toBe(false);
  });

  it("código IBGE exige 7 dígitos", () => {
    expect(codigoMunicipioValido("3509502")).toBe(true);
    expect(codigoMunicipioValido("355250")).toBe(false);
    expect(codigoMunicipioValido("SP")).toBe(false);
  });

  it("UF confere contra a lista das 27", () => {
    expect(ufValida("SP")).toBe(true);
    expect(ufValida("sp")).toBe(true);
    expect(ufValida("XX")).toBe(false);
  });
});

describe("aliquotaIssValida", () => {
  it("aceita de 0 a 5%", () => {
    expect(aliquotaIssValida(0)).toBe(true);
    expect(aliquotaIssValida(2)).toBe(true);
    expect(aliquotaIssValida(5)).toBe(true);
  });

  it("recusa acima do teto constitucional e valor ausente", () => {
    expect(aliquotaIssValida(5.01)).toBe(false);
    expect(aliquotaIssValida(-1)).toBe(false);
    expect(aliquotaIssValida(null)).toBe(false);
  });
});

const COMPLETO: EmitenteFiscal = {
  razaoSocial: "Construtora Exemplo Ltda",
  cnpj: CNPJ_OK,
  inscricaoMunicipal: "123456",
  regimeTributario: "LUCRO_PRESUMIDO",
  itemListaServico: "7.02",
  aliquotaIss: 3,
  codigoTributarioMunicipio: "070201",
  codigoMunicipio: "3509502",
  municipio: "Suarão",
  uf: "SP",
  logradouro: "Av. Brasil",
  numero: "1000",
  bairro: "Centro",
  cep: "13010000",
  cnae: "4120400",
  email: "fiscal@exemplo.com.br",
};

describe("checarProntidaoFiscal", () => {
  it("cadastro completo não tem pendência", () => {
    expect(checarProntidaoFiscal(COMPLETO)).toEqual([]);
    expect(emitentePronto(COMPLETO)).toBe(true);
  });

  it("cadastro vazio acusa todos os bloqueios de uma vez", () => {
    const p = checarProntidaoFiscal({});
    const campos = p.filter((x) => x.severidade === "bloqueio").map((x) => x.campo);
    expect(campos).toEqual(
      expect.arrayContaining([
        "razaoSocial",
        "cnpj",
        "inscricaoMunicipal",
        "regimeTributario",
        "itemListaServico",
        "aliquotaIss",
        "codigoMunicipio",
        "endereco",
        "cep",
        "uf",
      ]),
    );
    expect(emitentePronto({})).toBe(false);
  });

  it("CNPJ com dígito errado bloqueia mesmo estando preenchido", () => {
    const p = checarProntidaoFiscal({ ...COMPLETO, cnpj: "11222333000182" });
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ campo: "cnpj", severidade: "bloqueio" });
  });

  it("CNAE e e-mail em branco são aviso, não bloqueio", () => {
    const p = checarProntidaoFiscal({ ...COMPLETO, cnae: null, email: null });
    expect(p.map((x) => x.campo).sort()).toEqual(["cnae", "email"]);
    expect(p.every((x) => x.severidade === "aviso")).toBe(true);
    expect(emitentePronto({ ...COMPLETO, cnae: null, email: null })).toBe(true);
  });

  it("alíquota abaixo do piso de 2% vira aviso fora do Simples", () => {
    const p = checarProntidaoFiscal({ ...COMPLETO, aliquotaIss: 1 });
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ campo: "aliquotaIss", severidade: "aviso" });
  });

  it("no Simples Nacional a alíquota baixa não gera aviso", () => {
    const p = checarProntidaoFiscal({
      ...COMPLETO,
      regimeTributario: "SIMPLES",
      aliquotaIss: 1,
    });
    expect(p).toEqual([]);
  });
});
