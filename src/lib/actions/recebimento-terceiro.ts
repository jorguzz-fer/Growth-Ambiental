"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { chaveLigada } from "@/lib/chaves-tenant";
import { getAtualVersion } from "@/lib/queries";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getProjectContext, getTenantContext, getWorkingVersion } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  repasseCabe,
  saldoARepassar,
  statusRepasse,
} from "@/lib/calc/recebimento-terceiro";

/**
 * Recebimento por terceiro e repasse — RG-02 e RG-04.
 *
 * Espelho de `restituicoes.ts`, do outro lado do balanço. A regra que governa
 * tudo aqui: **nenhuma função deste arquivo cria receita**. A receita foi
 * reconhecida na venda; o que se registra aqui é o trânsito do dinheiro entre
 * o terceiro e a empresa.
 *
 * Concretamente, nada aqui insere em `budget_line` de receita, nem em
 * `conta_receber` com valor novo, nem em `unit`. O único efeito no caixa é a
 * ENTRADA no momento do repasse — que é quando o dinheiro de fato chega.
 */

export interface RecebimentoTerceiroView {
  id: string;
  recebedorId: string | null;
  recebedor: string | null;
  projectId: string | null;
  projectName: string | null;
  clienteNome: string | null;
  unitCode: string | null;
  contaReceberId: string | null;
  valorTotal: number;
  valorRepassado: number;
  saldo: number;
  dataRecebimento: string | null;
  dataPrevistaRepasse: string | null;
  status: string;
  obs: string | null;
}

export async function getRecebimentosTerceiros(
  tenantId: string,
): Promise<RecebimentoTerceiroView[]> {
  const rows = await db
    .select({
      r: schema.recebimentosTerceiros,
      recebedor: schema.stakeholders.nome,
      projectName: schema.projects.name,
      clienteNome: schema.clientes.nomeCompleto,
    })
    .from(schema.recebimentosTerceiros)
    .leftJoin(
      schema.stakeholders,
      eq(schema.recebimentosTerceiros.recebedorTerceiroId, schema.stakeholders.id),
    )
    .leftJoin(schema.projects, eq(schema.recebimentosTerceiros.projectId, schema.projects.id))
    .leftJoin(schema.clientes, eq(schema.recebimentosTerceiros.clienteId, schema.clientes.id))
    .where(eq(schema.recebimentosTerceiros.tenantId, tenantId));

  return rows.map((x) => ({
    id: x.r.id,
    recebedorId: x.r.recebedorTerceiroId,
    recebedor: x.recebedor,
    projectId: x.r.projectId,
    projectName: x.projectName,
    clienteNome: x.clienteNome,
    unitCode: x.r.unitCode,
    contaReceberId: x.r.contaReceberId,
    valorTotal: Number(x.r.valorTotal),
    valorRepassado: Number(x.r.valorRepassado),
    saldo: saldoARepassar(Number(x.r.valorTotal), Number(x.r.valorRepassado)),
    dataRecebimento: x.r.dataRecebimento,
    dataPrevistaRepasse: x.r.dataPrevistaRepasse,
    status: x.r.status,
    obs: x.r.obs,
  }));
}

export interface RecebimentoResult {
  ok: boolean;
  error?: string;
  recebimentoId?: string;
  jaExistia?: boolean;
}

/**
 * Registra que um terceiro recebeu, em nome da empresa, um valor do cliente.
 *
 * O que acontece: o título de contas a receber é baixado (o cliente pagou) e
 * nasce um ATIVO com o terceiro. **Zero impacto na DRE** — a receita já foi
 * reconhecida na venda; reconhecê-la de novo aqui dobraria a receita.
 *
 * O que NÃO acontece: nenhuma entrada de caixa. O dinheiro ainda está com o
 * terceiro; ele só entra no repasse.
 */
export async function registrarRecebimentoTerceiro(
  formData: FormData,
): Promise<RecebimentoResult> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "restituicoes", "criar")) {
    return { ok: false, error: "Sem permissão para registrar recebimentos por terceiro." };
  }
  const s = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  };
  const idem = s("idempotencyKey");
  const valor = Number(s("valor") ?? "0");
  if (!Number.isFinite(valor) || valor <= 0) {
    return { ok: false, error: "Informe um valor maior que zero." };
  }
  // Obra obrigatória e desta empresa (Prompt A, 11 e 38). Antes, sem obra,
  // caía na do cookie; e a informada era gravada sem conferir a empresa.
  const projectId = s("projectId");
  if (!projectId || !(await getProjectContext(ctx.tenant.id, projectId))) {
    return { ok: false, error: "Escolha o projeto." };
  }

  if (idem) {
    const [existente] = await db
      .select({ id: schema.recebimentosTerceiros.id })
      .from(schema.recebimentosTerceiros)
      .where(
        and(
          eq(schema.recebimentosTerceiros.tenantId, ctx.tenant.id),
          eq(schema.recebimentosTerceiros.idempotencyKey, idem),
        ),
      )
      .limit(1);
    if (existente) return { ok: true, recebimentoId: existente.id, jaExistia: true };
  }

  const contaReceberId = s("contaReceberId");
  try {
    const id = await db.transaction(async (tx) => {
      const [rec] = await tx
        .insert(schema.recebimentosTerceiros)
        .values({
          tenantId: ctx.tenant.id,
          recebedorTerceiroId: s("recebedorTerceiroId"),
          projectId,
          contaReceberId,
          clienteId: s("clienteId"),
          unitCode: s("unitCode"),
          valorTotal: String(valor),
          dataRecebimento: s("dataRecebimento"),
          dataPrevistaRepasse: s("dataPrevistaRepasse"),
          status: "Aguardando repasse",
          obs: s("obs"),
          idempotencyKey: idem,
        })
        .returning();

      // Baixa do título: o cliente PAGOU — quem ainda não repassou é o
      // terceiro. Isso não cria receita; a receita é da venda.
      if (contaReceberId) {
        const [cr] = await tx
          .select()
          .from(schema.contasReceber)
          .where(
            and(
              eq(schema.contasReceber.id, contaReceberId),
              eq(schema.contasReceber.tenantId, ctx.tenant.id),
            ),
          )
          .limit(1);
        if (cr) {
          const recebido = Number(cr.valorRecebido) + valor;
          await tx
            .update(schema.contasReceber)
            .set({
              valorRecebido: String(recebido),
              status:
                recebido + 0.01 >= Number(cr.valor)
                  ? "Recebido"
                  : "Parcialmente recebido",
              dataRecebimento: s("dataRecebimento") ?? cr.dataRecebimento,
            })
            .where(eq(schema.contasReceber.id, cr.id));
        }
      }
      return rec.id;
    });

    await logAudit({
      tenantId: ctx.tenant.id,
      userId: ctx.userId,
      action: "recebimentoTerceiro.create",
      entity: "recebimento_terceiro",
      entityId: id,
      meta: { valor, contaReceberId, impactoDre: 0 },
    });
    revalidatePath("/restituicoes");
    revalidatePath("/contasreceber");
    return { ok: true, recebimentoId: id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao registrar o recebimento.";
    if (idem && /duplicate key|recebimento_terceiro_idem_uq/i.test(msg)) {
      const [existente] = await db
        .select({ id: schema.recebimentosTerceiros.id })
        .from(schema.recebimentosTerceiros)
        .where(
          and(
            eq(schema.recebimentosTerceiros.tenantId, ctx.tenant.id),
            eq(schema.recebimentosTerceiros.idempotencyKey, idem),
          ),
        )
        .limit(1);
      if (existente) return { ok: true, recebimentoId: existente.id, jaExistia: true };
    }
    return { ok: false, error: msg };
  }
}

export interface RepasseInput {
  recebimentoTerceiroId: string;
  /** obra da tela (Prompt A): a entrada de caixa nova vai para a versão de trabalho dela. */
  projectId: string;
  valor: number;
  dataRepasse: string;
  bankAccountId?: string | null;
  comprovante?: string;
  obs?: string;
  idempotencyKey?: string | null;
  /** Item do extrato que trouxe o dinheiro (conciliação sem receita nova). */
  cashEntryId?: string | null;
}

export interface RepasseResult {
  ok: boolean;
  error?: string;
  repasseId?: string;
  jaExistia?: boolean;
}

/**
 * Registra o repasse do terceiro para a empresa — RG-04.
 *
 * Gera a ENTRADA de caixa na data efetiva e baixa o ativo com o terceiro.
 * **Não toca a DRE**: nenhuma linha de receita é criada aqui, nem "para fechar
 * o caixa". A receita da venda continua sendo uma só.
 */
export async function registrarRepasse(input: RepasseInput): Promise<RepasseResult> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "restituicoes", "editar")) {
    return { ok: false, error: "Sem permissão para registrar repasses." };
  }
  // §21 (B11, opção 2) — com a chave ligada, a entrada de caixa cai na Atual da
  // obra do recebimento; desligada, na obra da tela, como sempre.
  const segueRecebimento = await chaveLigada(ctx.tenant.id, "restituicao_segue_despesa");
  const versaoCaixa = input.cashEntryId || segueRecebimento
    ? null
    : await getWorkingVersion(ctx.tenant.id, input.projectId);
  if (!input.cashEntryId && !segueRecebimento && !versaoCaixa) return { ok: false, error: "Escolha o projeto." };
  if (versaoCaixa?.locked) return { ok: false, error: "Versão congelada — repasse bloqueado." };
  // §22 — id de extrato vindo do navegador só vale se for desta empresa.
  if (input.cashEntryId) {
    const [c] = await db
      .select({ id: schema.cashEntries.id })
      .from(schema.cashEntries)
      .where(and(eq(schema.cashEntries.id, input.cashEntryId), eq(schema.cashEntries.tenantId, ctx.tenant.id)))
      .limit(1);
    if (!c) return { ok: false, error: "Lançamento do extrato não encontrado." };
  }
  const idem = input.idempotencyKey?.trim() || null;

  if (idem) {
    const [existente] = await db
      .select({ id: schema.repasses.id })
      .from(schema.repasses)
      .where(
        and(
          eq(schema.repasses.tenantId, ctx.tenant.id),
          eq(schema.repasses.idempotencyKey, idem),
        ),
      )
      .limit(1);
    if (existente) return { ok: true, repasseId: existente.id, jaExistia: true };
  }

  try {
    const repId = await db.transaction(async (tx) => {
      // FOR UPDATE serializa dois repasses simultâneos sobre o mesmo
      // recebimento: o segundo enxerga o saldo já abatido pelo primeiro.
      const [rec] = await tx
        .select()
        .from(schema.recebimentosTerceiros)
        .where(
          and(
            eq(schema.recebimentosTerceiros.id, input.recebimentoTerceiroId),
            eq(schema.recebimentosTerceiros.tenantId, ctx.tenant.id),
          ),
        )
        .for("update")
        .limit(1);
      if (!rec) throw new Error("Recebimento não encontrado.");
      if (rec.status === "Cancelado") throw new Error("Recebimento cancelado.");
      let versaoDaEntrada = versaoCaixa;
      if (!input.cashEntryId && segueRecebimento) {
        // Sem obra no recebimento (registro antigo), vale a obra da tela.
        versaoDaEntrada = rec.projectId
          ? await getAtualVersion(ctx.tenant.id, rec.projectId)
          : await getWorkingVersion(ctx.tenant.id, input.projectId);
        if (!versaoDaEntrada) throw new Error("O projeto do recebimento não tem versão Atual.");
        if (versaoDaEntrada.locked) throw new Error("Versão congelada — repasse bloqueado.");
      }

      const valor = Math.abs(input.valor);
      const saldo = saldoARepassar(Number(rec.valorTotal), Number(rec.valorRepassado));
      if (!repasseCabe(Number(rec.valorTotal), Number(rec.valorRepassado), valor)) {
        throw new Error(
          `Valor acima do saldo a repassar (${saldo.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}).`,
        );
      }

      // Um item do extrato não pode lastrear dois repasses.
      if (input.cashEntryId) {
        const [usado] = await tx
          .select({ id: schema.repasses.id })
          .from(schema.repasses)
          .where(and(eq(schema.repasses.tenantId, ctx.tenant.id), eq(schema.repasses.cashEntryId, input.cashEntryId)))
          .limit(1);
        if (usado)
          throw new Error("Este lançamento do extrato já foi vinculado a outro repasse.");
      }

      const [rep] = await tx
        .insert(schema.repasses)
        .values({
          tenantId: ctx.tenant.id,
          recebimentoTerceiroId: rec.id,
          valor: String(valor),
          dataRepasse: input.dataRepasse || null,
          bankAccountId: input.bankAccountId || null,
          comprovante: input.comprovante || null,
          obs: input.obs || null,
          cashEntryId: input.cashEntryId || null,
          idempotencyKey: idem,
          usuarioId: ctx.userId,
        })
        .returning();

      const repassado = Number(rec.valorRepassado) + valor;
      await tx
        .update(schema.recebimentosTerceiros)
        .set({
          valorRepassado: String(repassado),
          status: statusRepasse(Number(rec.valorTotal), repassado),
        })
        .where(eq(schema.recebimentosTerceiros.id, rec.id));

      if (input.cashEntryId) {
        // A entrada já existe no extrato — só é conciliada. Inserir aqui
        // duplicaria a entrada de caixa.
        await tx
          .update(schema.cashEntries)
          .set({ rec: true, cat: "repasse" })
          .where(and(eq(schema.cashEntries.id, input.cashEntryId), eq(schema.cashEntries.tenantId, ctx.tenant.id)));
      } else {
        // Entrada de caixa POSITIVA: o dinheiro chega agora. `cat: "repasse"`
        // mantém a origem identificável e fora de qualquer soma de receita.
        await tx.insert(schema.cashEntries).values({
          versionId: versaoDaEntrada!.id,
          tenantId: ctx.tenant.id,
          bankAccountId: input.bankAccountId || null,
          data: input.dataRepasse || null,
          descricao: "Repasse de terceiro",
          valor: String(valor),
          cat: "repasse",
          rec: true,
        });
      }
      return rep.id;
    });

    await logAudit({
      tenantId: ctx.tenant.id,
      userId: ctx.userId,
      action: "repasse.create",
      entity: "repasse",
      entityId: repId,
      meta: {
        recebimentoTerceiroId: input.recebimentoTerceiroId,
        valor: Math.abs(input.valor),
        // Explícito no log: RG-04 — o repasse nunca reconhece receita.
        impactoDre: 0,
      },
    });
    revalidatePath("/restituicoes");
    revalidatePath("/caixa");
    revalidatePath("/fluxocaixa");
    return { ok: true, repasseId: repId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao registrar o repasse.";
    if (idem && /duplicate key|repasse_idem_uq/i.test(msg)) {
      const [existente] = await db
        .select({ id: schema.repasses.id })
        .from(schema.repasses)
        .where(
          and(
            eq(schema.repasses.tenantId, ctx.tenant.id),
            eq(schema.repasses.idempotencyKey, idem),
          ),
        )
        .limit(1);
      if (existente) return { ok: true, repasseId: existente.id, jaExistia: true };
    }
    return { ok: false, error: msg };
  }
}

export interface SaldoConsolidadoTerceiro {
  terceiroId: string | null;
  terceiro: string;
  /** quanto a empresa DEVE a ele (RG-03). */
  saldoARestituir: number;
  /** quanto ELE deve à empresa (RG-04). */
  saldoARepassar: number;
}

/**
 * Os DOIS saldos de cada terceiro, lado a lado — base do encontro de contas
 * (RG-05).
 *
 * Os saldos são sempre devolvidos BRUTOS. A compensação, quando acontecer, é um
 * documento próprio; exibir só o líquido aqui esconderia a dimensão real de
 * cada obrigação (princípio da não compensação indevida).
 */
export async function getSaldosConsolidadosTerceiros(
  tenantId: string,
): Promise<SaldoConsolidadoTerceiro[]> {
  const [obrigacoes, recebimentos] = await Promise.all([
    db
      .select({
        id: schema.despesaTerceiros.pagadorTerceiroId,
        nome: schema.stakeholders.nome,
        total: sql<string>`sum(${schema.despesaTerceiros.valorTotal})`,
        pago: sql<string>`sum(${schema.despesaTerceiros.valorRestituido})`,
      })
      .from(schema.despesaTerceiros)
      .leftJoin(
        schema.stakeholders,
        eq(schema.despesaTerceiros.pagadorTerceiroId, schema.stakeholders.id),
      )
      .where(
        and(
          eq(schema.despesaTerceiros.tenantId, tenantId),
          ne(schema.despesaTerceiros.status, "Cancelado"),
        ),
      )
      .groupBy(schema.despesaTerceiros.pagadorTerceiroId, schema.stakeholders.nome),
    db
      .select({
        id: schema.recebimentosTerceiros.recebedorTerceiroId,
        nome: schema.stakeholders.nome,
        total: sql<string>`sum(${schema.recebimentosTerceiros.valorTotal})`,
        pago: sql<string>`sum(${schema.recebimentosTerceiros.valorRepassado})`,
      })
      .from(schema.recebimentosTerceiros)
      .leftJoin(
        schema.stakeholders,
        eq(schema.recebimentosTerceiros.recebedorTerceiroId, schema.stakeholders.id),
      )
      .where(
        and(
          eq(schema.recebimentosTerceiros.tenantId, tenantId),
          ne(schema.recebimentosTerceiros.status, "Cancelado"),
        ),
      )
      .groupBy(
        schema.recebimentosTerceiros.recebedorTerceiroId,
        schema.stakeholders.nome,
      ),
  ]);

  const mapa = new Map<string, SaldoConsolidadoTerceiro>();
  const abrir = (id: string | null, nome: string | null) => {
    const k = id ?? "—";
    let c = mapa.get(k);
    if (!c) {
      c = {
        terceiroId: id,
        terceiro: nome ?? "Não identificado",
        saldoARestituir: 0,
        saldoARepassar: 0,
      };
      mapa.set(k, c);
    }
    return c;
  };
  for (const o of obrigacoes) {
    abrir(o.id, o.nome).saldoARestituir +=
      Number(o.total ?? 0) - Number(o.pago ?? 0);
  }
  for (const r of recebimentos) {
    abrir(r.id, r.nome).saldoARepassar += Number(r.total ?? 0) - Number(r.pago ?? 0);
  }
  for (const c of mapa.values()) {
    c.saldoARestituir = Math.round(c.saldoARestituir * 100) / 100;
    c.saldoARepassar = Math.round(c.saldoARepassar * 100) / 100;
  }
  return [...mapa.values()].sort(
    (a, b) =>
      b.saldoARestituir + b.saldoARepassar - (a.saldoARestituir + a.saldoARepassar),
  );
}
