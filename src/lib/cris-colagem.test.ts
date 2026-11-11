import { describe, it, expect } from "vitest";
import { ERRO_ANEXO_GRANDE, ERRO_ANEXO_TIPO, avisoDoLimite, classificarColagem, limitarMensagem, validarAnexo } from "./cris-colagem";
import { MAX_ANEXO_BYTES, MAX_MENSAGEM, historicoDaCris } from "./cris";

/** Prompt AQ §5 (Revisão 4) — colar no chat da Cris. */
const texto = { kind: "string" as const, type: "text/plain" };
const html = { kind: "string" as const, type: "text/html" };
const arquivo = (type: string, size = 50_000) => ({ kind: "file" as const, type, size });

describe("classificarColagem (AQ-T7)", () => {
  it("texto simples e texto com quebras e tabulações: texto", () => {
    expect(classificarColagem([texto], "pagar o cimento")).toEqual({ tipo: "texto" });
    expect(classificarColagem([texto, html], "Obra\tSaldo\nA\t10\nB\t20")).toEqual({ tipo: "texto" });
  });

  it("imagem PNG (print) e PDF: anexo, com o índice do item", () => {
    expect(classificarColagem([arquivo("image/png")])).toEqual({ tipo: "anexo", indice: 0 });
    expect(classificarColagem([html, arquivo("application/pdf")], "")).toEqual({ tipo: "anexo", indice: 1 });
    // arquivo copiado do explorador: vem com o nome dele como texto de uma linha
    expect(classificarColagem([texto, arquivo("image/jpeg")], "nota-fiscal.jpg")).toEqual({ tipo: "anexo", indice: 1 });
  });

  it("tabela do Excel (texto com tabulação + imagem da tabela): texto, não a imagem", () => {
    expect(classificarColagem([texto, html, arquivo("image/png")], "Mês\tValor\n10/2026\t500\n")).toEqual({ tipo: "texto" });
  });

  it("tipo não aceito e imagem acima de 4 MB: recusa com a mesma mensagem do 📎", () => {
    expect(classificarColagem([arquivo("application/vnd.openxmlformats-officedocument.wordprocessingml.document")])).toEqual({ tipo: "recusado", motivo: ERRO_ANEXO_TIPO });
    expect(classificarColagem([arquivo("image/png", MAX_ANEXO_BYTES + 1)])).toEqual({ tipo: "recusado", motivo: ERRO_ANEXO_GRANDE });
    expect(classificarColagem([arquivo("image/png", MAX_ANEXO_BYTES)])).toEqual({ tipo: "anexo", indice: 0 });
  });

  it("o 📎, o colar e o soltar usam a mesma validação", () => {
    expect(validarAnexo({ type: "image/webp", size: 10 })).toBeNull();
    expect(validarAnexo({ type: "text/plain", size: 10 })).toBe(ERRO_ANEXO_TIPO);
    expect(validarAnexo({ type: "application/pdf", size: MAX_ANEXO_BYTES + 1 })).toBe(ERRO_ANEXO_GRANDE);
  });
});

describe("limite da mensagem (AQ-T8)", () => {
  it("o limite é 6.000, igual no cliente e no servidor", () => {
    expect(MAX_MENSAGEM).toBe(6000);
  });

  it("6.001 caracteres: o cliente corta em 6.000 e avisa que 1 ficou de fora", () => {
    const r = limitarMensagem("x".repeat(6001));
    expect(r).toEqual({ texto: "x".repeat(6000), foraDoLimite: 1 });
    expect(avisoDoLimite(r.foraDoLimite)).toBe("A mensagem passa do limite de 6.000 caracteres: 1 caractere ficou de fora.");
    expect(avisoDoLimite(limitarMensagem("y".repeat(7500)).foraDoLimite)).toMatch(/1\.500 caracteres ficaram de fora/);
    expect(limitarMensagem("ok")).toEqual({ texto: "ok", foraDoLimite: 0 });
    expect(avisoDoLimite(0)).toBeNull();
  });

  it("o servidor corta no mesmo limite, nunca em outro", () => {
    const h = historicoDaCris([{ de: "usuario", texto: "z".repeat(6001) }]);
    expect(h?.[0].texto.length).toBe(6000);
  });
});
