import Link from "next/link";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { addCliente } from "@/lib/actions/clientes";
import { FormComResultado } from "@/components/app/form-com-resultado";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { ClienteFields } from "@/components/app/cliente-fields";
import { AccessDenied } from "@/components/app/access-denied";

export const dynamic = "force-dynamic";

export default async function NovoClientePage() {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // A página verifica "ver" antes de consultar qualquer dado (Prompt M, 2.2).
  // A guarda do layout não basta: ele renderiza em paralelo com a página e
  // não roda de novo na navegação dentro do app.
  if (!can(ctx.perms, "clientes", "ver")) return <AccessDenied />;
  if (!can(ctx.perms, "clientes", "criar")) {
    return (
      <p className="text-sm text-[var(--color-warning)]">
        Sem permissão para cadastrar clientes.
      </p>
    );
  }
  return (
    <>
      <PageHeader eyebrow={ctx.tenant.name} title="Novo cliente (contratante)" />
      <Card>
        <CardContent className="p-5">
          <FormComResultado action={addCliente} aoConcluir="/clientes" className="space-y-6">
            <ClienteFields
              veDados={can(ctx.perms, "clientesdados", "ver")}
              editaDados={can(ctx.perms, "clientesdados", "editar")}
            />
            <div className="flex items-center gap-2">
              <Button type="submit">Salvar cliente</Button>
              <Link href="/clientes" className={buttonVariants({ variant: "ghost" })}>
                Cancelar
              </Link>
            </div>
          </FormComResultado>
        </CardContent>
      </Card>
    </>
  );
}
