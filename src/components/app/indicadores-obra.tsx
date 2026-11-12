import type { IndicadoresObra, StatusProjeto } from "@/lib/queries";
import { brl0 } from "@/lib/utils";
import { TEXTO_DA_JANELA } from "@/lib/dashboard-definicao";
import { Card, CardContent } from "@/components/ui/card";

const pct = (v: number) =>
  `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

/** Um indicador. `hint` explica a origem do número quando ela não é óbvia. */
function KPI({
  label,
  value,
  hint,
  tone = "normal",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "normal" | "good" | "warn" | "muted";
}) {
  const cor =
    tone === "good"
      ? "text-[var(--color-success)]"
      : tone === "warn"
        ? "text-[var(--color-warning)]"
        : tone === "muted"
          ? "text-[var(--color-ink4)]"
          : "text-[var(--color-ink)]";
  return (
    <Card>
      <CardContent className="p-4">
        <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
          {label}
        </p>
        <p className={`mt-1 font-[family-name:var(--font-mono)] text-[18px] font-semibold ${cor}`}>
          {value}
        </p>
        {hint && <p className="mt-0.5 text-[11px] text-[var(--color-ink4)]">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * Painel de indicadores físico-financeiros da obra: aquisição/financiamento,
 * custo com BDI, evolução física e liberação do financiamento.
 *
 * Os números saem do cadastro do projeto (CUB, metragem, valores financiados,
 * %BDI) e das medições por serviço. Quando esses dados ainda não existem, o
 * painel diz o que falta em vez de exibir valor inventado.
 */
export function IndicadoresObraPanel({ ind }: { ind: IndicadoresObra }) {
  // Prompt AA, 3.2/3.5: sem serviço cadastrado, nada de zero — estado próprio.
  const semServico = ind.qtdServicos === 0;
  const SEM_SERVICO = "depende do cadastro de serviços (medição por serviço, ainda não usada — Prompt V)";
  const semFinanciamento = ind.financiamentoConstrucao === 0 && ind.financiamentoTerreno === 0;
  return (
    <div className="mt-6 space-y-4">
      {/* Prompt AA, 2.3.3: o painel declara o próprio recorte. */}
      <p className="text-[11.5px] text-[var(--color-ink3)]" data-recorte-painel="obra">
        <strong className="text-[var(--color-ink2)]">Indicadores da obra</strong>: cadastro do projeto e medição por serviço. Não seguem o
        seletor de versão nem o de período.
      </p>
      {/* Aquisição e financiamento */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">
          Aquisição e financiamento
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KPI
            label="Financiado — construção"
            value={ind.financiamentoConstrucao > 0 ? brl0(ind.financiamentoConstrucao) : "—"}
            hint={ind.financiamentoConstrucao > 0 ? "cadastro do projeto" : "informe no cadastro do projeto"}
            tone={ind.financiamentoConstrucao > 0 ? "normal" : "muted"}
          />
          <KPI
            label="Financiado — terreno"
            value={ind.financiamentoTerreno > 0 ? brl0(ind.financiamentoTerreno) : "—"}
            hint={ind.financiamentoTerreno > 0 ? "cadastro do projeto" : "informe no cadastro do projeto"}
            tone={ind.financiamentoTerreno > 0 ? "normal" : "muted"}
          />
          <KPI
            label="Total da aquisição"
            value={semFinanciamento ? "—" : brl0(ind.totalAquisicao)}
            hint={semFinanciamento ? "informe no cadastro do projeto" : "construção + terreno, do cadastro"}
            tone={semFinanciamento ? "muted" : "normal"}
          />
        </div>
      </div>

      {/* Custo da obra e BDI */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">
          Custo da obra e BDI
          {ind.tipoExecutor && (
            <span className="ml-2 font-normal text-[var(--color-ink3)]">
              · executor: {ind.tipoExecutor}
            </span>
          )}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KPI
            label="Custo total dos serviços"
            value={semServico ? "—" : brl0(ind.custoTotalServicos)}
            hint={semServico ? SEM_SERVICO : `${ind.qtdServicos} serviço(s)`}
            tone={semServico ? "muted" : "normal"}
          />
          <KPI
            label="BDI"
            value={ind.pctBdi > 0 ? pct(ind.pctBdi) : "—"}
            hint={ind.pctBdi > 0 ? undefined : "informe no cadastro do projeto"}
            tone={ind.pctBdi > 0 ? "normal" : "muted"}
          />
          <KPI label="Valor do BDI" value={semServico ? "—" : brl0(ind.valorBdi)} hint={semServico ? SEM_SERVICO : undefined} tone={semServico ? "muted" : "normal"} />
          <KPI label="Custo total com BDI" value={semServico ? "—" : brl0(ind.custoTotalComBdi)} hint={semServico ? SEM_SERVICO : undefined} tone={semServico ? "muted" : "normal"} />
        </div>
      </div>

      {/* Decisão de 01/10/2026 (BV-1): a medição é por percentual de cada
          serviço da PLS, que ainda não está cadastrada por obra. Os
          indicadores de evolução física ficam DESLIGADOS até lá — a estrutura
          (serviço, medicao_servico, calc/medicao-bdi) fica preparada. Liberação
          acumulada e Saldo de financiamento saíram de vez: sem medição,
          mostravam o financiamento do cadastro como se já tivesse acontecido. */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">Referência da obra</h2>
        <p className="mb-2 rounded-[8px] bg-[var(--color-surface2)] px-3 py-2 text-[12px] text-[var(--color-ink2)]" data-evolucao-desligada>
          Evolução física, liberação e geração de caixa por medição estão desligadas até o cadastro da PLS de cada obra (medição por
          percentual de cada serviço). A medição por grupo, em Medição de Projeto, continua valendo.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KPI
            label="Custo referencial"
            value={ind.custoReferencial > 0 ? brl0(ind.custoReferencial) : "—"}
            hint={
              ind.cub > 0
                ? `CUB ${brl0(ind.cub)} × ${ind.metragem} m²`
                : "informe CUB e metragem"
            }
            tone={ind.cub > 0 ? "normal" : "muted"}
          />
          <KPI
            label="Serviços fora dos limites"
            value={semServico ? "—" : String(ind.servicosForaDosLimites)}
            hint={semServico ? SEM_SERVICO : "incidência fora da faixa aceitável"}
            tone={semServico ? "muted" : ind.servicosForaDosLimites > 0 ? "warn" : "good"}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Status atual do projeto: quanto já entrou frente ao previsto no cadastro,
 * quanto já foi gasto frente ao planejado no Budget, margem de contribuição e
 * indicadores por metro quadrado.
 *
 * Definições de negócio confirmadas com o cliente:
 *   MC  = Receita − Custo Variável − Despesa Variável
 *   %MC = MC ÷ Receita Total do Projeto (valor global do cadastro)
 */
export function StatusProjetoPanel({ st }: { st: StatusProjeto }) {
  const { orcamentos, caixaForaDaAtual, definicaoNova, orcamentosUsados, janela } = st.composicao;
  const deOrcamento = definicaoNova
    ? orcamentos === 0
      ? "nenhuma obra tem Orçamento (que não seja cópia)"
      : `de ${brl0(st.despesaPrevista)} — um Orçamento por obra, o mais recente: ${orcamentosUsados.map((l) => `“${l}”`).join(", ")}`
    : orcamentos === 0
      ? "a obra não tem Orçamento"
      : orcamentos === 1
        ? `de ${brl0(st.despesaPrevista)} no Orçamento`
        : `de ${brl0(st.despesaPrevista)} — soma de ${orcamentos} Orçamentos`;
  return (
    <div className="mt-6 space-y-4">
      {/* Prompt AA, 2.3.3 e 4-B.4: o painel e cada cartão declaram a base. */}
      {definicaoNova ? (
        <p className="text-[11.5px] text-[var(--color-ink3)]" data-recorte-painel="status">
          <strong className="text-[var(--color-ink2)]">Status e margem</strong> (definição nova): não seguem o seletor de versão — leem a
          Atual e um Orçamento por obra. Seguem o <strong>período</strong>: o caixa pela data, as despesas e o Orçamento pela competência.
          A receita do <strong>cadastro</strong> (construção + terreno), base dos percentuais, não tem data e é sempre o total.
        </p>
      ) : (
        <p className="text-[11.5px] text-[var(--color-ink3)]" data-recorte-painel="status">
          <strong className="text-[var(--color-ink2)]">Status e margem</strong>: não seguem o seletor de versão nem o de período. Somam,
          do começo da obra até hoje, as entradas de caixa de todas as versões, as despesas da Atual e o Orçamento; os percentuais
          de entradas e de margem são sobre a receita do <strong>cadastro</strong> do projeto (construção + terreno).
        </p>
      )}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">
          Status atual
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KPI
            label="Entradas de caixa"
            value={brl0(st.recebido)}
            hint={`regime de caixa, ${definicaoNova ? "só a versão Atual, " : ""}toda entrada (não só venda), conciliada ou não${
              caixaForaDaAtual > 0 ? ` · inclui ${brl0(caixaForaDaAtual)} gravados em versões que não são a Atual` : ""
            }`}
          />
          <KPI
            label="% entradas de caixa"
            value={st.receitaPrevista > 0 ? pct(st.pctRecebido * 100) : "—"}
            hint={st.receitaPrevista > 0 ? `sobre ${brl0(st.receitaPrevista)} da receita do cadastro` : "receita do cadastro não informada"}
            tone={st.receitaPrevista > 0 ? "good" : "muted"}
          />
          <KPI
            label="Executado"
            value={brl0(st.executado)}
            hint={`despesas da Atual, sem canceladas · ${st.erroOrcamento ? "não foi possível ler o Orçamento" : deOrcamento}`}
          />
          <KPI
            label="% executado"
            value={st.erroOrcamento ? "erro" : st.despesaPrevista > 0 ? pct(st.pctExecutado * 100) : "—"}
            hint={
              st.erroOrcamento
                ? "falha ao ler o Orçamento — não é zero; recarregue a página"
                : orcamentos > 1
                  ? `sobre a soma de ${orcamentos} Orçamentos`
                  : orcamentos === 0
                    ? "a obra não tem Orçamento"
                    : st.despesaPrevista === 0
                      ? "o Orçamento não tem despesa planejada"
                      : "sobre a despesa planejada no Orçamento"
            }
            tone={
              st.erroOrcamento
                ? "warn"
                : st.despesaPrevista === 0
                ? "muted"
                : st.pctExecutado > 1
                  ? "warn"
                  : "normal"
            }
          />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">
          Margem e produtividade
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KPI
            label="Margem de contribuição"
            value={brl0(st.margemContribuicao)}
            hint={
              definicaoNova && janela
                ? `receita da Atual − custo e despesa variáveis da Atual · ${TEXTO_DA_JANELA[janela]}`
                : "receita da Atual (como na DRE, todo o horizonte) − custo e despesa variáveis lançados na Atual (qualquer competência)"
            }
            tone={st.margemContribuicao >= 0 ? "good" : "warn"}
          />
          <KPI
            label="% margem de contribuição"
            value={st.receitaPrevista > 0 ? pct(st.pctMargem * 100) : "—"}
            hint={st.receitaPrevista > 0 ? "sobre a receita do cadastro do projeto" : "receita do cadastro não informada"}
            tone={
              st.receitaPrevista === 0
                ? "muted"
                : st.pctMargem >= 0
                  ? "good"
                  : "warn"
            }
          />
          <KPI
            label="Custo por m²"
            value={st.metragem > 0 ? brl0(st.custoPorM2) : "—"}
            hint={st.metragem > 0 ? `despesas da Atual ÷ ${st.metragem} m² do cadastro` : "informe a metragem"}
            tone={st.metragem > 0 ? "normal" : "muted"}
          />
          <KPI
            label="Receita por m²"
            value={st.metragem > 0 ? brl0(st.receitaPorM2) : "—"}
            hint={st.metragem > 0 ? `receita da Atual ÷ ${st.metragem} m² do cadastro` : "informe a metragem"}
            tone={st.metragem > 0 ? "normal" : "muted"}
          />
        </div>
      </div>
    </div>
  );
}
