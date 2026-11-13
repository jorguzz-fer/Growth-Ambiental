import { describe, it, expect } from "vitest";
import {
  chaveOrdenacao,
  dataOrdenavel,
  ordenarTabela,
  proximoEstado,
  setaOrdenacao,
  textoOrdenavel,
  valorOrdenavel,
  type ColunaOrdenavel,
} from "./tabela-ordenacao";

interface Linha {
  id: string;
  fornecedor: string | null;
  valor: number | null;
  vencimento: string | null;
}

const COLUNAS: ColunaOrdenavel<Linha>[] = [
  { key: "fornecedor", tipo: "texto", get: (r) => r.fornecedor },
  { key: "valor", tipo: "valor", get: (r) => r.valor },
  { key: "vencimento", tipo: "data", get: (r) => r.vencimento },
];

const L = (
  id: string,
  fornecedor: string | null,
  valor: number | null,
  vencimento: string | null,
): Linha => ({ id, fornecedor, valor, vencimento });

const ids = (rows: Linha[]) => rows.map((r) => r.id).join(",");

describe("chaves de ordenação", () => {
  it("data interna MM/DD/YYYY vira número cronológico", () => {
    expect(dataOrdenavel("01/05/2026")).toBe(20260105);
    expect(dataOrdenavel("12/31/2025")).toBe(20251231);
    // Cronológico, não alfabético: 01/2026 é POSTERIOR a 12/2025.
    expect(dataOrdenavel("01/05/2026")! > dataOrdenavel("12/31/2025")!).toBe(true);
  });

  it("data vazia ou malformada não tem chave", () => {
    expect(dataOrdenavel(null)).toBeNull();
    expect(dataOrdenavel("")).toBeNull();
    expect(dataOrdenavel("2026-01-05")).toBeNull();
    expect(dataOrdenavel("abc/def/ghi")).toBeNull();
  });

  it("texto ignora acento e caixa", () => {
    expect(textoOrdenavel("Ávila")).toBe("avila");
    expect(textoOrdenavel("  CONCRETO  ")).toBe("concreto");
    expect(textoOrdenavel("")).toBeNull();
    expect(textoOrdenavel(null)).toBeNull();
  });

  it("valor distingue zero de vazio", () => {
    expect(valorOrdenavel(0)).toBe(0);
    expect(valorOrdenavel("")).toBeNull();
    expect(valorOrdenavel(null)).toBeNull();
    expect(valorOrdenavel("1234.56")).toBe(1234.56);
  });

  it("chaveOrdenacao respeita o tipo declarado da coluna", () => {
    expect(chaveOrdenacao("10", "valor")).toBe(10);
    expect(chaveOrdenacao("10", "texto")).toBe("10");
    expect(chaveOrdenacao("03/01/2026", "data")).toBe(20260301);
  });
});

describe("ciclo de cliques no cabeçalho", () => {
  it("1º clique crescente, 2º decrescente, 3º volta ao padrão", () => {
    const a = proximoEstado(null, "valor");
    expect(a).toEqual({ coluna: "valor", direcao: "asc" });
    const b = proximoEstado(a, "valor");
    expect(b).toEqual({ coluna: "valor", direcao: "desc" });
    expect(proximoEstado(b, "valor")).toBeNull();
  });

  it("clicar em outra coluna reinicia em crescente", () => {
    const desc = { coluna: "valor", direcao: "desc" as const };
    expect(proximoEstado(desc, "fornecedor")).toEqual({
      coluna: "fornecedor",
      direcao: "asc",
    });
  });

  it("a seta só aparece na coluna ativa", () => {
    const st = { coluna: "valor", direcao: "asc" as const };
    expect(setaOrdenacao(st, "valor")).toBe("▲");
    expect(setaOrdenacao({ ...st, direcao: "desc" }, "valor")).toBe("▼");
    expect(setaOrdenacao(st, "fornecedor")).toBe("");
    expect(setaOrdenacao(null, "valor")).toBe("");
  });
});

describe("ordenarTabela", () => {
  const rows: Linha[] = [
    L("3", "Cimento SA", 300, "03/10/2026"),
    L("1", "ávila materiais", 1000, "12/31/2025"),
    L("2", "Betoneira Exemplo", 50.5, "01/05/2026"),
  ];

  it("sem estado devolve a ordem original (padrão da tela)", () => {
    expect(ids(ordenarTabela(rows, COLUNAS, null, (r) => r.id))).toBe("3,1,2");
  });

  it("texto em ordem alfabética ignorando acento e caixa", () => {
    expect(
      ids(ordenarTabela(rows, COLUNAS, { coluna: "fornecedor", direcao: "asc" }, (r) => r.id)),
    ).toBe("1,2,3");
    expect(
      ids(ordenarTabela(rows, COLUNAS, { coluna: "fornecedor", direcao: "desc" }, (r) => r.id)),
    ).toBe("3,2,1");
  });

  it("valor em ordem numérica — não como string", () => {
    expect(
      ids(ordenarTabela(rows, COLUNAS, { coluna: "valor", direcao: "asc" }, (r) => r.id)),
    ).toBe("2,3,1");
    expect(
      ids(ordenarTabela(rows, COLUNAS, { coluna: "valor", direcao: "desc" }, (r) => r.id)),
    ).toBe("1,3,2");
  });

  it("data em ordem cronológica — não alfabética", () => {
    expect(
      ids(ordenarTabela(rows, COLUNAS, { coluna: "vencimento", direcao: "asc" }, (r) => r.id)),
    ).toBe("1,2,3");
  });

  it("vazios ficam por último nas DUAS direções", () => {
    const comVazios: Linha[] = [
      L("a", "Zeta", null, null),
      L("b", "Alfa", 10, "01/01/2026"),
      L("c", null, 20, "02/01/2026"),
    ];
    const asc = ordenarTabela(comVazios, COLUNAS, { coluna: "valor", direcao: "asc" }, (r) => r.id);
    const desc = ordenarTabela(comVazios, COLUNAS, { coluna: "valor", direcao: "desc" }, (r) => r.id);
    expect(asc[asc.length - 1].id).toBe("a");
    expect(desc[desc.length - 1].id).toBe("a");

    const txtDesc = ordenarTabela(
      comVazios,
      COLUNAS,
      { coluna: "fornecedor", direcao: "desc" },
      (r) => r.id,
    );
    expect(txtDesc[txtDesc.length - 1].id).toBe("c");
  });

  it("empate é resolvido pelo ID e não oscila entre renders", () => {
    const empatadas: Linha[] = [
      L("c", "Igual", 100, "01/01/2026"),
      L("a", "Igual", 100, "01/01/2026"),
      L("b", "Igual", 100, "01/01/2026"),
    ];
    const asc = ordenarTabela(empatadas, COLUNAS, { coluna: "valor", direcao: "asc" }, (r) => r.id);
    const desc = ordenarTabela(empatadas, COLUNAS, { coluna: "valor", direcao: "desc" }, (r) => r.id);
    // Desempate SEMPRE crescente por ID — não inverte junto com o primário.
    expect(ids(asc)).toBe("a,b,c");
    expect(ids(desc)).toBe("a,b,c");
  });

  it("não altera o array recebido (nenhuma escrita, nem em memória compartilhada)", () => {
    const original = [...rows];
    ordenarTabela(rows, COLUNAS, { coluna: "valor", direcao: "desc" }, (r) => r.id);
    expect(rows).toEqual(original);
  });

  it("ordena o conjunto FILTRADO inteiro, não só a página visível", () => {
    // 120 linhas com valores decrescentes; a menor está no fim do array.
    const muitas: Linha[] = Array.from({ length: 120 }, (_, i) =>
      L(String(i).padStart(3, "0"), `F${i}`, 1000 - i, "01/01/2026"),
    );
    const asc = ordenarTabela(muitas, COLUNAS, { coluna: "valor", direcao: "asc" }, (r) => r.id);
    // A primeira linha da 1ª página tem que ser o menor valor de TODO o conjunto.
    expect(asc[0].valor).toBe(1000 - 119);
    expect(asc.length).toBe(120);
  });

  it("coluna desconhecida não quebra nem reordena", () => {
    expect(
      ids(ordenarTabela(rows, COLUNAS, { coluna: "inexistente", direcao: "asc" }, (r) => r.id)),
    ).toBe("3,1,2");
  });
});
