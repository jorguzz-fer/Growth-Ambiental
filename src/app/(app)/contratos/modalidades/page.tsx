import { eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { ModalidadesEditor } from "@/components/app/contratos/modalidades";

export const dynamic = "force-dynamic";

export default async function ModalidadesPage() {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "contratos", "editar")) return <AccessDenied />;
  const [mods, contratos] = await Promise.all([
    db.select().from(schema.contratoModalidades).where(eq(schema.contratoModalidades.tenantId, ctx.tenant.id)).orderBy(schema.contratoModalidades.ordem),
    db.select({ modalidadeId: schema.contratos.modalidadeId }).from(schema.contratos).where(eq(schema.contratos.tenantId, ctx.tenant.id)),
  ]);
  return (
    <>
      <PageHeader eyebrow="Contratos" title="Modalidades de Serviço" subtitle="Classificação dos contratos, configurável pela empresa. Desativar tira a modalidade dos novos cadastros e mantém os contratos que já a usam." />
      <div className="max-w-[760px] rounded-[14px] border border-[var(--color-line)] bg-white p-4">
        <ModalidadesEditor podeEditar modalidades={mods.map((m) => ({ id: m.id, nome: m.nome, ativo: m.ativo, uso: contratos.filter((c) => c.modalidadeId === m.id).length }))} />
      </div>
    </>
  );
}
