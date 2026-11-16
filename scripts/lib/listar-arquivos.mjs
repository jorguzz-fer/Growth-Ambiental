// GA-13 G1 — lista os arquivos do repositório, com ou sem `.git`.
//
// Antes, `sanitizacao.test.ts` rodava `git ls-files` direto e o arquivo inteiro
// falhava no pacote de revisão (`scripts/pacote-revisao.sh`, via `git archive`)
// e em qualquer zip, onde não há `.git`.
//
// 1. Tenta `git ls-files` (lista exata do que é versionado).
// 2. Sem git: percorre o disco ignorando node_modules, .next, .migrate,
//    pacote-revisao, .git e os padrões do `.gitignore` da raiz. O resultado é
//    a mesma lista ou um superconjunto (arquivos novos ainda não versionados),
//    nunca um arquivo ignorado.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SEMPRE_FORA = new Set(["node_modules", ".next", ".migrate", "pacote-revisao", ".git"]);

/** Converte um padrão do .gitignore em regex sobre o caminho relativo (com "/"). */
export function padraoDoGitignore(linha) {
  let p = linha.trim();
  if (!p || p.startsWith("#") || p.startsWith("!")) return null;
  const soPasta = p.endsWith("/");
  if (soPasta) p = p.slice(0, -1);
  const ancorado = p.startsWith("/") || p.slice(0, -1).includes("/");
  if (p.startsWith("/")) p = p.slice(1);
  const corpo = p
    .split("")
    .map((c) => (c === "*" ? "[^/]*" : c === "?" ? "[^/]" : /[.+^${}()|[\]\\]/.test(c) ? `\\${c}` : c))
    .join("")
    .replace(/\[\^\/\]\*\[\^\/\]\*/g, ".*"); // "**"
  const inicio = ancorado ? "^" : "(^|/)";
  // pasta: casa ela e tudo dentro; arquivo: casa o nome (ou a pasta com esse nome)
  return new RegExp(`${inicio}${corpo}(/|$)`);
}

function lerGitignore(raiz) {
  const f = join(raiz, ".gitignore");
  if (!existsSync(f)) return [];
  return readFileSync(f, "utf8").split("\n").map(padraoDoGitignore).filter(Boolean);
}

/** Percorre o disco (sem git). */
export function listarPeloDisco(raiz = process.cwd()) {
  const padroes = lerGitignore(raiz);
  const ignorado = (rel) => padroes.some((rx) => rx.test(rel));
  const out = [];
  const andar = (dir) => {
    for (const nome of readdirSync(dir)) {
      if (SEMPRE_FORA.has(nome)) continue;
      const abs = join(dir, nome);
      const rel = relative(raiz, abs).split(sep).join("/");
      if (ignorado(rel)) continue;
      const st = statSync(abs);
      if (st.isDirectory()) andar(abs);
      else if (st.isFile()) out.push(rel);
    }
  };
  andar(raiz);
  return out.sort();
}

/**
 * Os arquivos do repositório (caminhos relativos à raiz, com "/").
 * @param {string} [raiz]
 * @returns {string[]}
 */
export function listarArquivosDoRepositorio(raiz = process.cwd()) {
  try {
    return execFileSync("git", ["ls-files"], { cwd: raiz, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 })
      .split("\n")
      .filter(Boolean)
      .filter((f) => existsSync(join(raiz, f)))
      .sort();
  } catch {
    return listarPeloDisco(raiz);
  }
}
