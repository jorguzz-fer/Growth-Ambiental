import { describe, it, expect } from "vitest";
import {
  CATEGORIAS_CREDORAS,
  TEXTO_MOTIVO,
  codificarCursor,
  lerCompetenciaDoFiltro,
  lerCursor,
  mensagemDoLote,
  motivosDaDespesa,
  selecionavel,
} from "./conferencia-regras";
import { categoriaValidaParaDespesa } from "./calc/natureza-dre";

const ok = { categoriaDre: "Custo Variável", valor: 100, competencia: "09/2026", cancelado: false };

/** ORÁCULO — a triagem de antes do Prompt AN (três condições + cancelada), copiada. */
function antigo(d: { categoriaDre: string | null; valor: number; cancelado: boolean }): string[] | null {
  const motivos: string[] = [];
  if (d.categoriaDre && !categoriaValidaParaDespesa(d.categoriaDre)) motivos.push("categoria de receita em lançamento de despesa");
  if (!d.categoriaDre) motivos.push("sem categoria DRE");
  if (Number(d.valor) === 0) motivos.push("valor zero");
  if (d.cancelado) {
    if (motivos.length === 0) return null;
    motivos.push("lançamento cancelado");
  }
  return motivos.length ? motivos : null;
}

describe("Prompt AN · regras da Conferência", () => {
  it("credoras vêm da regra de natureza-dre (hoje só Receita), sem lista copiada", () => {
    expect(CATEGORIAS_CREDORAS).toEqual(["Receita"]);
  });

  it("1 — competência nula aparece, com o motivo e a consequência", () => {
    const m = motivosDaDespesa({ ...ok, competencia: null })!;
    expect(m.map((x) => x.codigo)).toEqual(["sem_competencia"]);
    expect(m[0].texto).toMatch(/fica fora da DRE por mês e por ano/);
  });

  it("2 — competência só com espaços é vazia", () => {
    expect(motivosDaDespesa({ ...ok, competencia: "   " })!.map((x) => x.codigo)).toEqual(["sem_competencia"]);
  });

  it("3 — despesa que já aparecia por outro motivo não duplica (um item, dois motivos)", () => {
    const m = motivosDaDespesa({ categoriaDre: null, valor: 0, competencia: "", cancelado: false })!;
    expect(m.map((x) => x.codigo)).toEqual(["sem_categoria", "valor_zero", "sem_competencia"]);
  });

  it("cancelada sem competência e sem outro motivo NÃO entra; com outro motivo, entra sem a competência", () => {
    expect(motivosDaDespesa({ ...ok, competencia: null, cancelado: true })).toBeNull();
    expect(motivosDaDespesa({ ...ok, valor: 0, competencia: null, cancelado: true })!.map((x) => x.codigo)).toEqual(["valor_zero", "cancelado"]);
  });

  it("4/10.1 — antes e depois: com competência preenchida, os motivos antigos são os mesmos, texto a texto", () => {
    const casos = [];
    for (const categoriaDre of [null, "Receita", "Custo Variável", "Despesa Fixa"])
      for (const valor of [0, 10])
        for (const cancelado of [false, true]) casos.push({ categoriaDre, valor, cancelado, competencia: "01/2026" });
    for (const c of casos) {
      const novo = motivosDaDespesa(c);
      expect(novo ? novo.map((m) => m.texto) : null, JSON.stringify(c)).toEqual(antigo(c));
    }
  });

  it("16 — a seleção segue o CÓDIGO: mudar o texto não quebra", () => {
    const m = motivosDaDespesa({ ...ok, valor: 0, cancelado: true })!;
    const renomeado = m.map((x) => ({ ...x, texto: x.texto.toUpperCase() + " (novo texto)" }));
    expect(selecionavel(renomeado)).toBe(false);
    expect(selecionavel(motivosDaDespesa({ ...ok, valor: 0 })!)).toBe(true);
    expect(Object.keys(TEXTO_MOTIVO)).toContain("cancelado");
  });

  it("cursor e filtro de competência", () => {
    const id = "0513afd0-51d4-48b5-b170-d8698b03c068";
    expect(lerCursor(codificarCursor(1234.5, id))).toEqual({ valor: "1234.50", id });
    expect(lerCursor("1;drop~x")).toBeNull();
    expect(lerCompetenciaDoFiltro("9/2026")).toBe("09/2026");
    expect(lerCompetenciaDoFiltro("13/2026")).toBeNull();
    expect(lerCompetenciaDoFiltro("")).toBeNull();
  });

  it("7 — a mensagem do lote traz selecionadas, alteradas e puladas com o motivo", () => {
    expect(mensagemDoLote({ selecionadas: 3, alteradas: 1, puladas: [{ id: "a", numDoc: null, motivo: "cancelada" }, { id: "b", numDoc: null, motivo: "ja_na_categoria" }] }))
      .toBe("3 selecionado(s) · 1 reclassificado(s) · 2 pulado(s): 1 cancelada — o registro está encerrado; 1 já estava nessa categoria.");
  });
});

import { avisoDaSelecao, homogeneidade } from "./conferencia-regras";

describe("Prompt AN · Parte 3 — lote híbrido", () => {
  const l = (id: string, fornecedorId: string | null, contaCef: string | null) => ({ id, fornecedorId, contaCef });
  it("mesmo fornecedor é homogêneo; mesma conta do plano também", () => {
    expect(homogeneidade([l("a", "F1", "1.1"), l("b", "F1", "2.2")])).toMatchObject({ homogenea: true, criterio: "fornecedor" });
    expect(homogeneidade([l("a", "F1", "1.1"), l("b", "F2", "1.1")])).toMatchObject({ homogenea: true, criterio: "conta do plano" });
  });
  it("11 — fornecedores e contas diferentes: não homogêneo, e o aviso diz quantos fornecedores", () => {
    const h = homogeneidade([l("a", "F1", "1.1"), l("b", "F2", "2.2"), l("c", "F3", "3.3")]);
    expect(h).toMatchObject({ homogenea: false, fornecedores: 3 });
    expect(avisoDaSelecao(h, 3)).toMatch(/3 fornecedores diferentes.*linha a linha/);
  });
  it("sem fornecedor não prova nada: dois lançamentos sem fornecedor e sem conta não formam lote", () => {
    expect(homogeneidade([l("a", null, null), l("b", null, "")]).homogenea).toBe(false);
  });
  it("um lançamento só é sempre homogêneo, sem aviso", () => {
    const h = homogeneidade([l("a", null, null)]);
    expect(h.homogenea).toBe(true);
    expect(avisoDaSelecao(h, 1)).toBeNull();
  });
});
