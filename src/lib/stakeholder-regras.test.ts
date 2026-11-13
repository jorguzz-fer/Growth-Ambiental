import { describe, expect, it } from "vitest";
import {
  avisoDeDuplicidade,
  bloqueiosDeExclusaoDoStakeholder,
  SEM_VINCULOS,
  totalDeVinculos,
  avisoDeTipoIncompativel,
  cpfValido,
  duplicatasDoDocumento,
  exigeEndereco,
  filtrarCadastros,
  formatoDoDocumento,
  motivoDeRecusaDoDocumento,
  opcoesDeSelecao,
  pagadoresPorTerceiro,
  papeisForaDaLista,
  sinaisDoCadastro,
} from "./stakeholder-regras";

describe("cpfValido (3.2)", () => {
  it("aceita CPF com e sem máscara, recusa DV errado e sequência repetida", () => {
    expect(cpfValido("000.000.001-91")).toBe(true);
    expect(cpfValido("00000000191")).toBe(true);
    expect(cpfValido("000.000.001-00")).toBe(false);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("")).toBe(false);
    expect(cpfValido("1234567890")).toBe(false);
  });
});

describe("formatoDoDocumento / motivoDeRecusaDoDocumento (3.3)", () => {
  it("classifica CPF, CNPJ, vazio e inválido", () => {
    expect(formatoDoDocumento("00.000.001/0001-36")).toBe("cnpj");
    expect(formatoDoDocumento("000.000.001-91")).toBe("cpf");
    expect(formatoDoDocumento("  ")).toBe("vazio");
    expect(formatoDoDocumento("00.000.001/0001-35")).toBe("invalido");
  });
  it("recusa só o inválido, com a mensagem do caso", () => {
    expect(motivoDeRecusaDoDocumento("")).toBeNull();
    expect(motivoDeRecusaDoDocumento("000.000.001-91")).toBeNull();
    expect(motivoDeRecusaDoDocumento("000.000.001-00")).toMatch(/CPF inválido/);
    expect(motivoDeRecusaDoDocumento("00.000.001/0001-35")).toMatch(/CNPJ inválido/);
    expect(motivoDeRecusaDoDocumento("12345")).toMatch(/fora do padrão/);
  });
});

describe("avisos (3.4, 3.5) — nunca bloqueio", () => {
  it("PJ com CPF e PF com CNPJ avisam", () => {
    expect(avisoDeTipoIncompativel("PJ", "000.000.001-91")).toMatch(/CPF.*PJ/);
    expect(avisoDeTipoIncompativel("PF", "00.000.001/0001-36")).toMatch(/CNPJ.*PF/);
    expect(avisoDeTipoIncompativel("PJ", "00.000.001/0001-36")).toBeNull();
    expect(avisoDeTipoIncompativel("PJ", "lixo")).toBeNull();
  });
  it("documento repetido em outro cadastro é listado pelo nome, ignorando o próprio", () => {
    const outros = [
      { id: "a", nome: "A Ltda", doc: "00.000.001/0001-36" },
      { id: "b", nome: "B Ltda", doc: "00000001000136" },
      { id: "c", nome: "C", doc: null },
    ];
    expect(duplicatasDoDocumento("00000001000136", outros, "a")).toEqual([{ id: "b", nome: "B Ltda" }]);
    expect(duplicatasDoDocumento("", outros)).toEqual([]);
    expect(avisoDeDuplicidade([{ nome: "B Ltda" }])).toMatch(/B Ltda/);
    expect(avisoDeDuplicidade([])).toBeNull();
  });
});

describe("exigeEndereco (3-A.3) e papeisForaDaLista (BW-2)", () => {
  it("PF com serviço ou mão de obra exige; PJ e outros papéis não", () => {
    expect(exigeEndereco("PF", ["Mão de Obra RPA"])).toBe(true);
    expect(exigeEndereco("PF", ["Prestador de Serviço", "Sócio/Quotista"])).toBe(true);
    expect(exigeEndereco("PJ", ["Prestador de Serviço"])).toBe(false);
    expect(exigeEndereco("PF", ["Corretor Autônomo"])).toBe(false);
  });
  it("papel fora da lista é detectado; o 20º papel não é 'fora'", () => {
    expect(papeisForaDaLista(["Construtora", "Importado X"])).toEqual(["Importado X"]);
    expect(papeisForaDaLista(["Pagador por Terceiro"])).toEqual([]);
  });
});

describe("sinaisDoCadastro (3.6, 3-A.4)", () => {
  it("marca documento inválido, duplicado, sem endereço obrigatório e sem papel", () => {
    const todos = [
      { id: "1", nome: "Um", doc: "000.000.001-91" },
      { id: "2", nome: "Dois", doc: "000.000.001-91" },
    ];
    const s = sinaisDoCadastro({ id: "1", tipo: "PF", doc: "000.000.001-91", papeis: ["Mão de Obra RPA"], endereco: null }, todos);
    expect(s.documentoInvalido).toBe(false);
    expect(s.documentoDuplicado).toEqual([{ id: "2", nome: "Dois" }]);
    expect(s.semEnderecoObrigatorio).toBe(true);
    const t = sinaisDoCadastro({ id: "3", tipo: "PJ", doc: "12.345", papeis: [], endereco: "Rua" }, todos);
    expect(t.documentoInvalido).toBe(true);
    expect(t.semPapel).toBe(true);
  });
});

describe("bloqueiosDeExclusaoDoStakeholder (2.4)", () => {
  it("nomeia cada vínculo com a contagem; sem vínculo, lista vazia", () => {
    expect(bloqueiosDeExclusaoDoStakeholder(SEM_VINCULOS)).toEqual([]);
    const b = bloqueiosDeExclusaoDoStakeholder({ ...SEM_VINCULOS, obrigacoesTerceiro: 2, documentos: 1 });
    expect(b).toEqual(["2 obrigação(ões) como pagador por terceiro", "1 documento(s) anexado(s)"]);
    expect(totalDeVinculos({ ...SEM_VINCULOS, acertos: 3, compensacoes: 1 })).toBe(4);
  });
});

describe("seletores (4.2, 1.5)", () => {
  const todos = [
    { id: "a", nome: "Ativo", ativo: true, papeis: ["Fornecedor de Material"] },
    { id: "i", nome: "Inativo", ativo: false, papeis: ["Pagador por Terceiro"] },
    { id: "p", nome: "Pagador", ativo: true, papeis: ["Pagador por Terceiro", "Sócio/Quotista"] },
  ];
  it("15 — seletor não oferece inativos, mas mantém o já vinculado, marcado", () => {
    expect(opcoesDeSelecao(todos)).toEqual([
      { id: "a", nome: "Ativo" },
      { id: "p", nome: "Pagador" },
    ]);
    expect(opcoesDeSelecao(todos, ["i"])).toContainEqual({ id: "i", nome: "Inativo (inativo)" });
    expect(opcoesDeSelecao(todos, [null, undefined])).toHaveLength(2);
  });
  it("14 — o select de pagador oferece apenas quem tem o papel (e está ativo)", () => {
    expect(pagadoresPorTerceiro(todos)).toEqual([{ id: "p", nome: "Pagador" }]);
    expect(pagadoresPorTerceiro(todos, ["i"])).toEqual([{ id: "i", nome: "Inativo (inativo)" }, { id: "p", nome: "Pagador" }]);
  });
});

describe("filtrarCadastros (6.1)", () => {
  const lista = [
    { nome: "Betoneira Exemplo Ltda", nomeFantasia: "BetEx", doc: "00.000.001/0001-36", papeis: ["Fornecedor de Material"], ativo: true },
    { nome: "Ivo Exemplo", nomeFantasia: null, doc: "000.000.001-91", papeis: ["Mão de Obra RPA"], ativo: true },
    { nome: "Antigo Inativo", nomeFantasia: null, doc: null, papeis: ["Construtora"], ativo: false },
  ];
  it("busca por nome sem acento, por fantasia e por documento (com ou sem máscara)", () => {
    expect(filtrarCadastros(lista, { busca: "ivo" }).map((s) => s.nome)).toEqual(["Ivo Exemplo"]);
    expect(filtrarCadastros(lista, { busca: "betex" }).map((s) => s.nome)).toEqual(["Betoneira Exemplo Ltda"]);
    expect(filtrarCadastros(lista, { busca: "000000010001" }).map((s) => s.nome)).toEqual(["Betoneira Exemplo Ltda"]);
    expect(filtrarCadastros(lista, { busca: "000.000.001" }).map((s) => s.nome)).toEqual(["Ivo Exemplo"]);
    expect(filtrarCadastros(lista, { busca: "brasil sousa" })).toEqual([]);
  });
  it("filtra por papel e respeita 'mostrar inativos'", () => {
    expect(filtrarCadastros(lista, { papel: "Construtora" })).toEqual([]);
    expect(filtrarCadastros(lista, { papel: "Construtora", mostrarInativos: true }).map((s) => s.nome)).toEqual(["Antigo Inativo"]);
    expect(filtrarCadastros(lista, {})).toHaveLength(2);
  });
});

describe("Prompt S3 — paga por terceiro: a lista não vem vazia para quem já pagou", () => {
  it("quem tem o papel aparece; quem já pagou sem o papel também, marcado; inativo só se for o da edição", async () => {
    const { pagadoresPorTerceiro, PAPEL_PAGADOR_TERCEIRO } = await import("./stakeholder-regras");
    const todos = [
      { id: "a", nome: "Ana", ativo: true, papeis: [PAPEL_PAGADOR_TERCEIRO] },
      { id: "b", nome: "Beto", ativo: true, papeis: [] },
      { id: "c", nome: "Caio", ativo: true, papeis: [] },
      { id: "d", nome: "Duda", ativo: false, papeis: [PAPEL_PAGADOR_TERCEIRO] },
    ];
    expect(pagadoresPorTerceiro(todos, [], new Set(["b", "d"]))).toEqual([
      { id: "a", nome: "Ana" },
      { id: "b", nome: "Beto (já pagou antes, sem o papel)" },
    ]);
    expect(pagadoresPorTerceiro(todos, ["d"]).map((x) => x.nome)).toEqual(["Ana", "Duda (inativo)"]);
  });
});

