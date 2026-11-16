import { db, schema } from "@/lib/db";

/** Quem executa o insert: o `db` ou a transação do chamador (AK 1.3). */
type Executor = Pick<typeof db, "insert">;

/**
 * Registra uma entrada no log de auditoria (append-only). Chamado pelas Server
 * Actions após mutações. Ver docs/historico-construction/SPEC.md §12.7.
 */
export async function logAudit(entry: {
  tenantId: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: unknown;
}, exec: Executor = db): Promise<void> {
  await exec.insert(schema.auditLog).values({
    tenantId: entry.tenantId,
    userId: entry.userId ?? null,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    meta: (entry.meta ?? null) as object | null,
  });
}
