import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getChartAccounts } from "@/lib/queries";
import { categoriaDaConta } from "@/lib/categoria-do-plano";
import { classeDaConta, dreGerencial, type ClasseGerencial } from "@/lib/planocontas-regras";
import { mesOrdenavel } from "@/lib/receita-servicos";
import { listarContratos } from "@/lib/contratos-queries";
import { STATUS_FORA_DO_CONTRATADO } from "@/lib/valor-contratado";

/**
 * DRE por contrato e por cliente (Growth Ambiental). Usa o MESMO motor da
 * DRE gerencial (`dreGerencial`, classes do Plano de Contas), com:
 *  · receita = faturas do contrato (contas a receber com contrato), pelo mês
 *    do vencimento — a regra que a DRE já usa (a política de reconhecimento
 *    aguarda validação; ver receita-servicos.ts);
 *  · custos e despesas = despesas APROPRIADAS ao contrato, pela competência,
 *    na conta do plano de cada uma.
 * Despesa não apropriada a contrato nenhum fica fora (não há rateio
 * arbitrário): aparece na DRE do projeto, não aqui. Canceladas não entram.
 */
export interface FiltroDeResultado {
  /** MM/YYYY; vazio = todo o período */
  de?: string | null;
  ate?: string | null;
}

async function mapaGerencial(tenantId: string) {
  const contas = await getChartAccounts(tenantId);
  const mapa = new Map<string, { name: string; classe: ClasseGerencial }>();
  for (const c of contas) mapa.set(c.code, { name: c.name, classe: classeDaConta(c, categoriaDaConta(c)) });
  return mapa;
}

const noPeriodo = (mes: number | null, f: FiltroDeResultado) => {
  const de = mesOrdenavel(f.de);
  const ate = mesOrdenavel(f.ate);
  if (mes == null) return de == null && ate == null;
  return (de == null || mes >= de) && (ate == null || mes <= ate);
};

/** Receita e lançamentos de um conjunto de contratos, no período. */
async function movimentosDosContratos(tenantId: string, ids: readonly string[], f: FiltroDeResultado) {
  if (!ids.length) return { receita: 0, lancamentos: [] as { conta: string | null; categoria: string; valor: number; contratoId: string }[], faturas: [] as { contratoId: string; valor: number }[] };
  const [faturas, despesas] = await Promise.all([
    db
      .select({ contratoId: schema.contasReceber.contratoId, valor: schema.contasReceber.valor, vencimento: schema.contasReceber.vencimento })
      .from(schema.contasReceber)
      .where(and(eq(schema.contasReceber.tenantId, tenantId), inArray(schema.contasReceber.contratoId, [...ids]), eq(schema.contasReceber.cancelado, false))),
    db
      .select({ contratoId: schema.despesas.contratoId, conta: schema.despesas.contaCef, categoria: schema.despesas.categoriaDre, valor: schema.despesas.valor, competencia: schema.despesas.competencia })
      .from(schema.despesas)
      .where(and(eq(schema.despesas.tenantId, tenantId), inArray(schema.despesas.contratoId, [...ids]), eq(schema.despesas.cancelado, false))),
  ]);
  const fat = faturas.filter((x) => noPeriodo(mesOrdenavel(x.vencimento), f)).map((x) => ({ contratoId: x.contratoId!, valor: Number(x.valor) }));
  const lancamentos = despesas
    .filter((d) => noPeriodo(mesOrdenavel(d.competencia), f))
    .map((d) => ({ conta: d.conta, categoria: d.categoria ?? "Custo Variável", valor: Number(d.valor), contratoId: d.contratoId! }));
  return { receita: fat.reduce((s, x) => s + x.valor, 0), lancamentos, faturas: fat };
}

export interface ResumoDeResultado {
  id: string;
  rotulo: string;
  contratos: number;
  receitaBruta: number;
  custoServicos: number;
  resultadoBruto: number;
  despesasOperacionais: number;
  resultadoLiquido: number;
  margemPct: number | null;
}

/** DRE gerencial de um conjunto de contratos (um contrato ou todos de um cliente). */
export async function dreDosContratos(tenantId: string, ids: readonly string[], f: FiltroDeResultado = {}) {
  const [mapa, mov] = await Promise.all([mapaGerencial(tenantId), movimentosDosContratos(tenantId, ids, f)]);
  return dreGerencial({ receitaSemConta: mov.receita, encargos: 0, lancamentos: mov.lancamentos }, mapa);
}

/**
 * Resumo por contrato e por cliente, no período. Contratos em rascunho ou
 * cancelados ficam fora. Cada fatura e cada despesa é de UM contrato: somar
 * os contratos de um cliente não duplica nada.
 */
export async function resultadoPorContratoECliente(tenantId: string, f: FiltroDeResultado = {}) {
  const contratos = (await listarContratos(tenantId)).filter((c) => !STATUS_FORA_DO_CONTRATADO.has(c.status));
  const ids = contratos.map((c) => c.id);
  const [mapa, mov] = await Promise.all([mapaGerencial(tenantId), movimentosDosContratos(tenantId, ids, f)]);
  const linhaDe = (id: string, rotulo: string, grupo: readonly string[]): ResumoDeResultado => {
    const g = new Set(grupo);
    const d = dreGerencial(
      {
        receitaSemConta: mov.faturas.filter((x) => g.has(x.contratoId)).reduce((s, x) => s + x.valor, 0),
        encargos: 0,
        lancamentos: mov.lancamentos.filter((l) => g.has(l.contratoId)),
      },
      mapa,
    );
    const v = (k: string) => d.linhas.find((l) => l.id === k)?.valor ?? 0;
    const receitaBruta = v("receita_bruta");
    return {
      id,
      rotulo,
      contratos: grupo.length,
      receitaBruta,
      custoServicos: v("custo_servico"),
      resultadoBruto: v("resultado_bruto"),
      despesasOperacionais: v("despesa_operacional"),
      resultadoLiquido: d.resultadoLiquido,
      margemPct: receitaBruta > 0 ? Math.round((d.resultadoLiquido / receitaBruta) * 10000) / 100 : null,
    };
  };
  const porContrato = contratos.map((c) => linhaDe(c.id, `${c.codigo} · ${c.titulo}`, [c.id]));
  const clientes = new Map<string, { rotulo: string; ids: string[] }>();
  for (const c of contratos) {
    const k = c.clienteId ?? "_sem";
    const g = clientes.get(k) ?? { rotulo: c.cliente ?? "Sem cliente", ids: [] };
    g.ids.push(c.id);
    clientes.set(k, g);
  }
  const porCliente = [...clientes.entries()].map(([k, g]) => linhaDe(k, g.rotulo, g.ids));
  const total = linhaDe("_total", "Total dos contratos", ids);
  return {
    contratos: contratos.map((c) => ({ id: c.id, codigo: c.codigo, titulo: c.titulo, clienteId: c.clienteId, cliente: c.cliente })),
    porContrato: porContrato.sort((a, b) => b.receitaBruta - a.receitaBruta),
    porCliente: porCliente.sort((a, b) => b.receitaBruta - a.receitaBruta),
    total,
  };
}

