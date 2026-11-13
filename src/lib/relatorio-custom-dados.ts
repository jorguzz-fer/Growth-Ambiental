import "server-only";
import type { Project } from "@/lib/context";
import { chaveLigada } from "@/lib/chaves-tenant";
import { getChartAccounts, getVersionsDoProjeto } from "@/lib/queries";
import { versionAnaliticaByMonth } from "@/lib/dre-inputs";
import { flowMaps } from "@/lib/fluxo-caixa";
import { monthIndex, resolverCenario, textoDaCobertura } from "@/lib/dre";
import { projetosDoEscopo, rotuloDoEscopo } from "@/lib/projeto-selecao";
import { entradaVazia, type ContaAnalitica, type EntradaAnalitica } from "@/lib/dre-analitica";
import { mesesDoGrafico } from "@/lib/dashboard-graficos";
import { MAX_COLUNAS, ROTULO_CENARIO_RC, type ColunaDeDados, type ReceitaDeRelatorio, type CenarioRC } from "@/lib/relatorio-custom";

/**
 * Prompt RC — calcula as colunas de um relatório customizado com as MESMAS
 * funções da DRE (`versionAnaliticaByMonth`, que bate com a cascata) e do
 * Fluxo (`flowMaps`), e as mesmas chaves. Só as obras que a pessoa vê.
 */
export async function colunasDoRelatorio(
  tenantId: string,
  projetosVisiveis: readonly Project[],
  r: ReceitaDeRelatorio,
  hoje = new Date(),
): Promise<{ colunas: ColunaDeDados[]; contas: ContaAnalitica[]; escopo: string; avisos: string[] }> {
  const avisos: string[] = [];
  const unica = projetosVisiveis.find((p) => p.id === r.proj);
  const projetos = unica
    ? [unica]
    : r.proj === "ativos" || r.proj === "finalizados"
      ? projetosDoEscopo(projetosVisiveis, r.proj).projetos
      : [...projetosVisiveis];
  const escopo = unica ? unica.name : r.proj === "ativos" || r.proj === "finalizados" ? rotuloDoEscopo(r.proj) : "Empresa toda";
  const ehDre = r.fonte !== "fluxo";
  const nova = await chaveLigada(tenantId, ehDre ? "dre_definicao_nova" : "fluxo_definicao_nova");

  // Meses: mês a mês usa a janela do Dashboard; os outros, o período (aberto = tudo).
  const meses = r.colunas === "mes" ? mesesDoGrafico(hoje, r.de, r.ate) : null;
  if (meses && meses.length > MAX_COLUNAS) {
    avisos.push(`O período tem ${meses.length} meses; a tabela mostra os ${MAX_COLUNAS} mais recentes.`);
    meses.splice(0, meses.length - MAX_COLUNAS);
  }
  const lo = r.de ? monthIndex(r.de) : null;
  const hi = r.ate ? monthIndex(r.ate) : null;
  const noPeriodo = (mm: string) => {
    if (meses) return meses.includes(mm);
    const i = monthIndex(mm);
    if (lo == null && hi == null) return true;
    if (i == null) return false;
    return (lo == null || i >= lo) && (hi == null || i <= hi);
  };

  const versoes = await Promise.all(projetos.map((p) => getVersionsDoProjeto(tenantId, p.id)));
  const lista = projetos.map((p, i) => ({ id: p.id, name: p.name, versoes: versoes[i] }));
  const cenariosUsados: CenarioRC[] = r.colunas === "cenario" ? r.cenarios : [r.cenarios[0]];

  // Por (cenário, obra): o que cada mês tem.
  type PorMes = { dre?: Record<string, EntradaAnalitica>; fluxo?: { entradas: Record<string, number>; saidas: Record<string, number> } };
  const dados = new Map<string, PorMes>();
  for (const c of cenariosUsados) {
    const res = resolverCenario(c, lista, !nova);
    // O mesmo texto de cobertura da DRE: obra fora, ou com outra versão no lugar.
    const cobertura = textoDaCobertura(c, res);
    if (cobertura) avisos.push(cobertura);
    await Promise.all(
      res.map(async (x) => {
        if (!x.versao) return;
        const v = versoes[projetos.findIndex((p) => p.id === x.projetoId)].find((y) => y.id === x.versao!.id)!;
        dados.set(`${c}|${x.projetoId}`, ehDre ? { dre: await versionAnaliticaByMonth(tenantId, v.id, x.projetoId, { definicaoNova: nova }) } : { fluxo: await flowMaps(v, x.projetoId, { definicaoNova: nova }) });
      }),
    );
  }

  const somar = (chaves: string[], mesOk: (mm: string) => boolean): Omit<ColunaDeDados, "chave" | "titulo"> => {
    if (ehDre) {
      const e = entradaVazia();
      for (const k of chaves)
        for (const [mm, x] of Object.entries(dados.get(k)?.dre ?? {})) {
          if (!mesOk(mm)) continue;
          e.receitaVendas += x.receitaVendas;
          e.receitaPermuta += x.receitaPermuta;
          e.encargos += x.encargos;
          e.lancamentos.push(...x.lancamentos);
        }
      return { dre: e };
    }
    let entradas = 0;
    let saidas = 0;
    for (const k of chaves) {
      const f = dados.get(k)?.fluxo;
      if (!f) continue;
      for (const [mm, v] of Object.entries(f.entradas)) if (mesOk(mm)) entradas += v;
      for (const [mm, v] of Object.entries(f.saidas)) if (mesOk(mm)) saidas += v;
    }
    return { fluxo: { entradas, saidas } };
  };

  const colunas: ColunaDeDados[] = [];
  const todas = (c: CenarioRC) => projetos.map((p) => `${c}|${p.id}`);
  if (r.colunas === "cenario") {
    for (const c of cenariosUsados) colunas.push({ chave: c, titulo: ROTULO_CENARIO_RC[c], ...somar(todas(c), noPeriodo) });
  } else if (r.colunas === "mes") {
    const c = cenariosUsados[0];
    for (const mm of meses!) colunas.push({ chave: mm, titulo: mm, ...somar(todas(c), (x) => x === mm) });
    colunas.push({ chave: "total", titulo: "Total", ...somar(todas(c), noPeriodo) });
  } else {
    const c = cenariosUsados[0];
    const obras = projetos.slice(0, MAX_COLUNAS);
    if (projetos.length > MAX_COLUNAS) avisos.push(`São ${projetos.length} projetos; a tabela mostra os ${MAX_COLUNAS} primeiros e o total de todos.`);
    for (const p of obras) colunas.push({ chave: p.id, titulo: p.name, ...somar([`${c}|${p.id}`], noPeriodo) });
    colunas.push({ chave: "total", titulo: "Total", ...somar(todas(c), noPeriodo) });
  }

  const contas = ehDre ? (await getChartAccounts(tenantId)).map((c) => ({ code: c.code, name: c.name, groupCode: c.groupCode, groupName: c.groupName })) : [];
  return { colunas, contas, escopo, avisos };
}
