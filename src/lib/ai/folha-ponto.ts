import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { aiClient, createMessageWithFallback, isAiConfigured } from "@/lib/ai/client";
import type { DocumentoParaLeitura } from "@/lib/ai/despesa-extract";

/**
 * Prompt Z, 6.2 — lê a FOLHA DE PONTO ASSINADA do dia e devolve nomes e
 * quantidades (inteira/meia). Só esse tipo de documento vai ao modelo:
 * nunca documento de funcionário (identidade, ASO) — 6.3 / 16a. Nada é
 * gravado: a action devolve propostas e a pessoa confirma.
 */
export interface LinhaDaFolha {
  nome: string;
  quantidade: number;
  confianca: "alta" | "media" | "baixa";
}
type ImageMime = "image/png" | "image/jpeg" | "image/webp" | "image/gif";
const bloco = (doc: DocumentoParaLeitura): Anthropic.ContentBlockParam => {
  const data = Buffer.from(doc.bytes).toString("base64");
  return doc.mime === "application/pdf" ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } } : { type: "image", source: { type: "base64", media_type: doc.mime as ImageMime, data } };
};

export async function lerFolhaDePontoComIA(docs: DocumentoParaLeitura[]): Promise<{ linhas: LinhaDaFolha[]; observacoes: string[] }> {
  if (!isAiConfigured()) throw new Error("Leitura por IA não configurada (defina ANTHROPIC_API_KEY).");
  if (docs.length === 0) throw new Error("O dia não tem folha de ponto anexada.");
  const client = aiClient();
  const tool: Anthropic.ToolUnion = {
    name: "listar_presencas",
    description: "Lista as pessoas presentes numa folha de ponto de campo assinada, com a quantidade de diárias (1 = dia inteiro, 0.5 = meio dia).",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        observacoes: { type: "array", items: { type: "string" } },
        linhas: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              nome: { type: "string", description: "Nome exatamente como está escrito na folha." },
              quantidade: { type: "number", description: "1 para dia inteiro, 0.5 para meio dia; 1.5 ou 2 se a folha indicar." },
              confianca: { type: "string", enum: ["alta", "media", "baixa"] },
            },
            required: ["nome", "quantidade", "confianca"],
          },
        },
      },
      required: ["observacoes", "linhas"],
    },
  };
  const message = await createMessageWithFallback(client, {
    max_tokens: 2048,
    tools: [tool],
    tool_choice: { type: "tool", name: "listar_presencas" },
    // Decisão de 01/10/2026 (BE-2): só o documento vai ao modelo — os nomes da
    // equipe NÃO entram; o casamento com a equipe é local (casarNomesComEquipe).
    system: [{ type: "text", text: "Você lê folhas de ponto assinadas de equipes de campo de projetos (Brasil) e lista quem esteve presente. Não invente nome: só o que está escrito ou assinado. Copie cada nome como está na folha; o sistema compara com a equipe depois." }],
    messages: [{ role: "user", content: [...docs.flatMap((d): Anthropic.ContentBlockParam[] => (docs.length > 1 ? [{ type: "text", text: `Arquivo: ${d.filename}` }, bloco(d)] : [bloco(d)])), { type: "text", text: "Liste as presenças desta folha de ponto." }] }],
  });
  const block = message.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("A IA não conseguiu ler a folha de ponto.");
  const input = block.input as { linhas?: unknown; observacoes?: unknown };
  const linhas: LinhaDaFolha[] = (Array.isArray(input.linhas) ? input.linhas : [])
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const confianca: LinhaDaFolha["confianca"] = o.confianca === "alta" || o.confianca === "media" ? o.confianca : "baixa";
      return { nome: typeof o.nome === "string" ? o.nome.trim() : "", quantidade: typeof o.quantidade === "number" && Number.isFinite(o.quantidade) ? o.quantidade : 1, confianca };
    })
    .filter((l) => l.nome);
  return { linhas, observacoes: Array.isArray(input.observacoes) ? input.observacoes.filter((o): o is string => typeof o === "string" && !!o.trim()) : [] };
}
