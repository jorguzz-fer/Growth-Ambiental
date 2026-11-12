import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getComprasDoCartao, getEstornosDoCartao, getExtratoCartao } from "@/lib/queries";
import { conferirExtrato, type CompraParaConferir } from "@/lib/calc/conferencia-cartao";
import { faturaDaCompra, type CicloDoCartao } from "@/lib/calc/cartao-ciclo";
import { ymd } from "@/lib/utils";

/**
 * Prompt AT §6 (Revisão 4) — cartões de crédito na conciliação. Cada linha do
 * extrato da fatura é conciliada com a compra lançada naquele cartão e ciclo
 * (6.1). As sugestões vêm da conferência do Prompt U (mesma fatura e mesmo
 * valor = grau alto; fatura vizinha ou valor próximo = médio). Nada é gravado
 * sem a pessoa confirmar, e nenhuma despesa nasce sozinha (6.2).
 *
 * O crédito ou estorno do extrato segue o fluxo de estorno que já existe
 * (6.3); o pagamento da fatura (saída da conta corrente) concilia com o
 * `fatura_pagamento`, não com as compras (6.4).
 */

export interface SugestaoDoCartao {
  despesaId: string;
  numDoc: string | null;
  descricao: string | null;
  valor: number;
  parcela: string;
  grau: "alta" | "media";
  motivo: string;
}

export interface LinhaDoCartao {
  id: string;
  data: string | null;
  descricao: string | null;
  valor: number;
  /** a compra conciliada (null = pendente). */
  despesaId: string | null;
  numDoc: string | null;
  conciliadoPor: string | null;
  /** crédito/estorno (valor negativo): segue o fluxo de estorno. */
  credito: boolean;
  /** crédito já ligado a um estorno. */
  creditoComEstorno: boolean;
  sugestoes: SugestaoDoCartao[];
}

export interface FaturaNaConciliacao {
  /** "MM/DD/YYYY" do fechamento; null = linha sem data. */
  fechamento: string | null;
  linhas: LinhaDoCartao[];
  /** 6.5 — total do extrato, total conciliado e a diferença. */
  totalExtrato: number;
  totalConciliado: number;
  diferenca: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
/** "MM/DD/YYYY" → dia serial (UTC). */
function diaSerial(s: string | null): number | null {
  const n = ymd(s);
  if (n == null) return null;
  return Math.floor(Date.UTC(Math.floor(n / 10000), Math.floor((n % 10000) / 100) - 1, n % 100) / 86_400_000);
}

export async function cicloDoCartao(tenantId: string, cartaoId: string): Promise<(CicloDoCartao & { apelido: string }) | null> {
  const [c] = await db
    .select({ diaFechamento: schema.cartoesCredito.diaFechamento, diaVencimento: schema.cartoesCredito.diaVencimento, apelido: schema.cartoesCredito.apelido })
    .from(schema.cartoesCredito)
    .where(and(eq(schema.cartoesCredito.id, cartaoId), eq(schema.cartoesCredito.tenantId, tenantId)))
    .limit(1);
  return c ?? null;
}

/**
 * Candidatas de uma linha: compras do MESMO cartão, na fatura da linha ou nas
 * vizinhas, sem outra linha conciliada da mesma fatura apontando para elas. É
 * a regra que o servidor confere antes de gravar (só candidatas do servidor).
 */
export function candidatasDaLinha(
  linha: { id: string; data: string | null; valor: number },
  compras: readonly (CompraParaConferir & { faturaFechamento: string })[],
  linhasConciliadas: readonly { id: string; despesaId: string | null; data: string | null }[],
  ciclo: CicloDoCartao,
): CompraParaConferir[] {
  const f = linha.data ? faturaDaCompra(linha.data, ciclo)?.fechamento ?? null : null;
  if (!f) return [];
  // vizinhas: a fatura anterior e a seguinte (fechamentos a até 45 dias)
  const perto = (x: string) => {
    const a = diaSerial(x);
    const b = diaSerial(f);
    return a != null && b != null && Math.abs(a - b) <= 45;
  };
  const ocupadas = new Set(
    linhasConciliadas
      .filter((l) => l.id !== linha.id && l.despesaId && l.data && faturaDaCompra(l.data, ciclo)?.fechamento === f)
      .map((l) => l.despesaId as string),
  );
  return compras.filter((c) => (c.faturaFechamento === f || perto(c.faturaFechamento)) && !ocupadas.has(c.despesaId));
}

export async function conciliacaoDoCartao(tenantId: string, cartaoId: string): Promise<FaturaNaConciliacao[]> {
  const ciclo = await cicloDoCartao(tenantId, cartaoId);
  if (!ciclo) return [];
  const [linhas, compras, estornos] = await Promise.all([getExtratoCartao(tenantId, cartaoId), getComprasDoCartao(tenantId, cartaoId), getEstornosDoCartao(tenantId, cartaoId)]);
  const numDoc = new Map(compras.map((c) => [c.despesaId, c.numDoc]));
  // As compras já conciliadas a uma linha saem da conferência (não sugerem de novo).
  const usadas = new Set(linhas.filter((l) => l.despesaId).map((l) => l.despesaId as string));
  const pendentes = linhas.filter((l) => !l.despesaId);
  const conf = conferirExtrato(
    pendentes.map((l) => ({ id: l.id, data: l.data, descricao: l.descricao, valor: l.valor })),
    compras.filter((c) => !usadas.has(c.despesaId)),
    estornos,
    ciclo,
  );
  const sugestoes = new Map<string, SugestaoDoCartao[]>();
  const sug = (itemId: string, c: CompraParaConferir, grau: "alta" | "media", motivo: string) =>
    sugestoes.set(itemId, [...(sugestoes.get(itemId) ?? []), { despesaId: c.despesaId, numDoc: c.numDoc, descricao: c.descricao, valor: c.valor, parcela: c.total > 1 ? `${c.numero}/${c.total}` : "à vista", grau, motivo }]);
  for (const x of conf.casados) sug(x.item.id, x.compra, "alta", "mesma fatura e mesmo valor");
  for (const x of conf.divergentes) sug(x.item.id, x.compra, "media", x.motivo === "data" ? "mesmo valor, fatura vizinha" : "valor próximo, mesma fatura");
  const comEstorno = new Set(estornos.map((e) => e.extratoItemId).filter((x): x is string => !!x));

  const porFatura = new Map<string | null, LinhaDoCartao[]>();
  for (const l of linhas) {
    const f = l.data ? faturaDaCompra(l.data, ciclo)?.fechamento ?? null : null;
    porFatura.set(f, [
      ...(porFatura.get(f) ?? []),
      {
        id: l.id,
        data: l.data,
        descricao: l.descricao,
        valor: l.valor,
        despesaId: l.despesaId,
        numDoc: l.despesaId ? numDoc.get(l.despesaId) ?? null : null,
        conciliadoPor: l.conciliadoPor,
        credito: l.valor < 0,
        creditoComEstorno: comEstorno.has(l.id),
        sugestoes: l.despesaId || l.valor < 0 ? [] : sugestoes.get(l.id) ?? [],
      },
    ]);
  }
  return [...porFatura]
    .map(([fechamento, ls]) => {
      const totalExtrato = r2(ls.reduce((a, l) => a + l.valor, 0));
      // conciliado: compras ligadas + créditos que já seguiram o fluxo de estorno
      const totalConciliado = r2(ls.filter((l) => l.despesaId || l.creditoComEstorno).reduce((a, l) => a + l.valor, 0));
      return { fechamento, linhas: ls, totalExtrato, totalConciliado, diferenca: r2(totalExtrato - totalConciliado) };
    })
    .sort((a, b) => (ymd(b.fechamento) ?? 0) - (ymd(a.fechamento) ?? 0));
}

/**
 * Grava o vínculo linha ↔ compra depois de conferir as candidatas no servidor.
 * Usada pela conciliação da tela e pela despesa lançada a partir da linha
 * (6.2). Módulo de servidor, fora do "use server": não é chamável pela tela.
 */
export async function vincularLinhaDoCartao(tenantId: string, linhaId: string, despesaId: string, quem: string | null): Promise<{ ok: true; cartaoId: string } | { ok: false; error: string }> {
  const [l] = await db.select().from(schema.extratoCartao).where(and(eq(schema.extratoCartao.id, linhaId), eq(schema.extratoCartao.tenantId, tenantId))).limit(1);
  if (!l) return { ok: false, error: "Linha do extrato não encontrada." };
  if (l.despesaId) return { ok: false, error: "Esta linha já está conciliada. Desfaça antes de conciliar com outra compra." };
  if (Number(l.valor) < 0) return { ok: false, error: "Crédito ou estorno do extrato segue o fluxo de estorno, em Cartões." };
  const ciclo = await cicloDoCartao(tenantId, l.cartaoId);
  if (!ciclo) return { ok: false, error: "Cartão não encontrado." };
  const [compras, linhas] = await Promise.all([getComprasDoCartao(tenantId, l.cartaoId), getExtratoCartao(tenantId, l.cartaoId)]);
  const candidatas = candidatasDaLinha({ id: l.id, data: l.data, valor: Number(l.valor) }, compras, linhas, ciclo);
  if (!candidatas.some((c) => c.despesaId === despesaId)) {
    return { ok: false, error: "Esta compra não é candidata desta linha (outro cartão, outra fatura ou já conciliada). Nada foi gravado." };
  }
  // Atômico: só grava se a linha continuar sem vínculo.
  const feitos = await db
    .update(schema.extratoCartao)
    .set({ despesaId, conciliadoPor: quem, conciliadoEm: new Date() })
    .where(and(eq(schema.extratoCartao.id, l.id), eq(schema.extratoCartao.tenantId, tenantId), isNull(schema.extratoCartao.despesaId)))
    .returning({ id: schema.extratoCartao.id });
  if (feitos.length === 0) return { ok: false, error: "A linha acabou de ser conciliada por outra pessoa. Recarregue a tela." };
  return { ok: true, cartaoId: l.cartaoId };
}
