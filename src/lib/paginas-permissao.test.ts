import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { SCREEN_IDS } from "./permissions";

/**
 * Prompt M, 2.3 e 3 — toda página do app verifica "ver" ANTES de consultar
 * dado. A guarda do layout não basta: no App Router o layout renderiza em
 * paralelo com a página (o dado da página ia no HTML mesmo com "Acesso
 * negado" na tela) e não roda de novo na navegação dentro do app (a página
 * aparecia inteira). Este teste impede o furo de voltar na próxima tela.
 */

/** Rotas cuja permissão é de outra tela (declarado, não inferido). */
const PERMISSAO_DE: Record<string, string> = {
  acerto: "despesas",
  // Implementação integrada: a implantação é governada pela tela Empresa.
  implantacao: "empresa",
};
/** Rotas pessoais, sem tela governada. */
const LIVRES = new Set(["perfil"]);

const BASE = "src/app/(app)/";
const paginas = globSync(`${BASE}**/page.tsx`).map((f) => f.replace(BASE, "").replace(/\/?page\.tsx$/, ""));

describe("toda página verifica 'ver' antes de consultar dado", () => {
  it("há páginas para varrer", () => {
    expect(paginas.length).toBeGreaterThan(30);
  });

  for (const rota of paginas) {
    const seg = rota.split("/")[0];
    if (LIVRES.has(seg)) continue;
    it(`/${rota}`, () => {
      const tela =
        PERMISSAO_DE[rota] ?? Object.entries(PERMISSAO_DE).find(([k]) => rota.startsWith(`${k}/`))?.[1] ?? seg;
      expect(SCREEN_IDS, `rota /${rota} fora de SCREENS e sem permissão declarada`).toContain(tela);
      const src = readFileSync(`${BASE}${rota ? rota + "/" : ""}page.tsx`, "utf8");
      const corpo = src.slice(src.indexOf("export default"));
      // "editar" também serve: é mais restritivo (o Acerto exige editar Despesas).
      const ver = corpo.search(new RegExp(`can\\(ctx\\.perms, "${tela}", "(ver|editar)"\\)`));
      expect(ver, `/${rota} não verifica can(ctx.perms, "${tela}", "ver")`).toBeGreaterThan(-1);
      const consulta = corpo.search(/await (?!getTenantContext|searchParams|params)[\w.]+\(/);
      if (consulta > -1) expect(consulta, `/${rota} consulta dado antes de verificar "ver"`).toBeGreaterThan(ver);
    });
  }
});
