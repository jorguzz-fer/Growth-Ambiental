import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";

/**
 * Integração operacional (Etapa 2) — Postgres isolado: cliente com vários
 * projetos e projeto com vários contratos (consolidação sem duplicidade),
 * alocação e horas (custo-hora da alocação, administrativo, idempotência,
 * validações), rateio por horas, NFS-e ligada a contrato e medição sem dois
 * recebíveis faturados, indicadores executivos, relatório gerencial
 * reconciliável, permissões e isolamento entre empresas.
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

describe.skipIf(!HAS_DB)("Integração operacional — integração", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const C = await import("./contratos");
  const H = await import("./horas");
  const N = await import("./notas-servico");
  const { indicadoresExecutivos } = await import("@/lib/indicadores-executivos");
  const { fatosGerenciais } = await import("@/lib/relatorio-gerencial-dados");
  const { tabelaGerencial, receitaValida } = await import("@/lib/relatorio-custom");
  const { METRICAS } = await import("@/lib/relatorio-gerencial");

  type P = { id: string; name: string; situacao: "Ativo" | "Finalizado" | null };
  const t = { a: "", b: "" };
  let pA: P;
  let pB: P;
  let pOutra: P;
  let ctxA: Record<string, unknown>;
  let ctxB: Record<string, unknown>;
  let cliente = "";
  let func = "";
  let prest = "";
  let contrato1 = "";
  let contrato2 = "";
  let medicao = "";
  const ok = <T extends { ok: boolean }>(r: T) => {
    if (!r.ok) throw new Error((r as unknown as { error: string }).error);
    return r as T & { ok: true; id: string };
  };
  const fd = (o: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) f.set(k, v);
    return f;
  };

  beforeAll(async () => {
    const [ta] = await db.insert(schema.tenants).values({ name: "operacional-A" }).returning();
    const [tb] = await db.insert(schema.tenants).values({ name: "operacional-B" }).returning();
    t.a = ta.id;
    t.b = tb.id;
    const mk = async (tenantId: string, name: string) => (await db.insert(schema.projects).values({ tenantId, name, situacao: "Ativo" }).returning())[0] as unknown as P;
    pA = await mk(t.a, "Arqueologia Norte");
    pB = await mk(t.a, "Fauna Sul");
    pOutra = await mk(t.b, "Projeto da B");
    for (const p of [pA, pB]) await db.insert(schema.versions).values({ projectId: p.id, tenantId: t.a, key: "atual", kind: "atual", label: "Atual", color: "#000" });
    await db.insert(schema.versions).values({ projectId: pOutra.id, tenantId: t.b, key: "atual", kind: "atual", label: "Atual", color: "#000" });
    cliente = (await db.insert(schema.clientes).values({ tenantId: t.a, nomeCompleto: "Mineradora Fictícia" }).returning())[0].id;
    func = (await db.insert(schema.funcionarios).values({ tenantId: t.a, nome: "Ana Arqueóloga" }).returning())[0].id;
    prest = (await db.insert(schema.stakeholders).values({ tenantId: t.a, nome: "Bruno Biólogo", tipo: "PF", papeis: ["Prestador de Serviço"] }).returning())[0].id;
    ctxA = { tenant: ta, projects: [pA, pB], userId: null, userEmail: "gestor@a", role: "owner", perms: defaultPermissions("owner") };
    ctxB = { tenant: tb, projects: [pOutra], userId: null, userEmail: "gestor@b", role: "owner", perms: defaultPermissions("owner") };
    ctxRef.current = ctxA;
    const { garantirModalidades } = await import("@/lib/contrato-modalidades");
    await garantirModalidades(t.a);
  });
  afterAll(async () => {
    for (const id of [t.a, t.b]) if (id) await db.delete(schema.tenants).where(eq(schema.tenants.id, id));
  });

  it("1-4 · cliente com dois projetos; projeto A com dois contratos; contrato que atende A e B entra uma vez no consolidado", async () => {
    ctxRef.current = ctxA;
    const c1 = ok(await C.salvarContrato({ titulo: "Monitoramento A+B", valorOriginal: 100000, clienteId: cliente, projetos: [{ projectId: pA.id, valorAlocado: 60000 }, { projectId: pB.id, valorAlocado: 40000 }] }));
    const c2 = ok(await C.salvarContrato({ titulo: "Relatório A", valorOriginal: 20000, clienteId: cliente, projetos: [{ projectId: pA.id }] }));
    for (const c of [c1, c2]) ok(await C.mudarStatusContrato({ id: c.id, para: "ativo" }));
    contrato1 = c1.id;
    contrato2 = c2.id;
    const tudo = await indicadoresExecutivos(t.a, [pA, pB], {});
    expect(tudo.contratado).toBe(120000);
    const soA = await indicadoresExecutivos(t.a, [pA], {});
    expect(soA.contratado).toBe(80000); // 60 mil alocados + 20 mil do contrato só de A
    const soB = await indicadoresExecutivos(t.a, [pB], {});
    expect(soA.contratado + soB.contratado).toBe(tudo.contratado);
    const porContrato = await indicadoresExecutivos(t.a, [pA, pB], { contratoId: c2.id });
    expect(porContrato.contratado).toBe(20000);
    expect(tudo.contratosAtivos).toBe(2);
    expect(tudo.projetosAtivos).toBe(2);
  });

  it("5-7 · horas: custo-hora da alocação, administrativo sem custo, idempotência e validações", async () => {
    const [aloc] = await db.insert(schema.equipesProjeto).values({ tenantId: t.a, projectId: pA.id, funcionarioId: func, situacao: "ativa" }).returning();
    ok(await H.definirCustoHora(aloc.id, "100"));
    const chave = "h-1";
    const r1 = ok(await H.registrarHoras({ tipo: "realizado", profissional: `f:${func}`, projectId: pA.id, contratoId: contrato1, data: "03/10/2027", horas: 12, idempotencyKey: chave }));
    const r1b = ok(await H.registrarHoras({ tipo: "realizado", profissional: `f:${func}`, projectId: pA.id, contratoId: contrato1, data: "03/10/2027", horas: 12, idempotencyKey: chave }));
    expect(r1b.id).toBe(r1.id);
    const r2 = ok(await H.registrarHoras({ tipo: "realizado", profissional: `f:${func}`, projectId: pB.id, data: "03/11/2027", horas: 20 }));
    expect(r2.aviso).toMatch(/Sem custo-hora/);
    ok(await H.registrarHoras({ tipo: "realizado", profissional: `f:${func}`, atividadeInterna: "Administrativo", data: "03/12/2027", horas: 8 }));
    ok(await H.registrarHoras({ tipo: "planejado", profissional: `s:${prest}`, projectId: pA.id, data: "03/01/2027", horas: 40 }));
    const [h1] = await db.select().from(schema.apontamentosHora).where(eq(schema.apontamentosHora.id, r1.id));
    expect(h1).toMatchObject({ custoHora: "100.00", competencia: "03/2027", contratoId: contrato1 });
    // contrato que não é do projeto, projeto de outra empresa e horas inválidas são recusados
    expect(await H.registrarHoras({ tipo: "realizado", profissional: `f:${func}`, projectId: pB.id, contratoId: contrato2, data: "03/10/2027", horas: 1 })).toMatchObject({ ok: false, error: expect.stringMatching(/não está vinculado/) });
    expect(await H.registrarHoras({ tipo: "realizado", profissional: `f:${func}`, projectId: pOutra.id, data: "03/10/2027", horas: 1 })).toMatchObject({ ok: false });
    expect(await H.registrarHoras({ tipo: "realizado", profissional: `f:${func}`, projectId: pA.id, data: "03/10/2027", horas: 30 })).toMatchObject({ ok: false });
    // horas NÃO geram despesa
    const desp = await db.select().from(schema.despesas).where(eq(schema.despesas.tenantId, t.a));
    expect(desp).toHaveLength(0);
  });

  it("8 · rateio por horas: percentuais pelos projetos (administrativo fora), da própria empresa", async () => {
    const r = await H.sugerirRateioPorHoras({ competencia: "03/2027" });
    if (!r.ok) throw new Error(r.error);
    expect(r.linhas.map((l) => [l.nome, l.horas, l.percentual])).toEqual([
      ["Fauna Sul", 20, 62.5],
      ["Arqueologia Norte", 12, 37.5],
    ]);
    ctxRef.current = ctxB;
    const rb = await H.sugerirRateioPorHoras({ competencia: "03/2027" });
    expect(rb.ok && rb.linhas).toEqual([]);
    ctxRef.current = ctxA;
  });

  it("9-10 · NFS-e ligada a contrato e medição aprovada; a mesma conta a receber não recebe duas notas", async () => {
    const m = ok(await C.salvarMedicao({ contratoId: contrato1, competencia: "03/2027", valor: 30000, enviar: true, projectId: pA.id }));
    ok(await C.mudarStatusMedicao({ id: m.id, para: "aprovada" }));
    medicao = m.id;
    const f = ok(await C.faturarContrato({ contratoId: contrato1, projectId: pA.id, valor: 30000, vencimento: "03/20/2027" }));
    const base = { projectId: pA.id, discriminacao: "Monitoramento arqueológico — medição 1", valorServicos: "30.000,00", aliquotaIss: "3", tomadorCpfCnpj: "11.222.333/0001-81", tomadorNome: "Mineradora Fictícia", contratoId: contrato1, contratoMedicaoId: medicao, contaReceberId: f.id };
    const n1 = ok(await N.salvarRascunhoDeNota(fd(base)));
    const [nota] = await db.select().from(schema.notasServico).where(eq(schema.notasServico.id, n1.id));
    expect(nota).toMatchObject({ contratoId: contrato1, contratoMedicaoId: medicao, clienteId: cliente, contaReceberId: f.id });
    expect(await N.salvarRascunhoDeNota(fd(base))).toMatchObject({ ok: false, error: expect.stringMatching(/já tem outra nota/) });
    // editar a própria nota continua possível
    ok(await N.salvarRascunhoDeNota(fd({ ...base, id: n1.id, discriminacao: "Monitoramento — medição 1 (corrigido)" })));
    // contrato que não é do projeto, medição de outro contrato
    expect(await N.salvarRascunhoDeNota(fd({ ...base, contaReceberId: "", projectId: pB.id, contratoId: contrato2, contratoMedicaoId: "" }))).toMatchObject({ ok: false, error: expect.stringMatching(/não está vinculado/) });
    expect(await N.salvarRascunhoDeNota(fd({ ...base, contaReceberId: "", contratoId: contrato2 }))).toMatchObject({ ok: false, error: expect.stringMatching(/não é deste contrato/) });
    // a nota não cria recebível
    const contas = await db.select().from(schema.contasReceber).where(and(eq(schema.contasReceber.tenantId, t.a), eq(schema.contasReceber.contratoId, contrato1)));
    expect(contas).toHaveLength(1);
  });

  it("11-12 · dashboard por projeto e consolidado: medido, faturado e horas", async () => {
    const a = await indicadoresExecutivos(t.a, [pA], {}, new Date(2027, 2, 15));
    // o contrato 1 atende A (60 mil) e B (40 mil): A vê a sua parte (60%)
    expect(a).toMatchObject({ medido: 18000, faturado: 18000 });
    expect(a.horas).toMatchObject({ competencia: "03/2027", realizadas: 12, planejadas: 40, custoPessoalGerencial: 1200 });
    const todos = await indicadoresExecutivos(t.a, [pA, pB], {}, new Date(2027, 2, 15));
    expect(todos.horas.realizadas).toBe(32);
    expect(todos.medido).toBe(30000);
  });

  it("13-14 · relatório gerencial: por contrato e por cliente, total reconciliável; isolamento", async () => {
    const fatos = await fatosGerenciais(t.a, [pA, pB], { incluirHoras: true });
    const r = receitaValida({ fonte: "gerencial", dim: "contrato", metricas: "contratado,medido,faturado,horasRealizadas" }, [pA.id, pB.id]);
    const tab = tabelaGerencial(fatos, r, [...METRICAS]);
    const total = tab.linhas.at(-1)!;
    expect(total.label).toBe("Total");
    expect(total.valores).toEqual([120000, 30000, 30000, 32]);
    const porCliente = tabelaGerencial(fatos, { ...r, dim: "cliente" }, [...METRICAS]);
    expect(porCliente.linhas.at(-1)!.valores).toEqual(total.valores);
    // métrica de horas sem permissão não aparece
    expect(tabelaGerencial(fatos, r, METRICAS.filter((m) => !m.startsWith("horas"))).colunas).not.toContain("Horas realizadas");
    // outra empresa: nada
    expect(await fatosGerenciais(t.b, [pOutra], { incluirHoras: true })).toEqual([]);
  });

  it("16-17 · permissões: técnico de campo sem Equipes não aponta; outra empresa não exclui", async () => {
    ctxRef.current = { ...ctxA, role: "engenheiro", perms: defaultPermissions("engenheiro") };
    expect(await H.registrarHoras({ tipo: "realizado", profissional: `f:${func}`, projectId: pA.id, data: "03/10/2027", horas: 1 })).toMatchObject({ ok: false, error: expect.stringMatching(/Sem permissão/) });
    ctxRef.current = ctxB;
    const [h] = await db.select().from(schema.apontamentosHora).where(eq(schema.apontamentosHora.tenantId, t.a)).limit(1);
    expect(await H.excluirApontamento(h.id)).toMatchObject({ ok: false, error: expect.stringMatching(/não encontrado/) });
    ctxRef.current = ctxA;
  });
});
