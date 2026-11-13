"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AnaliseDeEquipes, PropostaDeDiaria } from "@/lib/pessoas-analise";
import { lerFolhaDePonto, registrarDiariasDoDia } from "@/lib/actions/equipes";
import { cn, brl0, dateBR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Faisca } from "@/components/app/assistente-funcionarios";

/**
 * Assistente de Equipes (Prompt Z, 6.2; Prompt E). PROPÕE E PARA: a lista
 * de quem trabalhou hoje (a partir da equipe) e a leitura da folha de ponto
 * anexada viram PROPOSTAS; a gravação acontece só com o clique, pela mesma
 * `registrarDiariasDoDia` da tela. Nunca aloca, desaloca ou lança despesa.
 * Recebe nomes, datas e quantidades — nunca dado pessoal (6.3).
 */
type Acao = "dia" | "folha" | "pagamento" | "semEquipe" | "semFuncao" | "sobreposicao";
const qtd = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function AssistenteEquipes({ usuario, projectId, hojeInterno, analise, diasComFolha, canCriar, aiConfigurada }: { usuario: string; projectId: string; hojeInterno: string; analise: AnaliseDeEquipes; diasComFolha: { id: string; data: string }[]; canCriar: boolean; aiConfigurada: boolean }) {
  const chave = `gt:assistente:equipes:recolhido:${usuario}`;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [recolhido, setRecolhido] = useState(false);
  const [aberta, setAberta] = useState<Acao | null>(null);
  const [proposta, setProposta] = useState<Record<string, number>>({});
  const [diaId, setDiaId] = useState("");
  const [lida, setLida] = useState<{ data: string; casados: PropostaDeDiaria[]; semPar: string[]; observacoes: string[] } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  useEffect(() => {
    try {
      setRecolhido(window.localStorage.getItem(chave) === "1");
    } catch {
      /* sem localStorage */
    }
  }, [chave]);
  useEffect(() => {
    setProposta(Object.fromEntries(analise.propostaDoDia.map((p) => [p.equipeProjetoId, p.quantidade])));
  }, [analise.propostaDoDia]);
  const alternar = () => {
    const p = !recolhido;
    setRecolhido(p);
    try {
      window.localStorage.setItem(chave, p ? "1" : "0");
    } catch {
      /* não persiste */
    }
  };
  if (recolhido) {
    return (
      <aside className="shrink-0 min-[1180px]:sticky min-[1180px]:top-20">
        <button type="button" onClick={alternar} aria-expanded={false} aria-label="Abrir o assistente" className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[var(--color-line)] bg-white shadow-sm hover:bg-[var(--color-surface2)]"><Faisca /></button>
      </aside>
    );
  }
  const confirmar = (data: string, itens: { equipeProjetoId: string; quantidade: number }[]) =>
    start(async () => {
      const r = await registrarDiariasDoDia({ projectId, data, itens });
      if (!r.ok) return setMsg({ ok: false, texto: r.error });
      setMsg({ ok: true, texto: `${r.registradas} diária(s) registrada(s) em ${dateBR(data)} com a sua confirmação. Nenhuma despesa foi gerada.` });
      setLida(null);
      router.refresh();
    });
  const ler = () =>
    start(async () => {
      const r = await lerFolhaDePonto(diaId);
      if (!r.ok) return setMsg({ ok: false, texto: r.error });
      setLida({ data: r.data, casados: r.casados, semPar: r.semPar, observacoes: r.observacoes });
    });
  const { propostaDoDia, diariasSemLancamento, obrasSemEquipe, alocacaoSemFuncao, sobreposicoes } = analise;
  const li = "text-[12px] text-[var(--color-ink2)]";
  const nome = "font-medium text-[var(--color-ink)]";
  const a = (x: Acao) => setAberta(aberta === x ? null : x);
  const itensDoDia = Object.entries(proposta).filter(([, q]) => q > 0).map(([equipeProjetoId, quantidade]) => ({ equipeProjetoId, quantidade }));
  return (
    <aside aria-label="Assistente de Equipes e Presença de Campo" className="w-full shrink-0 rounded-[16px] border border-[var(--color-line)] bg-white p-4 shadow-sm min-[1180px]:sticky min-[1180px]:top-20 min-[1180px]:w-[320px]">
      <div className="mb-3 flex items-start gap-2.5">
        <Faisca />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[15px] font-bold text-[var(--color-ink)]">Assistente IA <Badge tone="neutral">Propõe, você confirma</Badge></div>
          <div className="text-[12px] text-[var(--color-ink2)]">Equipes e Presença de Campo · diárias do dia e folha de ponto</div>
        </div>
        <button type="button" onClick={alternar} aria-expanded={true} aria-label="Recolher o assistente" className="rounded-[8px] p-1 text-[var(--color-ink3)] hover:bg-[var(--color-surface2)]"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden><path d="M9 6l6 6-6 6" /></svg></button>
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mb-2 rounded-[8px] px-2 py-1 text-[11.5px] ${msg.ok ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" : "bg-[var(--color-danger)]/10 text-[var(--color-danger)]"}`}>{msg.texto}</p>}
      <div className="space-y-2">
        <Acao cor="#E6F4EA" cor2="#1E7A3C" d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" titulo="Registrar as diárias de hoje" descricao="A partir da equipe alocada: confirme ou ajuste — vira o lançamento em lote num clique" contador={propostaDoDia.length} aberta={aberta === "dia"} onClick={() => a("dia")}>
          {propostaDoDia.length === 0 ? <p className={li}>Hoje já está registrado, ou não há equipe ativa.</p> : (
            <>
              <ul className="space-y-1" data-proposta-dia>
                {propostaDoDia.map((p) => (
                  <li key={p.equipeProjetoId} className={`${li} flex items-center gap-2`}>
                    <input type="checkbox" checked={(proposta[p.equipeProjetoId] ?? 0) > 0} onChange={(e) => setProposta({ ...proposta, [p.equipeProjetoId]: e.target.checked ? 1 : 0 })} aria-label={`Trabalhou hoje: ${p.nome}`} />
                    <span className={`${nome} min-w-0 flex-1 truncate`}>{p.nome}</span>
                    {p.semValor && <Badge tone="warning">sem valor</Badge>}
                    <Select value={String(proposta[p.equipeProjetoId] ?? 1)} onChange={(e) => setProposta({ ...proposta, [p.equipeProjetoId]: Number(e.target.value) })} aria-label={`Quantidade hoje: ${p.nome}`} className="w-16">{[0.5, 1, 1.5, 2].map((q) => <option key={q} value={q}>{qtd(q)}</option>)}</Select>
                  </li>
                ))}
              </ul>
              {canCriar && <Button size="sm" variant="outline" className="mt-2" disabled={pending || itensDoDia.length === 0} onClick={() => confirmar(hojeInterno, itensDoDia)}>Confirmar {itensDoDia.length} diária(s) de {dateBR(hojeInterno)}</Button>}
            </>
          )}
        </Acao>
        <Acao cor="#EAE6FB" cor2="#6D4BD1" d="M4 4h12l4 4v12H4zM8 12h8M8 16h8" titulo="Ler a folha de ponto anexada" descricao="Extrai os nomes e os dias do documento e propõe os registros — não grava" contador={lida?.casados.length ?? 0} aberta={aberta === "folha"} onClick={() => a("folha")}>
          {!aiConfigurada ? <p className={li}>Leitura por IA não configurada (ANTHROPIC_API_KEY).</p> : diasComFolha.length === 0 ? <p className={li}>Nenhum dia tem &quot;Folha de ponto assinada&quot; anexada. Só esse tipo de documento é lido — nunca documento de funcionário.</p> : (
            <>
              <div className="flex gap-2">
                <Select value={diaId} onChange={(e) => setDiaId(e.target.value)} aria-label="Dia da folha de ponto"><option value="">— dia —</option>{diasComFolha.map((d) => <option key={d.id} value={d.id}>{dateBR(d.data)}</option>)}</Select>
                <Button size="sm" variant="outline" disabled={pending || !diaId} onClick={ler}>{pending ? "Lendo…" : "Ler"}</Button>
              </div>
              {lida && (
                <div className="mt-2 space-y-1">
                  {lida.observacoes.length > 0 && <p className="text-[11px] text-[var(--color-ink3)]">{lida.observacoes.join("; ")}</p>}
                  <ul className="space-y-1">{lida.casados.map((c) => <li key={c.equipeProjetoId} className={li}><span className={nome}>{c.nome}</span> · {qtd(c.quantidade)} diária(s){c.semValor && <Badge tone="warning" className="ml-1">sem valor</Badge>}</li>)}</ul>
                  {lida.semPar.length > 0 && <p className="text-[11px] text-[var(--color-warning)]">Sem par na equipe: {lida.semPar.join(", ")} — aloque antes, se for o caso.</p>}
                  {canCriar && lida.casados.length > 0 && <Button size="sm" variant="outline" disabled={pending} onClick={() => confirmar(lida.data, lida.casados.map((c) => ({ equipeProjetoId: c.equipeProjetoId, quantidade: c.quantidade })))}>Confirmar {lida.casados.length} registro(s) de {dateBR(lida.data)}</Button>}
                </div>
              )}
            </>
          )}
        </Acao>
        <Acao cor="#FFF1DB" cor2="#B45309" d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" titulo="Diárias sem lançamento de pagamento" descricao="Membros com diárias registradas e sem despesa correspondente (BZ-1)" contador={diariasSemLancamento.length} aberta={aberta === "pagamento"} onClick={() => a("pagamento")}>
          {diariasSemLancamento.length === 0 ? <p className={li}>Toda diária de autônomo já tem despesa lançada.</p> : <ul className="space-y-1">{diariasSemLancamento.map((x) => <li key={x.equipeProjetoId} className={li}><span className={nome}>{x.nome}</span> · {qtd(x.quantidade)} diária(s) · {brl0(x.valor)} — use &quot;Lançar em Despesas&quot; no acumulado.</li>)}</ul>}
        </Acao>
        <Acao cor="#FDE6E9" cor2="#C0334A" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" titulo="Projeto sem equipe" descricao="Projetos sem ninguém alocado" contador={obrasSemEquipe.length} aberta={aberta === "semEquipe"} onClick={() => a("semEquipe")}>
          {obrasSemEquipe.length === 0 ? <p className={li}>Todo projeto tem equipe.</p> : <ul className="space-y-1">{obrasSemEquipe.map((o) => <li key={o.projectId} className={li}><span className={nome}>{o.projectName}</span></li>)}</ul>}
        </Acao>
        <Acao cor="#E8F1FB" cor2="#2563EB" d="M4 6h16M4 12h16M4 18h10" titulo="Alocação sem função" descricao="Membros ativos sem função neste projeto" contador={alocacaoSemFuncao.length} aberta={aberta === "semFuncao"} onClick={() => a("semFuncao")}>
          {alocacaoSemFuncao.length === 0 ? <p className={li}>Todos têm função.</p> : <ul className="space-y-1">{alocacaoSemFuncao.map((x) => <li key={x.equipeProjetoId} className={li}><span className={nome}>{x.nome}</span></li>)}</ul>}
        </Acao>
        <Acao cor="#EAE6FB" cor2="#6D4BD1" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87" titulo="Alocações sobrepostas" descricao="A mesma pessoa ativa em projetos diferentes — pode ser legítimo ou erro" contador={sobreposicoes.length} aberta={aberta === "sobreposicao"} onClick={() => a("sobreposicao")}>
          {sobreposicoes.length === 0 ? <p className={li}>Ninguém está ativo em mais de um projeto.</p> : <ul className="space-y-1">{sobreposicoes.map((x) => <li key={x.nome} className={li}><span className={nome}>{x.nome}</span> · {x.obras.join(" e ")}</li>)}</ul>}
        </Acao>
      </div>
      <p className="mt-3 text-[11px] leading-snug text-[var(--color-ink3)]">Ele propõe, você confirma: a diária só é gravada pelo seu clique. Nunca aloca ou desaloca membro, nunca lança despesa, e nunca lê documento de funcionário — só a folha de ponto do dia.</p>
    </aside>
  );
}

function Acao({ cor, cor2, d, titulo, descricao, contador, aberta, onClick, children }: { cor: string; cor2: string; d: string; titulo: string; descricao: string; contador: number; aberta: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[11px] border border-[var(--color-line)]", aberta && "bg-[var(--color-surface2)]")}>
      <button type="button" onClick={onClick} aria-expanded={aberta} className="flex w-full items-center gap-2.5 rounded-[11px] p-2.5 text-left hover:bg-[var(--color-surface2)]">
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px]" style={{ background: cor }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cor2} strokeWidth="1.9" aria-hidden><path d={d} /></svg></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--color-ink)]">{titulo}{contador > 0 && <Badge tone="danger">{contador}</Badge>}</span>
          <span className="block text-[11.5px] leading-snug text-[var(--color-ink2)]">{descricao}</span>
        </span>
        <span className="text-[var(--color-ink3)]" aria-hidden>{aberta ? "▾" : "›"}</span>
      </button>
      {aberta && <div className="border-t border-[var(--color-line)] px-3 py-2.5">{children}</div>}
    </div>
  );
}
