import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { mfaEnforced } from "@/lib/mfa";
import { auth } from "@/lib/auth";
import { SairParaLogin } from "@/components/app/sair-para-login";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { can, screenIdOfPath } from "@/lib/permissions";
import { isR2Configured, readUrl } from "@/lib/storage/r2";
import { AppShell } from "@/components/app/app-shell";
import { AccessDenied } from "@/components/app/access-denied";
import { Suspense } from "react";
import { ChatAssistente } from "@/components/app/chat-assistente";
import { CrisProvider } from "@/components/app/cris-contexto";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getTenantContext();

  // Há login, mas não há contexto: sessão encerrada por troca de senha (AI
  // 1.3) ou vínculo removido. Antes caía na tela "Banco vazio", que manda rodar
  // o seed — mensagem de instalação para um problema de acesso.
  if (!ctx && (await auth())?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-md">
          <h1 className="font-[family-name:var(--font-serif)] text-2xl">
            Sua sessão foi encerrada
          </h1>
          <p className="mt-2 text-sm text-[var(--color-ink3)]">
            A senha desta conta foi trocada ou o seu acesso a esta empresa
            mudou. Entre de novo para continuar.
          </p>
          <SairParaLogin />
        </div>
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-md">
          <h1 className="font-[family-name:var(--font-serif)] text-2xl">
            Banco vazio
          </h1>
          <p className="mt-2 text-sm text-[var(--color-ink3)]">
            Nenhum tenant encontrado. As migrações rodam no deploy; para popular
            o tenant de demonstração, rode no terminal do container:
          </p>
          <pre className="mt-3 rounded-[8px] bg-[var(--color-ink)] p-3 text-left text-xs text-white">
            node seed.mjs
          </pre>
          <Link
            href="/"
            className="mt-4 inline-block text-sm text-[var(--color-accent2)] hover:underline"
          >
            ← voltar
          </Link>
        </div>
      </div>
    );
  }

  const logoUrl =
    ctx.tenant.logoKey && isR2Configured()
      ? await readUrl(ctx.tenant.logoKey)
      : null;

  const [me] = ctx.userId
    ? await db
        .select({
          name: schema.users.name,
          email: schema.users.email,
          mfaEnabled: schema.users.mfaEnabled,
          mustChangePassword: schema.users.mustChangePassword,
        })
        .from(schema.users)
        .where(eq(schema.users.id, ctx.userId))
        .limit(1)
    : [];

  // MFA obrigatório (quando exigido por env): força o enrollment se não ativo.
  // Em standby (fase de testes), não redireciona.
  if (mfaEnforced() && me && !me.mfaEnabled) redirect("/mfa");
  // Senha definida por outra pessoa: troca antes de qualquer tela (AI 1.2).
  if (me?.mustChangePassword) redirect("/trocar-senha");

  const userName = me?.name || me?.email || "Usuário";

  // Enforcement central de "Ver": mapeia a rota atual para a tela governada.
  const pathname = (await headers()).get("x-pathname");
  const screenId = screenIdOfPath(pathname);
  const denied = screenId ? !can(ctx.perms, screenId, "ver") : false;

  // Prompt PLAT (revisão V5): o aviso de backup semestral saiu do app do
  // cliente. O backup é operado pela plataforma.

  return (
    <AppShell
      tenantName={ctx.tenant.name}
      logoUrl={logoUrl}
      userName={userName}
      userRole={ctx.role}
      perms={ctx.perms}
    >
      {/* Prompt E2 — a Cris sabe a tela aberta: o provedor envolve o conteúdo e o chat.
          Sem <Suspense> em volta do conteúdo (GA-11): toda rota de (app) é dinâmica (este
          layout lê headers()), então o useSearchParams do provedor não precisa de fronteira; e,
          com ela, o conteúdo da página ficava numa fronteira desidratada que travava navegação
          e router.refresh() em telas grandes (a Conciliação de Caixa) no build de produção. */}
      <>
        <CrisProvider>
          {/* Conteúdo em largura total da tela (antes: max-w-6xl, ~1150px, encaixotado em monitor largo). */}
          <div className="w-full px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
            {denied ? <AccessDenied /> : children}
          </div>
          {/* Prompt E2 — a Cris, em qualquer tela. */}
          <Suspense fallback={null}>
            <ChatAssistente />
          </Suspense>
        </CrisProvider>
      </>
    </AppShell>
  );
}
