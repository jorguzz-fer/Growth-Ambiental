"use client";

import { useState } from "react";
import { CriarPlano, type ModeloParaEscolha } from "./criar-plano";
import { PlanoEstrutura, pct, type Permissoes } from "./plano-estrutura";
import { Cronograma, Custos, Entregas, Historico, Indicadores } from "./plano-paineis";
import type { PlanoDaTela } from "./tipos";

const ABAS = [
  ["estrutura", "Fases e atividades"],
  ["cronograma", "Cronograma"],
  ["entregas", "Entregas e marcos"],
  ["indicadores", "Indicadores"],
  ["custos", "Custos por fase"],
  ["historico", "Histórico"],
] as const;
type Aba = (typeof ABAS)[number][0];

export function PlanoTela({ plano, projectId, modelos, pode, hoje }: { plano: PlanoDaTela; projectId: string; modelos: ModeloParaEscolha[]; pode: Permissoes; hoje: string }) {
  const [aba, setAba] = useState<Aba>("estrutura");
  const temPlano = plano.fases.length > 0;
  return (
    <div>
      {plano.aditivosDeEscopo.length > 0 && (
        <div className="mb-4 rounded-[10px] border border-[var(--color-warning)]/40 bg-[#fef3c7]/60 px-3 py-2 text-[12.5px] text-[#92400e]">
          <strong>Aditivo de escopo assinado:</strong>{" "}
          {plano.aditivosDeEscopo.map((a) => `${a.codigo}${a.descricao ? ` (${a.descricao})` : ""}`).join("; ")}. Revise se o plano precisa de novas fases ou
          atividades — nada é alterado automaticamente. Use “Acrescentar fases” (a Cris pode ler o aditivo) e confirme o que entra.
        </div>
      )}
      <CriarPlano projectId={projectId} modelos={modelos} temPlano={temPlano} podeCriar={pode.criar} />
      {temPlano && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-[var(--color-ink2)]">
            <span>
              Progresso físico: <strong>{pct(plano.progressoProjeto)}</strong>
              {plano.progressoProjeto.percentual == null && plano.progressoProjeto.motivo && <span className="text-[var(--color-ink3)]"> ({plano.progressoProjeto.motivo})</span>}
            </span>
            <span>
              {plano.contagem.fases} fase(s) · {plano.contagem.atividades} atividade(s) · {plano.contagem.subatividades} subatividade(s) · {plano.contagem.entregas} entrega(s)
            </span>
            {plano.contagem.atrasadas > 0 && <span className="font-medium text-[var(--color-danger)]">{plano.contagem.atrasadas} item(ns) atrasado(s)</span>}
          </div>
          <div role="tablist" className="mb-3 flex flex-wrap gap-1 border-b border-[var(--color-line)]">
            {ABAS.map(([id, rot]) => (
              <button key={id} role="tab" aria-selected={aba === id} type="button" onClick={() => setAba(id)} className={`-mb-px border-b-2 px-3 py-1.5 text-[13px] ${aba === id ? "border-[var(--color-brand-segmento)] font-medium text-[var(--color-ink)]" : "border-transparent text-[var(--color-ink3)] hover:text-[var(--color-ink)]"}`}>
                {rot}
              </button>
            ))}
          </div>
          {aba === "estrutura" && <PlanoEstrutura plano={plano} projectId={projectId} pode={pode} />}
          {aba === "cronograma" && <Cronograma plano={plano} hoje={hoje} />}
          {aba === "entregas" && <Entregas plano={plano} projectId={projectId} pode={pode} />}
          {aba === "indicadores" && <Indicadores plano={plano} />}
          {aba === "custos" && <Custos plano={plano} pode={pode} />}
          {aba === "historico" && <Historico plano={plano} />}
        </>
      )}
    </div>
  );
}
