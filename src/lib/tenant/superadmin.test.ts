import { describe, it, expect } from "vitest";
import { isSuperAdmin, superAdminEmails } from "./superadmin";

describe("operadores da plataforma vêm só do ambiente", () => {
  it("sem SUPERADMIN_EMAILS ninguém é operador (falha fechada)", () => {
    expect(superAdminEmails("")).toEqual([]);
    expect(isSuperAdmin("qualquer@exemplo.com", "")).toBe(false);
  });
  it("lista do ambiente, sem diferença de maiúsculas e espaços", () => {
    const env = " Operador@Exemplo.com , outro@exemplo.com.br,, lixo ";
    expect(superAdminEmails(env)).toEqual(["operador@exemplo.com", "outro@exemplo.com.br"]);
    expect(isSuperAdmin("OPERADOR@exemplo.com ", env)).toBe(true);
    expect(isSuperAdmin("intruso@exemplo.com", env)).toBe(false);
    expect(isSuperAdmin(null, env)).toBe(false);
  });
  it("o código não traz e-mail de operador", async () => {
    const { readFileSync } = await import("node:fs");
    const fonte = readFileSync(new URL("./superadmin.ts", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(fonte).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/);
  });
});
