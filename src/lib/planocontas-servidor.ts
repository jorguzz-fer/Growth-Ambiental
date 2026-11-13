import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { recusaDaContaDoLancamento, type ContaDoCadastro } from "@/lib/planocontas-regras";
import { planilhaDoPlanoPadrao, type GrupoDaPlanilha } from "@/lib/xlsx/growth-template";

type Exec = Pick<typeof db, "select">;

/** Contas e grupos do plano DESTA empresa (só código, situação e natureza). */
export async function cadastroDoPlano(tenantId: string, exec: Exec = db) {
  const [contas, grupos] = await Promise.all([
    exec.select({ code: schema.chartAccounts.code, ativo: schema.chartAccounts.ativo, natureza: schema.chartAccounts.natureza, groupCode: schema.chartAccounts.groupCode }).from(schema.chartAccounts).where(eq(schema.chartAccounts.tenantId, tenantId)),
    exec.select({ code: schema.chartGroups.code }).from(schema.chartGroups).where(eq(schema.chartGroups.tenantId, tenantId)),
  ]);
  return {
    contas: new Map<string, ContaDoCadastro>(contas.map((c) => [c.code, { code: c.code, ativo: c.ativo, natureza: c.natureza }])),
    grupos: new Set([...grupos.map((g) => g.code), ...contas.map((c) => c.groupCode)]),
  };
}

/**
 * 0079 — a conta de um lançamento novo (ou trocada numa edição) precisa
 * existir no plano da empresa, estar ativa e não ser grupo. Vale no
 * SERVIDOR (a Server Action é chamável direto). Empresa sem nenhuma conta
 * cadastrada (base antiga ou de teste) não é bloqueada: não há plano a seguir.
 */
export async function validarContaDoLancamento(tenantId: string, code: string | null | undefined, anterior?: string | null, exec: Exec = db, natureza?: "despesa" | "receita"): Promise<string | null> {
  const c = (code ?? "").trim();
  if (!c || (anterior && c === anterior)) return null;
  const cad = await cadastroDoPlano(tenantId, exec);
  if (cad.contas.size === 0) return null;
  return recusaDaContaDoLancamento(c, cad.contas, cad.grupos, { anterior, natureza });
}

export interface UsoDoCodigo {
  /** despesas (todas as versões, inclusive canceladas: o histórico aponta o código). */
  despesas: number;
  /** soma das despesas da versão Atual, não canceladas. */
  valorAtual: number;
  /** linhas de Orçamento/Previsão/seleção com o código como chave. */
  orcamento: number;
  /** medições lançadas no grupo. */
  medicoes: number;
  /** versões congeladas com lançamento no código. */
  versoesCongeladas: number;
}
const vazio = (): UsoDoCodigo => ({ despesas: 0, valorAtual: 0, orcamento: 0, medicoes: 0, versoesCongeladas: 0 });

/**
 * Onde cada código (de conta ou de grupo) é referenciado. É o que decide se
 * o código pode mudar, se a conta pode ser excluída e o tamanho do impacto
 * de uma reclassificação. Sempre filtrado pela empresa.
 */
export async function usoDosCodigos(tenantId: string, codigos: readonly string[], exec: Exec = db): Promise<Map<string, UsoDoCodigo>> {
  const out = new Map<string, UsoDoCodigo>(codigos.map((c) => [c, vazio()]));
  if (!codigos.length) return out;
  const lista = [...codigos];
  const [desp, bl, ba, bs, med] = await Promise.all([
    exec
      .select({
        code: schema.despesas.contaCef,
        n: sql<number>`count(*)::int`,
        valor: sql<string>`coalesce(sum(case when ${schema.versions.kind} = 'atual' and ${schema.despesas.cancelado} = false then ${schema.despesas.valor} else 0 end), 0)`,
        travadas: sql<number>`count(distinct case when ${schema.versions.locked} then ${schema.versions.id} end)::int`,
      })
      .from(schema.despesas)
      .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
      .where(and(eq(schema.despesas.tenantId, tenantId), inArray(schema.despesas.contaCef, lista)))
      .groupBy(schema.despesas.contaCef),
    exec.select({ code: schema.budgetLines.rowKey, n: sql<number>`count(*)::int` }).from(schema.budgetLines).where(and(eq(schema.budgetLines.tenantId, tenantId), inArray(schema.budgetLines.rowKey, lista))).groupBy(schema.budgetLines.rowKey),
    exec.select({ code: schema.budgetAccounts.rowKey, n: sql<number>`count(*)::int` }).from(schema.budgetAccounts).where(and(eq(schema.budgetAccounts.tenantId, tenantId), inArray(schema.budgetAccounts.rowKey, lista))).groupBy(schema.budgetAccounts.rowKey),
    exec.select({ code: schema.budgetSelecoes.rowKey, n: sql<number>`count(*)::int` }).from(schema.budgetSelecoes).where(and(eq(schema.budgetSelecoes.tenantId, tenantId), inArray(schema.budgetSelecoes.rowKey, lista))).groupBy(schema.budgetSelecoes.rowKey),
    exec.select({ code: schema.medicoes.grupoCode, n: sql<number>`count(*)::int` }).from(schema.medicoes).where(and(eq(schema.medicoes.tenantId, tenantId), inArray(schema.medicoes.grupoCode, lista))).groupBy(schema.medicoes.grupoCode),
  ]);
  for (const d of desp) if (d.code) Object.assign(out.get(d.code)!, { despesas: d.n, valorAtual: Math.round(Number(d.valor) * 100) / 100, versoesCongeladas: d.travadas });
  for (const r of [...bl, ...ba, ...bs]) out.get(r.code)!.orcamento += r.n;
  for (const r of med) out.get(r.code)!.medicoes += r.n;
  return out;
}
export const usado = (u: UsoDoCodigo | undefined) => !!u && u.despesas + u.orcamento + u.medicoes > 0;

/**
 * 0079 — o plano DESTA empresa no formato da planilha de lançamentos: contas
 * ativas de despesa, agrupadas pelo grupo, na ordem do cadastro. Empresa sem
 * conta cadastrada recebe o plano padrão (o mesmo que a validação aceita).
 */
export async function planilhaDaEmpresa(tenantId: string, exec: Exec = db): Promise<GrupoDaPlanilha[]> {
  const contas = await exec
    .select({ code: schema.chartAccounts.code, name: schema.chartAccounts.name, groupCode: schema.chartAccounts.groupCode, groupName: schema.chartAccounts.groupName, ativo: schema.chartAccounts.ativo, natureza: schema.chartAccounts.natureza })
    .from(schema.chartAccounts)
    .where(eq(schema.chartAccounts.tenantId, tenantId))
    .orderBy(schema.chartAccounts.groupCode, schema.chartAccounts.ordem, schema.chartAccounts.code);
  if (contas.length === 0) return planilhaDoPlanoPadrao();
  const porGrupo = new Map<string, GrupoDaPlanilha>();
  for (const c of contas) {
    if (!c.ativo || c.natureza === "receita") continue;
    const g = porGrupo.get(c.groupCode) ?? { grupo: `${c.groupCode} ${c.groupName}`, contas: [] };
    g.contas.push({ code: c.code, nome: c.name });
    porGrupo.set(c.groupCode, g);
  }
  const ordem = new Intl.Collator("pt-BR", { numeric: true });
  return [...porGrupo.entries()].sort(([a], [b]) => ordem.compare(a, b)).map(([, g]) => g);
}
