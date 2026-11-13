import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

/**
 * Fase 3, Etapa 3 — as telas de lançamento que se oferecem à Cris. Cada uma
 * registra o formulário com `useCrisFormulario`; a Cris só PREENCHE, e quem
 * grava é o botão da tela (regra 4.2.1). Dado pessoal fica de fora do
 * formulário (o cliente, por exemplo, não vai ao modelo).
 */
const TELAS: [arquivo: string, id: string][] = [
  ["src/components/app/budget-planning-screen.tsx", "formularioDoOrcamento"],
  ["src/components/app/project-manager.tsx", "formularioDoProjeto"],
  ["src/components/app/planocontas-cris.tsx", "formularioDoPlano"],
  ["src/components/app/contas-receber-manager.tsx", '"conta-receber-nova"'],
  ["src/components/app/liberacao-form.tsx", '"liberacao-nova"'],
  ["src/components/app/permuta-form.tsx", '"permuta-nova"'],
  ["src/components/app/despesa-form.tsx", '"despesa-nova"'],
  ["src/components/app/acerto-manager.tsx", '"acerto-vincular"'],
  ["src/components/app/restituicoes-manager.tsx", '"ressarcimento"'],
  ["src/components/app/fornecedor-form.tsx", "formularioDoFornecedor"],
  ["src/components/app/medicao-form.tsx", "formularioDaMedicao"],
  ["src/components/app/estoque-manager.tsx", "formularioDoMovimento"],
  ["src/components/app/funcionarios-manager.tsx", "formularioDoFuncionario"],
  ["src/components/app/papel-e-telas.tsx", '"usuario-novo"'],
  ["src/components/app/numeracao-form.tsx", '"numeracao-despesas"'],
  ["src/components/app/simulator-form.tsx", "formularioDoSimulador"],
  ["src/components/app/cris-no-formulario.tsx", "useCrisFormulario("],
  ["src/components/app/plano/criar-plano.tsx", "formularioDoPlanoDeTrabalho"],
];

import { TIPOS_DOC_PERMUTA } from "./permuta-regras";

describe("Etapa 3 — telas de lançamento com a Cris", () => {
  it("Prompt P2: o ativo de permuta aceita foto como documento", () => {
    expect(TIPOS_DOC_PERMUTA).toContain("Foto do ativo");
  });

  it.each(TELAS)("%s registra o formulário", (arquivo, id) => {
    const src = readFileSync(arquivo, "utf8");
    expect(src).toContain("useCrisFormulario(");
    expect(src).toContain(id);
  });

  it.each([
    ["src/app/(app)/empresa/page.tsx", '"empresa-dados-fiscais"'],
    ["src/app/(app)/acoes/page.tsx", '"auditoria-filtro"'],
  ])("%s oferece o formulário da página à Cris", (arquivo, id) => {
    const src = readFileSync(arquivo, "utf8");
    expect(src).toContain("<CrisNoFormulario");
    expect(src).toContain(id);
  });

  it("Empresa não oferece o ambiente de emissão à Cris", () => {
    const src = readFileSync("src/app/(app)/empresa/page.tsx", "utf8");
    const bloco = src.slice(src.indexOf('id="empresa-dados-fiscais"'), src.indexOf("opcoes={{", src.indexOf('id="empresa-dados-fiscais"')));
    expect(bloco).not.toContain("fiscalAmbiente");
  });

  it("Contas a Receber não oferece o cliente à Cris", () => {
    const src = readFileSync("src/components/app/contas-receber-manager.tsx", "utf8");
    const bloco = src.slice(src.indexOf('id: "conta-receber-nova"'), src.indexOf("(p) =>", src.indexOf('id: "conta-receber-nova"')));
    expect(bloco).not.toMatch(/cliente/i);
  });
});
