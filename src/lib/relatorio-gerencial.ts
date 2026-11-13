/**
 * Relatório gerencial multidimensional (tabela dinâmica) — fonte "gerencial"
 * dos Relatórios Customizados. Módulo PURO: recebe FATOS (cada fato é um
 * evento real — medição aprovada, fatura, despesa apropriada, reembolso,
 * apontamento de horas, posição do contrato) com os atributos das dimensões,
 * e pivota por UMA dimensão nas linhas e as métricas escolhidas nas colunas.
 *
 * Reconciliação: cada fato entra em uma linha só; a linha Total é a soma das
 * linhas e bate com a soma dos fatos (nada é contado duas vezes). Fato sem o
 * atributo da dimensão cai em "(não informado)" — não some.
 */

export const DIMENSOES = ["cliente", "contrato", "projeto", "modalidade", "fase", "profissional", "competencia", "conta"] as const;
export type Dimensao = (typeof DIMENSOES)[number];
export const ROTULO_DIMENSAO: Record<Dimensao, string> = {
  cliente: "Cliente",
  contrato: "Contrato",
  projeto: "Projeto",
  modalidade: "Modalidade de serviço",
  fase: "Fase do plano",
  profissional: "Profissional",
  competencia: "Competência",
  conta: "Conta do plano",
};

export const METRICAS = [
  "contratado",
  "aditivos",
  "saldoAMedir",
  "medido",
  "faturado",
  "receitaReconhecida",
  "recebido",
  "aReceber",
  "custoApropriado",
  "margem",
  "reembolsoSolicitado",
  "reembolsoPendente",
  "horasPlanejadas",
  "horasRealizadas",
  "custoPessoal",
] as const;
export type Metrica = (typeof METRICAS)[number];
export const ROTULO_METRICA: Record<Metrica, string> = {
  contratado: "Contratado (posição)",
  aditivos: "Aditivos eficazes (posição)",
  saldoAMedir: "Saldo a medir (posição)",
  medido: "Medido aprovado",
  faturado: "Faturado",
  receitaReconhecida: "Receita reconhecida",
  recebido: "Recebido",
  aReceber: "Faturado a receber",
  custoApropriado: "Custo apropriado",
  margem: "Margem (reconhecida − custo)",
  reembolsoSolicitado: "Reembolso solicitado",
  reembolsoPendente: "Reembolso pendente",
  horasPlanejadas: "Horas planejadas",
  horasRealizadas: "Horas realizadas",
  custoPessoal: "Custo de pessoal (gerencial)",
};
/** Métricas que dependem de horas (exigem ver Equipes). */
export const METRICAS_DE_HORAS: readonly Metrica[] = ["horasPlanejadas", "horasRealizadas", "custoPessoal"];
/** Métricas de posição: não seguem o período. */
export const METRICAS_DE_POSICAO: readonly Metrica[] = ["contratado", "aditivos", "saldoAMedir"];
/** Métricas do financeiro do contrato (exigem ver o financeiro dos contratos). */
export const METRICAS_FINANCEIRAS: readonly Metrica[] = ["faturado", "receitaReconhecida", "recebido", "aReceber", "custoApropriado", "margem", "reembolsoSolicitado", "reembolsoPendente"];
/** O que a pessoa pode ver: o financeiro do contrato e as horas dependem das telas de origem. */
export function metricasPermitidas(acesso: { financeiro: boolean; horas: boolean }): Metrica[] {
  return METRICAS.filter((m) => (acesso.financeiro || !METRICAS_FINANCEIRAS.includes(m)) && (acesso.horas || !METRICAS_DE_HORAS.includes(m)));
}
export const METRICAS_PADRAO: Metrica[] = ["contratado", "medido", "faturado", "receitaReconhecida", "custoApropriado", "margem"];

export type AtributosDoFato = Partial<Record<Dimensao, string | null>>;
export interface Fato {
  atributos: AtributosDoFato;
  valores: Partial<Record<Exclude<Metrica, "margem">, number>>;
  /** AAAAMM do fato (para o filtro de período); null = posição (sem data). */
  mes: number | null;
}

export const NAO_INFORMADO = "(não informado)";
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Linhas da dimensão (ordem: maior primeira métrica) + Total. */
export function pivotar(fatos: readonly Fato[], dim: Dimensao, metricas: readonly Metrica[]): { linhas: { rotulo: string; valores: number[] }[]; total: number[] } {
  const grupos = new Map<string, Record<string, number>>();
  for (const f of fatos) {
    const chave = (f.atributos[dim] ?? "").trim() || NAO_INFORMADO;
    const g = grupos.get(chave) ?? {};
    for (const [k, v] of Object.entries(f.valores)) g[k] = (g[k] ?? 0) + (v ?? 0);
    grupos.set(chave, g);
  }
  const valorDe = (g: Record<string, number>, m: Metrica) => (m === "margem" ? (g.receitaReconhecida ?? 0) - (g.custoApropriado ?? 0) : g[m] ?? 0);
  const linhas = [...grupos.entries()]
    .map(([rotulo, g]) => ({ rotulo, valores: metricas.map((m) => r2(valorDe(g, m))) }))
    .filter((l) => l.valores.some((v) => v !== 0))
    .sort((a, b) => (dim === "competencia" ? ordemDaCompetencia(a.rotulo) - ordemDaCompetencia(b.rotulo) : b.valores[0] - a.valores[0] || a.rotulo.localeCompare(b.rotulo)));
  const total = metricas.map((_, i) => r2(linhas.reduce((s, l) => s + l.valores[i], 0)));
  return { linhas, total };
}

const ordemDaCompetencia = (s: string) => {
  const m = /^(\d{2})\/(\d{4})$/.exec(s);
  return m ? Number(m[2]) * 100 + Number(m[1]) : 999999;
};

/** Filtro de período (AAAAMM). Fatos de posição (sem mês) sempre entram. */
export function noPeriodo(f: Fato, de: number | null, ate: number | null): boolean {
  if (f.mes == null) return true;
  return (de == null || f.mes >= de) && (ate == null || f.mes <= ate);
}
