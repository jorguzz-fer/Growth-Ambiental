import { describe, it, expect } from "vitest";
import { serieVencimentos } from "./carencia";
import { getIncc } from "./incc";
import { addMonths, monthKey, parseDate, calcProjection, calcProjectionBySource, calcTotals, calcUnitTotal, type ProjectionSource } from "./projection";
import { expandUnitReceivables, type Receivable } from "./receivables";

/** O recebível como era antes da chave da parcela (Prompt AT §5.1). */
type ReceivableAntigo = Omit<Receivable, "chave">;
const semChave = ({ chave, ...r }: Receivable): ReceivableAntigo => {
  void chave;
  return r;
};
import { lerPlano } from "./plano";
import type { CalcPermuta, CalcReembolso, CalcUnit, InccRow, MonthlyProjection, PaymentPlan, UnitStatus, VersionTotals } from "./types";

/**
 * Prompt AR, Fase 2 (Revisão 4), AR-T1/AR-T3 — a leitura única NÃO muda número.
 *
 * As funções abaixo, com o prefixo "antigo", são CÓPIAS LITERAIS das leituras
 * de antes de `lerPlano` (receivables.ts e projection.ts do commit 2a79b77).
 * O teste gera 5.000 planos ao acaso, com casos de borda (seção ausente,
 * quantidade zero, data vazia ou inválida, dia 31, caixinhas aleatórias,
 * subsídio pendente, unidade não vendida), e exige resultado idêntico.
 *
 * Fora do sorteio, de propósito: valor em TEXTO no plano e quantidade negativa
 * ou fracionária. Nesses casos a leitura antiga somava texto (concatenava) ou
 * contava parcelas negativas; a nova converte para número. O formulário de
 * unidade, a importação e a leitura por IA gravam números inteiros.
 */
const PROJECTION_SOURCES_ANTIGO = ["AS/Sinais", "Mensais", "Semestrais", "Anuais", "FGTS", "Subsídio", "Permuta"] as const;
const INCC_FROM_INSTALLMENT = 4;
void PROJECTION_SOURCES_ANTIGO;

function antigoExpand(
  plan: PaymentPlan | null | undefined,
  status: UnitStatus,
): ReceivableAntigo[] {
  if (status !== "Vendido" || !plan) return [];
  const out: ReceivableAntigo[] = [];
  const fmt = (mo: number, d: number, yr: number) =>
    `${String(mo).padStart(2, "0")}/${String(d).padStart(2, "0")}/${yr}`;

  // Planos antigos/parciais podem não conter todas as seções — leia de forma
  // tolerante (seção ausente = campos vazios/zero) para nunca quebrar o cálculo.
  const p = plan as unknown as Record<string, unknown>;
  const sec = (k: string) => (p[k] ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const num = (v: unknown) => Number(v) || 0;

  const periodic: { secao: string; venc: string; val: number; n: number; label: string; step: number }[] = [
    { secao: "AS", venc: str(sec("AS").venc), val: num(sec("AS").val), n: num(sec("AS").n), label: "Ato", step: 1 },
    { secao: "S1", venc: str(sec("S1").venc), val: num(sec("S1").val), n: num(sec("S1").n), label: "Sinal 1", step: 1 },
    { secao: "S2", venc: str(sec("S2").venc), val: num(sec("S2").val), n: num(sec("S2").n), label: "Sinal 2", step: 1 },
    { secao: "S3", venc: str(sec("S3").venc), val: num(sec("S3").val), n: num(sec("S3").n), label: "Sinal 3", step: 1 },
    { secao: "Mensais", venc: str(sec("Mensais").venc), val: num(sec("Mensais").val), n: num(sec("Mensais").n), label: "Mensal", step: 1 },
    { secao: "Semestrais", venc: str(sec("Semestrais").venc), val: num(sec("Semestrais").val), n: num(sec("Semestrais").n), label: "Semestral", step: 6 },
    { secao: "Anuais", venc: str(sec("Anuais").venc), val: num(sec("Anuais").val), n: num(sec("Anuais").n), label: "Anual", step: 12 },
  ];
  for (const s of periodic) {
    const d = parseDate(s.venc);
    const val = Number(s.val) || 0;
    const n = Math.max(1, Number(s.n) || 1);
    if (!d || val <= 0) continue;
    // Item 6.2 / 2.4 — o dia de vencimento é ENCOLHIDO para o último dia do mês
    // quando o mês de destino não o tem. Antes a data era montada com o dia
    // ORIGINAL no mês deslocado, produzindo strings como "04/31/2026" — data
    // que não existe no calendário e que nenhuma tela conseguia interpretar.
    //
    // O dia desejado é sempre o da data-base: encolher em fevereiro NÃO
    // contamina março (31/01 → 28/02 → 31/03, e não 28/03).
    const datas = serieVencimentos(s.venc, n, s.step);
    for (let i = 0; i < n; i++) {
      out.push({
        dia: datas[i] ?? fmt(d.mo, d.d, d.yr),
        valor: val,
        label: n > 1 ? `${s.label} #${i + 1}` : s.label,
        secao: s.secao,
      });
    }
  }

  const singles: { secao: string; venc: string; val: number; label: string }[] = [
    { secao: "FGTS", venc: str(sec("FGTS").dataPrev), val: num(sec("FGTS").val), label: "FGTS" },
    { secao: "Subsidio", venc: str(sec("Subsidio").dataPrev), val: num(sec("Subsidio").val), label: "Subsídio" },
    { secao: "Permuta", venc: str(sec("Permuta").dataPrev), val: num(sec("Permuta").val), label: "Permuta" },
    { secao: "Banco", venc: str(sec("Banco").dataPrimParc), val: num(sec("Banco").valFinanc), label: "Financiamento" },
  ];
  for (const s of singles) {
    const d = parseDate(s.venc);
    const val = Number(s.val) || 0;
    if (!d || val <= 0) continue;
    out.push({ dia: fmt(d.mo, d.d, d.yr), valor: val, label: s.label, secao: s.secao });
  }
  return out;
}

function antigoBySource(
  u: CalcUnit,
  incc: readonly InccRow[] = [],
): Record<ProjectionSource, MonthlyProjection> {
  const out = {
    "AS/Sinais": {},
    Mensais: {},
    Semestrais: {},
    Anuais: {},
    FGTS: {},
    Subsídio: {},
    Permuta: {},
  } as Record<ProjectionSource, MonthlyProjection>;
  if (u.status !== "Vendido") return out;
  const add = (key: ProjectionSource, mm: string, v: number) => {
    if (v > 0) out[key][mm] = (out[key][mm] || 0) + v;
  };
  const periodic = (val: number, i: number, mk: string) =>
    Math.round(
      val * (1 + (i >= INCC_FROM_INSTALLMENT ? getIncc(incc, mk) : 0) / 100) * 100,
    ) / 100;

  const signals: { use: boolean; val: number; venc: string; n: number }[] = [
    { use: u.usarAS, val: u.AS.val, venc: u.AS.venc, n: u.AS.n },
    { use: u.AS.usarS1, val: u.S1.val, venc: u.S1.venc, n: u.S1.n },
    { use: u.S1.usarS2, val: u.S2.val, venc: u.S2.venc, n: u.S2.n },
    { use: u.S2.usarS3, val: u.S3.val, venc: u.S3.venc, n: u.S3.n },
  ];
  for (const s of signals) {
    if (s.use && s.val > 0) {
      const d = parseDate(s.venc);
      if (d)
        for (let i = 0; i < (s.n || 1); i++) {
          const dt = addMonths(d.mo, d.yr, i);
          add("AS/Sinais", monthKey(dt.mo, dt.yr), s.val);
        }
    }
  }
  if (u.S3.usarMens && u.Mensais.val > 0) {
    const d = parseDate(u.Mensais.venc);
    if (d)
      for (let i = 0; i < (u.Mensais.n || 0); i++) {
        const dt = addMonths(d.mo, d.yr, i);
        const mk = monthKey(dt.mo, dt.yr);
        add("Mensais", mk, periodic(u.Mensais.val, i, mk));
      }
  }
  if (u.Mensais.usarSem && u.Semestrais.val > 0) {
    const d = parseDate(u.Semestrais.venc);
    if (d)
      for (let i = 0; i < (u.Semestrais.n || 0); i++) {
        const dt = addMonths(d.mo, d.yr, i * 6);
        const mk = monthKey(dt.mo, dt.yr);
        add("Semestrais", mk, periodic(u.Semestrais.val, i, mk));
      }
  }
  if (u.Semestrais.usarAnu && u.Anuais.val > 0) {
    const d = parseDate(u.Anuais.venc);
    if (d)
      for (let i = 0; i < (u.Anuais.n || 0); i++) {
        const dt = addMonths(d.mo, d.yr, i * 12);
        const mk = monthKey(dt.mo, dt.yr);
        add("Anuais", mk, periodic(u.Anuais.val, i, mk));
      }
  }
  if (u.Anuais.usarFGTS && u.FGTS.val > 0) {
    const d = parseDate(u.FGTS.dataPrev);
    if (d) add("FGTS", monthKey(d.mo, d.yr), u.FGTS.val);
  }
  if (u.FGTS.usarSub && u.Subsidio.val > 0 && u.Subsidio.statusSub === "Recebido") {
    const d = parseDate(u.Subsidio.dataPrev);
    if (d) add("Subsídio", monthKey(d.mo, d.yr), u.Subsidio.val);
  }
  if (u.Subsidio.usarPer && u.Permuta.val > 0) {
    const d = parseDate(u.Permuta.dataPrev);
    if (d) add("Permuta", monthKey(d.mo, d.yr), u.Permuta.val);
  }
  return out;
}

function antigoProjection(
  u: CalcUnit,
  incc: readonly InccRow[] = [],
): MonthlyProjection {
  const proj: MonthlyProjection = {};
  const add = (mm: string, v: number) => {
    if (v > 0) proj[mm] = (proj[mm] || 0) + v;
  };
  if (u.status !== "Vendido") return proj;

  const periodic = (val: number, i: number, mk: string) =>
    Math.round(
      val * (1 + (i >= INCC_FROM_INSTALLMENT ? getIncc(incc, mk) : 0) / 100) *
        100,
    ) / 100;

  if (u.usarAS && u.AS.val > 0) {
    const d = parseDate(u.AS.venc);
    if (d)
      for (let i = 0; i < (u.AS.n || 1); i++) {
        const dt = addMonths(d.mo, d.yr, i);
        add(monthKey(dt.mo, dt.yr), u.AS.val);
      }
  }
  if (u.AS.usarS1 && u.S1.val > 0) {
    const d = parseDate(u.S1.venc);
    if (d)
      for (let i = 0; i < (u.S1.n || 1); i++) {
        const dt = addMonths(d.mo, d.yr, i);
        add(monthKey(dt.mo, dt.yr), u.S1.val);
      }
  }
  if (u.S1.usarS2 && u.S2.val > 0) {
    const d = parseDate(u.S2.venc);
    if (d)
      for (let i = 0; i < (u.S2.n || 1); i++) {
        const dt = addMonths(d.mo, d.yr, i);
        add(monthKey(dt.mo, dt.yr), u.S2.val);
      }
  }
  if (u.S2.usarS3 && u.S3.val > 0) {
    const d = parseDate(u.S3.venc);
    if (d)
      for (let i = 0; i < (u.S3.n || 1); i++) {
        const dt = addMonths(d.mo, d.yr, i);
        add(monthKey(dt.mo, dt.yr), u.S3.val);
      }
  }
  if (u.S3.usarMens && u.Mensais.val > 0) {
    const d = parseDate(u.Mensais.venc);
    if (d)
      for (let i = 0; i < (u.Mensais.n || 0); i++) {
        const dt = addMonths(d.mo, d.yr, i);
        const mk = monthKey(dt.mo, dt.yr);
        add(mk, periodic(u.Mensais.val, i, mk));
      }
  }
  if (u.Mensais.usarSem && u.Semestrais.val > 0) {
    const d = parseDate(u.Semestrais.venc);
    if (d)
      for (let i = 0; i < (u.Semestrais.n || 0); i++) {
        const dt = addMonths(d.mo, d.yr, i * 6);
        const mk = monthKey(dt.mo, dt.yr);
        add(mk, periodic(u.Semestrais.val, i, mk));
      }
  }
  if (u.Semestrais.usarAnu && u.Anuais.val > 0) {
    const d = parseDate(u.Anuais.venc);
    if (d)
      for (let i = 0; i < (u.Anuais.n || 0); i++) {
        const dt = addMonths(d.mo, d.yr, i * 12);
        const mk = monthKey(dt.mo, dt.yr);
        add(mk, periodic(u.Anuais.val, i, mk));
      }
  }
  if (u.Anuais.usarFGTS && u.FGTS.val > 0) {
    const d = parseDate(u.FGTS.dataPrev);
    if (d) add(monthKey(d.mo, d.yr), u.FGTS.val);
  }
  if (u.FGTS.usarSub && u.Subsidio.val > 0 && u.Subsidio.statusSub === "Recebido") {
    const d = parseDate(u.Subsidio.dataPrev);
    if (d) add(monthKey(d.mo, d.yr), u.Subsidio.val);
  }
  if (u.Subsidio.usarPer && u.Permuta.val > 0) {
    const d = parseDate(u.Permuta.dataPrev);
    if (d) add(monthKey(d.mo, d.yr), u.Permuta.val);
  }
  return proj;
}

function antigoUnitTotal(u: CalcUnit): number {
  if (u.status !== "Vendido") return 0;
  let t = 0;
  t +=
    (u.AS.val || 0) * (u.AS.n || 1) +
    (u.S1.val || 0) * (u.S1.n || 1) +
    (u.S2.val || 0) * (u.S2.n || 1) +
    (u.S3.val || 0) * (u.S3.n || 1);
  t +=
    (u.Mensais.val || 0) * (u.Mensais.n || 0) +
    (u.Semestrais.val || 0) * (u.Semestrais.n || 0) +
    (u.Anuais.val || 0) * (u.Anuais.n || 0);
  t +=
    (u.FGTS.val || 0) +
    (u.Subsidio.val || 0) +
    (u.Permuta.val || 0) +
    (u.Banco.valFinanc || 0);
  return t;
}

function antigoTotals(
  units: readonly CalcUnit[],
  permutas: readonly CalcPermuta[],
  reembolsos: readonly CalcReembolso[],
  /**
   * Prompt AE — chave "resumo_definicao_nova" (nasce desligada). Ligada:
   * S1, S2 e S3 multiplicam pela quantidade, como o AS e como a Projeção
   * (2.4); permuta e liberação canceladas ficam fora (2.7). Desligada
   * (padrão): exatamente o de antes. `calcTotals` só é usada pelo Resumo.
   */
  opts: { definicaoNova?: boolean } = {},
): VersionTotals {
  const nova = !!opts.definicaoNova;
  const cancelada = (st: string | null | undefined) => nova && /cancel/i.test(st ?? "");
  let sinais = 0,
    mens = 0,
    sem = 0,
    anu = 0,
    fgts = 0,
    sub = 0,
    permRec = 0,
    permVend = 0,
    banco = 0;

  units.forEach((u) => {
    if (u.status !== "Vendido") return;
    sinais +=
      (u.AS.val || 0) * (u.AS.n || 1) +
      (u.S1.val || 0) * (nova ? u.S1.n || 1 : 1) +
      (u.S2.val || 0) * (nova ? u.S2.n || 1 : 1) +
      (u.S3.val || 0) * (nova ? u.S3.n || 1 : 1);
    mens += (u.Mensais.val || 0) * (u.Mensais.n || 0);
    sem += (u.Semestrais.val || 0) * (u.Semestrais.n || 0);
    anu += (u.Anuais.val || 0) * (u.Anuais.n || 0);
    fgts += u.FGTS.val || 0;
    sub += u.Subsidio.val || 0;
    banco += u.Banco.valFinanc || 0;
  });

  permutas.forEach((p) => {
    if (cancelada(p.status)) return;
    permRec += p.estimado || 0;
    if (p.status === "Vendido") permVend += p.valorVenda || 0;
  });

  const reemb = reembolsos.filter((r) => !cancelada(r.status)).reduce((a, r) => a + (r.valor || 0), 0);
  const vgv = units.reduce((a, u) => a + u.valor, 0);

  return {
    vgv,
    sinais,
    mens,
    sem,
    anu,
    fgts,
    sub,
    permRec,
    permVend,
    reemb,
    banco,
    disp: units.filter((u) => u.status === "Disponivel").length,
    res: units.filter((u) => u.status === "Reservado").length,
    vend: units.filter((u) => u.status === "Vendido").length,
  };
}


// ───────────── gerador de planos ao acaso (semente fixa: o teste é reproduzível) ─────────────
function sorteador(semente: number) {
  let x = semente >>> 0;
  const r = () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 2 ** 32;
  };
  const um = <T,>(lista: readonly T[]): T => lista[Math.floor(r() * lista.length)];
  return { r, um };
}

const DATAS = ["", "abc", "01/31/2026", "02/27/2026", "12/15/2026", "11/30/2025", "05/10/2027", "02/29/2028", "1/5/2026"];
const VALORES = [0, 0, 1000, 5000, 20000, 333.33, -50];
const QTDS = [0, 1, 1, 2, 3, 6, 12, 36, undefined];

function planoAoAcaso(s: ReturnType<typeof sorteador>): { plano: Record<string, unknown>; status: UnitStatus } {
  const { r, um } = s;
  const flag = () => r() < 0.6;
  const fonte = (extra: Record<string, unknown>) => (r() < 0.12 ? undefined : { val: um(VALORES), venc: um(DATAS), n: um(QTDS), ...extra });
  const plano: Record<string, unknown> = {
    usarAS: flag(),
    AS: fonte({ usarS1: flag() }),
    S1: fonte({ usarS2: flag() }),
    S2: fonte({ usarS3: flag() }),
    S3: fonte({ usarMens: flag() }),
    Mensais: fonte({ usarSem: flag() }),
    Semestrais: fonte({ usarAnu: flag() }),
    Anuais: fonte({ usarFGTS: flag() }),
    FGTS: r() < 0.12 ? undefined : { val: um(VALORES), dataPrev: um(DATAS), usarSub: flag() },
    Subsidio: r() < 0.12 ? undefined : { val: um(VALORES), dataPrev: um(DATAS), statusSub: um(["Recebido", "Aguardando Caixa", "Pendente"]), usarPer: flag() },
    Permuta: r() < 0.12 ? undefined : { desc: "", val: um(VALORES), dataPrev: um(DATAS), usarFinanc: flag() },
    Banco: r() < 0.12 ? undefined : { valFinanc: um(VALORES), dataEntrada: "", dataPrimParc: um(DATAS), statusFinanc: um(["", "Financiamento Aprovado"]) },
  };
  for (const k of Object.keys(plano)) if (plano[k] === undefined) delete plano[k];
  return { plano, status: um(["Vendido", "Vendido", "Vendido", "Disponivel", "Reservado"] as UnitStatus[]) };
}

/** Como `toCalcUnit` monta a unidade de cálculo: o plano salvo por cima de um plano completo e zerado. */
function comoCalcUnit(plano: Record<string, unknown>, status: UnitStatus): CalcUnit {
  const off = { val: 0, venc: "", n: 0 };
  const base: Record<string, unknown> = {
    usarAS: false, AS: { ...off, usarS1: false }, S1: { ...off, usarS2: false }, S2: { ...off, usarS3: false }, S3: { ...off, usarMens: false },
    Mensais: { ...off, usarSem: false }, Semestrais: { ...off, usarAnu: false }, Anuais: { ...off, usarFGTS: false },
    FGTS: { val: 0, dataPrev: "", usarSub: false }, Subsidio: { val: 0, dataPrev: "", statusSub: "Aguardando Caixa", usarPer: false },
    Permuta: { desc: "", val: 0, dataPrev: "", usarFinanc: false }, Banco: { valFinanc: 0, dataEntrada: "", dataPrimParc: "", statusFinanc: "" },
  };
  const out: Record<string, unknown> = { ...base };
  for (const k of Object.keys(base)) {
    const b = base[k];
    const v = plano[k];
    if (b && typeof b === "object") out[k] = v && typeof v === "object" ? { ...(b as object), ...(v as object) } : b;
    else if (v !== undefined) out[k] = v;
  }
  return { ...(out as unknown as PaymentPlan), code: "X", status, valor: 100000 };
}

const INCC: InccRow[] = Array.from({ length: 60 }, (_, i) => {
  const mo = (i % 12) + 1;
  const yr = 2025 + Math.floor(i / 12);
  return { m: `${String(mo).padStart(2, "0")}/${yr}`, mo: 0.4, ac: Math.round((i * 0.4 + 0.1) * 100) / 100 };
});

describe("leitura única do plano: nenhum número muda (AR-T1, AR-T3)", () => {
  const s = sorteador(20261112);
  const casos = Array.from({ length: 5000 }, () => planoAoAcaso(s));

  it("recebíveis (Contas a Receber, DRE, Fluxo): idênticos, na mesma ordem", () => {
    for (const { plano, status } of casos) {
      // Prompt AT §5.1: a chave da parcela é campo NOVO; o resto é idêntico ao de antes.
      expect(expandUnitReceivables(plano as unknown as PaymentPlan, status).map(semChave)).toEqual(antigoExpand(plano as unknown as PaymentPlan, status));
    }
  });

  it("projeção por fonte e projeção total, com INCC: idênticas", () => {
    for (const { plano, status } of casos) {
      const u = comoCalcUnit(plano, status);
      expect(calcProjectionBySource(u, INCC)).toEqual(antigoBySource(u, INCC));
      expect(calcProjection(u, INCC)).toEqual(antigoProjection(u, INCC));
    }
  });

  it("total contratado da unidade: idêntico", () => {
    for (const { plano, status } of casos) {
      const u = comoCalcUnit(plano, status);
      expect(calcUnitTotal(u)).toBeCloseTo(antigoUnitTotal(u), 6);
    }
  });

  it("totais do Resumo, nas duas definições: idênticos", () => {
    for (let i = 0; i < casos.length; i += 25) {
      const lote = casos.slice(i, i + 25).map(({ plano, status }) => comoCalcUnit(plano, status));
      for (const definicaoNova of [false, true]) {
        const novo = calcTotals(lote, [], [], { definicaoNova });
        const antigo = antigoTotals(lote, [], [], { definicaoNova });
        for (const k of Object.keys(antigo) as (keyof VersionTotals)[]) expect(novo[k]).toBeCloseTo(antigo[k], 6);
      }
    }
  });

  it("a unidade de teste da spec continua dando 555 / 530 / 465 mil", async () => {
    const { bla401 } = await import("./__fixtures__");
    const u = bla401();
    const receb = expandUnitReceivables(u, u.status).reduce((a, x) => a + x.valor, 0);
    const proj = Object.values(calcProjectionBySource(u, [])).reduce((a, m) => a + Object.values(m).reduce((b, v) => b + v, 0), 0);
    const t = calcTotals([u], [], []);
    expect([receb, proj, t.sinais + t.mens + t.sem + t.anu + t.fgts + t.sub + t.banco]).toEqual([555000, 530000, 465000]);
    expect(lerPlano(u, u.status).length).toBeGreaterThan(0);
  });
});

describe("importação de extrato: os valores esperados de parcela não mudam", () => {
  const cents = (v: number) => Math.round(v * 100);
  // CÓPIA LITERAL do trecho antigo de `importCash` (src/lib/actions/caixa.ts).
  const antigo = (c: CalcUnit) => {
    const out = new Set<number>();
    for (const val of [c.AS.val, c.S1.val, c.S2.val, c.S3.val, c.Mensais.val, c.Semestrais.val, c.Anuais.val, c.FGTS.val, c.Subsidio.val, c.Permuta.val]) {
      if (val && val > 0) out.add(cents(val));
    }
    return out;
  };
  const novo = (plano: unknown, status: UnitStatus) => {
    const out = new Set<number>();
    for (const p of lerPlano(plano, status, { qualquerStatus: true, periodicaMinimaUm: true })) if (p.origem !== "Banco" && p.valorBase > 0) out.add(cents(p.valorBase));
    return out;
  };
  it("mesmo conjunto de valores, de unidades vendidas ou não", () => {
    const s = sorteador(777);
    for (let i = 0; i < 3000; i++) {
      const { plano, status } = planoAoAcaso(s);
      expect(novo(plano, status)).toEqual(antigo(comoCalcUnit(plano, status)));
    }
  });
});
