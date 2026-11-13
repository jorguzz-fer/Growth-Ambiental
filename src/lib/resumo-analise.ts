/**
 * Assistente do Resumo Executivo (Prompt AE, Parte 5; Prompt E, Etapa 1).
 * Módulo PURO, SOMENTE LEITURA: organiza os números que a tela já mostra.
 * Não calcula por conta própria (regra 4.2 do Prompt AD), não dá número a
 * bloco pendente, não afirma causa e não grava. Nada vai a modelo de IA.
 */
import type { IndicadorDoResumo } from "@/lib/resumo-tela";
import { TEXTO_DA_BASE } from "@/lib/resumo-tela";
import { BLOCOS_PENDENTES, type BlocoExposicao, type BlocoVendas, type LinhaDeAtencao } from "@/lib/resumo-blocos";
import type { ResumoDosContratos } from "@/lib/valor-contratado";

export interface AnaliseDoResumo {
  abertura: string;
  explicacoes: { bloco: string; texto: string }[];
  /** Números em tela para "o que mudou" (por mês). */
  instantaneo: Record<string, number>;
  recorte: string;
  definicaoNova: boolean;
}

function aberturaDosServicos(obra: string, s: ResumoDosContratos | null, fmt: (n: number) => string): string {
  if (!s || s.contratos === 0) return `${obra}: nenhum contrato de serviço ligado ao projeto. Cadastre em Contratos para ver contratado, medido, faturado e a receber.`;
  const pct = s.contratado > 0 ? ` (${Math.round((s.medido / s.contratado) * 1000) / 10}%)` : "";
  return `${obra}: ${s.contratos} contrato(s), ${fmt(s.contratado)} contratado(s); medido ${fmt(s.medido)}${pct}; faturado a receber ${fmt(s.aReceber)}.`;
}

export function analisarResumo(o: {
  obra: string;
  versao: string;
  definicaoNova: boolean;
  indicadores: readonly IndicadorDoResumo[];
  unidades: { total: number; vendidas: number };
  /** Growth Ambiental: os números dos contratos de serviço do projeto (o bloco da tela). */
  servicos?: ResumoDosContratos | null;
  vendas: BlocoVendas | null;
  exposicao: BlocoExposicao | null;
  atencao: readonly LinhaDeAtencao[] | null;
  recorte: string;
  fmt: (n: number) => string;
}): AnaliseDoResumo {
  const { fmt } = o;
  const vgv = o.indicadores[0];
  // 5.1 — a abertura traz o achado: a exceção do bloco Atenção, ou o critério
  // que mais confunde (VGV de todas × o resto só das vendidas).
  const abertura =
    o.atencao && o.atencao.length
      ? `${o.obra}: ${o.atencao[0].texto}${o.atencao.length > 1 ? ` E mais ${o.atencao.length - 1} exceção(ões) no bloco Atenção.` : ""}`
      : o.unidades.total === 0
        ? aberturaDosServicos(o.obra, o.servicos ?? null, fmt)
        : `${o.obra} (${o.versao}): ${o.unidades.vendidas} de ${o.unidades.total} unidade(s) vendida(s). O VGV de ${vgv.vazio ? "—" : fmt(vgv.value)} conta todas; Sinais a Subsídio contam só as vendidas.`;
  // Growth Ambiental: sem unidade (dado antigo), as explicações são as dos contratos.
  const BLOCO_SERVICOS = { bloco: "Contratos de serviço do projeto", texto: "Valor atualizado dos contratos (original + aditivos eficazes), medições aprovadas, faturas e recebimentos. Contrato de vários projetos entra pela parte alocada a este (ou dividido igualmente). Não varia por versão nem por período." };
  const explicacoes = o.unidades.total === 0
    ? [
        BLOCO_SERVICOS,
        ...(o.definicaoNova
          ? [
              { bloco: "Exposição", texto: "Saldos em aberto, não o valor cheio: contas a receber e a pagar do projeto (versão Atual), com o vencido à parte." },
              { bloco: "Atenção", texto: "Exceções categóricas (cadastro e lançamento incompletos) e por valor: custo realizado acima do orçado e recebível vencido, com os limites da empresa (tela Empresa). Aponta o quê, onde e quanto — nunca a causa." },
              { bloco: "Resultado", texto: BLOCOS_PENDENTES.resultado },
              { bloco: "Caixa", texto: BLOCOS_PENDENTES.caixa },
            ]
          : []),
      ]
    : o.definicaoNova
    ? [
        { bloco: "Vendas", texto: `Cadastro das unidades da versão. VGV total: ${TEXTO_DA_BASE.todas_unidades}; VGV vendido: ${TEXTO_DA_BASE.vendidas}. VSO = vendidas no período ÷ oferta no início; sem período ou com vendida sem data, não é calculado.` },
        { bloco: "Exposição", texto: "Saldos em aberto, não o valor cheio: contas a receber e a pagar do projeto (versão Atual), com o vencido à parte; financiamento aprovado × liberado e permuta em estoque, da versão." },
        { bloco: "Atenção", texto: "Exceções categóricas (cadastro e lançamento incompletos) e por valor: custo realizado acima do orçado e recebível vencido, com os limites da empresa (tela Empresa). Aponta o quê, onde e quanto — nunca a causa." },
        { bloco: "Resultado", texto: BLOCOS_PENDENTES.resultado },
        { bloco: "Caixa", texto: BLOCOS_PENDENTES.caixa },
      ]
    : [
        { bloco: "Indicadores gerais", texto: `Valores acumulados da versão, nominais (sem INCC). O VGV conta ${TEXTO_DA_BASE.todas_unidades}; Sinais a Subsídio contam ${TEXTO_DA_BASE.vendidas}; permutas e liberações contam todos os registros da versão.` },
        { bloco: "Recebimentos do período", texto: "Receita das unidades + reembolso + revenda de permuta, pelo mês, só quando há período informado." },
        { bloco: "Unidades", texto: "Disponíveis, reservadas e vendidas da versão; o Total é a soma dessas três (as Permutadas entram com a definição nova)." },
        { bloco: "Financiamento", texto: "Soma do financiamento das unidades vendidas. Não entra nos totais desta tela; é projetado em Projeção, DRE e Fluxo." },
      ];
  const instantaneo: Record<string, number> = {};
  for (const i of o.indicadores) if (!i.vazio) instantaneo[i.label] = i.value;
  if (o.exposicao?.aPagar) instantaneo["A pagar em aberto"] = o.exposicao.aPagar.porVencer + o.exposicao.aPagar.vencido;
  if (o.exposicao?.aReceber) instantaneo["A receber em aberto"] = o.exposicao.aReceber.porVencer + o.exposicao.aReceber.vencido;
  return { abertura, explicacoes, instantaneo, recorte: o.recorte, definicaoNova: o.definicaoNova };
}

/** "O que mudou desde o mês passado": a fotografia mais recente de um mês ANTERIOR. */
export function fotografiaDoMesPassado(
  fotos: Record<string, Record<string, number>>,
  mesAtual: string,
): { mes: string; valores: Record<string, number> } | null {
  const anteriores = Object.keys(fotos).filter((m) => m < mesAtual).sort();
  const mes = anteriores[anteriores.length - 1];
  return mes ? { mes, valores: fotos[mes] } : null;
}
