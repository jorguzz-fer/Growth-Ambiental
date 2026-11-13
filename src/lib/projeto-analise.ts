/**
 * Assistente da tela de Projetos (Prompt B, 24–29). Módulo PURO.
 *
 * As análises rodam NO SERVIDOR sobre a lista de projetos do tenant (montada
 * do contexto, nunca de ids do cliente — seção 28) e o painel recebe o
 * resultado. Nada aqui grava, nada lê documento: "Extrair dados de
 * documentos" vive em `ai/projeto-extract.ts` e na action própria.
 *
 * "Revisar inconsistências" inclui o que a revisão apontou (seção 25):
 * duração diferente da janela das datas, funding que não alcança o valor
 * global, fim antes do início, município sem IBGE e projeto sem
 * `mes_inicial`/`mes_final` (pendência registrada na seção 48 — só apontada).
 */
import {
  avisoDeDuracao,
  avisoDeFunding,
  avisoDeMunicipio,
  recusaDasDatas,
  valorGlobal,
} from "@/lib/projeto-regras";
import type { CardOrcadoRealizado } from "@/lib/calc/orcado-realizado";

export interface ProjetoParaAnalise {
  id: string;
  name: string;
  kind: string;
  situacao: "Ativo" | "Finalizado" | null;
  durationMonths: number | null;
  startDate: string | null;
  endDate: string | null;
  mesInicial: string | null;
  mesFinal: string | null;
  valorConstrucao: string | number | null;
  valorTerreno: string | number | null;
  custoConstrucao: string | number | null;
  custoTerreno: string | number | null;
  financiamentoConstrucao: string | number | null;
  financiamentoTerreno: string | number | null;
  recursosProprios: string | number | null;
  terrenoForaCaixa: boolean | null;
  endereco: string | null;
  municipioObra: string | null;
  ufObra: string | null;
  codigoMunicipioObra: string | null;
  /** quantos documentos a obra tem anexados. */
  documentos: number;
}

export interface ItemPorProjeto {
  id: string;
  nome: string;
  itens: string[];
}

export interface AnaliseDeProjetos {
  cadastroIncompleto: ItemPorProjeto[];
  inconsistencias: ItemPorProjeto[];
  funding: ItemPorProjeto[];
  semDocumentos: { id: string; nome: string }[];
  semClassificacao: { id: string; nome: string }[];
  /** "Dica da IA" (seção 27): uma frase curta, contextual. */
  dica: string;
}

const vazio = (v: string | number | null | undefined) => v === null || v === undefined || String(v).trim() === "";

/** O que falta no cadastro de uma obra (cliente nulo = próprio, não falta). */
export function camposFaltando(p: ProjetoParaAnalise): string[] {
  const f: string[] = [];
  // Prompt E, 2.3: sem as datas, Orçamentos e Previsão não têm meses para distribuir.
  if (vazio(p.startDate) || vazio(p.endDate)) f.push("datas de início e fim (sem elas, Orçamentos e Previsão não têm meses para distribuir)");
  if (vazio(p.valorConstrucao) && vazio(p.valorTerreno)) f.push("valores (receitas)");
  if (vazio(p.custoConstrucao) && vazio(p.custoTerreno)) f.push("custos");
  if (vazio(p.endereco)) f.push("endereço");
  if (vazio(p.municipioObra) && vazio(p.codigoMunicipioObra)) f.push("município do projeto");
  return f;
}

/** As inconsistências de uma obra (seção 25). */
export function inconsistenciasDe(p: ProjetoParaAnalise): string[] {
  const i: string[] = [];
  const datas = recusaDasDatas(p.startDate, p.endDate);
  if (datas) i.push("data de fim anterior à de início");
  const dur = avisoDeDuracao(p.durationMonths, p.startDate, p.endDate);
  if (dur && !dur.includes("sem as duas datas")) i.push(dur.replace(" Quem decide é você, ajustando as datas.", ""));
  const fund = avisoDeFunding(p);
  if (fund && !fund.startsWith("Fontes de recursos não informadas")) i.push(fund);
  const mun = avisoDeMunicipio(p.municipioObra, p.ufObra, p.codigoMunicipioObra);
  if (mun) i.push(mun.split(":")[0].toLowerCase());
  if (vazio(p.mesInicial) || vazio(p.mesFinal)) i.push("período de planejamento (mês inicial/final) não preenchido — pendência registrada, nenhuma tela grava esses campos ainda");
  return i;
}

export function analisarProjetos(projetos: ProjetoParaAnalise[]): AnaliseDeProjetos {
  const obras = projetos.filter((p) => p.kind !== "office");
  const porProjeto = (fn: (p: ProjetoParaAnalise) => string[]): ItemPorProjeto[] =>
    obras.map((p) => ({ id: p.id, nome: p.name, itens: fn(p) })).filter((x) => x.itens.length > 0);
  const cadastroIncompleto = porProjeto(camposFaltando);
  const inconsistencias = porProjeto(inconsistenciasDe);
  const funding = porProjeto((p) => {
    const a = avisoDeFunding(p);
    return a ? [a] : [];
  });
  const semDocumentos = obras.filter((p) => p.documentos === 0).map((p) => ({ id: p.id, nome: p.name }));
  const semClassificacao = projetos.filter((p) => p.situacao == null).map((p) => ({ id: p.id, nome: p.name }));
  return { cadastroIncompleto, inconsistencias, funding, semDocumentos, semClassificacao, dica: dicaDaIa({ obras: obras.length, cadastroIncompleto, inconsistencias, semClassificacao, semDocumentos }) };
}

function dicaDaIa(a: { obras: number; cadastroIncompleto: ItemPorProjeto[]; inconsistencias: ItemPorProjeto[]; semClassificacao: { id: string }[]; semDocumentos: { id: string }[] }): string {
  if (a.obras === 0) return "Cadastre a primeira obra com nome, datas e cliente; o Orçamento e a Previsão nascem junto.";
  if (a.semClassificacao.length > 0) return `${a.semClassificacao.length} projeto(s) ainda sem Ativo/Finalizado: classifique no campo Status de cada card — só esse campo muda.`;
  if (a.inconsistencias.length > 0) return `${a.inconsistencias.length} obra(s) com inconsistência no cadastro (datas, funding ou município). Abra "Revisar inconsistências".`;
  if (a.cadastroIncompleto.length > 0) return `${a.cadastroIncompleto.length} obra(s) com cadastro incompleto. Abra a obra para preencher; os documentos anexados ajudam a extrair os dados.`;
  if (a.semDocumentos.length > 0) return `${a.semDocumentos.length} obra(s) sem documento anexado (contrato, proposta). O cadastro fica sem lastro.`;
  return "Cadastros completos e consistentes. Use o seletor para abrir uma obra e comparar orçado x realizado.";
}

/* ─── visão de um projeto (seção 29) ────────────────────────────────── */

export interface AnaliseDeProjeto {
  faltam: string[];
  inconsistencias: string[];
  funding: string | null;
  semDocumentos: boolean;
  semClassificacao: boolean;
  /** Leitura do card Orçado x Realizado (seção 25), em frases. */
  comparativo: string[];
}

const pct = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

/** Frases sobre o card: só leitura do que o card já mostra, com a semântica da cor. */
export function lerComparativo(card: CardOrcadoRealizado | null): string[] {
  if (!card) return [];
  if (card.semOrcamento && card.semLancamentos) return ["Sem orçamento lançado e sem lançamentos na versão Atual: não há o que comparar ainda."];
  if (card.semOrcamento) return ["Sem orçamento lançado: há realizado, mas não há base para % de execução. Lance o Orçamento do projeto."];
  if (card.semLancamentos) return ["Orçamento lançado, mas sem lançamentos na versão Atual: nada realizado por competência ainda."];
  const out: string[] = [];
  for (const l of card.linhas) {
    if (l.execucao == null) {
      out.push(`${l.rotulo}: sem base de comparação (orçado zero).`);
      continue;
    }
    if (l.chave === "custo") out.push(l.execucao > 100 ? `Custos e despesas em ${pct(l.execucao)} do orçado — acima do previsto, atenção.` : `Custos e despesas em ${pct(l.execucao)} do orçado — dentro do previsto.`);
    else if (l.chave === "receita") out.push(l.execucao >= 100 ? `Receita em ${pct(l.execucao)} do orçado — acima do previsto.` : `Receita em ${pct(l.execucao)} do orçado.`);
    else out.push(l.realizado != null && l.realizado < 0 ? `Resultado realizado negativo (${pct(l.execucao)} do orçado).` : `Resultado em ${pct(l.execucao)} do orçado.`);
  }
  return out;
}

export function analisarProjeto(p: ProjetoParaAnalise, card: CardOrcadoRealizado | null): AnaliseDeProjeto {
  return {
    faltam: camposFaltando(p),
    inconsistencias: inconsistenciasDe(p),
    funding: avisoDeFunding(p),
    semDocumentos: p.documentos === 0,
    semClassificacao: p.situacao == null,
    comparativo: lerComparativo(card),
  };
}

export { valorGlobal };
