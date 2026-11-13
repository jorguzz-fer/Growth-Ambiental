import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

/**
 * Prompt IAR — toda tela de relatório entrega à Cris o resumo do que mostra,
 * para ela analisar e simular sobre esses números (regra 2 de `regrasDaCris`).
 */
const TELAS_DE_RELATORIO = [
  "src/app/(app)/dashboard/page.tsx",
  "src/app/(app)/dre/page.tsx",
  "src/app/(app)/dre/analitica/page.tsx",
  "src/app/(app)/fluxocaixa/page.tsx",
  "src/app/(app)/fluxocaixa/analitico/page.tsx",
  "src/app/(app)/resumo/page.tsx",
  "src/app/(app)/relatorios/page.tsx",
  "src/app/(app)/caixa/page.tsx",
];

describe("Prompt IAR — a Cris nas telas de relatório", () => {
  it.each(TELAS_DE_RELATORIO)("%s registra o resumo da tela", (f) => {
    const src = readFileSync(f, "utf8");
    expect(src).toContain("<CrisDaTela");
    expect(src).toMatch(/sugestoes=\{\[/);
  });

  it("Resumo registra nos dois modos (projeto e consolidado); a Projeção de Receitas por unidade saiu", () => {
    expect(readFileSync("src/app/(app)/resumo/page.tsx", "utf8").match(/<CrisDaTela/g)).toHaveLength(2);
  });
});
