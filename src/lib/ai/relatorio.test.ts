import { describe, it, expect, vi, beforeEach } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";

/**
 * Prompt RC — o chat dos Relatórios Customizados com o modelo simulado: a
 * ferramenta devolve a receita, validada contra os projetos que a pessoa vê; ao
 * modelo vão só a conversa e os nomes dos projetos, nunca números.
 */
vi.mock("server-only", () => ({}));
const chamadas: Array<Omit<Anthropic.MessageCreateParamsNonStreaming, "model">> = [];
let resposta: Partial<Anthropic.Message> = {};
vi.mock("@/lib/ai/client", () => ({
  aiClient: () => ({}),
  createMessageWithFallback: async (_c: unknown, params: Omit<Anthropic.MessageCreateParamsNonStreaming, "model">) => {
    chamadas.push(structuredClone(params));
    return { id: "m", type: "message", role: "assistant", model: "x", usage: {}, stop_sequence: null, ...resposta };
  },
}));
const { proporRelatorio } = await import("./relatorio");
const OBRAS = [{ id: "p1", nome: "Monitoramento Alfa" }];

beforeEach(() => {
  chamadas.length = 0;
});

describe("Prompt RC — proporRelatorio", () => {
  it("a ferramenta vira a receita validada", async () => {
    resposta = {
      stop_reason: "tool_use",
      content: [
        { type: "text", text: "Montei a DRE do Monitoramento Alfa mês a mês.", citations: null },
        { type: "tool_use", id: "t", name: "montar_relatorio", input: { titulo: "DRE Alfa", fonte: "dre", colunas: "mes", cenarios: ["atual"], proj: "p1", de: "01/2026", ate: "12/2026", av: true }, caller: { type: "direct" } } as unknown as Anthropic.ToolUseBlock,
      ],
    };
    const r = await proporRelatorio([{ de: "usuario", texto: "DRE da Alfa por mês com vertical" }], OBRAS, new Date(2026, 9, 18));
    expect(r.texto).toMatch(/Montei/);
    expect(r.receita).toMatchObject({ fonte: "dre", colunas: "mes", proj: "p1", av: true, de: "01/2026" });
    const sys = JSON.stringify(chamadas[0].system);
    expect(sys).toContain("Projetos que a pessoa vê");
    expect(sys).toContain("Monitoramento Alfa: p1");
    expect(sys).toContain("Hoje é 10/2026");
    expect(chamadas[0].tools?.[0]).toMatchObject({ name: "montar_relatorio" });
  });

  it("projeto inventado pelo modelo não passa; sem ferramenta, não há receita", async () => {
    resposta = { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t", name: "montar_relatorio", input: { fonte: "fluxo", colunas: "obra", cenarios: ["budget"], proj: "outra", de: "", ate: "", av: false, titulo: "" }, caller: { type: "direct" } } as unknown as Anthropic.ToolUseBlock] };
    expect((await proporRelatorio([{ de: "usuario", texto: "x" }], OBRAS)).receita?.proj).toBe("all");
    resposta = { stop_reason: "end_turn", content: [{ type: "text", text: "Isso não dá: lista de lançamentos não é relatório daqui.", citations: null }] };
    const r = await proporRelatorio([{ de: "usuario", texto: "liste os lançamentos" }], OBRAS);
    expect(r.receita).toBeNull();
    expect(r.texto).toMatch(/não dá/);
  });
});
