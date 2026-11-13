import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { aiClient, createMessageWithFallback, isAiConfigured } from "@/lib/ai/client";
import {
  AI_ACCEPTED_MIME,
  AI_MAX_DOCS,
  normalizarCampo,
  normalizarCampoBool,
  normalizarCampoNumero,
} from "@/lib/ai/campos";
import {
  NATUREZAS_ARQUIVO,
  type ExtractedDespesa,
  type NaturezaArquivo,
} from "@/lib/ai/despesa-doc";
import {
  instrucaoLeituraDespesa,
  promptSistemaDespesa,
  type ContextoLeituraDespesa,
} from "@/lib/ai/despesa-prompt";

/**
 * Leitura por IA dos documentos de uma despesa (NF, cupom, boleto, comprovante,
 * foto do papel) para pré-preencher o lançamento.
 *
 * Duas características que diferenciam esta leitura de um OCR comum:
 *
 * 1. **Vários arquivos, um lançamento.** A mesma compra costuma chegar em duas
 *    partes — a nota E o comprovante do Pix, ou a foto do cupom E o print da
 *    transferência. Os arquivos vão juntos na MESMA chamada para que a IA
 *    cruze as informações (a nota dá o número e a chave; o comprovante diz que
 *    já foi pago, quando e como).
 * 2. **Confiança por campo.** Cada campo volta com `confianca` e uma `nota`
 *    dizendo de onde saiu ou por que está em dúvida. É isso que a tela
 *    transforma em ALERTA — o usuário sabe exatamente o que conferir em vez de
 *    reler o documento inteiro.
 *
 * Fica desabilitada quando `ANTHROPIC_API_KEY` não está definida (mesmo padrão
 * do R2): nesse caso o upload/vínculo do arquivo continua funcionando.
 */

export { isAiConfigured, AI_ACCEPTED_MIME, AI_MAX_DOCS };
export type { ExtractedDespesa };

type ImageMime = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

export interface DocumentoParaLeitura {
  bytes: Uint8Array;
  mime: string;
  filename: string;
}

export type { ContextoLeituraDespesa };

/** Sub-schema de um campo lido: valor + confiança + nota para o usuário. */
function campoSchema(
  descricaoValor: string,
  tipo: "string" | "number" | "boolean" = "string",
  extra: Record<string, unknown> = {},
) {
  return {
    type: "object" as const,
    additionalProperties: false,
    properties: {
      valor: { type: tipo, description: descricaoValor, ...extra },
      confianca: {
        type: "string",
        enum: ["alta", "media", "baixa"],
        description:
          "alta = está escrito no documento, sem ambiguidade. media = deduzido/interpretado. baixa = ilegível, parcial ou palpite.",
      },
      nota: {
        type: "string",
        description:
          "Uma frase curta, em português, para o usuário: de onde saiu o dado ou por que há dúvida. Vazio quando confianca=alta.",
      },
    },
    required: ["valor", "confianca", "nota"],
  };
}

function blocoDoDocumento(doc: DocumentoParaLeitura): Anthropic.ContentBlockParam {
  const data = Buffer.from(doc.bytes).toString("base64");
  return doc.mime === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
    : { type: "image", source: { type: "base64", media_type: doc.mime as ImageMime, data } };
}

/**
 * Envia os documentos para a Claude e devolve os campos da despesa, cada um
 * com sua confiança. Campos não identificados voltam vazios ("" / 0 / false)
 * com a `nota` explicando a ausência.
 */
export async function extractDespesaFromDocument(
  docs: DocumentoParaLeitura[],
  ctx: ContextoLeituraDespesa,
): Promise<ExtractedDespesa> {
  if (!isAiConfigured()) {
    throw new Error("Leitura por IA não configurada (defina ANTHROPIC_API_KEY).");
  }
  if (docs.length === 0) throw new Error("Selecione ao menos um documento.");
  const client = aiClient();

  const tool: Anthropic.ToolUnion = {
    name: "preencher_despesa",
    description:
      "Preenche os campos de um lançamento de despesa a partir dos documentos anexados (nota fiscal, cupom, boleto, comprovante de pagamento, recibo ou foto).",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        natureza: {
          type: "string",
          enum: [...NATUREZAS_ARQUIVO],
          description:
            "O que são os arquivos, no conjunto. COMPROVANTE = comprovante de pagamento (Pix, TED, recibo de transferência). CUPOM = cupom/recibo de loja, inclusive 'SEM VALOR FISCAL'. ORCAMENTO = orçamento/pedido ainda não executado.",
        },
        resumo: {
          type: "string",
          description:
            "Uma frase em português dizendo o que é a despesa (ex.: 'Hospedagem da equipe técnica no Hotel Exemplo, 3 diárias, NF-e 17547').",
        },
        observacoes: {
          type: "array",
          items: { type: "string" },
          description:
            "Ressalvas gerais sobre a leitura: foto cortada, valor rasurado, documento sem valor fiscal, arquivos que parecem ser de despesas diferentes. Lista vazia se não houver.",
        },
        fornecedorNome: campoSchema(
          "Nome/razão social de QUEM RECEBE o dinheiro (emitente da nota, loja, prestador, recebedor do Pix). Vazio se não identificar.",
        ),
        fornecedorDoc: campoSchema(
          "CNPJ ou CPF do fornecedor, como está escrito. Se estiver mascarado (ex.: ***.123.456-**), copie assim mesmo e use confianca=baixa.",
        ),
        valor: campoSchema(
          "Valor total efetivamente devido, em reais, já com descontos (número puro, sem 'R$' nem separador de milhar). 0 se não identificar.",
          "number",
        ),
        competencia: campoSchema(
          "Mês do FATO GERADOR (entrega/serviço/emissão), formato ISO YYYY-MM. Vazio se não der para determinar.",
        ),
        vencimento: campoSchema(
          "Data de vencimento, formato ISO YYYY-MM-DD. Vazio se o documento não trouxer prazo.",
        ),
        descricao: campoSchema(
          "Objeto da compra em uma linha (ex.: '2 trenas de 50 m e 1 GPS de mão', 'análises laboratoriais de água — 12 amostras'). Para serviço, o que foi feito.",
        ),
        categoriaDre: campoSchema(
          "Categoria DRE mais provável, EXATAMENTE como listada abaixo. Vazio se incerto.",
          "string",
          { enum: [...ctx.categorias, ""] },
        ),
        contaCef: campoSchema(
          "Código do plano de contas mais adequado (ex.: 1.1), dentre os listados. Vazio se incerto.",
        ),
        projetoNome: campoSchema(
          "Projeto ou contrato citado no documento (ex.: 'PROJETO 25' ou 'Monitoramento Arqueológico' no nome do destinatário, na descrição ou carimbado no cupom). Vazio se não citar.",
        ),
        docFiscalTipo: campoSchema(
          "Tipo de documento fiscal, usando um dos ids listados. Use SEM_DOC para comprovante de pagamento, cupom sem valor fiscal e orçamento.",
          "string",
          { enum: [...ctx.tiposDocumento.map((t) => t.id), ""] },
        ),
        numDoc: campoSchema(
          "Número da nota/cupom/boleto emitido pelo fornecedor. Vazio se não houver.",
        ),
        serie: campoSchema("Série da nota fiscal. Vazio se não houver."),
        chaveAcesso: campoSchema(
          "Chave de acesso da NF-e (44 dígitos, sem separadores). Vazio se não houver.",
        ),
        dataEmissao: campoSchema("Data de emissão do documento, ISO YYYY-MM-DD."),
        formaPagamento: campoSchema(
          "Meio de pagamento: PIX, Boleto, Transferência bancária, Cartão de crédito, Cartão de débito, Dinheiro, Cheque, Débito automático. Vazio se não constar.",
        ),
        pago: campoSchema(
          "true SOMENTE se os documentos comprovarem pagamento já efetuado (comprovante efetivado, carimbo PAGO, cupom quitado à vista).",
          "boolean",
        ),
        dataPagamento: campoSchema(
          "Data em que o pagamento foi feito, ISO YYYY-MM-DD. Vazio se não houver comprovante.",
        ),
      },
      required: [
        "natureza",
        "resumo",
        "observacoes",
        "fornecedorNome",
        "fornecedorDoc",
        "valor",
        "competencia",
        "vencimento",
        "descricao",
        "categoriaDre",
        "contaCef",
        "projetoNome",
        "docFiscalTipo",
        "numDoc",
        "serie",
        "chaveAcesso",
        "dataEmissao",
        "formaPagamento",
        "pago",
        "dataPagamento",
      ],
    },
    // SEM `strict: true` — e é de propósito. Com strict, a API compila o
    // schema inteiro numa gramática que valida a resposta byte a byte; com
    // ~20 campos aninhados (valor+confiança+nota cada um), essa gramática
    // estoura o limite e a chamada falha com 400 "compiled grammar is too
    // large". A garantia de formato aqui não vem do strict: todo campo passa
    // por normalizarCampo*/montarPreenchimentoDespesa, que tolera ausência e
    // tipo errado — campo malformado vira alerta na tela, não erro.
  };

  // Ordem que a API usa para o cache: tools → system → messages. O ponto de
  // cache no fim do `system` cobre, portanto, a ferramenta E o plano de contas
  // e as regras (nada do cadastro de pessoas — decisão de 01/10) — que é a maior parte
  // dos tokens e não muda entre uma leitura e a seguinte. O documento vem
  // depois, em `messages`, porque é o único pedaço realmente volátil.
  const message = await createMessageWithFallback(client, {
    max_tokens: 2048,
    tools: [tool],
    tool_choice: { type: "tool", name: "preencher_despesa" },
    system: [
      {
        type: "text",
        text: promptSistemaDespesa(ctx),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          ...docs.flatMap((d): Anthropic.ContentBlockParam[] =>
            docs.length > 1
              ? [{ type: "text", text: `Arquivo: ${d.filename}` }, blocoDoDocumento(d)]
              : [blocoDoDocumento(d)],
          ),
          { type: "text", text: instrucaoLeituraDespesa(docs.length) },
        ],
      },
    ],
  });

  const block = message.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("A IA não conseguiu extrair os campos do documento.");
  }
  const input = block.input as Record<string, unknown>;
  const natureza = String(input.natureza ?? "OUTRO") as NaturezaArquivo;

  return {
    natureza: NATUREZAS_ARQUIVO.includes(natureza) ? natureza : "OUTRO",
    resumo: typeof input.resumo === "string" ? input.resumo : "",
    observacoes: Array.isArray(input.observacoes)
      ? input.observacoes.filter((o): o is string => typeof o === "string" && !!o.trim())
      : [],
    fornecedorNome: normalizarCampo(input.fornecedorNome),
    fornecedorDoc: normalizarCampo(input.fornecedorDoc),
    valor: normalizarCampoNumero(input.valor),
    competencia: normalizarCampo(input.competencia),
    vencimento: normalizarCampo(input.vencimento),
    descricao: normalizarCampo(input.descricao),
    categoriaDre: normalizarCampo(input.categoriaDre),
    contaCef: normalizarCampo(input.contaCef),
    projetoNome: normalizarCampo(input.projetoNome),
    docFiscalTipo: normalizarCampo(input.docFiscalTipo),
    numDoc: normalizarCampo(input.numDoc),
    serie: normalizarCampo(input.serie),
    chaveAcesso: normalizarCampo(input.chaveAcesso),
    dataEmissao: normalizarCampo(input.dataEmissao),
    formaPagamento: normalizarCampo(input.formaPagamento),
    pago: normalizarCampoBool(input.pago),
    dataPagamento: normalizarCampo(input.dataPagamento),
  };
}
