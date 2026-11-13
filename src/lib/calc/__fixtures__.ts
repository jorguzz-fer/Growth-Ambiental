import type { CalcUnit } from "./types";

/**
 * Unidade UNID 401 do protótipo (vendida, plano de pagamento completo).
 * Usada nos testes de paridade com o cálculo original.
 */
export function bla401(): CalcUnit {
  return {
    code: "UNID 401",
    status: "Vendido",
    valor: 537027,
    usarAS: true,
    AS: { val: 5000, venc: "02/27/2026", n: 1, usarS1: true },
    S1: { val: 5000, venc: "02/27/2026", n: 1, usarS2: true },
    S2: { val: 5000, venc: "02/27/2026", n: 1, usarS3: true },
    S3: { val: 5000, venc: "02/27/2026", n: 1, usarMens: true },
    Mensais: { val: 5000, venc: "02/27/2026", n: 36, usarSem: true },
    Semestrais: { val: 20000, venc: "02/27/2026", n: 6, usarAnu: true },
    Anuais: { val: 30000, venc: "02/27/2026", n: 3, usarFGTS: true },
    FGTS: { val: 20000, dataPrev: "02/27/2026", usarSub: true },
    Subsidio: {
      val: 10000,
      dataPrev: "02/27/2026",
      statusSub: "Recebido",
      usarPer: true,
    },
    Permuta: { desc: "", val: 90000, dataPrev: "01/10/2026", usarFinanc: true },
    Banco: {
      valFinanc: 25000,
      dataEntrada: "01/27/2026",
      dataPrimParc: "01/27/2026",
      statusFinanc: "Financiamento Aprovado",
    },
  };
}

/** Unidade disponível com a cascata zerada/desligada. */
export function emptyUnit(code = "UNID X", valor = 420000): CalcUnit {
  const off = { val: 0, venc: "", n: 0 };
  return {
    code,
    status: "Disponivel",
    valor,
    usarAS: false,
    AS: { ...off, usarS1: false },
    S1: { ...off, usarS2: false },
    S2: { ...off, usarS3: false },
    S3: { ...off, usarMens: false },
    Mensais: { ...off, usarSem: false },
    Semestrais: { ...off, usarAnu: false },
    Anuais: { ...off, usarFGTS: false },
    FGTS: { val: 0, dataPrev: "", usarSub: false },
    Subsidio: {
      val: 0,
      dataPrev: "",
      statusSub: "Aguardando Caixa",
      usarPer: false,
    },
    Permuta: { desc: "", val: 0, dataPrev: "", usarFinanc: false },
    Banco: { valFinanc: 0, dataEntrada: "", dataPrimParc: "", statusFinanc: "" },
  };
}
