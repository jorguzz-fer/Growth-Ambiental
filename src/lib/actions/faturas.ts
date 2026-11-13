"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext, getWorkingVersion } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { reserveDespesaNumber } from "@/lib/db/numbering";
import { hojeISO } from "@/lib/despesa-status";
import { ymd } from "@/lib/utils";
import { statusDaDespesaPelasParcelas, statusDaParcela } from "@/lib/pagamento-regras";
import { distribuirPagamento, estadoDaFatura, type EstadoDaFatura } from "@/lib/calc/fatura";
import { faturaSeguinte } from "@/lib/calc/cartao-ciclo";
import { getFaturasCartao } from "@/lib/queries";

/**
 * Pagamento da fatura de cartão (Prompt U, seção 3), no PADRÃO da restituição
 * em lote (BU-1): preview antes de gravar (3.6), chave de idempotência e
 * `FOR UPDATE` (3.5). UMA saída de caixa por pagamento, na conta cadastrada
 * no cartão (3.1). NÃO cria despesa (3.2): as compras já foram reconhecidas
 * nas competências delas. Pagamento parcial deixa saldo rotativo, que a
 * fatura seguinte traz (3.3). O juro do rotativo só vira despesa quando vem
 * COBRADO na fatura, por ação explícita (3.4) — a projeção nunca grava.
 */

interface ParcelaEmAberto {
  id: string;
  despesaId: string;
  numDoc: string | null;
  faturaFechamento: string;
  numeroParcela: number;
  valorOriginal: number;
  saldo: number;
}

/** As parcelas em aberto do cartão até esta fatura (inclusive), na ordem FIFO: fatura mais antiga, PED, parcela. */
async function parcelasAPagar(exec: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0], tenantId: string, cartaoId: string, fechamentoLimite: string, forUpdate: boolean): Promise<ParcelaEmAberto[]> {
  const q = exec
    .select({
      id: schema.despesaParcelas.id,
      despesaId: schema.despesaParcelas.despesaId,
      numDoc: schema.despesas.numDoc,
      faturaFechamento: schema.faturasCartao.fechamento,
      numeroParcela: schema.despesaParcelas.numeroParcela,
      valorOriginal: schema.despesaParcelas.valorOriginal,
      valorPago: schema.despesaParcelas.valorPago,
    })
    .from(schema.despesaParcelas)
    .innerJoin(schema.faturasCartao, eq(schema.despesaParcelas.faturaId, schema.faturasCartao.id))
    .innerJoin(schema.despesas, eq(schema.despesaParcelas.despesaId, schema.despesas.id))
    .where(and(eq(schema.despesaParcelas.tenantId, tenantId), eq(schema.faturasCartao.cartaoId, cartaoId), eq(schema.despesas.cancelado, false), sql`${schema.despesaParcelas.valorPago} < ${schema.despesaParcelas.valorOriginal}`));
  const rows = forUpdate ? await q.for("update", { of: schema.despesaParcelas }) : await q;
  const limite = ymd(fechamentoLimite) ?? 0;
  return rows
    .filter((r) => (ymd(r.faturaFechamento) ?? 0) <= limite)
    .map((r) => ({ id: r.id, despesaId: r.despesaId, numDoc: r.numDoc, faturaFechamento: r.faturaFechamento, numeroParcela: r.numeroParcela, valorOriginal: Number(r.valorOriginal), saldo: Math.round((Number(r.valorOriginal) - Number(r.valorPago ?? 0)) * 100) / 100 }))
    .filter((r) => r.saldo > 0.004)
    .sort((a, b) => (ymd(a.faturaFechamento) ?? 0) - (ymd(b.faturaFechamento) ?? 0) || (a.numDoc ?? "").localeCompare(b.numDoc ?? "") || a.numeroParcela - b.numeroParcela);
}

/** 6.2 — estornos ainda não aplicados, das faturas do cartão até o fechamento informado (inclusive). */
async function creditosDisponiveis(exec: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0], tenantId: string, cartaoId: string, fechamentoLimite: string, forUpdate: boolean): Promise<{ id: string; valor: number }[]> {
  const q = exec
    .select({ id: schema.estornosCartao.id, valor: schema.estornosCartao.valor, fechamento: schema.faturasCartao.fechamento })
    .from(schema.estornosCartao)
    .innerJoin(schema.faturasCartao, eq(schema.estornosCartao.faturaId, schema.faturasCartao.id))
    .where(and(eq(schema.estornosCartao.tenantId, tenantId), eq(schema.estornosCartao.cartaoId, cartaoId), sql`${schema.estornosCartao.aplicadoEm} is null`));
  const rows = forUpdate ? await q.for("update", { of: schema.estornosCartao }) : await q;
  const limite = ymd(fechamentoLimite) ?? 0;
  return rows.filter((r) => (ymd(r.fechamento) ?? 0) <= limite).map((r) => ({ id: r.id, valor: Number(r.valor) }));
}

export interface PreviewPagamentoFatura {
  ok: true;
  faturaId: string;
  cartaoNome: string;
  fechamento: string;
  vencimento: string;
  estado: EstadoDaFatura;
  /** conta cadastrada no cartão (null = escolher na hora). */
  bankAccountId: string | null;
  /** tudo que está em aberto no cartão até esta fatura: compras dela + rotativo das anteriores. */
  totalDevido: number;
  /** 6.2 — créditos de estorno que entram antes do dinheiro. */
  creditos: number;
  valor: number;
  /** o que ficará em aberto depois deste pagamento — o rotativo (3.3). */
  saldoRestante: number;
  linhas: { numDoc: string | null; parcela: number; faturaFechamento: string; saldo: number; abatido: number }[];
  sobra: number;
}

export async function previewPagamentoFatura(faturaId: string, valor: number): Promise<PreviewPagamentoFatura | { ok: false; error: string }> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "cartoes", "ver")) return { ok: false, error: "Sem permissão." };
  const [f] = await db
    .select({ f: schema.faturasCartao, apelido: schema.cartoesCredito.apelido, ultimos4: schema.cartoesCredito.ultimos4, bankAccountId: schema.cartoesCredito.bankAccountId })
    .from(schema.faturasCartao)
    .innerJoin(schema.cartoesCredito, eq(schema.faturasCartao.cartaoId, schema.cartoesCredito.id))
    .where(and(eq(schema.faturasCartao.id, faturaId), eq(schema.faturasCartao.tenantId, ctx.tenant.id)));
  if (!f) return { ok: false, error: "Fatura não encontrada." };
  const [view] = await getFaturasCartao(ctx.tenant.id, f.f.cartaoId).then((l) => l.filter((x) => x.id === faturaId));
  const estado = view ? estadoDaFatura(view, hojeISO()) : "aberta";
  const abertas = await parcelasAPagar(db, ctx.tenant.id, f.f.cartaoId, f.f.fechamento, false);
  const creditos = await creditosDisponiveis(db, ctx.tenant.id, f.f.cartaoId, f.f.fechamento, false);
  const totalCreditos = Math.round(creditos.reduce((a, e) => a + e.valor, 0) * 100) / 100;
  const totalDevido = Math.max(0, Math.round((abertas.reduce((a, p) => a + p.saldo, 0) - totalCreditos) * 100) / 100);
  const v = Math.abs(valor) || totalDevido;
  const d = distribuirPagamento(Math.round((v + totalCreditos) * 100) / 100, abertas);
  return {
    ok: true,
    faturaId,
    cartaoNome: `${f.apelido}${f.ultimos4 ? " •••• " + f.ultimos4 : ""}`,
    fechamento: f.f.fechamento,
    vencimento: f.f.vencimento,
    estado,
    bankAccountId: f.bankAccountId,
    totalDevido,
    creditos: totalCreditos,
    valor: v,
    saldoRestante: Math.max(0, Math.round((totalDevido - v) * 100) / 100),
    linhas: d.abatimentos.map((a) => ({ numDoc: a.numDoc, parcela: a.numeroParcela, faturaFechamento: a.faturaFechamento, saldo: a.saldo, abatido: a.abatido })),
    sobra: d.sobra,
  };
}

export interface PagarFaturaInput {
  faturaId: string;
  valor: number;
  /** "MM/DD/YYYY" */
  data: string;
  /** conta que debita; vazio = a cadastrada no cartão. */
  bankAccountId?: string | null;
  /** obra em que a saída de caixa é lançada (Prompt A: escolha explícita). */
  projectId: string;
  obs?: string | null;
  idempotencyKey?: string | null;
}

export type ResultadoPagarFatura = { ok: true; pagamentoId: string; jaExistia?: boolean; parcelasAbatidas?: number; saldoRestante?: number } | { ok: false; error: string };

export async function pagarFatura(input: PagarFaturaInput): Promise<ResultadoPagarFatura> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "cartoes", "editar")) return { ok: false, error: "Sem permissão para pagar faturas." };
  const idem = input.idempotencyKey?.trim() || null;
  const jaExiste = async () => {
    if (!idem) return null;
    const [e] = await db.select({ id: schema.faturaPagamentos.id }).from(schema.faturaPagamentos).where(and(eq(schema.faturaPagamentos.tenantId, ctx.tenant.id), eq(schema.faturaPagamentos.idempotencyKey, idem))).limit(1);
    return e ?? null;
  };
  const existente = await jaExiste();
  if (existente) return { ok: true, pagamentoId: existente.id, jaExistia: true };

  const valor = Math.round(Math.abs(input.valor) * 100) / 100;
  if (!(valor > 0)) return { ok: false, error: "Informe um valor maior que zero." };
  if (!input.data || !ymd(input.data)) return { ok: false, error: "Informe a data do pagamento." };
  const versaoCaixa = await getWorkingVersion(ctx.tenant.id, input.projectId);
  if (!versaoCaixa) return { ok: false, error: "Escolha o projeto em que a saída de caixa será lançada." };
  if (versaoCaixa.locked) return { ok: false, error: "Versão congelada — pagamento bloqueado." };

  try {
    const out = await db.transaction(async (tx) => {
      // Trava a fatura: dois pagamentos simultâneos são serializados (3.5).
      const [f] = await tx
        .select()
        .from(schema.faturasCartao)
        .where(and(eq(schema.faturasCartao.id, input.faturaId), eq(schema.faturasCartao.tenantId, ctx.tenant.id)))
        .for("update");
      if (!f) throw new Error("Fatura não encontrada.");
      const [cartao] = await tx.select().from(schema.cartoesCredito).where(eq(schema.cartoesCredito.id, f.cartaoId));
      if ((ymd(f.fechamento) ?? 0) >= Number(hojeISO().replace(/-/g, ""))) {
        throw new Error("A fatura ainda está aberta (fecha em " + f.fechamento.replace(/^(\d\d)\/(\d\d)\/(\d{4})$/, "$2/$1/$3") + "); o pagamento é da fatura fechada.");
      }
      const bankAccountId = input.bankAccountId || cartao.bankAccountId || null;
      if (bankAccountId) {
        const [c] = await tx.select({ id: schema.bankAccounts.id }).from(schema.bankAccounts).where(and(eq(schema.bankAccounts.id, bankAccountId), eq(schema.bankAccounts.tenantId, ctx.tenant.id)));
        if (!c) throw new Error("Conta bancária não encontrada.");
      }
      // Trava as parcelas em aberto do cartão até esta fatura (FIFO).
      const abertas = await parcelasAPagar(tx, ctx.tenant.id, f.cartaoId, f.fechamento, true);
      if (abertas.length === 0) throw new Error("Esta fatura não tem saldo em aberto.");
      // 6.2 — créditos de estorno ainda não aplicados, das faturas até esta:
      // entram ANTES do dinheiro, abatendo as mesmas parcelas (FIFO).
      const creditos = await creditosDisponiveis(tx, ctx.tenant.id, f.cartaoId, f.fechamento, true);
      const totalCreditos = Math.round(creditos.reduce((a, e) => a + e.valor, 0) * 100) / 100;
      const bruto = Math.round(abertas.reduce((a, p) => a + p.saldo, 0) * 100) / 100;
      const totalDevido = Math.max(0, Math.round((bruto - totalCreditos) * 100) / 100);
      const d = distribuirPagamento(Math.round((valor + totalCreditos) * 100) / 100, abertas);
      if (d.sobra > 0.004) throw new Error(`O valor excede o saldo devido (${totalDevido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}, já descontados ${totalCreditos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de créditos). Ajuste o valor.`);

      // 3.1 — UMA saída de caixa, pelo valor pago, na data, na conta do cartão.
      const cartaoNome = `${cartao.apelido}${cartao.ultimos4 ? " •••• " + cartao.ultimos4 : ""}`;
      const [cash] = await tx
        .insert(schema.cashEntries)
        .values({
          versionId: versaoCaixa.id,
          tenantId: ctx.tenant.id,
          bankAccountId,
          data: input.data,
          descricao: `Pagamento fatura cartão ${cartaoNome} · venc. ${f.vencimento}`,
          valor: String(-valor),
          cat: "despesa",
          rec: true,
        })
        .returning();
      const [pag] = await tx
        .insert(schema.faturaPagamentos)
        .values({ tenantId: ctx.tenant.id, faturaId: f.id, valor: String(valor), data: input.data, bankAccountId, projectId: input.projectId, cashEntryId: cash.id, idempotencyKey: idem, usuarioId: ctx.userId, obs: input.obs || null })
        .returning();

      // As parcelas abatidas: acumulado, status e o registro em `pagamento`
      // (é o que o saldo real da despesa — §15 — lê). SEM caixa por parcela:
      // a saída é uma só, acima.
      const despesasTocadas = new Set<string>();
      let creditoRestante = Math.round(totalCreditos * 100);
      for (const a of d.abatimentos) {
        const novoPago = Math.round((a.valorOriginal - a.saldo + a.abatido) * 100) / 100;
        await tx
          .update(schema.despesaParcelas)
          .set({ valorPago: String(novoPago), dataPagamento: input.data, status: statusDaParcela(a.valorOriginal, novoPago) })
          .where(eq(schema.despesaParcelas.id, a.id));
        // A parte coberta por crédito de estorno fica registrada como tal
        // (sem banco); o resto é o pagamento em dinheiro.
        const cents = Math.round(a.abatido * 100);
        const porCredito = Math.min(cents, creditoRestante);
        creditoRestante -= porCredito;
        const porDinheiro = cents - porCredito;
        for (const [parte, obs, banco] of [
          [porCredito, `Estorno no cartão aplicado · fatura ${cartaoNome} venc. ${f.vencimento}`, null],
          [porDinheiro, `Fatura cartão ${cartaoNome} · venc. ${f.vencimento}`, bankAccountId],
        ] as const) {
          if (parte <= 0) continue;
          await tx.insert(schema.pagamentos).values({
            tenantId: ctx.tenant.id,
            parcelaId: a.id,
            despesaId: a.despesaId,
            valorOriginal: String(a.valorOriginal),
            valorTotalPago: String(parte / 100),
            dataPagamento: input.data,
            bankAccountId: banco,
            obs,
            usuarioId: ctx.userId,
          });
        }
        despesasTocadas.add(a.despesaId);
      }
      // Os créditos usados ficam marcados como aplicados neste pagamento (6.3: nunca contam duas vezes).
      if (creditos.length > 0) {
        await tx
          .update(schema.estornosCartao)
          .set({ aplicadoEm: input.data, faturaPagamentoId: pag.id })
          .where(inArray(schema.estornosCartao.id, creditos.map((e) => e.id)));
      }
      for (const despesaId of despesasTocadas) {
        const irmas = await tx.select({ status: schema.despesaParcelas.status, valorPago: schema.despesaParcelas.valorPago }).from(schema.despesaParcelas).where(eq(schema.despesaParcelas.despesaId, despesaId));
        await tx
          .update(schema.despesas)
          .set({ status: statusDaDespesaPelasParcelas(irmas.map((i) => ({ status: i.status, valorPago: Number(i.valorPago) }))), dataCaixa: input.data })
          .where(and(eq(schema.despesas.id, despesaId), eq(schema.despesas.tenantId, ctx.tenant.id)));
      }

      const saldoRestante = Math.max(0, Math.round((totalDevido - valor) * 100) / 100);
      // 3.3 — pagamento parcial: o saldo vira rotativo e a fatura SEGUINTE o
      // traz. Ela precisa existir para aparecer em Contas a Pagar mesmo sem
      // compra nova; o índice único (0054) cobre a corrida.
      if (saldoRestante > 0) {
        const prox = faturaSeguinte({ fechamento: f.fechamento, vencimento: f.vencimento }, cartao);
        if (prox) await tx.insert(schema.faturasCartao).values({ tenantId: ctx.tenant.id, cartaoId: cartao.id, fechamento: prox.fechamento, vencimento: prox.vencimento }).onConflictDoNothing();
      }
      await logAudit(
        {
          tenantId: ctx.tenant.id,
          userId: ctx.userId,
          action: "fatura.pagar",
          entity: "fatura_cartao",
          entityId: f.id,
          meta: { pagamentoId: pag.id, cartaoId: cartao.id, valor, creditosAplicados: totalCreditos, data: input.data, bankAccountId, projectId: input.projectId, cashEntryId: cash.id, parcelasAbatidas: d.abatimentos.length, saldoRestante },
        },
        tx,
      );
      return { pagamentoId: pag.id, abatidas: d.abatimentos.length, saldoRestante };
    });
    for (const p of ["/cartoes", "/contaspagar", "/caixa", "/fluxocaixa", "/despesas"]) revalidatePath(p);
    return { ok: true, pagamentoId: out.pagamentoId, parcelasAbatidas: out.abatidas, saldoRestante: out.saldoRestante };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao pagar a fatura.";
    if (idem && /duplicate key|fatura_pagamento_idem_uq/i.test(msg)) {
      const e2 = await jaExiste();
      if (e2) return { ok: true, pagamentoId: e2.id, jaExistia: true };
    }
    return { ok: false, error: msg };
  }
}

export interface JurosDaFaturaInput {
  faturaId: string;
  valor: number;
  /** data da cobrança "MM/DD/YYYY" — define a competência (3.4). */
  data: string;
  projectId: string;
}

/**
 * 3.4 — o juro do rotativo é despesa NOVA, "Despesas Financeiras", na
 * competência em que foi cobrado; não é parte de nenhuma compra. Só existe
 * quando a fatura chega com ele cobrado — a projeção da tela nunca grava.
 * A despesa nasce vinculada ao cartão, com uma parcela nesta fatura: o
 * valor da fatura passa a incluí-la e o pagamento da fatura a quita.
 */
export async function informarJurosDaFatura(input: JurosDaFaturaInput): Promise<{ ok: true; despesaId: string } | { ok: false; error: string }> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "cartoes", "editar") || !can(ctx.perms, "despesas", "criar")) return { ok: false, error: "Sem permissão para registrar juros da fatura." };
  const valor = Math.round(Math.abs(input.valor) * 100) / 100;
  if (!(valor > 0)) return { ok: false, error: "Informe o valor do juro cobrado." };
  if (!input.data || !ymd(input.data)) return { ok: false, error: "Informe a data da cobrança." };
  const versao = await getWorkingVersion(ctx.tenant.id, input.projectId);
  if (!versao) return { ok: false, error: "Escolha o projeto em que a despesa financeira será lançada." };
  if (versao.locked) return { ok: false, error: "Versão congelada." };
  try {
    const despesaId = await db.transaction(async (tx) => {
      const [f] = await tx.select().from(schema.faturasCartao).where(and(eq(schema.faturasCartao.id, input.faturaId), eq(schema.faturasCartao.tenantId, ctx.tenant.id))).for("update");
      if (!f) throw new Error("Fatura não encontrada.");
      if (f.jurosDespesaId) throw new Error("Esta fatura já tem o juro cobrado registrado.");
      if ((ymd(f.fechamento) ?? 0) >= Number(hojeISO().replace(/-/g, ""))) throw new Error("A fatura ainda está aberta: o juro só é registrado quando vem cobrado na fatura fechada.");
      const [cartao] = await tx.select().from(schema.cartoesCredito).where(eq(schema.cartoesCredito.id, f.cartaoId));
      const [mm, , yyyy] = input.data.split("/");
      const numDoc = await reserveDespesaNumber(ctx.tenant.id);
      const [d] = await tx
        .insert(schema.despesas)
        .values({
          versionId: versao.id,
          tenantId: ctx.tenant.id,
          numDoc,
          categoriaDre: "Despesas Financeiras",
          competencia: `${mm}/${yyyy}`,
          vencimento: f.vencimento,
          valor: String(valor),
          status: "A pagar",
          formaPagamento: "Cartão de crédito",
          cartaoId: cartao.id,
          qtdParcelas: 1,
          obs: `Juros do rotativo — fatura ${cartao.apelido} venc. ${f.vencimento}`,
        })
        .returning();
      await tx.insert(schema.despesaParcelas).values({ tenantId: ctx.tenant.id, despesaId: d.id, numeroParcela: 1, vencimento: f.vencimento, valorOriginal: String(valor), formaPagamento: "Cartão de crédito", bankAccountId: cartao.bankAccountId, status: "Pendente", faturaId: f.id });
      await tx.update(schema.faturasCartao).set({ jurosDespesaId: d.id }).where(eq(schema.faturasCartao.id, f.id));
      await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "fatura.juros", entity: "fatura_cartao", entityId: f.id, meta: { despesaId: d.id, numDoc, valor, competencia: `${mm}/${yyyy}`, projectId: input.projectId } }, tx);
      return d.id;
    });
    for (const p of ["/cartoes", "/contaspagar", "/despesas", "/dre"]) revalidatePath(p);
    return { ok: true, despesaId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao registrar o juro." };
  }
}

/** Pagamentos já feitos de uma fatura (para a tela). */
export async function getPagamentosDaFatura(tenantId: string, faturaIds: string[]): Promise<{ faturaId: string; valor: number; data: string; conta: string | null }[]> {
  if (faturaIds.length === 0) return [];
  const rows = await db
    .select({ faturaId: schema.faturaPagamentos.faturaId, valor: schema.faturaPagamentos.valor, data: schema.faturaPagamentos.data, banco: schema.bankAccounts.banco })
    .from(schema.faturaPagamentos)
    .leftJoin(schema.bankAccounts, eq(schema.faturaPagamentos.bankAccountId, schema.bankAccounts.id))
    .where(and(eq(schema.faturaPagamentos.tenantId, tenantId), inArray(schema.faturaPagamentos.faturaId, faturaIds)))
    .orderBy(schema.faturaPagamentos.createdAt);
  return rows.map((r) => ({ faturaId: r.faturaId, valor: Number(r.valor), data: r.data, conta: r.banco }));
}
