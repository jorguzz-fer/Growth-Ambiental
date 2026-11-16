import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { linhasDaPlanilha as lerUmaVez } from "@/lib/extrato-planilha";
import { linhasDaFatura as lerFaturaUmaVez } from "@/lib/fatura-planilha";

/** Lê em cada fuso e exige o mesmo resultado em todos. */
function linhasDaPlanilha(dados: ArrayBuffer) {
  const res: ReturnType<typeof lerUmaVez>[] = [];
  emCadaFuso(() => res.push(lerUmaVez(dados)));
  for (const r of res.slice(1)) expect(JSON.stringify(r.rows)).toBe(JSON.stringify(res[0].rows));
  return res[0];
}
function linhasDaFatura(dados: ArrayBuffer) {
  const res: ReturnType<typeof lerFaturaUmaVez>[] = [];
  emCadaFuso(() => res.push(lerFaturaUmaVez(dados)));
  for (const r of res.slice(1)) expect(r).toEqual(res[0]);
  return res[0];
}

/**
 * GA-13 K1, K2 e K6 — extrato e fatura em CSV.
 *
 * K1: num CSV, a biblioteca de planilhas lia "03/07/2026" como mês/dia: com
 * dia de 1 a 12 a data saía trocada. K2: CSV em UTF-8 sem BOM era lido como
 * Latin-1 e o cabeçalho "Histórico" quebrava (a descrição virava "—").
 * K6: a fatura do cartão em CSV usava a mesma leitura.
 */
const enc = new TextEncoder();
const buf = (bytes: Uint8Array): ArrayBuffer => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
const utf8 = (s: string) => buf(enc.encode(s));
const utf8ComBom = (s: string) => buf(new Uint8Array([0xef, 0xbb, 0xbf, ...enc.encode(s)]));
/** Latin-1 / Windows-1252 (os caracteres deste teste cabem em 1 byte). */
const latin1 = (s: string) => buf(Uint8Array.from([...s].map((c) => c.charCodeAt(0))));
const resumo = (r: ReturnType<typeof linhasDaPlanilha>) => r.rows.map((x) => [x.data, x.descricao, x.valor]);

/**
 * O navegador de quem importa pode estar em qualquer fuso (a auditoria viu o
 * erro em America/Sao_Paulo). Cada caso roda em três fusos.
 */
const FUSOS = ["UTC", "America/Sao_Paulo", "Asia/Tokyo"];
const emCadaFuso = (fn: () => void) => {
  const antes = process.env.TZ;
  try {
    for (const tz of FUSOS) {
      process.env.TZ = tz;
      fn();
    }
  } finally {
    process.env.TZ = antes;
  }
};

const CSV_K1 = "Data,Historico,Documento,Valor\n03/07/2026,DIA 3 JULHO,1,-20.00\n25/07/2026,DIA 25 JULHO,2,-10.00\n";
const ESPERADO_K1 = [
  ["07/03/2026", "DIA 3 JULHO", -20],
  ["07/25/2026", "DIA 25 JULHO", -10],
];

describe("GA-13 K1 — extrato em CSV grava a data certa", () => {
  it("03/07/2026 é 3 de julho (07/03/2026 interno); 25/07/2026 é 25 de julho", () => {
    expect(resumo(linhasDaPlanilha(utf8(CSV_K1)))).toEqual(ESPERADO_K1);
  });

  it("separador ; com valor brasileiro -1.234,56", () => {
    const csv = "Data;Histórico;Documento;Valor\n03/07/2026;PAGAMENTO FORNECEDOR;10;-1.234,56\n04/07/2026;RECEBIMENTO;11;2.500,00\n";
    expect(resumo(linhasDaPlanilha(utf8(csv)))).toEqual([
      ["07/03/2026", "PAGAMENTO FORNECEDOR", -1234.56],
      ["07/04/2026", "RECEBIMENTO", 2500],
    ]);
  });

  it("campo entre aspas com o separador dentro", () => {
    const csv = 'Data,Historico,Valor\n03/07/2026,"TARIFA, PACOTE",-1\n';
    expect(resumo(linhasDaPlanilha(utf8(csv)))).toEqual([["07/03/2026", "TARIFA, PACOTE", -1]]);
  });

  it("o mesmo extrato em XLSX (célula de data de verdade, número de série com formato) dá o mesmo resultado do CSV", () => {
    const serie = (a: number, m: number, d: number) => Date.UTC(a, m - 1, d) / 86400000 + 25569;
    const ws = XLSX.utils.aoa_to_sheet([
      ["Data", "Historico", "Documento", "Valor"],
      [{ t: "n", v: serie(2026, 7, 3), z: "dd/mm/yyyy" }, "DIA 3 JULHO", "1", -20],
      [{ t: "n", v: serie(2026, 7, 25), z: "m/d/yy" }, "DIA 25 JULHO", "2", -10],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Extrato");
    const xlsx = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    expect(resumo(linhasDaPlanilha(xlsx))).toEqual(ESPERADO_K1);
    expect(resumo(linhasDaPlanilha(xlsx))).toEqual(resumo(linhasDaPlanilha(utf8(CSV_K1))));
  });

  it("XLSX com a data como texto DD/MM/AAAA também sai certo", () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Data", "Historico", "Valor"],
      ["03/07/2026", "DIA 3 JULHO", -20],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Extrato");
    const xlsx = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    expect(resumo(linhasDaPlanilha(xlsx))).toEqual([["07/03/2026", "DIA 3 JULHO", -20]]);
  });
});

describe("GA-13 K2 — CSV em UTF-8 sem BOM não perde a coluna Histórico", () => {
  const csv = "Data,Histórico,Documento,Valor\n03/07/2026,DIA 3 JULHO,1,-20.00\n25/07/2026,DIA 25 JULHO,2,-10.00\n";
  it.each([
    ["UTF-8 com BOM", utf8ComBom(csv)],
    ["UTF-8 sem BOM", utf8(csv)],
    ["Latin-1", latin1(csv)],
  ])("%s: as mesmas linhas, com a descrição preenchida", (_nome, dados) => {
    expect(resumo(linhasDaPlanilha(dados))).toEqual(ESPERADO_K1);
  });

  it("acento no meio do texto também sobrevive em UTF-8 sem BOM", () => {
    const r = linhasDaPlanilha(utf8("Data;Histórico;Valor\n03/07/2026;PAGAMENTO ÁGUA E ESGOTO;-50,00\n"));
    expect(r.rows[0].descricao).toBe("PAGAMENTO ÁGUA E ESGOTO");
  });
});

describe("GA-13 K6 — fatura do cartão em CSV usa a mesma leitura", () => {
  it("03/07/2026 é 3 de julho; positivo = compra, negativo = crédito", () => {
    const csv = "Data;Descrição;Valor\n03/07/2026;POSTO DE COMBUSTÍVEL;150,00\n25/07/2026;ESTORNO;-20,00\n";
    expect(linhasDaFatura(utf8(csv))).toEqual([
      { data: "07/03/2026", descricao: "POSTO DE COMBUSTÍVEL", valor: 150 },
      { data: "07/25/2026", descricao: "ESTORNO", valor: -20 },
    ]);
  });
});
