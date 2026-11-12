"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { conciliarLinhaDoCartao, desfazerLinhaDoCartao } from "@/lib/actions/cartao-conciliacao";
import type { FaturaNaConciliacao, LinhaDoCartao } from "@/lib/cartao-conciliacao";
import { brl0, dateBR } from "@/lib/utils";
import { TODOS_OS_PROJETOS } from "@/lib/projeto-selecao";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Link para lançar a compra em Despesas, preenchida com a linha (6.2): a pessoa completa e salva. */
function linkParaLancarCompra(cartaoId: string, l: LinhaDoCartao): string {
  const q = new URLSearchParams({
    // A obra é escolhida no formulário ("Todos os projetos").
    proj: TODOS_OS_PROJETOS,
    tab: "lancamentos",
    novo: "1",
    pf_valor: l.valor.toFixed(2),
    pf_forma: "Cartão de crédito",
    pf_cartao: cartaoId,
    pf_data: l.data ?? "",
    pf_obs: l.descricao ?? "",
    pf_comp: l.data ? `${l.data.slice(0, 2)}/${l.data.slice(6)}` : "",
    pf_extrato_cartao: l.id,
  });
  return `/despesas?${q.toString()}`;
}

export function CartaoConciliacaoLista({ cartaoId, faturas, canConciliar, canLancar }: { cartaoId: string; faturas: FaturaNaConciliacao[]; canConciliar: boolean; canLancar: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, ok: string) => {
    setErro(null);
    setMsg(null);
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setMsg(ok);
        router.refresh();
      } else setErro(r.error);
    });
  };

  if (faturas.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-[13px] text-[var(--color-ink3)]" data-cartao-sem-extrato>
          Nenhum extrato deste cartão. Suba a fatura em <Link href="/cartoes" className="text-[var(--color-accent2)] hover:underline">Cartões</Link>; cada linha
          aparece aqui para conciliar com a compra lançada.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-4" data-cartao-conciliacao>
      {erro && <p className="text-xs text-[var(--color-danger)]" role="alert">{erro}</p>}
      {msg && <p className="text-xs text-[var(--color-success)]" role="status">{msg}</p>}
      <p className="text-[12px] text-[var(--color-ink3)]">
        Cada linha do extrato da fatura é conciliada com a compra lançada neste cartão. A sugestão é só orientação: nada é conciliado sem a sua confirmação, e
        nenhuma despesa nasce sozinha. Crédito ou estorno segue o fluxo de estorno, em Cartões. O pagamento da fatura (a saída da conta corrente) concilia
        com o pagamento da fatura, na conta corrente.
      </p>
      {faturas.map((f) => (
        <Card key={f.fechamento ?? "sem-data"} data-fatura-conciliacao={f.fechamento ?? "sem data"}>
          <CardContent className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">{f.fechamento ? `Fatura que fecha em ${dateBR(f.fechamento)}` : "Linhas sem data"}</h3>
              <div className="flex flex-wrap gap-3 text-[12px] text-[var(--color-ink2)]" data-fatura-totais>
                <span>
                  Extrato <strong className="font-[family-name:var(--font-mono)]">{brl0(f.totalExtrato)}</strong>
                </span>
                <span>
                  Conciliado <strong className="font-[family-name:var(--font-mono)]">{brl0(f.totalConciliado)}</strong>
                </span>
                <span>
                  Diferença{" "}
                  <strong className={`font-[family-name:var(--font-mono)] ${Math.abs(f.diferenca) > 0.005 ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"}`} data-fatura-diferenca={f.diferenca}>
                    {brl0(f.diferenca)}
                  </strong>
                </span>
              </div>
            </div>
            <div className="divide-y divide-[var(--color-line)]">
              {f.linhas.map((l) => (
                <div key={l.id} className="py-2" data-linha-cartao={l.id}>
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">{l.data ? dateBR(l.data) : "—"}</span>
                    <span className="text-[var(--color-ink)]">{l.descricao ?? "—"}</span>
                    <span className={`ml-auto font-[family-name:var(--font-mono)] ${l.valor < 0 ? "text-[var(--color-success)]" : "text-[var(--color-ink)]"}`}>{brl0(l.valor)}</span>
                    {l.despesaId ? (
                      <>
                        <Badge tone="success">conciliada{l.numDoc ? ` · ${l.numDoc}` : ""}</Badge>
                        {canConciliar && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={pending}
                            onClick={() => {
                              const motivo = window.prompt("Motivo para desfazer a conciliação desta linha (fica na auditoria):", "");
                              if (motivo === null) return;
                              run(() => desfazerLinhaDoCartao(l.id, motivo), "Conciliação da linha desfeita. A compra e a linha continuam.");
                            }}
                          >
                            Desfazer
                          </Button>
                        )}
                      </>
                    ) : l.credito ? (
                      <Badge tone={l.creditoComEstorno ? "success" : "info"}>{l.creditoComEstorno ? "crédito com estorno" : "crédito: registre o estorno em Cartões"}</Badge>
                    ) : (
                      <Badge tone="warning">pendente</Badge>
                    )}
                  </div>
                  {!l.despesaId && !l.credito && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-1">
                      {l.sugestoes.map((s) => (
                        <span key={s.despesaId} className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-line)] px-2 py-1 text-[12px]">
                          <Badge tone={s.grau === "alta" ? "success" : "warning"}>{s.grau === "alta" ? "alta" : "média"}</Badge>
                          <span>{s.numDoc ?? "compra"}</span>
                          <span className="text-[var(--color-ink3)]">{s.descricao ?? ""}</span>
                          <span className="font-[family-name:var(--font-mono)]">{brl0(s.valor)}</span>
                          <span className="text-[var(--color-ink4)]">{s.parcela} · {s.motivo}</span>
                          {canConciliar && (
                            <Button size="sm" disabled={pending} onClick={() => run(() => conciliarLinhaDoCartao({ linhaId: l.id, despesaId: s.despesaId }), "Linha conciliada com a compra.")}>
                              Conciliar
                            </Button>
                          )}
                        </span>
                      ))}
                      {l.sugestoes.length === 0 && <span className="text-[12px] text-[var(--color-ink4)]">Sem compra lançada compatível.</span>}
                      {canLancar && (
                        <Link href={linkParaLancarCompra(cartaoId, l)} className="text-[12px] text-[var(--color-accent2)] hover:underline" data-lancar-da-linha>
                          Lançar despesa a partir desta linha →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
