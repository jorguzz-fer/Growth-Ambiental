import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/** Maior sufixo numérico já usado em `despesa.numDoc` (semente da sequência). */
async function maxExistingDespesaNumber(tenantId: string): Promise<number> {
  const rows = await db
    .select({ n: schema.despesas.numDoc })
    .from(schema.despesas)
    .where(eq(schema.despesas.tenantId, tenantId));
  let max = 0;
  for (const r of rows) {
    const m = r.n?.match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

/**
 * Reserva o próximo número da sequência de Despesas de forma ATÔMICA no banco.
 * A linha da sequência é criada (semeada pelo maior número existente) na
 * primeira vez; a reserva usa `UPDATE ... RETURNING` (statement único) dentro
 * de uma transação, então dois lançamentos simultâneos recebem números
 * distintos — nunca duplicados, nunca reutilizando números excluídos.
 */
export async function reserveDespesaNumber(tenantId: string): Promise<string> {
  return db.transaction(async (tx) => {
    const [seq] = await tx
      .select()
      .from(schema.numberSequences)
      .where(
        and(
          eq(schema.numberSequences.tenantId, tenantId),
          eq(schema.numberSequences.entity, "despesa"),
        ),
      )
      .limit(1);

    if (!seq) {
      const start = (await maxExistingDespesaNumber(tenantId)) + 1;
      await tx
        .insert(schema.numberSequences)
        .values({ tenantId, entity: "despesa", nextNumber: start })
        .onConflictDoNothing();
    }

    const [updated] = await tx
      .update(schema.numberSequences)
      .set({
        nextNumber: sql`${schema.numberSequences.nextNumber} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.numberSequences.tenantId, tenantId),
          eq(schema.numberSequences.entity, "despesa"),
        ),
      )
      .returning();

    const used = updated.nextNumber - 1;
    const num = String(used).padStart(updated.digits, "0");
    return updated.usePrefix && updated.prefix ? `${updated.prefix}-${num}` : num;
  });
}

/** Formata um preview do próximo número sem reservar (para a tela de config). */
export function previewNumber(
  prefix: string,
  usePrefix: boolean,
  digits: number,
  next: number,
): string {
  const num = String(next).padStart(digits, "0");
  return usePrefix && prefix ? `${prefix}-${num}` : num;
}

export interface FormatoNumero {
  prefix: string;
  usePrefix: boolean;
  digits: number;
}

export interface OcupacaoFaixa {
  /** Maior número já emitido NESTE formato (null = nenhum). */
  maiorEmitido: number | null;
  /** O próprio "próximo número" já foi emitido. */
  proximoOcupado: boolean;
  /** Quantos números >= próximo já estão em uso neste formato. */
  emUsoAFrente: number;
}

/**
 * Onde o contador está em relação ao que já foi emitido (Prompt AF, Parte 2).
 *
 * Só conta o número que o contador PODE reproduzir: aquele cujo texto é
 * exatamente `previewNumber(formato, n)`. É a mesma igualdade que o índice
 * único (0040) aplica — `202606` ou `8441-1` nunca colidem com `PED-000432`,
 * então não servem de régua. Medir pelo "maior sufixo de qualquer formato"
 * obrigaria a BMV, que tem um número digitado `202606`, a pular o contador
 * para 202607.
 */
export function analisarOcupacao(
  numDocs: (string | null)[],
  f: FormatoNumero,
  proximo: number,
): OcupacaoFaixa {
  let maior: number | null = null;
  let emUsoAFrente = 0;
  let proximoOcupado = false;
  const vistos = new Set<number>();
  for (const doc of numDocs) {
    if (!doc) continue;
    const m = doc.match(/(\d+)$/);
    if (!m) continue;
    const n = Number(m[1]);
    if (!Number.isSafeInteger(n)) continue;
    if (previewNumber(f.prefix, f.usePrefix, f.digits, n) !== doc) continue;
    if (vistos.has(n)) continue;
    vistos.add(n);
    if (maior === null || n > maior) maior = n;
    if (n >= proximo) emUsoAFrente++;
    if (n === proximo) proximoOcupado = true;
  }
  return { maiorEmitido: maior, proximoOcupado, emUsoAFrente };
}

/** Lê os números do tenant e mede a ocupação da faixa do contador. */
export async function ocupacaoDaFaixa(
  tenantId: string,
  f: FormatoNumero,
  proximo: number,
): Promise<OcupacaoFaixa> {
  const rows = await db
    .select({ n: schema.despesas.numDoc })
    .from(schema.despesas)
    .where(eq(schema.despesas.tenantId, tenantId));
  return analisarOcupacao(
    rows.map((r) => r.n),
    f,
    proximo,
  );
}

/** Nome do índice único de número de despesa (migração 0040). */
export const INDICE_NUM_DOC = "despesa_tenant_num_doc_uq";

/**
 * Colisão no índice único vira mensagem legível (Prompt AF, 1.4). Devolve null
 * quando o erro não é essa colisão — o chamador relança o original.
 */
export function mensagemColisaoNumDoc(e: unknown, numDoc: string | null): string | null {
  const texto = e instanceof Error ? `${e.message} ${String((e as { cause?: unknown }).cause ?? "")}` : String(e);
  const codigo = (e as { code?: string; cause?: { code?: string } })?.code
    ?? (e as { cause?: { code?: string } })?.cause?.code;
  if (!texto.includes(INDICE_NUM_DOC) && !(codigo === "23505" && /num_doc/.test(texto))) return null;
  return `O número ${numDoc ?? ""} já foi usado em outra despesa desta empresa. Nada foi gravado. Confira o "próximo número" na tela Numeração de Despesas — ele provavelmente foi recuado para uma faixa já emitida.`;
}

/**
 * Growth Ambiental — reserva o próximo número de uma entidade qualquer
 * (ex.: "contrato" → "CT-000001"), com a mesma garantia da numeração das
 * despesas: `UPDATE ... RETURNING` em transação, sem repetir nem reaproveitar.
 * A sequência nasce em 1 na primeira reserva (entidade nova não tem histórico).
 */
export async function reservarNumero(tenantId: string, entity: string, prefixo: string): Promise<string> {
  return db.transaction(async (tx) => {
    await tx.insert(schema.numberSequences).values({ tenantId, entity, prefix: prefixo, nextNumber: 1 }).onConflictDoNothing();
    const [u] = await tx
      .update(schema.numberSequences)
      .set({ nextNumber: sql`${schema.numberSequences.nextNumber} + 1`, updatedAt: new Date() })
      .where(and(eq(schema.numberSequences.tenantId, tenantId), eq(schema.numberSequences.entity, entity)))
      .returning();
    const num = String(u.nextNumber - 1).padStart(u.digits, "0");
    return u.usePrefix && u.prefix ? `${u.prefix}-${num}` : num;
  });
}
