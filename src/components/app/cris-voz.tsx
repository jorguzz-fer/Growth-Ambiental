"use client";

import { useEffect, useRef, useState } from "react";
import { ligarDitado, type ConstrutorDeReconhecedor, type Reconhecedor } from "@/lib/voz-ditado";

/**
 * Prompt VOZ (Fase 3) — ditado no chat da Cris e nos Relatórios, pelo
 * reconhecimento de fala do próprio navegador (Web Speech API, pt-BR). O texto
 * ditado entra na caixa de mensagem, para a pessoa conferir e enviar.
 *
 * BV2-1 (decidido no prompt): nenhum áudio passa pelo servidor do app nem vai
 * ao modelo da Cris; o navegador transcreve. No Chrome, no Edge e no Safari o
 * reconhecimento roda no serviço de fala do fabricante do navegador. Sem
 * suporte (Firefox, por exemplo), o botão não aparece.
 *
 * Prompt AV (Revisão 4): o erro deixa de ficar só no `title` do botão (que no
 * celular ninguém vê). Ele vai para `onErro`, e a tela mostra em texto, abaixo
 * do campo. Tentar de novo limpa a mensagem (`onErro(null)`).
 */

function construtorDeFala(): ConstrutorDeReconhecedor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: ConstrutorDeReconhecedor; webkitSpeechRecognition?: ConstrutorDeReconhecedor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function BotaoDeVoz({ onTexto, onErro }: { onTexto: (texto: string) => void; onErro?: (mensagem: string | null) => void }) {
  const [suportado, setSuportado] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const rec = useRef<Reconhecedor | null>(null);
  const onTextoRef = useRef(onTexto);
  const onErroRef = useRef(onErro);
  onTextoRef.current = onTexto;
  onErroRef.current = onErro;

  useEffect(() => setSuportado(!!construtorDeFala()), []);
  useEffect(() => () => rec.current?.stop(), []);

  if (!suportado) return null;

  const alternar = () => {
    if (ouvindo) {
      rec.current?.stop();
      return;
    }
    const C = construtorDeFala();
    if (!C) return;
    const r = ligarDitado(C, {
      onTexto: (t) => onTextoRef.current(t),
      onErro: (m) => {
        setErro(m);
        onErroRef.current?.(m);
      },
      onFim: () => setOuvindo(false),
    });
    rec.current = r;
    setErro(null);
    onErroRef.current?.(null);
    setOuvindo(true);
    try {
      r.start();
    } catch {
      // start() lança se já houver um reconhecimento em andamento.
      const m = "O ditado já está ligado em outro lugar. Toque no 🎤 de novo.";
      setOuvindo(false);
      setErro(m);
      onErroRef.current?.(m);
    }
  };

  return (
    <button
      type="button"
      onClick={alternar}
      title={erro ?? (ouvindo ? "Parar de ouvir" : "Falar (ditado)")}
      aria-label={ouvindo ? "Parar de ouvir" : "Falar em vez de digitar"}
      aria-pressed={ouvindo}
      data-cris-voz
      className={`text-[16px] ${ouvindo ? "animate-pulse text-[var(--color-danger)]" : erro ? "text-[var(--color-warning)]" : "text-[var(--color-ink3)] hover:text-[var(--color-ink)]"}`}
    >
      🎤
    </button>
  );
}
