import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { AiDiagnosticPanel } from "@/components/app/ai-diagnostic-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { isAiConfigured, modelWarning, primaryModel } from "@/lib/ai/client";
import { rotuloModelo } from "@/lib/ai/modelos";
import { getUltimoTesteDeIa, getUsoDaIa } from "@/lib/queries";
import { LIMITES_DE_CONVERSA, ROTULO_DA_OPERACAO, alertaDeOrcamento, avisoDeFallback, custoEstimado, limitesEfetivos, resumoPorOperacao } from "@/lib/ia-uso-regras";
import { custoDaChamadaUsd, DATA_DA_TABELA_DE_PRECOS } from "@/lib/ai/precos";
import { IaLimitesForm } from "@/components/app/ia-limites-form";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const fmt = (n: number) => n.toLocaleString("pt-BR");

export default async function DiagnosticoIaPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // Prompt AM, 6.2: sem permissão, o componente padrão — não página em branco.
  if (!can(ctx.perms, "diagnosticoia", "ver")) return <AccessDenied />;
  // 6.3: o bloco de configuração (teste, modelo, consumo) é de quem edita a tela.
  const configura = can(ctx.perms, "diagnosticoia", "editar");
  // Prompt AM2 (revisão V5): o Assistente do produto saiu — a Cris explica o
  // sistema em qualquer tela. Fica só o diagnóstico, para quem configura.
  if (!configura) {
    return (
      <>
        <PageHeader title="Diagnóstico de IA" />
        <Card>
          <CardContent className="p-6 text-[13px] text-[var(--color-ink2)]">
            O Assistente agora é a <strong>Cris</strong>: o botão no canto inferior direito de qualquer tela. Ela explica como o
            sistema funciona, analisa os números da tela e ajuda a lançar.
          </CardContent>
        </Card>
      </>
    );
  }

  // Período escolhido (7, 30 ou 90 dias) e o mês corrente, para o orçamento.
  const dias = [7, 30, 90].includes(Number((await searchParams).dias)) ? Number((await searchParams).dias) : 30;
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  const agora = new Date();
  const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const [uso, ultimo, usoDoMes, [cfg]] = await Promise.all([
    getUsoDaIa(ctx.tenant.id, desde),
    getUltimoTesteDeIa(ctx.tenant.id),
    getUsoDaIa(ctx.tenant.id, inicioDoMes),
    db.select().from(schema.iaLimites).where(eq(schema.iaLimites.tenantId, ctx.tenant.id)).limit(1),
  ]);
  const custoDoPeriodo = custoEstimado(uso, custoDaChamadaUsd);
  const custoDoMes = custoEstimado(usoDoMes, custoDaChamadaUsd);
  const orcamento = cfg?.orcamentoMensalUsd == null ? null : Number(cfg.orcamentoMensalUsd);
  const alerta = alertaDeOrcamento(custoDoMes.usd, orcamento);
  const limites = limitesEfetivos(cfg ? { conversasPessoaHora: cfg.conversasPessoaHora, conversasEmpresaHora: cfg.conversasEmpresaHora } : null);
  const custoPorOperacao = new Map<string, number>();
  for (const l of uso) {
    const c = custoDaChamadaUsd(l);
    if (c != null) custoPorOperacao.set(l.operacao, (custoPorOperacao.get(l.operacao) ?? 0) + c);
  }
  const porOperacao = resumoPorOperacao(uso);
  const fallback = avisoDeFallback(uso);
  const modelo = primaryModel();

  return (
    <>
      <PageHeader title="Diagnóstico de IA" subtitle="Chave, modelo, teste de conexão e consumo da IA desta empresa" />
      {configura && (
        <div className="space-y-4" data-diagnostico-ia>
          <div className="space-y-4">
          {/* 7.3 — o estado, que antes só aparecia depois de clicar no teste. */}
          <Card data-estado-ia>
            <CardContent className="space-y-2 p-5 text-[13px]">
              <h2 className="text-sm font-semibold text-[var(--color-ink)]">Estado</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[var(--color-ink2)]">Chave de IA:</span>
                <Badge tone={isAiConfigured() ? "success" : "danger"}>{isAiConfigured() ? "presente" : "ausente"}</Badge>
              </div>
              <div className="text-[var(--color-ink2)]">
                Modelo configurado: <span className="font-[family-name:var(--font-mono)]">{modelo}</span> ({rotuloModelo(modelo)})
              </div>
              {modelWarning() && <p className="text-[12px] text-[var(--color-warning)]">{modelWarning()}</p>}
              <div className="text-[var(--color-ink2)]">
                Último teste:{" "}
                {ultimo ? (
                  <>
                    {ultimo.em.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} por {ultimo.email ?? "—"} —{" "}
                    <Badge tone={ultimo.erro ? "danger" : "success"}>{ultimo.erro ? "falhou" : `ok (${ultimo.modelo ?? "?"})`}</Badge>
                  </>
                ) : (
                  "nenhum registrado"
                )}
              </div>
              {fallback && <p className="rounded-[8px] bg-[var(--color-warning)]/10 px-3 py-2 text-[12.5px] text-[var(--color-ink2)]">{fallback}</p>}
            </CardContent>
          </Card>

          {/* 5.1 — consumo dos últimos 30 dias, por operação. Só números: nenhum conteúdo é guardado. */}
          <Card data-consumo-ia>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold text-[var(--color-ink)]">Consumo dos últimos {dias} dias</h2>
                <span className="flex gap-2 text-[12px]">
                  {[7, 30, 90].map((d) => (
                    <a key={d} href={`/diagnosticoia?dias=${d}`} className={d === dias ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-accent2)] hover:underline"}>
                      {d} dias
                    </a>
                  ))}
                </span>
              </div>
              <p className="mb-2 text-[12.5px] text-[var(--color-ink2)]" data-custo-ia>
                Custo estimado no período: <strong>US$ {custoDoPeriodo.usd.toFixed(2)}</strong>
                {custoDoPeriodo.semPreco ? ` (${custoDoPeriodo.semPreco} chamada(s) de modelo fora da tabela: custo desconhecido, fora da soma)` : ""} · no mês corrente: <strong>US$ {custoDoMes.usd.toFixed(2)}</strong>
                {orcamento != null ? ` de US$ ${orcamento.toFixed(2)} orçados` : ""}. Estimativa pela tabela de preços de {DATA_DA_TABELA_DE_PRECOS}; não é a fatura.
              </p>
              {alerta && <p className="mb-2 rounded-[8px] bg-[var(--color-warning)]/10 px-3 py-2 text-[12.5px]" data-alerta-orcamento>{alerta}</p>}
              <p className="mb-3 text-[11.5px] text-[var(--color-ink3)]">
                Registro de quantas chamadas e quantos tokens, por operação. Nunca o conteúdo: pergunta, documento e resposta não são
                guardados. A chave é do servidor: todas as empresas consomem da mesma conta. As conversas desta empresa têm limite de{" "}
                {limites.porPessoaPorHora} perguntas por hora por pessoa e {limites.porEmpresaPorHora} por empresa (padrão do sistema:{" "}
                {LIMITES_DE_CONVERSA.porPessoaPorHora} e {LIMITES_DE_CONVERSA.porEmpresaPorHora}); as leituras de documento só são medidas.
              </p>
              {porOperacao.length === 0 ? (
                <p className="text-[12.5px] text-[var(--color-ink3)]">Nenhuma chamada registrada no período.</p>
              ) : (
                <Table aria-label="Consumo da IA por operação">
                  <THead>
                    <tr>
                      <TH>Operação</TH>
                      <TH className="text-right">Chamadas</TH>
                      <TH className="text-right">Falhas</TH>
                      <TH className="text-right">Tokens de entrada</TH>
                      <TH className="text-right">Lidos do cache</TH>
                      <TH className="text-right">Tokens de saída</TH>
                      <TH className="text-right">Custo estimado</TH>
                    </tr>
                  </THead>
                  <tbody>
                    {porOperacao.map((r) => (
                      <TR key={r.operacao}>
                        <TD>{ROTULO_DA_OPERACAO[r.operacao] ?? r.operacao}</TD>
                        <TD className="text-right tabular-nums">{fmt(r.chamadas)}</TD>
                        <TD className="text-right tabular-nums">{fmt(r.erros)}</TD>
                        <TD className="text-right tabular-nums">{fmt(r.entrada)}</TD>
                        <TD className="text-right tabular-nums">{fmt(r.cacheLida)}</TD>
                        <TD className="text-right tabular-nums">{fmt(r.saida)}</TD>
                        <TD className="text-right tabular-nums">{custoPorOperacao.has(r.operacao) ? `US$ ${custoPorOperacao.get(r.operacao)!.toFixed(4)}` : "—"}</TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">Limites de consumo desta empresa</h2>
              <IaLimitesForm atual={{ pessoaHora: cfg?.conversasPessoaHora ?? null, empresaHora: cfg?.conversasEmpresaHora ?? null, orcamentoMensalUsd: orcamento }} padrao={LIMITES_DE_CONVERSA} />
              <p className="mt-2 text-[11.5px] text-[var(--color-ink3)]">O orçamento mensal só gera aviso (nesta tela); o bloqueio é pelos limites por hora. Nenhuma chave de API aparece aqui.</p>
            </CardContent>
          </Card>
          <AiDiagnosticPanel />
          </div>
        </div>
      )}
    </>
  );
}
