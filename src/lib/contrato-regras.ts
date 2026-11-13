/**
 * Contratos e Aditivos — regras PURAS (sem banco). Ver
 * docs/MODULO_CONTRATOS_ADITIVOS.md.
 *
 * Princípios:
 * - O valor original nunca é reescrito: o valor ATUALIZADO é derivado do
 *   original mais os aditivos EFICAZES.
 * - Eficaz = assinado (formalizado), não cancelado, e com vigência já
 *   iniciada na data de referência. Aprovado sem assinatura é "pendente de
 *   formalização": aparece, mas não muda limite nem saldo.
 * - Medição só conta para o saldo quando APROVADA. Medição não é fatura, não
 *   é recebimento, não é receita.
 * - Faturado e recebido vêm das contas a receber do contrato (o motor que a
 *   DRE e o Fluxo já leem). Nada aqui grava ou reconhece receita.
 * - Dinheiro em centavos inteiros nas somas, para não acumular erro de ponto
 *   flutuante.
 */
import { ymd } from "@/lib/utils";

// ───────────────────────────── Listas ─────────────────────────────

export const STATUS_CONTRATO = ["rascunho", "aguardando_assinatura", "ativo", "suspenso", "concluido", "encerrado", "cancelado"] as const;
export type StatusContrato = (typeof STATUS_CONTRATO)[number];
export const ROTULO_STATUS_CONTRATO: Record<StatusContrato, string> = {
  rascunho: "Rascunho",
  aguardando_assinatura: "Aguardando assinatura",
  ativo: "Ativo",
  suspenso: "Suspenso",
  concluido: "Concluído",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
};

/** Transições permitidas do contrato. Encerrado e cancelado são finais. */
const TRANSICOES_CONTRATO: Record<StatusContrato, readonly StatusContrato[]> = {
  rascunho: ["aguardando_assinatura", "ativo", "cancelado"],
  aguardando_assinatura: ["rascunho", "ativo", "cancelado"],
  ativo: ["suspenso", "concluido", "cancelado"],
  suspenso: ["ativo", "cancelado"],
  concluido: ["ativo", "encerrado"],
  encerrado: [],
  cancelado: [],
};

export const TIPOS_CONTRATO = ["contrato", "derivado", "ordem_servico"] as const;
export type TipoContrato = (typeof TIPOS_CONTRATO)[number];
export const ROTULO_TIPO_CONTRATO: Record<TipoContrato, string> = { contrato: "Contrato", derivado: "Contrato derivado", ordem_servico: "Ordem de serviço" };

/** Derivado que gasta o limite do principal × derivado com valor juridicamente adicional. */
export const VINCULOS_VALOR = ["consome_limite", "adicional"] as const;
export type VinculoValor = (typeof VINCULOS_VALOR)[number];
export const ROTULO_VINCULO: Record<VinculoValor, string> = { consome_limite: "Consome o limite do principal", adicional: "Valor adicional ao principal" };

export const TIPOS_ADITIVO = [
  "acrescimo_valor",
  "reducao_valor",
  "prorrogacao_prazo",
  "alteracao_escopo",
  "inclusao_servicos",
  "exclusao_servicos",
  "condicoes_pagamento",
  "condicoes_medicao",
] as const;
export type TipoAditivo = (typeof TIPOS_ADITIVO)[number];
export const ROTULO_TIPO_ADITIVO: Record<TipoAditivo, string> = {
  acrescimo_valor: "Acréscimo de valor",
  reducao_valor: "Redução de valor",
  prorrogacao_prazo: "Prorrogação de prazo",
  alteracao_escopo: "Alteração de escopo",
  inclusao_servicos: "Inclusão de serviços",
  exclusao_servicos: "Exclusão de serviços",
  condicoes_pagamento: "Alteração de condições de pagamento",
  condicoes_medicao: "Alteração de condições de medição",
};

export const STATUS_ADITIVO = ["rascunho", "negociacao", "aguardando_aprovacao", "aprovado", "assinado", "rejeitado", "cancelado"] as const;
export type StatusAditivo = (typeof STATUS_ADITIVO)[number];
export const ROTULO_STATUS_ADITIVO: Record<StatusAditivo, string> = {
  rascunho: "Rascunho",
  negociacao: "Em negociação",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  assinado: "Assinado",
  rejeitado: "Rejeitado",
  cancelado: "Cancelado",
};
const TRANSICOES_ADITIVO: Record<StatusAditivo, readonly StatusAditivo[]> = {
  rascunho: ["negociacao", "aguardando_aprovacao", "cancelado"],
  negociacao: ["rascunho", "aguardando_aprovacao", "cancelado"],
  aguardando_aprovacao: ["negociacao", "aprovado", "rejeitado", "cancelado"],
  aprovado: ["assinado", "cancelado"],
  // Formalizado: não volta nem se apaga; a correção é cancelamento motivado
  // (fica no histórico) ou um novo aditivo.
  assinado: ["cancelado"],
  rejeitado: [],
  cancelado: [],
};
/** Transições que só quem APROVA pode fazer (permissão `contratosaprovar`). */
const TRANSICOES_DE_APROVADOR = new Set(["aguardando_aprovacao>aprovado", "aguardando_aprovacao>rejeitado", "aprovado>cancelado", "assinado>cancelado"]);

export const STATUS_MEDICAO = ["rascunho", "enviada", "em_analise", "aprovada", "rejeitada", "cancelada"] as const;
export type StatusMedicao = (typeof STATUS_MEDICAO)[number];
export const ROTULO_STATUS_MEDICAO: Record<StatusMedicao, string> = {
  rascunho: "Rascunho",
  enviada: "Submetida",
  em_analise: "Em análise",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  cancelada: "Cancelada",
};
const TRANSICOES_MEDICAO: Record<StatusMedicao, readonly StatusMedicao[]> = {
  rascunho: ["enviada", "cancelada"],
  enviada: ["em_analise", "aprovada", "rejeitada", "rascunho", "cancelada"],
  em_analise: ["aprovada", "rejeitada", "enviada"],
  aprovada: ["cancelada"],
  rejeitada: [],
  cancelada: [],
};
const TRANSICOES_MEDICAO_APROVADOR = new Set(["enviada>aprovada", "em_analise>aprovada", "enviada>rejeitada", "em_analise>rejeitada", "aprovada>cancelada"]);

export const CRITERIOS_MEDICAO = ["quantidade", "percentual", "entrega", "marco", "periodico"] as const;
export type CriterioMedicao = (typeof CRITERIOS_MEDICAO)[number];
export const ROTULO_CRITERIO: Record<CriterioMedicao, string> = {
  quantidade: "Quantidade executada",
  percentual: "Percentual de avanço",
  entrega: "Entrega concluída",
  marco: "Marco contratual",
  periodico: "Valor fixo periódico",
};

export const STATUS_REEMBOLSO = ["pendente", "solicitado", "aprovado", "rejeitado", "faturado", "recebido"] as const;
export type StatusReembolso = (typeof STATUS_REEMBOLSO)[number];
export const ROTULO_STATUS_REEMBOLSO: Record<StatusReembolso, string> = {
  pendente: "Reembolsável pendente",
  solicitado: "Reembolso solicitado",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  faturado: "Faturado",
  recebido: "Recebido",
};
const TRANSICOES_REEMBOLSO: Record<StatusReembolso, readonly StatusReembolso[]> = {
  pendente: ["solicitado"],
  solicitado: ["aprovado", "rejeitado", "pendente"],
  aprovado: ["faturado", "solicitado"],
  rejeitado: ["pendente"],
  faturado: ["recebido", "aprovado"],
  recebido: ["faturado"],
};

export const STATUS_MARCO = ["previsto", "em_andamento", "concluido", "atrasado", "cancelado"] as const;
export type StatusMarco = (typeof STATUS_MARCO)[number];
export const ROTULO_STATUS_MARCO: Record<StatusMarco, string> = { previsto: "Previsto", em_andamento: "Em andamento", concluido: "Concluído", atrasado: "Atrasado", cancelado: "Cancelado" };

/** Tipos de documento do contrato (reaproveita `document`, com versão por tipo). */
export const TIPOS_DOC_CONTRATO = [
  "Contrato assinado",
  "Proposta comercial",
  "Proposta técnica",
  "Plano de trabalho",
  "Aditivo",
  "Ordem de serviço",
  "Relatório de medição",
  "Comprovante",
  "Termo de aceite",
  "Correspondência contratual",
  "Outros",
] as const;

/** Modalidades iniciais (a empresa cria, renomeia e desativa as suas). */
export const MODALIDADES_INICIAIS = [
  "Consultoria e estudos ambientais",
  "Licenciamento ambiental",
  "Monitoramento ambiental",
  "Arqueologia e patrimônio cultural",
  "Prospecção arqueológica",
  "Resgate e salvamento arqueológico",
  "Monitoramento de fauna",
  "Resgate de fauna",
  "Inventário e manejo de flora",
  "Educação ambiental e patrimonial",
  "Geoprocessamento e cartografia",
  "Consultoria técnica especializada",
  "Outros serviços",
] as const;

const inclui = <T extends string>(lista: readonly T[], v: unknown): v is T => typeof v === "string" && (lista as readonly string[]).includes(v);
export const ehStatusContrato = (v: unknown): v is StatusContrato => inclui(STATUS_CONTRATO, v);
export const ehStatusAditivo = (v: unknown): v is StatusAditivo => inclui(STATUS_ADITIVO, v);
export const ehStatusMedicao = (v: unknown): v is StatusMedicao => inclui(STATUS_MEDICAO, v);
export const ehStatusReembolso = (v: unknown): v is StatusReembolso => inclui(STATUS_REEMBOLSO, v);
export const ehStatusMarco = (v: unknown): v is StatusMarco => inclui(STATUS_MARCO, v);
export const ehTipoAditivo = (v: unknown): v is TipoAditivo => inclui(TIPOS_ADITIVO, v);
export const ehCriterio = (v: unknown): v is CriterioMedicao => inclui(CRITERIOS_MEDICAO, v);
export const ehTipoContrato = (v: unknown): v is TipoContrato => inclui(TIPOS_CONTRATO, v);
export const ehVinculo = (v: unknown): v is VinculoValor => inclui(VINCULOS_VALOR, v);

// ───────────────────────────── Transições ─────────────────────────────

export type Recusa = string | null;

export function recusaTransicaoContrato(de: string, para: string): Recusa {
  if (!ehStatusContrato(de) || !ehStatusContrato(para)) return "Situação inválida.";
  if (de === para) return null;
  return TRANSICOES_CONTRATO[de].includes(para) ? null : `O contrato não passa de "${ROTULO_STATUS_CONTRATO[de]}" para "${ROTULO_STATUS_CONTRATO[para]}".`;
}

export function recusaTransicaoAditivo(de: string, para: string, podeAprovar: boolean): Recusa {
  if (!ehStatusAditivo(de) || !ehStatusAditivo(para)) return "Situação inválida.";
  if (de === para) return null;
  if (!TRANSICOES_ADITIVO[de].includes(para)) return `O aditivo não passa de "${ROTULO_STATUS_ADITIVO[de]}" para "${ROTULO_STATUS_ADITIVO[para]}".`;
  if (TRANSICOES_DE_APROVADOR.has(`${de}>${para}`) && !podeAprovar) return "Só quem aprova aditivos pode fazer esta mudança.";
  return null;
}

export function recusaTransicaoMedicao(de: string, para: string, podeAprovar: boolean): Recusa {
  if (!ehStatusMedicao(de) || !ehStatusMedicao(para)) return "Situação inválida.";
  if (de === para) return null;
  if (!TRANSICOES_MEDICAO[de].includes(para)) return `A medição não passa de "${ROTULO_STATUS_MEDICAO[de]}" para "${ROTULO_STATUS_MEDICAO[para]}".`;
  if (TRANSICOES_MEDICAO_APROVADOR.has(`${de}>${para}`) && !podeAprovar) return "Só quem aprova medições pode fazer esta mudança.";
  return null;
}

export function recusaTransicaoReembolso(de: string, para: string): Recusa {
  if (!ehStatusReembolso(de) || !ehStatusReembolso(para)) return "Situação inválida.";
  if (de === para) return null;
  return TRANSICOES_REEMBOLSO[de].includes(para) ? null : `O reembolso não passa de "${ROTULO_STATUS_REEMBOLSO[de]}" para "${ROTULO_STATUS_REEMBOLSO[para]}".`;
}

export const statusDoAditivoEditavel = (s: string) => s === "rascunho" || s === "negociacao";
/** O valor original e os itens originais só mudam antes de o contrato valer. */
export const contratoEmPreparo = (s: string) => s === "rascunho" || s === "aguardando_assinatura";
/** Contrato que aceita medição, aditivo e faturamento. */
export const contratoEmExecucao = (s: string) => s === "ativo" || s === "concluido";

// ───────────────────────────── Dinheiro ─────────────────────────────

/** Reais → centavos inteiros (arredonda meio centavo para cima em módulo). */
export const cents = (v: number | string | null | undefined): number => {
  const n = typeof v === "string" ? Number(v) : v ?? 0;
  return Number.isFinite(n) ? Math.round((n as number) * 100) : 0;
};
export const reais = (c: number) => c / 100;

/** Valor de um número digitado em pt-BR ("1.234,56") ou já normalizado ("1234.56"). */
export function lerNumero(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const s = v.trim().replace(/^R\$\s*/, "");
  if (!s) return null;
  const normal = /,\d{1,4}$/.test(s) || (s.includes(",") && !s.includes(".")) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

// ───────────────────────────── Eficácia ─────────────────────────────

export interface AditivoParaCalculo {
  id: string;
  status: string;
  valorDelta: number | string;
  novoTermino?: string | null;
  inicioVigencia?: string | null;
  dataAssinatura?: string | null;
  numero?: number;
}

/**
 * Eficaz na data `hoje` ("MM/DD/YYYY"): assinado e com vigência iniciada
 * (vigência ou, sem ela, a assinatura; sem nenhuma das duas, vale desde a
 * assinatura registrada no sistema).
 */
export function aditivoEficaz(a: AditivoParaCalculo, hoje: string): boolean {
  if (a.status !== "assinado") return false;
  const inicio = ymd(a.inicioVigencia) ?? ymd(a.dataAssinatura);
  const ref = ymd(hoje);
  return inicio == null || ref == null || inicio <= ref;
}

/** Aprovado ou assinado com vigência futura: conhecido, mas ainda sem efeito. */
export function aditivoPendenteDeEficacia(a: AditivoParaCalculo, hoje: string): boolean {
  return (a.status === "aprovado" || a.status === "assinado") && !aditivoEficaz(a, hoje);
}

// ───────────────────────────── Valor e prazo ─────────────────────────────

export interface EvolucaoDoValor {
  evento: string;
  aditivoId: string | null;
  variacao: number;
  acumulado: number;
  termino: string | null;
  eficaz: boolean;
}

/**
 * Evolução histórica: contrato original e cada aditivo assinado (eficaz ou
 * com vigência futura), na ordem do número. Aditivo cancelado, rejeitado ou
 * ainda não formalizado não entra no acumulado.
 */
export function evolucaoDoContrato(
  contrato: { valorOriginal: number | string; dataTerminoPrevista?: string | null },
  aditivos: readonly AditivoParaCalculo[],
  hoje: string,
): EvolucaoDoValor[] {
  let acc = cents(contrato.valorOriginal);
  let termino = contrato.dataTerminoPrevista ?? null;
  const out: EvolucaoDoValor[] = [{ evento: "Contrato original", aditivoId: null, variacao: reais(acc), acumulado: reais(acc), termino, eficaz: true }];
  const ordenados = [...aditivos].filter((a) => a.status === "assinado").sort((x, y) => (x.numero ?? 0) - (y.numero ?? 0));
  for (const a of ordenados) {
    const eficaz = aditivoEficaz(a, hoje);
    const d = cents(a.valorDelta);
    if (eficaz) {
      acc += d;
      if (a.novoTermino) termino = a.novoTermino;
    }
    out.push({ evento: `Aditivo ${String(a.numero ?? "").padStart(2, "0")}`, aditivoId: a.id, variacao: reais(d), acumulado: reais(acc), termino, eficaz });
  }
  return out;
}

export interface ValorDoContrato {
  original: number;
  acrescimos: number;
  reducoes: number;
  atualizado: number;
  terminoAtualizado: string | null;
  /** Soma das variações aprovadas/assinadas ainda sem eficácia (não conta). */
  pendente: number;
  aditivosPendentes: number;
}

export function valorDoContrato(
  contrato: { valorOriginal: number | string; dataTerminoPrevista?: string | null },
  aditivos: readonly AditivoParaCalculo[],
  hoje: string,
): ValorDoContrato {
  let ac = 0;
  let red = 0;
  let pend = 0;
  let nPend = 0;
  let termino = contrato.dataTerminoPrevista ?? null;
  const ordenados = [...aditivos].sort((x, y) => (x.numero ?? 0) - (y.numero ?? 0));
  for (const a of ordenados) {
    const d = cents(a.valorDelta);
    if (aditivoEficaz(a, hoje)) {
      if (d >= 0) ac += d;
      else red += -d;
      if (a.novoTermino) termino = a.novoTermino;
    } else if (aditivoPendenteDeEficacia(a, hoje)) {
      pend += d;
      nPend += 1;
    }
  }
  const orig = cents(contrato.valorOriginal);
  return { original: reais(orig), acrescimos: reais(ac), reducoes: reais(red), atualizado: reais(orig + ac - red), terminoAtualizado: termino, pendente: reais(pend), aditivosPendentes: nPend };
}

// ───────────────────────────── Itens ─────────────────────────────

export interface ItemParaCalculo {
  id: string;
  valorTotal: number | string;
  quantidade?: number | string;
  valorUnitario?: number | string;
  origemAditivoId?: string | null;
  cancelado?: boolean;
}
export interface VariacaoDeItem {
  aditivoId: string;
  itemId: string;
  deltaValor: number | string;
  deltaQuantidade?: number | string;
}

/**
 * Limite vigente de cada item: valor original + variações dos aditivos
 * eficazes. Item incluído por aditivo só existe quando o aditivo é eficaz.
 * Item cancelado tem limite zero.
 */
export function limitesDosItens(
  itens: readonly ItemParaCalculo[],
  variacoes: readonly VariacaoDeItem[],
  aditivos: readonly AditivoParaCalculo[],
  hoje: string,
): Map<string, { limite: number; quantidade: number; vigente: boolean }> {
  const eficazes = new Set(aditivos.filter((a) => aditivoEficaz(a, hoje)).map((a) => a.id));
  const out = new Map<string, { limite: number; quantidade: number; vigente: boolean }>();
  for (const i of itens) {
    const vigente = !i.cancelado && (!i.origemAditivoId || eficazes.has(i.origemAditivoId));
    let c = vigente ? cents(i.valorTotal) : 0;
    let q = vigente ? Number(i.quantidade ?? 0) : 0;
    if (vigente)
      for (const v of variacoes)
        if (v.itemId === i.id && eficazes.has(v.aditivoId)) {
          c += cents(v.deltaValor);
          q += Number(v.deltaQuantidade ?? 0);
        }
    out.set(i.id, { limite: reais(c), quantidade: q, vigente });
  }
  return out;
}

/** Valor total de um item a partir de quantidade × unitário (2 casas). */
export const totalDoItem = (quantidade: number, valorUnitario: number) => reais(Math.round(quantidade * valorUnitario * 100));

/**
 * Valor da medição pelo critério do item: quantidade × unitário, ou
 * percentual do limite vigente. Entrega, marco e periódico usam o valor
 * informado (o padrão sugerido é o limite do item, ou o do marco).
 */
export function valorDaMedicao(
  criterio: string,
  entrada: { quantidade?: number | null; percentual?: number | null; valorInformado?: number | null },
  item: { valorUnitario?: number | string; limite: number } | null,
): { valor: number } | { erro: string } {
  if (item && criterio === "quantidade") {
    if (entrada.quantidade == null || !(entrada.quantidade > 0)) return { erro: "Informe a quantidade executada." };
    return { valor: totalDoItem(entrada.quantidade, Number(item.valorUnitario ?? 0)) };
  }
  if (item && criterio === "percentual") {
    if (entrada.percentual == null || !(entrada.percentual > 0) || entrada.percentual > 100) return { erro: "Informe o percentual do período (maior que 0 e até 100)." };
    return { valor: reais(Math.round(item.limite * entrada.percentual)) };
  }
  if (entrada.valorInformado == null || !(entrada.valorInformado > 0)) return { erro: "Informe o valor medido." };
  return { valor: reais(cents(entrada.valorInformado)) };
}

// ───────────────────────────── Limite da medição ─────────────────────────────

export interface MedicaoParaCalculo {
  id: string;
  itemId: string | null;
  valor: number | string;
  status: string;
}

/**
 * Recusa de aprovar `nova`: o acumulado APROVADO do item e do contrato não
 * pode passar do limite vigente. As outras medições contam só se aprovadas.
 */
export function recusaDeLimite(
  nova: { id: string; itemId: string | null; valor: number | string },
  medicoes: readonly MedicaoParaCalculo[],
  limiteDoContrato: number,
  limitesDeItem: Map<string, { limite: number; vigente: boolean }>,
): Recusa {
  const outras = medicoes.filter((m) => m.id !== nova.id && m.status === "aprovada");
  const v = cents(nova.valor);
  if (nova.itemId) {
    const lim = limitesDeItem.get(nova.itemId);
    if (!lim || !lim.vigente) return "O item da medição não está vigente (cancelado ou incluído por aditivo ainda sem eficácia).";
    const acum = outras.filter((m) => m.itemId === nova.itemId).reduce((s, m) => s + cents(m.valor), 0);
    if (acum + v > cents(lim.limite))
      return `A medição passa do limite do item: limite ${fmt(lim.limite)}, já aprovado ${fmt(reais(acum))}, esta ${fmt(reais(v))}. Registre um aditivo antes.`;
  }
  const acumContrato = outras.reduce((s, m) => s + cents(m.valor), 0);
  if (acumContrato + v > cents(limiteDoContrato))
    return `A medição passa do valor atualizado do contrato: ${fmt(limiteDoContrato)}, já aprovado ${fmt(reais(acumContrato))}, esta ${fmt(reais(v))}.`;
  return null;
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ───────────────────────────── Saldo ─────────────────────────────

export interface FaturaParaCalculo {
  valor: number | string;
  cancelado: boolean;
  /** soma dos recebimentos não estornados. */
  recebido: number | string;
}

export interface SaldoDoContrato extends ValorDoContrato {
  /** derivados que consomem o limite (valor atualizado deles). */
  comprometido: number;
  /** soma dos valores alocados aos projetos. */
  alocadoProjetos: number;
  medidoAprovado: number;
  medidoEmAprovacao: number;
  faturado: number;
  recebido: number;
  saldoAMedir: number;
  medidoNaoFaturado: number;
  faturadoNaoRecebido: number;
  /** limite ainda livre para novas ordens/derivados que consomem o principal. */
  saldoNaoComprometido: number;
  retido: number;
  pctMedido: number;
}

export function saldoDoContrato(input: {
  contrato: { valorOriginal: number | string; dataTerminoPrevista?: string | null; retencaoPct?: number | string | null };
  aditivos: readonly AditivoParaCalculo[];
  medicoes: readonly MedicaoParaCalculo[];
  faturas: readonly FaturaParaCalculo[];
  derivadosQueConsomem?: readonly { valorAtualizado: number }[];
  alocacoes?: readonly { valorAlocado: number | string | null }[];
  hoje: string;
}): SaldoDoContrato {
  const v = valorDoContrato(input.contrato, input.aditivos, input.hoje);
  const at = cents(v.atualizado);
  const medido = input.medicoes.filter((m) => m.status === "aprovada").reduce((s, m) => s + cents(m.valor), 0);
  const emAprov = input.medicoes.filter((m) => m.status === "enviada" || m.status === "em_analise").reduce((s, m) => s + cents(m.valor), 0);
  const ativas = input.faturas.filter((f) => !f.cancelado);
  const faturado = ativas.reduce((s, f) => s + cents(f.valor), 0);
  const recebido = ativas.reduce((s, f) => s + cents(f.recebido), 0);
  const comprometido = (input.derivadosQueConsomem ?? []).reduce((s, d) => s + cents(d.valorAtualizado), 0);
  const alocado = (input.alocacoes ?? []).reduce((s, a) => s + cents(a.valorAlocado), 0);
  const ret = Number(input.contrato.retencaoPct ?? 0);
  return {
    ...v,
    comprometido: reais(comprometido),
    alocadoProjetos: reais(alocado),
    medidoAprovado: reais(medido),
    medidoEmAprovacao: reais(emAprov),
    faturado: reais(faturado),
    recebido: reais(recebido),
    saldoAMedir: reais(at - medido),
    medidoNaoFaturado: reais(medido - faturado),
    faturadoNaoRecebido: reais(faturado - recebido),
    saldoNaoComprometido: reais(at - comprometido),
    retido: Number.isFinite(ret) && ret > 0 ? reais(Math.round((faturado * ret) / 100)) : 0,
    pctMedido: at > 0 ? Math.round((medido / at) * 10000) / 100 : 0,
  };
}

/**
 * Consolidação do principal com os derivados SEM dupla contagem: derivado que
 * consome o limite já está dentro do valor do principal; só o "adicional"
 * soma. Medido, faturado e recebido são registros distintos e somam todos.
 */
export function consolidarGuardaChuva(
  principal: SaldoDoContrato,
  derivados: readonly { vinculo: string | null; saldo: SaldoDoContrato }[],
): { valorTotal: number; medido: number; faturado: number; recebido: number; saldoAMedir: number } {
  let total = cents(principal.atualizado);
  let medido = cents(principal.medidoAprovado);
  let fat = cents(principal.faturado);
  let rec = cents(principal.recebido);
  for (const d of derivados) {
    if (d.vinculo === "adicional") total += cents(d.saldo.atualizado);
    medido += cents(d.saldo.medidoAprovado);
    fat += cents(d.saldo.faturado);
    rec += cents(d.saldo.recebido);
  }
  return { valorTotal: reais(total), medido: reais(medido), faturado: reais(fat), recebido: reais(rec), saldoAMedir: reais(total - medido) };
}

/** Recusa de um derivado que consome o limite: a soma não passa do principal. */
export function recusaDeComprometimento(valorPrincipalAtualizado: number, outrosComprometidos: number, novoValor: number): Recusa {
  const livre = cents(valorPrincipalAtualizado) - cents(outrosComprometidos);
  if (cents(novoValor) > livre) return `O derivado passa do saldo do contrato principal: livre ${fmt(reais(Math.max(0, livre)))}, pedido ${fmt(novoValor)}.`;
  return null;
}

/** Contratos com término (atualizado) nos próximos `dias` dias, a partir de `hoje`. */
export function venceEm(termino: string | null | undefined, hoje: string, dias: number): boolean {
  const t = ymd(termino);
  const h = ymd(hoje);
  if (t == null || h == null) return false;
  const dt = (s: number) => new Date(Math.floor(s / 10000), Math.floor((s % 10000) / 100) - 1, s % 100).getTime();
  const diff = (dt(t) - dt(h)) / 86400000;
  return diff >= 0 && diff <= dias;
}

/** "MM/DD/YYYY" de uma data. */
export function hojeMDY(d = new Date()): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

/** Código do aditivo: "<código do contrato>-AD01". */
export const codigoDoAditivo = (codigoContrato: string, numero: number) => `${codigoContrato}-AD${String(numero).padStart(2, "0")}`;


/**
 * 0079 — Reembolsos agrupados pela conta ORIGINAL da despesa (Plano de
 * Contas). Solicitado conta o que saiu do rascunho; aprovado, o que foi
 * aprovado em diante; recebido, o recebido. Rejeitado não soma aprovado.
 */
export function reembolsosPorConta(
  linhas: readonly { conta: string | null; status: string; solicitado: number; aprovado: number | null; recebido: number }[],
  nomes: ReadonlyMap<string, string>,
): { conta: string; rotulo: string; solicitado: number; aprovado: number; recebido: number }[] {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const m = new Map<string, { solicitado: number; aprovado: number; recebido: number }>();
  for (const l of linhas) {
    const k = l.conta ?? "";
    const a = m.get(k) ?? { solicitado: 0, aprovado: 0, recebido: 0 };
    if (l.status !== "pendente") a.solicitado += l.solicitado;
    if (["aprovado", "faturado", "recebido"].includes(l.status)) a.aprovado += l.aprovado ?? l.solicitado;
    a.recebido += l.recebido;
    m.set(k, a);
  }
  return [...m.entries()]
    .map(([conta, a]) => ({ conta, rotulo: conta ? `${conta} — ${nomes.get(conta) ?? "fora do plano"}` : "Sem conta", solicitado: r2(a.solicitado), aprovado: r2(a.aprovado), recebido: r2(a.recebido) }))
    .sort((a, b) => b.solicitado - a.solicitado || a.conta.localeCompare(b.conta, undefined, { numeric: true }));
}
