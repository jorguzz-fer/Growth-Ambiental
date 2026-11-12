import { after } from "next/server";
import { db, schema } from "@/lib/db";
import { segredoConfere } from "@/lib/openfinance/segredo";
import { processarEvento } from "@/lib/openfinance/sincronizar";
import { hojeISO } from "@/lib/despesa-status";

/**
 * Prompt AT §1-B.5 — avisos da Pluggy. Protegido por um cabeçalho secreto
 * (`x-webhook-secret`, o valor de PLUGGY_WEBHOOK_SECRET), configurado no
 * webhook da Pluggy (`scripts/openfinance-webhook.ts`). Sem o cabeçalho certo:
 * 401 e nada gravado.
 *
 * Responde rápido: grava o aviso (único pelo `eventId`: o mesmo aviso duas
 * vezes é processado uma vez) e processa DEPOIS da resposta (`after`).
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  if (!segredoConfere(req.headers.get("x-webhook-secret"), process.env.PLUGGY_WEBHOOK_SECRET)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  let payload: { event?: unknown; eventId?: unknown; itemId?: unknown };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return Response.json({ ok: false, erro: "corpo inválido" }, { status: 400 });
  }
  if (typeof payload.event !== "string" || typeof payload.eventId !== "string") return Response.json({ ok: false, erro: "aviso sem event ou eventId" }, { status: 400 });
  const [novo] = await db
    .insert(schema.openfinanceEventos)
    .values({ eventId: payload.eventId, evento: payload.event, itemId: typeof payload.itemId === "string" ? payload.itemId : null, payload })
    .onConflictDoNothing()
    .returning({ id: schema.openfinanceEventos.id });
  if (novo) after(() => processarEvento(novo.id, { hojeISO: hojeISO() }));
  return Response.json({ ok: true, repetido: !novo });
}
