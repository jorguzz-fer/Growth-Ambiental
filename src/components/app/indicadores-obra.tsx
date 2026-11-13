import type { StatusProjeto } from "@/lib/queries";
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
 * Status atual do projeto: quanto já entrou frente ao previsto no cadastro,
 * quanto já foi gasto frente ao planejado no Budget, margem de contribuição e
 * (Growth Ambiental: os indicadores por metro quadrado saíram).
 *
 * Definições de negócio confirmadas com o cliente:
 *   MC  = Receita − Custo Variável − Despesa Variável
 *   %MC = MC ÷ Receita prevista do projeto (cadastro)
 */
export function StatusProjetoPanel({ st }: { st: StatusProjeto }) {
  const { orcamentos, caixaForaDaAtual, definicaoNova, orcamentosUsados, janela } = st.composicao;
  const deOrcamento = definicaoNova
    ? orcamentos === 0
      ? "nenhum projeto tem Orçamento (que não seja cópia)"
      : `de ${brl0(st.despesaPrevista)} — um Orçamento por projeto, o mais recente: ${orcamentosUsados.map((l) => `“${l}”`).join(", ")}`
    : orcamentos === 0
      ? "o projeto não tem Orçamento"
      : orcamentos === 1
        ? `de ${brl0(st.despesaPrevista)} no Orçamento`
        : `de ${brl0(st.despesaPrevista)} — soma de ${orcamentos} Orçamentos`;
  return (
    <div className="mt-6 space-y-4">
      {/* Prompt AA, 2.3.3 e 4-B.4: o painel e cada cartão declaram a base. */}
      {definicaoNova ? (
        <p className="text-[11.5px] text-[var(--color-ink3)]" data-recorte-painel="status">
          <strong className="text-[var(--color-ink2)]">Status e margem</strong> (definição nova): não seguem o seletor de versão — leem a
          Atual e um Orçamento por projeto. Seguem o <strong>período</strong>: o caixa pela data, as despesas e o Orçamento pela competência.
          A receita prevista no <strong>cadastro</strong>, base dos percentuais, não tem data e é sempre o total.
        </p>
      ) : (
        <p className="text-[11.5px] text-[var(--color-ink3)]" data-recorte-painel="status">
          <strong className="text-[var(--color-ink2)]">Status e margem</strong>: não seguem o seletor de versão nem o de período. Somam,
          do começo do projeto até hoje, as entradas de caixa de todas as versões, as despesas da Atual e o Orçamento; os percentuais
          de entradas e de margem são sobre a receita prevista no <strong>cadastro</strong> do projeto.
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
                    ? "o projeto não tem Orçamento"
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
        </div>
      </div>
    </div>
  );
}
