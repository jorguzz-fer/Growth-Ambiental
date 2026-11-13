import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { TenantContext } from "@/lib/context";

/** As listas do formulário de contrato (clientes, modalidades, projetos, principais), da empresa da sessão. */
export async function opcoesDoFormulario(ctx: TenantContext) {
  const tenantId = ctx.tenant.id;
  const [clientes, modalidades, principais] = await Promise.all([
    db.select({ id: schema.clientes.id, nome: schema.clientes.nomeCompleto }).from(schema.clientes).where(eq(schema.clientes.tenantId, tenantId)).orderBy(schema.clientes.nomeCompleto),
    db.select({ id: schema.contratoModalidades.id, nome: schema.contratoModalidades.nome, ativo: schema.contratoModalidades.ativo }).from(schema.contratoModalidades).where(eq(schema.contratoModalidades.tenantId, tenantId)).orderBy(schema.contratoModalidades.ordem),
    db
      .select({ id: schema.contratos.id, codigo: schema.contratos.codigo, titulo: schema.contratos.titulo })
      .from(schema.contratos)
      .where(and(eq(schema.contratos.tenantId, tenantId), eq(schema.contratos.tipo, "contrato"), ne(schema.contratos.status, "cancelado"), ne(schema.contratos.status, "encerrado")))
      .orderBy(schema.contratos.codigo),
  ]);
  return { clientes, modalidades, principais, projetos: ctx.projects.map((p) => ({ id: p.id, nome: p.name })) };
}
