import { describe, it, expect } from "vitest";
import { DEFAULT_INCC } from "@/lib/calc/constants";
import { MESES_DO_CALENDARIO_PADRAO, calendarioDoProjeto, calendarioDosProjetos } from "./calendario-projeto";

/** GA-9, Fase 2 — calendário de meses do projeto, sem a tabela INCC. */
describe("calendário do projeto", () => {
  it("os 48 meses padrão são exatamente os meses que todo projeto recebia na tabela INCC", () => {
    expect(MESES_DO_CALENDARIO_PADRAO).toHaveLength(48);
    expect([...MESES_DO_CALENDARIO_PADRAO]).toEqual(DEFAULT_INCC.map((r) => r.m));
  });

  it("projeto dentro de 05/2025–04/2029: o calendário é o mesmo de antes", () => {
    expect(calendarioDoProjeto({ startDate: "01/01/2026", endDate: "12/28/2027" })).toEqual(DEFAULT_INCC.map((r) => r.m));
    expect(calendarioDoProjeto({ startDate: null, endDate: null })).toEqual(DEFAULT_INCC.map((r) => r.m));
  });

  it("projeto que passa de 04/2029 ou começa antes de 05/2025 ganha os próprios meses, em ordem", () => {
    const c = calendarioDoProjeto({ startDate: "02/10/2025", endDate: "07/31/2029" });
    expect(c[0]).toBe("02/2025");
    expect(c.at(-1)).toBe("07/2029");
    expect(c).toHaveLength(48 + 3 + 3);
    expect(new Set(c).size).toBe(c.length);
  });

  it("vários projetos: a união; nenhum projeto: nenhum mês (como sem linha INCC)", () => {
    const c = calendarioDosProjetos([
      { startDate: "01/01/2026", endDate: "12/28/2026" },
      { startDate: "03/01/2029", endDate: "08/15/2029" },
    ]);
    expect(c.at(-1)).toBe("08/2029");
    expect(c).toHaveLength(52);
    expect(calendarioDosProjetos([])).toEqual([]);
    expect(calendarioDoProjeto(null)).toEqual([]);
  });
});
