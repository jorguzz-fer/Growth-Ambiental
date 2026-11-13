import { describe, it, expect } from "vitest";
import {
  avaliarCampo,
  competenciaDeDataInterna,
  docCompleto,
  isoParaCompetenciaInterna,
  isoParaDataInterna,
  type CampoLido,
} from "./campos";
import {
  montarPreenchimentoDespesa,
  type ContextoDespesa,
  type ExtractedDespesa,
} from "./despesa-doc";

/**
 * Os cenários abaixo são os documentos que realmente chegam do campo:
 * DANFE de NF-e, cupom "SEM VALOR FISCAL" de loja de material e comprovante de
 * Pix. Cada um exercita uma parte diferente da regra de alerta.
 */

const alta = (valor: string): CampoLido => ({ valor, confianca: "alta", nota: "" });
const baixa = (valor: string, nota: string): CampoLido => ({
  valor,
  confianca: "baixa",
  nota,
});
const vazioC = (nota = ""): CampoLido => ({ valor: "", confianca: "baixa", nota });

const CHAVE_NFE = "35260800000003000206550020000001231123456780";

function extracao(over: Partial<ExtractedDespesa> = {}): ExtractedDespesa {
  return {
    natureza: "OUTRO",
    resumo: "",
    observacoes: [],
    fornecedorNome: vazioC(),
    fornecedorDoc: vazioC(),
    valor: { valor: 0, confianca: "baixa", nota: "" },
    competencia: vazioC(),
    vencimento: vazioC(),
    descricao: vazioC(),
    categoriaDre: vazioC(),
    contaCef: vazioC(),
    projetoNome: vazioC(),
    docFiscalTipo: alta("SEM_DOC"),
    numDoc: vazioC(),
    serie: vazioC(),
    chaveAcesso: vazioC(),
    dataEmissao: vazioC(),
    formaPagamento: vazioC(),
    pago: { valor: false, confianca: "alta", nota: "" },
    dataPagamento: vazioC(),
    ...over,
  };
}

const CTX: ContextoDespesa = {
  fornecedores: [
    { id: "f-materiais", nome: "MATERIAIS EXEMPLO COM MAT CONSTR EIRELI - ME", doc: "00.000.003/0002-06" },
    { id: "f-deposito", nome: "Depósito Litoral", doc: null },
  ],
  contas: ["1.1", "2.3"],
  categorias: ["Custo de Obra", "Despesas Administrativas"],
  projetos: [
    { id: "p25", nome: "OBRA 25" },
    { id: "p28", nome: "OBRA 28" },
  ],
  formasPagamento: ["Boleto", "PIX", "Transferência bancária", "Dinheiro", "Cartão de crédito"],
  tiposDocumento: ["SEM_DOC", "NFE", "NFSE", "NFCE", "RECIBO", "CUPOM", "CONTRATO"],
};

describe("conversão de datas ISO → formato interno", () => {
  it("converte data e competência válidas", () => {
    expect(isoParaDataInterna("2026-07-20")).toBe("07/20/2026");
    expect(isoParaCompetenciaInterna("2026-07")).toBe("07/2026");
    expect(competenciaDeDataInterna("08/21/2026")).toBe("08/2026");
  });

  it("recusa data inexistente ou fora de formato (a IA às vezes 'completa' o ilegível)", () => {
    expect(isoParaDataInterna("2026-02-31")).toBe("");
    expect(isoParaDataInterna("20/07/2026")).toBe("");
    expect(isoParaDataInterna("")).toBe("");
    expect(isoParaCompetenciaInterna("2026-13")).toBe("");
  });
});

describe("documento do fornecedor", () => {
  it("só considera completo CPF/CNPJ com todos os dígitos", () => {
    expect(docCompleto("00.000.004/0001-70")).toBe(true);
    expect(docCompleto("000.000.003-53")).toBe(true);
    // Comprovante de Pix mascara o CPF — não serve para identificar ninguém.
    expect(docCompleto("***.123.456-**")).toBe(false);
    expect(docCompleto("")).toBe(false);
  });
});

describe("avaliarCampo", () => {
  it("campo essencial vazio vira alerta 'faltando' com a nota da IA", () => {
    const a = avaliarCampo(vazioC("Não consta no cupom"), {
      aplicadoVazio: true,
      essencial: true,
    });
    expect(a).toEqual({ nivel: "faltando", motivo: "Não consta no cupom" });
  });

  it("campo opcional vazio não polui a tela", () => {
    expect(avaliarCampo(vazioC(), { aplicadoVazio: true })).toBeNull();
  });

  it("valor preenchido sem confiança alta pede conferência", () => {
    const a = avaliarCampo(baixa("123", "Número rasurado"), { aplicadoVazio: false });
    expect(a).toEqual({ nivel: "conferir", motivo: "Número rasurado" });
  });

  it("campo lido com confiança alta não gera alerta", () => {
    expect(avaliarCampo(alta("17547"), { aplicadoVazio: false })).toBeNull();
  });
});

describe("DANFE de NF-e (documento completo)", () => {
  const res = montarPreenchimentoDespesa(
    extracao({
      natureza: "NOTA_FISCAL",
      resumo: "Compra de 1 saco de cimento na Materiais Exemplo, NF-e 17547",
      fornecedorNome: alta("MATERIAIS EXEMPLO COM MAT CONSTR EIRELI - ME"),
      fornecedorDoc: alta("00.000.003/0002-06"),
      valor: { valor: 34.56, confianca: "alta", nota: "" },
      competencia: alta("2026-08"),
      dataEmissao: alta("2026-08-21"),
      vencimento: alta("2026-08-21"),
      descricao: alta("Cimento 50kg Portland composto"),
      categoriaDre: alta("Custo de Obra"),
      contaCef: alta("1.1"),
      projetoNome: alta("CONSTRUTORA EXEMPLO LTDA (OBRA 25)"),
      docFiscalTipo: alta("NFE"),
      numDoc: alta("17547"),
      serie: alta("2"),
      chaveAcesso: alta(CHAVE_NFE),
      formaPagamento: alta("Dinheiro"),
    }),
    CTX,
  );

  it("preenche os campos da nota sem alerta", () => {
    expect(res.valores.fornecedorId).toBe("f-materiais");
    expect(res.valores.valor).toBe("34.56");
    expect(res.valores.competencia).toBe("08/2026");
    expect(res.valores.vencimento).toBe("08/21/2026");
    expect(res.valores.contaCef).toBe("1.1");
    expect(res.valores.categoriaDre).toBe("Custo de Obra");
    expect(res.valores.docFiscal).toEqual({
      tipo: "NFE",
      numero: "17547",
      serie: "2",
      chaveAcesso: CHAVE_NFE,
      dataEmissao: "08/21/2026",
    });
    expect(res.alertas.valor).toBeUndefined();
    expect(res.alertas.fornecedor).toBeUndefined();
    expect(res.alertas.competencia).toBeUndefined();
  });

  it("acha o projeto citado dentro do nome do destinatário, mas pede confirmação", () => {
    expect(res.valores.projetoId).toBe("p25");
    expect(res.alertas.projeto?.nivel).toBe("conferir");
    expect(res.alertas.projeto?.motivo).toMatch(/^Projeto identificado por semelhança/);
  });
});

describe("cupom de loja sem valor fiscal", () => {
  const res = montarPreenchimentoDespesa(
    extracao({
      natureza: "CUPOM",
      fornecedorNome: alta("DEPOSITO LITORAL COM MAT CONSTR LTDA"),
      fornecedorDoc: alta("00.000.003/0002-06"),
      valor: { valor: 35.35, confianca: "alta", nota: "Total após desconto" },
      dataEmissao: alta("2026-07-21"),
      descricao: alta("2 discos diamantados segmentados 110mm"),
      projetoNome: alta("OBRA 28"),
      docFiscalTipo: alta("SEM_DOC"),
      pago: { valor: true, confianca: "alta", nota: "Carimbo PAGO" },
      formaPagamento: alta("a vista"),
      dataPagamento: alta("2026-07-21"),
      contaCef: alta("9.9"),
      categoriaDre: alta("Receita de Vendas"),
    }),
    CTX,
  );

  it("usa o total já com desconto e marca a despesa como paga", () => {
    expect(res.valores.valor).toBe("35.35");
    expect(res.valores.status).toBe("Pago");
    expect(res.valores.formaPagamento).toBe("Dinheiro"); // "à vista" → dinheiro
  });

  it("sem NF, não cobra número de documento", () => {
    expect(res.valores.docFiscal?.tipo).toBe("SEM_DOC");
    expect(res.alertas.docFiscalNumero).toBeUndefined();
  });

  it("deduz vencimento e competência da emissão, avisando que foram deduzidos", () => {
    expect(res.valores.vencimento).toBe("07/21/2026");
    expect(res.valores.competencia).toBe("07/2026");
    expect(res.alertas.vencimento?.nivel).toBe("conferir");
    expect(res.alertas.competencia?.nivel).toBe("conferir");
  });

  it("recusa conta inexistente e categoria de receita, explicando o motivo no campo", () => {
    expect(res.valores.contaCef).toBeUndefined();
    expect(res.alertas.contaCef?.motivo).toContain("9.9");
    expect(res.valores.categoriaDre).toBeUndefined();
    expect(res.alertas.categoriaDre?.motivo).toContain("Receita de Vendas");
  });
});

describe("comprovante de Pix (sem nota, CPF mascarado)", () => {
  const res = montarPreenchimentoDespesa(
    extracao({
      natureza: "COMPROVANTE",
      resumo: "Pix de R$ 900,00 para Pessoa Exemplo da Silva — ajudante autônomo",
      fornecedorNome: alta("Pessoa Exemplo da Silva"),
      fornecedorDoc: baixa("***.123.456-**", "CPF mascarado no comprovante"),
      valor: { valor: 900, confianca: "alta", nota: "" },
      descricao: alta("Ajudante autônomo"),
      pago: { valor: true, confianca: "alta", nota: "Situação: Efetivado" },
      formaPagamento: alta("PIX"),
      dataPagamento: alta("2026-07-20"),
      observacoes: ["Comprovante não é nota fiscal — lançamento nasce sem NF."],
    }),
    CTX,
  );

  it("não vincula fornecedor não cadastrado e diz o que fazer", () => {
    expect(res.valores.fornecedorId).toBeUndefined();
    expect(res.alertas.fornecedor?.nivel).toBe("conferir");
    expect(res.alertas.fornecedor?.motivo).toContain("Pessoa Exemplo da Silva");
    expect(res.alertas.fornecedor?.motivo).toContain("não está cadastrado");
  });

  it("assume o vencimento como o dia do pagamento, sinalizando a dedução", () => {
    expect(res.valores.vencimento).toBe("07/20/2026");
    expect(res.valores.competencia).toBe("07/2026");
    expect(res.alertas.vencimento?.nivel).toBe("conferir");
  });

  it("marca como paga, por PIX, e guarda a data do pagamento", () => {
    expect(res.valores.status).toBe("Pago");
    expect(res.valores.formaPagamento).toBe("PIX");
    expect(res.valores.dataPagamento).toBe("07/20/2026");
  });

  it("cobra classificação contábil, que o comprovante nunca traz", () => {
    expect(res.alertas.contaCef?.nivel).toBe("faltando");
    expect(res.alertas.categoriaDre?.nivel).toBe("faltando");
  });

  it("sem projeto citado, pede confirmação do projeto em vez de aceitar em silêncio", () => {
    expect(res.valores.projetoId).toBeUndefined();
    expect(res.alertas.projeto?.nivel).toBe("conferir");
    expect(res.alertas.projeto?.motivo).toMatch(/não identifica o projeto/);
  });

  it("repassa as ressalvas gerais da leitura", () => {
    expect(res.observacoes).toHaveLength(1);
  });
});

describe("leituras defeituosas", () => {
  it("chave de acesso com menos de 44 dígitos entra, mas marcada", () => {
    const res = montarPreenchimentoDespesa(
      extracao({ docFiscalTipo: alta("NFE"), numDoc: alta("1"), chaveAcesso: alta("123456") }),
      CTX,
    );
    expect(res.valores.docFiscal?.chaveAcesso).toBe("123456");
    expect(res.alertas.docFiscalChave?.motivo).toContain("6 dígitos");
  });

  it("nota fiscal sem número cobra o número; emissão ilegível vira alerta", () => {
    const res = montarPreenchimentoDespesa(
      extracao({ docFiscalTipo: alta("NFE"), dataEmissao: baixa("21/08", "Data cortada na foto") }),
      CTX,
    );
    expect(res.alertas.docFiscalNumero?.nivel).toBe("faltando");
    expect(res.valores.docFiscal?.dataEmissao).toBe("");
    expect(res.alertas.docFiscalEmissao?.nivel).toBe("conferir");
  });

  it("tipo de documento desconhecido não é aplicado e avisa", () => {
    const res = montarPreenchimentoDespesa(extracao({ docFiscalTipo: alta("BOLETO") }), CTX);
    expect(res.valores.docFiscal?.tipo).toBe("SEM_DOC");
    expect(res.alertas.docFiscalTipo?.motivo).toContain("BOLETO");
  });

  it("orçamento sem valor legível cobra tudo o que falta para lançar", () => {
    const res = montarPreenchimentoDespesa(
      extracao({
        natureza: "ORCAMENTO",
        valor: { valor: 0, confianca: "baixa", nota: "Valor ilegível na foto" },
      }),
      CTX,
    );
    expect(res.alertas.valor).toEqual({ nivel: "faltando", motivo: "Valor ilegível na foto" });
    expect(res.alertas.vencimento?.nivel).toBe("faltando");
    expect(res.alertas.obs?.nivel).toBe("faltando");
    expect(res.preenchidos).toHaveLength(0);
  });

  it("forma de pagamento fora da lista do sistema não é aplicada", () => {
    const res = montarPreenchimentoDespesa(
      extracao({ formaPagamento: alta("Consignado em folha") }),
      CTX,
    );
    expect(res.valores.formaPagamento).toBeUndefined();
    expect(res.alertas.formaPagamento?.motivo).toContain("Consignado em folha");
  });

  it("pagamento comprovado sem meio informado vira pendência", () => {
    const res = montarPreenchimentoDespesa(
      extracao({ pago: { valor: true, confianca: "alta", nota: "" } }),
      CTX,
    );
    expect(res.alertas.formaPagamento?.nivel).toBe("faltando");
  });

  it("status deduzido com pouca confiança pede confirmação", () => {
    const res = montarPreenchimentoDespesa(
      extracao({ pago: { valor: true, confianca: "media", nota: "Carimbo ilegível" } }),
      CTX,
    );
    expect(res.valores.status).toBe("Pago");
    expect(res.alertas.status?.nivel).toBe("conferir");
  });
});

describe("decisão de 01/10 — a empresa não vai ao modelo; a checagem é local", () => {
  const lidoComCnpj = (doc: string) =>
    montarPreenchimentoDespesa(
      extracao({ fornecedorNome: alta("MATERIAIS EXEMPLO COM MAT CONSTR EIRELI - ME"), fornecedorDoc: alta(doc) }),
      { ...CTX, empresaDoc: "00.000.003/0002-06" },
    );
  it("se a leitura devolver o CNPJ da própria empresa, não vincula e pede o fornecedor certo", () => {
    const r = lidoComCnpj("00000003000206");
    expect(r.valores.fornecedorId).toBeUndefined();
    expect(r.alertas.fornecedor?.motivo).toContain("própria empresa");
  });
  it("sem empresaDoc, o casamento é o de sempre", () => {
    const r = montarPreenchimentoDespesa(extracao({ fornecedorNome: alta("MATERIAIS EXEMPLO COM MAT CONSTR EIRELI - ME"), fornecedorDoc: alta("00.000.003/0002-06") }), CTX);
    expect(r.valores.fornecedorId).toBe("f-materiais");
  });
});
