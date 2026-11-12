/**
 * MEDIÇÃO do Prompt AT §5.5 (Revisão 4) — SOMENTE LEITURA.
 *
 * Lista as contas a receber criadas a partir do extrato (`origem_cash_entry_id`
 * preenchido) cujo valor e data batem com uma parcela de venda da MESMA obra.
 * São os prováveis casos de receita dobrada: a parcela continua no plano da
 * unidade e a conta nova soma de novo na DRE, no Fluxo e no Dashboard.
 *
 * Decisão sobre os casos (um a um ou por regra) é a BAT-4 do dono: este script
 * não muda nada. A conexão abre com `default_transaction_read_only = on` e o
 * script para se não estiver.
 *
 *   DATABASE_URL=postgres://... npx tsx scripts/medicao-at-receita-dobrada.ts > medicao-receita-dobrada.md
 *
 * Saída sem nome de comprador: a unidade e a parcela bastam para achar o caso.
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não definido.");
  process.exit(1);
}
const client = postgres(url, { prepare: false, max: 2, connection: { default_transaction_read_only: "on" } as Record<string, string> });
(globalThis as unknown as { client: unknown }).client = client;

const TOLERANCIA_DIAS = 10;

async function main() {
  const [{ default_transaction_read_only: modo }] = await client`show default_transaction_read_only`;
  if (modo !== "on") throw new Error("A conexão não está em modo somente leitura; nada foi lido.");
  const { expandUnitReceivables } = await import("../src/lib/calc/receivables");
  const contas = await client<{ empresa: string; tenant_id: string; project_id: string; obra: string; id: string; valor: string; vencimento: string | null; data_recebimento: string | null; criada: Date }[]>`
    select t.name as empresa, cr.tenant_id, cr.project_id, p.name as obra, cr.id, cr.valor, cr.vencimento, cr.data_recebimento, cr.created_at as criada
    from conta_receber cr join tenant t on t.id = cr.tenant_id join project p on p.id = cr.project_id
    where cr.origem_cash_entry_id is not null and cr.status <> 'Cancelada'
    order by t.name, p.name, cr.created_at`;
  const unidades = await client<{ project_id: string; code: string; status: string; payment_plan: unknown }[]>`
    select v.project_id, u.code, u.status, u.payment_plan
    from unit u join version v on v.id = u.version_id
    where v.kind = 'atual' and u.status = 'Vendido'`;
  const serial = (mdy: string | null) => (mdy && /^\d{2}\/\d{2}\/\d{4}$/.test(mdy) ? Math.floor(Date.UTC(+mdy.slice(6), +mdy.slice(0, 2) - 1, +mdy.slice(3, 5)) / 86_400_000) : null);
  const out: string[] = [`# Medição AT §5.5 — contas a receber do extrato que batem com parcela de venda (gerada em ${new Date().toLocaleString("pt-BR")})`, ""];
  out.push(`Conexão somente leitura. Critério: mesma obra, mesmo valor (centavos) e data a até ${TOLERANCIA_DIAS} dias do vencimento da parcela. Permuta e financiamento ficam de fora.`, "");
  out.push(`Contas a receber criadas do extrato: ${contas.length}.`, "");
  out.push("| Empresa | Obra | Conta (id) | Valor | Data | Unidade | Parcela | Vencimento da parcela |", "| --- | --- | --- | ---: | --- | --- | --- | --- |");
  let casos = 0;
  for (const c of contas) {
    const data = c.data_recebimento ?? c.vencimento;
    const dc = serial(data);
    const cents = Math.round(Number(c.valor) * 100);
    for (const u of unidades.filter((x) => x.project_id === c.project_id)) {
      for (const p of expandUnitReceivables(u.payment_plan as never, u.status as never)) {
        if (p.secao === "Permuta" || p.secao === "Banco") continue;
        const dp = serial(p.dia);
        if (Math.round(p.valor * 100) !== cents || dc == null || dp == null || Math.abs(dc - dp) > TOLERANCIA_DIAS) continue;
        casos++;
        out.push(`| ${c.empresa} | ${c.obra} | ${c.id} | ${Number(c.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} | ${data ?? "—"} | ${u.code} | ${p.chave} | ${p.dia} |`);
      }
    }
  }
  out.push("", `Prováveis casos de receita dobrada: ${casos}. Decisão: BAT-4 (um a um ou por regra).`);
  console.log(out.join("\n"));
}

main()
  .then(() => client.end())
  .catch(async (e) => {
    console.error("Falha na medição:", e instanceof Error ? e.message : e);
    await client.end();
    process.exit(1);
  });
