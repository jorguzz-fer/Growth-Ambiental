/**
 * Regras PURAS das contas correntes (Prompt X). Nada aqui lê banco.
 */

export const TIPOS_DE_CONTA = ["Construtora", "Imobiliária", "Terceiros"] as const;
export type TipoDeConta = (typeof TIPOS_DE_CONTA)[number];

/**
 * Growth Ambiental: o tipo é só rótulo (não pesa em cálculo) e é enum no
 * banco. O valor gravado "Construtora" é a conta da PRÓPRIA empresa e aparece
 * como "Empresa (conta própria)"; "Imobiliária" fica só nas contas antigas.
 */
export const ROTULO_TIPO_DE_CONTA: Record<TipoDeConta, string> = {
  Construtora: "Empresa (conta própria)",
  Imobiliária: "Imobiliária (dados antigos)",
  Terceiros: "Terceiros",
};
/** Tipos oferecidos na conta nova (o valor gravado não muda). */
export const TIPOS_DE_CONTA_OFERECIDOS: readonly TipoDeConta[] = ["Construtora", "Terceiros"];
export const rotuloTipoDeConta = (t: string) => ROTULO_TIPO_DE_CONTA[t as TipoDeConta] ?? t;

/** 5.2 — banco obrigatório; saldo aceita negativo, mas não texto nem vazio. Devolve o motivo ou null. */
export function recusaDaConta(c: { banco: string; saldo: string | null | undefined }): string | null {
  if (!c.banco.trim()) return "Informe o banco.";
  const s = (c.saldo ?? "").toString().trim().replace(",", ".");
  if (s === "") return "Informe o saldo (pode ser zero ou negativo).";
  if (!/^-?\d+(\.\d+)?$/.test(s) || !Number.isFinite(Number(s))) return "Saldo precisa ser um número (pode ser negativo).";
  return null;
}

/** 1.3 — sem agência e conta é o sinal de que não é conta bancária. Aviso, não bloqueio. */
export function avisoDeCadastro(c: { ag: string | null | undefined; cc: string | null | undefined }): string | null {
  const semAg = !(c.ag ?? "").trim();
  const semCc = !(c.cc ?? "").trim();
  if (semAg && semCc) return "Sem agência e sem número de conta: confira se é mesmo uma conta bancária da empresa. Saldo com sócios e terceiros fica em Ressarcimentos.";
  if (semAg) return "Sem agência: confira os dados da conta.";
  if (semCc) return "Sem número de conta: confira os dados da conta.";
  return null;
}

/** 4.1 / BX-3 — o rótulo diz a verdade: "auto" só reflete o último extrato subido; sem `openFinanceId` não há conexão. */
export function rotuloDaAtualizacao(c: { saldoSource: string; openFinanceId: string | null }): { rotulo: string; conectada: boolean | null } {
  if (c.saldoSource !== "auto") return { rotulo: "Manual", conectada: null };
  return c.openFinanceId ? { rotulo: "Automático (quando conectado)", conectada: true } : { rotulo: "Automático (quando conectado) — não conectada", conectada: false };
}

/** 2.2 / 5.5 — totais só de contas ATIVAS, por tipo. */
export function totaisPorTipo(contas: readonly { tipo: string; saldo: string | number; ativo?: boolean }[]): { tipo: string; total: number; contas: number }[] {
  const out = new Map<string, { total: number; contas: number }>();
  for (const c of contas) {
    if (c.ativo === false) continue;
    const t = out.get(c.tipo) ?? { total: 0, contas: 0 };
    t.total += Number(c.saldo) || 0;
    t.contas += 1;
    out.set(c.tipo, t);
  }
  return [...out.entries()].map(([tipo, t]) => ({ tipo, total: Math.round(t.total * 100) / 100, contas: t.contas })).sort((a, b) => a.tipo.localeCompare(b.tipo));
}

/** 5.4 — as dez tabelas que apontam para `bank_account`; contagem por tabela. */
export interface VinculosDaConta {
  despesas: number;
  parcelas: number;
  pagamentos: number;
  restituicoes: number;
  acertos: number;
  repasses: number;
  caixa: number;
  contasReceber: number;
  cartoes: number;
  pagamentosDeFatura: number;
}

const ROTULOS: Record<keyof VinculosDaConta, string> = {
  despesas: "despesa(s)",
  parcelas: "parcela(s)",
  pagamentos: "pagamento(s)",
  restituicoes: "ressarcimento(s)",
  acertos: "acerto(s) contábil(is)",
  repasses: "repasse(s)",
  caixa: "lançamento(s) de caixa",
  contasReceber: "conta(s) a receber",
  cartoes: "cartão(ões) de crédito",
  pagamentosDeFatura: "pagamento(s) de fatura",
};

/** Lista vazia = pode excluir; senão, cada item diz QUAL vínculo impede (o caminho é inativar). */
export function bloqueiosDeExclusaoDaConta(v: VinculosDaConta): string[] {
  return (Object.keys(ROTULOS) as (keyof VinculosDaConta)[]).filter((k) => v[k] > 0).map((k) => `${v[k]} ${ROTULOS[k]}`);
}
