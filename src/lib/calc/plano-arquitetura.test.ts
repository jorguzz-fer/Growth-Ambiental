import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Prompt AR, Fase 2 (Revisão 4), AR-T2 — ninguém CALCULA lendo o plano de
 * pagamento direto: a leitura é `lerPlano` (`src/lib/calc/plano.ts`).
 *
 * Fora da regra, de propósito, só quem EDITA ou COPIA o plano sem calcular:
 * o formulário da unidade, a planilha (exporta e importa o plano campo a
 * campo), a leitura de documento por IA (monta um plano novo) e as definições
 * de tipo e do plano vazio. Arquivo novo que leia `plano.AS.val`, `.Mensais.n`
 * etc. faz este teste falhar: use `lerPlano`.
 */
const EDITORES = new Set([
  "src/lib/calc/plano.ts",
  "src/lib/calc/types.ts",
  "src/lib/calc/plan.ts",
  "src/components/app/unit-form.tsx",
  "src/lib/xlsx/growth-template.ts",
  "src/lib/ai/unidade-doc.ts",
]);
const LEITURA_DIRETA = /\.(AS|S1|S2|S3|Mensais|Semestrais|Anuais|FGTS|Subsidio|Permuta|Banco)\.(val|venc|n|dataPrev|valFinanc|statusSub|dataPrimParc|usar[A-Za-z]+)\b|\busarAS\b/;

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.(ts|tsx)$/.test(nome) && !/\.test\.tsx?$/.test(nome) && !nome.includes("__fixtures__") ? [caminho] : [];
  });
}

describe("AR-T2: o plano de pagamento só é lido por lerPlano", () => {
  it("nenhum arquivo fora da lista de editores lê as seções do plano direto", () => {
    const infratores = arquivos("src").filter((f) => !EDITORES.has(f) && LEITURA_DIRETA.test(readFileSync(f, "utf8")));
    expect(infratores).toEqual([]);
  });

  it("as leituras de cálculo usam lerPlano", () => {
    for (const f of ["src/lib/calc/receivables.ts", "src/lib/calc/projection.ts", "src/lib/actions/caixa.ts"]) {
      expect(readFileSync(f, "utf8"), f).toMatch(/lerPlano\(/);
    }
  });
});
