import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getReceivables, type ReceivableRow } from "@/lib/queries";
import { expandUnitReceivables } from "@/lib/calc/receivables";
import { chaveLigada } from "@/lib/chaves-tenant";
import type { PaymentPlan, UnitStatus } from "@/lib/calc/types";
import { aReceberDaFaixa, aReceberDaFaixaComRecebimentos } from "@/lib/calc/previsto-caixa";

/**
 * Prompt AT §5 (Revisão 4) — a parcela do COMPRADOR conciliável com a entrada
 * do extrato. Antes, o dinheiro do comprador ficava pendente para sempre, ou
 * alguém criava uma conta a receber a partir do extrato e a receita somava
 * duas vezes (o plano e a conta nova).
 *
 * - A parcela é identificada pela chave estável "origem#número" (5.1).
 * - Conciliar grava o recebimento; parcial é permitido (5.2).
 * - Cada parcela tem situação: a vencer, recebida, parcial, vencida (5.3).
 * - Conciliar NÃO cria conta a receber nem mexe na receita da DRE: a parcela
 *   já estava lá (AT-T8).
 * - Plano editado depois do recebimento: o recebimento fica, preso à chave;
 *   se a chave sumir, aparece como "recebimento sem parcela" (BAT-5).
 *
 * Permuta e financiamento não são conciliáveis aqui: a permuta não é dinheiro
 * e o financiamento chega como liberação de obra (BAR-3, BAR-4).
 */

export type SituacaoDaParcela = "a vencer" | "recebida" | "parcial" | "vencida";

const r2 = (n: number) => Math.round(n * 100) / 100;
const iso = (mdy: string | null | undefined) => (mdy && /^\d{2}\/\d{2}\/\d{4}$/.test(mdy) ? `${mdy.slice(6)}-${mdy.slice(0, 2)}-${mdy.slice(3, 5)}` : null);

/** Puro. Recebida quando o recebido cobre o valor; vencida quando passou do dia sem cobrir; parcial quando recebeu parte e ainda não venceu. */
export function situacaoDaParcela(p: { valor: number; recebido: number; dia: string | null; hojeISO: string }): { situacao: SituacaoDaParcela; saldo: number } {
  const saldo = Math.max(0, r2(p.valor - p.recebido));
  if (saldo <= 0.01) return { situacao: "recebida", saldo: 0 };
  const d = iso(p.dia);
  if (d && d < p.hojeISO) return { situacao: "vencida", saldo };
  return { situacao: p.recebido > 0.005 ? "parcial" : "a vencer", saldo };
}

/** Seções que não são dinheiro do comprador na conta (BAR-3, BAR-4). */
export const SECOES_FORA_DA_CONCILIACAO = new Set(["Permuta", "Banco"]);

const chaveDe = (unitId: string, chave: string) => `${unitId}|${chave}`;

/** Recebido por parcela ("unitId|chave"), só os recebimentos não estornados. */
export async function recebidoPorParcela(tenantId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({ unitId: schema.recebimentosParcela.unitId, chave: schema.recebimentosParcela.chave, valor: schema.recebimentosParcela.valor })
    .from(schema.recebimentosParcela)
    .where(and(eq(schema.recebimentosParcela.tenantId, tenantId), eq(schema.recebimentosParcela.estornado, false)));
  const out = new Map<string, number>();
  for (const r of rows) out.set(chaveDe(r.unitId, r.chave), r2((out.get(chaveDe(r.unitId, r.chave)) ?? 0) + Number(r.valor)));
  return out;
}

export interface ParcelaDeVenda extends ReceivableRow {
  recebido: number;
  saldo: number;
  situacao: SituacaoDaParcela;
}

/** As parcelas de venda (versão Atual de cada obra) com recebido, saldo e situação. Só leitura. */
export async function parcelasDeVenda(tenantId: string, hojeISO: string, projectId?: string): Promise<ParcelaDeVenda[]> {
  const [recs, recebido] = await Promise.all([getReceivables(tenantId, projectId), recebidoPorParcela(tenantId)]);
  return recs.map((r) => {
    const rec = recebido.get(chaveDe(r.unitId, r.chave)) ?? 0;
    return { ...r, recebido: rec, ...situacaoDaParcela({ valor: r.valor, recebido: rec, dia: r.dia, hojeISO }) };
  });
}

/** Quanto de uma entrada do extrato já está usado (contas a receber e parcelas). */
type Exec = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function usadoDasEntradas(exec: Exec, tenantId: string, cashEntryIds: readonly string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (cashEntryIds.length === 0) return out;
  const [cr, pa] = await Promise.all([
    exec
      .select({ id: schema.contaReceberRecebimentos.cashEntryId, valor: schema.contaReceberRecebimentos.valor })
      .from(schema.contaReceberRecebimentos)
      .where(and(eq(schema.contaReceberRecebimentos.tenantId, tenantId), eq(schema.contaReceberRecebimentos.estornado, false), inArray(schema.contaReceberRecebimentos.cashEntryId, [...cashEntryIds]))),
    exec
      .select({ id: schema.recebimentosParcela.cashEntryId, valor: schema.recebimentosParcela.valor })
      .from(schema.recebimentosParcela)
      .where(and(eq(schema.recebimentosParcela.tenantId, tenantId), eq(schema.recebimentosParcela.estornado, false), inArray(schema.recebimentosParcela.cashEntryId, [...cashEntryIds]))),
  ]);
  for (const r of [...cr, ...pa]) if (r.id) out.set(r.id, r2((out.get(r.id) ?? 0) + Number(r.valor)));
  return out;
}

export interface SugestaoParcela {
  unitId: string;
  chave: string;
  unidade: string;
  rotulo: string;
  comprador: string | null;
  projectName: string;
  vencimento: string;
  saldo: number;
  grau: "alta" | "media" | "baixa";
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const serial = (mdy: string | null | undefined) => {
  const d = iso(mdy);
  return d ? Math.floor(Date.parse(d) / 86_400_000) : null;
};

/**
 * 5.2 — as parcelas de venda em aberto compatíveis com uma entrada, pela mesma
 * regra de grau das contas a receber: valor exato ou aproximado, data próxima
 * (ou já vencida) e o primeiro nome do comprador na descrição. Puro.
 */
export function sugestoesDeParcela(mov: { valor: number; data: string | null; descricao: string | null }, parcelas: readonly ParcelaDeVenda[]): SugestaoParcela[] {
  const movCents = Math.round(Math.abs(mov.valor) * 100);
  const movDia = serial(mov.data);
  const desc = norm(mov.descricao ?? "");
  const out: (SugestaoParcela & { _p: number })[] = [];
  for (const p of parcelas) {
    if (p.saldo <= 0.01 || SECOES_FORA_DA_CONCILIACAO.has(p.secao)) continue;
    const cents = Math.round(p.saldo * 100);
    const exato = cents === movCents;
    const aprox = !exato && Math.abs(cents - movCents) <= Math.max(50, movCents * 0.02);
    // parcial: a entrada menor que o saldo também serve, com grau baixo
    const parte = !exato && !aprox && movCents < cents;
    if (!exato && !aprox && !parte) continue;
    const vDia = serial(p.dia);
    const prox = movDia != null && vDia != null ? Math.abs(vDia - movDia) : 9999;
    const dataProx = prox <= 7 || (movDia != null && vDia != null && vDia <= movDia);
    const primeiro = p.clienteNome ? norm(p.clienteNome).split(/\s+/)[0] : "";
    const nome = primeiro.length >= 3 && desc.includes(primeiro);
    let grau: SugestaoParcela["grau"];
    if (exato && (dataProx || nome)) grau = "alta";
    else if (exato || (aprox && (dataProx || nome)) || (parte && nome && dataProx)) grau = "media";
    else grau = "baixa";
    if (parte && grau === "baixa" && !nome) continue;
    out.push({ unitId: p.unitId, chave: p.chave, unidade: p.unitCode, rotulo: p.descricao, comprador: p.clienteNome, projectName: p.projectName, vencimento: p.dia, saldo: p.saldo, grau, _p: prox });
  }
  const rank = { alta: 0, media: 1, baixa: 2 } as const;
  return out
    .sort((a, b) => rank[a.grau] - rank[b.grau] || a._p - b._p)
    .slice(0, 4)
    .map(({ _p, ...s }) => {
      void _p;
      return s;
    });
}

export interface Quem {
  tenantId: string;
  userId: string | null;
  userEmail: string | null;
}

/**
 * Grava o recebimento de uma parcela conciliado com uma entrada do extrato.
 * Tudo numa transação, com o movimento travado. Confere: a entrada é da
 * empresa e tem valor livre; a parcela existe HOJE no plano da unidade
 * vendida e tem saldo. Valor ausente = o que couber.
 */
export async function gravarRecebimentoDeParcela(
  quem: Quem,
  input: { cashEntryId: string; unitId: string; chave: string; valor?: number | null },
): Promise<{ ok: true; id: string; valor: number; concluida: boolean } | { ok: false; error: string }> {
  try {
    return await db.transaction(async (tx) => {
      const [mov] = await tx.select().from(schema.cashEntries).where(and(eq(schema.cashEntries.id, input.cashEntryId), eq(schema.cashEntries.tenantId, quem.tenantId))).for("update");
      if (!mov) return { ok: false as const, error: "Movimento não encontrado." };
      const valorMov = Number(mov.valor);
      if (!(valorMov > 0)) return { ok: false as const, error: "Só uma entrada do extrato recebe parcela de venda." };
      if (mov.cat === "ajuste") return { ok: false as const, error: "Ajuste de caixa não se concilia com parcela." };
      if (mov.conciliadoDespesaId) return { ok: false as const, error: "Este movimento já está conciliado com uma despesa." };
      const usado = (await usadoDasEntradas(tx, quem.tenantId, [mov.id])).get(mov.id) ?? 0;
      const livre = r2(valorMov - usado);
      if (livre <= 0.005 || (mov.rec && usado <= 0.005)) return { ok: false as const, error: "Este movimento já está inteiramente conciliado." };

      const [u] = await tx.select().from(schema.units).where(and(eq(schema.units.id, input.unitId), eq(schema.units.tenantId, quem.tenantId))).for("update");
      if (!u) return { ok: false as const, error: "Unidade não encontrada nesta empresa." };
      const definicaoNova = await chaveLigada(quem.tenantId, "plano_definicao_nova");
      const parcela = expandUnitReceivables(u.paymentPlan as PaymentPlan, u.status as UnitStatus, { definicaoNova }).find((p) => p.chave === input.chave);
      if (!parcela) return { ok: false as const, error: "Esta parcela não existe no plano de pagamento da unidade (o plano pode ter sido editado)." };
      if (SECOES_FORA_DA_CONCILIACAO.has(parcela.secao)) return { ok: false as const, error: "Permuta e financiamento não são recebidos pelo extrato do comprador." };
      const anteriores = await tx
        .select({ valor: schema.recebimentosParcela.valor })
        .from(schema.recebimentosParcela)
        .where(and(eq(schema.recebimentosParcela.tenantId, quem.tenantId), eq(schema.recebimentosParcela.unitId, u.id), eq(schema.recebimentosParcela.chave, input.chave), eq(schema.recebimentosParcela.estornado, false)));
      const soma = anteriores.reduce((a, x) => a + Number(x.valor), 0);
      const saldo = r2(parcela.valor - soma);
      if (saldo <= 0.01) return { ok: false as const, error: "Esta parcela já está recebida." };
      const pedido = input.valor != null && input.valor > 0 ? r2(input.valor) : Math.min(livre, saldo);
      if (pedido > livre + 0.01) return { ok: false as const, error: `O valor passa do que falta conciliar no movimento (${livre.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}).` };
      if (pedido > saldo + 0.01) return { ok: false as const, error: `O valor passa do saldo da parcela (${saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}).` };

      const criadoPor = quem.userEmail || quem.userId || null;
      const [rec] = await tx
        .insert(schema.recebimentosParcela)
        .values({ tenantId: quem.tenantId, unitId: u.id, chave: input.chave, valor: String(pedido), data: mov.data, cashEntryId: mov.id, criadoPor })
        .returning({ id: schema.recebimentosParcela.id });
      const concluida = livre - pedido <= 0.005;
      if (concluida) await tx.update(schema.cashEntries).set({ rec: true, conciliadoPor: criadoPor, conciliadoEm: new Date().toISOString() }).where(eq(schema.cashEntries.id, mov.id));
      await logAudit(
        { tenantId: quem.tenantId, userId: quem.userId, action: "parcela.receber", entity: "recebimento_parcela", entityId: rec.id, meta: { cashEntryId: mov.id, unidade: u.code, chave: input.chave, valor: pedido, saldoAntes: saldo, concluida } },
        tx,
      );
      return { ok: true as const, id: rec.id, valor: pedido, concluida };
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao conciliar a parcela." };
  }
}

/** Estorno lógico do recebimento; o movimento volta a pendente se ficar com valor livre. */
export async function estornarRecebimentoDeParcela(quem: Quem, id: string, motivo: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const m = (motivo ?? "").trim();
  if (!m) return { ok: false, error: "Informe o motivo do estorno (fica na auditoria)." };
  return db.transaction(async (tx) => {
    const [r] = await tx.select().from(schema.recebimentosParcela).where(and(eq(schema.recebimentosParcela.id, id), eq(schema.recebimentosParcela.tenantId, quem.tenantId))).for("update");
    if (!r) return { ok: false as const, error: "Recebimento não encontrado." };
    if (r.estornado) return { ok: false as const, error: "Este recebimento já foi estornado." };
    const por = quem.userEmail || quem.userId || null;
    await tx.update(schema.recebimentosParcela).set({ estornado: true, estornadoEm: new Date(), estornadoPor: por, motivoEstorno: m }).where(eq(schema.recebimentosParcela.id, r.id));
    if (r.cashEntryId) {
      const [mov] = await tx.select().from(schema.cashEntries).where(eq(schema.cashEntries.id, r.cashEntryId)).for("update");
      const usado = (await usadoDasEntradas(tx, quem.tenantId, [r.cashEntryId])).get(r.cashEntryId) ?? 0;
      if (mov && mov.rec && !mov.conciliadoContaReceberId && !mov.conciliadoDespesaId && Number(mov.valor) - usado > 0.005) {
        await tx.update(schema.cashEntries).set({ rec: false, conciliadoPor: null, conciliadoEm: null }).where(eq(schema.cashEntries.id, mov.id));
      }
    }
    await logAudit({ tenantId: quem.tenantId, userId: quem.userId, action: "parcela.estornar", entity: "recebimento_parcela", entityId: r.id, meta: { chave: r.chave, valor: r.valor, cashEntryId: r.cashEntryId, motivo: m } }, tx);
    return { ok: true as const };
  });
}

/**
 * BAT-5 — recebimentos cuja chave não existe mais no plano da unidade (o plano
 * foi editado depois). O recebimento não é apagado: fica para revisão.
 */
export async function recebimentosSemParcela(tenantId: string): Promise<{ id: string; unidade: string; chave: string; valor: number; data: string | null }[]> {
  const rows = await db
    .select({ r: schema.recebimentosParcela, code: schema.units.code, plan: schema.units.paymentPlan, status: schema.units.status })
    .from(schema.recebimentosParcela)
    .innerJoin(schema.units, eq(schema.recebimentosParcela.unitId, schema.units.id))
    .where(and(eq(schema.recebimentosParcela.tenantId, tenantId), eq(schema.recebimentosParcela.estornado, false)));
  if (rows.length === 0) return [];
  const definicaoNova = await chaveLigada(tenantId, "plano_definicao_nova");
  return rows
    .filter((x) => !expandUnitReceivables(x.plan as PaymentPlan, x.status as UnitStatus, { definicaoNova }).some((p) => p.chave === x.r.chave))
    .map((x) => ({ id: x.r.id, unidade: x.code, chave: x.r.chave, valor: Number(x.r.valor), data: x.r.data }));
}

/**
 * BAT-6 (chave "parcela_recebida_situacao") — no Fluxo de Caixa, a parte
 * recebida de cada parcela sai do previsto, no balde do VENCIMENTO da parcela
 * (é de lá que ela sai). Só as unidades da versão. Só leitura.
 */
export async function recebidoNoPrevistoDaVersao(version: { id: string; tenantId: string }, bucket: (d: string | null) => string | null): Promise<Record<string, number>> {
  const rows = await db
    .select({ chave: schema.recebimentosParcela.chave, valor: schema.recebimentosParcela.valor, unitId: schema.units.id, plan: schema.units.paymentPlan, status: schema.units.status })
    .from(schema.recebimentosParcela)
    .innerJoin(schema.units, eq(schema.recebimentosParcela.unitId, schema.units.id))
    .where(and(eq(schema.recebimentosParcela.tenantId, version.tenantId), eq(schema.recebimentosParcela.estornado, false), eq(schema.units.versionId, version.id)));
  if (rows.length === 0) return {};
  const definicaoNova = await chaveLigada(version.tenantId, "plano_definicao_nova");
  const recebido = new Map<string, number>();
  const planos = new Map<string, ReturnType<typeof expandUnitReceivables>>();
  for (const r of rows) {
    recebido.set(chaveDe(r.unitId, r.chave), r2((recebido.get(chaveDe(r.unitId, r.chave)) ?? 0) + Number(r.valor)));
    if (!planos.has(r.unitId)) planos.set(r.unitId, expandUnitReceivables(r.plan as PaymentPlan, r.status as UnitStatus, { definicaoNova }));
  }
  const out: Record<string, number> = {};
  for (const [k, v] of recebido) {
    const [unitId, chave] = k.split("|");
    const p = planos.get(unitId)?.find((x) => x.chave === chave);
    if (!p) continue; // BAT-5: sem parcela, nada sai do previsto
    const mm = bucket(p.dia);
    if (mm) out[mm] = r2((out[mm] ?? 0) + Math.min(v, p.valor));
  }
  return out;
}

/**
 * O "a receber" da faixa do Caixa. Chave "parcela_recebida_situacao"
 * desligada: exatamente o de antes (parcelas de hoje em diante, pelo valor).
 * Ligada (§5.3): pelo saldo, com as vencidas não recebidas nos atrasados.
 */
export async function aReceberDaFaixaDaEmpresa(
  tenantId: string,
  contasReceber: Parameters<typeof aReceberDaFaixa>[0],
  recebiveisDasVendas: Parameters<typeof aReceberDaFaixa>[1],
  hojeISO: string,
): Promise<ReturnType<typeof aReceberDaFaixa>> {
  if (!(await chaveLigada(tenantId, "parcela_recebida_situacao"))) return aReceberDaFaixa(contasReceber, recebiveisDasVendas, hojeISO);
  return aReceberDaFaixaComRecebimentos(contasReceber, await parcelasDeVenda(tenantId, hojeISO));
}

