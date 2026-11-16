/**
 * Resumo Executivo por pergunta (Prompt AE, Parte 1) — chave
 * "resumo_definicao_nova". Módulo PURO: recebe o que a página já leu do
 * banco e monta os blocos prontos. Os blocos que dependem de decisão aberta
 * entram com o MOTIVO escrito, nunca com número provisório (1.9).
 */
import type { VersionTotals } from "@/lib/calc/types";
import type { Inputs } from "@/lib/calc/dre-cascata";
import { brl, pct1, ym, ymd } from "@/lib/utils";

export const STATUS_DE_UNIDADE = ["Disponivel", "Reservado", "Vendido", "Permutado"] as const;

export interface UnidadeDoResumo {
  status: string;
  valor: number;
  mesVenda: string | null;
  /** O plano de pagamento tem alguma fonte com valor? */
  temPlano: boolean;
}

export type Vso =
  | { estado: "sem_periodo" }
  | { estado: "sem_data"; vendidasSemData: number }
  | { estado: "sem_oferta" }
  | { estado: "ok"; vendidasNoPeriodo: number; ofertaNoInicio: number; pct: number };

export interface BlocoVendas {
  vgvTotal: number;
  vgvVendido: number;
  porStatus: Record<(typeof STATUS_DE_UNIDADE)[number], number>;
  /** Contagem de TODAS as unidades (2.3: não é a soma de três filtros). */
  total: number;
  vso: Vso;
}

/** 1.4 · Vendas. VGV total conta todas; VGV vendido, só as Vendidas. */
export function blocoVendas(unidades: readonly UnidadeDoResumo[], de: string, ate: string): BlocoVendas {
  const porStatus = { Disponivel: 0, Reservado: 0, Vendido: 0, Permutado: 0 };
  for (const u of unidades) if (u.status in porStatus) porStatus[u.status as keyof typeof porStatus]++;
  return {
    vgvTotal: unidades.reduce((a, u) => a + u.valor, 0),
    vgvVendido: unidades.filter((u) => u.status === "Vendido").reduce((a, u) => a + u.valor, 0),
    porStatus,
    total: unidades.length,
    vso: vso(unidades, de, ate),
  };
}

/**
 * BAE-3 · VSO = vendidas no período ÷ oferta no início do período (as que
 * ainda não estavam vendidas). Sem período, ou com vendida sem data, NÃO é
 * calculado — a ausência é dita, nunca aproximada.
 */
export function vso(unidades: readonly UnidadeDoResumo[], de: string, ate: string): Vso {
  if (!de && !ate) return { estado: "sem_periodo" };
  const vendidas = unidades.filter((u) => u.status === "Vendido");
  const semData = vendidas.filter((u) => ymd(u.mesVenda) == null).length;
  if (semData > 0) return { estado: "sem_data", vendidasSemData: semData };
  const ini = ymd(de);
  const fim = ymd(ate);
  const vendidaAntes = (u: UnidadeDoResumo) => u.status === "Vendido" && ini != null && (ymd(u.mesVenda) as number) < ini;
  const oferta = unidades.filter((u) => u.status !== "Permutado" && !vendidaAntes(u)).length;
  if (oferta === 0) return { estado: "sem_oferta" };
  const noPeriodo = vendidas.filter((u) => {
    const d = ymd(u.mesVenda) as number;
    return (ini == null || d >= ini) && (fim == null || d <= fim);
  }).length;
  return { estado: "ok", vendidasNoPeriodo: noPeriodo, ofertaNoInicio: oferta, pct: (noPeriodo / oferta) * 100 };
}

export interface ContaEmAberto {
  saldo: number;
  vencida: boolean;
}

export interface BlocoExposicao {
  aReceber: { porVencer: number; vencido: number; contas: number } | null;
  aPagar: { porVencer: number; vencido: number; contas: number } | null;
  financiamento: { aprovado: number; liberado: number };
  permutaEmEstoque: number;
}

const somar = (xs: readonly ContaEmAberto[]) => {
  const abertas = xs.filter((x) => x.saldo > 0);
  return {
    porVencer: abertas.filter((x) => !x.vencida).reduce((a, x) => a + x.saldo, 0),
    vencido: abertas.filter((x) => x.vencida).reduce((a, x) => a + x.saldo, 0),
    contas: abertas.length,
  };
};

/**
 * 1.6 · Exposição — pelo SALDO, nunca o valor cheio. `null` quando o leitor
 * não tem permissão da tela de origem (5.4): ausência, não zero.
 */
export function blocoExposicao(o: {
  receber: readonly ContaEmAberto[] | null;
  pagar: readonly ContaEmAberto[] | null;
  totals: VersionTotals;
  permutas: readonly { status: string | null; estimado: number }[];
}): BlocoExposicao {
  return {
    aReceber: o.receber ? somar(o.receber) : null,
    aPagar: o.pagar ? somar(o.pagar) : null,
    financiamento: { aprovado: o.totals.banco, liberado: o.totals.reemb },
    // Permuta em estoque: recebida e ainda não vendida, pelo valor de entrada.
    permutaEmEstoque: o.permutas.filter((p) => (p.status ?? "") !== "Vendido").reduce((a, p) => a + p.estimado, 0),
  };
}

export interface LinhaDeAtencao {
  texto: string;
  href: string;
}

/** 1.7 · Atenção — as exceções CATEGÓRICAS. As por valor (BAE-1) vêm de `alertaDeDesvio` e `alertaDeVencidos`. Nunca causa. */
export function blocoAtencao(o: {
  obra: string;
  projectId: string;
  temAtual: boolean;
  unidades: readonly UnidadeDoResumo[];
  despesasSemClassificacao: number | null;
}): LinhaDeAtencao[] {
  const out: LinhaDeAtencao[] = [];
  if (!o.temAtual) out.push({ texto: `${o.obra} não tem versão Atual: nenhum valor contratado a mostrar.`, href: `/projeto?proj=${o.projectId}` });
  const semPlano = o.unidades.filter((u) => u.status === "Vendido" && !u.temPlano);
  if (semPlano.length) out.push({ texto: `${semPlano.length} unidade(s) vendida(s) sem plano de pagamento — ${o.obra}.`, href: `/unidades?proj=${o.projectId}` });
  const semData = o.unidades.filter((u) => u.status === "Vendido" && ymd(u.mesVenda) == null);
  if (semData.length) out.push({ texto: `${semData.length} unidade(s) vendida(s) sem data de venda — o VSO não é calculável.`, href: `/unidades?proj=${o.projectId}` });
  if (o.despesasSemClassificacao)
    out.push({ texto: `${o.despesasSemClassificacao} despesa(s) da Atual sem categoria DRE ou sem competência.`, href: `/conferencia?proj=${o.projectId}` });
  return out;
}

/**
 * BAE-1 (decisão de 01/10/2026): os limites dos alertas por valor. Um valor só
 * para a empresa toda, gravado no tenant (migração 0065) — não em código.
 */
export interface ParametrosDeAlerta {
  /** desvio de custo: acima deste % ... */
  desvioPct: number;
  /** ... E acima deste valor em R$ (os dois juntos). */
  desvioValor: number;
  /** recebível vencido há MAIS destes dias. */
  vencidoDias: number;
}

export function parametrosDeAlerta(t: { alertaDesvioPct: string | number; alertaDesvioValor: string | number; alertaVencidoDias: number }): ParametrosDeAlerta {
  return { desvioPct: Number(t.alertaDesvioPct), desvioValor: Number(t.alertaDesvioValor), vencidoDias: Number(t.alertaVencidoDias) };
}

/**
 * Custo (categorias de custo da cascata da DRE: Custo Variável + Custo Fixo)
 * somado nas competências ATÉ `mes` ("MM/YYYY"), inclusive. Lançamento sem
 * competência fica de fora: não dá para dizer se já devia ter acontecido.
 */
export function custoAteOMes(porMes: Readonly<Record<string, Inputs>>, mes: string): number {
  const limite = ym(mes);
  if (limite == null) return 0;
  let total = 0;
  for (const [mm, inp] of Object.entries(porMes)) {
    const m = ym(mm);
    if (m == null || m > limite) continue;
    total += inp.custoVar + (inp.byCat["Custo Fixo"] || 0);
  }
  return total;
}

/** Custo (Custo Variável + Custo Fixo) somado só nas competências de `meses`. */
export function custoNosMeses(porMes: Readonly<Record<string, Inputs>>, meses: ReadonlySet<string>): number {
  let total = 0;
  for (const [mm, inp] of Object.entries(porMes)) if (meses.has(mm)) total += inp.custoVar + (inp.byCat["Custo Fixo"] || 0);
  return total;
}

/**
 * Desvio de custo: Realizado (versão Atual) contra o Orçamento, nas mesmas
 * competências (até o mês corrente). Alerta só ACIMA do orçado e só quando
 * passa dos DOIS limites. Sem Orçamento, não calcula — e diz isso.
 */
export function alertaDeDesvio(
  o: {
    obra: string;
    projectId: string;
    /** null = não há Orçamento para comparar; `semOrcamento` diz por quê. */
    orcado: number | null;
    semOrcamento?: "sem_lancamento" | "fora_dos_relatorios";
    realizado: number;
    ate: string;
  },
  p: ParametrosDeAlerta,
): LinhaDeAtencao | null {
  const href = `/projeto?proj=${o.projectId}`;
  if (o.orcado == null)
    return {
      texto:
        o.semOrcamento === "fora_dos_relatorios"
          ? `${o.obra}: o Orçamento não está Aprovado e fica fora dos relatórios — o desvio de custo não é calculado.`
          : `${o.obra} sem Orçamento lançado: o desvio de custo não é calculado.`,
      href,
    };
  const dif = o.realizado - o.orcado;
  if (dif <= p.desvioValor) return null;
  if (o.orcado <= 0)
    return { texto: `Custo realizado de ${brl(o.realizado)} até ${o.ate} sem custo orçado nessas competências — ${o.obra}.`, href };
  const pct = (dif / o.orcado) * 100;
  if (pct <= p.desvioPct) return null;
  return {
    texto: `Custo ${pct1(pct)} acima do orçado até ${o.ate}: ${brl(o.realizado)} realizados contra ${brl(o.orcado)} (${brl(dif)} a mais) — ${o.obra}.`,
    href,
  };
}

/** O que o bloco Atenção declara sob o título: o que entra e com que limite. */
export function textoDosLimites(p: ParametrosDeAlerta): string {
  return `Exceções categóricas e por valor: custo acima de ${pct1(p.desvioPct)} e de ${brl(p.desvioValor)} do orçado; recebível vencido há mais de ${p.vencidoDias} dias (limites na tela Empresa)`;
}

/** Dias corridos entre duas datas "MM/DD/YYYY"; null se alguma for inválida. */
function diasEntre(de: string, ate: string): number | null {
  const a = ymd(de);
  const b = ymd(ate);
  if (a == null || b == null) return null;
  const d = (n: number) => Date.UTC(Math.floor(n / 10000), (Math.floor(n / 100) % 100) - 1, n % 100);
  return Math.round((d(b) - d(a)) / (24 * 60 * 60 * 1000));
}

/** Recebível com saldo em aberto vencido há MAIS de `vencidoDias` (hoje em "MM/DD/YYYY"). */
export function alertaDeVencidos(
  o: { obra: string; projectId: string; contas: readonly { saldo: number; vencimento: string | null }[]; hoje: string },
  p: ParametrosDeAlerta,
): LinhaDeAtencao | null {
  const atrasadas = o.contas.filter((c) => {
    if (c.saldo <= 0 || !c.vencimento) return false;
    const dias = diasEntre(c.vencimento, o.hoje);
    return dias != null && dias > p.vencidoDias;
  });
  if (!atrasadas.length) return null;
  const total = atrasadas.reduce((a, c) => a + c.saldo, 0);
  return {
    texto: `${atrasadas.length} recebível(is) vencido(s) há mais de ${p.vencidoDias} dias, ${brl(total)} em aberto — ${o.obra}.`,
    href: `/contasreceber?proj=${o.projectId}`,
  };
}

/**
 * 1.9 · Os blocos que este resumo não calcula, com o texto da tela e onde ver
 * a informação. GA-2B §3: o texto diz ao cliente onde olhar, sem explicar
 * decisões internas. (Resultado: a receita por competência ainda está em
 * revisão interna; Caixa: o ponto de partida do saldo é do Fluxo de Caixa.)
 * A nota de Execução (físico × financeiro) saiu: a função não existe na tela.
 */
export const BLOCOS_PENDENTES = {
  resultado: {
    texto: "O resultado por competência deste resumo está em revisão. Para a margem por contrato e projeto, veja a DRE.",
    link: { href: "/dre", rotulo: "DRE" },
  },
  caixa: {
    texto: "Saldo de hoje e projeção do caixa: veja o Fluxo de Caixa.",
    link: { href: "/fluxocaixa", rotulo: "Fluxo de Caixa" },
  },
  comparativo: {
    texto: "Comparativo entre projetos: aparece quando a tela somar mais de um projeto — escolha Todos, Ativos ou Finalizados no seletor de projeto.",
    link: null,
  },
} as const;

/** O plano tem alguma fonte com valor? (sinal, periódicas, FGTS, subsídio ou financiamento) */
export function temPlanoDePagamento(plano: unknown): boolean {
  if (!plano || typeof plano !== "object") return false;
  return Object.values(plano as Record<string, unknown>).some((sec) => {
    if (!sec || typeof sec !== "object") return false;
    const s = sec as { val?: unknown; valFinanc?: unknown };
    return Number(s.val) > 0 || Number(s.valFinanc) > 0;
  });
}
