import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { chaveLigada } from "@/lib/chaves-tenant";
import { avisoDeVersoesNaoAprovadas, CHAVE_RASCUNHO, entraNosRelatorios, type VersoesForaDosRelatorios } from "@/lib/situacao-versao";

/**
 * GA-1 §3 — quantos projetos têm o Orçamento ou a Previsão que os relatórios
 * usariam (a primeira versão do tipo, como `versionIdOfKind`) LANÇADO e fora
 * dos relatórios por não estar Aprovado. Versão sem nenhum lançamento não
 * conta: ela não tiraria número nenhum.
 */
export async function versoesForaDosRelatorios(tenantId: string, projectIds: readonly string[]): Promise<VersoesForaDosRelatorios> {
  const fora = { orcamento: 0, previsao: 0 };
  if (!projectIds.length || !(await chaveLigada(tenantId, CHAVE_RASCUNHO))) return fora;
  const versoes = await db
    .select({ id: schema.versions.id, projectId: schema.versions.projectId, kind: schema.versions.kind, status: schema.versions.status })
    .from(schema.versions)
    .where(and(eq(schema.versions.tenantId, tenantId), inArray(schema.versions.projectId, [...projectIds]), inArray(schema.versions.kind, ["budget", "forecast"])))
    .orderBy(asc(schema.versions.createdAt));
  const usadas = new Map<string, (typeof versoes)[number]>();
  for (const v of versoes) if (!usadas.has(`${v.projectId}|${v.kind}`)) usadas.set(`${v.projectId}|${v.kind}`, v);
  const candidatas = [...usadas.values()].filter((v) => !entraNosRelatorios(v, true));
  if (!candidatas.length) return fora;
  const comLancamento = new Set(
    (await db.selectDistinct({ versionId: schema.budgetLines.versionId }).from(schema.budgetLines).where(inArray(schema.budgetLines.versionId, candidatas.map((v) => v.id)))).map((x) => x.versionId),
  );
  for (const v of candidatas) if (comLancamento.has(v.id)) fora[v.kind === "budget" ? "orcamento" : "previsao"]++;
  return fora;
}

/** O aviso pronto para a tela (null quando nada fica de fora). */
export async function avisoDeNaoAprovadas(tenantId: string, projectIds: readonly string[]) {
  return avisoDeVersoesNaoAprovadas(await versoesForaDosRelatorios(tenantId, projectIds), await chaveLigada(tenantId, CHAVE_RASCUNHO));
}
