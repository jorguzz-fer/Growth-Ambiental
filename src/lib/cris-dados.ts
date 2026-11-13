import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { TenantContext } from "@/lib/context";
import { can, type Modulo } from "@/lib/permissions";
import { chaveLigada } from "@/lib/chaves-tenant";
import { versionIdOfKind, versionInputsByMonth } from "@/lib/dre-inputs";
import { getBankAccounts, getBaixadoSemConciliar, getContasPagar, getContasReceber } from "@/lib/queries";
import { isContaDaEmpresa, saldoDisponivel } from "@/lib/contas-saldo";
import { hojeISO } from "@/lib/despesa-status";
import { receitaValida, urlDaReceita } from "@/lib/relatorio-custom";
import { detalheDoContrato, listarContratos } from "@/lib/contratos-queries";
import { hojeMDY, venceEm } from "@/lib/contrato-regras";
import { atrasado, consolidar, desvioEmDias, progressoDaFase, ROTULO_STATUS_ENTREGA, ROTULO_STATUS_ITEM } from "@/lib/plano-regras";
import { categoriaDaConta } from "@/lib/categoria-do-plano";
import { METRICAS, METRICAS_PADRAO, metricasPermitidas, ROTULO_DIMENSAO, ROTULO_METRICA, type Dimensao, type Metrica } from "@/lib/relatorio-gerencial";
import { fatosGerenciais } from "@/lib/relatorio-gerencial-dados";
import { tabelaGerencial } from "@/lib/relatorio-custom";
import { projecaoDoProjeto } from "@/lib/projecao-financeira-dados";
import { DIMENSOES_DA_CRIS } from "@/lib/cris-dados-ferramentas";
import { classeDaConta, normalizar as normalizarTexto, ROTULO_CLASSE, ROTULO_TIPO_CUSTO, semelhanca, sugerirContas } from "@/lib/planocontas-regras";

export { FERRAMENTAS_DE_DADOS, NOMES_DAS_FERRAMENTAS_DE_DADOS } from "@/lib/cris-dados-ferramentas";

/**
 * Revisão 4, Etapa 7 (Parte 6) — a Cris lê os dados do sistema por um CATÁLOGO
 * DE FERRAMENTAS DE LEITURA, em todos os módulos (BAC-1, decidido 12/11).
 *
 * - O modelo escolhe a ferramenta e os filtros; o SERVIDOR calcula e agrega;
 *   o modelo escreve o texto sobre o resultado. Nunca linhas cruas em massa
 *   (no máximo 30 grupos por resposta), nunca SQL do modelo, nunca o banco.
 * - Cada ferramenta confere o "ver" do módulo da pessoa; projeto só entre os
 *   que ela vê (o parâmetro se chama `obras`, nome antigo). Sem permissão, a ferramenta diz isso e não lê nada.
 * - DADO PESSOAL FORA de todas: CPF, CNPJ de pessoa física, renda, salário,
 *   dados bancários, saúde. Nome de fornecedor aparece (as telas de despesa
 *   mostram); cliente contratante só quando é empresa (CNPJ); de cliente pessoa
 *   física e de membro de equipe, não: vão "pessoa física (nome omitido)" e a função.
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
      // Plano de Contas DESTA empresa: conta → subgrupo → grupo superior (consolidação por grupo).
      const [plano, gruposDoPlano] = await Promise.all([
        db.select({ code: schema.chartAccounts.code, name: schema.chartAccounts.name, groupCode: schema.chartAccounts.groupCode, groupName: schema.chartAccounts.groupName }).from(schema.chartAccounts).where(eq(schema.chartAccounts.tenantId, tenantId)),
        db.select({ id: schema.chartGroups.id, code: schema.chartGroups.code, name: schema.chartGroups.name, parentId: schema.chartGroups.parentId }).from(schema.chartGroups).where(eq(schema.chartGroups.tenantId, tenantId)),
      ]);
      const contaDe = new Map(plano.map((c) => [c.code, c]));
      const grupoPorCodigo = new Map(gruposDoPlano.map((g) => [g.code, g]));
      const grupoPorId = new Map(gruposDoPlano.map((g) => [g.id, g]));
      const rotuloConta = (code: string | null) => (code ? `${code} ${contaDe.get(code)?.name ?? "(fora do plano)"}` : "sem conta");
      const rotuloSub = (code: string | null) => {
        const c = code ? contaDe.get(code) : null;
        return c ? `${c.groupCode} ${c.groupName}` : "sem conta do plano";
      };
      const rotuloTopo = (code: string | null) => {
        const c = code ? contaDe.get(code) : null;
        let g = c ? grupoPorCodigo.get(c.groupCode) : undefined;
        while (g?.parentId && grupoPorId.get(g.parentId)) g = grupoPorId.get(g.parentId);
        return g ? `${g.code} ${g.name}` : c ? `${c.groupCode} ${c.groupName}` : "sem conta do plano";
      };
      const chaveDe = (d: (typeof rows)[number]): Record<string, string> => {
        switch (agrup) {
          case "conta":
            return { conta: rotuloConta(d.contaCef) };
          case "grupo_do_plano":
            return { grupo: rotuloSub(d.contaCef) };
          case "grupo_superior":
            return { grupo: rotuloTopo(d.contaCef) };
          case "obra_conta":
            return { obra: nomeDaObra.get(d.projectId) ?? "—", conta: rotuloConta(d.contaCef) };
          case "situacao":
            return { situacao: situacaoDe(d) };
          case "obra":
            return { obra: nomeDaObra.get(d.projectId) ?? "—" };
          default:
            return { fornecedor: d.fornecedorNome ?? "sem fornecedor" };
        }
      };
      const linhas = rows
        .filter((d) => situacao === "todas" || situacaoDe(d) === situacao || (situacao === "em_aberto" && situacaoDe(d) === "vencidas"))
        .map((d) => ({ chave: chaveDe(d), valor: Number(d.valor) }));
      return JSON.stringify({ fonte: "Despesas lançadas, versão Atual, por competência", periodo, situacao, ...agrupar(linhas), ...aviso });
    }

    case "recebiveis_e_inadimplencia": {
      if (!pode(ctx, "contasreceber")) return semPermissao("Contas a Receber");
      const agrup = texto(o, "agrupar") || "obra";
      const somente = texto(o, "somente") || "todas";
      const ids = new Set(obras.map((x) => x.id));
      const hoje = hojeISO();
      const vencISO = (v: string | null) => (v && /^\d{2}\/\d{2}\/\d{4}$/.test(v) ? `${v.slice(6)}-${v.slice(0, 2)}-${v.slice(3, 5)}` : null);
      const abertas = (await getContasReceber(tenantId)).filter((c) => ids.has(c.projectId) && c.status !== "Recebido" && c.status !== "Cancelada" && noPeriodo(mesDaData(c.vencimento), de, ate));
      const situacao = (c: (typeof abertas)[number]) => {
        const v = vencISO(c.vencimento);
        return v && v < hoje ? "vencida" : "a_vencer";
      };
      const filtradas = abertas.filter((c) => somente === "todas" || situacao(c) === (somente === "vencidas" ? "vencida" : "a_vencer"));
      // Cliente CONTRATANTE (empresa, com CNPJ) identifica a cobrança; nome de
      // pessoa física é dado pessoal e não vai ao modelo.
      const cliente = (c: (typeof abertas)[number]) => {
        if (!(c.clienteNome ?? "").trim()) return "cliente não informado";
        return (c.clienteDocumento ?? "").replace(/\D/g, "").length === 14 ? c.clienteNome! : "pessoa física (nome omitido)";
      };
      const chave = (c: (typeof abertas)[number]): Record<string, string> => (agrup === "mes" ? { mes: mesDaData(c.vencimento) ?? "sem data" } : agrup === "cliente" ? { cliente: cliente(c) } : { projeto: c.projectName ?? "—" });
      const saldo = (c: (typeof abertas)[number]) => c.valor - c.valorRecebido;
      return JSON.stringify({
        fonte: "Contas a Receber (faturas dos contratos e recebíveis lançados), em aberto",
        periodo,
        somente,
        aReceber: agrupar(filtradas.map((c) => ({ chave: chave(c), valor: saldo(c) }))),
        vencidas: { quantidade: abertas.filter((c) => situacao(c) === "vencida").length, valor: r2(abertas.filter((c) => situacao(c) === "vencida").reduce((a, c) => a + saldo(c), 0)) },
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

    case "medicao_estoque_equipes": {
      const assunto = texto(o, "assunto");
      const agrup = texto(o, "agrupar") || "obra";
      const ids = obras.map((x) => x.id);
      const nomeDaObra = new Map(obras.map((x) => [x.id, x.name]));
      if (assunto === "medicao") {
        // Medição do SERVIÇO, no contrato (a medição por grupo de obra saiu).
        if (!pode(ctx, "contratos")) return semPermissao("Contratos");
        if (ids.length === 0) return JSON.stringify({ grupos: [] });
        const ms = await db
          .select({ valor: schema.contratoMedicoes.valor, competencia: schema.contratoMedicoes.competencia, status: schema.contratoMedicoes.status, projectId: schema.contratoMedicoes.projectId, codigo: schema.contratos.codigo })
          .from(schema.contratoMedicoes)
          .innerJoin(schema.contratos, eq(schema.contratoMedicoes.contratoId, schema.contratos.id))
          .where(and(eq(schema.contratoMedicoes.tenantId, tenantId), inArray(schema.contratoMedicoes.projectId, ids)));
        const linhas = ms
          .filter((m) => noPeriodo(m.competencia, de, ate) && m.status !== "cancelada")
          .map((m) => ({
            chave: (agrup === "contrato" ? { contrato: m.codigo } : agrup === "situacao" ? { situacao: m.status } : agrup === "mes" ? { mes: m.competencia } : { projeto: nomeDaObra.get(m.projectId ?? "") ?? "—" }) as Record<string, string>,
            valor: Number(m.valor),
          }));
        return JSON.stringify({ fonte: "Medições de serviço dos contratos (medição não é receita: a receita vem do faturamento)", periodo, ...agrupar(linhas), ...aviso });
      }
      if (assunto === "estoque") {
        if (!pode(ctx, "estoque")) return semPermissao("Estoque");
        if (ids.length === 0) return JSON.stringify({ grupos: [] });
        const movs = await db.select().from(schema.stockMovements).where(and(eq(schema.stockMovements.tenantId, tenantId), inArray(schema.stockMovements.projectId, ids)));
        const linhas = movs.map((m) => ({ chave: { projeto: nomeDaObra.get(m.projectId ?? "") ?? "—", movimento: m.tipo }, valor: Number(m.quantidade) * Number(m.custoUnit) }));
        return JSON.stringify({ fonte: "Movimentos de materiais e equipamentos por projeto (valor = quantidade × custo unitário)", ...agrupar(linhas), ...aviso });
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
            const chave: Record<string, string> = agrup === "funcao" ? { funcao: (m?.funcaoId && funcoes.get(m.funcaoId)) || "sem função" } : agrup === "mes" ? { mes: mesDaData(d.data) ?? "—" } : { projeto: nomeDaObra.get(m?.projectId ?? "") ?? "—" };
            return { chave, valor: Number(d.quantidade) };
          });
        return JSON.stringify({ fonte: "Presença de campo: diárias registradas nas equipes dos projetos (valor = número de diárias; sem nome nem salário)", periodo, pessoasNasEquipes: membros.length, ...agrupar(linhas), ...aviso });
      }
      return JSON.stringify({ erro: "assunto deve ser medicao, estoque ou equipes" });
    }

    case "contratos_e_saldos": {
      if (!pode(ctx, "contratos")) return semPermissao("Contratos");
      const fin = pode(ctx, "contratosfinanceiro");
      const pedidos = lista(o, "contratos").map(norm);
      const assunto = texto(o, "assunto") || "resumo";
      const somente = texto(o, "somente") || "vigentes";
      const hoje = hojeMDY();
      const todos = await listarContratos(tenantId, hoje);
      // Cliente pessoa física não vai ao modelo (só CNPJ aparece pelo nome).
      const docs = new Map((await db.select({ id: schema.clientes.id, doc: schema.clientes.cpfCnpj }).from(schema.clientes).where(eq(schema.clientes.tenantId, tenantId))).map((c) => [c.id, (c.doc ?? "").replace(/\D/g, "")]));
      const nomeDoCliente = (l: (typeof todos)[number]) => (!l.clienteId ? null : docs.get(l.clienteId)?.length === 14 ? l.cliente : "cliente pessoa física");
      const escolhidos = todos
        .filter((l) => !pedidos.length || pedidos.some((p) => norm(l.codigo) === p || norm(l.titulo).includes(p)))
        .filter((l) => somente === "todos" || (somente === "vencendo_60_dias" ? (l.status === "ativo" || l.status === "suspenso") && venceEm(l.termino, hoje, 60) : !["encerrado", "cancelado"].includes(l.status)))
        .slice(0, MAX_GRUPOS);
      const base = escolhidos.map((l) => ({
        codigo: l.codigo,
        titulo: l.titulo,
        situacao: l.status,
        tipo: l.tipo,
        principal: l.principal,
        cliente: nomeDoCliente(l),
        modalidade: l.modalidade,
        valorOriginal: l.saldo.original,
        valorAtualizado: l.saldo.atualizado,
        aditivosSemEfeito: l.saldo.aditivosPendentes,
        valorEmAditivosSemEfeito: l.saldo.pendente,
        medidoAprovado: l.saldo.medidoAprovado,
        medidoEmAprovacao: l.saldo.medidoEmAprovacao,
        saldoAMedir: l.saldo.saldoAMedir,
        percentualMedido: l.saldo.pctMedido,
        inicio: l.dataInicio,
        terminoAtualizado: l.termino,
        ...(fin ? { faturado: l.saldo.faturado, recebido: l.saldo.recebido, medidoNaoFaturado: l.saldo.medidoNaoFaturado, faturadoNaoRecebido: l.saldo.faturadoNaoRecebido } : {}),
      }));
      const extra: Record<string, unknown> = {};
      if (assunto === "aditivos" || assunto === "medicoes" || (assunto === "financeiro" && fin)) {
        const detalhes = await Promise.all(escolhidos.slice(0, 10).map((l) => detalheDoContrato(tenantId, l.id, hoje)));
        extra.detalhes = detalhes.filter(Boolean).map((d) => ({
          codigo: d!.contrato.codigo,
          ...(assunto === "aditivos" ? { aditivos: d!.aditivos.map((a) => ({ codigo: a.codigo, situacao: a.status, tipos: a.tipos, variacao: Number(a.valorDelta), novoTermino: a.novoTermino, assinatura: a.dataAssinatura, vigencia: a.inicioVigencia, justificativa: a.justificativa })) } : {}),
          ...(assunto === "medicoes" ? { itens: d!.itens.map((i) => ({ codigo: i.codigo, descricao: i.descricao, limite: i.limite, medido: i.medido, saldo: i.saldo })), medicoes: d!.medicoes.slice(0, MAX_GRUPOS).map((m) => ({ periodo: m.competencia, valor: Number(m.valor), situacao: m.status })) } : {}),
          ...(assunto === "financeiro" ? { custoApropriado: d!.resultado.custoRealizado, margemSobreMedido: d!.resultado.margemSobreMedido, faturas: d!.faturas.filter((f) => !f.cancelado).map((f) => ({ valor: f.valor, vencimento: f.vencimento, recebido: f.recebido })), reembolsos: d!.reembolsos.filter((r) => !r.cancelado).map((r) => ({ situacao: r.status, solicitado: Number(r.valorSolicitado), aprovado: r.valorAprovado == null ? null : Number(r.valorAprovado) })) } : {}),
        }));
      }
      return JSON.stringify({
        fonte: "Contratos e Aditivos (valor atualizado = original + aditivos assinados e vigentes; medição só conta aprovada; faturado = contas a receber do contrato)",
        ...(fin ? {} : { observacao: "A pessoa não tem acesso financeiro de contratos: faturado, recebido e custos não foram lidos." }),
        ...(assunto === "financeiro" && !fin ? { erro: "Sem acesso financeiro de contratos. Diga isso; não estime." } : {}),
        contratos: base,
        ...extra,
        ...(todos.length > escolhidos.length && !pedidos.length ? { outros: todos.length - escolhidos.length } : {}),
      });
    }

    case "plano_de_trabalho": {
      if (!pode(ctx, "plano")) return semPermissao("Plano de Trabalho");
      const assunto = texto(o, "assunto") || "resumo";
      const hoje = hojeMDY();
      const alvo = obras.slice(0, 10);
      const ids = alvo.map((p) => p.id);
      if (!ids.length) return JSON.stringify({ erro: "nenhum projeto encontrado", ...aviso });
      const [fases, atividades, entregas] = await Promise.all([
        db.select().from(schema.projetoFases).where(and(eq(schema.projetoFases.tenantId, tenantId), inArray(schema.projetoFases.projectId, ids))),
        db.select().from(schema.projetoAtividades).where(and(eq(schema.projetoAtividades.tenantId, tenantId), inArray(schema.projetoAtividades.projectId, ids))),
        db.select().from(schema.projetoEntregas).where(and(eq(schema.projetoEntregas.tenantId, tenantId), inArray(schema.projetoEntregas.projectId, ids))),
      ]);
      const st = (s: string) => ROTULO_STATUS_ITEM[s as keyof typeof ROTULO_STATUS_ITEM] ?? s;
      // Sem nome de pessoa (responsável e profissional ficam de fora).
      const projetos = alvo.map((p) => {
        const fs = fases.filter((f) => f.projectId === p.id).sort((a, b) => a.ordem - b.ordem);
        const as = atividades.filter((a) => a.projectId === p.id);
        const es = entregas.filter((e) => e.projectId === p.id);
        const progFases = fs.map((f) => ({ f, prog: progressoDaFase(f, as.filter((a) => a.faseId === f.id)) }));
        const geral = consolidar(progFases.map(({ f, prog }) => ({ id: f.id, status: f.status, percentual: prog.percentual, peso: f.peso })));
        const atrasos = [...fs.map((f) => ({ tipo: "fase", nome: f.nome, i: f })), ...as.map((a) => ({ tipo: a.parentId ? "subatividade" : "atividade", nome: a.nome, i: a }))]
          .filter((x) => atrasado(x.i, hoje))
          .slice(0, MAX_GRUPOS)
          .map((x) => ({ tipo: x.tipo, nome: x.nome, terminoPlanejado: x.i.terminoPrevisto, terminoLinhaDeBase: x.i.terminoOriginal, situacao: st(x.i.status) }));
        const base = {
          projeto: p.name,
          temPlano: fs.length > 0,
          fases: fs.length,
          atividades: as.filter((a) => !a.parentId).length,
          subatividades: as.filter((a) => a.parentId).length,
          entregas: es.length,
          progressoFisico: geral.percentual,
          ...(geral.percentual == null ? { semProgressoPorque: geral.motivo } : {}),
          itensAtrasados: atrasos.length,
        };
        if (assunto === "atrasos") return { ...base, atrasos };
        if (assunto === "entregas")
          return {
            ...base,
            entregas: es.slice(0, MAX_GRUPOS).map((e) => ({ tipo: e.tipo, nome: e.nome, prevista: e.dataPrevista, linhaDeBase: e.dataOriginal, efetiva: e.dataEfetiva, situacao: ROTULO_STATUS_ENTREGA[e.status as keyof typeof ROTULO_STATUS_ENTREGA] ?? e.status, atrasada: !["entregue", "aceita", "cancelada"].includes(e.status) && atrasado({ terminoPrevisto: e.dataPrevista, terminoReal: e.dataEfetiva, status: e.status }, hoje) })),
          };
        if (assunto === "fases")
          return {
            ...base,
            fases: progFases.slice(0, MAX_GRUPOS).map(({ f, prog }) => ({
              nome: f.nome,
              situacao: st(f.status),
              inicio: f.inicioPrevisto,
              termino: f.terminoPrevisto,
              desvioDias: desvioEmDias(f.terminoOriginal, f.terminoPrevisto),
              progresso: prog.percentual,
              atividades: as.filter((a) => a.faseId === f.id && !a.parentId).slice(0, MAX_GRUPOS).map((a) => ({ nome: a.nome, situacao: st(a.status), termino: a.terminoPrevisto, percentual: a.percentual == null ? null : Number(a.percentual) })),
            })),
          };
        return base;
      });
      return JSON.stringify({ fonte: "Plano de Trabalho dos projetos (progresso físico pelo andamento informado; separado do financeiro)", hoje, projetos, ...aviso });
    }

    case "plano_de_contas": {
      if (!pode(ctx, "planocontas")) return semPermissao("Plano de Contas");
      const assunto = texto(o, "assunto") || "estrutura";
      const alvo = texto(o, "texto");
      const natureza = texto(o, "natureza") === "receita" ? "receita" : "despesa";
      const [contas, grupos] = await Promise.all([
        db.select().from(schema.chartAccounts).where(eq(schema.chartAccounts.tenantId, tenantId)),
        db.select().from(schema.chartGroups).where(eq(schema.chartGroups.tenantId, tenantId)),
      ]);
      const ficha = (c: (typeof contas)[number]) => {
        const cat = categoriaDaConta(c);
        return { codigo: c.code, nome: c.name, grupo: `${c.groupCode} ${c.groupName}`, natureza: c.natureza, ativa: c.ativo, categoriaDre: cat, classeGerencial: ROTULO_CLASSE[classeDaConta(c, cat)], custoPadrao: c.tipoCusto === "direto" || c.tipoCusto === "indireto" ? ROTULO_TIPO_CUSTO[c.tipoCusto] : "não se aplica", descricao: c.descricao };
      };
      if (assunto === "sugerir") {
        const cands = sugerirContas(alvo, contas.map((c) => ({ ...c, ativo: c.ativo, natureza: c.natureza })), natureza, 5);
        return JSON.stringify({
          fonte: "Plano de Contas da empresa (só contas ativas)",
          candidatas: cands.map((c) => ({ ...ficha(c), aderencia: c.semelhanca })),
          regra: "Proponha UMA conta desta lista no formulário; a pessoa confirma. Sem candidata boa, diga isso e sugira criar conta no Plano de Contas — nunca invente código. Projeto, contrato e fase vão nos campos próprios, não na conta.",
        });
      }
      if (assunto === "explicar") {
        const c = contas.find((x) => normalizarTexto(x.code) === normalizarTexto(alvo)) ?? contas.find((x) => normalizarTexto(x.name) === normalizarTexto(alvo));
        if (!c) return JSON.stringify({ erro: `Conta "${alvo}" não existe no plano desta empresa.` });
        return JSON.stringify({ conta: ficha(c), papelTecnico: c.papel });
      }
      if (assunto === "duplicidades") {
        const ativas = contas.filter((c) => c.ativo);
        const pares: { a: string; b: string; aderencia: number }[] = [];
        for (let i = 0; i < ativas.length && pares.length < MAX_GRUPOS; i++)
          for (let j = i + 1; j < ativas.length && pares.length < MAX_GRUPOS; j++) {
            const sim = semelhanca(ativas[i].name, ativas[j].name);
            if (ativas[i].natureza === ativas[j].natureza && sim >= 0.8) pares.push({ a: `${ativas[i].code} ${ativas[i].name}`, b: `${ativas[j].code} ${ativas[j].name}`, aderencia: Math.round(sim * 100) / 100 });
          }
        return JSON.stringify({ fonte: "Plano de Contas (contas ativas)", possiveisDuplicidades: pares, regra: "É sugestão: unir contas ou reclassificar lançamentos é decisão da pessoa, na tela, com prévia." });
      }
      if (assunto === "sem_classificacao") {
        if (!pode(ctx, "despesas")) return semPermissao("Despesas");
        const codigos = new Set(contas.map((c) => c.code));
        const linhas = await db
          .select({ conta: schema.despesas.contaCef, valor: schema.despesas.valor, projectId: schema.versions.projectId })
          .from(schema.despesas)
          .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
          .where(and(eq(schema.despesas.tenantId, tenantId), eq(schema.versions.kind, "atual"), eq(schema.despesas.cancelado, false), inArray(schema.versions.projectId, ctx.projects.map((p) => p.id))));
        const fora = linhas.filter((l) => !l.conta || !codigos.has(l.conta));
        return JSON.stringify({
          fonte: "Despesas da versão Atual nos projetos que a pessoa vê",
          ...agrupar(fora.map((l) => ({ chave: { conta: l.conta ?? "sem conta" }, valor: Number(l.valor) }))),
          quantidade: fora.length,
          regra: "Para corrigir: editar a despesa ou usar Plano de Contas → Reclassificar lançamentos (com prévia).",
        });
      }
      if (assunto === "pouco_uso") {
        if (!pode(ctx, "despesas")) return semPermissao("Despesas");
        const ativas = contas.filter((c) => c.ativo && c.natureza === "despesa");
        const usos = await db
          .select({ conta: schema.despesas.contaCef, n: sql<number>`count(*)::int`, valor: sql<string>`coalesce(sum(${schema.despesas.valor}),0)` })
          .from(schema.despesas)
          .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
          .where(and(eq(schema.despesas.tenantId, tenantId), eq(schema.versions.kind, "atual"), eq(schema.despesas.cancelado, false), inArray(schema.versions.projectId, ctx.projects.map((p) => p.id))))
          .groupBy(schema.despesas.contaCef);
        const porConta = new Map(usos.map((u) => [u.conta, u]));
        const lista = ativas
          .map((c) => ({ conta: `${c.code} ${c.name}`, lancamentos: porConta.get(c.code)?.n ?? 0, valor: r2(Number(porConta.get(c.code)?.valor ?? 0)) }))
          .sort((a, b) => a.lancamentos - b.lancamentos || a.valor - b.valor);
        return JSON.stringify({
          fonte: "Contas ativas de despesa × despesas da versão Atual (todas as competências) nos projetos que a pessoa vê",
          semUso: lista.filter((x) => x.lancamentos === 0).length,
          poucoUsadas: lista.filter((x) => x.lancamentos > 0).slice(0, MAX_GRUPOS),
          exemplosSemUso: lista.filter((x) => x.lancamentos === 0).slice(0, MAX_GRUPOS).map((x) => x.conta),
          regra: "Conta sem uso não é erro: o plano padrão traz contas para a empresa escolher. Inativar ou unir é decisão da pessoa, na tela.",
        });
      }
      const filtro = normalizarTexto(alvo);
      const escolhidas = contas.filter((c) => !filtro || normalizarTexto(`${c.code} ${c.name} ${c.groupName}`).includes(filtro)).slice(0, 80);
      return JSON.stringify({
        fonte: "Plano de Contas da empresa",
        grupos: grupos.filter((g) => !g.parentId).map((g) => ({ codigo: g.code, nome: g.name, subgrupos: grupos.filter((x) => x.parentId === g.id).map((x) => `${x.code} ${x.name}`) })),
        contas: escolhidas.map((c) => `${c.code} ${c.name} [${categoriaDaConta(c)}${c.ativo ? "" : ", inativa"}]`),
        ...(contas.length > escolhidas.length ? { outras: contas.length - escolhidas.length } : {}),
      });
    }

    case "analise_gerencial": {
      // Mesmas permissões da fonte gerencial na tela de Relatórios.
      if (!pode(ctx, "contratos")) return semPermissao("Contratos");
      const verHoras = pode(ctx, "equipes");
      const permitidas = metricasPermitidas({ financeiro: pode(ctx, "contratosfinanceiro"), horas: verHoras });
      const dimPedida = texto(o, "dimensao");
      const dim: Dimensao = (DIMENSOES_DA_CRIS as readonly string[]).includes(dimPedida) ? (dimPedida as Dimensao) : "contrato";
      const pedidas = lista(o, "metricas").filter((m): m is Metrica => (METRICAS as readonly string[]).includes(m));
      const omitidas = pedidas.filter((m) => !permitidas.includes(m));
      const metricas = [...new Set(pedidas.length ? pedidas : METRICAS_PADRAO)].filter((m) => permitidas.includes(m)).slice(0, 8);
      if (!metricas.length) return semPermissao("o financeiro dos contratos ou Equipes (horas)");
      const fatos = await fatosGerenciais(tenantId, obras, { incluirHoras: verHoras });
      const t = tabelaGerencial(fatos, { titulo: "", fonte: "gerencial", colunas: "cenario", cenarios: ["atual"], proj: "all", de, ate, av: false, dim, metricas }, metricas);
      // Cliente pessoa física não vai ao modelo (só CNPJ aparece pelo nome).
      let rotuloDoCliente = (s: string) => s;
      if (dim === "cliente") {
        const cls = await db.select({ nome: schema.clientes.nomeCompleto, doc: schema.clientes.cpfCnpj }).from(schema.clientes).where(eq(schema.clientes.tenantId, tenantId));
        const pf = new Set(cls.filter((c) => (c.doc ?? "").replace(/\D/g, "").length !== 14).map((c) => c.nome));
        rotuloDoCliente = (s) => (pf.has(s) ? "cliente pessoa física" : s);
      }
      const total = t.linhas.at(-1)!;
      const iMargem = metricas.indexOf("margem");
      let linhas = t.linhas.slice(0, -1);
      if (texto(o, "somente") === "margem_negativa") linhas = iMargem >= 0 ? linhas.filter((l) => l.valores[iMargem] < 0) : [];
      const iPrimeira = 0;
      return JSON.stringify({
        fonte: "Relatório gerencial (o mesmo motor de Relatórios Customizados → Gerencial), só projetos que a pessoa vê",
        ...(metricas.some((m) => m === "receitaReconhecida" || m === "margem") ? { regraDeReceita: "Receita reconhecida = faturas do contrato com vencimento até hoje (regra atual; a política definitiva aguarda validação contábil)." } : {}),
        dimensao: ROTULO_DIMENSAO[dim],
        periodo,
        colunas: metricas.map((m) => ROTULO_METRICA[m]),
        linhas: linhas.slice(0, MAX_GRUPOS).map((l) => ({ [ROTULO_DIMENSAO[dim]]: rotuloDoCliente(l.label), ...Object.fromEntries(metricas.map((m, i) => [ROTULO_METRICA[m], l.valores[i]])), percentualDaPrimeiraColuna: pct(l.valores[iPrimeira], total.valores[iPrimeira]) })),
        ...(linhas.length > MAX_GRUPOS ? { outrasLinhas: linhas.length - MAX_GRUPOS } : {}),
        total: Object.fromEntries(metricas.map((m, i) => [ROTULO_METRICA[m], total.valores[i]])),
        ...(omitidas.length ? { semAcesso: `Métricas omitidas por falta de acesso (financeiro dos contratos ou Equipes): ${omitidas.map((m) => ROTULO_METRICA[m]).join(", ")}. Diga isso; não estime.` } : {}),
        ...(o.somente === "margem_negativa" && iMargem < 0 ? { aviso: "Peça a métrica margem para filtrar margem negativa." } : {}),
        ...aviso,
      });
    }

    case "projecao_ao_termino": {
      if (!pode(ctx, "forecast")) return semPermissao("Previsão");
      const hoje = new Date();
      const linhas: Record<string, unknown>[] = [];
      for (const obra of obras.slice(0, MAX_GRUPOS)) {
        const p = await projecaoDoProjeto(tenantId, obra.id, hoje);
        if (!p) continue;
        if (texto(o, "somente") === "com_desvio" && !((p.desvioDeCusto ?? 0) > 0.005)) continue;
        linhas.push({
          projeto: obra.name,
          orcamentoOriginal: p.orcamentoOriginal,
          orcamentoRevisado: p.orcamentoRevisado,
          realizadoAteHoje: p.realizadoAteHoje,
          custoParaConcluir: r2(p.custoParaConcluir),
          custoEstimadoAoTermino: r2(p.custoEstimadoAoTermino),
          desvioDeCusto: p.desvioDeCusto == null ? null : r2(p.desvioDeCusto),
          desvioDeCustoPct: p.desvioDeCustoPct,
          receitaEstimada: r2(p.receitaEstimada),
          resultadoEstimado: r2(p.resultadoEstimado),
          margemEstimadaPct: p.margemEstimadaPct,
          margemOrcadaPct: p.margemOrcadaPct,
          baseDoRestante: p.baseDoRestante === "previsao" ? `Previsão (${p.versoes.previsao ?? ""})` : p.baseDoRestante === "orcamento" ? `Orçamento revisado (${p.versoes.revisado ?? ""})` : "sem base para o restante",
        });
      }
      return JSON.stringify({
        fonte: "Previsão → Projeção ao término (custo = custos e despesas da cascata; retiradas e investimentos fora)",
        projetos: linhas,
        ...(obras.length > MAX_GRUPOS ? { aviso: `Só os primeiros ${MAX_GRUPOS} projetos; peça projetos específicos.` } : {}),
        ...aviso,
      });
    }

    case "montar_relatorio": {
      if (!pode(ctx, "relatorios") && !pode(ctx, "dre")) return semPermissao("Relatórios");
      const obraNome = texto(o, "obra");
      const obra = obraNome ? obrasPedidas(ctx, [obraNome]).obras[0] : null;
      const fonte = texto(o, "fonte");
      if (fonte === "gerencial" && !pode(ctx, "contratos")) return semPermissao("Contratos");
      const dimensao = texto(o, "dimensao");
      const receita = receitaValida(
        {
          titulo: texto(o, "titulo"), fonte, colunas: texto(o, "colunas"), cenarios: lista(o, "cenarios"), proj: obra?.id ?? "all", de, ate, av: o.analiseVertical === true,
          // A fonte gerencial nunca recebe a dimensão "profissional" pela Cris.
          ...(fonte === "gerencial" ? { dim: (DIMENSOES_DA_CRIS as readonly string[]).includes(dimensao) ? dimensao : "contrato", metricas: lista(o, "metricas") } : {}),
        },
        ctx.projects.map((p) => p.id),
      );
      return JSON.stringify({ link: urlDaReceita(receita), observacao: "Abra o link: a tela calcula com o acesso de quem abre e exporta CSV e PDF." });
    }
  }
  return JSON.stringify({ erro: "ferramenta desconhecida" });
}
