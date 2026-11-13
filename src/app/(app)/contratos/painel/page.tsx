import Link from "next/link";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { CrisDaTela } from "@/components/app/cris-contexto";
import { ExportarPdf } from "@/components/app/pdf";
import { painelDeContratos } from "@/lib/contratos-queries";
import { dateBR } from "@/lib/utils";
import { Kpi, Secao, brl } from "@/components/app/contratos/visual";
import { AvisoTelaRemovida } from "@/components/app/aviso-tela-removida";

export const dynamic = "force-dynamic";

/** Painel contratual: carteira, pendências, vencimentos e rentabilidade (gerencial) por contrato e cliente. */
export default async function PainelDeContratosPage({ searchParams }: { searchParams: Promise<{ saiu?: string }> }) {
  const sp = await searchParams;
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "contratos", "ver")) return <AccessDenied />;
  const fin = can(ctx.perms, "contratosfinanceiro", "ver");
  const p = await painelDeContratos(ctx.tenant.id);
  const pct = (m: number | null) => (m == null ? "—" : `${m.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
  return (
    <>
      <PageHeader eyebrow="Contratos" title="Painel de Contratos" subtitle="Carteira contratual sem dupla contagem: ordens e derivados que consomem o limite já estão no principal." actions={<ExportarPdf arquivo="Painel_de_Contratos" />} />
      <AvisoTelaRemovida de={sp.saiu} />
      <CrisDaTela
        titulo="Painel de Contratos"
        dados={{ ativos: p.ativos, contratado: p.contratado, disponivelParaMedicao: p.disponivelParaMedicao, medicoesPendentes: p.medicoesPendentes, aditivosPendentes: p.aditivosPendentes, vencendo: p.vencendo.map((v) => v.codigo), ...(fin ? { faturado: p.faturado, aReceber: p.aReceber, porCliente: p.porCliente.slice(0, 15) } : {}) }}
        sugestoes={["Qual cliente tem a maior margem?", "Quais contratos vencem em 60 dias?", "Quanto há de medição esperando aprovação?"]}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi rotulo="Contratos ativos" valor={String(p.ativos)} />
        <Kpi rotulo="Valor contratado (atualizado)" valor={brl(p.contratado)} />
        <Kpi rotulo="Disponível para medição" valor={brl(p.disponivelParaMedicao)} />
        <Kpi rotulo="Medições pendentes de aprovação" valor={String(p.medicoesPendentes)} detalhe={brl(p.valorMedicoesPendentes)} tom={p.medicoesPendentes ? "alerta" : undefined} />
        {fin && (
          <>
            <Kpi rotulo="Medido aprovado" valor={brl(p.medido)} />
            <Kpi rotulo="Faturado" valor={brl(p.faturado)} />
            <Kpi rotulo="A receber" valor={brl(p.aReceber)} />
            <Kpi rotulo="Medido não faturado" valor={brl(p.medidoNaoFaturado)} />
          </>
        )}
        <Kpi rotulo="Aditivos aguardando aprovação/assinatura" valor={String(p.aditivosPendentes)} tom={p.aditivosPendentes ? "alerta" : undefined} />
        <Kpi rotulo="Vencem em 60 dias" valor={String(p.vencendo.length)} tom={p.vencendo.length ? "alerta" : undefined} />
      </div>
      {p.vencendo.length > 0 && (
        <Secao titulo="Contratos próximos do vencimento (60 dias)">
          <ul className="text-[13px]">
            {p.vencendo.map((v) => (
              <li key={v.id}>
                <Link href={`/contratos/${v.id}`} className="text-[var(--color-accent)] hover:underline">
                  {v.codigo}
                </Link>{" "}
                {v.titulo} — termina em {dateBR(v.termino)}
              </li>
            ))}
          </ul>
        </Secao>
      )}
      {fin && (
        <>
          <Secao titulo="Margem por contrato" descricao="Gerencial: medido aprovado menos o custo apropriado ao contrato. Não substitui a DRE (que é por projeto e competência).">
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-left text-[10.5px] uppercase tracking-wide text-[var(--color-ink3)]">
                    <th className="py-1 pr-2">Contrato</th>
                    <th className="py-1 pr-2">Cliente</th>
                    <th className="py-1 pr-2 text-right">Medido</th>
                    <th className="py-1 pr-2 text-right">Faturado</th>
                    <th className="py-1 pr-2 text-right">Custo</th>
                    <th className="py-1 pr-2 text-right">Margem</th>
                    <th className="py-1 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {p.porContrato.map((c) => (
                    <tr key={c.id} className="border-t border-[var(--color-line)]">
                      <td className="py-1.5 pr-2">
                        <Link href={`/contratos/${c.id}?aba=resultado`} className="text-[var(--color-accent)] hover:underline">
                          {c.codigo}
                        </Link>{" "}
                        {c.titulo}
                      </td>
                      <td className="py-1.5 pr-2">{c.cliente ?? "—"}</td>
                      <td className="py-1.5 pr-2 text-right font-[family-name:var(--font-mono)]">{brl(c.medido)}</td>
                      <td className="py-1.5 pr-2 text-right font-[family-name:var(--font-mono)]">{brl(c.faturado)}</td>
                      <td className="py-1.5 pr-2 text-right font-[family-name:var(--font-mono)]">{brl(c.custo)}</td>
                      <td className={`py-1.5 pr-2 text-right font-[family-name:var(--font-mono)] ${c.margem < 0 ? "text-[var(--color-danger)]" : ""}`}>{brl(c.margem)}</td>
                      <td className="py-1.5 text-right">{pct(c.margemPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Secao>
          <Secao titulo="Rentabilidade por cliente">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-wide text-[var(--color-ink3)]">
                  <th className="py-1 pr-2">Cliente</th>
                  <th className="py-1 pr-2 text-right">Contratos</th>
                  <th className="py-1 pr-2 text-right">Medido</th>
                  <th className="py-1 pr-2 text-right">Faturado</th>
                  <th className="py-1 pr-2 text-right">Custo</th>
                  <th className="py-1 text-right">Margem</th>
                </tr>
              </thead>
              <tbody>
                {p.porCliente.map((g) => (
                  <tr key={g.cliente} className="border-t border-[var(--color-line)]">
                    <td className="py-1.5 pr-2">{g.cliente}</td>
                    <td className="py-1.5 pr-2 text-right">{g.contratos}</td>
                    <td className="py-1.5 pr-2 text-right font-[family-name:var(--font-mono)]">{brl(g.medido)}</td>
                    <td className="py-1.5 pr-2 text-right font-[family-name:var(--font-mono)]">{brl(g.faturado)}</td>
                    <td className="py-1.5 pr-2 text-right font-[family-name:var(--font-mono)]">{brl(g.custo)}</td>
                    <td className={`py-1.5 text-right font-[family-name:var(--font-mono)] ${g.margem < 0 ? "text-[var(--color-danger)]" : ""}`}>{brl(g.margem)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Secao>
        </>
      )}
    </>
  );
}
