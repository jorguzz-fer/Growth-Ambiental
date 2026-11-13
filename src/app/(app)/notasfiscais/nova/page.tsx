import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { getContasReceber } from "@/lib/queries";
import { emitenteDoTenant } from "@/lib/nota-servico";
import { rotuloDaConta, valoresIniciais } from "@/lib/nota-servico-tela";
import { formatarCnpj } from "@/lib/calc/emitente-fiscal";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { NotaServicoForm } from "@/components/app/nota-servico-form";
import { vinculosParaANota } from "@/lib/nota-servico-vinculos";

export const dynamic = "force-dynamic";

/** Prompt AG, 5.3 — novo rascunho de NFS-e de serviço avulso (BAG-1). */
export default async function NovaNotaPage({ searchParams }: { searchParams: Promise<{ proj?: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "notasfiscais", "ver") || !can(ctx.perms, "notasfiscais", "criar")) return <AccessDenied />;
  const sp = await searchParams;
  const ids = new Set(ctx.projects.map((p) => p.id));
  const contas = (await getContasReceber(ctx.tenant.id)).filter((c) => ids.has(c.projectId));
  const e = emitenteDoTenant(ctx.tenant);
  const vinculos = await vinculosParaANota(ctx.tenant.id, [...ids]);
  return (
    <>
      <PageHeader title="Nova nota fiscal" subtitle="NFS-e de serviço avulso · o rascunho não é enviado à prefeitura" />
      <NotaServicoForm
        inicial={valoresIniciais(null, { projectId: ids.has(sp.proj ?? "") ? sp.proj : "", aliquotaIss: e.aliquotaIss })}
        projetos={ctx.projects.map((p) => ({ id: p.id, name: p.name }))}
        contasReceber={contas.map((c) => ({ id: c.id, projectId: c.projectId, rotulo: rotuloDaConta(c) }))}
        contratos={vinculos.contratos}
        medicoes={vinculos.medicoes}
        emitente={{ razaoSocial: e.razaoSocial ?? "", cnpj: e.cnpj ? formatarCnpj(e.cnpj) : "", itemListaServico: e.itemListaServico ?? "", municipio: e.municipio ?? "" }}
      />
    </>
  );
}
