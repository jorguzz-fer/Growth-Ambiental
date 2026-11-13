import { getAllTenantsOverview } from "@/lib/queries";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { CreateTenantForm } from "@/components/app/create-tenant-form";

export const dynamic = "force-dynamic";

/** Dashboard do backoffice: criar contas + visão geral de todos os tenants. */
export default async function PlataformaPage() {
  const tenants = await getAllTenantsOverview();
  const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

  return (
    <>
      <PageHeader
        title="Contas (tenants)"
        subtitle={`${tenants.length} contas · criação e visão geral da plataforma`}
      />

      <Card className="mb-6">
        <CardContent className="space-y-4 p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">
            Nova conta
          </h2>
          <CreateTenantForm />
          <p className="text-xs text-[var(--color-ink3)]">
            A conta nasce com 1 projeto, as 3 versões (Orçamento / Previsão
            Atualizada / Atual), o plano de contas padrão de consultoria ambiental e a
            tabela INCC padrão. Dados de movimento (contratos, despesas) ficam vazios para o
            cliente preencher.
          </p>
        </CardContent>
      </Card>

      <Table>
        <THead>
          <tr>
            <TH>Empresa</TH>
            <TH>Owner(s)</TH>
            <TH>Membros</TH>
            <TH>Projetos</TH>
            <TH>Criada em</TH>
          </tr>
        </THead>
        <tbody>
          {tenants.map((t) => (
            <TR key={t.id}>
              <TD className="font-medium text-[var(--color-ink)]">{t.name}</TD>
              <TD className="font-[family-name:var(--font-mono)] text-xs">
                {t.owners.length ? t.owners.join(", ") : "—"}
              </TD>
              <TD>{t.members}</TD>
              <TD>{t.projects}</TD>
              <TD className="text-xs text-[var(--color-ink3)]">
                {dateFmt.format(t.createdAt)}
              </TD>
            </TR>
          ))}
        </tbody>
      </Table>
    </>
  );
}
