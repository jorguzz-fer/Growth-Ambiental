"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { avisoDaDespesa, avisoDeSaldo, movimentoInverso, numeroDoCampo, recusaDaExclusaoDoItem, recusaDoEstorno, recusaDoItem, recusaDoMovimento, TIPOS_DOC_ESTOQUE, valorDoMovimento } from "@/lib/estoque-regras";
import { desc } from "drizzle-orm";
import { getObjectBytes, isR2Configured, putObject } from "@/lib/storage/r2";
import { AI_ACCEPTED_MIME, AI_MAX_DOCS, isAiConfigured } from "@/lib/ai/despesa-extract";
import { extrairItensDaNota } from "@/lib/ai/estoque-itens";
import { casarItensComCadastro, type PropostaDeEntrada } from "@/lib/estoque-analise";
import { LIMITE_UPLOAD_BYTES, LIMITE_UPLOAD_MB } from "@/lib/clientes-regras";
import { comUsoDeIa } from "@/lib/ai/uso";

/**
 * Estoque (Prompt Y). Controle FÍSICO: a saída não realoca custo (BY-1) —
 * nenhuma action aqui cria despesa, altera despesa/permuta ou toca a DRE. O
 * vínculo com a origem vive inteiramente em `stock_movement`.
 */

export type ResultadoEstoque =
  | { ok: true; id: string; aviso?: string | null }
  | { ok: false; error: string; precisaConfirmar?: boolean; podeInativar?: boolean };

const num = (v: FormDataEntryValue | null): number => numeroDoCampo(String(v ?? ""));
const numSimples = num;
const str = (v: FormDataEntryValue | null): string | null => {
  const s = String(v ?? "").trim();
  return s ? s : null;
};
const hojeInterno = () => {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
};
const SEM_SESSAO = "Sessão expirada. Entre de novo.";

async function itemDoTenant(tenantId: string, id: string) {
  const [item] = await db.select().from(schema.stockItems).where(and(eq(schema.stockItems.id, id), eq(schema.stockItems.tenantId, tenantId))).limit(1);
  return item ?? null;
}
async function movimentosDoItem(tenantId: string, itemId: string): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.stockMovements).where(and(eq(schema.stockMovements.tenantId, tenantId), eq(schema.stockMovements.itemId, itemId)));
  return r?.n ?? 0;
}
async function saldoDoItem(tenantId: string, itemId: string): Promise<number> {
  const [r] = await db
    .select({ s: sql<string>`coalesce(sum(case when ${schema.stockMovements.tipo} = 'saida' then -${schema.stockMovements.quantidade} else ${schema.stockMovements.quantidade} end), 0)` })
    .from(schema.stockMovements)
    .where(and(eq(schema.stockMovements.tenantId, tenantId), eq(schema.stockMovements.itemId, itemId)));
  return Number(r?.s ?? 0);
}

/** 5.1 — cadastro validado: nome, custo e mínimo não negativos, unidade da lista. */
export async function addStockItem(formData: FormData): Promise<ResultadoEstoque> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, "estoque", "criar")) return { ok: false, error: "Sem permissão para cadastrar material." };
  const campos = { nome: str(formData.get("nome")), unidade: str(formData.get("unidade")), custoUnit: num(formData.get("custoUnit")), minimo: numSimples(formData.get("minimo")) };
  const recusa = recusaDoItem(campos);
  if (recusa) return { ok: false, error: recusa };
  const [row] = await db
    .insert(schema.stockItems)
    .values({ tenantId: ctx.tenant.id, sku: str(formData.get("sku")), nome: campos.nome!, unidade: campos.unidade!, categoria: str(formData.get("categoria")), custoUnit: String(campos.custoUnit), minimo: String(campos.minimo), obs: str(formData.get("obs")) })
    .returning({ id: schema.stockItems.id });
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "estoque.item.create", entity: "stock_item", entityId: row.id, meta: { nome: campos.nome, sku: str(formData.get("sku")), unidade: campos.unidade, custoUnit: campos.custoUnit, minimo: campos.minimo } });
  revalidatePath("/estoque");
  return { ok: true, id: row.id };
}

/** 2.6 / 5.4 — editar o cadastro. Alterar o custo NÃO reescreve movimentos (o custo deles é gravado). */
export async function updateStockItem(id: string, formData: FormData): Promise<ResultadoEstoque> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, "estoque", "editar")) return { ok: false, error: "Sem permissão para editar material." };
  const item = await itemDoTenant(ctx.tenant.id, id);
  if (!item) return { ok: false, error: "Material não encontrado." };
  const campos = { nome: str(formData.get("nome")), unidade: str(formData.get("unidade")), custoUnit: num(formData.get("custoUnit")), minimo: numSimples(formData.get("minimo")) };
  const recusa = recusaDoItem(campos);
  if (recusa) return { ok: false, error: recusa };
  const depois = { nome: campos.nome!, sku: str(formData.get("sku")), unidade: campos.unidade!, categoria: str(formData.get("categoria")), custoUnit: String(campos.custoUnit), minimo: String(campos.minimo), obs: str(formData.get("obs")) };
  const antes: Record<string, unknown> = {};
  const mudou: Record<string, unknown> = {};
  for (const k of Object.keys(depois) as (keyof typeof depois)[]) {
    const a = item[k] == null ? null : String(item[k]);
    const b = depois[k] == null ? null : String(depois[k]);
    if (a !== b) {
      antes[k] = a;
      mudou[k] = b;
    }
  }
  if (Object.keys(mudou).length === 0) return { ok: true, id, aviso: "Nada mudou." };
  await db.update(schema.stockItems).set(depois).where(eq(schema.stockItems.id, id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "estoque.item.update", entity: "stock_item", entityId: id, meta: { nome: item.nome, antes, depois: mudou } });
  revalidatePath("/estoque");
  return { ok: true, id };
}

/** 5.2 — inativar em vez de excluir: some das opções, o histórico fica. */
export async function setStockItemAtivo(id: string, ativo: boolean): Promise<ResultadoEstoque> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, "estoque", "editar")) return { ok: false, error: "Sem permissão para editar material." };
  const item = await itemDoTenant(ctx.tenant.id, id);
  if (!item) return { ok: false, error: "Material não encontrado." };
  if (item.ativo === ativo) return { ok: true, id };
  await db.update(schema.stockItems).set({ ativo }).where(eq(schema.stockItems.id, id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: ativo ? "estoque.item.reativar" : "estoque.item.inativar", entity: "stock_item", entityId: id, meta: { nome: item.nome, sku: item.sku } });
  revalidatePath("/estoque");
  return { ok: true, id };
}

/** 5.2 — recusa item com movimento (oferece inativar); audita nome, SKU e saldo. */
export async function deleteStockItem(id: string): Promise<ResultadoEstoque> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, "estoque", "excluir")) return { ok: false, error: "Sem permissão para excluir material." };
  const item = await itemDoTenant(ctx.tenant.id, id);
  if (!item) return { ok: false, error: "Material não encontrado." };
  const movimentos = await movimentosDoItem(ctx.tenant.id, id);
  const recusa = recusaDaExclusaoDoItem(movimentos);
  if (recusa) return { ok: false, error: recusa, podeInativar: true };
  await db.delete(schema.stockItems).where(and(eq(schema.stockItems.id, id), eq(schema.stockItems.tenantId, ctx.tenant.id)));
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "estoque.item.delete",
    entity: "stock_item",
    entityId: id,
    meta: { nome: item.nome, sku: item.sku, unidade: item.unidade, categoria: item.categoria, custoUnit: item.custoUnit, saldo: 0, movimentacoesExcluidas: 0 },
  });
  revalidatePath("/estoque");
  return { ok: true, id };
}

/**
 * 2 / 3 / 4 — entrada ou saída. Validado NO SERVIDOR: entrada aponta uma
 * despesa OU uma permuta; saída informa a obra; o custo vem do cadastro e é
 * GRAVADO no movimento (2.4). Saída maior que o saldo avisa e só grava com
 * `confirmar=1` (2.5). Soma das entradas acima da despesa avisa, sem bloquear (3.5).
 */
export async function addStockMovement(formData: FormData): Promise<ResultadoEstoque> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, "estoque", "criar")) return { ok: false, error: "Sem permissão para movimentar materiais e equipamentos." };
  const tipo: "entrada" | "saida" = String(formData.get("tipo") ?? "entrada") === "saida" ? "saida" : "entrada";
  const itemId = str(formData.get("itemId"));
  const quantidade = numSimples(formData.get("quantidade"));
  const despesaId = tipo === "entrada" ? str(formData.get("despesaId")) : null;
  const permutaId = tipo === "entrada" ? str(formData.get("permutaId")) : null;
  const projectId = str(formData.get("projectId"));
  const recusa = recusaDoMovimento({ tipo, itemId, quantidade, despesaId, permutaId, projectId });
  if (recusa) return { ok: false, error: recusa };
  const item = await itemDoTenant(ctx.tenant.id, itemId!);
  if (!item) return { ok: false, error: "Material não encontrado." };
  if (!item.ativo) return { ok: false, error: "Material inativo: reative o cadastro antes de movimentar." };
  if (projectId && !ctx.projects.some((p) => p.id === projectId)) return { ok: false, error: "Projeto não encontrado nesta empresa." };
  let despesa: { id: string; valor: string; numDoc: string | null } | null = null;
  if (despesaId) {
    const [d] = await db.select({ id: schema.despesas.id, valor: schema.despesas.valor, numDoc: schema.despesas.numDoc }).from(schema.despesas).where(and(eq(schema.despesas.id, despesaId), eq(schema.despesas.tenantId, ctx.tenant.id))).limit(1);
    if (!d) return { ok: false, error: "Despesa não encontrada nesta empresa." };
    despesa = d;
  }
  if (permutaId) {
    const [p] = await db.select({ id: schema.permutas.id }).from(schema.permutas).where(and(eq(schema.permutas.id, permutaId), eq(schema.permutas.tenantId, ctx.tenant.id))).limit(1);
    if (!p) return { ok: false, error: "Permuta não encontrada nesta empresa." };
  }
  const custoUnit = Number(item.custoUnit);
  const saldoAtual = await saldoDoItem(ctx.tenant.id, item.id);
  const avisoSaldo = avisoDeSaldo(saldoAtual, tipo, quantidade, item.unidade);
  const confirmou = String(formData.get("confirmar") ?? "") === "1";
  if (avisoSaldo && !confirmou) return { ok: false, error: avisoSaldo, precisaConfirmar: true };
  let aviso: string | null = null;
  if (despesa) {
    const [s] = await db
      .select({ soma: sql<string>`coalesce(sum(case when ${schema.stockMovements.tipo} = 'saida' then -1 else 1 end * ${schema.stockMovements.quantidade} * ${schema.stockMovements.custoUnit}), 0)` })
      .from(schema.stockMovements)
      .where(and(eq(schema.stockMovements.tenantId, ctx.tenant.id), eq(schema.stockMovements.despesaId, despesa.id)));
    aviso = avisoDaDespesa(Number(despesa.valor), Number(s?.soma ?? 0), valorDoMovimento(quantidade, custoUnit));
  }
  const [row] = await db
    .insert(schema.stockMovements)
    .values({
      tenantId: ctx.tenant.id,
      itemId: item.id,
      projectId,
      tipo,
      origem: str(formData.get("origem")),
      quantidade: String(quantidade),
      custoUnit: String(custoUnit),
      data: str(formData.get("data")) ?? hojeInterno(),
      doc: str(formData.get("doc")),
      despesaId,
      permutaId,
      responsavel: ctx.userEmail || ctx.userId || null,
      obs: str(formData.get("obs")),
    })
    .returning({ id: schema.stockMovements.id });
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "estoque.mov.create",
    entity: "stock_movement",
    entityId: row.id,
    meta: { tipo, item: item.nome, quantidade, custoUnit, valor: valorDoMovimento(quantidade, custoUnit), projectId, despesaId, permutaId, origem: str(formData.get("origem")), saldoAntes: saldoAtual, confirmouSaldoNegativo: !!avisoSaldo, avisoDespesa: aviso },
  });
  revalidatePath("/estoque");
  return { ok: true, id: row.id, aviso };
}

/** 2.6 — estorno por lançamento inverso; o original fica (e os documentos dele também, 4-A.9). */
export async function estornarMovimento(id: string, motivo: string): Promise<ResultadoEstoque> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, "estoque", "criar")) return { ok: false, error: "Sem permissão para estornar movimento." };
  const [m] = await db.select().from(schema.stockMovements).where(and(eq(schema.stockMovements.id, id), eq(schema.stockMovements.tenantId, ctx.tenant.id))).limit(1);
  if (!m) return { ok: false, error: "Movimento não encontrado." };
  const [ja] = await db.select({ id: schema.stockMovements.id }).from(schema.stockMovements).where(and(eq(schema.stockMovements.tenantId, ctx.tenant.id), eq(schema.stockMovements.estornoDeId, id))).limit(1);
  const original = { id: m.id, itemId: m.itemId, tipo: m.tipo, quantidade: Number(m.quantidade), custoUnit: Number(m.custoUnit), projectId: m.projectId, despesaId: m.despesaId, permutaId: m.permutaId, estornoDeId: m.estornoDeId };
  const recusa = recusaDoEstorno(original, !!ja, motivo ?? "");
  if (recusa) return { ok: false, error: recusa };
  const inverso = movimentoInverso(original, hojeInterno(), motivo.trim());
  const [row] = await db
    .insert(schema.stockMovements)
    .values({ tenantId: ctx.tenant.id, ...inverso, responsavel: ctx.userEmail || ctx.userId || null })
    .returning({ id: schema.stockMovements.id });
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "estoque.mov.estorno", entity: "stock_movement", entityId: id, meta: { estornoId: row.id, motivo: motivo.trim(), tipo: m.tipo, quantidade: m.quantidade, custoUnit: m.custoUnit } });
  revalidatePath("/estoque");
  return { ok: true, id: row.id };
}

/* ───────────── 4-A — documentos do movimento ───────────── */

export type ResultadoDocEstoque = { ok: true; added: number } | { ok: false; error: string };

/**
 * 4-A — anexa nota do fornecedor, romaneio, foto do recebimento ou requisição
 * ao movimento. Versão POR TIPO dentro do movimento (4-A.7): anexar do mesmo
 * tipo cria a versão seguinte e preserva a anterior; tipo diferente não herda.
 * Várias imagens de uma vez (4-A.5). A nota fiscal já vive na despesa — aqui
 * vai o recebimento (4-A.6).
 */
export async function addStockMovementDocs(formData: FormData): Promise<ResultadoDocEstoque> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, "estoque", "criar")) return { ok: false, error: "Sem permissão para anexar documentos ao movimento." };
  if (!isR2Configured()) return { ok: false, error: "Storage (R2) não configurado — defina as variáveis R2_*." };
  const movimentoId = str(formData.get("movimentoId"));
  if (!movimentoId) return { ok: false, error: "Movimento não informado." };
  const [mov] = await db.select().from(schema.stockMovements).where(and(eq(schema.stockMovements.id, movimentoId), eq(schema.stockMovements.tenantId, ctx.tenant.id))).limit(1);
  if (!mov) return { ok: false, error: "Movimento não encontrado." };
  const tipo = str(formData.get("tipo")) ?? "";
  if (!(TIPOS_DOC_ESTOQUE as readonly string[]).includes(tipo)) return { ok: false, error: "Escolha o tipo do documento." };
  const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, error: "Selecione ao menos um arquivo." };
  for (const f of files) if (f.size > LIMITE_UPLOAD_BYTES) return { ok: false, error: `"${f.name}" excede ${LIMITE_UPLOAD_MB} MB. Fotos são comprimidas no navegador; PDF grande precisa ser reduzido antes.` };
  const [ultima] = await db
    .select({ versao: schema.documents.versao })
    .from(schema.documents)
    .where(and(eq(schema.documents.tenantId, ctx.tenant.id), eq(schema.documents.stockMovementId, mov.id), eq(schema.documents.tipo, tipo)))
    .orderBy(desc(schema.documents.versao))
    .limit(1);
  let versao = ultima?.versao ?? 0;
  const gravados: { filename: string; versao: number; storageKey: string }[] = [];
  try {
    for (const file of files) {
      versao += 1;
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const key = `tenants/${ctx.tenant.id}/estoque/${mov.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`;
      await putObject(key, new Uint8Array(await file.arrayBuffer()), file.type || "application/octet-stream");
      await db.insert(schema.documents).values({
        tenantId: ctx.tenant.id,
        stockMovementId: mov.id,
        projectId: mov.projectId,
        storageKey: key,
        filename: file.name,
        contentType: file.type || null,
        size: file.size,
        tipo,
        versao,
        uploadedBy: ctx.userEmail || ctx.userId || null,
      });
      gravados.push({ filename: file.name, versao, storageKey: key });
    }
  } catch (e) {
    console.error("[estoque] falha ao anexar documentos:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao enviar os arquivos." };
  }
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "estoque.doc.upload", entity: "stock_movement", entityId: mov.id, meta: { tipo, arquivos: gravados } });
  revalidatePath("/estoque");
  return { ok: true, added: files.length };
}

/** 4-A.8 — remover desfaz o vínculo (a linha sai); o arquivo NÃO é apagado do storage. Auditoria com nome e chave. */
export async function deleteStockMovementDoc(documentId: string): Promise<ResultadoEstoque> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, "estoque", "criar")) return { ok: false, error: "Sem permissão para remover documentos do movimento." };
  const [doc] = await db.select().from(schema.documents).where(and(eq(schema.documents.id, documentId), eq(schema.documents.tenantId, ctx.tenant.id))).limit(1);
  if (!doc || !doc.stockMovementId) return { ok: false, error: "Documento não encontrado." };
  await db.delete(schema.documents).where(and(eq(schema.documents.id, doc.id), eq(schema.documents.tenantId, ctx.tenant.id)));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "estoque.doc.unlink", entity: "stock_movement", entityId: doc.stockMovementId, meta: { documentId: doc.id, filename: doc.filename, storageKey: doc.storageKey, tipo: doc.tipo, versao: doc.versao } });
  revalidatePath("/estoque");
  return { ok: true, id: doc.id };
}

/* ───────────── 7.1 — ler a nota e PROPOR as entradas ───────────── */

export type ResultadoProposta = { ok: true; propostas: PropostaDeEntrada[]; observacoes: string[]; documentos: string[] } | { ok: false; error: string };

/**
 * Lê os documentos (PDF/imagem) já anexados à despesa e devolve PROPOSTAS de
 * entrada, uma por item da nota, casadas com o cadastro. NADA é gravado: a
 * pessoa confere, ajusta e confirma item a item (a gravação é dela, pela
 * mesma `addStockMovement`). Item sem cadastro vira proposta de cadastro (7.2).
 */
export async function proporEntradasDaNota(despesaId: string): Promise<ResultadoProposta> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: SEM_SESSAO };
  if (!can(ctx.perms, "estoque", "ver")) return { ok: false, error: "Sem permissão para ver Materiais e Equipamentos." };
  if (!isAiConfigured()) return { ok: false, error: "Leitura por IA não configurada (ANTHROPIC_API_KEY)." };
  if (!isR2Configured()) return { ok: false, error: "Storage (R2) não configurado — os documentos da despesa não podem ser lidos." };
  const [despesa] = await db.select({ id: schema.despesas.id, numDoc: schema.despesas.numDoc }).from(schema.despesas).where(and(eq(schema.despesas.id, despesaId), eq(schema.despesas.tenantId, ctx.tenant.id))).limit(1);
  if (!despesa) return { ok: false, error: "Despesa não encontrada nesta empresa." };
  const docs = await db.select().from(schema.documents).where(and(eq(schema.documents.tenantId, ctx.tenant.id), eq(schema.documents.despesaId, despesa.id))).orderBy(desc(schema.documents.uploadedAt));
  const legiveis = docs.filter((d) => (AI_ACCEPTED_MIME as readonly string[]).includes(d.contentType ?? "")).slice(0, AI_MAX_DOCS);
  if (legiveis.length === 0) return { ok: false, error: "A despesa não tem PDF ou imagem anexado. Anexe a nota na tela de Despesas e tente de novo." };
  const materiais = await db.select().from(schema.stockItems).where(and(eq(schema.stockItems.tenantId, ctx.tenant.id), eq(schema.stockItems.ativo, true)));
  try {
    const paraLeitura = await Promise.all(legiveis.map(async (d) => ({ bytes: await getObjectBytes(d.storageKey), mime: d.contentType ?? "application/pdf", filename: d.filename })));
    const lido = await comUsoDeIa({ tenantId: ctx.tenant.id, userId: ctx.userId, operacao: "estoque" }, () => extrairItensDaNota(paraLeitura, { materiais: materiais.map((m) => ({ nome: m.nome, unidade: m.unidade, sku: m.sku })) }));
    const propostas = casarItensComCadastro(lido.itens, materiais.map((m) => ({ id: m.id, nome: m.nome, sku: m.sku, unidade: m.unidade, custoUnit: Number(m.custoUnit), minimo: Number(m.minimo), saldo: 0, ativo: m.ativo })));
    await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "estoque.ia.proposta", entity: "despesa", entityId: despesa.id, meta: { documentos: legiveis.map((d) => d.filename), itens: propostas.length, semCadastro: propostas.filter((x) => !x.materialId).length } });
    return { ok: true, propostas, observacoes: lido.observacoes, documentos: legiveis.map((d) => d.filename) };
  } catch (e) {
    console.error("[estoque] falha na leitura da nota por IA:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao ler a nota." };
  }
}
