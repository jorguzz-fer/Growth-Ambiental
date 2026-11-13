import { describe, it, expect } from "vitest";
import { AJUDA_CAMPO, avisosComplementares, estadoDoSeloR2, recusaDoCadastroFiscal, recusaDoNome, rotuloDoSeloR2 } from "./empresa-regras";
import { checarProntidaoFiscal, emitentePronto, type EmitenteFiscal } from "./calc/emitente-fiscal";

const completo: EmitenteFiscal = {
  razaoSocial: "Construtora X",
  nomeFantasia: null,
  cnpj: "11222333000181",
  inscricaoMunicipal: "123",
  inscricaoEstadual: null,
  regimeTributario: "LUCRO_PRESUMIDO",
  regimeEspecial: null,
  itemListaServico: "7.02",
  codigoTributarioMunicipio: "1",
  cnae: "4120400",
  aliquotaIss: 3,
  logradouro: "Rua A",
  numero: "1",
  complemento: null,
  bairro: "Centro",
  codigoMunicipio: "3550308",
  municipio: "São Paulo",
  uf: "SP",
  cep: "01001000",
  telefone: null,
  email: "a@b.c",
};

describe("Prompt AH · regras da tela Empresa", () => {
  it("1 — nenhum placeholder sugere número que pareça valor; a ajuda fica fora do campo", () => {
    expect(AJUDA_CAMPO.codigoMunicipio.placeholder).toBe("7 dígitos, sem ponto");
    expect(AJUDA_CAMPO.aliquotaIss.placeholder).toBe("0 a 5");
    expect(AJUDA_CAMPO.itemListaServico.placeholder).toBe("");
    expect(AJUDA_CAMPO.cnae.placeholder).toBe("");
    for (const a of Object.values(AJUDA_CAMPO)) expect(a.placeholder).not.toMatch(/3552502|4120400|7\.02|^3$/);
    expect(AJUDA_CAMPO.itemListaServico.ajuda).toMatch(/7\.02/);
  });
  it("2 — CEP < 8 dígitos, IBGE ≠ 7 dígitos e UF fora das 27 são recusados; vazio passa (4–8)", () => {
    expect(recusaDoCadastroFiscal({ cep: "1234567", codigoMunicipio: null, uf: null })).toMatch(/^CEP: .*8 dígitos/);
    expect(recusaDoCadastroFiscal({ cep: null, codigoMunicipio: "99", uf: null })).toMatch(/^Código IBGE.*7 dígitos/);
    expect(recusaDoCadastroFiscal({ cep: null, codigoMunicipio: null, uf: "XX" })).toMatch(/^UF: .*27 estados/);
    expect(recusaDoCadastroFiscal({ cep: null, codigoMunicipio: null, uf: null })).toBeNull();
    expect(recusaDoCadastroFiscal({ cep: "01001000", codigoMunicipio: "3550308", uf: "sp" })).toBeNull();
  });
  it("4 — avisos complementares: os dois campos vazios geram aviso; nome sem código também; nunca bloqueio (13)", () => {
    const vazio = avisosComplementares({ codigoTributarioMunicipio: null, municipio: null, codigoMunicipio: null });
    expect(vazio.map((p) => [p.campo, p.severidade])).toEqual([["codigoTributarioMunicipio", "aviso"], ["municipio", "aviso"]]);
    expect(avisosComplementares({ codigoTributarioMunicipio: "1", municipio: "São Paulo", codigoMunicipio: "12" }).map((p) => p.mensagem)).toEqual([expect.stringMatching(/sem o código IBGE/)]);
    expect(avisosComplementares({ codigoTributarioMunicipio: "1", municipio: "São Paulo", codigoMunicipio: "3550308" })).toEqual([]);
  });
  it("9.1/9.2/14/15 — o checklist e emitentePronto não mudaram: mesmas pendências de antes para os mesmos dados", () => {
    expect(checarProntidaoFiscal(completo)).toEqual([]);
    expect(emitentePronto(completo)).toBe(true);
    const semCodigo = { ...completo, codigoMunicipio: null, codigoTributarioMunicipio: null };
    // Decisão de 01/10/2026: os dois avisos estão DENTRO do checklist — o
    // bloqueio é o mesmo de antes e emitentePronto ignora os avisos.
    const naTela = checarProntidaoFiscal(semCodigo);
    expect(naTela.filter((p) => p.severidade === "bloqueio").map((p) => p.campo)).toEqual(["codigoMunicipio"]);
    expect(naTela.filter((p) => p.severidade === "aviso").map((p) => p.campo)).toEqual(["codigoTributarioMunicipio", "municipio"]);
    expect(avisosComplementares(semCodigo).map((p) => p.campo)).toEqual(["codigoTributarioMunicipio", "municipio"]);
    expect(emitentePronto(semCodigo)).toBe(false);
    expect(emitentePronto({ ...completo, codigoTributarioMunicipio: null, municipio: null })).toBe(true);
  });
  it("5 — o selo só fica verde depois do round-trip (16)", () => {
    expect(rotuloDoSeloR2(estadoDoSeloR2(false, null))).toMatchObject({ texto: "R2 não configurado", tom: "neutral" });
    expect(rotuloDoSeloR2(estadoDoSeloR2(true, null))).toMatchObject({ texto: "R2 configurado (sem teste)", tom: "warning" });
    expect(rotuloDoSeloR2(estadoDoSeloR2(true, { ok: true, quando: new Date() }))).toMatchObject({ texto: "R2 testado", tom: "success" });
    expect(rotuloDoSeloR2(estadoDoSeloR2(true, { ok: false, quando: new Date(), etapa: "get" }))).toMatchObject({ tom: "danger" });
  });
  it("3 — nome vazio é recusado com o motivo", () => {
    expect(recusaDoNome("  ")).toMatch(/razão social/);
    expect(recusaDoNome("ABC")).toBeNull();
  });
});

describe("decisão de 01/10 — dado antigo inválido não trava a edição", () => {
  it("campo devolvido igual ao gravado é inalterado (mesmo inválido); mudar ou apagar não é", async () => {
    const { campoInalterado } = await import("./empresa-regras");
    expect(campoInalterado("123", "123")).toBe(true);
    expect(campoInalterado(" 123 ", "123")).toBe(true);
    expect(campoInalterado("1234", "123")).toBe(false);
    expect(campoInalterado(null, "123")).toBe(false);
    expect(campoInalterado(null, null)).toBe(false);
  });
});
