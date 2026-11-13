import { describe, it, expect } from "vitest";
import {
  ehEscopo,
  lerEscopoDeRelatorio,
  lerSelecaoDeProjeto,
  ordenarProjetos,
  projetosDoEscopo,
} from "./projeto-selecao";

const p = (id: string, name: string, kind = "proj") => ({ id, name, kind });

describe("ordenarProjetos (Prompt A, 10)", () => {
  it("obras pelo número do nome, não pela ordem de criação", () => {
    const lista = [p("a", "OBRA 28"), p("b", "OBRA 32"), p("c", "OBRA 29"), p("d", "OBRA 3"), p("e", "OBRA 21")];
    expect(ordenarProjetos(lista).map((x) => x.name)).toEqual([
      "OBRA 3", "OBRA 21", "OBRA 28", "OBRA 29", "OBRA 32",
    ]);
  });

  it("escritórios em grupo próprio, no fim, em ordem alfabética", () => {
    const lista = [
      p("1", "DESPESAS GERAIS MATRIZ", "office"),
      p("2", "OBRA 28"),
      p("3", "Administração", "office"),
      p("4", "OBRA 5"),
    ];
    expect(ordenarProjetos(lista).map((x) => x.name)).toEqual([
      "OBRA 5", "OBRA 28", "Administração", "DESPESAS GERAIS MATRIZ",
    ]);
  });

  it("obra sem número vem depois das numeradas, em ordem alfabética", () => {
    const lista = [p("1", "Residencial Sol"), p("2", "OBRA 7"), p("3", "Edifício Aurora")];
    expect(ordenarProjetos(lista).map((x) => x.name)).toEqual([
      "OBRA 7", "Edifício Aurora", "Residencial Sol",
    ]);
  });

  it("empate de número desempata pelo nome e depois pelo id — ordem estável", () => {
    const lista = [p("z", "OBRA 28 - B"), p("y", "OBRA 28 - A"), p("x", "OBRA 28 - A")];
    expect(ordenarProjetos(lista).map((x) => x.id)).toEqual(["x", "y", "z"]);
  });

  it("não altera a lista recebida", () => {
    const lista = [p("a", "OBRA 2"), p("b", "OBRA 1")];
    ordenarProjetos(lista);
    expect(lista.map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("lerSelecaoDeProjeto (Prompt A, 12 e 22)", () => {
  const projetos = [p("A", "OBRA 1"), p("B", "OBRA 2")];

  it("sem parâmetro: nenhum — nunca o primeiro projeto", () => {
    expect(lerSelecaoDeProjeto(projetos, {})).toEqual({ tipo: "nenhum" });
  });

  it("id de projeto do tenant", () => {
    expect(lerSelecaoDeProjeto(projetos, { proj: "B" })).toEqual({ tipo: "projeto", projeto: projetos[1] });
  });

  it("aceita ?project= como sinônimo de ?proj=", () => {
    expect(lerSelecaoDeProjeto(projetos, { project: "A" })).toEqual({ tipo: "projeto", projeto: projetos[0] });
  });

  it("id fora da lista do tenant (outra empresa, apagado, lixo): nenhum", () => {
    expect(lerSelecaoDeProjeto(projetos, { proj: "de-outro-tenant" })).toEqual({ tipo: "nenhum" });
  });

  it("'all' só vale onde a tela oferece Todos", () => {
    expect(lerSelecaoDeProjeto(projetos, { proj: "all" })).toEqual({ tipo: "nenhum" });
    expect(lerSelecaoDeProjeto(projetos, { proj: "all" }, { permiteTodos: true })).toEqual({ tipo: "todos" });
  });

  it("parâmetro repetido: vale o primeiro", () => {
    expect(lerSelecaoDeProjeto(projetos, { proj: ["B", "A"] })).toEqual({ tipo: "projeto", projeto: projetos[1] });
  });
});


describe("escopo de relatório (Prompt A, 17–19; B12)", () => {
  const obra = (id: string, situacao: string | null) => ({ id, name: id, kind: "proj", situacao });
  const escritorio = (id: string) => ({ id, name: id, kind: "office", situacao: null });
  const lista = [obra("A", "Ativo"), obra("F", "Finalizado"), obra("S", null), escritorio("E")];

  it("lê obra, todos, ativos e finalizados; sem nada, nenhum", () => {
    expect(lerEscopoDeRelatorio(lista, { proj: "A" })).toEqual({ tipo: "projeto", projeto: lista[0] });
    expect(lerEscopoDeRelatorio(lista, { proj: "all" })).toEqual({ tipo: "todos" });
    expect(lerEscopoDeRelatorio(lista, { proj: "ativos" })).toEqual({ tipo: "ativos" });
    expect(lerEscopoDeRelatorio(lista, { project: "finalizados" })).toEqual({ tipo: "finalizados" });
    expect(lerEscopoDeRelatorio(lista, {})).toEqual({ tipo: "nenhum" });
    expect(lerEscopoDeRelatorio(lista, { proj: "de-outro-tenant" })).toEqual({ tipo: "nenhum" });
  });

  it("Todos = obras + escritórios, na mesma ordem (como antes)", () => {
    expect(projetosDoEscopo(lista, "todos")).toEqual({ projetos: lista, semSituacao: 0 });
  });

  it("Ativos/Finalizados: só obras com a situação; sem situação contam no aviso", () => {
    expect(projetosDoEscopo(lista, "ativos")).toEqual({ projetos: [lista[0]], semSituacao: 1 });
    expect(projetosDoEscopo(lista, "finalizados")).toEqual({ projetos: [lista[1]], semSituacao: 1 });
  });

  it("escritório nunca entra em Ativos/Finalizados, mesmo classificado", () => {
    const esc = { ...escritorio("E2"), situacao: "Ativo" };
    expect(projetosDoEscopo([esc], "ativos").projetos).toEqual([]);
  });

  it("ehEscopo", () => {
    expect(["all", "ativos", "finalizados"].every(ehEscopo)).toBe(true);
    expect(ehEscopo("uuid-qualquer")).toBe(false);
  });
});
