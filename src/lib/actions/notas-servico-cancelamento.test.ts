import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { asc, count, eq } from "drizzle-orm";

/**
 * Prompt AG, PR 4 — cancelamento. A Focus é simulada: nenhum
 * teste chama a rede. Integração: só com DATABASE_URL.
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
const focus = vi.hoisted(() => ({ emitirNfse: vi.fn(), consultarNfse: vi.fn(), cancelarNfse: vi.fn() }));
vi.mock("@/lib/fiscal/focus", async (orig) => ({
  ...(await orig<typeof import("@/lib/fiscal/focus")>()),
  emitirNfse: focus.emitirNfse,
  consultarNfse: focus.consultarNfse,
  cancelarNfse: focus.cancelarNfse,
}));

describe.skipIf(!HAS_DB)("Prompt AG · cancelamento da NFS-e", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { salvarRascunhoDeNota, atualizarNota, cancelarNota } = await import("./notas-servico");
  let tenantId = "";
  let tenant: Record<string, unknown> = {};
  let obra: Record<string, unknown> = {};
  const como = (role: "owner" | "membro" | "contador") =>
    (ctxRef.current = { tenant, projects: [obra], userId: null, userEmail: "t@t", role, perms: defaultPermissions(role) });
  const rascunho = async () => {
    como("owner");
    const f = new FormData();
    for (const [k, v] of Object.entries({
      projectId: String(obra.id),
      discriminacao: "Administração de obra",
      valorServicos: "10.000,00",
      aliquotaIss: "3",
      ret_inss: "11",
      tomadorCpfCnpj: "11.222.333/0001-81",
      tomadorNome: "Tomador",
    }))
      f.set(k, v);
    const r = await salvarRascunhoDeNota(f);
    if (!r.ok) throw new Error(r.error);
    return r.id;
  };
  const nota = async (id: string) => (await db.select().from(schema.notasServico).where(eq(schema.notasServico.id, id)))[0];
  const eventos = async (id: string) =>
    (await db.select().from(schema.notaServicoEventos).where(eq(schema.notaServicoEventos.notaId, id)).orderBy(asc(schema.notaServicoEventos.createdAt))).map((e) => e.tipo);
  const contagens = async () => {
    const n = async (t: typeof schema.contasReceber | typeof schema.despesas | typeof schema.cashEntries) =>
      Number((await db.select({ n: count() }).from(t).where(eq(t.tenantId, tenantId)))[0].n);
    return { contas: await n(schema.contasReceber), despesas: await n(schema.despesas), caixa: await n(schema.cashEntries) };
  };
  const env = { ...process.env };

  beforeAll(async () => {
    const [t] = await db
      .insert(schema.tenants)
      .values({
        name: "tenant-nfse-cancelamento",
        cnpj: "11222333000181",
        inscricaoMunicipal: "123456",
        regimeTributario: "LUCRO_PRESUMIDO",
        itemListaServico: "7.02",
        aliquotaIss: "3",
        codigoMunicipio: "3509502",
        municipio: "Campinas",
        uf: "SP",
        logradouro: "Av. Brasil",
        numeroEndereco: "1000",
        bairro: "Centro",
        cep: "13010-000",
        emailFiscal: "fiscal@x.com.br",
      })
      .returning();
    tenantId = t.id;
    tenant = t;
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "OBRA NF", codigoMunicipioObra: "3509502" }).returning();
    obra = p;
    await db.insert(schema.versions).values({ projectId: p.id, tenantId, key: "atual", kind: "atual", label: "Atual", color: "#000" });
  });
  afterAll(async () => {
    process.env = env;
    if (tenantId) await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });
  beforeEach(() => {
    focus.emitirNfse.mockReset();
    focus.consultarNfse.mockReset();
    focus.cancelarNfse.mockReset();
    process.env.NFSE_TENANT_ID = tenantId;
    process.env.FOCUS_NFE_TOKEN_HOMOLOGACAO = "token-de-teste";
  });

  /** Nota autorizada (o envio foi testado na PR 3). */
  const autorizada = async (numero = "77") => {
    const id = await rascunho();
    await db
      .update(schema.notasServico)
      .set({ status: "autorizada", tentativa: 1, ref: `${id.replace(/-/g, "")}t1`, numero, autorizadaEm: new Date() })
      .where(eq(schema.notasServico.id, id));
    return id;
  };
  const MOTIVO = "Valor errado na medição de outubro";

  it("cancela com motivo e número: fica cancelada, com quando e por quê — nada some, nada muda no financeiro", async () => {
    const id = await autorizada();
    const antes = await contagens();
    focus.cancelarNfse.mockImplementation(async (_a: string, ref: string) => {
      // O pedido JÁ está gravado quando a Focus é chamada.
      expect(await eventos(id)).toContain("cancelamento_pedido");
      return { status: "cancelado", ref, http: 200 };
    });
    expect(await cancelarNota(id, MOTIVO, "77")).toMatchObject({ ok: true, situacao: "cancelada" });
    expect(focus.cancelarNfse).toHaveBeenCalledWith("homologacao", `${id.replace(/-/g, "")}t1`, MOTIVO);
    const n = await nota(id);
    expect(n).toMatchObject({ status: "cancelada", motivoCancelamento: MOTIVO, numero: "77" });
    expect(n.canceladaEm).toBeInstanceOf(Date);
    expect(await eventos(id)).toEqual(["criada", "cancelamento_pedido", "retorno"]);
    expect(await contagens()).toEqual(antes);
    // Cancelada não cancela de novo.
    expect(await cancelarNota(id, MOTIVO, "77")).toMatchObject({ ok: false });
    expect(focus.cancelarNfse).toHaveBeenCalledTimes(1);
  });

  it("recusas antes da Focus: número errado, motivo curto, sem permissão, rascunho", async () => {
    const id = await autorizada();
    expect(await cancelarNota(id, MOTIVO, "78")).toMatchObject({ ok: false, error: expect.stringContaining("77") });
    expect(await cancelarNota(id, "curto", "77")).toMatchObject({ ok: false });
    como("contador");
    expect(await cancelarNota(id, MOTIVO, "77")).toMatchObject({ ok: false, error: expect.stringContaining("Sem permissão") });
    como("membro");
    expect(await cancelarNota(id, MOTIVO, "77")).toMatchObject({ ok: false, error: expect.stringContaining("Sem permissão") });
    const r = await rascunho();
    expect(await cancelarNota(r, MOTIVO, r.slice(0, 8))).toMatchObject({ ok: false, error: expect.stringContaining("autorizada") });
    expect(focus.cancelarNfse).not.toHaveBeenCalled();
    expect((await nota(id)).status).toBe("autorizada");
  });

  it("prefeitura recusa: continua autorizada, com a mensagem; dá para tentar de novo", async () => {
    const id = await autorizada();
    focus.cancelarNfse.mockResolvedValue({ status: "processando", ref: "x", http: 422, erros: [{ codigo: "E99", mensagem: "Fora do prazo de cancelamento" }] });
    expect(await cancelarNota(id, MOTIVO, "77")).toMatchObject({ ok: false, error: expect.stringContaining("Fora do prazo") });
    expect(await nota(id)).toMatchObject({ status: "autorizada", motivoCancelamento: null, canceladaEm: null });
    expect(await eventos(id)).toEqual(["criada", "cancelamento_pedido", "cancelamento_recusado"]);
  });

  it("sem resposta: continua autorizada; a consulta confirma depois, com o motivo do pedido", async () => {
    const id = await autorizada();
    focus.cancelarNfse.mockRejectedValue(new Error("rede"));
    expect(await cancelarNota(id, MOTIVO, "77")).toMatchObject({ ok: true, situacao: "autorizada" });
    expect((await nota(id)).status).toBe("autorizada");
    // Duplo pedido logo em seguida não chama a Focus de novo.
    expect(await cancelarNota(id, MOTIVO, "77")).toMatchObject({ ok: false, error: expect.stringContaining("acabou de ser pedido") });
    expect(focus.cancelarNfse).toHaveBeenCalledTimes(1);

    focus.consultarNfse.mockResolvedValue({ status: "cancelado", ref: "x", http: 200 });
    expect(await atualizarNota(id)).toMatchObject({ ok: true, situacao: "cancelada" });
    expect(await nota(id)).toMatchObject({ status: "cancelada", motivoCancelamento: MOTIVO });
  });

  it("duplo clique no cancelar: a Focus é chamada uma vez", async () => {
    const id = await autorizada("81");
    focus.cancelarNfse.mockImplementation(async (_a: string, ref: string) => ({ status: "cancelado", ref, http: 200 }));
    await Promise.all([cancelarNota(id, MOTIVO, "81"), cancelarNota(id, MOTIVO, "81")]);
    expect(focus.cancelarNfse).toHaveBeenCalledTimes(1);
    expect((await nota(id)).status).toBe("cancelada");
  });
});
