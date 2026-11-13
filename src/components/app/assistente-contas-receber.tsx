"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AnaliseDeContasReceber, FaixaDeAtraso } from "@/lib/conta-receber-analise";
import { registrarRecebimento } from "@/lib/actions/contas-receber";
import { brl, cn, dateBR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * Painel do assistente na tela de Contas a Receber (Prompt K, seção 8; Prompt E).
 *
 * Tudo que aparece aqui é conta feita no servidor sobre o que a própria página
 * carregou — nenhum modelo de IA, nada sai do sistema. A única ação é a
 * **proposta de conciliação** (8.2): o painel sugere "conta ↔ linha do
 * extrato" e o botão "Conciliar" chama a mesma `registrarRecebimento` do
 * painel da linha, que valida empresa, obra, saldo e valor livre de novo. Por
 * isso o selo diz "Propõe, você confirma" (8.5), nunca "Somente leitura".
 *
 * O que o painel nunca faz (8.4): dar baixa, conciliar sozinho, alterar
 * conta conciliada, cancelar.
 *
 * Leitura de boleto/comprovante (8.1) fica fora até a decisão sobre enviar
 * documentos ao provedor de IA (mesma pergunta A/B/C da Fase 1 do Prompt J).
 */

type Acao = "propostas" | "vencidas" | "semConciliar" | "semVinculo" | "foraDoPadrao";

const COR_FAIXA: Record<FaixaDeAtraso, "warning" | "danger" | "neutral"> = {
  "até 30 dias": "warning",
  "31 a 60 dias": "warning",
  "61 a 90 dias": "danger",
  "mais de 90 dias": "danger",
};

export function AssistenteContasReceber({
  usuario,
  analise,
  podeEditar,
}: {
  /** Quem está logado — só para a chave da preferência "recolhido". */
  usuario: string;
  analise: AnaliseDeContasReceber;
  /** Permissão "editar" em Contas a Receber — sem ela a proposta aparece sem o botão (o servidor confere de novo). */
  podeEditar: boolean;
}) {
  const router = useRouter();
  const chave = `gt:assistente:contasreceber:recolhido:${usuario}`;
  const [recolhido, setRecolhido] = useState(false);
  const [aberta, setAberta] = useState<Acao | null>(null);
  const [pending, start] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [feitas, setFeitas] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      setRecolhido(window.localStorage.getItem(chave) === "1");
    } catch {
      /* sem localStorage: fica expandido */
    }
  }, [chave]);

  const alternar = () => {
    const proximo = !recolhido;
    setRecolhido(proximo);
    try {
      window.localStorage.setItem(chave, proximo ? "1" : "0");
    } catch {
      /* preferência não persiste; a tela continua funcionando */
    }
  };

  const conciliar = (contaId: string, cashEntryId: string, valor: number, data: string | null) => {
    setAviso(null);
    start(async () => {
      const r = await registrarRecebimento({
        contaReceberId: contaId,
        valor,
        data: data ?? "",
        forma: "Extrato bancário",
        cashEntryId,
        idempotencyKey: `assistente:${contaId}:${cashEntryId}`,
      });
      if (!r.ok) {
        setAviso({ ok: false, texto: r.error });
        return;
      }
      setFeitas((s) => new Set(s).add(contaId));
      setAviso({ ok: true, texto: "Conciliado. A conta passou a 'Recebida e conciliada'." });
      router.refresh();
    });
  };

  if (recolhido) {
    return (
      <aside className="shrink-0 min-[1180px]:sticky min-[1180px]:top-20">
        <button
          type="button"
          onClick={alternar}
          aria-expanded={false}
          aria-label="Abrir o assistente"
          title="Abrir o assistente"
          className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[var(--color-line)] bg-white shadow-sm hover:bg-[var(--color-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent2)]/40"
        >
          <Faisca />
        </button>
      </aside>
    );
  }

  const { propostas, vencidas, semConciliar, semVinculo, foraDoPadrao, total } = analise;
  const pendentes = propostas.filter((p) => !feitas.has(p.contaId));
  const nada = (texto: string) => <p className="text-[12px] text-[var(--color-ink2)]">{total === 0 ? "Nenhuma conta lançada nesta seleção." : texto}</p>;
  const linkConta = (id: string, rotulo: string) => (
    <a href={`#conta-${id}`} className="font-medium text-[var(--color-accent2)] hover:underline">
      {rotulo}
    </a>
  );

  return (
    <aside
      aria-label="Assistente da tela de Contas a Receber"
      className="w-full shrink-0 rounded-[16px] border border-[var(--color-line)] bg-white p-4 shadow-sm min-[1180px]:sticky min-[1180px]:top-20 min-[1180px]:w-[300px]"
    >
      <div className="mb-3 flex items-start gap-2.5">
        <Faisca />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[15px] font-bold text-[var(--color-ink)]">
            Assistente IA
            <Badge tone="warning">Propõe, você confirma</Badge>
          </div>
          <div className="text-[12px] text-[var(--color-ink2)]">Contas a receber e conciliação</div>
        </div>
        <button
          type="button"
          onClick={alternar}
          aria-expanded={true}
          aria-label="Recolher o assistente"
          title="Recolher"
          className="rounded-[8px] p-1 text-[var(--color-ink3)] hover:bg-[var(--color-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent2)]/40"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        <AcaoDoPainel
          cor="#F3EFFE"
          icone={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6D4BD1" strokeWidth="1.9" aria-hidden>
              <path d="M4 12h6M14 12h6M10 8l4 4-4 4" />
            </svg>
          }
          titulo="Conciliar com o extrato"
          descricao="Entradas do extrato que casam com contas em aberto, por valor, data e cliente"
          contador={pendentes.length}
          aberta={aberta === "propostas"}
          onClick={() => setAberta(aberta === "propostas" ? null : "propostas")}
        >
          {pendentes.length === 0 ? (
            nada("Nenhuma entrada do extrato com valor livre casa com uma conta em aberto. Importe o extrato no Caixa, ou concilie pela linha da conta.")
          ) : (
            <ul className="space-y-2">
              {pendentes.map((p) => (
                <li key={`${p.contaId}:${p.cashEntryId}`} className="rounded-[8px] border border-[var(--color-line)] bg-white p-2 text-[12px]">
                  <div>{linkConta(p.contaId, p.contaRotulo)}</div>
                  <div className="text-[var(--color-ink2)]">
                    ↔ {dateBR(p.entradaData)} · {p.entradaDescricao ?? "sem descrição"} ·{" "}
                    <span className="font-[family-name:var(--font-mono)] font-medium text-[var(--color-ink)]">{brl(p.valor)}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    <Badge tone={p.pontos >= 3 ? "success" : p.pontos === 2 ? "info" : "neutral"}>{p.pontos >= 3 ? "alta" : p.pontos === 2 ? "média" : "só o valor"}</Badge>
                    <span className="text-[11px] text-[var(--color-ink3)]">{p.motivos.join(" · ")}</span>
                  </div>
                  {podeEditar && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => conciliar(p.contaId, p.cashEntryId, p.valor, p.entradaData)}
                      className="mt-1.5 w-full rounded-[8px] bg-[var(--color-accent)] px-3 py-1 text-[12px] font-medium text-white hover:bg-[var(--color-accent2)] disabled:opacity-50"
                    >
                      {pending ? "Gravando…" : "Conciliar"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {aviso && (
            <p role="status" className={cn("mt-2 text-[12px]", aviso.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]")}>
              {aviso.texto}
            </p>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel
          cor="#FDE6E9"
          icone={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C0334A" strokeWidth="1.9" aria-hidden>
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5v5l3 2" />
            </svg>
          }
          titulo="Vencidas sem recebimento"
          descricao="Contas com saldo depois do vencimento, por idade"
          contador={vencidas.length}
          aberta={aberta === "vencidas"}
          onClick={() => setAberta(aberta === "vencidas" ? null : "vencidas")}
        >
          {vencidas.length === 0 ? (
            nada("Nenhuma conta vencida com saldo.")
          ) : (
            <ul className="space-y-1.5">
              {vencidas.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-1.5 text-[12px]">
                  <Badge tone={COR_FAIXA[v.faixa]}>{v.faixa}</Badge>
                  {linkConta(v.id, v.rotulo)}
                  <span className="text-[var(--color-ink2)]">
                    venceu {dateBR(v.vencimento)} ({v.dias} dia{v.dias === 1 ? "" : "s"}) · falta{" "}
                    <span className="font-[family-name:var(--font-mono)] text-[var(--color-danger)]">{brl(v.saldo)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel
          cor="#FEF3C7"
          icone={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="1.9" aria-hidden>
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 10h18M7 15h4" />
            </svg>
          }
          titulo="Recebidas sem conciliar"
          descricao="Baixas fora do extrato, e há quantos dias"
          contador={semConciliar.length}
          aberta={aberta === "semConciliar"}
          onClick={() => setAberta(aberta === "semConciliar" ? null : "semConciliar")}
        >
          {semConciliar.length === 0 ? (
            nada("Tudo que foi recebido está no extrato.")
          ) : (
            <ul className="space-y-1.5">
              {semConciliar.map((s) => (
                <li key={s.id} className="text-[12px]">
                  {linkConta(s.id, s.rotulo)}
                  <span className="text-[var(--color-ink2)]">
                    {" "}
                    · <span className="font-[family-name:var(--font-mono)]">{brl(s.valor)}</span>
                    {s.dias != null && ` · há ${s.dias} dia${s.dias === 1 ? "" : "s"}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel
          cor="#E7EDFD"
          icone={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2B5CD9" strokeWidth="1.9" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M8 9h8M8 13h8M8 17h4" />
            </svg>
          }
          titulo="Sem cliente"
          descricao="Contas que não dizem de quem são (e, nos dados antigos de venda, de qual unidade)"
          contador={semVinculo.length}
          aberta={aberta === "semVinculo"}
          onClick={() => setAberta(aberta === "semVinculo" ? null : "semVinculo")}
        >
          {semVinculo.length === 0 ? (
            nada("Todas as contas têm cliente.")
          ) : (
            <ul className="space-y-1.5">
              {semVinculo.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-1.5 text-[12px]">
                  {s.faltaUnidade && <Badge tone="warning">sem unidade</Badge>}
                  {s.faltaCliente && <Badge tone="warning">sem cliente</Badge>}
                  {linkConta(s.id, s.rotulo)}
                </li>
              ))}
            </ul>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel
          cor="#E6F4EA"
          icone={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1E7A3C" strokeWidth="1.9" aria-hidden>
              <path d="M4 18l5-6 4 3 7-9" />
            </svg>
          }
          titulo="Valor fora do padrão"
          descricao="Dados antigos: parcela mensal de venda que destoa das outras da mesma unidade (mais de 20 %)"
          contador={foraDoPadrao.length}
          aberta={aberta === "foraDoPadrao"}
          onClick={() => setAberta(aberta === "foraDoPadrao" ? null : "foraDoPadrao")}
        >
          {foraDoPadrao.length === 0 ? (
            nada("Nenhuma parcela destoa do padrão da unidade (precisa de 3 ou mais parcelas mensais por unidade).")
          ) : (
            <ul className="space-y-1.5">
              {foraDoPadrao.map((f) => (
                <li key={f.id} className="text-[12px]">
                  {linkConta(f.id, f.rotulo)}
                  <span className="text-[var(--color-ink2)]">
                    {" "}
                    · <span className="font-[family-name:var(--font-mono)]">{brl(f.valor)}</span> × padrão {brl(f.padrao)} ·{" "}
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-[var(--color-danger)]">
                    {f.desvio > 0 ? "+" : ""}
                    {Math.round(f.desvio * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AcaoDoPainel>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-[var(--color-ink3)]">
        As análises são feitas sobre as contas desta seleção, aqui no sistema. O assistente propõe o vínculo com o extrato; o vínculo
        só existe depois que você confirma. Ele nunca dá baixa sozinho, não altera conta conciliada e não cancela conta. A leitura de
        boleto e comprovante entra quando for decidido o envio de documentos ao provedor de IA.
      </p>
    </aside>
  );
}

function AcaoDoPainel({
  cor,
  icone,
  titulo,
  descricao,
  contador,
  aberta,
  onClick,
  children,
}: {
  cor: string;
  icone: React.ReactNode;
  titulo: string;
  descricao: string;
  contador: number;
  aberta: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-[11px] border border-[var(--color-line)]", aberta && "bg-[var(--color-surface2)]")}>
      <button
        type="button"
        onClick={onClick}
        aria-expanded={aberta}
        className="flex w-full items-center gap-2.5 rounded-[11px] p-2.5 text-left hover:bg-[var(--color-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent2)]/40"
      >
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px]" style={{ background: cor }}>
          {icone}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--color-ink)]">
            {titulo}
            {contador > 0 && <Badge tone="danger">{contador}</Badge>}
          </span>
          <span className="block text-[11.5px] leading-snug text-[var(--color-ink2)]">{descricao}</span>
        </span>
        <span className="text-[var(--color-ink3)]" aria-hidden>
          {aberta ? "▾" : "›"}
        </span>
      </button>
      {aberta && <div className="border-t border-[var(--color-line)] px-3 py-2.5">{children}</div>}
    </div>
  );
}

function Faisca() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7L12 3z" fill="#6D4BD1" />
      <path d="M18.5 15l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3z" fill="#3B82F6" />
    </svg>
  );
}
