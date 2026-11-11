"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { pedirRelatorio } from "@/lib/actions/relatorio";
import { Button } from "@/components/ui/button";
import { BotaoDeVoz } from "@/components/app/cris-voz";
import { juntarDitado } from "@/lib/voz-ditado";

interface Fala {
  de: "usuario" | "cris";
  texto: string;
}

/**
 * Prompt RC — o chat próprio dos Relatórios Customizados. A pessoa descreve o
 * relatório; o chat devolve a receita e a tela abre o link dela. A conversa
 * vive só nesta aba.
 */
export function RelatorioChat({ iaConfigurada }: { iaConfigurada: boolean }) {
  const router = useRouter();
  const [falas, setFalas] = useState<Fala[]>([]);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [erroVoz, setErroVoz] = useState<string | null>(null);
  const [pendente, start] = useTransition();

  const enviar = (pedido: string) => {
    const t = pedido.trim();
    if (!t || pendente) return;
    const conversa = [...falas, { de: "usuario" as const, texto: t }];
    setFalas(conversa);
    setTexto("");
    setErro(null);
    start(async () => {
      const r = await pedirRelatorio({ conversa });
      if (!r.ok) {
        setErro(r.error);
        return;
      }
      setFalas((f) => [...f, { de: "cris", texto: r.texto }]);
      if (r.url) router.push(r.url);
    });
  };

  return (
    <div className="flex h-full flex-col" data-relatorio-chat>
      <h2 className="text-sm font-semibold text-[var(--color-ink)]">Peça o relatório</h2>
      <p className="mb-3 text-[12px] text-[var(--color-ink3)]">
        Ex.: &ldquo;DRE da obra X com análise vertical, mês a mês neste ano&rdquo; ou &ldquo;fluxo de caixa por obra, Orçamento&rdquo;.
      </p>
      <div className="mb-3 flex-1 space-y-2 overflow-y-auto" aria-live="polite">
        {falas.map((f, i) => (
          <p
            key={i}
            className={`rounded-[8px] px-3 py-2 text-[13px] ${f.de === "usuario" ? "ml-6 bg-[var(--color-surface3)] text-[var(--color-ink)]" : "mr-6 border border-[var(--color-line)] text-[var(--color-ink2)]"}`}
            data-relatorio-fala={f.de}
          >
            {f.texto}
          </p>
        ))}
        {pendente && <p className="text-[12px] text-[var(--color-ink3)]">Montando…</p>}
        {erro && (
          <p role="alert" className="text-[12.5px] text-[var(--color-danger)]">
            {erro}
          </p>
        )}
      </div>
      {!iaConfigurada && <p className="mb-2 text-[12px] text-[var(--color-ink3)]">A IA não está configurada: use os campos para montar.</p>}
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
      >
        <textarea
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setErroVoz(null);
          }}
          rows={2}
          maxLength={1500}
          aria-label="Pedido de relatório"
          className="min-h-[44px] flex-1 resize-none rounded-[8px] border border-[var(--color-line)] px-3 py-2 text-[13px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar(texto);
            }
          }}
        />
        <BotaoDeVoz onTexto={(t) => setTexto((x) => juntarDitado(x, t))} onErro={setErroVoz} />
        <Button type="submit" size="sm" disabled={pendente || !texto.trim()}>
          Montar
        </Button>
      </form>
      {/* Prompt AV — o erro do ditado em texto, abaixo do campo (não só no title do 🎤). */}
      {erroVoz && (
        <p role="alert" data-voz-erro className="mt-1 text-[12px] text-[var(--color-danger)]">
          {erroVoz}
        </p>
      )}
    </div>
  );
}
