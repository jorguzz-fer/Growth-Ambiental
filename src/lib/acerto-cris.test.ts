import { describe, it, expect } from "vitest";
import { marcarDespesas } from "./acerto-cris";

/** Prompt T2 — a Cris marca as despesas do acerto; só marca, quem conclui é a tela. */
const D = [
  { id: "a", numDoc: "EXM-2026-001682", fornecedorNome: "Concreteira X" },
  { id: "b", numDoc: "EXM-2026-001683", fornecedorNome: "Concreteira X" },
  { id: "c", numDoc: "EXM-2026-000010", fornecedorNome: "Elétrica Y" },
  { id: "d", numDoc: "EXM-2025-000010", fornecedorNome: "Elétrica Y" },
  { id: "e", numDoc: null, fornecedorNome: "Sem PED" },
];

describe("Prompt T2 · marcação do acerto", () => {
  it("acha pelo número inteiro ou pelo final", () => {
    expect(marcarDespesas(D, { peds: "EXM-2026-001682, 1683" })).toEqual({ ids: ["a", "b"], naoAchados: [] });
  });
  it("final ambíguo não marca e avisa", () => {
    expect(marcarDespesas(D, { peds: "10" })).toEqual({ ids: [], naoAchados: ["10 (mais de um)"] });
  });
  it("número que não existe é avisado", () => {
    expect(marcarDespesas(D, { peds: "999999" }).naoAchados).toEqual(["999999"]);
  });
  it("em lote, todas do fornecedor (sem duplicar)", () => {
    expect(marcarDespesas(D, { peds: "1682", fornecedorNome: "Concreteira X" }).ids).toEqual(["a", "b"]);
  });
  it("vazio não marca nada", () => {
    expect(marcarDespesas(D, {})).toEqual({ ids: [], naoAchados: [] });
  });
});
