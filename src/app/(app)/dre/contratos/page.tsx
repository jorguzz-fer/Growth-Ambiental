import Link from "next/link";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { Card, CardContent } from "@/components/ui/card";
import { ExportarPdf } from "@/components/app/pdf";
import { CrisDaTela } from "@/components/app/cris-contexto";
import { dreDosContratos, resultadoPorContratoECliente, type ResumoDeResultado } from "@/lib/resultado-contratos";
import { REGRA_DE_RECONHECIMENTO } from "@/lib/receita-servicos";
import { brl0, pct1 } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * DRE por contrato e por cliente: o MESMO motor da DRE gerencial (classes do
 * Plano de Contas) aplicado às faturas e às despesas apropriadas de cada
 * contrato. Despesa sem contrato fica na DRE do projeto (sem rateio aqui).
 */
export default async function DrePorContratoPage({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string; contrato?: string; cliente?: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "dre", "ver") || !can(ctx.perms, "contratos", "ver")) return <AccessDenied />;
  const sp = await searchParams;
  const filtro = { de: sp.de || null, ate: sp.ate || null };
  const r = await resultadoPorContratoECliente(ctx.tenant.id, filtro);
  const contratoSel = r.contratos.find((c) => c.id === sp.contrato) ?? null;
  const clienteSel = sp.cliente ? r.porCliente.find((c) => c.id === sp.cliente) ?? null : null;
  const idsDetalhe = contratoSel ? [contratoSel.id] : clienteSel ? r.contratos.filter((c) => (c.clienteId ?? "_sem") === clienteSel.id).map((c) => c.id) : r.contratos.map((c) => c.id);
  const detalhe = await dreDosContratos(ctx.tenant.id, idsDetalhe, filtro);
  const titulo = contratoSel ? `${contratoSel.codigo} · ${contratoSel.titulo}` : clienteSel ? `Cliente: ${clienteSel.rotulo}` : "Todos os contratos";
  const periodo = filtro.de || filtro.ate ? `${filtro.de ?? "início"} a ${filtro.ate ?? "hoje"}` : "todo o período";
  const qs = (k: string, v: string) => {
    const p = new URLSearchParams();
    if (filtro.de) p.set("de", filtro.de);
    if (filtro.ate) p.set("ate", filtro.ate);
    p.set(k, v);
    return `/dre/contratos?${p.toString()}`;
  };
  const Tabela = ({ linhas, chave }: { linhas: ResumoDeResultado[]; chave: "contrato" | "cliente" }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead className="text-left text-[10.5px] uppercase tracking-wide text-[var(--color-ink3)]">
          <tr>
            <th className="px-2 py-1.5">{chave === "contrato" ? "Contrato" : "Cliente"}</th>
            <th className="px-2 py-1.5 text-right">Receita bruta</th>
            <th className="px-2 py-1.5 text-right">Custos dos serviços</th>
            <th className="px-2 py-1.5 text-right">Resultado bruto</th>
            <th className="px-2 py-1.5 text-right">Despesas operacionais</th>
            <th className="px-2 py-1.5 text-right">Resultado líquido</th>
            <th className="px-2 py-1.5 text-right">Margem</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.id} className="border-t border-[var(--color-line)]">
              <td className="px-2 py-1.5">
                <Link href={qs(chave, l.id)} className="text-[var(--color-accent2)] hover:underline">
                  {l.rotulo}
                </Link>
                {chave === "cliente" && <span className="ml-1 text-[11px] text-[var(--color-ink3)]">({l.contratos} contrato(s))</span>}
              </td>
              <td className="px-2 py-1.5 text-right font-[family-name:var(--font-mono)]">{brl0(l.receitaBruta)}</td>
              <td className="px-2 py-1.5 text-right font-[family-name:var(--font-mono)]">{brl0(l.custoServicos)}</td>
              <td className="px-2 py-1.5 text-right font-[family-name:var(--font-mono)]">{brl0(l.resultadoBruto)}</td>
              <td className="px-2 py-1.5 text-right font-[family-name:var(--font-mono)]">{brl0(l.despesasOperacionais)}</td>
              <td className={`px-2 py-1.5 text-right font-[family-name:var(--font-mono)] ${l.resultadoLiquido < 0 ? "text-[var(--color-danger)]" : ""}`}>{brl0(l.resultadoLiquido)}</td>
              <td className="px-2 py-1.5 text-right font-[family-name:var(--font-mono)]">{l.margemPct == null ? "—" : pct1(l.margemPct)}</td>
            </tr>
          ))}
          {linhas.length === 0 && (
            <tr>
              <td colSpan={7} className="px-2 py-4 text-center text-[var(--color-ink3)]">
                Nenhum contrato ativo, concluído ou encerrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
  return (
    <>
      <CrisDaTela
        titulo="DRE por contrato e cliente"
        dados={{ periodo, porContrato: r.porContrato, porCliente: r.porCliente, total: r.total }}
        sugestoes={["Quais contratos têm margem negativa?", "Qual cliente concentra mais receita?"]}
      />
      <PageHeader
        eyebrow={ctx.tenant.name}
        title="DRE por Contrato e Cliente"
        subtitle={`${titulo} · ${periodo}`}
        actions={<ExportarPdf arquivo="DRE por contrato e cliente" />}
      />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-2 text-[12.5px]">
        <label className="flex flex-col gap-1">
          Competência de (MM/AAAA)
          <input name="de" defaultValue={filtro.de ?? ""} placeholder="01/2026" className="h-9 w-28 rounded-[8px] border border-[var(--color-line)] px-2" />
        </label>
        <label className="flex flex-col gap-1">
          até
          <input name="ate" defaultValue={filtro.ate ?? ""} placeholder="12/2026" className="h-9 w-28 rounded-[8px] border border-[var(--color-line)] px-2" />
        </label>
        <button className="h-9 rounded-[8px] bg-[var(--color-accent)] px-3 text-white">Filtrar</button>
        {(contratoSel || clienteSel) && (
          <Link href={`/dre/contratos${filtro.de || filtro.ate ? `?${new URLSearchParams({ ...(filtro.de ? { de: filtro.de } : {}), ...(filtro.ate ? { ate: filtro.ate } : {}) })}` : ""}`} className="h-9 rounded-[8px] border border-[var(--color-line)] px-3 py-2">
            Ver todos
          </Link>
        )}
      </form>
      <p className="mb-4 rounded-[8px] bg-[var(--color-surface2)] px-3 py-2 text-[12px] text-[var(--color-ink2)]" data-regra-receita>
        {REGRA_DE_RECONHECIMENTO} Custos e despesas: as despesas <strong>apropriadas ao contrato</strong>, pela competência e na conta do plano de cada uma; despesa sem contrato fica na DRE do projeto (nada é rateado aqui).
      </p>
      <Card className="mb-6" data-dre-gerencial-contrato>
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold">DRE gerencial · {titulo}</h2>
          <table className="w-full text-[12.5px]">
            <tbody>
              {detalhe.linhas.map((l) => (
                <tr key={l.id} className={`border-t border-[var(--color-line)] ${l.tipo === "sub" || l.tipo === "final" ? "font-semibold" : ""}`}>
                  <td className={`px-2 py-1.5 ${l.tipo === "conta" ? "pl-6 text-[var(--color-ink3)]" : ""}`}>{l.rotulo}</td>
                  <td className="px-2 py-1.5 text-right font-[family-name:var(--font-mono)]">{brl0(l.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card className="mb-6">
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Por contrato</h2>
          <Tabela linhas={r.porContrato} chave="contrato" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Por cliente</h2>
          <Tabela linhas={r.porCliente} chave="cliente" />
          <p className="mt-2 text-[11.5px] text-[var(--color-ink3)]">
            Total: receita {brl0(r.total.receitaBruta)} · resultado líquido {brl0(r.total.resultadoLiquido)}. Cada fatura e cada despesa pertence a um só contrato: somar os contratos de um cliente não duplica valores.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
