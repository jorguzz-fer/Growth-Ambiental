import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { aiClient, createMessageWithFallback, isAiConfigured } from "@/lib/ai/client";
import type { DadosProjetoLidos } from "@/lib/ai/projeto-doc";

/**
 * Leitura por IA dos documentos do projeto (contrato, proposta, matrícula,
 * memorial) para PROPOR o preenchimento do cadastro (Prompt B, 25). Só a
 * conversa com a IA mora aqui; o contrato e a regra da proposta estão em
 * `projeto-doc.ts` (puro). Desligada sem `ANTHROPIC_API_KEY`.
 */

type ImageMime = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

export interface DocumentoParaLeitura {
  bytes: Uint8Array;
  mime: string;
  filename: string;
}

export async function extractProjetoFromDocuments(docs: DocumentoParaLeitura[], hojeISO: string): Promise<DadosProjetoLidos> {
  if (!isAiConfigured()) throw new Error("Leitura por IA não configurada (defina ANTHROPIC_API_KEY).");
  if (docs.length === 0) throw new Error("Nenhum documento legível para ler.");
  const client = aiClient();
  const blocos: Anthropic.ContentBlockParam[] = docs.map((d) => {
    const data = Buffer.from(d.bytes).toString("base64");
    return d.mime === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: d.mime as ImageMime, data } };
  });
  const campo = (descricao: string) => ({ type: "string" as const, description: `${descricao} Vazio se não identificar com confiança.` });
  const valor = (descricao: string) => ({ type: ["number", "null"] as const, description: `${descricao} Em reais, sem símbolo. null se não houver.` });
  const tool: Anthropic.ToolUnion = {
    name: "preencher_projeto",
    description: "Preenche o cadastro de um projeto de consultoria ambiental (licenciamento, monitoramento, arqueologia, fauna, flora, serviços técnicos) a partir dos documentos anexados (contrato, proposta técnica, termo de referência, ordem de serviço).",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        nome: campo("Nome do projeto (ex.: 'Monitoramento Arqueológico', 'Licenciamento da Rodovia X')."),
        endereco: campo("Endereço ou local do projeto (logradouro, número, bairro, ou a área atendida)."),
        cep: campo("CEP do local do projeto."),
        municipio: campo("Município do projeto."),
        uf: campo("UF do projeto (2 letras)."),
        dataInicio: campo("Data de início prevista do projeto, em YYYY-MM-DD."),
        dataFim: campo("Data de término prevista do projeto, em YYYY-MM-DD."),
        valorConstrucao: valor("Receita prevista do projeto: valor global do contrato ou da proposta de serviços."),
        custoConstrucao: valor("Custo previsto de execução do projeto, quando o documento informar."),
        baixaConfianca: { type: "array", description: "NOMES dos campos preenchidos com BAIXA confiança, para o usuário conferir.", items: { type: "string" } },
        observacoes: { type: "array", description: "Avisos curtos ao usuário (ex.: 'o valor lido é do orçamento, não do contrato').", items: { type: "string" } },
      },
      required: ["nome", "endereco", "cep", "municipio", "uf", "dataInicio", "dataFim", "valorConstrucao", "custoConstrucao", "baixaConfianca", "observacoes"],
    },
  };
  const message = await createMessageWithFallback(client, {
    max_tokens: 1024,
    tools: [tool],
    tool_choice: { type: "tool", name: "preencher_projeto" },
    messages: [
      {
        role: "user",
        content: [
          ...blocos,
          {
            type: "text",
            text: `Hoje é ${hojeISO}. Extraia os dados do projeto destes documentos e chame a ferramenta preencher_projeto. Não invente: deixe "" ou null tudo que não estiver escrito. Valores em reais. Datas em YYYY-MM-DD.`,
          },
        ],
      },
    ],
  });
  const block = message.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("A IA não conseguiu extrair os dados do documento.");
  const input = block.input as Partial<Record<string, unknown>>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);
  const lista = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean) : []);
  return {
    nome: str(input.nome),
    endereco: str(input.endereco),
    cep: str(input.cep),
    municipio: str(input.municipio),
    uf: str(input.uf),
    dataInicio: str(input.dataInicio),
    dataFim: str(input.dataFim),
    valorConstrucao: n(input.valorConstrucao),
    custoConstrucao: n(input.custoConstrucao),
    baixaConfianca: lista(input.baixaConfianca),
    observacoes: lista(input.observacoes),
  };
}
