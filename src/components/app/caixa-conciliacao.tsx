import type { getCash } from "@/lib/queries";
import type { ConciliacaoData } from "@/lib/queries";
import { brl0, dateBR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { ConciliarToggle } from "@/components/app/conciliar-toggle";
import { ConciliacaoReview } from "@/components/app/conciliacao-review";

/**
 * A aba Contas correntes da Conciliação de Caixa (GA-11 §3.2): pendentes com
 * sugestões, conciliados com desfazer e a tabela "Todos os lançamentos de
 * caixa". Em "Todas as contas", cada movimento leva a coluna Conta. O modo
 * "por obra" (tela antiga, por versão) saiu no GA-11.
 */
type CashRows = Awaited<ReturnType<typeof getCash>>;

export function Conciliacao({
  cash,
  conciliados,
  conciliacaoData,
  canDesfazer,
  projetos,
  obraDe,
  contaDe,
  vazio,
}: {
  cash: CashRows;
  conciliados: number;
  conciliacaoData: ConciliacaoData;
  canDesfazer: boolean;
  /** Obras para a conta criada a partir do extrato (a obra é escolhida). */
  projetos: { id: string; nome: string }[];
  /** Nome da obra de cada movimento ("sem projeto" quando é da conta). */
  obraDe?: (c: CashRows[number]) => string;
  /** GA-11 §3.1 — "Todas as contas": movimento → nome da conta (coluna Conta). */
  contaDe?: Record<string, string>;
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
        projetos={projetos}
        contaDe={contaDe}
      />

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">
          Todos os lançamentos de caixa
        </h3>
        {cash.length === 0 && vazio ? vazio : <CashTable cash={cash} withToggle obraDe={obraDe} contaDe={contaDe} />}
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
  contaDe,
}: {
  cash: CashRows;
  withToggle: boolean;
  obraDe?: (c: CashRows[number]) => string;
  contaDe?: Record<string, string>;
}) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Data</TH>
          {contaDe && <TH>Conta</TH>}
          <TH>Descrição</TH>
          {obraDe && <TH>Projeto</TH>}
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
            {contaDe && <TD className="text-[12px] text-[var(--color-ink2)]" data-coluna-conta>{contaDe[c.id] ?? "sem conta"}</TD>}
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
            <TD colSpan={5 + (obraDe ? 1 : 0) + (contaDe ? 1 : 0)} className="py-6 text-center text-[var(--color-ink3)]">
              Nenhum lançamento de caixa no período.
            </TD>
          </TR>
        )}
      </tbody>
    </Table>
  );
}
