/**
 * Prompt AA — a definição nova do Dashboard (chave `dashboard_definicao_nova`,
 * nasce desligada). Módulo PURO: escolhe O QUE entra; as somas continuam nas
 * funções de sempre. Desligada, nada daqui é usado.
 */
import { enumMonths, janelaDoProjeto, monthIndex } from "@/lib/dre";

interface VersaoDaObra {
  id: string;
  kind: string;
  label: string;
  sourceVersionId: string | null;
  createdAt: Date;
}

/**
 * 4-B.2 — UM Orçamento por obra no denominador de "Executado": o mais recente
 * que não é cópia. Sem nenhum assim, nenhum (a obra fica sem denominador e o
 * cartão diz isso) — nunca a soma de todos.
 */
export function orcamentoDaObra<V extends VersaoDaObra>(versoes: readonly V[]): V | null {
  return (
    [...versoes]
      .filter((v) => v.kind === "budget" && v.sourceVersionId == null)
      .sort((a, b) => +b.createdAt - +a.createdAt)[0] ?? null
  );
}

export type OrigemDaJanela = "periodo" | "projeto" | "sem_janela";

export interface JanelaDaMargem {
  /** Competências "MM/YYYY" que entram; null = todas (sem janela). */
  meses: Set<string> | null;
  origem: OrigemDaJanela;
}

/**
 * Data do filtro → "MM/YYYY". O filtro grava MM/DD/YYYY (formato interno);
 * ISO "YYYY-MM-DD" também é aceito.
 */
function competenciaDoFiltro(d: string): string | null {
  const iso = /^(\d{4})-(\d{2})/.exec(d);
  if (iso) return `${iso[2]}/${iso[1]}`;
  const p = d.trim().split("/");
  return p.length === 3 && /^\d{1,2}$/.test(p[0]) && /^\d{4}$/.test(p[2]) ? `${p[0].padStart(2, "0")}/${p[2]}` : null;
}

/**
 * 4-B.3 — a MESMA janela de competências nos dois lados da margem: a do
 * filtro de período; sem filtro, a do projeto (início e fim do cadastro);
 * sem datas no cadastro, todas as competências dos dois lados — e o cartão
 * declara qual.
 */
export function janelaDaMargem(o: {
  de: string;
  ate: string;
  projetos: readonly { startDate: string | null; endDate: string | null }[];
}): JanelaDaMargem {
  if (o.de || o.ate) {
    const ini = o.de ? competenciaDoFiltro(o.de) : null;
    const fim = o.ate ? competenciaDoFiltro(o.ate) : null;
    if (ini && fim) return { meses: new Set(enumMonths(ini, fim)), origem: "periodo" };
    // Período aberto de um lado: filtra por comparação, sem enumerar.
    return { meses: null, origem: "periodo" };
  }
  const janelas = o.projetos.map((p) => janelaDoProjeto(p));
  if (janelas.length === 0 || janelas.some((j) => j == null)) return { meses: null, origem: "sem_janela" };
  return { meses: new Set(janelas.flat() as string[]), origem: "projeto" };
}

/** A competência entra na janela? (período aberto de um lado: por comparação.) */
export function naJanela(mm: string | null | undefined, j: JanelaDaMargem, de = "", ate = ""): boolean {
  if (!mm) return j.meses == null && j.origem === "sem_janela";
  if (j.meses) return j.meses.has(mm);
  if (j.origem !== "periodo") return true;
  const v = monthIndex(mm);
  if (v == null) return false;
  const lo = de ? monthIndex(competenciaDoFiltro(de) ?? "") : null;
  const hi = ate ? monthIndex(competenciaDoFiltro(ate) ?? "") : null;
  return (lo == null || v >= lo) && (hi == null || v <= hi);
}

export const TEXTO_DA_JANELA: Record<OrigemDaJanela, string> = {
  periodo: "competências do período escolhido, nos dois lados",
  projeto: "competências entre o início e o fim do projeto (cadastro), nos dois lados",
  sem_janela: "todas as competências, nos dois lados — o projeto não tem início e fim no cadastro",
};
