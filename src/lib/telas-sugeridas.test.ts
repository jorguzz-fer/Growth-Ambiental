import { describe, it, expect } from "vitest";
import { lerEscolha, matrizDaEscolha, telasConfiguraveis, telasSugeridas } from "./telas-sugeridas";
import { CONTADOR_VE, TELAS_SENSIVEIS, TELAS_SO_ADMIN, effectivePermissions, overridesDivergentes } from "./permissions";

/** Prompt AI2 — ao escolher o papel, a tela sugere as telas; a escolha vira override. */
describe("Prompt AI2 · telas sugeridas por papel", () => {
  it("owner e admin têm acesso total: nada a escolher", () => {
    expect(telasSugeridas("owner")).toEqual([]);
    expect(telasSugeridas("admin")).toEqual([]);
  });

  it("o contador recebe a sugestão do padrão dele", () => {
    const s = telasSugeridas("contador").filter((t) => t.sugerida).map((t) => t.id);
    expect(new Set(s)).toEqual(new Set([...CONTADOR_VE].filter((id) => telasConfiguraveis().some((t) => t.id === id))));
  });

  it("a lista não oferece tela só de admin, da plataforma nem de dado sensível", () => {
    const ids = telasConfiguraveis().map((t) => t.id);
    for (const id of [...TELAS_SO_ADMIN, ...TELAS_SENSIVEIS, "backup", "conferencia"]) expect(ids).not.toContain(id);
  });

  it("aceitar a sugestão não grava nada", () => {
    const escolha = new Set(telasSugeridas("contador").filter((t) => t.sugerida).map((t) => t.id));
    expect(overridesDivergentes("contador", matrizDaEscolha("contador", escolha))).toEqual({});
  });

  it("desmarcar nega; marcar a mais dá ver (contador) ou ver, criar e editar (membro)", () => {
    const sug = new Set(telasSugeridas("contador").filter((t) => t.sugerida).map((t) => t.id));
    sug.delete("dre");
    sug.add("clientes");
    const ef = effectivePermissions("contador", overridesDivergentes("contador", matrizDaEscolha("contador", sug)));
    expect(ef.dre.ver).toBe(false);
    expect(ef.clientes).toEqual({ ver: true, criar: false, editar: false, excluir: false });
    const m = matrizDaEscolha("engenheiro", new Set(["contratosmedicao", "estoque"]));
    expect(m.estoque).toEqual({ ver: true, criar: true, editar: true, excluir: false });
  });

  it("a escolha enviada ignora id desconhecido e tela fora da lista", () => {
    expect(lerEscolha("dre, inventada,usuarios")).toEqual(new Set(["dre"]));
    expect(lerEscolha(null)).toBeNull();
  });
});
