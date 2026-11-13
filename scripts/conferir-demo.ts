/**
 * Conferência INDEPENDENTE da empresa de demonstração: lê o banco com os
 * MESMOS motores das telas (projeção ao término, cinco valores do contrato,
 * DRE, fluxo de caixa, relatório gerencial, indicadores executivos) e confere
 * que os números reconciliam com a matriz da demonstração. Não grava nada.
 *
 * Uso (só contra banco de TESTE):
 *   DATABASE_URL=... SEED_ADMIN_EMAIL=demo@exemplo.com \
 *     npx tsx --conditions=react-server scripts/conferir-demo.ts
 * Sai com código 1 se alguma conferência falhar.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "../src/lib/db";
import { PROJETOS, ALIQUOTA_DAS } from "../src/lib/db/seed-demo/dados";
import { projecaoDoProjeto } from "../src/lib/projecao-financeira-dados";
import { detalheDoContrato } from "../src/lib/contratos-queries";
import { cincoValores } from "../src/lib/receita-servicos";
import { versionInputsByMonth } from "../src/lib/dre-inputs";
import { custoDe } from "../src/lib/projecao-financeira";
import { flowMaps, flowMapsRealizado } from "../src/lib/fluxo-caixa";
import { fatosGerenciais } from "../src/lib/relatorio-gerencial-dados";
import { tabelaGerencial, receitaValida } from "../src/lib/relatorio-custom";
import { METRICAS } from "../src/lib/relatorio-gerencial";
import { indicadoresExecutivos } from "../src/lib/indicadores-executivos";
import { resultadoPorContratoECliente } from "../src/lib/resultado-contratos";
import { hojeMDY } from "../src/lib/contrato-regras";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const falhas: string[] = [];
function confere(nome: string, obtido: number, esperado: number, tol = 0.02) {
  const okk = Math.abs(obtido - esperado) <= tol;
  if (!okk) falhas.push(`${nome}: obtido ${obtido}, esperado ${esperado}`);
  return okk ? "ok" : "FALHA";
}

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!u) throw new Error(`Usuário ${email} não encontrado.`);
  const vinculos = await db.select().from(schema.memberships).where(and(eq(schema.memberships.userId, u.id), eq(schema.memberships.role, "owner")));
  if (vinculos.length !== 1) throw new Error(`${email} deveria ser proprietário de exatamente 1 empresa (é de ${vinculos.length}).`);
  const tenantId = vinculos[0].tenantId;
  const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, tenantId));
  const projetos = await db.select().from(schema.projects).where(eq(schema.projects.tenantId, tenantId));
  const deProjeto = projetos.filter((p) => p.kind !== "office");
  console.log(`Empresa: ${tenant.name} (${tenantId}) — ${deProjeto.length} projetos + ${projetos.length - deProjeto.length} unidade(s) administrativa(s)`);
  confere("quantidade de projetos", deProjeto.length, 5, 0);

  const contratos = await db.select().from(schema.contratos).where(eq(schema.contratos.tenantId, tenantId));
  const hoje = new Date();
  const tot = { contratado: 0, medido: 0, faturado: 0, reconhecida: 0, recebido: 0, budgetRec: 0, budgetCusto: 0, prevRec: 0, prevCusto: 0 };

  for (const cat of PROJETOS) {
    const p = deProjeto.find((x) => x.name === cat.nome);
    if (!p) {
      falhas.push(`Projeto ausente: ${cat.nome}`);
      continue;
    }
    const versoes = await db.select().from(schema.versions).where(eq(schema.versions.projectId, p.id));
    const soma = async (kind: "budget" | "forecast", bloco: "receita" | "despesa") => {
      const v = versoes.find((x) => x.kind === kind)!;
      const [{ s }] = await db.select({ s: sql<string>`coalesce(sum(${schema.budgetLines.valor}),0)` }).from(schema.budgetLines).where(and(eq(schema.budgetLines.versionId, v.id), eq(schema.budgetLines.kind, bloco)));
      return Number(s);
    };
    const [bRec, bCus, fRec, fCus] = [await soma("budget", "receita"), await soma("budget", "despesa"), await soma("forecast", "receita"), await soma("forecast", "despesa")];
    const budget = versoes.find((x) => x.kind === "budget")!;
    const linhasBudget = await db.select({ n: sql<number>`count(distinct ${schema.budgetLines.rowKey})::int`, m: sql<number>`count(distinct ${schema.budgetLines.mes})::int` }).from(schema.budgetLines).where(and(eq(schema.budgetLines.versionId, budget.id), eq(schema.budgetLines.kind, "despesa")));
    const proj = await projecaoDoProjeto(tenantId, p.id, hoje);
    const ctr = contratos.find((x) => x.titulo === cat.titulo)!;
    const det = await detalheDoContrato(tenantId, ctr.id);
    const cinco = cincoValores(det!.saldo, det!.faturas, hojeMDY());
    const equipe = await db.select().from(schema.equipesProjeto).where(eq(schema.equipesProjeto.projectId, p.id));
    const fases = await db.select({ n: sql<number>`count(*)::int` }).from(schema.projetoFases).where(eq(schema.projetoFases.projectId, p.id));
    const ativ = await db.select({ n: sql<number>`count(*)::int` }).from(schema.projetoAtividades).where(eq(schema.projetoAtividades.projectId, p.id));
    const horas = await db.select({ tipo: schema.apontamentosHora.tipo, h: sql<string>`sum(${schema.apontamentosHora.horas})`, custo: sql<string>`sum(${schema.apontamentosHora.horas} * coalesce(${schema.apontamentosHora.custoHora},0))` }).from(schema.apontamentosHora).where(eq(schema.apontamentosHora.projectId, p.id)).groupBy(schema.apontamentosHora.tipo);
    const real = horas.find((h) => h.tipo === "realizado");

    console.log(`\n${cat.numero}. ${p.name} — ${cat.porte}, ${cat.duracao} meses, contrato ${ctr.status}, projeto ${p.situacao ?? "—"}`);
    console.log(`   Receita contratada ${brl(cinco.contratado)} (original ${brl(Number(ctr.valorOriginal))}) · medido ${brl(cinco.medido)} · faturado ${brl(cinco.faturado)} · receita reconhecida ${brl(cinco.receitaReconhecida)} · recebido ${brl(cinco.recebido)} · saldo a medir ${brl(cinco.saldoAMedir)}`);
    console.log(`   Budget: receita ${brl(bRec)} [${confere(`${cat.numero} budget receita`, bRec, cat.budget.receita)}], custo ${brl(bCus)} [${confere(`${cat.numero} budget custo`, bCus, cat.budget.custo)}] em ${linhasBudget[0].n} subgrupos × ${linhasBudget[0].m} meses, situação ${budget.status}`);
    console.log(`   Forecast: receita ${brl(fRec)} [${confere(`${cat.numero} forecast receita`, fRec, cat.forecast.receita)}], custo ${brl(fCus)} [${confere(`${cat.numero} forecast custo`, fCus, cat.forecast.custo)}]`);
    console.log(`   Projeção ao término (motor da tela): realizado ${brl(proj!.realizadoAteHoje.custo)} + para concluir ${brl(proj!.custoParaConcluir)} = EAC ${brl(proj!.custoEstimadoAoTermino)} [${confere(`${cat.numero} EAC = Forecast`, proj!.custoEstimadoAoTermino, cat.forecast.custo)}] · desvio ${brl(proj!.desvioDeCusto ?? 0)} (${proj!.desvioDeCustoPct}%) · receita estimada ${brl(proj!.receitaEstimada)} [${confere(`${cat.numero} receita estimada`, proj!.receitaEstimada, cat.forecast.receita)}] · margem ${brl(proj!.resultadoEstimado)} (${proj!.margemEstimadaPct}%) × orçada ${proj!.margemOrcadaPct}%`);
    console.log(`   Equipe: ${equipe.filter((e) => e.funcionarioId).length} CLT + ${equipe.filter((e) => e.stakeholderId).length} terceiros · horas realizadas ${Number(real?.h ?? 0)} (custo gerencial ${brl(Number(real?.custo ?? 0))}) · ${fases[0].n} fases, ${ativ[0].n} atividades · ${cat.situacao}`);
    confere(`${cat.numero} CLT`, equipe.filter((e) => e.funcionarioId).length, cat.clt.length, 0);
    confere(`${cat.numero} terceiros`, equipe.filter((e) => e.stakeholderId).length, cat.terceiros.length, 0);
    confere(`${cat.numero} contratado`, cinco.contratado, cat.forecast.receita);
    tot.contratado += cinco.contratado;
    tot.medido += cinco.medido;
    tot.faturado += cinco.faturado;
    tot.reconhecida += cinco.receitaReconhecida;
    tot.recebido += cinco.recebido;
    tot.budgetRec += bRec;
    tot.budgetCusto += bCus;
    tot.prevRec += fRec;
    tot.prevCusto += fCus;
  }

  console.log("\nConsolidado dos 5 projetos:");
  console.log(`   contratado ${brl(tot.contratado)} · medido ${brl(tot.medido)} · faturado ${brl(tot.faturado)} · receita reconhecida ${brl(tot.reconhecida)} · recebido ${brl(tot.recebido)}`);
  console.log(`   Budget ${brl(tot.budgetRec)} / ${brl(tot.budgetCusto)} [${confere("budget total receita", tot.budgetRec, 4210000)} ${confere("budget total custo", tot.budgetCusto, 3065000)}] · Forecast ${brl(tot.prevRec)} / ${brl(tot.prevCusto)} [${confere("forecast total receita", tot.prevRec, 4330000)} ${confere("forecast total custo", tot.prevCusto, 3300000)}] · margem de referência ${brl(tot.prevRec - tot.prevCusto)} [${confere("margem de referência", tot.prevRec - tot.prevCusto, 1030000)}]`);

  // Indicadores executivos (painel do Dashboard) = soma dos contratos.
  const exe = await indicadoresExecutivos(tenantId, deProjeto, {});
  console.log(`   Dashboard executivo: contratado ${brl(exe.contratado)} [${confere("dashboard contratado", exe.contratado, tot.contratado)}], aditivos ${brl(exe.aditivos)}, medido ${brl(exe.medido)} [${confere("dashboard medido", exe.medido, tot.medido)}], faturado ${brl(exe.faturado)}, recebido ${brl(exe.recebido)} [${confere("dashboard recebido", exe.recebido, tot.recebido)}], a receber ${brl(exe.aReceber)}`);

  // Relatório gerencial (mesmo motor da tela e da Cris): por contrato = por cliente = por projeto.
  const fatos = await fatosGerenciais(tenantId, deProjeto, { incluirHoras: true });
  const r = receitaValida({ fonte: "gerencial", dim: "contrato", metricas: "contratado,medido,faturado,receitaReconhecida,recebido,custoApropriado,margem,reembolsoSolicitado,horasRealizadas,custoPessoal" }, deProjeto.map((p) => p.id));
  const porContrato = tabelaGerencial(fatos, r, [...METRICAS]).linhas.at(-1)!.valores;
  for (const dim of ["cliente", "projeto", "competencia"] as const) {
    const t = tabelaGerencial(fatos, { ...r, dim }, [...METRICAS]).linhas.at(-1)!.valores;
    t.forEach((v, i) => confere(`gerencial ${dim} × contrato [${i}]`, v, porContrato[i]));
  }
  console.log(`   Relatório gerencial (total): contratado ${brl(porContrato[0])}, medido ${brl(porContrato[1])}, faturado ${brl(porContrato[2])}, receita reconhecida ${brl(porContrato[3])}, recebido ${brl(porContrato[4])}, custo apropriado ${brl(porContrato[5])}, margem ${brl(porContrato[6])}, reembolso solicitado ${brl(porContrato[7])}, horas ${porContrato[8]}, custo de pessoal ${brl(porContrato[9])} — iguais por cliente, projeto e competência`);
  confere("gerencial contratado", porContrato[0], tot.contratado);

  // DRE por contrato e cliente: soma dos clientes = soma dos contratos.
  const dre = await resultadoPorContratoECliente(tenantId, {});
  confere("DRE clientes = contratos (receita)", dre.porCliente.reduce((a, x) => a + x.receitaBruta, 0), dre.total.receitaBruta);
  console.log(`   DRE por contrato (total): receita ${brl(dre.total.receitaBruta)}, resultado ${brl(dre.total.resultadoLiquido)}`);

  // DRE Atual e fluxo de caixa consolidados (projetos + sede): soma das visões individuais.
  let receitaAtual = 0, custoAtual = 0, saidasFluxo = 0, entradasFluxo = 0, entradasRealizadas = 0, saidasRealizadas = 0;
  for (const p of projetos) {
    const atual = (await db.select().from(schema.versions).where(and(eq(schema.versions.projectId, p.id), eq(schema.versions.kind, "atual"))))[0];
    const porMes = await versionInputsByMonth(tenantId, atual.id, p.id, {});
    receitaAtual += Object.values(porMes).reduce((a, i) => a + i.receita, 0);
    custoAtual += Object.values(porMes).reduce((a, i) => a + custoDe(i), 0);
    const fl = await flowMaps(atual, p.id);
    saidasFluxo += Object.values(fl.saidas).reduce((a, v) => a + v, 0);
    entradasFluxo += Object.values(fl.entradas).reduce((a, v) => a + v, 0);
    const fr = await flowMapsRealizado(atual.id);
    entradasRealizadas += Object.values(fr.entradas).reduce((a, v) => a + v, 0);
    saidasRealizadas += Object.values(fr.saidas).reduce((a, v) => a + v, 0);
  }
  const [{ despesas, valor }] = await db.select({ despesas: sql<number>`count(*)::int`, valor: sql<string>`coalesce(sum(${schema.despesas.valor}),0)` }).from(schema.despesas).where(and(eq(schema.despesas.tenantId, tenantId), eq(schema.despesas.cancelado, false)));
  const [{ pagos, pago }] = await db.select({ pagos: sql<number>`count(*)::int`, pago: sql<string>`coalesce(sum(${schema.despesas.valor}),0)` }).from(schema.despesas).where(and(eq(schema.despesas.tenantId, tenantId), eq(schema.despesas.status, "Pago")));
  const [{ cr }] = await db.select({ cr: sql<string>`coalesce(sum(${schema.contasReceber.valor}),0)` }).from(schema.contasReceber).where(and(eq(schema.contasReceber.tenantId, tenantId), eq(schema.contasReceber.cancelado, false)));
  const [{ rec }] = await db.select({ rec: sql<string>`coalesce(sum(${schema.contaReceberRecebimentos.valor}),0)` }).from(schema.contaReceberRecebimentos).where(and(eq(schema.contaReceberRecebimentos.tenantId, tenantId), eq(schema.contaReceberRecebimentos.estornado, false)));
  console.log(`   DRE (versão Atual, empresa toda): receita ${brl(receitaAtual)} [${confere("receita da DRE = faturado", receitaAtual, tot.faturado)}], custos e despesas ${brl(custoAtual)}, resultado ${brl(receitaAtual - custoAtual)} (inclui sede, folha não apropriada e DAS a ${ALIQUOTA_DAS * 100}%)`);
  console.log(`   Despesas: ${despesas} lançadas (${brl(Number(valor))}), ${pagos} pagas (${brl(Number(pago))}) · contas a receber ${brl(Number(cr))}, recebido ${brl(Number(rec))} [${confere("recebido = soma dos contratos", Number(rec), tot.recebido)}], em aberto ${brl(Number(cr) - Number(rec))}`);
  console.log(`   Fluxo de caixa (Atual): entradas previstas ${brl(entradasFluxo)}, saídas previstas ${brl(saidasFluxo)} · realizado: entradas ${brl(entradasRealizadas)}, saídas ${brl(saidasRealizadas)}`);
  const horasDup = await db.select({ n: sql<number>`count(*)::int` }).from(schema.despesas).where(and(eq(schema.despesas.tenantId, tenantId), inArray(schema.despesas.contaCef, ["2.1.01"])));
  console.log(`   Folha apropriada: ${horasDup[0].n} despesas 2.1.01 (uma por projeto e mês; as horas não geram despesa)`);

  if (falhas.length) {
    console.log(`\n✗ ${falhas.length} conferência(s) falharam:`);
    for (const f of falhas) console.log(`   - ${f}`);
    process.exit(1);
  }
  console.log("\n✓ Todas as conferências passaram.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
