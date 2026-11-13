import type { Version } from "@/lib/context";
import { getBudgetLines, getChartAccounts, getMedicoes } from "@/lib/queries";
import { brl0 } from "@/lib/utils";
import { escolherOrcamento, gruposDoRelatorioCef, LEGENDA_ESTADO, montarRelatorioCef, nomesDosGrupos, recorteDeCompetencia, textoDaEscolha, type LinhaCef } from "@/lib/medicao-cef";
import { PrintButton } from "@/components/app/print-button";
import { OrcamentoPicker, RecorteDeCompetencia } from "@/components/app/medicao-cef-controls";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

const pct1 = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

/**
 * Aba "Relatório CEF" (Prompt V, seção 3) — orçado × medido por grupo.
 * Servidor. Quem chama já verificou `medicao.ver` (0.3). Lê as medições de
 * TODOS os autores (0.5.4): o recorte de autoria é de lista, não de cálculo.
 */
export async function RelatorioCef({ tenantId, versions, atual, sp }: { tenantId: string; versions: Version[]; atual: Version; sp: { de?: string; ate?: string; orc?: string } }) {
  const recorte = recorteDeCompetencia(sp.de, sp.ate);
  const orcamento = escolherOrcamento(versions, sp.orc);
  const budgetV = orcamento.escolhido;
  const [budgetLines, medicoes, contas] = await Promise.all([
    // Prompt H: o orçado respeita a situação da versão. 3.7: sem Budget não há
    // orçado — e a tela DIZ isso em vez de mostrar zeros.
    budgetV ? getBudgetLines(budgetV.id, { respeitarSituacao: true }) : Promise.resolve([]),
    getMedicoes(tenantId, atual.id),
    getChartAccounts(tenantId),
  ]);
  const rel = montarRelatorioCef({ grupos: gruposDoRelatorioCef(contas), orcamento: budgetLines, medicoes, recorte, nomes: nomesDosGrupos(contas) });
  const estadosUsados = [...new Set(rel.linhas.map((l) => l.estado).filter((e) => e !== "ok"))] as LinhaCef["estado"][];
  const celula = (v: number | null) => (v == null ? "—" : brl0(v));

  return (
    <div data-aba="relatorio">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] text-[var(--color-ink3)]">
            Orçado: <strong>{budgetV ? `${budgetV.label} (${textoDaEscolha(orcamento.motivo)})` : "sem versão de Orçamento"}</strong> · Realizado: <strong>{atual.label}</strong>
          </p>
          <p className="text-[12px] text-[var(--color-ink3)]">
            {rel.recorte.ativo ? `Recorte por competência: ${rel.recorte.de} a ${rel.recorte.ate} (orçado e medido dentro do intervalo)` : "Acumulado desde o início da obra: todo o orçado × todo o medido"}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {orcamento.opcoes.length > 1 && budgetV && <OrcamentoPicker opcoes={orcamento.opcoes.map((v) => ({ id: v.id, label: v.label }))} selected={budgetV.id} />}
          <RecorteDeCompetencia de={rel.recorte.de ?? ""} ate={rel.recorte.ate ?? ""} />
          <PrintButton label="Imprimir página" />
        </div>
      </div>

      {!budgetV && (
        // 3.7 — obra sem Budget: a ausência é declarada, não disfarçada em zeros.
        <p role="status" data-sem-orcamento className="mb-4 rounded-[8px] bg-[#fef3c7] px-3 py-2 text-[13px] text-[#92400e]">
          Esta obra <strong>não tem versão de Orçamento</strong>: a coluna Orçado fica vazia e o “% do orçado medido” não pode ser calculado. Crie o Orçamento em Orçamentos (ou em Configuração da Versão) para o relatório comparar.
        </p>
      )}
      {rel.retencao.atingida && (
        // 3.6 — retenção final: a Caixa libera até 95%; daí em diante mede-se sem liberação.
        <p role="status" data-retencao className="mb-4 rounded-[8px] bg-[#fee2e2] px-3 py-2 text-[13px] text-[#991b1b]">
          <strong>Retenção final:</strong> o medido já alcança {pct1(rel.totalPct ?? 0)} do orçado — acima de {rel.retencao.limite}% as medições continuam, mas a Caixa não libera mais recurso até a conclusão.
        </p>
      )}
      {rel.totalExcedeu && (
        <p role="status" data-excedente className="mb-4 rounded-[8px] bg-[var(--color-surface2)] px-3 py-2 text-[13px] text-[var(--color-ink2)]">
          O medido passa do orçado em <strong>{brl0(rel.excedente)}</strong> ({pct1(rel.totalPct ?? 0)} do orçado). O total não é truncado em 100%: confira os grupos marcados.
        </p>
      )}

      <Table>
        <THead>
          <tr>
            <TH>Grupo de Despesa (CEF)</TH>
            <TH className="text-right">Orçado</TH>
            <TH className="text-right">Realizado (medido)</TH>
            <TH className="text-right" title="Valor medido ÷ valor orçado. É razão financeira, não o percentual físico declarado no laudo.">
              % do orçado medido
            </TH>
          </tr>
        </THead>
        <tbody>
          {rel.linhas.map((r) => (
            <TR key={r.codigo} data-estado={r.estado}>
              <TD className="font-medium text-[var(--color-ink)]">
                <span className="font-[family-name:var(--font-mono)] text-[var(--color-accent)]">{r.codigo}</span> {r.nome}
                {r.excedeu && (
                  <Badge tone="warning" className="ml-2" title="Medido acima do orçado neste grupo.">
                    acima do orçado
                  </Badge>
                )}
              </TD>
              <TD className="text-right font-[family-name:var(--font-mono)]">{celula(r.orcado)}</TD>
              <TD className="text-right font-[family-name:var(--font-mono)]">{celula(r.realizado)}</TD>
              <TD className="text-right font-[family-name:var(--font-mono)] font-medium text-[var(--color-ink)]" title={r.estado === "ok" ? undefined : LEGENDA_ESTADO[r.estado]}>
                {r.pct == null ? "—" : pct1(r.pct)}
              </TD>
            </TR>
          ))}
          <TR>
            <TD className="font-semibold text-[var(--color-ink)]">Total</TD>
            <TD className="text-right font-[family-name:var(--font-mono)] font-semibold">{rel.totalOrcado > 0 ? brl0(rel.totalOrcado) : "—"}</TD>
            <TD className="text-right font-[family-name:var(--font-mono)] font-semibold">{rel.totalRealizado > 0 ? brl0(rel.totalRealizado) : "—"}</TD>
            <TD className="text-right font-[family-name:var(--font-mono)] font-semibold" data-total-pct>
              {rel.totalPct == null ? "—" : pct1(rel.totalPct)}
              {rel.totalExcedeu && <span className="ml-1 text-[var(--color-warning)]">▲</span>}
            </TD>
          </TR>
        </tbody>
      </Table>

      <div className="mt-4 space-y-1 text-xs text-[var(--color-ink3)]">
        {estadosUsados.length > 0 && <p>“—” significa: {estadosUsados.map((e) => LEGENDA_ESTADO[e]).join(" · ")}. Nunca quer dizer 0% executado.</p>}
        <p>
          <strong>Orçado</strong> vem do lançamento simplificado da versão de Orçamento escolhida (despesas por grupo do plano de contas). <strong>Realizado</strong> é a soma das medições lançadas na versão <strong>Atual</strong>, de todos os autores.{" "}
          <strong>% do orçado medido</strong> é valor medido ÷ valor orçado — razão financeira, não o percentual físico do laudo. A coluna de percentuais de referência saiu: os números eram do empreendimento-piloto, não desta obra.
        </p>
        <p>
          <strong>Imprimir página</strong> abre a impressão do navegador com esta tabela, para conferência. O documento oficial é o formulário da Caixa (PLS / RAE), assinado pelo responsável técnico; o sistema fornece os números, não o formulário.
        </p>
      </div>
    </div>
  );
}
