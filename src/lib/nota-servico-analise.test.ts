import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { analisarNotas, motivoDaRejeicao, EXPLICACAO_DO_CALCULO, type NotaParaAnalise } from "./nota-servico-analise";
import type { EmitenteFiscal } from "@/lib/calc/emitente-fiscal";

/** Prompt AG, seção 6 — o assistente das Notas Fiscais. */
const EMITENTE: EmitenteFiscal = {
  razaoSocial: "X", cnpj: "11222333000181", inscricaoMunicipal: "1", regimeTributario: "LUCRO_PRESUMIDO", itemListaServico: "7.02",
  aliquotaIss: 3, codigoMunicipio: "3509502", municipio: "Campinas", uf: "SP", logradouro: "Av", numero: "1", bairro: "C", cep: "13010-000", email: "a@b.c",
};
const AGORA = new Date("2026-10-26T15:00:00Z");
let seq = 0;
const nota = (o: Partial<NotaParaAnalise>): NotaParaAnalise => ({
  id: `n${++seq}`, status: "rascunho", projectId: "p1", projeto: "OBRA", enviadaEm: null, createdAt: AGORA, mensagemRetorno: null,
  discriminacao: "Serviço", competencia: null, itemListaServico: null, codigoTributarioMunicipio: null,
  valorServicos: "1000", valorDeducoes: "0", descontoIncondicionado: "0", descontoCondicionado: "0", aliquotaIss: "3", issRetido: false,
  retencoes: null, outrasRetencoes: "0", tomadorCpfCnpj: "11222333000181", tomadorNome: "T", tomadorInscricaoMunicipal: null,
  tomadorEmail: null, tomadorTelefone: null, tomadorLogradouro: null, tomadorNumero: null, tomadorComplemento: null, tomadorBairro: null,
  tomadorCodigoMunicipio: null, tomadorUf: null, tomadorCep: null, ...o,
});
const obras = new Map([["p1", { codigoMunicipio: "3509502" }]]);

describe("analisarNotas", () => {
  it("conferir: pendência própria por nota; o cadastro da empresa aparece uma vez, à parte", () => {
    const a = analisarNotas([nota({}), nota({ tomadorCpfCnpj: null, discriminacao: "" }), nota({ status: "autorizada", tomadorNome: null })], { emitente: EMITENTE, obras, agora: AGORA });
    expect(a.pendenciasDaEmpresa).toEqual([]);
    expect(a.prontas).toBe(1);
    expect(a.conferir).toHaveLength(1);
    expect(a.conferir[0].pendencias).toEqual(expect.arrayContaining(["Informe o CPF ou o CNPJ do tomador.", "Informe a discriminação do serviço."]));

    const sem = analisarNotas([nota({}), nota({})], { emitente: { ...EMITENTE, cnpj: null }, obras, agora: AGORA });
    expect(sem.pendenciasDaEmpresa.length).toBeGreaterThan(0);
    // As notas não repetem a pendência da empresa.
    expect(sem.conferir).toEqual([]);
    expect(sem.prontas).toBe(2);
  });

  it("rejeitadas agrupadas pela primeira linha da mensagem, a mais frequente primeiro", () => {
    const a = analisarNotas(
      [
        nota({ status: "rejeitada", mensagemRetorno: "E10: Inscrição não confere\nprotocolo 1" }),
        nota({ status: "rejeitada", mensagemRetorno: "E10: Inscrição não confere\nprotocolo 2" }),
        nota({ status: "rejeitada", mensagemRetorno: null }),
      ],
      { emitente: EMITENTE, obras, agora: AGORA },
    );
    expect(a.rejeitadas.map((g) => [g.motivo, g.quantas])).toEqual([
      ["E10: Inscrição não confere", 2],
      ["Sem mensagem do provedor", 1],
    ]);
    expect(motivoDaRejeicao("  ")).toBe("Sem mensagem do provedor");
  });

  it("processando há mais de 30 minutos (pelo envio), a mais antiga primeiro", () => {
    const min = (m: number) => new Date(AGORA.getTime() - m * 60_000);
    const a = analisarNotas(
      [nota({ status: "processando", enviadaEm: min(10) }), nota({ status: "processando", enviadaEm: min(45) }), nota({ status: "processando", enviadaEm: min(300) })],
      { emitente: EMITENTE, obras, agora: AGORA },
    );
    expect(a.demoradas.map((d) => d.minutos)).toEqual([300, 45]);
    expect(analisarNotas([nota({ status: "processando", enviadaEm: min(10) })], { emitente: EMITENTE, obras, agora: AGORA, limiteMinutos: 5 }).demoradas).toHaveLength(1);
  });

  it("a explicação do cálculo não sugere valor: diz que a decisão é da contabilidade", () => {
    expect(EXPLICACAO_DO_CALCULO.join(" ")).toMatch(/decisão da contabilidade/);
    expect(EXPLICACAO_DO_CALCULO.join(" ")).not.toMatch(/\d+(,\d+)?\s?%/);
  });

  it("o painel é somente leitura: não importa action, não chama rede nem modelo", () => {
    const src = readFileSync("src/components/app/assistente-notas.tsx", "utf8") + readFileSync("src/lib/nota-servico-analise.ts", "utf8");
    expect(src).not.toMatch(/@\/lib\/actions/);
    expect(src).not.toMatch(/\bfetch\(/);
    expect(src).not.toMatch(/anthropic|assistente-chat|openai/i);
  });
});
