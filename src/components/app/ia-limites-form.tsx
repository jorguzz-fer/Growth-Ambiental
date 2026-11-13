"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarLimitesDeIa } from "@/lib/actions/ia-limites";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

/** Limites de consumo da IA desta empresa (vazio = o padrão do sistema). */
export function IaLimitesForm({ atual, padrao }: { atual: { pessoaHora: number | null; empresaHora: number | null; orcamentoMensalUsd: number | null }; padrao: { porPessoaPorHora: number; porEmpresaPorHora: number } }) {
  const router = useRouter();
  const [pend, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      data-ia-limites
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await salvarLimitesDeIa({ pessoaHora: String(fd.get("pessoa") ?? ""), empresaHora: String(fd.get("empresa") ?? ""), orcamentoMensalUsd: String(fd.get("orcamento") ?? "") });
          setMsg(r.ok ? { ok: true, texto: "Limites salvos." } : { ok: false, texto: r.error });
          if (r.ok) router.refresh();
        });
      }}
    >
      <div><Label>Perguntas por hora, por pessoa</Label><Input name="pessoa" defaultValue={atual.pessoaHora ?? ""} placeholder={`padrão ${padrao.porPessoaPorHora}`} className="w-40" /></div>
      <div><Label>Perguntas por hora, empresa</Label><Input name="empresa" defaultValue={atual.empresaHora ?? ""} placeholder={`padrão ${padrao.porEmpresaPorHora}`} className="w-40" /></div>
      <div><Label>Orçamento mensal estimado (US$)</Label><Input name="orcamento" defaultValue={atual.orcamentoMensalUsd ?? ""} placeholder="sem alerta" className="w-40" /></div>
      <Button type="submit" size="sm" disabled={pend}>{pend ? "Salvando…" : "Salvar limites"}</Button>
      {msg && <span role="status" className={`text-[12.5px] ${msg.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{msg.texto}</span>}
    </form>
  );
}
