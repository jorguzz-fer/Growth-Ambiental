import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { ExportarPdf } from "@/components/app/pdf";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { relatorioDeReembolsos } from "@/lib/contratos-queries";
import { ROTULO_STATUS_REEMBOLSO, type StatusReembolso } from "@/lib/contrato-regras";
import { dateBR } from "@/lib/utils";
import { Kpi, brl } from "@/components/app/contratos/visual";
import { reembolsosPorConta } from "@/lib/contrato-regras";

export const dynamic = "force-dynamic";

/** Relatório de despesas reembolsáveis por contrato e período, com exportação em PDF (impressão) e XLSX. */
export default async function ReembolsosPage({ searchParams }: { searchParams: Promise<{ contrato?: string; de?: string; ate?: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "contratos", "ver") || !can(ctx.perms, "contratosfinanceiro", "ver")) return <AccessDenied />;
  const sp = await searchParams;
  const contratos = await db.select({ id: schema.contratos.id, codigo: schema.contratos.codigo, titulo: schema.contratos.titulo }).from(schema.contratos).where(eq(schema.contratos.tenantId, ctx.tenant.id)).orderBy(schema.contratos.codigo);
  const contratoId = contratos.some((c) => c.id === sp.contrato) ? sp.contrato! : null;
  const filtro = { contratoId, de: sp.de ?? null, ate: sp.ate ?? null };
  const linhas = await relatorioDeReembolsos(ctx.tenant.id, filtro);
  const soma = (f: (l: (typeof linhas)[number]) => number) => linhas.reduce((s, l) => s + f(l), 0);
  const solicitado = soma((l) => (l.status === "pendente" ? 0 : l.solicitado));
  const aprovado = soma((l) => (["aprovado", "faturado", "recebido"].includes(l.status) ? l.aprovado ?? l.solicitado : 0));
  const recebido = soma((l) => l.recebido);
  const pendente = soma((l) => l.pendente);
  const contrato = contratos.find((c) => c.id === contratoId);
  // 0079 — por conta do Plano de Contas: o reembolso não muda a conta da despesa (nem vira receita).
  const nomes = new Map((await db.select({ code: schema.chartAccounts.code, name: schema.chartAccounts.name }).from(schema.chartAccounts).where(eq(schema.chartAccounts.tenantId, ctx.tenant.id))).map((c) => [c.code, c.name]));
  const porConta = reembolsosPorConta(linhas, nomes);
  const qs = new URLSearchParams(Object.entries({ contrato: contratoId ?? "", de: sp.de ?? "", ate: sp.ate ?? "" }).filter(([, v]) => v)).toString();
  return (
    <>
      <PageHeader
        eyebrow="Contratos"
        title="Relatório de Despesas Reembolsáveis"
        subtitle={`${contrato ? `${contrato.codigo} · ${contrato.titulo}` : "Todos os contratos"}${sp.de || sp.ate ? ` · competência ${sp.de ?? "…"} a ${sp.ate ?? "…"}` : ""}`}
        actions={
          <>
            <a href={`/contratos/reembolsos/exportar${qs ? `?${qs}` : ""}`} className="rounded-[8px] border border-[var(--color-accent2)]/20 px-3 py-1.5 text-[12px] hover:bg-[var(--color-surface3)]">
              Exportar XLSX
            </a>
            <ExportarPdf arquivo={`Reembolsos_${contrato?.codigo ?? "contratos"}`} />
          </>
        }
      />
      <form className="mb-4 flex flex-wrap items-end gap-2 print:hidden" method="get">
        <label className="text-[12px]">
          Contrato
          <select name="contrato" defaultValue={contratoId ?? ""} className="ml-1 h-9 rounded-[8px] border border-[var(--color-line)] px-2 text-[13px]">
            <option value="">Todos</option>
            {contratos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} · {c.titulo}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[12px]">
          De (MM/AAAA)
          <input name="de" defaultValue={sp.de ?? ""} placeholder="01/2027" className="ml-1 h-9 w-24 rounded-[8px] border border-[var(--color-line)] px-2 text-[13px]" />
        </label>
        <label className="text-[12px]">
          Até
          <input name="ate" defaultValue={sp.ate ?? ""} placeholder="12/2027" className="ml-1 h-9 w-24 rounded-[8px] border border-[var(--color-line)] px-2 text-[13px]" />
        </label>
        <button className="h-9 rounded-[8px] bg-[var(--color-accent)] px-3 text-[12.5px] text-white">Filtrar</button>
      </form>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi rotulo="Total solicitado" valor={brl(solicitado)} />
        <Kpi rotulo="Total aprovado" valor={brl(aprovado)} />
        <Kpi rotulo="Recebido" valor={brl(recebido)} />
        <Kpi rotulo="Saldo pendente" valor={brl(pendente)} tom={pendente > 0 ? "alerta" : undefined} />
      </div>
      <div className="overflow-x-auto rounded-[12px] border border-[var(--color-line)] bg-white">
        <table className="w-full text-[12px]">
          <thead className="bg-[var(--color-surface2)] text-left text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
            <tr>
              <th className="px-2 py-2">Contrato</th>
              <th className="px-2 py-2">Despesa</th>
              <th className="px-2 py-2">Data · competência</th>
              <th className="px-2 py-2">Descrição · fornecedor</th>
              <th className="px-2 py-2">Categoria</th>
              <th className="px-2 py-2 text-right">Solicitado</th>
              <th className="px-2 py-2 text-right">Aprovado</th>
              <th className="px-2 py-2 text-right">Recebido</th>
              <th className="px-2 py-2">Situação</th>
              <th className="px-2 py-2">Comprovantes</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr>
                <td colSpan={10} className="px-2 py-6 text-center text-[var(--color-ink3)]">
                  Nenhuma despesa reembolsável no filtro.
                </td>
              </tr>
            )}
            {linhas.map((l) => (
              <tr key={l.id} className="border-t border-[var(--color-line)]">
                <td className="px-2 py-1.5">{l.contrato}</td>
                <td className="px-2 py-1.5">{l.numDoc ?? "—"}</td>
                <td className="px-2 py-1.5">
                  {dateBR(l.data)} · {l.competencia ?? "—"}
                </td>
                <td className="px-2 py-1.5">
                  {l.descricao ?? "—"}
                  <div className="text-[11px] text-[var(--color-ink3)]">{l.fornecedor ?? ""}</div>
                </td>
                <td className="px-2 py-1.5">
                  {l.categoria ?? "—"}
                  {l.conta ? ` · ${l.conta}` : ""}
                </td>
                <td className="px-2 py-1.5 text-right font-[family-name:var(--font-mono)]">{brl(l.solicitado)}</td>
                <td className="px-2 py-1.5 text-right font-[family-name:var(--font-mono)]">{l.aprovado == null ? "—" : brl(l.aprovado)}</td>
                <td className="px-2 py-1.5 text-right font-[family-name:var(--font-mono)]">{brl(l.recebido)}</td>
                <td className="px-2 py-1.5">{ROTULO_STATUS_REEMBOLSO[l.status as StatusReembolso] ?? l.status}</td>
                <td className="px-2 py-1.5">{l.comprovantes.length ? l.comprovantes.join(", ") : <span className="text-[#b45309]">sem comprovante</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {porConta.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-[12px] border border-[var(--color-line)] bg-white" data-testid="reembolsos-por-conta">
          <h2 className="px-3 pt-3 text-[14px] font-semibold">Por conta do Plano de Contas</h2>
          <p className="px-3 text-[11.5px] text-[var(--color-ink3)]">A despesa mantém a conta original; o reembolso não é receita operacional nem cria conta nova.</p>
          <table className="mt-2 w-full text-[12px]">
            <thead className="text-left text-[10.5px] uppercase text-[var(--color-ink3)]">
              <tr>
                <th className="px-3 py-1.5">Conta</th>
                <th className="px-3 py-1.5 text-right">Solicitado</th>
                <th className="px-3 py-1.5 text-right">Aprovado</th>
                <th className="px-3 py-1.5 text-right">Recebido</th>
              </tr>
            </thead>
            <tbody>
              {porConta.map((c) => (
                <tr key={c.conta} className="border-t border-[var(--color-line)]">
                  <td className="px-3 py-1.5">{c.rotulo}</td>
                  <td className="px-3 py-1.5 text-right font-[family-name:var(--font-mono)]">{brl(c.solicitado)}</td>
                  <td className="px-3 py-1.5 text-right font-[family-name:var(--font-mono)]">{brl(c.aprovado)}</td>
                  <td className="px-3 py-1.5 text-right font-[family-name:var(--font-mono)]">{brl(c.recebido)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
