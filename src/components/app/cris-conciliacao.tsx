"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { confirmarConciliacoes } from "@/lib/actions/caixa";
import { confirmarConciliacoesCartao } from "@/lib/actions/cartao-conciliacao";
import { EVENTO_IMPORTAR_FATURA } from "@/components/app/extrato-cartao";
import type { PropostaDeConciliacao, PropostaDeConciliacaoCartao, PropostaDeFatura, PropostaDeImportacao } from "@/lib/cris";
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

const brlCris = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * GA-11 §4.2 — o lote que a Cris propõe no cartão. As conciliações só gravam
 * no botão (o servidor confere cada uma de novo); a compra sem lançamento é
 * só um link para Despesas já preenchida: nada é lançado sozinho.
 */
export function LoteDoCartaoDaCris({ proposta }: { proposta: PropostaDeConciliacaoCartao }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [resultado, setResultado] = useState<{ ok: number; falhas: { linha: string; erro?: string }[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const n = proposta.itens.length;
  return (
    <div className="rounded-[10px] border border-[#e9d5ff] bg-[#fcfaff] p-3 text-[12px]" data-cris-lote-cartao>
      {n > 0 && (
        <>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink3)]">Conciliações do cartão propostas · confira</p>
          <ul className="space-y-1">
            {proposta.itens.map((i) => (
              <li key={`${i.linha}|${i.despesaId}`}>
                <span className="text-[var(--color-ink3)]">{i.cartao} · {i.descricaoDaLinha}</span> → <span className="text-[var(--color-ink)]">{i.rotulo}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {proposta.lancar.length > 0 && (
        <div className="mt-2" data-cris-lancar-compra>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink3)]">Na fatura, sem lançamento · nada foi lançado</p>
          <ul className="space-y-1">
            {proposta.lancar.map((l) => (
              <li key={l.linha}>
                <span className="text-[var(--color-ink3)]">{l.cartao} · {l.descricaoDaLinha}</span> ·{" "}
                <Link href={l.href} className="text-[var(--color-accent2)] hover:underline">
                  Lançar em Despesas ({brlCris(l.valor)}) →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {proposta.recusados.length > 0 && <p className="mt-1 text-[11.5px] text-[#92400e]">{proposta.recusados.length} item(ns) recusado(s) pelo servidor: {proposta.recusados.map((r) => r.motivo).join("; ")}.</p>}
      {n > 0 &&
        (resultado ? (
          <div className="mt-2" role="status">
            <p className="font-medium text-[var(--color-success)]">{resultado.ok} conciliação(ões) gravada(s).</p>
            {resultado.falhas.length > 0 && (
              <ul className="mt-1 text-[var(--color-danger)]">
                {resultado.falhas.map((f) => (
                  <li key={f.linha}>Não gravada: {proposta.itens.find((i) => i.linha === f.linha)?.descricaoDaLinha ?? f.linha} · {f.erro}</li>
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
            data-cris-confirmar-lote-cartao
            onClick={() =>
              start(async () => {
                setErro(null);
                const r = await confirmarConciliacoesCartao(proposta.itens.map((i) => ({ linha: i.linha, despesaId: i.despesaId })));
                if (!r.ok) return setErro(r.error);
                setResultado({ ok: r.gravadas, falhas: r.resultados.filter((x) => !x.ok).map((x) => ({ linha: x.linha, erro: x.erro })) });
                router.refresh();
              })
            }
          >
            {pending ? "Gravando…" : `Confirmar ${n} conciliação${n === 1 ? "" : "ões"}`}
          </Button>
        ))}
      {erro && <p className="mt-1 text-[var(--color-danger)]" role="alert">{erro}</p>}
    </div>
  );
}

/** GA-11 §4.2 — a fatura lida por `ler_fatura`: abre a prévia de "Subir fatura" já preenchida; quem registra é o botão dela. */
export function FaturaDaCris({ proposta }: { proposta: PropostaDeFatura }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="rounded-[10px] border border-[#e9d5ff] bg-[#fcfaff] p-3 text-[12px]" data-cris-fatura>
      <p className="text-[var(--color-ink2)]">
        {proposta.nome}: {proposta.itens.length} lançamento(s) lido(s) da fatura. Abra a prévia para conferir as linhas e o cartão; nada é registrado antes do botão Registrar, e nenhuma despesa é lançada.
      </p>
      <Button
        type="button"
        size="sm"
        className="mt-2"
        onClick={() => {
          window.dispatchEvent(new CustomEvent(EVENTO_IMPORTAR_FATURA, { detail: proposta }));
          setAberto(true);
        }}
      >
        {aberto ? "Prévia aberta na tela" : `Abrir a prévia com ${proposta.itens.length} linha(s)`}
      </Button>
    </div>
  );
}
