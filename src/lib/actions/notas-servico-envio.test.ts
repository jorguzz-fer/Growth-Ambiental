import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { asc, count, eq } from "drizzle-orm";

/**
 * Prompt AG, PR 3 — envio, consulta e reenvio. A Focus é simulada: nenhum
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
const focus = vi.hoisted(() => ({ emitirNfse: vi.fn(), consultarNfse: vi.fn() }));
vi.mock("@/lib/fiscal/focus", async (orig) => ({
  ...(await orig<typeof import("@/lib/fiscal/focus")>()),
  emitirNfse: focus.emitirNfse,
  consultarNfse: focus.consultarNfse,
}));

describe.skipIf(!HAS_DB)("Prompt AG · envio da NFS-e", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { salvarRascunhoDeNota, enviarNota, atualizarNota, reenviarNota } = await import("./notas-servico");
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
        name: "tenant-nfse-envio",
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
    process.env.NFSE_TENANT_ID = tenantId;
    process.env.FOCUS_NFE_TOKEN_HOMOLOGACAO = "token-de-teste";
  });

  it("envia (ref gravada antes), consulta e autoriza — sem criar receita, conta nem caixa (BAG-2)", async () => {
    const id = await rascunho();
    const antes = await contagens();
    const ref = `${id.replace(/-/g, "")}t1`;
    focus.emitirNfse.mockImplementation(async (amb: string, r: string) => {
      // No momento da chamada, a nota JÁ está processando com esta ref (3.1).
      const n = await nota(id);
      expect([n.status, n.ref, amb]).toEqual(["processando", r, "homologacao"]);
      return { status: "processando", ref: r, http: 202 };
    });
    expect(await enviarNota(id, true)).toMatchObject({ ok: true, situacao: "processando" });
    expect(focus.emitirNfse).toHaveBeenCalledTimes(1);
    expect(focus.emitirNfse.mock.calls[0][1]).toBe(ref);
    const n1 = await nota(id);
    expect(n1).toMatchObject({ status: "processando", tentativa: 1, ref, baseCalculo: "10000.00", valorIss: "300.00", totalRetencoes: "1100.00", valorLiquido: "8900.00", codigoMunicipioPrestacao: "3509502" });

    focus.consultarNfse.mockResolvedValue({ status: "autorizado", ref, http: 200, numero: "77", codigoVerificacao: "AB12", urlDanfse: "https://x/danfse.pdf" });
    expect(await atualizarNota(id)).toMatchObject({ ok: true, situacao: "autorizada" });
    expect(await nota(id)).toMatchObject({ status: "autorizada", numero: "77", codigoVerificacao: "AB12", urlDanfse: "https://x/danfse.pdf" });
    expect((await nota(id)).autorizadaEm).toBeInstanceOf(Date);
    expect(await eventos(id)).toEqual(["criada", "enviada", "retorno", "consulta"]);

    // Autorizada não reenvia nem edita.
    expect(await enviarNota(id, true)).toMatchObject({ ok: false });
    expect(focus.emitirNfse).toHaveBeenCalledTimes(1);
    expect(await contagens()).toEqual(antes);
  });

  it("duplo clique: dois envios ao mesmo tempo chamam a Focus UMA vez", async () => {
    const id = await rascunho();
    focus.emitirNfse.mockImplementation(async (_a: string, r: string) => ({ status: "processando", ref: r, http: 202 }));
    const [a, b] = await Promise.all([enviarNota(id, true), enviarNota(id, true)]);
    expect(focus.emitirNfse).toHaveBeenCalledTimes(1);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
    expect((await nota(id)).tentativa).toBe(1);
  });

  it("sem resposta (rede ou 5xx): fica processando e NUNCA reenvia sozinha", async () => {
    const id = await rascunho();
    focus.emitirNfse.mockRejectedValue(new Error("timeout"));
    const r = await enviarNota(id, true);
    expect(r).toMatchObject({ ok: true, situacao: "processando" });
    expect(focus.emitirNfse).toHaveBeenCalledTimes(1);
    expect(await eventos(id)).toEqual(["criada", "enviada", "falha_rede"]);

    const id2 = await rascunho();
    focus.emitirNfse.mockReset().mockImplementation(async (_a: string, r2: string) => ({ status: "erro", ref: r2, http: 502, erros: [{ mensagem: "Bad gateway" }] }));
    expect(await enviarNota(id2, true)).toMatchObject({ ok: true, situacao: "processando" });
    expect((await nota(id2)).status).toBe("processando");
    expect(focus.consultarNfse).not.toHaveBeenCalled();
  });

  it("reenvio manual: só com a mesma ref, só se a Focus não conhece a nota, e não logo após o envio", async () => {
    const id = await rascunho();
    focus.emitirNfse.mockRejectedValue(new Error("rede"));
    await enviarNota(id, true);
    const ref = (await nota(id)).ref!;
    focus.consultarNfse.mockResolvedValue({ status: "nao_encontrada", ref, http: 404 });
    expect(await reenviarNota(id)).toMatchObject({ ok: false, error: expect.stringContaining("acabou de ser enviada") });
    expect(focus.emitirNfse).toHaveBeenCalledTimes(1);

    await db.update(schema.notaServicoEventos).set({ createdAt: new Date(Date.now() - 5 * 60_000) }).where(eq(schema.notaServicoEventos.notaId, id));
    focus.emitirNfse.mockReset().mockImplementation(async (_a: string, r: string) => ({ status: "processando", ref: r, http: 202 }));
    expect(await reenviarNota(id)).toMatchObject({ ok: true, situacao: "processando" });
    expect(focus.emitirNfse).toHaveBeenCalledTimes(1);
    expect(focus.emitirNfse.mock.calls[0][1]).toBe(ref);
    expect((await nota(id)).tentativa).toBe(1);

    // A Focus já tem a nota: consulta manda, nada é reenviado.
    await db.update(schema.notaServicoEventos).set({ createdAt: new Date(Date.now() - 5 * 60_000) }).where(eq(schema.notaServicoEventos.notaId, id));
    focus.emitirNfse.mockReset();
    focus.consultarNfse.mockResolvedValue({ status: "processando", ref, http: 200 });
    expect(await reenviarNota(id)).toMatchObject({ ok: true, aviso: expect.stringContaining("nada foi reenviado") });
    expect(focus.emitirNfse).not.toHaveBeenCalled();
  });

  it("rejeição só vale se a consulta confirmar; corrigida, sai com NOVA ref", async () => {
    const id = await rascunho();
    focus.emitirNfse.mockImplementation(async (_a: string, r: string) => ({ status: "erro", ref: r, http: 422, erros: [{ codigo: "E10", mensagem: "Inscrição municipal não confere" }] }));
    // Consulta diz que a nota está processando: o "erro" era só a ref repetida.
    focus.consultarNfse.mockResolvedValueOnce({ status: "processando", ref: "x", http: 200 });
    await enviarNota(id, true);
    expect((await nota(id)).status).toBe("processando");

    const id2 = await rascunho();
    focus.consultarNfse.mockResolvedValueOnce({ status: "nao_encontrada", ref: "x", http: 404 });
    await enviarNota(id2, true);
    expect(await nota(id2)).toMatchObject({ status: "rejeitada", mensagemRetorno: "E10: Inscrição municipal não confere" });

    // Sem consulta (a Focus não respondeu): continua processando.
    const id3 = await rascunho();
    focus.consultarNfse.mockRejectedValueOnce(new Error("rede"));
    await enviarNota(id3, true);
    expect((await nota(id3)).status).toBe("processando");

    // Token errado: a consulta volta 401 — não confirma nada.
    const id4 = await rascunho();
    focus.consultarNfse.mockResolvedValueOnce({ status: "erro", ref: "x", http: 401, erros: [{ mensagem: "Provedor recusou a autenticação" }] });
    await enviarNota(id4, true);
    expect((await nota(id4)).status).toBe("processando");
    focus.consultarNfse.mockResolvedValueOnce({ status: "erro", ref: "x", http: 401, erros: [{ mensagem: "Provedor recusou a autenticação" }] });
    expect(await atualizarNota(id4)).toMatchObject({ ok: true, situacao: "processando" });
    expect((await nota(id4)).status).toBe("processando");

    // A rejeitada corrige e vai de novo, com a tentativa 2.
    const f = new FormData();
    for (const [k, v] of Object.entries({ id: id2, projectId: String(obra.id), discriminacao: "Corrigida", valorServicos: "10000", aliquotaIss: "3", tomadorCpfCnpj: "11222333000181", tomadorNome: "Tomador" })) f.set(k, v);
    expect((await salvarRascunhoDeNota(f)).ok).toBe(true);
    focus.emitirNfse.mockReset().mockImplementation(async (_a: string, r: string) => ({ status: "processando", ref: r, http: 202 }));
    await enviarNota(id2, true);
    expect(await nota(id2)).toMatchObject({ status: "processando", tentativa: 2, ref: `${id2.replace(/-/g, "")}t2` });
  });

  it("bloqueios: sem conferência, sem permissão, outro CNPJ, sem token — nada é gravado nem enviado", async () => {
    const id = await rascunho();
    expect(await enviarNota(id, false)).toMatchObject({ ok: false });
    como("contador");
    expect(await enviarNota(id, true)).toMatchObject({ ok: false, error: expect.stringContaining("Sem permissão") });
    como("membro");
    expect(await enviarNota(id, true)).toMatchObject({ ok: false, error: expect.stringContaining("Sem permissão") });
    como("owner");
    process.env.NFSE_TENANT_ID = "00000000-0000-0000-0000-000000000000";
    expect(await enviarNota(id, true)).toMatchObject({ ok: false, pendencias: [expect.stringContaining("outra empresa")] });
    process.env.NFSE_TENANT_ID = tenantId;
    delete process.env.FOCUS_NFE_TOKEN_HOMOLOGACAO;
    delete process.env.FOCUS_NFE_TOKEN;
    expect(await enviarNota(id, true)).toMatchObject({ ok: false, pendencias: [expect.stringContaining("token")] });
    expect(focus.emitirNfse).not.toHaveBeenCalled();
    expect(await nota(id)).toMatchObject({ status: "rascunho", tentativa: 0, ref: null });
    expect(await eventos(id)).toEqual(["criada"]);
  });
});
