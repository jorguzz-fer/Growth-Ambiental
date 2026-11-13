import { describe, it, expect } from "vitest";
import { formularioDoPlanoDeTrabalho, ID_FORM_PLANO } from "./plano-cris";
import { MAX_CAMPOS, formularioValido } from "./cris";
import { MAX_FASES_CRIS, notaDaCris, propostaDaCris } from "./plano-regras";

describe("Plano de trabalho × Cris (§12)", () => {
  const form = formularioDoPlanoDeTrabalho(["Planejamento e mobilização", "Encerramento"]);
  it("cabe no limite de campos do formulário da Cris e sobrevive à validação", () => {
    expect(form.campos.length).toBeLessThanOrEqual(MAX_CAMPOS);
    expect(form.id).toBe(ID_FORM_PLANO);
    expect(formularioValido(form)?.campos).toHaveLength(form.campos.length);
    expect(form.campos.filter((c) => c.nome.endsWith("_nome"))).toHaveLength(MAX_FASES_CRIS);
  });
  it("as instruções proíbem inventar e pedem a origem de cada item", () => {
    expect(form.titulo).toMatch(/Não invente/);
    expect(form.titulo).toMatch(/sugestão/);
    expect(form.campos[0].dica).toContain("Planejamento e mobilização");
  });
  it("todo campo do formulário é lido pela proposta (sem campo órfão)", () => {
    const valores = Object.fromEntries(form.campos.map((c) => [c.nome, c.tipo === "data" ? "02/01/2027" : c.nome.endsWith("_origem") ? "documento" : `x ${c.nome}`]));
    const p = propostaDaCris(valores);
    expect(p).toHaveLength(MAX_FASES_CRIS);
    expect(p[0]).toMatchObject({ inicio: "02/01/2027", termino: "02/01/2027", origem: "documento", trecho: "x fase1_trecho" });
    expect(p[0].atividades[0].nome).toBe("x fase1_atividades");
    expect(p[0].entregas[0].nome).toBe("x fase1_entregas");
  });
  it("nota de rastreabilidade por origem", () => {
    expect(notaDaCris({ origem: "documento", trecho: "item 3" })).toBe('Extraído do documento pela Cris. Trecho: "item 3"');
    expect(notaDaCris({ origem: "sugestao" })).toMatch(/^Sugestão da Cris/);
    expect(notaDaCris({ origem: "biblioteca" })).toMatch(/biblioteca/);
  });
});
