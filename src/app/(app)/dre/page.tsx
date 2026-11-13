import { getProjectVersions, getTenantContext } from "@/lib/context";
import { avisoNoSeletor } from "@/lib/situacao-versao";
import { chaveLigada } from "@/lib/chaves-tenant";
import {
  TODOS_OS_PROJETOS,
  lerEscopoDeRelatorio,
  projetosDoEscopo,
  rotuloDoEscopo,
} from "@/lib/projeto-selecao";
import { LembrarProjeto, RecuperarProjeto } from "@/components/app/projeto-da-aba";
import { getInccRows, getVersionsDoProjeto } from "@/lib/queries";
import { calendarYearWindows } from "@/lib/planning";
import { aggregateInputs, emptyInputs, waterfall, type Inputs } from "@/lib/calc/dre-cascata";
import { foraDaCascataDaVersao, versionInputsByMonth } from "@/lib/dre-inputs";
import {
  ROTULO_CENARIO,
  TETO_CELULAS_MENSAL,
  TETO_VERSOES,
  cenariosDaUrl,
  eixoDeMeses,
  ehCopia,
  frasesDoRodape,
  janelaDoProjeto,
  linhaTemLancamento,
  somarForaDaCascata,
  type ForaDaCascata,
  ordenarMeses,
  pctDaReceita,
  resolverCenario,
  resolverPeriodo,
  rotuloDaColuna,
  selecaoDaUrl,
  selecaoPadrao,
  textoDaCobertura,
} from "@/lib/dre";
import { brl0, pct1 } from "@/lib/utils";
import Link from "next/link";
import { NO_COMP } from "@/lib/calc/dre-cascata";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DreControls } from "@/components/app/dre-controls";
import { VersionMultiSelect } from "@/components/app/version-multiselect";
import { CenarioMultiSelect } from "@/components/app/cenario-multiselect";
import { can } from "@/lib/permissions";
import { AccessDenied } from "@/components/app/access-denied";
import { CrisDaTela } from "@/components/app/cris-contexto";
import { ExportarPdf } from "@/components/app/pdf";
import { CabecalhoDeImpressao } from "@/components/app/cabecalho-impressao";

export const dynamic = "force-dynamic";

/** Uma coluna da comparação: uma versão (projeto) ou um cenário (Empresa toda). */
interface Serie {
  key: string;
  titulo: string;
  complemento?: string;
  color?: string;
  /** Inputs por mês de cada projeto que compõe a série (1 na visão de projeto). */
  porProjeto: Record<string, Inputs>[];
  /** Ids das versões que compõem a série (para o rodapé, Parte 4). */
  versoes: string[];
}

/** Soma os meses de várias séries de projeto num mapa só. */
function somarPorMes(lista: Record<string, Inputs>[]): Record<string, Inputs> {
  const out: Record<string, Inputs> = {};
  for (const bm of lista)
    for (const [mm, inp] of Object.entries(bm)) {
      const t = (out[mm] ??= emptyInputs());
      t.receita += inp.receita;
      t.custoVar += inp.custoVar;
      for (const [k, v] of Object.entries(inp.byCat)) t.byCat[k] = (t.byCat[k] || 0) + v;
    }
  return out;
}

export default async function DREPage({
  searchParams,
}: {
  searchParams: Promise<{
    proj?: string;
    periodo?: string;
    vs?: string;
    view?: string;
    de?: string;
    ate?: string;
    vkind?: string;
    cen?: string;
  }>;
}) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // A página verifica "ver" antes de consultar qualquer dado (Prompt M, 2.2).
  // A guarda do layout não basta: ele renderiza em paralelo com a página e
  // não roda de novo na navegação dentro do app.
  if (!can(ctx.perms, "dre", "ver")) return <AccessDenied />;
  // Prompt H (BH-3): selo no seletor quando a regra está ligada na empresa.
  const rascunhoFora = await chaveLigada(ctx.tenant.id, "rascunho_fora_dos_relatorios");
  // Prompt AC, Parte 10 — a definição nova da DRE (nasce desligada).
  const definicaoNova = await chaveLigada(ctx.tenant.id, "dre_definicao_nova");
  const receitaRateio = await chaveLigada(ctx.tenant.id, "dre_receita_rateio");
  const sp = await searchParams;
  // Prompt AC2 (revisão V5): a visão anual e a mensal aparecem juntas, a
  // mensal abaixo, com os mesmos seletores. `?view=` antigo é ignorado.

  // Obra ou escopo vêm da URL (Prompt A, 19). Sem nada: a obra lembrada pela
  // aba; sem memória, "Todos" (B12). Nunca a obra do cookie.
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
  const doEscopo = escopo.tipo === "projeto" ? null : projetosDoEscopo(ctx.projects, escopo.tipo);
  const selectedProjects = escopo.tipo === "projeto" ? [escopo.projeto] : doEscopo!.projetos;
  const projParam =
    escopo.tipo === "projeto"
      ? escopo.projeto.id
      : escopo.tipo === "todos"
        ? TODOS_OS_PROJETOS
        : escopo.tipo;
  // Versões da obra escolhida, com tenant no where (Prompt A; AC 1.1).
  const daObra =
    escopo.tipo === "projeto" ? await getProjectVersions(ctx.tenant.id, escopo.projeto.id) : null;
  const versoesDaObra = daObra?.versions ?? [];

  const scopeLabel =
    escopo.tipo === "projeto"
      ? escopo.projeto.name
      : escopo.tipo === "todos"
        ? "Empresa toda (matriz + filiais + projetos)"
        : rotuloDoEscopo(escopo.tipo);

  // ── As séries (colunas) ────────────────────────────────────────────────
  const series: Serie[] = [];
  const cobertura: string[] = [];
  let selecionadas: typeof versoesDaObra = [];
  const cenarios = cenariosDaUrl(sp.cen, sp.vkind);
  if (escopo.tipo === "projeto") {
    // 1.1/1.4 — qualquer projeto compara; todas as versões são selecionáveis;
    // ?vs= é validado contra as versões DESTE projeto. Padrão: Atual + o
    // Orçamento e a Previsão mais recentes, sem cópia.
    const vsIds = (sp.vs ?? "").split(",").filter(Boolean);
    const daUrl = vsIds.length ? selecaoDaUrl(versoesDaObra, vsIds) : [];
    selecionadas = daUrl.length ? daUrl : selecaoPadrao(versoesDaObra);
    const porVersao = await Promise.all(
      selecionadas.map((v) => versionInputsByMonth(ctx.tenant.id, v.id, escopo.projeto.id, { definicaoNova })),
    );
    selecionadas.forEach((v, i) => {
      const r = rotuloDaColuna(v);
      series.push({ key: v.id, titulo: r.titulo, complemento: r.complemento, color: v.color, porProjeto: [porVersao[i]], versoes: [v.id] });
    });
  } else {
    // 1.2 — Empresa toda compara CENÁRIOS: para cada cenário e cada projeto,
    // a versão daquele kind NAQUELE projeto. Sem a chave da DRE (AC-3), vale
    // a regra de antes (fallback), agora DECLARADA na cobertura.
    const versoesPorProjeto = await Promise.all(
      selectedProjects.map((p) => getVersionsDoProjeto(ctx.tenant.id, p.id)),
    );
    const projetos = selectedProjects.map((p, i) => ({ id: p.id, name: p.name, versoes: versoesPorProjeto[i] }));
    for (const c of cenarios) {
      // 1.3 — com a chave, sem fallback: projeto sem o cenário fica fora e é contado.
      const res = resolverCenario(c, projetos, !definicaoNova);
      const texto = textoDaCobertura(c, res);
      if (texto) cobertura.push(texto);
      const usadas = res.filter((r) => r.versao);
      const porProjeto = await Promise.all(
        usadas.map((r) => versionInputsByMonth(ctx.tenant.id, r.versao!.id, r.projetoId, { definicaoNova })),
      );
      series.push({ key: c, titulo: ROTULO_CENARIO[c], porProjeto, versoes: usadas.map((r) => r.versao!.id) });
    }
  }

  // Parte 7 — o eixo mostrado vem da JANELA dos projetos (start/end, Prompt I
  // 55) unida às competências com lançamento; a tabela INCC deixa de
  // governar. O eixo INCC só continua servindo ao período personalizado com
  // limite aberto, para esse total não mudar (a regra nova vai na chave, AC-3).
  const inccAll = await Promise.all(selectedProjects.map((p) => getInccRows(p.tenantId, p.id)));
  const axisIncc = ordenarMeses(new Set(inccAll.flat().map((r) => r.m)));
  const comLancamento = new Set(series.flatMap((x) => x.porProjeto.flatMap((bm) => Object.keys(bm))).filter((m) => m !== NO_COMP));
  const axis = eixoDeMeses(selectedProjects.map(janelaDoProjeto), comLancamento);
  // Recortes por ano-calendário: 2025, 2026, … até o ano atual + 5.
  const years = calendarYearWindows(ordenarMeses(new Set([...axis, ...axisIncc])), new Date().getFullYear());
  const periodo = sp.periodo ?? "acum";
  const customDe = (sp.de ?? "").trim();
  const customAte = (sp.ate ?? "").trim();
  // 1.6 — o período é UM SÓ para todas as colunas.
  const { periodMonths, label: periodLabel } = resolverPeriodo(periodo, customDe, customAte, definicaoNova ? axis : axisIncc, years);


  const multi = series.length > 1;
  const nomesDasColunas = series.map((s) => s.titulo).join(", ");
  const recorte = `${selectedProjects.length} projeto(s) · ${isAll ? "cenários" : "versões"}: ${nomesDasColunas || "nenhuma"} · ${periodLabel}`;

  // Meses da matriz (1.5): os do período, ou o eixo no acumulado.
  const meses = periodMonths ? ordenarMeses(periodMonths) : axis;
  const celulasMensal = meses.length * series.length;
  const mensalAcimaDoTeto = multi && celulasMensal > TETO_CELULAS_MENSAL;

  // Valores: por série, a cascata do período (e, no mensal, a de cada mês).
  const totalDe = (s: Serie) => waterfall(s.porProjeto.map((bm) => aggregateInputs(bm, periodMonths)));
  const porMesDaSerie = new Map(series.map((s) => [s.key, somarPorMes(s.porProjeto)]));
  const mesDe = (s: Serie, mm: string) => waterfall([porMesDaSerie.get(s.key)![mm] ?? emptyInputs()]);
  const totais = series.map(totalDe);
  const agregados = series.map((s) => s.porProjeto.map((bm) => aggregateInputs(bm, periodMonths)));
  // Parte 4/5 — o que fica fora da cascata, por coluna (só conta).
  const foraPorVersao = new Map<string, ForaDaCascata>();
  await Promise.all(
    [...new Set(series.flatMap((x) => x.versoes))].map(async (id) => foraPorVersao.set(id, await foraDaCascataDaVersao(id, { definicaoNova }))),
  );
  const rodape = series
    .map((x) => ({ titulo: x.titulo, frases: frasesDoRodape(somarForaDaCascata(x.versoes.map((id) => foraPorVersao.get(id)!)), periodMonths == null, brl0) }))
    .filter((x) => x.frases.length > 0);
  const linhas = (totais[0] ?? waterfall([emptyInputs()])).rows;

  const semVersao = escopo.tipo === "projeto" && versoesDaObra.length === 0;

  // Prompt E2 — o que a Cris recebe desta tela: os números que ela mostra,
  // agregados (sem lançamento, sem nome de pessoa).
  const resumoParaCris = {
    escopo: scopeLabel,
    periodo: periodLabel,
    colunas: series.map((x) => x.titulo),
    cascata: linhas.map((lbl, ri) => ({
      item: lbl.label,
      valores: Object.fromEntries(series.map((x, i) => [x.titulo, totais[i].rows[ri].value])),
      pctDaReceita: Object.fromEntries(series.map((x, i) => [x.titulo, pctDaReceita(totais[i].rows[ri].value, totais[i].R)])),
    })),
    mensal: meses.slice(-24).map((mm) => ({
      mes: mm,
      ...Object.fromEntries(series.map((x) => {
        const r = mesDe(x, mm).rows;
        return [x.titulo, { receita: r[0]?.value ?? 0, resultado: r[r.length - 1]?.value ?? 0 }];
      })),
    })),
    cobertura,
  };

  // A mesma tabela nas duas visões: `mensal` liga as colunas por mês.
  const tabelaDre = (mensal: boolean) => (
          <div className="tbl-scroll mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                {mensal && multi && !mensalAcimaDoTeto ? (
                  <>
                    <tr className="border-b border-[var(--color-line)]">
                      <th rowSpan={2} className="sticky left-0 z-10 bg-white px-2 py-2 text-left font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
                        Item
                      </th>
                      {[...meses, "Total"].map((mm) => (
                        <th key={mm} colSpan={series.length} className="border-l border-[var(--color-line)] px-2 py-1.5 text-center font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
                          {mm}
                        </th>
                      ))}
                    </tr>
                    <tr className="border-b border-[var(--color-line)]">
                      {[...meses, "Total"].flatMap((mm) =>
                        series.map((s, i) => (
                          <th key={`${mm}-${s.key}`} className={`px-2 py-1.5 text-right text-[11px] font-medium text-[var(--color-ink2)] ${i === 0 ? "border-l border-[var(--color-line)]" : ""}`}>
                            {s.titulo}
                          </th>
                        )),
                      )}
                    </tr>
                  </>
                ) : (
                  <tr className="border-b border-[var(--color-line)]">
                    <th className="sticky left-0 z-10 bg-white px-2 py-2 text-left font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">Item</th>
                    {mensal && !multi
                      ? [...meses, "Total"].map((mm) => (
                          <th key={mm} className="px-2 py-2 text-right font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
                            {mm}
                          </th>
                        ))
                      : series.map((s) => [
                          <th key={s.key} className="px-2 py-2 text-right text-[12px] font-semibold text-[var(--color-ink)]">
                            <span className="inline-flex items-center gap-1.5">
                              {s.color && <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />}
                              {s.titulo}
                            </span>
                            {s.complemento && <span className="block text-[10.5px] font-normal text-[var(--color-ink3)]">{s.complemento}</span>}
                          </th>,
                          <th key={`${s.key}-pct`} className="px-2 py-2 text-right font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
                            % Receita
                          </th>,
                        ])}
                  </tr>
                )}
              </thead>
              <tbody>
                {linhas.map((lbl, ri) => {
                  const isSub = lbl.kind !== "item";
                  const cel = (v: number, key: string, extra = "", presente = true) => (
                    <td
                      title={presente ? undefined : "Sem nenhum lançamento nesta linha"}
                      key={key}
                      className={`whitespace-nowrap px-2 py-2 text-right font-[family-name:var(--font-mono)] ${extra} ${isSub ? "font-semibold" : ""} ${
                        v < 0 ? "text-[var(--color-danger)]" : lbl.kind === "final" || lbl.kind === "sub" ? "text-[var(--color-success)]" : "text-[var(--color-ink)]"
                      }`}
                    >
                      {presente ? brl0(v) : <span className="text-[var(--color-ink4)]">—</span>}
                    </td>
                  );
                  const temNoMes = (x: Serie, mm: string) => linhaTemLancamento(lbl.label, [porMesDaSerie.get(x.key)![mm]].filter(Boolean));
                  const temNoTotal = (i: number) => linhaTemLancamento(lbl.label, agregados[i]);
                  return (
                    <tr key={lbl.label} className={`border-b border-[var(--color-line)] ${isSub ? "bg-[var(--color-surface2)]" : ""}`}>
                      <td
                        className={`sticky left-0 z-10 whitespace-nowrap px-2 py-2 ${isSub ? "bg-[var(--color-surface2)]" : "bg-white"} ${
                          lbl.kind === "final" ? "font-semibold text-[var(--color-accent)]" : isSub ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-ink2)]"
                        }`}
                      >
                        {lbl.label}
                      </td>
                      {mensal && multi && !mensalAcimaDoTeto
                        ? [...meses.flatMap((mm) => series.map((s, i) => cel(mesDe(s, mm).rows[ri].value, `${mm}-${s.key}`, i === 0 ? "border-l border-[var(--color-line)]" : "", temNoMes(s, mm)))),
                           ...series.map((s, i) => cel(totais[i].rows[ri].value, `tot-${s.key}`, i === 0 ? "border-l border-[var(--color-line)]" : "", temNoTotal(i)))]
                        : mensal && !multi
                          ? [...meses.map((mm) => cel(mesDe(series[0], mm).rows[ri].value, mm, "", temNoMes(series[0], mm))), cel(totais[0].rows[ri].value, "tot", "", temNoTotal(0))]
                          : series.flatMap((s, i) => {
                              const p = pctDaReceita(totais[i].rows[ri].value, totais[i].R);
                              return [
                                cel(totais[i].rows[ri].value, s.key, "", temNoTotal(i)),
                                <td key={`${s.key}-pct`} className="px-2 py-2 text-right font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">
                                  {p == null ? "—" : pct1(p)}
                                </td>,
                              ];
                            })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
  );

  return (
    <>
      <CabecalhoDeImpressao empresa={ctx.tenant.name} geradoPor={ctx.userEmail} />
      <PageHeader
        eyebrow={scopeLabel}
        title="DRE — Demonstração de Resultado"
        subtitle={`${periodLabel}${
          multi ? (isAll ? " · comparativo de cenários" : " · comparativo de versões") : " · análise vertical (% da receita)"
        } · visão mensal abaixo`}
        actions={
          <div className="flex flex-wrap items-end gap-3">
            <DreControls
              projects={ctx.projects.map((p) => ({
                id: p.id,
                label: p.kind === "office" ? `${p.name} · Unidade/Escritório` : p.name,
              }))}
              proj={projParam}
              periods={[
                { value: "acum", label: "Acumulado (todos os anos)" },
                ...years.map((y) => ({ value: y.value, label: y.label })),
                { value: "custom", label: "Personalizado (De / Até)" },
              ]}
              periodo={periodo}
              periodDisabled={false}
              vs={sp.vs ?? ""}
              de={customDe}
              ate={customAte}
              showVersionKind={false}
              versionKind="atual"
            />
            <ExportarPdf arquivo={`DRE - ${scopeLabel} - ${periodLabel}`} />
          </div>
        }
      />

      {/* Seletores da comparação abaixo do cabeçalho: com muitas versões, no
          cabeçalho eles espremiam o título. */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {escopo.tipo === "projeto" && versoesDaObra.length > 0 && (
          <VersionMultiSelect
            versions={versoesDaObra.map((v) => ({
              id: v.id,
              label: ehCopia(v) ? `${v.label} · cópia` : v.label,
              color: v.color,
              aviso: avisoNoSeletor(v, rascunhoFora),
            }))}
            selected={selecionadas.map((v) => v.id)}
            max={TETO_VERSOES}
          />
        )}
        {isAll && <CenarioMultiSelect selected={cenarios} />}
      </div>
      {/* Revisão 4, parte 5c: a receita da Atual vem do rateio do contrato e os meses passados são revisados. */}
      {receitaRateio && (
        <p className="mb-3 rounded-[8px] border border-[var(--color-line)] bg-[var(--color-surface2)] px-3 py-2 text-[12.5px] text-[var(--color-ink2)]" data-dre-rateio>
          Receita da versão Atual pelo rateio do contrato: o total de cada unidade vendida é dividido igualmente pelos meses da obra,
          inclusive os que já passaram. Por isso, uma venda nova (ou um distrato) revisa a receita dos meses anteriores. Liberações de
          obra e parcelas pelo vencimento ficam no Fluxo de Caixa.
        </p>
      )}
      {escopo.tipo === "projeto" && <LembrarProjeto projectId={escopo.projeto.id} />}
      <CrisDaTela
        titulo="DRE — Demonstração de Resultado"
        dados={resumoParaCris}
        sugestoes={[
          "Qual linha mais pesa sobre a receita?",
          "Compare as colunas e explique a maior diferença",
          "Em que mês o resultado foi pior?",
          "E se a receita cair 10%, como fica o resultado?",
        ]}
      />
      {doEscopo && doEscopo.semSituacao > 0 && (
        <p className="mb-4 rounded-[8px] bg-[var(--color-surface3)] px-3 py-2 text-[13px] text-[var(--color-ink2)]">
          {doEscopo.semSituacao} projeto(s) sem status ficaram fora deste filtro. Classifique-os
          como Ativo ou Finalizado em Projetos.
        </p>
      )}

      {doEscopo && doEscopo.projetos.length === 0 ? (
        // Escopo sem nenhuma obra: estado vazio, nunca uma DRE zerada.
        <Card>
          <CardContent className="p-8 text-center text-[var(--color-ink3)]">
            Nenhum projeto classificado como{" "}
            {escopo.tipo === "ativos" ? "Ativo" : "Finalizado"}. Classifique os projetos em
            Projetos.
          </CardContent>
        </Card>
      ) : semVersao ? (
        <Card>
          <CardContent className="p-8 text-center text-[var(--color-ink3)]">
            Este projeto não tem nenhuma versão — não há o que demonstrar.
          </CardContent>
        </Card>
      ) : (
      <Card>
        <CardContent className="p-5">
          {/* 1.8 — o cabeçalho declara o recorte e a cobertura. */}
          <p className="mb-1 text-[12.5px] text-[var(--color-ink2)]" data-recorte>
            {recorte}
          </p>
          {definicaoNova && (
            <p className="mb-1 text-[12px] text-[var(--color-accent2)]" data-definicao-nova>
              Definição nova da DRE ligada nesta empresa: “Receita” lançada como despesa fora da receita; encargos na
              competência da despesa; cenário ausente fora da coluna.
            </p>
          )}
          {cobertura.map((c) => (
            <p key={c} className="mb-1 text-[12px] text-[var(--color-warning)]" data-cobertura>
              {c}
            </p>
          ))}
          {selecionadas.length > TETO_VERSOES && (
            <p className="mb-1 text-[12px] text-[var(--color-warning)]">
              {selecionadas.length} versões selecionadas — acima de {TETO_VERSOES} a tabela fica larga. Todas estão na tela; desmarque as que não precisa.
            </p>
          )}
          {tabelaDre(false)}
          {/* Partes 4 e 5 — o que não entra na cascata, fora dela (nunca somado em outra linha). */}
          {rodape.length > 0 && (
            <div className="mt-3 rounded-[8px] border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5 px-3 py-2 text-[12px] text-[var(--color-ink2)]" data-rodape>
              {rodape.map((r) => (
                <div key={r.titulo}>
                  {rodape.length > 1 || multi ? <strong className="text-[var(--color-ink)]">{r.titulo}: </strong> : null}
                  {r.frases.join(" ")}
                </div>
              ))}
              <Link href="/conferencia" className="mt-1 inline-block text-[var(--color-accent2)] hover:underline">
                Ver os lançamentos na Conferência →
              </Link>
            </div>
          )}
          {/* 3.2 e 6.2 — a tela declara o regime de cada bloco e o que a cascata inclui. */}
          <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--color-ink3)]" data-regime>
            Regime de cada bloco: despesas por <strong>competência</strong>; receita da venda e contas a receber pelo{" "}
            <strong>vencimento</strong> das parcelas; liberações de financiamento e permutas (dados antigos) pela data de <strong>liquidação</strong>;
            encargos financeiros (multa, juros) pela {definicaoNova ? <><strong>competência</strong> da despesa que os gerou</> : <>data de <strong>pagamento</strong></>}. Retiradas, Investimentos e Empréstimos
            estão incluídos na cascata, como hoje — a classificação contábil dessas três linhas aguarda decisão.
            “—” numa célula: a linha não teve nenhum lançamento; “R$ 0” é soma que deu zero.
          </p>
          {totais.some((t) => t.R <= 0) && (
            <p className="mt-2 text-[11.5px] text-[var(--color-ink3)]">
              “—” em % Receita: a coluna não tem receita positiva para servir de base.
            </p>
          )}
        </CardContent>
      </Card>
      )}

      {/* Prompt AC2 — visão mensal, abaixo da anual, com as mesmas colunas. */}
      {!(doEscopo && doEscopo.projetos.length === 0) && !semVersao && (
        <Card className="mt-5" data-dre-mensal>
          <CardContent className="p-5">
            <h2 className="mb-1 text-[14px] font-semibold text-[var(--color-ink)]">Visão mensal</h2>
            <p className="mb-2 text-[12px] text-[var(--color-ink3)]">
              {periodLabel} · uma coluna por mês{multi ? ` para cada ${isAll ? "cenário" : "versão"}` : ""}, e o total.
            </p>
            {mensalAcimaDoTeto && (
              <p role="status" className="mb-2 rounded-[8px] bg-[var(--color-warning)]/10 px-3 py-2 text-[12.5px] text-[var(--color-ink2)]">
                {meses.length} meses × {series.length} colunas = {celulasMensal} colunas — acima de {TETO_CELULAS_MENSAL}. Reduza o
                período (escolha um ano ou De/Até) ou desmarque versões. Os totais de cada coluna estão na visão anual, acima; nenhuma foi descartada.
              </p>
            )}
            {!mensalAcimaDoTeto && tabelaDre(true)}
            {meses.length === 0 && (
              <p className="mt-2 text-[12px] text-[var(--color-warning)]">
                Sem datas de início e fim no cadastro do projeto e sem lançamento com competência: não há meses para mostrar. Informe as datas em Projetos.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
