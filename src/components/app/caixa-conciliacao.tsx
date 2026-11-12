import type { getCash } from "@/lib/queries";
import type { ConciliacaoData } from "@/lib/queries";
import { brl0, dateBR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { ConciliarToggle } from "@/components/app/conciliar-toggle";
import { ConciliacaoReview } from "@/components/app/conciliacao-review";

/**
 * A aba Conciliação do Caixa e a tabela "Todos os lançamentos de caixa".
 * Saíram de `caixa/page.tsx` para servir às duas telas: a de antes (por obra)
 * e a da chave "caixa_conciliacao_por_conta" (Prompt AT §4), que mostra a obra
 * de cada movimento e passa as obras para a conta criada a partir do extrato.
 */
type CashRows = Awaited<ReturnType<typeof getCash>>;

export function Conciliacao({
  cash,
  conciliados,
  conciliacaoData,
  canDesfazer,
  projectId = "",
  projetos,
  obraDe,
  vazio,
}: {
  cash: CashRows;
  conciliados: number;
  conciliacaoData: ConciliacaoData;
  canDesfazer: boolean;
  projectId?: string;
  /** Caixa por conta: obras para a conta criada a partir do extrato. */
  projetos?: { id: string; nome: string }[];
  /** Caixa por conta: nome da obra de cada movimento ("sem obra" quando é da conta). */
  obraDe?: (c: CashRows[number]) => string;
  /** Prompt AT §8.1 — o que mostrar quando não há extrato no período. */
  vazio?: React.ReactNode;
}) {
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge tone="success">{conciliados} conciliados</Badge>
        <Badge tone="warning">{cash.length - conciliados} pendentes</Badge>
        {conciliacaoData.pendentes.length > 0 && (
          <Badge tone="danger">{conciliacaoData.pendentes.length} saídas a conciliar</Badge>
        )}
      </div>

      {/* Revisão com sugestões (grau de compatibilidade) + desfazer/auditoria. */}
      <ConciliacaoReview
        pendentes={conciliacaoData.pendentes}
        pendentesEntrada={conciliacaoData.pendentesEntrada}
        conciliados={conciliacaoData.conciliados}
        canDesfazer={canDesfazer}
        projectId={projectId}
        projetos={projetos}
      />

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">
          Todos os lançamentos de caixa
        </h3>
        {cash.length === 0 && vazio ? vazio : <CashTable cash={cash} withToggle obraDe={obraDe} />}
      </div>
    </>
  );
}

const CAT_LABEL: Record<string, string> = {
  ajuste: "Ajuste de caixa",
  despesa_extrato: "Despesa (extrato)",
  receita_extrato: "Receita (extrato)",
  extrato: "Extrato",
};
const catLabel = (c: string | null) => (c ? CAT_LABEL[c] ?? c : "—");

export function CashTable({
  cash,
  withToggle,
  obraDe,
}: {
  cash: CashRows;
  withToggle: boolean;
  obraDe?: (c: CashRows[number]) => string;
}) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Data</TH>
          <TH>Descrição</TH>
          {obraDe && <TH>Obra</TH>}
          <TH>Categoria</TH>
          <TH className="text-right">Valor</TH>
          <TH>Conciliação</TH>
        </tr>
      </THead>
      <tbody>
        {cash.map((c) => {
          const v = Number(c.valor);
          return (
          <TR key={c.id}>
            <TD className="font-[family-name:var(--font-mono)]">{dateBR(c.data)}</TD>
            <TD>{c.descricao ?? "—"}</TD>
            {obraDe && <TD className="text-[12px] text-[var(--color-ink2)]">{obraDe(c)}</TD>}
            <TD>
              <Badge tone={c.cat === "ajuste" ? "info" : "neutral"}>{catLabel(c.cat)}</Badge>
            </TD>
            <TD
              className={`text-right font-[family-name:var(--font-mono)] ${
                v < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"
              }`}
            >
              {brl0(v)}
            </TD>
            <TD>
              {withToggle ? (
                <div className="flex items-center gap-2">
                  <ConciliarToggle id={c.id} rec={c.rec} />
                  {!c.rec && c.cat === "extrato" && (
                    <Badge tone="danger">divergência</Badge>
                  )}
                  {/* BL-2 / 6.6 — `rec` sem vínculo é estado próprio, não "conciliado". */}
                  {c.rec && c.cat !== "ajuste" && !c.conciliadoDespesaId && !c.conciliadoContaReceberId && (
                    <Badge tone="warning" title="Marcado como conciliado sem registro de com o quê casou. Veja a lista de conferência na Conciliação.">sem vínculo</Badge>
                  )}
                </div>
              ) : (
                <Badge tone={c.rec ? "success" : "warning"}>
                  {c.rec ? "conciliado" : "pendente"}
                </Badge>
              )}
            </TD>
          </TR>
          );
        })}
        {cash.length === 0 && (
          <TR>
            <TD colSpan={obraDe ? 6 : 5} className="py-6 text-center text-[var(--color-ink3)]">
              Nenhum lançamento de caixa nesta versão.
            </TD>
          </TR>
        )}
      </tbody>
    </Table>
  );
}
