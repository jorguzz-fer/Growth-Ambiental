"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { recusaDeCategoriaDaConta } from "@/lib/categoria-do-plano";
import { usado, usoDosCodigos } from "@/lib/planocontas-servidor";
import { MAX_CONTAS_PROPOSTAS, recusaDaContaProposta } from "@/lib/planocontas-cris";
import type { CategoriaDRE } from "@/lib/calc/constants";

type Kind = "cef" | "complementar";
type Natureza = "receita" | "despesa";

function normKind(v: unknown): Kind {
  return v === "complementar" ? "complementar" : "cef";
}
function normNatureza(v: unknown): Natureza {
  return v === "receita" ? "receita" : "despesa";
}

/** Categoria da DRE escolhida na criação: vazia = padrão; inválida para a natureza = erro. */
function categoriaNaCriacao(natureza: Natureza, categoria: string | null | undefined): CategoriaDRE | null {
  const c = (categoria ?? "").trim();
  if (!c) return null;
  const recusa = recusaDeCategoriaDaConta(natureza, c);
  if (recusa) throw new Error(recusa);
  return c as CategoriaDRE;
}

async function codeExists(tenantId: string, code: string): Promise<boolean> {
  // 0079 — código único entre contas E grupos (o Orçamento usa o código do grupo como chave).
  const [g] = await db.select({ id: schema.chartGroups.id }).from(schema.chartGroups).where(and(eq(schema.chartGroups.tenantId, tenantId), eq(schema.chartGroups.code, code))).limit(1);
  if (g) return true;
  const [row] = await db
    .select({ id: schema.chartAccounts.id })
    .from(schema.chartAccounts)
    .where(
      and(
        eq(schema.chartAccounts.tenantId, tenantId),
        eq(schema.chartAccounts.code, code),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/** Cria um novo grupo do plano de contas com o seu primeiro subitem. */
export async function addChartGroup(input: {
  kind: string;
  groupCode: string;
  groupName: string;
  code: string;
  name: string;
  natureza?: string;
  /** categoria da DRE do 1º subitem; vazia = padrão. */
  dreCategory?: string | null;
}) {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "planocontas", "criar")) {
    throw new Error("Sem permissão para criar grupos.");
  }
  const kind = normKind(input.kind);
  const natureza = normNatureza(input.natureza);
  const groupCode = input.groupCode.trim();
  const groupName = input.groupName.trim();
  const code = input.code.trim();
  const name = input.name.trim();
  if (!groupCode || !groupName || !code || !name) {
    throw new Error("Informe o grupo e o primeiro subitem.");
  }
  const dreCategory = categoriaNaCriacao(natureza, input.dreCategory);
  if (await codeExists(ctx.tenant.id, code)) {
    throw new Error(`O código "${code}" já existe.`);
  }
  if (await codeExists(ctx.tenant.id, groupCode)) {
    throw new Error(`O código "${groupCode}" já existe.`);
  }
  await db.insert(schema.chartGroups).values({ tenantId: ctx.tenant.id, code: groupCode, name: groupName, kind }).onConflictDoNothing();
  await db.insert(schema.chartAccounts).values({
    tenantId: ctx.tenant.id,
    code,
    name,
    groupCode,
    groupName,
    kind,
    natureza,
    dreCategory,
  });
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "chart.group.create",
    entity: "chart_account",
    meta: { groupCode, groupName, kind, natureza, code, dreCategory },
  });
  revalidatePath("/planocontas");
}

/** Adiciona um subitem a um grupo existente. */
export async function addChartItem(input: {
  kind: string;
  groupCode: string;
  groupName: string;
  code: string;
  name: string;
  natureza?: string;
  /** categoria da DRE; vazia = padrão. */
  dreCategory?: string | null;
  descricao?: string | null;
}) {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "planocontas", "criar")) {
    throw new Error("Sem permissão para criar subitens.");
  }
  const kind = normKind(input.kind);
  const natureza = normNatureza(input.natureza);
  const code = input.code.trim();
  const name = input.name.trim();
  if (!code || !name) throw new Error("Informe o código e o nome do subitem.");
  const dreCategory = categoriaNaCriacao(natureza, input.dreCategory);
  if (await codeExists(ctx.tenant.id, code)) {
    throw new Error(`O código "${code}" já existe.`);
  }
  await db.insert(schema.chartAccounts).values({
    tenantId: ctx.tenant.id,
    code,
    name,
    groupCode: input.groupCode.trim(),
    groupName: input.groupName.trim(),
    kind,
    natureza,
    dreCategory,
    descricao: (input.descricao ?? "").trim().slice(0, 500) || null,
  });
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "chart.item.create",
    entity: "chart_account",
    meta: { code, name, dreCategory },
  });
  revalidatePath("/planocontas");
}

/** Edita o código/nome de um subitem. */
export async function updateChartItem(
  id: string,
  patch: { code?: string; name?: string; natureza?: string; dreCategory?: string | null; descricao?: string | null; groupCode?: string; confirmar?: boolean },
): Promise<{ ok: true } | { ok: false; error: string; precisaConfirmar?: boolean } | void> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "planocontas", "editar")) return;
  const [current] = await db
    .select()
    .from(schema.chartAccounts)
    .where(
      and(
        eq(schema.chartAccounts.id, id),
        eq(schema.chartAccounts.tenantId, ctx.tenant.id),
      ),
    )
    .limit(1);
  if (!current) return;
  const set: { code?: string; name?: string; natureza?: Natureza; dreCategory?: CategoriaDRE | null; descricao?: string | null; groupCode?: string; groupName?: string; kind?: Kind } = {};
  if (patch.descricao !== undefined) {
    const d = (patch.descricao ?? "").trim().slice(0, 500) || null;
    if (d !== (current.descricao ?? null)) set.descricao = d;
  }
  // Mover a conta para outro grupo/subgrupo do plano (a conta leva código, histórico e categoria).
  if (patch.groupCode && patch.groupCode.trim() !== current.groupCode) {
    const [destino] = await db
      .select()
      .from(schema.chartGroups)
      .where(and(eq(schema.chartGroups.tenantId, ctx.tenant.id), eq(schema.chartGroups.code, patch.groupCode.trim())))
      .limit(1);
    if (!destino) throw new Error(`O grupo "${patch.groupCode.trim()}" não existe no plano.`);
    if (!destino.ativo) throw new Error(`O grupo ${destino.code} está inativo.`);
    set.groupCode = destino.code;
    set.groupName = destino.name;
    set.kind = destino.kind === "cef" ? "cef" : "complementar";
  }
  if (patch.code && patch.code.trim() && patch.code.trim() !== current.code) {
    if (await codeExists(ctx.tenant.id, patch.code.trim())) {
      throw new Error(`O código "${patch.code.trim()}" já existe.`);
    }
    // 0079 — o código é a referência dos lançamentos e do Orçamento: código usado não muda.
    if (usado((await usoDosCodigos(ctx.tenant.id, [current.code])).get(current.code)))
      throw new Error(`A conta ${current.code} já tem lançamentos ou Orçamento: o código não muda. Renomeie só o nome.`);
    set.code = patch.code.trim();
  }
  if (patch.name && patch.name.trim()) set.name = patch.name.trim();
  if (patch.natureza !== undefined) set.natureza = normNatureza(patch.natureza);
  // Prompt DP — a categoria da DRE da conta: "" ou null volta ao padrão. A
  // escolha precisa servir à natureza (despesa não é "Receita"); se a natureza
  // mudou e a escolha gravada não serve mais, volta ao padrão.
  const naturezaFinal = set.natureza ?? current.natureza;
  if (patch.dreCategory !== undefined) {
    const escolha = patch.dreCategory || null;
    if (escolha) {
      const recusa = recusaDeCategoriaDaConta(naturezaFinal, escolha);
      if (recusa) throw new Error(recusa);
    }
    if ((escolha ?? null) !== (current.dreCategory ?? null)) set.dreCategory = escolha as CategoriaDRE | null;
  } else if (set.natureza && current.dreCategory && recusaDeCategoriaDaConta(naturezaFinal, current.dreCategory)) {
    set.dreCategory = null;
  }
  if (Object.keys(set).length === 0) return;
  // Conta já usada que muda de natureza ou categoria muda a DRE dos lançamentos
  // dela: a tela mostra o impacto e só grava com a confirmação.
  if ((set.natureza !== undefined && set.natureza !== current.natureza) || set.dreCategory !== undefined || set.groupCode !== undefined) {
    const u = (await usoDosCodigos(ctx.tenant.id, [current.code])).get(current.code);
    if (usado(u) && !patch.confirmar) {
      const partes = [
        u!.despesas ? `${u!.despesas} despesa(s)` : null,
        u!.orcamento ? `${u!.orcamento} linha(s) de Orçamento/Previsão` : null,
        u!.versoesCongeladas ? `${u!.versoesCongeladas} versão(ões) congelada(s)` : null,
      ].filter(Boolean);
      return {
        ok: false,
        precisaConfirmar: true,
        error: `A conta ${current.code} já é usada (${partes.join(", ") || "lançamentos"}). ${set.groupCode !== undefined ? `Mover para o grupo ${set.groupCode} muda em qual linha do Orçamento/Previsão o realizado dela aparece` : "Mudar a categoria muda a DRE desses lançamentos"}. Confirmar?`,
      };
    }
  }
  await db
    .update(schema.chartAccounts)
    .set(set)
    .where(eq(schema.chartAccounts.id, id));
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "chart.item.update",
    entity: "chart_account",
    entityId: id,
    meta: set,
  });
  revalidatePath("/planocontas");
  return { ok: true };
}

/** Ativa/inativa um subitem (exclusão lógica: some de novos lançamentos, fica no histórico). */
export async function setChartAccountAtivo(id: string, ativo: boolean) {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "planocontas", "editar")) return;
  await db
    .update(schema.chartAccounts)
    .set({ ativo })
    .where(
      and(
        eq(schema.chartAccounts.id, id),
        eq(schema.chartAccounts.tenantId, ctx.tenant.id),
      ),
    );
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: ativo ? "chart.item.activate" : "chart.item.deactivate",
    entity: "chart_account",
    entityId: id,
  });
  revalidatePath("/planocontas");
}

type Resultado = { ok: true } | { ok: false; error: string };

/**
 * Quantas linhas de Orçamento/Previsão apontam para estes códigos (§12).
 * `budget_account.row_key` e `budget_line.row_key` são texto, sem chave
 * estrangeira: apagar a conta deixaria os valores órfãos ("legado").
 */
async function referenciasNoPlanejamento(tenantId: string, codigos: string[]): Promise<number> {
  if (codigos.length === 0) return 0;
  const [[a], [l]] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.budgetAccounts)
      .where(and(eq(schema.budgetAccounts.tenantId, tenantId), inArray(schema.budgetAccounts.rowKey, codigos))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.budgetLines)
      .where(and(eq(schema.budgetLines.tenantId, tenantId), inArray(schema.budgetLines.rowKey, codigos))),
  ]);
  return (a?.n ?? 0) + (l?.n ?? 0);
}

/**
 * Exclui um subitem (§12): só se nenhum Orçamento ou Previsão usa o código.
 * Com uso, o caminho é "Inativar" — a conta some de novos lançamentos e os
 * valores já gravados continuam ligados a ela.
 */
export async function deleteChartItem(id: string): Promise<Resultado> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "planocontas", "excluir")) {
    return { ok: false, error: "Sem permissão para excluir contas." };
  }
  const [item] = await db
    .select()
    .from(schema.chartAccounts)
    .where(and(eq(schema.chartAccounts.id, id), eq(schema.chartAccounts.tenantId, ctx.tenant.id)))
    .limit(1);
  if (!item) return { ok: false, error: "Conta não encontrada." };
  const refs = await referenciasNoPlanejamento(ctx.tenant.id, [item.code]);
  if (refs > 0) {
    return {
      ok: false,
      error: `A conta ${item.code} tem ${refs} lançamento(s) de Orçamento/Previsão. Use "Inativar": ela some de novos lançamentos e os valores ficam.`,
    };
  }
  // 0079 — despesa lançada (mesmo cancelada) também aponta o código.
  const uso = (await usoDosCodigos(ctx.tenant.id, [item.code])).get(item.code)!;
  if (uso.despesas > 0 || item.papel) {
    return { ok: false, error: item.papel ? `A conta ${item.code} é usada por regra do sistema (${item.papel}). Inative-a.` : `A conta ${item.code} tem ${uso.despesas} lançamento(s) de despesa. Use "Inativar".` };
  }
  await db
    .delete(schema.chartAccounts)
    .where(
      and(
        eq(schema.chartAccounts.id, id),
        eq(schema.chartAccounts.tenantId, ctx.tenant.id),
      ),
    );
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "chart.item.delete",
    entity: "chart_account",
    entityId: id,
    meta: { kind: item.kind, code: item.code, name: item.name, groupCode: item.groupCode },
  });
  revalidatePath("/planocontas");
  return { ok: true };
}

/** Renomeia (nome e/ou código) um grupo inteiro — aplica a todos os subitens. */
export async function renameChartGroup(input: {
  kind: string;
  groupCode: string;
  groupName?: string;
  newGroupCode?: string;
}) {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "planocontas", "editar")) return;
  const kind = normKind(input.kind);
  const set: { groupName?: string; groupCode?: string } = {};
  if (input.groupName && input.groupName.trim()) set.groupName = input.groupName.trim();
  if (input.newGroupCode && input.newGroupCode.trim()) set.groupCode = input.newGroupCode.trim();
  if (Object.keys(set).length === 0) return;
  if (set.groupCode && set.groupCode !== input.groupCode) {
    // 0079 — o código do grupo é a chave do Orçamento e da Medição: com uso, não muda.
    const uso = (await usoDosCodigos(ctx.tenant.id, [input.groupCode])).get(input.groupCode)!;
    if (uso.orcamento + uso.medicoes > 0) throw new Error(`O grupo ${input.groupCode} tem Orçamento ou Medição: o código não muda. Renomeie só o nome.`);
    if (await codeExists(ctx.tenant.id, set.groupCode)) throw new Error(`O código "${set.groupCode}" já existe.`);
  }
  await db
    .update(schema.chartAccounts)
    .set(set)
    .where(
      and(
        eq(schema.chartAccounts.tenantId, ctx.tenant.id),
        eq(schema.chartAccounts.kind, kind),
        eq(schema.chartAccounts.groupCode, input.groupCode),
      ),
    );
  await db
    .update(schema.chartGroups)
    .set({ ...(set.groupName ? { name: set.groupName } : {}), ...(set.groupCode ? { code: set.groupCode } : {}), updatedAt: new Date() })
    .where(and(eq(schema.chartGroups.tenantId, ctx.tenant.id), eq(schema.chartGroups.code, input.groupCode)));
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "chart.group.update",
    entity: "chart_account",
    meta: { kind, groupCode: input.groupCode, ...set },
  });
  revalidatePath("/planocontas");
}

/**
 * Exclui um grupo inteiro (§12): só se nenhum Orçamento ou Previsão usa o
 * grupo ou alguma conta dele. Com uso, inativa-se conta a conta.
 */
export async function deleteChartGroup(input: { kind: string; groupCode: string }): Promise<Resultado> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "planocontas", "excluir")) {
    return { ok: false, error: "Sem permissão para excluir grupos." };
  }
  const kind = normKind(input.kind);
  const contas = await db
    .select({ code: schema.chartAccounts.code })
    .from(schema.chartAccounts)
    .where(
      and(
        eq(schema.chartAccounts.tenantId, ctx.tenant.id),
        eq(schema.chartAccounts.kind, kind),
        eq(schema.chartAccounts.groupCode, input.groupCode),
      ),
    );
  const refs = await referenciasNoPlanejamento(ctx.tenant.id, [input.groupCode, ...contas.map((c) => c.code)]);
  if (refs > 0) {
    return {
      ok: false,
      error: `O grupo ${input.groupCode} tem ${refs} lançamento(s) de Orçamento/Previsão. Inative as contas em vez de excluir o grupo.`,
    };
  }
  // 0079 — despesas e medições também apontam os códigos.
  const usoDoGrupo = await usoDosCodigos(ctx.tenant.id, [input.groupCode, ...contas.map((c) => c.code)]);
  const comUso = [...usoDoGrupo.values()].reduce((n, u) => n + u.despesas + u.medicoes, 0);
  if (comUso > 0) return { ok: false, error: `O grupo ${input.groupCode} tem ${comUso} lançamento(s) ou medição(ões). Inative as contas em vez de excluir o grupo.` };
  const [no] = await db.select({ id: schema.chartGroups.id }).from(schema.chartGroups).where(and(eq(schema.chartGroups.tenantId, ctx.tenant.id), eq(schema.chartGroups.code, input.groupCode))).limit(1);
  if (no) {
    const [filho] = await db.select({ id: schema.chartGroups.id }).from(schema.chartGroups).where(eq(schema.chartGroups.parentId, no.id)).limit(1);
    if (filho) return { ok: false, error: `O grupo ${input.groupCode} tem subgrupos.` };
  }
  await db
    .delete(schema.chartAccounts)
    .where(
      and(
        eq(schema.chartAccounts.tenantId, ctx.tenant.id),
        eq(schema.chartAccounts.kind, kind),
        eq(schema.chartAccounts.groupCode, input.groupCode),
      ),
    );
  await db.delete(schema.chartGroups).where(and(eq(schema.chartGroups.tenantId, ctx.tenant.id), eq(schema.chartGroups.code, input.groupCode)));
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "chart.group.delete",
    entity: "chart_account",
    meta: { kind, groupCode: input.groupCode, contas: contas.map((c) => c.code) },
  });
  revalidatePath("/planocontas");
  return { ok: true };
}

/**
 * Prompt G2 — cria as contas que a Cris propôs e a pessoa marcou na
 * conferência. Valida cada uma de novo (grupo existe, código livre e do grupo,
 * categoria que serve à natureza); a que não passa volta com o motivo e as
 * outras seguem. Só conta em grupo existente (BG2-1). Log com origem
 * "assistente".
 */
export async function criarContasPropostas(
  lista: { groupCode: string; code: string; name: string; natureza: string; dreCategory: string | null }[],
): Promise<{ ok: true; criadas: string[]; recusadas: { code: string; motivo: string }[] } | { ok: false; error: string }> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: "Sessão expirada. Entre de novo." };
  if (!can(ctx.perms, "planocontas", "criar")) return { ok: false, error: "Sem permissão para criar contas." };
  if (!Array.isArray(lista) || lista.length === 0) return { ok: false, error: "Nenhuma conta marcada." };
  if (lista.length > MAX_CONTAS_PROPOSTAS) return { ok: false, error: `No máximo ${MAX_CONTAS_PROPOSTAS} contas de uma vez.` };
  const existentes = await db.select().from(schema.chartAccounts).where(eq(schema.chartAccounts.tenantId, ctx.tenant.id));
  // 0079 — grupos do cadastro de grupos (inclusive os ainda sem conta) + os das contas (legado).
  const nos = await db.select().from(schema.chartGroups).where(eq(schema.chartGroups.tenantId, ctx.tenant.id));
  const grupos = [...new Map([...existentes.map((a) => [a.groupCode, { code: a.groupCode, name: a.groupName, kind: normKind(a.kind) }] as const), ...nos.map((g) => [g.code, { code: g.code, name: g.name, kind: normKind(g.kind) }] as const)]).values()];
  const codigos = new Set([...existentes.map((a) => a.code), ...nos.map((g) => g.code)]);
  const criadas: string[] = [];
  const recusadas: { code: string; motivo: string }[] = [];
  for (const bruta of lista) {
    const c = {
      groupCode: String(bruta?.groupCode ?? ""),
      code: String(bruta?.code ?? "").trim().slice(0, 20),
      name: String(bruta?.name ?? "").trim().slice(0, 120),
      natureza: normNatureza(bruta?.natureza),
      dreCategory: bruta?.dreCategory ? String(bruta.dreCategory) : null,
    };
    const motivo = recusaDaContaProposta(c, grupos, codigos);
    if (motivo) {
      recusadas.push({ code: c.code || "—", motivo });
      continue;
    }
    const g = grupos.find((x) => x.code === c.groupCode)!;
    await db.insert(schema.chartAccounts).values({
      tenantId: ctx.tenant.id,
      code: c.code,
      name: c.name,
      groupCode: g.code,
      groupName: g.name,
      kind: g.kind,
      natureza: c.natureza,
      dreCategory: (c.dreCategory as CategoriaDRE | null) ?? null,
    });
    codigos.add(c.code);
    criadas.push(c.code);
    await logAudit({
      tenantId: ctx.tenant.id,
      userId: ctx.userId,
      action: "chart.item.create",
      entity: "chart_account",
      meta: { code: c.code, name: c.name, origem: "assistente" },
    });
  }
  if (criadas.length) revalidatePath("/planocontas");
  return { ok: true, criadas, recusadas };
}
