"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { AnaliseDeProjeto, AnaliseDeProjetos } from "@/lib/projeto-analise";
import { CHAVE_PROPOSTA_PROJETO, EVENTO_PROPOSTA_PROJETO, type CampoProjeto, type PropostaDeProjeto, type PropostaDeProjetoGuardada } from "@/lib/ai/projeto-doc";
import { proporDadosDoProjetoPorDocumento } from "@/lib/actions/projetos-assistente";
import { cn, dateBR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Faisca } from "@/components/app/assistente-funcionarios";

/**
 * Assistente da tela de Projetos (Prompt B, 24–29).
 *
 * Visão "Todos": SOMENTE LEITURA — Dica da IA e as análises feitas no
 * servidor sobre os projetos do tenant (cadastro incompleto, inconsistências,
 * funding, sem documento, sem classificação). Nenhum id sai do cliente.
 *
 * Visão de um projeto: PROPÕE, VOCÊ CONFIRMA — "Extrair dados de documentos"
 * lê um documento DESTE projeto (validado no servidor) e devolve uma proposta
 * campo a campo; "Aplicar ao formulário" só preenche o formulário da obra; o
 * Salvar do usuário é que grava, com `origem: "assistente"` no log. Sem
 * permissão de editar, nada pode ser aplicado (a action recusa também).
 * "Comparar orçado x realizado" é leitura do card.
 */
type Acao = "incompleto" | "inconsistencias" | "funding" | "documentos" | "classificacao" | "extrair" | "comparar";

export interface DocumentoDoAssistente {
  id: string;
  filename: string;
  tipo: string | null;
  legivel: boolean;
}

export function AssistenteProjetos(props: { usuario: string; aiConfigurada: boolean } & ({ modo: "todos"; analise: AnaliseDeProjetos } | { modo: "projeto"; projectId: string; nome: string; analise: AnaliseDeProjeto; documentos: DocumentoDoAssistente[]; canEditar: boolean })) {
  const { usuario } = props;
  const chave = `gt:assistente:projetos:recolhido:${usuario}`;
  const [recolhido, setRecolhido] = useState(false);
  const [aberta, setAberta] = useState<Acao | null>(null);
  useEffect(() => {
    try {
      setRecolhido(window.localStorage.getItem(chave) === "1");
    } catch {
      /* sem localStorage */
    }
  }, [chave]);
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
  const a = (x: Acao) => setAberta(aberta === x ? null : x);
  const li = "text-[12px] text-[var(--color-ink2)]";
  const nome = "font-medium text-[var(--color-ink)]";
  const propoe = props.modo === "projeto";
  return (
    <aside aria-label="Assistente de Projetos" className="w-full shrink-0 rounded-[16px] border border-[#e9d5ff] bg-[#fcfaff] p-4 shadow-sm min-[1180px]:sticky min-[1180px]:top-20 min-[1180px]:w-[300px]">
      <div className="mb-3 flex items-start gap-2.5">
        <Faisca />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[15px] font-bold text-[var(--color-ink)]">Assistente IA <Badge tone="neutral">{propoe ? "Propõe, você confirma" : "Somente leitura"}</Badge></div>
          <div className="text-[12px] text-[var(--color-ink2)]">{propoe ? `Projeto ${props.nome}` : "Projetos · todos da empresa"}</div>
        </div>
        <button type="button" onClick={alternar} aria-expanded={true} aria-label="Recolher o assistente" className="rounded-[8px] p-1 text-[var(--color-ink3)] hover:bg-[var(--color-surface2)]"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden><path d="M9 6l6 6-6 6" /></svg></button>
      </div>

      {props.modo === "todos" && (
        <p data-dica className="mb-3 rounded-[10px] border border-[#e9d5ff] bg-white px-3 py-2 text-[12px] leading-snug text-[var(--color-ink)]">
          <strong className="text-[#6D4BD1]">Dica da IA:</strong> {props.analise.dica}
        </p>
      )}

      <div className="space-y-2">
        {props.modo === "todos" ? <AcoesDeTodos analise={props.analise} aberta={aberta} a={a} li={li} nome={nome} /> : <AcoesDeProjeto {...props} aberta={aberta} a={a} li={li} nome={nome} />}
      </div>
      <p className="mt-3 text-[11px] leading-snug text-[var(--color-ink3)]">
        {propoe ? "Ele propõe, você confirma: a proposta só entra no formulário; gravar é o seu Salvar, com a sua permissão. Nunca muda status, cliente, datas, valores ou documentos por conta própria." : "Só leitura: analisa os projetos desta empresa e aponta o que falta. Abra um projeto para extrair dados de documentos e comparar orçado x realizado."}
      </p>
    </aside>
  );
}

function AcoesDeTodos({ analise, aberta, a, li, nome }: { analise: AnaliseDeProjetos; aberta: Acao | null; a: (x: Acao) => void; li: string; nome: string }) {
  const L = ({ id, children }: { id: string; children: React.ReactNode }) => <Link href={`/projeto?proj=${id}`} className={`${nome} hover:underline`}>{children}</Link>;
  return (
    <>
      <Acao cor="#FFF1DB" cor2="#B45309" d="M12 9v4m0 4h.01M10.3 3.9L2.6 17a2 2 0 001.7 3h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" titulo="Completar cadastro" descricao="Projetos sem datas, valores, custos, endereço ou município" contador={analise.cadastroIncompleto.length} aberta={aberta === "incompleto"} onClick={() => a("incompleto")}>
        {analise.cadastroIncompleto.length === 0 ? <p className={li}>Todos os projetos têm o cadastro básico.</p> : <ul className="space-y-1">{analise.cadastroIncompleto.map((x) => <li key={x.id} className={li}><L id={x.id}>{x.nome}</L> · falta {x.itens.join(", ")}</li>)}</ul>}
      </Acao>
      <Acao cor="#FDE6E9" cor2="#C0334A" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" titulo="Revisar inconsistências" descricao="Duração ≠ datas, fim antes do início, município sem IBGE, período de planejamento" contador={analise.inconsistencias.length} aberta={aberta === "inconsistencias"} onClick={() => a("inconsistencias")}>
        {analise.inconsistencias.length === 0 ? <p className={li}>Nenhuma inconsistência.</p> : <ul className="space-y-1.5">{analise.inconsistencias.map((x) => <li key={x.id} className={li}><L id={x.id}>{x.nome}</L><ul className="ml-3 list-disc">{x.itens.map((t) => <li key={t}>{t}</li>)}</ul></li>)}</ul>}
      </Acao>
      {/* Growth Ambiental: fontes de financiamento só nos dados antigos de incorporação. */}
      {analise.funding.length > 0 && (
      <Acao cor="#E8F1FB" cor2="#2563EB" d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" titulo="Fontes de financiamento (dados antigos)" descricao="Financiamentos gravados que não alcançam a receita prevista" contador={analise.funding.length} aberta={aberta === "funding"} onClick={() => a("funding")}>
        <ul className="space-y-1">{analise.funding.map((x) => <li key={x.id} className={li}><L id={x.id}>{x.nome}</L> · {x.itens[0]}</li>)}</ul>
      </Acao>
      )}
      <Acao cor="#EAE6FB" cor2="#6D4BD1" d="M4 4h12l4 4v12H4zM8 12h8M8 16h8" titulo="Projetos sem documentos" descricao="Projetos sem contrato, proposta ou outro anexo" contador={analise.semDocumentos.length} aberta={aberta === "documentos"} onClick={() => a("documentos")}>
        {analise.semDocumentos.length === 0 ? <p className={li}>Todo projeto tem ao menos um documento.</p> : <ul className="space-y-1">{analise.semDocumentos.map((x) => <li key={x.id} className={li}><L id={x.id}>{x.nome}</L></li>)}</ul>}
      </Acao>
      <Acao cor="#E6F4EA" cor2="#1E7A3C" d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" titulo="Sem classificação" descricao="Projetos ainda sem Ativo/Finalizado — classifique no card" contador={analise.semClassificacao.length} aberta={aberta === "classificacao"} onClick={() => a("classificacao")}>
        {analise.semClassificacao.length === 0 ? <p className={li}>Todos classificados.</p> : <ul className="space-y-1">{analise.semClassificacao.map((x) => <li key={x.id} className={li}><L id={x.id}>{x.nome}</L></li>)}</ul>}
      </Acao>
    </>
  );
}

function AcoesDeProjeto({ projectId, analise, documentos, canEditar, aiConfigurada, aberta, a, li, nome }: { projectId: string; analise: AnaliseDeProjeto; documentos: DocumentoDoAssistente[]; canEditar: boolean; aiConfigurada: boolean; aberta: Acao | null; a: (x: Acao) => void; li: string; nome: string }) {
  const [docId, setDocId] = useState("");
  const [proposta, setProposta] = useState<PropostaDeProjeto | null>(null);
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pending, start] = useTransition();
  const legiveis = documentos.filter((d) => d.legivel);
  const ler = () =>
    start(async () => {
      setMsg(null);
      const r = await proporDadosDoProjetoPorDocumento(projectId, docId);
      if (!r.ok) return setMsg({ ok: false, texto: r.error });
      setProposta(r.proposta);
      setMarcados(Object.fromEntries(r.proposta.campos.map((c) => [c.campo, true])));
      if (r.proposta.campos.length === 0) setMsg({ ok: true, texto: "O documento não traz nada diferente do cadastro." });
    });
  const aplicar = () => {
    if (!proposta) return;
    const campos: Partial<Record<CampoProjeto, string>> = {};
    for (const c of proposta.campos) if (marcados[c.campo]) campos[c.campo] = c.proposto;
    const guardada: PropostaDeProjetoGuardada = { projectId, campos };
    try {
      window.sessionStorage.setItem(CHAVE_PROPOSTA_PROJETO, JSON.stringify(guardada));
      window.dispatchEvent(new CustomEvent(EVENTO_PROPOSTA_PROJETO, { detail: guardada }));
      setMsg({ ok: true, texto: `${Object.keys(campos).length} campo(s) preenchidos no formulário. Confira e clique em Salvar — nada foi gravado ainda.` });
      setProposta(null);
    } catch {
      setMsg({ ok: false, texto: "Não foi possível levar a proposta ao formulário." });
    }
  };
  const mostrar = (campo: CampoProjeto, v: string) => (campo === "startDate" || campo === "endDate" ? dateBR(v) : v || "—");
  const n = Object.values(marcados).filter(Boolean).length;
  return (
    <>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`rounded-[8px] px-2 py-1 text-[11.5px] ${msg.ok ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" : "bg-[var(--color-danger)]/10 text-[var(--color-danger)]"}`}>{msg.texto}</p>}
      <Acao cor="#FFF1DB" cor2="#B45309" d="M12 9v4m0 4h.01M10.3 3.9L2.6 17a2 2 0 001.7 3h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" titulo="Completar cadastro" descricao="O que falta neste projeto" contador={analise.faltam.length} aberta={aberta === "incompleto"} onClick={() => a("incompleto")}>
        {analise.faltam.length === 0 ? <p className={li}>Cadastro básico completo.</p> : <ul className="ml-3 list-disc space-y-0.5">{analise.faltam.map((t) => <li key={t} className={li}>{t}</li>)}</ul>}
        {analise.semClassificacao && <p className={`${li} mt-1`}>Sem Ativo/Finalizado: classifique no campo Status.</p>}
      </Acao>
      <Acao cor="#FDE6E9" cor2="#C0334A" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" titulo="Revisar inconsistências" descricao="Duração ≠ datas, fim antes do início, município sem IBGE, período de planejamento" contador={analise.inconsistencias.length} aberta={aberta === "inconsistencias"} onClick={() => a("inconsistencias")}>
        {analise.inconsistencias.length === 0 ? <p className={li}>Nenhuma inconsistência.</p> : <ul className="ml-3 list-disc space-y-0.5">{analise.inconsistencias.map((t) => <li key={t} className={li}>{t}</li>)}</ul>}
      </Acao>
      {analise.funding && (
      <Acao cor="#E8F1FB" cor2="#2563EB" d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" titulo="Fontes de financiamento (dados antigos)" descricao="Financiamentos gravados × receita prevista" contador={1} aberta={aberta === "funding"} onClick={() => a("funding")}>
        <p className={li}>{analise.funding}</p>
      </Acao>
      )}
      <Acao cor="#EAE6FB" cor2="#6D4BD1" d="M4 4h12l4 4v12H4zM8 12h8M8 16h8" titulo="Extrair dados de documentos" descricao="Lê um documento deste projeto e propõe o preenchimento — não grava" contador={proposta?.campos.length ?? 0} aberta={aberta === "extrair"} onClick={() => a("extrair")}>
        {!aiConfigurada ? <p className={li}>Leitura por IA não configurada (ANTHROPIC_API_KEY).</p> : !canEditar ? <p className={li}>Sem permissão de editar: a proposta não poderia ser aplicada.</p> : legiveis.length === 0 ? <p className={li}>{documentos.length === 0 ? "Nenhum documento anexado a este projeto." : "Nenhum documento legível (PDF ou imagem)."}</p> : (
          <>
            <div className="flex gap-2">
              <Select value={docId} onChange={(e) => setDocId(e.target.value)} aria-label="Documento para ler"><option value="">— documento —</option>{legiveis.map((d) => <option key={d.id} value={d.id}>{d.tipo ? `${d.tipo} · ` : ""}{d.filename}</option>)}</Select>
              <Button size="sm" variant="outline" disabled={pending || !docId} onClick={ler}>{pending ? "Lendo…" : "Ler"}</Button>
            </div>
            {proposta && proposta.campos.length > 0 && (
              <div className="mt-2 space-y-1" data-proposta-projeto>
                {proposta.observacoes.length > 0 && <p className="text-[11px] text-[var(--color-ink3)]">{proposta.observacoes.join("; ")}</p>}
                <ul className="space-y-1">
                  {proposta.campos.map((c) => (
                    <li key={c.campo} className={`${li} flex items-start gap-2`}>
                      <input type="checkbox" className="mt-0.5" checked={!!marcados[c.campo]} onChange={(e) => setMarcados({ ...marcados, [c.campo]: e.target.checked })} aria-label={`Aplicar ${c.rotulo}`} />
                      <span className="min-w-0 flex-1">
                        <span className={nome}>{c.rotulo}</span>{c.conferir && <Badge tone="warning" className="ml-1">conferir</Badge>}
                        <span className="block text-[11px] text-[var(--color-ink3)]">{c.atual ? `${mostrar(c.campo, c.atual)} → ` : ""}<span className="text-[var(--color-ink)]">{mostrar(c.campo, c.proposto)}</span></span>
                      </span>
                    </li>
                  ))}
                </ul>
                <Button size="sm" variant="outline" disabled={n === 0} onClick={aplicar}>Aplicar {n} campo(s) ao formulário</Button>
              </div>
            )}
          </>
        )}
      </Acao>
      <Acao cor="#E6F4EA" cor2="#1E7A3C" d="M3 3v18h18M7 14l4-4 4 4 5-6" titulo="Comparar orçado x realizado" descricao="Leitura do card: o que está acima ou abaixo do previsto" contador={0} aberta={aberta === "comparar"} onClick={() => a("comparar")}>
        {analise.comparativo.length === 0 ? <p className={li}>Sem card para ler.</p> : <ul className="ml-3 list-disc space-y-0.5">{analise.comparativo.map((t) => <li key={t} className={li}>{t}</li>)}</ul>}
        {analise.semDocumentos && <p className={`${li} mt-1`}>Este projeto não tem documento anexado.</p>}
      </Acao>
    </>
  );
}

function Acao({ cor, cor2, d, titulo, descricao, contador, aberta, onClick, children }: { cor: string; cor2: string; d: string; titulo: string; descricao: string; contador: number; aberta: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[11px] border border-[var(--color-line)] bg-white", aberta && "bg-[var(--color-surface2)]")}>
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
