import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { PAPEIS_STAKEHOLDER, PAPEIS_STAKEHOLDER_OFERECIDOS } from "@/lib/calc/constants";
import { aiClient, createMessageWithFallback, isAiConfigured } from "@/lib/ai/client";
import type { DadosFornecedorLidos } from "@/lib/ai/fornecedor-doc";

/**
 * Leitura de documentos (cartão CNPJ, contrato social, cabeçalho de NF, cartão
 * de visita) por IA para pré-preencher o cadastro de um fornecedor/stakeholder.
 * Reaproveita a mesma configuração da leitura de despesas (ANTHROPIC_API_KEY;
 * modelo resolvido em lib/ai/modelos.ts).
 */

/**
 * O contrato (campos lidos) mora em `fornecedor-doc.ts`, módulo puro, junto da
 * regra que decide o que preencher e o que marcar com alerta — este arquivo
 * cuida só da conversa com a IA.
 */
export type ExtractedFornecedor = DadosFornecedorLidos;

type ImageMime = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

export async function extractFornecedorFromDocument(
  bytes: Uint8Array,
  mime: string,
): Promise<ExtractedFornecedor> {
  if (!isAiConfigured()) {
    throw new Error("Leitura por IA não configurada (defina ANTHROPIC_API_KEY).");
  }
  const client = aiClient();
  const data = Buffer.from(bytes).toString("base64");

  const docBlock: Anthropic.ContentBlockParam =
    mime === "application/pdf"
      ? {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data },
        }
      : {
          type: "image",
          source: { type: "base64", media_type: mime as ImageMime, data },
        };

  const tool: Anthropic.ToolUnion = {
    name: "preencher_fornecedor",
    description:
      "Preenche o cadastro de um fornecedor/stakeholder a partir do documento anexado (cartão CNPJ, contrato, NF, cartão de visita).",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        nome: {
          type: "string",
          description: "Razão social ou nome principal do fornecedor. Vazio se não identificar.",
        },
        nomeFantasia: { type: "string", description: "Nome fantasia. Vazio se não houver." },
        tipo: {
          type: "string",
          enum: ["PJ", "PF", ""],
          description: "PJ se houver CNPJ, PF se houver apenas CPF. Vazio se incerto.",
        },
        doc: {
          type: "string",
          description: "CNPJ ou CPF (com pontuação). Vazio se não houver.",
        },
        contato: { type: "string", description: "Nome da pessoa de contato. Vazio se não houver." },
        email: { type: "string", description: "E-mail de contato. Vazio se não houver." },
        tel: { type: "string", description: "Telefone de contato. Vazio se não houver." },
        whatsapp: { type: "string", description: "WhatsApp, se distinto do telefone. Vazio se não houver." },
        site: { type: "string", description: "Site/URL. Vazio se não houver." },
        endereco: { type: "string", description: "Logradouro (rua/avenida). Vazio se não houver." },
        numero: { type: "string", description: "Número do endereço. Vazio se não houver." },
        complemento: { type: "string", description: "Complemento (sala, andar). Vazio se não houver." },
        bairro: { type: "string", description: "Bairro. Vazio se não houver." },
        cidade: { type: "string", description: "Cidade. Vazio se não houver." },
        estado: { type: "string", description: "UF (2 letras). Vazio se não houver." },
        cep: { type: "string", description: "CEP. Vazio se não houver." },
        papeis: {
          type: "array",
          description:
            "Papéis mais prováveis do fornecedor, dentre os listados. Vazio se incerto.",
          items: { type: "string", enum: [...PAPEIS_STAKEHOLDER_OFERECIDOS] },
        },
        baixaConfianca: {
          type: "array",
          description:
            "Lista dos NOMES de campos preenchidos com BAIXA confiança (ex.: 'doc', 'cep'), para o usuário conferir. Vazio se todos confiáveis.",
          items: { type: "string" },
        },
      },
      required: [
        "nome", "nomeFantasia", "tipo", "doc", "contato", "email", "tel", "whatsapp",
        "site", "endereco", "numero", "complemento", "bairro", "cidade", "estado", "cep",
        "papeis", "baixaConfianca",
      ],
    },
    // Sem `strict: true`: a gramática que a API compila para validar a
    // resposta tem limite de tamanho (400 "compiled grammar is too large" —
    // aconteceu na leitura de despesa). A garantia de formato vem do parse
    // defensivo abaixo, que tolera campo ausente ou de tipo errado.
  };

  const message = await createMessageWithFallback(client, {
    max_tokens: 1024,
    tools: [tool],
    tool_choice: { type: "tool", name: "preencher_fornecedor" },
    messages: [
      {
        role: "user",
        content: [
          docBlock,
          {
            type: "text",
            text:
              "Extraia os dados do fornecedor deste documento e chame a ferramenta preencher_fornecedor. " +
              'Deixe "" ou lista vazia tudo que não conseguir identificar com confiança.',
          },
        ],
      },
    ],
  });

  const block = message.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("A IA não conseguiu extrair os dados do documento.");
  }
  const input = block.input as Partial<ExtractedFornecedor>;
  const tipo = input.tipo === "PJ" || input.tipo === "PF" ? input.tipo : "";
  const papeisSet = new Set<string>(PAPEIS_STAKEHOLDER);
  const str = (v: unknown) => String(v ?? "");
  return {
    nome: str(input.nome),
    nomeFantasia: str(input.nomeFantasia),
    tipo,
    doc: str(input.doc),
    contato: str(input.contato),
    email: str(input.email),
    tel: str(input.tel),
    whatsapp: str(input.whatsapp),
    site: str(input.site),
    endereco: str(input.endereco),
    numero: str(input.numero),
    complemento: str(input.complemento),
    bairro: str(input.bairro),
    cidade: str(input.cidade),
    estado: str(input.estado),
    cep: str(input.cep),
    papeis: Array.isArray(input.papeis)
      ? input.papeis.map(String).filter((p) => papeisSet.has(p))
      : [],
    baixaConfianca: Array.isArray(input.baixaConfianca)
      ? input.baixaConfianca.map(String)
      : [],
  };
}
