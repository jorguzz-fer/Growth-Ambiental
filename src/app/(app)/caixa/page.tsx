import { getTenantContext } from "@/lib/context";
import { BalancoDiaTable } from "@/components/app/balanco-dia-table";
import { AvisoTelaRemovida } from "@/components/app/aviso-tela-removida";
import { getDailyClosings } from "@/lib/queries";
import { can } from "@/lib/permissions";
import { AccessDenied } from "@/components/app/access-denied";
import { ConciliacaoDeCaixa } from "./conciliacao-de-caixa";

/** "dd/mm/aaaa hh:mm" de um fechamento. */
function dataHoraBR(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const dynamic = "force-dynamic";

/**
 * GA-11 — o Caixa é UMA tela, a Conciliação de Caixa, para toda empresa (a
 * tela antiga, por projeto e versão, e a chave do "Caixa por conta"
 * saíram). Links antigos com `?proj=` e `?vs=` abrem a mesma tela e os
 * parâmetros são ignorados; `?tab=conciliacao` abre a aba Contas correntes.
 */
export default async function CaixaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; de?: string; ate?: string; conta?: string; saiu?: string; proj?: string; vs?: string }>;
}) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // A página verifica "ver" antes de consultar qualquer dado (Prompt M, 2.2).
  if (!can(ctx.perms, "caixa", "ver")) return <AccessDenied />;
  const sp = await searchParams;

  // Prompt L2/AB2 — o histórico dos dias fechados é da empresa, não da obra:
  // aparece no Caixa com ou sem projeto escolhido (o Balanço do Dia saiu).
  const verDiasFechados = can(ctx.perms, "balancodia", "ver");
  const fechamentosHistorico = (verDiasFechados ? await getDailyClosings(ctx.tenant.id) : []).map((c) => ({
    id: c.id,
    dia: c.dia,
    saldoInicial: Number(c.saldoInicial),
    totalEntradas: Number(c.totalEntradas),
    totalSaidas: Number(c.totalSaidas),
    saldoFinal: Number(c.saldoFinal),
    divergencias: Number(c.divergencias),
    responsavelNome: c.responsavelNome,
    projectName: c.projectName,
    clienteNome: c.clienteNome,
    fechadoEm: dataHoraBR(c.closedAt),
    saldoEmConta: c.saldoEmConta == null ? null : Number(c.saldoEmConta),
    reabertoEm: c.reabertoEm ? dataHoraBR(c.reabertoEm) : null,
    reabertoPor: c.reabertoPor,
    motivoReabertura: c.motivoReabertura,
  }));
  const diasFechados = verDiasFechados ? (
    <details className="mb-6" data-dias-fechados open={sp.saiu === "balancodia" || undefined}>
      <summary className="cursor-pointer text-sm font-semibold text-[var(--color-ink)]">Dias fechados ({fechamentosHistorico.length})</summary>
      <div className="mt-3">
        <BalancoDiaTable rows={fechamentosHistorico} />
      </div>
    </details>
  ) : null;
  const avisoRemovida = <AvisoTelaRemovida de={sp.saiu} />;

  return <ConciliacaoDeCaixa ctx={ctx} sp={{ tab: sp.tab, de: sp.de, ate: sp.ate, conta: sp.conta }} avisoRemovida={avisoRemovida} diasFechados={diasFechados} />;
}
