import Link from "next/link";
import { getTenantContext } from "@/lib/context";
import { chaveLigada } from "@/lib/chaves-tenant";
import { TODOS_OS_PROJETOS, lerEscopoDeRelatorio, projetosDoEscopo, rotuloDoEscopo } from "@/lib/projeto-selecao";
import { RecuperarProjeto } from "@/components/app/projeto-da-aba";
import { getChartAccounts, getVersionsDoProjeto } from "@/lib/queries";
import { entradasDoFluxo, saidasDoFluxo } from "@/lib/fluxo-caixa";
import { CENARIOS, ROTULO_CENARIO, type Cenario } from "@/lib/dre";
import { linhasDoFluxoAnalitico, type EntradaDoFluxoAnalitico } from "@/lib/fluxo-analitico";
import { monthInRange } from "@/lib/utils";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectPicker } from "@/components/app/project-picker";
import { DateRangeFilter } from "@/components/app/date-range-filter";
import { TabelaAnalitica } from "@/components/app/tabela-analitica";
import { CrisDaTela } from "@/components/app/cris-contexto";
import { ExportarPdf } from "@/components/app/pdf";
import { CabecalhoDeImpressao } from "@/components/app/cabecalho-impressao";
import { can } from "@/lib/permissions";
import { AccessDenied } from "@/components/app/access-denied";

export const dynamic = "force-dynamic";

/**
 * Prompt AD3 (Fase 3 · revisão V5): Fluxo de Caixa Analítico. O previsto do
 * Fluxo de Caixa (pelo vencimento) de um cenário, aberto em bloco (obra ou
 * complementar) → grupo → conta do plano de contas, com a análise vertical
 * (% das entradas). Mora sob /fluxocaixa: a permissão é a do Fluxo. Só lê.
 */
export default async function FluxoAnaliticoPage({
  searchParams,
}: {
  searchParams: Promise<{ proj?: string; de?: string; ate?: string; vkind?: string }>;
}) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "fluxocaixa", "ver")) return <AccessDenied />;
  const fluxoNovo = await chaveLigada(ctx.tenant.id, "fluxo_definicao_nova");
  const sp = await searchParams;
  const de = sp.de ?? "";
  const ate = sp.ate ?? "";
  const hasRange = !!(de || ate);

  const escopo = lerEscopoDeRelatorio(ctx.projects, sp);
  if (escopo.tipo === "nenhum") {
    return <RecuperarProjeto idsPermitidos={ctx.projects.map((p) => p.id)} semMemoria={TODOS_OS_PROJETOS} />;
  }
  const projetos = escopo.tipo === "projeto" ? [escopo.projeto] : projetosDoEscopo(ctx.projects, escopo.tipo).projetos;
  const projParam = escopo.tipo === "projeto" ? escopo.projeto.id : escopo.tipo === "todos" ? TODOS_OS_PROJETOS : escopo.tipo;
  const scopeLabel = escopo.tipo === "projeto" ? escopo.projeto.name : escopo.tipo === "todos" ? "Empresa toda" : rotuloDoEscopo(escopo.tipo);

  // Um cenário por vez. A Atual é a padrão, como no Fluxo; sem a chave do
  // Fluxo, obra sem a versão pedida cai na primeira (a regra de antes).
  const cenario: Cenario = (CENARIOS as string[]).includes(sp.vkind ?? "") ? (sp.vkind as Cenario) : "atual";
  const versoes = await Promise.all(projetos.map((p) => getVersionsDoProjeto(ctx.tenant.id, p.id)));
  const usadas = projetos
    .map((p, i) => ({ p, v: versoes[i].find((v) => v.kind === cenario) ?? (fluxoNovo ? undefined : versoes[i][0]) }))
    .filter((x): x is { p: (typeof projetos)[number]; v: NonNullable<typeof x.v> } => !!x.v);
  const semCenario = projetos.length - usadas.length;

  const noPeriodo = (mm: string) => !hasRange || monthInRange(mm, de, ate);
  const entrada: EntradaDoFluxoAnalitico = { vendas: 0, permuta: 0, saidas: [] };
  const [porVersao, contas] = await Promise.all([
    Promise.all(usadas.map(async ({ p, v }) => ({ ent: await entradasDoFluxo(v, p.id, { definicaoNova: fluxoNovo }), sai: await saidasDoFluxo(v, { definicaoNova: fluxoNovo }) }))),
    getChartAccounts(ctx.tenant.id),
  ]);
  for (const { ent, sai } of porVersao) {
    for (const [mm, val] of Object.entries(ent.vendas)) if (noPeriodo(mm)) entrada.vendas += val;
    for (const [mm, val] of Object.entries(ent.permuta)) if (noPeriodo(mm)) entrada.permuta += val;
    for (const s of sai) if (noPeriodo(s.mes)) entrada.saidas.push({ conta: s.conta, origem: s.origem, valor: s.valor });
  }
  const linhas = linhasDoFluxoAnalitico(
    entrada,
    contas.map((c) => ({ code: c.code, name: c.name, groupCode: c.groupCode, groupName: c.groupName, kind: c.kind })),
  );
  const periodo = hasRange ? `${de || "início"} a ${ate || "fim"}` : "todo o horizonte";
  const fluxoHref = `/fluxocaixa?${new URLSearchParams({ proj: projParam, ...(de ? { de } : {}), ...(ate ? { ate } : {}) }).toString()}`;

  return (
    <>
      <CabecalhoDeImpressao empresa={ctx.tenant.name} geradoPor={ctx.userEmail} />
      <PageHeader
        eyebrow={scopeLabel}
        title="Fluxo de Caixa Analítico"
        subtitle={`${ROTULO_CENARIO[cenario]} · previsto pelo vencimento · ${periodo}`}
        actions={
          <div className="flex flex-wrap items-end gap-3">
            <ProjectPicker projects={ctx.projects.map((p) => ({ id: p.id, label: p.name }))} selected={projParam} allOption scopeOptions />
            <DateRangeFilter de={de} ate={ate} />
            <form method="get" className="flex items-end gap-2">
              <input type="hidden" name="proj" value={projParam} />
              {de && <input type="hidden" name="de" value={de} />}
              {ate && <input type="hidden" name="ate" value={ate} />}
              <select name="vkind" defaultValue={cenario} aria-label="Cenário" className="h-9 rounded-[8px] border border-[var(--color-line)] bg-white px-2 text-sm">
                {(["atual", "forecast", "budget"] as const).map((c) => (
                  <option key={c} value={c}>
                    {ROTULO_CENARIO[c]}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="outline">
                Aplicar
              </Button>
            </form>
            <ExportarPdf arquivo={`Fluxo de Caixa Analitico - ${scopeLabel}`} />
          </div>
        }
      />
      <CrisDaTela
        titulo="Fluxo de Caixa Analítico"
        dados={{
          escopo: scopeLabel,
          cenario: ROTULO_CENARIO[cenario],
          periodo,
          linhas: linhas.filter((l) => l.nivel <= 2).map((l) => ({ item: l.label, nivel: l.nivel, valor: l.valor, pctDasEntradas: l.pct })),
          obrasSemOCenario: semCenario,
        }}
        sugestoes={["Qual grupo mais consome caixa?", "Quanto das saídas é custo direto dos serviços e quanto é complementar?", "As entradas cobrem as saídas no período?"]}
      />
      {semCenario > 0 && (
        <p className="mb-3 text-[12.5px] text-[var(--color-ink3)]" data-cobertura>
          {semCenario} projeto(s) sem {ROTULO_CENARIO[cenario]} ficaram fora.
        </p>
      )}
      <Card>
        <CardContent className="p-5">
          <TabelaAnalitica linhas={linhas} rotuloPct="% Entradas" abertoAte={1} rotulo="Fluxo de Caixa Analítico" />
          <p className="mt-3 text-[12px] leading-relaxed text-[var(--color-ink3)]">
            Saídas abertas em bloco (obra ou complementar), grupo e conta; a coluna da direita é a análise vertical, em % das
            entradas. É o previsto do{" "}
            <Link href={fluxoHref} className="text-[var(--color-accent2)] hover:underline">
              Fluxo de Caixa
            </Link>
            , pelo mês do vencimento: as mesmas parcelas, despesas e ressarcimentos, abertos pela conta do Plano de Contas. Despesa
            paga por terceiro sai no ressarcimento, não na despesa. O realizado (o que passou pela conta) fica no Fluxo de Caixa.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
