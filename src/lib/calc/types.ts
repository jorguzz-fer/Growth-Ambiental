/**
 * Tipos do domínio de cálculo de receitas, portados do protótipo
 * (growth-tools-construction.html). As funções de cálculo operam sobre estes
 * tipos puros — independentes do banco — para que possam ser testadas e
 * reaproveitadas tanto no servidor quanto no cliente.
 *
 * Datas de vencimento seguem o formato do protótipo: "MM/DD/YYYY".
 * Chaves de mês (matriz de projeção e tabela INCC) seguem: "MM/YYYY".
 */

export type UnitStatus = "Disponivel" | "Reservado" | "Vendido" | "Permutado";
export type SubsidioStatus = "Aguardando Caixa" | "Recebido";

/** Sinais/atos: valor, vencimento, nº de parcelas e flag que libera o próximo. */
export interface SignalSource {
  val: number;
  venc: string;
  n: number;
}

/** Fontes periódicas (mensais/semestrais/anuais): corrigidas por INCC. */
export interface PeriodicSource {
  val: number;
  venc: string;
  n: number;
}

export interface FgtsSource {
  val: number;
  dataPrev: string;
}

export interface SubsidioSource {
  val: number;
  dataPrev: string;
  statusSub: SubsidioStatus;
}

export interface PermutaSource {
  desc: string;
  val: number;
  dataPrev: string;
}

export interface BancoSource {
  valFinanc: number;
  dataEntrada: string;
  dataPrimParc: string;
  statusFinanc: string;
}

/**
 * Cascata de fontes de recebimento de uma unidade. Cada flag `usar*` ativa a
 * próxima fonte na cascata (ver docs/historico-construction/SPEC.md §5).
 */
export interface PaymentPlan {
  usarAS: boolean;
  AS: SignalSource & { usarS1: boolean };
  S1: SignalSource & { usarS2: boolean };
  S2: SignalSource & { usarS3: boolean };
  S3: SignalSource & { usarMens: boolean };
  Mensais: PeriodicSource & { usarSem: boolean };
  Semestrais: PeriodicSource & { usarAnu: boolean };
  Anuais: PeriodicSource & { usarFGTS: boolean };
  FGTS: FgtsSource & { usarSub: boolean };
  Subsidio: SubsidioSource & { usarPer: boolean };
  Permuta: PermutaSource & { usarFinanc: boolean };
  Banco: BancoSource;
}

/** Unidade com plano de pagamento, na forma consumida pelos cálculos. */
export interface CalcUnit extends PaymentPlan {
  code: string;
  status: UnitStatus;
  /** VGV da unidade. */
  valor: number;
}

/** Linha da tabela INCC: variação mensal e acumulada (em %). */
export interface InccRow {
  /** "MM/YYYY" */
  m: string;
  /** variação mensal % */
  mo: number;
  /** acumulado % */
  ac: number;
  /** true = valor projetado (média móvel); false/undefined = índice oficial. */
  projected?: boolean;
}

/** Reembolso (subconjunto usado nos cálculos). */
export interface CalcReembolso {
  /** "MM/DD/YYYY" */
  data: string;
  valor: number;
  /** Só lido por `calcTotals` com a chave do Resumo (Prompt AE, 2.7). */
  status?: string | null;
}

/** Permuta (subconjunto usado nos agregados). */
export interface CalcPermuta {
  estimado: number;
  status: string;
  valorVenda: number;
}

/** Matriz mês → valor projetado (chaves "MM/YYYY"). */
export type MonthlyProjection = Record<string, number>;

/** Agregados de receita por versão (ver `calcTotals`). */
export interface VersionTotals {
  vgv: number;
  sinais: number;
  mens: number;
  sem: number;
  anu: number;
  fgts: number;
  sub: number;
  permRec: number;
  permVend: number;
  reemb: number;
  banco: number;
  disp: number;
  res: number;
  vend: number;
}
