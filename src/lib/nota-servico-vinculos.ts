import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/** 0082 — contratos dos projetos que a pessoa vê e as medições APROVADAS deles, para o rascunho da nota. */
export async function vinculosParaANota(tenantId: string, projectIds: readonly string[]) {
  if (!projectIds.length) return { contratos: [], medicoes: [] };
  const contratos = await db
    .select({ id: schema.contratos.id, projectId: schema.contratoProjetos.projectId, codigo: schema.contratos.codigo, titulo: schema.contratos.titulo })
    .from(schema.contratoProjetos)
    .innerJoin(schema.contratos, eq(schema.contratoProjetos.contratoId, schema.contratos.id))
    .where(and(eq(schema.contratoProjetos.tenantId, tenantId), inArray(schema.contratoProjetos.projectId, [...projectIds])));
  const ids = [...new Set(contratos.map((c) => c.id))];
  const medicoes = ids.length
    ? await db
        .select({ id: schema.contratoMedicoes.id, contratoId: schema.contratoMedicoes.contratoId, numero: schema.contratoMedicoes.numero, competencia: schema.contratoMedicoes.competencia, valor: schema.contratoMedicoes.valor })
        .from(schema.contratoMedicoes)
        .where(and(eq(schema.contratoMedicoes.tenantId, tenantId), inArray(schema.contratoMedicoes.contratoId, ids), eq(schema.contratoMedicoes.status, "aprovada")))
    : [];
  const brl = (v: string) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return {
    contratos: contratos.map((c) => ({ id: c.id, projectId: c.projectId, rotulo: `${c.codigo} · ${c.titulo}` })),
    medicoes: medicoes.map((m) => ({ id: m.id, contratoId: m.contratoId, rotulo: `Medição ${m.numero ?? "—"} · ${m.competencia} · ${brl(m.valor)}` })),
  };
}
