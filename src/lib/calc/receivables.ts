import { parseDate } from "./projection";
import { serieVencimentos } from "./carencia";
import type { PaymentPlan, UnitStatus } from "./types";

export interface Receivable {
  /** data prevista, "MM/DD/YYYY". */
  dia: string;
  valor: number;
  label: string;
  /**
   * Seção do plano de onde veio ("AS", "S1", "S2", "S3", "Mensais",
   * "Semestrais", "Anuais", "FGTS", "Subsidio", "Permuta", "Banco"). Prompt AT
   * §2.1: quem projeta dinheiro precisa separar a permuta, que não entra no caixa.
   */
  secao: string;
}

/**
 * Expande o plano de pagamento de uma unidade vendida em recebíveis datados
 * (uma linha por vencimento). Base do painel "Receitas a Receber do Dia".
 * Só gera recebíveis para unidades com status "Vendido".
 */
export function expandUnitReceivables(
  plan: PaymentPlan | null | undefined,
  status: UnitStatus,
): Receivable[] {
  if (status !== "Vendido" || !plan) return [];
  const out: Receivable[] = [];
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
