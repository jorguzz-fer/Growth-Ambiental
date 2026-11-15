/**
 * Calendário de meses do projeto (GA-9, Fase 2) — fonte ÚNICA dos meses que
 * as telas e as exportações mostram, no lugar da tabela INCC.
 *
 * Por que estes meses. Até aqui o calendário vinha das linhas de `incc_rate`
 * do projeto. Todo projeto nasce com as mesmas 48 linhas (provisionamento e
 * `createProject`), de 05/2025 a 04/2029, e no Growth Ambiental ninguém as
 * edita (medição da Fase 1 na produção: nenhuma série editada, nenhuma série
 * da empresa). Então o calendário que o app JÁ usa em todo projeto é:
 *
 *   os 48 meses padrão (05/2025 → 04/2029) ∪ início → fim do projeto
 *
 * A janela do projeto (`janelaDoProjeto`, a mesma da DRE) só acrescenta meses
 * quando o projeto passa de 04/2029 ou começa antes de 05/2025; para os
 * projetos de hoje, o calendário é idêntico ao da tabela. Cada tela continua
 * somando os meses que têm lançamento, como antes.
 *
 * A taxa do INCC não entra aqui: só a lista de meses.
 */
import { janelaDoProjeto, monthIndex, ordenarMeses } from "@/lib/dre";

/** Primeiro e último mês do calendário padrão (os 48 meses que todo projeto recebia). */
export const CALENDARIO_PADRAO_INICIO = "05/2025";
export const CALENDARIO_PADRAO_FIM = "04/2029";

function mesesEntre(de: string, ate: string): string[] {
  const a = monthIndex(de)!;
  const b = monthIndex(ate)!;
  const out: string[] = [];
  for (let i = a; i <= b; i++) out.push(`${String((i % 12) + 1).padStart(2, "0")}/${Math.floor(i / 12)}`);
  return out;
}

/** Os 48 meses padrão, em ordem. */
export const MESES_DO_CALENDARIO_PADRAO: readonly string[] = mesesEntre(CALENDARIO_PADRAO_INICIO, CALENDARIO_PADRAO_FIM);

type ComDatas = { startDate: string | null; endDate: string | null };

/** Calendário de UM projeto: os 48 meses padrão unidos à janela início → fim. */
export function calendarioDoProjeto(p: ComDatas | null | undefined): string[] {
  return calendarioDosProjetos(p ? [p] : []);
}

/**
 * Calendário de VÁRIOS projetos (consolidado, empresa toda): os 48 meses
 * padrão unidos às janelas de todos. Sem projeto, nenhum mês (como antes:
 * sem projeto não havia linha INCC).
 */
export function calendarioDosProjetos(ps: readonly ComDatas[]): string[] {
  if (!ps.length) return [];
  const s = new Set<string>(MESES_DO_CALENDARIO_PADRAO);
  for (const p of ps) for (const m of janelaDoProjeto(p) ?? []) s.add(m);
  return ordenarMeses(s);
}
