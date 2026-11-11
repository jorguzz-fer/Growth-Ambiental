import { describe, it, expect } from "vitest";
import {
  MAX_DADOS_DA_TELA,
  anexoValido,
  blocoDaTela,
  contextoValido,
  dadosParaOModelo,
  historicoDaCris,
  propostaValida,
  regrasDaCris,
  sanitizarDados,
  trechosDaCris,
  type FormularioDaTela,
} from "./cris";

const FORM: FormularioDaTela = {
  id: "despesa",
  titulo: "Nova despesa",
  campos: [
    { nome: "valor", rotulo: "Valor", tipo: "numero" },
    { nome: "vencimento", rotulo: "Vencimento", tipo: "data", dica: "MM/DD/YYYY" },
    { nome: "status", rotulo: "Status", tipo: "opcao", opcoes: ["A pagar", "Pago"] },
    { nome: "obs", rotulo: "Observação", tipo: "texto" },
  ],
};

describe("Prompt E2 — Cris, regras puras", () => {
  it("o resumo da tela perde dado pessoal, função e excesso", () => {
    const limpo = sanitizarDados({ receita: 1000.456, cpf: "123", clienteEmail: "a@b", contas: [{ banco: "X", agencia: "1", saldo: 5 }], f: () => 1 }) as Record<string, unknown>;
    expect(limpo).toEqual({ receita: 1000.46, contas: [{ banco: "X", saldo: 5 }] });
    const grande = { linhas: Array.from({ length: 120 }, (_, i) => ({ item: "x".repeat(200), i })) };
    expect(dadosParaOModelo(grande)!.length).toBeLessThanOrEqual(MAX_DADOS_DA_TELA + 40);
    expect(dadosParaOModelo({})).toBeNull();
  });

  it("contexto só de rota conhecida; formulário só com campos válidos", () => {
    expect(contextoValido({ rota: "/inexistente", titulo: "x" })).toBeNull();
    const c = contextoValido({ rota: "/despesas?proj=1", titulo: "Despesas", formulario: { ...FORM, campos: [...FORM.campos, { nome: 1 }] } })!;
    expect(c.rota).toBe("/despesas");
    expect(c.formulario!.campos.map((x) => x.nome)).toEqual(["valor", "vencimento", "status", "obs"]);
    expect(contextoValido({ rota: "/dre", titulo: "DRE", sugestoes: ["a", 2] })!.sugestoes).toEqual(["a"]);
  });

  it("histórico: começa e termina pela pessoa, sem falas vazias", () => {
    expect(historicoDaCris([{ de: "cris", texto: "oi" }])).toBeNull();
    expect(historicoDaCris([{ de: "cris", texto: "oi" }, { de: "usuario", texto: " quanto? " }])).toEqual([{ de: "usuario", texto: "quanto?" }]);
    expect(historicoDaCris([{ de: "hacker", texto: "x" }])).toBeNull();
  });

  it("anexo: só PDF e imagem, base64 válido e até 4 MB", () => {
    expect(anexoValido({ tipo: "application/pdf", base64: "JVBERi0=", nome: "nota.pdf" })).toMatchObject({ tipo: "application/pdf" });
    expect(anexoValido({ tipo: "text/html", base64: "PGh0bWw+" })).toBeNull();
    expect(anexoValido({ tipo: "image/png", base64: "não é base64!" })).toBeNull();
    expect(anexoValido({ tipo: "image/png", base64: "A".repeat(6 * 1024 * 1024) })).toBeNull();
  });

  it("proposta: só campos do formulário, opção aceita, número normalizado", () => {
    const p = propostaValida(
      { valores: { valor: "R$ 1.234,50", status: "pago", vencimento: "10/20/2026", inventado: "x", obs: "" }, conferir: { vencimento: "deduzi do boleto", fora: "x" }, observacao: "ok" },
      FORM,
    )!;
    expect(p.valores).toEqual({ valor: "1234.5", status: "Pago", vencimento: "10/20/2026" });
    expect(p.conferir).toEqual({ vencimento: "deduzi do boleto" });
    expect(propostaValida({ valores: { status: "Talvez" } }, FORM)).toBeNull();
    expect(propostaValida({ valores: { valor: "10" } }, null)).toBeNull();
  });

  it("bloco da tela: números só com permissão; o formulário vai junto", () => {
    const ctx = { rota: "/despesas", titulo: "Despesas", dados: { total: 10 }, formulario: FORM };
    expect(blocoDaTela(ctx, true)).toContain('"total":10');
    expect(blocoDaTela(ctx, false)).not.toContain('"total"');
    expect(blocoDaTela(ctx, false)).toContain('<formulario id="despesa"');
    expect(blocoDaTela(null, true)).toContain("não está numa tela registrada");
  });

  it("links só para rotas que existem; as regras dizem que a Cris não grava", () => {
    const t = trechosDaCris("Veja [Despesas](/despesas?tab=semnf) e [Nada](/nao-existe).");
    expect(t).toContainEqual({ tipo: "link", texto: "Despesas", href: "/despesas?tab=semnf" });
    expect(t).toContainEqual({ tipo: "texto", texto: "Nada" });
    expect(regrasDaCris()).toMatch(/não grava/);
    expect(regrasDaCris()).toMatch(/Nunca invente número/);
  });
});

describe("Prompt AQ §3 — formatação da resposta sem Markdown cru", () => {
  it("AQ-T4: **X:** vira negrito; '- item' vira item de lista; link no item continua link; rota desconhecida é texto", () => {
    const t = trechosDaCris("**Análises e números:** veja abaixo\n- Abra [Despesas](/despesas)\n- Rota [Nada](/nao-existe)\n- **Saldo**: em [Caixa](/caixa)");
    expect(t[0]).toEqual({ tipo: "negrito", texto: "Análises e números:" });
    expect(t[1]).toEqual({ tipo: "texto", texto: " veja abaixo" });
    const itens = t.filter((x) => x.tipo === "item");
    expect(itens).toHaveLength(3);
    expect(itens[0]).toEqual({ tipo: "item", trechos: [{ tipo: "texto", texto: "Abra " }, { tipo: "link", texto: "Despesas", href: "/despesas" }] });
    expect(itens[1]).toEqual({ tipo: "item", trechos: [{ tipo: "texto", texto: "Rota " }, { tipo: "texto", texto: "Nada" }] });
    expect(itens[2]).toEqual({ tipo: "item", trechos: [{ tipo: "negrito", texto: "Saldo" }, { tipo: "texto", texto: ": em " }, { tipo: "link", texto: "Caixa", href: "/caixa" }] });
    // nenhum asterisco sobra em lugar nenhum
    expect(JSON.stringify(t)).not.toContain("*");
  });

  it("quebra de linha entre linhas comuns é preservada; título, tabela, código e itálico perdem os símbolos", () => {
    const t = trechosDaCris("## Resumo\nlinha 1\nlinha 2\n```\nconst x = 1\n```\n| Obra | Saldo |\n|---|---:|\n| A | 10 |\nUse `consultar_numero` e *veja* o _total_.");
    const texto = t.map((x) => (x.tipo === "item" ? "" : x.texto)).join("");
    expect(texto).toBe("Resumo\nlinha 1\nlinha 2\nconst x = 1\nObra · Saldo\nA · 10\nUse consultar_numero e veja o _total_.");
  });

  it("AQ-T5: HTML e <script> continuam texto (nenhum trecho vira marcação)", () => {
    const t = trechosDaCris('<script>alert(1)</script> e <b onclick="x">oi</b>\n- <img src=x onerror=alert(1)>');
    expect(t[0]).toEqual({ tipo: "texto", texto: '<script>alert(1)</script> e <b onclick="x">oi</b>' });
    expect(t[1]).toEqual({ tipo: "item", trechos: [{ tipo: "texto", texto: "<img src=x onerror=alert(1)>" }] });
    expect(trechosDaCris("[clique](javascript:alert(1))")).toEqual([{ tipo: "texto", texto: "[clique](javascript:alert(1))" }]);
  });
});

describe("Prompt AQ §4 — o que não muda", () => {
  it("AQ-T6: a Cris não importa action de escrita nem grava no banco", async () => {
    const { readFileSync } = await import("node:fs");
    const importsDe = (arq: string) => [...readFileSync(arq, "utf8").matchAll(/^import\s[^;]*?from\s+"([^"]+)"/gm)].map((m) => m[1]);
    const permitidos = new Set([
      "@anthropic-ai/sdk",
      "@/lib/ai/client",
      "@/lib/assistente-base",
      "@/lib/assistente-chat",
      "@/lib/cris",
      "@/lib/context",
      "@/lib/permissions",
      "@/lib/nav-menu",
      "@/lib/ai/uso",
      "@/lib/ai/cris",
      "@/lib/chat-metricas",
    ]);
    for (const arq of ["src/lib/ai/cris.ts", "src/lib/actions/cris.ts"]) {
      const imps = importsDe(arq);
      expect(imps.length).toBeGreaterThan(0);
      // import novo exige revisão: se for action, não pode ser de escrita
      expect(imps.filter((i) => !permitidos.has(i))).toEqual([]);
      expect(imps.some((i) => i.startsWith("@/lib/actions/") || i.startsWith("./"))).toBe(false);
      expect(readFileSync(arq, "utf8")).not.toMatch(/\.(insert|update|delete)\(\s*schema\./);
    }
  });
});
