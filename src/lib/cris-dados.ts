import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { TenantContext } from "@/lib/context";
import { can, type Modulo } from "@/lib/permissions";
import { chaveLigada } from "@/lib/chaves-tenant";
import { versionIdOfKind, versionInputsByMonth } from "@/lib/dre-inputs";
import { getBankAccounts, getBaixadoSemConciliar, getContasPagar, getContasReceber, getUnits } from "@/lib/queries";
import { isContaDaEmpresa, saldoDisponivel } from "@/lib/contas-saldo";
import { hojeISO } from "@/lib/despesa-status";
import { parcelasDeVenda, SECOES_FORA_DA_CONCILIACAO } from "@/lib/recebimento-parcela";
import { totalDoContrato } from "@/lib/calc/receita-rateio";
import { receitaValida, urlDaReceita } from "@/lib/relatorio-custom";

export { FERRAMENTAS_DE_DADOS, NOMES_DAS_FERRAMENTAS_DE_DADOS } from "@/lib/cris-dados-ferramentas";

/**
 * Revisão 4, Etapa 7 (Parte 6) — a Cris lê os dados do sistema por um CATÁLOGO
 * DE FERRAMENTAS DE LEITURA, em todos os módulos (BAC-1, decidido 12/11).
 *
 * - O modelo escolhe a ferramenta e os filtros; o SERVIDOR calcula e agrega;
 *   o modelo escreve o texto sobre o resultado. Nunca linhas cruas em massa
 *   (no máximo 30 grupos por resposta), nunca SQL do modelo, nunca o banco.
 * - Cada ferramenta confere o "ver" do módulo da pessoa; obra só entre as que
 *   ela vê. Sem permissão, a ferramenta diz isso e não lê nada.
 * - DADO PESSOAL FORA de todas: CPF, CNPJ de pessoa física, renda, salário,
 *   dados bancários, saúde. Nome de fornecedor aparece (as telas de despesa
 *   mostram); de comprador e de membro de equipe, não: vão a unidade e a função.
 * - A análise não depende da tela aberta (AC-T2): as ferramentas são as mesmas
 *   em qualquer tela; só o que já é da tela vem no bloco <tela>.
 * - Relatório exportável: `montar_relatorio` monta a receita de Relatórios
 *   Customizados (o motor que já gera CSV e PDF); a Cris entrega o link.
 */

import { MAX_GRUPOS } from "@/lib/cris-dados-ferramentas";

const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (v: number, total: number) => (total ? Math.round((v / total) * 10000) / 100 : 0);
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
/** "MM/YYYY" → número comparável (YYYYMM); null se inválido. */
const ym = (mm: string | null | undefined) => {
  const m = mm ? /^(\d{2})\/(\d{4})$/.exec(mm.trim()) : null;
  return m ? Number(m[2]) * 100 + Number(m[1]) : null;
};
const mesDaData = (mdy: string | null | undefined) => (mdy && /^\d{2}\/\d{2}\/\d{4}$/.test(mdy) ? `${mdy.slice(0, 2)}/${mdy.slice(6)}` : null);
const noPeriodo = (mm: string | null, de: string, ate: string) => {
  const v = ym(mm);
  if (v == null) return !de && !ate;
  return (!ym(de) || v >= ym(de)!) && (!ym(ate) || v <= ym(ate)!);
};

type Entrada = Record<string, unknown>;
const texto = (o: Entrada, k: string) => (typeof o[k] === "string" ? (o[k] as string).trim() : "");
const lista = (o: Entrada, k: string) => (Array.isArray(o[k]) ? (o[k] as unknown[]).filter((x): x is string => typeof x === "string" && !!x.trim()) : []);

function obrasPedidas(ctx: TenantContext, nomes: string[]): { obras: { id: string; name: string }[]; naoAchadas: string[] } {
  if (nomes.length === 0) return { obras: ctx.projects.map((p) => ({ id: p.id, name: p.name })), naoAchadas: [] };
  const obras: { id: string; name: string }[] = [];
  const naoAchadas: string[] = [];
  for (const n of nomes) {
    const achada = ctx.projects.find((p) => norm(p.name) === norm(n)) ?? ctx.projects.filter((p) => norm(p.name).includes(norm(n)))[0];
    if (achada && !obras.some((o) => o.id === achada.id)) obras.push({ id: achada.id, name: achada.name });
    else if (!achada) naoAchadas.push(n);
  }
  return { obras, naoAchadas };
}

function semPermissao(modulo: string): string {
  return JSON.stringify({ erro: `A pessoa não tem acesso de leitura a ${modulo}. Diga isso; não estime o número.` });
}

/** Agrupa linhas {chaves..., valor} e devolve no máximo MAX_GRUPOS, do maior para o menor, com o % do total. */
function agrupar(linhas: { chave: Record<string, string>; valor: number; qtd?: number }[]) {
  const mapa = new Map<string, { grupo: Record<string, string>; valor: number; qtd: number }>();
  for (const l of linhas) {
    const k = JSON.stringify(l.chave);
    const g = mapa.get(k) ?? { grupo: l.chave, valor: 0, qtd: 0 };
    g.valor += l.valor;
    g.qtd += l.qtd ?? 1;
    mapa.set(k, g);
  }
  const todos = [...mapa.values()].filter((g) => Math.abs(g.valor) > 0.005);
  const total = r2(todos.reduce((a, g) => a + g.valor, 0));
  const ordenados = todos.sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));
  const grupos = ordenados.slice(0, MAX_GRUPOS).map((g) => ({ ...g.grupo, valor: r2(g.valor), qtd: g.qtd, percentualDoTotal: pct(g.valor, total) }));
  const resto = ordenados.slice(MAX_GRUPOS);
  return { total, grupos, ...(resto.length ? { outros: { grupos: resto.length, valor: r2(resto.reduce((a, g) => a + g.valor, 0)) } } : {}) };
}

// ─────────────────────────── as ferramentas ───────────────────────────


const pode = (ctx: TenantContext, m: string) => can(ctx.perms, m as Modulo, "ver");

/** Executa uma ferramenta de dados com o acesso da pessoa. Devolve JSON curto para o modelo. */
export async function executarFerramentaDeDados(ctx: TenantContext, nome: string, entrada: unknown): Promise<string> {
  const o = (entrada && typeof entrada === "object" ? entrada : {}) as Entrada;
  const { obras, naoAchadas } = obrasPedidas(ctx, lista(o, "obras"));
  const de = texto(o, "de");
  const ate = texto(o, "ate");
  const aviso = naoAchadas.length ? { obrasNaoEncontradas: naoAchadas } : {};
  const periodo = { de: de || "início", ate: ate || "fim" };
  const tenantId = ctx.tenant.id;

  switch (nome) {
    case "custos_e_despesas_da_dre": {
      if (!pode(ctx, "dre")) return semPermissao("DRE");
      const cats = lista(o, "categorias");
      const agrup = texto(o, "agrupar") || "obra";
      const definicaoNova = await chaveLigada(tenantId, "dre_definicao_nova");
      const linhas: { chave: Record<string, string>; valor: number }[] = [];
      for (const obra of obras) {
        const vid = await versionIdOfKind(obra.id, "atual");
        if (!vid) continue;
        const porMes = await versionInputsByMonth(tenantId, vid, obra.id, { definicaoNova });
        for (const [mm, inp] of Object.entries(porMes)) {
          if (!noPeriodo(mm, de, ate)) continue;
          const porCat: Record<string, number> = { ...inp.byCat, "Custo Variável": inp.custoVar };
          delete porCat["Receita"];
          for (const [cat, v] of Object.entries(porCat)) {
            if (!v || (cats.length && !cats.includes(cat))) continue;
            const chave: Record<string, string> = agrup === "obra" ? { obra: obra.name } : agrup === "categoria" ? { categoria: cat } : agrup === "mes" ? { mes: mm } : agrup === "obra_mes" ? { obra: obra.name, mes: mm } : { obra: obra.name, categoria: cat };
            linhas.push({ chave, valor: v });
          }
        }
      }
      return JSON.stringify({ fonte: "DRE, versão Atual, por competência (os mesmos números da tela DRE)", periodo, categorias: cats.length ? cats : "todas", ...agrupar(linhas), ...aviso });
    }

    case "despesas_por_fornecedor_ou_situacao": {
      if (!pode(ctx, "despesas")) return semPermissao("Despesas");
      const situacao = texto(o, "situacao") || "todas";
      const agrup = texto(o, "agrupar") || "fornecedor";
      const ids = new Set(obras.map((x) => x.id));
      const nomeDaObra = new Map(obras.map((x) => [x.id, x.name]));
      const hoje = hojeISO();
      // Contas a Pagar da Atual (o que a tela mostra), sem cancelada e sem a linha da fatura (as compras do cartão já estão lá).
      const rows = (await getContasPagar(tenantId)).filter((d) => d.versionKind === "atual" && d.status !== "Cancelada" && d.origem !== "fatura" && ids.has(d.projectId) && noPeriodo(d.competencia, de, ate));
      const situacaoDe = (d: (typeof rows)[number]) => {
        if (d.status === "Pago") return "pagas";
        if (d.status === "Vencida") return "vencidas";
        const v = d.vencimento && /^\d{2}\/\d{2}\/\d{4}$/.test(d.vencimento) ? `${d.vencimento.slice(6)}-${d.vencimento.slice(0, 2)}-${d.vencimento.slice(3, 5)}` : null;
        return v && v < hoje ? "vencidas" : "em_aberto";
      };
      const linhas = rows
        .filter((d) => situacao === "todas" || situacaoDe(d) === situacao || (situacao === "em_aberto" && situacaoDe(d) === "vencidas"))
        .map((d) => ({
          chave: (agrup === "conta" ? { conta: d.contaCef ?? "sem conta" } : agrup === "situacao" ? { situacao: situacaoDe(d) } : agrup === "obra" ? { obra: nomeDaObra.get(d.projectId) ?? "—" } : { fornecedor: d.fornecedorNome ?? "sem fornecedor" }) as Record<string, string>,
          valor: Number(d.valor),
        }));
      return JSON.stringify({ fonte: "Despesas lançadas, versão Atual, por competência", periodo, situacao, ...agrupar(linhas), ...aviso });
    }

    case "recebiveis_e_inadimplencia": {
      if (!pode(ctx, "contasreceber")) return semPermissao("Contas a Receber");
      const agrup = texto(o, "agrupar") || "obra";
      const somente = texto(o, "somente") || "todas";
      const ids = new Set(obras.map((x) => x.id));
      const hoje = hojeISO();
      const parcelas = (await parcelasDeVenda(tenantId, hoje)).filter((p) => ids.has(p.projectId) && !SECOES_FORA_DA_CONCILIACAO.has(p.secao) && noPeriodo(mesDaData(p.dia), de, ate));
      const filtradas = parcelas.filter((p) => somente === "todas" || (somente === "vencidas" ? p.situacao === "vencida" : p.situacao === "a vencer" || p.situacao === "parcial"));
      const chave = (p: (typeof parcelas)[number]): Record<string, string> => (agrup === "unidade" ? { obra: p.projectName, unidade: p.unitCode } : agrup === "mes" ? { mes: mesDaData(p.dia) ?? "sem data" } : { obra: p.projectName });
      const contas = (await getContasReceber(tenantId)).filter((c) => ids.has(c.projectId) && c.status !== "Recebido" && c.status !== "Cancelada" && noPeriodo(mesDaData(c.vencimento), de, ate));
      return JSON.stringify({
        fonte: "Parcelas dos planos de pagamento das unidades vendidas (versão Atual) e contas a receber lançadas",
        periodo,
        somente,
        parcelasDeVenda: {
          aReceber: agrupar(filtradas.map((p) => ({ chave: chave(p), valor: p.saldo }))),
          recebidoPelaConciliacao: r2(parcelas.reduce((a, p) => a + p.recebido, 0)),
          vencidas: { quantidade: parcelas.filter((p) => p.situacao === "vencida").length, valor: r2(parcelas.filter((p) => p.situacao === "vencida").reduce((a, p) => a + p.saldo, 0)) },
        },
        contasAReceberLancadas: { emAberto: contas.length, valor: r2(contas.reduce((a, c) => a + c.valor - c.valorRecebido, 0)) },
        observacao: "Sem nome de comprador: a unidade identifica a venda.",
        ...aviso,
      });
    }

    case "caixa_e_conciliacao": {
      if (!pode(ctx, "caixa")) return semPermissao("Caixa");
      const { pendentesDaRodada } = await import("@/lib/conciliacao-cris");
      const [contas, baixado, pendentes] = await Promise.all([getBankAccounts(tenantId), getBaixadoSemConciliar(tenantId), pendentesDaRodada(tenantId)]);
      const daEmpresa = contas.filter((c) => isContaDaEmpresa(c));
      const porConta = new Map<string, number>();
      for (const p of pendentes) porConta.set(p.conta ?? "sem conta", (porConta.get(p.conta ?? "sem conta") ?? 0) + 1);
      return JSON.stringify({
        fonte: "Contas correntes e conciliação do Caixa (empresa)",
        saldoDisponivel: r2(saldoDisponivel(contas)),
        contas: daEmpresa.map((c) => ({ conta: `${c.banco}${c.cc ? " · " + c.cc : ""}`, saldoEmConta: Number(c.saldo), atualizadoEm: c.lastSync ? c.lastSync.toISOString().slice(0, 10) : null })),
        pendentesDeConciliar: { amostraAte20: pendentes.length, porConta: Object.fromEntries(porConta), maisAntigo: pendentes[0]?.data ?? null },
        baixadoSemConciliar: baixado,
      });
    }

    case "orcado_x_realizado": {
      if (!pode(ctx, "dre")) return semPermissao("DRE");
      const agrup = texto(o, "agrupar") || "obra";
      const definicaoNova = await chaveLigada(tenantId, "dre_definicao_nova");
      const somar = async (vid: string, obraId: string) => {
        const out: Record<string, number> = {};
        for (const [mm, inp] of Object.entries(await versionInputsByMonth(tenantId, vid, obraId, { definicaoNova }))) {
          if (!noPeriodo(mm, de, ate)) continue;
          const porCat: Record<string, number> = { ...inp.byCat, "Custo Variável": inp.custoVar };
          delete porCat["Receita"];
          for (const [c, v] of Object.entries(porCat)) out[c] = (out[c] ?? 0) + v;
        }
        return out;
      };
      const linhas: Record<string, { orcado: number; realizado: number }> = {};
      const semOrcamento: string[] = [];
      for (const obra of obras) {
        const [atual, budget] = await Promise.all([versionIdOfKind(obra.id, "atual"), versionIdOfKind(obra.id, "budget")]);
        if (!atual) continue;
        if (!budget) semOrcamento.push(obra.name);
        const [real, orc] = await Promise.all([somar(atual, obra.id), budget ? somar(budget, obra.id) : Promise.resolve({} as Record<string, number>)]);
        for (const c of new Set([...Object.keys(real), ...Object.keys(orc)])) {
          const k = agrup === "categoria" ? c : agrup === "obra" ? obra.name : `${obra.name} · ${c}`;
          linhas[k] ??= { orcado: 0, realizado: 0 };
          linhas[k].orcado += orc[c] ?? 0;
          linhas[k].realizado += real[c] ?? 0;
        }
      }
      const grupos = Object.entries(linhas)
        .map(([grupo, v]) => ({ grupo, orcado: r2(v.orcado), realizado: r2(v.realizado), diferenca: r2(v.realizado - v.orcado), percentualDoOrcado: v.orcado ? pct(v.realizado, v.orcado) : null }))
        .filter((g) => g.orcado || g.realizado)
        .sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca))
        .slice(0, MAX_GRUPOS);
      return JSON.stringify({ fonte: "DRE: Orçamento × Atual, por competência", periodo, grupos, ...(semOrcamento.length ? { obrasSemOrcamento: semOrcamento } : {}), ...aviso });
    }

    case "unidades_e_vendas": {
      if (!pode(ctx, "unidades")) return semPermissao("Unidades");
      const agrup = texto(o, "agrupar") || "obra";
      const linhas: { chave: Record<string, string>; valor: number; qtd: number }[] = [];
      const contratos: Record<string, number> = {};
      for (const obra of obras) {
        const vid = await versionIdOfKind(obra.id, "atual");
        if (!vid) continue;
        for (const u of await getUnits(tenantId, vid)) {
          const chave: Record<string, string> = agrup === "situacao" ? { situacao: u.status } : agrup === "obra" ? { obra: obra.name } : { obra: obra.name, situacao: u.status };
          linhas.push({ chave, valor: Number(u.valor), qtd: 1 });
          if (u.status === "Vendido") contratos[obra.name] = r2((contratos[obra.name] ?? 0) + totalDoContrato(u.paymentPlan, u.status));
        }
      }
      return JSON.stringify({ fonte: "Unidades da versão Atual (valor = tabela/VGV)", ...agrupar(linhas), totalDosContratosVendidos: contratos, ...aviso });
    }

    case "medicao_estoque_equipes": {
      const assunto = texto(o, "assunto");
      const agrup = texto(o, "agrupar") || "obra";
      const ids = obras.map((x) => x.id);
      const nomeDaObra = new Map(obras.map((x) => [x.id, x.name]));
      if (assunto === "medicao") {
        if (!pode(ctx, "medicao")) return semPermissao("Medição");
        const linhas: { chave: Record<string, string>; valor: number }[] = [];
        for (const obra of obras) {
          const vid = await versionIdOfKind(obra.id, "atual");
          if (!vid) continue;
          const ms = await db.select().from(schema.medicoes).where(and(eq(schema.medicoes.tenantId, tenantId), eq(schema.medicoes.versionId, vid)));
          for (const m of ms) if (noPeriodo(m.competencia, de, ate)) linhas.push({ chave: agrup === "grupo" ? { obra: obra.name, grupo: m.grupoName } : agrup === "mes" ? { mes: m.competencia } : { obra: obra.name }, valor: Number(m.valor) });
        }
        return JSON.stringify({ fonte: "Medição de obra, versão Atual", periodo, ...agrupar(linhas), ...aviso });
      }
      if (assunto === "estoque") {
        if (!pode(ctx, "estoque")) return semPermissao("Estoque");
        if (ids.length === 0) return JSON.stringify({ grupos: [] });
        const movs = await db.select().from(schema.stockMovements).where(and(eq(schema.stockMovements.tenantId, tenantId), inArray(schema.stockMovements.projectId, ids)));
        const linhas = movs.map((m) => ({ chave: { obra: nomeDaObra.get(m.projectId ?? "") ?? "—", movimento: m.tipo }, valor: Number(m.quantidade) * Number(m.custoUnit) }));
        return JSON.stringify({ fonte: "Movimentos de estoque por obra (valor = quantidade × custo unitário)", ...agrupar(linhas), ...aviso });
      }
      if (assunto === "equipes") {
        if (!pode(ctx, "equipes")) return semPermissao("Equipes");
        if (ids.length === 0) return JSON.stringify({ grupos: [] });
        const [membros, dias] = await Promise.all([
          db.select({ id: schema.equipesProjeto.id, projectId: schema.equipesProjeto.projectId, funcaoId: schema.equipesProjeto.funcaoId }).from(schema.equipesProjeto).where(and(eq(schema.equipesProjeto.tenantId, tenantId), inArray(schema.equipesProjeto.projectId, ids))),
          db
            .select({ equipeProjetoId: schema.diarias.equipeProjetoId, quantidade: schema.diarias.quantidade, data: schema.equipeDias.data })
            .from(schema.diarias)
            .innerJoin(schema.equipeDias, eq(schema.diarias.equipeDiaId, schema.equipeDias.id))
            .where(and(eq(schema.diarias.tenantId, tenantId), inArray(schema.equipeDias.projectId, ids))),
        ]);
        const funcoes = new Map((await db.select().from(schema.funcoesEquipe).where(eq(schema.funcoesEquipe.tenantId, tenantId)).catch(() => [])).map((f: { id: string; nome: string }) => [f.id, f.nome]));
        const membro = new Map(membros.map((m) => [m.id, m]));
        const linhas = dias
          .filter((d) => noPeriodo(mesDaData(d.data), de, ate))
          .map((d) => {
            const m = membro.get(d.equipeProjetoId);
            const chave: Record<string, string> = agrup === "funcao" ? { funcao: (m?.funcaoId && funcoes.get(m.funcaoId)) || "sem função" } : agrup === "mes" ? { mes: mesDaData(d.data) ?? "—" } : { obra: nomeDaObra.get(m?.projectId ?? "") ?? "—" };
            return { chave, valor: Number(d.quantidade) };
          });
        return JSON.stringify({ fonte: "Diárias registradas nas equipes (valor = número de diárias; sem nome nem salário)", periodo, pessoasNasEquipes: membros.length, ...agrupar(linhas), ...aviso });
      }
      return JSON.stringify({ erro: "assunto deve ser medicao, estoque ou equipes" });
    }

    case "montar_relatorio": {
      if (!pode(ctx, "relatorios") && !pode(ctx, "dre")) return semPermissao("Relatórios");
      const obraNome = texto(o, "obra");
      const obra = obraNome ? obrasPedidas(ctx, [obraNome]).obras[0] : null;
      const receita = receitaValida(
        { titulo: texto(o, "titulo"), fonte: texto(o, "fonte"), colunas: texto(o, "colunas"), cenarios: lista(o, "cenarios"), proj: obra?.id ?? "all", de, ate, av: o.analiseVertical === true },
        ctx.projects.map((p) => p.id),
      );
      return JSON.stringify({ link: urlDaReceita(receita), observacao: "Abra o link: a tela calcula com o acesso de quem abre e exporta CSV e PDF." });
    }
  }
  return JSON.stringify({ erro: "ferramenta desconhecida" });
}
