import { describe, it, expect } from "vitest";
import { dataDaFicha, formularioDoFuncionario, valoresDoFuncionario } from "./funcionario-cris";
import { sanitizarDados } from "./cris";

/** Prompt Z2 — a Cris ajuda a cadastrar o funcionário, sem dado pessoal (BE-2). */
const OBRAS = [{ id: "p1", nome: "PROJETO A" }];

describe("Prompt Z2 · Funcionários com a Cris", () => {
  it("o formulário só tem o vínculo de trabalho, nenhum dado pessoal", () => {
    const nomes = formularioDoFuncionario(OBRAS).campos.map((c) => c.nome);
    expect(nomes).toEqual(["cargo", "setor", "obra", "tipoContrato", "prazoContrato", "admissao", "obs"]);
    for (const proibido of ["nome", "cpf", "rg", "pis", "ctps", "nascimento", "nomeMae", "endereco", "cep", "salario", "jornada", "bancoConta", "pixChave"]) {
      expect(nomes).not.toContain(proibido);
    }
    // nenhum campo do formulário cairia no filtro de dado pessoal da Cris
    const filtrado = sanitizarDados(Object.fromEntries(nomes.map((n) => [n, "x"]))) as Record<string, unknown>;
    expect(Object.keys(filtrado)).toEqual(nomes);
  });

  it("a proposta vira os campos da ficha; o projeto vira o id; a data vira AAAA-MM-DD", () => {
    const r = valoresDoFuncionario({ cargo: "Técnico de campo", obra: "PROJETO A", tipoContrato: "Experiência", admissao: "11/03/2026" }, OBRAS);
    expect(r).toEqual({ valores: { cargo: "Técnico de campo", tipoContrato: "Experiência", projectId: "p1", admissao: "2026-11-03" }, avisos: [] });
  });

  it("data que não dá para ler fica de fora com aviso", () => {
    expect(dataDaFicha("2026-03-11")).toBe("2026-03-11");
    expect(dataDaFicha("13/40/2026")).toBeNull();
    expect(valoresDoFuncionario({ admissao: "amanhã" }, OBRAS).avisos).toHaveLength(1);
  });
});
