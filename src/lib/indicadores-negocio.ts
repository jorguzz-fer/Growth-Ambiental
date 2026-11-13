/**
 * Prompt AE2 (Fase 3 · revisão V5): indicadores de negócio selecionáveis no
 * Resumo Executivo. Módulo PURO.
 *
 * Growth Ambiental: os indicadores de SERVIÇO (contratado, medido, faturado,
 * recebido, a receber, margem sobre o contratado) vêm dos contratos do
 * projeto (`valor-contratado.ts`). Os de VGV, unidades e m² são de
 * incorporação (`legado`): só são oferecidos quando algum projeto em tela
 * tem unidades ou área construída gravadas.
 *
 * Cada indicador tem definição escrita e, quando não dá para calcular, o
 * motivo (ex.: obra sem área construída no cadastro). A área construída é o
 * campo "metragem" do cadastro do projeto (BAE2-1: o campo já existe); a área
 * das unidades é o m² de cada unidade.
 */

/** Números de serviço do projeto (contratos), pela regra de `valor-contratado.ts`. */
export interface ServicosDaObra {
  contratado: number;
  medido: number;
  faturado: number;
  recebido: number;
  aReceber: number;
}
export const SERVICOS_VAZIOS: ServicosDaObra = { contratado: 0, medido: 0, faturado: 0, recebido: 0, aReceber: 0 };

export interface DadosDaObra {
  obra: string;
  servicos: ServicosDaObra;
  /** Soma do valor das unidades da versão Atual. */
  vgv: number;
  vgvVendido: number;
  unidades: number;
  vendidas: number;
  /** m² somados das unidades e das vendidas (só as que têm m²). */
  m2Unidades: number;
  m2Vendidas: number;
  /** VGV só das unidades com m² (e das vendidas com m²): o par do m². */
  vgvComM2: number;
  vgvVendidoComM2: number;
  /** Área construída do cadastro do projeto; null = não informada. */
  metragem: number | null;
  /** Custo (CV + CF) da Atual até o mês corrente; null = sem acesso ou sem Atual. */
  custoRealizado: number | null;
  /** Custo do Orçamento até o mês corrente (a mesma janela do realizado). */
  custoOrcadoAteHoje: number | null;
  /** Custo do Orçamento no horizonte todo. */
  custoOrcadoTotal: number | null;
}

export type Formato = "brl" | "pct" | "brlm2" | "contagem";

export interface DefinicaoDeIndicador {
  id: string;
  nome: string;
  formato: Formato;
  definicao: string;
  /** Precisa ver o custo (tela de Despesas). */
  exigeCusto?: boolean;
  /** Indicador de incorporação (VGV, unidades, m²): só com dados antigos. */
  legado?: boolean;
}

export const INDICADORES_DE_NEGOCIO: readonly DefinicaoDeIndicador[] = [
  { id: "valor_contratado", nome: "Valor contratado", formato: "brl", definicao: "Valor atualizado (original + aditivos eficazes) dos contratos de serviço do projeto, sem rascunho e cancelado." },
  { id: "pct_medido", nome: "% medido", formato: "pct", definicao: "Medições aprovadas ÷ valor contratado." },
  { id: "faturado", nome: "Faturado", formato: "brl", definicao: "Faturas dos contratos (Contas a Receber), sem canceladas." },
  { id: "recebido", nome: "Recebido", formato: "brl", definicao: "Recebimentos das faturas dos contratos." },
  { id: "a_receber", nome: "Faturado a receber", formato: "brl", definicao: "Faturado menos o recebido." },
  { id: "custo_realizado", nome: "Custo realizado", formato: "brl", definicao: "Custo Variável + Custo Fixo da DRE na versão Atual, até o mês corrente.", exigeCusto: true },
  { id: "desvio_custo", nome: "Desvio de custo", formato: "pct", definicao: "(Custo realizado − custo do Orçamento) ÷ custo do Orçamento, nas mesmas competências (até o mês corrente).", exigeCusto: true },
  { id: "margem_contratada", nome: "Margem orçada sobre o contratado", formato: "pct", definicao: "(Valor contratado − custo do Orçamento no horizonte todo) ÷ valor contratado.", exigeCusto: true },
  // Dados antigos de incorporação (só oferecidos quando existem).
  { id: "vgv", nome: "VGV (dados antigos)", formato: "brl", definicao: "Soma do valor de todas as unidades (versão Atual).", legado: true },
  { id: "vgv_vendido", nome: "VGV vendido (dados antigos)", formato: "brl", definicao: "Soma do valor das unidades com status Vendido.", legado: true },
  { id: "pct_vendido", nome: "% do VGV vendido (dados antigos)", formato: "pct", definicao: "VGV vendido ÷ VGV.", legado: true },
  { id: "unidades_vendidas", nome: "Unidades vendidas (dados antigos)", formato: "contagem", definicao: "Unidades vendidas de quantas existem.", legado: true },
  { id: "preco_m2_vendido", nome: "Preço médio vendido por m² (dados antigos)", formato: "brlm2", definicao: "Valor das vendidas com m² ÷ m² delas.", legado: true },
  { id: "vgv_m2", nome: "VGV por m² (dados antigos)", formato: "brlm2", definicao: "Valor das unidades com m² ÷ m² delas.", legado: true },
  { id: "custo_m2", nome: "Custo realizado por m² (dados antigos)", formato: "brlm2", definicao: "Custo realizado ÷ área construída do cadastro do projeto.", exigeCusto: true, legado: true },
  { id: "custo_orcado_m2", nome: "Custo orçado por m² (dados antigos)", formato: "brlm2", definicao: "Custo do Orçamento no horizonte todo ÷ área construída do cadastro.", exigeCusto: true, legado: true },
  { id: "margem_orcada", nome: "Margem orçada sobre o VGV (dados antigos)", formato: "pct", definicao: "(VGV − custo do Orçamento no horizonte todo) ÷ VGV.", exigeCusto: true, legado: true },
] as const;

export const PADRAO_DE_INDICADORES = ["valor_contratado", "pct_medido", "a_receber", "desvio_custo"] as const;

/** Algum projeto em tela tem dado de incorporação (unidade ou área construída)? */
export const temDadosAntigos = (obras: readonly DadosDaObra[]) => obras.some((o) => o.unidades > 0 || (o.metragem != null && o.metragem > 0));

export interface ValorDeIndicador {
  valor: number | null;
  /** Para "Unidades vendidas": "12 de 40". */
  texto?: string;
  /** Por que não há valor. */
  motivo?: string;
}

const div = (a: number, b: number | null | undefined) => (b && b > 0 ? a / b : null);

/** Calcula um indicador para uma obra (ou para a soma, com `somarObras`). */
export function valorDoIndicador(id: string, d: DadosDaObra): ValorDeIndicador {
  switch (id) {
    case "valor_contratado":
      return { valor: d.servicos.contratado };
    case "pct_medido": {
      const v = div(d.servicos.medido, d.servicos.contratado);
      return v == null ? { valor: null, motivo: "sem contrato" } : { valor: v * 100 };
    }
    case "faturado":
      return { valor: d.servicos.faturado };
    case "recebido":
      return { valor: d.servicos.recebido };
    case "a_receber":
      return { valor: d.servicos.aReceber };
    case "margem_contratada": {
      if (d.custoOrcadoTotal == null) return { valor: null, motivo: "sem Orçamento" };
      const v = div(d.servicos.contratado - d.custoOrcadoTotal, d.servicos.contratado);
      return v == null ? { valor: null, motivo: "sem contrato" } : { valor: v * 100 };
    }
    case "vgv":
      return { valor: d.vgv };
    case "vgv_vendido":
      return { valor: d.vgvVendido };
    case "pct_vendido": {
      const v = div(d.vgvVendido, d.vgv);
      return v == null ? { valor: null, motivo: "sem VGV" } : { valor: v * 100 };
    }
    case "unidades_vendidas":
      return { valor: d.vendidas, texto: `${d.vendidas} de ${d.unidades}` };
    case "preco_m2_vendido": {
      const v = div(d.vgvVendidoComM2, d.m2Vendidas);
      return v == null ? { valor: null, motivo: d.vendidas ? "vendidas sem m²" : "nenhuma vendida" } : { valor: v };
    }
    case "vgv_m2": {
      const v = div(d.vgvComM2, d.m2Unidades);
      return v == null ? { valor: null, motivo: "unidades sem m²" } : { valor: v };
    }
    case "custo_realizado":
      return d.custoRealizado == null ? { valor: null, motivo: "sem Atual" } : { valor: d.custoRealizado };
    case "custo_m2": {
      if (d.custoRealizado == null) return { valor: null, motivo: "sem Atual" };
      const v = div(d.custoRealizado, d.metragem);
      return v == null ? { valor: null, motivo: "sem área construída no cadastro" } : { valor: v };
    }
    case "custo_orcado_m2": {
      if (d.custoOrcadoTotal == null) return { valor: null, motivo: "sem Orçamento" };
      const v = div(d.custoOrcadoTotal, d.metragem);
      return v == null ? { valor: null, motivo: "sem área construída no cadastro" } : { valor: v };
    }
    case "desvio_custo": {
      if (d.custoRealizado == null || d.custoOrcadoAteHoje == null) return { valor: null, motivo: d.custoOrcadoAteHoje == null ? "sem Orçamento" : "sem Atual" };
      const v = div(d.custoRealizado - d.custoOrcadoAteHoje, d.custoOrcadoAteHoje);
      return v == null ? { valor: null, motivo: "Orçamento sem custo até aqui" } : { valor: v * 100 };
    }
    case "margem_orcada": {
      if (d.custoOrcadoTotal == null) return { valor: null, motivo: "sem Orçamento" };
      const v = div(d.vgv - d.custoOrcadoTotal, d.vgv);
      return v == null ? { valor: null, motivo: "sem VGV" } : { valor: v * 100 };
    }
    default:
      return { valor: null, motivo: "indicador desconhecido" };
  }
}

/**
 * A soma das obras. Custo e área só somam das obras que os têm; uma obra sem
 * área construída fica fora do custo por m² da soma (para não dividir custo
 * de uma obra pela área de outra), e o mesmo vale para o Orçamento.
 */
export function somarObras(obras: readonly DadosDaObra[]): DadosDaObra {
  const soma = (f: (d: DadosDaObra) => number) => obras.reduce((a, d) => a + f(d), 0);
  const nulo = (f: (d: DadosDaObra) => number | null) => (obras.some((d) => f(d) != null) ? soma((d) => f(d) ?? 0) : null);
  const comArea = obras.filter((d) => d.metragem != null && d.metragem > 0);
  const somaS = (k: keyof ServicosDaObra) => Math.round(obras.reduce((a, d) => a + d.servicos[k], 0) * 100) / 100;
  return {
    obra: "Total",
    servicos: { contratado: somaS("contratado"), medido: somaS("medido"), faturado: somaS("faturado"), recebido: somaS("recebido"), aReceber: somaS("aReceber") },
    vgv: soma((d) => d.vgv),
    vgvVendido: soma((d) => d.vgvVendido),
    unidades: soma((d) => d.unidades),
    vendidas: soma((d) => d.vendidas),
    m2Unidades: soma((d) => d.m2Unidades),
    m2Vendidas: soma((d) => d.m2Vendidas),
    vgvComM2: soma((d) => d.vgvComM2),
    vgvVendidoComM2: soma((d) => d.vgvVendidoComM2),
    metragem: comArea.length ? comArea.reduce((a, d) => a + d.metragem!, 0) : null,
    custoRealizado: nulo((d) => d.custoRealizado),
    custoOrcadoAteHoje: nulo((d) => d.custoOrcadoAteHoje),
    custoOrcadoTotal: nulo((d) => d.custoOrcadoTotal),
  };
}

/** Para o custo por m² do Total: o custo só das obras com área construída. */
export function somarParaPorM2(obras: readonly DadosDaObra[]): DadosDaObra {
  const comArea = obras.filter((d) => d.metragem != null && d.metragem > 0);
  return somarObras(comArea.length ? comArea : obras);
}

/** Os ids pedidos na URL, válidos e na ordem do catálogo; vazio = o padrão. */
export function indicadoresEscolhidos(param: string | string[] | undefined, verCusto: boolean): string[] {
  const pedidos = (Array.isArray(param) ? param.join(",") : param ?? "").split(",").filter(Boolean);
  const validos = INDICADORES_DE_NEGOCIO.filter((i) => verCusto || !i.exigeCusto).map((i) => i.id);
  const escolhidos = validos.filter((id) => pedidos.includes(id));
  return escolhidos.length ? escolhidos : PADRAO_DE_INDICADORES.filter((id) => validos.includes(id));
}

/**
 * O que o painel recebe: uma coluna por obra e, com mais de uma, o Total. O
 * custo por m² do Total divide só o custo das obras com área construída.
 */
export function painelDeIndicadores(obras: readonly DadosDaObra[], verCusto: boolean) {
  const legado = temDadosAntigos(obras);
  const disponiveis = INDICADORES_DE_NEGOCIO.filter((i) => (verCusto || !i.exigeCusto) && (legado || !i.legado)).map((i) => i.id);
  const comTotal = obras.length > 1;
  const colunas = [...obras.map((o) => o.obra), ...(comTotal ? ["Total"] : [])];
  const total = somarObras(obras);
  const totalPorM2 = somarParaPorM2(obras);
  const valores: Record<string, ValorDeIndicador[]> = {};
  for (const id of disponiveis) {
    const daObra = obras.map((o) => valorDoIndicador(id, o));
    if (comTotal) daObra.push(valorDoIndicador(id, id === "custo_m2" || id === "custo_orcado_m2" ? totalPorM2 : total));
    valores[id] = daObra;
  }
  return { disponiveis, colunas, valores };
}
