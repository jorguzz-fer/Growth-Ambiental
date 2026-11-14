import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { CHAVES_EMPRESA_NOVA, LIGADA_NA_CRIACAO } from "@/lib/chaves";

type Exec = Pick<typeof db, "select" | "insert">;

/**
 * GA-1 — liga as chaves de empresa nova (`CHAVES_EMPRESA_NOVA`) na criação da
 * empresa, com `alterada_por = "criação da empresa"`. Usado pelo
 * provisionamento (na mesma transação) e pelo seed de demonstração. Nunca é
 * chamado para empresa existente: não mexe em chave já gravada.
 */
export async function ligarChavesDeEmpresaNova(tenantId: string, exec: Exec = db) {
  await exec
    .insert(schema.tenantFlags)
    .values(CHAVES_EMPRESA_NOVA.map((chave) => ({ tenantId, chave, ligada: true, alteradaPor: LIGADA_NA_CRIACAO })))
    .onConflictDoNothing();
}

/**
 * A empresa tem dados de incorporação? Pelo menos uma unidade, permuta ou
 * liberação de financiamento (`reembolso`). As linhas de `incc_rate` NÃO
 * contam: o provisionamento as cria em toda empresa nova.
 */
export async function temDadosDeIncorporacao(tenantId: string, exec: Pick<typeof db, "select"> = db): Promise<boolean> {
  for (const tabela of [schema.units, schema.permutas, schema.reembolsos] as const) {
    const [uma] = await exec.select({ id: tabela.id }).from(tabela).where(and(eq(tabela.tenantId, tenantId))).limit(1);
    if (uma) return true;
  }
  return false;
}
