import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";

/**
 * GA-1 — empresa nova nasce pronta para consultoria ambiental. Postgres
 * isolado: provisionamento pelo caminho da plataforma, chaves de empresa nova,
 * chaves de incorporação sem efeito sem dados de incorporação, visibilidade em
 * /chaves, aviso de versão não aprovada e projeção sem Previsão aprovada.
 */
const HAS_DB = !!process.env.DATABASE_URL;
const ctxRef: { current: unknown } = { current: null };
vi.mock("@/lib/context", async (orig) => ({
  ...(await orig<typeof import("@/lib/context")>()),
  getTenantContext: async () => ctxRef.current,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));
vi.mock("server-only", () => ({}));

describe.skipIf(!HAS_DB)("GA-1 — empresa nova", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { provisionTenant } = await import("@/lib/tenant/provision");
  const { CHAVES, CHAVES_EMPRESA_NOVA, CHAVES_INCORPORACAO, LIGADA_NA_CRIACAO, chaveVisivel } = await import("@/lib/chaves");
  const { chaveLigada } = await import("@/lib/chaves-tenant");
  const { temDadosDeIncorporacao } = await import("@/lib/chaves-empresa-nova");
  const { saveBudgetPlanning, setVersionStatus } = await import("./planning");
  const { versionInputsByMonth } = await import("@/lib/dre-inputs");
  const { custoDe } = await import("@/lib/projecao-financeira");
  const { flowMaps } = await import("@/lib/fluxo-caixa");
  const { getStatusProjeto, getContasReceber, getReceivables } = await import("@/lib/queries");
  const { aReceberDaFaixaDaEmpresa } = await import("@/lib/recebimento-parcela");
  const { versoesForaDosRelatorios, avisoDeNaoAprovadas } = await import("@/lib/versoes-nao-aprovadas");
  const { projecaoDoProjeto } = await import("@/lib/projecao-financeira-dados");
  const { rotuloDaReceita } = await import("@/lib/dre-analitica");

  const EMAIL = "ga1-nova@exemplo.invalid";
  let tenantId = "";
  let projectId = "";
  let versoes: Record<string, typeof schema.versions.$inferSelect> = {};
  const ok = <T extends { ok: boolean }>(r: T) => {
    if (!r.ok) throw new Error((r as unknown as { error: string }).error);
    return r;
  };

  beforeAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.email, EMAIL));
    const r = await provisionTenant({ tenantName: "Consultoria GA-1 (teste)", ownerName: "Teste", ownerEmail: EMAIL, ownerPassword: "Senha@GA1-123", projectName: "Projeto GA-1" });
    if (!r.ok) throw new Error(r.error);
    tenantId = r.tenantId!;
    const [t] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, tenantId));
    const [p] = await db.select().from(schema.projects).where(eq(schema.projects.tenantId, tenantId));
    projectId = p.id;
    versoes = Object.fromEntries((await db.select().from(schema.versions).where(eq(schema.versions.projectId, p.id))).map((v) => [v.kind, v]));
    ctxRef.current = { tenant: t, projects: [p], userId: null, userEmail: EMAIL, role: "owner", perms: defaultPermissions("owner") };
    // Movimento de uma consultoria: fatura (conta a receber) e despesas na Atual.
    await db.insert(schema.contasReceber).values({ tenantId, projectId, valor: "50000", vencimento: "10/15/2026", descricao: "Medição 1" });
    await db.insert(schema.despesas).values([
      { tenantId, versionId: versoes.atual.id, valor: "12000", competencia: "10/2026", vencimento: "10/20/2026", categoriaDre: "Custo Variável", contaCef: "2.2.03", status: "A pagar" },
      { tenantId, versionId: versoes.atual.id, valor: "3000", competencia: "10/2026", vencimento: "10/10/2026", categoriaDre: "Despesa Fixa", contaCef: "3.1.01", status: "A pagar" },
    ]);
  });
  afterAll(async () => {
    if (tenantId) await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
    await db.delete(schema.users).where(eq(schema.users.email, EMAIL));
  });

  it("2 · nasce com exatamente as chaves de empresa nova, ligadas na criação; nenhuma de incorporação", async () => {
    const flags = await db.select().from(schema.tenantFlags).where(eq(schema.tenantFlags.tenantId, tenantId));
    expect(flags.filter((f) => f.ligada).map((f) => f.chave).sort()).toEqual([...CHAVES_EMPRESA_NOVA].sort());
    expect(flags.every((f) => f.alteradaPor === LIGADA_NA_CRIACAO)).toBe(true);
    for (const c of CHAVES_INCORPORACAO) expect(await chaveLigada(tenantId, c)).toBe(false);
  });

  it("5 · GA-11: a chave do Caixa por conta saiu (a Conciliação de Caixa vale para toda empresa)", async () => {
    expect(CHAVES.some((c) => (c.id as string) === "caixa_conciliacao_por_conta")).toBe(false);
    expect((CHAVES_EMPRESA_NOVA as readonly string[]).includes("caixa_conciliacao_por_conta")).toBe(false);
  });

  it("6 · sem dados de incorporação, ligar cada chave de incorporação não muda DRE, Fluxo, Dashboard, Resumo nem Contas a Receber", async () => {
    expect(await temDadosDeIncorporacao(tenantId)).toBe(false);
    const foto = async () => {
      const dre = await versionInputsByMonth(tenantId, versoes.atual.id, projectId, { definicaoNova: true });
      const fluxo = await flowMaps(versoes.atual, projectId);
      const contas = await getContasReceber(tenantId);
      return JSON.stringify({
        dreReceita: Object.values(dre).reduce((a, i) => a + i.receita, 0),
        dreCusto: Object.values(dre).reduce((a, i) => a + custoDe(i), 0),
        fluxo,
        dashboard: await getStatusProjeto(tenantId, [projectId], { definicaoNova: true }),
        contasReceber: contas.map((c) => [c.valor, c.valorRecebido, c.status]),
        recebiveisDeVenda: (await getReceivables(tenantId)).length,
        faixaDoCaixa: await aReceberDaFaixaDaEmpresa(tenantId, contas, await getReceivables(tenantId), "2026-11-14"),
      });
    };
    const antes = await foto();
    expect(antes).toContain("50000");
    for (const chave of CHAVES_INCORPORACAO) {
      await db.insert(schema.tenantFlags).values({ tenantId, chave, ligada: true, alteradaPor: "teste" });
      expect(await chaveLigada(tenantId, chave)).toBe(true);
      expect(await foto(), `ligar ${chave} mudou algum número`).toBe(antes);
      await db.delete(schema.tenantFlags).where(and(eq(schema.tenantFlags.tenantId, tenantId), eq(schema.tenantFlags.chave, chave)));
    }
  });

  it("7 · /chaves: sem dados de incorporação as chaves de incorporação somem; com uma unidade aparecem; ligada aparece sempre", async () => {
    const visiveis = (com: boolean, ligadas: Set<string> = new Set()) => CHAVES_INCORPORACAO.filter((id) => chaveVisivel(id, { comIncorporacao: com, ligada: ligadas.has(id) }));
    expect(visiveis(await temDadosDeIncorporacao(tenantId))).toEqual([]);
    expect(visiveis(false, new Set(["dre_receita_rateio"]))).toEqual(["dre_receita_rateio"]);
    expect(chaveVisivel("rascunho_fora_dos_relatorios", { comIncorporacao: false, ligada: false })).toBe(true);
    // uma unidade gravada (dado de incorporação) faz as chaves aparecerem
    const [u] = await db.insert(schema.units).values({ tenantId, versionId: versoes.atual.id, code: "UN-1", status: "Disponivel", valor: "1" }).returning();
    expect(visiveis(await temDadosDeIncorporacao(tenantId))).toEqual([...CHAVES_INCORPORACAO]);
    await db.delete(schema.units).where(eq(schema.units.id, u.id));
    // as linhas de INCC (o provisionamento cria) não contam
    const incc = await db.select({ id: schema.inccRates.id }).from(schema.inccRates).where(eq(schema.inccRates.tenantId, tenantId)).limit(1);
    expect(incc).toHaveLength(1);
    expect(await temDadosDeIncorporacao(tenantId)).toBe(false);
  });

  it("8 · /chaves não exibe o campo origem (Prompt, Parte, §)", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/app/(app)/chaves/page.tsx", "utf8");
    expect(src).not.toMatch(/\{c\.origem\}/);
    expect(src).not.toMatch(/Origem:/);
  });

  it("9 · Orçamento lançado em Rascunho fica fora e a tela avisa; depois de aprovado, o aviso some e o orçamento entra", async () => {
    ok(await saveBudgetPlanning(versoes.budget.id, "despesa", [{ rowKey: "2.2", dreCategory: "Custo Variável", total: 40000, months: [{ mes: "10/2026", pct: 50 }, { mes: "11/2026", pct: 50 }] }]));
    expect(await versoesForaDosRelatorios(tenantId, [projectId])).toEqual({ orcamento: 1, previsao: 0 });
    const aviso = await avisoDeNaoAprovadas(tenantId, [projectId]);
    expect(aviso).toEqual({ texto: "O Orçamento de 1 projeto ainda não foi aprovado e não entra aqui.", href: "/budget" });
    const custoOrcado = async () => Object.values(await versionInputsByMonth(tenantId, versoes.budget.id, projectId, { definicaoNova: true })).reduce((a, i) => a + custoDe(i), 0);
    expect(await custoOrcado()).toBe(0); // fora dos relatórios
    ok(await setVersionStatus(versoes.budget.id, "Concluído"));
    expect((await avisoDeNaoAprovadas(tenantId, [projectId]))?.texto).toMatch(/Orçamento de 1 projeto/); // Concluído ainda não entra
    ok(await setVersionStatus(versoes.budget.id, "Aprovado"));
    expect(await avisoDeNaoAprovadas(tenantId, [projectId])).toBeNull();
    expect(await custoOrcado()).toBe(40000);
  });

  it("10 · projeção ao término sem Previsão aprovada mostra \"sem Previsão aprovada\", nunca \"para concluir R$ 0,00\"", async () => {
    ok(await saveBudgetPlanning(versoes.forecast.id, "despesa", [{ rowKey: "2.2", dreCategory: "Custo Variável", total: 30000, months: [{ mes: "12/2026", pct: 100 }] }]));
    const p = await projecaoDoProjeto(tenantId, projectId, new Date(2026, 10, 14));
    expect(p!.semPrevisaoAprovada).toBe(true);
    expect((await versoesForaDosRelatorios(tenantId, [projectId])).previsao).toBe(1);
    const { renderToStaticMarkup } = await import("react-dom/server");
    const React = await import("react");
    const { createElement } = React;
    // O vitest compila TSX no modo clássico (React.createElement): o componente precisa de React no escopo global.
    (globalThis as unknown as { React: typeof React }).React = React;
    const { ProjecaoAoTermino } = await import("@/components/app/projecao-ao-termino");
    const html = renderToStaticMarkup(createElement(ProjecaoAoTermino, { p: p!, versoes: p!.versoes }));
    expect(html).toContain("sem Previsão aprovada");
    expect(html).not.toMatch(/Custo para concluir<\/td><td[^>]*>R\$\s*0</);
    // aprovada, a Previsão volta a ser a base do restante
    ok(await setVersionStatus(versoes.forecast.id, "Concluído"));
    ok(await setVersionStatus(versoes.forecast.id, "Aprovado"));
    const p2 = await projecaoDoProjeto(tenantId, projectId, new Date(2026, 10, 14));
    expect(p2!.semPrevisaoAprovada).toBe(false);
    expect(p2!.baseDoRestante).toBe("previsao");
    expect(p2!.custoParaConcluir).toBe(30000);
  });

  it("12 · os rótulos analíticos de empresa sem incorporação não citam permuta, liberação nem vendas", () => {
    expect(rotuloDaReceita(false)).toBe("Receitas (faturas e contas a receber)");
    expect(rotuloDaReceita(false)).not.toMatch(/permuta|libera|venda/i);
    expect(rotuloDaReceita(true)).toMatch(/vendas e liberações/);
  });
});
