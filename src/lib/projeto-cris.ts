/**
 * Prompt B2 (Fase 3 · revisão V5): "mudar o projeto 28" por comando — a Cris
 * preenche o cadastro do projeto aberto a partir do que a pessoa diz, dita ou
 * anexa. Módulo PURO. Só preenche: quem grava é o Salvar do cartão, que leva
 * "origem: assistente" ao log, como a leitura de documento do Prompt B.
 *
 * BB2-1 em aberto: os campos que o comando pode mudar são os do cadastro do
 * projeto, sem o cliente (o nome do cliente não vai ao modelo) e sem a situação
 * e a trava, que têm botão próprio.
 */
import type { CampoDoFormulario, FormularioDaTela } from "@/lib/cris";

export interface CampoDoCadastro {
  chave: string;
  rotulo: string;
  tipo: CampoDoFormulario["tipo"];
  dica?: string;
  /** Só na visão do projeto (localização e dados fiscais). */
  soDetalhado?: boolean;
}

export const CAMPOS_DO_CADASTRO: readonly CampoDoCadastro[] = [
  { chave: "name", rotulo: "Nome do projeto", tipo: "texto" },
  { chave: "startDate", rotulo: "Data de início", tipo: "data", dica: "MM/DD/YYYY" },
  { chave: "endDate", rotulo: "Data de fim", tipo: "data", dica: "MM/DD/YYYY" },
  // Growth Ambiental: as chaves internas ficam; os campos de terreno,
  // financiamento e área construída saíram do formulário (e daqui).
  { chave: "valorConstrucao", rotulo: "Receita prevista do projeto", tipo: "numero", dica: "em reais" },
  { chave: "custoConstrucao", rotulo: "Custo previsto do projeto", tipo: "numero", dica: "em reais" },
  { chave: "endereco", rotulo: "Endereço", tipo: "texto", soDetalhado: true },
  { chave: "cep", rotulo: "CEP", tipo: "texto", dica: "8 dígitos", soDetalhado: true },
  { chave: "municipioObra", rotulo: "Município do projeto", tipo: "texto", soDetalhado: true },
  { chave: "ufObra", rotulo: "UF do projeto", tipo: "texto", dica: "2 letras", soDetalhado: true },
  { chave: "codigoMunicipioObra", rotulo: "Código IBGE do município", tipo: "texto", dica: "7 dígitos", soDetalhado: true },
  { chave: "latitude", rotulo: "Latitude", tipo: "numero", soDetalhado: true },
  { chave: "longitude", rotulo: "Longitude", tipo: "numero", soDetalhado: true },
  { chave: "art", rotulo: "ART / RRT", tipo: "texto", soDetalhado: true },
];

export const rotuloDoCampoDoCadastro = (chave: string) => CAMPOS_DO_CADASTRO.find((c) => c.chave === chave)?.rotulo ?? chave;

/** O formulário do cartão aberto, para a Cris. */
export function formularioDoProjeto(projeto: { id: string; nome: string }, detalhado: boolean): FormularioDaTela {
  return {
    id: `projeto-${projeto.id}`,
    titulo: `Cadastro do projeto ${projeto.nome}`,
    campos: CAMPOS_DO_CADASTRO.filter((c) => detalhado || !c.soDetalhado).map((c) => ({ nome: c.chave, rotulo: c.rotulo, tipo: c.tipo, dica: c.dica })),
  };
}

/**
 * Os valores da proposta no formato do formulário do cartão: booleano vira
 * true/false; os demais seguem como texto. Campo fora do cadastro cai.
 */
export function valoresParaOCadastro(valores: Record<string, string>, detalhado: boolean): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const c of CAMPOS_DO_CADASTRO) {
    if (!detalhado && c.soDetalhado) continue;
    const v = valores[c.chave];
    if (v == null) continue;
    out[c.chave] = c.tipo === "booleano" ? /^(sim|s|true|1|yes)$/i.test(v.trim()) : v;
  }
  return out;
}
