import { getTenantContext } from "@/lib/context";
import { chaveLigada } from "@/lib/chaves-tenant";
import { lerSelecaoDeProjeto } from "@/lib/projeto-selecao";
import { PedirProjeto } from "@/components/app/pedir-projeto";
import { LembrarProjeto } from "@/components/app/projeto-da-aba";
import { can } from "@/lib/permissions";
import {
  getBudgetPlanning,
  getProjectVersionsByKind,
  getForecastComparison,
} from "@/lib/queries";
import { analisarOrcamento } from "@/lib/orcamento-analise";
import { AccessDenied } from "@/components/app/access-denied";
import { BudgetPlanningScreen } from "@/components/app/budget-planning-screen";
import { AssistenteOrcamento } from "@/components/app/assistente-orcamento";
import { ProjecaoAoTermino } from "@/components/app/projecao-ao-termino";
import { projecaoDoProjeto } from "@/lib/projecao-financeira-dados";

export const dynamic = "force-dynamic";

export default async function ForecastPage({
  searchParams,
}: {
  searchParams: Promise<{ proj?: string; project?: string; v?: string; cmp?: string; base?: string }>;
}) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "forecast", "ver")) return <AccessDenied />;
  // Prompt H (5.2): aviso na tela quando a regra está ligada na empresa.
  const rascunhoFora = await chaveLigada(ctx.tenant.id, "rascunho_fora_dos_relatorios");
  const sp = await searchParams;

  // Inclui obras e matriz/filiais (office). Offices usam ano atual + 5 anos.
  // A obra vem da URL desta tela (Prompt A); sem ela, a aba reabre a última
  // escolhida ou a tela pede a escolha — nunca a do cookie nem a primeira.
  const alvos = ctx.projects;
  const selecao = lerSelecaoDeProjeto(alvos, sp);
  if (selecao.tipo !== "projeto") {
    return <PedirProjeto titulo="Previsão Atualizada" projetos={alvos} oQue="lançar a previsão" />;
  }
  const projId = selecao.projeto.id;
  const [data, budgetVersions, projecao] = await Promise.all([
    getBudgetPlanning(ctx.tenant.id, projId, "forecast", sp.v ?? null),
    getProjectVersionsByKind(ctx.tenant.id, projId, "budget"),
    projecaoDoProjeto(ctx.tenant.id, projId),
  ]);

  const projects = alvos.map((p) => ({
    id: p.id,
    label: p.kind === "office" ? `${p.name} · Matriz/Filial` : p.name,
  }));
  // Assistente (seção 6, somente leitura): compara esta Previsão com o seu
  // Orçamento de origem. Versão já validada contra o tenant pela consulta.
  // Prompt F, FC-07: `?base=` é a escolha explícita quando a previsão não tem
  // origem registrada — validada na consulta contra o projeto e o tenant.
  const cmp = data.versionId && data.hasPeriod ? await getForecastComparison(ctx.tenant.id, data.versionId, sp.base ?? null) : null;
  const analise = analisarOrcamento(data, cmp);
  // Modo comparação (FC-11): dentro da moldura da tela, não no lugar dela.
  const comparando = sp.cmp === "1" && !!data.versionId;
  return (
    <>
      <LembrarProjeto projectId={projId} />
      <div className="flex flex-col gap-6 min-[1180px]:flex-row min-[1180px]:items-start">
        <div className="min-w-0 flex-1">
          <BudgetPlanningScreen
            data={data}
            kind="forecast"
            projects={projects}
            canEdit={can(ctx.perms, "forecast", "editar")}
            rascunhoForaLigado={rascunhoFora}
            podeTravar={can(ctx.perms, "versaotrava", "editar")}
            podeAprovar={can(ctx.perms, "versaoaprova", "editar")}
            budgetVersions={budgetVersions.map((v) => ({ id: v.id, label: v.label }))}
            canCreateForecast={can(ctx.perms, "forecast", "criar")}
            comparacao={comparando ? cmp : null}
          />
          {projecao && (
            <div className="mt-6">
              <ProjecaoAoTermino p={projecao} versoes={projecao.versoes} titulo={`Projeção ao término · ${selecao.projeto.name}`} />
            </div>
          )}
        </div>
        {data.hasPeriod && data.versionId && (
          <AssistenteOrcamento
            usuario={ctx.userEmail ?? "anon"}
            tela="forecast"
            analise={analise}
            reprojecao={{ versionId: data.versionId, canCriar: can(ctx.perms, "forecast", "criar"), temOrigem: !!data.versions.find((v) => v.id === data.versionId)?.sourceVersionId }}
          />
        )}
      </div>
    </>
  );
}
