import Link from "next/link";
import { getTenantContext } from "@/lib/context";
import { chaveLigada } from "@/lib/chaves-tenant";
import { TODOS_OS_PROJETOS, lerEscopoDeRelatorio, projetosDoEscopo, rotuloDoEscopo } from "@/lib/projeto-selecao";
import { RecuperarProjeto } from "@/components/app/projeto-da-aba";
import { getChartAccounts, getInccRows, getVersionsDoProjeto } from "@/lib/queries";
import { calendarYearWindows } from "@/lib/planning";
import { NO_COMP } from "@/lib/calc/dre-cascata";
import { versionAnaliticaByMonth } from "@/lib/dre-inputs";
import { CENARIOS, ROTULO_CENARIO, eixoDeMeses, janelaDoProjeto, ordenarMeses, resolverCenario, resolverPeriodo, textoDaCobertura, type Cenario } from "@/lib/dre";
import { entradaVazia, linhasDaDreAnalitica, paraInputs, somarPeriodo, type EntradaAnalitica } from "@/lib/dre-analitica";
import { waterfall } from "@/lib/calc/dre-cascata";
import { categoriaDaConta } from "@/lib/categoria-do-plano";
import { classeDaConta, classePadrao, dreGerencial, type ClasseGerencial } from "@/lib/planocontas-regras";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DreControls } from "@/components/app/dre-controls";
import { TabelaAnalitica } from "@/components/app/tabela-analitica";
import { CrisDaTela } from "@/components/app/cris-contexto";
import { ExportarPdf } from "@/components/app/pdf";
import { CabecalhoDeImpressao } from "@/components/app/cabecalho-impressao";
import { can } from "@/lib/permissions";
import { AccessDenied } from "@/components/app/access-denied";

export const dynamic = "force-dynamic";

/**
 * Prompt AC3 (Fase 3 · revisão V5): DRE Analítica. A mesma DRE de um cenário,
 * aberta em categoria → grupo do plano de contas → conta, com a análise
 * vertical (% da receita). Mora sob /dre: a permissão é a da DRE. Só lê.
 */
export default async function DreAnaliticaPage({
  searchParams,
}: {
  searchParams: Promise<{ proj?: string; periodo?: string; de?: string; ate?: string; vkind?: string }>;
}) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "dre", "ver")) return <AccessDenied />;
  const definicaoNova = await chaveLigada(ctx.tenant.id, "dre_definicao_nova");
  const sp = await searchParams;

  const escopo = lerEscopoDeRelatorio(ctx.projects, sp);
  if (escopo.tipo === "nenhum") {
    return <RecuperarProjeto idsPermitidos={ctx.projects.map((p) => p.id)} semMemoria={TODOS_OS_PROJETOS} />;
  }
  const selectedProjects = escopo.tipo === "projeto" ? [escopo.projeto] : projetosDoEscopo(ctx.projects, escopo.tipo).projetos;
  const projParam = escopo.tipo === "projeto" ? escopo.projeto.id : escopo.tipo === "todos" ? TODOS_OS_PROJETOS : escopo.tipo;
  const scopeLabel =
    escopo.tipo === "projeto" ? escopo.projeto.name : escopo.tipo === "todos" ? "Empresa toda (matriz + filiais + projetos)" : rotuloDoEscopo(escopo.tipo);

  // Um cenário por vez: a versão daquele tipo em cada projeto, com a mesma
  // regra de substituição da DRE (sem a chave da DRE, cai para outra versão).
  const cenario: Cenario = (CENARIOS as string[]).includes(sp.vkind ?? "") ? (sp.vkind as Cenario) : "atual";
  const versoesPorProjeto = await Promise.all(selectedProjects.map((p) => getVersionsDoProjeto(ctx.tenant.id, p.id)));
  const resolucao = resolverCenario(
    cenario,
    selectedProjects.map((p, i) => ({ id: p.id, name: p.name, versoes: versoesPorProjeto[i] })),
    !definicaoNova,
  );
  const cobertura = textoDaCobertura(cenario, resolucao);
  const usadas = resolucao.filter((r) => r.versao);
  const [porProjeto, contas, inccAll] = await Promise.all([
    Promise.all(usadas.map((r) => versionAnaliticaByMonth(ctx.tenant.id, r.versao!.id, r.projetoId, { definicaoNova }))),
    getChartAccounts(ctx.tenant.id),
    Promise.all(selectedProjects.map((p) => getInccRows(p.tenantId, p.id))),
  ]);

  // Período: o mesmo da DRE (eixo das janelas dos projetos + competências).
  const comLancamento = new Set(porProjeto.flatMap((bm) => Object.keys(bm)).filter((m) => m !== NO_COMP));
  const axis = eixoDeMeses(selectedProjects.map(janelaDoProjeto), comLancamento);
  const axisIncc = ordenarMeses(new Set(inccAll.flat().map((r) => r.m)));
  const years = calendarYearWindows(ordenarMeses(new Set([...axis, ...axisIncc])), new Date().getFullYear());
  const periodo = sp.periodo ?? "acum";
  const customDe = (sp.de ?? "").trim();
  const customAte = (sp.ate ?? "").trim();
  const { periodMonths, label: periodLabel } = resolverPeriodo(periodo, customDe, customAte, definicaoNova ? axis : axisIncc, years);

  const entrada: EntradaAnalitica = porProjeto.reduce((acc, bm) => {
    const e = somarPeriodo(bm, periodMonths);
    acc.receitaVendas += e.receitaVendas;
    acc.receitaPermuta += e.receitaPermuta;
    acc.encargos += e.encargos;
    acc.lancamentos.push(...e.lancamentos);
    return acc;
  }, entradaVazia());
  const linhas = linhasDaDreAnalitica(
    entrada,
    contas.map((c) => ({ code: c.code, name: c.name, groupCode: c.groupCode, groupName: c.groupName })),
  );
  const categoriaDoPlano = await chaveLigada(ctx.tenant.id, "despesa_categoria_do_plano");
  // 0079 — DRE gerencial: os MESMOS lançamentos, reagrupados pela classe
  // gerencial da conta (Receita bruta → Resultado líquido). O Orçamento lança
  // por grupo: a chave de grupo usa a classe comum das contas do grupo.
  const mapaGerencial = new Map<string, { name: string; classe: ClasseGerencial }>();
  for (const c of contas) mapaGerencial.set(c.code, { name: c.name, classe: classeDaConta(c, categoriaDaConta(c)) });
  for (const code of new Set(contas.map((c) => c.groupCode))) {
    if (mapaGerencial.has(code)) continue;
    const doGrupo = contas.filter((c) => c.groupCode === code);
    const classes = new Set(doGrupo.map((c) => classeDaConta(c, categoriaDaConta(c))));
    mapaGerencial.set(code, { name: `${doGrupo[0].groupName} (planejado no grupo)`, classe: classes.size === 1 ? [...classes][0] : classePadrao(categoriaDaConta(doGrupo[0])) });
  }
  const gerencial = dreGerencial({ receitaSemConta: entrada.receitaVendas + entrada.receitaPermuta, encargos: entrada.encargos, lancamentos: entrada.lancamentos }, mapaGerencial);
  const resultadoCascata = waterfall([paraInputs(entrada)]).rows.at(-1)!.value;
  const confere = Math.abs(resultadoCascata - gerencial.resultadoDaCascata) < 0.01;
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const dreHref = `/dre?${new URLSearchParams({ proj: projParam, periodo, ...(customDe ? { de: customDe } : {}), ...(customAte ? { ate: customAte } : {}) }).toString()}`;

  return (
    <>
      <CabecalhoDeImpressao empresa={ctx.tenant.name} geradoPor={ctx.userEmail} />
      <PageHeader
        eyebrow={scopeLabel}
        title="DRE Analítica"
        subtitle={`${ROTULO_CENARIO[cenario]} · ${periodLabel} · categoria → grupo → conta, com a análise vertical (% da receita)`}
        actions={
          <div className="flex flex-wrap items-end gap-3">
            <DreControls
              base="/dre/analitica"
              projects={ctx.projects.map((p) => ({ id: p.id, label: p.kind === "office" ? `${p.name} · Unidade/Escritório` : p.name }))}
              proj={projParam}
              periods={[
                { value: "acum", label: "Acumulado (todos os anos)" },
                ...years.map((y) => ({ value: y.value, label: y.label })),
                { value: "custom", label: "Personalizado (De / Até)" },
              ]}
              periodo={periodo}
              periodDisabled={false}
              vs=""
              de={customDe}
              ate={customAte}
              showVersionKind
              versionKind={cenario}
            />
            <ExportarPdf arquivo={`DRE Analitica - ${scopeLabel} - ${periodLabel}`} />
          </div>
        }
      />
      <CrisDaTela
        titulo="DRE Analítica"
        dados={{
          escopo: scopeLabel,
          cenario: ROTULO_CENARIO[cenario],
          periodo: periodLabel,
          linhas: linhas.filter((l) => l.nivel <= 1).map((l) => ({ item: l.label, nivel: l.nivel, valor: l.valor, pctDaReceita: l.pct })),
          cobertura,
        }}
        sugestoes={["Qual grupo mais pesa no custo variável?", "Que conta cresceu acima da receita?", "Quanto a despesa fixa representa da receita?"]}
      />
      {cobertura && (
        <p className="mb-3 text-[12.5px] text-[var(--color-ink3)]" data-cobertura>
          {cobertura}
        </p>
      )}
      <Card>
        <CardContent className="p-5">
          <TabelaAnalitica linhas={linhas} rotulo="DRE Analítica" />
          <p className="mt-3 text-[12px] leading-relaxed text-[var(--color-ink3)]">
            Os totais são os da{" "}
            <Link href={dreHref} className="text-[var(--color-accent2)] hover:underline">
              DRE
            </Link>{" "}
            no mesmo cenário e período. Cada despesa entra pela{" "}
            {categoriaDoPlano ? "categoria da conta no Plano de Contas" : "categoria escolhida no lançamento"} e abre no grupo e na
            conta do Plano de Contas. Despesa sem conta aparece em &ldquo;Sem conta do plano&rdquo;.
          </p>
        </CardContent>
      </Card>
      <Card className="mt-6" id="dre-gerencial">
        <CardContent className="p-5">
          <h2 className="mb-1 text-[15px] font-semibold">Estrutura gerencial — Receita bruta → Resultado líquido</h2>
          <p className="mb-3 text-[12px] text-[var(--color-ink3)]">
            Os mesmos lançamentos, agrupados pela <strong>classe gerencial</strong> de cada conta do Plano de Contas. Custos e despesas aparecem com sinal negativo. Investimentos,
            empréstimos e distribuição ficam fora do resultado e voltam na conferência com o Resultado Final da cascata.
          </p>
          <table className="w-full text-[13px]" data-testid="tabela-gerencial">
            <tbody>
              {gerencial.linhas.map((l) => (
                <tr key={l.id} className={l.tipo === "conta" ? "text-[12px] text-[var(--color-ink2)]" : l.tipo === "item" ? "border-t border-[var(--color-line)]" : "border-t border-[var(--color-line)] bg-[var(--color-surface2)] font-semibold"}>
                  <td className="py-1" style={{ paddingLeft: l.tipo === "conta" ? 24 : 8 }}>
                    {l.rotulo}
                  </td>
                  <td className="py-1 pr-2 text-right font-[family-name:var(--font-mono)]">{fmt(l.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={`mt-2 text-[12px] ${confere ? "text-[var(--color-ink3)]" : "text-[var(--color-danger)]"}`} data-confere={confere}>
            {confere ? `Conferido: bate com o Resultado Final da cascata (${fmt(resultadoCascata)}).` : `Divergência com a cascata (${fmt(resultadoCascata)}): avise o suporte.`}
            {gerencial.semClasse.length > 0 && ` Contas fora do plano: ${gerencial.semClasse.join(", ")} (entram pela categoria).`}
          </p>
        </CardContent>
      </Card>
    </>
  );
}
