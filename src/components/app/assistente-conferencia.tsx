"use client";

import { useEffect, useState } from "react";
import type { AnaliseDaConferencia } from "@/lib/conferencia-analise";
import { TEXTO_SEM_PENDENCIA } from "@/lib/conferencia-analise";
import { TEXTO_MOTIVO } from "@/lib/conferencia-regras";
import { brl0, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Faisca } from "@/components/app/assistente-funcionarios";

/**
 * Painel do assistente na Conferência de lançamentos (Prompt AN, Parte 7).
 * SOMENTE LEITURA: agrupa, mede e data o que a tela já lista. Não
 * reclassifica, não propõe categoria de lançamento nenhum e não diz que a
 * lista está limpa (7.2). Não chama action — recebe a análise pronta.
 */
type Acao = "grupos" | "efeito" | "desde" | "padrao";

const dataBR = (d: Date) => new Date(d).toLocaleDateString("pt-BR");

export function AssistenteConferencia({ usuario, analise }: { usuario: string; analise: AnaliseDaConferencia }) {
  const chave = `gt:assistente:conferencia:recolhido:${usuario}`;
  const [recolhido, setRecolhido] = useState(false);
  const [aberta, setAberta] = useState<Acao | null>(null);
  useEffect(() => {
    try {
      setRecolhido(window.localStorage.getItem(chave) === "1");
    } catch {
      /* sem localStorage */
    }
  }, [chave]);
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
  const { grupos, efeitos, desde, padroes, total } = analise;
  const nada = (t: string) => <p className="text-[12px] text-[var(--color-ink2)]">{t}</p>;
  const toggle = (a: Acao) => setAberta(aberta === a ? null : a);

  return (
    <aside aria-label="Assistente da Conferência" className="w-full shrink-0 rounded-[16px] border border-[var(--color-line)] bg-white p-4 shadow-sm min-[1180px]:sticky min-[1180px]:top-20 min-[1180px]:w-[300px]">
      <div className="mb-3 flex items-start gap-2.5">
        <Faisca />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[15px] font-bold text-[var(--color-ink)]">
            Assistente IA
            <Badge tone="neutral">Somente leitura</Badge>
          </div>
          <div className="text-[12px] text-[var(--color-ink2)]">Conferência · onde olhar primeiro</div>
        </div>
        <button type="button" onClick={alternar} aria-expanded={true} aria-label="Recolher o assistente" title="Recolher" className="rounded-[8px] p-1 text-[var(--color-ink3)] hover:bg-[var(--color-surface2)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      {total === 0 ? (
        nada(TEXTO_SEM_PENDENCIA)
      ) : (
        <div className="space-y-2">
          <Acao cor="#E7EDFD" cor2="#2B5CD9" d="M4 6h16M4 12h10M4 18h6" titulo="Agrupar por causa provável" descricao="Mesmo fornecedor, conta do plano ou competência" contador={grupos.length} aberta={aberta === "grupos"} onClick={() => toggle("grupos")}>
            {grupos.length === 0 ? (
              nada("Nenhum grupo de dois ou mais lançamentos com o mesmo fornecedor, conta do plano ou competência.")
            ) : (
              <ul className="space-y-1 text-[12px] text-[var(--color-ink2)]">
                {grupos.map((g) => (
                  <li key={`${g.criterio}-${g.rotulo}`}>
                    <span className="font-medium text-[var(--color-ink)]">{g.rotulo}</span> ({g.criterio}): {g.quantos} lançamento(s), {brl0(g.valor)}
                  </li>
                ))}
              </ul>
            )}
          </Acao>

          <Acao cor="#FDE6E9" cor2="#C0334A" d="M3 17l6-6 4 4 8-8M14 7h7v7" titulo="O que isso tira dos relatórios" descricao="Por motivo: quanto, e o efeito na DRE" contador={efeitos.length} aberta={aberta === "efeito"} onClick={() => toggle("efeito")}>
            <ul className="space-y-1.5 text-[12px] text-[var(--color-ink2)]">
              {efeitos.map((e) => (
                <li key={e.codigo}>
                  <span className="font-medium text-[var(--color-ink)]">{TEXTO_MOTIVO[e.codigo].split(" — ")[0]}</span>: {e.quantos} lançamento(s), {brl0(e.valor)} — {e.efeito}.
                  {e.foraDaAtual > 0 && <span className="text-[var(--color-ink3)]"> {e.foraDaAtual} são de Orçamento ou Previsão, cuja DRE lê o planejamento.</span>}
                </li>
              ))}
            </ul>
          </Acao>

          <Acao cor="#FFF4E0" cor2="#B7791F" d="M12 8v4l3 2M3.5 12a8.5 8.5 0 1 0 17 0 8.5 8.5 0 0 0-17 0z" titulo="Desde quando" descricao="Acúmulo antigo ou problema corrente" contador={0} aberta={aberta === "desde"} onClick={() => toggle("desde")}>
            <ul className="space-y-1 text-[12px] text-[var(--color-ink2)]">
              {desde.map((x) => (
                <li key={x.codigo}>
                  <span className="font-medium text-[var(--color-ink)]">{TEXTO_MOTIVO[x.codigo].split(" — ")[0]}</span>: desde {dataBR(x.maisAntigo)}, último em {dataBR(x.maisRecente)}
                  {x.corrente ? " — ainda acontece (últimos 30 dias)." : " — nada novo nos últimos 30 dias."}
                </li>
              ))}
            </ul>
          </Acao>

          <Acao cor="#E3F6EC" cor2="#1F8A4C" d="M12 3v18M3 12h18" titulo="Padrão no que falta" descricao="Fornecedor, período ou quem lançou" contador={padroes.length} aberta={aberta === "padrao"} onClick={() => toggle("padrao")}>
            {padroes.length === 0 ? (
              nada("Nenhum fornecedor, competência ou pessoa concentra metade das pendências.")
            ) : (
              <ul className="space-y-1 text-[12px] text-[var(--color-ink2)]">
                {padroes.map((c) => (
                  <li key={`${c.dimensao}-${c.rotulo}`}>
                    <span className="font-medium text-[var(--color-ink)]">{c.rotulo}</span> ({c.dimensao}): {c.quantos} de {total} ({Math.round(c.parte * 100)}%).
                  </li>
                ))}
              </ul>
            )}
          </Acao>
        </div>
      )}
      <p className="mt-3 text-[11px] text-[var(--color-ink3)]">
        O assistente não reclassifica e não sugere categoria para lançamento nenhum: categoria é classificação contábil, e quem decide é você, linha a linha.
      </p>
    </aside>
  );
}

function Acao({ cor, cor2, d, titulo, descricao, contador, aberta, onClick, children }: { cor: string; cor2: string; d: string; titulo: string; descricao: string; contador: number; aberta: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[11px] border border-[var(--color-line)]", aberta && "bg-[var(--color-surface2)]")}>
      <button type="button" onClick={onClick} aria-expanded={aberta} className="flex w-full items-center gap-2.5 rounded-[11px] p-2.5 text-left hover:bg-[var(--color-surface2)]">
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
        <span className="text-[var(--color-ink3)]" aria-hidden>
          {aberta ? "▾" : "›"}
        </span>
      </button>
      {aberta && <div className="border-t border-[var(--color-line)] px-3 py-2.5">{children}</div>}
    </div>
  );
}
