import { describe, it, expect } from "vitest";
import { CODIGOS_DE_ERRO_DE_VOZ, juntarDitado, ligarDitado, mensagemDoErroDeVoz, type Reconhecedor, type ResultadoDeFala } from "./voz-ditado";

/** Prompt AV (Revisão 4) — ditado por voz: dizer o que aconteceu, sem perder o que foi dito. */
describe("mensagemDoErroDeVoz (AV-T1)", () => {
  it("cada código conhecido tem mensagem própria, diferente da genérica", () => {
    const genérica = mensagemDoErroDeVoz("codigo-que-nao-existe");
    const codigos = ["no-speech", "audio-capture", "not-allowed", "service-not-allowed", "network", "aborted", "language-not-supported", "bad-grammar"];
    expect([...CODIGOS_DE_ERRO_DE_VOZ].sort()).toEqual([...codigos].sort());
    const mensagens = codigos.map(mensagemDoErroDeVoz);
    expect(new Set(mensagens).size).toBe(codigos.length);
    for (const m of mensagens) expect(m).not.toBe(genérica);
    expect(mensagemDoErroDeVoz("no-speech")).toBe("Não ouvi nada. Fale logo depois de tocar no 🎤.");
    expect(mensagemDoErroDeVoz("network")).toMatch(/serviço de voz do navegador não respondeu/);
  });

  it("código desconhecido: mensagem genérica, com o código para quem for relatar", () => {
    expect(mensagemDoErroDeVoz("xyz")).toBe("O ditado falhou (xyz). Tente de novo ou digite.");
    expect(mensagemDoErroDeVoz(null)).toBe("O ditado falhou. Tente de novo ou digite.");
  });
});

describe("juntarDitado (AV-T2)", () => {
  it("um espaço entre os dois, sem espaço duplo, sem apagar o texto atual", () => {
    expect(juntarDitado("", "lança cimento")).toBe("lança cimento");
    expect(juntarDitado("   ", "lança")).toBe("lança");
    expect(juntarDitado("pagar", "  duas mil  e trezentos  ")).toBe("pagar duas mil e trezentos");
    expect(juntarDitado("pagar ", "cimento")).toBe("pagar cimento");
    expect(juntarDitado("linha 1\n", "linha 2")).toBe("linha 1\nlinha 2");
    expect(juntarDitado("já digitado", "")).toBe("já digitado");
  });
});

describe("ligarDitado com um reconhecedor simulado (AV-T3)", () => {
  class Falso implements Reconhecedor {
    static ultimo: Falso;
    lang = "";
    continuous = true;
    interimResults = true;
    onresult: ((e: ResultadoDeFala) => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((e: { error: string }) => void) | null = null;
    iniciado = false;
    constructor() {
      Falso.ultimo = this;
    }
    start() {
      this.iniciado = true;
    }
    stop() {}
    falar(t: string, isFinal = true) {
      const r = Object.assign([{ transcript: t }], { isFinal });
      this.onresult?.({ results: [r], resultIndex: 0 });
    }
  }

  it("o texto reconhecido entra; o erro 'no-speech' depois vira mensagem, e o texto continua", () => {
    let campo = "valor:";
    const erros: string[] = [];
    let fim = false;
    const r = ligarDitado(Falso, { onTexto: (t) => (campo = juntarDitado(campo, t)), onErro: (m) => erros.push(m), onFim: () => (fim = true) });
    expect(r).toMatchObject({ lang: "pt-BR", continuous: false, interimResults: false });
    r.start();
    Falso.ultimo.falar("duas mil e trezentos");
    Falso.ultimo.falar("parcial", false); // parcial não entra
    Falso.ultimo.onerror?.({ error: "no-speech" });
    Falso.ultimo.onend?.();
    expect(campo).toBe("valor: duas mil e trezentos");
    expect(erros).toEqual(["Não ouvi nada. Fale logo depois de tocar no 🎤."]);
    expect(fim).toBe(true);
  });
});
