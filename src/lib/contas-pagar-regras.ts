/**
 * Regras de Contas a Pagar (Prompt I, §10 e §15) — puras e testáveis.
 *
 * §15: o pendente de uma conta é o SALDO a pagar (valor − principal pago −
 * abatimentos de acertos ativos), nunca o valor original. Despesa de 100 com
 * 80 pagos deve 20. O saldo vem de `saldosReaisDasDespesas` (uma lógica só,
 * a mesma do acerto contábil).
 */

export interface ContaComSaldo {
  status: string | null;
  valor: number;
  /** saldo real a pagar; ausente em linhas antigas = valor cheio. */
  saldo?: number;
}

/** O que ainda vai sair do caixa por esta conta. Paga = zero. */
export function pendenteDaConta(c: ContaComSaldo): number {
  if (c.status === "Pago") return 0;
  return Math.max(0, c.saldo ?? c.valor);
}

/** Soma do pendente de várias contas, em centavos exatos. */
export function totalPendente(contas: readonly ContaComSaldo[]): number {
  return Math.round(contas.reduce((a, c) => a + pendenteDaConta(c), 0) * 100) / 100;
}

/** §10 — Contas a Pagar é exclusivamente a versão Atual. */
export function ehVersaoAtual(kind: string | null | undefined): boolean {
  return kind === "atual";
}

/**
 * Prompt R, 1.2 — a tela lista por OBRIGAÇÃO QUE VENCE: despesa sem
 * parcelamento entra como está; despesa parcelada vira uma linha por parcela,
 * cada uma com seu número, vencimento, saldo (valor − pago) e cheque (1.3).
 * Parcela paga entra como "Pago" (mesma ordenação das despesas pagas).
 * Linhas de obrigação com terceiro não mudam (1.5). Puro.
 */
export interface ParcelaParaLinha {
  despesaId: string;
  numero: number;
  vencimento: string | null;
  valorOriginal: number;
  valorPago: number;
  status: string;
  dataPagamento: string | null;
  chequeNumero: string | null;
  bomPara: string | null;
}

export function linhasPorObrigacao<T extends { id: string; origem?: string; valor: number; saldo?: number; status: string | null; vencimento: string | null; dataPagamento: string | null; descricao: string | null }>(
  contas: readonly T[],
  parcelas: readonly ParcelaParaLinha[],
): (T & { despesaId?: string; parcela?: { numero: number; total: number; chequeNumero: string | null; bomPara: string | null } })[] {
  const porDespesa = new Map<string, ParcelaParaLinha[]>();
  for (const p of parcelas) porDespesa.set(p.despesaId, [...(porDespesa.get(p.despesaId) ?? []), p]);
  const out: (T & { despesaId?: string; parcela?: { numero: number; total: number; chequeNumero: string | null; bomPara: string | null } })[] = [];
  for (const c of contas) {
    const ps = c.origem === "obrigacao" ? undefined : porDespesa.get(c.id);
    if (!ps || ps.length === 0) {
      out.push(c);
      continue;
    }
    const total = ps.length;
    for (const p of [...ps].sort((a, b) => a.numero - b.numero)) {
      const saldo = Math.max(0, Math.round((p.valorOriginal - p.valorPago) * 100) / 100);
      const paga = p.status === "Pago" || saldo === 0;
      out.push({
        ...c,
        id: `${c.id}#${p.numero}`,
        despesaId: c.id,
        parcela: { numero: p.numero, total, chequeNumero: p.chequeNumero, bomPara: p.bomPara },
        valor: p.valorOriginal,
        saldo,
        status: paga ? "Pago" : p.status === "Pago parcialmente" ? "Parcialmente paga" : c.status === "Pago" ? "Pago" : c.status,
        vencimento: p.vencimento ?? c.vencimento,
        dataPagamento: p.dataPagamento ?? (paga ? c.dataPagamento : null),
      });
    }
  }
  return out;
}

/**
 * Prompt R, seção 5 — filtros com seleção múltipla: dentro de um filtro é
 * "ou" (qualquer dos marcados), entre filtros é "e"; nenhum marcado = todos.
 * `statusDe` é o status EXIBIDO da linha (com "Vencida"). Puro.
 */
export interface FiltrosContasPagar {
  fornecedores: readonly string[];
  clientes: readonly string[];
  projetos: readonly string[];
  categorias: readonly string[];
  status: readonly string[];
  /** ISO, inclusive */
  de?: string;
  ate?: string;
}

export const CLIENTE_PROPRIO = "Projeto próprio (sem cliente)";

export function filtrarContasPagar<T extends { fornecedorNome: string | null; clienteNome: string | null; projectId: string; categoriaDre: string | null; vencimento: string | null }>(
  rows: readonly T[],
  f: FiltrosContasPagar,
  statusDe: (r: T) => string,
  vencimentoISO: (v: string | null) => string,
): T[] {
  const ok = (lista: readonly string[], v: string | null | undefined) => lista.length === 0 || lista.includes(v ?? "");
  return rows.filter((r) => {
    if (!ok(f.fornecedores, r.fornecedorNome)) return false;
    if (!ok(f.clientes, r.clienteNome ?? CLIENTE_PROPRIO)) return false;
    if (!ok(f.projetos, r.projectId)) return false;
    if (!ok(f.categorias, r.categoriaDre)) return false;
    if (!ok(f.status, statusDe(r))) return false;
    const iso = vencimentoISO(r.vencimento);
    if (f.de && (!iso || iso < f.de)) return false;
    if (f.ate && (!iso || iso > f.ate)) return false;
    return true;
  });
}
