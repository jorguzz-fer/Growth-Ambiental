import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DateField, MonthField } from "@/components/ui/date-field";
import { brParaISO, brParaInterno, brParaMes, dataExiste, internoParaBR, internoParaISO, isoParaBR, isoParaInterno, mesParaBR } from "@/lib/datas-br";
import { dateBR } from "@/lib/utils";

/**
 * GA-2 — todas as datas em DD/MM/AAAA. Conversões (o que o usuário digita →
 * o que a action recebe) e o que o campo mostra (o que está gravado → tela).
 */

/** O texto visível do campo (o input de texto; o hidden e o nativo ficam de fora). */
function textoVisivel(html: string): string {
  const m = html.match(/<input type="text"[^>]*?value="([^"]*)"/);
  if (!m) throw new Error(`campo de texto não encontrado: ${html}`);
  return m[1];
}
/** O valor que vai no form (`<input type="hidden" name=…>`). */
function valorDoForm(html: string): string {
  const m = html.match(/<input type="hidden"[^>]*?value="([^"]*)"/);
  if (!m) throw new Error(`hidden não encontrado: ${html}`);
  return m[1];
}

describe("GA-2 — conversão do que o usuário digita", () => {
  it("formato interno: digitar 03/10/2027 (3 de outubro) → a action recebe 10/03/2027", () => {
    expect(brParaInterno("03/10/2027")).toBe("10/03/2027");
    expect(brParaInterno("3/10/2027")).toBe("10/03/2027");
    expect(brParaInterno(" 03/10/2027 ")).toBe("10/03/2027");
  });

  it("dia maior que 12 é aceito: 31/12/2027 → 12/31/2027", () => {
    expect(brParaInterno("31/12/2027")).toBe("12/31/2027");
    expect(brParaInterno("31/10/2027")).toBe("10/31/2027");
  });

  it("data que não existe é recusada (o campo não aceita)", () => {
    for (const x of ["31/02/2027", "29/02/2027", "32/01/2027", "00/01/2027", "10/13/2027", "10/00/2027", "1/1/27", "abc", ""]) expect(brParaInterno(x), x).toBeNull();
    expect(brParaInterno("29/02/2028")).toBe("02/29/2028");
    expect(dataExiste(29, 2, 2028)).toBe(true);
    expect(dataExiste(29, 2, 2100)).toBe(false);
  });

  it("formato ISO (filtros De/Até): digitar 31/12/2027 → 2027-12-31", () => {
    expect(brParaISO("31/12/2027")).toBe("2027-12-31");
    expect(brParaISO("03/10/2027")).toBe("2027-10-03");
    expect(brParaISO("31/02/2027")).toBeNull();
  });

  it("o que está gravado aparece em DD/MM/AAAA", () => {
    expect(internoParaBR("10/03/2027")).toBe("03/10/2027");
    expect(isoParaBR("2027-01-31")).toBe("31/01/2027");
    expect(internoParaBR("")).toBe("");
    expect(isoParaBR("lixo")).toBe("");
    expect(dateBR("10/03/2027")).toBe("03/10/2027");
  });

  it("ida e volta não perde nada", () => {
    for (const i of ["01/31/2027", "12/01/2026", "02/29/2028"]) expect(brParaInterno(internoParaBR(i))).toBe(i);
    for (const i of ["2027-01-31", "2026-12-01"]) expect(brParaISO(isoParaBR(i))).toBe(i);
    expect(isoParaInterno(internoParaISO("10/03/2027"))).toBe("10/03/2027");
  });

  it("competência continua MM/AAAA", () => {
    expect(mesParaBR("10/2027")).toBe("10/2027");
    expect(brParaMes("3/2027")).toBe("03/2027");
    expect(brParaMes("13/2027")).toBeNull();
  });
});

describe("GA-2 — o campo mostra DD/MM e guarda o formato de sempre", () => {
  it("edição: registro gravado com 10/03/2027 aparece como 03/10/2027; o form envia 10/03/2027", () => {
    const html = renderToStaticMarkup(createElement(DateField, { name: "data", defaultValue: "10/03/2027", "aria-label": "Data" }));
    expect(textoVisivel(html)).toBe("03/10/2027");
    expect(valorDoForm(html)).toBe("10/03/2027");
    expect(html).toContain('aria-label="Data"');
    expect(html).toContain('placeholder="dd/mm/aaaa"');
  });

  it("controlado: value 12/31/2027 aparece como 31/12/2027", () => {
    const html = renderToStaticMarkup(createElement(DateField, { value: "12/31/2027", onChange: () => {} }));
    expect(textoVisivel(html)).toBe("31/12/2027");
  });

  it('formato="iso": o filtro ?de=2027-01-31 abre preenchido com 31/01/2027 e envia 2027-01-31', () => {
    const html = renderToStaticMarkup(createElement(DateField, { formato: "iso", name: "de", defaultValue: "2027-01-31", "aria-label": "De" }));
    expect(textoVisivel(html)).toBe("31/01/2027");
    expect(valorDoForm(html)).toBe("2027-01-31");
    // o calendário nativo (escondido) recebe ISO, como antes
    expect(html).toMatch(/type="date"[^>]*value="2027-01-31"/);
  });

  it("o campo nativo fica escondido: o texto visível é sempre DD/MM, qualquer que seja o idioma do navegador", () => {
    const html = renderToStaticMarkup(createElement(DateField, { value: "10/03/2027", onChange: () => {} }));
    expect(html).toMatch(/<input[^>]*type="date"[^>]*aria-hidden="true"/);
    expect(html).toMatch(/<input[^>]*type="date"[^>]*tabindex="-1"/);
  });

  it("Cris (§3): proposta 10/03/2027 (dica MM/DD/YYYY) num campo de data aparece como 03/10/2027", () => {
    // Os formulários assistidos põem o valor proposto direto no estado do
    // campo (ex.: contas-receber-manager: `if (v.vencimento) setVencimento(v.vencimento)`),
    // e o campo é um DateField controlado.
    const proposta = { vencimento: "10/03/2027" };
    const html = renderToStaticMarkup(createElement(DateField, { name: "vencimento", value: proposta.vencimento, onChange: () => {} }));
    expect(textoVisivel(html)).toBe("03/10/2027");
    expect(valorDoForm(html)).toBe("10/03/2027");
  });

  it("MonthField segue mostrando MM/AAAA", () => {
    const html = renderToStaticMarkup(createElement(MonthField, { value: "10/2027", onChange: () => {} }));
    expect(textoVisivel(html)).toBe("10/2027");
  });
});

describe("GA-2 §1/§2 — os campos listados usam o DateField", () => {
  const ler = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
  const campo = (fonte: string, rotulo: string) => fonte.split("\n").find((l) => l.includes(`aria-label="${rotulo}"`));

  it.each([
    ["src/components/app/horas/horas-manager.tsx", "Data"],
    ["src/components/app/implantacao/implantacao-manager.tsx", "Data prevista"],
    ["src/components/app/implantacao/implantacao-manager.tsx", "Data realizada"],
    ["src/components/app/implantacao/implantacao-manager.tsx", "Data do treinamento"],
    ["src/components/app/contratos/abas.tsx", "Início do período executado"],
    ["src/components/app/contratos/abas.tsx", "Fim do período executado"],
  ])("§1 %s · %s: DateField no formato interno", (arquivo, rotulo) => {
    const l = campo(ler(arquivo), rotulo);
    expect(l, rotulo).toMatch(/<DateField /);
    expect(l).not.toMatch(/formato="iso"/);
  });

  it.each([
    ["src/components/app/contas-pagar-table.tsx", ["De", "Até"]],
    ["src/components/app/balanco-dia-table.tsx", ["De", "Até"]],
    ["src/components/app/funcionario-ficha.tsx", ["Nascimento do dependente", "Data do desligamento"]],
    ["src/components/app/funcionario-docs.tsx", ["Validade do documento"]],
    ["src/components/app/equipes-manager.tsx", ["De", "Até"]],
    ["src/components/app/estoque-manager.tsx", ["De", "Até"]],
    ["src/app/(app)/notasfiscais/page.tsx", ["Criadas de", "Criadas até"]],
    ["src/app/(app)/acoes/page.tsx", ["De", "Até"]],
  ] as const)("§2 %s: DateField no formato ISO", (arquivo, rotulos) => {
    const fonte = ler(arquivo);
    for (const r of rotulos) expect(campo(fonte, r), r).toMatch(/<DateField formato="iso"/);
  });

  it("os filtros por URL continuam em ISO e com name de/ate", () => {
    for (const a of ["src/components/app/equipes-manager.tsx", "src/components/app/estoque-manager.tsx", "src/app/(app)/notasfiscais/page.tsx", "src/app/(app)/acoes/page.tsx"]) {
      const f = ler(a);
      expect(f, a).toMatch(/<DateField formato="iso"[^>]*name="de"/);
      expect(f, a).toMatch(/<DateField formato="iso"[^>]*name="ate"/);
    }
  });

  it("medição de contrato: fim anterior ao início é recusado na tela (botões travados e aviso)", () => {
    const f = ler("src/components/app/contratos/abas.tsx");
    expect(f).toMatch(/const periodoInvertido = /);
    expect(f).toMatch(/disabled=\{pendente \|\| periodoInvertido\}/);
    expect(f).toMatch(/data-erro-periodo/);
  });

  it("a ficha do funcionário (nascimento, CNH, admissão) também usa o DateField ISO", () => {
    const f = ler("src/components/app/funcionario-campos.tsx");
    expect(f).toMatch(/<DateField formato="iso"/);
    for (const k of ["nascimento", "cnhValidade", "admissao"]) expect(f).toMatch(new RegExp(`\\{d\\("${k}"`));
  });
});
