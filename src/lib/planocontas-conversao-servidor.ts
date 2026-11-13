/**
 * Conversão do Plano de Contas de uma empresa existente — lado do servidor.
 * Lê o cadastro, planeja (módulo puro `planocontas-conversao.ts`) e aplica
 * numa transação com trava por empresa. Também desfaz a última conversão
 * enquanto as contas criadas por ela não tiverem uso.
 *
 * As funções recebem o `tenantId` e quem executa; a sessão e a permissão são
 * conferidas pela Server Action (`actions/planocontas-conversao.ts`) e pelo
 * script de linha de comando. Nada aqui toca outra empresa.
 */
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { gruposDoPlano, linhasDoPlano } from "@/lib/calc/plano-ambiental";
import { planejarConversao, type PlanoDeConversao, type UsoResumido } from "@/lib/planocontas-conversao";
import { usoDosCodigos } from "@/lib/planocontas-servidor";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Exec = typeof db | Tx;

export const ACAO_CONVERTER = "chart.converter";
export const ACAO_DESFAZER = "chart.converter.desfazer";

const travar = (tx: Tx, tenantId: string) => tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`planocontas:${tenantId}`}))`);

export async function cadastroParaConversao(tenantId: string, exec: Exec = db) {
  const [grupos, contas] = await Promise.all([
    exec.select({ id: schema.chartGroups.id, code: schema.chartGroups.code, name: schema.chartGroups.name, parentId: schema.chartGroups.parentId, ativo: schema.chartGroups.ativo }).from(schema.chartGroups).where(eq(schema.chartGroups.tenantId, tenantId)),
    exec.select({ id: schema.chartAccounts.id, code: schema.chartAccounts.code, name: schema.chartAccounts.name, groupCode: schema.chartAccounts.groupCode, natureza: schema.chartAccounts.natureza, ativo: schema.chartAccounts.ativo, papel: schema.chartAccounts.papel }).from(schema.chartAccounts).where(eq(schema.chartAccounts.tenantId, tenantId)),
  ]);
  const uso = await usoDosCodigos(tenantId, [...new Set([...grupos.map((g) => g.code), ...contas.map((c) => c.code)])], exec as typeof db);
  return { grupos, contas, uso: uso as Map<string, UsoResumido> };
}

/** Prévia: o que a conversão faria nesta empresa (só leitura). */
export async function previaDaConversao(tenantId: string, exec: Exec = db): Promise<PlanoDeConversao> {
  return planejarConversao(await cadastroParaConversao(tenantId, exec));
}

/** Troca um código em todas as referências da empresa (mesma transação). */
async function trocarReferencias(tx: Tx, tenantId: string, tipo: "grupo" | "conta", de: string, para: string) {
  if (tipo === "conta") {
    await tx.update(schema.despesas).set({ contaCef: para }).where(and(eq(schema.despesas.tenantId, tenantId), eq(schema.despesas.contaCef, de)));
  } else {
    await tx.update(schema.chartAccounts).set({ groupCode: para }).where(and(eq(schema.chartAccounts.tenantId, tenantId), eq(schema.chartAccounts.groupCode, de)));
    await tx.update(schema.medicoes).set({ grupoCode: para }).where(and(eq(schema.medicoes.tenantId, tenantId), eq(schema.medicoes.grupoCode, de)));
  }
  // Orçamento/Previsão: a chave da linha é o código do grupo (e, em base antiga, às vezes o da conta).
  await tx.update(schema.budgetLines).set({ rowKey: para }).where(and(eq(schema.budgetLines.tenantId, tenantId), eq(schema.budgetLines.rowKey, de)));
  await tx.update(schema.budgetAccounts).set({ rowKey: para }).where(and(eq(schema.budgetAccounts.tenantId, tenantId), eq(schema.budgetAccounts.rowKey, de)));
  await tx.update(schema.budgetSelecoes).set({ rowKey: para }).where(and(eq(schema.budgetSelecoes.tenantId, tenantId), eq(schema.budgetSelecoes.rowKey, de)));
}

async function renomearCodigo(tx: Tx, tenantId: string, r: { tipo: "grupo" | "conta"; id: string; de: string; para: string }) {
  if (r.tipo === "conta") await tx.update(schema.chartAccounts).set({ code: r.para, updatedAt: new Date() }).where(and(eq(schema.chartAccounts.tenantId, tenantId), eq(schema.chartAccounts.id, r.id)));
  else await tx.update(schema.chartGroups).set({ code: r.para, updatedAt: new Date() }).where(and(eq(schema.chartGroups.tenantId, tenantId), eq(schema.chartGroups.id, r.id)));
  await trocarReferencias(tx, tenantId, r.tipo, r.de, r.para);
}

export interface ResultadoDaConversao {
  aplicada: boolean;
  plano: PlanoDeConversao;
  criadosGrupos: number;
  criadasContas: number;
}

/**
 * Aplica a conversão. Idempotente: com o plano já convertido, não faz nada.
 * `confirmacao` precisa repetir a versão do plano padrão que a prévia mostrou
 * (evita aplicar uma prévia velha às cegas).
 */
export async function aplicarConversao(tenantId: string, userId: string | null, quem: string): Promise<ResultadoDaConversao> {
  return db.transaction(async (tx) => {
    await travar(tx, tenantId);
    const plano = planejarConversao(await cadastroParaConversao(tenantId, tx));
    if (plano.nadaAFazer) return { aplicada: false, plano, criadosGrupos: 0, criadasContas: 0 };

    // 1) papéis técnicos saem das contas antigas (o índice é único por empresa)
    if (plano.papeis.length) await tx.update(schema.chartAccounts).set({ papel: null }).where(and(eq(schema.chartAccounts.tenantId, tenantId), inArray(schema.chartAccounts.id, plano.papeis.map((p) => p.deId))));
    // 2) códigos: antigos em conflito → "ANT-…"; "PA-…" → código oficial
    for (const r of plano.renomear) await renomearCodigo(tx, tenantId, r);
    // 3) antigos ficam inativos (nada é apagado)
    const contasInativar = plano.inativar.filter((i) => i.tipo === "conta").map((i) => i.id);
    const gruposInativar = plano.inativar.filter((i) => i.tipo === "grupo").map((i) => i.id);
    if (contasInativar.length) await tx.update(schema.chartAccounts).set({ ativo: false, updatedAt: new Date() }).where(and(eq(schema.chartAccounts.tenantId, tenantId), inArray(schema.chartAccounts.id, contasInativar)));
    if (gruposInativar.length) await tx.update(schema.chartGroups).set({ ativo: false, updatedAt: new Date() }).where(and(eq(schema.chartGroups.tenantId, tenantId), inArray(schema.chartGroups.id, gruposInativar)));
    // 4) o que falta do plano ambiental: grupos (1º nível antes), depois contas
    const padraoG = new Map(gruposDoPlano(tenantId).map((g) => [g.code, g]));
    const ids = new Map((await tx.select({ id: schema.chartGroups.id, code: schema.chartGroups.code }).from(schema.chartGroups).where(eq(schema.chartGroups.tenantId, tenantId))).map((g) => [g.code, g.id]));
    const criadosGrupos: string[] = [];
    for (const nivel of [false, true]) {
      for (const g of plano.criarGrupos.filter((x) => !!x.parentCode === nivel)) {
        const p = padraoG.get(g.code)!;
        const [n] = await tx
          .insert(schema.chartGroups)
          .values({ tenantId, code: p.code, name: p.name, descricao: p.descricao, kind: p.kind, ordem: p.ordem, parentId: p.parentCode ? (ids.get(p.parentCode) ?? null) : null })
          .returning({ id: schema.chartGroups.id });
        ids.set(p.code, n.id);
        criadosGrupos.push(n.id);
      }
    }
    // subgrupo ambiental existente que estava sem pai (ou sob outro) fica sob o grupo oficial
    const paiAtual = new Map((await tx.select({ id: schema.chartGroups.id, parentId: schema.chartGroups.parentId }).from(schema.chartGroups).where(eq(schema.chartGroups.tenantId, tenantId))).map((g) => [g.id, g.parentId]));
    const reparentados: { id: string; antes: string | null }[] = [];
    for (const g of gruposDoPlano(tenantId).filter((x) => x.parentCode)) {
      const id = ids.get(g.code);
      const pai = ids.get(g.parentCode!);
      if (!id || !pai || criadosGrupos.includes(id) || paiAtual.get(id) === pai) continue;
      reparentados.push({ id, antes: paiAtual.get(id) ?? null });
      await tx.update(schema.chartGroups).set({ parentId: pai }).where(and(eq(schema.chartGroups.tenantId, tenantId), eq(schema.chartGroups.id, id)));
    }
    const novas = new Set(plano.criarContas.map((c) => c.code));
    const papeisOcupados = new Set(
      (await tx.select({ papel: schema.chartAccounts.papel }).from(schema.chartAccounts).where(and(eq(schema.chartAccounts.tenantId, tenantId), sql`${schema.chartAccounts.papel} is not null`))).map((x) => x.papel),
    );
    const linhas = linhasDoPlano(tenantId)
      .filter((c) => novas.has(c.code))
      .map((c) => ({ ...c, papel: c.papel && !papeisOcupados.has(c.papel) ? c.papel : null }));
    const criadas = linhas.length ? await tx.insert(schema.chartAccounts).values(linhas).returning({ id: schema.chartAccounts.id }) : [];
    // conta ambiental que já existia recebe o papel que a antiga largou
    for (const p of plano.papeis) {
      await tx
        .update(schema.chartAccounts)
        .set({ papel: p.papel })
        .where(and(eq(schema.chartAccounts.tenantId, tenantId), eq(schema.chartAccounts.code, p.para), isNull(schema.chartAccounts.papel), sql`not exists (select 1 from chart_account b where b.tenant_id = ${tenantId} and b.papel = ${p.papel})`));
    }

    await logAudit(
      {
        tenantId,
        userId,
        action: ACAO_CONVERTER,
        entity: "chart_account",
        meta: {
          versao: plano.versao,
          quem,
          renomear: plano.renomear.map((r) => ({ tipo: r.tipo, id: r.id, de: r.de, para: r.para, motivo: r.motivo })),
          inativados: plano.inativar.map((i) => ({ tipo: i.tipo, id: i.id, code: i.code })),
          criadosGrupos,
          criadasContas: criadas.map((c) => c.id),
          reparentados,
          papeis: plano.papeis,
          resumo: plano.resumo,
        },
      },
      tx,
    );
    return { aplicada: true, plano, criadosGrupos: criadosGrupos.length, criadasContas: criadas.length };
  });
}

interface MetaDaConversao {
  renomear: { tipo: "grupo" | "conta"; id: string; de: string; para: string }[];
  inativados: { tipo: "grupo" | "conta"; id: string }[];
  criadosGrupos: string[];
  criadasContas: string[];
  papeis: { papel: string; deId: string; para: string }[];
  reparentados?: { id: string; antes: string | null }[];
}

/** A última conversão ainda não desfeita (ou null). */
export async function ultimaConversao(tenantId: string, exec: Exec = db): Promise<{ id: string; em: Date; meta: MetaDaConversao } | null> {
  const [ultima] = await exec
    .select()
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.tenantId, tenantId), inArray(schema.auditLog.action, [ACAO_CONVERTER, ACAO_DESFAZER])))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(1);
  if (!ultima || ultima.action !== ACAO_CONVERTER) return null;
  return { id: ultima.id, em: ultima.createdAt, meta: ultima.meta as MetaDaConversao };
}

/**
 * Desfaz a última conversão: só enquanto NENHUMA conta criada por ela tiver
 * lançamento, Orçamento ou medição (senão recusa e diz quais). Volta os códigos,
 * reativa o que foi inativado e remove só o que a conversão criou.
 */
export async function desfazerConversao(tenantId: string, userId: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  return db.transaction(async (tx) => {
    await travar(tx, tenantId);
    const ultima = await ultimaConversao(tenantId, tx);
    if (!ultima) return { ok: false as const, error: "Não há conversão para desfazer." };
    const m = ultima.meta;
    const criadas = m.criadasContas.length ? await tx.select().from(schema.chartAccounts).where(and(eq(schema.chartAccounts.tenantId, tenantId), inArray(schema.chartAccounts.id, m.criadasContas))) : [];
    const criados = m.criadosGrupos.length ? await tx.select().from(schema.chartGroups).where(and(eq(schema.chartGroups.tenantId, tenantId), inArray(schema.chartGroups.id, m.criadosGrupos))) : [];
    const uso = await usoDosCodigos(tenantId, [...criadas.map((c) => c.code), ...criados.map((g) => g.code)], tx as unknown as typeof db);
    const emUso = [...uso.entries()].filter(([, u]) => u.despesas + u.orcamento + u.medicoes > 0).map(([c]) => c);
    if (emUso.length) return { ok: false as const, error: `Não dá para desfazer: contas/grupos criados pela conversão já têm uso (${emUso.slice(0, 8).join(", ")}${emUso.length > 8 ? "…" : ""}). Use a reclassificação ou restaure o backup.` };
    const outrasNosGruposCriados = criados.length
      ? await tx.select({ code: schema.chartAccounts.code }).from(schema.chartAccounts).where(and(eq(schema.chartAccounts.tenantId, tenantId), inArray(schema.chartAccounts.groupCode, criados.map((g) => g.code)), sql`${schema.chartAccounts.id} not in (${sql.join(m.criadasContas.length ? m.criadasContas.map((id) => sql`${id}::uuid`) : [sql`null`], sql`, `)})`))
      : [];
    if (outrasNosGruposCriados.length) return { ok: false as const, error: `Não dá para desfazer: há contas novas da empresa em grupos criados pela conversão (${outrasNosGruposCriados.map((c) => c.code).join(", ")}).` };

    for (const r of m.reparentados ?? []) await tx.update(schema.chartGroups).set({ parentId: r.antes }).where(and(eq(schema.chartGroups.tenantId, tenantId), eq(schema.chartGroups.id, r.id)));
    if (m.criadasContas.length) await tx.delete(schema.chartAccounts).where(and(eq(schema.chartAccounts.tenantId, tenantId), inArray(schema.chartAccounts.id, m.criadasContas)));
    // subgrupos antes dos grupos (a FK do pai é RESTRICT)
    const ordem = [...criados].sort((a, b) => Number(!!b.parentId) - Number(!!a.parentId));
    for (const g of ordem) await tx.delete(schema.chartGroups).where(and(eq(schema.chartGroups.tenantId, tenantId), eq(schema.chartGroups.id, g.id)));
    for (const r of [...m.renomear].reverse()) await renomearCodigo(tx, tenantId, { tipo: r.tipo, id: r.id, de: r.para, para: r.de });
    const contas = m.inativados.filter((i) => i.tipo === "conta").map((i) => i.id);
    const grupos = m.inativados.filter((i) => i.tipo === "grupo").map((i) => i.id);
    if (contas.length) await tx.update(schema.chartAccounts).set({ ativo: true }).where(and(eq(schema.chartAccounts.tenantId, tenantId), inArray(schema.chartAccounts.id, contas)));
    if (grupos.length) await tx.update(schema.chartGroups).set({ ativo: true }).where(and(eq(schema.chartGroups.tenantId, tenantId), inArray(schema.chartGroups.id, grupos)));
    for (const p of m.papeis) {
      await tx.update(schema.chartAccounts).set({ papel: null }).where(and(eq(schema.chartAccounts.tenantId, tenantId), eq(schema.chartAccounts.papel, p.papel)));
      await tx.update(schema.chartAccounts).set({ papel: p.papel }).where(and(eq(schema.chartAccounts.tenantId, tenantId), eq(schema.chartAccounts.id, p.deId)));
    }
    await logAudit({ tenantId, userId, action: ACAO_DESFAZER, entity: "chart_account", meta: { conversao: ultima.id } }, tx);
    return { ok: true as const };
  });
}
