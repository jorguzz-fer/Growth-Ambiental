/**
 * Documento do projeto → proposta de cadastro (Prompt B, 25–26). PURO.
 *
 * O que a IA devolve (`DadosProjetoLidos`) e a regra que transforma isso numa
 * PROPOSTA campo a campo, comparada com o que já está no cadastro. Nada aqui
 * grava: a proposta entra no formulário do projeto e o Salvar do usuário é que
 * grava, pela mesma `updateProject`, com `origem: "assistente"` no log.
 */
import { isoParaDataInterna } from "@/lib/ai/campos";

export interface DadosProjetoLidos {
  nome: string;
  endereco: string;
  cep: string;
  municipio: string;
  uf: string;
  /** ISO (YYYY-MM-DD) ou "". */
  dataInicio: string;
  dataFim: string;
  valorConstrucao: number | null;
  valorTerreno: number | null;
  custoConstrucao: number | null;
  custoTerreno: number | null;
  proprietarioTerreno: string;
  formaPagamentoTerreno: string;
  /** Nomes de campos lidos com baixa confiança. */
  baixaConfianca: string[];
  observacoes: string[];
}

export type CampoProjeto =
  | "name"
  | "endereco"
  | "cep"
  | "municipioObra"
  | "ufObra"
  | "startDate"
  | "endDate"
  | "valorConstrucao"
  | "valorTerreno"
  | "custoConstrucao"
  | "custoTerreno"
  | "proprietarioTerreno"
  | "formaPagamentoTerreno";

export const ROTULO_CAMPO_PROJETO: Record<CampoProjeto, string> = {
  name: "Nome do projeto",
  endereco: "Endereço",
  cep: "CEP",
  municipioObra: "Município",
  ufObra: "UF",
  startDate: "Data de início",
  endDate: "Data de fim",
  valorConstrucao: "Valor da construção",
  valorTerreno: "Valor do terreno",
  custoConstrucao: "Custo da construção",
  custoTerreno: "Custo do terreno",
  proprietarioTerreno: "Proprietário do terreno",
  formaPagamentoTerreno: "Forma de pagamento do terreno",
};

export interface CampoProposto {
  campo: CampoProjeto;
  rotulo: string;
  /** valor hoje no cadastro (formato do formulário; "" = vazio). */
  atual: string;
  /** valor lido (formato do formulário). */
  proposto: string;
  /** a IA leu com baixa confiança — conferir no documento. */
  conferir: boolean;
}

export interface PropostaDeProjeto {
  campos: CampoProposto[];
  observacoes: string[];
}

/** Valores atuais do cadastro, no formato do formulário (texto). */
export type ValoresAtuais = Partial<Record<CampoProjeto, string | number | null | undefined>>;

const txt = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v).trim());
const num = (v: number | null) => (v == null || !Number.isFinite(v) || v <= 0 ? "" : String(Math.round(v * 100) / 100));

/**
 * Só entra na proposta o que a IA leu E difere do cadastro. Campo lido vazio
 * não propõe apagar nada; campo igual ao atual não aparece.
 */
export function montarPropostaDeProjeto(lido: DadosProjetoLidos, atual: ValoresAtuais): PropostaDeProjeto {
  const lidos: Record<CampoProjeto, string> = {
    name: txt(lido.nome),
    endereco: txt(lido.endereco),
    cep: txt(lido.cep).replace(/\D/g, "").length === 8 ? txt(lido.cep).replace(/\D/g, "").replace(/^(\d{5})(\d{3})$/, "$1-$2") : "",
    municipioObra: txt(lido.municipio),
    ufObra: txt(lido.uf).toUpperCase().slice(0, 2),
    startDate: lido.dataInicio ? isoParaDataInterna(lido.dataInicio) : "",
    endDate: lido.dataFim ? isoParaDataInterna(lido.dataFim) : "",
    valorConstrucao: num(lido.valorConstrucao),
    valorTerreno: num(lido.valorTerreno),
    custoConstrucao: num(lido.custoConstrucao),
    custoTerreno: num(lido.custoTerreno),
    proprietarioTerreno: txt(lido.proprietarioTerreno),
    formaPagamentoTerreno: txt(lido.formaPagamentoTerreno),
  };
  const baixa = new Set((lido.baixaConfianca ?? []).map((s) => s.trim()));
  const nomeLido: Record<CampoProjeto, string> = { name: "nome", endereco: "endereco", cep: "cep", municipioObra: "municipio", ufObra: "uf", startDate: "dataInicio", endDate: "dataFim", valorConstrucao: "valorConstrucao", valorTerreno: "valorTerreno", custoConstrucao: "custoConstrucao", custoTerreno: "custoTerreno", proprietarioTerreno: "proprietarioTerreno", formaPagamentoTerreno: "formaPagamentoTerreno" };
  const campos: CampoProposto[] = [];
  for (const campo of Object.keys(ROTULO_CAMPO_PROJETO) as CampoProjeto[]) {
    const proposto = lidos[campo];
    if (!proposto) continue;
    const atualTxt = campo.startsWith("valor") || campo.startsWith("custo") ? num(Number(txt(atual[campo])) || null) : txt(atual[campo]);
    if (proposto === atualTxt) continue;
    campos.push({ campo, rotulo: ROTULO_CAMPO_PROJETO[campo], atual: atualTxt, proposto, conferir: baixa.has(nomeLido[campo]) || baixa.has(campo) });
  }
  return { campos, observacoes: (lido.observacoes ?? []).filter(Boolean) };
}

/** sessionStorage: a proposta aceita vai daqui para o formulário do projeto. */
export const CHAVE_PROPOSTA_PROJETO = "gt:proposta-projeto";
/** Evento disparado no `window` quando uma proposta é guardada. */
export const EVENTO_PROPOSTA_PROJETO = "gt:proposta-projeto";

export interface PropostaDeProjetoGuardada {
  projectId: string;
  campos: Partial<Record<CampoProjeto, string>>;
}
