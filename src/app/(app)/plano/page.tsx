import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { lerSelecaoDeProjeto } from "@/lib/projeto-selecao";
import { PedirProjeto } from "@/components/app/pedir-projeto";
import { ProjectPicker } from "@/components/app/project-picker";
import { LembrarProjeto } from "@/components/app/projeto-da-aba";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { CrisDaTela } from "@/components/app/cris-contexto";
import { carregarModelos, carregarPlano } from "@/lib/plano-queries";
import { arvoreDoModelo, ROTULO_STATUS_ITEM } from "@/lib/plano-regras";
import { hojeMDY } from "@/lib/contrato-regras";
import { isR2Configured, readUrl } from "@/lib/storage/r2";
import { PlanoTela } from "@/components/app/plano/plano-tela";

export const dynamic = "force-dynamic";

/** Projetos → Plano de Trabalho: fases, atividades, entregas, cronograma e indicadores do projeto. */
export default async function PlanoPage({ searchParams }: { searchParams: Promise<{ proj?: string; project?: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "plano", "ver")) return <AccessDenied />;
  const selecao = lerSelecaoDeProjeto(ctx.projects, await searchParams);
  if (selecao.tipo !== "projeto") return <PedirProjeto titulo="Plano de Trabalho" projetos={ctx.projects} oQue="ver o plano de trabalho" />;
  const project = selecao.projeto;
  const tenantId = ctx.tenant.id;
  const hoje = hojeMDY();
  const [plano, modelos] = await Promise.all([carregarPlano(tenantId, project.id, project.name, hoje), carregarModelos(tenantId)]);
  const r2 = isR2Configured();
  const documentos = await Promise.all(plano.documentos.map(async (d) => ({ ...d, url: r2 ? await readUrl(d.storageKey).catch(() => null) : null })));
  const ativos = modelos.filter((m) => m.ativo);
  const pode = { criar: can(ctx.perms, "plano", "criar"), editar: can(ctx.perms, "plano", "editar"), excluir: can(ctx.perms, "plano", "excluir") };

  return (
    <>
      <PageHeader
        eyebrow={project.name}
        title="Plano de Trabalho"
        subtitle="Fases, atividades, entregas e marcos deste projeto. O sistema sugere, a consultoria decide: nenhuma fase é obrigatória."
        actions={<ProjectPicker projects={ctx.projects.map((p) => ({ id: p.id, label: p.name }))} selected={project.id} />}
      />
      <LembrarProjeto projectId={project.id} />
      <CrisDaTela
        titulo={`Plano de Trabalho — ${project.name}`}
        dados={{
          projeto: project.name,
          progressoFisico: plano.progressoProjeto,
          contagem: plano.contagem,
          fases: plano.fases.map((f) => ({
            nome: f.nome,
            situacao: ROTULO_STATUS_ITEM[f.status as keyof typeof ROTULO_STATUS_ITEM] ?? f.status,
            inicio: f.inicioPrevisto,
            termino: f.terminoPrevisto,
            terminoOriginal: f.terminoOriginal,
            atrasada: f.atrasada,
            progresso: f.progresso.percentual,
            atividades: plano.atividades.filter((a) => a.faseId === f.id && !a.parentId).map((a) => ({ nome: a.nome, situacao: a.status, termino: a.terminoPrevisto, atrasada: a.atrasada })),
          })),
          entregas: plano.entregas.map((e) => ({ nome: e.nome, tipo: e.tipo, prevista: e.dataPrevista, situacao: e.status, atrasada: e.atrasada })),
          financeiro: { contratado: plano.contratos.valor, medido: plano.contratos.medido, faturado: plano.contratos.faturado, recebido: plano.contratos.recebido },
          bibliotecaDaEmpresa: ativos.filter((m) => m.biblioteca).flatMap((m) => m.fases.filter((f) => f.ativo).map((f) => ({ fase: f.nome, atividades: f.atividades.filter((a) => a.ativo).map((a) => a.nome) }))),
          regra: "A Cris propõe; o usuário confere e escolhe o que gravar. Nenhuma fase é obrigatória. Progresso físico e financeiro são separados.",
        }}
        sugestoes={["Monte o plano de trabalho a partir do documento que vou anexar", "Quais atividades estão atrasadas?", "Resuma o andamento do projeto por fase", "Quais entregas vencem nos próximos 30 dias?"]}
      />
      <PlanoTela
        projectId={project.id}
        hoje={hoje}
        pode={pode}
        plano={{ ...plano, documentos }}
        modelos={ativos.map((m) => ({ id: m.id, nome: m.nome, biblioteca: m.biblioteca, arvore: arvoreDoModelo(m.fases, m.fases.flatMap((f) => f.atividades)) }))}
      />
    </>
  );
}
