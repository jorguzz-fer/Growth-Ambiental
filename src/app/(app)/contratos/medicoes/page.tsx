import Link from "next/link";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { listarMedicoes } from "@/lib/contratos-queries";
import { StatusBadge, brl } from "@/components/app/contratos/visual";
import { AvisoTelaRemovida } from "@/components/app/aviso-tela-removida";

export const dynamic = "force-dynamic";

/** Medições de todos os contratos. Lançar e aprovar ficam na aba Medições de cada contrato. */
export default async function MedicoesDeContratoPage({ searchParams }: { searchParams: Promise<{ status?: string; saiu?: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "contratos", "ver")) return <AccessDenied />;
  const sp = await searchParams;
  const { status } = sp;
  const todas = await listarMedicoes(ctx.tenant.id);
  const pendentes = todas.filter((x) => x.m.status === "enviada" || x.m.status === "em_analise");
  const lista = status === "pendentes" ? pendentes : status ? todas.filter((x) => x.m.status === status) : todas;
  const filtros: [string, string][] = [["", "Todas"], ["pendentes", `Aguardando aprovação (${pendentes.length})`], ["aprovada", "Aprovadas"], ["rascunho", "Rascunho"], ["rejeitada", "Rejeitadas"], ["cancelada", "Canceladas"]];
  return (
    <>
      <PageHeader eyebrow="Contratos" title="Medições de Contrato" subtitle={`${todas.length} medição(ões) · ${brl(pendentes.reduce((s, x) => s + Number(x.m.valor), 0))} aguardando aprovação`} />
      <AvisoTelaRemovida de={sp.saiu} />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {filtros.map(([k, r]) => (
          <Link key={k} href={k ? `/contratos/medicoes?status=${k}` : "/contratos/medicoes"} className={`rounded-full border px-3 py-1 text-[12px] ${(status ?? "") === k ? "border-[var(--color-brand-segmento)] bg-[var(--color-brand-segmento)]/10" : "border-[var(--color-line)]"}`}>
            {r}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-[12px] border border-[var(--color-line)] bg-white">
        <table className="w-full text-[12.5px]">
          <thead className="bg-[var(--color-surface2)] text-left text-[10.5px] uppercase tracking-wide text-[var(--color-ink3)]">
            <tr>
              <th className="px-3 py-2">Período</th>
              <th className="px-3 py-2">Contrato</th>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Projeto</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2">Lançada por</th>
              <th className="px-3 py-2">Situação</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-[var(--color-ink3)]">
                  Nenhuma medição.
                </td>
              </tr>
            )}
            {lista.map(({ m, codigoContrato, tituloContrato, item, itemDescricao, projeto }) => (
              <tr key={m.id} className="border-t border-[var(--color-line)]">
                <td className="px-3 py-2 font-[family-name:var(--font-mono)]">{m.competencia}</td>
                <td className="px-3 py-2">
                  <Link href={`/contratos/${m.contratoId}?aba=medicoes`} className="text-[var(--color-accent)] hover:underline">
                    {codigoContrato}
                  </Link>{" "}
                  {tituloContrato}
                </td>
                <td className="px-3 py-2">{item ? `${item} · ${itemDescricao}` : "—"}</td>
                <td className="px-3 py-2">{projeto ?? "—"}</td>
                <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">{brl(m.valor)}</td>
                <td className="px-3 py-2">{m.createdBy ?? "—"}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={m.status} tipo="medicao" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
