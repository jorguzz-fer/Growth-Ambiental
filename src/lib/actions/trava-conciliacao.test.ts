import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";

/**
 * Prompt S, seção 1 — despesa conciliada com o extrato: valor, vencimento e
 * competência não mudam, e a mensagem diz QUAL movimento (1.2) e, sem a
 * permissão de desfazer, diz isso com todas as letras (1.3). Integração.
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

describe.skipIf(!HAS_DB)("Trava de conciliação (Prompt S, PR S-3)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { addDespesa, updateDespesa } = await import("./despesas");
  let tenantId = "";
  let projectId = "";
  let versionId = "";
  let despesaId = "";
  let ctxOwner: unknown;
  const fd = (campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    return f;
  };
  const linha = () => db.select().from(schema.despesas).where(eq(schema.despesas.id, despesaId)).then((r) => r[0]);

  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "conc-S3" }).returning();
    tenantId = t.id;
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "OBRA S3" }).returning();
    projectId = p.id;
    const [v] = await db.insert(schema.versions).values({ projectId, tenantId, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
    versionId = v.id;
    ctxOwner = { tenant: t, projects: [p], userId: null, userEmail: "s3@teste", role: "owner", perms: defaultPermissions("owner") };
    ctxRef.current = ctxOwner;
    const r = await addDespesa(fd({ projectId, categoriaDre: "Custo Fixo", valor: "1234.56", competencia: "09/2026", vencimento: "09/30/2026", obs: "original" }));
    if (!r.ok) throw new Error(r.error);
    despesaId = r.id;
    await db.insert(schema.cashEntries).values({ tenantId, versionId, data: "09/05/2026", descricao: "PIX FORNECEDOR", valor: "-1234.56", cat: "despesa", conciliadoDespesaId: despesaId } as typeof schema.cashEntries.$inferInsert);
  });
  afterAll(async () => {
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("1 — valor, vencimento e competência são recusados, com o movimento identificado", async () => {
    for (const patch of [{ valor: "1000" }, { vencimento: "10/30/2026" }, { competencia: "10/2026" }]) {
      const r = await updateDespesa(despesaId, patch);
      expect(r.ok).toBe(false);
      const erro = (r as { error: string }).error;
      expect(erro).toMatch(/1 movimento\(s\) de caixa conciliado/);
      expect(erro).toMatch(/09\/05\/2026/);
      expect(erro).toMatch(/1\.234,56/);
      expect(erro).toMatch(/PIX FORNECEDOR/);
      expect(erro).toMatch(/Desfazer a conciliação, no Caixa, vem antes/);
      expect(erro).not.toMatch(/não tem/); // owner pode desfazer
    }
    const d = await linha();
    expect(d.valor).toBe("1234.56");
    expect(d.competencia).toBe("09/2026");
  });

  it("2 — descrição, fornecedor, conta do plano e categoria seguem editáveis", async () => {
    const r = await updateDespesa(despesaId, { obs: "corrigida", contaCef: "1.1", categoriaDre: "Custo Variável" });
    expect(r).toEqual({ ok: true });
    const d = await linha();
    expect(d.obs).toBe("corrigida");
    expect(d.contaCef).toBe("1.1");
    expect(d.categoriaDre).toBe("Custo Variável");
  });

  it("3 — quem edita mas não desfaz conciliação lê a explicação da permissão, não um erro genérico", async () => {
    const perms = defaultPermissions("owner");
    perms.caixa = { ...perms.caixa, excluir: false };
    ctxRef.current = { ...(ctxOwner as object), perms };
    const r = await updateDespesa(despesaId, { valor: "999" });
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toMatch(/exige a permissão de excluir no Caixa, que o seu usuário não tem/);
    ctxRef.current = ctxOwner;
    expect((await linha()).valor).toBe("1234.56");
  });
});
