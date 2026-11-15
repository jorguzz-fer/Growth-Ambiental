"use client";

import Link from "next/link";
import { useState } from "react";
import { useCris } from "@/components/app/cris-contexto";
import { MENSAGEM_CRIS_SEM_IA } from "@/lib/cris-sem-ia";
import { ConectarBanco } from "@/components/app/open-finance";
import { Button } from "@/components/ui/button";

/**
 * Prompt AT §8.1 (Revisão 4) — a faixa de ação no topo do bloco de saldos do
 * Caixa por conta: os três caminhos da conciliação, com o mesmo peso, e o
 * contador de pendências. O layout da tela não muda: é ênfase dentro do bloco
 * que já existe.
 */
export interface EstadoDoOpenFinance {
  tipo: "conectado" | "conectar" | "indisponivel";
  /** conectado: a data da última sincronização. */
  ultima?: string | null;
  motivo?: string;
}


/** GA-11 §4.1 — o pedido que o botão "Conciliar com a Cris" leva ao chat, com a aba e o que está escolhido. */
export function pedidoDeConciliacaoParaCris(aba: "contas" | "cartoes" | "ajustes", escolhido: string | null): string {
  if (aba === "cartoes")
    return `Quero conciliar ${escolhido ? `o cartão ${escolhido}` : "os cartões de crédito"} com você. Se eu anexar a fatura, leia e prepare o registro; depois, liste o que está na fatura sem par, proponha as conciliações com as compras lançadas (em rodadas de até 20) e, para o que não foi lançado, traga a proposta com o link para Despesas. Pergunte o que tiver dúvida.`;
  return `Quero conciliar ${escolhido ? `a conta ${escolhido}` : "todas as contas correntes"} com você. Se eu anexar o extrato, leia e prepare a importação; depois, concilie os pendentes em rodadas de até 20, do mais antigo para o mais novo, me perguntando o que tiver dúvida.`;
}

export function FaixaDeConciliacao({
  pendentes,
  contasComPendencia,
  maisAntigoDias,
  hrefConciliacao,
  openFinance,
  contas,
  cartoes,
  aba = "contas",
  escolhido = null,
  aiConfigured = true,
}: {
  pendentes: number;
  contasComPendencia: number;
  maisAntigoDias: number | null;
  hrefConciliacao: string;
  openFinance: EstadoDoOpenFinance;
  contas: { id: string; nome: string }[];
  cartoes: { id: string; nome: string }[];
  /** GA-11 §3 — na aba Cartões, "Subir extrato" vira "Subir fatura". */
  aba?: "contas" | "cartoes" | "ajustes";
  /** A conta ou o cartão escolhido no seletor (nome), ou null para todas. */
  escolhido?: string | null;
  aiConfigured?: boolean;
}) {
  const cris = useCris();
  const [semIa, setSemIa] = useState(false);
  const cartao = aba === "cartoes";
  return (
    <div className="mb-4 rounded-[10px] border border-[var(--color-accent2)]/15 bg-[var(--color-accent4)] p-3" data-faixa-conciliacao>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          data-caminho={cartao ? "fatura" : "extrato"}
          onClick={() => {
            const alvo = document.querySelector<HTMLElement>(cartao ? "[data-subir-fatura]" : "[data-importar-extrato]");
            alvo?.scrollIntoView({ behavior: "smooth", block: "center" });
            alvo?.querySelector<HTMLSelectElement>("select")?.focus();
          }}
        >
          {cartao ? "Subir fatura" : "Subir extrato"}
        </Button>
        <Button
          size="sm"
          data-caminho="cris"
          onClick={() => {
            if (!aiConfigured) return setSemIa(true);
            cris?.perguntar(pedidoDeConciliacaoParaCris(aba, escolhido));
          }}
        >
          Conciliar com a Cris
        </Button>
        <span data-caminho="openfinance" className="flex items-center gap-1.5">
          {openFinance.tipo === "conectado" ? (
            <Link prefetch={false} href="/contas" className="inline-flex h-8 items-center rounded-[8px] bg-[var(--color-accent)] px-3 text-xs font-medium text-white">
              Open Finance · conectado{openFinance.ultima ? ` (${new Date(openFinance.ultima).toLocaleDateString("pt-BR")})` : ""}
            </Link>
          ) : openFinance.tipo === "conectar" ? (
            <ConectarBanco contas={contas} cartoes={cartoes} rotulo="Open Finance · conectar" />
          ) : (
            <span className="inline-flex h-8 items-center rounded-[8px] border border-[var(--color-line)] bg-white px-3 text-xs text-[var(--color-ink3)]" title={openFinance.motivo}>
              Open Finance · indisponível
            </span>
          )}
        </span>
        <Link prefetch={false} href={hrefConciliacao} className="ml-auto text-[12.5px] text-[var(--color-ink2)] hover:underline" data-contador-pendencias={pendentes}>
          {pendentes === 0 ? (
            cartao ? "Nenhuma linha de fatura a conciliar" : "Nenhum movimento a conciliar"
          ) : (
            <>
              <strong className="text-[var(--color-ink)]">{pendentes}</strong> {cartao ? "linha" : "movimento"}{pendentes === 1 ? "" : "s"} a conciliar em {contasComPendencia} {cartao ? "cart" : "conta"}{contasComPendencia === 1 ? (cartao ? "ão" : "") : cartao ? "ões" : "s"}
              {maisAntigoDias != null ? ` · mais antigo há ${maisAntigoDias} dia${maisAntigoDias === 1 ? "" : "s"}` : ""}
            </>
          )}
        </Link>
      </div>
      {openFinance.tipo === "indisponivel" && openFinance.motivo && <p className="mt-1.5 text-[11.5px] text-[var(--color-ink3)]">Open Finance: {openFinance.motivo}</p>}
      {semIa && (
        <p className="mt-1.5 text-[12px] text-[#92400e]" role="status" data-cris-sem-ia>
          {MENSAGEM_CRIS_SEM_IA}
        </p>
      )}
    </div>
  );
}

/** 8.1 — sem extrato no período: o vazio explica os três caminhos, com os três botões. */
export function VazioDaConciliacao(props: Omit<Parameters<typeof FaixaDeConciliacao>[0], "pendentes" | "contasComPendencia" | "maisAntigoDias" | "hrefConciliacao">) {
  return (
    <div className="rounded-[10px] border border-dashed border-[var(--color-line)] p-5 text-[13px] text-[var(--color-ink2)]" data-vazio-conciliacao>
      <p className="mb-2 font-medium text-[var(--color-ink)]">Nenhum extrato neste período. A conciliação começa por um destes caminhos:</p>
      <ol className="mb-3 list-decimal space-y-1 pl-5">
        <li>
          <strong>Subir o extrato</strong> aqui na tela (XLSX, CSV ou PDF): você confere as linhas antes de importar.
        </li>
        <li>
          <strong>Conciliar com a Cris</strong>: anexe o extrato na conversa; ela lê, prepara a importação, pergunta o que tiver dúvida e propõe as conciliações para você confirmar.
        </li>
        <li>
          <strong>Open Finance</strong>: conecte o banco; os movimentos chegam sozinhos, como pendentes.
        </li>
      </ol>
      <FaixaDeConciliacao {...props} pendentes={0} contasComPendencia={0} maisAntigoDias={null} hrefConciliacao="#" />
    </div>
  );
}
