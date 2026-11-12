/**
 * Prompt AT §1-B.5 — registra (uma vez) o webhook da Pluggy que avisa o app.
 *
 * A Pluggy manda TODOS os avisos (evento "all") para
 * `${NEXT_PUBLIC_APP_URL}/api/openfinance/webhook`, com o cabeçalho
 * `x-webhook-secret: ${PLUGGY_WEBHOOK_SECRET}`. A rota recusa (401) o que
 * chega sem ele. Endpoint e campos conferidos no SDK oficial (`createWebhook`:
 * POST /webhooks {event, url, headers}).
 *
 *   PLUGGY_CLIENT_ID=... PLUGGY_CLIENT_SECRET=... PLUGGY_WEBHOOK_SECRET=... \
 *   NEXT_PUBLIC_APP_URL=https://app.growthtools.com.br npx tsx scripts/openfinance-webhook.ts
 *
 * Lista os webhooks que já existem antes de criar; não cria um segundo para a
 * mesma URL.
 */
import { authenticate } from "../src/lib/openfinance/pluggy";

async function main() {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  const segredo = process.env.PLUGGY_WEBHOOK_SECRET;
  if (!base || !segredo) throw new Error("Defina NEXT_PUBLIC_APP_URL e PLUGGY_WEBHOOK_SECRET.");
  const url = `${base.replace(/\/+$/, "")}/api/openfinance/webhook`;
  const apiKey = await authenticate();
  const h = { "X-API-KEY": apiKey, "Content-Type": "application/json" };
  const lista = (await (await fetch("https://api.pluggy.ai/webhooks", { headers: h })).json()) as { results?: { id: string; url: string; event: string }[] };
  const ja = (lista.results ?? []).find((w) => w.url === url);
  if (ja) {
    console.log(`Já existe o webhook ${ja.id} (${ja.event}) para ${url}. Nada criado.`);
    return;
  }
  const res = await fetch("https://api.pluggy.ai/webhooks", { method: "POST", headers: h, body: JSON.stringify({ event: "all", url, headers: { "x-webhook-secret": segredo } }) });
  if (!res.ok) throw new Error(`A Pluggy recusou o webhook: ${res.status} ${await res.text()}`);
  const w = (await res.json()) as { id: string };
  console.log(`Webhook ${w.id} criado para ${url}.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
