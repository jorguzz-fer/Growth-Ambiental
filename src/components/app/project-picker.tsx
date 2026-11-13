"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/input";
import {
  ESCOPO_ATIVOS,
  ESCOPO_FINALIZADOS,
  PARAM_PROJETO,
  TODOS_OS_PROJETOS,
  ehEscopo,
} from "@/lib/projeto-selecao";
import { gravarProjetoDaAba } from "./projeto-da-aba";

export interface ProjectOpt {
  id: string;
  label: string;
  /** Quando informado, obras e escritórios aparecem em grupos separados (Prompt B, 3). */
  kind?: "proj" | "office";
}

/**
 * Seletor de projeto das telas sem "projeto ativo". Grava a escolha em `proj`
 * na URL, preservando os demais parâmetros, e a lembra nesta aba (B-A2).
 * `selected` vazio = nada escolhido: mostra "Selecione um projeto".
 */
export function ProjectPicker({
  projects,
  selected,
  allOption = false,
  scopeOptions = false,
}: {
  projects: ProjectOpt[];
  selected: string;
  /** inclui a opção "Todos os projetos" (valor "all"). */
  allOption?: boolean;
  /** relatórios: inclui "Projetos ativos" e "Projetos finalizados" (Prompt A, 18). */
  scopeOptions?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-1">
      <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
        Projeto
      </span>
      <Select
        value={selected}
        disabled={pending}
        onChange={(e) => {
          const valor = e.target.value;
          if (!valor) return;
          // Só obra entra na memória da aba; escopo é visão do relatório.
          if (!ehEscopo(valor)) gravarProjetoDaAba(valor);
          const params = new URLSearchParams(sp.toString());
          params.set(PARAM_PROJETO, valor);
          // O sinônimo `?project=` não pode sobrar com outro valor.
          params.delete("project");
          start(() => router.push(`${pathname}?${params.toString()}`));
        }}
        className="h-9 min-w-[220px]"
      >
        {!selected && (
          <option value="" disabled>
            Selecione um projeto
          </option>
        )}
        {allOption && <option value={TODOS_OS_PROJETOS}>Todos os projetos / filiais</option>}
        {scopeOptions && <option value={ESCOPO_ATIVOS}>Projetos ativos</option>}
        {scopeOptions && <option value={ESCOPO_FINALIZADOS}>Projetos finalizados</option>}
        {(allOption || scopeOptions) && projects.length > 0 && (
          <option disabled value="__sep">──────────</option>
        )}
        {projects.some((p) => p.kind) ? (
          <>
            <optgroup label="Projetos">
              {projects.filter((p) => p.kind !== "office").map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </optgroup>
            {projects.some((p) => p.kind === "office") && (
              <optgroup label="Unidades / escritórios">
                {projects.filter((p) => p.kind === "office").map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </optgroup>
            )}
          </>
        ) : (
          projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))
        )}
      </Select>
    </div>
  );
}
