"use client";

import { useEffect, useState } from "react";
import type { AnaliseDeContas } from "@/lib/contas-analise";
import { cn, brl0 } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * Painel do assistente de Contas Correntes (Prompt X, seção 7; Prompt E).
 * SOMENTE LEITURA: analisa o que a página carregou, em código puro
 * (`contas-analise.ts`). Nada vai a modelo.
 *
 * Nunca (7.2): cadastrar, alterar saldo, inativar ou excluir conta. O
 * usuário decide na tabela.
 */

type Acao = "naoConta" | "semMovimento" | "parado" | "auto";

const dataBR = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "nunca");

export function AssistenteContas({ usuario, analise }: { usuario: string; analise: AnaliseDeContas }) {
  const chave = `gt:assistente:contas:recolhido:${usuario}`;
  const [recolhido, setRecolhido] = useState(false);
  const [aberta, setAberta] = useState<Acao | null>(null);

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

  const { naoParecemConta, semMovimento, saldoParado, autoNaoConectada, total } = analise;
  const li = "text-[12px] text-[var(--color-ink2)]";
  const nome = "font-medium text-[var(--color-ink)]";
  const nada = (t: string) => <p className="text-[12px] text-[var(--color-ink2)]">{total === 0 ? "Nenhuma conta ativa." : t}</p>;
  const alternarAcao = (a: Acao) => setAberta(aberta === a ? null : a);

  return (
    <aside aria-label="Assistente de Contas Correntes" className="w-full shrink-0 rounded-[16px] border border-[var(--color-line)] bg-white p-4 shadow-sm min-[1180px]:sticky min-[1180px]:top-20 min-[1180px]:w-[300px]">
      <div className="mb-3 flex items-start gap-2.5">
        <Faisca />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[15px] font-bold text-[var(--color-ink)]">
            Assistente IA
            <Badge tone="neutral">Somente leitura</Badge>
          </div>
          <div className="text-[12px] text-[var(--color-ink2)]">Contas Correntes · {total} ativa(s)</div>
        </div>
        <button type="button" onClick={alternar} aria-expanded={true} aria-label="Recolher o assistente" title="Recolher" className="rounded-[8px] p-1 text-[var(--color-ink3)] hover:bg-[var(--color-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent2)]/40">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        <AcaoDoPainel cor="#FDE6E9" icone={<Icone cor="#C0334A" d="M12 9v4m0 4h.01M10.3 3.9L2.6 17a2 2 0 001.7 3h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />} titulo="Não parecem conta bancária" descricao="Sem agência ou sem número — a varredura que originou esta tarefa" contador={naoParecemConta.length} aberta={aberta === "naoConta"} onClick={() => alternarAcao("naoConta")}>
          {naoParecemConta.length === 0 ? nada("Toda conta ativa tem agência e número.") : (
            <ul className="space-y-1">
              {naoParecemConta.map((c) => (
                <li key={c.id} className={li}>
                  <span className={nome}>{c.banco}</span> · {c.motivo} · saldo {brl0(c.saldo)}. Saldo com sócio ou terceiro fica em Ressarcimentos; com histórico, inative em vez de excluir.
                </li>
              ))}
            </ul>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#FFF1DB" icone={<Icone cor="#B45309" d="M3 12h18M3 6h18M3 18h18" />} titulo="Contas sem movimento" descricao="Sem lançamento de caixa nos últimos 180 dias" contador={semMovimento.length} aberta={aberta === "semMovimento"} onClick={() => alternarAcao("semMovimento")}>
          {semMovimento.length === 0 ? nada("Toda conta ativa teve lançamento no período.") : (
            <ul className="space-y-1">
              {semMovimento.map((c) => (
                <li key={c.id} className={li}>
                  <span className={nome}>{c.banco}</span> · {c.lancamentos} lançamento(s) · último: {dataBR(c.ultimoLancamento)}
                </li>
              ))}
            </ul>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#EAE6FB" icone={<Icone cor="#6D4BD1" d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />} titulo="Saldo parado" descricao="Saldo não atualizado há mais de 90 dias, com a data da última alteração" contador={saldoParado.length} aberta={aberta === "parado"} onClick={() => alternarAcao("parado")}>
          {saldoParado.length === 0 ? nada("Todos os saldos foram atualizados nos últimos 90 dias.") : (
            <ul className="space-y-1">
              {saldoParado.map((c) => (
                <li key={c.id} className={li}>
                  <span className={nome}>{c.banco}</span> · {brl0(c.saldo)} · última alteração: {dataBR(c.lastSync)}{c.dias != null ? ` (${c.dias} dias)` : ""}
                </li>
              ))}
            </ul>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#E6F4EA" icone={<Icone cor="#1E7A3C" d="M8 12h8M12 8v8M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />} titulo="Automáticas sem conexão" descricao="Marcadas como automáticas e não conectadas" contador={autoNaoConectada.length} aberta={aberta === "auto"} onClick={() => alternarAcao("auto")}>
          {autoNaoConectada.length === 0 ? nada("Nenhuma conta promete atualização automática sem conexão.") : (
            <ul className="space-y-1">
              {autoNaoConectada.map((c) => (
                <li key={c.id} className={li}>
                  <span className={nome}>{c.banco}</span>: o saldo só muda pelo extrato subido no Caixa; mude para Manual ou conecte o Open Finance.
                </li>
              ))}
            </ul>
          )}
        </AcaoDoPainel>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-[var(--color-ink3)]">
        Somente leitura: analisa o que a tela carregou, em código puro. Não cadastra, não altera saldo, não inativa nem exclui conta.
      </p>
    </aside>
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
