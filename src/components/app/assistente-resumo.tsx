"use client";

import { useEffect, useState } from "react";
import { fotografiaDoMesPassado, type AnaliseDoResumo } from "@/lib/resumo-analise";
import { variacoes } from "@/lib/dashboard-analise";
import { brl0, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Faisca } from "@/components/app/assistente-funcionarios";

/**
 * Painel do assistente no Resumo Executivo (Prompt AE, Parte 5).
 * SOMENTE LEITURA: recebe a análise pronta, feita com os números da tela.
 * Não chama action e não grava dado. O navegador guarda só a preferência de
 * recolher e uma fotografia por mês dos números em tela (para "o que mudou").
 */
type Acao = "explicar" | "mudou";

export function AssistenteResumo({ usuario, analise }: { usuario: string; analise: AnaliseDoResumo }) {
  const chave = `gt:assistente:resumo:recolhido:${usuario}`;
  const chaveFotos = `gt:assistente:resumo:fotos:${usuario}:${analise.recorte}`;
  const [recolhido, setRecolhido] = useState(false);
  const [aberta, setAberta] = useState<Acao | null>(null);
  const [anterior, setAnterior] = useState<{ mes: string; valores: Record<string, number> } | null | undefined>(undefined);
  useEffect(() => {
    try {
      setRecolhido(window.localStorage.getItem(chave) === "1");
    } catch {
      /* sem localStorage */
    }
  }, [chave]);
  useEffect(() => {
    const d = new Date();
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    let fotos: Record<string, Record<string, number>> = {};
    try {
      fotos = JSON.parse(window.localStorage.getItem(chaveFotos) ?? "{}");
      fotos[mes] = analise.instantaneo;
      window.localStorage.setItem(chaveFotos, JSON.stringify(fotos));
    } catch {
      /* sem localStorage: não há o que comparar */
    }
    setAnterior(fotografiaDoMesPassado(fotos, mes));
  }, [chaveFotos, analise.instantaneo]);
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
  const mudou = anterior ? variacoes(anterior.valores, analise.instantaneo) : null;
  return (
    <aside aria-label="Assistente do Resumo Executivo" data-assistente-resumo className="w-full shrink-0 rounded-[16px] border border-[var(--color-line)] bg-white p-4 shadow-sm min-[1180px]:sticky min-[1180px]:top-20 min-[1180px]:w-[300px]">
      <div className="mb-3 flex items-start gap-2.5">
        <Faisca />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[15px] font-bold text-[var(--color-ink)]">
            Assistente IA
            <Badge tone="neutral">Somente leitura</Badge>
          </div>
          <div className="text-[12px] text-[var(--color-ink2)]">Resumo · o que os números dizem</div>
        </div>
        <button type="button" onClick={alternar} aria-expanded={true} aria-label="Recolher o assistente" title="Recolher" className="rounded-[8px] p-1 text-[var(--color-ink3)] hover:bg-[var(--color-surface2)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      {/* 5.1 — a abertura traz o achado. */}
      <p className="mb-3 text-[13px] leading-snug text-[var(--color-ink)]" data-frase>
        {analise.abertura}
      </p>
      <div className="space-y-2">
        <Acao d="M12 5v14M5 12h14" titulo="Montar outra análise" descricao="Indisponível: depende do catálogo de métricas (BAA-6) e da camada analítica do Prompt I, que ainda não existem." desabilitada aberta={false} onClick={() => {}}>
          {null}
        </Acao>
        <Acao d="M12 8v.01M11 12h1v4h1M3.5 12a8.5 8.5 0 1 0 17 0 8.5 8.5 0 0 0-17 0z" titulo="Explicar o bloco" descricao="Fonte, cenário e regime de cada bloco" aberta={aberta === "explicar"} onClick={() => toggle("explicar")}>
          <ul className="space-y-1.5 text-[12px] text-[var(--color-ink2)]">
            {analise.explicacoes.map((e) => (
              <li key={e.bloco}>
                <span className="font-medium text-[var(--color-ink)]">{e.bloco}</span>: {e.texto}
              </li>
            ))}
          </ul>
        </Acao>
        <Acao d="M4 19V9m6 10V5m6 14v-7" titulo="Comparar projetos" descricao="Escolha Todos, Ativos ou Finalizados no seletor de projeto: o Resumo soma os projetos e mostra o Comparativo entre eles." desabilitada aberta={false} onClick={() => {}}>
          {null}
        </Acao>
        <Acao d="M12 8v4l3 2M3.5 12a8.5 8.5 0 1 0 17 0 8.5 8.5 0 0 0-17 0z" titulo="O que mudou desde o mês passado" descricao="Neste mesmo recorte; números guardados no seu navegador" contador={mudou?.length ?? 0} aberta={aberta === "mudou"} onClick={() => toggle("mudou")}>
          {anterior === undefined ? null : anterior === null ? (
            <p className="text-[12px] text-[var(--color-ink2)]">Ainda não há fotografia de um mês anterior neste recorte. A deste mês ficou guardada no seu navegador.</p>
          ) : mudou && mudou.length === 0 ? (
            <p className="text-[12px] text-[var(--color-ink2)]">Nada mudou desde {anterior.mes.split("-").reverse().join("/")}.</p>
          ) : (
            <ul className="space-y-0.5 text-[12px] text-[var(--color-ink2)]">
              {mudou!.map((v) => (
                <li key={v.rotulo}>
                  <span className="font-medium">{v.rotulo}</span>: {brl0(v.antes)} → {brl0(v.agora)}
                </li>
              ))}
            </ul>
          )}
        </Acao>
      </div>
      <p className="mt-3 text-[11px] text-[var(--color-ink3)]">
        Nada é alterado por este painel. Os números são os da tela; bloco pendente não recebe número do assistente.
      </p>
    </aside>
  );
}

function Acao({ d, titulo, descricao, contador = 0, desabilitada = false, aberta, onClick, children }: { d: string; titulo: string; descricao: string; contador?: number; desabilitada?: boolean; aberta: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[11px] border border-[var(--color-line)]", aberta && !desabilitada && "bg-[var(--color-surface2)]")}>
      <button type="button" onClick={onClick} disabled={desabilitada} aria-expanded={aberta && !desabilitada} className="flex w-full items-center gap-2.5 rounded-[11px] p-2.5 text-left hover:bg-[var(--color-surface2)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent">
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] bg-[#E7EDFD]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2B5CD9" strokeWidth="1.9" aria-hidden>
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
