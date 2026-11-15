/**
 * Situação da versão de planejamento × relatórios (Prompt H). Módulo PURO.
 *
 * Regra 1.1: versão de `kind` budget ou forecast com `status` diferente de
 * "Aprovado" não é considerada nos relatórios — **quando a chave da empresa
 * está ligada**. Regra 1.2 (BH-2): a versão `atual` nunca é filtrada.
 * "Concluído" é etapa intermediária e também não entra (BF-2 / Prompt H).
 */
export const CHAVE_RASCUNHO = "rascunho_fora_dos_relatorios" as const;
export const SITUACAO_QUE_ENTRA = "Aprovado";

export interface VersaoComSituacao {
  kind: string;
  status: string;
}

export function ehPlanejamento(v: { kind: string }): boolean {
  return v.kind === "budget" || v.kind === "forecast";
}

/** A versão alimenta relatórios? `atual` sempre; planejamento só Aprovado (com a chave ligada). */
export function entraNosRelatorios(v: VersaoComSituacao, chaveLigada: boolean): boolean {
  if (!ehPlanejamento(v)) return true;
  if (!chaveLigada) return true;
  return v.status === SITUACAO_QUE_ENTRA;
}

/** BH-3 (opção 2): selo no seletor de versões dos relatórios; null = sem selo. */
export function avisoNoSeletor(v: VersaoComSituacao, chaveLigada: boolean): string | null {
  if (entraNosRelatorios(v, chaveLigada)) return null;
  return `${v.status} — não entra nos totais`;
}

/** 5.2: aviso nas telas de Orçamentos e Previsão para versão não Aprovada. */
export function avisoNaEdicao(v: VersaoComSituacao, chaveLigada: boolean): string | null {
  if (!ehPlanejamento(v) || v.status === SITUACAO_QUE_ENTRA) return null;
  return chaveLigada
    ? "Esta versão não entra nos relatórios (DRE, Fluxo, Dashboard…) até ser Aprovada. Nada foi apagado: ela continua inteira aqui."
    : "Quando a regra “Rascunho fora dos relatórios” for ligada em Chaves de mudança, esta versão deixará de aparecer nos relatórios até ser Aprovada.";
}

/** BH-4: o que a troca de situação passa a significar com a chave ligada. */
export function efeitoDaTrocaDeSituacao(chaveLigada: boolean): string | null {
  if (!chaveLigada) return null;
  return "Aprovar faz a versão entrar nos relatórios; voltar a Rascunho ou Concluído a tira. Toda troca fica na Auditoria.";
}

// ── Decisões de 01/10/2026 (BH-4 e a ordem das situações) ─────────────────

export const SITUACOES = ["Rascunho", "Concluído", "Aprovado"] as const;
/** Permissão PRÓPRIA para aprovar e desaprovar: tirar número de relatório não vale `editar`. */
export const TELA_APROVA = "versaoaprova" as const;

export interface TrocaDeSituacao {
  /** Motivo da recusa, ou null. */
  recusa: string | null;
  /** A troca entra ou sai de Aprovado: exige `versaoaprova`. */
  exigeAprovador: boolean;
  /** Confirmação a mostrar antes (sair de Aprovado), ou null. */
  confirmacao: string | null;
}

/**
 * Rascunho → Concluído → Aprovado. Aprovar só a partir de Concluído; sair de
 * Aprovado é permitido, mas pede confirmação — senão a versão sai dos
 * relatórios sem ninguém perceber, e o sintoma é um número que diminui sozinho.
 */
export function trocaDeSituacao(de: string, para: string, chaveLigada: boolean, rotulo = "a versão"): TrocaDeSituacao {
  if (!(SITUACOES as readonly string[]).includes(para)) return { recusa: "Situação inválida.", exigeAprovador: false, confirmacao: null };
  const exigeAprovador = de === "Aprovado" || para === "Aprovado";
  if (para === "Aprovado" && de !== "Aprovado" && de !== "Concluído")
    return { recusa: "Conclua a versão antes de aprovar: a ordem é Rascunho → Concluído → Aprovado.", exigeAprovador, confirmacao: null };
  const confirmacao =
    de === "Aprovado" && para !== "Aprovado"
      ? chaveLigada
        ? `Tirar ${rotulo} de Aprovado? Ela SAI dos relatórios agora (DRE, Fluxo, Dashboard, Resumo) e os números deles mudam. Toda troca fica na Auditoria.`
        : `Tirar ${rotulo} de Aprovado? Hoje os relatórios não mudam, mas, quando a regra “Rascunho fora dos relatórios” for ligada, ela deixará de entrar neles. Toda troca fica na Auditoria.`
      : null;
  return { recusa: null, exigeAprovador, confirmacao };
}

// ── GA-1 §3: nada some em silêncio ────────────────────────────────────────

export interface VersoesForaDosRelatorios {
  /** projetos cujo Orçamento usado nos relatórios não está Aprovado. */
  orcamento: number;
  /** projetos cuja Previsão usada nos relatórios não está Aprovada. */
  previsao: number;
}

/**
 * Aviso de uma linha nos relatórios (DRE, Fluxo, Dashboard, Resumo, Previsão,
 * projeção ao término): com a chave ligada, versão de planejamento lançada e
 * não Aprovada fica fora dos números — a tela diz isso, com o link para
 * aprovar. Sem a chave, ou sem nada fora, null.
 */
export function avisoDeVersoesNaoAprovadas(fora: VersoesForaDosRelatorios, chaveLigada: boolean): { texto: string; href: string } | null {
  if (!chaveLigada || (fora.orcamento <= 0 && fora.previsao <= 0)) return null;
  const proj = (n: number) => `${n} projeto${n === 1 ? "" : "s"}`;
  const texto =
    fora.orcamento > 0 && fora.previsao > 0
      ? `O Orçamento de ${proj(fora.orcamento)} e a Previsão de ${proj(fora.previsao)} ainda não foram aprovados e não entram aqui.`
      : fora.orcamento > 0
        ? `O Orçamento de ${proj(fora.orcamento)} ainda não foi aprovado e não entra aqui.`
        : `A Previsão de ${proj(fora.previsao)} ainda não foi aprovada e não entra aqui.`;
  return { texto, href: fora.orcamento > 0 ? "/budget" : "/forecast" };
}
