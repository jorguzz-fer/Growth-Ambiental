import { describe, expect, it } from "vitest";
import { onlyDigits, parseAllowlist, phoneVariants, secretsMatch } from "./auth";

describe("onlyDigits", () => {
  it("descarta +, espaço, parênteses e hífen", () => {
    expect(onlyDigits("+55 (11) 90000-0001")).toBe("5511900000001");
  });

  it("aceita nulo e vazio", () => {
    expect(onlyDigits(null)).toBe("");
    expect(onlyDigits(undefined)).toBe("");
  });
});

describe("phoneVariants", () => {
  it("gera a variante SEM o nono dígito", () => {
    // O WhatsApp entrega com o 9; JIDs antigos vêm sem. Se só a forma crua
    // fosse comparada, o dono legítimo do número levaria 403.
    expect(phoneVariants("+5511900000001")).toEqual(["5511900000001", "551100000001"]);
  });

  it("gera a variante COM o nono dígito", () => {
    expect(phoneVariants("551100000001")).toEqual(["551100000001", "5511900000001"]);
  });

  it("não inventa variante para número não-brasileiro", () => {
    expect(phoneVariants("+1 415 555 2671")).toEqual(["14155552671"]);
  });

  it("devolve lista vazia para entrada sem dígito", () => {
    expect(phoneVariants("")).toEqual([]);
    expect(phoneVariants("{{contact_phone}}")).toEqual([]);
  });
});

describe("parseAllowlist", () => {
  it("lê pares telefone=email separados por vírgula", () => {
    const m = parseAllowlist("+5511900000001=operador@exemplo.com, +5511900000002=thiago@x.com");
    expect(m.get("5511900000001")).toBe("operador@exemplo.com");
    expect(m.get("5511900000002")).toBe("thiago@x.com");
  });

  it("indexa TODAS as variantes do número", () => {
    const m = parseAllowlist("+5511900000001=operador@exemplo.com");
    expect(m.get("551100000001")).toBe("operador@exemplo.com");
  });

  it("aceita ponto-e-vírgula, quebra de linha e ':' como separador", () => {
    const m = parseAllowlist("+5511900000001:a@x.com;\n+5511900000002=b@x.com");
    expect(m.get("5511900000001")).toBe("a@x.com");
    expect(m.get("5511900000002")).toBe("b@x.com");
  });

  it("normaliza o e-mail para minúsculas", () => {
    expect(parseAllowlist("5511900000001=Operador@Exemplo.com").get("5511900000001")).toBe(
      "operador@exemplo.com",
    );
  });

  it("ignora entrada malformada em vez de explodir", () => {
    const m = parseAllowlist("lixo, =semtelefone@x.com, 5511900000001=, ok=");
    expect(m.size).toBe(0);
  });

  it("env vazia ou ausente = ninguém autorizado", () => {
    expect(parseAllowlist(undefined).size).toBe(0);
    expect(parseAllowlist("").size).toBe(0);
  });
});

describe("secretsMatch", () => {
  it("aceita apenas o segredo idêntico", () => {
    expect(secretsMatch("abc123", "abc123")).toBe(true);
    expect(secretsMatch("abc123", "abc124")).toBe(false);
  });

  it("não estoura com comprimentos diferentes (compara hashes)", () => {
    expect(secretsMatch("curto", "muito-muito-mais-longo")).toBe(false);
  });

  it("string vazia nunca casa — nem contra vazio", () => {
    // Sem isto, AGENT_API_TOKEN ausente autenticaria requisição sem header.
    expect(secretsMatch("", "")).toBe(false);
    expect(secretsMatch("", "abc")).toBe(false);
  });
});
