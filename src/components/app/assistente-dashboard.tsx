"use client";

import { useEffect, useState } from "react";
import { variacoes, type AnaliseDoDashboard, type Instantaneo, type Variacao } from "@/lib/dashboard-analise";
import { brl0, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Faisca } from "@/components/app/assistente-funcionarios";

/**
 * Painel do assistente no Dashboard (Prompt AA, Parte 6).
 * SOMENTE LEITURA: recebe a análise pronta — feita sobre os números que a
 * tela já calculou — e só organiza e explica. Não chama action e não grava
 * dado nenhum. O único estado salvo é do navegador: recolher o painel e os
 * números da última visita (para "o que mudou").
 */
type Acao = "explicar" | "mudou" | "divergencia" | "atencao";

export function AssistenteDashboard({ usuario, analise }: { usuario: string; analise: AnaliseDoDashboard }) {
  const chave = `gt:assistente:dashboard:recolhido:${usuario}`;
  const chaveVisita = `gt:assistente:dashboard:ultima:${usuario}:${analise.recorte}`;
  const [recolhido, setRecolhido] = useState(false);
  const [aberta, setAberta] = useState<Acao | null>(null);
  const [anterior, setAnterior] = useState<{ em: string; valores: Instantaneo } | null | undefined>(undefined);
  useEffect(() => {
    try {
      setRecolhido(window.localStorage.getItem(chave) === "1");
    } catch {
      /* sem localStorage */
    }
  }, [chave]);
  // 6.1 · "o que mudou": lê a visita anterior DESTE recorte e guarda a de agora.
  useEffect(() => {
    let antes: { em: string; valores: Instantaneo } | null = null;
    try {
      const bruto = window.localStorage.getItem(chaveVisita);
      antes = bruto ? JSON.parse(bruto) : null;
      window.localStorage.setItem(chaveVisita, JSON.stringify({ em: new Date().toISOString(), valores: analise.instantaneo }));
    } catch {
      antes = null;
    }
    setAnterior(antes);
  }, [chaveVisita, analise.instantaneo]);
  const alternar = () => {
    const p = !recolhido;
    setRecolhido(p);
    try {
      window.localStorage.setItem(chave, p ? "1" : "0");
    } catch {
      /* preferência não persiste */
    }
  };
  if (recolhido) {
    return (
      <div className="flex justify-end">
        <button type="button" onClick={alternar} aria-expanded={false} aria-label="Abrir o assistente" className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[var(--color-line)] bg-white shadow-sm hover:bg-[var(--color-surface2)]">
          <Faisca />
        </button>
      </div>
    );
  }
  const toggle = (a: Acao) => setAberta(aberta === a ? null : a);
  const nada = (t: string) => <p className="text-[12px] text-[var(--color-ink2)]">{t}</p>;
  const mudou: Variacao[] | null = anterior ? variacoes(anterior.valores, analise.instantaneo) : null;
  const paineis = [...new Set(analise.explicacoes.map((e) => e.painel))];

  return (
    <aside aria-label="Assistente do Dashboard" data-assistente-dashboard className="w-full shrink-0 rounded-[16px] border border-[var(--color-line)] bg-white p-4 shadow-sm min-[1180px]:sticky min-[1180px]:top-20 min-[1180px]:w-[300px]">
      <div className="mb-3 flex items-start gap-2.5">
        <Faisca />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[15px] font-bold text-[var(--color-ink)]">
            Assistente IA
            <Badge tone="neutral">Somente leitura</Badge>
          </div>
          <div className="text-[12px] text-[var(--color-ink2)]">Dashboard · de onde vem cada número</div>
        </div>
        <button type="button" onClick={alternar} aria-expanded={true} aria-label="Recolher o assistente" title="Recolher" className="rounded-[8px] p-1 text-[var(--color-ink3)] hover:bg-[var(--color-surface2)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        {/* 6.3 — a primeira ação; ainda sem o catálogo de métricas (BAA-6). */}
        <Acao cor="#EEF0F4" cor2="#5B6475" d="M12 5v14M5 12h14" titulo="Montar outra análise" descricao="Indisponível: depende do catálogo de métricas (BAA-6) e da camada analítica do Prompt I, que ainda não existem." desabilitada aberta={false} onClick={() => {}}>
          {null}
        </Acao>

        <Acao cor="#E7EDFD" cor2="#2B5CD9" d="M12 8v.01M11 12h1v4h1M3.5 12a8.5 8.5 0 1 0 17 0 8.5 8.5 0 0 0-17 0z" titulo="Explicar o indicador" descricao="Fonte, cenário, regime e janela de cada cartão" aberta={aberta === "explicar"} onClick={() => toggle("explicar")}>
          <div className="space-y-2 text-[12px] text-[var(--color-ink2)]">
            {paineis.map((p) => (
              <div key={p}>
                <p className="font-medium text-[var(--color-ink)]">{p}</p>
                <ul className="mt-0.5 space-y-1">
                  {analise.explicacoes
                    .filter((e) => e.painel === p)
                    .map((e) => (
                      <li key={e.cartao}>
                        <span className="font-medium">{e.cartao}</span>: {e.texto}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
            {analise.definicaoNova && <p className="text-[11px] text-[var(--color-ink3)]">A definição nova do Dashboard está ligada nesta empresa.</p>}
          </div>
        </Acao>

        <Acao cor="#FFF4E0" cor2="#B7791F" d="M12 8v4l3 2M3.5 12a8.5 8.5 0 1 0 17 0 8.5 8.5 0 0 0-17 0z" titulo="O que mudou desde a última visita" descricao="Neste mesmo recorte de projetos, versões e período" contador={mudou?.length ?? 0} aberta={aberta === "mudou"} onClick={() => toggle("mudou")}>
          {anterior === undefined ? null : anterior === null ? (
            nada("Primeira visita neste recorte. Os números de agora ficam guardados no seu navegador para a próxima.")
          ) : mudou && mudou.length === 0 ? (
            nada(`Nada mudou desde ${new Date(anterior.em).toLocaleString("pt-BR")}.`)
          ) : (
            <div className="text-[12px] text-[var(--color-ink2)]">
              <p className="text-[11px] text-[var(--color-ink3)]">Desde {new Date(anterior.em).toLocaleString("pt-BR")}:</p>
              <ul className="mt-1 space-y-0.5">
                {mudou!.map((v) => (
                  <li key={v.rotulo}>
                    <span className="font-medium">{v.rotulo}</span>: {brl0(v.antes)} → {brl0(v.agora)}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] text-[var(--color-ink3)]">O assistente mostra o que mudou, não o porquê.</p>
            </div>
          )}
        </Acao>

        <Acao cor="#FDE6E9" cor2="#C0334A" d="M4 12h6M14 12h6M10 8l-4 4 4 4M14 8l4 4-4 4" titulo="Divergência entre cartões" descricao="Números que parecem dever bater e não batem" contador={analise.divergencias.length} aberta={aberta === "divergencia"} onClick={() => toggle("divergencia")}>
          {analise.divergencias.length === 0 ? (
            nada("Nenhuma divergência explicável pela composição dos cartões neste recorte.")
          ) : (
            <ul className="space-y-1.5 text-[12px] text-[var(--color-ink2)]">
              {analise.divergencias.map((d) => (
                <li key={d.titulo}>
                  <span className="font-medium text-[var(--color-ink)]">{d.titulo}</span>: {d.texto}
                </li>
              ))}
            </ul>
          )}
        </Acao>

        <Acao cor="#E3F6EC" cor2="#1F8A4C" d="M12 3l9 16H3L12 3zM12 10v4M12 17v.01" titulo="Projetos que merecem atenção" descricao="Conta vencida; o que não dá para medir, com o motivo" contador={analise.atencao.length} aberta={aberta === "atencao"} onClick={() => toggle("atencao")}>
          <div className="text-[12px] text-[var(--color-ink2)]">
            {analise.atencao.length === 0 ? (
              nada("Nenhum projeto do recorte com conta a pagar vencida.")
            ) : (
              <ul className="space-y-0.5">
                {analise.atencao.map((a) => (
                  <li key={a.obra}>
                    <span className="font-medium text-[var(--color-ink)]">{a.obra}</span>: {a.motivo}
                  </li>
                ))}
              </ul>
            )}
            <ul className="mt-1.5 space-y-0.5 text-[11px] text-[var(--color-ink3)]">
              {analise.atencaoLimites.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </Acao>
      </div>
      <p className="mt-3 text-[11px] text-[var(--color-ink3)]">
        Nada é alterado por este painel. Os números são os da tela. Só o seu navegador guarda a preferência de recolher e os números da última visita.
      </p>
    </aside>
  );
}

function Acao({ cor, cor2, d, titulo, descricao, contador = 0, desabilitada = false, aberta, onClick, children }: { cor: string; cor2: string; d: string; titulo: string; descricao: string; contador?: number; desabilitada?: boolean; aberta: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[11px] border border-[var(--color-line)]", aberta && !desabilitada && "bg-[var(--color-surface2)]")}>
      <button type="button" onClick={onClick} disabled={desabilitada} aria-expanded={aberta && !desabilitada} className="flex w-full items-center gap-2.5 rounded-[11px] p-2.5 text-left hover:bg-[var(--color-surface2)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent">
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px]" style={{ background: cor }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cor2} strokeWidth="1.9" aria-hidden>
            <path d={d} />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--color-ink)]">
            {titulo}
            {contador > 0 && <Badge tone="warning">{contador}</Badge>}
          </span>
          <span className="block text-[11.5px] leading-snug text-[var(--color-ink2)]">{descricao}</span>
        </span>
        {!desabilitada && (
          <span className="text-[var(--color-ink3)]" aria-hidden>
            {aberta ? "▾" : "›"}
          </span>
        )}
      </button>
      {aberta && !desabilitada && <div className="border-t border-[var(--color-line)] px-3 py-2.5">{children}</div>}
    </div>
  );
}
