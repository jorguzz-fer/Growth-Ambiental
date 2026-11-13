import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";

/**
 * Prompt M, 6.6–6.8 — unidades por obra, interesse de 1 a 5 e a listagem
 * com busca, filtro e paginação. Integração: só com DATABASE_URL.
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

describe.skipIf(!HAS_DB)("Clientes — unidade por obra, interesse e listagem (Prompt M, 6.6–6.8)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { getClientesPagina, getStatusContratoUsados } = await import("@/lib/queries");
  const { STATUS_EM_BRANCO, termosDaBusca } = await import("@/lib/clientes-regras");
  const { addCliente, updateCliente } = await import("./clientes");
  const tenants: string[] = [];
  let tA = "";
  const p: Record<string, string> = {};
  const fd = (campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    return f;
  };
  const pagina = (q: string, status = "", n = 1, porPagina = 50) =>
    getClientesPagina(tA, { termos: termosDaBusca(q), status, pagina: n, porPagina, statusEmBranco: STATUS_EM_BRANCO });

  beforeAll(async () => {
    const [a] = await db.insert(schema.tenants).values({ name: "cli-lista-A" }).returning();
    const [b] = await db.insert(schema.tenants).values({ name: "cli-lista-B" }).returning();
    tA = a.id;
    tenants.push(a.id, b.id);
    for (const [k, t, nome] of [
      ["o1", a.id, "OBRA 1"],
      ["o2", a.id, "OBRA 2"],
      ["b1", b.id, "OBRA B"],
    ] as const) {
      const [proj] = await db.insert(schema.projects).values({ tenantId: t, name: nome }).returning();
      p[k] = proj.id;
      const vers = [];
      for (const kind of ["atual", "budget"] as const) {
        const [v] = await db
          .insert(schema.versions)
          .values({ projectId: proj.id, tenantId: t, key: kind, kind, label: kind, color: "#000" })
          .returning();
        vers.push(v);
      }
      // Mesma unidade nas duas versões: aparece uma vez por obra.
      const codes = k === "o1" ? ["101", "102"] : k === "o2" ? ["101", "201"] : ["B-1"];
      for (const v of vers) {
        for (const code of codes) {
          await db.insert(schema.units).values({ tenantId: t, versionId: v.id, code, valor: "1" });
        }
      }
    }
    ctxRef.current = {
      tenant: a,
      projects: [],
      userId: null,
      userEmail: null,
      role: "owner",
      perms: defaultPermissions("owner"),
    };
    const nomes: [string, string | null, string | null][] = [
      ["José Conceição", "101", "Assinado"],
      ["Ana Souza", "102", " Assinado "],
      ["Bruno Lima", "201", null],
      ["Carla 50%_x", null, ""],
      ["Diego Alves", null, "Distratado"],
    ];
    for (const [nomeCompleto, unitCode, statusContrato] of nomes) {
      await db.insert(schema.clientes).values({ tenantId: a.id, nomeCompleto, unitCode, statusContrato });
    }
    await db.insert(schema.clientes).values({ tenantId: b.id, nomeCompleto: "José de Outra Empresa" });
  });
  afterAll(async () => {
    for (const id of tenants) await db.delete(schema.tenants).where(eq(schema.tenants.id, id));
  });

  it("6.8 — busca por nome sem acento e caixa; só do tenant", async () => {
    const r = await pagina("jose conceicao");
    expect(r.itens.map((c) => c.nomeCompleto)).toEqual(["José Conceição"]);
    expect(r.totalGeral).toBe(5);
  });

  it("6.8 — busca por unidade", async () => {
    expect((await pagina("201")).itens.map((c) => c.nomeCompleto)).toEqual(["Bruno Lima"]);
  });

  it("6.8 — % e _ na busca são texto, não curinga", async () => {
    expect((await pagina("50%_")).itens.map((c) => c.nomeCompleto)).toEqual(["Carla 50%_x"]);
    expect((await pagina("_")).itens.map((c) => c.nomeCompleto)).toEqual(["Carla 50%_x"]);
  });

  it("6.8 — filtro por status ignora espaços; 'sem status' pega nulo e vazio", async () => {
    expect((await pagina("", "Assinado")).itens.map((c) => c.nomeCompleto)).toEqual(["Ana Souza", "José Conceição"]);
    expect((await pagina("", STATUS_EM_BRANCO)).itens.map((c) => c.nomeCompleto)).toEqual(["Bruno Lima", "Carla 50%_x"]);
    const usados = await getStatusContratoUsados(tA);
    expect(usados).toContainEqual({ status: "Assinado", qtd: 2 });
    expect(usados).toContainEqual({ status: null, qtd: 2 });
  });

  it("6.8 — paginação: total do filtro e fatias estáveis", async () => {
    const p1 = await pagina("", "", 1, 2);
    const p2 = await pagina("", "", 2, 2);
    const p3 = await pagina("", "", 3, 2);
    expect(p1.total).toBe(5);
    expect([...p1.itens, ...p2.itens, ...p3.itens].map((c) => c.nomeCompleto)).toEqual([
      "Ana Souza",
      "Bruno Lima",
      "Carla 50%_x",
      "Diego Alves",
      "José Conceição",
    ]);
  });

  it("6.7 — interesse fora de 1 a 5 é recusado no cadastro", async () => {
    const r = await addCliente(fd({ nomeCompleto: "Ele Seis", interesse: "6" }));
    expect(r).toEqual({ ok: false, error: "Interesse vai de 1 a 5." });
    expect((await addCliente(fd({ nomeCompleto: "Ele Cinco", interesse: "5" }))).ok).toBe(true);
  });

  it("6.2 — status fora da lista é recusado no cadastro; 'ATIVO' gravado segue valendo e não é convertido", async () => {
    const r = await addCliente(fd({ nomeCompleto: "Status Estranho", statusContrato: "Vigente" }));
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toMatch(/Status do contrato/);
    const [c] = await db
      .insert(schema.clientes)
      .values({ tenantId: tA, nomeCompleto: "Legado Ativo", statusContrato: "ATIVO" })
      .returning();
    expect((await updateCliente(fd({ id: c.id, nomeCompleto: "Legado Ativo", statusContrato: "ATIVO" }))).ok).toBe(true);
    const [depois] = await db.select().from(schema.clientes).where(eq(schema.clientes.id, c.id));
    expect(depois.statusContrato).toBe("ATIVO");
    const [x] = await db
      .insert(schema.clientes)
      .values({ tenantId: tA, nomeCompleto: "Legado Vigente", statusContrato: "Vigente" })
      .returning();
    expect((await updateCliente(fd({ id: x.id, nomeCompleto: "Legado Vigente", statusContrato: "Vigente" }))).ok).toBe(true);
    expect((await updateCliente(fd({ id: x.id, nomeCompleto: "Legado Vigente", statusContrato: "Outro" }))).ok).toBe(false);
    expect((await updateCliente(fd({ id: x.id, nomeCompleto: "Legado Vigente", statusContrato: "Distratado" }))).ok).toBe(true);
  });

  it("6.7 — valor fora da faixa já gravado: salvar sem mexer passa e não converte; trocar por outro fora, não", async () => {
    const [c] = await db
      .insert(schema.clientes)
      .values({ tenantId: tA, nomeCompleto: "Legado Sete", interesse: 7 })
      .returning();
    expect((await updateCliente(fd({ id: c.id, nomeCompleto: "Legado Sete", interesse: "7" }))).ok).toBe(true);
    const [depois] = await db.select().from(schema.clientes).where(eq(schema.clientes.id, c.id));
    expect(depois.interesse).toBe(7);
    const r = await updateCliente(fd({ id: c.id, nomeCompleto: "Legado Sete", interesse: "9" }));
    expect(r.ok).toBe(false);
    expect((await updateCliente(fd({ id: c.id, nomeCompleto: "Legado Sete", interesse: "4" }))).ok).toBe(true);
  });
});
