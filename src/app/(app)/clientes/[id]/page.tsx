import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, getTableColumns } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { updateCliente, deleteCliente, uploadClienteDoc } from "@/lib/actions/clientes";
import { FormComResultado } from "@/components/app/form-com-resultado";
import { vinculosDoCliente } from "@/lib/clientes-vinculos";
import { bloqueiosDeExclusao, LIMITE_UPLOAD_MB } from "@/lib/clientes-regras";
import { brl } from "@/lib/utils";
import { ROTULO_STATUS_CONTRATO, type StatusContrato } from "@/lib/contrato-regras";
import { isR2Configured, readUrl } from "@/lib/storage/r2";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { ClienteFields } from "@/components/app/cliente-fields";
import { AccessDenied } from "@/components/app/access-denied";
import {
  CAMPOS_SENSIVEIS_CLIENTE,
  TELA_DADOS_CLIENTE,
  mascararDocumento,
} from "@/lib/clientes-sensivel";

export const dynamic = "force-dynamic";

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // A página verifica "ver" antes de consultar qualquer dado (Prompt M, 2.2).
  // A guarda do layout não basta: ele renderiza em paralelo com a página e
  // não roda de novo na navegação dentro do app.
  if (!can(ctx.perms, "clientes", "ver")) return <AccessDenied />;
  const { id } = await params;

  // Quem não tem a permissão de dados não RECEBE os campos sensíveis nem o
  // CPF completo: a consulta nem os seleciona (Prompt M, 5.4).
  const veDados = can(ctx.perms, TELA_DADOS_CLIENTE, "ver");
  const editaDados = can(ctx.perms, TELA_DADOS_CLIENTE, "editar");
  const colunas: Record<string, unknown> = { ...getTableColumns(schema.clientes) };
  if (!veDados) for (const k of [...CAMPOS_SENSIVEIS_CLIENTE, "cpfCnpj"]) delete colunas[k];
  const [cliente] = await db
    .select(colunas as ReturnType<typeof getTableColumns<typeof schema.clientes>>)
    .from(schema.clientes)
    .where(and(eq(schema.clientes.id, id), eq(schema.clientes.tenantId, ctx.tenant.id)))
    .limit(1);
  if (!cliente) notFound();
  // O CPF mascarado é calculado aqui e só ele vai para a tela.
  const cpfMascarado = veDados
    ? null
    : mascararDocumento(
        (
          await db
            .select({ cpf: schema.clientes.cpfCnpj })
            .from(schema.clientes)
            .where(and(eq(schema.clientes.id, id), eq(schema.clientes.tenantId, ctx.tenant.id)))
            .limit(1)
        )[0]?.cpf,
      );

  const canEditar = can(ctx.perms, "clientes", "editar");
  const canExcluir = can(ctx.perms, "clientes", "excluir");
  // O que hoje impediria a exclusão (6.1.1) — a tela diz antes de o usuário tentar.
  const bloqueiosExclusao = canExcluir
    ? bloqueiosDeExclusao(await vinculosDoCliente(db, ctx.tenant.id, cliente))
    : [];
  // Histórico do contratante: os contratos de serviço dele (mais recentes primeiro).
  const contratosDoCliente = await db
    .select({
      id: schema.contratos.id,
      codigo: schema.contratos.codigo,
      titulo: schema.contratos.titulo,
      status: schema.contratos.status,
      valorOriginal: schema.contratos.valorOriginal,
      dataInicio: schema.contratos.dataInicio,
    })
    .from(schema.contratos)
    .where(and(eq(schema.contratos.clienteId, cliente.id), eq(schema.contratos.tenantId, ctx.tenant.id)))
    .orderBy(desc(schema.contratos.createdAt));

  // Documentos do contratante (mais recentes primeiro).
  const r2 = isR2Configured();
  const docsRaw = await db
    .select()
    .from(schema.documents)
    .where(and(eq(schema.documents.clienteId, cliente.id), eq(schema.documents.tenantId, ctx.tenant.id)))
    .orderBy(desc(schema.documents.uploadedAt));
  const docs = r2
    ? await Promise.all(docsRaw.map(async (d) => ({ ...d, url: await readUrl(d.storageKey) })))
    : docsRaw.map((d) => ({ ...d, url: null as string | null }));

  return (
    <>
      <PageHeader
        eyebrow={ctx.tenant.name}
        title={`Cliente: ${cliente.nomeCompleto}`}
        subtitle={cliente.nomeFantasia ?? undefined}
      />
      <Card>
        <CardContent className="p-5">
          <FormComResultado action={updateCliente} aoConcluir="/clientes" className="space-y-6">
            <input type="hidden" name="id" value={cliente.id} />
            <ClienteFields
              cliente={cliente}
              veDados={veDados}
              editaDados={editaDados}
              cpfMascarado={cpfMascarado}
            />
            {canEditar && (
              <div className="flex items-center gap-2">
                <Button type="submit">Salvar alterações</Button>
                <Link href="/clientes" className={buttonVariants({ variant: "ghost" })}>
                  Voltar
                </Link>
              </div>
            )}
          </FormComResultado>
        </CardContent>
      </Card>

      {/* Histórico: contratos de serviço do contratante */}
      <Card className="mt-6">
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Contratos deste cliente</h2>
          {contratosDoCliente.length === 0 ? (
            <p className="text-[13px] text-[var(--color-ink4)]">
              Nenhum contrato cadastrado para este cliente.{" "}
              <Link href="/contratos" className="text-[var(--color-accent2)] hover:underline">Abrir Contratos</Link>
            </p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Código</TH>
                  <TH>Contrato</TH>
                  <TH>Situação</TH>
                  <TH>Início</TH>
                  <TH className="text-right">Valor original</TH>
                </tr>
              </THead>
              <tbody>
                {contratosDoCliente.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-[family-name:var(--font-mono)]">
                      <Link href={`/contratos/${c.id}`} className="text-[var(--color-accent2)] hover:underline">{c.codigo}</Link>
                    </TD>
                    <TD className="text-[var(--color-ink)]">{c.titulo}</TD>
                    <TD className="text-[var(--color-ink2)]">{ROTULO_STATUS_CONTRATO[c.status as StatusContrato] ?? c.status}</TD>
                    <TD className="font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">{c.dataInicio ?? "—"}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)]">{brl(Number(c.valorOriginal))}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Documentos do contratante */}
      <Card className="mt-6">
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">
            Documentos do cliente
          </h2>
          {!r2 ? (
            <p className="text-[13px] text-[var(--color-ink3)]">
              Configure as variáveis R2_* para habilitar o upload de documentos.
            </p>
          ) : (
            canEditar && (
              <FormComResultado
                action={uploadClienteDoc}
                aoConcluir="recarregar"
                sucesso="Documento enviado."
                className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3"
              >
                <input type="hidden" name="clienteId" value={cliente.id} />
                <div>
                  <Label>Tipo</Label>
                  {/* Tipo obrigatório (6.9.1). */}
                  <Select name="tipo" defaultValue="" required>
                    <option value="" disabled>
                      — escolha —
                    </option>
                    {["Contrato assinado", "Proposta", "Documentos do contratante", "Comprovante", "Termo aditivo", "Distrato", "Outros"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Arquivo (até {LIMITE_UPLOAD_MB} MB)</Label>
                  <Input type="file" name="file" required />
                </div>
                <div className="flex items-end">
                  <Button type="submit">Enviar documento</Button>
                </div>
                {/* 6.9.2 — como a versão funciona, dito na tela. */}
                <p className="text-[12px] text-[var(--color-ink3)] sm:col-span-3">
                  Outro arquivo do mesmo tipo vira a versão seguinte e a anterior fica
                  guardada; cada tipo tem numeração própria.
                </p>
              </FormComResultado>
            )
          )}

          {docs.length > 0 && (
            <Table>
              <THead>
                <tr>
                  <TH>Arquivo</TH>
                  <TH>Tipo</TH>
                  <TH className="text-right">Versão</TH>
                  <TH>Enviado por</TH>
                  <TH>Enviado em</TH>
                  <TH></TH>
                </tr>
              </THead>
              <tbody>
                {docs.map((d) => (
                  <TR key={d.id}>
                    <TD className="font-medium text-[var(--color-ink)]">{d.filename}</TD>
                    <TD className="text-[var(--color-ink2)]">{d.tipo ?? "—"}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">v{d.versao}</TD>
                    <TD className="text-[var(--color-ink3)]">{d.uploadedBy ?? "—"}</TD>
                    <TD className="font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">
                      {d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString("pt-BR") : "—"}
                    </TD>
                    <TD className="text-right">
                      {d.url ? (
                        <a href={d.url} target="_blank" rel="noopener" className="text-sm text-[var(--color-accent2)] hover:underline">
                          abrir
                        </a>
                      ) : (
                        <span className="text-[var(--color-ink4)]">—</span>
                      )}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
          {docs.length === 0 && r2 && (
            <p className="text-[13px] text-[var(--color-ink4)]">Nenhum documento anexado.</p>
          )}
        </CardContent>
      </Card>

      {/* 6.1.1 — exclusão no rodapé, separada do Salvar, com o que ela exige. */}
      {canExcluir && (
        <Card className="mt-6 border-[var(--color-danger)]/25">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">Excluir cliente</h2>
            <p className="mt-1 text-[12.5px] text-[var(--color-ink3)]">
              Apaga o cadastro. Exige digitar o nome do cliente e não é permitida enquanto houver
              contas a receber, documentos, projeto ou recebimento por terceiro vinculados (e, nos
              cadastros antigos, unidade com contrato de venda ativo).
            </p>
            {bloqueiosExclusao.length > 0 ? (
              <p className="mt-3 text-[13px] text-[var(--color-warning)]">
                Hoje bloqueado por: {bloqueiosExclusao.join("; ")}.
              </p>
            ) : (
              <FormComResultado
                action={deleteCliente}
                aoConcluir="/clientes"
                sucesso="Cliente excluído."
                className="mt-3 flex flex-wrap items-end gap-2"
              >
                <input type="hidden" name="id" value={cliente.id} />
                <div className="min-w-[260px] flex-1">
                  <Label>Digite o nome do cliente para confirmar</Label>
                  <Input name="confirmacao" placeholder={cliente.nomeCompleto} autoComplete="off" />
                </div>
                <Button type="submit" variant="outline">
                  Excluir definitivamente
                </Button>
              </FormComResultado>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
