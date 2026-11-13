"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AnaliseDoCaixa } from "@/lib/caixa-analise";
import { linkParaLancar } from "@/lib/caixa-encaminhamento";
import { conciliarMovimento } from "@/lib/actions/caixa";
import { cn, brl0, dateBR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Painel do assistente do Caixa (Prompt L, Parte 8-A; Prompt E).
 * ELE PROPÕE, VOCÊ CONFIRMA (8-A.8): as sugestões vêm de código puro
 * (`caixa-analise.ts`) sobre o que a página carregou; nada vai a modelo.
 * O único caminho de escrita é a confirmação da pessoa, par a par ou em
 * bloco das inequívocas — pela mesma `conciliarMovimento` do revisor, com
 * rastro. Não há "confiar em todas" (8-A.1).
 *
 * Nunca (8-A.7): concilia sozinho, dá baixa, lança ajuste, altera valor de
 * despesa ou movimento do extrato. O painel não tem botão de ajuste.
 */

type Acao = "pares" | "grupos" | "diferenca" | "cadastrar" | "analises";

const diaBR = (iso: string) => iso.split("-").reverse().join("/");

export function AssistenteCaixa({ usuario, projectId, analise, canConciliar }: { usuario: string; projectId: string; analise: AnaliseDoCaixa; canConciliar: boolean }) {
  const chave = `gt:assistente:caixa:recolhido:${usuario}`;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [recolhido, setRecolhido] = useState(false);
  const [aberta, setAberta] = useState<Acao | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    try {
      setRecolhido(window.localStorage.getItem(chave) === "1");
    } catch {
      /* sem localStorage: fica expandido */
    }
  }, [chave]);

  const alternar = () => {
    const proximo = !recolhido;
    setRecolhido(proximo);
    try {
      window.localStorage.setItem(chave, proximo ? "1" : "0");
    } catch {
      /* preferência não persiste */
    }
  };

  if (recolhido) {
    return (
      <aside className="shrink-0 min-[1180px]:sticky min-[1180px]:top-20">
        <button type="button" onClick={alternar} aria-expanded={false} aria-label="Abrir o assistente" title="Abrir o assistente" className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[var(--color-line)] bg-white shadow-sm hover:bg-[var(--color-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent2)]/40">
          <Faisca />
        </button>
      </aside>
    );
  }

  const { pares, agrupamentos, explicacoes, encaminhamentos, diasQueNaoFecham, conciliadoSemVinculo, baixadoSemConciliar, extratoNaoImportado, diasNaoFechados, recorrencias } = analise;
  const inequivocos = pares.filter((p) => p.inequivoco);
  const li = "text-[12px] text-[var(--color-ink2)]";
  const nome = "font-medium text-[var(--color-ink)]";
  const alternarAcao = (a: Acao) => setAberta(aberta === a ? null : a);
  const totalAnalises = diasQueNaoFecham.length + conciliadoSemVinculo.reduce((a, x) => a + x.quantidade, 0) + (baixadoSemConciliar.despesas > 0 ? 1 : 0) + extratoNaoImportado.length + diasNaoFechados.length + recorrencias.length;

  /** confirmação humana: um par, ou o bloco das inequívocas (8-A.2). */
  const confirmar = (itens: { cashEntryId: string; despesaId: string; valorVinculo: number }[]) => {
    setErro(null);
    setMsg(null);
    start(async () => {
      let ok = 0;
      for (const it of itens) {
        const r = await conciliarMovimento({ cashEntryId: it.cashEntryId, itens: [{ despesaId: it.despesaId, valor: it.valorVinculo }] });
        if (!r.ok) {
          setErro(r.error);
          break;
        }
        ok++;
      }
      if (ok > 0) setMsg(`${ok} vínculo(s) gravado(s) com a sua confirmação.`);
      router.refresh();
    });
  };
  const grauTone = (g: "alta" | "media" | "baixa") => (g === "alta" ? "success" : g === "media" ? "warning" : "neutral");

  return (
    <aside aria-label="Assistente do Caixa" className="w-full shrink-0 rounded-[16px] border border-[var(--color-line)] bg-white p-4 shadow-sm min-[1180px]:sticky min-[1180px]:top-20 min-[1180px]:w-[320px]">
      <div className="mb-3 flex items-start gap-2.5">
        <Faisca />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[15px] font-bold text-[var(--color-ink)]">
            Assistente IA
            <Badge tone="neutral">Propõe, você confirma</Badge>
          </div>
          <div className="text-[12px] text-[var(--color-ink2)]">Caixa · {pares.length} par(es) proposto(s)</div>
        </div>
        <button type="button" onClick={alternar} aria-expanded={true} aria-label="Recolher o assistente" title="Recolher" className="rounded-[8px] p-1 text-[var(--color-ink3)] hover:bg-[var(--color-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent2)]/40">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      {msg && <p role="status" className="mb-2 rounded-[8px] bg-[var(--color-success)]/10 px-2 py-1 text-[11.5px] text-[var(--color-success)]">{msg}</p>}
      {erro && <p role="alert" className="mb-2 rounded-[8px] bg-[var(--color-danger)]/10 px-2 py-1 text-[11.5px] text-[var(--color-danger)]">{erro}</p>}

      <div className="space-y-2">
        <AcaoDoPainel cor="#E6F4EA" icone={<Icone cor="#1E7A3C" d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />} titulo="Pares propostos" descricao="Saída do extrato × conta a pagar, por valor, data, histórico e fornecedor — com grau e motivo" contador={pares.length} aberta={aberta === "pares"} onClick={() => alternarAcao("pares")}>
          {pares.length === 0 ? <p className={li}>Nenhuma saída do extrato pendente com candidata. Nada a propor.</p> : (
            <>
              {canConciliar && inequivocos.length > 0 && (
                <Button size="sm" variant="outline" className="mb-2" disabled={pending} onClick={() => confirmar(inequivocos)}>
                  Confirmar as {inequivocos.length} inequívoca(s)
                </Button>
              )}
              <ul className="space-y-1.5">
                {pares.map((p) => (
                  <li key={p.cashEntryId} className={li}>
                    <span className={nome}>{dateBR(p.data)} · {brl0(Math.abs(p.valor))}</span> {p.descricao ? `· ${p.descricao}` : ""}
                    <div>
                      → {p.numDoc ?? "despesa"} {p.fornecedor ? `· ${p.fornecedor}` : ""} · vínculo {brl0(p.valorVinculo)} <Badge tone={grauTone(p.grau)}>{p.grau}</Badge> <span className="text-[var(--color-ink3)]">{p.motivo}</span>
                      {p.inequivoco && <Badge tone="success" className="ml-1">inequívoco</Badge>}
                    </div>
                    {canConciliar && (
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => confirmar([p])}>
                        Confirmar este par
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#EAE6FB" icone={<Icone cor="#6D4BD1" d="M4 6h16M4 12h16M4 18h10" />} titulo="Agrupamentos" descricao="Um movimento que corresponde a várias despesas do mesmo fornecedor — a soma e a diferença" contador={agrupamentos.length} aberta={aberta === "grupos"} onClick={() => alternarAcao("grupos")}>
          {agrupamentos.length === 0 ? <p className={li}>Nenhum movimento pendente parece somar várias despesas de um fornecedor.</p> : (
            <ul className="space-y-1.5">
              {agrupamentos.map((g) => (
                <li key={g.cashEntryId} className={li}>
                  <span className={nome}>{dateBR(g.data)} · {brl0(Math.abs(g.valor))}</span> → {g.despesas.length} despesas de {g.fornecedor}: {g.despesas.map((d) => `${d.numDoc ?? "s/ nº"} ${brl0(d.saldo)}`).join(", ")} · soma {brl0(g.soma)}
                  {Math.abs(g.diferenca) > 0.005 ? <span className="text-[var(--color-danger)]"> · diferença {brl0(g.diferenca)}</span> : <span className="text-[var(--color-success)]"> · fecha</span>}
                  <div className="text-[var(--color-ink3)]">Confirme no revisor, informando o valor de cada vínculo.</div>
                </li>
              ))}
            </ul>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#FDE6E9" icone={<Icone cor="#C0334A" d="M12 9v4m0 4h.01M10.3 3.9L2.6 17a2 2 0 001.7 3h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />} titulo="Diferença do dia" descricao="Por que os dois saldos não batem — as linhas, nas quatro naturezas" contador={explicacoes.length} aberta={aberta === "diferenca"} onClick={() => alternarAcao("diferenca")}>
          {explicacoes.length === 0 ? <p className={li}>Nos dias realizados da faixa, os dois saldos coincidem.</p> : (
            <ul className="space-y-1.5">
              {explicacoes.map((e) => (
                <li key={e.dia} className={li}>
                  <span className={nome}>{e.frase}</span>
                  <ul className="mt-0.5 space-y-0.5 text-[11px] text-[var(--color-ink3)]">
                    {e.linhas.slice(0, 8).map((l) => (
                      <li key={l.id}>{dateBR(l.data)} · {brl0(l.valor)} · {l.rotulo}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#FFF1DB" icone={<Icone cor="#B45309" d="M12 5v14M5 12h14" />} titulo="Falta cadastrar" descricao="Movimento do extrato sem contraparte: o que parece ser e o caminho para lançar na tela certa" contador={encaminhamentos.length} aberta={aberta === "cadastrar"} onClick={() => alternarAcao("cadastrar")}>
          {encaminhamentos.length === 0 ? <p className={li}>Toda saída pendente tem pelo menos uma candidata.</p> : (
            <ul className="space-y-1.5">
              {encaminhamentos.map((m) => {
                const l = linkParaLancar({ id: m.cashEntryId, data: m.data, descricao: m.descricao, valor: m.valor }, projectId);
                return (
                  <li key={m.cashEntryId} className={li}>
                    <span className={nome}>{dateBR(m.data)} · {brl0(Math.abs(m.valor))}</span> {m.descricao ? `· ${m.descricao}` : ""}
                    <div className="text-[var(--color-ink3)]">{m.parece ? `Parece: ${m.parece}.` : "Sem pista no histórico nem nas contas abertas."}</div>
                    <Link href={l.href} className="text-[var(--color-accent2)] hover:underline">Lançar em {l.destino} com estes dados →</Link>
                  </li>
                );
              })}
            </ul>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#E8F1FB" icone={<Icone cor="#2563EB" d="M3 3v18h18M7 14l4-4 4 4 5-6" />} titulo="Análises" descricao="Dias que não fecham, conciliado sem vínculo, baixado sem conciliar, extrato não importado, dias não fechados, recorrência" contador={totalAnalises} aberta={aberta === "analises"} onClick={() => alternarAcao("analises")}>
          <div className="space-y-2">
            <Bloco titulo="Dias que não fecham (do mais antigo)">
              {diasQueNaoFecham.length === 0 ? <p className={li}>Nenhum na faixa.</p> : diasQueNaoFecham.map((d) => <p key={d.dia} className={li}>{diaBR(d.dia)} · diferença {brl0(d.diferenca)} · {d.pendentes} linha(s) a resolver</p>)}
            </Bloco>
            <Bloco titulo="Conciliado sem vínculo (BL-2), por mês">
              {conciliadoSemVinculo.length === 0 ? <p className={li}>Nenhum neste projeto.</p> : conciliadoSemVinculo.map((m) => <p key={m.mes} className={li}>{m.mes.split("-").reverse().join("/")} · {m.quantidade} movimento(s) · {brl0(m.valor)}</p>)}
            </Bloco>
            <Bloco titulo="Baixado e não conciliado">
              <p className={li}>{baixadoSemConciliar.despesas === 0 ? "Nenhum pagamento sem vínculo com extrato." : `${brl0(baixadoSemConciliar.total)} em ${baixadoSemConciliar.despesas} despesa(s)${baixadoSemConciliar.dias != null ? ` · o mais antigo há ${baixadoSemConciliar.dias} dias` : ""}.`}</p>
            </Bloco>
            <Bloco titulo="Extrato não importado">
              {extratoNaoImportado.length === 0 ? <p className={li}>Todas as contas foram atualizadas nos últimos dias.</p> : extratoNaoImportado.map((c) => <p key={c.id} className={li}><span className={nome}>{c.nome}</span> · {c.dias == null ? "nunca atualizada" : `há ${c.dias} dias`} — a causa mais comum de divergência.</p>)}
            </Bloco>
            <Bloco titulo="Dias não fechados">
              {diasNaoFechados.length === 0 ? <p className={li}>Nenhum dia conciliado sem fechamento, nem buraco na cadeia.</p> : diasNaoFechados.map((d) => <p key={d.dia} className={li}>{diaBR(d.dia)} · {d.motivo}</p>)}
            </Bloco>
            <Bloco titulo="Padrão de recorrência">
              {recorrencias.length === 0 ? <p className={li}>Nenhum movimento se repete em três meses ou mais.</p> : recorrencias.slice(0, 6).map((r) => <p key={r.chave} className={li}><span className={nome}>{r.descricao}</span> · {brl0(r.valorMedio)} · {r.meses.length} meses · último {r.ultimaData ? diaBR(r.ultimaData) : "—"}</p>)}
            </Bloco>
          </div>
        </AcaoDoPainel>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-[var(--color-ink3)]">
        Ele propõe, você confirma: o vínculo só existe depois do seu clique, com rastro. O assistente nunca concilia sozinho, não dá baixa, não lança ajuste e não altera despesa nem movimento do extrato.
      </p>
    </aside>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink4)]">{titulo}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Icone({ cor, d }: { cor: string; d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="1.9" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function AcaoDoPainel({ cor, icone, titulo, descricao, contador, aberta, onClick, children }: { cor: string; icone: React.ReactNode; titulo: string; descricao: string; contador: number; aberta: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[11px] border border-[var(--color-line)]", aberta && "bg-[var(--color-surface2)]")}>
      <button type="button" onClick={onClick} aria-expanded={aberta} className="flex w-full items-center gap-2.5 rounded-[11px] p-2.5 text-left hover:bg-[var(--color-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent2)]/40">
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px]" style={{ background: cor }}>
          {icone}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--color-ink)]">
            {titulo}
            {contador > 0 && <Badge tone="danger">{contador}</Badge>}
          </span>
          <span className="block text-[11.5px] leading-snug text-[var(--color-ink2)]">{descricao}</span>
        </span>
        <span className="text-[var(--color-ink3)]" aria-hidden>
          {aberta ? "▾" : "›"}
        </span>
      </button>
      {aberta && <div className="border-t border-[var(--color-line)] px-3 py-2.5">{children}</div>}
    </div>
  );
}

function Faisca() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7L12 3z" fill="#6D4BD1" />
      <path d="M18.5 15l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3z" fill="#3B82F6" />
    </svg>
  );
}
