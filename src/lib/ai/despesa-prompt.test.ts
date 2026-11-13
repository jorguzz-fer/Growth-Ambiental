import { describe, it, expect } from "vitest";
import {
  instrucaoLeituraDespesa,
  promptSistemaDespesa,
  type ContextoLeituraDespesa,
} from "./despesa-prompt";

const CTX: ContextoLeituraDespesa = {
  contas: [
    { code: "2.10", name: "Serviços" },
    { code: "1.1", name: "Materiais" },
    { code: "1.2", name: "Mão de obra" },
  ],
  categorias: ["Custo Variável"],
  tiposDocumento: [
    { id: "SEM_DOC", label: "Sem documento" },
    { id: "NFE", label: "NF-e" },
  ],
};

describe("parte estável do prompt (a que é cacheada)", () => {
  const p = promptSistemaDespesa(CTX);

  it("leva só configuração que não identifica ninguém: plano de contas e tipos", () => {
    expect(p).toContain("1.1 — Materiais");
    expect(p).toContain("NFE = NF-e");
  });

  it("decisão de 01/10 (BE-2): nenhum dado de pessoa ou empresa do cadastro vai ao modelo", () => {
    // o tipo nem aceita mais fornecedores, projetos ou a empresa
    expect(Object.keys(CTX).sort()).toEqual(["categorias", "contas", "tiposDocumento"]);
    expect(p).not.toMatch(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/); // nenhum CNPJ
    expect(p).not.toContain("FORNECEDORES já cadastrados");
    expect(p).not.toContain("OBRAS/PROJETOS cadastrados");
    expect(p).toContain("você não recebe o cadastro");
  });

  it("deixa explícito que a empresa que lança é a pagadora, nunca a fornecedora", () => {
    expect(p).toContain("a empresa que lança é a PAGADORA");
    expect(p).toContain("RECEBEDOR");
    expect(p).not.toMatch(/construtora/i);
  });

  /**
   * O cache é casamento de PREFIXO byte a byte: se a ordem da lista variar
   * entre uma leitura e outra (a consulta ao banco não garante ordem), o
   * prefixo muda e o cache não é aproveitado.
   */
  it("ordena o plano de contas, para o prefixo ser idêntico entre chamadas", () => {
    expect(promptSistemaDespesa({ ...CTX, contas: [...CTX.contas].reverse() })).toBe(p);
    expect(p.indexOf("- 1.1 ")).toBeLessThan(p.indexOf("- 1.2 "));
    expect(p.indexOf("- 1.2 ")).toBeLessThan(p.indexOf("- 2.10 "));
  });

  it("não depende dos arquivos desta leitura — se dependesse, nunca cachearia", () => {
    expect(p).not.toContain("arquivo");
    expect(p).not.toContain("Arquivo");
  });

  it("plano de contas vazio não quebra o prompt", () => {
    expect(promptSistemaDespesa({ ...CTX, contas: [] })).toContain("(nenhum cadastrado)");
  });
});

describe("parte volátil (cobrada inteira em toda leitura)", () => {
  it("um arquivo: instrução curta, sem o texto de combinação", () => {
    const i = instrucaoLeituraDespesa(1);
    expect(i).toContain("preencher_despesa");
    expect(i).not.toContain("MESMA compra");
    expect(i.length).toBeLessThan(200);
  });

  it("vários arquivos: manda combinar as informações da mesma compra", () => {
    const i = instrucaoLeituraDespesa(3);
    expect(i).toContain("3 arquivos");
    expect(i).toContain("MESMA compra");
    expect(i).toContain("observacoes");
  });

  it("não repete o contexto do tenant — isso já está na parte cacheada", () => {
    const i = instrucaoLeituraDespesa(2);
    expect(i).not.toContain("PLANO DE CONTAS");
    expect(i).not.toContain("FORNECEDORES");
  });
});
