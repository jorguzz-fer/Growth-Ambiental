import { describe, it, expect } from "vitest";
import { linhasDoPlano } from "@/lib/calc/plano-ambiental";
import {
  categoriaDaConta,
  categoriaHerdada,
  categoriaPadraoDaConta,
  categoriasPermitidasDaConta,
  despesasQueMudam,
  mapaDeCategorias,
  mapaParaDespesas,
  recusaDeCategoriaDaConta,
} from "./categoria-do-plano";

const conta = (code: string, groupCode: string, kind: "cef" | "complementar", natureza = "despesa", dreCategory: string | null = null) => ({ code, groupCode, kind, natureza, dreCategory });

describe("Prompt DP — categoria da DRE no Plano de Contas", () => {
  it("o padrão de cada conta do plano ambiental é a categoria dela; custo direto dos projetos é custo variável", () => {
    for (const c of linhasDoPlano("t")) {
      expect(categoriaPadraoDaConta({ ...conta(c.code, c.groupCode, c.kind, c.natureza) }), c.code).toBe(c.dreCategory);
      if (c.kind === "cef") expect(c.dreCategory, c.code).toBe("Custo Variável");
    }
  });

  it("boa prática: venda é despesa variável, estrutura é despesa fixa, juro e tarifa são despesa financeira", () => {
    expect(categoriaPadraoDaConta(conta("C.1", "C", "complementar"))).toBe("Despesa Variável");
    expect(categoriaPadraoDaConta(conta("M.2", "M", "complementar"))).toBe("Despesa Variável");
    expect(categoriaPadraoDaConta(conta("A.1", "A", "complementar"))).toBe("Despesa Fixa");
    expect(categoriaPadraoDaConta(conta("F.1", "F", "complementar"))).toBe("Despesa Fixa");
    expect(categoriaPadraoDaConta(conta("F.4", "F", "complementar"))).toBe("Despesas Financeiras");
  });

  it("conta fora do plano padrão cai no tipo; conta de receita é Receita", () => {
    expect(categoriaPadraoDaConta(conta("99.1", "99", "cef"))).toBe("Custo Variável");
    expect(categoriaPadraoDaConta(conta("Z.1", "Z", "complementar"))).toBe("Despesa Fixa");
    expect(categoriaPadraoDaConta(conta("R.1", "R", "complementar", "receita"))).toBe("Receita");
  });

  it("a escolhida vale sobre o padrão; escolha inválida cai no padrão", () => {
    expect(categoriaDaConta(conta("1.1", "1", "cef", "despesa", "Custo Fixo"))).toBe("Custo Fixo");
    expect(categoriaDaConta(conta("1.1", "1", "cef", "despesa", "qualquer"))).toBe("Custo Variável");
  });

  it("a escolha precisa servir à natureza", () => {
    expect(categoriasPermitidasDaConta("despesa")).not.toContain("Receita");
    expect(categoriasPermitidasDaConta("receita")).toEqual(["Receita"]);
    expect(recusaDeCategoriaDaConta("despesa", "Receita")).toMatch(/não pode ter a categoria Receita/);
    expect(recusaDeCategoriaDaConta("receita", "Custo Fixo")).toMatch(/Receita/);
    expect(recusaDeCategoriaDaConta("despesa", "Inventada")).toMatch(/da lista/);
    expect(recusaDeCategoriaDaConta("despesa", "Despesa Fixa")).toBeNull();
  });

  it("a despesa herda a da conta; sem conta no plano mantém a escolhida; conta de receita é recusada", () => {
    const mapa = mapaDeCategorias([conta("1.1", "1", "cef"), conta("R.1", "R", "complementar", "receita")]);
    expect(categoriaHerdada(mapa, "1.1", "Despesa Fixa")).toEqual({ ok: true, categoria: "Custo Variável", herdada: true });
    expect(categoriaHerdada(mapa, "legado", "Despesa Fixa")).toEqual({ ok: true, categoria: "Despesa Fixa", herdada: false });
    expect(categoriaHerdada(mapa, null, "Despesa Fixa")).toEqual({ ok: true, categoria: "Despesa Fixa", herdada: false });
    const r = categoriaHerdada(mapa, "R.1", "Despesa Fixa");
    expect(r.ok).toBe(false);
  });

  it("prévia: conta e par de categorias, só o que muda; conta de receita não entra no mapa das despesas", () => {
    const mapa = mapaParaDespesas(mapaDeCategorias([conta("1.1", "1", "cef"), conta("A.1", "A", "complementar"), conta("R.1", "R", "complementar", "receita")]));
    expect(mapa).not.toHaveProperty("R.1");
    const m = despesasQueMudam(
      [
        { contaCef: "1.1", categoriaDre: "Despesa Fixa", valor: 100 },
        { contaCef: "1.1", categoriaDre: "Despesa Fixa", valor: 50.5 },
        { contaCef: "1.1", categoriaDre: "Custo Variável", valor: 999 },
        { contaCef: "A.1", categoriaDre: null, valor: 10 },
        { contaCef: "R.1", categoriaDre: "Despesa Fixa", valor: 7 },
        { contaCef: null, categoriaDre: "Custo Fixo", valor: 3 },
      ],
      mapa,
    );
    expect(m).toEqual([
      { conta: "1.1", de: "Despesa Fixa", para: "Custo Variável", despesas: 2, valor: 150.5 },
      { conta: "A.1", de: "(sem categoria)", para: "Despesa Fixa", despesas: 1, valor: 10 },
    ]);
  });
});
