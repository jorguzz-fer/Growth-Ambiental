import { db, schema } from "@/lib/db";
import { MODALIDADES_INICIAIS } from "@/lib/contrato-regras";

type Exec = Pick<typeof db, "insert">;

/**
 * Semeia as modalidades iniciais de uma empresa (provisionamento e seed). Não
 * é server action: só o servidor chama, com o tenant que ele mesmo criou.
 * Idempotente (o nome é único por empresa).
 */
export async function garantirModalidades(tenantId: string, exec: Exec = db): Promise<void> {
  await exec
    .insert(schema.contratoModalidades)
    .values(MODALIDADES_INICIAIS.map((nome, i) => ({ tenantId, nome, ordem: i + 1 })))
    .onConflictDoNothing();
}
