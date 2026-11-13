import { describe, it, expect } from "vitest";
import {
  bloqueiosDeExclusao,
  confirmacaoConfere,
  interesseNaFaixa,
  lerFiltrosClientes,
  linkDaListagem,
  recusaDeInteresse,
  recusaDeStatusContrato,
  statusContratoCanonico,
  statusLiberaUnidade,
  termosDaBusca,
} from "./clientes-regras";

describe("statusLiberaUnidade (Prompt M, 6.2)", () => {
  it("libera os status de distrato/cancelamento, sem diferenciar caixa, acento e espaço", () => {
    for (const s of ["Distratado", "distratado", " DISTRATO ", "Cancelado", "cancelada"]) {
      expect(statusLiberaUnidade(s)).toBe(true);
    }
  });
  it("em branco ou qualquer outro status: NÃO libera (a unidade segue reservada)", () => {
    for (const s of [null, undefined, "", "  ", "Ativo", "Assinado", "Em análise"]) {
      expect(statusLiberaUnidade(s)).toBe(false);
    }
  });
});

describe("confirmacaoConfere (6.1)", () => {
  it("exige o nome, sem diferenciar caixa, acento e espaços das pontas", () => {
    expect(confirmacaoConfere("joão da silva", "João da Silva")).toBe(true);
    expect(confirmacaoConfere(" JOAO DA SILVA ", "João da Silva")).toBe(true);
    expect(confirmacaoConfere("João", "João da Silva")).toBe(false);
    expect(confirmacaoConfere("", "")).toBe(false);
    expect(confirmacaoConfere(null, "X")).toBe(false);
  });
});

describe("bloqueiosDeExclusao (6.1)", () => {
  const livre = { unidadeComContratoAtivo: null, contasReceber: 0, documentos: 0, obrasComoCliente: 0, recebimentosTerceiros: 0 };
  it("sem vínculos, nada bloqueia", () => {
    expect(bloqueiosDeExclusao(livre)).toEqual([]);
  });
  it("cada vínculo vira um motivo legível", () => {
    const m = bloqueiosDeExclusao({ unidadeComContratoAtivo: "A-101", contasReceber: 2, documentos: 1, obrasComoCliente: 1, recebimentosTerceiros: 3 });
    expect(m).toHaveLength(5);
    expect(m[0]).toContain("A-101");
    expect(m[1]).toContain("2 conta(s) a receber");
  });
});

describe("interesse (6.7)", () => {
  it("1 a 5 inteiro está na faixa; o resto não", () => {
    for (const n of [1, 2, 3, 4, 5]) expect(interesseNaFaixa(n)).toBe(true);
    for (const n of [0, 6, -1, 10, 2.5, null, undefined]) expect(interesseNaFaixa(n)).toBe(false);
  });
  it("recusa valor novo fora da faixa; aceita vazio, 1–5 e o mesmo valor já gravado", () => {
    expect(recusaDeInteresse(null)).toBeNull();
    expect(recusaDeInteresse(3)).toBeNull();
    expect(recusaDeInteresse(7)).toMatch(/1 a 5/);
    expect(recusaDeInteresse(7, 7)).toBeNull(); // salvar sem mexer não é barrado
    expect(recusaDeInteresse(8, 7)).toMatch(/1 a 5/);
    expect(recusaDeInteresse(4, 7)).toBeNull(); // corrigir é aceito
  });
});

describe("listagem (6.8)", () => {
  it("lerFiltrosClientes: página inválida vira 1; busca aparada", () => {
    expect(lerFiltrosClientes({ q: "  ana ", status: "Ativo", pagina: "3" })).toEqual({ q: "ana", status: "Ativo", pagina: 3 });
    expect(lerFiltrosClientes({ pagina: "0" }).pagina).toBe(1);
    expect(lerFiltrosClientes({ pagina: "abc" }).pagina).toBe(1);
    expect(lerFiltrosClientes({ pagina: ["2", "5"] }).pagina).toBe(2);
  });
  it("termosDaBusca: sem acento e minúsculo, um termo por palavra", () => {
    expect(termosDaBusca("  JOSÉ   Conceição ")).toEqual(["jose", "conceicao"]);
    expect(termosDaBusca("")).toEqual([]);
  });
  it("linkDaListagem mantém os filtros e omite o padrão", () => {
    const f = { q: "ana b", status: "Ativo", pagina: 1 };
    expect(linkDaListagem(f)).toBe("/clientes?q=ana+b&status=Ativo");
    expect(linkDaListagem(f, { pagina: 2 })).toBe("/clientes?q=ana+b&status=Ativo&pagina=2");
    expect(linkDaListagem({ q: "", status: "", pagina: 1 })).toBe("/clientes");
  });
});

describe("status do contrato — lista fechada (6.2, decisão 30/09)", () => {
  it("reconhece a lista sem diferenciar maiúsculas e acentos, devolvendo a grafia da lista", () => {
    expect(statusContratoCanonico("ATIVO")).toBe("Ativo");
    expect(statusContratoCanonico(" em analise ")).toBe("Em análise");
    expect(statusContratoCanonico("Vigente")).toBeNull();
    expect(statusContratoCanonico("")).toBeNull();
  });
  it("aceita vazio, a lista e o mesmo valor já gravado; recusa valor novo fora da lista", () => {
    expect(recusaDeStatusContrato(null)).toBeNull();
    expect(recusaDeStatusContrato("Reservado")).toBeNull();
    expect(recusaDeStatusContrato("ATIVO")).toBeNull();
    expect(recusaDeStatusContrato("Vigente")).toMatch(/Ativo, Assinado/);
    expect(recusaDeStatusContrato("Vigente", "Vigente")).toBeNull(); // salvar sem mexer
    expect(recusaDeStatusContrato("Outro", "Vigente")).not.toBeNull();
  });
});
