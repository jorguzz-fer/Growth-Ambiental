"use client";

import { useEffect, useState } from "react";
import type { AnaliseDeCartoes } from "@/lib/cartao-analise";
import { cn, brl0, dateBR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * Painel do assistente de Cartões (Prompt U, seção 7; Prompt E). SOMENTE
 * LEITURA: analisa o que a página carregou, em código puro
 * (`cartao-analise.ts`). Nada vai a modelo; nenhum número de cartão entra.
 *
 * Nunca: lançar despesa, pagar fatura, registrar estorno, ou projetar juro
 * sem taxa definida (BU-3). A conferência do extrato propõe o lançamento
 * (BU-2) — quem lança é o usuário, em Despesas.
 */

type Acao = "extrato" | "projecao" | "semObra" | "limite";

export function AssistenteCartoes({ usuario, analise }: { usuario: string; analise: AnaliseDeCartoes }) {
  const chave = `gt:assistente:cartoes:recolhido:${usuario}`;
  const [recolhido, setRecolhido] = useState(false);
  const [aberta, setAberta] = useState<Acao | null>(null);

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
      /* preferência não persiste */
    }
  };

  if (recolhido) {
    return (
      <aside className="shrink-0 min-[1180px]:sticky min-[1180px]:top-20">
        <button type="button" onClick={alternar} aria-expanded={false} aria-label="Abrir o assistente" title="Abrir o assistente" className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[var(--color-line)] bg-white shadow-sm hover:bg-[var(--color-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent2)]/40">
          <Faisca />
        </button>
      </aside>
    );
  }

  const { projecoes, limites, semObra, extrato, totalCartoes } = analise;
  const li = "text-[12px] text-[var(--color-ink2)]";
  const nome = "font-medium text-[var(--color-ink)]";
  const nada = (t: string) => <p className="text-[12px] text-[var(--color-ink2)]">{totalCartoes === 0 ? "Nenhum cartão ativo." : t}</p>;
  const alternarAcao = (a: Acao) => setAberta(aberta === a ? null : a);
  const divergenciasDoExtrato = extrato ? extrato.semLancamento + extrato.semExtrato + extrato.divergentes + extrato.creditosSemEstorno : 0;
  const limitesApertados = limites.filter((l) => l.pct != null && l.pct >= 80).length;

  return (
    <aside aria-label="Assistente de Cartões" className="w-full shrink-0 rounded-[16px] border border-[var(--color-line)] bg-white p-4 shadow-sm min-[1180px]:sticky min-[1180px]:top-20 min-[1180px]:w-[300px]">
      <div className="mb-3 flex items-start gap-2.5">
        <Faisca />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[15px] font-bold text-[var(--color-ink)]">
            Assistente IA
            <Badge tone="neutral">Somente leitura</Badge>
          </div>
          <div className="text-[12px] text-[var(--color-ink2)]">Cartões · {totalCartoes} ativo(s)</div>
        </div>
        <button type="button" onClick={alternar} aria-expanded={true} aria-label="Recolher o assistente" title="Recolher" className="rounded-[8px] p-1 text-[var(--color-ink3)] hover:bg-[var(--color-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent2)]/40">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        <AcaoDoPainel cor="#FDE6E9" icone={<Icone cor="#C0334A" d="M4 4h16v16H4zM8 9h8M8 13h5" />} titulo="Extrato × lançamentos" descricao="O que está no cartão e não foi lançado, e o contrário" contador={divergenciasDoExtrato} aberta={aberta === "extrato"} onClick={() => alternarAcao("extrato")}>
          {!extrato ? (
            <p className={li}>Escolha um cartão e suba o extrato no card de conferência; o assistente lê o resultado.</p>
          ) : (
            <ul className="space-y-1">
              <li className={li}><span className={nome}>{extrato.cartao}</span></li>
              <li className={li}>{extrato.semLancamento} compra(s) no extrato sem lançamento ({brl0(extrato.valorSemLancamento)}) — o card propõe o lançamento; você confirma em Despesas.</li>
              <li className={li}>{extrato.semExtrato} lançamento(s) sem correspondência no extrato.</li>
              <li className={li}>{extrato.divergentes} par(es) com divergência de valor ou data.</li>
              <li className={li}>{extrato.creditosSemEstorno} crédito(s) sem estorno registrado.</li>
            </ul>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#E6F4EA" icone={<Icone cor="#1E7A3C" d="M3 17l6-6 4 4 8-8M14 7h7v7" />} titulo="Projeção do ciclo" descricao="O que já caiu, o que ainda cai e o total esperado" contador={0} aberta={aberta === "projecao"} onClick={() => alternarAcao("projecao")}>
          {projecoes.length === 0 ? nada("Sem ciclo em curso.") : (
            <ul className="space-y-2">
              {projecoes.map((p) => (
                <li key={p.cartaoId} className={li}>
                  <span className={nome}>{p.nome}</span>{p.fechamento ? ` · fecha ${dateBR(p.fechamento)}` : ""}
                  <div>já caiu {brl0(p.projecao.totalPrevisto)} (compras {brl0(p.projecao.comprasDoCiclo)} · parcelas {brl0(p.projecao.parcelasAnteriores)} · rotativo {brl0(p.projecao.rotativoAnterior)})</div>
                  <div>ainda cai {brl0(p.aindaCai)} em parcelas futuras · total esperado {brl0(p.totalEsperado)}</div>
                  {p.projecao.juroEstimado == null ? <div className="text-[11px] text-[var(--color-ink4)]">sem taxa: não projeta juro</div> : p.projecao.juroEstimado > 0 ? <div className="text-[11px] text-[var(--color-ink3)]">juro do rotativo — estimativa {brl0(p.projecao.juroEstimado)}, fora de Contas a Pagar</div> : null}
                </li>
              ))}
            </ul>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#FFF1DB" icone={<Icone cor="#B45309" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />} titulo="Compras sem projeto" descricao="Lançamentos no cartão sem projeto vinculado" contador={semObra.length} aberta={aberta === "semObra"} onClick={() => alternarAcao("semObra")}>
          {semObra.length === 0 ? nada("Toda compra no cartão tem projeto.") : (
            <ul className="space-y-1">
              {semObra.map((c) => (
                <li key={c.despesaId} className={li}>
                  <span className={nome}>{c.numDoc ?? "sem PED"}</span> · {c.descricao ?? "—"} · {brl0(c.valor)} · {c.cartao}
                </li>
              ))}
            </ul>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#EAE6FB" icone={<Icone cor="#6D4BD1" d="M11 3a9 9 0 109 9h-9V3zM13 3a9 9 0 019 9h-9V3z" />} titulo="Limite" descricao="Quanto do limite está comprometido pelo ciclo aberto e pelas parcelas futuras" contador={limitesApertados} aberta={aberta === "limite"} onClick={() => alternarAcao("limite")}>
          {limites.length === 0 ? nada("Sem cartão ativo.") : (
            <ul className="space-y-1.5">
              {limites.map((l) => (
                <li key={l.cartaoId} className={li}>
                  <span className={nome}>{l.nome}</span>: comprometido {brl0(l.comprometido)} (em aberto {brl0(l.cicloAberto)} + futuras {brl0(l.parcelasFuturas)})
                  {l.limite == null ? <span className="text-[var(--color-ink4)]"> · sem limite cadastrado</span> : <> · {l.pct}% de {brl0(l.limite)} · disponível <strong className={l.disponivel != null && l.disponivel < 0 ? "text-[var(--color-danger)]" : undefined}>{brl0(l.disponivel ?? 0)}</strong></>}
                </li>
              ))}
            </ul>
          )}
        </AcaoDoPainel>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-[var(--color-ink3)]">
        Somente leitura: analisa o que a tela carregou, em código puro. Não lança despesa, não paga fatura, não registra estorno e não projeta juro sem taxa. Nenhum número de cartão entra aqui.
      </p>
    </aside>
  );
}

function Icone({ cor, d }: { cor: string; d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="1.9" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function AcaoDoPainel({ cor, icone, titulo, descricao, contador, aberta, onClick, children }: { cor: string; icone: React.ReactNode; titulo: string; descricao: string; contador: number; aberta: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[11px] border border-[var(--color-line)]", aberta && "bg-[var(--color-surface2)]")}>
      <button type="button" onClick={onClick} aria-expanded={aberta} className="flex w-full items-center gap-2.5 rounded-[11px] p-2.5 text-left hover:bg-[var(--color-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent2)]/40">
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
