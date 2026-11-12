"use client";

import Link from "next/link";
import { useCris } from "@/components/app/cris-contexto";
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

export function FaixaDeConciliacao({
  pendentes,
  contasComPendencia,
  maisAntigoDias,
  hrefConciliacao,
  openFinance,
  contas,
  cartoes,
}: {
  pendentes: number;
  contasComPendencia: number;
  maisAntigoDias: number | null;
  hrefConciliacao: string;
  openFinance: EstadoDoOpenFinance;
  contas: { id: string; nome: string }[];
  cartoes: { id: string; nome: string }[];
}) {
  const cris = useCris();
  return (
    <div className="mb-4 rounded-[10px] border border-[var(--color-accent2)]/15 bg-[var(--color-accent4)] p-3" data-faixa-conciliacao>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          data-caminho="extrato"
          onClick={() => {
            const alvo = document.querySelector<HTMLElement>("[data-importar-extrato]");
            alvo?.scrollIntoView({ behavior: "smooth", block: "center" });
            alvo?.querySelector<HTMLSelectElement>("select")?.focus();
          }}
        >
          Subir extrato
        </Button>
        <Button
          size="sm"
          data-caminho="cris"
          onClick={() => cris?.perguntar("Quero conciliar com você. Se eu anexar o extrato, leia e prepare a importação; depois, concilie os pendentes em rodadas de até 20, do mais antigo para o mais novo, me perguntando o que tiver dúvida.")}
        >
          Conciliar com a Cris
        </Button>
        <span data-caminho="openfinance" className="flex items-center gap-1.5">
          {openFinance.tipo === "conectado" ? (
            <Link href="/contas" className="inline-flex h-8 items-center rounded-[8px] bg-[var(--color-accent)] px-3 text-xs font-medium text-white">
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
        <Link href={hrefConciliacao} className="ml-auto text-[12.5px] text-[var(--color-ink2)] hover:underline" data-contador-pendencias={pendentes}>
          {pendentes === 0 ? (
            "Nenhum movimento a conciliar"
          ) : (
            <>
              <strong className="text-[var(--color-ink)]">{pendentes}</strong> movimento{pendentes === 1 ? "" : "s"} a conciliar em {contasComPendencia} conta{contasComPendencia === 1 ? "" : "s"}
              {maisAntigoDias != null ? ` · mais antigo há ${maisAntigoDias} dia${maisAntigoDias === 1 ? "" : "s"}` : ""}
            </>
          )}
        </Link>
      </div>
      {openFinance.tipo === "indisponivel" && openFinance.motivo && <p className="mt-1.5 text-[11.5px] text-[var(--color-ink3)]">Open Finance: {openFinance.motivo}</p>}
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
