import { describe, it, expect, vi, beforeEach } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";

/**
 * Prompt E2 — o laço de ferramentas da Cris, com o modelo simulado: a
 * consulta roda no servidor (callback), a proposta é validada contra o
 * formulário, e o que vai ao modelo é só a conversa, a tela limpa e o anexo.
 */
vi.mock("server-only", () => ({}));
const chamadas: Array<Omit<Anthropic.MessageCreateParamsNonStreaming, "model">> = [];
let roteiro: Array<Partial<Anthropic.Message>> = [];
vi.mock("@/lib/ai/client", () => ({
  aiClient: () => ({}),
  createMessageWithFallback: async (_c: unknown, params: Omit<Anthropic.MessageCreateParamsNonStreaming, "model">) => {
    chamadas.push(structuredClone(params));
    const r = roteiro.shift();
    if (!r) throw new Error("roteiro acabou");
    return { id: "m", type: "message", role: "assistant", model: "x", usage: {}, stop_sequence: null, ...r };
  },
}));

const { responderComoCris } = await import("./cris");

const FORM = {
  id: "despesa",
  titulo: "Nova despesa",
  campos: [
    { nome: "valor", rotulo: "Valor", tipo: "numero" as const },
    { nome: "status", rotulo: "Status", tipo: "opcao" as const, opcoes: ["A pagar", "Pago"] },
  ],
};

beforeEach(() => {
  chamadas.length = 0;
  roteiro = [];
});

describe("Prompt E2 — responderComoCris", () => {
  it("consulta um número no servidor e responde com ele", async () => {
    roteiro = [
      { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "consultar_numero", input: { metrica: "saldo", cenario: "", obra: "", todas: false, de: "", ate: "" } } as Anthropic.ToolUseBlock] },
      { stop_reason: "end_turn", content: [{ type: "text", text: "O saldo é R$ 21.000.", citations: null } as Anthropic.TextBlock] },
    ];
    const consultar = vi.fn(async () => "Saldo disponível hoje nas contas da empresa: R$ 21.000,00.");
    const r = await responderComoCris({ conversa: [{ de: "usuario", texto: "qual o saldo?" }], tela: null, dadosPermitidos: false, anexo: null, consultar });
    expect(r).toMatchObject({ texto: "O saldo é R$ 21.000.", proposta: null, consultas: 1 });
    expect(consultar).toHaveBeenCalledWith({ metrica: "saldo", cenario: "", obra: "", todas: false, de: "", ate: "" });
    // a segunda chamada leva o resultado da consulta
    const ultima = chamadas[1].messages.at(-1)!;
    expect(JSON.stringify(ultima.content)).toContain("R$ 21.000,00");
    // sem formulário na tela, a ferramenta de proposta nem é oferecida
    expect(chamadas[0].tools!.map((t) => (t as Anthropic.Tool).name)).toEqual(["consultar_numero"]);
  });

  it("propõe o preenchimento só com campos do formulário", async () => {
    roteiro = [
      { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "propor_preenchimento", input: { valores: { valor: "150", status: "pago", hack: "x" }, conferir: { status: "não sei se foi pago" } } } as Anthropic.ToolUseBlock] },
      { stop_reason: "end_turn", content: [{ type: "text", text: "Preenchi valor e status.", citations: null } as Anthropic.TextBlock] },
    ];
    const r = await responderComoCris({
      conversa: [{ de: "usuario", texto: "lança 150 pago" }],
      tela: { rota: "/despesas", titulo: "Despesas", dados: { total: 9, cpf: "1" }, formulario: FORM },
      dadosPermitidos: true,
      anexo: null,
      consultar: async () => "",
    });
    expect(r.proposta).toEqual({ formulario: "despesa", valores: { valor: "150", status: "Pago" }, conferir: { status: "não sei se foi pago" }, observacao: null });
    const enviado = JSON.stringify(chamadas[0].messages);
    expect(enviado).toContain('\\"total\\":9');
    expect(enviado).not.toContain("cpf");
    expect(chamadas[0].tools!.map((t) => (t as Anthropic.Tool).name)).toEqual(["consultar_numero", "propor_preenchimento"]);
  });

  it("o anexo vai como documento antes do texto; recusa não vira resposta inventada", async () => {
    roteiro = [{ stop_reason: "refusal", content: [] }];
    const r = await responderComoCris({
      conversa: [{ de: "usuario", texto: "leia" }],
      tela: null,
      dadosPermitidos: false,
      anexo: { tipo: "application/pdf", base64: "JVBERi0=", nome: "nota.pdf" },
      consultar: async () => "",
    });
    expect(r.texto).toBe("Não posso ajudar com esse pedido.");
    const conteudo = chamadas[0].messages[0].content as Anthropic.ContentBlockParam[];
    expect(conteudo[0].type).toBe("document");
    expect(conteudo.at(-1)).toMatchObject({ type: "text", text: "leia" });
  });

  it("para depois de MAX_VOLTAS consultas seguidas", async () => {
    const uso = { stop_reason: "tool_use" as const, content: [{ type: "tool_use", id: "t", name: "consultar_numero", input: {} } as Anthropic.ToolUseBlock] };
    roteiro = [uso, uso, uso, uso, uso];
    const r = await responderComoCris({ conversa: [{ de: "usuario", texto: "?" }], tela: null, dadosPermitidos: false, anexo: null, consultar: async () => "x" });
    expect(r.consultas).toBe(4);
    expect(r.texto).toMatch(/longa demais/);
  });
});

describe("Prompt AQ §5 — o que é colado chega ao modelo como está", () => {
  it("AQ-T9: uma tabela de 5 linhas × 3 colunas colada chega com as quebras de linha e as tabulações", async () => {
    const { historicoDaCris } = await import("@/lib/cris");
    const tabela = ["Obra\tMês\tValor", "A\t10/2026\t100", "B\t10/2026\t200", "C\t11/2026\t300", "D\t11/2026\t400"].join("\n");
    const conversa = historicoDaCris([{ de: "usuario", texto: `${tabela}\n` }])!;
    roteiro = [{ stop_reason: "end_turn", content: [{ type: "text", text: "ok", citations: null } as Anthropic.TextBlock] }];
    await responderComoCris({ conversa, tela: null, dadosPermitidos: false, anexo: null, consultar: async () => "" });
    const ultima = chamadas[0].messages.at(-1)!.content as Anthropic.TextBlockParam[];
    const texto = ultima.at(-1)!.text;
    expect(texto).toBe(tabela);
    expect(texto.split("\n")).toHaveLength(5);
    expect(texto.split("\n").every((l) => l.split("\t").length === 3)).toBe(true);
  });
});
