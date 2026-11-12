import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";

/**
 * Revisão 4, Etapa 7 — a Cris lê os dados pelo catálogo de ferramentas de
 * leitura. AC-T1 (o caso do Thiago) e AC-T2 (a resposta não depende da tela).
 */
const HAS_DB = !!process.env.DATABASE_URL;
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));

describe("AC-T2: a análise não depende da tela aberta", () => {
  it("as ferramentas de dados vão em qualquer tela, e o executor não recebe a tela", () => {
    const acao = readFileSync("src/lib/actions/cris.ts", "utf8");
    // `dados` é passado sempre, sem condição de rota
    expect(acao).toMatch(/\n\s*dados: \(nome, e\) => executarFerramentaDeDados\(ctx, nome, e\),/);
    const motor = readFileSync("src/lib/ai/cris.ts", "utf8");
    expect(motor).toMatch(/\[FERRAMENTA_CONSULTA, \.\.\.\(p\.dados \? FERRAMENTAS_DE_DADOS : \[\]\)\]/);
    const dados = readFileSync("src/lib/cris-dados.ts", "utf8");
    expect(dados).toMatch(/export async function executarFerramentaDeDados\(ctx: TenantContext, nome: string, entrada: unknown\)/);
  });
});

describe.skipIf(!HAS_DB)("catálogo de leitura (Etapa 7)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { executarFerramentaDeDados } = await import("./cris-dados");
  const { versionInputsByMonth } = await import("@/lib/dre-inputs");
  let tenant: typeof schema.tenants.$inferSelect;
  const obras: Record<string, { project: typeof schema.projects.$inferSelect; atual: string }> = {};
  let ctx: Parameters<typeof executarFerramentaDeDados>[0];

  const despesa = (obra: string, categoriaDre: (typeof schema.despesas.$inferInsert)["categoriaDre"], valor: number, competencia: string) =>
    db.insert(schema.despesas).values({ tenantId: tenant.id, versionId: obras[obra].atual, valor: String(valor), categoriaDre, status: "A pagar", competencia, vencimento: `${competencia.slice(0, 2)}/10/${competencia.slice(3)}` });

  beforeAll(async () => {
    [tenant] = await db.insert(schema.tenants).values({ name: "Etapa7-dados" }).returning();
    for (const nome of ["Residencial Alfa", "Residencial Beta", "Escritório Central"]) {
      const [p] = await db.insert(schema.projects).values({ tenantId: tenant.id, name: nome }).returning();
      const [v] = await db.insert(schema.versions).values({ projectId: p.id, tenantId: tenant.id, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
      obras[nome] = { project: p, atual: v.id };
    }
    await despesa("Residencial Alfa", "Custo Variável", 30000, "09/2026");
    await despesa("Residencial Alfa", "Custo Variável", 15000, "10/2026");
    await despesa("Residencial Beta", "Custo Variável", 15000, "10/2026");
    await despesa("Residencial Alfa", "Custo Fixo", 5000, "10/2026");
    await despesa("Escritório Central", "Despesa Fixa", 8000, "10/2026");
    ctx = { tenant, projects: Object.values(obras).map((o) => o.project), userId: null, userEmail: "e7@teste", role: "owner", perms: defaultPermissions("owner") } as never;
  });
  afterAll(async () => {
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenant.id));
  });

  it("AC-T1: só as obras com custo variável, o valor de cada uma, o percentual sobre o total (soma 100%) e os mesmos números da DRE", async () => {
    const r = JSON.parse(await executarFerramentaDeDados(ctx, "custos_e_despesas_da_dre", { obras: [], de: "", ate: "", categorias: ["Custo Variável"], agrupar: "obra" }));
    expect(r.grupos.map((g: { obra: string }) => g.obra)).toEqual(["Residencial Alfa", "Residencial Beta"]);
    expect(r.grupos.map((g: { valor: number }) => g.valor)).toEqual([45000, 15000]);
    expect(r.total).toBe(60000);
    expect(r.grupos.map((g: { percentualDoTotal: number }) => g.percentualDoTotal)).toEqual([75, 25]);
    expect(r.grupos.reduce((a: number, g: { percentualDoTotal: number }) => a + g.percentualDoTotal, 0)).toBe(100);
    // os números batem com a DRE de cada obra na versão Atual
    for (const g of r.grupos as { obra: string; valor: number }[]) {
      const dre = await versionInputsByMonth(tenant.id, obras[g.obra].atual, obras[g.obra].project.id);
      expect(Object.values(dre).reduce((a, m) => a + m.custoVar, 0)).toBe(g.valor);
    }
    // com período, só as competências dele
    const out = JSON.parse(await executarFerramentaDeDados(ctx, "custos_e_despesas_da_dre", { obras: [], de: "10/2026", ate: "10/2026", categorias: ["Custo Variável"], agrupar: "obra" }));
    expect(out.grupos.map((g: { valor: number }) => g.valor)).toEqual([15000, 15000]);
  });

  it("agrupamentos e obras pedidas pelo nome (inclusive a não encontrada)", async () => {
    const r = JSON.parse(await executarFerramentaDeDados(ctx, "custos_e_despesas_da_dre", { obras: ["alfa", "Obra Fantasma"], de: "", ate: "", categorias: [], agrupar: "categoria" }));
    expect(r.grupos.map((g: { categoria: string; valor: number }) => [g.categoria, g.valor])).toEqual([["Custo Variável", 45000], ["Custo Fixo", 5000]]);
    expect(r.obrasNaoEncontradas).toEqual(["Obra Fantasma"]);
  });

  it("despesas por situação e por fornecedor; nunca mais de 30 grupos", async () => {
    const r = JSON.parse(await executarFerramentaDeDados(ctx, "despesas_por_fornecedor_ou_situacao", { obras: [], de: "", ate: "", situacao: "todas", agrupar: "obra" }));
    expect(r.total).toBe(73000);
    expect(r.grupos.length).toBeLessThanOrEqual(30);
  });

  it("sem permissão de leitura do módulo, a ferramenta não lê nada e diz por quê", async () => {
    const semDre = { ...ctx, perms: { ...ctx.perms, dre: { ...ctx.perms.dre, ver: false } } };
    const r = JSON.parse(await executarFerramentaDeDados(semDre as never, "custos_e_despesas_da_dre", { obras: [], de: "", ate: "", categorias: [], agrupar: "obra" }));
    expect(r.erro).toMatch(/não tem acesso/);
    expect(r.grupos).toBeUndefined();
  });

  it("dado pessoal fica fora: recebíveis sem nome de comprador", async () => {
    const [u] = await db.insert(schema.units).values({ tenantId: tenant.id, versionId: obras["Residencial Alfa"].atual, code: "A-101", status: "Vendido", valor: "300000", paymentPlan: { usarAS: true, AS: { val: 10000, venc: "09/10/2026", n: 1 } } as never }).returning();
    await db.insert(schema.clientes).values({ tenantId: tenant.id, unitCode: "A-101", nomeCompleto: "Maria Compradora da Silva" } as never);
    const txt = await executarFerramentaDeDados(ctx, "recebiveis_e_inadimplencia", { obras: [], de: "", ate: "", agrupar: "unidade", somente: "todas" });
    expect(txt).not.toMatch(/Maria/);
    expect(txt).toMatch(/A-101/);
    const un = JSON.parse(await executarFerramentaDeDados(ctx, "unidades_e_vendas", { obras: [], agrupar: "obra_situacao" }));
    expect(un.grupos[0]).toMatchObject({ obra: "Residencial Alfa", situacao: "Vendido", qtd: 1, valor: 300000 });
    expect(u.id).toBeTruthy();
  });

  it("montar_relatorio: a receita de Relatórios Customizados, com a obra que a pessoa vê", async () => {
    const r = JSON.parse(await executarFerramentaDeDados(ctx, "montar_relatorio", { titulo: "Custos por obra", fonte: "dreanalitica", colunas: "obra", cenarios: ["atual"], obra: "", de: "01/2026", ate: "12/2026", analiseVertical: false }));
    expect(r.link).toMatch(/^\/relatorios\?/);
    expect(r.link).toMatch(/fonte=dreanalitica/);
  });
});
