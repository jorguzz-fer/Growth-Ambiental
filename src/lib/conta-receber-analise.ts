/**
 * Análises e propostas do assistente da tela de Contas a Receber (Prompt K,
 * seções 8.2 e 8.3) — código puro, sem modelo de IA. Tudo aqui é conta sobre
 * o que a página já carregou: nada grava, nada sai do sistema.
 *
 * O que o assistente NUNCA faz (8.4): dar baixa, conciliar sozinho, alterar
 * conta conciliada, cancelar. A proposta de conciliação (8.2) devolve pares
 * "conta ↔ linha do extrato"; o vínculo só nasce quando o usuário confirma e a
 * action `registrarRecebimento` valida tudo de novo no servidor.
 */
import { diasEntre, estadoDaConta, ymdNumero, type RecebimentoDaConta } from "@/lib/conta-receber-estado";

export interface ContaParaAnalise {
  id: string;
  projectId: string;
  tipo: string;
  descricao: string | null;
  valor: number;
  /** MM/DD/YYYY (formato gravado) ou nulo. */
  vencimento: string | null;
  unitCode: string | null;
  clienteId: string | null;
  clienteNome: string | null;
  recebimentos: readonly RecebimentoDaConta[];
}

export interface EntradaParaAnalise {
  id: string;
  /** null = movimento sem obra (Prompt AT §3): pode casar com conta de qualquer obra. */
  projectId: string | null;
  data: string | null;
  descricao: string | null;
  valor: number;
  /** Valor ainda sem vínculo (4.2). */
  disponivel: number;
}

const rotulo = (c: ContaParaAnalise) =>
  [c.unitCode ? `Un. ${c.unitCode}` : null, c.clienteNome, c.descricao || c.tipo].filter(Boolean).join(" · ");

export type FaixaDeAtraso = "até 30 dias" | "31 a 60 dias" | "61 a 90 dias" | "mais de 90 dias";

export interface ContaVencida {
  id: string;
  rotulo: string;
  vencimento: string;
  saldo: number;
  dias: number;
  faixa: FaixaDeAtraso;
}

const faixa = (dias: number): FaixaDeAtraso => (dias <= 30 ? "até 30 dias" : dias <= 60 ? "31 a 60 dias" : dias <= 90 ? "61 a 90 dias" : "mais de 90 dias");

/** 8.3 · contas vencidas e ainda com saldo, da mais antiga para a mais nova. */
export function vencidasSemRecebimento(contas: readonly ContaParaAnalise[], hojeYmd: number): ContaVencida[] {
  const out: ContaVencida[] = [];
  for (const c of contas) {
    const v = ymdNumero(c.vencimento);
    if (v == null || v >= hojeYmd) continue;
    const e = estadoDaConta({ valor: c.valor, cancelado: false, recebimentos: c.recebimentos });
    if (e.quitada || e.saldo <= 0) continue;
    const dias = diasEntre(v, hojeYmd);
    out.push({ id: c.id, rotulo: rotulo(c), vencimento: c.vencimento!, saldo: e.saldo, dias, faixa: faixa(dias) });
  }
  return out.sort((a, b) => b.dias - a.dias || b.saldo - a.saldo);
}

export interface ContaSemConciliar {
  id: string;
  rotulo: string;
  valor: number;
  dias: number | null;
}

/** 8.3 · recebidas (no todo ou em parte) fora do extrato, e há quantos dias. */
export function recebidasSemConciliar(contas: readonly ContaParaAnalise[], hojeYmd: number): ContaSemConciliar[] {
  const out: ContaSemConciliar[] = [];
  for (const c of contas) {
    const soltos = c.recebimentos.filter((r) => !r.estornado && !r.cashEntryId);
    if (soltos.length === 0) continue;
    let dias: number | null = null;
    for (const r of soltos) {
      const d = ymdNumero(r.data);
      if (d == null) continue;
      const n = diasEntre(d, hojeYmd);
      if (dias == null || n > dias) dias = n;
    }
    out.push({ id: c.id, rotulo: rotulo(c), valor: Math.round(soltos.reduce((a, r) => a + r.valor, 0) * 100) / 100, dias });
  }
  return out.sort((a, b) => (b.dias ?? -1) - (a.dias ?? -1) || b.valor - a.valor);
}

export interface ContaSemVinculo {
  id: string;
  rotulo: string;
  faltaUnidade: boolean;
  faltaCliente: boolean;
}

/** 8.3 · contas sem unidade ou sem cliente vinculado ("Outras Receitas" não precisa de unidade). */
export function semUnidadeOuCliente(contas: readonly ContaParaAnalise[]): ContaSemVinculo[] {
  return contas
    .map((c) => ({
      id: c.id,
      rotulo: rotulo(c),
      faltaUnidade: !c.unitCode && c.tipo !== "Outras Receitas" && c.tipo !== "Outros",
      faltaCliente: !c.clienteId,
    }))
    .filter((x) => x.faltaUnidade || x.faltaCliente);
}

export interface ValorForaDoPadrao {
  id: string;
  rotulo: string;
  valor: number;
  padrao: number;
  /** valor / padrão − 1, em fração (0.25 = 25 % acima). */
  desvio: number;
}

/**
 * 8.3 · parcelas cujo valor destoa do padrão: entre as "Parcela mensal" da
 * mesma unidade (mínimo 3), a mediana é o padrão; desvio acima de 20 % é
 * apontado. A "divergência plano × parcelas" propriamente dita só existe
 * depois da materialização (BK-0) e não entra aqui.
 */
export function valorForaDoPadrao(contas: readonly ContaParaAnalise[]): ValorForaDoPadrao[] {
  const grupos = new Map<string, ContaParaAnalise[]>();
  for (const c of contas) {
    if (c.tipo !== "Parcela mensal" || !c.unitCode) continue;
    const k = `${c.projectId}|${c.unitCode.trim().toLowerCase()}`;
    grupos.set(k, [...(grupos.get(k) ?? []), c]);
  }
  const out: ValorForaDoPadrao[] = [];
  for (const g of grupos.values()) {
    if (g.length < 3) continue;
    const ord = g.map((c) => c.valor).sort((a, b) => a - b);
    const meio = Math.floor(ord.length / 2);
    const padrao = ord.length % 2 ? ord[meio] : (ord[meio - 1] + ord[meio]) / 2;
    if (!(padrao > 0)) continue;
    for (const c of g) {
      const desvio = c.valor / padrao - 1;
      if (Math.abs(desvio) > 0.2) out.push({ id: c.id, rotulo: rotulo(c), valor: c.valor, padrao, desvio });
    }
  }
  return out.sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio));
}

export interface PropostaDeConciliacao {
  contaId: string;
  contaRotulo: string;
  saldo: number;
  cashEntryId: string;
  entradaData: string | null;
  entradaDescricao: string | null;
  /** Quanto do movimento seria vinculado (= saldo da conta). */
  valor: number;
  motivos: string[];
  /** 0 a 3: valor igual (sempre), data perto, cliente no extrato. */
  pontos: number;
}

const normaliza = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function clienteNoExtrato(cliente: string | null, descricao: string | null): boolean {
  if (!cliente || !descricao) return false;
  const palavras = normaliza(cliente)
    .split(/\s+/)
    .filter((p) => p.length >= 4 && !["ltda", "eireli", "s/a", "me"].includes(p));
  if (palavras.length === 0) return false;
  const d = normaliza(descricao);
  return palavras.some((p) => d.includes(p));
}

/**
 * 8.2 · proposta de conciliação: para cada entrada do extrato com valor livre,
 * a conta em aberto da mesma obra cujo saldo é igual ao valor livre (até R$
 * 0,05). Data a até 15 dias do vencimento e nome do cliente na descrição do
 * extrato aumentam a confiança. Uma conta e um movimento entram em no máximo
 * uma proposta cada (a de mais pontos primeiro).
 */
export function proporConciliacoes(contas: readonly ContaParaAnalise[], entradas: readonly EntradaParaAnalise[]): PropostaDeConciliacao[] {
  const abertas = contas
    .map((c) => ({ c, e: estadoDaConta({ valor: c.valor, cancelado: false, recebimentos: c.recebimentos }) }))
    .filter((x) => !x.e.quitada && x.e.saldo > 0);
  const candidatas: PropostaDeConciliacao[] = [];
  for (const m of entradas) {
    if (!(m.disponivel > 0)) continue;
    const dm = ymdNumero(m.data);
    for (const { c, e } of abertas) {
      if (m.projectId != null && c.projectId !== m.projectId) continue;
      if (Math.abs(e.saldo - m.disponivel) > 0.05) continue;
      const motivos = ["mesmo valor"];
      let pontos = 1;
      const dv = ymdNumero(c.vencimento);
      if (dm != null && dv != null) {
        const dias = Math.abs(diasEntre(Math.min(dm, dv), Math.max(dm, dv)));
        if (dias <= 15) {
          motivos.push(dias === 0 ? "no dia do vencimento" : dias === 1 ? "1 dia do vencimento" : `${dias} dias do vencimento`);
          pontos += 1;
        }
      }
      if (clienteNoExtrato(c.clienteNome, m.descricao)) {
        motivos.push("nome do cliente no extrato");
        pontos += 1;
      }
      candidatas.push({
        contaId: c.id,
        contaRotulo: rotulo(c),
        saldo: e.saldo,
        cashEntryId: m.id,
        entradaData: m.data,
        entradaDescricao: m.descricao,
        valor: e.saldo,
        motivos,
        pontos,
      });
    }
  }
  candidatas.sort((a, b) => b.pontos - a.pontos || b.valor - a.valor);
  const usadasContas = new Set<string>();
  const usadosMov = new Set<string>();
  const out: PropostaDeConciliacao[] = [];
  for (const p of candidatas) {
    if (usadasContas.has(p.contaId) || usadosMov.has(p.cashEntryId)) continue;
    usadasContas.add(p.contaId);
    usadosMov.add(p.cashEntryId);
    out.push(p);
  }
  return out;
}

export interface AnaliseDeContasReceber {
  propostas: PropostaDeConciliacao[];
  vencidas: ContaVencida[];
  semConciliar: ContaSemConciliar[];
  semVinculo: ContaSemVinculo[];
  foraDoPadrao: ValorForaDoPadrao[];
  total: number;
}

/** Tudo de uma vez, para a página passar ao painel. */
export function analisarContasReceber(
  contas: readonly ContaParaAnalise[],
  entradas: readonly EntradaParaAnalise[],
  hojeYmd: number,
): AnaliseDeContasReceber {
  return {
    propostas: proporConciliacoes(contas, entradas),
    vencidas: vencidasSemRecebimento(contas, hojeYmd),
    semConciliar: recebidasSemConciliar(contas, hojeYmd),
    semVinculo: semUnidadeOuCliente(contas),
    foraDoPadrao: valorForaDoPadrao(contas),
    total: contas.length,
  };
}
