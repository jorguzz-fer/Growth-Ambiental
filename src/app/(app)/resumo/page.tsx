import { getProjectVersions, getTenantContext } from "@/lib/context";
import { avisoNoSeletor, entraNosRelatorios } from "@/lib/situacao-versao";
import { chaveLigada } from "@/lib/chaves-tenant";
import { lerEscopoDeRelatorio, projetosDoEscopo, rotuloDoEscopo, TODOS_OS_PROJETOS } from "@/lib/projeto-selecao";
import { PedirProjeto } from "@/components/app/pedir-projeto";
import { ProjectPicker } from "@/components/app/project-picker";
import { LembrarProjeto } from "@/components/app/projeto-da-aba";
import {
  getContasPagar,
  getContasReceber,
  getMonthlyRevenue,
  getPermutas,
  getReembolsos,
  getUnits,
  getVersionsDoProjeto,
  permToCalc,
  permToResale,
  reembToCalc,
  toCalcUnit,
} from "@/lib/queries";
import { calcTotals, permutaCashByMonth } from "@/lib/calc";
import Link from "next/link";
import { and, count, eq, isNull, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import {
  BLOCOS_PENDENTES,
  STATUS_DE_UNIDADE,
  alertaDeDesvio,
  alertaDeVencidos,
  blocoAtencao,
  blocoExposicao,
  blocoVendas,
  parametrosDeAlerta,
  temPlanoDePagamento,
  textoDosLimites,
} from "@/lib/resumo-blocos";
import { custoOrcadoRealizado } from "@/lib/custo-orcado";
import {
  TIPOS_DO_RESUMO,
  percentual,
  somarIndicadores,
  somarUnidades,
  textoDaCobertura,
  totalDoComparativo,
  versaoDoTipo,
  type LinhaComparativa,
} from "@/lib/resumo-consolidado";
import { ROTULO_DA_NATUREZA } from "@/lib/dashboard-tela";
import { ehVersaoAtual, pendenteDaConta } from "@/lib/contas-pagar-regras";
import { estaVencida } from "@/lib/despesa-status";
import { analisarResumo } from "@/lib/resumo-analise";
import { AssistenteResumo } from "@/components/app/assistente-resumo";
import { TEXTO_DA_BASE, indicadoresDoResumo, type IndicadorDoResumo } from "@/lib/resumo-tela";
import { rotuloDaVersao } from "@/lib/dashboard-tela";
import { brl0, dateBR, monthInRange, pct1, ymd } from "@/lib/utils";
import { PageHeader } from "@/components/app/page-header";
import { DateRangeFilter } from "@/components/app/date-range-filter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { VersionMultiSelect } from "@/components/app/version-multiselect";
import {
  VersionCompareTable,
  type CompareRow,
} from "@/components/app/version-compare";
import { resolveCompareVersions } from "@/lib/report-versions";
import type { Version } from "@/lib/context";
import { can } from "@/lib/permissions";
import { AccessDenied } from "@/components/app/access-denied";
import { dadosDasObras } from "@/lib/indicadores-negocio-dados";
import { indicadoresEscolhidos, painelDeIndicadores } from "@/lib/indicadores-negocio";
import { IndicadoresNegocio } from "@/components/app/indicadores-negocio";
import { ExportarPdf } from "@/components/app/pdf";
import { CabecalhoDeImpressao } from "@/components/app/cabecalho-impressao";
import { CrisDaTela } from "@/components/app/cris-contexto";
import { listarContratos } from "@/lib/contratos-queries";
import { resumoDosContratos, type ResumoDosContratos } from "@/lib/valor-contratado";

export const dynamic = "force-dynamic";

/** Indicadores gerais (valores contratados) de uma versão. */
async function versionIndicadores(
  version: Version,
  definicaoNova = false,
): Promise<IndicadorDoResumo[]> {
  return (await dadosDaVersao(version, definicaoNova)).indicadores;
}

/** O que a tela lê de UMA versão: indicadores, totais e unidades (mesmo cálculo de sempre). */
async function dadosDaVersao(version: Version, definicaoNova = false) {
  const [unitRows, permRows, reembRows] = await Promise.all([
    getUnits(version.tenantId, version.id),
    getPermutas(version.tenantId, version.id),
    getReembolsos(version.tenantId, version.id),
  ]);
  const totals = calcTotals(
    unitRows.map(toCalcUnit),
    permToCalc(permRows),
    liberacoesComStatus(reembRows),
    { definicaoNova },
  );
  const indicadores = indicadoresDoResumo({ totals, unidades: unitRows, permutas: permRows, liberacoes: reembRows.length, definicaoNova });
  return { indicadores, totals, unitRows, permRows };
}

/** As liberações com o status, que `calcTotals` só lê com a chave (2.7). */
function liberacoesComStatus(rows: Parameters<typeof reembToCalc>[0]) {
  return reembToCalc(rows).map((r, i) => ({ ...r, status: rows[i].status ?? null }));
}

export default async function ResumoPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; vs?: string; proj?: string; project?: string; ind?: string }>;
}) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // A página verifica "ver" antes de consultar qualquer dado (Prompt M, 2.2).
  // A guarda do layout não basta: ele renderiza em paralelo com a página e
  // não roda de novo na navegação dentro do app.
  if (!can(ctx.perms, "resumo", "ver")) return <AccessDenied />;
  // Prompt H (BH-3): selo no seletor quando a regra está ligada na empresa.
  const rascunhoFora = await chaveLigada(ctx.tenant.id, "rascunho_fora_dos_relatorios");
  // Prompt AE, seção 6 — a definição nova do Resumo (nasce desligada).
  const resumoNovo = await chaveLigada(ctx.tenant.id, "resumo_definicao_nova");

  // A obra vem da URL desta tela (Prompt A); sem ela, a aba reabre a última
  // escolhida ou a tela pede a escolha — nunca a obra do cookie. Decisão de
  // 01/10/2026: além de uma obra, o mesmo seletor do Dashboard — Todos,
  // Ativos e Finalizados — com o Resumo consolidado.
  const spObra = await searchParams;
  const escopo = lerEscopoDeRelatorio(ctx.projects, spObra);
  if (escopo.tipo === "todos" || escopo.tipo === "ativos" || escopo.tipo === "finalizados") {
    return (
      <ResumoConsolidado
        ctx={ctx}
        escopo={escopo.tipo}
        de={spObra.de ?? ""}
        ate={spObra.ate ?? ""}
        resumoNovo={resumoNovo}
        rascunhoFora={rascunhoFora}
        ind={spObra.ind}
      />
    );
  }
  const escolhido =
    escopo.tipo === "projeto"
      ? await getProjectVersions(ctx.tenant.id, escopo.projeto.id)
      : null;
  if (!escolhido?.trabalho) {
    return <PedirProjeto titulo="Resumo Executivo" projetos={ctx.projects} oQue="ver o resumo executivo" />;
  }
  const { project: obra, versions: versoesDaObra, trabalho: versaoTrabalho } = escolhido;
  const projectPicker = (
    <>
      <ProjectPicker
        projects={ctx.projects.map((p) => ({ id: p.id, label: p.name }))}
        selected={obra.id}
        allOption
        scopeOptions
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
  // Prompt AE, 3.5: a tela diz quando NÃO está na Atual — valores de
  // planejamento não são "valores contratados".
  const temAtual = versoesDaObra.some((v) => v.kind === "atual");
  const foraDaAtual = compareVersions.filter((v) => v.kind !== "atual");
  const avisoDaVersao =
    foraDaAtual.length === 0
      ? null
      : !temAtual
        ? `${obra.name} não tem versão Atual: a tela mostra ${foraDaAtual.map((v) => `${rotuloDaVersao(v).titulo} “${v.label}”`).join(", ")}, que é planejamento, não o contratado.`
        : `${foraDaAtual.map((v) => `${rotuloDaVersao(v).titulo} “${v.label}”`).join(", ")}: valores de planejamento, não o contratado da Atual.`;
  const aviso = avisoDaVersao ? (
    <p className="mb-4 rounded-[8px] bg-[var(--color-warning)]/10 px-3 py-2 text-[12.5px] text-[var(--color-ink2)]" role="status" data-aviso-versao>
      {avisoDaVersao}
    </p>
  ) : null;
  const versionSelect = (
    <VersionMultiSelect
      versions={versoesDaObra.map((v) => {
        const r = rotuloDaVersao(v);
        return { id: v.id, label: `${r.titulo} · ${v.label}`, color: v.color, aviso: avisoNoSeletor(v, rascunhoFora), marca: r.copia ? "cópia" : null };
      })}
      selected={compareVersions.map((v) => v.id)}
      noLimite="avisar"
    />
  );

  // ─────────────────────── Modo comparação (2–3 versões) ───────────────────
  if (multi) {
    const perVersion = await Promise.all(compareVersions.map((v) => versionIndicadores(v, resumoNovo)));
    const labels = perVersion[0].map((i) => i.label);
    const rows: CompareRow[] = labels.map((label, ri) => ({
      label,
      values: perVersion.map((ind) => ind[ri]?.value ?? 0),
    }));
    return (
      <>
        <PageHeader
          title="Resumo Executivo"
          subtitle="Comparativo de versões · indicadores gerais"
          actions={
            <div className="flex flex-wrap items-end gap-3">
              {projectPicker}
              {/* 4.2 — o período não tem efeito na comparação: o filtro sai daqui. */}
            </div>
          }
        />
        <div className="mb-4">{versionSelect}</div>
        {aviso}
        {/* Growth Ambiental: esta comparação é dos indicadores de venda de unidades
            (dados antigos de incorporação). Sem esses dados, a tela aponta a DRE. */}
        {rows.some((r) => r.values.some((v) => v !== 0)) ? (
          <>
            <p className="mb-3 text-[12px] text-[var(--color-ink3)]" data-criterios>
              Dados antigos de incorporação. O VGV conta {TEXTO_DA_BASE.todas_unidades}; Sinais, Mensais, Semestrais, Anuais, FGTS e Subsídio
              contam {TEXTO_DA_BASE.vendidas}; valores nominais. O período não se aplica à comparação.
            </p>
            <VersionCompareTable
              firstColLabel="Indicador"
              columns={compareVersions.map((v) => ({ label: v.label, color: v.color }))}
              rows={rows}
            />
          </>
        ) : (
          <p className="text-[13px] text-[var(--color-ink2)]" data-sem-legado>
            Estas versões não têm dados de venda de unidades. Para comparar receitas e custos entre versões, use a{" "}
            <Link href="/dre" className="text-[var(--color-accent2)] hover:underline">DRE</Link>; os números dos contratos de serviço não
            variam por versão e ficam no <Link href="/contratos/painel" className="text-[var(--color-accent2)] hover:underline">Painel de Contratos</Link>.
          </p>
        )}
      </>
    );
  }

  // ─────────────────────── Modo detalhado (1 versão) ───────────────────────
  const version = compareVersions[0];
  const [unitRows, permRows, reembRows, revenue] = await Promise.all([
    getUnits(version.tenantId, version.id),
    getPermutas(version.tenantId, version.id),
    getReembolsos(version.tenantId, version.id),
    getMonthlyRevenue(version.id, obra.id),
  ]);

  // Recebimentos previstos no período (item 3): receita mensal + revenda de
  // permuta, restritos ao intervalo [de, ate]. Os "Indicadores Gerais" abaixo
  // são valores contratados (acumulados) e não dependem do período.
  const permCash = permutaCashByMonth(permToResale(permRows));
  const recebimentosPeriodo = [
    ...Object.entries(revenue),
    ...Object.entries(permCash),
  ]
    .filter(([mm]) => monthInRange(mm, de, ate))
    .reduce((a, [, v]) => a + v, 0);

  const totals = calcTotals(
    unitRows.map(toCalcUnit),
    permToCalc(permRows),
    liberacoesComStatus(reembRows),
    { definicaoNova: resumoNovo },
  );
  // Desligada: a soma de três filtros, como antes (2.3 entra pelo bloco Vendas, com a chave).
  const totalUnidades = totals.vend + totals.res + totals.disp;

  const indicadores = indicadoresDoResumo({ totals, unidades: unitRows, permutas: permRows, liberacoes: reembRows.length, definicaoNova: resumoNovo });
  // Growth Ambiental: unidades, permutas e liberações de obra são dados
  // ANTIGOS (incorporação). Os blocos que dependem deles só aparecem quando a
  // versão os tem; senão a tela mostra os números dos contratos de serviço.
  const temLegado = unitRows.length > 0 || permRows.length > 0 || reembRows.length > 0;
  const servicos = resumoDosContratos(await listarContratos(ctx.tenant.id), new Set([obra.id]));

  // ── Prompt AE, Parte 1 (chave): os blocos por pergunta ────────────────────
  const blocos = resumoNovo
    ? await montarBlocos({
        ctx,
        obra,
        version,
        temAtual,
        unitRows,
        permRows,
        totals,
        de,
        ate,
        rascunhoFora,
      })
    : null;

  // Prompt AE, Parte 5 — o assistente lê os números já montados acima.
  const analise = analisarResumo({
    obra: obra.name,
    versao: `${rotuloDaVersao(version).titulo} “${version.label}”`,
    definicaoNova: resumoNovo,
    indicadores,
    unidades: { total: unitRows.length, vendidas: totals.vend },
    servicos,
    vendas: blocos?.vendas ?? null,
    exposicao: blocos?.exposicao ?? null,
    atencao: blocos?.atencao ?? null,
    recorte: [obra.id, version.id, de, ate, resumoNovo ? "nova" : "hoje"].join("|"),
    fmt: brl0,
  });

  // Prompt AE2 — indicadores de negócio selecionáveis (da Atual da obra).
  const verCustoAE2 = can(ctx.perms, "despesas", "ver");
  const painel = painelDeIndicadores(await dadosDasObras(ctx.tenant.id, [obra], { verCusto: verCustoAE2, rascunhoFora }), verCustoAE2);

  return (
    <>
      <CabecalhoDeImpressao empresa={ctx.tenant.name} geradoPor={ctx.userEmail} />
      <PageHeader
        eyebrow={`${obra.name} · Versão ${version.label}`}
        title="Resumo Executivo"
        subtitle="Indicadores gerais calculados dinamicamente"
        actions={
          <div className="flex flex-wrap items-end gap-3">
            {projectPicker}
            <DateRangeFilter de={de} ate={ate} />
            <ExportarPdf arquivo={`Resumo Executivo - ${obra.name}`} />
          </div>
        }
      />
      <div className="mb-4">{versionSelect}</div>
      <IndicadoresNegocio {...painel} escolhidos={indicadoresEscolhidos(sp.ind, verCustoAE2)} />
      {/* Prompt IAR — a Cris analisa e simula sobre os números do Resumo. */}
      <CrisDaTela
        titulo="Resumo Executivo"
        dados={{
          obra: obra.name,
          versao: `${rotuloDaVersao(version).titulo} “${version.label}”`,
          contratosDeServico: servicos,
          ...(temLegado
            ? {
                indicadoresGeraisHistoricos: indicadores.map((i) => ({ item: i.label, valor: i.value })),
                unidadesHistoricas: { disponiveis: totals.disp, reservadas: totals.res, vendidas: totals.vend, total: totalUnidades },
              }
            : {}),
          recebimentosNoPeriodo: hasRange ? recebimentosPeriodo : null,
          indicadoresDeNegocio: Object.fromEntries(Object.entries(painel.valores).map(([id, v]) => [id, v[0]?.valor ?? null])),
        }}
        sugestoes={["Quanto falta medir e faturar neste projeto?", "Como está a margem do projeto?"]}
      />

      <div className="flex flex-col gap-6 min-[1180px]:flex-row min-[1180px]:items-start">
      <div className="min-w-0 flex-1">
      {aviso}
      {hasRange && (
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
                Recebimentos previstos no período
              </div>
              <div className="text-[12px] text-[var(--color-ink3)]">
                {dateBR(de) !== "—" ? dateBR(de) : "início"} até{" "}
                {dateBR(ate) !== "—" ? dateBR(ate) : "fim"} · receita prevista da versão
                {temLegado ? " (inclui unidades, liberações e revenda de permuta dos dados antigos)" : ""}
              </div>
            </div>
            <div className="font-[family-name:var(--font-mono)] text-2xl font-semibold text-[var(--color-success)]">
              {brl0(recebimentosPeriodo)}
            </div>
          </CardContent>
        </Card>
      )}

      <ServicosDoProjeto s={servicos} />

      {/* 4.1 (chave): os blocos por pergunta substituem a tabela por fonte de recurso. */}
      {blocos ? (
        <BlocosDoResumo b={blocos} />
      ) : !temLegado ? null : (
      <>
      <p className="mb-2 text-[12px] text-[var(--color-ink3)]" data-legado-incorporacao>
        Esta versão tem dados antigos de incorporação (unidades, permutas ou liberações de financiamento). Eles continuam aqui, só para consulta.
      </p>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Indicadores gerais */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">
              Indicadores Gerais
            </h2>
            <p className="mb-4 text-[11px] text-[var(--color-ink3)]">
              Valores acumulados da versão, não variam por período.{" "}
              {/* 4.3 — só aponta para o cartão de período quando ele existe. */}
              {hasRange
                ? "O recorte por data afeta só os recebimentos previstos acima."
                : "Para ver os recebimentos de um período, informe as datas acima."}{" "}
              Valores nominais, sem INCC. O VGV conta {TEXTO_DA_BASE.todas_unidades}; Sinais a Subsídio contam{" "}
              {TEXTO_DA_BASE.vendidas}.
            </p>
            <Table>
              <THead>
                <tr>
                  <TH>Indicador</TH>
                  <TH className="text-right">Valor</TH>
                </tr>
              </THead>
              <tbody>
                {indicadores.map((i) => (
                  <TR key={i.label}>
                    <TD className="text-[var(--color-ink2)]" title={`Base: ${TEXTO_DA_BASE[i.base]}`}>{i.label}</TD>
                    <TD
                      className={`text-right font-[family-name:var(--font-mono)] font-medium ${
                        i.value > 0
                          ? "text-[var(--color-accent2)]"
                          : "text-[var(--color-ink4)]"
                      }`}
                      title={i.vazio ? `Sem registro na base (${TEXTO_DA_BASE[i.base]})` : undefined}
                    >
                      {/* 4.4 — sem nada de onde somar é "—"; zero de fato é R$ 0. */}
                      {i.vazio ? "—" : brl0(i.value)}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        {/* Coluna direita */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-[var(--color-ink)]">
                Unidades
              </h2>
              <dl className="space-y-3">
                <StatRow label="Disponíveis" value={totals.disp} />
                <StatRow label="Reservadas" value={totals.res} tone="warning" />
                <StatRow label="Vendidas" value={totals.vend} tone="success" />
                <div className="flex items-center justify-between border-t border-[var(--color-accent2)]/12 pt-3">
                  <dt className="text-sm font-semibold text-[var(--color-ink)]">
                    Total
                  </dt>
                  <dd className="font-[family-name:var(--font-mono)] text-sm font-semibold text-[var(--color-ink)]">
                    {totalUnidades}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                  Financiamento Banco
                </h2>
                {/* 2.8 — o selo fala desta tela: o financiamento é projetado em outras (Projeção, DRE, Fluxo). */}
                <Badge tone="neutral">não entra nos totais desta tela</Badge>
              </div>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-[13px] text-[var(--color-ink2)]">Aprovado</dt>
                  <dd className="font-[family-name:var(--font-mono)] text-[13px] font-medium text-[var(--color-success)]">
                    {brl0(totals.banco)}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-[var(--color-accent2)]/12 pt-3">
                  <dt className="text-sm font-semibold text-[var(--color-ink)]">
                    Total financiado
                  </dt>
                  <dd className="font-[family-name:var(--font-mono)] text-sm font-semibold text-[var(--color-ink)]">
                    {brl0(totals.banco)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
      </>
      )}
      </div>
      <AssistenteResumo usuario={ctx.userId ?? "anon"} analise={analise} />
      </div>
    </>
  );
}

/** Números de serviço do projeto: contratos, medições, faturamento e recebimento. */
function ServicosDoProjeto({ s }: { s: ResumoDosContratos }) {
  const linhas: [string, number, string][] = [
    ["Valor contratado", s.contratado, "valor atualizado (original + aditivos eficazes), sem rascunho e cancelado"],
    ["Medido (aprovado)", s.medido, "medições aprovadas"],
    ["Saldo a medir", s.aMedir, "contratado menos o medido"],
    ["Medido não faturado", s.medidoNaoFaturado, "medições aprovadas ainda sem fatura"],
    ["Faturado", s.faturado, "contas a receber dos contratos, sem canceladas"],
    ["Recebido", s.recebido, "recebimentos das faturas dos contratos"],
    ["Faturado a receber", s.aReceber, "faturado menos o recebido"],
  ];
  return (
    <Card className="mb-6" data-servicos-do-projeto>
      <CardContent className="p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Contratos de serviço do projeto</h2>
          <Link href="/contratos/painel" className="text-[12px] text-[var(--color-accent2)] hover:underline">
            Painel de Contratos
          </Link>
        </div>
        {s.contratos === 0 ? (
          <p className="text-[13px] text-[var(--color-ink4)]">
            Nenhum contrato de serviço ligado a este projeto. Cadastre em <Link href="/contratos" className="text-[var(--color-accent2)] hover:underline">Contratos</Link>.
          </p>
        ) : (
          <>
            <p className="mb-3 text-[11px] text-[var(--color-ink3)]">
              {s.contratos} contrato(s). Valores acumulados, não variam por período nem por versão. Contrato que atende vários projetos entra
              pela parte alocada a este (ou dividido igualmente, se a alocação não foi informada).
            </p>
            <Table>
              <tbody>
                {linhas.map(([rotulo, valor, dica]) => (
                  <TR key={rotulo}>
                    <TD className="text-[var(--color-ink2)]" title={dica}>{rotulo}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)] font-medium text-[var(--color-ink)]">{brl0(valor)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warning" | "success";
}) {
  const color =
    tone === "warning"
      ? "var(--color-warning)"
      : tone === "success"
        ? "var(--color-success)"
        : "var(--color-ink)";
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[13px] text-[var(--color-ink2)]">{label}</dt>
      <dd
        className="font-[family-name:var(--font-mono)] text-sm font-semibold"
        style={{ color }}
      >
        {value}
      </dd>
    </div>
  );
}

type Blocos = Awaited<ReturnType<typeof montarBlocos>>;

/** Lê o que os blocos precisam — com tenant explícito e a permissão de cada tela de origem (5.4). */
async function montarBlocos(o: {
  ctx: NonNullable<Awaited<ReturnType<typeof getTenantContext>>>;
  obra: { id: string; name: string };
  version: Version;
  temAtual: boolean;
  unitRows: Awaited<ReturnType<typeof getUnits>>;
  permRows: Awaited<ReturnType<typeof getPermutas>>;
  totals: ReturnType<typeof calcTotals>;
  de: string;
  ate: string;
  rascunhoFora: boolean;
}) {
  const { ctx, obra } = o;
  const d = new Date();
  const hojeBR = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  const mesAtual = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const hoje = ymd(hojeBR);
  const vencida = (v: string | null) => ymd(v) != null && hoje != null && (ymd(v) as number) < hoje;
  const unidades = o.unitRows.map((u) => ({
    status: u.status,
    valor: Number(u.valor),
    mesVenda: u.mesVenda,
    temPlano: temPlanoDePagamento(u.paymentPlan),
  }));
  const [receber, pagar, semClassificacao, custo] = await Promise.all([
    can(ctx.perms, "contasreceber", "ver")
      ? getContasReceber(ctx.tenant.id, obra.id).then((cs) =>
          cs
            .filter((c) => !/cancel/i.test(c.status))
            .map((c) => ({ saldo: Math.max(0, c.valor - c.valorRecebido), vencida: vencida(c.vencimento), vencimento: c.vencimento })),
        )
      : Promise.resolve(null),
    can(ctx.perms, "contaspagar", "ver")
      ? getContasPagar(ctx.tenant.id).then((cs) =>
          cs
            .filter((c) => c.projectId === obra.id && ehVersaoAtual(c.versionKind))
            .map((c) => ({ saldo: pendenteDaConta(c), vencida: estaVencida(c) })),
        )
      : Promise.resolve(null),
    can(ctx.perms, "despesas", "ver") && o.version.kind === "atual"
      ? db
          .select({ n: count() })
          .from(schema.despesas)
          .where(
            and(
              eq(schema.despesas.tenantId, ctx.tenant.id),
              eq(schema.despesas.versionId, o.version.id),
              eq(schema.despesas.cancelado, false),
              or(isNull(schema.despesas.categoriaDre), isNull(schema.despesas.competencia), eq(schema.despesas.competencia, "")),
            ),
          )
          .then((r) => Number(r[0]?.n ?? 0))
      : Promise.resolve(null),
    // BAE-1: custo só para quem vê Despesas (20.); o Orçamento é o do card
    // Orçado x Realizado e, com a chave do rascunho, só se estiver Aprovado.
    can(ctx.perms, "despesas", "ver") && o.temAtual ? custoOrcadoRealizado(ctx.tenant.id, obra.id, mesAtual, o.rascunhoFora) : Promise.resolve(null),
  ]);
  const parametros = parametrosDeAlerta(ctx.tenant);
  const porValor = [
    custo ? alertaDeDesvio({ obra: obra.name, projectId: obra.id, ...custo, ate: mesAtual }, parametros) : null,
    receber ? alertaDeVencidos({ obra: obra.name, projectId: obra.id, contas: receber, hoje: hojeBR }, parametros) : null,
  ].filter((x) => x != null);
  return {
    vendas: blocoVendas(unidades, o.de, o.ate),
    exposicao: blocoExposicao({
      receber,
      pagar,
      totals: o.totals,
      permutas: o.permRows.map((p) => ({ status: p.status, estimado: Number(p.estimado ?? 0) })),
    }),
    atencao: [...blocoAtencao({ obra: obra.name, projectId: obra.id, temAtual: o.temAtual, unidades, despesasSemClassificacao: semClassificacao }), ...porValor],
    obraId: obra.id,
    parametros,
  };
}

function Bloco({ titulo, regime, href, children }: { titulo: string; regime: string; href?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">{titulo}</h2>
          {href && (
            <Link href={href} className="text-[11px] text-[var(--color-accent2)] hover:underline">
              detalhar →
            </Link>
          )}
        </div>
        <p className="-mt-2 mb-3 text-[11px] text-[var(--color-ink3)]">{regime}</p>
        {children}
      </CardContent>
    </Card>
  );
}

function Linha({ rotulo, valor, dica }: { rotulo: string; valor: string; dica?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5" title={dica}>
      <dt className="text-[13px] text-[var(--color-ink2)]">{rotulo}</dt>
      <dd className="font-[family-name:var(--font-mono)] text-[13px] font-medium text-[var(--color-ink)]">{valor}</dd>
    </div>
  );
}

/** Prompt AE, Parte 1 — os blocos prontos e os pendentes, com o motivo escrito. */
function BlocosDoResumo({ b }: { b: Blocos }) {
  const v = b.vendas;
  const e = b.exposicao;
  const q = `?proj=${b.obraId}`;
  const vsoTexto =
    v.vso.estado === "ok"
      ? `${v.vso.pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% (${v.vso.vendidasNoPeriodo} de ${v.vso.ofertaNoInicio})`
      : "—";
  const vsoDica =
    v.vso.estado === "sem_periodo"
      ? "informe o período para calcular"
      : v.vso.estado === "sem_data"
        ? `${v.vso.vendidasSemData} vendida(s) sem data de venda: não calculável`
        : v.vso.estado === "sem_oferta"
          ? "nenhuma unidade em oferta no início do período"
          : "vendidas no período ÷ oferta no início do período";
  return (
    <div className="mb-6 space-y-4" data-blocos-resumo>
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Growth Ambiental: Vendas é de unidades (dados antigos de incorporação); só aparece quando a versão as tem. */}
        {v.total > 0 && (
        <Bloco titulo="Vendas (dados antigos)" regime="Cadastro das unidades da versão — histórico de incorporação" href={`/contasreceber${q}`}>
          <dl>
            <Linha rotulo="VGV total" valor={brl0(v.vgvTotal)} dica="todas as unidades, em qualquer status" />
            <Linha rotulo="VGV vendido" valor={brl0(v.vgvVendido)} dica="só as unidades Vendidas" />
            <Linha rotulo="VSO do período" valor={vsoTexto} dica={vsoDica} />
            {STATUS_DE_UNIDADE.map((s) => (
              <Linha key={s} rotulo={s === "Disponivel" ? "Disponíveis" : s === "Reservado" ? "Reservadas" : s === "Vendido" ? "Vendidas" : "Permutadas"} valor={String(v.porStatus[s])} />
            ))}
            <Linha rotulo="Total de unidades" valor={String(v.total)} />
          </dl>
          {v.vso.estado !== "ok" && <p className="mt-1 text-[11px] text-[var(--color-ink3)]">VSO: {vsoDica}.</p>}
        </Bloco>
        )}
        <Bloco titulo="Exposição" regime="Saldos em aberto, não o valor cheio. A receber e a pagar são as contas do projeto (versão Atual), qualquer que seja a versão escolhida.">
          <dl>
            {e.aReceber ? (
              <Linha rotulo="A receber em aberto" valor={`${brl0(e.aReceber.porVencer + e.aReceber.vencido)}`} dica={`${brl0(e.aReceber.vencido)} já vencido · ${e.aReceber.contas} conta(s)`} />
            ) : (
              <Linha rotulo="A receber em aberto" valor="—" dica="sua permissão não alcança Contas a Receber" />
            )}
            {e.aPagar ? (
              <Linha rotulo="A pagar em aberto (saldo das parcelas)" valor={`${brl0(e.aPagar.porVencer + e.aPagar.vencido)}`} dica={`${brl0(e.aPagar.vencido)} já vencido · ${e.aPagar.contas} conta(s)`} />
            ) : (
              <Linha rotulo="A pagar em aberto" valor="—" dica="sua permissão não alcança Contas a Pagar" />
            )}
            {/* Dados antigos de incorporação: só quando existem. */}
            {e.financiamento.aprovado !== 0 && <Linha rotulo="Financiamento aprovado (dados antigos)" valor={brl0(e.financiamento.aprovado)} dica="soma do financiamento das unidades vendidas" />}
            {e.financiamento.liberado !== 0 && <Linha rotulo="Financiamento liberado (dados antigos)" valor={brl0(e.financiamento.liberado)} dica="liberações de financiamento da versão" />}
            {e.permutaEmEstoque !== 0 && <Linha rotulo="Permuta em estoque (dados antigos)" valor={brl0(e.permutaEmEstoque)} dica="recebida e ainda não vendida, pelo valor de entrada" />}
          </dl>
          <p className="mt-1 text-[11px] text-[var(--color-ink3)]">
            {e.aReceber ? `Vencido a receber: ${brl0(e.aReceber.vencido)}. ` : ""}
            {e.aPagar ? `Vencido a pagar: ${brl0(e.aPagar.vencido)}.` : ""}
          </p>
        </Bloco>
        <Bloco titulo="Atenção" regime={textoDosLimites(b.parametros)}>
          {b.atencao.length === 0 ? (
            <p className="text-[12.5px] text-[var(--color-ink2)]">Nenhuma exceção neste projeto.</p>
          ) : (
            <ul className="space-y-1.5 text-[12.5px] text-[var(--color-ink2)]">
              {b.atencao.map((a) => (
                <li key={a.texto}>
                  {a.texto}{" "}
                  <Link href={a.href} className="text-[var(--color-accent2)] hover:underline">
                    resolver →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Bloco>
      </div>
      <div className="grid gap-4 lg:grid-cols-3" data-blocos-pendentes>
        {(["resultado", "caixa", "comparativo"] as const).map((k) => (
          <div key={k} className="rounded-[12px] border border-dashed border-[var(--color-line)] bg-[var(--color-surface2)] px-4 py-3 text-[12px] text-[var(--color-ink2)]">
            {BLOCOS_PENDENTES[k]}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[var(--color-ink3)]">{BLOCOS_PENDENTES.execucao}</p>
    </div>
  );
}

/**
 * Decisão de 01/10/2026 — o Resumo de várias obras (Todos, Ativos ou
 * Finalizados). Uma coluna por tipo de versão, somando as obras que TÊM esse
 * tipo; a cobertura é declarada e a obra sem o tipo não entra como zero.
 * Percentual se recalcula das somas. Comparativo por obra só com mais de uma.
 */
async function ResumoConsolidado({
  ctx,
  escopo,
  de,
  ate,
  resumoNovo,
  rascunhoFora,
  ind,
}: {
  ctx: NonNullable<Awaited<ReturnType<typeof getTenantContext>>>;
  escopo: "todos" | "ativos" | "finalizados";
  de: string;
  ate: string;
  resumoNovo: boolean;
  rascunhoFora: boolean;
  ind?: string;
}) {
  const doEscopo = projetosDoEscopo(ctx.projects, escopo);
  const obras = doEscopo.projetos;
  const hasRange = !!(de || ate);
  const verCusto = can(ctx.perms, "despesas", "ver");
  const d = new Date();
  const mesAtual = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

  const porObra = await Promise.all(
    obras.map(async (p) => {
      const vs = await getVersionsDoProjeto(ctx.tenant.id, p.id);
      const tipos = await Promise.all(
        TIPOS_DO_RESUMO.map(async (tipo) => {
          const v = versaoDoTipo(vs, tipo);
          // Com a chave do rascunho, planejamento não Aprovado fica fora dos relatórios.
          if (!v) return { tipo, situacao: "sem" as const, dados: null };
          if (!entraNosRelatorios(v, rascunhoFora)) return { tipo, situacao: "fora" as const, dados: null };
          const dados = await dadosDaVersao(v, resumoNovo);
          let recebimentos = 0;
          if (hasRange) {
            const revenue = await getMonthlyRevenue(v.id, p.id);
            const permCash = permutaCashByMonth(permToResale(dados.permRows));
            recebimentos = [...Object.entries(revenue), ...Object.entries(permCash)].filter(([mm]) => monthInRange(mm, de, ate)).reduce((a, [, x]) => a + x, 0);
          }
          return { tipo, situacao: "ok" as const, dados, recebimentos };
        }),
      );
      const custo = verCusto && vs.some((v) => v.kind === "atual") ? await custoOrcadoRealizado(ctx.tenant.id, p.id, mesAtual, rascunhoFora) : null;
      return { p, tipos, custo };
    }),
  );

  const colunas = TIPOS_DO_RESUMO.map((tipo) => {
    const daColuna = porObra.map((o) => o.tipos.find((t) => t.tipo === tipo)!);
    const ok = daColuna.filter((t) => t.situacao === "ok" && t.dados);
    const fora = daColuna.filter((t) => t.situacao === "fora").length;
    const dados = ok.map((t) => t.dados!);
    const unidades = somarUnidades(
      dados.map((x) => ({
        disp: x.totals.disp,
        res: x.totals.res,
        vend: x.totals.vend,
        // Desligada: a soma de três filtros, como na tela de uma obra; ligada: todas (2.3).
        total: resumoNovo ? x.unitRows.length : x.totals.vend + x.totals.res + x.totals.disp,
      })),
    );
    return {
      tipo,
      obras: ok.length,
      fora,
      indicadores: somarIndicadores(dados.map((x) => x.indicadores)),
      unidades,
      banco: dados.reduce((a, x) => a + x.totals.banco, 0),
      recebimentos: ok.reduce((a, t) => a + ("recebimentos" in t ? (t.recebimentos ?? 0) : 0), 0),
    };
  });
  const visiveis = colunas.filter((c) => c.obras > 0);

  const comparativo: LinhaComparativa[] = porObra.map(({ p, tipos, custo }) => {
    const atual = tipos.find((t) => t.tipo === "atual");
    const x = atual?.situacao === "ok" ? atual.dados : null;
    const vendidas = x ? x.unitRows.filter((u) => u.status === "Vendido") : [];
    return {
      obra: p.name,
      projectId: p.id,
      vgv: x ? x.totals.vgv : null,
      vgvVendido: x ? vendidas.reduce((a, u) => a + Number(u.valor), 0) : null,
      vendidas: x ? vendidas.length : null,
      unidades: x ? x.unitRows.length : null,
      custoRealizado: custo ? custo.realizado : null,
      custoOrcado: custo ? custo.orcado : null,
    };
  });
  const total = totalDoComparativo(comparativo);
  // Growth Ambiental: unidades/VGV/financiamento são dados antigos; só aparecem quando existem.
  const legadoConsolidado = visiveis.some((c) => c.unidades.total > 0 || c.banco !== 0 || c.indicadores.some((i) => !i.vazio));
  const vendasNoComparativo = !!total.unidades;
  const contratosDaEmpresa = await listarContratos(ctx.tenant.id);
  const servicosPorObra = new Map(obras.map((o) => [o.id, resumoDosContratos(contratosDaEmpresa, new Set([o.id]))]));
  const servicosTotal = resumoDosContratos(contratosDaEmpresa, new Set(obras.map((o) => o.id)));
  const pctTxt = (n: number | null) => (n == null ? "—" : pct1(n));
  const desvioTxt = (real: number | null, orc: number | null) => (real == null || orc == null ? "—" : `${real - orc > 0 ? "+" : real - orc < 0 ? "−" : ""}${brl0(Math.abs(real - orc))}`);

  const titulo = rotuloDoEscopo(escopo);
  // Prompt AE2 — indicadores de negócio selecionáveis, uma coluna por obra e o Total.
  const painel = painelDeIndicadores(await dadosDasObras(ctx.tenant.id, obras, { verCusto, rascunhoFora }), verCusto);
  return (
    <>
      <CabecalhoDeImpressao empresa={ctx.tenant.name} geradoPor={ctx.userEmail} />
      <PageHeader
        eyebrow={`${titulo} · ${obras.length} projeto${obras.length === 1 ? "" : "s"}`}
        title="Resumo Executivo"
        subtitle="Consolidado por tipo de versão"
        actions={
          <div className="flex flex-wrap items-end gap-3">
            <ProjectPicker
              projects={ctx.projects.map((p) => ({ id: p.id, label: p.name }))}
              selected={escopo === "todos" ? TODOS_OS_PROJETOS : escopo}
              allOption
              scopeOptions
            />
            <DateRangeFilter de={de} ate={ate} />
            <ExportarPdf arquivo={`Resumo Executivo - ${titulo}`} />
          </div>
        }
      />
      {doEscopo.semSituacao > 0 && (
        <p className="mb-4 rounded-[8px] bg-[var(--color-surface3)] px-3 py-2 text-[13px] text-[var(--color-ink2)]">
          {doEscopo.semSituacao} projeto(s) sem status ficaram fora deste filtro. Classifique-os como Ativo ou Finalizado em Projetos.
        </p>
      )}
      {obras.length > 0 && <IndicadoresNegocio {...painel} escolhidos={indicadoresEscolhidos(ind, verCusto)} />}
      {/* Prompt IAR — a Cris analisa e simula sobre os números do Resumo consolidado. */}
      <CrisDaTela
        titulo="Resumo Executivo (consolidado)"
        dados={{
          escopo: titulo,
          obras: obras.length,
          porTipoDeVersao: visiveis.map((c) => ({ tipo: c.tipo, obras: c.obras, indicadores: c.indicadores.map((i) => ({ item: i.label, valor: i.value })), unidades: c.unidades })),
          porObra: comparativo.map((l) => ({
            obra: l.obra,
            contratosDeServico: servicosPorObra.get(l.projectId) ?? null,
            ...(vendasNoComparativo ? { vgvHistorico: l.vgv, vendidasHistorico: l.vendidas, unidadesHistorico: l.unidades } : {}),
            custoRealizado: l.custoRealizado,
            custoOrcado: l.custoOrcado,
          })),
          indicadoresDeNegocio: { colunas: painel.colunas, valores: Object.fromEntries(Object.entries(painel.valores).map(([id, v]) => [id, v.map((x) => x.valor)])) },
        }}
        sugestoes={["Qual projeto tem o maior desvio de custo?"]}
      />
      {obras.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-[var(--color-ink3)]">Nenhum projeto neste filtro.</CardContent>
        </Card>
      ) : (
        <>
          <p className="mb-2 text-[13px] text-[var(--color-ink2)]" data-cobertura>
            Cobertura: {colunas.map((c) => `${textoDaCobertura(c.tipo, c.obras, obras.length)}${c.fora ? ` (${c.fora} fora dos relatórios, não Aprovada)` : ""}`).join(" · ")}.
            {" "}Projeto sem a versão fica fora da coluna, não entra como zero.
          </p>
          <p className="mb-4 text-[12px] text-[var(--color-ink3)]" data-criterios>
            Cada coluna soma a versão daquele tipo de cada projeto (a mais antiga do tipo, como no Dashboard).
            {legadoConsolidado ? <> Linhas de dados antigos de incorporação: o VGV conta {TEXTO_DA_BASE.todas_unidades}; Sinais a Subsídio contam {TEXTO_DA_BASE.vendidas}; valores nominais.</> : null}
            {resumoNovo ? " Os blocos Exposição e Atenção são por projeto: escolha um projeto para vê-los." : ""}
          </p>
          <Card className="mb-6">
            <CardContent className="p-5">
              <div className="tbl-scroll overflow-x-auto">
                <Table aria-label="Resumo consolidado por tipo de versão">
                  <THead>
                    <tr>
                      <TH>Indicador</TH>
                      {visiveis.map((c) => (
                        <TH key={c.tipo} className="text-right">
                          <div>{ROTULO_DA_NATUREZA[c.tipo]}</div>
                          <div className="text-[10px] font-normal normal-case text-[var(--color-ink3)]">
                            soma de {c.obras} de {obras.length}
                          </div>
                        </TH>
                      ))}
                    </tr>
                  </THead>
                  <tbody>
                    {hasRange && (
                      <TR>
                        <TD className="text-[var(--color-ink2)]">
                          Recebimentos previstos no período ({dateBR(de) !== "—" ? dateBR(de) : "início"} até {dateBR(ate) !== "—" ? dateBR(ate) : "fim"})
                        </TD>
                        {visiveis.map((c) => (
                          <TD key={c.tipo} className="text-right font-[family-name:var(--font-mono)]">{brl0(c.recebimentos)}</TD>
                        ))}
                      </TR>
                    )}
                    {(legadoConsolidado ? visiveis[0]?.indicadores ?? [] : []).map((ind) => (
                      <TR key={ind.label}>
                        <TD className="text-[var(--color-ink2)]" title={`Base: ${TEXTO_DA_BASE[ind.base]}`}>{ind.label}</TD>
                        {visiveis.map((c) => {
                          const i = c.indicadores.find((x) => x.label === ind.label);
                          return (
                            <TD key={c.tipo} className="text-right font-[family-name:var(--font-mono)]">
                              {!i || i.vazio ? "—" : brl0(i.value)}
                            </TD>
                          );
                        })}
                      </TR>
                    ))}
                    {(legadoConsolidado ? [
                        ["Unidades disponíveis", (c: (typeof visiveis)[number]) => c.unidades.disp],
                        ["Unidades reservadas", (c: (typeof visiveis)[number]) => c.unidades.res],
                        ["Unidades vendidas", (c: (typeof visiveis)[number]) => c.unidades.vend],
                        [resumoNovo ? "Total de unidades (todas)" : "Total de unidades (disp. + res. + vend.)", (c: (typeof visiveis)[number]) => c.unidades.total],
                      ] as const : []
                    ).map(([rotulo, f]) => (
                      <TR key={rotulo}>
                        <TD className="text-[var(--color-ink2)]">{rotulo}</TD>
                        {visiveis.map((c) => (
                          <TD key={c.tipo} className="text-right font-[family-name:var(--font-mono)]">{f(c)}</TD>
                        ))}
                      </TR>
                    ))}
                    {legadoConsolidado && (
                    <TR>
                      <TD className="text-[var(--color-ink2)]">Financiamento aprovado (dados antigos; não entra nos totais)</TD>
                      {visiveis.map((c) => (
                        <TD key={c.tipo} className="text-right font-[family-name:var(--font-mono)]">{brl0(c.banco)}</TD>
                      ))}
                    </TR>
                    )}
                    {!legadoConsolidado && !hasRange && (
                      <TR>
                        <TD colSpan={visiveis.length + 1} className="text-[12px] text-[var(--color-ink3)]">
                          Os números de serviço (contratado, medido, faturado, recebido) estão no comparativo entre projetos e no Painel de Contratos;
                          a comparação entre versões fica na DRE.
                        </TD>
                      </TR>
                    )}
                  </tbody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {obras.length > 1 && (
            <Card data-comparativo>
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold text-[var(--color-ink)]">Comparativo entre projetos</h2>
                <p className="mb-3 text-[11px] text-[var(--color-ink3)]">
                  Versão Atual de cada projeto. A linha Total soma os valores e recalcula os percentuais das somas (não é média).
                  {verCusto
                    ? ` Custo = Custo Variável + Custo Fixo, competências até ${mesAtual}; o desvio total soma só os projetos com Orçamento (${total.obrasComOrcamento} de ${obras.length}).`
                    : " Custo não aparece: exige permissão de ver Despesas."}{" "}
                  Margem fica de fora até a correção da receita (Prompt I).
                </p>
                <div className="tbl-scroll overflow-x-auto">
                  <Table aria-label="Comparativo entre projetos">
                    <THead>
                      <tr>
                        <TH>Projeto</TH>
                        <TH className="text-right">Valor contratado</TH>
                        <TH className="text-right">Medido</TH>
                        <TH className="text-right">Faturado a receber</TH>
                        {vendasNoComparativo && <TH className="text-right">VGV (dados antigos)</TH>}
                        {vendasNoComparativo && <TH className="text-right">Unidades vendidas</TH>}
                        {verCusto && <TH className="text-right">Custo realizado</TH>}
                        {verCusto && <TH className="text-right">Custo orçado</TH>}
                        {verCusto && <TH className="text-right">Desvio</TH>}
                        {verCusto && <TH className="text-right">% desvio</TH>}
                      </tr>
                    </THead>
                    <tbody>
                      {comparativo.map((l) => (
                        <TR key={l.projectId}>
                          <TD>
                            <Link href={`/resumo?proj=${l.projectId}`} className="text-[var(--color-accent2)] hover:underline">
                              {l.obra}
                            </Link>
                            {l.vgv == null && <span className="ml-1 text-[11px] text-[var(--color-warning)]">sem versão Atual</span>}
                          </TD>
                          {(() => {
                            const sv = servicosPorObra.get(l.projectId);
                            return sv && sv.contratos > 0 ? (
                              <>
                                <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(sv.contratado)}</TD>
                                <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(sv.medido)}</TD>
                                <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(sv.aReceber)}</TD>
                              </>
                            ) : (
                              <TD colSpan={3} className="text-right text-[12px] text-[var(--color-ink4)]">sem contrato</TD>
                            );
                          })()}
                          {/* Dados antigos de incorporação. Ausência não é zero: sem unidade, "—". */}
                          {vendasNoComparativo && <TD className="text-right font-[family-name:var(--font-mono)]">{l.vgv == null || !l.unidades ? "—" : brl0(l.vgv)}</TD>}
                          {vendasNoComparativo && <TD className="text-right font-[family-name:var(--font-mono)]">{l.vendidas == null ? "—" : l.unidades ? `${l.vendidas} de ${l.unidades}` : "—"}</TD>}
                          {verCusto && <TD className="text-right font-[family-name:var(--font-mono)]">{l.custoRealizado == null ? "—" : brl0(l.custoRealizado)}</TD>}
                          {verCusto && <TD className="text-right font-[family-name:var(--font-mono)]">{l.custoOrcado == null ? "sem Orçamento" : brl0(l.custoOrcado)}</TD>}
                          {verCusto && <TD className="text-right font-[family-name:var(--font-mono)]">{desvioTxt(l.custoRealizado, l.custoOrcado)}</TD>}
                          {verCusto && (
                            <TD className="text-right font-[family-name:var(--font-mono)]">
                              {pctTxt(l.custoRealizado == null || l.custoOrcado == null ? null : percentual(l.custoRealizado - l.custoOrcado, l.custoOrcado))}
                            </TD>
                          )}
                        </TR>
                      ))}
                      <TR className="bg-[var(--color-surface2)] font-semibold" data-total-comparativo>
                        <TD>Total ({total.obrasComAtual} com Atual)</TD>
                        <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(servicosTotal.contratado)}</TD>
                        <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(servicosTotal.medido)}</TD>
                        <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(servicosTotal.aReceber)}</TD>
                        {vendasNoComparativo && <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(total.vgv)}</TD>}
                        {vendasNoComparativo && <TD className="text-right font-[family-name:var(--font-mono)]">{`${total.vendidas} de ${total.unidades}`}</TD>}
                        {verCusto && <TD className="text-right font-[family-name:var(--font-mono)]">{total.obrasComOrcamento ? brl0(total.custoRealizadoComOrcamento) : "—"}</TD>}
                        {verCusto && <TD className="text-right font-[family-name:var(--font-mono)]">{total.obrasComOrcamento ? brl0(total.custoOrcado) : "—"}</TD>}
                        {verCusto && <TD className="text-right font-[family-name:var(--font-mono)]">{total.desvio == null ? "—" : desvioTxt(total.custoRealizadoComOrcamento, total.custoOrcado)}</TD>}
                        {verCusto && <TD className="text-right font-[family-name:var(--font-mono)]">{pctTxt(total.pctDesvio)}</TD>}
                      </TR>
                    </tbody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </>
  );
}
