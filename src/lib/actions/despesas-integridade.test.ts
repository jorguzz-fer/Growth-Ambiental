import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";

/**
 * Prompt I, PR I-1 — despesas: validações (§11), transação, trava de edição,
 * lock em tudo e retorno legível. Integração: só com DATABASE_URL.
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

describe.skipIf(!HAS_DB)("Despesas — integridade (Prompt I, §11 e §19)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { addDespesa, updateDespesa, deleteDespesa, cancelarDespesa, pagarDespesa } = await import("./despesas");
  let tenantId = "";
  let projectId = "";
  let versionId = "";
  const fd = (campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    return f;
  };
  const base = () => ({ projectId, categoriaDre: "Custo Variável", valor: "100", competencia: "09/2026", vencimento: "09/30/2026" });
  const despesasDoTenant = () => db.select().from(schema.despesas).where(eq(schema.despesas.tenantId, tenantId));
  const lock = (locked: boolean) => db.update(schema.versions).set({ locked }).where(eq(schema.versions.id, versionId));

  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "desp-I1" }).returning();
    tenantId = t.id;
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "OBRA I1" }).returning();
    projectId = p.id;
    const [v] = await db
      .insert(schema.versions)
      .values({ projectId, tenantId, key: "atual", kind: "atual", label: "Atual", color: "#000" })
      .returning();
    versionId = v.id;
    ctxRef.current = { tenant: t, projects: [p], userId: null, userEmail: null, role: "owner", perms: defaultPermissions("owner") };
  });
  afterAll(async () => {
    if (tenantId) await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("11.1 — valor negativo é recusado com mensagem, nada gravado", async () => {
    const r = await addDespesa(fd({ ...base(), valor: "-50" }));
    expect(r).toEqual({ ok: false, error: "O valor da despesa precisa ser maior que zero." });
    expect(await despesasDoTenant()).toHaveLength(0);
  });

  it("11.3 — parcelas 40 + 40 contra total 100: o servidor rejeita (§47.9)", async () => {
    const parcelasJson = JSON.stringify([
      { vencimento: "10/30/2026", valor: 40, status: "Pendente" },
      { vencimento: "11/30/2026", valor: 40, status: "Pendente" },
    ]);
    const r = await addDespesa(fd({ ...base(), parcelasJson }));
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toMatch(/não fecha/);
    expect(await despesasDoTenant()).toHaveLength(0);
  });

  it("11.4 — status de parcela fora da lista é recusado", async () => {
    const parcelasJson = JSON.stringify([{ vencimento: "10/30/2026", valor: 100, status: "Quitada" }]);
    const r = await addDespesa(fd({ ...base(), parcelasJson }));
    expect((r as { error: string }).error).toMatch(/Status de parcela inválido/);
  });

  it("11.2 — pagador inexistente não deixa despesa pela metade", async () => {
    // Antes, o sócio inexistente violava a chave estrangeira DEPOIS de a
    // despesa ter sido inserida, e a transação desfazia tudo. Desde o Prompt
    // S3 o servidor confere o pagador antes de gravar: a recusa vem antes.
    expect(await addDespesa(fd({ ...base(), pagoPorSocioId: "00000000-0000-0000-0000-000000000000", socioDataPagamento: "09/01/2026" }))).toEqual({
      ok: false,
      error: "Quem desembolsou não foi encontrado nesta empresa.",
    });
    expect(await despesasDoTenant()).toHaveLength(0);
  });

  it("Prompt S3 — pagador de OUTRA empresa ou inativo é recusado antes de gravar", async () => {
    const [outra] = await db.insert(schema.tenants).values({ name: "desp-S3-outra" }).returning();
    const [deFora] = await db.insert(schema.stakeholders).values({ tenantId: outra.id, nome: "Sócio de fora" }).returning();
    const [inativo] = await db.insert(schema.stakeholders).values({ tenantId, nome: "Sócio inativo", ativo: false }).returning();
    try {
      expect(await addDespesa(fd({ ...base(), pagoPorSocioId: deFora.id, socioDataPagamento: "09/01/2026" }))).toMatchObject({ ok: false, error: "Quem desembolsou não foi encontrado nesta empresa." });
      expect(await addDespesa(fd({ ...base(), pagoPorSocioId: inativo.id, socioDataPagamento: "09/01/2026" }))).toMatchObject({ ok: false, error: "Quem desembolsou está inativo no cadastro." });
      expect(await addDespesa(fd({ ...base(), pagoPorSocioId: "nao-e-id", socioDataPagamento: "09/01/2026" }))).toMatchObject({ ok: false });
      expect(await despesasDoTenant()).toHaveLength(0);
    } finally {
      await db.delete(schema.tenants).where(eq(schema.tenants.id, outra.id));
      await db.delete(schema.stakeholders).where(eq(schema.stakeholders.id, inativo.id));
    }
  });

  it("11.5 — réplicas recorrentes nascem 'A pagar', sem pago por terceiro", async () => {
    const r = await addDespesa(fd({ ...base(), status: "Pago", recorrente: "on", recorrenciaMeses: "3" }));
    expect(r.ok).toBe(true);
    const rows = await despesasDoTenant();
    expect(rows).toHaveLength(3);
    const original = rows.find((d) => d.id === (r as { id: string }).id)!;
    expect(original.status).toBe("Pago");
    const replicas = rows.filter((d) => d.id !== original.id);
    expect(replicas.map((d) => d.status)).toEqual(["A pagar", "A pagar"]);
    expect(replicas.map((d) => d.competencia).sort()).toEqual(["10/2026", "11/2026"]);
    expect(replicas.every((d) => !d.pagoPorTerceiro)).toBe(true);
    await db.delete(schema.despesas).where(eq(schema.despesas.tenantId, tenantId));
  });

  it("11.6 — com parcela paga, valor e status não mudam; obs muda", async () => {
    const parcelasJson = JSON.stringify([
      { vencimento: "10/30/2026", valor: 60, status: "Pendente" },
      { vencimento: "11/30/2026", valor: 40, status: "Pendente" },
    ]);
    const r = await addDespesa(fd({ ...base(), parcelasJson }));
    const id = (r as { id: string }).id;
    // Só parcelas em aberto: o valor trava, o resto passa.
    expect((await updateDespesa(id, { valor: "150" })).ok).toBe(false);
    expect((await updateDespesa(id, { status: "A pagar", obs: "nota 1" })).ok).toBe(true);
    const [p1] = await db.select().from(schema.despesaParcelas).where(eq(schema.despesaParcelas.despesaId, id));
    await db.update(schema.despesaParcelas).set({ valorPago: "60", status: "Pago" }).where(eq(schema.despesaParcelas.id, p1.id));
    const rv = await updateDespesa(id, { valor: "150" });
    expect(rv.ok).toBe(false);
    expect((rv as { error: string }).error).toMatch(/parcela\(s\) paga\(s\)/);
    expect((await updateDespesa(id, { status: "Pago" })).ok).toBe(false);
    expect((await updateDespesa(id, { obs: "nota 2", fornecedorId: null })).ok).toBe(true);
    const [d] = await db.select().from(schema.despesas).where(eq(schema.despesas.id, id));
    expect(d.valor).toBe("100.00");
    expect(d.obs).toBe("nota 2");
  });

  it("11.1 na edição — valor inválido recusado (antes virava '0')", async () => {
    const [d] = await despesasDoTenant();
    // Sem parcela paga aqui: usa uma despesa nova, simples.
    const r0 = await addDespesa(fd({ ...base(), valor: "10" }));
    const id = (r0 as { id: string }).id;
    expect((await updateDespesa(id, { valor: "abc" })).ok).toBe(false);
    expect((await updateDespesa(id, { valor: "-5" })).ok).toBe(false);
    const [depois] = await db.select().from(schema.despesas).where(eq(schema.despesas.id, id));
    expect(depois.valor).toBe("10.00");
    expect(d).toBeDefined();
  });

  it("11.7 — versão congelada bloqueia editar, cancelar, pagar e excluir", async () => {
    const r0 = await addDespesa(fd({ ...base(), valor: "20" }));
    const id = (r0 as { id: string }).id;
    await lock(true);
    for (const r of [
      await updateDespesa(id, { obs: "x" }),
      await cancelarDespesa(id, "teste"),
      await pagarDespesa({ despesaId: id, dataPagamento: "09/29/2026", valorPago: 20 }),
      await deleteDespesa(id),
    ]) {
      expect(r.ok).toBe(false);
      expect((r as { error: string }).error).toMatch(/congelada/);
    }
    await lock(false);
    const [d] = await db.select().from(schema.despesas).where(eq(schema.despesas.id, id));
    expect(d.cancelado).toBe(false);
    expect(d.status).toBe("A pagar");
  });

  it("11.9 — sem permissão, resposta com mensagem em vez de silêncio", async () => {
    const salvo = ctxRef.current;
    ctxRef.current = { ...(salvo as object), role: "contador", perms: defaultPermissions("contador") };
    expect(await addDespesa(fd(base()))).toEqual({ ok: false, error: "Sem permissão para lançar despesas." });
    expect(await deleteDespesa("00000000-0000-0000-0000-000000000000")).toEqual({ ok: false, error: "Sem permissão para excluir despesas." });
    ctxRef.current = salvo;
  });

});
