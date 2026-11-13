/**
 * Acerto contábil e abatimento em lote — Módulos 4.1 e 5.
 *
 * Duas operações que o sistema não tinha e que o cliente faz todo mês:
 *
 *  - **restituição em lote** — ele não restitui item a item; fecha o combo e
 *    paga um valor único, que precisa ser distribuído entre os PEDs abertos;
 *  - **acerto contábil** — um pagamento único quita várias despesas, de obras
 *    diferentes, com um comprovante só, e quase nunca fecha na vírgula (a
 *    diferença é juros de atraso ou desconto negociado).
 *
 * Tudo aqui é puro: o cálculo do que abate o quê é a parte que precisa estar
 * certa, e é a parte que dá para provar sem banco.
 */

const round2 = (v: number) => Math.round(v * 100) / 100;

// ───────────────────────── Abatimento FIFO (item 4.1) ───────────────────────

export interface ItemAbativel {
  id: string;
  /** competência "MM/YYYY" — critério primário do FIFO. */
  competencia: string | null;
  /** número do documento — desempate dentro da mesma competência. */
  numDoc: string | null;
  /** quanto ainda falta abater neste item. */
  saldo: number;
}

export interface Abatimento {
  id: string;
  valorAbatido: number;
  /** saldo que sobra no item depois deste abatimento. */
  saldoRestante: number;
  /** o item ficou integralmente quitado? */
  quitado: boolean;
}

export interface ResultadoAbatimento {
  abatimentos: Abatimento[];
  /** total efetivamente distribuído. */
  totalAbatido: number;
  /** valor que sobrou sem destino (pagamento maior que a dívida). */
  sobra: number;
}

/** "MM/YYYY" → número comparável. Sem competência vai para o fim da fila. */
function ordemCompetencia(c: string | null): number {
  const p = (c ?? "").split("/");
  if (p.length !== 2) return Number.MAX_SAFE_INTEGER;
  const n = Number(p[1]) * 100 + Number(p[0]);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

/**
 * Ordena os itens na fila do FIFO: competência mais antiga primeiro e, dentro
 * da mesma competência, por número do documento.
 *
 * Devolve uma cópia — a ordem da tela não é alterada por engano.
 */
export function ordemFifo<T extends ItemAbativel>(itens: readonly T[]): T[] {
  return [...itens].sort((a, b) => {
    const d = ordemCompetencia(a.competencia) - ordemCompetencia(b.competencia);
    if (d !== 0) return d;
    return (a.numDoc ?? "").localeCompare(b.numDoc ?? "", "pt-BR", { numeric: true });
  });
}

/**
 * Distribui `valor` entre os itens, do mais antigo para o mais novo (CA-20).
 *
 * Quita integralmente os PEDs mais antigos e deixa o último parcialmente
 * abatido — que é exatamente como imputação de pagamento funciona. Itens sem
 * saldo são ignorados; se o valor exceder a dívida total, o excedente volta em
 * `sobra` em vez de ser forçado em algum item.
 */
export function abaterFifo(
  valor: number,
  itens: readonly ItemAbativel[],
): ResultadoAbatimento {
  const abatimentos: Abatimento[] = [];
  let restante = round2(valor);
  for (const item of ordemFifo(itens)) {
    if (restante <= 0.004) break;
    const saldo = round2(item.saldo);
    if (saldo <= 0.004) continue;
    const abate = round2(Math.min(saldo, restante));
    restante = round2(restante - abate);
    const saldoRestante = round2(saldo - abate);
    abatimentos.push({
      id: item.id,
      valorAbatido: abate,
      saldoRestante,
      quitado: saldoRestante <= 0.004,
    });
  }
  return {
    abatimentos,
    totalAbatido: round2(abatimentos.reduce((a, x) => a + x.valorAbatido, 0)),
    sobra: round2(restante),
  };
}

/**
 * Abatimento por SELEÇÃO MANUAL (item 4.1) — o usuário escolhe quais PEDs e
 * quanto em cada um, para atender acordos específicos.
 *
 * Cada valor é limitado ao saldo do item: informar mais do que se deve não
 * pode gerar abatimento fantasma.
 */
export function abaterManual(
  escolhas: readonly { id: string; valor: number }[],
  itens: readonly ItemAbativel[],
): ResultadoAbatimento {
  const porId = new Map(itens.map((i) => [i.id, i]));
  const abatimentos: Abatimento[] = [];
  for (const e of escolhas) {
    const item = porId.get(e.id);
    if (!item) continue;
    const saldo = round2(item.saldo);
    const abate = round2(Math.min(Math.max(0, e.valor), saldo));
    if (abate <= 0.004) continue;
    const saldoRestante = round2(saldo - abate);
    abatimentos.push({
      id: e.id,
      valorAbatido: abate,
      saldoRestante,
      quitado: saldoRestante <= 0.004,
    });
  }
  return {
    abatimentos,
    totalAbatido: round2(abatimentos.reduce((a, x) => a + x.valorAbatido, 0)),
    sobra: 0,
  };
}

// ──────────────── Diferença financeira do acerto (item 5.2 / RG-07) ─────────

export type TipoDiferenca = "JUROS" | "DESCONTO" | "NENHUMA";

export interface DiferencaAcerto {
  valor: number;
  tipo: TipoDiferenca;
}

/**
 * Diferença entre o que saiu do banco e o que foi vinculado.
 *
 * Positiva (pagou mais) → **juros e multas**, despesa financeira do período.
 * Negativa (pagou menos) → **descontos obtidos**, receita financeira.
 *
 * Em nenhum dos casos a diferença é rateada no custo das obras: juros de mora
 * são perda operacional, não custo de obtenção de recursos (RG-07 / CPC 20).
 * Capitalizá-los inflaria o custo da obra e adiaria o reconhecimento do
 * prejuízo.
 *
 * Tolerância de 1 centavo: abaixo disso é arredondamento, não diferença.
 */
export function calcularDiferenca(
  valorTransferido: number,
  totalVinculado: number,
): DiferencaAcerto {
  const dif = round2(valorTransferido - totalVinculado);
  if (Math.abs(dif) <= 0.01) return { valor: 0, tipo: "NENHUMA" };
  return { valor: Math.abs(dif), tipo: dif > 0 ? "JUROS" : "DESCONTO" };
}

/**
 * A diferença financeira NUNCA entra no custo da obra (RG-07).
 *
 * Existe como função para ficar explícito no código e quebrar o teste se
 * alguém decidir "distribuir os juros entre as obras para fechar".
 */
export function impactoNoCustoDaObra(): number {
  return 0;
}

/**
 * RG-08 — o acerto fecha? A soma dos abatimentos mais a diferença financeira
 * tem de ser exatamente o valor que saiu da conta.
 */
export function acertoFecha(
  valorTransferido: number,
  totalVinculado: number,
  diferenca: DiferencaAcerto,
): boolean {
  const sinal = diferenca.tipo === "DESCONTO" ? -1 : 1;
  return Math.abs(totalVinculado + sinal * diferenca.valor - valorTransferido) <= 0.01;
}

// ──────────────────── Rateio entre obras (item 5.3 / CA-26) ─────────────────

export interface LinhaRateio {
  projectId: string;
  /** informado em valor OU em percentual — o outro é derivado. */
  valor?: number;
  percentual?: number;
}

export interface RateioCalculado {
  projectId: string;
  valor: number;
  percentual: number;
}

/**
 * Distribui um pagamento único entre obras, por valor ou por percentual.
 *
 * A diferença de arredondamento vai para a ÚLTIMA obra, para que a soma feche
 * exatamente com o total pago — senão o rateio "perde" centavos e o caixa não
 * bate com a soma dos PEDs gerados.
 */
export function calcularRateio(
  valorTotal: number,
  linhas: readonly LinhaRateio[],
): RateioCalculado[] {
  if (linhas.length === 0) return [];
  const usaPercentual = linhas.some((l) => l.percentual != null);
  const brutos = linhas.map((l) =>
    usaPercentual
      ? round2((valorTotal * (l.percentual ?? 0)) / 100)
      : round2(l.valor ?? 0),
  );
  const soma = round2(brutos.reduce((a, v) => a + v, 0));
  // Só ajusta quando a intenção era distribuir o total inteiro (percentual);
  // em modo valor, uma soma diferente é divergência a ser reportada, não
  // corrigida em silêncio.
  if (usaPercentual && soma !== valorTotal) {
    brutos[brutos.length - 1] = round2(brutos[brutos.length - 1] + (valorTotal - soma));
  }
  return linhas.map((l, i) => ({
    projectId: l.projectId,
    valor: brutos[i],
    percentual: valorTotal === 0 ? 0 : round2((brutos[i] / valorTotal) * 100),
  }));
}

/**
 * O rateio fecha em 100% / no valor total? (CA-27)
 *
 * Tolerância de 1 centavo. Um rateio que não fecha é bloqueado: ele determina
 * o custo por centro de custo e um erro aqui contamina o resultado de cada obra.
 */
export function rateioFecha(
  valorTotal: number,
  rateio: readonly RateioCalculado[],
): boolean {
  const soma = round2(rateio.reduce((a, r) => a + r.valor, 0));
  return Math.abs(soma - valorTotal) <= 0.01;
}

/** Mensagem de bloqueio do rateio, ou `null` quando ele fecha. */
export function validarRateio(
  valorTotal: number,
  rateio: readonly RateioCalculado[],
): string | null {
  if (rateio.length === 0) return "Informe ao menos um projeto no rateio.";
  if (rateio.some((r) => r.valor < 0)) return "Nenhum projeto pode receber valor negativo.";
  if (!rateioFecha(valorTotal, rateio)) {
    const soma = round2(rateio.reduce((a, r) => a + r.valor, 0));
    const dif = round2(soma - valorTotal);
    return `O rateio soma ${soma.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })} e o pagamento foi ${valorTotal.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })} — diferença de ${dif.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })}. Ajuste antes de confirmar.`;
  }
  return null;
}

// ─────────────────────────────── Aging (item 4.1) ───────────────────────────

export interface FaixasAging {
  ate30: number;
  de31a60: number;
  de61a90: number;
  acima90: number;
}

/** Distribui saldos em aberto pelas faixas de idade (0-30/31-60/61-90/90+). */
export function calcularAging(
  itens: readonly { saldo: number; diasEmAberto: number }[],
): FaixasAging {
  const f: FaixasAging = { ate30: 0, de31a60: 0, de61a90: 0, acima90: 0 };
  for (const i of itens) {
    if (i.saldo <= 0) continue;
    if (i.diasEmAberto <= 30) f.ate30 += i.saldo;
    else if (i.diasEmAberto <= 60) f.de31a60 += i.saldo;
    else if (i.diasEmAberto <= 90) f.de61a90 += i.saldo;
    else f.acima90 += i.saldo;
  }
  return {
    ate30: round2(f.ate30),
    de31a60: round2(f.de31a60),
    de61a90: round2(f.de61a90),
    acima90: round2(f.acima90),
  };
}
