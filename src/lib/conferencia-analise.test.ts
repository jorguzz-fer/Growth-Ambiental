import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { TEXTO_SEM_PENDENCIA, analisarConferencia, type LinhaAnalisada } from "./conferencia-analise";

const hoje = new Date("2026-10-01T12:00:00Z");
let n = 0;
const l = (p: Partial<LinhaAnalisada>): LinhaAnalisada => ({
  id: `id-${++n}`,
  fornecedorId: null,
  fornecedorNome: null,
  contaCef: null,
  competencia: "09/2026",
  valor: 100,
  versao: "atual",
  motivos: ["sem_categoria"],
  criadoEm: new Date("2026-09-20T00:00:00Z"),
  autor: null,
  ...p,
});

describe("Prompt AN · Parte 7 — assistente da Conferência", () => {
  const linhas = [
    l({ fornecedorNome: "ABC Materiais", contaCef: "1.2", valor: 500, autor: "Ana" }),
    l({ fornecedorNome: "ABC Materiais", contaCef: "1.2", valor: 300, autor: "Ana" }),
    l({ fornecedorNome: "ABC Materiais", valor: 200, motivos: ["sem_competencia"], competencia: null, criadoEm: new Date("2025-01-10T00:00:00Z"), autor: "Ana" }),
    l({ fornecedorNome: "Caixa Econômica", valor: 50, motivos: ["categoria_credora"], versao: "budget" }),
    l({ valor: 0, motivos: ["valor_zero", "cancelado"] }),
  ];
  const a = analisarConferencia(linhas, hoje);

  it("cancelada fica fora da análise", () => {
    expect(a.total).toBe(4);
  });

  it("agrupar por causa provável: o fornecedor com 3 vira um grupo", () => {
    expect(a.grupos[0]).toEqual({ criterio: "fornecedor", rotulo: "ABC Materiais", quantos: 3, valor: 1000 });
    expect(a.grupos.some((g) => g.criterio === "conta do plano" && g.rotulo === "1.2" && g.quantos === 2)).toBe(true);
  });

  it("o que tira dos relatórios, com o efeito verdadeiro de cada motivo", () => {
    const porCodigo = Object.fromEntries(a.efeitos.map((e) => [e.codigo, e]));
    expect(porCodigo.sem_categoria).toMatchObject({ quantos: 2, valor: 800, efeito: "não entra em nenhuma linha da DRE" });
    expect(porCodigo.sem_competencia.efeito).toMatch(/só no Acumulado/);
    expect(porCodigo.categoria_credora).toMatchObject({ foraDaAtual: 1, efeito: expect.stringMatching(/Receita/) });
  });

  it("desde quando: acúmulo antigo × corrente", () => {
    const d = Object.fromEntries(a.desde.map((x) => [x.codigo, x]));
    expect(d.sem_competencia.corrente).toBe(false);
    expect(d.sem_categoria.corrente).toBe(true);
  });

  it("padrão no que falta: fornecedor, competência e quem lançou concentram", () => {
    expect(a.padroes.map((p) => [p.dimensao, p.rotulo, p.quantos])).toEqual([
      ["fornecedor", "ABC Materiais", 3],
      ["competência", "09/2026", 3],
      ["quem lançou", "Ana", 3],
    ]);
  });

  it("21 — sem pendência, o texto não atesta que está certo", () => {
    expect(analisarConferencia([], hoje).total).toBe(0);
    expect(TEXTO_SEM_PENDENCIA).toMatch(/não quer dizer que a classificação esteja certa/);
  });

  it("20/22 — o painel não importa action, não reclassifica e não propõe categoria", () => {
    const src = readFileSync("src/components/app/assistente-conferencia.tsx", "utf8");
    expect(src).not.toMatch(/@\/lib\/actions/);
    expect(src).not.toMatch(/reclassificar/i);
    expect(src).not.toMatch(/categoriasDeDespesa|CATEGORIAS_DRE/);
    const mod = readFileSync("src/lib/conferencia-analise.ts", "utf8");
    expect(mod).not.toMatch(/from "@\/lib\/(db|actions|ai)/);
  });
});
