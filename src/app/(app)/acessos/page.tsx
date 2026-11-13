import { getTenantContext, type Role } from "@/lib/context";
import { SCREENS, can, effectivePermissions, type PermAction } from "@/lib/permissions";
import { membroRestritoNoTenant, opcoesDoTenant } from "@/lib/membro-padrao";
import { getMembers } from "@/lib/queries";
import { PageHeader } from "@/components/app/page-header";
import { AccessMatrix } from "@/components/app/access-matrix";
import { Card, CardContent } from "@/components/ui/card";
import { AccessDenied } from "@/components/app/access-denied";

export const dynamic = "force-dynamic";

const ACOES: PermAction[] = ["ver", "criar", "editar", "excluir"];

export default async function AcessosPage() {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // A página verifica "ver" antes de consultar qualquer dado (Prompt M, 2.2).
  // A guarda do layout não basta: ele renderiza em paralelo com a página e
  // não roda de novo na navegação dentro do app.
  if (!can(ctx.perms, "acessos", "ver")) return <AccessDenied />;

  const members = await getMembers(ctx.tenant.id);
  const canEditPerms = can(ctx.perms, "acessos", "editar");
  const opts = await opcoesDoTenant(ctx.tenant.id);
  const ids = new Set(SCREENS.map((s) => s.id));

  const rows = members.map((m) => ({
    userId: m.userId,
    name: m.name,
    email: m.email,
    role: m.role,
    perms: effectivePermissions(m.role as Role, m.permissions, opts),
    personalizadas: Object.keys(m.permissions ?? {}).filter((k) => ids.has(k)).length,
  }));

  // Prévia do padrão novo do membro (AJ 1.4): com a chave DESLIGADA, o que
  // cada membro perderia se ela fosse ligada. É essa lista que se aprova.
  const chaveLigada = await membroRestritoNoTenant(ctx.tenant.id);
  const previa = chaveLigada
    ? []
    : members
        .filter((m) => m.role === "membro")
        .map((m) => {
          const hoje = effectivePermissions("membro", m.permissions, { membroRestrito: false });
          const depois = effectivePermissions("membro", m.permissions, { membroRestrito: true });
          const perde = SCREENS.flatMap((s) => {
            const acoes = ACOES.filter((a) => hoje[s.id]?.[a] && !depois[s.id]?.[a]);
            return acoes.length ? [`${s.label} (${acoes.join(", ")})`] : [];
          });
          return { nome: m.name ?? m.email ?? m.userId, perde };
        });

  return (
    <>
      <PageHeader
        title="Gestão de Acessos"
        subtitle="Permissões granulares por usuário · telas × ações (Ver / Criar / Editar / Excluir)"
      />
      {!canEditPerms && (
        <p className="mb-4 text-sm text-[var(--color-warning)]">
          Você pode visualizar, mas não editar permissões.
        </p>
      )}
      {canEditPerms && previa.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-5 text-sm">
            <div className="font-semibold text-[var(--color-ink)]">
              Prévia do novo padrão do papel “membro” — ainda desligado nesta empresa
            </div>
            <p className="mt-1 text-[12.5px] text-[var(--color-ink3)]">
              No padrão novo, o membro alcança só Despesas, Contas a Pagar,
              Fornecedores, Caixa, Contas Correntes, Clientes e Contas a
              Receber (ver, criar e editar). Telas
              personalizadas nesta matriz continuam como estão. Ao ligar, cada
              membro perde:
            </p>
            <ul className="mt-3 space-y-1.5">
              {previa.map((p) => (
                <li key={p.nome}>
                  <span className="font-medium">{p.nome}:</span>{" "}
                  <span className="text-[var(--color-ink2)]">
                    {p.perde.length ? p.perde.join(" · ") : "nada"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12.5px] text-[var(--color-ink3)]">
              Quem liga é a plataforma, na tela de chaves de mudança. Peça ao suporte.
            </p>
          </CardContent>
        </Card>
      )}
      <AccessMatrix members={rows} canEdit={canEditPerms} currentUserId={ctx.userId} />
    </>
  );
}
