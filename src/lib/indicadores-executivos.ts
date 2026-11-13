import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { listarContratos, relatorioDeReembolsos } from "@/lib/contratos-queries";
import { STATUS_FORA_DO_CONTRATADO, fatorDoContrato } from "@/lib/valor-contratado";
import { receitaReconhecida } from "@/lib/receita-servicos";
import { projecaoDoProjeto } from "@/lib/projecao-financeira-dados";
import { hojeMDY } from "@/lib/contrato-regras";

/**
 * Indicadores executivos do Dashboard (Growth Ambiental). Só o que tem fonte
 * confiável no sistema:
 *  · contratos: valor atualizado, aditivos eficazes, medido, faturado,
 *    receita reconhecida (regra atual: fatura pelo vencimento), recebido,
 *    a receber, saldo a medir — contratos dos projetos em tela, pela parte
 *    de cada projeto (`valor-contratado.ts`), sem dupla contagem;
 *  · reembolsáveis pendentes (solicitado/aprovado/faturado, ainda não recebido);
 *  · horas planejadas × realizadas da competência (Apontamento de Horas);
 *  · projetos com desvio de custo (projeção ao término acima do Orçamento revisado).
 * Filtros: cliente e contrato (restringem os contratos considerados).
 */
export interface FiltroExecutivo {
  clienteId?: string | null;
  contratoId?: string | null;
}

const c2 = (n: number) => Math.round(n * 100) / 100;

export async function indicadoresExecutivos(tenantId: string, projetos: readonly { id: string; name: string; situacao?: string | null }[], f: FiltroExecutivo = {}, hoje = new Date()) {
  const ids = new Set(projetos.map((p) => p.id));
  const todos = await listarContratos(tenantId);
  const contratos = todos
    .filter((c) => !STATUS_FORA_DO_CONTRATADO.has(c.status))
    .filter((c) => !f.clienteId || c.clienteId === f.clienteId)
    .filter((c) => !f.contratoId || c.id === f.contratoId)
    .filter((c) => c.projetos.some((p) => ids.has(p.id)));
  const ate = hojeMDY();
  const faturasPorContrato = new Map<string, { valor: number; vencimento: string | null; cancelado: boolean }[]>();
  const cIds = contratos.map((c) => c.id);
  if (cIds.length) {
    const fs = await db
      .select({ contratoId: schema.contasReceber.contratoId, valor: schema.contasReceber.valor, vencimento: schema.contasReceber.vencimento, cancelado: schema.contasReceber.cancelado })
      .from(schema.contasReceber)
      .where(and(eq(schema.contasReceber.tenantId, tenantId), inArray(schema.contasReceber.contratoId, cIds)));
    for (const x of fs) faturasPorContrato.set(x.contratoId!, [...(faturasPorContrato.get(x.contratoId!) ?? []), { valor: Number(x.valor), vencimento: x.vencimento, cancelado: x.cancelado }]);
  }
  let contratado = 0, aditivos = 0, medido = 0, faturado = 0, reconhecida = 0, recebido = 0, aReceber = 0, aMedir = 0;
  let comSaldoAMedir = 0;
  for (const c of contratos) {
    const k = fatorDoContrato(c, ids);
    if (k <= 0) continue;
    const s = c.saldo;
    contratado += s.atualizado * k;
    aditivos += (s.acrescimos - s.reducoes) * k;
    medido += s.medidoAprovado * k;
    faturado += s.faturado * k;
    reconhecida += receitaReconhecida(faturasPorContrato.get(c.id) ?? [], ate) * k;
    recebido += s.recebido * k;
    aReceber += s.faturadoNaoRecebido * k;
    aMedir += Math.max(0, s.saldoAMedir) * k;
    if (s.saldoAMedir > 0.005 && c.status === "ativo") comSaldoAMedir += 1;
  }
  // Reembolsáveis pendentes dos contratos considerados.
  const reembolsos = cIds.length ? (await relatorioDeReembolsos(tenantId)).filter((r) => contratos.some((c) => c.codigo === r.contrato)) : [];
  const reembolsoPendente = reembolsos.filter((r) => ["solicitado", "aprovado", "faturado"].includes(r.status)).reduce((s, r) => s + r.pendente, 0);
  // Horas da competência corrente, nos projetos em tela.
  const comp = `${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`;
  const horas = ids.size
    ? await db
        .select({ tipo: schema.apontamentosHora.tipo, horas: schema.apontamentosHora.horas, custoHora: schema.apontamentosHora.custoHora, projectId: schema.apontamentosHora.projectId, contratoId: schema.apontamentosHora.contratoId })
        .from(schema.apontamentosHora)
        .where(and(eq(schema.apontamentosHora.tenantId, tenantId), eq(schema.apontamentosHora.competencia, comp), inArray(schema.apontamentosHora.projectId, [...ids])))
    : [];
  const horasFiltradas = horas.filter((h) => !f.contratoId || h.contratoId === f.contratoId);
  const somaH = (t: string) => c2(horasFiltradas.filter((h) => h.tipo === t).reduce((s, h) => s + Number(h.horas), 0));
  const custoPessoal = c2(horasFiltradas.filter((h) => h.tipo === "realizado" && h.custoHora != null).reduce((s, h) => s + Number(h.horas) * Number(h.custoHora), 0));
  // Projetos com desvio de custo (até 30 projetos, para não pesar a tela).
  const alvo = projetos.filter((p) => p.situacao !== "Finalizado").slice(0, 30);
  const projecoes = await Promise.all(alvo.map(async (p) => ({ nome: p.name, p: await projecaoDoProjeto(tenantId, p.id, hoje) })));
  const comDesvio = projecoes.filter((x) => x.p && x.p.desvioDeCusto != null && x.p.desvioDeCusto > 0.005).map((x) => ({ nome: x.nome, desvio: x.p!.desvioDeCusto!, desvioPct: x.p!.desvioDeCustoPct }));
  return {
    projetosAtivos: projetos.filter((p) => p.situacao === "Ativo").length,
    contratosAtivos: contratos.filter((c) => c.status === "ativo").length,
    contratado: c2(contratado),
    aditivos: c2(aditivos),
    medido: c2(medido),
    faturado: c2(faturado),
    receitaReconhecida: c2(reconhecida),
    recebido: c2(recebido),
    aReceber: c2(aReceber),
    saldoAMedir: c2(aMedir),
    contratosComSaldoAMedir: comSaldoAMedir,
    reembolsoPendente: c2(reembolsoPendente),
    horas: { competencia: comp, planejadas: somaH("planejado"), realizadas: somaH("realizado"), custoPessoalGerencial: custoPessoal },
    projetosComDesvio: comDesvio.sort((a, b) => b.desvio - a.desvio),
    projetosAnalisados: alvo.length,
  };
}
export type IndicadoresExecutivos = Awaited<ReturnType<typeof indicadoresExecutivos>>;
