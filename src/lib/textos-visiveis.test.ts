import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { CODIGO_INTERNO, CODIGO_INTERNO_GA13, temCodigoInterno } from "@/lib/codigos-internos";

/**
 * GA-2B §4 — trava: nenhum texto interno de desenvolvimento chega ao cliente.
 *
 * O código foi construído por prompts e decisões numeradas ("Prompt I",
 * "BAA-6", "§57"…). Esses códigos podem ficar em COMENTÁRIOS de código, mas
 * não em texto que o cliente lê, nem em texto que vai à Cris (ela pode repetir).
 *
 * Com a API do compilador TypeScript (comentários nunca entram), examina:
 * 1. Telas (`.tsx` de `src/app` e `src/components`): o texto JSX, as strings
 *    nos atributos visíveis (title, titulo, descricao, label, rotulo,
 *    placeholder, aria-label, dica, alt…), as strings dentro de `{…}` entre
 *    tags, as propriedades de objeto com nome de texto visível e os
 *    argumentos de toast/aviso/mensagem.
 * 2. Textos de `src/lib` que chegam ao cliente: blocos do Resumo, backup,
 *    métricas do chat (todas as strings) e as mensagens de erro das actions
 *    (`{ error: "…" }`, `falha("…")`).
 * 3. Textos que vão à Cris: base de conhecimento, instruções e descrições das
 *    ferramentas (todas as strings).
 */

// O padrão fica em src/lib/codigos-internos.ts (usado também pelo ga2b-textos.test.ts).

/**
 * Exceções, com o motivo. Cada uma é uma propriedade cujo valor não é exibido
 * (`propriedade`) ou um texto que precisa citar os padrões (`trecho`, o começo do texto).
 */
const EXCECOES: ({ arquivo: string; motivo: string } & ({ propriedade: string } | { trecho: string }))[] = [
  { arquivo: "src/lib/chaves.ts", propriedade: "origem", motivo: "registro interno de onde a chave nasceu; não é renderizado (GA-1 §5)" },
  {
    arquivo: "src/lib/cris.ts",
    trecho: "- Nunca cite códigos internos de desenvolvimento",
    motivo: "a regra do GA-2B §5 que PROÍBE a Cris de citar os códigos: precisa dar os padrões como exemplo",
  },
];
const ehExcecaoDeTrecho = (a: Achado) => EXCECOES.some((e) => "trecho" in e && e.arquivo === a.arquivo && a.texto.startsWith(e.trecho));

const RAIZ = process.cwd();

/** Nomes de atributo/propriedade cujo valor aparece na tela. */
const NOMES_VISIVEIS = new Set([
  "title", "titulo", "subtitle", "subtitulo", "descricao", "description", "label", "rotulo", "placeholder",
  "aria-label", "dica", "alt", "texto", "text", "mensagem", "message", "aviso", "nota", "motivo", "detalhe",
  "error", "erro", "vazio", "ajuda", "explicacao", "resumo", "pergunta", "sugestao", "abertura", "frase",
]);
/** Funções cujos argumentos de texto viram mensagem para o cliente. */
const CHAMADAS_VISIVEIS = /^(toast|alert|confirm|prompt|setMsg|setMensagem|setAviso|setErro|setError|avisar|falha|fail|recusa|pedirMotivo)$/;
/** Atributos que nunca são texto visível. */
const NOMES_TECNICOS = new Set(["className", "href", "src", "key", "id", "name", "type", "role", "method", "action", "target", "rel", "style", "value", "defaultValue", "htmlFor"]);

function listar(dir: string, filtro: (p: string) => boolean): string[] {
  const out: string[] = [];
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) out.push(...listar(p, filtro));
    else if (filtro(p) && !/\.test\.tsx?$/.test(p)) out.push(relative(RAIZ, p));
  }
  return out.sort();
}

interface Achado {
  arquivo: string;
  linha: number;
  texto: string;
}

const nomeDe = (n: ts.Node | undefined): string | null => {
  if (!n) return null;
  if (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isPrivateIdentifier(n)) return n.text;
  if (ts.isJsxNamespacedName(n)) return `${n.namespace.text}:${n.name.text}`;
  return null;
};

/**
 * Coleta os textos de um arquivo.
 * - `modo: "tela"`: só o que vai para a tela (ver o cabeçalho).
 * - `modo: "tudo"`: todas as strings (arquivos de texto ao cliente e da Cris).
 * - `modo: "erros"`: só mensagens de erro de action.
 */
function textos(arquivo: string, modo: "tela" | "tudo" | "erros", fonte = readFileSync(join(RAIZ, arquivo), "utf8")): Achado[] {
  const sf = ts.createSourceFile(arquivo, fonte, ts.ScriptTarget.Latest, true, arquivo.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: Achado[] = [];
  const excecoes = EXCECOES.filter((e) => e.arquivo === arquivo).flatMap((e) => ("propriedade" in e ? [e.propriedade] : []));
  const anotar = (n: ts.Node, t: string) => {
    if (t.trim()) out.push({ arquivo, linha: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1, texto: t.replace(/\s+/g, " ").trim() });
  };
  const textoDe = (n: ts.Node): string | null => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isJsxText(n)) return n.text;
    if (ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) return n.text;
    return null;
  };

  const visitar = (n: ts.Node, visivel: boolean) => {
    // Módulos importados e tipos nunca são texto.
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n) || ts.isTypeNode(n) || ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) return;
    let v = visivel;
    if (ts.isPropertyAssignment(n)) {
      const nome = nomeDe(n.name);
      if (nome && excecoes.includes(nome)) return;
      if (modo === "tela") v = nome ? NOMES_VISIVEIS.has(nome) || (visivel && !NOMES_TECNICOS.has(nome)) : visivel;
      if (modo === "erros") v = nome === "error" || nome === "erro";
    } else if (ts.isJsxAttribute(n)) {
      const nome = nomeDe(n.name) ?? "";
      v = modo === "tela" && NOMES_VISIVEIS.has(nome);
    } else if (ts.isJsxExpression(n) && n.parent && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))) {
      v = modo === "tela";
    } else if (ts.isCallExpression(n)) {
      const alvo = ts.isIdentifier(n.expression) ? n.expression.text : ts.isPropertyAccessExpression(n.expression) ? n.expression.name.text : "";
      if (CHAMADAS_VISIVEIS.test(alvo) && modo !== "tudo") {
        for (const a of n.arguments) visitar(a, true);
        visitar(n.expression, visivel);
        return;
      }
    } else if (ts.isJsxText(n)) {
      if (modo === "tela") anotar(n, n.text);
      return;
    }
    const t = textoDe(n);
    if (t !== null && (modo === "tudo" || v)) anotar(n, t);
    ts.forEachChild(n, (c) => visitar(c, v));
  };
  visitar(sf, false);
  return out;
}

const TELAS = [...listar(join(RAIZ, "src/app"), (p) => p.endsWith(".tsx")), ...listar(join(RAIZ, "src/components"), (p) => p.endsWith(".tsx"))];
const TEXTOS_AO_CLIENTE = ["src/lib/resumo-blocos.ts", "src/lib/backup-catalogo.ts", "src/lib/backup-pacote-texto.ts", "src/lib/chat-metricas.ts", "src/lib/chaves.ts"];
const ACTIONS = listar(join(RAIZ, "src/lib/actions"), (p) => p.endsWith(".ts"));
const DA_CRIS = [
  ...listar(join(RAIZ, "src/lib/assistente-base"), (p) => p.endsWith(".ts")),
  "src/lib/cris.ts",
  "src/lib/ai/cris.ts",
  ...listar(join(RAIZ, "src/lib"), (p) => /-ferramentas\.ts$/.test(p)),
];

/**
 * 4. O resto dos `.ts` de `src` (todas as strings): textos montados fora das telas
 * também chegam ao cliente (ex.: o modelo padrão de implantação, as frases
 * dos painéis do Assistente). A varredura de 16/11 não achou falso positivo aqui.
 */
const JA_COBERTOS = new Set([...TEXTOS_AO_CLIENTE, ...ACTIONS, ...DA_CRIS]);
const DEMAIS = listar(join(RAIZ, "src"), (p) => p.endsWith(".ts") && !p.endsWith(".d.ts")).filter((f) => !JA_COBERTOS.has(f));

const comCodigo = (lista: Achado[]) => lista.filter((a) => temCodigoInterno(a.texto) && !ehExcecaoDeTrecho(a)).map((a) => `${a.arquivo}:${a.linha}: ${a.texto.slice(0, 160)}`);

describe("GA-2B §4 — nenhum código interno de desenvolvimento no texto do cliente", () => {
  it("a varredura acha os arquivos de cada grupo", () => {
    expect(TELAS.length).toBeGreaterThan(150);
    expect(ACTIONS.length).toBeGreaterThan(30);
    expect(DA_CRIS).toContain("src/lib/cris.ts");
    expect(DA_CRIS.some((f) => f.endsWith("-ferramentas.ts"))).toBe(true);
    for (const f of TEXTOS_AO_CLIENTE) expect(statSync(join(RAIZ, f)).isFile()).toBe(true);
  });

  it("o extrator pega o texto visível e deixa de fora comentário e className", () => {
    const amostra = [
      "// Prompt I comentário fica",
      "/* BAA-6 bloco fica */",
      'export const X = () => <div className="border-b-2 px-3">Olá (BL-2) <span title="Prompt Z">{ok ? "aguarda decisão" : null}</span>{/* §57 */}</div>;',
      'export const Y = { titulo: "Etapa (Etapa 7)", chave: "BX-3", className: "b-2" };',
    ].join("\n");
    expect(textos("amostra.tsx", "tela", amostra).map((a) => a.texto)).toEqual(["Olá (BL-2)", "Prompt Z", "aguarda decisão", "Etapa (Etapa 7)"]);
  });

  it("o padrão pega os códigos e deixa passar etapa e fase de verdade", () => {
    for (const s of ["(Prompt I)", "BAA-6", "BL-2", "§57", "§ 7", "PR #21", "GA-11", "ferramentas (Etapa 7)", "aguarda decisão", "até nova decisão", "que ainda não existem", "Fase 0 — Scaffold", "(Parte 4)", "(RG-07)", "ver HOMOLOGACAO.md", "roadmap"]) expect(CODIGO_INTERNO.test(s), s).toBe(true);
    for (const s of ["Etapa 3 de 5", "Fase 2 do projeto", "CT-000001", "20 anos após o desligamento (NR-7)", "Conciliado sem vínculo, por mês", "entram em TODO pacote", "Parte do saldo"]) expect(CODIGO_INTERNO.test(s), s).toBe(false);
  });

  it("GA-13 C3: o padrão do GA-13 também pega os códigos (e qualquer §)", () => {
    for (const s of ["Prompt I", "BAA-6", "BA-1", "GA-13", "§", "§57", "PR22"]) expect(CODIGO_INTERNO_GA13.test(s), s).toBe(true);
    for (const s of ["Etapa 3", "Fase 2", "CT-000001"]) expect(CODIGO_INTERNO_GA13.test(s), s).toBe(false);
  });

  it("telas: nenhum texto visível com código interno", () => {
    expect(comCodigo(TELAS.flatMap((f) => textos(f, "tela")))).toEqual([]);
  });

  it("textos de src/lib que chegam ao cliente (Resumo, backup, métricas do chat): nenhum código interno", () => {
    expect(comCodigo(TEXTOS_AO_CLIENTE.flatMap((f) => textos(f, "tudo")))).toEqual([]);
  });

  it("mensagens de erro das actions: nenhum código interno", () => {
    expect(comCodigo(ACTIONS.flatMap((f) => textos(f, "erros")))).toEqual([]);
  });

  it("textos que vão à Cris (base, instruções, ferramentas): nenhum código interno", () => {
    expect(comCodigo(DA_CRIS.flatMap((f) => textos(f, "tudo")))).toEqual([]);
  });

  it("demais arquivos de src (todas as strings): nenhum código interno", () => {
    expect(DEMAIS.length).toBeGreaterThan(200);
    expect(comCodigo(DEMAIS.flatMap((f) => textos(f, "tudo")))).toEqual([]);
  });

  it("cada exceção ainda existe e o campo dela não é renderizado", () => {
    for (const e of EXCECOES) {
      const fonte = readFileSync(join(RAIZ, e.arquivo), "utf8");
      if ("trecho" in e) {
        expect(fonte, e.arquivo).toContain(e.trecho);
        continue;
      }
      expect(fonte, e.arquivo).toMatch(new RegExp(`\\b${e.propriedade}:`));
      // ninguém nas telas lê o campo
      const usa = TELAS.filter((t) => new RegExp(`\\.${e.propriedade}\\b`).test(readFileSync(join(RAIZ, t), "utf8")) && /from "@\/lib\/chaves"/.test(readFileSync(join(RAIZ, t), "utf8")));
      expect(usa, `${e.propriedade} lido numa tela`).toEqual([]);
    }
  });
});
