"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmarConciliacoes } from "@/lib/actions/caixa";
import type { PropostaDeConciliacao, PropostaDeImportacao } from "@/lib/cris";
import { Button } from "@/components/ui/button";

/**
 * Prompt AT §8.3 (Revisão 4) — o que a Cris propõe na conciliação, dentro da
 * conversa. A Cris NÃO grava: o lote só vira vínculo no botão "Confirmar N
 * conciliações", e o servidor confere cada item de novo. O extrato lido abre o
 * MESMO diálogo de importação, já preenchido; quem importa é o botão dele.
 */

/** Evento que o diálogo de importação do Caixa escuta (8.3.3). */
export const EVENTO_IMPORTAR_EXTRATO = "cris:importar-extrato";

export function LoteDaCris({ proposta }: { proposta: PropostaDeConciliacao }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [resultado, setResultado] = useState<{ ok: number; falhas: { movimento: string; erro?: string }[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const n = proposta.itens.length;
  return (
    <div className="rounded-[10px] border border-[#e9d5ff] bg-[#fcfaff] p-3 text-[12px]" data-cris-lote>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink3)]">Conciliações propostas · confira</p>
      <ul className="space-y-1">
        {proposta.itens.map((i) => (
          <li key={`${i.movimento}|${i.ref}`}>
            <span className="text-[var(--color-ink3)]">{i.descricaoDoMovimento}</span> → <span className="text-[var(--color-ink)]">{i.tipo}: {i.rotulo}</span>
            {i.valor != null && <span className="text-[var(--color-ink3)]"> · {i.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>}
          </li>
        ))}
      </ul>
      {proposta.recusados.length > 0 && <p className="mt-1 text-[11.5px] text-[#92400e]">{proposta.recusados.length} item(ns) recusado(s) pelo servidor: {proposta.recusados.map((r) => r.motivo).join("; ")}.</p>}
      {resultado ? (
        <div className="mt-2" role="status">
          <p className="font-medium text-[var(--color-success)]">{resultado.ok} conciliação(ões) gravada(s).</p>
          {resultado.falhas.length > 0 && (
            <ul className="mt-1 text-[var(--color-danger)]">
              {resultado.falhas.map((f) => (
                <li key={f.movimento}>Não gravada: {proposta.itens.find((i) => i.movimento === f.movimento)?.descricaoDoMovimento ?? f.movimento} · {f.erro}</li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          className="mt-2"
          disabled={pending}
          data-cris-confirmar-lote
          onClick={() =>
            start(async () => {
              setErro(null);
              const r = await confirmarConciliacoes(proposta.itens.map((i) => ({ movimento: i.movimento, ref: i.ref, valor: i.valor })));
              if (!r.ok) return setErro(r.error);
              setResultado({ ok: r.gravadas, falhas: r.resultados.filter((x) => !x.ok).map((x) => ({ movimento: x.movimento, erro: x.erro })) });
              router.refresh();
            })
          }
        >
          {pending ? "Gravando…" : `Confirmar ${n} conciliação${n === 1 ? "" : "ões"}`}
        </Button>
      )}
      {erro && <p className="mt-1 text-[var(--color-danger)]" role="alert">{erro}</p>}
    </div>
  );
}

export function ImportacaoDaCris({ proposta }: { proposta: PropostaDeImportacao }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="rounded-[10px] border border-[#e9d5ff] bg-[#fcfaff] p-3 text-[12px]" data-cris-importacao>
      <p className="text-[var(--color-ink2)]">
        {proposta.nome}: {proposta.linhas.length} movimento(s) lido(s). Abra a importação para conferir as linhas e a conta; nada é gravado antes do botão Importar.
      </p>
      <Button
        type="button"
        size="sm"
        className="mt-2"
        onClick={() => {
          window.dispatchEvent(new CustomEvent(EVENTO_IMPORTAR_EXTRATO, { detail: proposta }));
          setAberto(true);
        }}
      >
        {aberto ? "Importação aberta na tela" : `Abrir a importação com ${proposta.linhas.length} linha(s)`}
      </Button>
    </div>
  );
}
