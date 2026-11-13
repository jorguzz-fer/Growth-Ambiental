"use server";

import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { db, schema } from "@/lib/db";
import { getTenantContext, type TenantContext } from "@/lib/context";
import { can, type PermAction } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { chaveLigada } from "@/lib/chaves-tenant";
import type { CategoriaDRE } from "@/lib/calc/constants";
import { categoriaDaConta, recusaDeCategoriaDaConta } from "@/lib/categoria-do-plano";
import { gruposDoPlano, linhasDoPlano, VERSAO_PLANO_PADRAO } from "@/lib/calc/plano-ambiental";
import {
  classeDaConta,
  classesPermitidas,
  contasSemelhantes,
  ehClasse,
  ehTipoCusto,
  LIMITES,
  previaDaImportacao,
  recusaDaContaDoLancamento,
  recusaDeCodigo,
  recusaDeHierarquia,
  ROTULO_CLASSE,
  tipoCustoDoLancamento,
  type LinhaImportada,
  type PreviaDeImportacao,
} from "@/lib/planocontas-regras";
import { usado, usoDosCodigos, type UsoDoCodigo } from "@/lib/planocontas-servidor";

/**
 * Plano de Contas — estrutura hierárquica (0079). Toda ação confere sessão,
 * permissão e empresa no servidor; mudanças estruturais rodam em transação
 * com trava por empresa (duas pessoas editando o plano ao mesmo tempo não
 * produzem código duplicado nem ciclo).
 *
 * O código da conta é a referência dos lançamentos (despesa.conta_cef) e do
 * Orçamento (row_key do grupo): código USADO não muda. Mudança que mexe em
 * relatório já emitido (categoria, classe, grupo, tipo de custo de conta
 * usada) devolve a prévia do impacto e só grava com `confirmar: true`.
 */

export interface Impacto {
  conta: string;
  despesas: number;
  valorAtual: number;
  orcamento: number;
  versoesCongeladas: number;
  mudancas: string[];
  efeitos: string[];
}
export type Resultado =
  | { ok: true; id?: string; aviso?: string }
  | { ok: false; error: string; precisaConfirmar?: false }
  | { ok: false; error: string; precisaConfirmar: true; impacto: Impacto };

type Exec = Parameters<Parameters<typeof db.transaction>[0]>[0];
const falha = (error: string): Resultado => ({ ok: false, error });
const txt = (v: unknown, max: number = LIMITES.nome) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

async function sessao(acao: PermAction, tela: "planocontas" | "planocontasreclass" = "planocontas") {
  const ctx = await getTenantContext();
  if (!ctx) return { error: "Sessão expirada. Entre de novo." } as const;
  if (!can(ctx.perms, tela, acao)) return { error: tela === "planocontasreclass" ? "Sem permissão para reclassificar lançamentos." : `Sem permissão para ${acao === "ver" ? "ver" : acao === "criar" ? "criar" : acao === "excluir" ? "excluir" : "editar"} o Plano de Contas.` } as const;
  return { ctx } as const;
}
const travar = (tx: Exec, tenantId: string) => tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`planocontas:${tenantId}`}))`);
const revalidar = () => {
  revalidatePath("/planocontas");
  revalidatePath("/despesas");
};

async function estrutura(tx: Exec, tenantId: string) {
  const [grupos, contas] = await Promise.all([
    tx.select().from(schema.chartGroups).where(eq(schema.chartGroups.tenantId, tenantId)),
    tx.select().from(schema.chartAccounts).where(eq(schema.chartAccounts.tenantId, tenantId)),
  ]);
  return { grupos, contas, codigos: new Set([...grupos.map((g) => g.code), ...contas.map((c) => c.code)]) };
}

// ───────────────────────────── Grupos e subgrupos ─────────────────────────────

/** Cria, renomeia, recodifica (sem uso) ou move um grupo/subgrupo. */
export async function salvarGrupoDoPlano(input: { id?: string | null; code: string; name: string; descricao?: string | null; parentId?: string | null; kind?: string }): Promise<Resultado> {
  const s = await sessao(input.id ? "editar" : "criar");
  if ("error" in s) return falha(s.error!);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const code = (input.code ?? "").trim();
  const rc = recusaDeCodigo(code);
  if (rc) return falha(rc);
  const name = txt(input.name);
  if (!name) return falha("Informe o nome do grupo.");
  const descricao = txt(input.descricao, LIMITES.descricao);
  const parentId = input.parentId || null;
  const r = await db.transaction(async (tx) => {
    await travar(tx, tenantId);
    const e = await estrutura(tx, tenantId);
    const atual = input.id ? e.grupos.find((g) => g.id === input.id) : null;
    if (input.id && !atual) return falha("Grupo não encontrado.");
    if (code !== atual?.code && e.codigos.has(code)) return falha(`O código "${code}" já existe no plano (conta ou grupo).`);
    const rh = recusaDeHierarquia(e.grupos.map((g) => ({ id: g.id, code: g.code, parentId: g.parentId })), atual?.id ?? null, parentId);
    if (rh) return falha(rh);
    const pai = parentId ? e.grupos.find((g) => g.id === parentId)! : null;
    if (!atual) {
      const kind = pai ? pai.kind : input.kind === "cef" ? "cef" : "complementar";
      const irmas = e.grupos.filter((g) => (g.parentId ?? null) === parentId);
      const [g] = await tx
        .insert(schema.chartGroups)
        .values({ tenantId, code, name, descricao, parentId, kind, ordem: Math.max(0, ...irmas.map((x) => x.ordem)) + 1 })
        .returning({ id: schema.chartGroups.id });
      await logAudit({ tenantId, userId: ctx.userId, action: "chart.group.create", entity: "chart_group", entityId: g.id, meta: { code, name, parent: pai?.code ?? null, kind } }, tx);
      return { ok: true as const, id: g.id };
    }
    if (code !== atual.code) {
      const uso = (await usoDosCodigos(tenantId, [atual.code], tx)).get(atual.code)!;
      if (uso.orcamento + uso.medicoes > 0)
        return falha(`O código ${atual.code} é a chave de ${uso.orcamento} linha(s) de Orçamento/Previsão e ${uso.medicoes} medição(ões): não pode mudar. Renomeie só o nome.`);
    }
    await tx.update(schema.chartGroups).set({ code, name, descricao, parentId, updatedAt: new Date() }).where(eq(schema.chartGroups.id, atual.id));
    // As contas guardam código e nome do grupo (é o que o Orçamento lê): mantém em sincronia.
    await tx
      .update(schema.chartAccounts)
      .set({ groupCode: code, groupName: name, updatedAt: new Date() })
      .where(and(eq(schema.chartAccounts.tenantId, tenantId), eq(schema.chartAccounts.groupCode, atual.code)));
    await logAudit({ tenantId, userId: ctx.userId, action: "chart.group.update", entity: "chart_group", entityId: atual.id, meta: { de: { code: atual.code, name: atual.name, parent: atual.parentId }, para: { code, name, parent: parentId } } }, tx);
    return { ok: true as const, id: atual.id };
  });
  if (r.ok) revalidar();
  return r;
}

/** Exclui grupo vazio (sem subgrupos nem contas) e sem uso no Orçamento/Medição. */
export async function excluirGrupoDoPlano(id: string): Promise<Resultado> {
  const s = await sessao("excluir");
  if ("error" in s) return falha(s.error!);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const r = await db.transaction(async (tx) => {
    await travar(tx, tenantId);
    const e = await estrutura(tx, tenantId);
    const g = e.grupos.find((x) => x.id === id);
    if (!g) return falha("Grupo não encontrado.");
    if (e.grupos.some((x) => x.parentId === g.id)) return falha("O grupo tem subgrupos: mova ou exclua os subgrupos antes.");
    if (e.contas.some((c) => c.groupCode === g.code)) return falha("O grupo tem contas: mova, exclua ou inative as contas antes.");
    const uso = (await usoDosCodigos(tenantId, [g.code], tx)).get(g.code)!;
    if (uso.orcamento + uso.medicoes > 0) return falha(`O grupo ${g.code} tem ${uso.orcamento} linha(s) de Orçamento/Previsão e ${uso.medicoes} medição(ões).`);
    await tx.delete(schema.chartGroups).where(eq(schema.chartGroups.id, g.id));
    await logAudit({ tenantId, userId: ctx.userId, action: "chart.group.delete", entity: "chart_group", entityId: g.id, meta: { code: g.code, name: g.name } }, tx);
    return { ok: true as const, id: g.id };
  });
  if (r.ok) revalidar();
  return r;
}

// ───────────────────────────── Contas ─────────────────────────────

export interface DadosDaConta {
  id?: string | null;
  /** versão lida na tela (concorrência otimista). */
  versao?: number | null;
  code: string;
  name: string;
  descricao?: string | null;
  grupoCode: string;
  natureza: string;
  /** "" ou null = o padrão do sistema. */
  dreCategory?: string | null;
  classeGerencial?: string | null;
  tipoCusto?: string | null;
  /** confirma uma mudança que tem impacto em lançamentos/relatórios. */
  confirmar?: boolean;
}

/**
 * Cria ou edita uma conta analítica. Conta usada: código não muda, natureza
 * não muda; categoria, classe, tipo de custo e grupo mudam só com a prévia
 * do impacto confirmada.
 */
export async function salvarConta(input: DadosDaConta): Promise<Resultado> {
  const s = await sessao(input.id ? "editar" : "criar");
  if ("error" in s) return falha(s.error!);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const code = (input.code ?? "").trim();
  const rc = recusaDeCodigo(code);
  if (rc) return falha(rc);
  const name = txt(input.name);
  if (!name) return falha("Informe o nome da conta.");
  const descricao = txt(input.descricao, LIMITES.descricao);
  const natureza = input.natureza === "receita" ? "receita" : "despesa";
  const escolha = input.dreCategory || null;
  if (escolha) {
    const rec = recusaDeCategoriaDaConta(natureza, escolha);
    if (rec) return falha(rec);
  }
  const classe = input.classeGerencial || null;
  if (classe && (!ehClasse(classe) || !classesPermitidas(natureza).includes(classe))) return falha(`Classe gerencial não serve a conta de ${natureza}.`);
  const tipoCusto = input.tipoCusto || null;
  if (tipoCusto && !ehTipoCusto(tipoCusto)) return falha("Tipo de custo inválido (direto ou indireto).");

  const chave = await chaveLigada(tenantId, "despesa_categoria_do_plano");
  const r = await db.transaction(async (tx) => {
    await travar(tx, tenantId);
    const e = await estrutura(tx, tenantId);
    const grupo = e.grupos.find((g) => g.code === input.grupoCode);
    if (!grupo) return falha("Escolha um grupo do plano.");
    const atual = input.id ? e.contas.find((c) => c.id === input.id) : null;
    if (input.id && !atual) return falha("Conta não encontrada.");
    if (code !== atual?.code && e.codigos.has(code)) return falha(`O código "${code}" já existe no plano (conta ou grupo).`);

    if (!atual) {
      const doGrupo = e.contas.filter((c) => c.groupCode === grupo.code);
      const [c] = await tx
        .insert(schema.chartAccounts)
        .values({ tenantId, code, name, descricao, groupCode: grupo.code, groupName: grupo.name, kind: grupo.kind, natureza, dreCategory: escolha as CategoriaDRE | null, classeGerencial: classe, tipoCusto, ordem: Math.max(0, ...doGrupo.map((x) => x.ordem)) + 1 })
        .returning({ id: schema.chartAccounts.id });
      await logAudit({ tenantId, userId: ctx.userId, action: "chart.item.create", entity: "chart_account", entityId: c.id, meta: { code, name, grupo: grupo.code, natureza, dreCategory: escolha, classe, tipoCusto } }, tx);
      const parecidas = contasSemelhantes(name, e.contas.filter((x) => x.natureza === natureza));
      return { ok: true as const, id: c.id, aviso: parecidas.length ? `Já existe conta parecida: ${parecidas.map((p) => `${p.code} — ${p.name}`).join("; ")}. Se não for a mesma coisa, mantenha as duas.` : undefined };
    }

    if (input.versao != null && input.versao !== atual.versao) return falha("A conta foi alterada por outra pessoa depois que você abriu. Recarregue a página e refaça a alteração.");
    const uso = (await usoDosCodigos(tenantId, [atual.code], tx)).get(atual.code)!;
    const emUso = usado(uso);
    if (code !== atual.code && emUso)
      return falha(`A conta ${atual.code} tem ${uso.despesas} lançamento(s) e ${uso.orcamento} linha(s) de Orçamento: o código é a referência deles e não muda. Renomeie só o nome.`);
    if (natureza !== atual.natureza && uso.despesas > 0) return falha(`A conta ${atual.code} tem lançamentos de ${atual.natureza}: a natureza não muda. Crie outra conta e reclassifique.`);
    const catAntes = categoriaDaConta(atual);
    const catDepois = categoriaDaConta({ ...atual, natureza, dreCategory: escolha });
    const classeAntes = classeDaConta(atual, catAntes);
    const classeDepois = classeDaConta({ classeGerencial: classe }, catDepois);
    const mudancas: string[] = [];
    const efeitos: string[] = [];
    if (catAntes !== catDepois) {
      mudancas.push(`categoria da DRE: ${catAntes} → ${catDepois}`);
      efeitos.push(
        chave
          ? `Com "Despesa herda a categoria" ligada, a DRE passa a contar os R$ ${uso.valorAtual.toLocaleString("pt-BR")} já lançados em ${catDepois}, inclusive em ${uso.versoesCongeladas} versão(ões) congelada(s).`
          : "Os lançamentos já feitos mantêm a categoria gravada neles; só os novos usam a nova (a chave \"Despesa herda a categoria\" está desligada).",
      );
    }
    if (classeAntes !== classeDepois) {
      mudancas.push(`classe gerencial: ${ROTULO_CLASSE[classeAntes]} → ${ROTULO_CLASSE[classeDepois]}`);
      efeitos.push("A DRE gerencial passa a mostrar os lançamentos desta conta na nova linha (a cascata não muda).");
    }
    if ((tipoCusto ?? null) !== (atual.tipoCusto ?? null)) {
      mudancas.push(`custo padrão: ${atual.tipoCusto ?? "não se aplica"} → ${tipoCusto ?? "não se aplica"}`);
      efeitos.push("Lançamentos sem tratamento próprio passam a ser lidos com o novo padrão (direto/indireto) nas análises de custo.");
    }
    if (grupo.code !== atual.groupCode) {
      mudancas.push(`grupo: ${atual.groupCode} → ${grupo.code}`);
      efeitos.push(`O realizado desta conta passa a comparar com o Orçamento do grupo ${grupo.code} (as linhas de Orçamento são por grupo e não se movem).`);
    }
    if (emUso && mudancas.length && !input.confirmar)
      return { ok: false as const, precisaConfirmar: true as const, error: "Esta mudança afeta lançamentos e relatórios. Confira o impacto e confirme.", impacto: { conta: atual.code, despesas: uso.despesas, valorAtual: uso.valorAtual, orcamento: uso.orcamento, versoesCongeladas: uso.versoesCongeladas, mudancas, efeitos } };

    const set = {
      code,
      name,
      descricao,
      natureza,
      dreCategory: escolha as CategoriaDRE | null,
      classeGerencial: classe,
      tipoCusto,
      groupCode: grupo.code,
      groupName: grupo.name,
      kind: grupo.kind,
      versao: atual.versao + 1,
      updatedAt: new Date(),
    };
    // Concorrência: só grava se ninguém mudou desde a leitura (dentro da trava).
    const gravou = await tx.update(schema.chartAccounts).set(set).where(and(eq(schema.chartAccounts.id, atual.id), eq(schema.chartAccounts.versao, atual.versao))).returning({ id: schema.chartAccounts.id });
    if (!gravou.length) return falha("A conta foi alterada por outra pessoa. Recarregue a página.");
    await logAudit(
      { tenantId, userId: ctx.userId, action: "chart.item.update", entity: "chart_account", entityId: atual.id, meta: { code: atual.code, de: { code: atual.code, name: atual.name, grupo: atual.groupCode, natureza: atual.natureza, dreCategory: atual.dreCategory, classe: atual.classeGerencial, tipoCusto: atual.tipoCusto }, para: { code, name, grupo: grupo.code, natureza, dreCategory: escolha, classe, tipoCusto }, impacto: emUso ? { despesas: uso.despesas, valorAtual: uso.valorAtual, mudancas } : null } },
      tx,
    );
    return { ok: true as const, id: atual.id };
  });
  if (r.ok) revalidar();
  return r;
}

/** Ativa ou inativa: inativa some de lançamentos novos; o histórico fica. */
export async function definirSituacaoDaConta(id: string, ativo: boolean): Promise<Resultado> {
  const s = await sessao("editar");
  if ("error" in s) return falha(s.error!);
  const { ctx } = s;
  const [c] = await db.select().from(schema.chartAccounts).where(and(eq(schema.chartAccounts.id, id), eq(schema.chartAccounts.tenantId, ctx.tenant.id))).limit(1);
  if (!c) return falha("Conta não encontrada.");
  await db.update(schema.chartAccounts).set({ ativo, versao: c.versao + 1, updatedAt: new Date() }).where(eq(schema.chartAccounts.id, c.id));
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: ativo ? "chart.item.activate" : "chart.item.deactivate", entity: "chart_account", entityId: c.id, meta: { code: c.code } });
  revalidar();
  return { ok: true, id: c.id, aviso: !ativo && c.papel ? `A conta ${c.code} é usada pelo acerto de contas (${c.papel}); o acerto continua lançando nela.` : undefined };
}

/** Exclusão física só de conta sem nenhum uso e sem papel técnico; com uso, inative. */
export async function excluirConta(id: string): Promise<Resultado> {
  const s = await sessao("excluir");
  if ("error" in s) return falha(s.error!);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const r = await db.transaction(async (tx) => {
    await travar(tx, tenantId);
    const [c] = await tx.select().from(schema.chartAccounts).where(and(eq(schema.chartAccounts.id, id), eq(schema.chartAccounts.tenantId, tenantId))).limit(1);
    if (!c) return falha("Conta não encontrada.");
    if (c.papel) return falha(`A conta ${c.code} é usada por regra do sistema (${c.papel}). Inative-a se não quiser vê-la.`);
    const uso = (await usoDosCodigos(tenantId, [c.code], tx)).get(c.code)!;
    if (usado(uso)) return falha(`A conta ${c.code} tem ${uso.despesas} lançamento(s) e ${uso.orcamento} linha(s) de Orçamento: use "Inativar" — ela some de lançamentos novos e o histórico fica.`);
    await tx.delete(schema.chartAccounts).where(eq(schema.chartAccounts.id, c.id));
    await logAudit({ tenantId, userId: ctx.userId, action: "chart.item.delete", entity: "chart_account", entityId: c.id, meta: { code: c.code, name: c.name, grupo: c.groupCode } }, tx);
    return { ok: true as const, id: c.id };
  });
  if (r.ok) revalidar();
  return r;
}

/** Sobe/desce conta ou grupo entre os irmãos (ordem de exibição; código não muda). */
export async function moverNaOrdem(input: { tipo: "conta" | "grupo"; id: string; direcao: "cima" | "baixo" }): Promise<Resultado> {
  const s = await sessao("editar");
  if ("error" in s) return falha(s.error!);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const r = await db.transaction(async (tx) => {
    await travar(tx, tenantId);
    const e = await estrutura(tx, tenantId);
    const lista =
      input.tipo === "conta"
        ? (() => {
            const c = e.contas.find((x) => x.id === input.id);
            return c ? e.contas.filter((x) => x.groupCode === c.groupCode) : [];
          })()
        : (() => {
            const g = e.grupos.find((x) => x.id === input.id);
            return g ? e.grupos.filter((x) => (x.parentId ?? null) === (g.parentId ?? null)) : [];
          })();
    if (!lista.length) return falha("Item não encontrado.");
    const ord = [...lista].sort((a, b) => a.ordem - b.ordem || a.code.localeCompare(b.code, undefined, { numeric: true }));
    const i = ord.findIndex((x) => x.id === input.id);
    const j = input.direcao === "cima" ? i - 1 : i + 1;
    if (j < 0 || j >= ord.length) return { ok: true as const, id: input.id };
    [ord[i], ord[j]] = [ord[j], ord[i]];
    const tabela = input.tipo === "conta" ? schema.chartAccounts : schema.chartGroups;
    for (const [k, x] of ord.entries()) if (x.ordem !== k + 1) await tx.update(tabela).set({ ordem: k + 1 }).where(eq(tabela.id, x.id));
    return { ok: true as const, id: input.id };
  });
  if (r.ok) revalidar();
  return r;
}

/** Duplica um grupo e as contas dele (códigos novos pelo prefixo), sob o mesmo pai. */
export async function duplicarGrupoDoPlano(input: { id: string; novoCodigo: string; novoNome: string }): Promise<Resultado> {
  const s = await sessao("criar");
  if ("error" in s) return falha(s.error!);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const novo = (input.novoCodigo ?? "").trim();
  const rc = recusaDeCodigo(novo);
  if (rc) return falha(rc);
  const nome = txt(input.novoNome);
  if (!nome) return falha("Informe o nome do grupo novo.");
  const r = await db.transaction(async (tx) => {
    await travar(tx, tenantId);
    const e = await estrutura(tx, tenantId);
    const g = e.grupos.find((x) => x.id === input.id);
    if (!g) return falha("Grupo não encontrado.");
    if (e.grupos.some((x) => x.parentId === g.id)) return falha("Duplique um grupo de último nível (sem subgrupos).");
    if (e.codigos.has(novo)) return falha(`O código "${novo}" já existe.`);
    const contas = e.contas.filter((c) => c.groupCode === g.code).sort((a, b) => a.ordem - b.ordem);
    const codigos = contas.map((c, i) => (c.code.startsWith(`${g.code}.`) ? `${novo}${c.code.slice(g.code.length)}` : `${novo}.${String(i + 1).padStart(2, "0")}`));
    const conflito = codigos.find((c) => e.codigos.has(c) || recusaDeCodigo(c));
    if (conflito) return falha(`O código ${conflito} já existe ou é inválido: escolha outro código para o grupo.`);
    const [ng] = await tx.insert(schema.chartGroups).values({ tenantId, code: novo, name: nome, descricao: g.descricao, parentId: g.parentId, kind: g.kind, ordem: g.ordem + 1 }).returning({ id: schema.chartGroups.id });
    if (contas.length)
      await tx.insert(schema.chartAccounts).values(
        contas.map((c, i) => ({ tenantId, code: codigos[i], name: c.name, descricao: c.descricao, groupCode: novo, groupName: nome, kind: g.kind, natureza: c.natureza, dreCategory: c.dreCategory, classeGerencial: c.classeGerencial, tipoCusto: c.tipoCusto, ativo: c.ativo, ordem: c.ordem })),
      );
    await logAudit({ tenantId, userId: ctx.userId, action: "chart.group.duplicate", entity: "chart_group", entityId: ng.id, meta: { de: g.code, para: novo, contas: contas.length } }, tx);
    return { ok: true as const, id: ng.id };
  });
  if (r.ok) revalidar();
  return r;
}

// ───────────────────────────── Plano padrão para empresas existentes ─────────────────────────────

export interface PreviaDaAdocao {
  versao: string;
  gruposNovos: { code: string; codigoFinal: string; name: string }[];
  contasNovas: { code: string; name: string; grupo: string }[];
  jaExistem: number;
  /** grupos do padrão cujo código já estava ocupado: entram com prefixo "PA-". */
  ajustados: { code: string; motivo: string }[];
  /** contas do padrão cujo código já estava ocupado: NÃO entram. */
  conflitos: { code: string; motivo: string }[];
}

async function calcularAdocao(tx: Exec | typeof db, tenantId: string): Promise<PreviaDaAdocao> {
  const [grupos, contas] = await Promise.all([
    tx.select().from(schema.chartGroups).where(eq(schema.chartGroups.tenantId, tenantId)),
    tx.select().from(schema.chartAccounts).where(eq(schema.chartAccounts.tenantId, tenantId)),
  ]);
  const gruposPorCodigo = new Map(grupos.map((g) => [g.code, g]));
  const contasPorCodigo = new Map(contas.map((c) => [c.code, c]));
  const out: PreviaDaAdocao = { versao: VERSAO_PLANO_PADRAO, gruposNovos: [], contasNovas: [], jaExistem: 0, ajustados: [], conflitos: [] };
  const finalDe = new Map<string, string>();
  for (const g of gruposDoPlano(tenantId)) {
    const existente = gruposPorCodigo.get(g.code);
    if (existente && existente.name === g.name) {
      finalDe.set(g.code, g.code);
      out.jaExistem++;
      continue;
    }
    // Código ocupado (por conta ou grupo com outro nome): o grupo do padrão entra com prefixo "PA-".
    const final = existente || contasPorCodigo.has(g.code) ? `PA-${g.code}` : g.code;
    if (final !== g.code) out.ajustados.push({ code: g.code, motivo: `código já usado por ${contasPorCodigo.has(g.code) ? `conta "${contasPorCodigo.get(g.code)!.name}"` : `grupo "${existente!.name}"`}: o grupo "${g.name}" entra como ${final}` });
    if (gruposPorCodigo.has(final)) {
      finalDe.set(g.code, final);
      out.jaExistem++;
      continue;
    }
    finalDe.set(g.code, final);
    out.gruposNovos.push({ code: g.code, codigoFinal: final, name: g.name });
  }
  for (const c of linhasDoPlano(tenantId)) {
    const existente = contasPorCodigo.get(c.code) ?? (gruposPorCodigo.has(c.code) ? { name: "(grupo)" } : null);
    if (!existente) out.contasNovas.push({ code: c.code, name: c.name, grupo: finalDe.get(c.groupCode) ?? c.groupCode });
    else if (existente.name === c.name) out.jaExistem++;
    else out.conflitos.push({ code: c.code, motivo: `código já usado por "${existente.name}": a conta "${c.name}" não entra` });
  }
  return out;
}

/** Prévia: o que entraria do plano padrão ambiental (nada é alterado nem apagado). */
export async function previaDaAdocaoDoPadrao(): Promise<{ ok: true; previa: PreviaDaAdocao } | { ok: false; error: string }> {
  const s = await sessao("criar");
  if ("error" in s) return { ok: false, error: s.error! };
  return { ok: true, previa: await calcularAdocao(db, s.ctx.tenant.id) };
}

/**
 * Adoção ADITIVA do plano padrão por empresa existente: acrescenta grupos e
 * contas que faltam; nada existente muda (nome, código, categoria) e nada é
 * apagado. Repetir não duplica. As chaves de categoria NÃO são ligadas aqui:
 * ligar muda número de relatório e passa pela tela de Chaves, com prévia.
 */
export async function adotarPlanoPadrao(): Promise<Resultado> {
  const s = await sessao("criar");
  if ("error" in s) return falha(s.error!);
  const { ctx } = s;
  const tenantId = ctx.tenant.id;
  const r = await db.transaction(async (tx) => {
    await travar(tx, tenantId);
    const p = await calcularAdocao(tx, tenantId);
    const gruposPadrao = gruposDoPlano(tenantId);
    const finais = new Map(p.gruposNovos.map((g) => [g.code, g.codigoFinal]));
    const existentes = await tx.select().from(schema.chartGroups).where(eq(schema.chartGroups.tenantId, tenantId));
    const idPorCodigo = new Map(existentes.map((g) => [g.code, g.id]));
    for (const nivel of [false, true]) {
      for (const g of gruposPadrao.filter((x) => !!x.parentCode === nivel && finais.has(x.code))) {
        const final = finais.get(g.code)!;
        const parentFinal = g.parentCode ? (finais.get(g.parentCode) ?? (idPorCodigo.has(g.parentCode) ? g.parentCode : `PA-${g.parentCode}`)) : null;
        const [n] = await tx
          .insert(schema.chartGroups)
          .values({ tenantId, code: final, name: g.name, descricao: g.descricao, kind: g.kind, ordem: g.ordem, parentId: parentFinal ? (idPorCodigo.get(parentFinal) ?? null) : null })
          .returning({ id: schema.chartGroups.id });
        idPorCodigo.set(final, n.id);
      }
    }
    const novas = new Set(p.contasNovas.map((c) => c.code));
    const temPapel = new Set((await tx.select({ papel: schema.chartAccounts.papel }).from(schema.chartAccounts).where(and(eq(schema.chartAccounts.tenantId, tenantId), isNotNull(schema.chartAccounts.papel)))).map((x) => x.papel));
    const nomeDoGrupo = new Map(gruposPadrao.map((g) => [g.code, g.name]));
    const linhas = linhasDoPlano(tenantId)
      .filter((c) => novas.has(c.code))
      .map((c) => {
        const grupo = p.contasNovas.find((x) => x.code === c.code)!.grupo;
        return { ...c, groupCode: grupo, groupName: nomeDoGrupo.get(c.groupCode) ?? c.groupName, papel: c.papel && !temPapel.has(c.papel) ? c.papel : null };
      });
    if (linhas.length) await tx.insert(schema.chartAccounts).values(linhas);
    await logAudit({ tenantId, userId: ctx.userId, action: "chart.padrao.adotar", entity: "chart_account", meta: { versao: VERSAO_PLANO_PADRAO, grupos: p.gruposNovos.length, contas: linhas.length, ajustados: p.ajustados.length, conflitos: p.conflitos.length } }, tx);
    return { ok: true as const, aviso: `${p.gruposNovos.length} grupo(s) e ${linhas.length} conta(s) acrescentados${p.ajustados.length ? ` (${p.ajustados.length} grupo(s) com código ajustado para "PA-…")` : ""}; ${p.conflitos.length} conta(s) com código ocupado ficaram de fora. Nada existente foi alterado.` };
  });
  if (r.ok) revalidar();
  return r;
}

// ───────────────────────────── Reclassificação autorizada ─────────────────────────────

export interface PreviaDaReclassificacao {
  de: string;
  para: string;
  lancamentos: number;
  valor: number;
  congelados: number;
  porVersao: { tipo: string; n: number; valor: number }[];
  categoriaMuda: { de: string; para: string } | null;
  chaveLigada: boolean;
}

async function calcularReclassificacao(ctx: TenantContext, de: string, para: string): Promise<{ ok: true; previa: PreviaDaReclassificacao } | { ok: false; error: string }> {
  const tenantId = ctx.tenant.id;
  if (!de || !para || de === para) return { ok: false, error: "Escolha a conta de origem e uma conta de destino diferente." };
  const contas = await db.select().from(schema.chartAccounts).where(eq(schema.chartAccounts.tenantId, tenantId));
  const grupos = await db.select({ code: schema.chartGroups.code }).from(schema.chartGroups).where(eq(schema.chartGroups.tenantId, tenantId));
  const destino = contas.find((c) => c.code === para);
  const rec = recusaDaContaDoLancamento(para, new Map(contas.map((c) => [c.code, { code: c.code, ativo: c.ativo, natureza: c.natureza }])), new Set(grupos.map((g) => g.code)));
  if (rec) return { ok: false, error: rec };
  if (destino!.natureza !== "despesa") return { ok: false, error: "A conta de destino precisa ser de despesa." };
  const linhas = await db
    .select({ tipo: schema.versions.kind, locked: schema.versions.locked, n: sql<number>`count(*)::int`, valor: sql<string>`coalesce(sum(${schema.despesas.valor}),0)` })
    .from(schema.despesas)
    .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
    .where(and(eq(schema.despesas.tenantId, tenantId), eq(schema.despesas.contaCef, de), inArray(schema.versions.projectId, ctx.projects.map((p) => p.id))))
    .groupBy(schema.versions.kind, schema.versions.locked);
  const livres = linhas.filter((l) => !l.locked);
  const origem = contas.find((c) => c.code === de);
  const catDe = origem ? categoriaDaConta(origem) : null;
  const catPara = categoriaDaConta(destino!);
  return {
    ok: true,
    previa: {
      de,
      para,
      lancamentos: livres.reduce((s, l) => s + l.n, 0),
      valor: Math.round(livres.reduce((s, l) => s + Number(l.valor), 0) * 100) / 100,
      congelados: linhas.filter((l) => l.locked).reduce((s, l) => s + l.n, 0),
      porVersao: livres.map((l) => ({ tipo: l.tipo, n: l.n, valor: Number(l.valor) })),
      categoriaMuda: catDe && catDe !== catPara ? { de: catDe, para: catPara } : null,
      chaveLigada: await chaveLigada(tenantId, "despesa_categoria_do_plano"),
    },
  };
}

/** Prévia da reclassificação de lançamentos de uma conta para outra (nada é gravado). */
export async function previaDaReclassificacao(de: string, para: string) {
  const s = await sessao("editar", "planocontasreclass");
  if ("error" in s) return { ok: false as const, error: s.error! };
  return calcularReclassificacao(s.ctx, (de ?? "").trim(), (para ?? "").trim());
}

/**
 * Move os lançamentos de despesa da conta `de` para `para`, nas versões NÃO
 * congeladas dos projetos que a pessoa vê. Com a chave de categoria ligada, a
 * categoria gravada acompanha a conta nova. Orçamento (por grupo) não muda.
 */
export async function reclassificarLancamentos(input: { de: string; para: string; confirmar: boolean }): Promise<Resultado> {
  const s = await sessao("editar", "planocontasreclass");
  if ("error" in s) return falha(s.error!);
  const { ctx } = s;
  if (!input.confirmar) return falha("Confira a prévia e confirme a reclassificação.");
  const p = await calcularReclassificacao(ctx, (input.de ?? "").trim(), (input.para ?? "").trim());
  if (!p.ok) return falha(p.error);
  const tenantId = ctx.tenant.id;
  const destino = (await db.select().from(schema.chartAccounts).where(and(eq(schema.chartAccounts.tenantId, tenantId), eq(schema.chartAccounts.code, p.previa.para))).limit(1))[0];
  const versoesLivres = db
    .select({ id: schema.versions.id })
    .from(schema.versions)
    .where(and(eq(schema.versions.tenantId, tenantId), eq(schema.versions.locked, false), inArray(schema.versions.projectId, ctx.projects.map((x) => x.id))));
  const movidos = await db.transaction(async (tx) => {
    const r = await tx
      .update(schema.despesas)
      .set({ contaCef: p.previa.para, ...(p.previa.chaveLigada ? { categoriaDre: categoriaDaConta(destino) as CategoriaDRE } : {}) })
      .where(and(eq(schema.despesas.tenantId, tenantId), eq(schema.despesas.contaCef, p.previa.de), inArray(schema.despesas.versionId, versoesLivres)))
      .returning({ id: schema.despesas.id });
    await logAudit({ tenantId, userId: ctx.userId, action: "chart.reclassificar", entity: "despesa", meta: { de: p.previa.de, para: p.previa.para, lancamentos: r.length, valor: p.previa.valor, congeladosMantidos: p.previa.congelados, categoria: p.previa.chaveLigada ? p.previa.categoriaMuda : null, ids: r.slice(0, 200).map((x) => x.id) } }, tx);
    return r.length;
  });
  revalidar();
  return { ok: true, aviso: `${movidos} lançamento(s) movido(s) de ${p.previa.de} para ${p.previa.para}.${p.previa.congelados ? ` ${p.previa.congelados} em versão congelada ficaram como estavam.` : ""}` };
}

// ───────────────────────────── Importação ─────────────────────────────

const COLUNAS: Record<string, keyof LinhaImportada> = { codigo: "code", conta: "name", nome: "name", grupo: "grupo", subgrupo: "grupo", natureza: "natureza", categoria: "categoria", "categoria dre": "categoria", descricao: "descricao", situacao: "situacao" };
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/** Lê a planilha (XLSX ou CSV) em linhas de conta; colunas por nome do cabeçalho. */
function lerPlanilha(bytes: ArrayBuffer): LinhaImportada[] | string {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(new Uint8Array(bytes), { type: "array" });
  } catch {
    return "Não consegui ler a planilha (use XLSX ou CSV).";
  }
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return "Planilha vazia.";
  const brutas = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });
  if (brutas.length > 2000) return "No máximo 2.000 linhas por importação.";
  const out: LinhaImportada[] = [];
  brutas.forEach((b, i) => {
    const l: LinhaImportada = { linha: i + 2, code: "", name: "", grupo: "", natureza: "", categoria: "" };
    for (const [k, v] of Object.entries(b)) {
      const campo = COLUNAS[norm(k)];
      if (campo && campo !== "linha") (l as unknown as Record<string, string>)[campo] = String(v ?? "").trim();
    }
    if (l.code || l.name) out.push(l);
  });
  return out.length ? out : "Nenhuma linha com Código e Nome (cabeçalhos: Código, Nome, Grupo, Natureza, Categoria DRE, Descrição).";
}

async function previaComUso(tenantId: string, linhas: LinhaImportada[]): Promise<PreviaDeImportacao> {
  const [contas, grupos] = await Promise.all([
    db.select().from(schema.chartAccounts).where(eq(schema.chartAccounts.tenantId, tenantId)),
    db.select({ code: schema.chartGroups.code }).from(schema.chartGroups).where(eq(schema.chartGroups.tenantId, tenantId)),
  ]);
  const uso = await usoDosCodigos(tenantId, contas.map((c) => c.code));
  return previaDaImportacao(
    linhas,
    contas.map((c) => ({ id: c.id, code: c.code, name: c.name, descricao: c.descricao, groupCode: c.groupCode, natureza: c.natureza, dreCategory: c.dreCategory, categoria: categoriaDaConta(c), ativo: c.ativo, usada: usado(uso.get(c.code)) })),
    new Set(grupos.map((g) => g.code)),
  );
}

/** Prévia da importação: nada é gravado. Devolve as linhas lidas para a confirmação. */
export async function previaDaImportacaoDoPlano(formData: FormData): Promise<{ ok: true; previa: PreviaDeImportacao; linhas: LinhaImportada[] } | { ok: false; error: string }> {
  const s = await sessao("criar");
  if ("error" in s) return { ok: false, error: s.error! };
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) return { ok: false, error: "Escolha a planilha." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "Planilha com até 5 MB." };
  const linhas = lerPlanilha(await file.arrayBuffer());
  if (typeof linhas === "string") return { ok: false, error: linhas };
  return { ok: true, previa: await previaComUso(s.ctx.tenant.id, linhas), linhas };
}

/**
 * Grava a importação conferida. A prévia é REFEITA no servidor a partir das
 * linhas (não se confia no que a tela mostrou). Linhas com erro ficam de
 * fora; mudança de categoria de conta usada exige `confirmarImpacto`.
 */
export async function confirmarImportacaoDoPlano(input: { linhas: LinhaImportada[]; confirmarImpacto?: boolean }): Promise<Resultado> {
  const s = await sessao("criar");
  if ("error" in s) return falha(s.error!);
  const { ctx } = s;
  if (!can(ctx.perms, "planocontas", "editar")) return falha("Importar altera contas: precisa também de permissão de editar.");
  const tenantId = ctx.tenant.id;
  const linhas = (input.linhas ?? []).slice(0, 2000).map((l, i) => ({
    linha: Number(l.linha) || i + 2,
    code: String(l.code ?? ""),
    name: String(l.name ?? ""),
    grupo: String(l.grupo ?? ""),
    natureza: String(l.natureza ?? ""),
    categoria: String(l.categoria ?? ""),
    descricao: String(l.descricao ?? ""),
  }));
  const previa = await previaComUso(tenantId, linhas);
  const impactoEmUso = previa.impactoDre.filter((x) => x.usada);
  if (impactoEmUso.length && !input.confirmarImpacto)
    return falha(`${impactoEmUso.length} conta(s) com lançamentos mudam de categoria da DRE (${impactoEmUso.map((x) => x.code).join(", ")}). Confirme o impacto.`);
  const r = await db.transaction(async (tx) => {
    await travar(tx, tenantId);
    const e = await estrutura(tx, tenantId);
    const grupoPorCodigo = new Map(e.grupos.map((g) => [g.code, g]));
    let criadas = 0;
    for (const l of previa.novas) {
      if (e.codigos.has(l.code)) continue;
      const g = grupoPorCodigo.get(l.grupo.trim())!;
      await tx.insert(schema.chartAccounts).values({ tenantId, code: l.code, name: l.name, descricao: l.descricao?.trim() || null, groupCode: g.code, groupName: g.name, kind: g.kind, natureza: l.natureza, dreCategory: (l.categoria.trim() ? (l.categoria.trim() as CategoriaDRE) : null) });
      e.codigos.add(l.code);
      criadas++;
    }
    let alteradas = 0;
    for (const a of previa.alteradas) {
      const atual = e.contas.find((c) => c.id === a.id)!;
      const g = a.linha.grupo.trim() && a.linha.grupo.trim() !== atual.groupCode ? grupoPorCodigo.get(a.linha.grupo.trim())! : null;
      const cat = a.linha.categoria.trim() ? (a.linha.categoria.trim() as CategoriaDRE) : atual.dreCategory;
      await tx
        .update(schema.chartAccounts)
        .set({ name: a.linha.name, descricao: a.linha.descricao?.trim() || atual.descricao, dreCategory: cat, ...(g ? { groupCode: g.code, groupName: g.name, kind: g.kind } : {}), versao: atual.versao + 1, updatedAt: new Date() })
        .where(eq(schema.chartAccounts.id, atual.id));
      alteradas++;
    }
    await logAudit({ tenantId, userId: ctx.userId, action: "chart.importar", entity: "chart_account", meta: { criadas, alteradas, erros: previa.erros.length, duplicidades: previa.duplicidades.length, impactoDre: previa.impactoDre } }, tx);
    return { ok: true as const, aviso: `${criadas} conta(s) criada(s), ${alteradas} alterada(s); ${previa.erros.length} linha(s) com erro ficaram de fora.` };
  });
  if (r.ok) revalidar();
  return r;
}

/** Usado pela página: contas em uso (para mostrar "usada" e bloquear código). */
export async function usoDoPlano(): Promise<{ ok: true; uso: Record<string, UsoDoCodigo> } | { ok: false; error: string }> {
  const s = await sessao("ver");
  if ("error" in s) return { ok: false, error: s.error! };
  const contas = await db.select({ code: schema.chartAccounts.code }).from(schema.chartAccounts).where(eq(schema.chartAccounts.tenantId, s.ctx.tenant.id)).orderBy(asc(schema.chartAccounts.code));
  return { ok: true, uso: Object.fromEntries(await usoDosCodigos(s.ctx.tenant.id, contas.map((c) => c.code))) };
}

// ───────────────────────────── Onde a conta é usada (dimensões) ─────────────────────────────

export interface UsoPorDimensao {
  total: number;
  porProjeto: { nome: string; valor: number; n: number }[];
  porContrato: { nome: string; valor: number }[];
  porFase: { nome: string; valor: number }[];
  porTipoDeCusto: { tipo: string; valor: number }[];
}

/**
 * A conta cruzada com as dimensões do lançamento (projeto, contrato, fase e
 * custo direto/indireto), na versão Atual, sem canceladas, só nos projetos
 * que a pessoa vê. Valores: só para quem vê Despesas.
 */
export async function usoDaContaPorDimensao(code: string): Promise<{ ok: true; uso: UsoPorDimensao } | { ok: false; error: string }> {
  const s = await sessao("ver");
  if ("error" in s) return { ok: false, error: s.error! };
  const { ctx } = s;
  if (!can(ctx.perms, "despesas", "ver")) return { ok: false, error: "Sem acesso a Despesas: os valores por projeto não são mostrados." };
  const ids = ctx.projects.map((p) => p.id);
  if (!ids.length) return { ok: true, uso: { total: 0, porProjeto: [], porContrato: [], porFase: [], porTipoDeCusto: [] } };
  const [conta] = await db.select({ tipoCusto: schema.chartAccounts.tipoCusto }).from(schema.chartAccounts).where(and(eq(schema.chartAccounts.tenantId, ctx.tenant.id), eq(schema.chartAccounts.code, code))).limit(1);
  const linhas = await db
    .select({
      projeto: schema.projects.name,
      contrato: schema.contratos.codigo,
      fase: schema.projetoFases.nome,
      tipoCusto: schema.despesas.tipoCusto,
      valor: schema.despesas.valor,
    })
    .from(schema.despesas)
    .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
    .innerJoin(schema.projects, eq(schema.versions.projectId, schema.projects.id))
    .leftJoin(schema.contratos, eq(schema.despesas.contratoId, schema.contratos.id))
    .leftJoin(schema.projetoFases, eq(schema.despesas.projetoFaseId, schema.projetoFases.id))
    .where(and(eq(schema.despesas.tenantId, ctx.tenant.id), eq(schema.despesas.contaCef, code), eq(schema.versions.kind, "atual"), eq(schema.despesas.cancelado, false), inArray(schema.versions.projectId, ids)));
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const somar = (chave: (l: (typeof linhas)[number]) => string) => {
    const m = new Map<string, { valor: number; n: number }>();
    for (const l of linhas) {
      const k = chave(l);
      const a = m.get(k) ?? { valor: 0, n: 0 };
      a.valor += Number(l.valor);
      a.n++;
      m.set(k, a);
    }
    return [...m.entries()].map(([nome, a]) => ({ nome, valor: r2(a.valor), n: a.n })).sort((a, b) => b.valor - a.valor).slice(0, 30);
  };
  return {
    ok: true,
    uso: {
      total: r2(linhas.reduce((t, l) => t + Number(l.valor), 0)),
      porProjeto: somar((l) => l.projeto),
      porContrato: somar((l) => l.contrato ?? "sem contrato").map(({ nome, valor }) => ({ nome, valor })),
      porFase: somar((l) => l.fase ?? "sem fase (custo do projeto)").map(({ nome, valor }) => ({ nome, valor })),
      porTipoDeCusto: somar((l) => tipoCustoDoLancamento(l.tipoCusto, conta?.tipoCusto) ?? "não se aplica").map(({ nome, valor }) => ({ tipo: nome, valor })),
    },
  };
}
