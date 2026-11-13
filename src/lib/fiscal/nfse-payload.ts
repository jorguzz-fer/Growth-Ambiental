/**
 * Montagem do payload da NFS-e a partir dos dados do app.
 *
 * Função PURA e testável: recebe emitente, obra, tomador e serviço; devolve o
 * JSON que o provedor espera, ou a lista do que falta. Deixar isso fora do
 * cliente HTTP é o que permite testar o mapeamento sem rede — e é onde moram as
 * duas decisões que mais erram nota de construtora:
 *
 *  1. **Município de incidência.** Na construção civil o ISS é devido no
 *     município da OBRA (LC 116/2003, art. 3º, III). `servico.codigo_municipio`
 *     sai do projeto, não da sede — e a natureza da operação é derivada dessa
 *     comparação, não escolhida a dedo.
 *  2. **Bruto × líquido.** O que vai na nota é o bruto; o que entra no caixa é o
 *     líquido. O cálculo vem de `calc/nfse.ts` e os dois números saem daqui
 *     juntos, para o Contas a Receber não usar o número errado.
 *
 * Referência dos campos: API Focus NFe v2, `POST /v2/nfse` (doc "Emitir NFSe").
 */

import {
  cnpjValido,
  codigoMunicipioValido,
  ehRegimeEspecial,
  emitentePronto,
  normalizarCnpj,
  optantePeloSimples,
  type EmitenteFiscal,
} from "@/lib/calc/emitente-fiscal";
import {
  calcularNfse,
  naturezaPorMunicipio,
  validarNfse,
  type EntradaNfse,
  type ResultadoNfse,
} from "@/lib/calc/nfse";

/** Dados fiscais da obra que a nota de construção civil carrega. */
export interface ObraFiscal {
  /** código IBGE do município onde a obra é executada. */
  codigoMunicipio?: string | null;
  /** matrícula CNO/CEI — campo `codigo_obra`, máx. 15 caracteres. */
  codigoObra?: string | null;
  /** ART/RRT do responsável técnico. Ignorado por alguns municípios. */
  art?: string | null;
}

export interface EnderecoTomador {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  codigoMunicipio?: string | null;
  uf?: string | null;
  cep?: string | null;
}

export interface TomadorNfse {
  cnpj?: string | null;
  cpf?: string | null;
  razaoSocial?: string | null;
  inscricaoMunicipal?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: EnderecoTomador | null;
}

export interface ServicoNfse {
  /** o que aparece no corpo da nota. */
  discriminacao: string;
  valores: EntradaNfse;
  /** sobrepõem o cadastro do emitente quando o contrato exigir outro item. */
  itemListaServico?: string | null;
  codigoTributarioMunicipio?: string | null;
  cnae?: string | null;
}

export interface DadosEmissaoNfse {
  emitente: EmitenteFiscal;
  obra?: ObraFiscal | null;
  tomador: TomadorNfse;
  servico: ServicoNfse;
  /** ISO 8601 com fuso, ex.: "2026-08-26T10:30:00-03:00". */
  dataEmissao: string;
}

/** Payload conforme `POST /v2/nfse`. Campos ausentes são omitidos, não nulos. */
export interface PayloadNfse {
  data_emissao: string;
  natureza_operacao: string;
  optante_simples_nacional: boolean;
  regime_especial_tributacao?: string;
  prestador: {
    cnpj: string;
    inscricao_municipal: string;
    codigo_municipio?: string;
  };
  tomador: Record<string, unknown>;
  servico: Record<string, unknown>;
  codigo_obra?: string;
  art?: string;
}

export interface MontagemNfse {
  payload?: PayloadNfse;
  /** o que impede a emissão. Vazio = pode enviar. */
  erros: string[];
  /** os valores calculados, para gravar junto da nota. */
  calculo?: ResultadoNfse;
}

const soDigitos = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");
const texto = (v: string | null | undefined) => (v ?? "").trim();

/** Omite chaves vazias: alguns municípios rejeitam campo presente e em branco. */
function limpar(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      const dentro = limpar(v as Record<string, unknown>);
      if (Object.keys(dentro).length > 0) out[k] = dentro;
      continue;
    }
    out[k] = v;
  }
  return out;
}

/**
 * Monta o payload — ou explica o que falta.
 *
 * Nunca lança: devolver a lista de pendências deixa a tela mostrar todas de uma
 * vez, em vez de o usuário descobrir uma por tentativa.
 */
export function montarPayloadNfse(d: DadosEmissaoNfse): MontagemNfse {
  const erros: string[] = [];
  const { emitente, tomador, servico, obra } = d;

  if (!emitentePronto(emitente)) {
    erros.push(
      "O cadastro fiscal da empresa está incompleto — complete em Config › Empresa.",
    );
  }
  if (!cnpjValido(emitente.cnpj)) erros.push("CNPJ do emitente inválido.");

  const cnpjTomador = soDigitos(tomador.cnpj);
  const cpfTomador = soDigitos(tomador.cpf);
  if (!cnpjTomador && !cpfTomador) {
    erros.push("Informe o CPF ou o CNPJ do tomador.");
  }
  if (cnpjTomador && !cnpjValido(tomador.cnpj)) {
    erros.push("CNPJ do tomador inválido.");
  }

  if (!texto(servico.discriminacao)) {
    erros.push("Informe a discriminação do serviço.");
  }

  const erroValores = validarNfse(servico.valores);
  if (erroValores) erros.push(erroValores);

  const itemLista = texto(servico.itemListaServico) || texto(emitente.itemListaServico);
  if (!itemLista) erros.push("Informe o item da lista de serviço (LC 116/2003).");

  // Município de PRESTAÇÃO: o da obra manda; sem obra informada, o da sede.
  const municipioPrestacao =
    soDigitos(obra?.codigoMunicipio) || soDigitos(emitente.codigoMunicipio);
  if (!codigoMunicipioValido(municipioPrestacao)) {
    erros.push(
      "Informe o código IBGE do município do projeto (ou do prestador, se o projeto não tiver município cadastrado).",
    );
  }

  if (erros.length > 0) return { erros };

  const calculo = calcularNfse(servico.valores);
  const v = servico.valores;

  const payload: PayloadNfse = {
    data_emissao: d.dataEmissao,
    natureza_operacao: naturezaPorMunicipio(
      emitente.codigoMunicipio,
      municipioPrestacao,
    ),
    optante_simples_nacional: optantePeloSimples(emitente.regimeTributario),
    prestador: {
      cnpj: normalizarCnpj(emitente.cnpj)!,
      inscricao_municipal: texto(emitente.inscricaoMunicipal),
      codigo_municipio: soDigitos(emitente.codigoMunicipio) || undefined,
    },
    tomador: limpar({
      cnpj: cnpjTomador || undefined,
      cpf: cpfTomador || undefined,
      razao_social: texto(tomador.razaoSocial) || undefined,
      inscricao_municipal: soDigitos(tomador.inscricaoMunicipal) || undefined,
      email: texto(tomador.email) || undefined,
      // A API aceita no máximo 11 dígitos no telefone.
      telefone: soDigitos(tomador.telefone).slice(0, 11) || undefined,
      endereco: tomador.endereco
        ? {
            logradouro: texto(tomador.endereco.logradouro) || undefined,
            numero: texto(tomador.endereco.numero) || undefined,
            complemento: texto(tomador.endereco.complemento) || undefined,
            bairro: texto(tomador.endereco.bairro) || undefined,
            codigo_municipio: soDigitos(tomador.endereco.codigoMunicipio) || undefined,
            uf: texto(tomador.endereco.uf).toUpperCase() || undefined,
            cep: soDigitos(tomador.endereco.cep) || undefined,
          }
        : undefined,
    }),
    servico: limpar({
      valor_servicos: v.valorServicos,
      valor_deducoes: v.valorDeducoes || undefined,
      desconto_incondicionado: v.descontoIncondicionado || undefined,
      desconto_condicionado: v.descontoCondicionado || undefined,
      base_calculo: calculo.baseCalculo,
      aliquota: v.aliquotaIss,
      valor_iss: calculo.valorIss,
      iss_retido: v.issRetido,
      // A API só quer este campo quando há retenção de fato.
      valor_iss_retido: calculo.valorIssRetido || undefined,
      valor_pis: calculo.retencoes.pis || undefined,
      valor_cofins: calculo.retencoes.cofins || undefined,
      valor_csll: calculo.retencoes.csll || undefined,
      valor_ir: calculo.retencoes.ir || undefined,
      valor_inss: calculo.retencoes.inss || undefined,
      outras_retencoes: calculo.outrasRetencoes || undefined,
      item_lista_servico: itemLista,
      codigo_tributario_municipio:
        texto(servico.codigoTributarioMunicipio) ||
        texto(emitente.codigoTributarioMunicipio) ||
        undefined,
      codigo_cnae: soDigitos(servico.cnae) || soDigitos(emitente.cnae) || undefined,
      discriminacao: texto(servico.discriminacao),
      codigo_municipio: municipioPrestacao,
    }) as PayloadNfse["servico"],
  };

  if (ehRegimeEspecial(emitente.regimeEspecial)) {
    payload.regime_especial_tributacao = emitente.regimeEspecial;
  }
  // Campos de construção civil: 15 caracteres é o limite da API.
  const codigoObra = texto(obra?.codigoObra);
  if (codigoObra) payload.codigo_obra = codigoObra.slice(0, 15);
  const art = texto(obra?.art);
  if (art) payload.art = art.slice(0, 15);

  return { payload, erros: [], calculo };
}
