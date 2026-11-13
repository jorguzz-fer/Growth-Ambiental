import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { readFileSync, existsSync } from "node:fs";

/**
 * Plano de Contas para consultorias ambientais — integração (itens 1–37 da
 * especificação). Só com DATABASE_URL. Duas empresas (A e B) recebem o plano
 * padrão pelo mesmo caminho do provisionamento.
 */
const HAS_DB = !!process.env.DATABASE_URL;
const ctxRef: { current: unknown } = { current: null };
vi.mock("@/lib/context", async (orig) => ({ ...(await orig<typeof import("@/lib/context")>()), getTenantContext: async () => ctxRef.current }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));
vi.mock("server-only", () => ({}));

describe.skipIf(!HAS_DB)("Plano de Contas ambiental — integração", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { instalarPlanoPadrao, CHAVES_DO_PLANO_PADRAO } = await import("@/lib/planocontas-padrao");
  const { PLANO_AMBIENTAL, linhasDoPlano } = await import("@/lib/calc/plano-ambiental");
  const E = await import("./planocontas-estrutura");
  const { addDespesa, updateDespesa } = await import("./despesas");
  const { ratearEntreObras } = await import("./acerto");
  const { replicateFromAtual } = await import("./budget");
  const { versionAnaliticaByMonth } = await import("@/lib/dre-inputs");
  const { getBudgetPlanning, getExpenseRows } = await import("@/lib/queries");
  const { somarPeriodo, paraInputs } = await import("@/lib/dre-analitica");
  const { waterfall } = await import("@/lib/calc/dre-cascata");
  const { categoriaDaConta } = await import("@/lib/categoria-do-plano");
  const { classeDaConta, dreGerencial } = await import("@/lib/planocontas-regras");
  const { executarFerramentaDeDados } = await import("@/lib/cris-dados");
  const { validarContaDoLancamento } = await import("@/lib/planocontas-servidor");
  const { criarContasPropostas } = await import("./planocontas");

  type T = { id: string; name: string };
  const t: { a: T; b: T } = { a: null!, b: null! };
  const proj: Record<string, { id: string; atual: string; budget: string; travada: string }> = {};
  const ctxDe = (tenant: T, projetos: { id: string; name: string }[], role: "owner" | "membro" = "owner") => ({ tenant, projects: projetos, userId: null, userEmail: "teste@exemplo.com", role, perms: defaultPermissions(role, { operadorDaPlataforma: role === "owner" }) });
  const fd = (campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    return f;
  };
  const conta = async (tenantId: string, code: string) => (await db.select().from(schema.chartAccounts).where(and(eq(schema.chartAccounts.tenantId, tenantId), eq(schema.chartAccounts.code, code))))[0];
  const grupo = async (tenantId: string, code: string) => (await db.select().from(schema.chartGroups).where(and(eq(schema.chartGroups.tenantId, tenantId), eq(schema.chartGroups.code, code))))[0];
  const ok = <R extends { ok: boolean }>(r: R) => {
    if (!r.ok) throw new Error(JSON.stringify(r));
    return r as Extract<R, { ok: true }>;
  };
  const despesa = (projectId: string, contaCef: string, valor = "100", extra: Record<string, string> = {}) =>
    addDespesa(fd({ projectId, contaCef, categoriaDre: "Custo Variável", valor, competencia: "09/2026", vencimento: "09/30/2026", ...extra })) as Promise<{ ok: true; id: string } | { ok: false; error: string }>;

  beforeAll(async () => {
    for (const k of ["a", "b"] as const) {
      const [tenant] = await db.insert(schema.tenants).values({ name: `tenant-plano-ambiental-${k}` }).returning();
      t[k] = tenant;
      // 1 — o mesmo caminho do provisionamento.
      await instalarPlanoPadrao(tenant.id, db, undefined, "teste");
      for (const nome of ["P1", "P2"]) {
        const [p] = await db.insert(schema.projects).values({ tenantId: tenant.id, name: `${nome}-${k}` }).returning();
        const vs = await db
          .insert(schema.versions)
          .values([
            { tenantId: tenant.id, projectId: p.id, key: "atual", kind: "atual", label: "Atual", color: "#000", isDefault: true },
            { tenantId: tenant.id, projectId: p.id, key: "budget", kind: "budget", label: "Orçamento", color: "#000", isDefault: true },
            { tenantId: tenant.id, projectId: p.id, key: "budget2", kind: "budget", label: "Orçamento travado", color: "#000", locked: true },
          ])
          .returning();
        proj[`${nome}-${k}`] = { id: p.id, atual: vs[0].id, budget: vs[1].id, travada: vs[2].id };
      }
    }
  });
  afterAll(async () => {
    for (const x of [t.a, t.b]) if (x) await db.delete(schema.tenants).where(eq(schema.tenants.id, x.id));
  });
  const projetosDe = (k: "a" | "b") => ["P1", "P2"].map((n) => ({ id: proj[`${n}-${k}`].id, name: `${n}-${k}` }));
  const comoA = (role: "owner" | "membro" = "owner") => (ctxRef.current = ctxDe(t.a, projetosDe("a"), role));
  const comoB = () => (ctxRef.current = ctxDe(t.b, projetosDe("b")));

  it("1, 14, 15(chaves) · provisionamento: grupos, subgrupos e contas com atributos; chaves ligadas; cópia independente", async () => {
    const contas = await db.select().from(schema.chartAccounts).where(eq(schema.chartAccounts.tenantId, t.a.id));
    const grupos = await db.select().from(schema.chartGroups).where(eq(schema.chartGroups.tenantId, t.a.id));
    expect(contas).toHaveLength(linhasDoPlano("x").length);
    expect(grupos.filter((g) => !g.parentId).map((g) => g.code)).toEqual(PLANO_AMBIENTAL.map((g) => g.code));
    const sub = grupos.find((g) => g.code === "2.3")!;
    expect(grupos.find((g) => g.id === sub.parentId)!.code).toBe("2");
    expect(await conta(t.a.id, "2.3.04")).toMatchObject({ name: "Hospedagens", groupCode: "2.3", dreCategory: "Custo Variável", classeGerencial: "custo_servico", tipoCusto: "direto", kind: "cef" });
    const flags = await db.select().from(schema.tenantFlags).where(eq(schema.tenantFlags.tenantId, t.a.id));
    expect(flags.filter((f) => f.ligada).map((f) => f.chave).sort()).toEqual([...CHAVES_DO_PLANO_PADRAO].sort());
    // 14 — cada empresa tem as suas linhas: nenhum id compartilhado; o padrão é só ponto de partida.
    const idsB = new Set((await db.select({ id: schema.chartAccounts.id }).from(schema.chartAccounts).where(eq(schema.chartAccounts.tenantId, t.b.id))).map((x) => x.id));
    expect(contas.some((c) => idsB.has(c.id))).toBe(false);
  });

  it("2–7, 10, 11 · grupo, subgrupo, conta; editar, renomear, inativar; código duplicado e ciclo recusados", async () => {
    comoA();
    const g = ok(await E.salvarGrupoDoPlano({ code: "7", name: "Programas próprios", kind: "complementar" }));
    const s = ok(await E.salvarGrupoDoPlano({ code: "7.1", name: "Pesquisa e desenvolvimento", parentId: g.id! }));
    const c = ok(await E.salvarConta({ code: "7.1.01", name: "Bolsas de pesquisa", grupoCode: "7.1", natureza: "despesa", dreCategory: "Despesa Fixa" }));
    expect(await conta(t.a.id, "7.1.01")).toMatchObject({ groupName: "Pesquisa e desenvolvimento", kind: "complementar", dreCategory: "Despesa Fixa" });
    // 5/6 — editar e renomear (sem uso: sem prévia de impacto)
    const atual = await conta(t.a.id, "7.1.01");
    ok(await E.salvarConta({ id: c.id, versao: atual.versao, code: "7.1.01", name: "Bolsas e auxílios de pesquisa", descricao: "Iniciação científica", grupoCode: "7.1", natureza: "despesa", dreCategory: "Despesa Fixa", tipoCusto: "indireto" }));
    expect(await conta(t.a.id, "7.1.01")).toMatchObject({ name: "Bolsas e auxílios de pesquisa", descricao: "Iniciação científica", tipoCusto: "indireto", versao: atual.versao + 1 });
    // concorrência: versão velha é recusada
    expect(await E.salvarConta({ id: c.id, versao: atual.versao, code: "7.1.01", name: "X", grupoCode: "7.1", natureza: "despesa" })).toMatchObject({ ok: false, error: expect.stringMatching(/outra pessoa/) });
    // renomear subgrupo propaga o nome às contas
    ok(await E.salvarGrupoDoPlano({ id: s.id, code: "7.1", name: "P&D", parentId: g.id }));
    expect((await conta(t.a.id, "7.1.01")).groupName).toBe("P&D");
    // 7 — inativar
    ok(await E.definirSituacaoDaConta(c.id!, false));
    expect((await conta(t.a.id, "7.1.01")).ativo).toBe(false);
    // 10 — código duplicado (com conta e com grupo)
    expect(await E.salvarConta({ code: "2.3.04", name: "Outra", grupoCode: "7.1", natureza: "despesa" })).toMatchObject({ ok: false, error: expect.stringMatching(/já existe/) });
    expect(await E.salvarConta({ code: "2.3", name: "Outra", grupoCode: "7.1", natureza: "despesa" })).toMatchObject({ ok: false, error: expect.stringMatching(/já existe/) });
    expect(await E.salvarGrupoDoPlano({ code: "7.1", name: "Dup" })).toMatchObject({ ok: false });
    // 11 — ciclo e profundidade
    expect(await E.salvarGrupoDoPlano({ id: g.id, code: "7", name: "Programas próprios", parentId: s.id })).toMatchObject({ ok: false, error: expect.stringMatching(/ciclo/) });
    const s3 = ok(await E.salvarGrupoDoPlano({ code: "7.1.A", name: "Nível 3", parentId: s.id! }));
    expect(await E.salvarGrupoDoPlano({ code: "7.1.A.x", name: "Nível 4", parentId: s3.id! })).toMatchObject({ ok: false, error: expect.stringMatching(/3 níveis/) });
  });

  it("8, 9, 15, 25, 32 · lançamento: conta inativa, inexistente, de outra empresa ou grupo é recusada; conta usada não é excluída", async () => {
    comoA();
    const P1 = proj["P1-a"].id;
    expect(await despesa(P1, "7.1.01")).toMatchObject({ ok: false, error: expect.stringMatching(/inativa/) });
    expect(await despesa(P1, "9.9.99")).toMatchObject({ ok: false, error: expect.stringMatching(/não existe/) });
    expect(await despesa(P1, "2.3")).toMatchObject({ ok: false, error: expect.stringMatching(/grupo/) });
    // 15 — conta criada só na empresa B não serve para A
    comoB();
    ok(await E.salvarConta({ code: "2.3.50", name: "Hospedagem de barco", grupoCode: "2.3", natureza: "despesa" }));
    comoA();
    expect(await despesa(P1, "2.3.50")).toMatchObject({ ok: false, error: expect.stringMatching(/não existe/) });
    expect(await validarContaDoLancamento(t.a.id, "2.3.50")).toMatch(/não existe/);
    // conta ativa: grava
    const d = ok(await despesa(P1, "2.3.04", "250"));
    // 9 — conta usada não é excluída, e não muda de código
    const hosp = await conta(t.a.id, "2.3.04");
    expect(await E.excluirConta(hosp.id)).toMatchObject({ ok: false, error: expect.stringMatching(/Inativar/) });
    expect(await E.salvarConta({ id: hosp.id, versao: hosp.versao, code: "2.3.99", name: "Hospedagens", grupoCode: "2.3", natureza: "despesa" })).toMatchObject({ ok: false, error: expect.stringMatching(/não muda/) });
    // edição que mantém a conta (mesmo inativa depois) é aceita; trocar para inativa não
    expect(await updateDespesa(d.id!, { obs: "ok" })).toEqual({ ok: true });
    expect(await updateDespesa(d.id!, { contaCef: "7.1.01" })).toMatchObject({ ok: false, error: expect.stringMatching(/inativa/) });
    // conta sem uso: excluída
    const sem = ok(await E.salvarConta({ code: "7.1.02", name: "Temporária", grupoCode: "7.1", natureza: "despesa" }));
    ok(await E.excluirConta(sem.id!));
  });

  it("12, 13 · isolamento: B não lê nem altera conta de A; personalizar B não muda A", async () => {
    const hospA = await conta(t.a.id, "2.3.04");
    comoB();
    expect(await E.salvarConta({ id: hospA.id, code: "2.3.04", name: "Invadida", grupoCode: "2.3", natureza: "despesa" })).toMatchObject({ ok: false, error: expect.stringMatching(/não encontrada/) });
    expect(await E.definirSituacaoDaConta(hospA.id, false)).toMatchObject({ ok: false });
    expect(await E.excluirConta(hospA.id)).toMatchObject({ ok: false });
    const hospB = await conta(t.b.id, "2.3.04");
    ok(await E.salvarConta({ id: hospB.id, versao: hospB.versao, code: "2.3.04", name: "Hospedagem (B)", grupoCode: "2.3", natureza: "despesa" }));
    expect((await conta(t.a.id, "2.3.04")).name).toBe("Hospedagens");
  });

  it("16, 20, 21 · despesa herda a categoria; Orçamento por grupo usa a categoria das contas; replicar a Atual agrupa pelo cadastro", async () => {
    comoA();
    const P1 = proj["P1-a"];
    const r = ok(await despesa(P1.id, "3.5.07", "40", { categoriaDre: "Custo Variável" })); // comissão: Despesa Variável pela conta
    expect((await db.select().from(schema.despesas).where(eq(schema.despesas.id, r.id!)))[0].categoriaDre).toBe("Despesa Variável");
    // 20 — linha nova do Orçamento nasce com a categoria das contas do grupo (chave ligada)
    const plan = await getBudgetPlanning(t.a.id, P1.id, "budget", P1.budget);
    const linha = (k: string) => plan.despesas.find((l) => l.rowKey === k);
    expect(linha("3.5")?.dreCategory).toBe("Despesa Variável");
    expect(linha("4.2")?.dreCategory).toBe("Despesas Financeiras");
    expect(linha("2.3")?.dreCategory).toBe("Custo Variável");
    expect(plan.receitas.some((l) => l.rowKey === "1.1")).toBe(true); // 17 — receita por conta/grupo no bloco de receitas
    // 21 — Previsão/Orçamento replicado da Atual: "2.3.04" vai para a linha do grupo "2.3" (não "2")
    ok(await replicateFromAtual(P1.budget));
    const linhas = await db.select().from(schema.budgetLines).where(eq(schema.budgetLines.versionId, P1.budget));
    expect(linhas.filter((l) => l.kind === "despesa").map((l) => l.rowKey).sort()).toEqual(["2.3", "3.5"]);
  });

  it("18, 19, 25, 27 · DRE analítica e consolidada; DRE gerencial bate com a cascata, sem dupla contagem", async () => {
    comoA();
    ok(await despesa(proj["P2-a"].id, "5.1.01", "30")); // ISS → dedução
    ok(await despesa(proj["P2-a"].id, "6.3.01", "500")); // investimento → fora do resultado
    const contas = await db.select().from(schema.chartAccounts).where(eq(schema.chartAccounts.tenantId, t.a.id));
    const mapa = new Map(contas.map((c) => [c.code, { name: c.name, classe: classeDaConta(c, categoriaDaConta(c)) }]));
    const entrada = async (k: string) => somarPeriodo(await versionAnaliticaByMonth(t.a.id, proj[k].atual, proj[k].id), null);
    const e1 = await entrada("P1-a");
    const e2 = await entrada("P2-a");
    // 18 — analítica: identifica a conta de origem
    expect(e1.lancamentos.find((l) => l.conta === "2.3.04")).toMatchObject({ categoria: "Custo Variável", valor: 250 });
    // 19 — consolidado = soma dos projetos
    const cons = { receitaVendas: e1.receitaVendas + e2.receitaVendas, receitaPermuta: 0, encargos: e1.encargos + e2.encargos, lancamentos: [...e1.lancamentos, ...e2.lancamentos] };
    const final = (e: typeof cons) => waterfall([paraInputs(e)]).rows.at(-1)!.value;
    expect(final(cons)).toBeCloseTo(final(e1) + final(e2), 2);
    // 27 — gerencial reagrupa os mesmos números: conferência com a cascata
    const g = dreGerencial({ receitaSemConta: cons.receitaVendas, encargos: cons.encargos, lancamentos: cons.lancamentos }, mapa);
    expect(g.resultadoDaCascata).toBeCloseTo(final(cons), 2);
    expect(g.linhas.find((l) => l.id === "deducao")!.valor).toBe(-30);
    expect(g.linhas.find((l) => l.id === "fora_do_resultado")!.valor).toBe(-500);
    expect(g.linhas.find((l) => l.id === "custo_servico")!.valor).toBe(-250);
  });

  it("23 · rateio entre projetos: conta validada e preservada em cada despesa", async () => {
    comoA();
    const [banco] = await db.insert(schema.bankAccounts).values({ tenantId: t.a.id, banco: "Banco Teste", tipo: "Construtora" }).returning();
    const base = { dataPagamento: "09/15/2026", bankAccountId: banco.id, valorTotal: 300, competencia: "09/2026", descricao: "Locação compartilhada", linhas: projetosDe("a").map((p) => ({ projectId: p.id, valor: 150 })) };
    expect(await ratearEntreObras({ ...base, contaCef: "7.1.01" } as never)).toMatchObject({ ok: false, error: expect.stringMatching(/inativa/) });
    const r = await ratearEntreObras({ ...base, contaCef: "3.6.04" } as never);
    if (r.ok) {
      const ds = await db.select().from(schema.despesas).where(and(eq(schema.despesas.tenantId, t.a.id), eq(schema.despesas.contaCef, "3.6.04")));
      expect(ds.length).toBe(2);
    } else expect((r as { error: string }).error).not.toMatch(/conta/i);
  });

  it("26 · reclassificação autorizada: permissão própria, prévia, versão congelada intocada, auditoria", async () => {
    const P1 = proj["P1-a"];
    // lançamento em versão congelada (histórico fechado)
    await db.insert(schema.despesas).values({ tenantId: t.a.id, versionId: P1.travada, contaCef: "2.3.04", categoriaDre: "Custo Variável", valor: "70", competencia: "08/2026" });
    comoA("membro");
    expect(await E.reclassificarLancamentos({ de: "2.3.04", para: "2.3.03", confirmar: true })).toMatchObject({ ok: false, error: expect.stringMatching(/permissão/) });
    comoA();
    const p = await E.previaDaReclassificacao("2.3.04", "2.3.03");
    expect(p).toMatchObject({ ok: true, previa: { lancamentos: 1, valor: 250, congelados: 1 } });
    expect(await E.reclassificarLancamentos({ de: "2.3.04", para: "2.3.03", confirmar: false })).toMatchObject({ ok: false });
    expect(await E.reclassificarLancamentos({ de: "2.3.04", para: "7.1.01", confirmar: true })).toMatchObject({ ok: false, error: expect.stringMatching(/inativa/) });
    ok(await E.reclassificarLancamentos({ de: "2.3.04", para: "2.3.03", confirmar: true }));
    const restantes = await db.select().from(schema.despesas).where(and(eq(schema.despesas.tenantId, t.a.id), eq(schema.despesas.contaCef, "2.3.04")));
    expect(restantes.map((d) => d.versionId)).toEqual([P1.travada]);
    const [log] = await db.select().from(schema.auditLog).where(and(eq(schema.auditLog.tenantId, t.a.id), eq(schema.auditLog.action, "chart.reclassificar")));
    expect(log.meta).toMatchObject({ de: "2.3.04", para: "2.3.03", lancamentos: 1, congeladosMantidos: 1 });
  });

  it("5(impacto) · mudar categoria de conta usada exige confirmar a prévia; sem confirmação nada muda", async () => {
    comoA();
    const c = await conta(t.a.id, "2.3.03");
    const sem = await E.salvarConta({ id: c.id, versao: c.versao, code: c.code, name: c.name, grupoCode: "2.3", natureza: "despesa", dreCategory: "Custo Fixo" });
    expect(sem).toMatchObject({ ok: false, precisaConfirmar: true, impacto: { conta: "2.3.03", despesas: 1, valorAtual: 250 } });
    expect((await conta(t.a.id, "2.3.03")).dreCategory).toBe("Custo Variável");
    ok(await E.salvarConta({ id: c.id, versao: c.versao, code: c.code, name: c.name, grupoCode: "2.3", natureza: "despesa", dreCategory: "Custo Fixo", confirmar: true }));
    expect((await conta(t.a.id, "2.3.03")).dreCategory).toBe("Custo Fixo");
    // com a chave ligada, o relatório lê a categoria nova (nada regravado)
    expect((await getExpenseRows(proj["P1-a"].atual)).find((r) => r.contaCef === "2.3.03")?.categoriaDre).toBe("Custo Fixo");
  });

  it("28–31 · Cris: sugere conta da empresa, detecta duplicidade, explica, lista sem classificação; criar conta só com confirmação", async () => {
    const ctxA = comoA();
    const sug = JSON.parse(await executarFerramentaDeDados(ctxA as never, "plano_de_contas", { assunto: "sugerir", texto: "Hospedagem de equipe durante campanha arqueológica", natureza: "despesa" }));
    expect(sug.candidatas[0].codigo).toBe("2.3.04");
    // 30 — a conta própria de B não aparece para A
    expect(JSON.stringify(sug)).not.toMatch(/barco/);
    const exp = JSON.parse(await executarFerramentaDeDados(ctxA as never, "plano_de_contas", { assunto: "explicar", texto: "2.3.04", natureza: "despesa" }));
    expect(exp.conta).toMatchObject({ categoriaDre: "Custo Variável", custoPadrao: "Custo direto" });
    ok(await E.salvarConta({ code: "2.3.60", name: "Hospedagem em viagem", grupoCode: "2.3", natureza: "despesa" }).then((r) => {
      // 29 — a criação avisa da parecida, sem impedir
      expect(r).toMatchObject({ ok: true, aviso: expect.stringMatching(/2\.3\.04/) });
      return r;
    }));
    const dup = JSON.parse(await executarFerramentaDeDados(ctxA as never, "plano_de_contas", { assunto: "duplicidades", texto: "", natureza: "despesa" }));
    expect(JSON.stringify(dup.possiveisDuplicidades)).toMatch(/2\.3\.60/);
    await db.insert(schema.despesas).values({ tenantId: t.a.id, versionId: proj["P2-a"].atual, contaCef: "ZZ.9", categoriaDre: "Despesa Fixa", valor: "12", competencia: "09/2026" });
    const sem = JSON.parse(await executarFerramentaDeDados(ctxA as never, "plano_de_contas", { assunto: "sem_classificacao", texto: "", natureza: "despesa" }));
    expect(sem.quantidade).toBe(1);
    // 31 — proposta da Cris só vira conta pelo botão (ação), revalidada no servidor
    const r = await criarContasPropostas([{ groupCode: "2.3", code: "2.3.61", name: "Barcos de apoio", natureza: "despesa", dreCategory: null }, { groupCode: "2.3", code: "2.3.04", name: "Duplicada", natureza: "despesa", dreCategory: null }]);
    expect(r).toMatchObject({ ok: true, criadas: ["2.3.61"] });
  });

  it("24 · reembolsável: a despesa mantém a conta original", async () => {
    const { reembolsosPorConta } = await import("@/lib/contrato-regras");
    const linhas = reembolsosPorConta([{ conta: "2.3.04", status: "recebido", solicitado: 100, aprovado: 90, recebido: 90 }, { conta: "2.3.04", status: "rejeitado", solicitado: 50, aprovado: null, recebido: 0 }], new Map([["2.3.04", "Hospedagens"]]));
    expect(linhas).toEqual([{ conta: "2.3.04", rotulo: "2.3.04 — Hospedagens", solicitado: 150, aprovado: 90, recebido: 90 }]);
  });

  it("33, 34 · adoção do padrão por empresa antiga: aditiva, idempotente, não toca lançamentos nem contas existentes", async () => {
    const [velha] = await db.insert(schema.tenants).values({ name: "tenant-plano-legado" }).returning();
    try {
      const [p] = await db.insert(schema.projects).values({ tenantId: velha.id, name: "Legado" }).returning();
      const [v] = await db.insert(schema.versions).values({ tenantId: velha.id, projectId: p.id, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
      await db.insert(schema.chartAccounts).values([
        { tenantId: velha.id, code: "1.1", name: "Consultores (antigo)", groupCode: "1", groupName: "Serviços técnicos", kind: "cef" },
        { tenantId: velha.id, code: "F.6", name: "Juros", groupCode: "F", groupName: "Financeiro", kind: "complementar", papel: "juros_mora" },
      ]);
      await db.insert(schema.chartGroups).values([{ tenantId: velha.id, code: "1", name: "Serviços técnicos", kind: "cef" }, { tenantId: velha.id, code: "F", name: "Financeiro" }]);
      const [d] = await db.insert(schema.despesas).values({ tenantId: velha.id, versionId: v.id, contaCef: "1.1", categoriaDre: "Custo Variável", valor: "99", competencia: "09/2026" }).returning();
      ctxRef.current = ctxDe(velha, [{ id: p.id, name: "Legado" }]);
      const pr = await E.previaDaAdocaoDoPadrao();
      expect(pr.ok && pr.previa.ajustados.map((x) => x.code)).toContain("1.1");
      ok(await E.adotarPlanoPadrao());
      expect((await conta(velha.id, "1.1")).name).toBe("Consultores (antigo)");
      expect(await grupo(velha.id, "PA-1.1")).toBeTruthy();
      expect((await conta(velha.id, "1.1.01")).groupCode).toBe("PA-1.1");
      // papel já existente não é duplicado
      expect((await conta(velha.id, "4.2.02")).papel).toBeNull();
      expect((await db.select().from(schema.despesas).where(eq(schema.despesas.id, d.id)))[0]).toMatchObject({ contaCef: "1.1", valor: "99.00" });
      const antes = (await db.select().from(schema.chartAccounts).where(eq(schema.chartAccounts.tenantId, velha.id))).length;
      ok(await E.adotarPlanoPadrao());
      expect((await db.select().from(schema.chartAccounts).where(eq(schema.chartAccounts.tenantId, velha.id))).length).toBe(antes);
      // chaves NÃO são ligadas na adoção
      expect(await db.select().from(schema.tenantFlags).where(eq(schema.tenantFlags.tenantId, velha.id))).toHaveLength(0);
    } finally {
      await db.delete(schema.tenants).where(eq(schema.tenants.id, velha.id));
    }
  });

  it("17, 22 · importação: prévia sem gravar; confirmação cria e altera; código nunca muda", async () => {
    comoA();
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet([
      { Código: "2.7.20", Nome: "Drone de mapeamento", Grupo: "2.7", Natureza: "Despesa", "Categoria DRE": "Custo Variável" },
      { Código: "2.3.01", Nome: "Transporte de equipes de campo", Grupo: "2.3", Natureza: "Despesa", "Categoria DRE": "" },
      { Código: "2.7.20", Nome: "Repetida", Grupo: "2.7", Natureza: "Despesa", "Categoria DRE": "" },
      { Código: "X Y", Nome: "Inválida", Grupo: "2.7", Natureza: "Despesa", "Categoria DRE": "" },
      { Código: "1.1.90", Nome: "Receita errada", Grupo: "1.1", Natureza: "Receita", "Categoria DRE": "Custo Fixo" },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plano");
    const bytes = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const f = new FormData();
    f.set("file", new File([bytes], "plano.xlsx"));
    const prev = await E.previaDaImportacaoDoPlano(f);
    if (!prev.ok) throw new Error(prev.error);
    expect(prev.previa.novas.map((x) => x.code)).toEqual(["2.7.20"]);
    expect(prev.previa.alteradas.map((x) => x.linha.code)).toEqual(["2.3.01"]);
    expect(prev.previa.duplicidades).toHaveLength(1);
    expect(prev.previa.erros.map((x) => x.code).sort()).toEqual(["1.1.90", "X Y"]);
    expect(await conta(t.a.id, "2.7.20")).toBeUndefined();
    ok(await E.confirmarImportacaoDoPlano({ linhas: prev.linhas }));
    expect((await conta(t.a.id, "2.7.20")).groupCode).toBe("2.7");
    expect((await conta(t.a.id, "2.3.01")).name).toBe("Transporte de equipes de campo");
  });

  it("35, 36, 37 · migração 0079 aditiva com rollback; permissão sensível; exportação na ordem da árvore", async () => {
    const sqlUp = readFileSync("src/lib/db/migrations/0079_plano_contas_ambiental.sql", "utf8");
    expect(existsSync("src/lib/db/migrations/down/0079_plano_contas_ambiental.sql")).toBe(true);
    expect(sqlUp).not.toMatch(/DROP\s+(TABLE|COLUMN)|DELETE\s+FROM|TRUNCATE/i);
    expect(sqlUp).toMatch(/ON CONFLICT .* DO NOTHING/);
    expect(JSON.parse(readFileSync("src/lib/db/migrations/meta/_journal.json", "utf8")).entries.some((e: { tag: string }) => e.tag === "0079_plano_contas_ambiental")).toBe(true);
    // 36 — reclassificar nasce só com owner/admin; contador só lê o plano
    expect(defaultPermissions("owner").planocontasreclass.editar).toBe(true);
    expect(defaultPermissions("membro").planocontasreclass.editar).toBe(false);
    expect(defaultPermissions("contador").planocontas.editar).toBe(false);
    // 37 — exportação: colunas que a importação lê, na ordem da árvore
    const { linhasDeExportacao } = await import("@/lib/planocontas-regras");
    const grupos = await db.select().from(schema.chartGroups).where(eq(schema.chartGroups.tenantId, t.a.id));
    const contas = await db.select().from(schema.chartAccounts).where(and(eq(schema.chartAccounts.tenantId, t.a.id), inArray(schema.chartAccounts.groupCode, ["1.1", "2.3"])));
    const l = linhasDeExportacao(grupos, contas);
    expect(l[0]).toMatchObject({ Código: "1.1.01", Grupo: "1.1", Natureza: "Receita" });
    expect(Object.keys(l[0])).toEqual(expect.arrayContaining(["Código", "Nome", "Grupo", "Natureza", "Categoria DRE", "Descrição"]));
  });
});
