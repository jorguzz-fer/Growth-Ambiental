# Tela Acesso Contabilidade — coleta antes da remoção (Prompt AL, BAL-1)

Coleta feita em 01/10/2026, sobre o `main` depois do PR #217. **Nada foi
alterado para gerar este arquivo.** É cópia do código, sem resumo.

## 1. A página — `src/app/(app)/contabilidade/page.tsx`

```tsx
import { getProjectVersions, getTenantContext } from "@/lib/context";
import { lerSelecaoDeProjeto } from "@/lib/projeto-selecao";
import { ProjectPicker } from "@/components/app/project-picker";
import { LembrarProjeto, RecuperarProjeto } from "@/components/app/projeto-da-aba";
import { getDespesas, getMembers, getMonthlyRevenue } from "@/lib/queries";
import { inviteContador } from "@/lib/actions/users";
import { brl0 } from "@/lib/utils";
import { FormComResultado } from "@/components/app/form-com-resultado";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { can } from "@/lib/permissions";
import { AccessDenied } from "@/components/app/access-denied";

export const dynamic = "force-dynamic";

export default async function ContabilidadePage({
  searchParams,
}: {
  searchParams: Promise<{ proj?: string; project?: string }>;
}) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // A página verifica "ver" antes de consultar qualquer dado (Prompt M, 2.2).
  // A guarda do layout não basta: ele renderiza em paralelo com a página e
  // não roda de novo na navegação dentro do app.
  if (!can(ctx.perms, "contabilidade", "ver")) return <AccessDenied />;

  // Os três números são de UMA obra, escolhida aqui (Prompt A) — não mais a
  // do cookie. Sem obra: a aba reabre a última; senão, a tela pede a escolha
  // só para o bloco de números (o convite de contador é da empresa).
  const selecao = lerSelecaoDeProjeto(ctx.projects, await searchParams);
  const escolhido =
    selecao.tipo === "projeto" ? await getProjectVersions(ctx.tenant.id, selecao.projeto.id) : null;
  const obra = escolhido?.trabalho ? escolhido.project : null;
  const versao = escolhido?.trabalho ?? null;
  const [despesas, revenue, members] = await Promise.all([
    versao ? getDespesas(versao.id) : Promise.resolve([]),
    versao && obra ? getMonthlyRevenue(versao.id, obra.id) : Promise.resolve({} as Record<string, number>),
    getMembers(ctx.tenant.id),
  ]);
  const receita = Object.values(revenue).reduce((a, b) => a + b, 0);
  const totalDespesas = despesas.reduce((a, d) => a + Number(d.valor), 0);
  const resultado = receita - totalDespesas;
  const contadores = members.filter((m) => m.role === "contador");
  const podeGerir = ctx.role === "owner" || ctx.role === "admin";

  return (
    <>
      <PageHeader
        title="Acesso Contabilidade"
        subtitle="Visão somente-leitura de balancetes e demonstrativos"
        actions={
          <ProjectPicker
            projects={ctx.projects.map((p) => ({ id: p.id, label: p.name }))}
            selected={obra?.id ?? ""}
          />
        }
      />
      {obra ? (
        <LembrarProjeto projectId={obra.id} />
      ) : (
        <RecuperarProjeto idsPermitidos={ctx.projects.map((p) => p.id)}>
          <Card className="mb-6">
            <CardContent className="p-6 text-center text-[var(--color-ink3)]">
              Selecione um projeto para ver receita, despesas e resultado.
            </CardContent>
          </Card>
        </RecuperarProjeto>
      )}

      {/* Prompt M, 4 — os três números são de UM projeto e UMA versão, não da
          empresa. A tela diz quais; a obra é escolhida no seletor (Prompt A). */}
      {obra && versao && (
      <>
      <p className="mb-2 text-xs text-[var(--color-ink3)]">
        Projeto <strong className="text-[var(--color-ink2)]">{obra.name}</strong> · versão{" "}
        <strong className="text-[var(--color-ink2)]">{versao.label}</strong> — não é o
        consolidado da empresa.
      </p>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
              Receita projetada
            </p>
            <p className="mt-2 text-xl font-semibold">{brl0(receita)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
              Despesas lançadas
            </p>
            <p className="mt-2 text-xl font-semibold">{brl0(totalDespesas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
              Resultado
            </p>
            <p
              className={`mt-2 text-xl font-semibold ${
                resultado >= 0
                  ? "text-[var(--color-success)]"
                  : "text-[var(--color-danger)]"
              }`}
            >
              {brl0(resultado)}
            </p>
          </CardContent>
        </Card>
      </div>
      </>
      )}

      {podeGerir && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">
              Convidar escritório contábil
            </h2>
            <FormComResultado
              action={inviteContador}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3"
              sucesso="Convite registrado."
              aoConcluir="recarregar"
            >
              <div>
                <Label>Nome</Label>
                <Input name="name" placeholder="Escritório Contábil" />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input name="email" type="email" required />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full">
                  Convidar (somente leitura)
                </Button>
              </div>
            </FormComResultado>
          </CardContent>
        </Card>
      )}

      <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">
        Contadores com acesso
      </h2>
      <Table>
        <THead>
          <tr>
            <TH>Nome</TH>
            <TH>E-mail</TH>
            <TH>Acesso</TH>
          </tr>
        </THead>
        <tbody>
          {contadores.map((m) => (
            <TR key={m.userId}>
              <TD className="font-medium text-[var(--color-ink)]">
                {m.name ?? "—"}
              </TD>
              <TD className="font-[family-name:var(--font-mono)]">
                {m.email ?? "—"}
              </TD>
              <TD>
                <Badge tone="warning">somente leitura</Badge>
              </TD>
            </TR>
          ))}
          {contadores.length === 0 && (
            <TR>
              <TD colSpan={3} className="py-6 text-center text-[var(--color-ink3)]">
                Nenhum contador convidado ainda.
              </TD>
            </TR>
          )}
        </tbody>
      </Table>
    </>
  );
}
```

## 2. Componentes que a página importa

**Nenhum componente é exclusivo da tela.** Todos são compartilhados e ficam:

| Componente | Arquivo | Usado também em |
|---|---|---|
| `ProjectPicker` | `src/components/app/project-picker.tsx` | ~20 telas (DRE, Fluxo de Caixa, Medição…) |
| `LembrarProjeto`, `RecuperarProjeto` | `src/components/app/projeto-da-aba.tsx` | ~23 telas |
| `FormComResultado` | `src/components/app/form-com-resultado.tsx` | Usuários, Empresa e outras |
| `PageHeader`, `AccessDenied` | `src/components/app/` | todas as telas |
| `Card`, `Button`, `Input`, `Label`, `Badge`, `Table` | `src/components/ui/` | todas as telas |

Como nenhum é exclusivo, nenhum componente sai junto com a tela.

## 3. Server Actions da tela — `src/lib/actions/users.ts`

A tela usa uma action só: `inviteContador`. Ela é um atalho para a mesma
função interna `invite` que a tela Usuários usa por `inviteMember`. Trecho na
íntegra:

```ts
/**
 * Convida um membro para o tenant: garante o usuário (por e-mail) e cria o
 * vínculo com o papel. Sem envio de e-mail ainda — o registro fica pronto para
 * o fluxo de login do Auth.js. Apenas owner/admin podem convidar.
 */
async function invite(formData: FormData, fixedRole?: Role): Promise<ActionResult> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "usuarios", "criar")) return { ok: false, error: "Sem permissão." };

  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const name = (formData.get("name") as string) || null;
  const password = ((formData.get("password") as string) || "").trim();
  const pedido = formData.get("role");
  // Criação nunca entrega owner direto (AI 3.1/3.5): promoção é pela linha.
  const role: Role =
    fixedRole ?? (papelValido(pedido) && PAPEIS_CRIACAO.includes(pedido) ? pedido : "membro");
  if (!email) return { ok: false, error: "Informe o e-mail." };

  // Senha inicial é opcional; informada, precisa de 8 caracteres. Antes, uma
  // senha curta criava o usuário SEM senha, sem erro (AI 1.4).
  if (password.length > 0 && password.length < 8) {
    return { ok: false, error: "A senha inicial precisa de no mínimo 8 caracteres." };
  }
  const passwordHash = password.length >= 8 ? hashPassword(password) : undefined;
  // Senha definida por outra pessoa é provisória (AI 1.1).
  const provisoria = passwordHash
    ? { mustChangePassword: true, passwordChangedAt: new Date() }
    : {};

  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  const userId =
    existing?.id ??
    (
      await db
        .insert(schema.users)
        .values({ email, name, passwordHash, ...provisoria })
        .returning()
    )[0].id;

  // Usuário já existia e foi informada uma senha inicial → define a senha.
  if (existing && passwordHash) {
    await db
      .update(schema.users)
      .set({ passwordHash, ...provisoria })
      .where(eq(schema.users.id, userId));
  }

  await db
    .insert(schema.memberships)
    .values({ userId, tenantId: ctx.tenant.id, role })
    .onConflictDoUpdate({
      target: [schema.memberships.userId, schema.memberships.tenantId],
      set: { role },
    });

  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "membership.invite",
    entity: "membership",
    entityId: userId,
    meta: { email, role },
  });
  revalidatePath("/usuarios");
  revalidatePath("/contabilidade");
  return { ok: true };
}

export async function inviteMember(formData: FormData): Promise<ActionResult> {
  return invite(formData);
}

export async function inviteContador(formData: FormData): Promise<ActionResult> {
  return invite(formData, "contador");
}
```

A tela também lê dados com `getDespesas`, `getMonthlyRevenue` e `getMembers`
(`src/lib/queries.ts`), que são compartilhados com DRE, Despesas e Usuários.

## 4. Respostas

**a) O "Convidar" chama a mesma action de `/usuarios`?**
Chama `inviteContador`, que é `invite(formData, "contador")`. A tela Usuários
chama `inviteMember`, que é `invite(formData)` com o papel escolhido no
formulário. **É a mesma função**, só com o papel fixo.

**b) Envia e-mail? Define senha? Qual papel?**
- Não envia e-mail. Não existe envio de e-mail no sistema (Prompt AI).
- Não define senha: o formulário da tela não tem campo de senha, então o
  usuário novo nasce **sem senha** e não consegue entrar até alguém definir
  uma em Usuários.
- Cria com o papel `contador`. Se o e-mail já tiver vínculo nesta empresa,
  o papel do vínculo é **trocado** para `contador` (`onConflictDoUpdate`).
  Isso vale também para o convite de Usuários, e está anotado como limitação
  no relatório (não é desta tarefa mudar).

**c) De onde saem os três cards?**
```ts
const receita = Object.values(revenue).reduce((a, b) => a + b, 0);   // revenue = getMonthlyRevenue(versao.id, obra.id)
const totalDespesas = despesas.reduce((a, d) => a + Number(d.valor), 0); // despesas = getDespesas(versao.id)
const resultado = receita - totalDespesas;
```
São de UM projeto e da versão de trabalho (Atual) dele, sem filtro de período.

**d) A lista "Contadores com acesso" filtra por quê?**
`members.filter((m) => m.role === "contador")` — só por papel. Overrides não
entram no filtro.

**e) Alguma action daqui não existe em `/usuarios`?**
**Não.** A tela Usuários faz o mesmo convite escolhendo o papel "contador" no
seletor (o seletor lê `PAPEIS_CRIACAO`, que inclui `contador`), e ainda
permite senha inicial. A lista de contadores é um recorte da lista de
Usuários, que mostra o papel de cada um. Os três números existem na DRE.
**Nada precisa migrar antes da remoção.**

**f) Que permissão governa cada coisa?**
| O quê | Permissão |
|---|---|
| Abrir a tela | `can(ctx.perms, "contabilidade", "ver")` (página e guarda do layout) |
| Ver o formulário de convite | `ctx.role === "owner" \|\| ctx.role === "admin"` (papel, não matriz) |
| Executar `inviteContador` | `can(ctx.perms, "usuarios", "criar")` — a mesma de Usuários |

O id `contabilidade` está no módulo Config. Pelo padrão de hoje só owner e
admin o alcançam: o membro não vê Config, o contador não tem a tela na lista
dele e o engenheiro só vê Medição.
