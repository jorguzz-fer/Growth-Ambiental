import Link from "next/link";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { listarContratos, relatorioDeMedicoes } from "@/lib/contratos-queries";
import { Kpi, StatusBadge, brl } from "@/components/app/contratos/visual";
import { AvisoTelaRemovida } from "@/components/app/aviso-tela-removida";
import { ExportarPdf } from "@/components/app/pdf";

export const dynamic = "force-dynamic";

/**
 * Medições de todos os contratos, com filtro por contrato, situação e
 * competência, totais e (com um contrato) contratado, aditivos, acumulado e
 * saldo a medir. Lançar e aprovar ficam na aba Medições de cada contrato.
 */
export default async function MedicoesDeContratoPage({ searchParams }: { searchParams: Promise<{ status?: string; saiu?: string; contrato?: string; de?: string; ate?: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "contratos", "ver")) return <AccessDenied />;
  const sp = await searchParams;
  const status = sp.status ?? "";
  const contratos = await listarContratos(ctx.tenant.id);
  const contratoId = contratos.some((c) => c.id === sp.contrato) ? sp.contrato! : null;
  const filtro = { contratoId, status: status || null, de: sp.de ?? null, ate: sp.ate ?? null };
  const { linhas, totais, contrato } = await relatorioDeMedicoes(ctx.tenant.id, filtro);
  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (contratoId) p.set("contrato", contratoId);
    if (sp.de) p.set("de", sp.de);
    if (sp.ate) p.set("ate", sp.ate);
    for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const filtros: [string, string][] = [["", "Todas"], ["pendentes", "Aguardando aprovação"], ["aprovada", "Aprovadas"], ["rascunho", "Rascunho"], ["rejeitada", "Rejeitadas"], ["cancelada", "Canceladas"]];
  return (
    <>
      <PageHeader
        eyebrow="Contratos"
        title="Medições"
        subtitle={`${totais.quantidade} medição(ões) no filtro · aprovado ${brl(totais.aprovado)} · em aprovação ${brl(totais.emAprovacao)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/contratos/medicoes/exportar${qs({ status })}`} className="h-9 rounded-[8px] border border-[var(--color-line)] px-3 py-2 text-[12.5px]">
              Exportar Excel
            </a>
            <ExportarPdf arquivo="Medicoes" />
          </div>
        }
      />
      <AvisoTelaRemovida de={sp.saiu} />
      <form method="get" className="mb-3 flex flex-wrap items-end gap-2 text-[12.5px]">
        <label className="flex flex-col gap-1">
          Contrato
          <select name="contrato" defaultValue={contratoId ?? ""} className="h-9 rounded-[8px] border border-[var(--color-line)] px-2">
            <option value="">Todos</option>
            {contratos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} · {c.titulo}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Competência de (MM/AAAA)
          <input name="de" defaultValue={sp.de ?? ""} placeholder="01/2026" className="h-9 w-28 rounded-[8px] border border-[var(--color-line)] px-2" />
        </label>
        <label className="flex flex-col gap-1">
          até
          <input name="ate" defaultValue={sp.ate ?? ""} placeholder="12/2026" className="h-9 w-28 rounded-[8px] border border-[var(--color-line)] px-2" />
        </label>
        {status && <input type="hidden" name="status" value={status} />}
        <button className="h-9 rounded-[8px] bg-[var(--color-accent)] px-3 text-white">Filtrar</button>
      </form>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {filtros.map(([k, r]) => (
          <Link key={k} href={`/contratos/medicoes${qs({ status: k })}`} className={`rounded-full border px-3 py-1 text-[12px] ${status === k ? "border-[var(--color-brand-segmento)] bg-[var(--color-brand-segmento)]/10" : "border-[var(--color-line)]"}`}>
            {r}
          </Link>
        ))}
      </div>
      {contrato && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5" data-resumo-contrato>
          <Kpi rotulo="Valor original" valor={brl(contrato.original)} />
          <Kpi rotulo="Aditivos eficazes" valor={brl(contrato.aditivos)} />
          <Kpi rotulo="Valor atualizado" valor={brl(contrato.atualizado)} />
          <Kpi rotulo="Medido aprovado (acumulado)" valor={brl(contrato.medidoAprovado)} />
          <Kpi rotulo="Saldo a medir" valor={brl(contrato.saldoAMedir)} tom={contrato.saldoAMedir < 0 ? "alerta" : undefined} />
        </div>
      )}
      <div className="overflow-x-auto rounded-[12px] border border-[var(--color-line)] bg-white">
        <table className="w-full text-[12.5px]">
          <thead className="bg-[var(--color-surface2)] text-left text-[10.5px] uppercase tracking-wide text-[var(--color-ink3)]">
            <tr>
              <th className="px-3 py-2">Nº</th>
              <th className="px-3 py-2">Competência</th>
              <th className="px-3 py-2">Contrato</th>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Projeto</th>
              <th className="px-3 py-2 text-right">Realizado</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2">Responsável</th>
              <th className="px-3 py-2">Situação</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-[var(--color-ink3)]">
                  Nenhuma medição.
                </td>
              </tr>
            )}
            {linhas.map(({ m, codigoContrato, tituloContrato, item, itemDescricao, projeto }) => (
              <tr key={m.id} className="border-t border-[var(--color-line)]">
                <td className="px-3 py-2 font-[family-name:var(--font-mono)]">{m.numero ?? "—"}</td>
                <td className="px-3 py-2 font-[family-name:var(--font-mono)]">
                  {m.competencia}
                  {(m.periodoInicio || m.periodoFim) && <div className="text-[11px] text-[var(--color-ink3)]">{m.periodoInicio ?? "…"} a {m.periodoFim ?? "…"}</div>}
                </td>
                <td className="px-3 py-2">
                  <Link href={`/contratos/${m.contratoId}?aba=medicoes`} className="text-[var(--color-accent)] hover:underline">
                    {codigoContrato}
                  </Link>{" "}
                  {tituloContrato}
                </td>
                <td className="px-3 py-2">{item ? `${item} · ${itemDescricao}` : "—"}</td>
                <td className="px-3 py-2">{projeto ?? "—"}</td>
                <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">{m.percentual ? `${Number(m.percentual).toLocaleString("pt-BR")}%` : m.quantidade ? Number(m.quantidade).toLocaleString("pt-BR") : "—"}</td>
                <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">{brl(m.valor)}</td>
                <td className="px-3 py-2">{m.responsavel ?? m.createdBy ?? "—"}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={m.status} tipo="medicao" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11.5px] text-[var(--color-ink3)]">Medição não é fatura nem receita: só a aprovação conta no saldo do contrato.</p>
    </>
  );
}
