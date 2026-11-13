/**
 * Contratos × Cris — o formulário que a Cris pode PROPOR preencher a partir
 * de um contrato ou aditivo anexado (PDF) ou ditado. Módulo PURO.
 *
 * A Cris só devolve uma proposta de valores; a tela mostra tudo para
 * conferência e quem grava é o botão "Salvar". O conteúdo do documento é
 * dado, nunca instrução: os valores passam pelas mesmas validações do
 * servidor que um preenchimento à mão.
 */
import type { FormularioDaTela } from "@/lib/cris";
import { INDICES_PARA_CONTRATO_DE_SERVICO } from "@/lib/incc-regras";
import { CRITERIOS_MEDICAO, ROTULO_CRITERIO, lerNumero, type CriterioMedicao } from "@/lib/contrato-regras";

export const MAX_ITENS_PROPOSTOS = 10;

export function formularioDoContrato(opcoes: { clientes: string[]; modalidades: string[] }): FormularioDaTela {
  const itens = Array.from({ length: MAX_ITENS_PROPOSTOS }, (_, i) => {
    const n = i + 1;
    return [
      { nome: `item${n}_codigo`, rotulo: `Item ${n}: código`, tipo: "texto" as const, dica: 'ex.: "01"' },
      { nome: `item${n}_descricao`, rotulo: `Item ${n}: descrição`, tipo: "texto" as const },
      { nome: `item${n}_unidade`, rotulo: `Item ${n}: unidade`, tipo: "texto" as const, dica: 'ex.: "mês", "campanha", "vb"' },
      { nome: `item${n}_quantidade`, rotulo: `Item ${n}: quantidade`, tipo: "numero" as const },
      { nome: `item${n}_valorUnitario`, rotulo: `Item ${n}: valor unitário`, tipo: "numero" as const, dica: "em reais" },
      { nome: `item${n}_criterio`, rotulo: `Item ${n}: critério de medição`, tipo: "opcao" as const, opcoes: CRITERIOS_MEDICAO.map((c) => ROTULO_CRITERIO[c]) },
    ];
  }).flat();
  return {
    id: "contrato",
    titulo: "Cadastro de contrato (dados extraídos do documento — conferir antes de salvar)",
    campos: [
      { nome: "titulo", rotulo: "Título do contrato", tipo: "texto", obrigatorio: true },
      { nome: "numeroCliente", rotulo: "Número do contrato no cliente", tipo: "texto" },
      { nome: "cliente", rotulo: "Cliente contratante (da lista)", tipo: "opcao", opcoes: opcoes.clientes },
      { nome: "clienteNoDocumento", rotulo: "Contratante como escrito no documento", tipo: "texto", dica: "use quando o cliente não está na lista" },
      { nome: "objeto", rotulo: "Objeto contratual", tipo: "texto" },
      { nome: "escopo", rotulo: "Descrição do escopo", tipo: "texto" },
      { nome: "modalidade", rotulo: "Modalidade de serviço", tipo: "opcao", opcoes: opcoes.modalidades },
      { nome: "dataAssinatura", rotulo: "Data de assinatura", tipo: "data", dica: "MM/DD/YYYY" },
      { nome: "dataInicio", rotulo: "Data de início", tipo: "data", dica: "MM/DD/YYYY" },
      { nome: "dataTerminoPrevista", rotulo: "Término previsto", tipo: "data", dica: "MM/DD/YYYY" },
      { nome: "dataBaseReajuste", rotulo: "Data-base de reajuste", tipo: "data", dica: "MM/DD/YYYY" },
      { nome: "valorOriginal", rotulo: "Valor global do contrato", tipo: "numero", dica: "em reais", obrigatorio: true },
      { nome: "formaFaturamento", rotulo: "Forma de faturamento", tipo: "texto" },
      { nome: "condicaoPagamento", rotulo: "Condição de pagamento", tipo: "texto" },
      { nome: "periodicidadeMedicao", rotulo: "Periodicidade de medição", tipo: "texto", dica: 'ex.: "mensal"' },
      { nome: "prazoPagamentoDias", rotulo: "Prazo de pagamento (dias)", tipo: "numero" },
      { nome: "indiceReajuste", rotulo: "Índice de reajuste", tipo: "opcao", opcoes: [...INDICES_PARA_CONTRATO_DE_SERVICO] },
      { nome: "retencaoPct", rotulo: "Retenção contratual (%)", tipo: "numero" },
      { nome: "regrasReembolso", rotulo: "Regras de reembolso de despesas", tipo: "texto" },
      { nome: "regrasMedicao", rotulo: "Regras de medição (resumo)", tipo: "texto" },
      ...itens,
    ],
  };
}

export interface ItemProposto {
  codigo: string;
  descricao: string;
  unidade: string | null;
  quantidade: number;
  valorUnitario: number;
  criterio: CriterioMedicao;
}

const criterioDoRotulo = (r: string | undefined): CriterioMedicao => {
  const achado = CRITERIOS_MEDICAO.find((c) => ROTULO_CRITERIO[c].toLowerCase() === (r ?? "").trim().toLowerCase() || c === (r ?? "").trim());
  return achado ?? "percentual";
};

/** Os itens completos (código, descrição e valor) da proposta; os incompletos caem. */
export function itensDaProposta(v: Record<string, string>): ItemProposto[] {
  const out: ItemProposto[] = [];
  for (let n = 1; n <= MAX_ITENS_PROPOSTOS; n++) {
    const descricao = (v[`item${n}_descricao`] ?? "").trim();
    const unit = lerNumero(v[`item${n}_valorUnitario`]);
    if (!descricao || unit == null || unit < 0) continue;
    const q = lerNumero(v[`item${n}_quantidade`]);
    out.push({
      codigo: (v[`item${n}_codigo`] ?? "").trim() || String(n).padStart(2, "0"),
      descricao,
      unidade: (v[`item${n}_unidade`] ?? "").trim() || null,
      quantidade: q != null && q > 0 ? q : 1,
      valorUnitario: unit,
      criterio: criterioDoRotulo(v[`item${n}_criterio`]),
    });
  }
  return out;
}

/**
 * Etapa 3 do ERP integrado — medição assistida. A Cris lê o boletim de
 * medição (PDF, DOCX, planilha ou texto) e PROPÕE os campos; a tela mostra e
 * a pessoa salva (rascunho ou envio). Aprovar continua exclusivo de quem tem
 * `contratosaprovar`, na própria tela: a Cris nunca aprova.
 */
export interface OpcoesDaMedicao {
  itens: { id: string; rotulo: string }[];
  projetos: { id: string; nome: string }[];
  aditivos: { id: string; codigo: string }[];
}

export function formularioDaMedicao(o: OpcoesDaMedicao): FormularioDaTela {
  return {
    id: "medicao",
    titulo: "Nova medição de serviço (dados extraídos do boletim — conferir antes de salvar)",
    campos: [
      { nome: "item", rotulo: "Item contratual (da lista)", tipo: "opcao", opcoes: o.itens.map((i) => i.rotulo) },
      { nome: "competencia", rotulo: "Competência", tipo: "texto", dica: "MM/AAAA", obrigatorio: true },
      { nome: "quantidade", rotulo: "Quantidade executada", tipo: "numero", dica: "só para item medido por quantidade" },
      { nome: "percentual", rotulo: "Percentual de avanço no período", tipo: "numero", dica: "só para item medido por percentual" },
      { nome: "valor", rotulo: "Valor medido", tipo: "numero", dica: "em reais; para entrega, marco ou valor fixo" },
      { nome: "projeto", rotulo: "Projeto (da lista)", tipo: "opcao", opcoes: o.projetos.map((p) => p.nome) },
      { nome: "aditivo", rotulo: "Aditivo que autorizou (da lista)", tipo: "opcao", opcoes: o.aditivos.map((a) => a.codigo) },
      { nome: "periodoInicio", rotulo: "Início do período executado", tipo: "data", dica: "MM/DD/YYYY" },
      { nome: "periodoFim", rotulo: "Fim do período executado", tipo: "data", dica: "MM/DD/YYYY" },
      { nome: "responsavel", rotulo: "Responsável pela medição", tipo: "texto" },
      { nome: "obs", rotulo: "Observação (o que foi executado)", tipo: "texto" },
    ],
  };
}

/** Converte a proposta da Cris nos campos da tela (nomes → ids). O que não casa com a lista fica vazio e vai para conferência. */
export function medicaoDaProposta(v: Record<string, string>, o: OpcoesDaMedicao): { campos: Record<string, string>; conferir: string[] } {
  const conferir: string[] = [];
  const achar = <T extends { id: string }>(lista: T[], rot: (x: T) => string, valor: string | undefined, campo: string) => {
    const alvo = (valor ?? "").trim().toLowerCase();
    if (!alvo) return "";
    const x = lista.find((i) => rot(i).trim().toLowerCase() === alvo);
    if (!x) conferir.push(campo);
    return x ? x.id : "";
  };
  const numero = (k: string) => {
    const n = lerNumero(v[k]);
    if (v[k] && (n == null || n < 0)) conferir.push(k);
    return n == null || n < 0 ? "" : String(n);
  };
  const comp = (v.competencia ?? "").trim();
  const competencia = /^(0[1-9]|1[0-2])\/\d{4}$/.test(comp) ? comp : "";
  if (comp && !competencia) conferir.push("competencia");
  const data = (k: string) => {
    const d = (v[k] ?? "").trim();
    if (!d) return "";
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d;
    conferir.push(k);
    return "";
  };
  return {
    campos: {
      itemId: achar(o.itens, (i) => i.rotulo, v.item, "item"),
      projectId: achar(o.projetos, (p) => p.nome, v.projeto, "projeto"),
      aditivoId: achar(o.aditivos, (a) => a.codigo, v.aditivo, "aditivo"),
      competencia,
      quantidade: numero("quantidade"),
      percentual: numero("percentual"),
      valor: numero("valor"),
      periodoInicio: data("periodoInicio"),
      periodoFim: data("periodoFim"),
      responsavel: (v.responsavel ?? "").trim().slice(0, 200),
      obs: (v.obs ?? "").trim().slice(0, 500),
    },
    conferir,
  };
}
