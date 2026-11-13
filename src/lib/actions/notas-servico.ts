"use server";

import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  ambienteDoEnvio,
  bloqueiosDoEnvio,
  conferirAntesDoEnvio,
  consultaSemValor,
  dataDeEmissao,
  desfechoDoCancelamento,
  emitenteDoTenant,
  lerCancelamento,
  lerRascunhoDaNota,
  mensagemDoRetorno,
  obraFiscalDoProjeto,
  podeCancelar,
  podeEditar,
  podeEnviar,
  recusaDoTenant,
  refDaTentativa,
  retornoQueVale,
  semResposta,
  situacaoDoRetorno,
  transicaoPermitida,
  type RascunhoDaNota,
  type SituacaoDaNota,
} from "@/lib/nota-servico";
import { cancelarNfse, consultarNfse, emitirNfse, focusConfigurado, resolverAmbiente } from "@/lib/fiscal/focus";
import type { AmbienteFiscal, ResultadoNota as RetornoDoProvedor } from "@/lib/fiscal/tipos";
import { guardarArquivosDaNota } from "@/lib/nota-servico-arquivos";

export type ResultadoNota = { ok: true; id: string } | { ok: false; error: string };

/**
 * Prompt AG — salva o RASCUNHO de uma NFS-e (criar ou corrigir). Não envia
 * nada ao provedor. Só rascunho e rejeitada são editáveis (2.1, 2.2); nota
 * vive na versão Atual da obra (1.3); o vínculo com a conta a receber é só
 * referência — nada é criado nem alterado nela (BAG-2).
 */
export async function salvarRascunhoDeNota(formData: FormData): Promise<ResultadoNota> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: "Sessão expirada. Entre de novo." };
  const id = typeof formData.get("id") === "string" ? String(formData.get("id")).trim() : "";
  if (!can(ctx.perms, "notasfiscais", id ? "editar" : "criar")) return { ok: false, error: "Sem permissão para montar nota fiscal." };
  const lido = lerRascunhoDaNota((c) => formData.get(c));
  if (!lido.ok) return lido;
  const r = lido.rascunho;

  // A obra precisa ser uma das que a pessoa vê, e ter versão Atual (1.3).
  if (!ctx.projects.some((p) => p.id === r.projectId)) return { ok: false, error: "Projeto não encontrado." };
  const [atual] = await db
    .select({ id: schema.versions.id })
    .from(schema.versions)
    .where(and(eq(schema.versions.tenantId, ctx.tenant.id), eq(schema.versions.projectId, r.projectId), eq(schema.versions.kind, "atual")))
    .limit(1);
  if (!atual) return { ok: false, error: "Este projeto não tem versão Atual: a nota é fato real e só vive na Atual." };
  if (r.contaReceberId) {
    const [cr] = await db
      .select({ id: schema.contasReceber.id })
      .from(schema.contasReceber)
      .where(and(eq(schema.contasReceber.id, r.contaReceberId), eq(schema.contasReceber.tenantId, ctx.tenant.id), eq(schema.contasReceber.projectId, r.projectId)))
      .limit(1);
    if (!cr) return { ok: false, error: "A conta a receber escolhida não é deste projeto." };
  }
  const valores = valoresDoRascunho(r);

  try {
    const notaId = await db.transaction(async (tx) => {
      if (id) {
        const [n] = await tx
          .select({ status: schema.notasServico.status })
          .from(schema.notasServico)
          .where(and(eq(schema.notasServico.id, id), eq(schema.notasServico.tenantId, ctx.tenant.id)))
          .for("update")
          .limit(1);
        if (!n) throw new Recusa("Nota não encontrada.");
        if (!podeEditar(n.status)) throw new Recusa("Esta nota já foi enviada: não se edita mais (nenhuma situação volta).");
        await tx
          .update(schema.notasServico)
          .set({ ...valores, versionId: atual.id })
          .where(and(eq(schema.notasServico.id, id), eq(schema.notasServico.tenantId, ctx.tenant.id)));
        await tx.insert(schema.notaServicoEventos).values({ tenantId: ctx.tenant.id, notaId: id, tipo: "editada", status: n.status, createdBy: ctx.userId });
        return id;
      }
      const [nova] = await tx
        .insert(schema.notasServico)
        .values({ tenantId: ctx.tenant.id, versionId: atual.id, ambiente: resolverAmbiente(ctx.tenant.fiscalAmbiente), createdBy: ctx.userId, ...valores })
        .returning({ id: schema.notasServico.id });
      await tx.insert(schema.notaServicoEventos).values({ tenantId: ctx.tenant.id, notaId: nova.id, tipo: "criada", status: "rascunho", createdBy: ctx.userId });
      return nova.id;
    });
    // Sem dado do tomador na auditoria: só a nota e o valor.
    await logAudit({
      tenantId: ctx.tenant.id,
      userId: ctx.userId,
      action: id ? "nfse.rascunho.editar" : "nfse.rascunho.criar",
      entity: "nota_servico",
      entityId: notaId,
      meta: { projectId: r.projectId, valorServicos: r.valorServicos, contaReceberId: r.contaReceberId },
    });
    revalidatePath("/notasfiscais");
    return { ok: true, id: notaId };
  } catch (e) {
    if (e instanceof Recusa) return { ok: false, error: e.message };
    throw e;
  }
}

class Recusa extends Error {}

function valoresDoRascunho(r: RascunhoDaNota) {
  return {
    projectId: r.projectId,
    contaReceberId: r.contaReceberId,
    competencia: r.competencia,
    discriminacao: r.discriminacao,
    itemListaServico: r.itemListaServico,
    codigoTributarioMunicipio: r.codigoTributarioMunicipio,
    valorServicos: String(r.valorServicos),
    valorDeducoes: String(r.valorDeducoes),
    descontoIncondicionado: String(r.descontoIncondicionado),
    descontoCondicionado: String(r.descontoCondicionado),
    aliquotaIss: String(r.aliquotaIss),
    issRetido: r.issRetido,
    retencoes: r.retencoes,
    outrasRetencoes: String(r.outrasRetencoes),
    tomadorCpfCnpj: r.tomadorCpfCnpj,
    tomadorNome: r.tomadorNome,
    tomadorInscricaoMunicipal: r.tomadorInscricaoMunicipal,
    tomadorEmail: r.tomadorEmail,
    tomadorTelefone: r.tomadorTelefone,
    tomadorLogradouro: r.tomadorLogradouro,
    tomadorNumero: r.tomadorNumero,
    tomadorComplemento: r.tomadorComplemento,
    tomadorBairro: r.tomadorBairro,
    tomadorCodigoMunicipio: r.tomadorCodigoMunicipio,
    tomadorUf: r.tomadorUf,
    tomadorCep: r.tomadorCep,
  };
}

// ── Envio, consulta e reenvio (Prompt AG, seção 4) ─────────────────────────

export type ResultadoDoEnvio =
  | { ok: true; situacao: string; aviso?: string }
  | { ok: false; error: string; pendencias?: string[] };

const naoEncontrada = { ok: false as const, error: "Nota não encontrada." };

/**
 * Envia a nota à Focus NFe. O PONTO SEM VOLTA: a tela de conferência vem
 * antes e manda `conferido = true`.
 *
 * Idempotência (seção 3): a tentativa, a ref e a situação "processando" são
 * gravadas numa transação ANTES da chamada; a chamada é fora da transação.
 * Duplo clique encontra "processando" e para. Sem resposta, a nota fica
 * processando — nunca reenvia sozinha.
 */
export async function enviarNota(id: string, conferido: boolean): Promise<ResultadoDoEnvio> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: "Sessão expirada. Entre de novo." };
  if (!can(ctx.perms, "notasfiscais", "ver") || !can(ctx.perms, "notaemitir", "editar"))
    return { ok: false, error: "Sem permissão para emitir nota fiscal." };
  if (!conferido) return { ok: false, error: "Confira a nota antes de enviar." };
  const tenantId = ctx.tenant.id;
  const [n] = await db
    .select()
    .from(schema.notasServico)
    .where(and(eq(schema.notasServico.id, id), eq(schema.notasServico.tenantId, tenantId)))
    .limit(1);
  const projeto = n && ctx.projects.find((p) => p.id === n.projectId);
  if (!n || !projeto) return naoEncontrada;

  const amb = ambienteDoEnvio(n, resolverAmbiente(ctx.tenant.fiscalAmbiente));
  if (!amb.ok) return amb;
  const ambiente = amb.ambiente;
  const emitente = emitenteDoTenant(ctx.tenant);
  const bloqueios = bloqueiosDoEnvio({
    status: n.status,
    podeEmitir: true,
    recusaDoTenant: recusaDoTenant(tenantId, process.env.NFSE_TENANT_ID),
    focusConfigurado: focusConfigurado(ambiente),
    ambiente,
    emitente,
  });
  if (bloqueios.length) return { ok: false, error: "A nota não pode ser enviada agora.", pendencias: bloqueios };
  const m = conferirAntesDoEnvio(n, emitente, obraFiscalDoProjeto(projeto), dataDeEmissao());
  if (!m.payload || !m.calculo) return { ok: false, error: "Corrija a nota antes de enviar.", pendencias: m.erros };
  const { payload, calculo } = m;

  let ref: string;
  try {
    ref = await db.transaction(async (tx) => {
      const [atual] = await tx
        .select({ status: schema.notasServico.status, tentativa: schema.notasServico.tentativa })
        .from(schema.notasServico)
        .where(and(eq(schema.notasServico.id, id), eq(schema.notasServico.tenantId, tenantId)))
        .for("update")
        .limit(1);
      if (!atual) throw new Recusa("Nota não encontrada.");
      if (!podeEnviar(atual.status)) throw new Recusa("Esta nota já foi enviada. Use “Atualizar situação”.");
      const tentativa = atual.tentativa + 1;
      const novaRef = refDaTentativa(id, tentativa);
      await tx
        .update(schema.notasServico)
        .set({
          status: "processando",
          ambiente,
          tentativa,
          ref: novaRef,
          enviadaEm: new Date(),
          mensagemRetorno: null,
          codigoMunicipioPrestacao: String(payload.servico.codigo_municipio ?? ""),
          baseCalculo: String(calculo.baseCalculo),
          valorIss: String(calculo.valorIss),
          totalRetencoes: String(calculo.totalRetencoes),
          valorLiquido: String(calculo.valorLiquido),
        })
        .where(and(eq(schema.notasServico.id, id), eq(schema.notasServico.tenantId, tenantId)));
      await tx.insert(schema.notaServicoEventos).values({ tenantId, notaId: id, tipo: "enviada", ref: novaRef, status: "processando", createdBy: ctx.userId });
      return novaRef;
    });
  } catch (e) {
    if (e instanceof Recusa) return { ok: false, error: e.message };
    throw e;
  }
  await logAudit({
    tenantId,
    userId: ctx.userId,
    action: "nfse.enviar",
    entity: "nota_servico",
    entityId: id,
    meta: { ambiente, ref, valorServicos: Number(n.valorServicos) },
  });

  // Fora da transação: a rede pode demorar ou falhar.
  let post: RetornoDoProvedor | null = null;
  try {
    post = await emitirNfse(ambiente, ref, payload as Parameters<typeof emitirNfse>[2]);
  } catch {
    post = null;
  }
  const r = await desfechoDoPost(tenantId, id, ambiente, ref, post, ctx.userId);
  revalidatePath("/notasfiscais");
  return r;
}

/** “Atualizar situação”: pergunta ao provedor como está a nota processando. */
export async function atualizarNota(id: string): Promise<ResultadoDoEnvio> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: "Sessão expirada. Entre de novo." };
  if (!can(ctx.perms, "notasfiscais", "ver") || !(can(ctx.perms, "notaemitir", "editar") || can(ctx.perms, "notasfiscais", "editar")))
    return { ok: false, error: "Sem permissão para atualizar a nota." };
  const n = await notaDoTenant(ctx.tenant.id, id, ctx.projects);
  if (!n) return naoEncontrada;
  // Autorizada também: confirma um cancelamento cuja resposta se perdeu.
  if (!(n.status === "processando" || n.status === "autorizada") || !n.ref)
    return { ok: true, situacao: n.status, aviso: "Não há o que consultar nesta nota." };
  const ambiente = resolverAmbiente(n.ambiente);
  if (!focusConfigurado(ambiente)) return { ok: false, error: "O token da Focus NFe deste ambiente não está configurado no servidor." };
  let c: RetornoDoProvedor | null = null;
  try {
    c = await consultarNfse(ambiente, n.ref);
  } catch {
    c = null;
  }
  const r = !c || consultaSemValor(c)
    ? await registrarSemResposta(
        ctx.tenant.id,
        id,
        n.ref,
        ctx.userId,
        `A Focus não respondeu à consulta. A nota continua processando.${c ? ` ${mensagemDoRetorno(c) ?? ""}` : ""}`.trim(),
      )
    : await aplicarRetorno(ctx.tenant.id, id, n.ref, c, ctx.userId, "consulta");
  revalidatePath("/notasfiscais");
  return r;
}

/**
 * Reenvio MANUAL com a MESMA ref, para o envio que nunca chegou (a rede caiu).
 * Só reenvia se a consulta disser que o provedor não conhece a ref — assim não
 * existe caminho para duas notas. Um reenvio por minuto, no máximo.
 */
export async function reenviarNota(id: string): Promise<ResultadoDoEnvio> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: "Sessão expirada. Entre de novo." };
  if (!can(ctx.perms, "notasfiscais", "ver") || !can(ctx.perms, "notaemitir", "editar"))
    return { ok: false, error: "Sem permissão para emitir nota fiscal." };
  const tenantId = ctx.tenant.id;
  const n = await notaDoTenant(tenantId, id, ctx.projects);
  if (!n) return naoEncontrada;
  if (n.status !== "processando" || !n.ref) return { ok: false, error: "Só se reenvia nota que está processando." };
  const ref = n.ref;
  const ambiente = resolverAmbiente(n.ambiente);
  if (!focusConfigurado(ambiente)) return { ok: false, error: "O token da Focus NFe deste ambiente não está configurado no servidor." };
  const recusa = recusaDoTenant(tenantId, process.env.NFSE_TENANT_ID);
  if (recusa) return { ok: false, error: recusa };

  let c: RetornoDoProvedor | null = null;
  try {
    c = await consultarNfse(ambiente, ref);
  } catch {
    c = null;
  }
  if (!c || consultaSemValor(c))
    return { ok: false, error: `A Focus não respondeu à consulta. Nada foi reenviado. ${c ? (mensagemDoRetorno(c) ?? "") : ""}`.trim() };
  if (c.status !== "nao_encontrada") {
    const r = await aplicarRetorno(tenantId, id, ref, c, ctx.userId, "consulta");
    revalidatePath("/notasfiscais");
    return r.ok ? { ...r, aviso: "A Focus já tem esta nota — nada foi reenviado." } : r;
  }

  const projeto = ctx.projects.find((p) => p.id === n.projectId)!;
  const m = conferirAntesDoEnvio(n, emitenteDoTenant(ctx.tenant), obraFiscalDoProjeto(projeto), dataDeEmissao());
  if (!m.payload) return { ok: false, error: "Corrija o cadastro antes de reenviar.", pendencias: m.erros };
  try {
    await db.transaction(async (tx) => {
      const [atual] = await tx
        .select({ status: schema.notasServico.status, ref: schema.notasServico.ref })
        .from(schema.notasServico)
        .where(and(eq(schema.notasServico.id, id), eq(schema.notasServico.tenantId, tenantId)))
        .for("update")
        .limit(1);
      if (!atual || atual.status !== "processando" || atual.ref !== ref) throw new Recusa("A nota mudou enquanto você olhava. Recarregue a página.");
      const [recente] = await tx
        .select({ id: schema.notaServicoEventos.id })
        .from(schema.notaServicoEventos)
        .where(
          and(
            eq(schema.notaServicoEventos.notaId, id),
            inArray(schema.notaServicoEventos.tipo, ["enviada", "reenviada"]),
            gt(schema.notaServicoEventos.createdAt, new Date(Date.now() - 60_000)),
          ),
        )
        .orderBy(desc(schema.notaServicoEventos.createdAt))
        .limit(1);
      if (recente) throw new Recusa("A nota acabou de ser enviada. Espere um minuto e use “Atualizar situação”.");
      await tx.insert(schema.notaServicoEventos).values({ tenantId, notaId: id, tipo: "reenviada", ref, status: "processando", createdBy: ctx.userId });
    });
  } catch (e) {
    if (e instanceof Recusa) return { ok: false, error: e.message };
    throw e;
  }
  await logAudit({ tenantId, userId: ctx.userId, action: "nfse.reenviar", entity: "nota_servico", entityId: id, meta: { ambiente, ref } });
  let post: RetornoDoProvedor | null = null;
  try {
    post = await emitirNfse(ambiente, ref, m.payload as Parameters<typeof emitirNfse>[2]);
  } catch {
    post = null;
  }
  const r = await desfechoDoPost(tenantId, id, ambiente, ref, post, ctx.userId);
  revalidatePath("/notasfiscais");
  return r;
}

async function notaDoTenant(tenantId: string, id: string, projects: { id: string }[]) {
  const [n] = await db
    .select()
    .from(schema.notasServico)
    .where(and(eq(schema.notasServico.id, id), eq(schema.notasServico.tenantId, tenantId)))
    .limit(1);
  return n && projects.some((p) => p.id === n.projectId) ? n : null;
}

/** O que fazer com a resposta do POST (seção 3.3). */
async function desfechoDoPost(
  tenantId: string,
  id: string,
  ambiente: AmbienteFiscal,
  ref: string,
  post: RetornoDoProvedor | null,
  userId: string | null,
): Promise<ResultadoDoEnvio> {
  if (!post || semResposta(post))
    return registrarSemResposta(tenantId, id, ref, userId, "A Focus não respondeu ao envio. A nota fica processando: use “Atualizar situação” em alguns minutos.");
  let consulta: RetornoDoProvedor | null = null;
  if (post.status === "erro") {
    try {
      consulta = await consultarNfse(ambiente, ref);
    } catch {
      consulta = null;
    }
  }
  const vale = retornoQueVale(post, consulta);
  if (!vale)
    return registrarSemResposta(
      tenantId,
      id,
      ref,
      userId,
      `A Focus recusou o envio, mas não foi possível confirmar. A nota fica processando até a consulta confirmar. ${mensagemDoRetorno(post) ?? ""}`.trim(),
    );
  return aplicarRetorno(tenantId, id, ref, vale, userId, vale === post ? "retorno" : "consulta");
}

async function registrarSemResposta(tenantId: string, id: string, ref: string, userId: string | null, mensagem: string): Promise<ResultadoDoEnvio> {
  await db.insert(schema.notaServicoEventos).values({ tenantId, notaId: id, tipo: "falha_rede", ref, status: "processando", mensagem, createdBy: userId });
  return { ok: true, situacao: "processando", aviso: mensagem };
}

/**
 * Grava o que o provedor disse — só se a ref ainda é a da nota e a transição é
 * permitida (nenhuma situação volta). Resposta velha vira só histórico.
 */
async function aplicarRetorno(
  tenantId: string,
  id: string,
  ref: string,
  r: RetornoDoProvedor,
  userId: string | null,
  tipo: "retorno" | "consulta",
): Promise<ResultadoDoEnvio> {
  const para = situacaoDoRetorno(r.status);
  const mensagem = mensagemDoRetorno(r);
  const bruto = r.bruto === undefined ? null : (r.bruto as Record<string, unknown>);
  const res = await db.transaction(async (tx) => {
    const [n] = await tx
      .select({ status: schema.notasServico.status, ref: schema.notasServico.ref })
      .from(schema.notasServico)
      .where(and(eq(schema.notasServico.id, id), eq(schema.notasServico.tenantId, tenantId)))
      .for("update")
      .limit(1);
    if (!n) return { mudou: false, situacao: "?", de: "?" };
    const valida = para !== null && n.ref === ref && (para === n.status || transicaoPermitida(n.status, para));
    await tx.insert(schema.notaServicoEventos).values({
      tenantId,
      notaId: id,
      tipo,
      ref,
      status: valida ? para : n.status,
      mensagem: para === null ? "A Focus ainda não conhece esta nota." : valida ? mensagem : `Resposta ignorada (${r.status}): a nota já está ${n.status}.`,
      bruto,
      createdBy: userId,
    });
    if (!valida || para === null) return { mudou: false, situacao: n.status, de: n.status };
    const pedido =
      para === "cancelada" && n.status !== "cancelada"
        ? (
            await tx
              .select({ mensagem: schema.notaServicoEventos.mensagem, createdBy: schema.notaServicoEventos.createdBy })
              .from(schema.notaServicoEventos)
              .where(and(eq(schema.notaServicoEventos.notaId, id), eq(schema.notaServicoEventos.tipo, "cancelamento_pedido")))
              .orderBy(desc(schema.notaServicoEventos.createdAt))
              .limit(1)
          )[0]
        : undefined;
    await tx
      .update(schema.notasServico)
      .set({
        status: para,
        mensagemRetorno: mensagem,
        ...(r.numero ? { numero: r.numero } : {}),
        ...(r.numeroRps ? { numeroRps: r.numeroRps } : {}),
        ...(r.serieRps ? { serieRps: r.serieRps } : {}),
        ...(r.codigoVerificacao ? { codigoVerificacao: r.codigoVerificacao } : {}),
        ...(r.urlDanfse ? { urlDanfse: r.urlDanfse } : {}),
        ...(r.urlEspelho ? { urlEspelho: r.urlEspelho } : {}),
        ...(r.caminhoXml ? { caminhoXml: r.caminhoXml } : {}),
        ...(para === "autorizada" ? { autorizadaEm: new Date() } : {}),
        ...(para === "cancelada" && n.status !== "cancelada"
          ? { canceladaEm: new Date(), canceladaPor: pedido?.createdBy ?? userId, motivoCancelamento: pedido?.mensagem ?? null }
          : {}),
      })
      .where(and(eq(schema.notasServico.id, id), eq(schema.notasServico.tenantId, tenantId)));
    return { mudou: para !== n.status, situacao: para as string, de: n.status };
  });
  if (res.mudou)
    await logAudit({ tenantId, userId, action: "nfse.situacao", entity: "nota_servico", entityId: id, meta: { de: res.de, para: res.situacao, ref } });
  // 5.5 — autorizou: guarda a cópia do PDF e do XML (melhor esforço; o download tenta de novo).
  if (res.mudou && res.situacao === "autorizada") await guardarArquivosDaNota(tenantId, id).catch(() => {});
  const aviso =
    res.situacao === "processando"
      ? "A prefeitura ainda está processando. Use “Atualizar situação” em alguns minutos."
      : res.situacao === "rejeitada"
        ? "A nota foi rejeitada. Corrija e envie de novo — a nova tentativa usa outra referência."
        : undefined;
  return { ok: true, situacao: res.situacao as SituacaoDaNota, ...(aviso ? { aviso } : {}) };
}

/**
 * Prompt AG, 5.6 — cancela uma nota AUTORIZADA. Motivo escrito e confirmação
 * digitando o número. O registro nunca se apaga (5.7): a nota fica "cancelada"
 * com quem, quando e por quê. O pedido é gravado antes da chamada; sem
 * resposta, a nota continua autorizada até a consulta confirmar.
 */
export async function cancelarNota(id: string, motivo: string, confirmacao: string): Promise<ResultadoDoEnvio> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: "Sessão expirada. Entre de novo." };
  if (!can(ctx.perms, "notasfiscais", "ver") || !can(ctx.perms, "notacancelar", "editar"))
    return { ok: false, error: "Sem permissão para cancelar nota fiscal." };
  const tenantId = ctx.tenant.id;
  const n = await notaDoTenant(tenantId, id, ctx.projects);
  if (!n) return naoEncontrada;
  if (!podeCancelar(n.status) || !n.ref) return { ok: false, error: "Só nota autorizada pode ser cancelada." };
  const lido = lerCancelamento(n, motivo, confirmacao);
  if (!lido.ok) return lido;
  const recusa = recusaDoTenant(tenantId, process.env.NFSE_TENANT_ID);
  if (recusa) return { ok: false, error: recusa };
  const ambiente = resolverAmbiente(n.ambiente);
  if (!focusConfigurado(ambiente)) return { ok: false, error: "O token da Focus NFe deste ambiente não está configurado no servidor." };
  const ref = n.ref;

  try {
    await db.transaction(async (tx) => {
      const [atual] = await tx
        .select({ status: schema.notasServico.status, ref: schema.notasServico.ref })
        .from(schema.notasServico)
        .where(and(eq(schema.notasServico.id, id), eq(schema.notasServico.tenantId, tenantId)))
        .for("update")
        .limit(1);
      if (!atual || !podeCancelar(atual.status) || atual.ref !== ref) throw new Recusa("A nota mudou enquanto você olhava. Recarregue a página.");
      const [recente] = await tx
        .select({ id: schema.notaServicoEventos.id })
        .from(schema.notaServicoEventos)
        .where(
          and(
            eq(schema.notaServicoEventos.notaId, id),
            eq(schema.notaServicoEventos.tipo, "cancelamento_pedido"),
            gt(schema.notaServicoEventos.createdAt, new Date(Date.now() - 60_000)),
          ),
        )
        .limit(1);
      if (recente) throw new Recusa("O cancelamento acabou de ser pedido. Espere um minuto e use “Conferir na Focus”.");
      await tx.insert(schema.notaServicoEventos).values({ tenantId, notaId: id, tipo: "cancelamento_pedido", ref, status: "autorizada", mensagem: lido.motivo, createdBy: ctx.userId });
    });
  } catch (e) {
    if (e instanceof Recusa) return { ok: false, error: e.message };
    throw e;
  }
  await logAudit({ tenantId, userId: ctx.userId, action: "nfse.cancelar.pedido", entity: "nota_servico", entityId: id, meta: { ambiente, ref } });

  let r: RetornoDoProvedor | null = null;
  try {
    r = await cancelarNfse(ambiente, ref, lido.motivo);
  } catch {
    r = null;
  }
  const desfecho = desfechoDoCancelamento(r);
  let resultado: ResultadoDoEnvio;
  if (desfecho === "cancelada") {
    resultado = await aplicarRetorno(tenantId, id, ref, r!, ctx.userId, "retorno");
  } else {
    const mensagem =
      desfecho === "recusado"
        ? `A prefeitura não aceitou o cancelamento. ${mensagemDoRetorno(r!) ?? ""}`.trim()
        : "A Focus não confirmou o cancelamento. A nota continua autorizada: use “Conferir na Focus” em alguns minutos.";
    await db.insert(schema.notaServicoEventos).values({
      tenantId,
      notaId: id,
      tipo: desfecho === "recusado" ? "cancelamento_recusado" : "cancelamento_sem_resposta",
      ref,
      status: "autorizada",
      mensagem,
      bruto: r?.bruto === undefined ? null : (r.bruto as Record<string, unknown>),
      createdBy: ctx.userId,
    });
    resultado = desfecho === "recusado" ? { ok: false, error: mensagem } : { ok: true, situacao: "autorizada", aviso: mensagem };
  }
  revalidatePath("/notasfiscais");
  return resultado;
}
