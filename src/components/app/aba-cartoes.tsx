import Link from "next/link";
import type { CartaoNaAba, LinhaDoQuadroDeCartao } from "@/lib/caixa-aba-cartoes";
import { CartaoConciliacaoLista } from "@/components/app/cartao-conciliacao-lista";
import { ConferenciaDoCartao, SubirFatura } from "@/components/app/extrato-cartao";
import { brl0, dateBR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * GA-11 §3.3 — a aba Cartões de crédito da Conciliação de Caixa. Servidor:
 * monta o quadro por cartão e passa os dados já carregados para os
 * componentes de cliente (subir fatura, conciliação linha a linha e
 * conferência com estorno), que só chamam as ações que já existem.
 */
const TOM_DA_SITUACAO: Record<string, "success" | "warning" | "info" | "neutral" | "danger"> = {
  conciliada: "success",
  aberta: "info",
  fechada: "warning",
  paga: "neutral",
  "paga parcialmente": "warning",
  "sem fatura": "neutral",
};

export function AbaCartoes({
  quadro,
  cartoes,
  selecionado,
  hrefDoCartao,
  canConciliar,
  canLancar,
  canEditarCartao,
  aiConfigured,
}: {
  quadro: LinhaDoQuadroDeCartao[];
  cartoes: CartaoNaAba[];
  selecionado: string;
  hrefDoCartao: (id: string) => string;
  canConciliar: boolean;
  canLancar: boolean;
  canEditarCartao: boolean;
  aiConfigured: boolean;
}) {
  if (quadro.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-[13px] text-[var(--color-ink3)]" data-vazio-cartoes>
          Nenhum cartão cadastrado. Cadastre um cartão em{" "}
          <Link href="/cartoes" className="text-[var(--color-accent2)] hover:underline">
            Cartões de Crédito
          </Link>{" "}
          para conciliar a fatura aqui.
        </CardContent>
      </Card>
    );
  }
  const tot = quadro.filter((q) => !selecionado || q.id === selecionado);
  return (
    <div data-aba-cartoes>
      <Card className="mb-4">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Os cartões</h2>
          <p className="mb-3 text-[11.5px] text-[var(--color-ink3)]">
            A fatura de cada cartão: a mais recente com fatura importada (sem nenhuma, a do ciclo em curso). <strong>Fatura importada</strong> é o que o banco cobrou; <strong>lançado</strong> é o que está em Despesas no cartão. Clique num cartão para ver só ele.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
                  <th className="py-2 pr-3">Cartão</th>
                  <th className="py-2 pr-3 text-right">Limite</th>
                  <th className="py-2 pr-3">Fatura</th>
                  <th className="py-2 pr-3 text-right">Fatura importada</th>
                  <th className="py-2 pr-3 text-right">Lançado</th>
                  <th className="py-2 pr-3 text-right">Diferença</th>
                  <th className="py-2 pr-3">Situação</th>
                </tr>
              </thead>
              <tbody>
                {quadro.map((q) => (
                  <tr key={q.id} className={`border-b border-[var(--color-line)]/60 ${selecionado === q.id ? "bg-[var(--color-accent4)]" : ""}`} data-cartao-saldo={q.nome}>
                    <td className="py-2 pr-3">
                      <Link href={hrefDoCartao(q.id)} className="font-medium text-[var(--color-ink)] hover:underline">
                        {q.nome}
                      </Link>
                      {q.pendentes > 0 && (
                        <Badge tone="warning" className="ml-2">
                          {q.pendentes} a conciliar
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{q.limite == null ? "—" : brl0(q.limite)}</td>
                    <td className="py-2 pr-3">{q.fatura ? `fecha ${dateBR(q.fatura.fechamento)}${q.fatura.vencimento ? ` · vence ${dateBR(q.fatura.vencimento)}` : ""}` : "—"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{q.extrato == null ? "não importada" : brl0(q.extrato)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{brl0(q.lancado)}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${q.diferenca != null && Math.abs(q.diferenca) > 0.005 ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"}`} data-diferenca-cartao={q.diferenca ?? ""}>
                      {q.diferenca == null ? "—" : brl0(q.diferenca)}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge tone={TOM_DA_SITUACAO[q.situacao] ?? "neutral"} data-situacao-fatura={q.situacao}>
                        {q.situacao}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {tot.length > 1 && (
                  <tr className="font-semibold">
                    <td className="py-2 pr-3">Total dos cartões</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{brl0(tot.reduce((a, q) => a + (q.limite ?? 0), 0))}</td>
                    <td />
                    <td className="py-2 pr-3 text-right tabular-nums">{brl0(tot.reduce((a, q) => a + (q.extrato ?? 0), 0))}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{brl0(tot.reduce((a, q) => a + q.lancado, 0))}</td>
                    <td colSpan={2} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <SubirFatura cartoes={quadro.map((q) => ({ id: q.id, nome: q.nome }))} cartaoInicial={selecionado} canEditar={canEditarCartao} aiConfigured={aiConfigured} />

      <h3 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">Conciliação da fatura: linha a linha</h3>
      <CartaoConciliacaoLista cartoes={cartoes.map((c) => ({ id: c.id, nome: c.nome, faturas: c.faturas }))} canConciliar={canConciliar} canLancar={canLancar} />

      {cartoes.map((c) => (
        <Card key={c.id} className="mt-4">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">Conferência da fatura · {c.nome}</h3>
            <p className="text-[11.5px] text-[var(--color-ink3)]">O que está na fatura e não foi lançado, o contrário, as divergências e os créditos. Nada é lançado por aqui: a compra vira proposta com link para Despesas, e o estorno só com o seu clique.</p>
            <ConferenciaDoCartao cartao={{ id: c.id, nome: c.nome }} conferencia={c.conferencia} compras={c.compras} canEditar={canEditarCartao} canLancar={canLancar} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
