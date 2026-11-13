import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { aiClient, createMessageWithFallback } from "@/lib/ai/client";
import type { FalaDaCris } from "@/lib/cris";
import { CENARIOS_RC, COLUNAS, FONTES, receitaValida, type ReceitaDeRelatorio } from "@/lib/relatorio-custom";

/**
 * Prompt RC — o chat dos Relatórios Customizados. O modelo recebe só o que
 * dá para pedir (fontes, colunas, cenários) e os NOMES das obras que a pessoa
 * vê, e devolve uma receita pela ferramenta `montar_relatorio`. Nenhum número
 * vai ao modelo: quem calcula é o servidor, depois, com o acesso da pessoa.
 */
const FERRAMENTA: Anthropic.Tool = {
  name: "montar_relatorio",
  description: "Monta o relatório pedido na tela. Não grava nada: a tela calcula com o acesso da pessoa.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      titulo: { type: "string", description: "Título curto do relatório." },
      fonte: { type: "string", enum: [...FONTES], description: "dre = DRE (cascata); dreanalitica = DRE por categoria e grupo do plano de contas; fluxo = Fluxo de Caixa previsto (entradas, saídas, saldo)." },
      colunas: { type: "string", enum: [...COLUNAS], description: "cenario = uma coluna por cenário; mes = mês a mês; obra = uma coluna por obra." },
      cenarios: { type: "array", items: { type: "string", enum: [...CENARIOS_RC] }, description: "atual = movimento real; forecast = Previsão Atualizada; budget = Orçamento. Por mês ou por obra, só o primeiro vale." },
      proj: { type: "string", description: '"all" (empresa toda), "ativos", "finalizados" ou o id de uma obra da lista.' },
      de: { type: "string", description: 'Competência inicial "MM/AAAA" ou "".' },
      ate: { type: "string", description: 'Competência final "MM/AAAA" ou "".' },
      av: { type: "boolean", description: "Análise vertical (% da receita na DRE, % das entradas no Fluxo)." },
    },
    required: ["titulo", "fonte", "colunas", "cenarios", "proj", "de", "ate", "av"],
  },
};

function regras(obras: readonly { id: string; nome: string }[], hoje: Date): string {
  const mes = `${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`;
  return [
    "Você é o assistente da tela Relatórios Customizados do Growth Ambiental, um sistema financeiro de construtora. Responda em português do Brasil, em uma ou duas frases.",
    "Seu trabalho é transformar o pedido num relatório pela ferramenta montar_relatorio. Use a ferramenta sempre que o pedido couber nela; depois diga em uma frase o que montou.",
    "O que existe: DRE (Receita, custos e despesas até o Resultado Final), DRE por categoria e grupo do plano de contas, e Fluxo de Caixa previsto pelo vencimento (entradas, saídas e saldo). Colunas por cenário, mês a mês ou por obra. Análise vertical opcional.",
    "Se o pedido não couber (por exemplo, um número que não está nessas fontes, ou uma lista de lançamentos), diga o que dá para montar e não invente.",
    `Hoje é ${mes}. "Este ano" é de 01 a 12 do ano atual. Sem período pedido, deixe de e ate vazios.`,
    "Obras que a pessoa vê (use o id em proj):",
    ...obras.map((o) => `- ${o.nome}: ${o.id}`),
  ].join("\n");
}

export async function proporRelatorio(
  conversa: readonly FalaDaCris[],
  obras: readonly { id: string; nome: string }[],
  hoje = new Date(),
): Promise<{ texto: string; receita: ReceitaDeRelatorio | null }> {
  const messages: Anthropic.MessageParam[] = conversa.map((f) => ({ role: f.de === "usuario" ? "user" : "assistant", content: f.texto }));
  const system: Anthropic.TextBlockParam[] = [{ type: "text", text: regras(obras, hoje) }];
  const client = aiClient();
  const msg = await createMessageWithFallback(client, { max_tokens: 800, system, tools: [FERRAMENTA], messages });
  if (msg.stop_reason === "refusal") return { texto: "Não posso ajudar com esse pedido.", receita: null };
  const uso = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "montar_relatorio");
  const texto = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!uso) return { texto: texto || "Não consegui montar esse relatório. Tente descrever as linhas e as colunas.", receita: null };
  const receita = receitaValida(uso.input, obras.map((o) => o.id));
  return { texto: texto || `Montei: ${receita.titulo || "relatório"}.`, receita };
}
