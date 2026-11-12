/**
 * Prompt L2 (Fase 3 · revisão V5, Caixa): "se lancei entradas projetadas
 * para quinta, tem que aparecer aqui; se tenho saídas projetadas, também —
 * aí você já tem uma projeção de como vão ser os saldos dos próximos dias".
 * Módulo PURO.
 *
 * A cadeia de saldo (Prompt L) projeta só o que já está lançado no caixa
 * com data futura. Isto acrescenta, por dia, o que VENCE: contas a pagar em
 * aberto (pelo saldo) e contas a receber em aberto (lançadas e parcelas dos
 * planos de venda), e o saldo projetado que resulta. Não muda a cadeia nem
 * o conciliado: é uma linha a mais no cartão do dia.
 */

export interface TituloEmAberto {
  /** "MM/DD/YYYY" */
  vencimento: string | null;
  /** O que ainda falta pagar ou receber. */
  saldo: number;
}

export interface PrevistoDoDia {
  aReceber: number;
  aPagar: number;
}

export interface Atrasados {
  aReceber: { qtd: number; valor: number };
  aPagar: { qtd: number; valor: number };
}

/** "MM/DD/YYYY" → "YYYY-MM-DD"; inválida → null. */
export function isoDaData(d: string | null | undefined): string | null {
  if (!d) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d.trim());
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Soma, por dia da faixa (chaves "YYYY-MM-DD" a partir de hoje), o que vence.
 * O que venceu antes de hoje e segue em aberto vai para `atrasados`, não para
 * um dia — dinheiro atrasado não tem data para entrar.
 */
export function previstoPorDia(
  diasDaFaixa: readonly string[],
  hojeISO: string,
  aReceber: readonly TituloEmAberto[],
  aPagar: readonly TituloEmAberto[],
): { porDia: Record<string, PrevistoDoDia>; atrasados: Atrasados } {
  const futuros = new Set(diasDaFaixa.filter((d) => d >= hojeISO));
  const porDia: Record<string, PrevistoDoDia> = {};
  for (const d of futuros) porDia[d] = { aReceber: 0, aPagar: 0 };
  const atrasados: Atrasados = { aReceber: { qtd: 0, valor: 0 }, aPagar: { qtd: 0, valor: 0 } };
  const somar = (lista: readonly TituloEmAberto[], lado: keyof PrevistoDoDia) => {
    for (const t of lista) {
      if (!(t.saldo > 0.005)) continue;
      const iso = isoDaData(t.vencimento);
      if (!iso) continue;
      if (iso < hojeISO) {
        atrasados[lado].qtd++;
        atrasados[lado].valor = r2(atrasados[lado].valor + t.saldo);
      } else if (futuros.has(iso)) {
        porDia[iso][lado] = r2(porDia[iso][lado] + t.saldo);
      }
    }
  };
  somar(aReceber, "aReceber");
  somar(aPagar, "aPagar");
  return { porDia, atrasados };
}

/**
 * Saldo projetado ao fim de cada dia de hoje em diante: parte do conciliado
 * final de ontem (o inicial de hoje), soma o que a cadeia já projeta (caixa
 * lançado com data futura) e o que vence. Dias passados ficam de fora.
 */
export function saldosProjetados(
  dias: readonly { dia: string; conciliado: { inicial: number; final: number } }[],
  hojeISO: string,
  porDia: Record<string, PrevistoDoDia>,
): Record<string, number> {
  const out: Record<string, number> = {};
  let saldo: number | null = null;
  for (const d of dias) {
    if (d.dia < hojeISO) continue;
    if (saldo == null) saldo = d.conciliado.inicial;
    const doCaixa = d.conciliado.final - d.conciliado.inicial;
    const p = porDia[d.dia] ?? { aReceber: 0, aPagar: 0 };
    saldo = r2(saldo + doCaixa + p.aReceber - p.aPagar);
    out[d.dia] = saldo;
  }
  return out;
}

/**
 * O que está a receber, para a faixa do Caixa: contas a receber lançadas (o
 * que falta receber, inclusive vencidas, que contam como atraso) e parcelas dos
 * planos de venda de hoje em diante (não guardam recebimento).
 *
 * Prompt AT §2.1 (Revisão 4): a PERMUTA do plano não entra. Permuta é um bem,
 * não dinheiro: contá-la inflava o saldo projetado dos próximos dias. O
 * financiamento (`Banco`) fica como está até a decisão BAR-3 do Prompt AR.
 */
export function aReceberDaFaixa(
  contasReceber: readonly { status: string | null; vencimento: string | null; valor: number; valorRecebido: number }[],
  recebiveisDasVendas: readonly { dia: string; valor: number; secao: string }[],
  hojeISO: string,
): TituloEmAberto[] {
  return [
    ...contasReceber.filter((c) => c.status !== "Recebido").map((c) => ({ vencimento: c.vencimento, saldo: c.valor - c.valorRecebido })),
    ...recebiveisDasVendas
      .filter((r) => r.secao !== "Permuta" && (isoDaData(r.dia) ?? "") >= hojeISO)
      .map((r) => ({ vencimento: r.dia, saldo: r.valor })),
  ];
}

/**
 * Prompt AT §5.3 (chave "parcela_recebida_situacao") — a mesma faixa, com as
 * parcelas de venda pelo SALDO (o que ainda não foi recebido pela conciliação)
 * e SEM cortar as vencidas: a parcela vencida e não recebida entra nos
 * atrasados. Permuta continua fora (não é dinheiro).
 */
export function aReceberDaFaixaComRecebimentos(
  contasReceber: readonly { status: string | null; vencimento: string | null; valor: number; valorRecebido: number }[],
  parcelasDeVenda: readonly { dia: string; saldo: number; secao: string }[],
): TituloEmAberto[] {
  return [
    ...contasReceber.filter((c) => c.status !== "Recebido").map((c) => ({ vencimento: c.vencimento, saldo: c.valor - c.valorRecebido })),
    ...parcelasDeVenda.filter((r) => r.secao !== "Permuta" && r.saldo > 0.005).map((r) => ({ vencimento: r.dia, saldo: r.saldo })),
  ];
}

