import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getConciliacaoData, getCashDaEmpresa, type ConciliacaoData } from "@/lib/queries";

/**
 * Prompt AT §7 e §8.3 (Revisão 4) — a conciliação com a Cris. TUDO aqui é do
 * servidor: a Cris lê os pendentes e os candidatos que ESTE código calcula, e
 * propõe; a gravação é o botão da tela, que passa de novo por aqui.
 *
 * - 7.2 · a Cris escolhe o par mais provável ENTRE OS CANDIDATOS do servidor;
 *   ela não procura candidatos por conta própria.
 * - 7.3 · a conciliação automática não muda (só na importação, com candidata
 *   única); o lote da Cris é sempre confirmado pela pessoa.
 * - 8.5 · proposta com alvo que não veio de `candidatos_de_conciliacao` para
 *   aquele movimento é RECUSADA no servidor (AT-T16).
 * - 8.3.4 · lote de até 20 (BAT-8, proposta do revisor).
 *
 * Este módulo SÓ LÊ (é o que as ferramentas da Cris usam; AQ-T6 confere). A
 * gravação do lote confirmado pela pessoa está em `conciliacao-cris-gravar.ts`.
 */

export const MAX_RODADA = 20;

/** Referência de um candidato: D: despesa · R: conta a receber · P: parcela de venda · F: pagamento de fatura. */
export type Ref = `D:${string}` | `R:${string}` | `P:${string}|${string}` | `F:${string}`;

export interface CandidatoDaCris {
  ref: Ref;
  tipo: "despesa" | "conta a receber" | "parcela de venda" | "pagamento de fatura";
  rotulo: string;
  valor: number;
  grau: "alta" | "media" | "baixa";
}

export interface PendenteDaCris {
  movimento: string;
  data: string | null;
  descricao: string | null;
  valor: number;
  conta: string | null;
  /** já tem candidato de grau alto (a Cris pode propor direto). */
  temAlta: boolean;
}

const serial = (mdy: string | null) => (mdy && /^\d{2}\/\d{2}\/\d{4}$/.test(mdy) ? Date.UTC(+mdy.slice(6), +mdy.slice(0, 2) - 1, +mdy.slice(3, 5)) : Number.MAX_SAFE_INTEGER);

function candidatosDe(cd: ConciliacaoData, movimento: string): { valor: number; candidatos: CandidatoDaCris[] } | null {
  const s = cd.pendentes.find((m) => m.cashEntryId === movimento);
  if (s) {
    return {
      valor: s.valor,
      candidatos: [
        ...s.sugestoes.map((x) => ({ ref: `D:${x.despesaId}` as Ref, tipo: "despesa" as const, rotulo: [x.numDoc, x.fornecedor, x.descricao].filter(Boolean).join(" · ") || "despesa", valor: x.valor, grau: x.grau })),
        ...(s.faturas ?? []).map((f) => ({ ref: `F:${f.faturaPagamentoId}` as Ref, tipo: "pagamento de fatura" as const, rotulo: `fatura do cartão ${f.cartao} (venc. ${f.vencimento})`, valor: f.valor, grau: f.grau })),
      ],
    };
  }
  const e = cd.pendentesEntrada.find((m) => m.cashEntryId === movimento);
  if (e) {
    return {
      valor: e.livre ?? e.valor,
      candidatos: [
        ...(e.parcelas ?? []).map((p) => ({ ref: `P:${p.unitId}|${p.chave}` as Ref, tipo: "parcela de venda" as const, rotulo: `${p.rotulo} · ${p.comprador ?? "sem comprador"} · venc. ${p.vencimento}`, valor: p.saldo, grau: p.grau })),
        ...e.sugestoes.map((x) => ({ ref: `R:${x.contaReceberId}` as Ref, tipo: "conta a receber" as const, rotulo: [x.descricao, x.projectName].filter(Boolean).join(" · "), valor: x.valor, grau: x.grau })),
      ],
    };
  }
  return null;
}

/** 8.3.4 / 8.5 — a rodada: até 20 pendentes, do mais antigo para o mais novo, da conta escolhida ou de todas. */
export async function pendentesDaRodada(tenantId: string, conta?: string | null): Promise<PendenteDaCris[]> {
  const [cd, cash, contas] = await Promise.all([getConciliacaoData(tenantId, conta ? { conta } : {}), getCashDaEmpresa(tenantId), db.select().from(schema.bankAccounts).where(eq(schema.bankAccounts.tenantId, tenantId))]);
  const contaDe = new Map(cash.map((c) => [c.id, c.bankAccountId]));
  const nome = (id: string | null | undefined) => {
    const k = contas.find((x) => x.id === id);
    return k ? `${k.banco}${k.cc ? " · " + k.cc : ""}` : null;
  };
  const todos = [
    ...cd.pendentes.map((m) => ({ movimento: m.cashEntryId, data: m.data, descricao: m.descricao, valor: m.valor, conta: nome(contaDe.get(m.cashEntryId)), temAlta: m.sugestoes.some((x) => x.grau === "alta") || (m.faturas ?? []).some((x) => x.grau === "alta") })),
    ...cd.pendentesEntrada.map((m) => ({ movimento: m.cashEntryId, data: m.data, descricao: m.descricao, valor: m.valor, conta: nome(contaDe.get(m.cashEntryId)), temAlta: m.sugestoes.some((x) => x.grau === "alta") || (m.parcelas ?? []).some((x) => x.grau === "alta") })),
  ];
  return todos.sort((a, b) => serial(a.data) - serial(b.data) || a.movimento.localeCompare(b.movimento)).slice(0, MAX_RODADA);
}

/** 8.3.4 — os candidatos que o servidor calculou para um movimento. */
export async function candidatosDoMovimento(tenantId: string, movimento: string): Promise<{ valor: number; candidatos: CandidatoDaCris[] } | null> {
  return candidatosDe(await getConciliacaoData(tenantId, {}), movimento);
}

export interface ItemDoLote {
  movimento: string;
  ref: string;
  /** valor do vínculo; ausente = o que couber. */
  valor?: number | null;
}

export interface ItemValidado extends ItemDoLote {
  ref: Ref;
  rotulo: string;
  tipo: CandidatoDaCris["tipo"];
  valorMovimento: number;
}

/** 8.5 — só candidatos do servidor: o que não veio de `candidatos_de_conciliacao` para aquele movimento é recusado. */
export async function validarLote(tenantId: string, itens: readonly ItemDoLote[]): Promise<{ validos: ItemValidado[]; recusados: { item: ItemDoLote; motivo: string }[] }> {
  const validos: ItemValidado[] = [];
  const recusados: { item: ItemDoLote; motivo: string }[] = [];
  if (itens.length > MAX_RODADA) return { validos, recusados: itens.map((item) => ({ item, motivo: `lote acima de ${MAX_RODADA} conciliações` })) };
  const cd = await getConciliacaoData(tenantId, {});
  const vistos = new Set<string>();
  for (const item of itens) {
    const c = candidatosDe(cd, item.movimento);
    if (!c) {
      recusados.push({ item, motivo: "movimento não está pendente nesta empresa" });
      continue;
    }
    const cand = c.candidatos.find((x) => x.ref === item.ref);
    if (!cand) {
      recusados.push({ item, motivo: "este alvo não é candidato deste movimento (só valem os candidatos calculados pelo servidor)" });
      continue;
    }
    if (vistos.has(item.movimento)) {
      recusados.push({ item, motivo: "o mesmo movimento apareceu duas vezes no lote" });
      continue;
    }
    vistos.add(item.movimento);
    validos.push({ ...item, ref: cand.ref, rotulo: cand.rotulo, tipo: cand.tipo, valorMovimento: c.valor });
  }
  return { validos, recusados };
}

/** Para o modelo: texto curto, sem dado pessoal além do que a tela já mostra. */
export function textoDosPendentes(ps: readonly PendenteDaCris[]): string {
  if (ps.length === 0) return "Nenhum movimento pendente de conciliação.";
  return JSON.stringify(ps.map((p) => ({ movimento: p.movimento, data: p.data, descricao: p.descricao, valor: p.valor, conta: p.conta, temCandidatoAlto: p.temAlta })));
}
