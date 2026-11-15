import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import * as XLSX from "xlsx";

/**
 * GA-9, Fase 2 — o calendário de meses não depende mais da tabela INCC.
 * Empresa nova SEM nenhuma linha em `incc_rate`: a exportação do Orçamento
 * sai com as colunas de mês, o modelo da planilha tem os meses, a grade de
 * lançamento e o Fluxo têm eixo. E o resultado é o mesmo com ou sem as
 * linhas INCC. Integração: só com DATABASE_URL.
 */
const HAS_DB = !!process.env.DATABASE_URL;
const ctxRef: { current: unknown } = { current: null };
vi.mock("@/lib/context", async (orig) => ({
  ...(await orig<typeof import("@/lib/context")>()),
  getTenantContext: async () => ctxRef.current,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));
vi.mock("server-only", () => ({}));

describe.skipIf(!HAS_DB)("GA-9 Fase 2 — calendário sem INCC (banco)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { provisionTenant } = await import("@/lib/tenant/provision");
  const { effectivePermissions } = await import("@/lib/permissions");
  const { getReceitaByProject, getDespesaLinhas } = await import("@/lib/queries");
  const { previaFluxoDefinicaoNova } = await import("@/lib/fluxo-caixa");
  const { DEFAULT_INCC } = await import("@/lib/calc/constants");
  const EMAIL = "ga9-calendario@exemplo.invalid";
  let tenantId = "";
  let projeto: typeof schema.projects.$inferSelect;
  let budget: typeof schema.versions.$inferSelect;
  const MESES_PADRAO = DEFAULT_INCC.map((r) => r.m);

  beforeAll(async () => {
    const r = await provisionTenant({ tenantName: "GA-9 calendário", ownerName: "Dono", ownerEmail: EMAIL, ownerPassword: "Senha@12345", projectName: "Projeto A" });
    if (!r.ok) throw new Error(r.error);
    tenantId = r.tenantId!;
    [projeto] = await db.select().from(schema.projects).where(eq(schema.projects.tenantId, tenantId));
    await db.update(schema.projects).set({ startDate: "03/01/2026", endDate: "02/28/2027" }).where(eq(schema.projects.id, projeto.id));
    projeto = { ...projeto, startDate: "03/01/2026", endDate: "02/28/2027" };
    [budget] = await db.select().from(schema.versions).where(eq(schema.versions.projectId, projeto.id)).then((vs) => vs.filter((v) => v.kind === "budget"));
    await db.insert(schema.budgetLines).values([
      { tenantId, versionId: budget.id, kind: "receita", rowKey: "Receita", mes: "04/2026", valor: "1000" },
      { tenantId, versionId: budget.id, kind: "despesa", rowKey: "2.1", mes: "05/2026", valor: "300" },
    ] as never);
    const [t] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, tenantId));
    ctxRef.current = { tenant: t, projects: [projeto], userId: null, userEmail: EMAIL, role: "owner", perms: effectivePermissions("owner", null) };
  });
  afterAll(async () => {
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
    await db.delete(schema.users).where(inArray(schema.users.email, [EMAIL]));
  });

  /** Tudo o que depende do calendário, lido como as telas leem. */
  const ler = async () => {
    const { GET: exportar } = await import("@/app/(app)/lancamento/export/route");
    const { GET: modelo } = await import("@/app/(app)/projeto/planilha/modelo/route");
    const res = await exportar(new Request(`http://x/lancamento/export?v=${budget.id}`));
    expect(res.status).toBe(200);
    const wb = XLSX.read(Buffer.from(await res.arrayBuffer()), { type: "buffer" });
    const abas = Object.fromEntries(wb.SheetNames.map((n) => [n, XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets[n], { header: 1, defval: "" })]));
    const resModelo = await modelo(new Request(`http://x/projeto/planilha/modelo?v=${budget.id}`));
    expect(resModelo.status).toBe(200);
    const wbModelo = XLSX.read(Buffer.from(await resModelo.arrayBuffer()), { type: "buffer" });
    const parametros = XLSX.utils.sheet_to_json<string[]>(wbModelo.Sheets[wbModelo.SheetNames[0]], { header: 1, defval: "" });
    const [fluxo] = await previaFluxoDefinicaoNova(tenantId, [projeto], 0);
    return {
      abas,
      mesesDoModelo: parametros.slice(1).map((l) => l[0]),
      receita: await getReceitaByProject(tenantId, "budget"),
      despesa: (await getDespesaLinhas(tenantId, "budget")).months,
      fluxo,
    };
  };

  it("com as linhas INCC (como hoje) e sem nenhuma: o mesmo resultado, com os 48 meses", async () => {
    const [{ n }] = await db.select({ n: schema.inccRates.id }).from(schema.inccRates).where(eq(schema.inccRates.tenantId, tenantId)).then((r) => [{ n: r.length }]);
    expect(n).toBe(48); // o provisionamento ainda grava a série (sai na Fase 3/4)
    const com = await ler();
    await db.delete(schema.inccRates).where(eq(schema.inccRates.tenantId, tenantId));
    const [{ m }] = await db.select({ m: schema.inccRates.id }).from(schema.inccRates).where(eq(schema.inccRates.tenantId, tenantId)).then((r) => [{ m: r.length }]);
    expect(m).toBe(0);
    const sem = await ler();
    expect(sem).toEqual(com);

    // Exportação do Orçamento: colunas de mês = os 48 meses padrão, com os valores lançados.
    const [cab, receita] = sem.abas.Receitas;
    expect(cab.slice(1)).toEqual(MESES_PADRAO);
    expect(receita[1 + MESES_PADRAO.indexOf("04/2026")]).toBe(1000);
    const despCab = sem.abas.Despesas[0];
    expect(despCab.slice(-48)).toEqual(MESES_PADRAO);
    // Modelo da planilha: a aba Parâmetros lista os meses.
    expect(sem.mesesDoModelo).toEqual(MESES_PADRAO);
    // Grade de lançamento: os meses partem do calendário (e seguem pelo horizonte).
    for (const ms of [sem.receita.months, sem.despesa]) {
      expect(ms[0]).toBe("05/2025");
      expect(ms).toEqual(expect.arrayContaining(MESES_PADRAO));
    }
    expect(sem.receita.rows.find((r) => r.projectId === projeto.id)?.values["04/2026"]).toBe(1000);
    // Fluxo (prévia da chave, mesmo eixo da tela): calculado sem erro.
    expect(sem.fluxo.temAtual).toBe(true);
  });

  it("lançamento fora da janela padrão não some da exportação", async () => {
    await db.insert(schema.budgetLines).values({ tenantId, versionId: budget.id, kind: "receita", rowKey: "Receita", mes: "06/2030", valor: "50" } as never);
    const { GET } = await import("@/app/(app)/lancamento/export/route");
    const wb = XLSX.read(Buffer.from(await (await GET(new Request(`http://x/lancamento/export?v=${budget.id}`))).arrayBuffer()), { type: "buffer" });
    const [cab, receita] = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets.Receitas, { header: 1, defval: "" });
    expect(cab.at(-1)).toBe("06/2030");
    expect(receita.at(-1)).toBe(50);
  });
});
