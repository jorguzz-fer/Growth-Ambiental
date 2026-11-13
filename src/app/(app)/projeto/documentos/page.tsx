import { and, desc, eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { db, schema } from "@/lib/db";
import { isR2Configured, readUrl } from "@/lib/storage/r2";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { Card, CardContent } from "@/components/ui/card";
import { casaBusca, origemDoDocumento, podeVerDocumento, ROTULO_ORIGEM, type OrigemDoDocumento } from "@/lib/documentos-busca";

export const dynamic = "force-dynamic";

const MAX = 200;

/**
 * Documentos de todos os módulos num lugar só, por cliente, projeto,
 * contrato, origem e texto. Cada documento só aparece para quem vê a tela de
 * origem (contratos, despesas, clientes…); de funcionário, só com a permissão
 * de dados pessoais. Arquivos e referências não mudam.
 */
export default async function DocumentosPage({ searchParams }: { searchParams: Promise<{ q?: string; origem?: string; proj?: string; contrato?: string; cliente?: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "projeto", "ver")) return <AccessDenied />;
  const sp = await searchParams;
  const visiveis = new Set(ctx.projects.map((p) => p.id));
  const [docs, contratos, clientes, versoes, despesasProj, contasProj] = await Promise.all([
    db.select().from(schema.documents).where(eq(schema.documents.tenantId, ctx.tenant.id)).orderBy(desc(schema.documents.uploadedAt)).limit(5000),
    db.select({ id: schema.contratos.id, codigo: schema.contratos.codigo, titulo: schema.contratos.titulo, clienteId: schema.contratos.clienteId }).from(schema.contratos).where(eq(schema.contratos.tenantId, ctx.tenant.id)),
    can(ctx.perms, "clientes", "ver") ? db.select({ id: schema.clientes.id, nome: schema.clientes.nomeCompleto }).from(schema.clientes).where(eq(schema.clientes.tenantId, ctx.tenant.id)) : Promise.resolve([]),
    db.select({ id: schema.versions.id, projectId: schema.versions.projectId }).from(schema.versions).where(eq(schema.versions.tenantId, ctx.tenant.id)),
    db.select({ id: schema.despesas.id, versionId: schema.despesas.versionId, contratoId: schema.despesas.contratoId }).from(schema.despesas).where(eq(schema.despesas.tenantId, ctx.tenant.id)),
    db.select({ id: schema.contasReceber.id, projectId: schema.contasReceber.projectId, contratoId: schema.contasReceber.contratoId, clienteId: schema.contasReceber.clienteId }).from(schema.contasReceber).where(and(eq(schema.contasReceber.tenantId, ctx.tenant.id))),
  ]);
  const projetoDaVersao = new Map(versoes.map((v) => [v.id, v.projectId]));
  const despesaPor = new Map(despesasProj.map((d) => [d.id, { projectId: projetoDaVersao.get(d.versionId) ?? null, contratoId: d.contratoId }]));
  const contaPor = new Map(contasProj.map((c) => [c.id, c]));
  const contratoPor = new Map(contratos.map((c) => [c.id, c]));
  const nomeCliente = new Map(clientes.map((c) => [c.id, c.nome]));
  const nomeProjeto = new Map(ctx.projects.map((p) => [p.id, p.name]));
  // Projeto, contrato e cliente de cada documento (pelo próprio vínculo ou pelo registro a que pertence).
  const linhas = docs
    .filter((d) => podeVerDocumento(ctx.perms, d))
    .map((d) => {
      const desp = d.despesaId ? despesaPor.get(d.despesaId) : undefined;
      const conta = d.contaReceberId ? contaPor.get(d.contaReceberId) : undefined;
      const projectId = d.projectId ?? desp?.projectId ?? conta?.projectId ?? null;
      const contratoId = d.contratoId ?? desp?.contratoId ?? conta?.contratoId ?? null;
      const clienteId = d.clienteId ?? conta?.clienteId ?? (contratoId ? contratoPor.get(contratoId)?.clienteId ?? null : null);
      return { d, origem: origemDoDocumento(d) as OrigemDoDocumento, projectId, contratoId, clienteId };
    })
    // projeto que a pessoa não vê fica fora
    .filter((x) => !x.projectId || visiveis.has(x.projectId))
    .filter((x) => !sp.origem || x.origem === sp.origem)
    .filter((x) => !sp.proj || x.projectId === sp.proj)
    .filter((x) => !sp.contrato || x.contratoId === sp.contrato)
    .filter((x) => !sp.cliente || x.clienteId === sp.cliente)
    .filter((x) => casaBusca(sp.q ?? "", [x.d.filename, x.d.tipo, x.d.numeroDocumentoFiscal]));
  const r2 = isR2Configured();
  const mostrados = await Promise.all(linhas.slice(0, MAX).map(async (x) => ({ ...x, url: r2 ? await readUrl(x.d.storageKey).catch(() => null) : null })));
  const origens = Object.keys(ROTULO_ORIGEM) as OrigemDoDocumento[];
  const campo = "h-9 rounded-[8px] border border-[var(--color-line)] bg-white px-2 text-[12.5px]";
  return (
    <>
      <PageHeader eyebrow="Projetos" title="Documentos" subtitle={`${linhas.length} documento(s) que o seu acesso permite ver${linhas.length > MAX ? ` · mostrando os ${MAX} mais recentes` : ""}`} />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-2 text-[12.5px]">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Nome, tipo ou nº fiscal" className={`${campo} w-56`} aria-label="Buscar" />
        <select name="origem" defaultValue={sp.origem ?? ""} className={campo} aria-label="Origem">
          <option value="">Todas as origens</option>
          {origens.map((o) => (
            <option key={o} value={o}>
              {ROTULO_ORIGEM[o]}
            </option>
          ))}
        </select>
        <select name="proj" defaultValue={sp.proj ?? ""} className={campo} aria-label="Projeto">
          <option value="">Todos os projetos</option>
          {ctx.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {can(ctx.perms, "contratos", "ver") && (
          <select name="contrato" defaultValue={sp.contrato ?? ""} className={campo} aria-label="Contrato">
            <option value="">Todos os contratos</option>
            {contratos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} · {c.titulo}
              </option>
            ))}
          </select>
        )}
        {clientes.length > 0 && (
          <select name="cliente" defaultValue={sp.cliente ?? ""} className={campo} aria-label="Cliente">
            <option value="">Todos os clientes</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        )}
        <button className="h-9 rounded-[8px] bg-[var(--color-accent)] px-3 text-white">Buscar</button>
      </form>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]" data-documentos>
              <thead className="bg-[var(--color-surface2)] text-left text-[10.5px] uppercase tracking-wide text-[var(--color-ink3)]">
                <tr>
                  <th className="px-3 py-2">Arquivo</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Origem</th>
                  <th className="px-3 py-2">Projeto</th>
                  <th className="px-3 py-2">Contrato</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Enviado em</th>
                </tr>
              </thead>
              <tbody>
                {mostrados.map((x) => (
                  <tr key={x.d.id} className="border-t border-[var(--color-line)]">
                    <td className="px-3 py-2">
                      {x.url ? (
                        <a href={x.url} target="_blank" rel="noopener" className="text-[var(--color-accent2)] hover:underline">
                          {x.d.filename}
                        </a>
                      ) : (
                        x.d.filename
                      )}
                      {x.d.versao > 1 && <span className="ml-1 text-[11px] text-[var(--color-ink3)]">v{x.d.versao}</span>}
                    </td>
                    <td className="px-3 py-2">{x.d.tipo ?? "—"}</td>
                    <td className="px-3 py-2">{ROTULO_ORIGEM[x.origem]}</td>
                    <td className="px-3 py-2">{x.projectId ? nomeProjeto.get(x.projectId) ?? "—" : "—"}</td>
                    <td className="px-3 py-2">{x.contratoId ? contratoPor.get(x.contratoId)?.codigo ?? "—" : "—"}</td>
                    <td className="px-3 py-2">{x.clienteId ? nomeCliente.get(x.clienteId) ?? "—" : "—"}</td>
                    <td className="px-3 py-2 font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">{x.d.uploadedAt.toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
                {mostrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-[var(--color-ink3)]">
                      Nenhum documento encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      {!r2 && <p className="mt-2 text-[12px] text-[var(--color-ink3)]">Armazenamento de arquivos não configurado (R2): a lista aparece, mas sem link para abrir.</p>}
    </>
  );
}
