import { segredoConfere } from "@/lib/openfinance/segredo";
import { isPluggyConfigured } from "@/lib/openfinance/pluggy";
import { sincronizarTodos } from "@/lib/openfinance/sincronizar";
import { hojeISO } from "@/lib/despesa-status";

/**
 * Prompt AT §1-B.7 — a rede de segurança: sincronização uma vez por dia de
 * todas as conexões, caso algum aviso do webhook se perca. Mesmo código e
 * mesmas regras do webhook. Chamada pelo agendador do Coolify, com o cabeçalho
 * `x-cron-secret` (o valor de OPENFINANCE_CRON_SECRET). Ver
 * docs/OPENFINANCE-CONEXAO.md.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request): Promise<Response> {
  if (!segredoConfere(req.headers.get("x-cron-secret"), process.env.OPENFINANCE_CRON_SECRET)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  if (!isPluggyConfigured()) return Response.json({ ok: true, itens: 0, aviso: "Pluggy não configurada" });
  const r = await sincronizarTodos(hojeISO());
  return Response.json({ ok: true, ...r });
}
