import { describe, it, expect } from "vitest";
import { CAMPOS_DO_CADASTRO, formularioDoProjeto, valoresParaOCadastro } from "./projeto-cris";
import { propostaValida } from "./cris";

describe("Prompt B2 — mudar o projeto por comando", () => {
  it("o formulário do projeto aberto, sem cliente, situação ou trava", () => {
    const f = formularioDoProjeto({ id: "p28", nome: "Monitoramento 28" }, true);
    expect(f.id).toBe("projeto-p28");
    expect(f.titulo).toBe("Cadastro do projeto Monitoramento 28");
    expect(f.campos.find((c) => c.nome === "name")?.rotulo).toBe("Nome do projeto");
    const nomes = f.campos.map((c) => c.nome);
    expect(nomes).toContain("endDate");
    expect(nomes).toContain("metragem");
    expect(nomes).not.toContain("clienteId");
    expect(nomes).not.toContain("status");
    expect(f.campos.length).toBe(CAMPOS_DO_CADASTRO.length);
    expect(formularioDoProjeto({ id: "p", nome: "x" }, false).campos.some((c) => c.nome === "cep")).toBe(false);
  });

  it("a proposta passa pela validação e chega no formato do cartão", () => {
    const f = formularioDoProjeto({ id: "p28", nome: "Monitoramento 28" }, true);
    const p = propostaValida({ valores: { endDate: "12/31/2027", valorConstrucao: "R$ 2.500.000,00", terrenoForaCaixa: false, clienteId: "x" } }, f)!;
    expect(p.valores).toEqual({ endDate: "12/31/2027", valorConstrucao: "2500000", terrenoForaCaixa: "não" });
    expect(valoresParaOCadastro(p.valores, true)).toEqual({ endDate: "12/31/2027", valorConstrucao: "2500000", terrenoForaCaixa: false });
    expect(valoresParaOCadastro({ cep: "01310100", name: "Nova" }, false)).toEqual({ name: "Nova" });
  });
});
