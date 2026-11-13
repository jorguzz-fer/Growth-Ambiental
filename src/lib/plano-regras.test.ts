import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  arvoreDoModelo,
  atrasado,
  BIBLIOTECA_INICIAL,
  consolidar,
  desvioEmDias,
  filtrarSelecao,
  linhaDeBase,
  MODELOS_SUGERIDOS,
  progressoDaFase,
  propostaDaCris,
  recusaDaSelecao,
  recusaDeHierarquia,
  type FaseSelecionada,
} from "./plano-regras";

const fase = (nome: string, marcado: boolean, atividades: [string, boolean][] = []): FaseSelecionada => ({
  chave: nome,
  nome,
  marcado,
  atividades: atividades.map(([n, m]) => ({ chave: n, nome: n, marcado: m, subatividades: [] })),
  entregas: [],
});

describe("Planejamento — seleção individual (§7)", () => {
  it("grava só o marcado: fase inteira de fora, atividades parciais, sem completar nada", () => {
    const sel = filtrarSelecao([
      fase("Mobilização", true, [["Análise documental", true], ["Logística", false]]),
      fase("Diagnóstico preliminar", false, [["Levantamento bibliográfico", true]]),
      fase("Monitoramento", true, []),
      fase("   ", true, [["x", true]]),
    ]);
    expect(sel.map((f) => f.nome)).toEqual(["Mobilização", "Monitoramento"]);
    expect(sel[0].atividades.map((a) => a.nome)).toEqual(["Análise documental"]);
    expect(sel[1].atividades).toEqual([]);
  });

  it("seleção vazia é válida (começar em branco); datas e tamanhos são conferidos", () => {
    expect(recusaDaSelecao([])).toBeNull();
    expect(recusaDaSelecao([{ ...fase("F", true), inicio: "05/10/2027", termino: "05/01/2027" }])).toMatch(/termina antes/);
    expect(recusaDaSelecao([{ ...fase("F", true), inicio: "31/12/2027" }])).toMatch(/Data inválida/);
  });

  it("árvore do modelo: só ativos; marcado = sugerido; entregas separadas das atividades", () => {
    const arv = arvoreDoModelo(
      [
        { id: "f1", nome: "A", ordem: 2, ativo: true, sugerida: true },
        { id: "f2", nome: "B", ordem: 1, ativo: true, sugerida: false },
        { id: "f3", nome: "C", ordem: 3, ativo: false, sugerida: true },
      ],
      [
        { id: "a1", faseId: "f1", parentId: null, tipo: "atividade", nome: "a1", ordem: 1, ativo: true, sugerida: true },
        { id: "a2", faseId: "f1", parentId: null, tipo: "atividade", nome: "a2", ordem: 2, ativo: true, sugerida: false },
        { id: "s1", faseId: "f1", parentId: "a1", tipo: "atividade", nome: "s1", ordem: 1, ativo: true, sugerida: true },
        { id: "e1", faseId: "f1", parentId: null, tipo: "entrega", nome: "e1", ordem: 9, ativo: true, sugerida: true },
        { id: "x", faseId: "f1", parentId: null, tipo: "atividade", nome: "x", ordem: 3, ativo: false, sugerida: true },
      ],
    );
    expect(arv.map((f) => [f.nome, f.marcado])).toEqual([["B", false], ["A", true]]);
    const a = arv[1];
    expect(a.atividades.map((x) => [x.nome, x.marcado, x.subatividades.map((s) => s.nome)])).toEqual([["a1", true, ["s1"]], ["a2", false, []]]);
    expect(a.entregas.map((e) => e.nome)).toEqual(["e1"]);
    expect(a.atividades[0].origemModeloId).toBe("a1");
  });
});

describe("Planejamento — hierarquia (§20)", () => {
  const item = { id: "a", faseId: "f", projectId: "p" };
  it("subatividade só sob atividade principal da mesma fase; sem ciclos nem 3 níveis", () => {
    expect(recusaDeHierarquia(item, null, false)).toBeNull();
    expect(recusaDeHierarquia(item, { id: "b", faseId: "f", projectId: "p", parentId: null }, false)).toBeNull();
    expect(recusaDeHierarquia(item, { id: "a", faseId: "f", projectId: "p", parentId: null }, false)).toMatch(/si mesma/);
    expect(recusaDeHierarquia(item, { id: "b", faseId: "g", projectId: "p", parentId: null }, false)).toMatch(/mesma fase/);
    expect(recusaDeHierarquia(item, { id: "b", faseId: "f", projectId: "q", parentId: null }, false)).toMatch(/mesma fase/);
    expect(recusaDeHierarquia(item, { id: "b", faseId: "f", projectId: "p", parentId: "c" }, false)).toMatch(/não tem subatividade/);
    expect(recusaDeHierarquia(item, { id: "b", faseId: "f", projectId: "p", parentId: null }, true)).toMatch(/tem subatividades/);
  });
});

describe("Planejamento — progresso físico (§18)", () => {
  const it2 = (id: string, percentual: number | null, extra: Record<string, unknown> = {}) => ({ id, status: "em_andamento", percentual, ...extra });
  it("não presume peso igual: sem peso nem horas, não consolida", () => {
    const p = consolidar([it2("a", 50), it2("b", 10)]);
    expect(p.percentual).toBeNull();
    expect(p.motivo).toMatch(/peso ou as horas/);
  });
  it("pondera por peso, ou por horas previstas, quando todos têm", () => {
    expect(consolidar([it2("a", 50, { peso: 3 }), it2("b", 10, { peso: 1 })])).toMatchObject({ percentual: 40, base: "pesos" });
    expect(consolidar([it2("a", 100, { horasPrevistas: 10 }), it2("b", 0, { horasPrevistas: 30 })])).toMatchObject({ percentual: 25, base: "horas" });
  });
  it("casos sem ambiguidade: tudo concluído = 100; cancelado não entra; falta percentual = nulo", () => {
    expect(consolidar([{ id: "a", status: "concluida", percentual: null }, { id: "b", status: "concluida", percentual: null }])).toMatchObject({ percentual: 100 });
    expect(consolidar([it2("a", 0), { id: "b", status: "cancelada", percentual: 80 }])).toMatchObject({ percentual: 0 });
    expect(consolidar([it2("a", 50, { peso: 1 }), it2("b", null, { peso: 1 })]).percentual).toBeNull();
  });
  it("fase: o informado vale; senão consolida as atividades principais (subatividades entram via a atividade)", () => {
    expect(progressoDaFase({ id: "f", status: "em_andamento", percentual: 30 }, [])).toMatchObject({ percentual: 30, base: "informado" });
    const ats = [
      { id: "a", parentId: null, status: "em_andamento", percentual: null, peso: 1 },
      { id: "s1", parentId: "a", status: "concluida", percentual: null },
      { id: "s2", parentId: "a", status: "concluida", percentual: null },
      { id: "b", parentId: null, status: "em_andamento", percentual: 0, peso: 1 },
    ];
    expect(progressoDaFase({ id: "f", status: "em_andamento", percentual: null }, ats)).toMatchObject({ percentual: 50, base: "pesos" });
  });
});

describe("Planejamento — prazos e linha de base (§14)", () => {
  it("primeira data vira a original; mudar depois é reprogramação e a original fica", () => {
    expect(linhaDeBase(null, null, "04/15/2027")).toEqual({ original: "04/15/2027", reprogramou: false });
    expect(linhaDeBase("04/15/2027", "04/15/2027", "04/30/2027")).toEqual({ original: "04/15/2027", reprogramou: true });
    expect(desvioEmDias("04/15/2027", "04/30/2027")).toBe(15);
  });
  it("atraso: venceu e não concluiu/cancelou", () => {
    expect(atrasado({ terminoPrevisto: "01/10/2027", status: "em_andamento" }, "02/01/2027")).toBe(true);
    expect(atrasado({ terminoPrevisto: "01/10/2027", status: "concluida" }, "02/01/2027")).toBe(false);
    expect(atrasado({ terminoPrevisto: "01/10/2027", terminoReal: "01/09/2027", status: "em_andamento" }, "02/01/2027")).toBe(false);
  });
});

describe("Planejamento — proposta da Cris (§12)", () => {
  const bib = [{ id: "bf1", nome: "Planejamento e mobilização" }, { id: "ba1", nome: "Análise documental" }];
  it("lê fases, atividades (com subatividades), entregas, origem e trecho; casa com a biblioteca pelo nome", () => {
    const p = propostaDaCris(
      {
        fase1_nome: "Planejamento e mobilização",
        fase1_origem: "biblioteca",
        fase1_trecho: "item 3.1 do plano",
        fase1_inicio: "02/01/2027",
        fase1_atividades: "Análise documental | biblioteca | 3.1\nMobilização da equipe de campo | documento | 3.2\n- Compra de EPI | sugestão",
        fase1_entregas: "Plano de trabalho revisado | 02/20/2027 | documento",
        fase3_nome: "Monitoramento das frentes",
        fase3_origem: "documento",
      },
      bib,
    );
    expect(p.map((f) => f.nome)).toEqual(["Planejamento e mobilização", "Monitoramento das frentes"]);
    expect(p[0]).toMatchObject({ origem: "biblioteca", origemModeloId: "bf1", trecho: "item 3.1 do plano", inicio: "02/01/2027" });
    expect(p[0].atividades.map((a) => [a.nome, a.origem, a.origemModeloId, a.subatividades.map((s) => s.nome)])).toEqual([
      ["Análise documental", "biblioteca", "ba1", []],
      ["Mobilização da equipe de campo", "documento", null, ["Compra de EPI"]],
    ]);
    expect(p[0].atividades[1].subatividades[0].origem).toBe("sugestao");
    expect(p[0].entregas[0]).toMatchObject({ nome: "Plano de trabalho revisado", data: "02/20/2027", origem: "documento" });
    expect(p[1].atividades).toEqual([]);
  });
  it("não completa com fases da biblioteca que o documento não trouxe", () => {
    const p = propostaDaCris({ fase1_nome: "Monitoramento", fase1_origem: "documento" }, bib);
    expect(p).toHaveLength(1);
  });
});

describe("Planejamento — catálogo", () => {
  it("biblioteca do código = biblioteca da migração 0078 (mesmas fases e atividades)", () => {
    const sql = readFileSync("src/lib/db/migrations/0078_planejamento_projetos.sql", "utf8");
    for (const f of BIBLIOTECA_INICIAL) {
      expect(sql, f.nome).toContain(`'${f.nome}'`);
      for (const a of f.atividades) expect(sql, a).toContain(`'${f.nome}', '${a.replace(/'/g, "''")}'`);
    }
  });
  it("11 modelos sugeridos, com chaves únicas e sem fase vazia", () => {
    expect(MODELOS_SUGERIDOS).toHaveLength(11);
    expect(new Set(MODELOS_SUGERIDOS.map((m) => m.chave)).size).toBe(11);
    for (const m of MODELOS_SUGERIDOS) for (const f of m.fases) expect(f.atividades.length, `${m.nome}/${f.nome}`).toBeGreaterThan(0);
  });
});
