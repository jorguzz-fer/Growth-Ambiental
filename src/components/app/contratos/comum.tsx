"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export { StatusBadge, brl, Kpi, Secao } from "./visual";

export type ResultadoAcao = { ok: true; id?: string; aviso?: string } | { ok: false; error: string };

/**
 * Roda uma server action, mostra o resultado (erro, aviso ou "feito") e
 * recarrega os dados da página. A mensagem fica até a próxima ação.
 */
export function useAcao() {
  const router = useRouter();
  const [pendente, start] = useTransition();
  const [msg, setMsg] = useState<{ tom: "ok" | "erro" | "aviso"; texto: string } | null>(null);
  const rodar = (acao: () => Promise<ResultadoAcao>, feito = "Salvo.", depois?: (r: ResultadoAcao & { ok: true }) => void) => {
    setMsg(null);
    start(async () => {
      const r = await acao();
      if (!r.ok) return setMsg({ tom: "erro", texto: r.error });
      setMsg(r.aviso ? { tom: "aviso", texto: `${feito} Atenção: ${r.aviso}` } : { tom: "ok", texto: feito });
      depois?.(r);
      router.refresh();
    });
  };
  return { rodar, pendente, msg, setMsg };
}

export function Mensagem({ msg }: { msg: { tom: "ok" | "erro" | "aviso"; texto: string } | null }) {
  if (!msg) return null;
  const cor = msg.tom === "erro" ? "border-[var(--color-danger)]/30 bg-[#fee2e2]/60 text-[#991b1b]" : msg.tom === "aviso" ? "border-[var(--color-warning)]/40 bg-[#fef3c7]/60 text-[#92400e]" : "border-[var(--color-success)]/30 bg-[#d1fae5]/60 text-[#065f46]";
  return (
    <p role="status" className={`my-2 rounded-[10px] border px-3 py-2 text-[13px] ${cor}`}>
      {msg.texto}
    </p>
  );
}

/** Pergunta um motivo (cancelar, rejeitar, suspender). Null = desistiu. */
export function pedirMotivo(pergunta: string): string | null {
  const m = window.prompt(pergunta);
  return m && m.trim() ? m.trim() : null;
}

/** Chave de idempotência gerada na tela (uma por formulário aberto). */
export const novaChave = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
