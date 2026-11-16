import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { listarArquivosDoRepositorio, listarPeloDisco, padraoDoGitignore } from "./listar-arquivos";

/**
 * GA-13 G1 — a lista de arquivos do repositório funciona com e sem `.git`
 * (o pacote de `scripts/pacote-revisao.sh` vem de `git archive` e não tem `.git`).
 */
describe("GA-13 G1 — listar os arquivos do repositório com e sem .git", () => {
  const disco = listarPeloDisco();

  it("pelo disco: acha os arquivos de verdade e nenhum ignorado", () => {
    expect(disco.length).toBeGreaterThan(1000);
    expect(disco).toContain("package.json");
    expect(disco).toContain("src/lib/sanitizacao.test.ts");
    expect(disco).toContain(".gitignore");
    const ignorados = disco.filter((f) => /(^|\/)(node_modules|\.next|\.migrate|pacote-revisao|\.git)\//.test(f) || /^\.env(\..*)?\.local$|^\.env$/.test(f) || f.endsWith(".tsbuildinfo") || f === "next-env.d.ts");
    expect(ignorados).toEqual([]);
  });

  it("com .git: a lista do disco é a mesma do git ls-files, ou um superconjunto sem arquivo ignorado", () => {
    if (!existsSync(join(process.cwd(), ".git"))) return; // na cópia sem .git, a comparação não se aplica
    const git = listarArquivosDoRepositorio();
    const noDisco = new Set(disco);
    expect(git.filter((f) => !noDisco.has(f))).toEqual([]);
  });

  it("padrões do .gitignore", () => {
    const casa = (p: string, f: string) => padraoDoGitignore(p)!.test(f);
    expect(casa("/node_modules", "node_modules/x/y.js")).toBe(true);
    expect(casa("/node_modules", "src/node_modules/x")).toBe(false);
    expect(casa("/.next/", ".next/server/app.js")).toBe(true);
    expect(casa(".env*.local", ".env.local")).toBe(true);
    expect(casa(".env*.local", ".env.production.local")).toBe(true);
    expect(casa(".env*.local", ".env.example")).toBe(false);
    expect(casa("*.tsbuildinfo", "tsconfig.tsbuildinfo")).toBe(true);
    expect(casa("pacote-revisao/", "pacote-revisao/a.zip")).toBe(true);
    expect(casa("*.pem", "chaves/certificado.pem")).toBe(true);
    expect(padraoDoGitignore("# comentário")).toBeNull();
    expect(padraoDoGitignore("")).toBeNull();
  });
});
