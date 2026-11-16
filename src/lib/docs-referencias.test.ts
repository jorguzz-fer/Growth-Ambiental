import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { listarArquivosDoRepositorio } from "@/lib/test-utils/listar-arquivos";

/**
 * GA-13 G3 — `docs/` só com o que descreve o Ambiental hoje; o histórico do
 * Growth Construction fica em `docs/historico-construction/`. Esta trava
 * garante que nenhuma referência ficou quebrada com a mudança:
 * - todo caminho `docs/...` citado em código, testes, scripts e documentos existe;
 * - todo link relativo de Markdown em `docs/` e no README aponta para um arquivo que existe.
 *
 * Fora da conferência:
 * - as migrações SQL já aplicadas (`src/lib/db/migrations/*.sql`): não são
 *   editadas, nem para atualizar um comentário, e podem citar o caminho antigo;
 * - o próprio histórico (`docs/historico-construction/`): é registro do produto
 *   anterior e cita documentos que já tinham sido apagados antes do GA-13.
 * As exceções pontuais ficam em EXCECOES, com o motivo.
 */
const EXCECOES: { arquivo: string; caminho: string; motivo: string }[] = [
  { arquivo: "docs/AUDITORIA_SANITIZACAO.md", caminho: "docs/historico-construction/V2-DIAGNOSTICO-PRODUCAO.md", motivo: "documento removido na sanitização (tinha dado real de produção); a auditoria registra que ele saiu" },
  { arquivo: "scripts/medicao-ar.ts", caminho: "docs/historico-construction/AR-MEDICAO-producao.md", motivo: "arquivo que o próprio script gera quando é rodado" },
];
const ehExcecao = (arquivo: string, caminho: string) => EXCECOES.some((e) => e.arquivo === arquivo && e.caminho === caminho);
const RAIZ = process.cwd();
const ARQUIVOS = listarArquivosDoRepositorio().filter(
  (f) => /\.(ts|tsx|mjs|cjs|js|md|sh|sql|json)$/.test(f) && !f.startsWith("src/lib/db/migrations/") && !f.startsWith("pacote-revisao/") && !f.startsWith("docs/historico-construction/"),
);
const existe = (rel: string) => existsSync(join(RAIZ, rel));

describe("GA-13 G3 — referências a docs/ depois da separação do histórico", () => {
  it("a raiz de docs/ tem o README (índice) e o histórico está em docs/historico-construction/", () => {
    expect(existe("docs/README.md")).toBe(true);
    expect(existe("docs/historico-construction")).toBe(true);
    const naRaiz = listarArquivosDoRepositorio().filter((f) => /^docs\/[^/]+$/.test(f));
    expect(naRaiz.filter((f) => /^docs\/V[23]-/.test(f))).toEqual([]);
  });

  it("todo caminho docs/... citado no repositório existe", () => {
    const quebrados: string[] = [];
    for (const f of ARQUIVOS) {
      const texto = readFileSync(join(RAIZ, f), "utf8");
      for (const m of texto.matchAll(/(?<![\w/.-])docs\/[\w./-]*[\w-]\.(?:md|sql|html|txt|json)\b/g)) {
        if (!existe(m[0]) && !ehExcecao(f, m[0])) quebrados.push(`${f}: ${m[0]}`);
      }
    }
    expect([...new Set(quebrados)]).toEqual([]);
  });

  it("cada exceção ainda é citada no arquivo dela", () => {
    for (const e of EXCECOES) expect(readFileSync(join(RAIZ, e.arquivo), "utf8"), e.arquivo).toContain(e.caminho);
  });

  it("todo link relativo de Markdown em docs/ e no README existe", () => {
    const quebrados: string[] = [];
    for (const f of ARQUIVOS.filter((x) => x.endsWith(".md") && (x.startsWith("docs/") || x === "README.md"))) {
      const texto = readFileSync(join(RAIZ, f), "utf8");
      for (const m of texto.matchAll(/\]\((?!https?:|mailto:|#|\/)([^)\s#]+)(?:#[^)]*)?\)/g)) {
        const alvo = normalize(join(dirname(f), decodeURI(m[1])));
        if (!existe(alvo)) quebrados.push(`${f}: ${m[1]}`);
      }
    }
    expect([...new Set(quebrados)]).toEqual([]);
  });
});
