import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import * as XLSX from "xlsx";

/**
 * 0079 — a planilha de lançamentos (modelo, exportação e importação) usa o
 * Plano de Contas DA EMPRESA: contas ativas de despesa, com o código. Linha
 * com valor fora do plano recusa a importação; a categoria da DRE vem da
 * conta quando a chave `despesa_categoria_do_plano` está ligada.
 * Integração: só com DATABASE_URL.
 */
const HAS_DB = !!process.env.DATABASE_URL;
const ctxRef: { current: unknown } = { current: null };
vi.mock("@/lib/context", async (orig) => ({
  ...(await orig<typeof import("@/lib/context")>()),
  getTenantContext: async () => ctxRef.current,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));
vi.mock("server-only", () => ({}));

describe.skipIf(!HAS_DB)("Planilha de lançamentos com o plano da empresa (0079)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { instalarPlanoPadrao } = await import("@/lib/planocontas-padrao");
  const { planilhaDaEmpresa } = await import("@/lib/planocontas-servidor");
  const { buildTemplateBuffer, parseWorkbook, SHEETS } = await import("@/lib/xlsx/growth-template");
  const { importVersionData } = await import("./version-io");
  let tenantId = "";
  let atualId = "";

  const importar = (buf: Buffer) => {
    const fd = new FormData();
    fd.set("versionId", atualId);
    fd.set("file", new File([new Uint8Array(buf)], "p.xlsx"));
    return importVersionData(fd);
  };
  /** Modelo da empresa com um valor na 1ª coluna de mês da linha da conta. */
  const modeloCom = async (valores: Record<string, number>, trocarCodigo?: [string, string]) => {
    const tmpl = XLSX.read(buildTemplateBuffer([{ m: "01/2026", mo: 0, ac: 0 }], await planilhaDaEmpresa(tenantId)), { type: "buffer" });
    const aoa = XLSX.utils.sheet_to_json(tmpl.Sheets[SHEETS.despesas], { header: 1 }) as unknown[][];
    for (const r of aoa.slice(1)) {
      if (trocarCodigo && r[2] === trocarCodigo[0]) r[2] = trocarCodigo[1];
      const v = valores[String(r[2])];
      if (v) r[3] = v;
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, tmpl.Sheets[SHEETS.parametros], SHEETS.parametros);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), SHEETS.despesas);
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  };
  const conta = async (nome: string) =>
    (await db.select().from(schema.chartAccounts).where(and(eq(schema.chartAccounts.tenantId, tenantId), eq(schema.chartAccounts.name, nome))))[0];

  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "planilha-0079" }).returning();
    tenantId = t.id;
    await instalarPlanoPadrao(tenantId, db, undefined, "teste");
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "PROJ PLANILHA" }).returning();
    const [v] = await db.insert(schema.versions).values({ projectId: p.id, tenantId, key: "atual", kind: "atual", label: "atual", color: "#000" }).returning();
    atualId = v.id;
    ctxRef.current = { tenant: t, projects: [p], userId: null, userEmail: null, role: "owner", perms: defaultPermissions("owner") };
  });
  afterAll(async () => {
    if (tenantId) await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("o modelo traz as contas ativas de despesa da empresa — inclusive a criada por ela — e não as de receita nem as inativas", async () => {
    const aluguel = await conta("Aluguel");
    await db.insert(schema.chartAccounts).values({ tenantId, code: `${aluguel.groupCode}.90`, name: "Conta própria da empresa", groupCode: aluguel.groupCode, groupName: aluguel.groupName, kind: aluguel.kind, natureza: "despesa", dreCategory: "Despesa Fixa" });
    const inativa = await conta("Hospedagens");
    await db.update(schema.chartAccounts).set({ ativo: false }).where(eq(schema.chartAccounts.id, inativa.id));

    const codigos = (await planilhaDaEmpresa(tenantId)).flatMap((g) => g.contas.map((c) => c.code));
    expect(codigos).toContain(`${aluguel.groupCode}.90`);
    expect(codigos).not.toContain(inativa.code);
    const receitas = await db.select().from(schema.chartAccounts).where(and(eq(schema.chartAccounts.tenantId, tenantId), eq(schema.chartAccounts.natureza, "receita")));
    expect(receitas.length).toBeGreaterThan(0);
    for (const r of receitas) expect(codigos).not.toContain(r.code);

    await db.update(schema.chartAccounts).set({ ativo: true }).where(eq(schema.chartAccounts.id, inativa.id));
  });

  it("linha com valor fora do plano: recusa a importação inteira, nada gravado", async () => {
    const aluguel = await conta("Aluguel");
    const energia = await conta("Energia elétrica");
    // a linha de Energia passa a apontar um código que a empresa não tem
    const buf = await modeloCom({ [aluguel.code]: 1000, "X.99": 50 }, [energia.code, "X.99"]);
    expect(parseWorkbook(buf, await planilhaDaEmpresa(tenantId)).despesasSemConta.length).toBeGreaterThan(0);
    const r = await importar(buf);
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toMatch(/não são contas ativas do Plano de Contas/);
    expect(await db.select().from(schema.despesas).where(eq(schema.despesas.versionId, atualId))).toHaveLength(0);
  });

  it("importa na conta certa, com a categoria da conta (chave ligada pelo plano padrão)", async () => {
    const aluguel = await conta("Aluguel");
    const hosp = await conta("Hospedagens");
    const r = await importar(await modeloCom({ [aluguel.code]: 1000, [hosp.code]: 300 }));
    expect(r).toMatchObject({ ok: true, result: { despesas: 2 } });
    const gravadas = await db.select().from(schema.despesas).where(eq(schema.despesas.versionId, atualId));
    const por = new Map(gravadas.map((d) => [d.contaCef, d]));
    expect(por.get(aluguel.code)).toMatchObject({ categoriaDre: "Despesa Fixa", valor: "1000.00", competencia: "01/2026" });
    expect(por.get(hosp.code)).toMatchObject({ categoriaDre: "Custo Variável", valor: "300.00" });
  });
});
