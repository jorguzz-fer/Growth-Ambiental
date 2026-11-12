"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { conciliarMovimento, desfazerConciliacao, conciliarContaReceber, criarContaAPartirDoExtrato, conciliarParcelaDeVenda } from "@/lib/actions/caixa";
import { conciliarPagamentoDeFatura } from "@/lib/actions/cartao-conciliacao";
import { useCris } from "@/components/app/cris-contexto";
import type { MovimentoPendente, MovimentoPendenteEntrada, MovimentoConciliado } from "@/lib/queries";
import { brl0, dateBR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { linkParaLancar } from "@/lib/caixa-encaminhamento";

/**
 * Revisão da conciliação (Prompt L, Parte 2): para cada saída do extrato, as
 * contas a pagar compatíveis (o grau é só orientação) — o usuário escolhe
 * uma ou várias, com o VALOR de cada vínculo (2.2/2.3), e a soma não pode
 * exceder o movimento (2.4). A conciliação só conclui quando os vínculos
 * somam o movimento (3.1); enquanto não soma, o movimento continua aqui,
 * com o que já foi vinculado. Nada é conciliado sem confirmação. Desfazer
 * exige permissão própria (5.1) e pede o motivo (5.4).
 */
const grauTone = (g: "alta" | "media" | "baixa") => (g === "alta" ? "success" : g === "media" ? "warning" : "neutral");
const grauLabel = (g: "alta" | "media" | "baixa") => (g === "alta" ? "alta compatibilidade" : g === "media" ? "média" : "baixa");

export function ConciliacaoReview({ pendentes, pendentesEntrada, conciliados, canDesfazer, projectId = "", projetos }: { pendentes: MovimentoPendente[]; pendentesEntrada: MovimentoPendenteEntrada[]; conciliados: MovimentoConciliado[]; canDesfazer: boolean; projectId?: string; /** Prompt AT §3: Caixa por conta — a obra da conta criada a partir do movimento. */ projetos?: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  /** valores escolhidos por movimento → despesa (string para o input). */
  const [valores, setValores] = useState<Record<string, Record<string, string>>>({});
  const valorDe = (mov: string, desp: string, padrao: number) => valores[mov]?.[desp] ?? String(padrao);
  const setValor = (mov: string, desp: string, v: string) => setValores((s) => ({ ...s, [mov]: { ...(s[mov] ?? {}), [desp]: v } }));

  const run = (fn: () => Promise<void>, ok: string) => {
    setErro(null);
    setMsg(null);
    start(async () => {
      try {
        await fn();
        if (ok) setMsg(ok);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha na operação.");
      }
    });
  };
  const conciliarUm = (m: MovimentoPendente, despesaId: string, valor: number) =>
    run(async () => {
      const r = await conciliarMovimento({ cashEntryId: m.cashEntryId, itens: [{ despesaId, valor }] });
      if (!r.ok) throw new Error(r.error);
      setMsg(r.concluida ? "Movimento conciliado: os vínculos somam o valor dele." : `Vínculo gravado (${brl0(r.soma)} de ${brl0(Math.abs(m.valor))}). A conciliação só conclui quando os vínculos somarem o movimento.`);
    }, "");
  const conciliarVarios = (m: MovimentoPendente) =>
    run(async () => {
      const itens = m.sugestoes.map((s) => ({ despesaId: s.despesaId, valor: Number(valorDe(m.cashEntryId, s.despesaId, 0)) || 0 })).filter((i) => i.valor > 0);
      const r = await conciliarMovimento({ cashEntryId: m.cashEntryId, itens });
      if (!r.ok) throw new Error(r.error);
      setMsg(r.concluida ? `Movimento conciliado com ${itens.length} despesa(s).` : `${itens.length} vínculo(s) gravado(s) (${brl0(r.soma)} de ${brl0(Math.abs(m.valor))}); a conciliação só conclui quando a soma fechar.`);
    }, "");
  const conciliarReceber = (cashEntryId: string, contaReceberId: string) => run(() => conciliarContaReceber({ cashEntryId, contaReceberId }), "Movimento conciliado: conta a receber marcada como recebida.");
  // Prompt AT §3: o movimento da conta não tem obra; a conta criada vai para a obra escolhida aqui.
  const [obraDaConta, setObraDaConta] = useState<Record<string, string>>({});
  const criarConta = (cashEntryId: string, entrada: boolean) =>
    run(async () => {
      const projectId = projetos ? obraDaConta[cashEntryId] || null : undefined;
      let r = await criarContaAPartirDoExtrato({ cashEntryId, projectId });
      // Prompt AT §5.4 — há parcela de venda compatível: mostra a parcela e pede
      // a confirmação explícita de que a entrada NÃO é ela.
      if (!r.ok && r.parcelas?.length) {
        const lista = r.parcelas.map((p) => `• ${p.unidade} · ${p.rotulo} · ${p.comprador ?? "sem comprador"} · ${brl0(p.saldo)} (venc. ${dateBR(p.vencimento)})`).join("\n");
        const naoE = window.confirm(`${r.error}\n\n${lista}\n\nConfirmo que esta entrada NÃO é nenhuma dessas parcelas?`);
        if (!naoE) {
          setMsg("Nada foi criado. Concilie a entrada com a parcela na lista acima.");
          return;
        }
        r = await criarContaAPartirDoExtrato({ cashEntryId, projectId, naoEParcela: true });
      }
      if (!r.ok) throw new Error(r.error);
      setMsg(entrada ? "Conta a receber criada a partir do extrato." : "Conta a pagar criada a partir do extrato.");
    }, "");
  const conciliarParcela = (cashEntryId: string, p: { unitId: string; chave: string }) =>
    run(async () => {
      const r = await conciliarParcelaDeVenda({ cashEntryId, unitId: p.unitId, chave: p.chave });
      if (!r.ok) throw new Error(r.error);
      setMsg(r.concluida ? `Entrada conciliada com a parcela (${brl0(r.valor)}).` : `Recebimento parcial gravado (${brl0(r.valor)}); a entrada ainda tem valor a conciliar.`);
    }, "");
  const escolherObra = (cashEntryId: string) =>
    projetos ? (
      <select
        value={obraDaConta[cashEntryId] ?? ""}
        onChange={(e) => setObraDaConta((s) => ({ ...s, [cashEntryId]: e.target.value }))}
        className="h-8 rounded-[8px] border border-[var(--color-line)] bg-white px-2 text-xs"
        aria-label="Obra da conta criada"
      >
        <option value="">Obra da conta…</option>
        {projetos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </select>
    ) : null;
  // Prompt AT §8.1 — "Perguntar à Cris": abre o chat já com o movimento; ela busca os candidatos do servidor.
  const cris = useCris();
  const perguntarACris = (m: { cashEntryId: string; data: string | null; descricao: string | null; valor: number }) =>
    cris ? (
      <button
        type="button"
        className="text-[12px] text-[var(--color-accent2)] hover:underline"
        data-perguntar-cris={m.cashEntryId}
        onClick={() => cris.perguntar(`Concilie o movimento ${m.cashEntryId}: ${m.data ? dateBR(m.data) : "sem data"} · ${m.descricao ?? "sem descrição"} · ${brl0(m.valor)}. Use os candidatos do servidor e me pergunte se tiver dúvida; se não houver par, diga o que falta lançar.`)}
      >
        Perguntar à Cris
      </button>
    ) : null;
  const desfazer = (c: MovimentoConciliado) => {
    const motivo = window.prompt("Motivo para desfazer a conciliação (fica na auditoria):", "");
    if (motivo === null) return;
    run(() => desfazerConciliacao(c.cashEntryId, motivo), "Conciliação desfeita: o movimento do extrato foi preservado e a despesa voltou ao status derivado.");
  };

  return (
    <div className="space-y-4">
      {erro && <p className="text-xs text-[var(--color-danger)]" role="alert">{erro}</p>}
      {msg && <p className="text-xs text-[var(--color-success)]" role="status">{msg}</p>}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">
          Movimentos do extrato a conciliar <span className="font-normal text-[var(--color-ink3)]">({pendentes.length})</span>
        </h3>
        <p className="text-[12px] text-[var(--color-ink3)]">
          Para cada saída do extrato, sugerimos as contas a pagar mais compatíveis (o grau é só orientação). Escolha uma ou várias, com o valor de cada vínculo — um pagamento pode quitar várias despesas. A soma não pode passar do movimento, e a conciliação só conclui quando a soma fechar. Nada é conciliado sem a sua confirmação.
        </p>
        {pendentes.length === 0 && <p className="py-6 text-center text-sm text-[var(--color-ink4)]">Nenhuma saída do extrato pendente de conciliação.</p>}
        {pendentes.map((m) => {
          const falta = Math.round((Math.abs(m.valor) - m.vinculado) * 100) / 100;
          return (
            <Card key={m.cashEntryId}>
              <CardContent className="p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">{m.data ? dateBR(m.data) : "—"}</span>
                    <span className="text-[var(--color-ink)]">{m.descricao ?? "—"}</span>
                    {m.doc && <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink4)]">doc {m.doc}</span>}
                    {m.vinculado > 0 && <Badge tone="warning">parcial: {brl0(m.vinculado)} vinculado · falta {brl0(falta)}</Badge>}
                  </div>
                  <span className="font-[family-name:var(--font-mono)] text-[13px] font-semibold text-[var(--color-danger)]">−{brl0(Math.abs(m.valor))}</span>
                </div>
                {m.sugestoes.length === 0 ? (
                  <p className="text-[12px] text-[var(--color-ink4)]">Sem contas a pagar compatíveis. Lance a despesa em Despesas — já com data, valor e histórico do extrato — ou mantenha pendente.</p>
                ) : (
                  <div className="divide-y divide-[var(--color-accent2)]/8 rounded-[8px] border border-[var(--color-accent2)]/12">
                    {m.sugestoes.map((s) => {
                      const padrao = Math.min(falta, Math.abs(s.valor));
                      return (
                        <div key={s.despesaId} className="flex flex-wrap items-center gap-2 px-3 py-2">
                          <Badge tone={grauTone(s.grau)}>{grauLabel(s.grau)}</Badge>
                          <span className="text-[13px] text-[var(--color-ink)]">{s.fornecedor ?? "—"}</span>
                          <span className="text-[12px] text-[var(--color-ink3)]">{s.descricao ?? s.numDoc ?? ""}</span>
                          <span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-ink2)]">{brl0(Math.abs(s.valor))}</span>
                          {s.vencimento && <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink4)]">venc. {dateBR(s.vencimento)}</span>}
                          <span className="ml-auto flex items-center gap-1.5">
                            <Input type="number" step="0.01" min="0" value={valorDe(m.cashEntryId, s.despesaId, padrao)} onChange={(e) => setValor(m.cashEntryId, s.despesaId, e.target.value)} aria-label={`Valor do vínculo com ${s.numDoc ?? s.despesaId}`} className="h-8 w-28 text-right font-[family-name:var(--font-mono)] text-xs" />
                            <Button size="sm" onClick={() => conciliarUm(m, s.despesaId, Number(valorDe(m.cashEntryId, s.despesaId, padrao)) || 0)} disabled={pending}>
                              Conciliar
                            </Button>
                          </span>
                        </div>
                      );
                    })}
                    {m.sugestoes.length > 1 && (
                      <div className="flex items-center justify-between gap-2 px-3 py-2 text-[11.5px] text-[var(--color-ink3)]">
                        <span>Várias despesas num só movimento: ajuste os valores acima e vincule todas de uma vez (as com valor zero ficam de fora).</span>
                        <Button size="sm" variant="outline" onClick={() => conciliarVarios(m)} disabled={pending}>
                          Vincular todas com valor
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {/* Prompt AT §6.4 — a saída da fatura do cartão concilia com o pagamento da fatura. */}
                {(m.faturas ?? []).length > 0 && (
                  <div className="mt-2 divide-y divide-[var(--color-line)] rounded-[8px] border border-[var(--color-line)]" data-sugestao-fatura>
                    {(m.faturas ?? []).map((f) => (
                      <div key={f.faturaPagamentoId} className="flex flex-wrap items-center gap-2 px-3 py-2 text-[12.5px]">
                        <Badge tone={grauTone(f.grau)}>{grauLabel(f.grau)}</Badge>
                        <span>Pagamento da fatura do cartão {f.cartao} (venc. {dateBR(f.vencimento)}), registrado em {dateBR(f.data)}</span>
                        <span className="font-[family-name:var(--font-mono)]">{brl0(f.valor)}</span>
                        <Button
                          size="sm"
                          className="ml-auto"
                          disabled={pending}
                          onClick={() =>
                            run(async () => {
                              const r = await conciliarPagamentoDeFatura({ cashEntryId: m.cashEntryId, faturaPagamentoId: f.faturaPagamentoId });
                              if (!r.ok) throw new Error(r.error);
                            }, "Saída conciliada com o pagamento da fatura. Nenhuma saída nova: a linha do extrato passou a ser a saída do pagamento.")
                          }
                        >
                          Conciliar com o pagamento da fatura
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {/* Prompt L, 3-A.2 / 7.2 — encaminhar: o lançamento acontece em Despesas, com os dados do extrato; o movimento fica reservado e é conciliado ao gravar. */}
                  {perguntarACris(m)}
                  <Link href={linkParaLancar({ id: m.cashEntryId, data: m.data, descricao: m.descricao, valor: m.valor }, projectId).href} className="text-[12px] text-[var(--color-accent2)] hover:underline">
                    Lançar em Despesas com estes dados →
                  </Link>
                  {escolherObra(m.cashEntryId)}
                  <Button variant="ghost" size="sm" onClick={() => criarConta(m.cashEntryId, false)} disabled={pending}>
                    Converter em conta a pagar (já paga)
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">
          Entradas do extrato a conciliar <span className="font-normal text-[var(--color-ink3)]">({pendentesEntrada.length})</span>
        </h3>
        <p className="text-[12px] text-[var(--color-ink3)]">Para cada entrada, as contas a receber compatíveis. O recebimento é gravado com valor (Prompt K): um depósito pode quitar várias parcelas.</p>
        {pendentesEntrada.length === 0 && <p className="py-6 text-center text-sm text-[var(--color-ink4)]">Nenhuma entrada do extrato pendente.</p>}
        {pendentesEntrada.map((m) => (
          <Card key={m.cashEntryId}>
            <CardContent className="p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">{m.data ? dateBR(m.data) : "—"}</span>
                  <span className="text-[var(--color-ink)]">{m.descricao ?? "—"}</span>
                  {m.doc && <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink4)]">doc {m.doc}</span>}
                </div>
                <span className="font-[family-name:var(--font-mono)] text-[13px] font-semibold text-[var(--color-success)]">+{brl0(Math.abs(m.valor))}</span>
              </div>
              {m.livre != null && <p className="mb-1 text-[12px] text-[var(--color-ink3)]">Falta conciliar {brl0(m.livre)} desta entrada.</p>}
              {/* Prompt AT §5.2 — a parcela do comprador, pela chave estável do plano. */}
              {(m.parcelas ?? []).length > 0 && (
                <div className="mb-2 divide-y divide-[var(--color-accent2)]/8 rounded-[8px] border border-[var(--color-accent2)]/12" data-sugestao-parcela>
                  {(m.parcelas ?? []).map((p) => (
                    <div key={`${p.unitId}|${p.chave}`} className="flex flex-wrap items-center gap-2 px-3 py-2">
                      <Badge tone={grauTone(p.grau)}>{grauLabel(p.grau)}</Badge>
                      <span className="text-[13px] text-[var(--color-ink)]">Parcela de venda · {p.rotulo}</span>
                      <span className="text-[12px] text-[var(--color-ink3)]">{p.comprador ?? "sem comprador"} · {p.projectName} · venc. {dateBR(p.vencimento)}</span>
                      <span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-ink2)]">{brl0(p.saldo)}</span>
                      <Button size="sm" className="ml-auto" onClick={() => conciliarParcela(m.cashEntryId, p)} disabled={pending}>
                        Conciliar com a parcela
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {m.sugestoes.length === 0 ? (
                <p className="text-[12px] text-[var(--color-ink4)]">Sem contas a receber compatíveis. Lance em Contas a Receber ou mantenha pendente.</p>
              ) : (
                <div className="divide-y divide-[var(--color-accent2)]/8 rounded-[8px] border border-[var(--color-accent2)]/12">
                  {m.sugestoes.map((s) => (
                    <div key={s.contaReceberId} className="flex flex-wrap items-center gap-2 px-3 py-2">
                      <Badge tone={grauTone(s.grau)}>{grauLabel(s.grau)}</Badge>
                      <span className="text-[13px] text-[var(--color-ink)]">{s.descricao ?? "—"}</span>
                      <span className="text-[12px] text-[var(--color-ink3)]">{s.projectName}</span>
                      <span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-ink2)]">{brl0(Math.abs(s.valor))}</span>
                      <Button size="sm" className="ml-auto" onClick={() => conciliarReceber(m.cashEntryId, s.contaReceberId)} disabled={pending}>
                        Conciliar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {perguntarACris(m)}
                <Link href={linkParaLancar({ id: m.cashEntryId, data: m.data, descricao: m.descricao, valor: m.valor }, projectId).href} className="text-[12px] text-[var(--color-accent2)] hover:underline">
                  Lançar em Contas a Receber com estes dados →
                </Link>
                {escolherObra(m.cashEntryId)}
                <Button variant="ghost" size="sm" onClick={() => criarConta(m.cashEntryId, true)} disabled={pending}>
                  Converter em conta a receber (já recebida)
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {conciliados.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">
            Conciliados <span className="font-normal text-[var(--color-ink3)]">({conciliados.length})</span>
          </h3>
          <div className="overflow-x-auto rounded-[8px] border border-[var(--color-accent2)]/12">
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--color-surface2)] text-left text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
                <tr>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Movimento</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2">Vínculos</th>
                  <th className="px-3 py-2">Por / quando</th>
                  {canDesfazer && <th className="px-3 py-2 text-right">Ação</th>}
                </tr>
              </thead>
              <tbody>
                {conciliados.map((c) => (
                  <tr key={c.cashEntryId} className="border-t border-[var(--color-accent2)]/8">
                    <td className="px-3 py-2 font-[family-name:var(--font-mono)]">{c.data ? dateBR(c.data) : "—"}</td>
                    <td className="px-3 py-2">{c.descricao ?? "—"}</td>
                    <td className={`px-3 py-2 text-right font-[family-name:var(--font-mono)] ${c.valor < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"}`}>{brl0(c.valor)}</td>
                    <td className="px-3 py-2">
                      {c.semVinculo ? (
                        <Badge tone="warning" title="Marcado como conciliado sem registro de com o quê casou (BL-2). Regularize vinculando uma despesa ou desfazendo.">conciliado sem vínculo</Badge>
                      ) : c.vinculos.length > 0 ? (
                        <ul className="space-y-0.5">
                          {c.vinculos.map((v) => (
                            <li key={v.despesaId + v.valor} className="text-[11.5px]">
                              {v.numDoc ?? "sem PED"} · {v.fornecedor ?? "—"} · <span className="font-[family-name:var(--font-mono)]">{brl0(v.valor)}</span> {v.origem === "importacao" && <Badge tone="neutral">importação</Badge>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-[11.5px]">{c.despesaNumDoc ?? "—"} · {c.fornecedor ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-[var(--color-ink3)]">
                      {c.conciliadoPor ?? "—"}
                      {c.conciliadoEm ? ` · ${c.conciliadoEm.slice(0, 10).split("-").reverse().join("/")}` : ""}
                    </td>
                    {canDesfazer && (
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => desfazer(c)} disabled={pending} className="text-[12px] text-[var(--color-danger)] hover:underline disabled:opacity-50">
                          Desfazer
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[var(--color-ink4)]">Desfazer preserva o movimento do extrato; o que se desfaz é o vínculo. Exige a permissão própria de desfazer conciliação.</p>
        </section>
      )}
    </div>
  );
}
