import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";

/**
 * Conversão do Plano de Contas de empresas EXISTENTES (itens 11–17 e 38–42 da
 * especificação). Reproduz o que está gravado em produção: uma empresa criada
 * com o plano de obra, com lançamentos em versão aberta e congelada, Orçamento,
 * seleção de linhas, medição e as contas de juros/descontos do acerto; outra
 * no plano ambiental v1 que já fez a adoção aditiva ("PA-…"); e uma já no
 * plano novo, personalizada. Só com DATABASE_URL.
 */
const HAS_DB = !!process.env.DATABASE_URL;
const ctxRef: { current: unknown } = { current: null };
vi.mock("@/lib/context", async (orig) => ({ ...(await orig<typeof import("@/lib/context")>()), getTenantContext: async () => ctxRef.current }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));
vi.mock("server-only", () => ({}));

describe.skipIf(!HAS_DB)("Conversão do Plano de Contas de empresas existentes", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { instalarPlanoPadrao } = await import("@/lib/planocontas-padrao");
  const { linhasDoPlano, gruposDoPlano } = await import("@/lib/calc/plano-ambiental");
  const { PLANO_OBRA_ANTIGO, PLANO_AMBIENTAL_V1 } = await import("@/lib/__fixtures__/planos-antigos");
  const S = await import("@/lib/planocontas-conversao-servidor");
  const A = await import("./planocontas-conversao");
  const { adotarPlanoPadrao } = await import("./planocontas-estrutura");
  const { addDespesa } = await import("./despesas");
  const { getChartAccounts, getExpenseRows } = await import("@/lib/queries");
  const { contaDoPapel, classeDaConta, dreGerencial } = await import("@/lib/planocontas-regras");
  const { getBudgetPlanning } = await import("@/lib/queries");
  const { versionAnaliticaByMonth } = await import("@/lib/dre-inputs");
  const { somarPeriodo, paraInputs } = await import("@/lib/dre-analitica");
  const { waterfall } = await import("@/lib/calc/dre-cascata");
  const { categoriaDaConta } = await import("@/lib/categoria-do-plano");
  const { executarFerramentaDeDados } = await import("@/lib/cris-dados");

  type T = { id: string; name: string };
  const t: Record<"obra" | "v1" | "novo", T> = { obra: null!, v1: null!, novo: null! };
  const v: Record<string, { projeto: string; atual: string; budget: string; travada: string }> = {};
  const ctxDe = (tenant: T, role: "owner" | "membro" = "owner") => ({ tenant, projects: [{ id: v[tenant.id].projeto, name: "P" }], userId: null, userEmail: "teste@exemplo.com", role, perms: defaultPermissions(role) });
  const fd = (campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, val] of Object.entries(campos)) f.set(k, val);
    return f;
  };
  const contas = (tenantId: string) => db.select().from(schema.chartAccounts).where(eq(schema.chartAccounts.tenantId, tenantId));
  const grupos = (tenantId: string) => db.select().from(schema.chartGroups).where(eq(schema.chartGroups.tenantId, tenantId));
  const despesasDe = (tenantId: string) => db.select().from(schema.despesas).where(eq(schema.despesas.tenantId, tenantId));

  /** Empresa como as antigas: contas sem categoria/classe, grupos de 1º nível (a 0079 fez o backfill). */
  async function empresaAntiga(nome: string, plano: typeof PLANO_OBRA_ANTIGO): Promise<T> {
    const [tenant] = await db.insert(schema.tenants).values({ name: nome }).returning();
    await db.insert(schema.chartAccounts).values(plano.map((l) => ({ tenantId: tenant.id, code: l.code, name: l.name, groupCode: l.groupCode, groupName: l.groupName, kind: l.kind, natureza: l.natureza ?? "despesa" })));
    const porGrupo = new Map(plano.map((l) => [l.groupCode, l]));
    await db.insert(schema.chartGroups).values([...porGrupo.values()].map((l) => ({ tenantId: tenant.id, code: l.groupCode, name: l.groupName, kind: l.kind })));
    await db.execute(sql`update chart_account set papel = 'juros_mora' where tenant_id = ${tenant.id} and code = 'F.6'`);
    await db.execute(sql`update chart_account set papel = 'descontos_obtidos' where tenant_id = ${tenant.id} and code = 'F.7'`);
    await projeto(tenant);
    return tenant;
  }
  async function projeto(tenant: T) {
    const [p] = await db.insert(schema.projects).values({ tenantId: tenant.id, name: `P-${tenant.name}` }).returning();
    const vs = await db
      .insert(schema.versions)
      .values([
        { tenantId: tenant.id, projectId: p.id, key: "atual", kind: "atual", label: "Atual", color: "#000", isDefault: true },
        { tenantId: tenant.id, projectId: p.id, key: "budget", kind: "budget", label: "Orçamento", color: "#000", isDefault: true },
        { tenantId: tenant.id, projectId: p.id, key: "budget2", kind: "budget", label: "Orçamento congelado", color: "#000", locked: true },
      ])
      .returning();
    v[tenant.id] = { projeto: p.id, atual: vs[0].id, budget: vs[1].id, travada: vs[2].id };
  }

  beforeAll(async () => {
    t.obra = await empresaAntiga("conv-obra", PLANO_OBRA_ANTIGO);
    t.v1 = await empresaAntiga("conv-v1", PLANO_AMBIENTAL_V1);
    const [novo] = await db.insert(schema.tenants).values({ name: "conv-novo" }).returning();
    t.novo = novo;
    await instalarPlanoPadrao(novo.id, db, undefined, "teste");
    await projeto(novo);

    // Lançamentos REAIS da empresa de obra (o que não pode se perder).
    const o = v[t.obra.id];
    await db.insert(schema.despesas).values([
      { tenantId: t.obra.id, versionId: o.atual, contaCef: "1.1", categoriaDre: "Custo Variável", valor: "1000", competencia: "08/2026" },
      { tenantId: t.obra.id, versionId: o.atual, contaCef: "A.1", categoriaDre: "Despesa Fixa", valor: "300", competencia: "08/2026" },
      { tenantId: t.obra.id, versionId: o.travada, contaCef: "1.1", categoriaDre: "Custo Variável", valor: "70", competencia: "07/2026" },
    ]);
    await db.insert(schema.budgetLines).values([
      { tenantId: t.obra.id, versionId: o.budget, kind: "despesa", rowKey: "1", dreCategory: "Custo Variável", mes: "08/2026", valor: "900" },
      { tenantId: t.obra.id, versionId: o.travada, kind: "despesa", rowKey: "1", dreCategory: "Custo Variável", mes: "07/2026", valor: "80" },
      { tenantId: t.obra.id, versionId: o.budget, kind: "despesa", rowKey: "A", dreCategory: "Despesa Fixa", mes: "08/2026", valor: "250" },
    ]);
    await db.insert(schema.budgetAccounts).values({ tenantId: t.obra.id, versionId: o.budget, kind: "despesa", rowKey: "1", dreCategory: "Custo Variável", total: "900" });
    await db.insert(schema.budgetSelecoes).values({ tenantId: t.obra.id, versionId: o.budget, kind: "despesa", rowKey: "1" });
    await db.insert(schema.medicoes).values({ tenantId: t.obra.id, versionId: o.atual, competencia: "08/2026", grupoCode: "1", grupoName: "Serviços Preliminares Gerais", valor: "500" });

    // v1 que já adotou o padrão de forma aditiva (grupos "PA-…").
    ctxRef.current = ctxDe(t.v1);
    const ad = await adotarPlanoPadrao();
    if (!ad.ok) throw new Error(ad.error);
  });
  afterAll(async () => {
    for (const x of Object.values(t)) if (x) await db.delete(schema.tenants).where(eq(schema.tenants.id, x.id));
  });

  const ativasNaTela = async (tenantId: string) => (await getChartAccounts(tenantId)).filter((c) => c.ativo);
  const PALAVRAS_DE_OBRA = /funda|supraestrutura|canteiro|pavimenta|pós-obra|habite-se|cerâmica|alvenaria/i;

  it("11 · diagnóstico: a empresa antiga mostra o plano de obra na consulta da tela", async () => {
    const ativas = await ativasNaTela(t.obra.id);
    expect(ativas.some((c) => PALAVRAS_DE_OBRA.test(c.name) || PALAVRAS_DE_OBRA.test(c.groupName))).toBe(true);
  });

  it("prévia: só leitura; arquiva códigos em conflito, cria o que falta, inativa o antigo e sugere equivalentes", async () => {
    const antes = JSON.stringify(await contas(t.obra.id));
    const p = await S.previaDaConversao(t.obra.id);
    expect(JSON.stringify(await contas(t.obra.id))).toBe(antes);
    expect(p.renomear).toEqual(expect.arrayContaining([expect.objectContaining({ tipo: "grupo", de: "1", para: "ANT-1" }), expect.objectContaining({ tipo: "conta", de: "1.1", para: "ANT-1.1" })]));
    expect(p.renomear.find((r) => r.de === "1.1")!.uso).toMatchObject({ despesas: 2, versoesCongeladas: 1 });
    expect(p.criarContas).toHaveLength(linhasDoPlano("x").length);
    expect(p.inativar.filter((i) => i.tipo === "conta")).toHaveLength(PLANO_OBRA_ANTIGO.length);
    expect(p.inativar.find((i) => i.code === "A.1")!.equivalente).toMatchObject({ nome: "Aluguel" });
    expect(p.inativar.find((i) => i.code === "ANT-2.1")!.equivalente).toBeNull(); // fundação: sem equivalente, de propósito
    expect(p.papeis.map((x) => x.para).sort()).toEqual(["4.2.02", "4.2.07"]);
    expect(p.resumo).toMatchObject({ contasAntigasUsadas: 2, lancamentosPreservados: 3 });
  });

  it("permissão: membro não converte; sem confirmar não grava", async () => {
    ctxRef.current = ctxDe(t.obra, "membro");
    expect(await A.converterPlanoDaEmpresa({ confirmar: true, versao: "x" })).toMatchObject({ ok: false, error: expect.stringMatching(/permissão/) });
    ctxRef.current = ctxDe(t.obra);
    expect(await A.converterPlanoDaEmpresa({ confirmar: false, versao: "x" })).toMatchObject({ ok: false });
    expect(await A.converterPlanoDaEmpresa({ confirmar: true, versao: "velha" })).toMatchObject({ ok: false, error: expect.stringMatching(/mudou/) });
  });

  it("12–16, 38–39 · converte: plano ambiental completo e ativo, antigo inativo, lançamentos e histórico preservados", async () => {
    const despesasAntes = (await despesasDe(t.obra.id)).map((d) => ({ id: d.id, valor: d.valor, categoria: d.categoriaDre })).sort((a, b) => a.id.localeCompare(b.id));
    const novoAntes = JSON.stringify(await contas(t.novo.id));
    ctxRef.current = ctxDe(t.obra);
    const p = await S.previaDaConversao(t.obra.id);
    const r = await A.converterPlanoDaEmpresa({ confirmar: true, versao: p.versao });
    expect(r).toMatchObject({ ok: true, aviso: expect.stringMatching(/convertido/) });

    // 17 — a MESMA consulta da tela: só o plano ambiental ativo, nada de obra
    const ativas = await ativasNaTela(t.obra.id);
    expect(ativas.map((c) => c.code).sort()).toEqual(linhasDoPlano("x").map((c) => c.code).sort());
    expect(ativas.some((c) => PALAVRAS_DE_OBRA.test(c.name) || PALAVRAS_DE_OBRA.test(c.groupName))).toBe(false);
    const gs = await grupos(t.obra.id);
    for (const g of gruposDoPlano("x")) {
      const achado = gs.find((x) => x.code === g.code)!;
      expect(achado, g.code).toBeTruthy();
      expect(achado.ativo).toBe(true);
      if (g.parentCode) expect(gs.find((x) => x.id === achado.parentId)?.code, g.code).toBe(g.parentCode);
    }
    // antigo: inativo, preservado (nada apagado), conflitos arquivados
    const todas = await contas(t.obra.id);
    expect(todas).toHaveLength(linhasDoPlano("x").length + PLANO_OBRA_ANTIGO.length);
    expect(todas.find((c) => c.code === "ANT-1.1")).toMatchObject({ name: "Serviços técnicos (projetos, sondagem, licenças)", ativo: false, groupCode: "ANT-1" });
    expect(todas.find((c) => c.code === "A.1")).toMatchObject({ ativo: false, groupCode: "A" });
    expect(gs.find((g) => g.code === "ANT-1")).toMatchObject({ name: "Serviços Preliminares Gerais", ativo: false });

    // 13, 16, 38 — lançamentos: mesmos ids, valores e categorias; só o código arquivado
    const depois = await despesasDe(t.obra.id);
    expect(depois.map((d) => ({ id: d.id, valor: d.valor, categoria: d.categoriaDre })).sort((a, b) => a.id.localeCompare(b.id))).toEqual(despesasAntes);
    expect(depois.filter((d) => d.contaCef === "ANT-1.1")).toHaveLength(2); // inclusive a da versão congelada
    expect(depois.filter((d) => d.contaCef === "A.1")).toHaveLength(1);
    // 39 — Orçamento (inclusive congelado), seleção de linhas e medição seguem o grupo antigo, agora "ANT-1"
    const o = v[t.obra.id];
    const bl = await db.select().from(schema.budgetLines).where(eq(schema.budgetLines.tenantId, t.obra.id));
    expect(bl.map((b) => b.rowKey).sort()).toEqual(["A", "ANT-1", "ANT-1"]);
    expect((await db.select().from(schema.budgetAccounts).where(eq(schema.budgetAccounts.tenantId, t.obra.id)))[0].rowKey).toBe("ANT-1");
    expect(bl.find((b) => b.versionId === o.travada)!.valor).toBe("80.00");
    expect((await db.select().from(schema.budgetSelecoes).where(eq(schema.budgetSelecoes.tenantId, t.obra.id)))[0].rowKey).toBe("ANT-1");
    expect((await db.select().from(schema.medicoes).where(eq(schema.medicoes.tenantId, t.obra.id)))[0].grupoCode).toBe("ANT-1");
    // a DRE da versão Atual lê os mesmos valores e categorias
    const linhas = await getExpenseRows(o.atual);
    expect(linhas.reduce((a, l) => a + Number(l.valor), 0)).toBe(1300);
    // papéis do acerto passaram para as contas ambientais
    const mapa = new Map(todas.map((c) => [c.code, c]));
    expect(contaDoPapel(todas, "juros_mora")).toBe("4.2.02");
    expect(contaDoPapel(todas, "descontos_obtidos")).toBe("4.2.07");
    expect(mapa.get("F.6")!.papel).toBeNull();
    // auditoria
    const [log] = await db.select().from(schema.auditLog).where(and(eq(schema.auditLog.tenantId, t.obra.id), eq(schema.auditLog.action, S.ACAO_CONVERTER)));
    expect(log.meta).toMatchObject({ versao: p.versao, renomear: expect.arrayContaining([expect.objectContaining({ de: "1.1", para: "ANT-1.1" })]) });
    // 29 — outra empresa não mudou
    expect(JSON.stringify(await contas(t.novo.id))).toBe(novoAntes);
  });

  it("14–15 · idempotente: converter de novo não duplica nem muda nada", async () => {
    const antes = (await contas(t.obra.id)).length;
    ctxRef.current = ctxDe(t.obra);
    expect(await A.converterPlanoDaEmpresa({ confirmar: true, versao: (await S.previaDaConversao(t.obra.id)).versao })).toMatchObject({ ok: true, aviso: expect.stringMatching(/Nada mudou/) });
    expect(await contas(t.obra.id)).toHaveLength(antes);
    expect((await S.previaDaConversao(t.obra.id)).nadaAFazer).toBe(true);
  });

  it("18, 31 · despesa nova: conta ambiental aceita; conta antiga (inativa) recusada", async () => {
    ctxRef.current = ctxDe(t.obra);
    const o = v[t.obra.id];
    const okHosp = (await addDespesa(fd({ projectId: o.projeto, contaCef: "2.3.04", categoriaDre: "Custo Variável", valor: "250", competencia: "09/2026", vencimento: "09/30/2026" }))) as { ok: boolean };
    expect(okHosp.ok).toBe(true);
    const antiga = (await addDespesa(fd({ projectId: o.projeto, contaCef: "A.1", categoriaDre: "Despesa Fixa", valor: "1", competencia: "09/2026", vencimento: "09/30/2026" }))) as { ok: boolean; error?: string };
    expect(antiga).toMatchObject({ ok: false, error: expect.stringMatching(/inativa/) });
  });

  it("desfazer: recusa enquanto conta criada pela conversão tem uso; sem uso, volta tudo como era", async () => {
    ctxRef.current = ctxDe(t.obra);
    expect(await A.desfazerConversaoDoPlano()).toMatchObject({ ok: false, error: expect.stringMatching(/2\.3\.04/) });
    // remove a despesa de teste e desfaz
    await db.delete(schema.despesas).where(and(eq(schema.despesas.tenantId, t.obra.id), eq(schema.despesas.contaCef, "2.3.04")));
    expect(await A.desfazerConversaoDoPlano()).toEqual({ ok: true });
    const cs = await contas(t.obra.id);
    expect(cs.map((c) => c.code).sort()).toEqual(PLANO_OBRA_ANTIGO.map((l) => l.code).sort());
    expect(cs.every((c) => c.ativo)).toBe(true);
    expect(cs.find((c) => c.code === "F.6")!.papel).toBe("juros_mora");
    expect((await despesasDe(t.obra.id)).filter((d) => d.contaCef === "1.1")).toHaveLength(2);
    expect((await db.select().from(schema.medicoes).where(eq(schema.medicoes.tenantId, t.obra.id)))[0].grupoCode).toBe("1");
    expect((await grupos(t.obra.id)).map((g) => g.code).sort()).toEqual([...new Set(PLANO_OBRA_ANTIGO.map((l) => l.groupCode))].sort());
    // e converte de novo, para o estado final
    expect(await A.converterPlanoDaEmpresa({ confirmar: true, versao: (await S.previaDaConversao(t.obra.id)).versao })).toMatchObject({ ok: true });
    expect((await ativasNaTela(t.obra.id)).length).toBe(linhasDoPlano("x").length);
  });

  it("18–24, 34–36 · integrações sobre a empresa convertida: despesa, natureza, Orçamento, DRE analítica e gerencial, Cris", async () => {
    ctxRef.current = ctxDe(t.obra);
    const o = v[t.obra.id];
    const nova = (contaCef: string, valor: string) => addDespesa(fd({ projectId: o.projeto, contaCef, categoriaDre: "Custo Variável", valor, competencia: "09/2026", vencimento: "09/30/2026" })) as Promise<{ ok: boolean; error?: string }>;
    expect((await nova("2.3.04", "250")).ok).toBe(true); // hospedagem
    expect((await nova("2.3.06", "90")).ok).toBe(true); // combustível
    // conta de receita não recebe despesa (natureza)
    expect(await nova("1.1.01", "10")).toMatchObject({ ok: false, error: expect.stringMatching(/receita/) });
    // 22 — Orçamento: a linha antiga com dado continua (ANT-1, mesmo total); os subgrupos ambientais
    // estão disponíveis para acrescentar (a seleção salva da versão não é mexida pela conversão)
    const plan = await getBudgetPlanning(t.obra.id, o.projeto, "budget", o.budget);
    expect(plan.despesas.find((l) => l.rowKey === "ANT-1")!.total).toBe(900);
    expect(plan.disponiveis.despesa.map((g) => g.code)).toEqual(expect.arrayContaining(["2.3", "3.1"]));
    expect(plan.disponiveis.despesa.some((g) => g.code.startsWith("ANT-") || g.code === "A")).toBe(false);
    // versão SEM seleção salva (Previsão nova, por exemplo) já mostra as linhas ambientais
    const [prev] = await db.insert(schema.versions).values({ tenantId: t.obra.id, projectId: o.projeto, key: "forecast", kind: "forecast", label: "Previsão", color: "#000" }).returning();
    const fc = await getBudgetPlanning(t.obra.id, o.projeto, "forecast", prev.id);
    expect(fc.despesas.map((l) => l.rowKey)).toEqual(expect.arrayContaining(["2.1", "2.3", "3.1", "5.1"]));
    expect(fc.despesas.some((l) => l.rowKey.startsWith("ANT-") || ["A", "F", "P"].includes(l.rowKey))).toBe(false);
    expect(fc.despesas.find((l) => l.rowKey === "2.3")!.label).toMatch(/Mobilização e logística/);
    // 20 — DRE analítica identifica a conta de origem; gerencial confere com a cascata; nada em dobro
    const e = somarPeriodo(await versionAnaliticaByMonth(t.obra.id, o.atual, o.projeto), null);
    expect(e.lancamentos.find((l) => l.conta === "2.3.04")).toMatchObject({ categoria: "Custo Variável", valor: 250 });
    expect(e.lancamentos.find((l) => l.conta === "ANT-1.1")).toMatchObject({ valor: 1000 });
    const todas = await contas(t.obra.id);
    const mapa = new Map(todas.map((c) => [c.code, { name: c.name, classe: classeDaConta(c, categoriaDaConta(c)) }]));
    const g = dreGerencial({ receitaSemConta: e.receitaVendas, encargos: e.encargos, lancamentos: e.lancamentos }, mapa);
    expect(g.resultadoDaCascata).toBeCloseTo(waterfall([paraInputs(e)]).rows.at(-1)!.value, 2);
    expect(e.lancamentos.reduce((a, l) => a + l.valor, 0)).toBe(1000 + 300 + 250 + 90);
    // 34–36 — Cris: sugere conta ATIVA da empresa; consolida por subgrupo e grupo superior; aponta pouco uso
    const cris = async (nome: string, entrada: object) => JSON.parse(await executarFerramentaDeDados(ctxRef.current as never, nome, entrada));
    const sug = await cris("plano_de_contas", { assunto: "sugerir", texto: "hospedagem de dois técnicos em campanha", natureza: "despesa" });
    expect(sug.candidatas[0].codigo).toBe("2.3.04");
    expect(JSON.stringify(sug)).not.toMatch(/ANT-/);
    const porSub = await cris("despesas_por_fornecedor_ou_situacao", { obras: [], de: "", ate: "", situacao: "todas", agrupar: "grupo_do_plano" });
    expect(JSON.stringify(porSub)).toMatch(/2\.3 Mobilização e logística/);
    const porTopo = await cris("despesas_por_fornecedor_ou_situacao", { obras: [], de: "", ate: "", situacao: "todas", agrupar: "grupo_superior" });
    expect(JSON.stringify(porTopo)).toMatch(/2 Custos diretos dos serviços/);
    const porConta = await cris("despesas_por_fornecedor_ou_situacao", { obras: [], de: "", ate: "", situacao: "todas", agrupar: "conta" });
    expect(JSON.stringify(porConta)).toMatch(/2\.3\.04 Hospedagens/);
    const pouco = await cris("plano_de_contas", { assunto: "pouco_uso", texto: "", natureza: "despesa" });
    expect(pouco.semUso).toBeGreaterThan(100);
    expect(JSON.stringify(pouco.poucoUsadas)).toMatch(/2\.3\.06 Combustíveis/);
    await db.delete(schema.despesas).where(and(eq(schema.despesas.tenantId, t.obra.id), inArray(schema.despesas.contaCef, ["2.3.04", "2.3.06"])));
  });

  it("v1 com adoção aditiva: \"PA-…\" volta ao código oficial; nenhuma conta ambiental duplicada", async () => {
    const antes = await grupos(t.v1.id);
    expect(antes.some((g) => g.code.startsWith("PA-"))).toBe(true);
    ctxRef.current = ctxDe(t.v1);
    expect(await A.converterPlanoDaEmpresa({ confirmar: true, versao: (await S.previaDaConversao(t.v1.id)).versao })).toMatchObject({ ok: true });
    const gs = await grupos(t.v1.id);
    expect(gs.some((g) => g.code.startsWith("PA-"))).toBe(false);
    expect(gs.find((g) => g.code === "ANT-1")).toMatchObject({ name: "Serviços técnicos de terceiros", ativo: false });
    const ativas = await ativasNaTela(t.v1.id);
    const codigos = ativas.map((c) => c.code);
    expect(new Set(codigos).size).toBe(codigos.length);
    expect(codigos.sort()).toEqual(linhasDoPlano("x").map((c) => c.code).sort());
    // as contas da adoção ficaram sob os subgrupos oficiais
    expect(ativas.find((c) => c.code === "2.3.04")!.groupCode).toBe("2.3");
    const sub = gs.find((g) => g.code === "2.3")!;
    expect(gs.find((g) => g.id === sub.parentId)!.code).toBe("2");
  });

  it("empresa já no plano novo e personalizada: nada a fazer, personalização preservada", async () => {
    await db.update(schema.chartAccounts).set({ name: "Hospedagem da equipe" }).where(and(eq(schema.chartAccounts.tenantId, t.novo.id), eq(schema.chartAccounts.code, "2.3.04")));
    const sub = (await grupos(t.novo.id)).find((g) => g.code === "2.3")!;
    await db.insert(schema.chartAccounts).values({ tenantId: t.novo.id, code: "2.3.40", name: "Barco de apoio", groupCode: "2.3", groupName: sub.name, kind: "cef", natureza: "despesa" });
    const p = await S.previaDaConversao(t.novo.id);
    expect(p.nadaAFazer).toBe(true);
    expect((await contas(t.novo.id)).find((c) => c.code === "2.3.04")!.name).toBe("Hospedagem da equipe");
  });

  it("linha de comando: --listar aponta quem precisa converter (prévia via servidor)", async () => {
    const [x] = await db.insert(schema.tenants).values({ name: "conv-cli" }).returning();
    try {
      await db.insert(schema.chartAccounts).values(PLANO_OBRA_ANTIGO.slice(0, 2).map((l) => ({ tenantId: x.id, code: l.code, name: l.name, groupCode: l.groupCode, groupName: l.groupName, kind: l.kind })));
      expect((await S.previaDaConversao(x.id)).nadaAFazer).toBe(false);
      expect((await S.previaDaConversao(t.obra.id)).nadaAFazer).toBe(true);
    } finally {
      await db.delete(schema.tenants).where(eq(schema.tenants.id, x.id));
    }
    // a contagem de empresas convertidas não toca as demais
    const ids = [t.obra.id, t.v1.id, t.novo.id];
    const n = await db.select({ n: sql<number>`count(*)::int` }).from(schema.auditLog).where(and(inArray(schema.auditLog.tenantId, ids), eq(schema.auditLog.action, S.ACAO_CONVERTER)));
    expect(n[0].n).toBe(3); // obra (2× por causa do desfazer) + v1
  });
});
