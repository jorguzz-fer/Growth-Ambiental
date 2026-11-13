import Link from "next/link";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { getNotasParaAnalise, getNotasServico } from "@/lib/queries";
import { ROTULO_DA_SITUACAO, ROTULO_DO_AMBIENTE, SITUACOES_DA_NOTA, emitenteDoTenant, obraFiscalDoProjeto, recusaDoTenant, type SituacaoDaNota } from "@/lib/nota-servico";
import { analisarNotas } from "@/lib/nota-servico-analise";
import { AssistenteNotas } from "@/components/app/assistente-notas";
import { resolverAmbiente } from "@/lib/fiscal/focus";
import { brl } from "@/lib/utils";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

export const dynamic = "force-dynamic";

const TOM: Record<SituacaoDaNota, "neutral" | "info" | "success" | "danger" | "warning"> = {
  rascunho: "neutral",
  processando: "info",
  autorizada: "success",
  rejeitada: "danger",
  cancelada: "warning",
};

/**
 * Prompt AG, 5.1/5.2 — Notas Fiscais EMITIDAS (NFS-e de serviço). A nota
 * recebida de fornecedor continua em Despesas. Homologação e produção ficam
 * separadas pelo filtro, e a nota de homologação vem marcada em toda linha.
 */
export default async function NotasFiscaisPage({
  searchParams,
}: {
  searchParams: Promise<{ amb?: string; st?: string; proj?: string; de?: string; ate?: string }>;
}) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "notasfiscais", "ver")) return <AccessDenied />;
  const sp = await searchParams;
  const ambiente = sp.amb === "producao" || sp.amb === "homologacao" ? sp.amb : resolverAmbiente(ctx.tenant.fiscalAmbiente);
  const status = SITUACOES_DA_NOTA.includes(sp.st as SituacaoDaNota) ? (sp.st as string) : null;
  const projectId = ctx.projects.some((p) => p.id === sp.proj) ? sp.proj! : null;
  const de = /^\d{4}-\d{2}-\d{2}$/.test(sp.de ?? "") ? sp.de! : null;
  const ate = /^\d{4}-\d{2}-\d{2}$/.test(sp.ate ?? "") ? sp.ate! : null;
  const notas = await getNotasServico(
    ctx.tenant.id,
    ctx.projects.map((p) => p.id),
    { ambiente, status, projectId, de, ate },
  );
  const recusa = recusaDoTenant(ctx.tenant.id, process.env.NFSE_TENANT_ID);
  // Seção 6 — o assistente olha as notas EM ABERTO do ambiente escolhido, sem os filtros da tabela.
  const analise = analisarNotas(await getNotasParaAnalise(ctx.tenant.id, ctx.projects.map((p) => p.id), ambiente), {
    emitente: emitenteDoTenant(ctx.tenant),
    obras: new Map(ctx.projects.map((p) => [p.id, obraFiscalDoProjeto(p)])),
  });
  const homolog = ambiente === "homologacao";
  const link = (o: Record<string, string | null>) => {
    const q = new URLSearchParams();
    for (const [k, val] of Object.entries({ amb: ambiente, st: status, proj: projectId, de, ate, ...o })) if (val) q.set(k, val);
    return `/notasfiscais?${q.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Notas Fiscais"
        subtitle="NFS-e de serviço emitidas pela empresa · as notas recebidas de fornecedor ficam em Despesas"
        actions={
          can(ctx.perms, "notasfiscais", "criar") ? (
            <Link href="/notasfiscais/nova" className="rounded-[8px] bg-[var(--color-accent2)] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90">
              Nova nota
            </Link>
          ) : undefined
        }
      />
      <p className="mb-4 max-w-4xl text-[12.5px] text-[var(--color-ink3)]">
        A nota é o documento do serviço: <strong>não</strong> cria receita, conta a receber nem lançamento de caixa, e não muda nenhum
        relatório. Pode apontar para a conta a receber já lançada, só como referência.
        {recusa ? ` ${recusa}` : ""}
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px]" data-filtros>
        {(["producao", "homologacao"] as const).map((a) => (
          <Link
            key={a}
            href={link({ amb: a })}
            className={`rounded-full border px-3 py-1 ${ambiente === a ? "border-[var(--color-accent2)] font-semibold text-[var(--color-ink)]" : "border-[var(--color-line)] text-[var(--color-ink3)]"}`}
          >
            {ROTULO_DO_AMBIENTE[a]}
          </Link>
        ))}
        <span className="mx-1 text-[var(--color-ink4)]">|</span>
        <Link href={link({ st: null })} className={!status ? "font-semibold" : "text-[var(--color-ink3)]"}>
          Todas
        </Link>
        {SITUACOES_DA_NOTA.map((st) => (
          <Link key={st} href={link({ st })} className={status === st ? "font-semibold" : "text-[var(--color-ink3)]"}>
            {ROTULO_DA_SITUACAO[st]}
          </Link>
        ))}
        <form className="ml-auto flex flex-wrap items-center gap-2" action="/notasfiscais">
          <input type="hidden" name="amb" value={ambiente} />
          {status && <input type="hidden" name="st" value={status} />}
          <select name="proj" defaultValue={projectId ?? ""} className="h-8 rounded-[8px] border border-[var(--color-line)] bg-transparent px-2 text-[12.5px]">
            <option value="">Todos os projetos</option>
            {ctx.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input type="date" name="de" defaultValue={de ?? ""} className="h-8 rounded-[8px] border border-[var(--color-line)] bg-transparent px-2 text-[12.5px]" aria-label="Criadas de" />
          <input type="date" name="ate" defaultValue={ate ?? ""} className="h-8 rounded-[8px] border border-[var(--color-line)] bg-transparent px-2 text-[12.5px]" aria-label="Criadas até" />
          <button type="submit" className="h-8 rounded-[8px] border border-[var(--color-line)] px-3 text-[12.5px]">
            Filtrar
          </button>
        </form>
      </div>
      <div className="flex flex-col gap-6 min-[1180px]:flex-row min-[1180px]:items-start">
      <div className="min-w-0 flex-1">
      {homolog && (
        <p className="mb-3 rounded-[8px] bg-[var(--color-warning)]/12 px-3 py-2 text-[12.5px] text-[var(--color-ink2)]" data-aviso-homologacao>
          Homologação: notas de teste, <strong>sem valor fiscal</strong>. Não contam em nenhum relatório, total ou exportação.
        </p>
      )}
      <Card>
        <CardContent className="p-0">
          <Table aria-label="Notas fiscais emitidas">
            <THead>
              <tr>
                <TH>Data</TH>
                <TH>Número</TH>
                <TH>Tomador</TH>
                <TH>Projeto</TH>
                <TH>Competência</TH>
                <TH className="text-right">Valor do serviço</TH>
                <TH className="text-right">Líquido</TH>
                <TH>Situação</TH>
              </tr>
            </THead>
            <tbody>
              {notas.map((n) => (
                <TR key={n.id}>
                  <TD className="text-[12.5px]">{(n.autorizadaEm ?? n.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</TD>
                  <TD>
                    <Link href={`/notasfiscais/${n.id}`} className="text-[var(--color-accent2)] hover:underline">
                      {n.numero ?? "—"}
                    </Link>
                  </TD>
                  <TD>{n.tomadorNome ?? "—"}</TD>
                  <TD>{n.projeto}</TD>
                  <TD>{n.competencia ?? "—"}</TD>
                  <TD className="text-right tabular-nums">{brl(Number(n.valorServicos))}</TD>
                  <TD className="text-right tabular-nums">{n.valorLiquido == null ? "—" : brl(Number(n.valorLiquido))}</TD>
                  <TD>
                    <span className="flex flex-wrap gap-1">
                      <Badge tone={TOM[n.status as SituacaoDaNota] ?? "neutral"}>{ROTULO_DA_SITUACAO[n.status as SituacaoDaNota] ?? n.status}</Badge>
                      {n.ambiente !== "producao" && <Badge tone="warning">homologação</Badge>}
                    </span>
                  </TD>
                </TR>
              ))}
              {notas.length === 0 && (
                <TR>
                  <TD colSpan={8} className="py-8 text-center text-[var(--color-ink4)]">
                    Nenhuma nota {homolog ? "de homologação" : "de produção"} neste filtro.
                  </TD>
                </TR>
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>
      </div>
      <AssistenteNotas usuario={ctx.userEmail ?? "anon"} analise={analise} homologacao={homolog} />
      </div>
    </>
  );
}
