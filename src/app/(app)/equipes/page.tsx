import { getTenantContext } from "@/lib/context";
import { lerSelecaoDeProjeto } from "@/lib/projeto-selecao";
import { getAlocacoesAtivas, getAlocaveis, getDiasDaEquipe, getDocumentsByEquipeDias, getEquipeDoProjeto } from "@/lib/queries";
import { analisarEquipes } from "@/lib/pessoas-analise";
import { isAiConfigured } from "@/lib/ai/despesa-extract";
import { AssistenteEquipes } from "@/components/app/assistente-equipes";
import { garantirFuncoesPadrao } from "@/lib/equipes-db";
import { can } from "@/lib/permissions";
import { isR2Configured, readUrl } from "@/lib/storage/r2";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { ProjectPicker } from "@/components/app/project-picker";
import { LembrarProjeto } from "@/components/app/projeto-da-aba";
import { EquipesManager, type DocDoDia } from "@/components/app/equipes-manager";

export const dynamic = "force-dynamic";

/** Pessoas › Equipes de Projetos (Prompt Z, Parte 3): quem trabalha em cada obra, com função, e o controle de diárias executadas. Sem geolocalização. */
export default async function EquipesPage({ searchParams }: { searchParams: Promise<{ proj?: string; de?: string; ate?: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "equipes", "ver")) return <AccessDenied />;
  const sp = await searchParams;
  const pickerProjetos = ctx.projects.map((p) => ({ id: p.id, label: p.name }));
  const selecao = lerSelecaoDeProjeto(ctx.projects, sp);
  const project = selecao.tipo === "projeto" ? selecao.projeto : null;
  if (!project) {
    return (
      <>
        <PageHeader title="Equipes e Presença de Campo" subtitle="Escolha o projeto para ver a equipe e registrar as diárias" actions={<ProjectPicker projects={pickerProjetos} selected="" />} />
        <p className="text-[12.5px] text-[var(--color-ink3)]">Selecione um projeto.</p>
      </>
    );
  }
  const de = sp.de ?? "";
  const ate = sp.ate ?? "";
  const [equipe, alocaveis, funcoes, dias] = await Promise.all([getEquipeDoProjeto(ctx.tenant.id, project.id), getAlocaveis(ctx.tenant.id), garantirFuncoesPadrao(ctx.tenant.id), getDiasDaEquipe(ctx.tenant.id, project.id, de || null, ate || null)]);
  const r2 = isR2Configured();
  // 6.2 — o assistente: proposta do dia a partir da equipe, e as análises; só nomes, datas e quantidades.
  const hoje = (() => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
  })();
  const [todosOsDias, alocacoesAtivas] = await Promise.all([de || ate ? getDiasDaEquipe(ctx.tenant.id, project.id) : Promise.resolve(dias), getAlocacoesAtivas(ctx.tenant.id)]);
  const analise = analisarEquipes({
    equipe: equipe.map((m) => ({ id: m.id, nome: m.nome, origem: m.origem, stakeholderId: m.stakeholderId, funcionarioId: m.funcionarioId, funcaoId: m.funcaoId, valorDiaria: m.valorDiaria, situacao: m.situacao })),
    diarias: todosOsDias.flatMap((d) => d.diarias),
    alocacoesAtivas,
    projetos: ctx.projects.map((p) => ({ id: p.id, name: p.name })),
    diaJaRegistrado: todosOsDias.some((d) => d.data === hoje),
  });
  const docs = await getDocumentsByEquipeDias(ctx.tenant.id, dias.map((d) => d.id));
  const diasComFolha = dias.filter((d) => docs.some((x) => x.equipeDiaId === d.id && x.tipo === "Folha de ponto assinada")).map((d) => ({ id: d.id, data: d.data }));
  const docsPorDia: Record<string, DocDoDia[]> = {};
  for (const d of docs) {
    if (!d.equipeDiaId) continue;
    (docsPorDia[d.equipeDiaId] ??= []).push({ id: d.id, filename: d.filename, tipo: d.tipo, versao: d.versao, contentType: d.contentType, url: r2 ? await readUrl(d.storageKey) : null });
  }
  return (
    <>
      <PageHeader
        eyebrow={ctx.tenant.name}
        title="Equipes e Presença de Campo"
        subtitle="Quem trabalha em cada projeto, com a função, e as diárias executadas · a diária não gera despesa: o lançamento é proposto e acontece em Despesas"
        actions={<ProjectPicker projects={pickerProjetos} selected={project.id} />}
      />
      <LembrarProjeto projectId={project.id} />
      <div className="flex flex-col gap-6 min-[1180px]:flex-row min-[1180px]:items-start">
      <div className="min-w-0 flex-1">
      <EquipesManager
        projectId={project.id}
        projectName={project.name}
        equipe={equipe}
        alocaveis={alocaveis.filter((a) => !equipe.some((m) => m.situacao === "ativa" && (m.stakeholderId === a.id || m.funcionarioId === a.id)))}
        funcoes={funcoes.map((f) => ({ id: f.id, nome: f.nome, ativo: f.ativo }))}
        dias={dias}
        docsPorDia={docsPorDia}
        de={de}
        ate={ate}
        canCriar={can(ctx.perms, "equipes", "criar")}
        canEditar={can(ctx.perms, "equipes", "editar")}
        canExcluir={can(ctx.perms, "equipes", "excluir")}
        r2={r2}
      />
      </div>
      <AssistenteEquipes usuario={ctx.userEmail ?? "anon"} projectId={project.id} hojeInterno={hoje} analise={analise} diasComFolha={diasComFolha} canCriar={can(ctx.perms, "equipes", "criar")} aiConfigurada={isAiConfigured()} />
      </div>
    </>
  );
}
