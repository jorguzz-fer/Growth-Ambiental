import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/** Apontamentos da empresa num período (competências), para a tela e os relatórios. */
export async function apontamentosDaEmpresa(tenantId: string, competencias: readonly string[] | null) {
  return db
    .select({
      a: schema.apontamentosHora,
      funcionario: schema.funcionarios.nome,
      prestador: schema.stakeholders.nome,
      projeto: schema.projects.name,
      contrato: schema.contratos.codigo,
      fase: schema.projetoFases.nome,
      atividade: schema.projetoAtividades.nome,
    })
    .from(schema.apontamentosHora)
    .leftJoin(schema.funcionarios, eq(schema.apontamentosHora.funcionarioId, schema.funcionarios.id))
    .leftJoin(schema.stakeholders, eq(schema.apontamentosHora.stakeholderId, schema.stakeholders.id))
    .leftJoin(schema.projects, eq(schema.apontamentosHora.projectId, schema.projects.id))
    .leftJoin(schema.contratos, eq(schema.apontamentosHora.contratoId, schema.contratos.id))
    .leftJoin(schema.projetoFases, eq(schema.apontamentosHora.projetoFaseId, schema.projetoFases.id))
    .leftJoin(schema.projetoAtividades, eq(schema.apontamentosHora.projetoAtividadeId, schema.projetoAtividades.id))
    .where(and(eq(schema.apontamentosHora.tenantId, tenantId), ...(competencias?.length ? [inArray(schema.apontamentosHora.competencia, [...competencias])] : [])))
    .orderBy(desc(schema.apontamentosHora.data), desc(schema.apontamentosHora.createdAt));
}
