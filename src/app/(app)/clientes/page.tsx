import Link from "next/link";
import { getTenantContext } from "@/lib/context";
import { getClientesPagina } from "@/lib/queries";
import { can } from "@/lib/permissions";
import { mascararDocumento } from "@/lib/clientes-sensivel";
import {
  CLIENTES_POR_PAGINA,
  STATUS_EM_BRANCO,
  lerFiltrosClientes,
  linkDaListagem,
  termosDaBusca,
} from "@/lib/clientes-regras";
import { PageHeader } from "@/components/app/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { AccessDenied } from "@/components/app/access-denied";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { CrisDaTela } from "@/components/app/cris-contexto";

export const dynamic = "force-dynamic";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // A página verifica "ver" antes de consultar qualquer dado (Prompt M, 2.2).
  // A guarda do layout não basta: ele renderiza em paralelo com a página e
  // não roda de novo na navegação dentro do app.
  if (!can(ctx.perms, "clientes", "ver")) return <AccessDenied />;
  // Busca e paginação (6.8), tudo na URL. Growth Ambiental: o filtro por
  // "status do contrato" era o da venda da unidade e saiu da tela; o status
  // dos contratos de serviço fica em Contratos.
  const filtros = lerFiltrosClientes(await searchParams);
  const { itens: clientes, total, totalGeral } = await getClientesPagina(ctx.tenant.id, {
    termos: termosDaBusca(filtros.q),
    status: filtros.status,
    pagina: filtros.pagina,
    porPagina: CLIENTES_POR_PAGINA,
    statusEmBranco: STATUS_EM_BRANCO,
  });
  // Nome fantasia e quantos contratos de serviço cada contratante da página tem.
  const ids = clientes.map((c) => c.id);
  const extras = new Map(
    (ids.length
      ? await db
          .select({
            id: schema.clientes.id,
            nomeFantasia: schema.clientes.nomeFantasia,
            contratos: sql<number>`(select count(*)::int from ${schema.contratos} where ${schema.contratos.clienteId} = ${schema.clientes.id})`,
          })
          .from(schema.clientes)
          .where(and(eq(schema.clientes.tenantId, ctx.tenant.id), inArray(schema.clientes.id, ids)))
      : []
    ).map((e) => [e.id, e]),
  );
  const paginas = Math.max(1, Math.ceil(total / CLIENTES_POR_PAGINA));
  const filtrando = !!filtros.q || !!filtros.status;
  const canCriar = can(ctx.perms, "clientes", "criar");
  const colunas = 6;
  const primeiro = total === 0 ? 0 : (filtros.pagina - 1) * CLIENTES_POR_PAGINA + 1;
  const ultimo = Math.min(total, filtros.pagina * CLIENTES_POR_PAGINA);

  return (
    <>
      <CrisDaTela
        titulo="Clientes (contratantes)"
        dados={{ clientesNaPagina: clientes.length, totalDeClientes: totalGeral }}
        sugestoes={["Quais clientes têm mais contratos ativos?", "Quem tem recebíveis em atraso?", "Qual cliente concentra mais receita?"]}
      />
      <PageHeader
        title="Clientes (Contratantes)"
        subtitle="Empresas, órgãos públicos e pessoas que contratam os serviços: dados cadastrais, contatos e contratos."
        actions={
          canCriar ? (
            <Link href="/clientes/novo" className={buttonVariants({ size: "sm" })}>
              + Novo cliente
            </Link>
          ) : undefined
        }
      />

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          name="q"
          defaultValue={filtros.q}
          placeholder="Buscar por razão social ou nome"
          aria-label="Buscar por razão social ou nome"
          className="max-w-[320px]"
        />
        <Button type="submit" size="sm" variant="outline">
          Filtrar
        </Button>
        {filtrando && (
          <Link href="/clientes" className={buttonVariants({ size: "sm", variant: "ghost" })}>
            Limpar
          </Link>
        )}
        <span className="ml-auto text-[13px] text-[var(--color-ink3)]">
          {filtrando
            ? `${total} de ${totalGeral} clientes cadastrados`
            : `${totalGeral} clientes cadastrados`}
        </span>
      </form>

      <Table>
        <THead>
          <tr>
            <TH>Razão social / nome</TH>
            <TH>Nome fantasia</TH>
            <TH>CNPJ/CPF</TH>
            <TH>Cidade/UF</TH>
            <TH className="text-right">Contratos</TH>
            <TH className="text-right">Ação</TH>
          </tr>
        </THead>
        <tbody>
          {clientes.length === 0 ? (
            <TR>
              <TD colSpan={colunas} className="py-8 text-center text-[var(--color-ink4)]">
                {total > 0 ? (
                  <Link href={linkDaListagem(filtros, { pagina: 1 })} className="text-[var(--color-accent2)] hover:underline">
                    Página sem resultados — voltar à primeira
                  </Link>
                ) : filtrando ? (
                  "Nenhum cliente encontrado com essa busca."
                ) : (
                  "Nenhum cliente cadastrado."
                )}
              </TD>
            </TR>
          ) : (
            clientes.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium text-[var(--color-ink)]">{c.nomeCompleto}</TD>
                <TD className="text-[var(--color-ink2)]">{extras.get(c.id)?.nomeFantasia ?? "—"}</TD>
                <TD className="font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">
                  {/* Mascarado na lista para todos (5.1); completo só na ficha, com permissão. */}
                  {mascararDocumento(c.cpfCnpj) ?? "—"}
                </TD>
                <TD>{c.cidadeEstado ?? "—"}</TD>
                <TD className="text-right font-[family-name:var(--font-mono)]">{extras.get(c.id)?.contratos ?? 0}</TD>
                <TD className="text-right">
                  <Link
                    href={`/clientes/${c.id}`}
                    className="text-sm text-[var(--color-accent2)] hover:underline"
                  >
                    Editar
                  </Link>
                </TD>
              </TR>
            ))
          )}
        </tbody>
      </Table>

      {total > CLIENTES_POR_PAGINA && (
        <nav
          aria-label="Paginação"
          className="mt-3 flex items-center justify-between text-[13px] text-[var(--color-ink3)]"
        >
          <span>
            {primeiro}–{ultimo} de {total}
          </span>
          <span className="flex items-center gap-2">
            {filtros.pagina > 1 ? (
              <Link
                href={linkDaListagem(filtros, { pagina: filtros.pagina - 1 })}
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                ← Anterior
              </Link>
            ) : null}
            <span>
              Página {Math.min(filtros.pagina, paginas)} de {paginas}
            </span>
            {filtros.pagina < paginas ? (
              <Link
                href={linkDaListagem(filtros, { pagina: filtros.pagina + 1 })}
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                Próxima →
              </Link>
            ) : null}
          </span>
        </nav>
      )}
    </>
  );
}
