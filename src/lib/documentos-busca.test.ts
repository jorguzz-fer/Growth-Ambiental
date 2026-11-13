import { describe, it, expect } from "vitest";
import { casaBusca, origemDoDocumento, podeVerDocumento } from "./documentos-busca";
import { defaultPermissions } from "./permissions";

describe("Busca de documentos — origem e permissão", () => {
  it("a origem é a mais específica", () => {
    expect(origemDoDocumento({ contratoId: "c", contratoMedicaoId: "m" })).toBe("medicao");
    expect(origemDoDocumento({ contratoId: "c", projectId: "p" })).toBe("contrato");
    expect(origemDoDocumento({ despesaId: "d", projectId: "p" })).toBe("despesa");
    expect(origemDoDocumento({ projetoFaseId: "f" })).toBe("projeto");
    expect(origemDoDocumento({})).toBe("outro");
  });
  it("cada origem exige a tela de origem; funcionário exige dados pessoais; nada amplia acesso", () => {
    const eng = defaultPermissions("engenheiro");
    expect(podeVerDocumento(eng, { contratoId: "c" })).toBe(true);
    expect(podeVerDocumento(eng, { despesaId: "d" })).toBe(false);
    expect(podeVerDocumento(eng, { funcionarioId: "f" })).toBe(false);
    const owner = defaultPermissions("owner");
    expect(podeVerDocumento(owner, { funcionarioId: "f" })).toBe(!!owner.funcionariosdados?.ver);
    expect(podeVerDocumento(owner, {})).toBe(false);
  });
  it("busca por termos, sem acento", () => {
    expect(casaBusca("relatorio fauna", ["Relatório de Fauna.pdf", "Relatório técnico"])).toBe(true);
    expect(casaBusca("medicao 3", ["Medição 2.pdf"])).toBe(false);
    expect(casaBusca("", ["x"])).toBe(true);
  });
});
