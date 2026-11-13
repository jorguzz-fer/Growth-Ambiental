import { describe, it, expect } from "vitest";
import { baseDeRateioPorHoras, competenciaDaData, distribuicaoDeHoras, recusaDoApontamento } from "./horas-regras";

const base = { tipo: "realizado", funcionarioId: "f", stakeholderId: null, projectId: "p", atividadeInterna: null, data: "03/10/2027", horas: 8 };

describe("Apontamento de horas — regras", () => {
  it("valida profissional (um só), destino, data e horas", () => {
    expect(recusaDoApontamento(base)).toBeNull();
    expect(recusaDoApontamento({ ...base, stakeholderId: "s" })).toMatch(/um profissional/);
    expect(recusaDoApontamento({ ...base, funcionarioId: null })).toMatch(/um profissional/);
    expect(recusaDoApontamento({ ...base, projectId: null })).toMatch(/atividade interna/);
    expect(recusaDoApontamento({ ...base, projectId: null, atividadeInterna: "Administrativo" })).toBeNull();
    expect(recusaDoApontamento({ ...base, data: "2027-03-10" })).toMatch(/data/);
    expect(recusaDoApontamento({ ...base, horas: 0 })).toMatch(/maior que zero/);
    expect(recusaDoApontamento({ ...base, horas: 25 })).toMatch(/24 horas/);
    expect(recusaDoApontamento({ ...base, tipo: "planejado", horas: 160 })).toBeNull();
    expect(recusaDoApontamento({ ...base, tipo: "planejado", horas: 800 })).toMatch(/744/);
    expect(recusaDoApontamento({ ...base, tipo: "x" })).toMatch(/Tipo/);
    expect(competenciaDaData("03/10/2027")).toBe("03/2027");
  });

  it("exemplo: Projeto A 12 h, Projeto B 20 h, Administrativo 8 h — distribuição e previsto × realizado", () => {
    const d = distribuicaoDeHoras([
      { tipo: "planejado", profissional: "Ana", destino: "Projeto A", horas: 10, custoHora: null },
      { tipo: "realizado", profissional: "Ana", destino: "Projeto A", horas: 12, custoHora: 100 },
      { tipo: "realizado", profissional: "Ana", destino: "Projeto B", horas: 20, custoHora: 100 },
      { tipo: "realizado", profissional: "Ana", destino: "Administrativo", horas: 8, custoHora: null },
    ]);
    const a = d.linhas.find((l) => l.destino === "Projeto A")!;
    expect(a).toMatchObject({ planejadas: 10, realizadas: 12, desvio: 2, custoGerencial: 1200 });
    // sem base de custo-hora: custo "—", nunca zero inventado
    expect(d.linhas.find((l) => l.destino === "Administrativo")).toMatchObject({ custoGerencial: null, horasSemBase: 8 });
    expect(d.total).toMatchObject({ realizadas: 40, planejadas: 10, custoGerencial: 3200, horasSemBase: 8 });
  });

  it("base de rateio por horas fecha 100%, só com projetos (administrativo fora)", () => {
    const b = baseDeRateioPorHoras([
      { projectId: "A", horas: 12, tipo: "realizado" },
      { projectId: "B", horas: 20, tipo: "realizado" },
      { projectId: null, horas: 8, tipo: "realizado" },
      { projectId: "A", horas: 50, tipo: "planejado" },
    ]);
    expect(b).toEqual([
      { projectId: "B", horas: 20, percentual: 62.5 },
      { projectId: "A", horas: 12, percentual: 37.5 },
    ]);
    const tres = baseDeRateioPorHoras([1, 1, 1].map((h, i) => ({ projectId: `P${i}`, horas: h, tipo: "realizado" })));
    expect(tres.reduce((s, l) => s + l.percentual, 0)).toBeCloseTo(100, 6);
    expect(baseDeRateioPorHoras([])).toEqual([]);
  });
});
