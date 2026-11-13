"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnaliseDoPlano } from "@/lib/planocontas-analise";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

/**
 * Painel do assistente do Plano de Contas (Prompt G, Parte 2; Prompt E).
 * SOMENTE LEITURA — e esta tela fica fora da escrita assistida para sempre
 * (8.2.1). Mostra o USO do plano: nunca sugere categoria (8.2.2), nunca
 * afirma que conta está errada (8.2.3), nunca propõe fusão (8.2.4). Tudo é
 * código puro (`planocontas-analise.ts`) sobre o que a página carregou; o
 * período e as obras ficam declarados (8.4); quem não vê Despesas não recebe
 * contagem de lançamento (8.5). Não antecipa as quatro decisões pendentes.
 */

type Acao = "semuso" | "divergente" | "parecidas" | "onde";

export function AssistentePlanoContas({ usuario, analise }: { usuario: string; analise: AnaliseDoPlano }) {
  const chave = `gt:assistente:planocontas:recolhido:${usuario}`;
  const [recolhido, setRecolhido] = useState(false);
  const [aberta, setAberta] = useState<Acao | null>(null);
  const [busca, setBusca] = useState("");

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

  const { periodo, projetos, comLancamentos, comOrcamento, semUso, divergentes, parecidas, onde, totalContas } = analise;
  const ondeFiltrado = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return onde.slice(0, 12);
    return onde.filter((o) => o.code.toLowerCase().includes(q) || o.name.toLowerCase().includes(q)).slice(0, 12);
  }, [onde, busca]);

  if (recolhido) {
    return (
      <div className="mb-4">
        <button type="button" onClick={alternar} aria-expanded={false} aria-label="Abrir o assistente" title="Abrir o assistente" className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[var(--color-line)] bg-white shadow-sm hover:bg-[var(--color-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent2)]/40">
          <Faisca />
        </button>
      </div>
    );
  }

  const li = "text-[12px] text-[var(--color-ink2)]";
  const mono = "font-[family-name:var(--font-mono)] text-[11px]";
  const nunca = semUso.filter((s) => s.nunca).length;
  const escopo = (
    <p className="mb-2 text-[11px] leading-snug text-[var(--color-ink3)]">
      Período: lançamentos de <strong>{periodo.de}</strong> a <strong>{periodo.ate}</strong> (competência; sem ela, o mês da criação). Projetos: {projetos.length ? projetos.join(", ") : "nenhum"}.
    </p>
  );
  const semPermissao = <p className="text-[12px] text-[var(--color-warning)]">Sem permissão de ver Despesas: a contagem de lançamentos não é exibida, nem agregada.</p>;

  return (
    <section aria-label="Assistente do Plano de Contas" className="mb-4 rounded-[16px] border border-[var(--color-line)] bg-white p-4 shadow-[0_1px_3px_rgba(22,35,59,.06)]">
      <div className="mb-3 flex items-start gap-2.5">
        <Faisca />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[15px] font-bold text-[var(--color-ink)]">
            Assistente IA
            <Badge tone="neutral">Somente leitura</Badge>
          </div>
          <div className="text-[12px] text-[var(--color-ink2)]">Uso real do plano · {totalContas} conta(s)</div>
        </div>
        <button type="button" onClick={alternar} aria-expanded={true} aria-label="Recolher o assistente" title="Recolher" className="rounded-[8px] p-1 text-[var(--color-ink3)] hover:bg-[var(--color-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent2)]/40">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        <AcaoDoPainel cor="#FEF3C7" icone={<Icone cor="#B45309" d="M12 8v4l3 3M3.5 12a8.5 8.5 0 1 0 17 0 8.5 8.5 0 0 0-17 0z" />} titulo="Contas sem uso" descricao="Cadastradas e sem lançamento no período, com a data do último quando houver" contador={semUso.length} aberta={aberta === "semuso"} onClick={() => setAberta(aberta === "semuso" ? null : "semuso")}>
          {escopo}
          {!comLancamentos ? (
            semPermissao
          ) : semUso.length === 0 ? (
            <p className={li}>Toda conta ativa recebeu lançamento no período.</p>
          ) : (
            <>
              <p className={cn(li, "mb-1")}>
                {semUso.length - nunca} com lançamento só fora do período · {nunca} nunca receberam (conta criada e esquecida, ou etapa do projeto que ainda não começou — a lista não distingue; você sim).
              </p>
              <ul className="max-h-56 space-y-0.5 overflow-auto">
                {semUso.map((s) => (
                  <li key={s.code} className={li}>
                    <span className={mono}>{s.code}</span> {s.name} <span className="text-[var(--color-ink3)]">· {s.grupo}</span>
                    {s.nunca ? <span className="text-[var(--color-ink3)]"> · nunca</span> : <span className="text-[var(--color-ink3)]"> · último em {s.ultimo}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#FDE6E9" icone={<Icone cor="#C0334A" d="M12 7.5v5M12 16h.01M3.5 12a8.5 8.5 0 1 0 17 0 8.5 8.5 0 0 0-17 0z" />} titulo="Uso divergente da natureza" descricao="Conta de um grupo recebendo categoria DRE que não costuma combinar com ele" contador={divergentes.length} aberta={aberta === "divergente"} onClick={() => setAberta(aberta === "divergente" ? null : "divergente")}>
          {escopo}
          {!comLancamentos ? (
            semPermissao
          ) : divergentes.length === 0 ? (
            <p className={li}>Nenhuma divergência nestas leituras — o que não é atestado de que o plano está certo.</p>
          ) : (
            <ul className="max-h-64 space-y-1.5 overflow-auto">
              {divergentes.map((d) => (
                <li key={d.code} className={li}>
                  <span className={mono}>{d.code}</span> {d.name} <span className="text-[var(--color-ink3)]">· {d.grupo} · {d.kind === "cef" ? "custo direto dos serviços" : "complementar"}, {d.natureza}</span>
                  <div className="pl-3">
                    {d.categorias.map((x) => (
                      <div key={x.categoria}>
                        <span className="text-[var(--color-warning)]">{x.categoria}</span>: {x.n} lançamento(s)
                      </div>
                    ))}
                    {d.combinam.length > 0 && <div className="text-[var(--color-ink3)]">no mesmo período, {d.combinam.map((x) => `${x.categoria}: ${x.n}`).join("; ")}</div>}
                  </div>
                </li>
              ))}
              <li className="text-[var(--color-ink3)]">Leitura: custo direto dos serviços costuma entrar como Custo; grupo complementar, como Despesa. O painel mostra a divergência; não diz que está errado nem sugere categoria.</li>
            </ul>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#F3EFFE" icone={<Icone cor="#6D4BD1" d="M8 7h12v12H8zM4 4h12v3M4 4v12h4" />} titulo="Contas parecidas" descricao="Nomes próximos que podem dividir o mesmo gasto em duas linhas" contador={parecidas.length} aberta={aberta === "parecidas"} onClick={() => setAberta(aberta === "parecidas" ? null : "parecidas")}>
          {parecidas.length === 0 ? (
            <p className={li}>Nenhum par de nomes próximos no mesmo tipo de grupo.</p>
          ) : (
            <ul className="max-h-56 space-y-1 overflow-auto">
              {parecidas.map((p, i) => (
                <li key={i} className={li}>
                  <span className={mono}>{p.a.code}</span> {p.a.name} <span className="text-[var(--color-ink3)]">×</span> <span className={mono}>{p.b.code}</span> {p.b.name} <span className="text-[var(--color-ink3)]">· {p.motivo}</span>
                </li>
              ))}
              <li className="text-[var(--color-ink3)]">É observação. Unir contas é migração de dado — o painel não propõe.</li>
            </ul>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#E7EDFD" icone={<Icone cor="#2B5CD9" d="M3 5h18v14H3zM3 10h18M8 5v14" />} titulo="Onde cada conta aparece" descricao="Em quais telas e relatórios ela entra, e por qual categoria" contador={0} aberta={aberta === "onde"} onClick={() => setAberta(aberta === "onde" ? null : "onde")}>
          {escopo}
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Código ou nome da conta" aria-label="Buscar conta" className="mb-2 h-9 text-[12px]" />
          <ul className="max-h-64 space-y-1.5 overflow-auto">
            {ondeFiltrado.map((o) => (
              <li key={o.code} className={li}>
                <span className={mono}>{o.code}</span> {o.name}
                <div className="pl-3 text-[var(--color-ink3)]">
                  <div>Seletor de conta: {o.seletores.length ? o.seletores.join(", ") : "nenhum (inativa)"}</div>
                  <div>Orçamentos / Previsão: {!comOrcamento ? "sem permissão de ver" : o.orcamentoEm.length ? o.orcamentoEm.join(", ") : "sem linha nos projetos do período"}</div>
                  <div>
                    DRE: {!comLancamentos ? "sem permissão de ver Despesas" : o.dre.length ? o.dre.map((d) => `${d.categoria} (${d.n})`).join(", ") : "nenhum lançamento no período — por isso o gasto não está na DRE"}
                  </div>
                </div>
              </li>
            ))}
            {ondeFiltrado.length === 0 && <li className={li}>Nenhuma conta com esse texto.</li>}
            {!busca && onde.length > 12 && <li className="text-[var(--color-ink3)]">Mostrando 12 de {onde.length}; digite para buscar.</li>}
          </ul>
        </AcaoDoPainel>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-[var(--color-ink3)]">
        Somente leitura: mostra o uso do plano e nada mais. Não cria, edita, inativa nem reordena conta; não sugere categoria nem fusão. Classificação é decisão contábil, e reclassificar muda relatório de período já fechado. Ausência de achado não é atestado.
      </p>
    </section>
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
            {contador > 0 && <Badge tone="warning">{contador}</Badge>}
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
