import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { and, asc, eq } from "drizzle-orm";

/**
 * Prompt AA, 8.2/8.3/8.5/4-B.5 — getStatusProjeto e getIndicadoresObra passam
 * a filtrar no SQL, com o tenant explícito. ORÁCULO: as funções como eram
 * antes do AA-1 (copiadas abaixo, sem mudança) devolvem os MESMOS números.
 * Integração: só com DATABASE_URL.
 */
const HAS_DB = !!process.env.DATABASE_URL;
vi.mock("@/lib/context", async (orig) => ({ ...(await orig<typeof import("@/lib/context")>()), getTenantContext: async () => null }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));
vi.mock("server-only", () => ({}));

describe.skipIf(!HAS_DB)("Prompt AA-1 — mesmos números do Dashboard (oráculo)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { getMonthlyRevenue, getStatusProjeto, getIndicadoresObra } = await import("./queries");
  const { calcBdi, calcEvolucao, calcIncidencias, calcProvisionamento, custoReferencial } = await import("./calc/medicao-bdi");

  // ── ORÁCULO: o código de antes, literal ──────────────────────────────────
  async function indicadoresAntes(
    tenantId: string,
    projectId: string,
  ): Promise<Record<string, unknown>> {
    const [proj] = await db
      .select()
      .from(schema.projects)
      .where(and(eq(schema.projects.id, projectId), eq(schema.projects.tenantId, tenantId)))
      .limit(1);

    const servicoRows = proj
      ? await db
          .select()
          .from(schema.servicos)
          .where(eq(schema.servicos.projectId, projectId))
          .orderBy(asc(schema.servicos.ordem))
      : [];
    const servicoIds = servicoRows.map((s) => s.id);
    const medRows =
      servicoIds.length > 0
        ? await db
            .select()
            .from(schema.medicaoServicos)
            .where(eq(schema.medicaoServicos.tenantId, tenantId))
        : [];

    const num = (v: unknown) => Number(v) || 0;
    const financiamentoConstrucao = num(proj?.financiamentoConstrucao);
    const financiamentoTerreno = num(proj?.financiamentoTerreno);
    const cub = num(proj?.cub);
    const metragem = num(proj?.metragem);
    const pctBdi = num(proj?.pctBdi);
    const pctTaxa = num(proj?.pctTaxaLiberacao);
    const parcelaReferencia = num(proj?.parcelaReferencia);

    const servicos = servicoRows.map((s) => ({
      id: s.id,
      nome: s.nome,
      custoProposto: num(s.custoProposto),
      limiteMin: s.limiteMin == null ? null : num(s.limiteMin),
      limiteMax: s.limiteMax == null ? null : num(s.limiteMax),
    }));

    const incid = calcIncidencias(servicos);
    const bdi = calcBdi(servicos, pctBdi);
    const custoRef = custoReferencial(cub, metragem);

    const medicoes = medRows
      .filter((m) => servicoIds.includes(m.servicoId))
      .map((m) => ({
        servicoId: m.servicoId,
        competencia: m.competencia,
        pctExecutadoAcum: num(m.pctExecutadoAcum),
      }));
    const evolucao = calcEvolucao(servicos, medicoes);
    const provis = calcProvisionamento(evolucao, {
      financiamentoConstrucao,
      financiamentoTerreno,
      custoReferencial: custoRef,
      parcelaReferencia,
      pctTaxa,
    });
    const ultimo = provis[provis.length - 1];
    const ultimaEvol = evolucao[evolucao.length - 1];

    return {
      financiamentoConstrucao,
      financiamentoTerreno,
      totalAquisicao: financiamentoConstrucao + financiamentoTerreno,
      cub,
      metragem,
      custoReferencial: custoRef,
      parcelaReferencia,
      pctBdi,
      pctTaxa,
      tipoExecutor: proj?.tipoExecutor ?? null,
      custoTotalServicos: bdi.custoTotalServicos,
      valorBdi: bdi.valorBdi,
      custoTotalComBdi: bdi.custoTotalComBdi,
      servicosForaDosLimites: incid.filter(
        (s) => s.status === "Abaixo do mínimo" || s.status === "Acima do máximo",
      ).length,
      qtdServicos: servicos.length,
      evolucaoAcumulada: ultimaEvol?.acumulado ?? 0,
      evolucaoMes: ultimaEvol?.variacao ?? 0,
      liberacaoMes: ultimo?.liberacao ?? 0,
      liberacaoAcumulada: ultimo?.liberacaoAcumulada ?? financiamentoTerreno,
      saldoFinanciamento:
        ultimo?.saldoFinanciamento ?? financiamentoConstrucao,
      custoEstimadoMes: ultimo?.custoEstimado ?? 0,
      geracaoCaixaMes: ultimo?.caixa ?? 0,
      pctRecebido: ultimo?.pctRecebido ?? 0,
      temMedicao: evolucao.length > 0,
      temParametros: financiamentoConstrucao > 0 || cub > 0 || pctBdi > 0,
    };
  }


  async function statusAntes(
    tenantId: string,
    projectIds: string[],
  ): Promise<Record<string, number>> {
    if (projectIds.length === 0) {
      return {
        receitaPrevista: 0, recebido: 0, pctRecebido: 0,
        despesaPrevista: 0, executado: 0, pctExecutado: 0,
        margemContribuicao: 0, pctMargem: 0,
        receitaAtual: 0, custoVariavel: 0, despesaVariavel: 0,
        metragem: 0, custoPorM2: 0, receitaPorM2: 0,
      };
    }

    const [projs, versoes] = await Promise.all([
      db.select().from(schema.projects).where(eq(schema.projects.tenantId, tenantId)),
      db.select().from(schema.versions).where(eq(schema.versions.tenantId, tenantId)),
    ]);
    const doProjeto = <T extends { projectId: string }>(xs: T[]) =>
      xs.filter((x) => projectIds.includes(x.projectId));

    const num = (v: unknown) => Number(v) || 0;

    // Receita prevista = valor global de venda informado no cadastro do projeto.
    const receitaPrevista = projs
      .filter((p) => projectIds.includes(p.id))
      .reduce((a, p) => a + num(p.valorConstrucao) + num(p.valorTerreno), 0);

    const versoesProj = doProjeto(versoes);
    const idsAtual = versoesProj.filter((v) => v.kind === "atual").map((v) => v.id);
    const idsBudget = versoesProj.filter((v) => v.kind === "budget").map((v) => v.id);
    const todosIds = versoesProj.map((v) => v.id);

    const [cashRows, despRows, budgetRows] = await Promise.all([
      todosIds.length
        ? db.select({ valor: schema.cashEntries.valor, versionId: schema.cashEntries.versionId })
            .from(schema.cashEntries)
            .where(eq(schema.cashEntries.tenantId, tenantId))
        : Promise.resolve([]),
      db.select({
          valor: schema.despesas.valor,
          categoriaDre: schema.despesas.categoriaDre,
          cancelado: schema.despesas.cancelado,
          versionId: schema.despesas.versionId,
        })
        .from(schema.despesas)
        .where(eq(schema.despesas.tenantId, tenantId)),
      db.select({ valor: schema.budgetLines.valor, versionId: schema.budgetLines.versionId })
        .from(schema.budgetLines)
        .where(and(eq(schema.budgetLines.tenantId, tenantId), eq(schema.budgetLines.kind, "despesa")))
        .catch(() => []),
    ]);

    // Recebido = entradas de caixa das versões do projeto.
    const recebido = cashRows
      .filter((c) => c.versionId != null && todosIds.includes(c.versionId) && num(c.valor) > 0)
      .reduce((a, c) => a + num(c.valor), 0);

    // Despesa prevista = planejamento da versão Budget.
    const despesaPrevista = budgetRows
      .filter((b) => idsBudget.includes(b.versionId))
      .reduce((a, b) => a + num(b.valor), 0);

    // Executado = despesas lançadas na versão Atual, exceto canceladas.
    const daAtual = despRows.filter(
      (d) => idsAtual.includes(d.versionId) && !d.cancelado,
    );
    const executado = daAtual.reduce((a, d) => a + num(d.valor), 0);
    const porCat = (cat: string) =>
      daAtual.filter((d) => d.categoriaDre === cat).reduce((a, d) => a + num(d.valor), 0);
    const custoVariavel = porCat("Custo Variável");
    const despesaVariavel = porCat("Despesa Variável");

    // Receita realizada da versão Atual (mesma fonte da DRE).
    let receitaAtual = 0;
    for (const pid of projectIds) {
      const vid = versoesProj.find((v) => v.projectId === pid && v.kind === "atual")?.id;
      if (!vid) continue;
      const mensal = await getMonthlyRevenue(vid, pid);
      receitaAtual += Object.values(mensal).reduce((a, v) => a + v, 0);
    }

    // Definição de negócio confirmada pelo cliente:
    // Margem de Contribuição = Receita − Custo Variável − Despesa Variável.
    const margemContribuicao = receitaAtual - custoVariavel - despesaVariavel;
    const razao = (n: number, d: number) => (d > 0 ? n / d : 0);

    // Metragem total dos projetos selecionados (cadastro do projeto).
    const metragem = projs
      .filter((p) => projectIds.includes(p.id))
      .reduce((a, p) => a + num(p.metragem), 0);

    return {
      receitaPrevista,
      recebido,
      pctRecebido: razao(recebido, receitaPrevista),
      despesaPrevista,
      executado,
      pctExecutado: razao(executado, despesaPrevista),
      margemContribuicao,
      // %MC = MC ÷ Receita Total do Projeto (cadastro).
      pctMargem: razao(margemContribuicao, receitaPrevista),
      receitaAtual,
      custoVariavel,
      despesaVariavel,
      metragem,
      custoPorM2: razao(executado, metragem),
      receitaPorM2: razao(receitaAtual, metragem),
    };
  }


  // ─────────────────────────────────────────────────────────────────────────

  let tenantId = "";
  let outro = "";
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "aa1-oraculo" }).returning();
    tenantId = t.id;
    const [t2] = await db.insert(schema.tenants).values({ name: "aa1-oraculo-2" }).returning();
    outro = t2.id;
    const proj = async (tid: string, name: string, extra: Record<string, string> = {}) =>
      (await db.insert(schema.projects).values({ tenantId: tid, name, ...extra } as never).returning())[0].id as string;
    const ver = async (tid: string, projectId: string, kind: string, label: string, extra: Record<string, unknown> = {}) =>
      (await db.insert(schema.versions).values({ tenantId: tid, projectId, key: label, kind, label, color: "#000", ...extra } as never).returning())[0].id as string;
    ids.A = await proj(tenantId, "A", { valorConstrucao: "1000000", valorTerreno: "200000", metragem: "500", financiamentoConstrucao: "800000", financiamentoTerreno: "150000", cub: "2000", pctBdi: "20" });
    ids.B = await proj(tenantId, "B", { valorConstrucao: "300000", metragem: "0" });
    ids.C = await proj(outro, "C-outro-tenant", { valorConstrucao: "999" });
    const aAtual = await ver(tenantId, ids.A, "atual", "Atual");
    const aOrc1 = await ver(tenantId, ids.A, "budget", "Orç 1");
    const aOrc2 = await ver(tenantId, ids.A, "budget", "Orç 2");
    const aCopia = await ver(tenantId, ids.A, "forecast", "Cópia", { sourceVersionId: aAtual });
    const bAtual = await ver(tenantId, ids.B, "atual", "Atual B");
    const cAtual = await ver(outro, ids.C, "atual", "Atual C");
    // caixa: na Atual, na cópia (contaminação), em B e no outro tenant
    for (const [vid, tid, valor] of [[aAtual, tenantId, "500"], [aAtual, tenantId, "-200"], [aCopia, tenantId, "300"], [bAtual, tenantId, "70"], [cAtual, outro, "999"]] as const)
      await db.insert(schema.cashEntries).values({ tenantId: tid, versionId: vid, data: "05/03/2026", valor, descricao: "x" } as never);
    // despesas: Atual (variável, fixa, cancelada), orçamento, B, outro tenant
    const desp = (versionId: string, tid: string, valor: string, categoriaDre: string, cancelado = false) =>
      db.insert(schema.despesas).values({ versionId, tenantId: tid, valor, categoriaDre, cancelado, competencia: "03/2026", vencimento: "10/03/2026", status: "A pagar", obs: "AA1" } as never);
    await desp(aAtual, tenantId, "100", "Custo Variável");
    await desp(aAtual, tenantId, "40", "Despesa Variável");
    await desp(aAtual, tenantId, "60", "Custo Fixo");
    await desp(aAtual, tenantId, "999", "Custo Variável", true);
    await desp(aOrc1, tenantId, "77", "Custo Variável");
    await desp(bAtual, tenantId, "25", "Despesa Variável");
    await desp(cAtual, outro, "555", "Custo Variável");
    // orçamento: dois Budgets (o denominador soma os dois), receita não conta
    const bl = (versionId: string, kind: string, mes: string, valor: string) =>
      db.insert(schema.budgetLines).values({ tenantId, versionId, kind, rowKey: `${kind}-${mes}`, dreCategory: kind === "receita" ? "Receita" : "Custo Variável", mes, valor } as never);
    await bl(aOrc1, "despesa", "03/2026", "1000");
    await bl(aOrc2, "despesa", "03/2026", "3000");
    await bl(aOrc1, "receita", "03/2026", "5000");
    // serviços e medição: A tem; B tem serviço sem medição
    const sv = async (projectId: string, nome: string, custo: string) =>
      (await db.insert(schema.servicos).values({ tenantId, projectId, nome, custoProposto: custo, limiteMin: "0.1", limiteMax: "0.5" } as never).returning())[0].id as string;
    const s1 = await sv(ids.A, "Fundação", "60000");
    const s2 = await sv(ids.A, "Estrutura", "40000");
    await sv(ids.B, "Telhado", "9000");
    for (const [servicoId, competencia, pct] of [[s1, "01/2026", "0.2"], [s1, "02/2026", "0.5"], [s2, "02/2026", "0.1"]] as const)
      await db.insert(schema.medicaoServicos).values({ tenantId, servicoId, competencia, pctExecutadoAcum: pct } as never);
  });
  afterAll(async () => {
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
    await db.delete(schema.tenants).where(eq(schema.tenants.id, outro));
  });

  const semNovos = (o: Record<string, unknown>) => {
    const { composicao: _c, erroOrcamento: _e, ...resto } = o;
    void _c;
    void _e;
    return resto;
  };

  it("getStatusProjeto: mesmos números para A, B, A+B e conjunto vazio", async () => {
    for (const conj of [[ids.A], [ids.B], [ids.A, ids.B], []]) {
      const novo = await getStatusProjeto(tenantId, conj);
      expect(semNovos(novo as never)).toEqual(await statusAntes(tenantId, conj));
    }
  });

  it("getStatusProjeto: projeto de outro tenant não entra (como antes)", async () => {
    const novo = await getStatusProjeto(tenantId, [ids.A, ids.C]);
    expect(semNovos(novo as never)).toEqual(await statusAntes(tenantId, [ids.A, ids.C]));
    expect(novo.recebido).toBe(800); // 500 da Atual + 300 da cópia — o número de hoje
  });

  it("composição declarada: 2 Orçamentos, R$ 300 de caixa fora da Atual", async () => {
    const st = await getStatusProjeto(tenantId, [ids.A]);
    expect(st.composicao).toMatchObject({ orcamentos: 2, caixaForaDaAtual: 300, semAtual: 0, definicaoNova: false, janela: null });
    expect(st.despesaPrevista).toBe(4000);
    expect(st.erroOrcamento).toBe(false);
  });

  it("getIndicadoresObra: mesmos números para A, B e projeto de outro tenant", async () => {
    for (const p of [ids.A, ids.B, ids.C]) {
      expect(await getIndicadoresObra(tenantId, p)).toEqual(await indicadoresAntes(tenantId, p));
    }
    const a = await getIndicadoresObra(tenantId, ids.A);
    expect(a.temMedicao).toBe(true);
  });
});
