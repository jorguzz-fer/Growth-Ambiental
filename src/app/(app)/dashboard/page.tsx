import { totalPendente } from "@/lib/contas-pagar-regras";
import { realizadoDaVersao } from "@/lib/movimento-obra";
import { getTenantContext, type Version } from "@/lib/context";
import { avisoNoSeletor } from "@/lib/situacao-versao";
import { chaveLigada } from "@/lib/chaves-tenant";
import { somarResumos, type Summary } from "@/lib/dashboard-resumo";
import {
  DEFINICAO_DO_KPI,
  DEFINICAO_NOVA_DO_KPI,
  MAX_VERSOES_DASHBOARD,
  ROTULO_DA_NATUREZA,
  rotuloDaVersao,
  selecaoDoDashboard,
  textoDoRecorte,
} from "@/lib/dashboard-tela";
import {
  TODOS_OS_PROJETOS,
  lerEscopoDeRelatorio,
  projetosDoEscopo,
  rotuloDoEscopo,
} from "@/lib/projeto-selecao";
import { LembrarProjeto, RecuperarProjeto } from "@/components/app/projeto-da-aba";
import {
  getMonthlyRevenue,
  getUnits,
  getIndicadoresObra,
  getIndicadoresObraConsolidado,
  getStatusProjeto,
  getVersionsDoProjeto,
  getContasPagar,
  getReceivables,
} from "@/lib/queries";
import { parseDate } from "@/lib/calc";
import { brl0, brlk, monthInRange, dateInRange } from "@/lib/utils";
import { estaVencida } from "@/lib/despesa-status";
import { analisarDashboard } from "@/lib/dashboard-analise";
import { AssistenteDashboard } from "@/components/app/assistente-dashboard";
import { PageHeader } from "@/components/app/page-header";
import { ProjectPicker } from "@/components/app/project-picker";
import { Card, CardContent } from "@/components/ui/card";
import { IndicadoresObraPanel, StatusProjetoPanel } from "@/components/app/indicadores-obra";
import { VersionMultiSelect } from "@/components/app/version-multiselect";
import { DateRangeFilter } from "@/components/app/date-range-filter";
import { can } from "@/lib/permissions";
import { AccessDenied } from "@/components/app/access-denied";
import { flowMaps } from "@/lib/fluxo-caixa";
import { versionInputsByMonth } from "@/lib/dre-inputs";
import { mesesDoGrafico, seriesDaDre, seriesDoFluxo, temValor } from "@/lib/dashboard-graficos";
import { GraficosDashboard } from "@/components/app/graficos-dashboard";
import { ExportarPdf } from "@/components/app/pdf";
import { CabecalhoDeImpressao } from "@/components/app/cabecalho-impressao";
import { CrisDaTela } from "@/components/app/cris-contexto";

export const dynamic = "force-dynamic";


/** Indicadores agregados de uma versão (para os KPIs e o comparativo). */
async function versionSummary(
  projectId: string,
  version: Version,
  de: string,
  ate: string,
  /**
   * Prompt AA — chave "dashboard_definicao_nova". Ligada: o VGV vem da versão
   * ATUAL da obra em toda coluna (4.5: unidade é fato da obra, não cenário) e
   * "A receber" do planejamento deixa de esconder o negativo (4.2).
   */
  opts: { definicaoNova?: boolean; atualId?: string | null } = {},
): Promise<Summary> {
  const hasRange = !!(de || ate);
  const nova = !!opts.definicaoNova;
  const idDoVgv = nova ? opts.atualId ?? null : version.id;
  const [unitRows, revenueAll, cashRows] = await Promise.all([
    idDoVgv ? getUnits(version.tenantId, idDoVgv) : Promise.resolve([]),
    getMonthlyRevenue(version.id, projectId),
    // Prompt AT §3: os gravados na versão e a parte dos movimentos sem obra
    // que o vínculo atribui a ela (a função lê com o tenant da versão).
    realizadoDaVersao(version.id),
  ]);
  // Filtro de período (item 3): receita por mês e realizado por data.
  const revenue = hasRange
    ? Object.fromEntries(
        Object.entries(revenueAll).filter(([mm]) => monthInRange(mm, de, ate)),
      )
    : revenueAll;
  const receitaProj = Object.values(revenue).reduce((a, b) => a + b, 0);
  // Entradas realizadas (fechamentos de caixa) no período, por data e por mês.
  const realizadoRows = cashRows.filter(
    (c) => Number(c.valor) > 0 && (!hasRange || dateInRange(c.data, de, ate)),
  );
  const realizado = realizadoRows.reduce((a, c) => a + Number(c.valor), 0);
  const realizadoMonthly: Record<string, number> = {};
  for (const c of realizadoRows) {
    const d = parseDate(c.data);
    if (!d) continue;
    const key = `${String(d.mo).padStart(2, "0")}/${d.yr}`;
    realizadoMonthly[key] = (realizadoMonthly[key] || 0) + Number(c.valor);
  }
  return {
    version,
    vgv: unitRows.reduce((a, u) => a + Number(u.valor), 0),
    vgvAusente: nova && !idDoVgv,
    realizado,
    receitaProj,
    aReceber: nova ? receitaProj - realizado : Math.max(0, receitaProj - realizado),
    aPagar: 0,
    monthly: revenue,
    realizadoMonthly,
  };
}

const TIPOS_CONSOLIDADOS = ["budget", "forecast", "atual"] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ vs?: string; de?: string; ate?: string; proj?: string; project?: string }>;
}) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // A página verifica "ver" antes de consultar qualquer dado (Prompt M, 2.2).
  // A guarda do layout não basta: ele renderiza em paralelo com a página e
  // não roda de novo na navegação dentro do app.
  if (!can(ctx.perms, "dashboard", "ver")) return <AccessDenied />;
  // Prompt H (BH-3): selo no seletor quando a regra está ligada na empresa.
  const rascunhoFora = await chaveLigada(ctx.tenant.id, "rascunho_fora_dos_relatorios");
  // Prompt AA, 10.2 — a definição nova do Dashboard (nasce desligada).
  const dashNovo = await chaveLigada(ctx.tenant.id, "dashboard_definicao_nova");

  const sp = await searchParams;
  const de = sp.de ?? "";
  const ate = sp.ate ?? "";
  // Obra ou escopo vêm da URL (Prompt A, 18). Sem nada: a obra lembrada pela
  // aba; sem memória, "Todos" (B12). Nunca a obra do cookie — que antes
  // fornecia os 4 KPIs do topo no modo "Todos" (Prompt AA, 2.2).
  const escopo = lerEscopoDeRelatorio(ctx.projects, sp);
  if (escopo.tipo === "nenhum") {
    return (
      <RecuperarProjeto
        idsPermitidos={ctx.projects.map((p) => p.id)}
        semMemoria={TODOS_OS_PROJETOS}
      />
    );
  }
  const isAll = escopo.tipo !== "projeto";
  const project = escopo.tipo === "projeto" ? escopo.projeto : null;
  const doEscopo = escopo.tipo === "projeto" ? null : projetosDoEscopo(ctx.projects, escopo.tipo);
  const projetosDaTela = project ? [project] : doEscopo!.projetos;
  const idsDaTela = new Set(projetosDaTela.map((p) => p.id));

  // Uma obra: as versões DELA, selecionáveis. Escopo: uma coluna por TIPO de
  // versão, somando as obras do escopo (decisão de 30/09).
  const versoes = project ? await getVersionsDoProjeto(ctx.tenant.id, project.id) : [];
  // Prompt AA, 1.2: padrão = Atual + o Orçamento e a Previsão MAIS RECENTES
  // que não são cópia (antes: as três mais antigas). 1.4: o que passa do
  // limite é informado, não descartado em silêncio.
  const wanted = (sp.vs ?? "").split(",").filter(Boolean);
  const { selecionadas: selected, descartadas } = selecaoDoDashboard(versoes, wanted);

  let summaries: Summary[];
  // Consolidado: em quantas obras cada coluna é feita (1.6 / cobertura).
  const obrasPorTipo: Record<string, number> = {};
  if (project) {
    const atualId = versoes.find((v) => v.kind === "atual")?.id ?? null;
    summaries = await Promise.all(selected.map((v) => versionSummary(project.id, v, de, ate, { definicaoNova: dashNovo, atualId })));
  } else {
    const versoesPorObra = await Promise.all(
      projetosDaTela.map(async (p) => ({ p, vs: await getVersionsDoProjeto(ctx.tenant.id, p.id) })),
    );
    const colunas = await Promise.all(
      TIPOS_CONSOLIDADOS.map(async (kind) => {
        obrasPorTipo[kind] = versoesPorObra.filter(({ vs }) => vs.some((x) => x.kind === kind)).length;
        const resumos = await Promise.all(
          versoesPorObra.flatMap(({ p, vs }) => {
            // A mais antiga do tipo, como nas demais telas.
            const v = vs.find((x) => x.kind === kind);
            const atualId = vs.find((x) => x.kind === "atual")?.id ?? null;
            return v ? [versionSummary(p.id, v, de, ate, { definicaoNova: dashNovo, atualId })] : [];
          }),
        );
        return somarResumos(kind, resumos);
      }),
    );
    summaries = colunas.filter((c): c is Summary => c !== null);
  }

  const indicadores = isAll
    ? await getIndicadoresObraConsolidado(
        ctx.tenant.id,
        projetosDaTela.map((p) => p.id),
        { definicaoNova: dashNovo },
      )
    : await getIndicadoresObra(ctx.tenant.id, project!.id, { definicaoNova: dashNovo });
  const statusProjeto = await getStatusProjeto(
    ctx.tenant.id,
    projetosDaTela.map((p) => p.id),
    dashNovo ? { definicaoNova: true, de, ate } : {},
  );

  // ── Prompt AA2 — os gráficos: Fluxo e DRE da versão Atual de cada obra ──
  // Mesmas funções e chaves do Fluxo de Caixa e da DRE; obra sem Atual fica fora.
  const [fluxoNovoG, dreNovaG] = await Promise.all([
    chaveLigada(ctx.tenant.id, "fluxo_definicao_nova"),
    chaveLigada(ctx.tenant.id, "dre_definicao_nova"),
  ]);
  const mesesGrafico = mesesDoGrafico(new Date(), de, ate);
  const atuaisDaTela = (
    await Promise.all(projetosDaTela.map(async (p) => ({ p, v: (await getVersionsDoProjeto(ctx.tenant.id, p.id)).find((x) => x.kind === "atual") })))
  ).filter((x): x is { p: (typeof projetosDaTela)[number]; v: Version } => !!x.v);
  const [mapasDoFluxo, inputsDaDre] = await Promise.all([
    Promise.all(atuaisDaTela.map(({ p, v }) => flowMaps(v, p.id, { definicaoNova: fluxoNovoG }))),
    Promise.all(atuaisDaTela.map(({ p, v }) => versionInputsByMonth(ctx.tenant.id, v.id, p.id, { definicaoNova: dreNovaG }))),
  ]);
  const graficoFluxo = seriesDoFluxo(mapasDoFluxo, mesesGrafico);
  const graficoDre = seriesDaDre(inputsDaDre, mesesGrafico);

  // ── Versão "Atual — caixa real": dados reais ────────────────────────────
  // Budget/Forecast permanecem estritamente em suas seções. A versão Atual
  // reflete o caixa real do período: (a) fechamentos já realizados (entradas
  // conciliadas), (b) recebíveis das unidades vendidas ainda não recebidos
  // (entradas projetadas) e (c) despesas lançadas ainda não pagas (saídas
  // projetadas / contas a pagar).
  const hasRangeDash = !!(de || ate);
  const realReceb = (await getReceivables(ctx.tenant.id)).filter(
    (r) =>
      idsDaTela.has(r.projectId) &&
      (!hasRangeDash || dateInRange(r.dia, de, ate)),
  );
  const totalReceb = realReceb.reduce((a, r) => a + r.valor, 0);

  // Contas a pagar (despesas não pagas) do projeto, com vencimento no período.
  const todasContasPagar = await getContasPagar(ctx.tenant.id);
  const contasPagarProj = todasContasPagar.filter(
    (c) =>
      idsDaTela.has(c.projectId) &&
      c.status !== "Pago" &&
      !!c.vencimento &&
      (!hasRangeDash || dateInRange(c.vencimento, de, ate)),
  );
  // §15 — o que falta pagar é o saldo, não o valor original.
  const totalPagar = totalPendente(contasPagarProj);

  // Recebíveis por mês (entradas projetadas) — compõem o comparativo do Atual.
  const recebByMonth: Record<string, number> = {};
  for (const r of realReceb) {
    const d = parseDate(r.dia);
    if (!d) continue;
    const key = `${String(d.mo).padStart(2, "0")}/${d.yr}`;
    recebByMonth[key] = (recebByMonth[key] || 0) + r.valor;
  }
  for (const s of summaries) {
    if (s.version.kind !== "atual") continue;
    // Comparativo mensal = entradas realizadas (fechamentos) + recebíveis projetados.
    const monthly: Record<string, number> = { ...s.realizadoMonthly };
    for (const [mm, v] of Object.entries(recebByMonth)) {
      monthly[mm] = (monthly[mm] || 0) + v;
    }
    s.monthly = monthly;
    s.receitaProj = s.realizado + totalReceb;
    s.aReceber = totalReceb; // recebíveis ainda não recebidos
    s.aPagar = totalPagar; // despesas ainda não pagas
  }

  const kpis = [
    { icon: "🏢", label: "VGV total", def: dashNovo ? DEFINICAO_NOVA_DO_KPI.vgv : DEFINICAO_DO_KPI.vgv, get: (s: Summary) => (s.vgvAusente ? "—" : brlk(s.vgv)) },
    { icon: "↗", label: "Realizado acum.", def: DEFINICAO_DO_KPI.realizado, get: (s: Summary) => brlk(s.realizado) },
    {
      icon: "⏱",
      label: "A receber",
      def: dashNovo ? DEFINICAO_NOVA_DO_KPI.aReceber : DEFINICAO_DO_KPI.aReceber,
      get: (s: Summary) => (s.aReceber < 0 ? `−${brlk(-s.aReceber)}` : brlk(s.aReceber)),
    },
    {
      icon: "⬇",
      label: "A pagar",
      def: DEFINICAO_DO_KPI.aPagar,
      // Contas a pagar são exclusivas da versão Atual (caixa real).
      get: (s: Summary) => (s.version.kind === "atual" ? brlk(s.aPagar) : "—"),
    },
  ];
  // 4.1 — cada coluna declara a sua definição: só as das naturezas em tela.
  const temAtual = summaries.some((s) => s.version.kind === "atual");
  const temPlanejamento = summaries.some((s) => s.version.kind !== "atual");
  // 1.1 — natureza como título; o nome digitado como complemento.
  const cabecalho = (s: Summary) =>
    project
      ? rotuloDaVersao(s.version)
      : { titulo: ROTULO_DA_NATUREZA[s.version.kind] ?? s.version.kind, complemento: `soma de ${obrasPorTipo[s.version.kind] ?? 0} obra(s)`, copia: false };
  const recorte = textoDoRecorte({
    projetos: projetosDaTela.length,
    nomeDoProjeto: project?.name,
    versoes: summaries.map((s) => {
      const c = cabecalho(s);
      return project ? `${c.titulo} (“${c.complemento}”)` : `${c.titulo} (${c.complemento})`;
    }),
    de,
    ate,
  });

  // ── Prompt AA, Parte 6 — o assistente (somente leitura) ──────────────────
  // Lê os números que a tela já calculou; o escopo vem do servidor (o que
  // está selecionado), nunca de texto. 6.3.7: conta vencida só para quem vê
  // Contas a Pagar.
  const atencao: { obra: string; motivo: string }[] = [];
  const atencaoLimites: string[] = [
    "Medição recente: a medição por serviço não está em uso, então não há data de medição por obra para comparar.",
    "Caixa projetado negativo: o Dashboard não calcula saldo projetado por obra — o número está no Fluxo de Caixa.",
  ];
  if (can(ctx.perms, "contaspagar", "ver")) {
    for (const p of projetosDaTela) {
      const vencidas = todasContasPagar.filter((c) => c.projectId === p.id && estaVencida(c));
      if (vencidas.length)
        atencao.push({ obra: p.name, motivo: `${vencidas.length} conta(s) a pagar vencida(s), ${brl0(totalPendente(vencidas))} em aberto` });
    }
  } else {
    atencaoLimites.unshift("Contas vencidas: sua permissão não alcança Contas a Pagar.");
  }
  const analise = analisarDashboard({
    status: statusProjeto,
    indicadores,
    colunas: summaries.map((s) => {
      const c = cabecalho(s);
      return { titulo: c.titulo, complemento: c.complemento, kind: s.version.kind, vgv: s.vgv, vgvAusente: !!s.vgvAusente, realizado: s.realizado, aReceber: s.aReceber, aPagar: s.aPagar };
    }),
    definicaoNova: dashNovo,
    atencao,
    atencaoLimites,
    recorte: [projetosDaTela.map((p) => p.id).sort().join(","), selected.map((v) => v.id).join(","), de, ate].join("|"),
    fmt: brl0,
  });

  return (
    <>
      <CabecalhoDeImpressao empresa={ctx.tenant.name} geradoPor={ctx.userEmail} />
      <PageHeader
        eyebrow={
          project
            ? `${project.name} · ${ctx.tenant.name}`
            : `${rotuloDoEscopo(escopo.tipo as "todos" | "ativos" | "finalizados")} · ${ctx.tenant.name}`
        }
        title="Dashboard"
        subtitle={project ? "Visão geral do projeto" : "Visão geral consolidada, por tipo de versão"}
        actions={
          <div className="flex flex-wrap items-end gap-3">
            <ProjectPicker
              projects={ctx.projects.map((p) => ({ id: p.id, label: p.name }))}
              selected={
                project ? project.id : escopo.tipo === "todos" ? TODOS_OS_PROJETOS : escopo.tipo
              }
              allOption
              scopeOptions
            />
            <DateRangeFilter de={de} ate={ate} />
            <ExportarPdf arquivo={`Dashboard - ${project ? project.name : ctx.tenant.name}`} />
          </div>
        }
      />
      {project && <LembrarProjeto projectId={project.id} />}
      {/* Prompt IAR — a Cris analisa e simula sobre os números do Dashboard. */}
      <CrisDaTela
        titulo="Dashboard"
        dados={{
          escopo: project ? project.name : rotuloDoEscopo(escopo.tipo as "todos" | "ativos" | "finalizados"),
          recorte,
          colunas: summaries.map((s) => ({
            versao: cabecalho(s).titulo,
            vgv: s.vgvAusente ? null : s.vgv,
            realizadoAcumulado: s.realizado,
            aReceber: s.aReceber,
            aPagar: s.aPagar,
          })),
          fluxoPorMes: graficoFluxo.meses.map((mm, i) => ({ mes: mm, entradas: graficoFluxo.entradas[i], saidas: graficoFluxo.saidas[i] })),
          drePorMes: graficoDre.meses.map((mm, i) => ({ mes: mm, receita: graficoDre.receita[i], resultado: graficoDre.partes.Resultado[i] })),
        }}
        sugestoes={["Como está a obra em uma frase?", "E se a receita dos próximos meses cair 10%?", "Qual mês tem a maior saída prevista?"]}
      />
      {/* Prompt AA, 1.6 — o recorte escrito, e o seletor de versões logo abaixo do título. */}
      <div className="mb-4 space-y-2">
        <p className="text-[13px] text-[var(--color-ink2)]" data-recorte>
          {recorte}
        </p>
        {project && versoes.length > 0 && (
          <VersionMultiSelect
            versions={versoes.map((v) => {
              const r = rotuloDaVersao(v);
              return { id: v.id, label: `${r.titulo} · ${v.label}`, color: v.color, aviso: avisoNoSeletor(v, rascunhoFora), marca: r.copia ? "cópia" : null };
            })}
            selected={selected.map((v) => v.id)}
            max={MAX_VERSOES_DASHBOARD}
            noLimite="avisar"
          />
        )}
      </div>
      {doEscopo && doEscopo.semSituacao > 0 && (
        <p className="mb-4 rounded-[8px] bg-[var(--color-surface3)] px-3 py-2 text-[13px] text-[var(--color-ink2)]">
          {doEscopo.semSituacao} obra(s) sem status ficaram fora deste filtro. Classifique-as
          como Ativo ou Finalizado em Projetos.
        </p>
      )}
      {doEscopo && projetosDaTela.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-[var(--color-ink3)]">
            Nenhuma obra classificada como{" "}
            {escopo.tipo === "ativos" ? "Ativo" : "Finalizado"}. Classifique as obras em
            Projetos.
          </CardContent>
        </Card>
      ) : (
      <div className="flex flex-col gap-6 min-[1180px]:flex-row min-[1180px]:items-start">
      <div className="min-w-0 flex-1">
      {descartadas > 0 && (
        <p className="mb-3 rounded-[8px] bg-[var(--color-warning)]/10 px-3 py-2 text-[12.5px] text-[var(--color-ink2)]" role="status">
          {descartadas} versão(ões) pedida(s) ficaram fora: o cartão mostra no máximo {MAX_VERSOES_DASHBOARD}.
        </p>
      )}
      {/* Prompt AA, 1.3 — projeto sem versões: a ausência é declarada. */}
      {project && versoes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-[var(--color-ink3)]" data-sem-versoes>
            {project.name} não possui versões: os quatro indicadores por versão não são montados. Nenhuma versão de outro projeto
            é usada no lugar.
          </CardContent>
        </Card>
      ) : (
      <>
      {/* KPIs por versão */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5">
              <p className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
                <span aria-hidden>{k.icon}</span> {k.label}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                {summaries.map((s) => (
                  <div key={s.version.id}>
                    <div
                      className="font-[family-name:var(--font-mono)] text-[10px]"
                      style={{ color: s.version.color }}
                      title={cabecalho(s).complemento}
                    >
                      {cabecalho(s).titulo}
                    </div>
                    <div className="text-[10px] text-[var(--color-ink4)]">{cabecalho(s).complemento}</div>
                    <div
                      className="text-lg font-semibold"
                      style={{ color: s.version.color }}
                    >
                      {k.get(s)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 space-y-0.5 text-[10.5px] leading-snug text-[var(--color-ink4)]" data-definicao>
                {temAtual && <p>{k.def.atual}</p>}
                {temPlanejamento && <p>{k.def.planejamento}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
      <p className="mt-2 text-[11.5px] text-[var(--color-ink3)]" data-recorte-painel="kpis">
        <strong className="text-[var(--color-ink2)]">Os quatro de cima</strong> seguem o seletor de versão e o de período.
      </p>
      </>
      )}

      {/* Prompt AA2 — fluxo de caixa em linhas e DRE em barras empilhadas. */}
      <GraficosDashboard
        fluxo={graficoFluxo}
        dre={graficoDre}
        temFluxo={temValor(graficoFluxo.entradas, graficoFluxo.saidas)}
        temDre={temValor(graficoDre.receita, ...Object.values(graficoDre.partes))}
      />
      <p className="mt-2 text-[11.5px] text-[var(--color-ink3)]" data-recorte-painel="graficos">
        <strong className="text-[var(--color-ink2)]">Os dois gráficos</strong> mostram {mesesGrafico[0]} a {mesesGrafico[mesesGrafico.length - 1]} da versão Atual
        {atuaisDaTela.length < projetosDaTela.length ? ` (${projetosDaTela.length - atuaisDaTela.length} obra(s) sem Atual ficaram fora)` : ""}; sem período, os
        cinco meses anteriores, o atual e os seis seguintes.
      </p>

      {/* Indicadores físico-financeiros da obra (BDI, evolução, liberação). */}
      <StatusProjetoPanel st={statusProjeto} />
      <IndicadoresObraPanel ind={indicadores} />
      </div>
      <AssistenteDashboard usuario={ctx.userId ?? "anon"} analise={analise} />
      </div>
      )}
    </>
  );
}
