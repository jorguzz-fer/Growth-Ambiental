"use server";

import { and, eq } from "drizzle-orm";
import { pendenteDaConta } from "@/lib/contas-pagar-regras";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { validarCategoriaDespesa } from "@/lib/calc/natureza-dre";
import type { CategoriaDRE } from "@/lib/calc/constants";
import {
  getProjectContext,
  getProjectVersions,
  getTenantContext,
  type Version,
} from "@/lib/context";
import { registroCasa } from "@/lib/busca";
import { can } from "@/lib/permissions";
import { gravarRecebimento } from "@/lib/conta-receber-recebimento";
import { logAudit } from "@/lib/audit";
import { chaveLigada } from "@/lib/chaves-tenant";
import { hojeISO } from "@/lib/despesa-status";
import { desfazerVinculosDoMovimento, gravarVinculos } from "@/lib/conciliacao-db";
import { correspondenciaInequivoca, type ItemDeVinculo } from "@/lib/conciliacao-regras";
import { somaDosVinculosPorMovimento } from "@/lib/conciliacao-vinculos";
import { saldosReaisDasDespesas } from "@/lib/acerto-saldo";
import {
  getDespesas,
  getUnits,
  getContasPagar,
  getContasReceber,
} from "@/lib/queries";
import { reserveDespesaNumber } from "@/lib/db/numbering";
import { lerPlano } from "@/lib/calc/plano";
import { getAtualVersion } from "@/lib/queries";
import { isR2Configured, putObject } from "@/lib/storage/r2";
import { isAiConfigured } from "@/lib/ai/despesa-extract";
import {
  extractExtratoFromDocument,
  extractExtratoFromText,
  type ExtratoExtraido,
} from "@/lib/ai/extrato-extract";
import { comUsoDeIa } from "@/lib/ai/uso";
import { categoriaParaGravar } from "@/lib/categoria-do-plano-servidor";

/** Formatos aceitos na leitura por IA do extrato (PDF/imagens). */
const EXTRATO_AI_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

/**
 * Lê um extrato bancário em PDF (ou imagem) por IA e retorna as movimentações
 * identificadas para conferência na mesma tela de pré-visualização usada pelos
 * formatos XLSX/CSV. O PDF original é armazenado (R2) para consulta/auditoria.
 * A importação só ocorre após o usuário confirmar — nada é gravado aqui.
 */
export async function extractExtratoPdf(
  formData: FormData,
): Promise<ExtratoExtraido & { error?: string }> {
  // IMPORTANTE: em produção o Next.js redige (esconde) a mensagem de qualquer
  // erro LANÇADO por uma Server Action, substituindo por um texto genérico
  // ("An error occurred in the Server Components render…"). Por isso RETORNAMOS
  // os erros em `error` — assim a mensagem real chega ao usuário na tela.
  const empty: ExtratoExtraido = { movimentos: [], saldoFinal: null };
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "caixa", "editar")) {
    return { ...empty, error: "Sem permissão para importar extrato." };
  }
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ...empty, error: "Selecione um arquivo de extrato." };
  // Limite alinhado ao bodySizeLimit das Server Actions (12 MB no next.config):
  // acima disso o Next rejeita o upload antes da action rodar.
  if (file.size > 10 * 1024 * 1024) {
    return { ...empty, error: "Arquivo deve ter até 10 MB. Para extratos maiores, envie XLSX/CSV." };
  }
  const mime = file.type || "";
  if (!(EXTRATO_AI_MIME as readonly string[]).includes(mime)) {
    return { ...empty, error: "Envie um PDF ou imagem (PNG, JPG ou WebP) do extrato." };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Com IA configurada, usa a leitura por IA (melhor precisão, inclusive imagens).
  // Sem IA, faz leitura de TEXTO do PDF (unpdf) por heurística — o usuário revisa
  // e ajusta na tela de conferência. Imagens sem IA não são suportadas.
  let result: ExtratoExtraido;
  try {
    if (isAiConfigured()) {
      result = await comUsoDeIa({ tenantId: ctx.tenant.id, userId: ctx.userId, operacao: "extrato" }, () => extractExtratoFromDocument(bytes, mime));
    } else if (mime === "application/pdf") {
      result = await comUsoDeIa({ tenantId: ctx.tenant.id, userId: ctx.userId, operacao: "extrato" }, () => extractExtratoFromText(bytes));
    } else {
      return {
        ...empty,
        error:
          "Leitura de imagem exige IA (ANTHROPIC_API_KEY). Para PDF sem IA, envie o PDF com texto; ou use XLSX/CSV.",
      };
    }
  } catch (e) {
    console.error("[extrato] falha ao ler PDF/imagem:", e);
    const detail = e instanceof Error ? e.message : String(e);
    return {
      ...empty,
      error:
        `Falha ao ler o arquivo do extrato (${detail}). ` +
        "Se o PDF for escaneado/imagem (sem texto), ative a leitura por IA em " +
        "Configurações → Diagnóstico de IA, ou envie o extrato em XLSX/CSV.",
    };
  }
  if (result.movimentos.length === 0) {
    return {
      ...result,
      error:
        "Não identifiquei movimentações no texto do PDF. Ele pode ser escaneado/imagem " +
        "(sem texto) — ative a leitura por IA em Configurações → Diagnóstico de IA, ou envie XLSX/CSV.",
    };
  }

  // Guarda o arquivo original do extrato para auditoria (quando o R2 existe).
  const bankAccountId = (formData.get("bankAccountId") as string) || null;
  if (isR2Configured()) {
    try {
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const key = `tenants/${ctx.tenant.id}/extratos/${Date.now()}_${safe}`;
      await putObject(key, bytes, file.type || "application/octet-stream");
      await db.insert(schema.documents).values({
        tenantId: ctx.tenant.id,
        storageKey: key,
        filename: file.name,
        contentType: file.type || null,
        size: file.size,
        tipo: "Extrato bancário",
        uploadedBy: ctx.userEmail || ctx.userId || null,
      });
    } catch {
      // Falha ao armazenar o original não impede a conferência/importação.
    }
  }

  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "extrato.readPdf",
    entity: "cash_entry",
    entityId: bankAccountId ?? "—",
    meta: { arquivo: file.name, movimentos: result.movimentos.length },
  });
  return result;
}

/** "MM/DD/YYYY" | "MM/YYYY" → "MM/YYYY" (para casar por competência). */
function monthKeyFrom(d?: string | null): string | null {
  if (!d) return null;
  const p = d.split("/");
  if (p.length === 3) return `${p[0].padStart(2, "0")}/${p[2]}`;
  if (p.length === 2) return `${p[0].padStart(2, "0")}/${p[1]}`;
  return null;
}

const cents = (v: number) => Math.round(v * 100);

/**
 * Versão de trabalho da obra da tela (Prompt A): a mesma regra que valia para
 * a obra do cookie (Atual → padrão → mais antiga), agora para a obra que a
 * tela informa — e só se ela for da empresa. Null = recusar a gravação.
 */
async function versaoDoCaixa(tenantId: string, projectId: unknown): Promise<Version | null> {
  if (typeof projectId !== "string" || !projectId) return null;
  return (await getProjectVersions(tenantId, projectId))?.trabalho ?? null;
}
const SEM_OBRA = "Escolha o projeto do caixa.";

/**
 * Prompt AT §3 — onde nasce um movimento NOVO de extrato. Chave
 * "caixa_conciliacao_por_conta" ligada: em nenhuma obra (é da conta; a obra
 * vem do vínculo). Desligada: na versão de trabalho da obra da tela, como
 * sempre foi.
 */
async function destinoDoMovimentoNovo(
  tenantId: string,
  projectId: unknown,
): Promise<{ ok: true; versionId: string | null; version: Version | null } | { ok: false; error: string }> {
  if (await chaveLigada(tenantId, "caixa_conciliacao_por_conta")) return { ok: true, versionId: null, version: null };
  const version = await versaoDoCaixa(tenantId, projectId);
  if (!version) return { ok: false, error: SEM_OBRA };
  if (version.locked) return { ok: false, error: "Versão congelada." };
  return { ok: true, versionId: version.id, version };
}

export async function addCash(formData: FormData) {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "caixa", "criar")) return;
  const version = await versaoDoCaixa(ctx.tenant.id, formData.get("projectId"));
  if (!version) throw new Error(SEM_OBRA);
  if (version.locked) throw new Error("Versão congelada.");

  // Tipo de lançamento define o sinal do valor e a categoria:
  //  - receita: entrada (+), categoria escolhida (mensais/AS/…);
  //  - despesa: saída (−), lançamento avulso do extrato sem contraparte;
  //  - ajuste:  ajuste manual de caixa, + ou − conforme "sinal".
  // Entradas de ajuste e avulsas do extrato já nascem conciliadas (não têm
  // contraparte nos módulos de receita/despesa para casar).
  const tipo = ((formData.get("tipo") as string) || "receita").toLowerCase();
  const magnitude = Math.abs(Number(formData.get("valor")) || 0);

  let sign = 1;
  let cat = (formData.get("cat") as string) || "outro";
  let rec = false;
  if (tipo === "despesa") {
    sign = -1;
    cat = "despesa_extrato";
    rec = true;
  } else if (tipo === "ajuste") {
    sign = (formData.get("sinal") as string) === "menos" ? -1 : 1;
    cat = "ajuste";
    rec = true;
  } else if (tipo === "receita" && cat === "extrato") {
    // Receita avulsa do extrato (sem categoria de receita conhecida).
    cat = "receita_extrato";
    rec = true;
  }

  const [row] = await db
    .insert(schema.cashEntries)
    .values({
      versionId: version.id,
      tenantId: ctx.tenant.id,
      data: (formData.get("data") as string) || null,
      descricao: (formData.get("descricao") as string) || null,
      valor: String(sign * magnitude),
      cat,
      unitCode: (formData.get("unitCode") as string) || null,
      bankAccountId: (formData.get("bankAccountId") as string) || null,
      rec,
    })
    .returning();

  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: tipo === "ajuste" ? "cash.adjust" : "cash.create",
    entity: "cash_entry",
    entityId: row.id,
    meta: { tipo, cat, valor: row.valor },
  });
  revalidatePath("/caixa");
}

/**
 * Prompt L, Parte 4 — o ajuste de caixa com o que faltava: motivo
 * obrigatório (4.2.1), permissão PRÓPRIA `conciliacao:criar` (4.2.2),
 * retorno legível. Grava pelo mesmo caminho de `addCash` (tipo "ajuste":
 * nasce conciliado, `cat = "ajuste"`, fora da DRE) — nenhum `cash_entry`
 * existente muda. A versão é a de trabalho da obra informada (4.2.5).
 */
export async function addAjuste(formData: FormData): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "conciliacao", "criar")) {
    return { ok: false, error: "Lançar ajuste de caixa exige a permissão \"Conciliação — ajustar e desfazer: criar\", que o seu usuário não tem. Peça a um administrador." };
  }
  const motivo = ((formData.get("motivo") as string | null) ?? "").trim();
  if (!motivo) return { ok: false, error: "Informe o motivo do ajuste — ele fica na auditoria e na aba Ajustes." };
  const magnitude = Math.abs(Number(formData.get("valor")) || 0);
  if (!(magnitude > 0)) return { ok: false, error: "Informe um valor maior que zero." };
  const data = ((formData.get("data") as string | null) ?? "").trim();
  if (!data) return { ok: false, error: "Informe a data do ajuste." };
  // Prompt AT §3 (BAT-3, provisório): com a chave "caixa_conciliacao_por_conta"
  // ligada, a obra do ajuste é OPCIONAL: com obra, vai para a versão de
  // trabalho dela; sem obra, é da empresa ("não atribuído a obra").
  const porConta = await chaveLigada(ctx.tenant.id, "caixa_conciliacao_por_conta");
  const obraInformada = typeof formData.get("projectId") === "string" && !!formData.get("projectId");
  const version = porConta && !obraInformada ? null : await versaoDoCaixa(ctx.tenant.id, formData.get("projectId"));
  if (!version && !(porConta && !obraInformada)) return { ok: false, error: SEM_OBRA };
  if (version?.locked) return { ok: false, error: "Versão congelada." };
  const sinal = (formData.get("sinal") as string) === "menos" ? -1 : 1;
  const bankAccountId = ((formData.get("bankAccountId") as string | null) || "").trim() || null;
  const [row] = await db
    .insert(schema.cashEntries)
    .values({ versionId: version?.id ?? null, tenantId: ctx.tenant.id, data, descricao: motivo, valor: String(sinal * magnitude), cat: "ajuste", bankAccountId, rec: true })
    .returning();
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "cash.adjust",
    entity: "cash_entry",
    entityId: row.id,
    meta: { tipo: "ajuste", cat: "ajuste", valor: row.valor, motivo, bankAccountId, data, autor: ctx.userEmail ?? ctx.userId ?? null },
  });
  revalidatePath("/caixa");
  return { ok: true, id: row.id };
}

export interface ImportCashRow {
  data?: string;
  descricao?: string;
  valor?: number;
  cat?: string;
  /** nº do documento do extrato (para dedup e exibição). */
  doc?: string;
}

export interface ImportExtratoInput {
  rows: ImportCashRow[];
  /** conta corrente à qual os lançamentos e o saldo final pertencem. */
  bankAccountId?: string | null;
  /** saldo final do extrato — atualiza o saldo da conta se informado. */
  saldoFinal?: number | null;
  /** obra da tela (Prompt A) — os movimentos vão para a versão de trabalho dela. */
  projectId: string;
}

export interface ImportExtratoResult {
  inserted: number;
  conciliated: number;
  saldoUpdated: boolean;
  /** lançamentos ignorados por já terem sido importados antes (dedup). */
  skipped: number;
}

/** Assinatura de dedup de um lançamento do extrato (por conta). */
function importSignature(
  bankAccountId: string | null,
  data: string | null | undefined,
  valor: number,
  doc: string | null | undefined,
): string {
  return `${bankAccountId ?? "-"}|${(data ?? "").trim()}|${cents(valor)}|${(doc ?? "").trim()}`;
}

/**
 * Importa lançamentos de um extrato (XLSX/CSV) para uma conta corrente:
 *  1) atribui cada lançamento à conta informada;
 *  2) tenta casar (conciliar) automaticamente com as despesas previstas
 *     (por valor + mês) e com as receitas previstas das unidades (por valor);
 *  3) atualiza o saldo final da conta, quando informado.
 * Lançamentos sem correspondência ficam pendentes para conciliação manual.
 */
export async function importCash(
  input: ImportExtratoInput,
): Promise<ImportExtratoResult> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "caixa", "criar")) {
    throw new Error("Sem permissão para importar extrato.");
  }
  const destino = await destinoDoMovimentoNovo(ctx.tenant.id, input.projectId);
  if (!destino.ok) throw new Error(destino.error);

  const { rows, saldoFinal } = input;
  // Valida a conta (deve pertencer ao tenant).
  const contas = await db
    .select()
    .from(schema.bankAccounts)
    .where(eq(schema.bankAccounts.tenantId, ctx.tenant.id));
  const bankAccountId =
    input.bankAccountId && contas.some((c) => c.id === input.bankAccountId)
      ? input.bankAccountId
      : null;

  // Dedup: ignora lançamentos já importados antes (mesma conta, data, valor e
  // documento). Carrega as assinaturas existentes uma vez.
  const existentes = await db
    .select({ importHash: schema.cashEntries.importHash })
    .from(schema.cashEntries)
    .where(eq(schema.cashEntries.tenantId, ctx.tenant.id));
  const jaImportados = new Set(
    existentes.map((e) => e.importHash).filter((h): h is string => !!h),
  );

  const naoZero = rows.filter((r) => r.valor != null && r.valor !== 0);
  const vistos = new Set<string>();
  let skipped = 0;
  const valid = naoZero.filter((r) => {
    const sig = importSignature(bankAccountId, r.data, Number(r.valor), r.doc);
    if (jaImportados.has(sig) || vistos.has(sig)) {
      skipped++;
      return false;
    }
    vistos.add(sig);
    return true;
  });

  // Pools para conciliação automática. Movimento da conta (§3): as despesas e
  // unidades da versão Atual de TODAS as obras; a regra continua a mesma
  // (só concilia com uma única candidata).
  const versoesDoPool = destino.version
    ? [destino.version.id]
    : (await db.select({ id: schema.versions.id }).from(schema.versions).where(and(eq(schema.versions.tenantId, ctx.tenant.id), eq(schema.versions.kind, "atual")))).map((v) => v.id);
  const [despesas, units] = await Promise.all([
    Promise.all(versoesDoPool.map((id) => getDespesas(id))).then((xs) => xs.flat()),
    Promise.all(versoesDoPool.map((id) => getUnits(ctx.tenant.id, id))).then((xs) => xs.flat()),
  ]);
  // Despesas em aberto: chave (centavos|mês) → candidatas. Prompt L, 2.7 — a
  // importação só grava vínculo quando a correspondência é INEQUÍVOCA (uma
  // candidata); com mais de uma, PROPÕE (fica pendente, com as sugestões da
  // tela). Nunca mais marca `rec` sem guardar com o quê casou.
  const despPool = new Map<string, string[]>();
  for (const d of despesas) {
    if (d.cancelado || d.status === "Pago") continue;
    const mm = monthKeyFrom(d.competencia) ?? monthKeyFrom(d.vencimento);
    if (!mm) continue;
    const key = `${cents(Math.abs(Number(d.valor)))}|${mm}`;
    despPool.set(key, [...(despPool.get(key) ?? []), d.id]);
  }
  // Receitas previstas: conjunto de valores de parcela esperados (em centavos).
  const receitaVals = new Set<number>();
  // Prompt AR, Fase 2: valores pela leitura única do plano. Como sempre, de
  // todas as unidades (vendidas ou não), uma vez por seção, sem o financiamento.
  for (const u of units) {
    for (const p of lerPlano(u.paymentPlan, u.status, { qualquerStatus: true, periodicaMinimaUm: true })) {
      if (p.origem !== "Banco" && p.valorBase > 0) receitaVals.add(cents(p.valorBase));
    }
  }

  let conciliated = 0;
  let propostos = 0;
  const vinculosAGravar: { sig: string; despesaId: string; valor: number }[] = [];
  const toInsert = valid.map((r) => {
    const v = Number(r.valor);
    let cat = r.cat || "extrato";
    const sig = importSignature(bankAccountId, r.data, v, r.doc);
    if (v < 0) {
      const mm = monthKeyFrom(r.data);
      const key = `${cents(Math.abs(v))}|${mm}`;
      const candidatas = mm ? (despPool.get(key) ?? []) : [];
      const unica = correspondenciaInequivoca(candidatas);
      if (unica) {
        despPool.set(key, []);
        vinculosAGravar.push({ sig, despesaId: unica, valor: Math.abs(v) });
        cat = "despesa";
      } else if (candidatas.length > 1) {
        propostos++;
      }
    } else if (receitaVals.has(cents(v))) {
      // Entrada compatível com parcela prevista das unidades: só proposta
      // (não há conta a receber para dar lastro); a tela sugere.
      cat = "receita";
      propostos++;
    }
    return {
      versionId: destino.versionId,
      tenantId: ctx.tenant.id,
      bankAccountId,
      data: r.data || null,
      descricao: r.descricao || null,
      valor: String(v),
      cat,
      doc: r.doc || null,
      importHash: sig,
      rec: false,
    };
  });

  const inseridos = toInsert.length > 0 ? await db.insert(schema.cashEntries).values(toInsert).returning({ id: schema.cashEntries.id, importHash: schema.cashEntries.importHash }) : [];
  // Vínculo com valor para as correspondências inequívocas (2.7), com rastro.
  const quem = { tenantId: ctx.tenant.id, userId: ctx.userId, userEmail: ctx.userEmail };
  for (const vg of vinculosAGravar) {
    const mov = inseridos.find((i) => i.importHash === vg.sig);
    if (!mov) continue;
    const r = await gravarVinculos(quem, { cashEntryId: mov.id, itens: [{ despesaId: vg.despesaId, valor: vg.valor }], origem: "importacao" });
    if (r.ok) conciliated++;
    else propostos++;
  }

  // Atualiza o saldo final da conta, se informado.
  let saldoUpdated = false;
  if (bankAccountId && saldoFinal != null && Number.isFinite(saldoFinal)) {
    await db
      .update(schema.bankAccounts)
      .set({
        saldo: String(saldoFinal),
        saldoSource: "auto",
        lastSync: new Date(),
      })
      .where(
        and(
          eq(schema.bankAccounts.id, bankAccountId),
          eq(schema.bankAccounts.tenantId, ctx.tenant.id),
        ),
      );
    saldoUpdated = true;
  }

  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "cash.import",
    entity: "cash_entry",
    meta: {
      count: toInsert.length,
      conciliated,
      propostos,
      skipped,
      bankAccountId,
      saldoUpdated,
    },
  });
  revalidatePath("/caixa");
  revalidatePath("/contas");
  revalidatePath("/contaspagar");
  return { inserted: toInsert.length, conciliated, saldoUpdated, skipped };
}

/** Mensagem da recusa de "conciliar" sem dizer com o quê (Prompt AT §2.2). */
const CONCILIAR_EXIGE_VINCULO =
  "Para conciliar, diga com o quê o movimento casou: uma despesa, uma conta a receber, uma parcela de venda ou um pagamento de fatura (na Conciliação ou no Assistente do Caixa). Se for diferença sem documento, lance um ajuste com motivo.";

/**
 * Alterna o estado de conciliação de um lançamento de caixa.
 *
 * Prompt AT §2.2 (Revisão 4): MARCAR exige vínculo. Sem contraparte, a marca
 * é recusada: ela sustentava saldo conciliado sem lastro. O seletor só serve
 * para DESFAZER, e desfazer pede motivo (vai à auditoria). Os movimentos já
 * marcados sem vínculo não mudam: aparecem como "conciliado sem vínculo" na
 * lista de conferência da Conciliação e no Assistente do Caixa.
 */
export async function toggleConciliado(id: string, rec: boolean, contraparte?: { despesaId: string; valor?: number } | null, motivo?: string | null) {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "caixa", "editar")) return;
  // Prompt L, 2.6 — tenant, versão congelada e auditoria; com contraparte
  // escolhida, grava o VÍNCULO com valor em vez de só alternar a marca.
  const [alvo] = await db
    .select({ id: schema.cashEntries.id, locked: schema.versions.locked })
    // Prompt AT §3: o movimento sem obra (da conta) não tem versão a congelar.
    .from(schema.cashEntries)
    .leftJoin(schema.versions, eq(schema.cashEntries.versionId, schema.versions.id))
    .where(and(eq(schema.cashEntries.id, id), eq(schema.cashEntries.tenantId, ctx.tenant.id)))
    .limit(1);
  if (!alvo) throw new Error("Movimento não encontrado.");
  if (alvo.locked) throw new Error("Versão congelada — conciliação bloqueada.");
  if (rec && !contraparte?.despesaId) throw new Error(CONCILIAR_EXIGE_VINCULO);
  const motivoLimpo = (motivo ?? "").trim();
  if (!rec && !motivoLimpo) throw new Error("Informe o motivo para desfazer a conciliação (fica na auditoria).");
  if (rec && contraparte?.despesaId) {
    const r = await conciliarMovimento({ cashEntryId: id, itens: [{ despesaId: contraparte.despesaId, valor: contraparte.valor ?? 0 }] });
    if (!r.ok) throw new Error(r.error);
    return;
  }
  const [mov] = await db
    .update(schema.cashEntries)
    .set({ rec })
    // Isolamento: o id sozinho alcançava lançamento de outro tenant.
    .where(and(eq(schema.cashEntries.id, id), eq(schema.cashEntries.tenantId, ctx.tenant.id)))
    .returning();
  // AK Parte 1 — sem transação aqui (1.3). Só registra se alguma linha foi
  // gravada; o estado anterior é o inverso de `para` (a tela só alterna).
  if (mov) {
    await logAudit({
      tenantId: ctx.tenant.id,
      userId: ctx.userId,
      action: "conciliacao.flag",
      entity: "cash_entry",
      entityId: mov.id,
      meta: { data: mov.data, descricao: mov.descricao, valor: mov.valor, para: rec, ...(motivoLimpo ? { motivo: motivoLimpo } : {}) },
    });
  }
  revalidatePath("/caixa");
}

/**
 * Prompt L, Parte 2 — concilia um movimento (saída do extrato) com uma ou
 * várias despesas, COM VALOR por vínculo (2.2): um pagamento quita seis
 * despesas de três obras; a soma dos vínculos não excede o movimento (2.4);
 * o status da despesa é derivado (2.5); a conciliação só conclui quando os
 * vínculos somam o movimento (3.1). Núcleo em `conciliacao-db.ts`.
 */
export async function conciliarMovimento(input: { cashEntryId: string; itens: ItemDeVinculo[] }): Promise<{ ok: true; concluida: boolean; soma: number } | { ok: false; error: string }> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "caixa", "editar")) return { ok: false, error: "Sem permissão para conciliar." };
  const [alvo] = await db
    .select({ locked: schema.versions.locked })
    .from(schema.cashEntries)
    .leftJoin(schema.versions, eq(schema.cashEntries.versionId, schema.versions.id))
    .where(and(eq(schema.cashEntries.id, input.cashEntryId), eq(schema.cashEntries.tenantId, ctx.tenant.id)))
    .limit(1);
  if (!alvo) return { ok: false, error: "Movimento não encontrado." };
  if (alvo.locked) return { ok: false, error: "Versão congelada — conciliação bloqueada." };
  // Valor zero ou ausente = "o que couber": o menor entre o livre do movimento e o saldo da despesa.
  const itens: ItemDeVinculo[] = [];
  let restante = await livreDoMovimento(ctx.tenant.id, input.cashEntryId);
  for (const i of input.itens) {
    let valor = Number(i.valor) || 0;
    if (valor <= 0) {
      const [d] = await db.select({ id: schema.despesas.id, valor: schema.despesas.valor }).from(schema.despesas).where(and(eq(schema.despesas.id, i.despesaId), eq(schema.despesas.tenantId, ctx.tenant.id)));
      if (!d) return { ok: false, error: "Despesa não encontrada." };
      const saldo = (await saldosReaisDasDespesas(db, ctx.tenant.id, [d])).get(d.id)?.saldo ?? Number(d.valor);
      valor = Math.round(Math.min(restante, saldo) * 100) / 100;
    }
    restante = Math.round((restante - valor) * 100) / 100;
    itens.push({ despesaId: i.despesaId, valor });
  }
  const r = await gravarVinculos({ tenantId: ctx.tenant.id, userId: ctx.userId, userEmail: ctx.userEmail }, { cashEntryId: input.cashEntryId, itens, origem: "manual" });
  if (!r.ok) return r;
  revalidatePath("/caixa");
  revalidatePath("/despesas");
  revalidatePath("/contaspagar");
  return { ok: true, concluida: r.concluida, soma: r.soma };
}

/** Quanto uma saída do extrato ainda tem livre para vínculos com despesas. */
async function livreDoMovimento(tenantId: string, cashEntryId: string): Promise<number> {
  const [mov] = await db.select({ valor: schema.cashEntries.valor }).from(schema.cashEntries).where(and(eq(schema.cashEntries.id, cashEntryId), eq(schema.cashEntries.tenantId, tenantId))).limit(1);
  if (!mov) return 0;
  const soma = (await somaDosVinculosPorMovimento(db, tenantId, [cashEntryId])).get(cashEntryId) ?? 0;
  return Math.max(0, Math.round((Math.abs(Number(mov.valor)) - soma) * 100) / 100);
}

/**
 * Concilia um movimento do extrato com UMA despesa escolhida pelo usuário —
 * caminho antigo da tela e do pareamento, agora com valor: o menor entre o
 * livre do movimento e o saldo da despesa (2.4; nunca mais "R$ 1.000 marca
 * R$ 5.000 como pago"). Lança exceção com a mensagem, como antes.
 */
export async function conciliarDespesa(input: {
  cashEntryId: string;
  despesaId: string;
  valor?: number;
}): Promise<void> {
  const r = await conciliarMovimento({ cashEntryId: input.cashEntryId, itens: [{ despesaId: input.despesaId, valor: input.valor ?? 0 }] });
  if (!r.ok) throw new Error(r.error);
}

/**
 * Desfaz uma conciliação (somente usuários autorizados): restaura a despesa para
 * "A pagar" (remove data de pagamento) e libera o movimento. Preserva o registro
 * de auditoria da operação.
 */
export async function desfazerConciliacao(cashEntryId: string, motivo?: string | null): Promise<void> {
  const ctx = await getTenantContext();
  // Prompt L, 5.1/5.2 — permissão PRÓPRIA, distinta de editar despesa ou
  // caixa: quem pode editar mas não pode desfazer fica bloqueado, e a
  // mensagem diz com todas as letras.
  if (!ctx || !can(ctx.perms, "conciliacao", "excluir")) {
    throw new Error("Desfazer conciliação exige a permissão \"Conciliação — ajustar e desfazer: excluir\", que o seu usuário não tem. Peça a um administrador.");
  }
  const [mov] = await db
    .select()
    .from(schema.cashEntries)
    .where(
      and(
        eq(schema.cashEntries.id, cashEntryId),
        eq(schema.cashEntries.tenantId, ctx.tenant.id),
      ),
    )
    .limit(1);
  if (!mov) throw new Error("Movimento não encontrado.");
  // Entrada conciliada a uma conta a receber: estorna o recebimento.
  if (mov.conciliadoContaReceberId) {
    const [cr] = await db
      .select()
      .from(schema.contasReceber)
      .where(
        and(
          eq(schema.contasReceber.id, mov.conciliadoContaReceberId),
          eq(schema.contasReceber.tenantId, ctx.tenant.id),
        ),
      )
      .limit(1);
    if (cr) {
      const novoReceb = Math.max(0, Number(cr.valorRecebido) - Math.abs(Number(mov.valor)));
      await db
        .update(schema.contasReceber)
        .set({
          valorRecebido: String(novoReceb),
          status: novoReceb <= 0 ? "A receber" : "Parcialmente recebido",
          dataRecebimento: novoReceb <= 0 ? null : cr.dataRecebimento,
        })
        .where(eq(schema.contasReceber.id, cr.id));
    }
    await db
      .update(schema.cashEntries)
      .set({ rec: false, conciliadoContaReceberId: null, conciliadoPor: null, conciliadoEm: null })
      .where(eq(schema.cashEntries.id, mov.id));
    await logAudit({
      tenantId: ctx.tenant.id,
      userId: ctx.userId,
      action: "conciliacao.undo",
      entity: "cash_entry",
      entityId: mov.id,
      meta: { contaReceberId: mov.conciliadoContaReceberId },
    });
    revalidatePath("/caixa");
    revalidatePath("/contasreceber");
    return;
  }
  // Lado da despesa (com vínculos de valor ou pelo caminho antigo): o núcleo
  // faz o estorno lógico, remove os pagamentos gerados, recalcula o status
  // derivado e libera o movimento — que é preservado (5.3). Auditado (5.4).
  const r = await desfazerVinculosDoMovimento({ tenantId: ctx.tenant.id, userId: ctx.userId, userEmail: ctx.userEmail }, mov.id, motivo ?? null);
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/caixa");
  revalidatePath("/despesas");
  revalidatePath("/contaspagar");
}

/**
 * Concilia uma ENTRADA do extrato com uma conta a receber existente (item 7):
 * marca a conta como recebida (total/parcial), vincula o movimento e audita.
 * Impede conciliar um movimento já processado (conciliado ou convertido).
 */
export async function conciliarContaReceber(input: {
  cashEntryId: string;
  contaReceberId: string;
}): Promise<void> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "caixa", "editar")) {
    throw new Error("Sem permissão para conciliar.");
  }
  // Prompt K (K-2): a conciliação vira um RECEBIMENTO com valor por vínculo
  // (até o que falta na conta e até o que o movimento ainda tem livre), pela
  // mesma regra da tela de Contas a Receber. Os campos antigos do movimento
  // (rec, conciliado_conta_receber_id) continuam sendo gravados (4.5).
  const [mov] = await db
    .select()
    .from(schema.cashEntries)
    .where(and(eq(schema.cashEntries.id, input.cashEntryId), eq(schema.cashEntries.tenantId, ctx.tenant.id)))
    .limit(1);
  if (!mov) throw new Error("Movimento não encontrado.");
  if (mov.conciliadoDespesaId) throw new Error("Este movimento já está processado.");
  const [cr] = await db
    .select()
    .from(schema.contasReceber)
    .where(and(eq(schema.contasReceber.id, input.contaReceberId), eq(schema.contasReceber.tenantId, ctx.tenant.id)))
    .limit(1);
  if (!cr) throw new Error("Conta a receber não encontrada.");
  if (cr.cancelado || cr.status === "Recebido") {
    throw new Error("Esta conta a receber já está recebida ou cancelada.");
  }
  const quem = { tenantId: ctx.tenant.id, userId: ctx.userId, userEmail: ctx.userEmail };
  const livre = await disponivelDoMovimento(quem.tenantId, mov.id);
  if (livre <= 0) throw new Error("Este movimento já está processado.");
  const saldo = Math.max(0, Number(cr.valor) - Number(cr.valorRecebido));
  const valor = Math.min(livre, saldo);
  const r = await gravarRecebimento(quem, {
    contaReceberId: cr.id,
    valor,
    data: mov.data,
    forma: "Extrato bancário",
    justificativa: null,
    cashEntryId: mov.id,
  });
  if (!r.ok) throw new Error(r.error);
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "conciliacao.receber",
    entity: "cash_entry",
    entityId: mov.id,
    meta: { contaReceberId: cr.id, valor, recebimentoId: r.id },
  });
  revalidatePath("/caixa");
  revalidatePath("/contasreceber");
}

/** Quanto uma entrada do extrato ainda tem livre para vínculos com contas a receber (4.2). */
async function disponivelDoMovimento(tenantId: string, cashEntryId: string): Promise<number> {
  const [mov] = await db
    .select({ valor: schema.cashEntries.valor })
    .from(schema.cashEntries)
    .where(and(eq(schema.cashEntries.id, cashEntryId), eq(schema.cashEntries.tenantId, tenantId)))
    .limit(1);
  if (!mov) return 0;
  const vinc = await db
    .select({ valor: schema.contaReceberRecebimentos.valor })
    .from(schema.contaReceberRecebimentos)
    .where(and(eq(schema.contaReceberRecebimentos.cashEntryId, cashEntryId), eq(schema.contaReceberRecebimentos.tenantId, tenantId), eq(schema.contaReceberRecebimentos.estornado, false)));
  return Math.round((Number(mov.valor) - vinc.reduce((a, v) => a + Number(v.valor), 0)) * 100) / 100;
}

/**
 * Transforma um item do extrato em uma NOVA conta (item 6): saída → conta a
 * pagar (despesa, já paga na data do movimento); entrada → conta a receber (já
 * recebida). Vincula o movimento à conta criada (rastreabilidade) e o marca como
 * processado, impedindo que o mesmo item seja conciliado E convertido.
 */
/**
 * Prompt AT §5.4 — a mesma conversão, devolvendo o resultado (a mensagem chega
 * à tela em produção). Numa ENTRADA, se houver parcela de venda compatível, a
 * conta NÃO é criada sem a confirmação explícita de que a entrada não é a
 * parcela (`naoEParcela`): criar a conta e deixar a parcela no plano somaria a
 * receita duas vezes.
 */
export async function criarContaAPartirDoExtrato(input: {
  cashEntryId: string;
  projectId?: string | null;
  naoEParcela?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string; parcelas?: import("@/lib/recebimento-parcela").SugestaoParcela[] }> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "caixa", "editar")) return { ok: false, error: "Sem permissão." };
  if (!input.naoEParcela) {
    const [mov] = await db.select().from(schema.cashEntries).where(and(eq(schema.cashEntries.id, input.cashEntryId), eq(schema.cashEntries.tenantId, ctx.tenant.id))).limit(1);
    if (mov && Number(mov.valor) > 0) {
      const rp = await import("@/lib/recebimento-parcela");
      const parcelas = rp.sugestoesDeParcela({ valor: Number(mov.valor), data: mov.data, descricao: mov.descricao }, await rp.parcelasDeVenda(ctx.tenant.id, hojeISO())).filter((p) => p.grau !== "baixa");
      if (parcelas.length > 0) {
        return {
          ok: false,
          error: "Esta entrada pode ser uma parcela de venda. Concilie com a parcela; criar uma conta a receber e deixar a parcela no plano soma a receita duas vezes. Se não for a parcela, confirme.",
          parcelas,
        };
      }
    }
  }
  try {
    await criarContaFromExtrato(input.cashEntryId, input.projectId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao criar a conta." };
  }
}

// Prompt AT §5.4: sem export — a tela usa `criarContaAPartirDoExtrato`, que confere a parcela antes.
async function criarContaFromExtrato(
  cashEntryId: string,
  /** Prompt AT §3: obra da conta nova, quando o movimento não tem obra (é da conta). */
  projectId?: string | null,
): Promise<void> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "caixa", "editar")) {
    throw new Error("Sem permissão.");
  }
  const [mov] = await db
    .select()
    .from(schema.cashEntries)
    .where(and(eq(schema.cashEntries.id, cashEntryId), eq(schema.cashEntries.tenantId, ctx.tenant.id)))
    .limit(1);
  if (!mov) throw new Error("Movimento não encontrado.");
  if (mov.rec || mov.conciliadoDespesaId || mov.conciliadoContaReceberId) {
    throw new Error("Este movimento já foi processado (conciliado ou convertido).");
  }
  // O movimento antigo tem obra; o da conta (Prompt AT §3) recebe a obra que a
  // pessoa escolhe, na versão de trabalho dela.
  const ver = mov.versionId
    ? (await db.select({ id: schema.versions.id, projectId: schema.versions.projectId }).from(schema.versions).where(eq(schema.versions.id, mov.versionId)).limit(1))[0]
    : await (async () => {
        const v = await versaoDoCaixa(ctx.tenant.id, projectId);
        if (!v) throw new Error("Este movimento não tem obra: escolha a obra da conta que será criada.");
        if (v.locked) throw new Error("Versão congelada.");
        return { id: v.id, projectId: v.projectId };
      })();
  if (!ver) throw new Error("Versão do movimento não encontrada.");
  const valor = Number(mov.valor);
  // Trava contra registros de valor ZERO: antes, um movimento de valor 0 caía
  // no ramo "else" (entrada) e gerava uma conta a receber "Recebido" de valor
  // zero — exatamente o tipo de receita fantasma relatado. Sem justificativa de
  // negócio, um lançamento de valor nulo não deve ser criado automaticamente.
  if (!Number.isFinite(valor) || valor === 0) {
    throw new Error(
      "Movimento de valor zero não gera conta a pagar/receber. Corrija o valor do movimento antes de convertê-lo.",
    );
  }
  const agora = new Date().toISOString();

  if (valor < 0) {
    // Saída → nova conta a pagar (despesa), já paga na data do movimento.
    const numDoc = await reserveDespesaNumber(ctx.tenant.id);
    const [desp] = await db
      .insert(schema.despesas)
      .values({
        versionId: ver.id,
        tenantId: ctx.tenant.id,
        numDoc,
        valor: String(Math.abs(valor)),
        status: "Pago",
        vencimento: mov.data,
        dataCaixa: mov.data,
        bancoId: mov.bankAccountId,
        obs: mov.descricao ?? "Convertido do extrato",
      })
      .returning();
    await db
      .update(schema.cashEntries)
      .set({ rec: true, conciliadoDespesaId: desp.id, conciliadoPor: ctx.userEmail || ctx.userId || null, conciliadoEm: agora })
      .where(eq(schema.cashEntries.id, mov.id));
    await logAudit({
      tenantId: ctx.tenant.id,
      userId: ctx.userId,
      action: "extrato.criarContaPagar",
      entity: "despesa",
      entityId: desp.id,
      meta: { cashEntryId: mov.id, valor: desp.valor },
    });
    revalidatePath("/despesas");
    revalidatePath("/contaspagar");
  } else {
    // Entrada → nova conta a receber, já recebida na data do movimento.
    const [cr] = await db
      .insert(schema.contasReceber)
      .values({
        tenantId: ctx.tenant.id,
        projectId: ver.projectId,
        descricao: mov.descricao ?? "Convertido do extrato",
        tipo: "Outros",
        valor: String(valor),
        vencimento: mov.data,
        dataRecebimento: mov.data,
        valorRecebido: String(valor),
        status: "Recebido",
        bancoId: mov.bankAccountId,
        origemCashEntryId: mov.id,
        createdBy: ctx.userEmail || ctx.userId || null,
      })
      .returning();
    await db
      .update(schema.cashEntries)
      .set({ rec: true, conciliadoContaReceberId: cr.id, conciliadoPor: ctx.userEmail || ctx.userId || null, conciliadoEm: agora })
      .where(eq(schema.cashEntries.id, mov.id));
    await logAudit({
      tenantId: ctx.tenant.id,
      userId: ctx.userId,
      action: "extrato.criarContaReceber",
      entity: "conta_receber",
      entityId: cr.id,
      meta: { cashEntryId: mov.id, valor: cr.valor },
    });
    revalidatePath("/contasreceber");
  }
  revalidatePath("/caixa");
}

// ───────── Triagem por linha do extrato (Adicionar / Parear / Ignorar) ─────────
// Cada linha lida do extrato (ainda NÃO importada) pode ser: pareada com uma
// conta a pagar/receber já lançada (conciliação automática), enviada para o
// cadastro de despesa/receita (Adicionar) ou ignorada. Aqui ficam as ações de
// (a) buscar candidatos de conciliação e (b) confirmar o pareamento.

/** Uma linha do extrato em conferência (movimentação bancária ainda não gravada). */
export interface MovimentoTriage {
  /** data "MM/DD/YYYY". */
  data?: string | null;
  descricao?: string | null;
  /** valor com sinal: negativo = saída/despesa, positivo = entrada/receita. */
  valor: number;
  /** nº do documento do extrato. */
  doc?: string | null;
}

export interface CandidatoMatch {
  id: string;
  tipo: "despesa" | "receita";
  /** fornecedor (despesa) ou cliente (receita). */
  nome: string;
  descricao: string;
  projectName: string | null;
  /** valor previsto a pagar/receber. */
  valor: number;
  vencimento: string | null;
  grau: "alta" | "media" | "baixa";
}

const normNome = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** "MM/DD/YYYY" → nº de dias (para proximidade de datas). null se inválido. */
function dayNum(d?: string | null): number | null {
  if (!d) return null;
  const p = d.split("/");
  if (p.length !== 3) return null;
  const [mm, dd, yy] = p.map((x) => Number(x));
  if (!mm || !dd || !yy) return null;
  return Math.floor(Date.UTC(yy, mm - 1, dd) / 86400000);
}

/**
 * Candidatos de conciliação para UMA linha do extrato (ainda não importada):
 * saída → contas a pagar em aberto; entrada → contas a receber em aberto.
 * Ranqueia dando preferência a valores IGUAIS e a fornecedor/cliente que aparece
 * na descrição; usa proximidade de data como desempate. Retorna os melhores.
 */
export async function matchCandidatosMovimento(
  mov: MovimentoTriage,
  /** termo de busca manual (opcional) — permite achar QUALQUER lançamento. */
  q?: string,
): Promise<{ tipo: "saida" | "entrada"; candidatos: CandidatoMatch[] }> {
  const tipo: "saida" | "entrada" = Number(mov.valor) < 0 ? "saida" : "entrada";
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "caixa", "editar")) return { tipo, candidatos: [] };

  const alvoCents = cents(Math.abs(Number(mov.valor) || 0));
  const tol = Math.max(50, Math.round(alvoCents * 0.02)); // 2% ou R$ 0,50
  const descNorm = normNome(mov.descricao ?? "");
  const movDay = dayNum(mov.data);
  const rankGrau = { alta: 0, media: 1, baixa: 2 } as const;
  const busca = (q ?? "").trim();

  /**
   * Avalia um lançamento em aberto como candidato.
   *
   * IMPORTANTE: nenhum candidato é DESCARTADO por diferença de valor. Antes, um
   * lançamento cujo valor diferisse mais de 2% era eliminado, e a tela auxiliar
   * aparecia vazia sempre que o extrato não batia ao centavo — que é o caso
   * comum (juros, desconto, tarifa, pagamento parcial). Agora a diferença apenas
   * REBAIXA o grau de compatibilidade, e o usuário decide.
   */
  function avaliar(
    id: string,
    kind: "despesa" | "receita",
    nome: string | null,
    descricao: string | null,
    projectName: string | null,
    valorPrev: number,
    restante: number,
    vencimento: string | null,
  ): (CandidatoMatch & { _prox: number; _score: number }) | null {
    // Busca manual: quando há termo, ele filtra (busca inteligente por
    // similaridade em nome, descrição, projeto e valor).
    if (
      busca &&
      !registroCasa(busca, [nome, descricao, projectName, vencimento], [valorPrev])
    ) {
      return null;
    }
    const candCents = cents(Math.abs(restante > 0 ? restante : valorPrev));
    const diff = Math.abs(candCents - alvoCents);
    const exato = diff === 0;
    const aprox = diff <= tol;
    const primeiro = normNome(nome ?? "").split(/\s+/)[0] ?? "";
    const nomeMatch = primeiro.length >= 3 && descNorm.includes(primeiro);
    const vd = dayNum(vencimento);
    const prox = movDay != null && vd != null ? Math.abs(movDay - vd) : 9999;
    const dataProx =
      (movDay != null && vd != null && (prox <= 15 || vd <= movDay)) || false;
    let grau: "alta" | "media" | "baixa";
    if (exato && (dataProx || nomeMatch)) grau = "alta";
    else if (exato || (aprox && (dataProx || nomeMatch))) grau = "media";
    else grau = "baixa";
    // Score de ordenação: menor = mais relevante. A diferença de valor pesa,
    // mas não elimina.
    const _score = diff / 100 + (nomeMatch ? -1000 : 0) + Math.min(prox, 365);
    return {
      id,
      tipo: kind,
      nome: nome ?? "—",
      descricao: descricao ?? "—",
      projectName,
      valor: valorPrev,
      vencimento,
      grau,
      _prox: prox,
      _score,
    };
  }

  const out: (CandidatoMatch & { _prox: number; _score: number })[] = [];
  if (tipo === "saida") {
    const contas = await getContasPagar(ctx.tenant.id);
    for (const c of contas) {
      if (c.status === "Pago" || c.status === "Cancelada") continue;
      const cand = avaliar(
        c.id,
        "despesa",
        c.fornecedorNome,
        c.descricao || c.numDoc,
        c.projectName,
        // §15 — o extrato traz o que ainda faltava pagar, não o valor original.
        pendenteDaConta(c),
        0,
        c.vencimento,
      );
      if (cand) out.push(cand);
    }
  } else {
    const contas = await getContasReceber(ctx.tenant.id);
    for (const c of contas) {
      // Domínio fixado na K-1: o cancelamento grava "Cancelada" (e getContasReceber já exclui canceladas).
      if (c.status === "Recebido" || c.status === "Cancelada") continue;
      const restante = Number(c.valor) - Number(c.valorRecebido || 0);
      const cand = avaliar(
        c.id,
        "receita",
        c.clienteNome,
        c.descricao || c.tipo,
        c.projectName,
        c.valor,
        restante,
        c.vencimento,
      );
      if (cand) out.push(cand);
    }
  }

  out.sort((a, b) => {
    const g = rankGrau[a.grau] - rankGrau[b.grau];
    if (g !== 0) return g;
    return a._score - b._score;
  });
  // Limite maior: como nada é descartado por valor, a lista precisa caber os
  // casos em que o usuário procura manualmente.
  const candidatos: CandidatoMatch[] = out.slice(0, 40).map((c) => ({
    id: c.id,
    tipo: c.tipo,
    nome: c.nome,
    descricao: c.descricao,
    projectName: c.projectName,
    valor: c.valor,
    vencimento: c.vencimento,
    grau: c.grau,
  }));
  return { tipo, candidatos };
}

export interface PairMovimentoInput {
  mov: MovimentoTriage;
  bankAccountId?: string | null;
  /** obra da tela (Prompt A) — o movimento novo vai para a versão de trabalho dela. */
  projectId: string;
  alvoId: string;
  alvoTipo: "despesa" | "receita";
}

/**
 * Confirma o pareamento de uma linha do extrato com uma conta a pagar/receber:
 * grava a movimentação bancária (cashEntry) e concilia automaticamente com o
 * alvo escolhido (marca a despesa como Paga ou soma o recebimento na conta a
 * receber). Reaproveita um cashEntry pendente de mesma assinatura, se houver.
 * RETORNA o erro (em vez de lançar) para a mensagem chegar à tela em produção.
 */
export async function pairMovimento(
  input: PairMovimentoInput,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "caixa", "editar")) {
    return { ok: false, error: "Sem permissão para conciliar." };
  }
  const destino = await destinoDoMovimentoNovo(ctx.tenant.id, input.projectId);
  if (!destino.ok) return destino;
  const { mov, alvoId, alvoTipo } = input;
  const valor = Number(mov.valor);
  if (!Number.isFinite(valor) || valor === 0) {
    return { ok: false, error: "Movimento sem valor válido." };
  }
  if (alvoTipo === "despesa" && valor >= 0) {
    return { ok: false, error: "Só é possível parear despesas com saídas do extrato." };
  }
  if (alvoTipo === "receita" && valor <= 0) {
    return { ok: false, error: "Só é possível parear receitas com entradas do extrato." };
  }

  const contas = await db
    .select({ id: schema.bankAccounts.id })
    .from(schema.bankAccounts)
    .where(eq(schema.bankAccounts.tenantId, ctx.tenant.id));
  const bankAccountId =
    input.bankAccountId && contas.some((c) => c.id === input.bankAccountId)
      ? input.bankAccountId
      : null;

  try {
    // Reaproveita um movimento já importado (mesma assinatura) se ainda estiver
    // pendente; senão insere um novo cashEntry para a movimentação bancária.
    const sig = importSignature(bankAccountId, mov.data, valor, mov.doc);
    const existentes = await db
      .select()
      .from(schema.cashEntries)
      .where(
        and(
          eq(schema.cashEntries.tenantId, ctx.tenant.id),
          eq(schema.cashEntries.importHash, sig),
        ),
      );
    if (
      existentes.some(
        (e) => e.rec || e.conciliadoDespesaId || e.conciliadoContaReceberId,
      )
    ) {
      return { ok: false, error: "Este movimento já foi conciliado antes." };
    }
    const pend = existentes[0];
    let cashId: string;
    if (pend) {
      cashId = pend.id;
    } else {
      const [row] = await db
        .insert(schema.cashEntries)
        .values({
          versionId: destino.versionId,
          tenantId: ctx.tenant.id,
          bankAccountId,
          data: mov.data || null,
          descricao: mov.descricao || null,
          valor: String(valor),
          cat: alvoTipo === "despesa" ? "despesa" : "receita",
          doc: mov.doc || null,
          importHash: sig,
          rec: false,
        })
        .returning();
      cashId = row.id;
    }
    if (alvoTipo === "despesa") {
      await conciliarDespesa({ cashEntryId: cashId, despesaId: alvoId });
    } else {
      await conciliarContaReceber({ cashEntryId: cashId, contaReceberId: alvoId });
    }
    // AK Parte 1 — o par em si (a conciliação do alvo já tem log próprio).
    await logAudit({
      tenantId: ctx.tenant.id,
      userId: ctx.userId,
      action: "extrato.pair",
      entity: "cash_entry",
      entityId: cashId,
      meta: {
        movimento: { data: mov.data, descricao: mov.descricao, valor, doc: mov.doc ?? null },
        alvo: { tipo: alvoTipo, id: alvoId },
        movimentoReaproveitado: !!pend,
      },
    });
    return { ok: true };
  } catch (e) {
    console.error("[extrato] falha ao parear movimento:", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Falha ao conciliar o movimento.",
    };
  }
}

/**
 * "Adicionar" a partir do extrato: cria uma NOVA despesa (saída) ou conta a
 * receber (entrada) com os dados identificados no extrato e JÁ A DEIXA
 * CONCILIADA — paga (despesa) ou recebida (conta a receber).
 *
 * A conciliação é automática porque o lançamento nasce de um movimento que já
 * ocorreu no banco: se está no extrato, o dinheiro já entrou/saiu. Também grava
 * a movimentação de caixa e a vincula ao registro criado, para auditoria.
 *
 * Diferença para `criarContaFromExtrato`: aquela converte um movimento JÁ
 * IMPORTADO; esta recebe a linha do extrato ainda em conferência, junto dos
 * dados que o usuário revisou/completou na tela de cadastro.
 */
export async function criarLancamentoDoExtrato(input: {
  mov: MovimentoTriage;
  bankAccountId?: string | null;
  /** obra do lançamento criado (despesa ou conta a receber). */
  projectId: string;
  /** obra da tela (Prompt A) — o movimento de caixa vai para a versão de trabalho dela. */
  caixaProjectId: string;
  /** despesa (saída) */
  fornecedorId?: string | null;
  contaCef?: string | null;
  categoriaDre?: string | null;
  competencia?: string | null;
  obs?: string | null;
  /** conta a receber (entrada) */
  clienteId?: string | null;
  tipoReceita?: string | null;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "caixa", "editar")) {
    return { ok: false, error: "Sem permissão." };
  }
  const destino = await destinoDoMovimentoNovo(ctx.tenant.id, input.caixaProjectId);
  if (!destino.ok) return destino;
  // A obra do lançamento criado também precisa ser desta empresa (Prompt A,
  // 38). A despesa já passava por `getAtualVersion` (filtra o tenant); a conta
  // a receber gravava o `projectId` recebido sem conferir.
  if (!(await getProjectContext(ctx.tenant.id, input.projectId))) {
    return { ok: false, error: "Selecione o projeto." };
  }

  const valor = Number(input.mov.valor);
  if (!Number.isFinite(valor) || valor === 0) {
    return { ok: false, error: "Movimento sem valor válido." };
  }
  // Prompt S, 3-C — SAÍDA vira despesa, e despesa precisa de categoria de
  // natureza devedora (vazia a DRE descartaria em silêncio): mesma função e
  // mensagem dos outros caminhos. Entrada (conta a receber) não passa por aqui.
  if (valor < 0) {
    const erroCategoria = validarCategoriaDespesa(input.categoriaDre);
    if (erroCategoria) return { ok: false, error: erroCategoria };
  }
  const contas = await db
    .select({ id: schema.bankAccounts.id })
    .from(schema.bankAccounts)
    .where(eq(schema.bankAccounts.tenantId, ctx.tenant.id));
  const bankAccountId =
    input.bankAccountId && contas.some((c) => c.id === input.bankAccountId)
      ? input.bankAccountId
      : null;

  try {
    // Movimentação bancária correspondente (reaproveita se já existir pendente).
    const sig = importSignature(bankAccountId, input.mov.data, valor, input.mov.doc);
    const existentes = await db
      .select()
      .from(schema.cashEntries)
      .where(
        and(
          eq(schema.cashEntries.tenantId, ctx.tenant.id),
          eq(schema.cashEntries.importHash, sig),
        ),
      );
    if (
      existentes.some((e) => e.rec || e.conciliadoDespesaId || e.conciliadoContaReceberId)
    ) {
      return { ok: false, error: "Este movimento já foi conciliado antes." };
    }
    const agora = new Date().toISOString();
    const pend = existentes[0];
    let cashId: string;
    if (pend) {
      cashId = pend.id;
    } else {
      const [row] = await db
        .insert(schema.cashEntries)
        .values({
          versionId: destino.versionId,
          tenantId: ctx.tenant.id,
          bankAccountId,
          data: input.mov.data || null,
          descricao: input.mov.descricao || null,
          valor: String(valor),
          cat: valor < 0 ? "despesa" : "receita",
          doc: input.mov.doc || null,
          importHash: sig,
          rec: false,
        })
        .returning();
      cashId = row.id;
    }

    if (valor < 0) {
      // ── SAÍDA → nova despesa, já PAGA na data do movimento ────────────────
      const versao = await getAtualVersion(ctx.tenant.id, input.projectId);
      if (!versao) return { ok: false, error: "Versão atual do projeto não encontrada." };
      // Prompt DP — com a chave ligada, a categoria é a da conta.
      const pelaConta = await categoriaParaGravar(ctx.tenant.id, input.contaCef, input.categoriaDre);
      if (!pelaConta.ok) return { ok: false, error: pelaConta.error };
      const numDoc = input.mov.doc?.trim()
        ? input.mov.doc.trim()
        : await reserveDespesaNumber(ctx.tenant.id);
      const [desp] = await db
        .insert(schema.despesas)
        .values({
          versionId: versao.id,
          tenantId: ctx.tenant.id,
          numDoc,
          fornecedorId: input.fornecedorId || null,
          contaCef: input.contaCef || null,
          categoriaDre: pelaConta.categoria as CategoriaDRE,
          competencia: input.competencia || monthKeyFrom(input.mov.data),
          vencimento: input.mov.data || null,
          valor: String(Math.abs(valor)),
          // Identificada no extrato ⇒ já paga.
          status: "Pago",
          dataCaixa: input.mov.data || null,
          bancoId: bankAccountId,
          obs: input.obs || input.mov.descricao || null,
        })
        .returning();
      await db
        .update(schema.cashEntries)
        .set({
          rec: true,
          conciliadoDespesaId: desp.id,
          conciliadoPor: ctx.userEmail || ctx.userId || null,
          conciliadoEm: agora,
        })
        .where(eq(schema.cashEntries.id, cashId));
      await logAudit({
        tenantId: ctx.tenant.id,
        userId: ctx.userId,
        action: "extrato.criarDespesaConciliada",
        entity: "despesa",
        entityId: desp.id,
        meta: { cashEntryId: cashId, valor: desp.valor, numDoc },
      });
      revalidatePath("/despesas");
      revalidatePath("/contaspagar");
      revalidatePath("/caixa");
      return { ok: true, id: desp.id };
    }

    // ── ENTRADA → nova conta a receber, já RECEBIDA na data do movimento ────
    const [cr] = await db
      .insert(schema.contasReceber)
      .values({
        tenantId: ctx.tenant.id,
        projectId: input.projectId,
        clienteId: input.clienteId || null,
        descricao: input.obs || input.mov.descricao || "Identificado no extrato",
        tipo: input.tipoReceita || "Outros",
        valor: String(valor),
        vencimento: input.mov.data || null,
        // Identificada no extrato ⇒ já recebida.
        dataRecebimento: input.mov.data || null,
        valorRecebido: String(valor),
        status: "Recebido",
        bancoId: bankAccountId,
        origemCashEntryId: cashId,
        createdBy: ctx.userEmail || ctx.userId || null,
      })
      .returning();
    await db
      .update(schema.cashEntries)
      .set({
        rec: true,
        conciliadoContaReceberId: cr.id,
        conciliadoPor: ctx.userEmail || ctx.userId || null,
        conciliadoEm: agora,
      })
      .where(eq(schema.cashEntries.id, cashId));
    await logAudit({
      tenantId: ctx.tenant.id,
      userId: ctx.userId,
      action: "extrato.criarContaReceberConciliada",
      entity: "conta_receber",
      entityId: cr.id,
      meta: { cashEntryId: cashId, valor: cr.valor },
    });
    revalidatePath("/contasreceber");
    revalidatePath("/caixa");
    return { ok: true, id: cr.id };
  } catch (e) {
    console.error("[extrato] falha ao criar lançamento conciliado:", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Falha ao criar o lançamento.",
    };
  }
}

/**
 * Prompt AT §5.2 — conciliar a entrada do extrato com a parcela do comprador
 * (chave estável "origem#número"). Grava o recebimento; parcial é permitido.
 * Não cria conta a receber e não mexe na receita da DRE (AT-T8).
 */
export async function conciliarParcelaDeVenda(input: { cashEntryId: string; unitId: string; chave: string; valor?: number | null }): Promise<{ ok: true; concluida: boolean; valor: number } | { ok: false; error: string }> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "caixa", "editar")) return { ok: false, error: "Conciliar exige a permissão Caixa/editar." };
  const { gravarRecebimentoDeParcela } = await import("@/lib/recebimento-parcela");
  const r = await gravarRecebimentoDeParcela({ tenantId: ctx.tenant.id, userId: ctx.userId, userEmail: ctx.userEmail }, input);
  if (!r.ok) return r;
  revalidatePath("/caixa");
  revalidatePath("/contasreceber");
  return { ok: true, concluida: r.concluida, valor: r.valor };
}

/** Prompt AT §5 — estorno lógico do recebimento de uma parcela, com motivo. */
export async function estornarRecebimentoDeParcela(id: string, motivo: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "conciliacao", "excluir")) return { ok: false, error: "Estornar exige a permissão \"Conciliação — ajustar e desfazer: excluir\"." };
  const rp = await import("@/lib/recebimento-parcela");
  const r = await rp.estornarRecebimentoDeParcela({ tenantId: ctx.tenant.id, userId: ctx.userId, userEmail: ctx.userEmail }, id, motivo);
  if (r.ok) {
    revalidatePath("/caixa");
    revalidatePath("/contasreceber");
  }
  return r;
}


/**
 * Prompt AT §8.3.4 — "Confirmar N conciliações": o lote que a Cris propôs. O
 * servidor valida de novo cada item contra os candidatos que ele mesmo
 * calcula (AT-T16) e grava um a um, cada vínculo atômico e auditado; uma
 * falha não desfaz as outras e o resultado diz qual falhou (AT-T17).
 */
export async function confirmarConciliacoes(itens: { movimento: string; ref: string; valor?: number | null }[]): Promise<{ ok: true; gravadas: number; resultados: { movimento: string; ref: string; ok: boolean; erro?: string }[] } | { ok: false; error: string }> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "caixa", "editar")) return { ok: false, error: "Conciliar exige a permissão Caixa/editar." };
  if (!Array.isArray(itens) || itens.length === 0) return { ok: false, error: "Nada a confirmar." };
  const { MAX_RODADA } = await import("@/lib/conciliacao-cris");
  const { aplicarLote } = await import("@/lib/conciliacao-cris-gravar");
  if (itens.length > MAX_RODADA) return { ok: false, error: `Até ${MAX_RODADA} conciliações por vez.` };
  const r = await aplicarLote({ tenantId: ctx.tenant.id, userId: ctx.userId, userEmail: ctx.userEmail }, itens.map((i) => ({ movimento: String(i.movimento), ref: String(i.ref), valor: typeof i.valor === "number" ? i.valor : null })));
  revalidatePath("/caixa");
  revalidatePath("/contasreceber");
  revalidatePath("/despesas");
  return { ok: true, gravadas: r.ok, resultados: r.resultados };
}
