import { describe, expect, it } from "vitest";
import { analisarStakeholders, type CadastroParaAnalise, type UsoDoCadastro } from "./stakeholder-analise";

const c = (x: Partial<CadastroParaAnalise> & { id: string; nome: string }): CadastroParaAnalise => ({
  tipo: "PJ",
  doc: null,
  papeis: [],
  ativo: true,
  email: null,
  tel: null,
  endereco: null,
  ...x,
});
const hoje = new Date("2026-10-01T00:00:00Z");

describe("analisarStakeholders (7.2) — puro, sem modelo", () => {
  const cadastros = [
    c({ id: "a", nome: "A Ltda", doc: "00.000.001/0001-36", papeis: ["Fornecedor de Material"], email: "a@a" }),
    c({ id: "b", nome: "B Ltda", doc: "00000001000136", papeis: ["Construtora"], tel: "1" }),
    c({ id: "i", nome: "Inativo", ativo: false, papeis: ["Fornecedor de Material"], doc: "000.000.001-91", tipo: "PF" }),
    c({ id: "s", nome: "Sem nada" }),
    c({ id: "p", nome: "Pagador sem papel", papeis: ["Sócio/Quotista"], tel: "2", doc: "123.456.789-09", tipo: "PJ" }),
    c({ id: "x", nome: "Doc ruim", doc: "12.345", papeis: ["Seguradora"], email: "x" }),
    c({ id: "m", nome: "Mestre PF", tipo: "PF", papeis: ["Mão de Obra RPA"], tel: "3", doc: "000.000.001-91" }),
  ];
  const uso: UsoDoCadastro[] = [
    { id: "i", despesas: 3, ultimaDespesa: "2026-09-20", obrigacoes: 0 },
    { id: "p", despesas: 0, ultimaDespesa: null, obrigacoes: 4 },
    { id: "b", despesas: 2, ultimaDespesa: "2025-01-01", obrigacoes: 0 },
  ];
  const r = analisarStakeholders(cadastros, uso, hoje);

  it("documentos duplicados, lado a lado, pelos dígitos", () => {
    expect(r.duplicados.map((d) => d.cadastros.map((x) => x.nome))).toEqual([
      ["A Ltda", "B Ltda"],
      ["Inativo", "Mestre PF"],
    ]);
  });
  it("cadastro incompleto: sem documento, sem papel, sem contato, sem endereço obrigatório; o sem papel vem primeiro", () => {
    const s = r.incompletos.find((i) => i.id === "s")!;
    expect(s.faltas).toEqual(["documento", "papel", "contato"]);
    expect(r.incompletos[0].id).toBe("s");
    expect(r.incompletos.find((i) => i.id === "m")!.faltas).toEqual(["endereço"]);
    expect(r.incompletos.find((i) => i.id === "i")).toBeUndefined(); // inativo não entra
  });
  it("documento inválido e tipo incompatível", () => {
    expect(r.invalidos.map((i) => i.id)).toEqual(["p", "x"]);
    expect(r.invalidos.find((i) => i.id === "p")!.motivo).toMatch(/CPF.*PJ/);
  });
  it("inativo ainda em uso: despesa nos últimos 90 dias", () => {
    expect(r.inativosEmUso).toEqual([{ id: "i", nome: "Inativo", despesasRecentes: 3, ultimaDespesa: "2026-09-20", obrigacoes: 0 }]);
  });
  it("papéis e uso real: fornecedor sem despesa, despesa sem papel, pagador sem o papel (1.6)", () => {
    expect(r.papeis.fornecedorSemDespesa.map((x) => x.id)).toEqual(["a", "m"]);
    expect(r.papeis.despesaSemPapel.map((x) => x.id)).toEqual(["b"]);
    expect(r.papeis.pagadorSemPapel).toEqual([{ id: "p", nome: "Pagador sem papel", obrigacoes: 4, ativo: true }]);
  });
});
