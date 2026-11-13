import { describe, it, expect } from "vitest";
import { PLANO_CONTAS } from "./constants";
import { PLANO_CONTAS_AMBIENTAL, PLANO_CONTAS_PADRAO, linhasDoPlano } from "./plano-ambiental";
import { categoriaPadraoDaConta } from "@/lib/categoria-do-plano";

const linhas = linhasDoPlano(PLANO_CONTAS_AMBIENTAL, "t1");
const padrao = (code: string) => {
  const l = linhas.find((x) => x.code === code);
  if (!l) throw new Error(`conta ${code} não está no plano`);
  return categoriaPadraoDaConta(l);
};

describe("Plano de Contas padrão — consultoria ambiental", () => {
  it("é o plano que conta nova recebe", () => {
    expect(PLANO_CONTAS_PADRAO).toBe(PLANO_CONTAS_AMBIENTAL);
  });

  it("códigos únicos e no padrão do grupo (grupo.n)", () => {
    const codes = linhas.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const l of linhas) expect(l.code.startsWith(`${l.groupCode}.`), l.code).toBe(true);
    const grupos = [...PLANO_CONTAS_AMBIENTAL.obra, ...PLANO_CONTAS_AMBIENTAL.complementar].map((g) => g.id);
    expect(new Set(grupos).size).toBe(grupos.length);
  });

  it("custo direto dos projetos é custo variável, nunca despesa", () => {
    for (const l of linhas.filter((x) => x.kind === "cef")) {
      expect(l.natureza, l.code).toBe("despesa");
      expect(categoriaPadraoDaConta(l), l.code).toBe("Custo Variável");
    }
  });

  it("o grupo R é de receita, e só ele", () => {
    for (const l of linhas) {
      const receita = l.groupCode === "R";
      expect(l.natureza, l.code).toBe(receita ? "receita" : "despesa");
      expect(categoriaPadraoDaConta(l) === "Receita", l.code).toBe(receita);
    }
  });

  it("de-para da DRE dos grupos de estrutura", () => {
    expect(padrao("IMP.1")).toBe("Despesa Variável"); // ISS acompanha a receita
    expect(padrao("IMP.4")).toBe("Despesa Variável");
    expect(padrao("C.2")).toBe("Despesa Variável");
    expect(padrao("M.2")).toBe("Despesa Variável");
    expect(padrao("RH.1")).toBe("Custo Fixo");
    expect(padrao("RH.4")).toBe("Custo Variável"); // EPI de campo
    expect(padrao("TI.3")).toBe("Despesa Fixa");
    expect(padrao("A.1")).toBe("Despesa Fixa");
    expect(padrao("J.1")).toBe("Despesa Fixa");
    expect(padrao("F.1")).toBe("Despesa Fixa");
    for (const c of ["F.2", "F.4", "F.6", "F.7"]) expect(padrao(c), c).toBe("Despesas Financeiras");
  });

  it("grupo F igual ao do plano de construção (F.6–F.9 carregam regras contábeis)", () => {
    const f = (p: typeof PLANO_CONTAS) => p.complementar.find((g) => g.id === "F")!.sub.map((s) => s.id);
    expect(f(PLANO_CONTAS_AMBIENTAL)).toEqual(f(PLANO_CONTAS));
  });

  it("linhas trazem tenant, grupo, tipo e natureza", () => {
    expect(linhas.find((l) => l.code === "1.2")).toEqual({
      tenantId: "t1",
      code: "1.2",
      name: "Análises laboratoriais (água, solo, ar, efluentes)",
      groupCode: "1",
      groupName: "Serviços técnicos de terceiros",
      kind: "cef",
      natureza: "despesa",
    });
    expect(linhas.find((l) => l.code === "R.1")).toMatchObject({ kind: "complementar", natureza: "receita" });
  });
});
