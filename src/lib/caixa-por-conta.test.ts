import { describe, it, expect, vi, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { urlDoCaixa } from "./caixa-url";

/**
 * Prompt AT §4 (Revisão 4) — o Caixa como tela de conciliação da empresa,
 * conta a conta (chave "caixa_conciliacao_por_conta").
 */
describe("AT-T12: sem seletor de obra, de versão e modo comparação", () => {
  const fonte = readFileSync("src/app/(app)/caixa/caixa-por-conta.tsx", "utf8");

  it("a tela por conta não usa ProjectPicker, VersionMultiSelect nem a comparação de versões", () => {
    for (const proibido of ["ProjectPicker", "VersionMultiSelect", "VersionCompareTable", "resolveCompareVersions", "lerSelecaoDeProjeto", "LembrarProjeto"]) {
      expect(fonte, proibido).not.toContain(proibido);
    }
  });

  it("?proj= e ?vs= de links antigos não entram na tela nem saem nos links dela (4.7)", () => {
    const page = readFileSync("src/app/(app)/caixa/page.tsx", "utf8");
    // A página repassa à tela por conta só aba, período e conta.
    expect(page).toMatch(/sp=\{\{ tab: sp\.tab, de: sp\.de, ate: sp\.ate, conta: sp\.conta \}\}/);
    expect(urlDoCaixa({ tab: "ajustes", conta: "c1", de: "01/01/2026", ate: "" })).toBe("/caixa?tab=ajustes&conta=c1&de=01%2F01%2F2026");
    expect(urlDoCaixa({})).toBe("/caixa");
    expect(urlDoCaixa({ tab: "conciliacao", conta: "" })).toBe("/caixa");
    expect(urlDoCaixa({ conta: "x" })).not.toMatch(/proj|vs=/);
  });
});

const HAS_DB = !!process.env.DATABASE_URL;
vi.mock("server-only", () => ({}));

describe.skipIf(!HAS_DB)("AT-T13: o filtro por conta (Caixa por conta)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { getConciliacaoData, getCashDaEmpresa } = await import("@/lib/queries");
  const tenants: string[] = [];
  afterAll(async () => {
    for (const id of tenants) await db.delete(schema.tenants).where(eq(schema.tenants.id, id));
  });

  it("com a conta X, pendentes e movimentos são só da conta X; sem conta, de todas — e das obras todas, com os sem obra", async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "AT-T13" }).returning();
    tenants.push(t.id);
    const versoes: string[] = [];
    for (const n of ["A", "B"]) {
      const [p] = await db.insert(schema.projects).values({ tenantId: t.id, name: `OBRA ${n}` }).returning();
      const [v] = await db.insert(schema.versions).values({ projectId: p.id, tenantId: t.id, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
      await db.insert(schema.versions).values({ projectId: p.id, tenantId: t.id, key: "budget", kind: "budget", label: "Orç", color: "#000" });
      versoes.push(v.id);
    }
    const [x] = await db.insert(schema.bankAccounts).values({ tenantId: t.id, banco: "X" }).returning();
    const [y] = await db.insert(schema.bankAccounts).values({ tenantId: t.id, banco: "Y" }).returning();
    await db.insert(schema.cashEntries).values([
      { tenantId: t.id, versionId: versoes[0], bankAccountId: x.id, data: "11/01/2026", valor: "-10", importHash: "a" },
      { tenantId: t.id, versionId: versoes[1], bankAccountId: x.id, data: "11/02/2026", valor: "20", importHash: "b" },
      { tenantId: t.id, versionId: null, bankAccountId: x.id, data: "11/03/2026", valor: "-30", importHash: "c" },
      { tenantId: t.id, versionId: versoes[1], bankAccountId: y.id, data: "11/04/2026", valor: "-40", importHash: "d" },
    ]);
    const todas = await getConciliacaoData(t.id, {});
    expect(todas.pendentes.map((m) => m.valor).sort((a, b) => a - b)).toEqual([-40, -30, -10]);
    expect(todas.pendentesEntrada.map((m) => m.valor)).toEqual([20]);
    const soX = await getConciliacaoData(t.id, { conta: x.id });
    expect(soX.pendentes.map((m) => m.valor).sort((a, b) => a - b)).toEqual([-30, -10]);
    expect(soX.pendentesEntrada.map((m) => m.valor)).toEqual([20]);
    const soY = await getConciliacaoData(t.id, { conta: y.id });
    expect(soY.pendentes.map((m) => m.valor)).toEqual([-40]);
    expect(soY.pendentesEntrada).toEqual([]);
    // a tabela "Todos os lançamentos" lê o caixa da empresa: as obras todas e o sem obra
    expect((await getCashDaEmpresa(t.id)).map((c) => Number(c.valor)).sort((a, b) => a - b)).toEqual([-40, -30, -10, 20]);
  });
});
