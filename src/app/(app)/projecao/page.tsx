import { getProjectVersions, getTenantContext } from "@/lib/context";
import { avisoNoSeletor } from "@/lib/situacao-versao";
import { chaveLigada } from "@/lib/chaves-tenant";
import { lerSelecaoDeProjeto } from "@/lib/projeto-selecao";
import { PedirProjeto } from "@/components/app/pedir-projeto";
import { ProjectPicker } from "@/components/app/project-picker";
import { LembrarProjeto } from "@/components/app/projeto-da-aba";
import {
  getInccRows,
  getReembolsos,
  getRevenueBySource,
  getUnits,
  getMonthlyRevenue,
  reembToCalc,
} from "@/lib/queries";
import { expandUnitReceivables } from "@/lib/calc/receivables";
import {
  reembursementsByMonth,
  PROJECTION_SOURCES,
  type MonthlyProjection,
} from "@/lib/calc";
import { brl0, monthInRange } from "@/lib/utils";
import { calendarYearWindows } from "@/lib/planning";
import { PageHeader } from "@/components/app/page-header";
import { AvisoTelaRemovida } from "@/components/app/aviso-tela-removida";
import { CrisDaTela } from "@/components/app/cris-contexto";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { BarChart, CHART_COLORS } from "@/components/app/charts";
import {
  ProjecaoYearSelect,
  ProjecaoExport,
  type ExportMatrix,
} from "@/components/app/projecao-controls";
import { DateRangeFilter } from "@/components/app/date-range-filter";
import { VersionMultiSelect } from "@/components/app/version-multiselect";
import {
  VersionCompareTable,
  type CompareRow,
} from "@/components/app/version-compare";
import { resolveCompareVersions } from "@/lib/report-versions";
import { can } from "@/lib/permissions";
import { AccessDenied } from "@/components/app/access-denied";

export const dynamic = "force-dynamic";

function sortMonth(a: string, b: string): number {
  const [ma, ya] = a.split("/").map(Number);
  const [mb, yb] = b.split("/").map(Number);
  return ya - yb || ma - mb;
}

const fmt = (v: number) => (v > 0 ? brl0(v) : "—");

export default async function ProjecaoPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; de?: string; ate?: string; vs?: string; proj?: string; project?: string; saiu?: string }>;
}) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // A página verifica "ver" antes de consultar qualquer dado (Prompt M, 2.2).
  // A guarda do layout não basta: ele renderiza em paralelo com a página e
  // não roda de novo na navegação dentro do app.
  if (!can(ctx.perms, "projecao", "ver")) return <AccessDenied />;
  // Prompt H (BH-3): selo no seletor quando a regra está ligada na empresa.
  const rascunhoFora = await chaveLigada(ctx.tenant.id, "rascunho_fora_dos_relatorios");

  // A obra vem da URL desta tela (Prompt A); sem ela, a aba reabre a última
  // escolhida ou a tela pede a escolha — nunca a obra do cookie. Relatório de
  // UMA obra: não há "Todos" aqui (B12 vale para os consolidáveis).
  const spObra = await searchParams;
  const selecaoObra = lerSelecaoDeProjeto(ctx.projects, spObra);
  const escolhido =
    selecaoObra.tipo === "projeto"
      ? await getProjectVersions(ctx.tenant.id, selecaoObra.projeto.id)
      : null;
  if (!escolhido?.trabalho) {
    return <PedirProjeto titulo="Projeção de Receitas" projetos={ctx.projects} oQue="ver a projeção" aviso={<AvisoTelaRemovida de={spObra.saiu} />} />;
  }
  const { project: obra, versions: versoesDaObra, trabalho: versaoTrabalho } = escolhido;
  const projectPicker = (
    <>
      <ProjectPicker
        projects={ctx.projects.map((p) => ({ id: p.id, label: p.name }))}
        selected={obra.id}
      />
      <LembrarProjeto projectId={obra.id} />
    </>
  );

  const sp = await searchParams;
  const de = sp.de ?? "";
  const ate = sp.ate ?? "";
  const hasRange = !!(de || ate);

  const compareVersions = resolveCompareVersions(sp.vs, versoesDaObra, versaoTrabalho);
  const multi = compareVersions.length > 1;
  const versionSelect = (
    <VersionMultiSelect
      versions={versoesDaObra.map((v) => ({ id: v.id, label: v.label, color: v.color, aviso: avisoNoSeletor(v, rascunhoFora) }))}
      selected={compareVersions.map((v) => v.id)}
    />
  );

  // ─────────────────────── Modo comparação (2–3 versões) ───────────────────
  if (multi) {
    const inFilter = (m: string) => !hasRange || monthInRange(m, de, ate);
    const perVersion = await Promise.all(
      compareVersions.map((v) => getRevenueBySource(v.id, obra.id)),
    );
    const sumFiltered = (map: MonthlyProjection) =>
      Object.entries(map)
        .filter(([m]) => inFilter(m))
        .reduce((a, [, v]) => a + v, 0);
    const rows: CompareRow[] = [
      ...PROJECTION_SOURCES.map((s) => ({
        label: s,
        values: perVersion.map((rv) => sumFiltered(rv.sources[s])),
      })),
      { label: "Liberações de Obra", values: perVersion.map((rv) => sumFiltered(rv.reemb)) },
      {
        label: "TOTAL",
        emphasis: "final" as const,
        values: perVersion.map(
          (rv) =>
            PROJECTION_SOURCES.reduce((a, s) => a + sumFiltered(rv.sources[s]), 0) +
            sumFiltered(rv.reemb),
        ),
      },
    ];
    return (
      <>
        <PageHeader
          title="Projeção de Receitas"
          subtitle="Comparativo de versões · receita total projetada por fonte"
          actions={
            <div className="flex flex-wrap items-end gap-3">
              {projectPicker}
            <DateRangeFilter de={de} ate={ate} />
              {versionSelect}
            </div>
          }
        />
        <AvisoTelaRemovida de={sp.saiu} />
        {/* Prompt IAR — a Cris compara as versões por fonte. */}
        <CrisDaTela
          titulo="Projeção de Receitas (comparação)"
          dados={{ obra: obra.name, versoes: compareVersions.map((v) => v.label), porFonte: rows.map((r) => ({ fonte: r.label, valores: r.values })), periodo: hasRange ? `${de || "início"} a ${ate || "fim"}` : "todo o horizonte" }}
          sugestoes={["Qual fonte mais muda entre as versões?", "E se o FGTS atrasar três meses?", "Quanto da receita depende das liberações?"]}
        />
        <VersionCompareTable
          firstColLabel="Fonte"
          columns={compareVersions.map((v) => ({ label: v.label, color: v.color }))}
          rows={rows}
        />
      </>
    );
  }

  // ─────────────────────── Modo detalhado (1 versão) ───────────────────────
  const version = compareVersions[0];
  const [unitRows, reembRows, incc, planoNovo] = await Promise.all([
    getUnits(version.tenantId, version.id),
    getReembolsos(version.tenantId, version.id),
    getInccRows(obra.tenantId, obra.id),
    chaveLigada(ctx.tenant.id, "plano_definicao_nova"),
  ]);

  // Projeção por unidade a partir dos RECEBÍVEIS do plano de pagamento — mesma
  // fonte da tela Contas a Receber, da DRE e do Fluxo de Caixa. Antes usava-se
  // calcProjection, que só soma as parcelas quando a cadeia de flags usar*
  // está ativa; como as vendas lançadas normalmente não as ativam, a projeção
  // saía zerada mesmo havendo recebíveis.
  const perUnit = unitRows.map((u) => {
    const proj: MonthlyProjection = {};
    for (const rec of expandUnitReceivables(u.paymentPlan, u.status, { definicaoNova: planoNovo })) {
      const p = rec.dia.split("/");
      if (p.length !== 3) continue;
      const mk = `${p[0]}/${p[2]}`; // MM/DD/YYYY → MM/YYYY
      proj[mk] = (proj[mk] || 0) + rec.valor;
    }
    return { row: u, proj };
  });
  const unitsProj: MonthlyProjection = {};
  for (const u of perUnit) {
    for (const [mm, v] of Object.entries(u.proj)) unitsProj[mm] = (unitsProj[mm] || 0) + v;
  }
  // Versões Budget/Forecast não guardam unidades — a receita delas vive em
  // budget_line. Sem isto, selecionar Budget/Forecast aqui zerava a tela.
  if (version.kind === "budget" || version.kind === "forecast") {
    const planejada = await getMonthlyRevenue(version.id, obra.id);
    for (const [mm, v] of Object.entries(planejada)) {
      unitsProj[mm] = (unitsProj[mm] || 0) + v;
    }
  }
  const reembMonth = reembursementsByMonth(reembToCalc(reembRows));

  // Eixo = INCC + meses da projeção (âncora nos dados).
  const axis = Array.from(
    new Set([...incc.map((r) => r.m), ...Object.keys(unitsProj), ...Object.keys(reembMonth)]),
  ).sort(sortMonth);

  // Recortes por ano-calendário (2025, 2026, … até o ano atual + 5).
  const years = calendarYearWindows(axis, new Date().getFullYear()).map((y) => ({
    value: Number(y.value),
    label: y.label,
    months: y.months,
  }));
  const curYear = new Date().getFullYear();
  const selectedYear = years.some((y) => y.value === Number(sp.ano))
    ? Number(sp.ano)
    : curYear;
  const yearMonths = hasRange
    ? axis.filter((m) => monthInRange(m, de, ate))
    : years.find((y) => y.value === selectedYear)?.months ?? [];

  const vendidas = unitRows.filter((u) => u.status === "Vendido").length;
  const grand = (p: MonthlyProjection) => Object.values(p).reduce((a, b) => a + b, 0);
  const reembGrand = grand(reembMonth);
  const totalGrand = grand(unitsProj) + reembGrand;

  // Matriz completa (todos os meses) para exportação.
  const exportMatrix: ExportMatrix = {
    months: axis,
    rows: [
      { label: "Liberações de Obra", values: axis.map((m) => reembMonth[m] || 0), total: reembGrand },
      {
        label: "TOTAL (todas as unidades)",
        values: axis.map((m) => (unitsProj[m] || 0) + (reembMonth[m] || 0)),
        total: totalGrand,
      },
      ...perUnit.map((u) => ({
        label: `${u.row.code} ${u.row.tipo ?? ""}`.trim(),
        values: axis.map((m) => u.proj[m] || 0),
        total: grand(u.proj),
      })),
    ],
  };

  return (
    <>
      <PageHeader
        title="Projeção de Receitas"
        subtitle={`Versão: ${version.label} · ${vendidas} unidades vendidas`}
        actions={
          <div className="flex flex-wrap items-end gap-3">
            {projectPicker}
            <DateRangeFilter de={de} ate={ate} />
            {!hasRange && years.length > 1 && (
              <ProjecaoYearSelect years={years} selected={selectedYear} />
            )}
            <ProjecaoExport matrix={exportMatrix} filename={`projecao-${version.key}.csv`} />
            {versionSelect}
          </div>
        }
      />
      <AvisoTelaRemovida de={sp.saiu} />
      {/* Prompt IAR — a Cris analisa e simula sobre a projeção da obra (sem dado de cliente). */}
      <CrisDaTela
        titulo="Projeção de Receitas"
        dados={{
          obra: obra.name,
          versao: version.label,
          unidadesVendidas: vendidas,
          unidades: unitRows.length,
          totalProjetado: totalGrand,
          liberacoes: reembGrand,
          porMes: axis.filter((m) => yearMonths.includes(m)).map((m) => ({ mes: m, unidades: unitsProj[m] || 0, liberacoes: reembMonth[m] || 0 })),
        }}
        sugestoes={["Qual o mês de maior recebimento?", "E se 20% das parcelas atrasarem um mês?", "Quanto entra até o fim do ano?"]}
      />

      <Card className="mb-6">
        <CardContent className="p-5">
          <BarChart
            height={300}
            currency
            stacked
            data={{
              labels: yearMonths,
              datasets: [
                {
                  label: "Unidades vendidas",
                  data: yearMonths.map((m) => unitsProj[m] || 0),
                  backgroundColor: CHART_COLORS.violet,
                  borderRadius: 4,
                },
                {
                  label: "Liberações de Obra",
                  data: yearMonths.map((m) => reembMonth[m] || 0),
                  backgroundColor: CHART_COLORS.green,
                  borderRadius: 4,
                },
              ],
            }}
          />
        </CardContent>
      </Card>

      {/* Consolidado por fonte */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">
              Consolidado por fonte — todas as unidades
            </h2>
            <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-accent)]">
              {vendidas} unidades vendidas
            </span>
          </div>
          <Matrix
            months={yearMonths}
            rows={[
              {
                label: "Liberações de Obra",
                values: yearMonths.map((m) => reembMonth[m] || 0),
                total: reembGrand,
              },
            ]}
            totalRow={{
              label: "TOTAL (todas as unidades)",
              values: yearMonths.map((m) => (unitsProj[m] || 0) + (reembMonth[m] || 0)),
              total: totalGrand,
            }}
          />
        </CardContent>
      </Card>

      {/* Detalhe por unidade */}
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
            <span aria-hidden>≣</span> Detalhe por unidade
          </h2>
          <Matrix
            months={yearMonths}
            firstColLabel="Unidade"
            rows={perUnit.map((u) => ({
              label: `${u.row.code} ${u.row.tipo ?? ""}`.trim(),
              values: yearMonths.map((m) => u.proj[m] || 0),
              total: grand(u.proj),
            }))}
          />
        </CardContent>
      </Card>
    </>
  );
}

function Matrix({
  months,
  rows,
  totalRow,
  firstColLabel = "Fonte",
}: {
  months: string[];
  rows: { label: string; values: number[]; total: number }[];
  totalRow?: { label: string; values: number[]; total: number };
  firstColLabel?: string;
}) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>{firstColLabel}</TH>
          {months.map((m) => (
            <TH key={m} className="text-right">
              {m}
            </TH>
          ))}
          <TH className="text-right">Total</TH>
        </tr>
      </THead>
      <tbody>
        {rows.map((r) => (
          <TR key={r.label}>
            <TD className="whitespace-nowrap font-medium text-[var(--color-ink)]">{r.label}</TD>
            {r.values.map((v, i) => (
              <TD key={i} className="text-right font-[family-name:var(--font-mono)] text-[var(--color-ink2)]">
                {fmt(v)}
              </TD>
            ))}
            <TD className="text-right font-[family-name:var(--font-mono)] font-semibold text-[var(--color-accent)]">
              {fmt(r.total)}
            </TD>
          </TR>
        ))}
        {totalRow && (
          <TR>
            <TD className="whitespace-nowrap font-semibold text-[var(--color-accent)]">
              {totalRow.label}
            </TD>
            {totalRow.values.map((v, i) => (
              <TD key={i} className="text-right font-[family-name:var(--font-mono)] font-medium text-[var(--color-ink)]">
                {fmt(v)}
              </TD>
            ))}
            <TD className="text-right font-[family-name:var(--font-mono)] font-semibold text-[var(--color-accent)]">
              {fmt(totalRow.total)}
            </TD>
          </TR>
        )}
      </tbody>
    </Table>
  );
}
