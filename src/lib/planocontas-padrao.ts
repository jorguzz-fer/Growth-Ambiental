import { db, schema } from "@/lib/db";
import { gruposDoPlano, linhasDoPlano, PLANO_AMBIENTAL, VERSAO_PLANO_PADRAO, type GrupoPadrao } from "@/lib/calc/plano-ambiental";

type Exec = Pick<typeof db, "select" | "insert" | "update">;

/**
 * Instala o plano de contas padrão numa empresa NOVA (provisionamento e seed):
 * grupos, subgrupos e contas, cada empresa com a sua cópia independente.
 * Não cria projeto nem lançamento. Mudar o padrão depois não mexe nela.
 */
export async function instalarPlanoPadrao(tenantId: string, exec: Exec = db, plano: readonly GrupoPadrao[] = PLANO_AMBIENTAL) {
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
  // As chaves da empresa nova (inclusive as do plano) são ligadas por
  // `ligarChavesDeEmpresaNova` (GA-1), no provisionamento e no seed.
  return { grupos: grupos.length, contas: contas.length, versao: VERSAO_PLANO_PADRAO };
}
