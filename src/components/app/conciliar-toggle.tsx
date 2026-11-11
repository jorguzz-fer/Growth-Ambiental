"use client";

import { useState, useTransition } from "react";
import { toggleConciliado } from "@/lib/actions/caixa";
import { Badge } from "@/components/ui/badge";

/**
 * Prompt AT §2.2 (Revisão 4): o seletor da tabela só DESFAZ. Conciliar exige
 * dizer com o quê o movimento casou, na Conciliação ou no Assistente do Caixa;
 * por isso "pendente" não é mais clicável. Desfazer pede o motivo.
 */
export function ConciliarToggle({ id, rec }: { id: string; rec: boolean }) {
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (!rec) {
    return (
      <span title="Para conciliar, escolha com o quê o movimento casou na Conciliação ou no Assistente do Caixa.">
        <Badge tone="warning">pendente</Badge>
      </span>
    );
  }

  const desfazer = () => {
    const motivo = window.prompt("Motivo para desfazer a conciliação (fica na auditoria):", "");
    if (motivo === null) return;
    if (!motivo.trim()) {
      setErro("Informe o motivo para desfazer a conciliação.");
      return;
    }
    setErro(null);
    start(async () => {
      try {
        await toggleConciliado(id, false, null, motivo);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível desfazer.");
      }
    });
  };

  return (
    <button disabled={pending} onClick={desfazer} className="disabled:opacity-50" title={erro ?? "Desfazer conciliação (pede o motivo)"}>
      <Badge tone={erro ? "danger" : "success"}>{pending ? "..." : "conciliado"}</Badge>
    </button>
  );
}
