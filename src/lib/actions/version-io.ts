"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext, getVersionContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { parseWorkbook } from "@/lib/xlsx/growth-template";
import type { CategoriaDRE } from "@/lib/calc/constants";
import { recusaDaImportacao, type Contagem } from "@/lib/versao-importacao";
import { planilhaDaEmpresa } from "@/lib/planocontas-servidor";
import { categoriaParaGravar } from "@/lib/categoria-do-plano-servidor";

export interface ImportResult {
  units: number;
  reembolsos: number;
  permutas: number;
  despesas: number;
  incc: number;
}

export type ResultadoImportacao = { ok: true; result: ImportResult } | { ok: false; error: string };

/**
 * Importa uma planilha (formato Growth Tools) para a versão indicada.
 *
 * BI-3 (Prompt I) e a decisão de 30/09/2026: lançamentos — unidades,
 * liberações, permutas e despesas — só entram na versão Atual, e só numa
 * categoria VAZIA. A importação nunca apaga registro: antes ela apagava a
 * categoria inteira e regravava, e apagar despesa levava junto parcelas,
 * pagamentos e terceiros. O INCC é do projeto e continua atualizado por mês.
 */
export async function importVersionData(formData: FormData): Promise<ResultadoImportacao> {
  const ctx = await getTenantContext();
  // Prompt AP, BAP-3: a importação mora na tela Projetos (`projeto:editar`).
  if (!ctx || !can(ctx.perms, "projeto", "editar")) {
    return { ok: false, error: "Sem permissão para importar dados." };
  }

  // Versão-alvo: a indicada no form, obrigatória e validada no tenant (Prompt
  // A). A obra — e o INCC atualizado — é a DA VERSÃO, não a do cookie.
  const alvo = await getVersionContext(ctx.tenant.id, formData.get("versionId"));
  if (!alvo) return { ok: false, error: "Versão inválida." };
  const target = alvo.version;
  if (target.locked) {
    return { ok: false, error: "Versão congelada — descongele para importar." };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Selecione uma planilha." };

  let parsed: ReturnType<typeof parseWorkbook>;
  try {
    // 0079 — as contas da matriz de despesas são as do plano DESTA empresa.
    parsed = parseWorkbook(await file.arrayBuffer(), await planilhaDaEmpresa(ctx.tenant.id));
  } catch {
    return { ok: false, error: "Não foi possível ler a planilha. Use o modelo da própria tela." };
  }
  // Linha com valor e sem conta do plano: antes era descartada em silêncio.
  if (parsed.despesasSemConta.length) {
    const lista = parsed.despesasSemConta
      .slice(0, 5)
      .map((d) => `"${d.subitem || d.codigo || "(sem nome)"}"${d.codigo ? ` (código ${d.codigo})` : ""}`)
      .join(", ");
    const mais = parsed.despesasSemConta.length > 5 ? ` e mais ${parsed.despesasSemConta.length - 5}` : "";
    return {
      ok: false,
      error: `A aba de despesas tem valores em linhas que não são contas ativas do Plano de Contas da empresa: ${lista}${mais}. Corrija a linha (ou baixe o modelo de novo) e importe outra vez — nada foi gravado.`,
    };
  }
  // Growth Ambiental: unidades, liberações e permutas saíram. Planilha antiga
  // com essas abas preenchidas é recusada (nada é gravado), para não recriar
  // dados de módulos que não existem mais.
  const deIncorporacao = [
    parsed.units.length ? `${parsed.units.length} unidade(s)` : "",
    parsed.reembolsos.length ? `${parsed.reembolsos.length} liberação(ões)` : "",
    parsed.permutas.length ? `${parsed.permutas.length} permuta(s)` : "",
  ].filter(Boolean);
  if (deIncorporacao.length) {
    return {
      ok: false,
      error: `A planilha tem dados de incorporação (${deIncorporacao.join(", ")}) nas abas Dados_de_Venda, Reembolso ou Permuta. Esses módulos saíram do Growth Ambiental: apague essas abas (ou baixe o modelo novo) e importe só as despesas — nada foi gravado.`,
    };
  }
  // Categoria da DRE de cada conta: herdada do plano com a chave
  // `despesa_categoria_do_plano` ligada; desligada, segue a regra anterior.
  const categoriaPorConta = new Map<string, string>();
  for (const code of new Set(parsed.despesas.map((d) => d.contaCef))) {
    const r = await categoriaParaGravar(ctx.tenant.id, code, "Custo Variável");
    if (!r.ok) return { ok: false, error: r.error };
    categoriaPorConta.set(code, r.categoria ?? "Custo Variável");
  }
  const vId = target.id;
  const tId = ctx.tenant.id;
  const result: ImportResult = { units: 0, reembolsos: 0, permutas: 0, despesas: 0, incc: 0 };

  const naPlanilha: Contagem = {
    units: parsed.units.length,
    despesas: parsed.despesas.length,
    permutas: parsed.permutas.length,
    reembolsos: parsed.reembolsos.length,
  };
  const recusa = await db.transaction(async (tx) => {
    // Trava a versão: duas importações simultâneas não passam as duas pela
    // checagem de "categoria vazia".
    await tx.execute(sql`select 1 from ${schema.versions} where ${schema.versions.id} = ${vId} for update`);
    const conta = async (t: typeof schema.units | typeof schema.despesas | typeof schema.permutas | typeof schema.reembolsos) =>
      (await tx.select({ n: sql<number>`count(*)::int` }).from(t).where(eq(t.versionId, vId)))[0].n;
    const jaNaVersao: Contagem = {
      units: naPlanilha.units ? await conta(schema.units) : 0,
      despesas: naPlanilha.despesas ? await conta(schema.despesas) : 0,
      permutas: naPlanilha.permutas ? await conta(schema.permutas) : 0,
      reembolsos: naPlanilha.reembolsos ? await conta(schema.reembolsos) : 0,
    };
    const motivo = recusaDaImportacao(target.kind, naPlanilha, jaNaVersao);
    if (motivo) return motivo;

    if (parsed.units.length) {
      await tx.insert(schema.units).values(
        parsed.units.map((u) => ({
          versionId: vId, tenantId: tId, code: u.code, bloco: u.bloco || null,
          tipo: u.tipo || null, m2: u.m2 != null ? String(u.m2) : null,
          andar: u.andar, valor: String(u.valor), status: u.status,
          mesVenda: u.mesVenda || null, paymentPlan: u.plan,
        })),
      );
      result.units = parsed.units.length;
    }

    if (parsed.reembolsos.length) {
      await tx.insert(schema.reembolsos).values(
        parsed.reembolsos.map((r) => ({
          versionId: vId, tenantId: tId, data: r.data || null, origem: r.origem || null,
          valor: String(r.valor), pct: r.pct || null, obs: r.obs || null,
          serial: r.serial, status: "received",
        })),
      );
      result.reembolsos = parsed.reembolsos.length;
    }

    if (parsed.permutas.length) {
      await tx.insert(schema.permutas).values(
        parsed.permutas.map((p) => ({
          versionId: vId, tenantId: tId, unitCode: p.unitCode || null, cliente: p.cliente || null,
          dataRecebimento: p.dataRecebimento || null, tipo: p.tipo || null, descricao: p.descricao || null,
          estimado: String(p.estimado), status: p.status || null, dataVenda: p.dataVenda || null,
          valorVenda: String(p.valorVenda), tipoPermuta: p.tipoPermuta || null, obs: p.obs || null,
        })),
      );
      result.permutas = parsed.permutas.length;
    }

    if (parsed.despesas.length) {
      await tx.insert(schema.despesas).values(
        parsed.despesas.map((d) => ({
          versionId: vId, tenantId: tId, contaCef: d.contaCef,
          categoriaDre: (categoriaPorConta.get(d.contaCef) ?? "Custo Variável") as CategoriaDRE,
          competencia: d.competencia, vencimento: d.vencimento, valor: String(d.valor), status: "A pagar",
        })),
      );
      result.despesas = parsed.despesas.length;
    }

    // INCC (por projeto): atualiza mês a mês.
    for (const r of parsed.incc) {
      await tx
        .update(schema.inccRates)
        .set({ monthly: String(r.monthly), accumulated: String(r.accumulated) })
        .where(and(eq(schema.inccRates.projectId, alvo.project.id), eq(schema.inccRates.mes, r.mes)));
    }
    result.incc = parsed.incc.length;
    return null;
  });
  if (recusa) return { ok: false, error: recusa };

  await logAudit({
    tenantId: tId, userId: ctx.userId, action: "version.import",
    entity: "version", entityId: vId, meta: result,
  });
  revalidatePath("/", "layout");
  return { ok: true, result };
}
