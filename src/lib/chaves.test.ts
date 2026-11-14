import { describe, it, expect } from "vitest";
import { CHAVES, chavesLigadasDe, ehChave } from "./chaves";

describe("catálogo de chaves (B4)", () => {
  it("ids únicos e toda chave tem prévia", () => {
    const ids = CHAVES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CHAVES) expect(c.previa.href.startsWith("/"), c.id).toBe(true);
  });
  it("só chave do catálogo e ligada conta; o resto vale desligada", () => {
    const r = chavesLigadasDe([
      { chave: "membro_padrao_restrito", ligada: true },
      { chave: "chave_que_nao_existe", ligada: true },
    ]);
    expect([...r]).toEqual(["membro_padrao_restrito"]);
    expect(chavesLigadasDe([{ chave: "membro_padrao_restrito", ligada: false }]).size).toBe(0);
    expect(chavesLigadasDe([]).size).toBe(0);
  });
  it("ehChave", () => {
    expect(ehChave("membro_padrao_restrito")).toBe(true);
    expect(ehChave("x")).toBe(false);
    expect(ehChave(null)).toBe(false);
  });
});

describe("GA-1 — classificação das chaves", async () => {
  const { CHAVES, CHAVES_EMPRESA_NOVA, CHAVES_INCORPORACAO } = await import("./chaves");
  it("toda chave do catálogo está em exatamente uma lista; as listas não se repetem", () => {
    const gerais = new Set<string>(CHAVES_EMPRESA_NOVA);
    const incorporacao = new Set<string>(CHAVES_INCORPORACAO);
    expect(gerais.size).toBe(CHAVES_EMPRESA_NOVA.length);
    expect(incorporacao.size).toBe(CHAVES_INCORPORACAO.length);
    for (const c of CHAVES) expect(Number(gerais.has(c.id)) + Number(incorporacao.has(c.id))).toBe(1);
    expect(gerais.size + incorporacao.size).toBe(CHAVES.length);
  });
  it("as regras corrigidas de qualquer empresa nascem ligadas; as de incorporação, não", () => {
    expect(CHAVES_EMPRESA_NOVA).toEqual(expect.arrayContaining(["caixa_conciliacao_por_conta", "rascunho_fora_dos_relatorios", "resumo_definicao_nova", "despesa_categoria_do_plano"]));
    expect(CHAVES_INCORPORACAO).toEqual(["incc_por_empresa", "plano_definicao_nova", "dre_receita_rateio", "parcela_recebida_situacao"]);
  });
});
