import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * GA-2 §5 — trava para não voltar: nenhuma tela pede ao usuário que digite a
 * data no formato interno americano, e nenhuma usa o campo de data nativo do
 * navegador (que mostra mm/dd/yyyy num Chrome em inglês).
 *
 * O padrão é o `DateField` (`src/components/ui/date-field.tsx`): o usuário vê e
 * digita DD/MM/AAAA, e o valor interno não muda. Este teste lê os `.tsx` de
 * `src/app` e `src/components` (sem os testes) e falha se encontrar:
 * 1. "MM/DD" ou "MM/AAAA/DD" fora de comentário;
 * 2. `type="date"` fora do `date-field.tsx`;
 * 3. `placeholder` com uma data de exemplo NN/NN/NNNN fora do `date-field.tsx`.
 */

const RAIZ = process.cwd();
const PASTAS = ["src/app", "src/components"];
const CAMPO_PADRAO = "src/components/ui/date-field.tsx";

/**
 * Exceções da regra 1: as dicas de data dos formulários assistidos da Cris.
 * A dica vai só ao modelo (`src/lib/cris.ts`: "Datas no formato da dica do
 * campo"); o valor proposto cai num DateField, que mostra DD/MM ao usuário.
 */
const DICAS_DA_CRIS: { arquivo: string; campo: string; motivo: string }[] = [
  { arquivo: "src/components/app/acerto-manager.tsx", campo: "dataPagamento", motivo: "dica da Cris; o campo é DateField" },
  { arquivo: "src/components/app/restituicoes-manager.tsx", campo: "dataRestituicao", motivo: "dica da Cris; o campo é DateField" },
  { arquivo: "src/components/app/contas-receber-manager.tsx", campo: "vencimento", motivo: "dica da Cris; o campo é DateField" },
  { arquivo: "src/components/app/despesa-form.tsx", campo: "vencimento", motivo: "dica da Cris; o campo é DateField" },
  { arquivo: "src/components/app/despesa-form.tsx", campo: "dataPagamentoTerceiro", motivo: "dica da Cris; o campo é DateField" },
];

function arquivosTsx(dir: string): string[] {
  const out: string[] = [];
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) out.push(...arquivosTsx(p));
    else if (p.endsWith(".tsx") && !/\.test\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

/**
 * Tira os comentários, mantendo as quebras de linha (para o número da linha
 * continuar certo): blocos, comentários de JSX e `//` de fim de linha. O `//`
 * de uma URL ("https://") fica, porque vem depois de ":".
 */
function semComentarios(fonte: string): string {
  const branco = (m: string) => m.replace(/[^\n]/g, " ");
  return fonte.replace(/\/\*[\s\S]*?\*\//g, branco).replace(/(^|[\s;,)}\]])\/\/[^\n]*/g, (m, antes: string) => antes + branco(m.slice(antes.length)));
}

const arquivos = PASTAS.flatMap((d) => arquivosTsx(join(RAIZ, d))).map((p) => relative(RAIZ, p));

function achados(regra: RegExp, ignorar: (arquivo: string, linha: string) => boolean = () => false) {
  const out: string[] = [];
  for (const arquivo of arquivos) {
    if (arquivo === CAMPO_PADRAO) continue;
    const linhas = semComentarios(readFileSync(join(RAIZ, arquivo), "utf8")).split("\n");
    linhas.forEach((l, i) => {
      if (regra.test(l) && !ignorar(arquivo, l)) out.push(`${arquivo}:${i + 1}: ${l.trim().slice(0, 140)}`);
    });
  }
  return out;
}

const ehDicaDaCris = (arquivo: string, linha: string) =>
  DICAS_DA_CRIS.some((d) => d.arquivo === arquivo && linha.includes(`nome: "${d.campo}"`) && /dica: "MM\/DD\/YYYY"/.test(linha));

describe("GA-2 §5 — datas na tela: só DD/MM/AAAA", () => {
  it("a varredura acha os arquivos das telas", () => {
    expect(arquivos.length).toBeGreaterThan(100);
    expect(arquivos).toContain("src/components/app/horas/horas-manager.tsx");
  });

  it("o tira-comentários não come URL nem texto", () => {
    expect(semComentarios('const a = "https://x.y"; // MM/DD')).toBe('const a = "https://x.y";         ');
    expect(semComentarios("{/* MM/DD */}<p>ok</p>")).toBe("{           }<p>ok</p>");
    expect(semComentarios("a\n/* MM/DD\n x */b")).toBe("a\n        \n     b");
  });

  it('nenhum "MM/DD" ou "MM/AAAA/DD" fora de comentário (exceto as dicas da Cris listadas)', () => {
    expect(achados(/MM\/DD|MM\/AAAA\/DD/i, ehDicaDaCris)).toEqual([]);
  });

  it('nenhum type="date" fora do date-field.tsx', () => {
    expect(achados(/type\s*[=:]\s*\{?\s*["'`]date["'`]/)).toEqual([]);
  });

  it("nenhum placeholder com data de exemplo NN/NN/NNNN fora do date-field.tsx", () => {
    expect(achados(/placeholder\s*[=:]\s*\{?\s*["'`][^"'`]*\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/i)).toEqual([]);
  });

  it("cada dica da Cris listada existe, tem o comentário do motivo e o arquivo usa DateField", () => {
    for (const d of DICAS_DA_CRIS) {
      const fonte = readFileSync(join(RAIZ, d.arquivo), "utf8");
      const linha = fonte.split("\n").find((l) => l.includes(`nome: "${d.campo}"`) && l.includes('dica: "MM/DD/YYYY"'));
      expect(linha, `${d.arquivo} · ${d.campo}`).toBeDefined();
      expect(linha).toContain("formato interno; vai só ao modelo, o usuário vê DD/MM pelo DateField");
      expect(fonte).toMatch(/from "@\/components\/ui\/date-field"/);
    }
  });

  it("o date-field.tsx é o único com o campo nativo, e esse campo fica escondido", () => {
    const fonte = readFileSync(join(RAIZ, CAMPO_PADRAO), "utf8");
    expect(fonte).toMatch(/type=\{nativeType\}/);
    expect(fonte).toMatch(/aria-hidden/);
    expect(fonte).toMatch(/placeholder="dd\/mm\/aaaa"/);
  });
});
