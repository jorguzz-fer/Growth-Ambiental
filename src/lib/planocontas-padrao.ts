import { db, schema } from "@/lib/db";
import { gruposDoPlano, linhasDoPlano, PLANO_AMBIENTAL, VERSAO_PLANO_PADRAO, type GrupoPadrao } from "@/lib/calc/plano-ambiental";

type Exec = Pick<typeof db, "select" | "insert" | "update">;

/**
 * Chaves que empresa NOVA já recebe ligadas: sem histórico, não há número
 * de relatório a preservar, e o plano padrão traz a categoria de cada conta.
 * Empresas existentes seguem com as chaves como estão (desligadas = hoje).
 */
export const CHAVES_DO_PLANO_PADRAO = ["despesa_categoria_do_plano", "orcamento_categoria_do_plano"] as const;

/**
 * Instala o plano de contas padrão numa empresa NOVA (provisionamento e seed):
 * grupos, subgrupos e contas, cada empresa com a sua cópia independente.
 * Não cria projeto nem lançamento. Mudar o padrão depois não mexe nela.
 */
export async function instalarPlanoPadrao(tenantId: string, exec: Exec = db, plano: readonly GrupoPadrao[] = PLANO_AMBIENTAL, quem = "provisionamento") {
  const grupos = gruposDoPlano(tenantId, plano);
  const ids = new Map<string, string>();
  for (const g of grupos.filter((x) => !x.parentCode)) {
    const [r] = await exec.insert(schema.chartGroups).values({ tenantId, code: g.code, name: g.name, descricao: g.descricao, kind: g.kind, ordem: g.ordem }).returning({ id: schema.chartGroups.id });
    ids.set(g.code, r.id);
  }
  for (const g of grupos.filter((x) => x.parentCode)) {
    const [r] = await exec.insert(schema.chartGroups).values({ tenantId, code: g.code, name: g.name, descricao: g.descricao, kind: g.kind, ordem: g.ordem, parentId: ids.get(g.parentCode!)! }).returning({ id: schema.chartGroups.id });
    ids.set(g.code, r.id);
  }
  const contas = linhasDoPlano(tenantId, plano).map((c) => ({ ...c, dreCategory: c.dreCategory }));
  await exec.insert(schema.chartAccounts).values(contas);
  await exec
    .insert(schema.tenantFlags)
    .values(CHAVES_DO_PLANO_PADRAO.map((chave) => ({ tenantId, chave, ligada: true, alteradaPor: quem })))
    .onConflictDoNothing();
  return { grupos: grupos.length, contas: contas.length, versao: VERSAO_PLANO_PADRAO };
}
