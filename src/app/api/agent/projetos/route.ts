import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { handleAgent } from "@/lib/agent/http";
import { requireScreen } from "@/lib/agent/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Projetos do tenant. É a rota de tradução: a pessoa fala "PROJETO 28" e
 * as demais consultas precisam do nome exato (ou do id). Sem ela a Cris
 * chutaria nomes.
 */
export async function GET(req: Request) {
  return handleAgent(req, { rota: "projetos", auditar: false }, async (id) => {
    requireScreen(id, "projeto");

    const rows = await db
      .select({
        id: schema.projects.id,
        nome: schema.projects.name,
        tipo: schema.projects.kind,
        status: schema.projects.status,
        inicio: schema.projects.startDate,
        fim: schema.projects.endDate,
      })
      .from(schema.projects)
      .where(eq(schema.projects.tenantId, id.tenantId))
      .orderBy(asc(schema.projects.name));

    return { empresa: id.tenantName, total: rows.length, itens: rows };
  });
}
