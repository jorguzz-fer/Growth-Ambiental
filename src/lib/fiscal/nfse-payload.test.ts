import { describe, it, expect } from "vitest";
import { montarPayloadNfse, type DadosEmissaoNfse } from "./nfse-payload";
import { refDaNota, refValida } from "./tipos";
import { traduzirStatus } from "./focus";
import type { EmitenteFiscal } from "@/lib/calc/emitente-fiscal";

const EMITENTE: EmitenteFiscal = {
  razaoSocial: "Construtora Exemplo Ltda",
  cnpj: "11222333000181",
  inscricaoMunicipal: "123456",
  regimeTributario: "LUCRO_PRESUMIDO",
  itemListaServico: "7.02",
  aliquotaIss: 3,
  codigoMunicipio: "3509502", // Campinas/SP (sede fictícia)
  uf: "SP",
  logradouro: "Av. Brasil",
  numero: "1000",
  bairro: "Centro",
  cep: "13010-000",
  cnae: "4120400",
  email: "fiscal@exemplo.com.br",
};

const DADOS: DadosEmissaoNfse = {
  emitente: EMITENTE,
  tomador: {
    cnpj: "11222333000181",
    razaoSocial: "Incorporadora Exemplo Ltda",
    endereco: {
      logradouro: "Rua das Flores",
      numero: "123",
      bairro: "Centro",
      codigoMunicipio: "3509502",
      uf: "sp",
      cep: "13010-000",
    },
  },
  servico: {
    discriminacao: "Medição 05/2026 — Projeto Exemplo",
    valores: { valorServicos: 100_000, aliquotaIss: 3, issRetido: false },
  },
  dataEmissao: "2026-08-26T10:30:00-03:00",
};

describe("montarPayloadNfse — estrutura", () => {
  it("monta o payload completo de uma medição", () => {
    const { payload, erros, calculo } = montarPayloadNfse(DADOS);
    expect(erros).toEqual([]);
    expect(payload).toBeDefined();
    expect(payload!.prestador).toEqual({
      cnpj: "11222333000181",
      inscricao_municipal: "123456",
      codigo_municipio: "3509502",
    });
    expect(payload!.servico).toMatchObject({
      valor_servicos: 100_000,
      base_calculo: 100_000,
      aliquota: 3,
      valor_iss: 3_000,
      iss_retido: false,
      item_lista_servico: "7.02",
      codigo_municipio: "3509502",
      discriminacao: "Medição 05/2026 — Projeto Exemplo",
    });
    expect(calculo!.valorLiquido).toBe(100_000);
  });

  it("optante do Simples é derivado do regime, não redigitado", () => {
    const normal = montarPayloadNfse(DADOS).payload!;
    expect(normal.optante_simples_nacional).toBe(false);

    const simples = montarPayloadNfse({
      ...DADOS,
      emitente: { ...EMITENTE, regimeTributario: "SIMPLES" },
    }).payload!;
    expect(simples.optante_simples_nacional).toBe(true);
  });

  it("normaliza documentos e UF do tomador", () => {
    const { payload } = montarPayloadNfse({
      ...DADOS,
      tomador: {
        ...DADOS.tomador,
        cnpj: "11.222.333/0001-81",
        telefone: "(13) 99999-8888",
      },
    });
    const t = payload!.tomador as Record<string, unknown>;
    expect(t.cnpj).toBe("11222333000181");
    expect(t.telefone).toBe("13999998888");
    expect((t.endereco as Record<string, unknown>).uf).toBe("SP");
    expect((t.endereco as Record<string, unknown>).cep).toBe("13010000");
  });

  it("omite campos vazios em vez de mandar string em branco", () => {
    const { payload } = montarPayloadNfse({
      ...DADOS,
      tomador: { cpf: "12345678909", razaoSocial: "João da Silva" },
    });
    const t = payload!.tomador as Record<string, unknown>;
    expect(t.cpf).toBe("12345678909");
    expect(t).not.toHaveProperty("cnpj");
    expect(t).not.toHaveProperty("endereco");
    expect(payload!.servico).not.toHaveProperty("valor_deducoes");
  });
});

describe("montarPayloadNfse — município da obra (LC 116 art. 3º III)", () => {
  it("obra em outro município: incidência lá e natureza 2", () => {
    const { payload } = montarPayloadNfse({
      ...DADOS,
      obra: { codigoMunicipio: "3550308" }, // São Paulo
    });
    expect(payload!.servico).toMatchObject({ codigo_municipio: "3550308" });
    expect(payload!.natureza_operacao).toBe("2");
    // O prestador continua sendo o da sede.
    expect(payload!.prestador.codigo_municipio).toBe("3509502");
  });

  it("obra no mesmo município da sede: natureza 1", () => {
    const { payload } = montarPayloadNfse({
      ...DADOS,
      obra: { codigoMunicipio: "3509502" },
    });
    expect(payload!.natureza_operacao).toBe("1");
  });

  it("sem obra cadastrada, usa o município do prestador", () => {
    const { payload } = montarPayloadNfse(DADOS);
    expect(payload!.servico).toMatchObject({ codigo_municipio: "3509502" });
    expect(payload!.natureza_operacao).toBe("1");
  });

  it("leva CNO e ART, truncando em 15 caracteres", () => {
    const { payload } = montarPayloadNfse({
      ...DADOS,
      obra: {
        codigoMunicipio: "3550308",
        codigoObra: "1234567890123456789",
        art: "ART-2026-0001",
      },
    });
    expect(payload!.codigo_obra).toHaveLength(15);
    expect(payload!.art).toBe("ART-2026-0001");
  });
});

describe("montarPayloadNfse — tributos", () => {
  it("ISS retido e retenções federais chegam nos campos de valor", () => {
    const { payload, calculo } = montarPayloadNfse({
      ...DADOS,
      servico: {
        ...DADOS.servico,
        valores: {
          valorServicos: 100_000,
          aliquotaIss: 3,
          issRetido: true,
          retencoes: { inss: { aliquota: 11, base: 30_000 }, ir: { aliquota: 1.5 } },
        },
      },
    });
    expect(payload!.servico).toMatchObject({
      iss_retido: true,
      valor_iss: 3_000,
      valor_iss_retido: 3_000,
      valor_inss: 3_300,
      valor_ir: 1_500,
    });
    expect(payload!.servico).not.toHaveProperty("valor_pis");
    expect(calculo!.valorLiquido).toBe(92_200);
  });

  it("dedução de material reduz a base enviada", () => {
    const { payload } = montarPayloadNfse({
      ...DADOS,
      servico: {
        ...DADOS.servico,
        valores: {
          valorServicos: 100_000,
          valorDeducoes: 40_000,
          aliquotaIss: 3,
          issRetido: false,
        },
      },
    });
    expect(payload!.servico).toMatchObject({
      valor_servicos: 100_000,
      valor_deducoes: 40_000,
      base_calculo: 60_000,
      valor_iss: 1_800,
    });
  });

  it("regime especial só é enviado quando cadastrado", () => {
    expect(montarPayloadNfse(DADOS).payload).not.toHaveProperty(
      "regime_especial_tributacao",
    );
    const comRegime = montarPayloadNfse({
      ...DADOS,
      emitente: { ...EMITENTE, regimeEspecial: "3" },
    }).payload!;
    expect(comRegime.regime_especial_tributacao).toBe("3");
  });
});

describe("montarPayloadNfse — pendências", () => {
  it("acusa cadastro fiscal incompleto sem montar payload", () => {
    const { payload, erros } = montarPayloadNfse({
      ...DADOS,
      emitente: { ...EMITENTE, inscricaoMunicipal: null },
    });
    expect(payload).toBeUndefined();
    expect(erros.join(" ")).toMatch(/cadastro fiscal/i);
  });

  it("exige CPF ou CNPJ do tomador", () => {
    const { erros } = montarPayloadNfse({
      ...DADOS,
      tomador: { razaoSocial: "Sem documento" },
    });
    expect(erros.join(" ")).toMatch(/CPF ou o CNPJ do tomador/);
  });

  it("recusa CNPJ de tomador com dígito errado", () => {
    const { erros } = montarPayloadNfse({
      ...DADOS,
      tomador: { ...DADOS.tomador, cnpj: "11222333000182" },
    });
    expect(erros.join(" ")).toMatch(/CNPJ do tomador inválido/);
  });

  it("junta todas as pendências de uma vez", () => {
    const { erros } = montarPayloadNfse({
      ...DADOS,
      tomador: { razaoSocial: "Sem documento" },
      servico: {
        discriminacao: "",
        valores: { valorServicos: 0, aliquotaIss: 3, issRetido: false },
      },
    });
    expect(erros.length).toBeGreaterThanOrEqual(3);
  });

  it("propaga o erro de valor vindo do cálculo", () => {
    const { erros } = montarPayloadNfse({
      ...DADOS,
      servico: {
        ...DADOS.servico,
        valores: { valorServicos: 1_000, aliquotaIss: 9, issRetido: false },
      },
    });
    expect(erros.join(" ")).toMatch(/entre 0 e 5/);
  });
});

describe("referência da emissão", () => {
  it("UUID vira ref alfanumérica estável", () => {
    const id = "6f1c9a2e-4b3d-4c1a-9f2e-8a7b6c5d4e3f";
    expect(refDaNota(id)).toBe("6f1c9a2e4b3d4c1a9f2e8a7b6c5d4e3f");
    expect(refValida(refDaNota(id))).toBe(true);
    expect(refDaNota(id)).toBe(refDaNota(id));
  });

  it("recusa referência com caractere especial", () => {
    expect(refValida("PED-000123")).toBe(false);
    expect(refValida("PED000123")).toBe(true);
    expect(refValida("")).toBe(false);
  });
});

describe("traduzirStatus", () => {
  it("mapeia o vocabulário do provedor", () => {
    expect(traduzirStatus("autorizado")).toBe("autorizado");
    expect(traduzirStatus("cancelado")).toBe("cancelado");
    expect(traduzirStatus("erro_autorizacao")).toBe("erro");
    expect(traduzirStatus("processando_autorizacao")).toBe("processando");
  });

  it("status desconhecido espera em vez de declarar erro", () => {
    expect(traduzirStatus("status_novo_do_provedor")).toBe("processando");
    expect(traduzirStatus(undefined)).toBe("processando");
  });
});
