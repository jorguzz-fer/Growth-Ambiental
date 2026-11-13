"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AnaliseDeFuncionarios } from "@/lib/pessoas-analise";
import { cn, brl0 } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * Assistente de Funcionários (Prompt Z, 6.1; Prompt E). SOMENTE LEITURA:
 * recebe o resultado da análise feita NO SERVIDOR sobre nomes, datas, tipos
 * e contagens — nunca CPF, endereço, salário, banco, dependentes ou folha
 * (6.3), e nunca o conteúdo de documento (16a). Não importa nenhuma action.
 */
type Acao = "incompleto" | "desligados" | "cpf" | "admissao" | "vencendo" | "folha";
const dataBR = (iso: string) => iso.split("-").reverse().join("/");

export function AssistenteFuncionarios({ usuario, analise }: { usuario: string; analise: AnaliseDeFuncionarios }) {
  const chave = `gt:assistente:funcionarios:recolhido:${usuario}`;
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
  const { cadastroIncompleto, desligadosAlocados, cpfDuplicado, admissaoFaltando, documentosVencendo, folha } = analise;
  const li = "text-[12px] text-[var(--color-ink2)]";
  const nome = "font-medium text-[var(--color-ink)]";
  const a = (x: Acao) => setAberta(aberta === x ? null : x);
  const totalFolha = folha.folhaSemDespesa.length + folha.despesaSemFolha.length + folha.folhaSemDocumento.length;
  return (
    <aside aria-label="Assistente de Funcionários" className="w-full shrink-0 rounded-[16px] border border-[var(--color-line)] bg-white p-4 shadow-sm min-[1180px]:sticky min-[1180px]:top-20 min-[1180px]:w-[320px]">
      <div className="mb-3 flex items-start gap-2.5">
        <Faisca />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[15px] font-bold text-[var(--color-ink)]">Assistente IA <Badge tone="neutral">Somente leitura</Badge></div>
          <div className="text-[12px] text-[var(--color-ink2)]">Funcionários · nomes, datas e tipos — sem dado pessoal</div>
        </div>
        <button type="button" onClick={alternar} aria-expanded={true} aria-label="Recolher o assistente" className="rounded-[8px] p-1 text-[var(--color-ink3)] hover:bg-[var(--color-surface2)]"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden><path d="M9 6l6 6-6 6" /></svg></button>
      </div>
      <div className="space-y-2">
        <Acao cor="#FFF1DB" cor2="#B45309" d="M12 9v4m0 4h.01M10.3 3.9L2.6 17a2 2 0 001.7 3h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" titulo="Cadastro incompleto" descricao="Sem CPF, sem cargo ou sem data de admissão" contador={cadastroIncompleto.length} aberta={aberta === "incompleto"} onClick={() => a("incompleto")}>
          {cadastroIncompleto.length === 0 ? <p className={li}>Todos os ativos têm CPF, cargo e admissão.</p> : <ul className="space-y-1">{cadastroIncompleto.map((x) => <li key={x.id} className={li}><Link href={`/funcionarios/${x.id}`} className={`${nome} hover:underline`}>{x.nome}</Link> · falta {x.faltam.join(", ")}</li>)}</ul>}
        </Acao>
        <Acao cor="#FDE6E9" cor2="#C0334A" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" titulo="Desligados ainda alocados" descricao="Com data de desligamento e alocação ativa em alguma equipe" contador={desligadosAlocados.length} aberta={aberta === "desligados"} onClick={() => a("desligados")}>
          {desligadosAlocados.length === 0 ? <p className={li}>Nenhum desligado segue em equipe.</p> : <ul className="space-y-1">{desligadosAlocados.map((x) => <li key={x.id} className={li}><span className={nome}>{x.nome}</span> · desligado em {dataBR(x.desligamento)} · ainda em {x.obras.join(", ")} — encerre a alocação em Equipes e Presença de Campo.</li>)}</ul>}
        </Acao>
        <Acao cor="#EAE6FB" cor2="#6D4BD1" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" titulo="CPF duplicado" descricao="Entre funcionários, e entre funcionário e fornecedor (autônomo que virou CLT)" contador={cpfDuplicado.length} aberta={aberta === "cpf"} onClick={() => a("cpf")}>
          {cpfDuplicado.length === 0 ? <p className={li}>Nenhum CPF repetido.</p> : <ul className="space-y-1">{cpfDuplicado.map((x, i) => <li key={i} className={li}><span className={nome}>{x.nomes.join(" = ")}</span> · {x.origens.join(" e ")} — confira se é a mesma pessoa.</li>)}</ul>}
        </Acao>
        <Acao cor="#FDE6E9" cor2="#C0334A" d="M4 4h12l4 4v12H4zM8 12h8M8 16h8" titulo="Documentos de admissão faltando" descricao="Por funcionário, com o ASO em destaque (a lei exige antes do início)" contador={admissaoFaltando.length} aberta={aberta === "admissao"} onClick={() => a("admissao")}>
          {admissaoFaltando.length === 0 ? <p className={li}>Checklist de admissão completo para todos os ativos.</p> : <ul className="space-y-1">{admissaoFaltando.map((x) => <li key={x.id} className={li}><Link href={`/funcionarios/${x.id}`} className={`${nome} hover:underline`}>{x.nome}</Link>{x.faltaAso && <Badge tone="danger" className="ml-1">sem ASO</Badge>} · faltam {x.faltam.length}: {x.faltam.join(", ")}</li>)}</ul>}
        </Acao>
        <Acao cor="#FFF1DB" cor2="#B45309" d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z" titulo="Documentos vencendo" descricao="ASO periódico e CNH, com a data de validade (30 dias)" contador={documentosVencendo.length} aberta={aberta === "vencendo"} onClick={() => a("vencendo")}>
          {documentosVencendo.length === 0 ? <p className={li}>Nada vence nos próximos 30 dias.</p> : <ul className="space-y-1">{documentosVencendo.map((x, i) => <li key={i} className={li}><span className={nome}>{x.nome}</span> · {x.tipo} · {x.estado === "vencido" ? `vencido há ${-x.dias} dias` : `vence em ${x.dias} dias`} ({dataBR(x.validade)})</li>)}</ul>}
        </Acao>
        <Acao cor="#E8F1FB" cor2="#2563EB" d="M3 3v18h18M7 14l4-4 4 4 5-6" titulo="Folha sem despesa, despesa sem folha" descricao="Competências com documento arquivado e sem lançamento, e o contrário" contador={totalFolha} aberta={aberta === "folha"} onClick={() => a("folha")}>
          <ul className="space-y-1">
            <li className={li}><strong>Folha sem despesa:</strong> {folha.folhaSemDespesa.length ? folha.folhaSemDespesa.join(", ") : "nenhuma"}</li>
            <li className={li}><strong>Despesa que parece folha sem registro:</strong> {folha.despesaSemFolha.length ? folha.despesaSemFolha.map((d) => `${d.numDoc ?? "s/ nº"} ${d.competencia ?? ""} ${brl0(d.valor)}`).join("; ") : "nenhuma"}</li>
            <li className={li}><strong>Folha sem documento:</strong> {folha.folhaSemDocumento.length ? folha.folhaSemDocumento.join(", ") : "nenhuma"}</li>
          </ul>
        </Acao>
      </div>
      <p className="mt-3 text-[11px] leading-snug text-[var(--color-ink3)]">Somente leitura: não cadastra, não edita, não desliga, não exclui — e nunca lê documento anexado (nem identidade, nem ASO). Sabe que tipo existe, não o que está dentro.</p>
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
export function Faisca() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7L12 3z" fill="#6D4BD1" />
      <path d="M18.5 15l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3z" fill="#3B82F6" />
    </svg>
  );
}
