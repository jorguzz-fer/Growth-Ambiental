import { eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { carregarModelos } from "@/lib/plano-queries";
import { MODELOS_SUGERIDOS } from "@/lib/plano-regras";
import { ModelosEditor } from "@/components/app/plano/modelos-editor";

export const dynamic = "force-dynamic";

/** Configurações → Modelos de Fases e Atividades (biblioteca e modelos da empresa). */
export default async function ModelosPage() {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "modelos", "ver")) return <AccessDenied />;
  const [modelos, modalidades] = await Promise.all([
    carregarModelos(ctx.tenant.id),
    db.select({ id: schema.contratoModalidades.id, nome: schema.contratoModalidades.nome }).from(schema.contratoModalidades).where(eq(schema.contratoModalidades.tenantId, ctx.tenant.id)).orderBy(schema.contratoModalidades.ordem),
  ]);
  const nomes = new Set(modelos.map((m) => m.nome));
  return (
    <>
      <PageHeader
        eyebrow="Configurações"
        title="Modelos de Fases e Atividades"
        subtitle="O sistema sugere, a empresa configura, cada projeto usa só o que precisa. Mudar um modelo não altera projetos existentes."
      />
      <ModelosEditor
        podeEditar={can(ctx.perms, "modelos", "editar")}
        modalidades={modalidades}
        sugeridos={MODELOS_SUGERIDOS.map((s) => ({ chave: s.chave, nome: s.nome, jaTem: nomes.has(s.nome) }))}
        modelos={modelos.map((m) => ({
          id: m.id,
          nome: m.nome,
          descricao: m.descricao,
          biblioteca: m.biblioteca,
          ativo: m.ativo,
          modalidadeId: m.modalidadeId,
          fases: m.fases.map((f) => ({ id: f.id, nome: f.nome, descricao: f.descricao, ativo: f.ativo, sugerida: f.sugerida, atividades: f.atividades.map((a) => ({ id: a.id, parentId: a.parentId, tipo: a.tipo, nome: a.nome, descricao: a.descricao, ativo: a.ativo, sugerida: a.sugerida })) })),
        }))}
      />
    </>
  );
}
