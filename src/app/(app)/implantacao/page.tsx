import { asc, eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { CrisDaTela } from "@/components/app/cris-contexto";
import { Card, CardContent } from "@/components/ui/card";
import { hojeMDY } from "@/lib/contrato-regras";
import { ROTULO_STATUS_ETAPA, STATUS_DA_ETAPA, resumoDaImplantacao } from "@/lib/implantacao-regras";
import { ImplantacaoManager } from "@/components/app/implantacao/implantacao-manager";

export const dynamic = "force-dynamic";

/**
 * Implantação e treinamento da empresa (0083): etapas A a H a partir de um
 * modelo customizável, com responsável, datas, situação, dependência e
 * evidência, e os treinamentos por perfil. Permissão: tela Empresa.
 */
export default async function ImplantacaoPage() {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "empresa", "ver")) return <AccessDenied />;
  const [etapas, treinamentos] = await Promise.all([
    db.select().from(schema.implantacaoEtapas).where(eq(schema.implantacaoEtapas.tenantId, ctx.tenant.id)).orderBy(asc(schema.implantacaoEtapas.grupo), asc(schema.implantacaoEtapas.ordem), asc(schema.implantacaoEtapas.codigo)),
    db.select().from(schema.implantacaoTreinamentos).where(eq(schema.implantacaoTreinamentos.tenantId, ctx.tenant.id)).orderBy(asc(schema.implantacaoTreinamentos.perfil), asc(schema.implantacaoTreinamentos.createdAt)),
  ]);
  const r = resumoDaImplantacao(etapas, hojeMDY());
  return (
    <>
      <PageHeader title="Implantação e Treinamento" subtitle="Etapas da implantação (modelo customizável), dependências, evidências e treinamentos por perfil" />
      <CrisDaTela titulo="Implantação e Treinamento" dados={{ resumo: { total: r.total, concluidas: r.concluidas, percentual: r.percentual, atrasadas: r.atrasadas, esperandoDependencia: r.esperandoDependencia } }} />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4" data-resumo-implantacao>
        {[
          ["Concluído", `${r.percentual}% (${r.concluidas} de ${r.total})`],
          ["Em andamento", String(r.porStatus.em_andamento)],
          ["Bloqueadas ou aguardando cliente", String(r.porStatus.bloqueada + r.porStatus.aguardando_cliente)],
          ["Atrasadas", String(r.atrasadas)],
        ].map(([rot, v]) => (
          <Card key={rot}>
            <CardContent className="p-3">
              <p className="text-[11.5px] text-[var(--color-ink3)]">{rot}</p>
              <p className="text-[18px] font-semibold">{v}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mb-3 text-[11.5px] text-[var(--color-ink3)]">
        Situações: {STATUS_DA_ETAPA.map((s) => ROTULO_STATUS_ETAPA[s]).join(" · ")}. Concluir exige evidência; iniciar ou concluir exige a dependência concluída.
      </p>
      <ImplantacaoManager
        etapas={etapas.map((e) => ({ id: e.id, grupo: e.grupo, codigo: e.codigo, titulo: e.titulo, descricao: e.descricao, responsavel: e.responsavel, previsto: e.previsto, realizado: e.realizado, status: e.status, dependeDe: e.dependeDe, observacoes: e.observacoes, evidencia: e.evidencia }))}
        treinamentos={treinamentos.map((t) => ({ id: t.id, perfil: t.perfil, tema: t.tema, participante: t.participante, data: t.data, status: t.status, pendencias: t.pendencias }))}
        podeEditar={can(ctx.perms, "empresa", "editar")}
      />
    </>
  );
}
