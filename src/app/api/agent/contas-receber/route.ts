import { handleAgent } from "@/lib/agent/http";
import { requireScreen } from "@/lib/agent/auth";
import { getContasReceber, getReceivables } from "@/lib/queries";
import { casaNome, empacotar, limiteDe } from "@/lib/agent/lista";
import { intervalo } from "@/lib/agent/datas";
import { brl, dateBR, dateInRange, ymd } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recebíveis previstos — a tela "Contas a Receber". É PREVISÃO, não extrato:
 * mostra o que está a receber, não o que caiu na conta.
 *
 * Growth Ambiental: entram as contas a receber em aberto (faturas dos
 * contratos e lançamentos), pelo SALDO, e — só nos dados antigos — as
 * parcelas de venda de unidades (`getReceivables`). O campo `unidade` da
 * resposta é contrato da API (não renomear): nulo nas contas a receber.
 *
 * `?projeto=PROJETO 28` responde "quanto tem a receber do PROJETO 28".
 */
export async function GET(req: Request) {
  return handleAgent(req, { rota: "contas-receber" }, async (id, url) => {
    requireScreen(id, "contasreceber");

    const [parcelas, contas] = await Promise.all([getReceivables(id.tenantId), getContasReceber(id.tenantId)]);
    const todos = [
      ...contas
        .filter((c) => c.status !== "Recebido" && c.status !== "Cancelada" && c.valor - c.valorRecebido > 0.005 && !!c.vencimento)
        .map((c) => ({
          unitCode: c.unitCode,
          projectName: c.projectName,
          clienteNome: c.clienteNome,
          descricao: c.descricao ?? c.tipo,
          dia: c.vencimento!,
          valor: Math.round((c.valor - c.valorRecebido) * 100) / 100,
          status: c.status,
        })),
      ...parcelas,
    ];
    const { de, ate } = intervalo(url);
    const projeto = url.searchParams.get("projeto");

    const filtrados = todos
      .filter((r) => casaNome(r.projectName, projeto))
      .filter((r) => (!de && !ate ? true : dateInRange(r.dia, de, ate)))
      .map((r) => ({
        unidade: r.unitCode,
        projeto: r.projectName,
        cliente: r.clienteNome,
        descricao: r.descricao,
        vencimento: dateBR(r.dia),
        valor: r.valor,
        valorBRL: brl(r.valor),
        status: r.status,
      }))
      .sort((a, b) => (ymd(a.vencimento) ?? 0) - (ymd(b.vencimento) ?? 0));

    return {
      empresa: id.tenantName,
      natureza: "previsao",
      filtro: {
        de: de ? dateBR(de) : null,
        ate: ate ? dateBR(ate) : null,
        projeto: projeto ?? "todos",
      },
      ...empacotar(filtrados, { limite: limiteDe(url), valor: (r) => r.valor }),
    };
  });
}
