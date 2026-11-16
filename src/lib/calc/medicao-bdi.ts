/**
 * Medição de obra, BDI e provisionamento de liberação.
 *
 * Todas as fórmulas foram derivadas da planilha de referência do cliente e
 * conferidas contra os números dela — ver docs/historico-construction/BDI-PROVISIONAMENTO.md, que
 * traz a validação número a número.
 *
 * Funções PURAS: nenhum valor é fixado em código. Percentuais de BDI, taxas,
 * CUB, metragem e valores financiados vêm sempre do cadastro do projeto.
 */

export interface ServicoOrcado {
  id: string;
  nome: string;
  /** custo proposto do serviço (R$). */
  custoProposto: number;
  /** faixa aceitável de incidência (%), opcional. */
  limiteMin?: number | null;
  limiteMax?: number | null;
}

export type StatusIncidencia = "OK" | "Abaixo do mínimo" | "Acima do máximo" | "—";

export interface ServicoCalculado extends ServicoOrcado {
  /** custo do serviço ÷ custo total dos serviços × 100. */
  incidencia: number;
  status: StatusIncidencia;
}

/** Custo total dos serviços do projeto. */
export function custoTotalServicos(servicos: ServicoOrcado[]): number {
  return servicos.reduce((a, s) => a + (Number(s.custoProposto) || 0), 0);
}

/**
 * Incidência de cada serviço no orçamento e status frente aos limites.
 * `status` só é avaliado quando há limites cadastrados.
 */
export function calcIncidencias(servicos: ServicoOrcado[]): ServicoCalculado[] {
  const total = custoTotalServicos(servicos);
  return servicos.map((s) => {
    const incidencia = total > 0 ? ((Number(s.custoProposto) || 0) / total) * 100 : 0;
    const min = s.limiteMin == null ? null : Number(s.limiteMin);
    const max = s.limiteMax == null ? null : Number(s.limiteMax);
    let status: StatusIncidencia = "—";
    if (min != null || max != null) {
      if (min != null && incidencia < min) status = "Abaixo do mínimo";
      else if (max != null && incidencia > max) status = "Acima do máximo";
      else status = "OK";
    }
    return { ...s, incidencia, status };
  });
}

export interface BdiResultado {
  custoTotalServicos: number;
  pctBdi: number;
  valorBdi: number;
  custoTotalComBdi: number;
}

/**
 * BDI sobre o custo total dos serviços.
 *
 *   valor do BDI      = custo total dos serviços × %BDI
 *   custo total c/BDI = custo total dos serviços + valor do BDI
 *
 * O `pctBdi` é sempre um parâmetro do projeto — a alíquota varia conforme o
 * tipo de executor da obra e NÃO é presumida aqui.
 */
export function calcBdi(servicos: ServicoOrcado[], pctBdi: number): BdiResultado {
  const custo = custoTotalServicos(servicos);
  const pct = Number(pctBdi) || 0;
  const valorBdi = custo * (pct / 100);
  return {
    custoTotalServicos: custo,
    pctBdi: pct,
    valorBdi,
    custoTotalComBdi: custo + valorBdi,
  };
}

/** Ordena competências "MM/YYYY" cronologicamente. */
export function sortCompetencias(ms: string[]): string[] {
  return [...ms].sort((a, b) => {
    const [ma, ya] = a.split("/");
    const [mb, yb] = b.split("/");
    return (
      Number(ya) - Number(yb) || Number(ma) - Number(mb)
    );
  });
}

export interface MedicaoServicoInput {
  servicoId: string;
  competencia: string;
  /** % executado ACUMULADO do serviço ao fim da competência (0..100). */
  pctExecutadoAcum: number;
}

export interface EvolucaoMes {
  competencia: string;
  /** execução acumulada da OBRA (%) ao fim do mês. */
  acumulado: number;
  /** variação do mês = acumulado atual − acumulado anterior. */
  variacao: number;
}

/**
 * Evolução física da obra mês a mês.
 *
 *   execução acumulada do serviço = incidência × %executado do serviço
 *   acumulado da obra             = Σ execuções acumuladas dos serviços
 *   variação mensal               = acumulado atual − acumulado anterior
 *
 * O %executado de um serviço é "carregado" para os meses seguintes enquanto não
 * houver nova medição — o acumulado nunca regride sozinho por falta de
 * lançamento no mês.
 */
export function calcEvolucao(
  servicos: ServicoOrcado[],
  medicoes: MedicaoServicoInput[],
): EvolucaoMes[] {
  const incid = new Map(calcIncidencias(servicos).map((s) => [s.id, s.incidencia]));
  const competencias = sortCompetencias([
    ...new Set(medicoes.map((m) => m.competencia)),
  ]);

  // Último % executado conhecido de cada serviço (carregado mês a mês).
  const ultimoPct = new Map<string, number>();
  const out: EvolucaoMes[] = [];
  let anterior = 0;

  for (const comp of competencias) {
    for (const m of medicoes.filter((x) => x.competencia === comp)) {
      ultimoPct.set(m.servicoId, Number(m.pctExecutadoAcum) || 0);
    }
    let acumulado = 0;
    for (const [servicoId, pct] of ultimoPct) {
      acumulado += ((incid.get(servicoId) ?? 0) * pct) / 100;
    }
    out.push({ competencia: comp, acumulado, variacao: acumulado - anterior });
    anterior = acumulado;
  }
  return out;
}

export interface ParamsProvisionamento {
  /** valor financiado destinado à CONSTRUÇÃO. */
  financiamentoConstrucao: number;
  /** valor financiado do TERRENO (entra no acumulado, sem custo de obra). */
  financiamentoTerreno: number;
  /** custo referencial da obra = CUB × metragem. */
  custoReferencial: number;
  /** parcela de referência do caixa (base do E.V.O). */
  parcelaReferencia: number;
  /** % de taxas incidentes sobre a liberação do mês (ex.: 1,5). */
  pctTaxa: number;
}

export interface LinhaProvisionamento {
  competencia: string;
  /** variação física do mês (%). */
  obraMes: number;
  liberacao: number;
  custoEstimado: number;
  /** geração de caixa/margem = liberação − custo estimado. */
  caixa: number;
  liberacaoAcumulada: number;
  /** liberação acumulada ÷ total financiado (0..1). */
  pctRecebido: number;
  evo: number;
  taxa: number;
  soma: number;
  /** saldo de financiamento ainda disponível. */
  saldoFinanciamento: number;
}

/**
 * Quadro mensal de liberação/provisionamento (docs/historico-construction/BDI-PROVISIONAMENTO.md §5):
 *
 *   liberação do mês  = variação mensal × financiamento da construção
 *   custo estimado    = variação mensal × custo referencial (CUB × metragem)
 *   geração de caixa  = liberação − custo estimado
 *   % recebido        = liberação acumulada ÷ (financ. construção + terreno)
 *   E.V.O             = parcela de referência × % recebido
 *   taxa              = %taxa × liberação do mês
 *
 * A liberação do TERRENO entra no acumulado inicial (não tem variação de obra
 * nem custo associados).
 */
export function calcProvisionamento(
  evolucao: EvolucaoMes[],
  p: ParamsProvisionamento,
): LinhaProvisionamento[] {
  const totalFinanciado =
    (Number(p.financiamentoConstrucao) || 0) + (Number(p.financiamentoTerreno) || 0);
  // O terreno já liberado compõe o acumulado desde o início.
  let acumulado = Number(p.financiamentoTerreno) || 0;

  return evolucao.map((e) => {
    const fracao = e.variacao / 100;
    const liberacao = fracao * (Number(p.financiamentoConstrucao) || 0);
    const custoEstimado = fracao * (Number(p.custoReferencial) || 0);
    acumulado += liberacao;
    const pctRecebido = totalFinanciado > 0 ? acumulado / totalFinanciado : 0;
    const evo = (Number(p.parcelaReferencia) || 0) * pctRecebido;
    const taxa = liberacao * ((Number(p.pctTaxa) || 0) / 100);
    return {
      competencia: e.competencia,
      obraMes: e.variacao,
      liberacao,
      custoEstimado,
      caixa: liberacao - custoEstimado,
      liberacaoAcumulada: acumulado,
      pctRecebido,
      evo,
      taxa,
      soma: evo + taxa,
      saldoFinanciamento: totalFinanciado - acumulado,
    };
  });
}

/** Custo referencial da obra = CUB × metragem. */
export function custoReferencial(cub: number, metragem: number): number {
  return (Number(cub) || 0) * (Number(metragem) || 0);
}
