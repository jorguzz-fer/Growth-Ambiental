import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { CrisDaTela } from "@/components/app/cris-contexto";
import { ContratoForm } from "@/components/app/contratos/contrato-form";
import { opcoesDoFormulario } from "@/lib/contratos-opcoes";

export const dynamic = "force-dynamic";

export default async function NovoContratoPage({ searchParams }: { searchParams: Promise<{ proj?: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "contratos", "ver") || !can(ctx.perms, "contratos", "criar")) return <AccessDenied />;
  const opcoes = await opcoesDoFormulario(ctx);
  const { proj } = await searchParams;
  return (
    <>
      <PageHeader eyebrow="Contratos" title="Novo contrato" subtitle="Preencha à mão ou anexe o contrato na Cris para ela propor o preenchimento." />
      <CrisDaTela
        titulo="Contratos — novo contrato"
        dados={{ modalidades: opcoes.modalidades.filter((m) => m.ativo).map((m) => m.nome), quantidadeDeClientes: opcoes.clientes.length }}
        sugestoes={["Leia o contrato anexado e preencha o cadastro", "Extraia os itens e valores da proposta anexada", "Quais regras de reembolso o contrato prevê?"]}
      />
      <div className="max-w-[1100px]">
        <ContratoForm opcoes={opcoes} projetoInicial={proj && ctx.projects.some((p) => p.id === proj) ? proj : null} />
      </div>
    </>
  );
}
