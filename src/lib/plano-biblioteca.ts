import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { BIBLIOTECA_INICIAL, type FaseSugerida } from "@/lib/plano-regras";

type Exec = Pick<typeof db, "select" | "insert">;

/** Insere um modelo com fases, atividades e entregas sugeridas. Devolve o id do modelo. */
export async function inserirModelo(
  exec: Exec,
  tenantId: string,
  dados: { nome: string; descricao?: string | null; biblioteca?: boolean; modalidadeId?: string | null; ordem?: number; createdBy?: string | null },
  fases: readonly FaseSugerida[],
): Promise<string> {
  const [m] = await exec
    .insert(schema.planoModelos)
    .values({ tenantId, nome: dados.nome, descricao: dados.descricao ?? null, biblioteca: !!dados.biblioteca, modalidadeId: dados.modalidadeId ?? null, ordem: dados.ordem ?? 0, createdBy: dados.createdBy ?? null })
    .returning({ id: schema.planoModelos.id });
  for (const [i, f] of fases.entries()) {
    const [fase] = await exec.insert(schema.planoModeloFases).values({ tenantId, modeloId: m.id, nome: f.nome, ordem: i + 1 }).returning({ id: schema.planoModeloFases.id });
    const linhas = [
      ...f.atividades.map((nome, j) => ({ tenantId, faseId: fase.id, tipo: "atividade", nome, ordem: j + 1 })),
      ...(f.entregas ?? []).map((nome, j) => ({ tenantId, faseId: fase.id, tipo: "entrega", nome, ordem: 100 + j })),
    ];
    if (linhas.length) await exec.insert(schema.planoModeloAtividades).values(linhas);
  }
  return m.id;
}

/**
 * Garante a biblioteca padrão da empresa (provisionamento e seed). Não é
 * server action: só o servidor chama, com o tenant que ele mesmo criou.
 */
export async function garantirBiblioteca(tenantId: string, exec: Exec = db): Promise<void> {
  const [ja] = await exec.select({ id: schema.planoModelos.id }).from(schema.planoModelos).where(and(eq(schema.planoModelos.tenantId, tenantId), eq(schema.planoModelos.biblioteca, true))).limit(1);
  if (ja) return;
  await inserirModelo(exec, tenantId, { nome: "Biblioteca padrão", descricao: "Sugestões genéricas da empresa. Nenhuma fase é obrigatória.", biblioteca: true }, BIBLIOTECA_INICIAL);
}
