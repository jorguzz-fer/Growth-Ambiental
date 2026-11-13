import Link from "next/link";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { buttonVariants } from "@/components/ui/button";
import { CrisDaTela } from "@/components/app/cris-contexto";
import { listarContratos } from "@/lib/contratos-queries";
import { ContratosLista } from "@/components/app/contratos/contratos-lista";
import { AvisoTelaRemovida } from "@/components/app/aviso-tela-removida";

export const dynamic = "force-dynamic";

export default async function ContratosPage({ searchParams }: { searchParams: Promise<{ saiu?: string }> }) {
  const sp = await searchParams;
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "contratos", "ver")) return <AccessDenied />;
  const linhas = await listarContratos(ctx.tenant.id);
  const ativos = linhas.filter((l) => l.status === "ativo");
  return (
    <>
      <PageHeader
        eyebrow="Contratos"
        title="Contratos"
        subtitle={`${linhas.length} contrato(s) · ${ativos.length} ativo(s)`}
        actions={
          can(ctx.perms, "contratos", "criar") ? (
            <Link href="/contratos/novo" className={buttonVariants({ size: "sm" })}>
              + Novo contrato
            </Link>
          ) : undefined
        }
      />
      <AvisoTelaRemovida de={sp.saiu} />
      <CrisDaTela
        titulo="Contratos — listagem"
        dados={{ contratos: linhas.slice(0, 40).map((l) => ({ codigo: l.codigo, titulo: l.titulo, cliente: l.cliente, status: l.status, valorAtualizado: l.saldo.atualizado, medido: l.saldo.medidoAprovado, saldoAMedir: l.saldo.saldoAMedir, termino: l.termino })) }}
        sugestoes={["Quais contratos vencem nos próximos 60 dias?", "Qual contrato tem mais saldo a medir?", "Quanto falta faturar do que já foi medido?"]}
      />
      <ContratosLista
        projetos={ctx.projects.map((p) => ({ id: p.id, nome: p.name }))}
        linhas={linhas.map((l) => ({
          id: l.id,
          codigo: l.codigo,
          titulo: l.titulo,
          tipo: l.tipo,
          status: l.status,
          cliente: l.cliente,
          clienteId: l.clienteId,
          modalidade: l.modalidade,
          gestor: l.gestor,
          principal: l.principal,
          projetos: l.projetos,
          dataInicio: l.dataInicio,
          termino: l.termino,
          atualizado: l.saldo.atualizado,
          medido: l.saldo.medidoAprovado,
          saldoAMedir: l.saldo.saldoAMedir,
          pendente: l.saldo.pendente,
        }))}
      />
    </>
  );
}
