import { describe, it, expect } from "vitest";
import { escolherOrcamento, montarRelatorioCef, recorteDeCompetencia } from "./medicao-cef";

const orc = (rowKey: string, mes: string, valor: number) => ({ kind: "despesa", rowKey, mes, valor });
const med = (grupoCode: string, competencia: string, valor: number) => ({ grupoCode, competencia, valor });
/** Grupos de custo direto do plano da empresa (fixture). */
const grupos = ["1", "2", "3", "4"].map((codigo) => ({ codigo, nome: `Grupo ${codigo}` }));

describe("Prompt V · Relatório CEF (seção 3)", () => {
  it("3.2/3.3/3.10 — % do orçado medido; sem orçado ou sem medição é estado vazio, não 0%", () => {
    const r = montarRelatorioCef({ grupos, orcamento: [orc("1.1", "01/2026", 1000), orc("3.2", "01/2026", 500)], medicoes: [med("1", "01/2026", 250), med("2", "02/2026", 40)] });
    const l1 = r.linhas.find((l) => l.codigo === "1")!;
    expect(l1).toMatchObject({ orcado: 1000, realizado: 250, pct: 25, estado: "ok", excedeu: false });
    const l2 = r.linhas.find((l) => l.codigo === "2")!;
    expect(l2).toMatchObject({ orcado: null, realizado: 40, pct: null, estado: "sem_orcado" });
    const l3 = r.linhas.find((l) => l.codigo === "3")!;
    expect(l3).toMatchObject({ orcado: 500, realizado: null, pct: null, estado: "sem_medicao" });
    expect(r.linhas.find((l) => l.codigo === "4")).toMatchObject({ orcado: null, realizado: null, pct: null, estado: "vazio" });
    // receita no orçamento não entra
    const r2 = montarRelatorioCef({ grupos, orcamento: [{ kind: "receita", rowKey: "1", mes: "01/2026", valor: 999 }], medicoes: [] });
    expect(r2.totalOrcado).toBe(0);
    expect(r2.totalPct).toBeNull();
  });

  it("3.4 — linha e total acima de 100% são sinalizados, não truncados; excedente em R$", () => {
    const r = montarRelatorioCef({ grupos, orcamento: [orc("1", "01/2026", 100), orc("2", "01/2026", 100)], medicoes: [med("1", "01/2026", 150), med("2", "01/2026", 86)] });
    expect(r.linhas.find((l) => l.codigo === "1")).toMatchObject({ pct: 150, excedeu: true });
    expect(r.totalPct).toBe(118);
    expect(r.totalExcedeu).toBe(true);
    expect(r.excedente).toBe(36);
  });

  it("3.6 — retenção: total ≥ 95% avisa", () => {
    const ok = montarRelatorioCef({ grupos, orcamento: [orc("1", "01/2026", 100)], medicoes: [med("1", "01/2026", 94.99)] });
    expect(ok.retencao.atingida).toBe(false);
    const ret = montarRelatorioCef({ grupos, orcamento: [orc("1", "01/2026", 100)], medicoes: [med("1", "01/2026", 95)] });
    expect(ret.retencao).toEqual({ atingida: true, limite: 95 });
  });

  it("3.9 — acumulado por padrão; recorte só com os dois limites válidos e ordenados", () => {
    expect(recorteDeCompetencia("01/2026", null)).toEqual({ ativo: false, de: null, ate: null });
    expect(recorteDeCompetencia("03/2026", "01/2026").ativo).toBe(false);
    expect(recorteDeCompetencia("01/2026", "02/2026")).toEqual({ ativo: true, de: "01/2026", ate: "02/2026" });
    const orcamento = [orc("1", "01/2026", 100), orc("1", "03/2026", 100)];
    const medicoes = [med("1", "01/2026", 50), med("1", "03/2026", 50)];
    expect(montarRelatorioCef({ grupos, orcamento, medicoes }).linhas[0]).toMatchObject({ orcado: 200, realizado: 100 });
    expect(montarRelatorioCef({ grupos, orcamento, medicoes, recorte: recorteDeCompetencia("01/2026", "02/2026") }).linhas[0]).toMatchObject({ orcado: 100, realizado: 50 });
  });

  it("3.5 — não há coluna de referência: as linhas não carregam percentual fixo", () => {
    const r = montarRelatorioCef({ grupos, orcamento: [], medicoes: [] });
    expect(r.linhas).toHaveLength(grupos.length);
    expect(Object.keys(r.linhas[0]).sort()).toEqual(["codigo", "estado", "excedeu", "nome", "orcado", "pct", "realizado"]);
  });

  it("linhas = grupos de custo direto do plano da empresa; medição em grupo fora do plano não some", async () => {
    const { gruposDoRelatorioCef } = await import("./medicao-cef");
    const doPlano = gruposDoRelatorioCef([
      { kind: "cef", groupCode: "2.10", groupName: "Dez" },
      { kind: "cef", groupCode: "2.2", groupName: "Terceiros" },
      { kind: "cef", groupCode: "2.2", groupName: "Terceiros" },
      { kind: "complementar", groupCode: "3.1", groupName: "Administração" },
    ]);
    expect(doPlano).toEqual([{ codigo: "2.2", nome: "Terceiros" }, { codigo: "2.10", nome: "Dez" }]);
    const r = montarRelatorioCef({ grupos: doPlano, orcamento: [orc("2.2", "01/2026", 100), orc("3.1", "01/2026", 999)], medicoes: [med("2.2", "01/2026", 40), med("X", "01/2026", 5)] });
    expect(r.linhas.map((l) => l.codigo)).toEqual(["2.2", "2.10", "X"]);
    expect(r.totalOrcado).toBe(100); // despesa administrativa (3.1) não é custo direto
    expect(r.linhas[0]).toMatchObject({ orcado: 100, realizado: 40 });
    expect(r.linhas.find((l) => l.codigo === "X")).toMatchObject({ nome: "Grupo fora do plano", realizado: 5 });
    // grupo inativo (plano anterior) com dado: linha própria com o nome dele, e entra no total
    const inativo = gruposDoRelatorioCef([{ kind: "cef", groupCode: "ANT-1", groupName: "Serviços Preliminares Gerais", ativo: false }, { kind: "cef", groupCode: "2.2", groupName: "Terceiros" }]);
    expect(inativo.map((g) => g.codigo)).toEqual(["2.2"]);
    const r2 = montarRelatorioCef({ grupos: inativo, orcamento: [orc("ANT-1", "01/2026", 900)], medicoes: [med("ANT-1", "01/2026", 500)], nomes: new Map([["ANT-1", "Serviços Preliminares Gerais"]]) });
    expect(r2.linhas.find((l) => l.codigo === "ANT-1")).toMatchObject({ nome: "Serviços Preliminares Gerais", orcado: 900, realizado: 500 });
    expect(r2.totalOrcado).toBe(900);
  });

  it("3.8 — escolha do Orçamento: pedido > padrão > mais recente; declara o motivo", () => {
    const v = (id: string, kind: string, isDefault: boolean, dia: number) => ({ id, kind, isDefault, createdAt: new Date(2026, 0, dia) });
    expect(escolherOrcamento([v("a", "atual", true, 1)], null).motivo).toBe("nenhum");
    expect(escolherOrcamento([v("b1", "budget", false, 1)], null)).toMatchObject({ escolhido: { id: "b1" }, motivo: "unico" });
    const dois = [v("b1", "budget", false, 1), v("b2", "budget", false, 5), v("f", "forecast", true, 9)];
    expect(escolherOrcamento(dois, null)).toMatchObject({ escolhido: { id: "b2" }, motivo: "mais_recente" });
    expect(escolherOrcamento([...dois, v("b0", "budget", true, 3)], null)).toMatchObject({ escolhido: { id: "b0" }, motivo: "padrao" });
    expect(escolherOrcamento(dois, "b1")).toMatchObject({ escolhido: { id: "b1" }, motivo: "pedido" });
    // id de outra obra/tipo não é aceito
    expect(escolherOrcamento(dois, "f")).toMatchObject({ escolhido: { id: "b2" }, motivo: "mais_recente" });
  });
});
