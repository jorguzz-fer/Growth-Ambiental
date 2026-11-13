import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { buildExportBuffer, buildTemplateBuffer, parseWorkbook, planilhaDoPlanoPadrao, SHEETS, type GrupoDaPlanilha } from "./growth-template";
import { emptyPlan } from "@/lib/calc/plan";
import type { InccRow } from "@/lib/calc/types";
import { PLANO_CONTAS_PADRAO as PLANO_CONTAS } from "@/lib/calc/plano-ambiental";

const incc: InccRow[] = [
  { m: "05/2025", mo: 0.26, ac: 0.26 },
  { m: "06/2025", mo: 0.96, ac: 1.222 },
];

/** Lê a 1ª linha (cabeçalho) de uma aba do template. */
function headers(tmpl: XLSX.WorkBook, sheet: string): string[] {
  return (XLSX.utils.sheet_to_json(tmpl.Sheets[sheet], { header: 1 })[0] as string[]);
}
function rowFor(hs: string[], obj: Record<string, unknown>): unknown[] {
  return hs.map((h) => obj[h] ?? "");
}

/** Planilha no formato ANTIGO (incorporação): a exportação de uma versão com unidades, liberações e permutas. */
function filledWorkbook(): Buffer {
  const plan = emptyPlan();
  plan.usarAS = true;
  plan.AS = { val: 5000, venc: "02/27/2026", n: 1, usarS1: false };
  return buildExportBuffer({
    incc: incc,
    units: [{ code: "UNID 999", bloco: null, tipo: null, m2: null, andar: null, valor: 500000, status: "Vendido", mesVenda: null, plan }],
    reembolsos: [{ data: "01/27/2026", origem: "X", valor: 50000, pct: "", obs: "", serial: null }],
    permutas: [{ unitCode: "UNID 999", cliente: "", dataRecebimento: "", tipo: "Carro", descricao: "", estimado: 40000, status: "Vendido", dataVenda: "", valorVenda: 35000, tipoPermuta: "", obs: "" }],
    despesas: [{ contaCef: PLANO_CONTAS.obra[0].sub[0].id, competencia: "01/2025", valor: 125000 }],
  });
}

describe("growth-template", () => {
  it("o modelo (Growth Ambiental) tem só Parametros (meses) e Despesas", () => {
    const wb = XLSX.read(buildTemplateBuffer(incc), { type: "buffer" });
    expect(wb.SheetNames).toEqual(["Parametros", "Despesas"]);
    expect(headers(wb, SHEETS.parametros)).toEqual(["MES", "Observacao"]);
  });

  it("modelo novo: despesa da aba Despesas vira lançamento; sem colunas de INCC, nada de INCC é lido", () => {
    const tmpl = XLSX.read(buildTemplateBuffer(incc), { type: "buffer" });
    const aoa = XLSX.utils.sheet_to_json(tmpl.Sheets[SHEETS.despesas], { header: 1 }) as unknown[][];
    aoa[1][4] = 900; // Fev/Ano1
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, tmpl.Sheets[SHEETS.parametros], SHEETS.parametros);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), SHEETS.despesas);
    const p = parseWorkbook(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer);
    expect(p.incc).toEqual([]);
    expect(p.units).toEqual([]);
    expect(p.despesas).toEqual([{ contaCef: PLANO_CONTAS.obra[0].sub[0].id, competencia: "02/2025", vencimento: "02/2025", valor: 900 }]);
  });

  it("exportação de versão sem dados de incorporação: formato novo", () => {
    const wb = XLSX.read(buildExportBuffer({ incc, units: [], reembolsos: [], permutas: [], despesas: [] }), { type: "buffer" });
    expect(wb.SheetNames).toEqual(["Parametros", "Despesas"]);
  });

  it("exportação de versão com dados antigos: formato antigo, com as 5 abas", () => {
    const wb = XLSX.read(filledWorkbook(), { type: "buffer" });
    expect(wb.SheetNames).toEqual(["Parametros", "Dados_de_Venda", "Reembolso", "Permuta", "Despesas_CEF"]);
  });

  it("Despesas traz TODOS os subitens do plano de contas", () => {
    // A contagem é derivada de PLANO_CONTAS, não fixada à mão: o plano cresce
    // (o pacote de Controladoria acrescentou as contas F.6 a F.9 ao grupo
    // Financeiro/Contábil, para RG-03, RG-04 e RG-07) e um número cravado aqui
    // quebraria a cada conta nova sem apontar defeito algum.
    // 0079: só contas de despesa — conta de receita não é lançada como despesa.
    const esperado = [...PLANO_CONTAS.obra, ...PLANO_CONTAS.complementar]
      .filter((g) => g.natureza !== "receita")
      .reduce((a, g) => a + g.sub.length, 0);
    const wb = XLSX.read(buildTemplateBuffer(incc), { type: "buffer" });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[SHEETS.despesas], { header: 1 });
    expect(rows.length).toBe(1 + esperado); // cabeçalho + subitens
  });

  it("formato antigo (leitura): parseia unidade + plano de pagamento", () => {
    const p = parseWorkbook(filledWorkbook());
    expect(p.units).toHaveLength(1);
    const u = p.units[0];
    expect(u.code).toBe("UNID 999");
    expect(u.status).toBe("Vendido");
    expect(u.valor).toBe(500000);
    expect(u.plan.usarAS).toBe(true);
    expect(u.plan.AS).toMatchObject({ val: 5000, venc: "02/27/2026", n: 1, usarS1: false });
  });

  it("formato antigo (leitura): reembolsos, permutas e INCC", () => {
    const p = parseWorkbook(filledWorkbook());
    expect(p.reembolsos).toHaveLength(1);
    expect(p.reembolsos[0].valor).toBe(50000);
    expect(p.permutas).toHaveLength(1);
    expect(p.permutas[0]).toMatchObject({ unitCode: "UNID 999", status: "Vendido", valorVenda: 35000 });
    expect(p.incc).toHaveLength(2);
    expect(p.incc[0]).toMatchObject({ mes: "05/2025", accumulated: 0.26 });
  });

  it("formato antigo (leitura): despesa da aba Despesas_CEF vira lançamento com conta e competência", () => {
    const p = parseWorkbook(filledWorkbook());
    expect(p.despesas).toHaveLength(1);
    // 1º subitem do plano padrão (o código vem do plano, nunca fixo no teste); Jan/Ano1 com base 2025
    expect(p.despesas[0]).toMatchObject({ contaCef: PLANO_CONTAS.obra[0].sub[0].id, competencia: "01/2025", valor: 125000 });
  });
});

import type { ExportData } from "./growth-template";

describe("buildExportBuffer (round-trip export → import)", () => {
  it("exporta dados preenchidos e reimporta recuperando-os", () => {
    const plan = emptyPlan();
    plan.usarAS = true;
    plan.AS = { val: 20000, venc: "01/10/2026", n: 1, usarS1: false };
    const codigo = PLANO_CONTAS.obra[0].sub[0].id;

    const data: ExportData = {
      incc: [
        { m: "01/2026", mo: 0.5, ac: 0.5 },
        { m: "02/2026", mo: 0.4, ac: 0.9 },
      ],
      units: [
        {
          code: "UNID 401", bloco: "A", tipo: "2Q", m2: 60, andar: 4,
          valor: 500000, status: "Vendido", mesVenda: "01/05/2026", plan,
        },
      ],
      reembolsos: [
        { data: "02/10/2026", origem: "Origem X", valor: 5000, pct: "", obs: "", serial: null },
      ],
      permutas: [
        {
          unitCode: "UNID 402", cliente: "Fulano", dataRecebimento: "01/10/2026",
          tipo: "Imóvel", descricao: "Apto", estimado: 100000, status: "Disponivel",
          dataVenda: "", valorVenda: 0, tipoPermuta: "", obs: "",
        },
      ],
      despesas: [{ contaCef: codigo, competencia: "03/2026", valor: 12345 }],
    };

    const buf = buildExportBuffer(data);
    const parsed = parseWorkbook(buf);

    expect(parsed.units).toHaveLength(1);
    expect(parsed.units[0].code).toBe("UNID 401");
    expect(parsed.units[0].valor).toBe(500000);
    expect(parsed.units[0].status).toBe("Vendido");
    expect(parsed.units[0].plan.AS.val).toBe(20000);
    expect(parsed.units[0].plan.usarAS).toBe(true);

    expect(parsed.reembolsos).toHaveLength(1);
    expect(parsed.reembolsos[0].valor).toBe(5000);

    expect(parsed.permutas).toHaveLength(1);
    expect(parsed.permutas[0].estimado).toBe(100000);

    // despesa recuperada no mês correto (03/2026)
    const d = parsed.despesas.find((x) => x.contaCef === codigo);
    expect(d).toBeTruthy();
    expect(d!.valor).toBe(12345);
    expect(d!.competencia).toBe("03/2026");
  });
});

// ─────────────── 0079: plano DA EMPRESA na planilha de lançamentos ───────────────

const planoDaEmpresa: GrupoDaPlanilha[] = [
  { grupo: "9.1 Campo", contas: [{ code: "9.1.01", nome: "Hospedagens" }, { code: "9.1.02", nome: "Diárias" }] },
  { grupo: "9.2 Escritório", contas: [{ code: "9.2.01", nome: "Aluguel" }, { code: "9.2.02", nome: "Diárias" }] },
];

function comValores(plano: GrupoDaPlanilha[], preencher: (aoa: unknown[][]) => void): Buffer {
  const tmpl = XLSX.read(buildTemplateBuffer(incc, plano), { type: "buffer" });
  const aoa = XLSX.utils.sheet_to_json(tmpl.Sheets[SHEETS.despesas], { header: 1 }) as unknown[][];
  preencher(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, tmpl.Sheets[SHEETS.parametros], SHEETS.parametros);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), SHEETS.despesas);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("planilha de lançamentos com o plano da empresa (0079)", () => {
  it("o modelo lista as contas do plano informado, com o código", () => {
    const wb = XLSX.read(buildTemplateBuffer(incc, planoDaEmpresa), { type: "buffer" });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[SHEETS.despesas], { header: 1 }) as unknown[][];
    expect(rows[0].slice(0, 3)).toEqual(["Grupo", "Subitem", "Codigo"]);
    expect(rows.slice(1).map((r) => r[2])).toEqual(["9.1.01", "9.1.02", "9.2.01", "9.2.02"]);
  });

  it("o plano padrão na planilha não traz conta de receita", () => {
    const codigos = planilhaDoPlanoPadrao().flatMap((g) => g.contas.map((c) => c.code));
    const receitas = PLANO_CONTAS.complementar.filter((g) => g.natureza === "receita").flatMap((g) => g.sub.map((s) => s.id));
    expect(receitas.length).toBeGreaterThan(0);
    for (const r of receitas) expect(codigos).not.toContain(r);
  });

  it("casa pelo código: nome repetido em grupos diferentes vai para a conta certa", () => {
    const buf = comValores(planoDaEmpresa, (aoa) => {
      aoa[4][3] = 700; // 9.2.02 Diárias (escritório)
    });
    const p = parseWorkbook(buf, planoDaEmpresa);
    expect(p.despesas).toEqual([expect.objectContaining({ contaCef: "9.2.02", valor: 700 })]);
    expect(p.despesasSemConta).toEqual([]);
  });

  it("planilha antiga (sem código) casa por grupo + nome; nome ambíguo sem grupo não casa", () => {
    const wb = XLSX.utils.book_new();
    const meses = ["Jan/Ano1"];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Grupo", "Subitem", ...meses],
      ["9.1 Campo", "hospedagens", 100],   // nome único, caixa diferente
      ["9.2 Escritório", "Diárias", 200],  // par grupo + nome
      ["Outro", "Diárias", 300],           // ambíguo: não adivinha
    ]), SHEETS.despesas);
    const p = parseWorkbook(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer, planoDaEmpresa);
    expect(p.despesas.map((d) => [d.contaCef, d.valor])).toEqual([["9.1.01", 100], ["9.2.02", 200]]);
    expect(p.despesasSemConta).toEqual([{ grupo: "Outro", subitem: "Diárias", codigo: "", celulas: 1 }]);
  });

  it("código fora do plano (ou conta inativa) é apontado, nunca descartado em silêncio", () => {
    const buf = comValores(planoDaEmpresa, (aoa) => {
      aoa[1][2] = "X.99";
      aoa[1][3] = 50;
    });
    const p = parseWorkbook(buf, planoDaEmpresa);
    expect(p.despesas).toEqual([]);
    expect(p.despesasSemConta).toEqual([{ grupo: "9.1 Campo", subitem: "Hospedagens", codigo: "X.99", celulas: 1 }]);
  });

  it("exportação não perde despesa de conta que saiu do plano ativo", () => {
    const data: ExportData = {
      incc: [{ m: "01/2026", mo: 0, ac: 0 }],
      units: [], reembolsos: [], permutas: [],
      despesas: [
        { contaCef: "9.1.01", competencia: "01/2026", valor: 10 },
        { contaCef: "ANTIGA.1", competencia: "02/2026", valor: 20 },
      ],
    };
    const wb = XLSX.read(buildExportBuffer(data, planoDaEmpresa), { type: "buffer" });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[SHEETS.despesas], { header: 1 }) as unknown[][];
    const antiga = rows.find((r) => r[2] === "ANTIGA.1")!;
    expect(antiga[0]).toBe("Fora do plano ativo");
    expect(antiga[4]).toBe(20);
    // reimportar aponta a linha (a conta não está no plano ativo): nada some calado
    const p = parseWorkbook(buildExportBuffer(data, planoDaEmpresa), planoDaEmpresa);
    expect(p.despesas).toEqual([expect.objectContaining({ contaCef: "9.1.01", valor: 10 })]);
    expect(p.despesasSemConta.map((d) => d.codigo)).toEqual(["ANTIGA.1"]);
  });
});
