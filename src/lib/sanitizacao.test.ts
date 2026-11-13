import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * Auditoria de sanitização (docs/AUDITORIA_SANITIZACAO.md) — a rede que
 * impede dado real de voltar ao repositório. Varre TODO arquivo versionado
 * (código, testes, scripts, docs, configuração) e falha se aparecer:
 *  - arquivo compactado ou documento de diagnóstico de produção;
 *  - e-mail de provedor pessoal (gmail, hotmail…) ou de domínio que não seja
 *    claramente de exemplo;
 *  - celular brasileiro que não seja visivelmente fictício;
 *  - CPF ou CNPJ VÁLIDO fora da lista de identificadores sintéticos abaixo.
 *
 * A lista não traz nomes de empresas ou pessoas reais de propósito: um teste
 * que listasse os nomes proibidos os devolveria ao código. Nomes são cobertos
 * pela revisão manual registrada no relatório.
 */

/** Identificadores sintéticos aceitos (todos com dígito verificador válido). */
const CPF_SINTETICOS = new Set([
  "00000000191", "00000000272", "00000000353", // gerados para este repositório (raiz 000.000.00x)
  "11144477735", "12345678909", "45317828791", "52998224725", "98765432100", // exemplos públicos de documentação de validação
]);
const CNPJ_SINTETICOS = new Set([
  "00000001000136", "00000003000206", "00000004000170", // gerados para este repositório (raiz 00.000.00x)
  "11222333000181", "12345678000195", // exemplos públicos de documentação de validação
]);
/** Domínio de e-mail aceito: de exemplo, reservado ou local de teste. */
const DOMINIO_DE_EXEMPLO = /^(exemplo\.com(\.br)?|example\.(com|org)|x\.com(\.br)?|empresa\.com|[a-z0-9-]+\.local|teste?\.(com|local))$/i;
const PROVEDOR_PESSOAL = /@(gmail|googlemail|hotmail|outlook|live|yahoo|icloud|uol|bol|terra|ig)\.[a-z.]+/i;
/**
 * Celular: com DDI 55 (formatado ou não), ou com DDD entre parênteses ou
 * separado por espaço. 11 dígitos colados sem DDI são ambíguos com CPF e não
 * contam. Fictício = assinante 9 0000-xxxx, 9 9999-xxxx ou 9 8888-xxxx.
 */
const CELULAR = /(?<![\d.])(?:\+?55\s?\(?(\d{2})\)?\s?|\((\d{2})\)\s?|(\d{2})\s)(9\d{4})[-\s]?(\d{4})(?!\d)/g;
const celularFicticio = (assinante: string) => /^9(0000|9999|8888)/.test(assinante) || /^(\d)\1{4}$/.test(assinante);

function cpfValido(d: string): boolean {
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (const n of [9, 10]) {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    if ((r === 10 ? 0 : r) !== Number(d[n])) return false;
  }
  return true;
}
function cnpjValido(d: string): boolean {
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, ...w1];
  for (const [w, n] of [[w1, 12], [w2, 13]] as const) {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * w[i];
    const r = s % 11;
    if ((r < 2 ? 0 : 11 - r) !== Number(d[n])) return false;
  }
  return true;
}

const BINARIO = /\.(zip|gz|tgz|rar|7z|png|jpe?g|gif|webp|ico|pdf|xlsx?|docx?|woff2?)$/i;
const arquivos = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((f) => f !== "package-lock.json" && !f.includes("/migrations/meta/"));
const textos = arquivos.filter((f) => !BINARIO.test(f)).map((f) => ({ f, s: readFileSync(f, "utf8") }));

describe("sanitização — nada de dado real versionado", () => {
  it("varre arquivos de verdade (não passa por vacuidade)", () => {
    expect(textos.length).toBeGreaterThan(500);
  });

  it("sem arquivo compactado nem documento/script de diagnóstico de produção", () => {
    expect(arquivos.filter((f) => /\.(zip|gz|tgz|rar|7z)$/i.test(f))).toEqual([]);
    expect(arquivos.filter((f) => /DIAGNOSTICO-PRODUCAO|diagnostico-registros/i.test(f))).toEqual([]);
  });

  it("sem e-mail pessoal nem de domínio real", () => {
    const achados: string[] = [];
    for (const { f, s } of textos) {
      if (PROVEDOR_PESSOAL.test(s)) achados.push(`${f}: e-mail de provedor pessoal`);
      for (const m of s.matchAll(/[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g)) {
        if (/^[0-9.]+$/.test(m[1]) || /\.(ts|tsx|js|mjs|css|png|svg)$/i.test(m[1])) continue; // @versão, @import, pacotes
        if (!DOMINIO_DE_EXEMPLO.test(m[1])) achados.push(`${f}: domínio de e-mail não fictício (${m[1]})`);
      }
    }
    expect(achados).toEqual([]);
  });

  it("sem celular real (só números visivelmente fictícios)", () => {
    const achados: string[] = [];
    for (const { f, s } of textos)
      for (const m of s.matchAll(CELULAR)) if (!celularFicticio(m[4])) achados.push(`${f}: celular não fictício (DDD ${m[1] ?? m[2] ?? m[3]})`);
    expect(achados).toEqual([]);
  });

  it("CPF e CNPJ válidos só da lista de sintéticos", () => {
    const achados: string[] = [];
    for (const { f, s } of textos) {
      for (const m of s.matchAll(/(?<![\d.])(\d{3}\.?\d{3}\.?\d{3}-?\d{2})(?!\d)/g)) {
        const d = m[1].replace(/\D/g, "");
        if (cpfValido(d) && !CPF_SINTETICOS.has(d)) achados.push(`${f}: CPF válido fora da lista (${d.slice(0, 3)}…)`);
      }
      for (const m of s.matchAll(/(?<![\d.])(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})(?!\d)/g)) {
        const d = m[1].replace(/\D/g, "");
        if (cnpjValido(d) && !CNPJ_SINTETICOS.has(d)) achados.push(`${f}: CNPJ válido fora da lista (${d.slice(0, 2)}…)`);
      }
    }
    expect(achados).toEqual([]);
  });
});
