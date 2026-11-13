/**
 * Assistente da Conferência de lançamentos (Prompt AN, Parte 7; Prompt E,
 * Etapa 1). Módulo PURO, SOMENTE LEITURA.
 *
 * Organiza o que a tela já lista; não decide nada. NUNCA reclassifica, NUNCA
 * propõe a categoria de um lançamento (categoria é classificação contábil, e
 * esta tela existe porque alguém classificou errado — fica fora da Etapa 3 do
 * Prompt E, permanentemente) e NUNCA diz que a lista está limpa: ausência de
 * pendência é ausência nas quatro condições, não atestado (7.2).
 * Nada daqui vai a modelo de IA: é conta local sobre linhas do próprio tenant.
 */
import type { MotivoCodigo } from "@/lib/conferencia-regras";

export interface LinhaAnalisada {
  id: string;
  fornecedorId: string | null;
  fornecedorNome: string | null;
  contaCef: string | null;
  competencia: string | null;
  valor: number;
  /** Tipo da versão: só a Atual alimenta a DRE com a tabela de despesas. */
  versao: string;
  motivos: MotivoCodigo[];
  criadoEm: Date;
  /** Quem lançou, pelo log de criação; null quando o log não tem. */
  autor: string | null;
}

export interface Grupo {
  criterio: "fornecedor" | "conta do plano" | "competência";
  rotulo: string;
  quantos: number;
  valor: number;
}

/** 7.1 · agrupar por causa provável: mesmo fornecedor, conta do plano ou período (2+). */
export function agruparPorCausa(linhas: readonly LinhaAnalisada[], limite = 6): Grupo[] {
  const juntar = (criterio: Grupo["criterio"], chave: (l: LinhaAnalisada) => string | null) => {
    const m = new Map<string, Grupo>();
    for (const l of linhas) {
      const k = chave(l);
      if (!k) continue;
      const g = m.get(k) ?? { criterio, rotulo: k, quantos: 0, valor: 0 };
      g.quantos++;
      g.valor += l.valor;
      m.set(k, g);
    }
    return [...m.values()].filter((g) => g.quantos >= 2);
  };
  return [
    ...juntar("fornecedor", (l) => l.fornecedorNome?.trim() || null),
    ...juntar("conta do plano", (l) => l.contaCef?.trim() || null),
    ...juntar("competência", (l) => l.competencia?.trim() || null),
  ]
    .sort((a, b) => b.quantos - a.quantos || b.valor - a.valor)
    .slice(0, limite);
}

/** O efeito de cada motivo na DRE (lê `dre-inputs.ts`; não muda nada lá). */
export const EFEITO_NA_DRE: Record<Exclude<MotivoCodigo, "cancelado">, string> = {
  categoria_credora: "entra na DRE somando à Receita, não ao custo",
  sem_categoria: "não entra em nenhuma linha da DRE",
  valor_zero: "não muda nenhum número, mas pode ser lançamento incompleto",
  sem_competencia: "entra só no Acumulado da DRE; some das visões por mês e por ano",
};

export interface Efeito {
  codigo: Exclude<MotivoCodigo, "cancelado">;
  quantos: number;
  valor: number;
  efeito: string;
  /** Desses, quantos são de Orçamento ou Previsão (a DRE deles lê o planejamento, não esta tabela). */
  foraDaAtual: number;
}

/** 7.1 · o que isso está tirando (ou distorcendo) dos relatórios, por motivo. */
export function efeitoNosRelatorios(linhas: readonly LinhaAnalisada[]): Efeito[] {
  const out: Efeito[] = [];
  for (const codigo of Object.keys(EFEITO_NA_DRE) as Efeito["codigo"][]) {
    const ls = linhas.filter((l) => l.motivos.includes(codigo) && !l.motivos.includes("cancelado"));
    if (ls.length === 0) continue;
    out.push({
      codigo,
      quantos: ls.length,
      valor: ls.reduce((a, l) => a + l.valor, 0),
      efeito: EFEITO_NA_DRE[codigo],
      foraDaAtual: ls.filter((l) => l.versao !== "atual").length,
    });
  }
  return out;
}

export interface DesdeQuando {
  codigo: Exclude<MotivoCodigo, "cancelado">;
  maisAntigo: Date;
  maisRecente: Date;
  /** Há caso dos últimos 30 dias? Então é problema corrente, não só acúmulo histórico. */
  corrente: boolean;
}

/** 7.1 · desde quando, por motivo. */
export function desdeQuando(linhas: readonly LinhaAnalisada[], hoje: Date = new Date()): DesdeQuando[] {
  const limite = hoje.getTime() - 30 * 24 * 3600 * 1000;
  const out: DesdeQuando[] = [];
  for (const codigo of Object.keys(EFEITO_NA_DRE) as DesdeQuando["codigo"][]) {
    const ds = linhas.filter((l) => l.motivos.includes(codigo)).map((l) => l.criadoEm.getTime());
    if (ds.length === 0) continue;
    const max = Math.max(...ds);
    out.push({ codigo, maisAntigo: new Date(Math.min(...ds)), maisRecente: new Date(max), corrente: max >= limite });
  }
  return out;
}

export interface Concentracao {
  dimensao: "fornecedor" | "competência" | "quem lançou";
  rotulo: string;
  quantos: number;
  /** Fração do total de pendências, 0..1. */
  parte: number;
}

/**
 * 7.1 · padrão no que falta: uma dimensão concentra ao menos metade das
 * pendências (com 3 ou mais). Diz onde olhar primeiro; não diz o porquê.
 */
export function padraoNoQueFalta(linhas: readonly LinhaAnalisada[]): Concentracao[] {
  const total = linhas.length;
  if (total < 3) return [];
  const topo = (dimensao: Concentracao["dimensao"], chave: (l: LinhaAnalisada) => string | null) => {
    const m = new Map<string, number>();
    for (const l of linhas) {
      const k = chave(l);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    const [rotulo, quantos] = [...m].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
    return rotulo && quantos >= 3 && quantos / total >= 0.5 ? [{ dimensao, rotulo, quantos, parte: quantos / total }] : [];
  };
  return [
    ...topo("fornecedor", (l) => l.fornecedorNome?.trim() || null),
    ...topo("competência", (l) => l.competencia?.trim() || null),
    ...topo("quem lançou", (l) => l.autor?.trim() || null),
  ];
}

export interface AnaliseDaConferencia {
  total: number;
  grupos: Grupo[];
  efeitos: Efeito[];
  desde: DesdeQuando[];
  padroes: Concentracao[];
}

export function analisarConferencia(linhas: readonly LinhaAnalisada[], hoje: Date = new Date()): AnaliseDaConferencia {
  const ativas = linhas.filter((l) => !l.motivos.includes("cancelado"));
  return {
    total: ativas.length,
    grupos: agruparPorCausa(ativas),
    efeitos: efeitoNosRelatorios(ativas),
    desde: desdeQuando(ativas, hoje),
    padroes: padraoNoQueFalta(ativas),
  };
}

/** 7.2 · a frase de "nada encontrado" nunca vira atestado. */
export const TEXTO_SEM_PENDENCIA =
  "Nenhum lançamento nas quatro condições desta conferência. Isso não quer dizer que a classificação esteja certa — só que nada caiu nelas.";
