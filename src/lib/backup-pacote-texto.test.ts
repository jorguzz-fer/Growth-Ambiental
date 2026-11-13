import { describe, it, expect } from "vitest";
import { limitesDoSemestre, linhaParaArquivo, montarLeiaMe, montarManifesto, somaDecimal, somasDeControle, type ResumoDoPacote } from "./backup-pacote-texto";

describe("texto do pacote completo", () => {
  it("soma de controle exata (sem erro de ponto flutuante)", () => {
    expect(somaDecimal(["0.10", "0.20", null, "", "abc"])).toBe("0.3");
    expect(somaDecimal(["1000000.01", "-0.01", "2"])).toBe("1000002");
    expect(somaDecimal(["-5.5"])).toBe("-5.5");
    expect(somaDecimal([])).toBe("0");
    expect(somasDeControle([{ valor: "10.50" }, { valor: "4.50" }], ["valor"])).toEqual({ valor: "15" });
  });

  it("limites do semestre nas chaves do SQL", () => {
    expect(limitesDoSemestre({ year: 2026, half: 1 })).toEqual({ diaInicio: "20260101", diaFim: "20260631", mesInicio: "202601", mesFim: "202606" });
    expect(limitesDoSemestre({ year: 2026, half: 2 })).toEqual({ diaInicio: "20260701", diaFim: "20261231", mesInicio: "202607", mesFim: "202612" });
  });

  it("a linha sai com o nome da coluna do banco, sem as omitidas, data em ISO", () => {
    const cols = { id: { name: "id" }, tenantId: { name: "tenant_id" }, rendaBruta: { name: "renda_bruta" }, createdAt: { name: "created_at" } };
    const l = linhaParaArquivo({ id: "a", tenantId: "t", rendaBruta: "9000", createdAt: new Date("2026-01-02T03:04:05Z") }, cols, ["rendaBruta"]);
    expect(l).toEqual({ id: "a", tenant_id: "t", created_at: "2026-01-02T03:04:05.000Z" });
  });

  const resumo: ResumoDoPacote = {
    empresa: "Empresa Exemplo",
    semestre: "2026-H1",
    rotulo: "1º semestre de 2026 (Jan–Jun)",
    geradoEm: new Date("2026-10-26T12:00:00Z"),
    capturadoEm: new Date("2026-10-26T12:00:00Z"),
    corte: { inicio: new Date(2026, 0, 1), fim: new Date(2026, 5, 30, 23, 59, 59) },
    tabelas: [
      { tabela: "despesa", familia: "Despesa", camada: "movimento", recorte: "pela competência", linhas: 3, semData: 1, colunasOmitidas: [], somas: { valor: "30" } },
      { tabela: "cliente", familia: "Receita", camada: "cadastro", recorte: "cadastro inteiro", linhas: 2, semData: 0, colunasOmitidas: ["renda_bruta"], motivoOmissao: "BM-3", somas: {} },
      { tabela: "pagamento", familia: "Despesa", camada: "movimento", recorte: "pela data", linhas: 0, semData: 0, colunasOmitidas: [], somas: {}, erro: "timeout" },
    ],
    referenciasFora: [{ tabela: "pagamento", coluna: "despesa_id", aponta: "despesa", quantas: 2 }],
    sequencias: [{ entidade: "despesa", prefixo: "PED", usaPrefixo: true, digitos: 6, proximo: 42 }],
    documentos: { noPeriodo: 5, incluidos: 4, falhos: ["nota.pdf"], asoOmitidos: 1, semStorage: false },
    planilha: "planilha/dados_2026-H1.xlsx",
  };

  it("o leia-me declara as duas datas, o que falhou, o que ficou fora, a numeração, o aviso de LGPD e que não restaura", () => {
    const t = montarLeiaMe(resumo);
    for (const trecho of [
      "DUAS DATAS DIFERENTES",
      "LINHAS SEM DATA RECONHECÍVEL",
      "tabela pagamento: timeout",
      "documentos não baixados: nota.pdf",
      "pagamento.despesa_id → despesa: 2",
      "user (Autenticação)",
      "colunas de cliente: renda_bruta — BM-3",
      "1 documento(s) de ASO",
      'prefixo "PED", 6 dígitos, próximo número 42',
      "DADO PESSOAL — LGPD",
      "A guarda deste arquivo é responsabilidade de quem o baixou",
      "Este pacote não restaura nada",
      "Nenhum dado foi removido do sistema.",
    ])
      expect(t, trecho).toContain(trecho);
  });

  it("o manifesto tem uma entrada por tabela, com arquivo, linhas e somas", () => {
    const m = montarManifesto(resumo);
    expect(m.formato).toBe("growth-backup/1");
    expect(m.restaura).toBe(false);
    expect(m.tabelas.map((t) => [t.arquivo, t.linhas])).toEqual([
      ["dados/despesa.json", 3],
      ["dados/cliente.json", 2],
      ["dados/pagamento.json", 0],
    ]);
    expect(m.tabelas[2]).toMatchObject({ erro: "timeout" });
    expect(m.foraDoPacote.length).toBeGreaterThan(0);
  });
});
