# Emissor de NFS-e · coleta do BAG-5 (Prompt AG)

Coleta pedida pelo BAG-5, **sem alteração de código**. Primeiro os arquivos na
íntegra e depois as respostas às perguntas (a) a (g), tiradas deles.

Observação: há **dois** arquivos de teste correspondentes, não três —
`focus.ts` e `tipos.ts` não têm arquivo de teste próprio.

---

## `src/lib/calc/nfse.ts`

```ts
/**
 * Cálculo dos valores da NFS-e.
 *
 * Produz exatamente os números que vão no bloco `servico` da nota (base de
 * cálculo, ISS, retenções) e o **valor líquido a receber** — que é o que
 * interessa ao Contas a Receber e à conciliação de caixa. Nota de R$ 100.000
 * com ISS retido e INSS não deposita R$ 100.000 na conta; se o sistema tratar
 * bruto e líquido como a mesma coisa, toda conciliação vai acusar diferença.
 *
 * ## O que este módulo NÃO decide
 *
 * **Quais tributos incidem.** Retenção federal em serviço de construção civil
 * depende do tipo de contrato (empreitada global × cessão de mão de obra), do
 * regime do prestador e da natureza do tomador — regra que muda por contrato e
 * que a contabilidade do cliente define, não o software. Aqui cada retenção é
 * informada explicitamente (alíquota e, quando for o caso, base própria); o
 * módulo só faz a conta. Um padrão embutido produziria nota errada com
 * aparência de nota certa, que é o pior resultado possível.
 *
 * A convenção de base segue a prática fiscal: o **ISS** incide sobre a base de
 * cálculo (serviços menos deduções e desconto incondicionado) e as **retenções
 * federais** sobre o valor bruto dos serviços, salvo base informada caso a caso
 * — é comum o INSS ter base própria (só a parcela de mão de obra).
 */

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Uma retenção federal: alíquota em % e, opcionalmente, base própria. */
export interface RetencaoFederal {
  aliquota: number;
  /** Base própria. Ausente = valor bruto dos serviços. */
  base?: number;
}

export interface RetencoesFederais {
  pis?: RetencaoFederal;
  cofins?: RetencaoFederal;
  csll?: RetencaoFederal;
  /** IRRF. */
  ir?: RetencaoFederal;
  /** INSS — costuma ter base própria (parcela de mão de obra da medição). */
  inss?: RetencaoFederal;
}

export interface EntradaNfse {
  valorServicos: number;
  /** Deduções admitidas pelo município (materiais, subempreitada). */
  valorDeducoes?: number;
  descontoIncondicionado?: number;
  descontoCondicionado?: number;
  /** Alíquota do ISS em % (0 a 5). */
  aliquotaIss: number;
  /** O tomador retém o ISS? */
  issRetido: boolean;
  retencoes?: RetencoesFederais;
  /** Retenções municipais/contratuais que não têm campo próprio. */
  outrasRetencoes?: number;
}

export interface ResultadoNfse {
  baseCalculo: number;
  valorIss: number;
  /** Só é maior que zero quando o ISS é retido pelo tomador. */
  valorIssRetido: number;
  retencoes: { pis: number; cofins: number; csll: number; ir: number; inss: number };
  totalRetencoesFederais: number;
  outrasRetencoes: number;
  /** Tudo que o tomador retém e recolhe no lugar do prestador. */
  totalRetencoes: number;
  /** Bruto menos desconto incondicionado menos retenções. */
  valorLiquido: number;
  /** O mesmo, caso o desconto condicionado se concretize. */
  valorLiquidoComDescontoCondicionado: number;
}

const naoNegativo = (v: number | undefined | null) =>
  !v || !Number.isFinite(v) || v < 0 ? 0 : v;

function aplicar(
  ret: RetencaoFederal | undefined,
  baseBruta: number,
): number {
  if (!ret || !Number.isFinite(ret.aliquota) || ret.aliquota <= 0) return 0;
  const base = ret.base === undefined ? baseBruta : naoNegativo(ret.base);
  return round2((base * ret.aliquota) / 100);
}

/**
 * Recusa o que a prefeitura recusaria — ou o que produziria nota sem sentido.
 * Devolve `null` quando está tudo certo.
 */
export function validarNfse(e: EntradaNfse): string | null {
  if (!Number.isFinite(e.valorServicos) || e.valorServicos <= 0) {
    return "O valor dos serviços deve ser maior que zero.";
  }
  if (!Number.isFinite(e.aliquotaIss) || e.aliquotaIss < 0 || e.aliquotaIss > 5) {
    return "A alíquota do ISS deve estar entre 0 e 5%.";
  }
  const deducoes = naoNegativo(e.valorDeducoes);
  const descIncond = naoNegativo(e.descontoIncondicionado);
  if (deducoes + descIncond > e.valorServicos) {
    return "Deduções e desconto incondicionado não podem superar o valor dos serviços.";
  }
  return null;
}

/**
 * Calcula os valores da nota.
 *
 * Assume entrada já validada por `validarNfse` — valores negativos são tratados
 * como zero em vez de gerar número absurdo silenciosamente.
 */
export function calcularNfse(e: EntradaNfse): ResultadoNfse {
  const bruto = naoNegativo(e.valorServicos);
  const deducoes = naoNegativo(e.valorDeducoes);
  const descIncond = naoNegativo(e.descontoIncondicionado);
  const descCond = naoNegativo(e.descontoCondicionado);

  const baseCalculo = round2(Math.max(0, bruto - deducoes - descIncond));
  const aliquota = Math.max(0, e.aliquotaIss || 0);
  const valorIss = round2((baseCalculo * aliquota) / 100);
  const valorIssRetido = e.issRetido ? valorIss : 0;

  const r = e.retencoes ?? {};
  const retencoes = {
    pis: aplicar(r.pis, bruto),
    cofins: aplicar(r.cofins, bruto),
    csll: aplicar(r.csll, bruto),
    ir: aplicar(r.ir, bruto),
    inss: aplicar(r.inss, bruto),
  };
  const totalRetencoesFederais = round2(
    retencoes.pis + retencoes.cofins + retencoes.csll + retencoes.ir + retencoes.inss,
  );
  const outrasRetencoes = round2(naoNegativo(e.outrasRetencoes));
  const totalRetencoes = round2(
    valorIssRetido + totalRetencoesFederais + outrasRetencoes,
  );

  const valorLiquido = round2(bruto - descIncond - totalRetencoes);

  return {
    baseCalculo,
    valorIss,
    valorIssRetido,
    retencoes,
    totalRetencoesFederais,
    outrasRetencoes,
    totalRetencoes,
    valorLiquido,
    valorLiquidoComDescontoCondicionado: round2(valorLiquido - descCond),
  };
}

/**
 * Natureza da operação da NFS-e (campo `natureza_operacao`).
 *
 * `1` tributa no município do prestador e `2` fora dele. Na construção civil o
 * ISS é devido no município da OBRA (LC 116/2003, art. 3º, III) — por isso a
 * escolha sai da comparação entre o município do prestador e o da prestação, e
 * não de uma preferência do usuário.
 */
export const NATUREZAS_OPERACAO = [
  { id: "1", label: "Tributação no município" },
  { id: "2", label: "Tributação fora do município" },
  { id: "3", label: "Isenção" },
  { id: "4", label: "Imune" },
  { id: "5", label: "Exigibilidade suspensa por decisão judicial" },
  { id: "6", label: "Exigibilidade suspensa por procedimento administrativo" },
] as const;

export type NaturezaOperacao = (typeof NATUREZAS_OPERACAO)[number]["id"];

export function naturezaPorMunicipio(
  codigoMunicipioPrestador: string | null | undefined,
  codigoMunicipioPrestacao: string | null | undefined,
): NaturezaOperacao {
  const p = (codigoMunicipioPrestador ?? "").replace(/\D/g, "");
  const s = (codigoMunicipioPrestacao ?? "").replace(/\D/g, "");
  if (!p || !s || p === s) return "1";
  return "2";
}
```

## `src/lib/fiscal/nfse-payload.ts`

```ts
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
      "Informe o código IBGE do município da obra (ou do prestador, se a obra não tiver município cadastrado).",
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
```

## `src/lib/fiscal/focus.ts`

```ts
/**
 * Cliente da API Focus NFe (v2) — a ÚNICA parte do app que conhece o provedor.
 *
 * O que a documentação define e este arquivo respeita:
 *
 *  - **Ambientes**: `https://homologacao.focusnfe.com.br` e
 *    `https://api.focusnfe.com.br`, ambos com prefixo `/v2`. Homologação não
 *    tem validade fiscal — é o padrão do cadastro por isso.
 *  - **Autenticação**: HTTP Basic com o TOKEN como usuário e senha VAZIA
 *    (`Basic base64("token:")`). Não há header de API key.
 *  - **Referência (`ref`)**: obrigatória na query string, única por token,
 *    só letras e números. Reenviar a mesma `ref` depois de um erro é o caminho
 *    de correção; depois de autorizada, aquela `ref` fica presa àquele
 *    documento para sempre.
 *  - **Fluxo assíncrono**: o POST devolve `processando_autorizacao`. A
 *    autorização chega por consulta ou por webhook — nunca na mesma requisição.
 *
 * O token vem de variável de ambiente, um por ambiente. Nada de credencial em
 * coluna de banco, e nada de token em log: mensagem de erro é montada sem ele.
 */

import {
  ehAmbienteFiscal,
  refValida,
  type AmbienteFiscal,
  type ErroNota,
  type ResultadoNota,
  type StatusNota,
} from "./tipos";
import type { PayloadNfse } from "./nfse-payload";

const BASES: Record<AmbienteFiscal, string> = {
  homologacao: "https://homologacao.focusnfe.com.br/v2",
  producao: "https://api.focusnfe.com.br/v2",
};

/** 20s: a pré-validação é síncrona, mas a fila do provedor pode demorar. */
const TIMEOUT_MS = 20_000;

export function tokenFocus(ambiente: AmbienteFiscal): string | null {
  const especifico =
    ambiente === "producao"
      ? process.env.FOCUS_NFE_TOKEN_PRODUCAO
      : process.env.FOCUS_NFE_TOKEN_HOMOLOGACAO;
  return especifico?.trim() || process.env.FOCUS_NFE_TOKEN?.trim() || null;
}

/** Dá para emitir neste ambiente? A tela usa isto para não oferecer o botão. */
export function focusConfigurado(ambiente: AmbienteFiscal = "homologacao"): boolean {
  return !!tokenFocus(ambiente);
}

export function resolverAmbiente(v: string | null | undefined): AmbienteFiscal {
  return ehAmbienteFiscal(v) ? v : "homologacao";
}

/** `Basic base64(token:)` — os dois-pontos com nada depois são intencionais. */
function cabecalhoAuth(token: string): string {
  return `Basic ${Buffer.from(`${token}:`, "utf8").toString("base64")}`;
}

/**
 * Traduz o vocabulário do provedor para o nosso.
 *
 * Status desconhecido cai em "processando" de propósito: tratar como erro uma
 * situação que só não sabemos ler faria o app declarar falha numa nota que
 * pode estar a caminho da autorização. Esperar e reconsultar é reversível;
 * declarar erro, não.
 */
export function traduzirStatus(status: string | undefined | null): StatusNota {
  switch ((status ?? "").toLowerCase()) {
    case "autorizado":
      return "autorizado";
    case "cancelado":
      return "cancelado";
    case "erro_autorizacao":
    case "erro":
      return "erro";
    case "nao_encontrada":
    case "nao_encontrado":
      return "nao_encontrada";
    default:
      return "processando";
  }
}

interface RespostaFocus {
  status?: string;
  ref?: string;
  numero?: string;
  numero_rps?: string;
  serie_rps?: string;
  codigo_verificacao?: string;
  data_emissao?: string;
  url?: string;
  caminho_xml_nota_fiscal?: string;
  caminho_xml_cancelamento?: string;
  url_danfse?: string;
  erros?: ErroNota[];
  codigo?: string;
  mensagem?: string;
  correcao?: string;
}

function mapear(ref: string, corpo: RespostaFocus, httpOk: boolean): ResultadoNota {
  // Erro de pré-validação (4xx) vem como {codigo, mensagem} — sem `status`.
  const erros: ErroNota[] =
    corpo.erros ??
    (!httpOk && corpo.mensagem
      ? [{ codigo: corpo.codigo, mensagem: corpo.mensagem, correcao: corpo.correcao }]
      : []);

  const status: StatusNota =
    !httpOk && !corpo.status ? "erro" : traduzirStatus(corpo.status);

  return {
    status,
    ref: corpo.ref || ref,
    numero: corpo.numero ?? null,
    codigoVerificacao: corpo.codigo_verificacao ?? null,
    numeroRps: corpo.numero_rps ?? null,
    serieRps: corpo.serie_rps ?? null,
    dataEmissao: corpo.data_emissao ?? null,
    urlEspelho: corpo.url ?? null,
    caminhoXml: corpo.caminho_xml_nota_fiscal ?? null,
    caminhoXmlCancelamento: corpo.caminho_xml_cancelamento ?? null,
    urlDanfse: corpo.url_danfse ?? null,
    erros: erros.length > 0 ? erros : undefined,
    bruto: corpo,
  };
}

async function chamar(
  ambiente: AmbienteFiscal,
  metodo: "POST" | "GET" | "DELETE",
  caminho: string,
  corpo?: unknown,
): Promise<{ ok: boolean; json: RespostaFocus; http: number }> {
  const token = tokenFocus(ambiente);
  if (!token) {
    throw new Error(
      `Token do provedor fiscal não configurado para ${ambiente} — defina FOCUS_NFE_TOKEN.`,
    );
  }
  const resp = await fetch(`${BASES[ambiente]}${caminho}`, {
    method: metodo,
    headers: {
      Authorization: cabecalhoAuth(token),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });

  const bruto = await resp.text();
  let json: RespostaFocus = {};
  if (bruto) {
    try {
      json = JSON.parse(bruto) as RespostaFocus;
    } catch {
      // 401 devolve HTML ("HTTP Basic: Access denied"). Vira erro legível sem
      // ecoar a resposta inteira (que pode conter cabeçalho de autenticação).
      json = {
        codigo: `http_${resp.status}`,
        mensagem:
          resp.status === 401
            ? "Provedor recusou a autenticação — verifique o token do ambiente."
            : `Resposta inesperada do provedor (HTTP ${resp.status}).`,
      };
    }
  }
  return { ok: resp.ok, json, http: resp.status };
}

/**
 * Envia a NFS-e. Resposta 201 significa ACEITA PARA PROCESSAMENTO, não
 * autorizada — quem confirma é o webhook ou a consulta.
 */
export async function emitirNfse(
  ambiente: AmbienteFiscal,
  ref: string,
  payload: PayloadNfse,
): Promise<ResultadoNota> {
  if (!refValida(ref)) {
    throw new Error("Referência inválida: use apenas letras e números.");
  }
  const { ok, json } = await chamar(
    ambiente,
    "POST",
    `/nfse?ref=${encodeURIComponent(ref)}`,
    payload,
  );
  return mapear(ref, json, ok);
}

/** Consulta o estado atual da nota pela referência. */
export async function consultarNfse(
  ambiente: AmbienteFiscal,
  ref: string,
): Promise<ResultadoNota> {
  const { ok, json, http } = await chamar(
    ambiente,
    "GET",
    `/nfse/${encodeURIComponent(ref)}`,
  );
  if (http === 404) {
    return { status: "nao_encontrada", ref, bruto: json };
  }
  return mapear(ref, json, ok);
}

/**
 * Cancela uma NFS-e autorizada.
 *
 * O prazo é da PREFEITURA e varia por município — algumas recusam cancelamento
 * fora do mês de competência. Recusa vem como erro do provedor, não como
 * exceção: quem decide o que fazer é a tela.
 */
export async function cancelarNfse(
  ambiente: AmbienteFiscal,
  ref: string,
  justificativa?: string,
): Promise<ResultadoNota> {
  const { ok, json } = await chamar(
    ambiente,
    "DELETE",
    `/nfse/${encodeURIComponent(ref)}`,
    justificativa?.trim() ? { justificativa: justificativa.trim() } : undefined,
  );
  return mapear(ref, json, ok);
}
```

## `src/lib/fiscal/tipos.ts`

```ts
/**
 * Contrato NEUTRO com o provedor de emissão de nota fiscal.
 *
 * O app fala com estes tipos; quem fala "focusnfe" é só `focus.ts`. A troca de
 * provedor (ou a convivência com dois, durante a migração para a NFS-e
 * Nacional) não deveria vazar para as telas nem para o banco.
 *
 * Os status abaixo são os NOSSOS — o vocabulário do provedor é traduzido na
 * borda. São quatro porque quatro é o que muda o comportamento do sistema:
 * esperar, arquivar, mostrar erro ou registrar cancelamento.
 */

export type StatusNota =
  /** aceita pelo provedor, aguardando a prefeitura. Estado normal logo após o envio. */
  | "processando"
  | "autorizado"
  | "cancelado"
  /** rejeitada pela prefeitura ou pela pré-validação — `erros` explica. */
  | "erro"
  /** o provedor não conhece esta referência. */
  | "nao_encontrada";

export interface ErroNota {
  codigo?: string;
  mensagem: string;
  correcao?: string;
}

export interface ResultadoNota {
  status: StatusNota;
  ref: string;
  /** número da NFS-e (existe só depois de autorizada). */
  numero?: string | null;
  codigoVerificacao?: string | null;
  numeroRps?: string | null;
  serieRps?: string | null;
  dataEmissao?: string | null;
  /** espelho HTML da nota no provedor. */
  urlEspelho?: string | null;
  caminhoXml?: string | null;
  caminhoXmlCancelamento?: string | null;
  urlDanfse?: string | null;
  erros?: ErroNota[];
  /**
   * Resposta crua do provedor, para gravar no log de eventos.
   *
   * Rejeição de prefeitura vem com mensagem obscura e específica do município;
   * sem o corpo original guardado, diagnosticar depois vira adivinhação.
   */
  bruto?: unknown;
}

export type AmbienteFiscal = "homologacao" | "producao";

export function ehAmbienteFiscal(v: string | null | undefined): v is AmbienteFiscal {
  return v === "homologacao" || v === "producao";
}

/**
 * Referência da emissão (`ref`): identificador nosso, único por token.
 *
 * A API aceita apenas letras e números — nada de hífen, ponto ou espaço. Como
 * as chaves do banco são UUID (que tem hífen), a conversão precisa ser explícita
 * e sempre a mesma: o mesmo registro tem que produzir a mesma `ref`, senão uma
 * reemissão viraria nota duplicada em vez de retomar a anterior.
 */
export function refDaNota(id: string): string {
  return id.replace(/[^A-Za-z0-9]/g, "");
}

export function refValida(ref: string): boolean {
  return /^[A-Za-z0-9]{1,50}$/.test(ref);
}
```

## `src/lib/calc/nfse.test.ts`

```ts
import { describe, it, expect } from "vitest";
import {
  calcularNfse,
  naturezaPorMunicipio,
  validarNfse,
  type EntradaNfse,
} from "./nfse";

const BASE: EntradaNfse = {
  valorServicos: 100_000,
  aliquotaIss: 3,
  issRetido: false,
};

describe("calcularNfse — ISS", () => {
  it("ISS sobre o valor dos serviços quando não há dedução", () => {
    const r = calcularNfse(BASE);
    expect(r.baseCalculo).toBe(100_000);
    expect(r.valorIss).toBe(3_000);
    expect(r.valorIssRetido).toBe(0);
    expect(r.valorLiquido).toBe(100_000);
  });

  it("ISS retido sai do líquido; o valor do ISS continua o mesmo", () => {
    const r = calcularNfse({ ...BASE, issRetido: true });
    expect(r.valorIss).toBe(3_000);
    expect(r.valorIssRetido).toBe(3_000);
    expect(r.totalRetencoes).toBe(3_000);
    expect(r.valorLiquido).toBe(97_000);
  });

  it("dedução de material reduz a base do ISS, não o valor da nota", () => {
    const r = calcularNfse({ ...BASE, valorDeducoes: 40_000, issRetido: true });
    expect(r.baseCalculo).toBe(60_000);
    expect(r.valorIss).toBe(1_800);
    // O tomador paga os R$ 100.000 menos o ISS retido — a dedução é só da base.
    expect(r.valorLiquido).toBe(98_200);
  });

  it("desconto incondicionado reduz base e líquido", () => {
    const r = calcularNfse({ ...BASE, descontoIncondicionado: 10_000 });
    expect(r.baseCalculo).toBe(90_000);
    expect(r.valorIss).toBe(2_700);
    expect(r.valorLiquido).toBe(90_000);
  });

  it("desconto condicionado só aparece no cenário em que se concretiza", () => {
    const r = calcularNfse({ ...BASE, descontoCondicionado: 2_000 });
    expect(r.valorLiquido).toBe(100_000);
    expect(r.valorLiquidoComDescontoCondicionado).toBe(98_000);
  });
});

describe("calcularNfse — retenções federais", () => {
  it("incidem sobre o bruto, não sobre a base do ISS", () => {
    const r = calcularNfse({
      ...BASE,
      valorDeducoes: 40_000,
      retencoes: { ir: { aliquota: 1.5 } },
    });
    expect(r.baseCalculo).toBe(60_000);
    expect(r.retencoes.ir).toBe(1_500); // 1,5% de 100.000
  });

  it("aceita base própria — INSS sobre a parcela de mão de obra", () => {
    const r = calcularNfse({
      ...BASE,
      retencoes: { inss: { aliquota: 11, base: 30_000 } },
    });
    expect(r.retencoes.inss).toBe(3_300);
    expect(r.valorLiquido).toBe(96_700);
  });

  it("soma o pacote PIS/COFINS/CSLL e desconta do líquido junto com o ISS retido", () => {
    const r = calcularNfse({
      ...BASE,
      issRetido: true,
      retencoes: {
        pis: { aliquota: 0.65 },
        cofins: { aliquota: 3 },
        csll: { aliquota: 1 },
      },
    });
    expect(r.retencoes.pis).toBe(650);
    expect(r.retencoes.cofins).toBe(3_000);
    expect(r.retencoes.csll).toBe(1_000);
    expect(r.totalRetencoesFederais).toBe(4_650);
    expect(r.totalRetencoes).toBe(7_650); // 3.000 de ISS + 4.650
    expect(r.valorLiquido).toBe(92_350);
  });

  it("nenhuma retenção é presumida — sem configuração, tudo zero", () => {
    const r = calcularNfse(BASE);
    expect(r.retencoes).toEqual({ pis: 0, cofins: 0, csll: 0, ir: 0, inss: 0 });
    expect(r.totalRetencoesFederais).toBe(0);
  });

  it("outras retenções entram no total e no líquido", () => {
    const r = calcularNfse({ ...BASE, outrasRetencoes: 500 });
    expect(r.totalRetencoes).toBe(500);
    expect(r.valorLiquido).toBe(99_500);
  });
});

describe("calcularNfse — arredondamento", () => {
  it("arredonda cada tributo em 2 casas", () => {
    const r = calcularNfse({
      valorServicos: 3_333.33,
      aliquotaIss: 2.5,
      issRetido: true,
      retencoes: { ir: { aliquota: 1.5 } },
    });
    expect(r.valorIss).toBe(83.33);
    expect(r.retencoes.ir).toBe(50);
    expect(r.valorLiquido).toBe(3_200);
  });

  it("valor negativo em campo auxiliar é tratado como zero", () => {
    const r = calcularNfse({ ...BASE, valorDeducoes: -5_000, outrasRetencoes: -10 });
    expect(r.baseCalculo).toBe(100_000);
    expect(r.outrasRetencoes).toBe(0);
  });
});

describe("validarNfse", () => {
  it("aceita entrada consistente", () => {
    expect(validarNfse(BASE)).toBeNull();
  });

  it("recusa valor zero ou negativo", () => {
    expect(validarNfse({ ...BASE, valorServicos: 0 })).toMatch(/maior que zero/);
    expect(validarNfse({ ...BASE, valorServicos: -1 })).toMatch(/maior que zero/);
  });

  it("recusa alíquota fora de 0–5%", () => {
    expect(validarNfse({ ...BASE, aliquotaIss: 7 })).toMatch(/entre 0 e 5/);
  });

  it("recusa dedução maior que o serviço", () => {
    expect(validarNfse({ ...BASE, valorDeducoes: 120_000 })).toMatch(/não podem superar/);
    expect(
      validarNfse({ ...BASE, valorDeducoes: 60_000, descontoIncondicionado: 50_000 }),
    ).toMatch(/não podem superar/);
  });
});

describe("naturezaPorMunicipio", () => {
  it("mesmo município do prestador → tributação no município", () => {
    expect(naturezaPorMunicipio("3509502", "3509502")).toBe("1");
  });

  it("obra em outro município → tributação fora do município (LC 116 art. 3º III)", () => {
    expect(naturezaPorMunicipio("3509502", "3550308")).toBe("2");
  });

  it("sem o município da obra, não presume operação fora", () => {
    expect(naturezaPorMunicipio("3509502", null)).toBe("1");
    expect(naturezaPorMunicipio(null, "3550308")).toBe("1");
  });
});
```

## `src/lib/fiscal/nfse-payload.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { montarPayloadNfse, type DadosEmissaoNfse } from "./nfse-payload";
import { refDaNota, refValida } from "./tipos";
import { traduzirStatus } from "./focus";
import type { EmitenteFiscal } from "@/lib/calc/emitente-fiscal";

const EMITENTE: EmitenteFiscal = {
  razaoSocial: "Construtora Piloto",
  cnpj: "11222333000181",
  inscricaoMunicipal: "123456",
  regimeTributario: "LUCRO_PRESUMIDO",
  itemListaServico: "7.02",
  aliquotaIss: 3,
  codigoMunicipio: "3509502", // Campinas/SP (sede fictícia)
  uf: "SP",
  logradouro: "Av. Brasil",
  numero: "1000",
  bairro: "Centro",
  cep: "13010-000",
  cnae: "4120400",
  email: "fiscal@exemplo.com.br",
};

const DADOS: DadosEmissaoNfse = {
  emitente: EMITENTE,
  tomador: {
    cnpj: "11222333000181",
    razaoSocial: "Cliente Piloto (incorporadora)",
    endereco: {
      logradouro: "Rua das Flores",
      numero: "123",
      bairro: "Centro",
      codigoMunicipio: "3509502",
      uf: "sp",
      cep: "13010-000",
    },
  },
  servico: {
    discriminacao: "Medição 05/2026 — EMPREENDIMENTO PILOTO",
    valores: { valorServicos: 100_000, aliquotaIss: 3, issRetido: false },
  },
  dataEmissao: "2026-08-26T10:30:00-03:00",
};

describe("montarPayloadNfse — estrutura", () => {
  it("monta o payload completo de uma medição", () => {
    const { payload, erros, calculo } = montarPayloadNfse(DADOS);
    expect(erros).toEqual([]);
    expect(payload).toBeDefined();
    expect(payload!.prestador).toEqual({
      cnpj: "11222333000181",
      inscricao_municipal: "123456",
      codigo_municipio: "3509502",
    });
    expect(payload!.servico).toMatchObject({
      valor_servicos: 100_000,
      base_calculo: 100_000,
      aliquota: 3,
      valor_iss: 3_000,
      iss_retido: false,
      item_lista_servico: "7.02",
      codigo_municipio: "3509502",
      discriminacao: "Medição 05/2026 — EMPREENDIMENTO PILOTO",
    });
    expect(calculo!.valorLiquido).toBe(100_000);
  });

  it("optante do Simples é derivado do regime, não redigitado", () => {
    const normal = montarPayloadNfse(DADOS).payload!;
    expect(normal.optante_simples_nacional).toBe(false);

    const simples = montarPayloadNfse({
      ...DADOS,
      emitente: { ...EMITENTE, regimeTributario: "SIMPLES" },
    }).payload!;
    expect(simples.optante_simples_nacional).toBe(true);
  });

  it("normaliza documentos e UF do tomador", () => {
    const { payload } = montarPayloadNfse({
      ...DADOS,
      tomador: {
        ...DADOS.tomador,
        cnpj: "11.222.333/0001-81",
        telefone: "(13) 99999-8888",
      },
    });
    const t = payload!.tomador as Record<string, unknown>;
    expect(t.cnpj).toBe("11222333000181");
    expect(t.telefone).toBe("13999998888");
    expect((t.endereco as Record<string, unknown>).uf).toBe("SP");
    expect((t.endereco as Record<string, unknown>).cep).toBe("13010000");
  });

  it("omite campos vazios em vez de mandar string em branco", () => {
    const { payload } = montarPayloadNfse({
      ...DADOS,
      tomador: { cpf: "12345678909", razaoSocial: "João da Silva" },
    });
    const t = payload!.tomador as Record<string, unknown>;
    expect(t.cpf).toBe("12345678909");
    expect(t).not.toHaveProperty("cnpj");
    expect(t).not.toHaveProperty("endereco");
    expect(payload!.servico).not.toHaveProperty("valor_deducoes");
  });
});

describe("montarPayloadNfse — município da obra (LC 116 art. 3º III)", () => {
  it("obra em outro município: incidência lá e natureza 2", () => {
    const { payload } = montarPayloadNfse({
      ...DADOS,
      obra: { codigoMunicipio: "3550308" }, // São Paulo
    });
    expect(payload!.servico).toMatchObject({ codigo_municipio: "3550308" });
    expect(payload!.natureza_operacao).toBe("2");
    // O prestador continua sendo o da sede.
    expect(payload!.prestador.codigo_municipio).toBe("3509502");
  });

  it("obra no mesmo município da sede: natureza 1", () => {
    const { payload } = montarPayloadNfse({
      ...DADOS,
      obra: { codigoMunicipio: "3509502" },
    });
    expect(payload!.natureza_operacao).toBe("1");
  });

  it("sem obra cadastrada, usa o município do prestador", () => {
    const { payload } = montarPayloadNfse(DADOS);
    expect(payload!.servico).toMatchObject({ codigo_municipio: "3509502" });
    expect(payload!.natureza_operacao).toBe("1");
  });

  it("leva CNO e ART, truncando em 15 caracteres", () => {
    const { payload } = montarPayloadNfse({
      ...DADOS,
      obra: {
        codigoMunicipio: "3550308",
        codigoObra: "1234567890123456789",
        art: "ART-2026-0001",
      },
    });
    expect(payload!.codigo_obra).toHaveLength(15);
    expect(payload!.art).toBe("ART-2026-0001");
  });
});

describe("montarPayloadNfse — tributos", () => {
  it("ISS retido e retenções federais chegam nos campos de valor", () => {
    const { payload, calculo } = montarPayloadNfse({
      ...DADOS,
      servico: {
        ...DADOS.servico,
        valores: {
          valorServicos: 100_000,
          aliquotaIss: 3,
          issRetido: true,
          retencoes: { inss: { aliquota: 11, base: 30_000 }, ir: { aliquota: 1.5 } },
        },
      },
    });
    expect(payload!.servico).toMatchObject({
      iss_retido: true,
      valor_iss: 3_000,
      valor_iss_retido: 3_000,
      valor_inss: 3_300,
      valor_ir: 1_500,
    });
    expect(payload!.servico).not.toHaveProperty("valor_pis");
    expect(calculo!.valorLiquido).toBe(92_200);
  });

  it("dedução de material reduz a base enviada", () => {
    const { payload } = montarPayloadNfse({
      ...DADOS,
      servico: {
        ...DADOS.servico,
        valores: {
          valorServicos: 100_000,
          valorDeducoes: 40_000,
          aliquotaIss: 3,
          issRetido: false,
        },
      },
    });
    expect(payload!.servico).toMatchObject({
      valor_servicos: 100_000,
      valor_deducoes: 40_000,
      base_calculo: 60_000,
      valor_iss: 1_800,
    });
  });

  it("regime especial só é enviado quando cadastrado", () => {
    expect(montarPayloadNfse(DADOS).payload).not.toHaveProperty(
      "regime_especial_tributacao",
    );
    const comRegime = montarPayloadNfse({
      ...DADOS,
      emitente: { ...EMITENTE, regimeEspecial: "3" },
    }).payload!;
    expect(comRegime.regime_especial_tributacao).toBe("3");
  });
});

describe("montarPayloadNfse — pendências", () => {
  it("acusa cadastro fiscal incompleto sem montar payload", () => {
    const { payload, erros } = montarPayloadNfse({
      ...DADOS,
      emitente: { ...EMITENTE, inscricaoMunicipal: null },
    });
    expect(payload).toBeUndefined();
    expect(erros.join(" ")).toMatch(/cadastro fiscal/i);
  });

  it("exige CPF ou CNPJ do tomador", () => {
    const { erros } = montarPayloadNfse({
      ...DADOS,
      tomador: { razaoSocial: "Sem documento" },
    });
    expect(erros.join(" ")).toMatch(/CPF ou o CNPJ do tomador/);
  });

  it("recusa CNPJ de tomador com dígito errado", () => {
    const { erros } = montarPayloadNfse({
      ...DADOS,
      tomador: { ...DADOS.tomador, cnpj: "11222333000182" },
    });
    expect(erros.join(" ")).toMatch(/CNPJ do tomador inválido/);
  });

  it("junta todas as pendências de uma vez", () => {
    const { erros } = montarPayloadNfse({
      ...DADOS,
      tomador: { razaoSocial: "Sem documento" },
      servico: {
        discriminacao: "",
        valores: { valorServicos: 0, aliquotaIss: 3, issRetido: false },
      },
    });
    expect(erros.length).toBeGreaterThanOrEqual(3);
  });

  it("propaga o erro de valor vindo do cálculo", () => {
    const { erros } = montarPayloadNfse({
      ...DADOS,
      servico: {
        ...DADOS.servico,
        valores: { valorServicos: 1_000, aliquotaIss: 9, issRetido: false },
      },
    });
    expect(erros.join(" ")).toMatch(/entre 0 e 5/);
  });
});

describe("referência da emissão", () => {
  it("UUID vira ref alfanumérica estável", () => {
    const id = "6f1c9a2e-4b3d-4c1a-9f2e-8a7b6c5d4e3f";
    expect(refDaNota(id)).toBe("6f1c9a2e4b3d4c1a9f2e8a7b6c5d4e3f");
    expect(refValida(refDaNota(id))).toBe(true);
    expect(refDaNota(id)).toBe(refDaNota(id));
  });

  it("recusa referência com caractere especial", () => {
    expect(refValida("PED-000123")).toBe(false);
    expect(refValida("PED000123")).toBe(true);
    expect(refValida("")).toBe(false);
  });
});

describe("traduzirStatus", () => {
  it("mapeia o vocabulário do provedor", () => {
    expect(traduzirStatus("autorizado")).toBe("autorizado");
    expect(traduzirStatus("cancelado")).toBe("cancelado");
    expect(traduzirStatus("erro_autorizacao")).toBe("erro");
    expect(traduzirStatus("processando_autorizacao")).toBe("processando");
  });

  it("status desconhecido espera em vez de declarar erro", () => {
    expect(traduzirStatus("status_novo_do_provedor")).toBe("processando");
    expect(traduzirStatus(undefined)).toBe("processando");
  });
});
```

---

## Respostas

**a) Quais retenções `calcularNfse` trata.** ISS (próprio e retido), PIS, COFINS, CSLL, IRRF e INSS, mais "outras retenções" num valor só.
- **Nenhuma incide por padrão.** Cada retenção federal só existe se a alíquota for informada (`aliquota > 0`).
- A base de cada retenção federal é o **valor bruto** dos serviços, salvo `base` própria informada (comum no INSS, sobre a mão de obra).
- O ISS incide sobre a **base de cálculo**: serviços − deduções − desconto incondicionado, sem ficar negativa.
- O ISS só entra no total retido quando `issRetido = true`.
- **Não há limites, faixas nem dispensas** (ex.: valor mínimo de retenção). O módulo só faz a conta do que foi informado.
- O valor líquido é o bruto − desconto incondicionado − total retido. Arredondamento em 2 casas por item.

**b) `naturezaPorMunicipio`.** Compara o código IBGE do prestador (`tenant.codigo_municipio`) com o do local da prestação, considerando só os dígitos.
- Iguais, ou algum vazio → `"1"` (tributação no município).
- Diferentes → `"2"` (tributação fora do município).
- Vale para **qualquer** município, sem lista.
- As naturezas 3 a 6 (isenção, imune, suspensões) existem na lista, mas a função **nunca** as devolve.

**c) O que `validarNfse` recusa:**
1. valor dos serviços não finito ou ≤ 0;
2. alíquota de ISS fora de 0–5% (ou não finita);
3. deduções + desconto incondicionado maiores que o valor dos serviços.

**Não valida** tomador, município, código IBGE, item da LC 116, CNPJ, discriminação nem as retenções. Por isso o 4.3 do prompt pede validação adicional antes do envio.

**d) De onde vem `refDaNota`.** Do **id do registro**, sem os caracteres não alfanuméricos (o UUID sem hífens).
- É **estável** entre tentativas: o mesmo registro produz sempre a mesma `ref`.
- Consequência para o 3.2 do prompt: uma nova tentativa depois de rejeição precisa de uma `ref` nova, o que hoje só acontece com um **registro novo**, ou com um sufixo de tentativa que ainda não existe.

**e) `emitirNfse` é síncrono?** **Não.** O POST devolve "aceita para processamento" (`processando`).
- A autorização vem depois, por `consultarNfse(ambiente, ref)` (GET `/nfse/<ref>`), ou por webhook, que não está implementado.
- 404 na consulta vira `nao_encontrada`.

**f) Erro do provedor.**
- Resposta HTTP de erro **não lança exceção**: vira `ResultadoNota` com `status = "erro"` e a lista `erros` (código, mensagem, correção), e guarda o corpo cru em `bruto`.
- Exceções só ocorrem para `ref` inválida, token ausente, falha de rede ou timeout (20 s, `AbortSignal.timeout`).
- **Não há retry** em nenhum caso.
- Status desconhecido é lido como `processando`, de propósito.

**g) RPS, série e numeração.** **Não há numeração própria** no sistema. O número da NFS-e, o número e a série do RPS vêm do **provedor e da prefeitura** e são só lidos na resposta (`numero`, `numero_rps`, `serie_rps`).

## O que a coleta muda no desenho

- **Formulário (a):** ISS com retido sim/não, cinco retenções federais opcionais (cada uma com alíquota e base própria opcional) e "outras retenções". **Nenhuma pré-marcada.** Cálculo ao vivo com bruto, ISS, cada retenção e líquido.
- **Numeração (g):** a tela não pede número nem série; mostra o que o provedor devolver.
- **Nova tentativa:** como `refDaNota(id)` é estável, a regra "nova `ref` após rejeição" (3.2) exige um contador de tentativa na `ref`. A `ref` passa a ser algo como `id` + `tentativa`, sempre alfanumérica e com até 50 caracteres. **Isso não exige alterar `tipos.ts`:** a `ref` composta é montada na action.
- **Validação (c):** além de `validarNfse`, a action precisa validar antes do envio o cadastro do emitente (`emitentePronto`), o tomador (documento e município) e o código IBGE de 7 dígitos.
