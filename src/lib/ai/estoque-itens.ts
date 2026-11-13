import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { aiClient, createMessageWithFallback, isAiConfigured } from "@/lib/ai/client";
import type { DocumentoParaLeitura } from "@/lib/ai/despesa-extract";

/**
 * Prompt Y, 7.1 — lê a nota já anexada à despesa e devolve os ITENS (material,
 * quantidade, unidade, custo), cada um com confiança. É o mesmo caminho da
 * leitura de despesa (mesmo cliente, mesmos formatos); só o que se pede muda.
 * Nada é gravado aqui: a action devolve propostas e a pessoa confirma.
 */

export interface ItemDaNota {
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
  /** nome do material do cadastro que a IA acha que corresponde ("" se nenhum). */
  materialCadastrado: string;
  confianca: "alta" | "media" | "baixa";
  nota: string;
}

export interface ContextoItens {
  materiais: { nome: string; unidade: string; sku: string | null }[];
}

type ImageMime = "image/png" | "image/jpeg" | "image/webp" | "image/gif";
function blocoDoDocumento(doc: DocumentoParaLeitura): Anthropic.ContentBlockParam {
  const data = Buffer.from(doc.bytes).toString("base64");
  return doc.mime === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
    : { type: "image", source: { type: "base64", media_type: doc.mime as ImageMime, data } };
}
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(String(v ?? "").replace(",", ".")) || 0);
const txt = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function extrairItensDaNota(docs: DocumentoParaLeitura[], ctx: ContextoItens): Promise<{ itens: ItemDaNota[]; observacoes: string[] }> {
  if (!isAiConfigured()) throw new Error("Leitura por IA não configurada (defina ANTHROPIC_API_KEY).");
  if (docs.length === 0) throw new Error("A despesa não tem documento legível anexado.");
  const client = aiClient();
  const tool: Anthropic.ToolUnion = {
    name: "listar_itens_da_nota",
    description: "Lista os itens (materiais e equipamentos) de uma nota fiscal ou cupom de compra, um por linha da nota.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        observacoes: { type: "array", items: { type: "string" }, description: "Ressalvas: foto cortada, item ilegível, nota de serviço sem material. Vazio se não houver." },
        itens: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              descricao: { type: "string", description: "Descrição do item como está na nota." },
              quantidade: { type: "number", description: "Quantidade comprada (número puro)." },
              unidade: { type: "string", description: "Unidade como na nota (UN, KG, M, M2, M3, SC, CX, PC...)." },
              valorUnitario: { type: "number", description: "Valor unitário em reais (número puro). 0 se não constar." },
              valorTotal: { type: "number", description: "Valor total do item em reais. 0 se não constar." },
              materialCadastrado: { type: "string", description: "O NOME EXATO do material do cadastro que corresponde a este item, escolhido da lista fornecida; string vazia se nenhum corresponder." },
              confianca: { type: "string", enum: ["alta", "media", "baixa"] },
              nota: { type: "string", description: "Uma frase curta para o usuário quando houver dúvida; vazio se confianca=alta." },
            },
            required: ["descricao", "quantidade", "unidade", "valorUnitario", "valorTotal", "materialCadastrado", "confianca", "nota"],
          },
        },
      },
      required: ["observacoes", "itens"],
    },
  };
  const lista = ctx.materiais.length ? ctx.materiais.map((m) => `- ${m.nome} (${m.unidade}${m.sku ? `, SKU ${m.sku}` : ""})`).join("\n") : "- (nenhum material cadastrado)";
  const message = await createMessageWithFallback(client, {
    max_tokens: 4096,
    tools: [tool],
    tool_choice: { type: "tool", name: "listar_itens_da_nota" },
    system: [
      {
        type: "text",
        text: `Você lê notas fiscais e cupons de compra de MATERIAIS E EQUIPAMENTOS de uma consultoria ambiental brasileira (EPI, ferramentas de campo, material de coleta e amostragem, equipamentos) e devolve os itens, um por linha da nota, para dar entrada em Materiais e Equipamentos. Não invente item: só o que está escrito. Para "materialCadastrado", use somente nomes desta lista do cadastro, exatamente como escritos, ou deixe vazio:\n${lista}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          ...docs.flatMap((d): Anthropic.ContentBlockParam[] => (docs.length > 1 ? [{ type: "text", text: `Arquivo: ${d.filename}` }, blocoDoDocumento(d)] : [blocoDoDocumento(d)])),
          { type: "text", text: "Liste os itens de material ou equipamento desta nota. Se a nota for de serviço, ou não tiver item de material ou equipamento, devolva a lista vazia e explique em observacoes." },
        ],
      },
    ],
  });
  const block = message.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("A IA não conseguiu listar os itens da nota.");
  const input = block.input as { observacoes?: unknown; itens?: unknown };
  const itens: ItemDaNota[] = (Array.isArray(input.itens) ? input.itens : [])
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const confianca: ItemDaNota["confianca"] = o.confianca === "alta" || o.confianca === "media" ? o.confianca : "baixa";
      return { descricao: txt(o.descricao), quantidade: num(o.quantidade), unidade: txt(o.unidade), valorUnitario: num(o.valorUnitario), valorTotal: num(o.valorTotal), materialCadastrado: txt(o.materialCadastrado), confianca, nota: txt(o.nota) };
    })
    .filter((i) => i.descricao);
  const observacoes = Array.isArray(input.observacoes) ? input.observacoes.filter((o): o is string => typeof o === "string" && !!o.trim()) : [];
  return { itens, observacoes };
}
