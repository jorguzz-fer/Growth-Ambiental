import { getProjectVersions, getTenantContext } from "@/lib/context";
import { VersoesDoProjeto } from "@/components/app/versoes-do-projeto";
import { avisoDeTelaRemovida } from "@/lib/telas-removidas";
import { contarPontoDoProjeto, getClientes, getDocumentsByProjects } from "@/lib/queries";
import { can } from "@/lib/permissions";
import { isR2Configured, readUrl } from "@/lib/storage/r2";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { ProjectManager } from "@/components/app/project-manager";
import { ProjectPicker } from "@/components/app/project-picker";
import type { ProjetoDoc } from "@/components/app/projeto-docs";
import { OrcadoRealizado } from "@/components/app/orcado-realizado";
import { getOrcadoRealizado } from "@/lib/dre-inputs";
import { montarCard } from "@/lib/calc/orcado-realizado";
import { analisarProjeto, analisarProjetos } from "@/lib/projeto-analise";
import { AssistenteProjetos } from "@/components/app/assistente-projetos";
import { isAiConfigured } from "@/lib/ai/client";
import { legivelPelaIa } from "@/lib/ai/campos";

export const dynamic = "force-dynamic";

/**
 * Projetos (Prompt B): dois estados na mesma rota — "Todos" (cards empilhados,
 * editáveis) e um projeto (`?proj=<id>`, visão completa com Localização e
 * Orçado x Realizado). O seletor é só desta página: não grava projeto ativo,
 * cookie nem padrão (seção 3). A lista já vem ordenada do contexto.
 */
export default async function ProjetoPage({
  searchParams,
}: {
  searchParams: Promise<{ proj?: string; de?: string }>;
}) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "projeto", "ver")) return <AccessDenied />;

  const sp = await searchParams;
  const selecionado = !sp.proj || sp.proj === "all" ? "all" : sp.proj;
  const projetoSel =
    selecionado === "all" ? null : ctx.projects.find((p) => p.id === selecionado) ?? null;

  const r2 = isR2Configured();
  const obraSel = projetoSel && projetoSel.kind !== "office" ? projetoSel : null;
  const [clientes, projDocs, registrosDePonto, oxr, versoesSel] = await Promise.all([
    getClientes(ctx.tenant.id),
    // Só os documentos de projeto (Prompt B, 13) — e não todos os da empresa.
    getDocumentsByProjects(ctx.tenant.id),
    obraSel ? contarPontoDoProjeto(ctx.tenant.id, obraSel.id) : Promise.resolve(0),
    // Orçado x Realizado (19–20): só na visão de uma obra; fontes da Fase 1.
    obraSel ? getOrcadoRealizado(ctx.tenant.id, obraSel.id) : Promise.resolve(null),
    // Prompt AP: as versões do projeto escolhido (trava e planilha da Atual).
    projetoSel ? getProjectVersions(ctx.tenant.id, projetoSel.id) : Promise.resolve(null),
  ]);
  // URLs assinadas em paralelo, não uma a uma.
  const urls = await Promise.all(projDocs.map((d) => (r2 ? readUrl(d.storageKey) : Promise.resolve(null))));
  const docsByProject: Record<string, ProjetoDoc[]> = {};
  projDocs.forEach((d, i) => {
    (docsByProject[d.projectId!] ??= []).push({
      id: d.id,
      filename: d.filename,
      tipo: d.tipo,
      url: urls[i],
      uploadedAt: d.uploadedAt ? new Date(d.uploadedAt).toISOString() : null,
    });
  });

  // Id inválido na URL (projeto de outra empresa, ou apagado): a tela não
  // escolhe outro no lugar — mostra "Todos" com aviso.
  const idDesconhecido = selecionado !== "all" && !projetoSel;

  // Assistente (24–29): a análise roda aqui, sobre os projetos do contexto —
  // nunca sobre ids vindos do cliente. Na visão de uma obra, só ela.
  const card = obraSel && oxr ? montarCard(oxr.orcado, oxr.realizado) : null;
  const paraAnalise = (p: (typeof ctx.projects)[number]) => ({ ...p, documentos: (docsByProject[p.id] ?? []).length });
  const usuario = ctx.userEmail ?? "anon";
  const assistente = obraSel ? (
    <AssistenteProjetos
      modo="projeto"
      usuario={usuario}
      aiConfigurada={isAiConfigured()}
      projectId={obraSel.id}
      nome={obraSel.name}
      analise={analisarProjeto(paraAnalise(obraSel), card)}
      documentos={projDocs.filter((d) => d.projectId === obraSel.id).map((d) => ({ id: d.id, filename: d.filename, tipo: d.tipo, legivel: legivelPelaIa(d.contentType ?? "") }))}
      canEditar={can(ctx.perms, "projeto", "editar")}
    />
  ) : projetoSel ? null : (
    <AssistenteProjetos modo="todos" usuario={usuario} aiConfigurada={isAiConfigured()} analise={analisarProjetos(ctx.projects.map(paraAnalise))} />
  );

  return (
    <>
      <PageHeader
        eyebrow={ctx.tenant.name}
        title={projetoSel ? `Projeto ${projetoSel.name}` : "Projetos"}
        subtitle={
          projetoSel
            ? `Projetos — ${projetoSel.name}`
            : "Projetos · sedes e filiais"
        }
        actions={
          <ProjectPicker
            projects={ctx.projects.map((p) => ({
              id: p.id,
              label: p.kind === "office" ? `${p.name} · Matriz/Filial` : p.name,
              kind: p.kind === "office" ? "office" : "proj",
            }))}
            selected={projetoSel ? projetoSel.id : "all"}
            allOption
          />
        }
      />

      {avisoDeTelaRemovida(sp.de) && (
        <p role="status" className="mb-4 rounded-[8px] border border-[var(--color-line)] bg-[var(--color-surface2)] px-3 py-2 text-[13px] text-[var(--color-ink2)]">
          {avisoDeTelaRemovida(sp.de)}
        </p>
      )}
      {idDesconhecido && (
        <p role="alert" className="mb-4 rounded-[10px] border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-4 py-2 text-[12.5px] text-[var(--color-ink)]">
          O projeto pedido na URL não existe nesta empresa. Mostrando todos os projetos.
        </p>
      )}

      {/* Abaixo de 1180px o painel desce para baixo do conteúdo (seção 36). */}
      <div className="flex flex-col gap-6 min-[1180px]:flex-row min-[1180px]:items-start">
      <div className="min-w-0 flex-1">
      <ProjectManager
        projects={ctx.projects}
        selecionadoId={projetoSel ? projetoSel.id : "all"}
        clientes={clientes.map((c) => ({ id: c.id, nome: c.nomeCompleto }))}
        tenantName={ctx.tenant.name}
        docsByProject={docsByProject}
        r2Configured={r2}
        tenantCodigoMunicipio={ctx.tenant.codigoMunicipio}
        registrosDePonto={registrosDePonto}
        orcadoRealizado={obraSel && card ? <OrcadoRealizado projectId={obraSel.id} card={card} /> : undefined}
        perms={{
          criar: can(ctx.perms, "projeto", "criar"),
          editar: can(ctx.perms, "projeto", "editar"),
          excluir: can(ctx.perms, "projeto", "excluir"),
        }}
      />
      {versoesSel && (
        <VersoesDoProjeto
          versions={versoesSel.versions}
          podeTravar={can(ctx.perms, "versaotrava", "editar")}
          podePlanilha={can(ctx.perms, "projeto", "editar")}
        />
      )}
      </div>
      {assistente}
      </div>
    </>
  );
}
