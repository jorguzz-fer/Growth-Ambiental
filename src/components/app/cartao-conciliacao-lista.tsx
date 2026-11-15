"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { conciliarLinhaDoCartao, desfazerLinhaDoCartao } from "@/lib/actions/cartao-conciliacao";
import type { FaturaNaConciliacao, LinhaDoCartao } from "@/lib/cartao-conciliacao";
import { brl0, dateBR } from "@/lib/utils";
import { linkParaLancarCompra } from "@/lib/cartao-links";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * GA-11 §3.3 — linha da fatura × compra lançada, de UM cartão ou de todos
 * ("Todos os cartões": uma lista só, com a coluna Cartão).
 */
export function CartaoConciliacaoLista({ cartoes, canConciliar, canLancar }: { cartoes: { id: string; nome: string; faturas: FaturaNaConciliacao[] }[]; canConciliar: boolean; canLancar: boolean }) {
  const varios = cartoes.length > 1;
  const faturas = cartoes.flatMap((c) => c.faturas.map((f) => ({ ...f, cartaoId: c.id, cartaoNome: c.nome })));
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
          Nenhuma fatura {varios ? "dos cartões" : "deste cartão"} ainda. Use <strong>Subir fatura</strong>, acima: cada linha aparece aqui para conciliar com a compra lançada.
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
        nenhuma despesa nasce sozinha. Crédito ou estorno segue o fluxo de estorno, na conferência abaixo. O pagamento da fatura (a saída da conta corrente)
        concilia com o pagamento da fatura, na aba Contas correntes.
      </p>
      {faturas.map((f) => (
        <Card key={`${f.cartaoId}|${f.fechamento ?? "sem-data"}`} data-fatura-conciliacao={f.fechamento ?? "sem data"} data-cartao-da-fatura={f.cartaoNome}>
          <CardContent className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                {varios && <span className="mr-2 rounded-[6px] bg-[var(--color-surface3)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-ink2)]" data-coluna-cartao>{f.cartaoNome}</span>}
                {f.fechamento ? `Fatura que fecha em ${dateBR(f.fechamento)}` : "Linhas sem data"}
              </h3>
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
                      <Badge tone={l.creditoComEstorno ? "success" : "info"}>{l.creditoComEstorno ? "crédito com estorno" : "crédito: registre o estorno na conferência abaixo"}</Badge>
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
                        <Link prefetch={false} href={linkParaLancarCompra(f.cartaoId, l)} className="text-[12px] text-[var(--color-accent2)] hover:underline" data-lancar-da-linha>
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
