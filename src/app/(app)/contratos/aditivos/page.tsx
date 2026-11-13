import Link from "next/link";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { listarAditivos } from "@/lib/contratos-queries";
import { ROTULO_TIPO_ADITIVO } from "@/lib/contrato-regras";
import { dateBR } from "@/lib/utils";
import { StatusBadge, brl } from "@/components/app/contratos/visual";

export const dynamic = "force-dynamic";

/** Aditivos de todos os contratos. As ações ficam na aba Aditivos de cada contrato. */
export default async function AditivosPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "contratos", "ver")) return <AccessDenied />;
  const { status } = await searchParams;
  const todos = await listarAditivos(ctx.tenant.id);
  const lista = status ? todos.filter((x) => x.a.status === status) : todos;
  const filtros: [string, string][] = [["", "Todos"], ["aguardando_aprovacao", "Aguardando aprovação"], ["aprovado", "Aprovados (falta assinar)"], ["assinado", "Assinados"], ["rascunho", "Rascunho"], ["cancelado", "Cancelados"]];
  return (
    <>
      <PageHeader eyebrow="Contratos" title="Aditivos" subtitle={`${todos.length} aditivo(s) em todos os contratos`} />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {filtros.map(([k, r]) => (
          <Link key={k} href={k ? `/contratos/aditivos?status=${k}` : "/contratos/aditivos"} className={`rounded-full border px-3 py-1 text-[12px] ${(status ?? "") === k ? "border-[var(--color-brand-segmento)] bg-[var(--color-brand-segmento)]/10" : "border-[var(--color-line)]"}`}>
            {r}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-[12px] border border-[var(--color-line)] bg-white">
        <table className="w-full text-[12.5px]">
          <thead className="bg-[var(--color-surface2)] text-left text-[10.5px] uppercase tracking-wide text-[var(--color-ink3)]">
            <tr>
              <th className="px-3 py-2">Aditivo</th>
              <th className="px-3 py-2">Contrato</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2 text-right">Variação</th>
              <th className="px-3 py-2">Novo término</th>
              <th className="px-3 py-2">Assinatura</th>
              <th className="px-3 py-2">Situação</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-[var(--color-ink3)]">
                  Nenhum aditivo.
                </td>
              </tr>
            )}
            {lista.map(({ a, codigoContrato, tituloContrato }) => (
              <tr key={a.id} className="border-t border-[var(--color-line)]">
                <td className="px-3 py-2 font-[family-name:var(--font-mono)]">
                  <Link href={`/contratos/${a.contratoId}?aba=aditivos`} className="text-[var(--color-accent)] hover:underline">
                    {a.codigo}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {codigoContrato} · {tituloContrato}
                </td>
                <td className="px-3 py-2">{(a.tipos ?? []).map((t) => ROTULO_TIPO_ADITIVO[t as keyof typeof ROTULO_TIPO_ADITIVO] ?? t).join(" + ")}</td>
                <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">{Number(a.valorDelta) === 0 ? "—" : brl(a.valorDelta)}</td>
                <td className="px-3 py-2">{dateBR(a.novoTermino)}</td>
                <td className="px-3 py-2">{dateBR(a.dataAssinatura)}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={a.status} tipo="aditivo" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
