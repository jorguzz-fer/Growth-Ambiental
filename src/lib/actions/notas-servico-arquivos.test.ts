import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { asc, eq } from "drizzle-orm";

/**
 * Prompt AG, PR 5 — o PDF e o XML da nota. A Focus é simulada: nenhum
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
const focus = vi.hoisted(() => ({ emitirNfse: vi.fn(), consultarNfse: vi.fn(), baixarArquivoDaNota: vi.fn() }));
const r2 = vi.hoisted(() => ({ ligado: true, guardados: new Map<string, Uint8Array>(), putObject: vi.fn(), getObjectBytes: vi.fn() }));
vi.mock("@/lib/storage/r2", () => ({
  isR2Configured: () => r2.ligado,
  putObject: r2.putObject,
  getObjectBytes: r2.getObjectBytes,
}));
vi.mock("@/lib/fiscal/focus", async (orig) => ({
  ...(await orig<typeof import("@/lib/fiscal/focus")>()),
  emitirNfse: focus.emitirNfse,
  consultarNfse: focus.consultarNfse,
  baixarArquivoDaNota: focus.baixarArquivoDaNota,
}));

describe.skipIf(!HAS_DB)("Prompt AG · arquivos da NFS-e", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { salvarRascunhoDeNota, atualizarNota } = await import("./notas-servico");
  const { GET } = await import("@/app/(app)/notasfiscais/[id]/arquivo/route");
  const baixar = (id: string, tipo: string) => GET(new Request(`http://x/notasfiscais/${id}/arquivo?tipo=${tipo}`), { params: Promise.resolve({ id }) });
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
  const env = { ...process.env };

  beforeAll(async () => {
    const [t] = await db
      .insert(schema.tenants)
      .values({
        name: "tenant-nfse-arquivos",
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
    focus.baixarArquivoDaNota.mockReset();
    r2.ligado = true;
    r2.guardados.clear();
    r2.putObject.mockReset().mockImplementation(async (k: string, b: Uint8Array) => void r2.guardados.set(k, b));
    r2.getObjectBytes.mockReset().mockImplementation(async (k: string) => r2.guardados.get(k)!);
    process.env.NFSE_TENANT_ID = tenantId;
    process.env.FOCUS_NFE_TOKEN_HOMOLOGACAO = "token-de-teste";
  });

  const PDF = new Uint8Array([37, 80, 68, 70]);
  const XML = new Uint8Array([60, 120, 109, 108]);
  const autorizada = async (extra: Record<string, unknown> = {}) => {
    const id = await rascunho();
    await db
      .update(schema.notasServico)
      .set({ status: "autorizada", tentativa: 1, ref: `${id.replace(/-/g, "")}t1`, numero: "77", urlDanfse: "https://focus/danfse.pdf", caminhoXml: "/arquivos/77.xml", ...extra })
      .where(eq(schema.notasServico.id, id));
    return id;
  };

  it("primeiro download busca na Focus e guarda a cópia; o segundo vem da cópia — com a marca de homologação no nome", async () => {
    const id = await autorizada();
    focus.baixarArquivoDaNota.mockResolvedValue({ bytes: PDF, contentType: "application/pdf" });
    const r1 = await baixar(id, "pdf");
    expect(r1.status).toBe(200);
    expect(r1.headers.get("content-disposition")).toBe('attachment; filename="HOMOLOGACAO-SEM-VALOR-FISCAL-NFSe-77.pdf"');
    expect(new Uint8Array(await r1.arrayBuffer())).toEqual(PDF);
    expect(focus.baixarArquivoDaNota).toHaveBeenCalledWith("homologacao", "https://focus/danfse.pdf");
    const n = await nota(id);
    expect(n.pdfKey).toBe(`nfse/${tenantId}/${id}/HOMOLOGACAO-SEM-VALOR-FISCAL-NFSe-77.pdf`);
    expect(n.xmlKey).toBeNull();

    const r2b = await baixar(id, "pdf");
    expect(new Uint8Array(await r2b.arrayBuffer())).toEqual(PDF);
    expect(focus.baixarArquivoDaNota).toHaveBeenCalledTimes(1);
    expect(await eventos(id)).toEqual(["criada", "arquivo_guardado"]);
  });

  it("autorizou na consulta: guarda PDF e XML na hora; se a Focus falhar, a autorização vale mesmo assim", async () => {
    const id = await rascunho();
    const ref = `${id.replace(/-/g, "")}t1`;
    await db.update(schema.notasServico).set({ status: "processando", tentativa: 1, ref }).where(eq(schema.notasServico.id, id));
    focus.consultarNfse.mockResolvedValue({ status: "autorizado", ref, http: 200, numero: "90", urlDanfse: "https://focus/90.pdf", caminhoXml: "/arquivos/90.xml" });
    focus.baixarArquivoDaNota.mockImplementation(async (_a: string, c: string) => ({ bytes: c.endsWith(".pdf") ? PDF : XML, contentType: "" }));
    expect(await atualizarNota(id)).toMatchObject({ ok: true, situacao: "autorizada" });
    const n = await nota(id);
    expect(n.pdfKey).toMatch(/NFSe-90\.pdf$/);
    expect(n.xmlKey).toMatch(/NFSe-90\.xml$/);

    const id2 = await rascunho();
    const ref2 = `${id2.replace(/-/g, "")}t1`;
    await db.update(schema.notasServico).set({ status: "processando", tentativa: 1, ref: ref2 }).where(eq(schema.notasServico.id, id2));
    focus.consultarNfse.mockResolvedValue({ status: "autorizado", ref: ref2, http: 200, numero: "91", urlDanfse: "https://focus/91.pdf" });
    focus.baixarArquivoDaNota.mockRejectedValue(new Error("rede"));
    expect(await atualizarNota(id2)).toMatchObject({ ok: true, situacao: "autorizada" });
    expect(await nota(id2)).toMatchObject({ status: "autorizada", pdfKey: null });
  });

  it("sem R2: entrega direto da Focus, sem guardar", async () => {
    r2.ligado = false;
    const id = await autorizada({ ambiente: "producao" });
    focus.baixarArquivoDaNota.mockResolvedValue({ bytes: XML, contentType: "application/xml" });
    const r = await baixar(id, "xml");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-disposition")).toBe('attachment; filename="NFSe-77.xml"');
    expect(r2.putObject).not.toHaveBeenCalled();
    expect((await nota(id)).xmlKey).toBeNull();
  });

  it("recusas: sem permissão, rascunho, tipo inválido, nota de outra empresa, Focus fora", async () => {
    const id = await autorizada();
    const rasc = await rascunho();
    ctxRef.current = { ...(ctxRef.current as object), perms: {} };
    expect((await baixar(id, "pdf")).status).toBe(403);
    como("owner");
    expect((await baixar(rasc, "pdf")).status).toBe(409);
    expect((await baixar(id, "exe")).status).toBe(400);
    expect((await baixar("00000000-0000-0000-0000-000000000000", "pdf")).status).toBe(404);
    focus.baixarArquivoDaNota.mockRejectedValue(new Error("rede"));
    expect((await baixar(id, "pdf")).status).toBe(502);
    expect((await nota(id)).pdfKey).toBeNull();
  });
});
