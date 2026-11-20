import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { eq } from "drizzle-orm";

/**
 * Emissão de NFS-e ativada pela própria empresa (docs/EMISSAO-NF.md, seção 7):
 * a empresa envia o certificado pela tela; o app cadastra a empresa na Focus
 * com o token master e não guarda certificado, senha nem token.
 */
const HAS_DB = !!process.env.DATABASE_URL;
const ctxRef = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/context", async (orig) => ({
  ...(await orig<typeof import("@/lib/context")>()),
  getTenantContext: async () => ctxRef.current,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));

const regras = await import("./emissor-regras");

describe("regras do emissor", () => {
  it("só o proprietário e os operadores da plataforma ativam", () => {
    const antes = process.env.SUPERADMIN_EMAILS;
    process.env.SUPERADMIN_EMAILS = "op@plataforma.com";
    expect(regras.podeAtivarEmissao({ role: "owner", email: "dono@x.com" })).toBe(true);
    expect(regras.podeAtivarEmissao({ role: "admin", email: "adm@x.com" })).toBe(false);
    expect(regras.podeAtivarEmissao({ role: "membro", email: "OP@plataforma.com" })).toBe(true);
    process.env.SUPERADMIN_EMAILS = antes;
  });

  it("certificado: só .pfx/.p12, não vazio, até 200 KB", () => {
    expect(regras.recusaDoCertificado("empresa.pfx", 4000)).toBeNull();
    expect(regras.recusaDoCertificado("EMPRESA.P12", 4000)).toBeNull();
    expect(regras.recusaDoCertificado("empresa.pem", 4000)).toMatch(/pfx/);
    expect(regras.recusaDoCertificado("empresa.pfx", 0)).toMatch(/vazio/);
    expect(regras.recusaDoCertificado("empresa.pfx", 300 * 1024)).toMatch(/grande/);
  });

  it("validade do certificado: vencido para, 30 dias avisa", () => {
    const hoje = new Date("2026-11-19T12:00:00Z");
    expect(regras.avisoDoCertificado(new Date("2026-11-01T00:00:00Z"), hoje)).toMatchObject({ tom: "danger" });
    expect(regras.avisoDoCertificado(new Date("2026-12-10T00:00:00Z"), hoje)).toMatchObject({ tom: "warning", dias: 20 });
    expect(regras.avisoDoCertificado(new Date("2027-11-01T00:00:00Z"), hoje)).toMatchObject({ tom: "success" });
    expect(regras.avisoDoCertificado(null, hoje)).toMatchObject({ dias: null });
  });

  it("corpo da empresa: regime traduzido, vazio fica de fora, senha só com certificado", () => {
    const c = regras.corpoDaEmpresaFocus(
      { razaoSocial: "RMV Ltda", cnpj: "11.444.777/0001-61", inscricaoMunicipal: "12.345-6", regimeTributario: "LUCRO_REAL", cep: "11740-000", uf: "sp", complemento: "  " },
      { senhaCertificado: "segredo", loginPrefeitura: "", serieRps: "" },
    );
    expect(c).toMatchObject({ nome: "RMV Ltda", cnpj: "11444777000161", inscricao_municipal: "123456", regime_tributario: 3, cep: "11740000", uf: "SP", habilita_nfse: true });
    expect(c).not.toHaveProperty("complemento");
    expect(c).not.toHaveProperty("senha_certificado");
    expect(c).not.toHaveProperty("login_responsavel");
    expect(c).not.toHaveProperty("serie_nfse_producao");
    const comCert = regras.corpoDaEmpresaFocus({ cnpj: "11444777000161" }, { certificadoBase64: "QUJD", senhaCertificado: "s" });
    expect(comCert).toMatchObject({ arquivo_certificado_base64: "QUJD", senha_certificado: "s" });
    expect(regras.regimeDaFocus("SIMPLES")).toBe(1);
    expect(regras.regimeDaFocus("MEI")).toBe(4);
  });

  it("município: bloqueia onde a Focus não emite; situação passageira é aviso", () => {
    expect(regras.avaliarMunicipio({ nome_municipio: "X", nfse_habilitada: false }).bloqueio).toMatch(/não emite/);
    expect(regras.avaliarMunicipio({ status_nfse: "nao_implementado" }).bloqueio).toBeTruthy();
    const fora = regras.avaliarMunicipio({ nfse_habilitada: true, status_nfse: "fora_do_ar", possui_cancelamento_nfse: false });
    expect(fora.bloqueio).toBeNull();
    expect(fora.avisos).toHaveLength(2);
    expect(regras.avaliarMunicipio({ nfse_habilitada: true, status_nfse: "ativo" })).toEqual({ bloqueio: null, avisos: [] });
  });

  it("certificado obrigatório na 1ª ativação, salvo município sem certificado com login da prefeitura", () => {
    const sem = { primeiraAtivacao: true, temCertificado: false, municipio: null, temLoginPrefeitura: false };
    expect(regras.faltaCertificado(sem)).toMatch(/certificado/);
    expect(regras.faltaCertificado({ ...sem, municipio: { requer_certificado_nfse: false }, temLoginPrefeitura: true })).toBeNull();
    expect(regras.faltaCertificado({ ...sem, municipio: { requer_certificado_nfse: false } })).toMatch(/certificado/);
    expect(regras.faltaCertificado({ ...sem, primeiraAtivacao: false })).toBeNull();
  });

  it("recusa da Focus em português, sem o nome técnico do campo", () => {
    const m = regras.mensagemDaRecusa(
      { codigo: "erro_validacao", erros: [{ mensagem: "Arquivo certificado base64 Certificado não pertence ao CNPJ informado", campo: "arquivo_certificado_base64" }] },
      422,
    );
    expect(m).toBe("Certificado: Certificado não pertence ao CNPJ informado");
    expect(regras.mensagemDaRecusa(null, 401)).toMatch(/token master/);
  });

  it("pode emitir: emissor da tela, modo antigo, CNPJ trocado, certificado vencido", () => {
    const emissor = { empresaIdProvedor: "77", cnpj: "11444777000161", certificadoValidoAte: new Date("2027-01-01") };
    const base = { tenantId: "t1", cnpjDoCadastro: "11.444.777/0001-61", emissor, masterConfigurado: true, tenantLegado: null, hoje: new Date("2026-11-19") };
    expect(regras.recusaDaEmissao(base)).toBeNull();
    expect(regras.recusaDaEmissao({ ...base, masterConfigurado: false })).toMatch(/FOCUS_NFE_TOKEN_MASTER/);
    expect(regras.recusaDaEmissao({ ...base, cnpjDoCadastro: "45997418000153" })).toMatch(/CNPJ do cadastro fiscal mudou/);
    expect(regras.recusaDaEmissao({ ...base, emissor: { ...emissor, certificadoValidoAte: new Date("2026-10-01") } })).toMatch(/vencido/);
    expect(regras.recusaDaEmissao({ ...base, emissor: null, tenantLegado: "t1" })).toBeNull();
    expect(regras.recusaDaEmissao({ ...base, emissor: null })).toMatch(/ainda não foi ativada/);
  });
});

describe.skipIf(!HAS_DB)("ativação pela tela, com a Focus simulada", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { ativarEmissaoNfse } = await import("@/lib/actions/nfse-emissor");
  const { situacaoDaEmissao, credencialDaEmissao, credencialDeLeitura } = await import("./emissor");
  const { esquecerTokens } = await import("./focus-empresas");

  const SENHA = "senha-do-certificado-123";
  const CERT = Buffer.from("conteudo-binario-do-pfx");
  const CERT64 = CERT.toString("base64");
  const env = { ...process.env };
  const tenants: string[] = [];
  let t1: typeof schema.tenants.$inferSelect;
  let t2: typeof schema.tenants.$inferSelect;
  let chamadas: { metodo: string; url: string; auth: string | null; corpo: string | null }[] = [];
  const empresasNaFocus: { id: number; cnpj: string }[] = [];
  let municipio: Record<string, unknown> = {};

  const fiscal = (nome: string, cnpj: string) => ({
    name: nome,
    cnpj,
    inscricaoMunicipal: "123456",
    regimeTributario: "LUCRO_PRESUMIDO",
    itemListaServico: "7.02",
    aliquotaIss: "3",
    codigoMunicipio: "3552502",
    municipio: "Itanhaém",
    uf: "SP",
    logradouro: "Av. Brasil",
    numeroEndereco: "1000",
    bairro: "Centro",
    cep: "11740-000",
    emailFiscal: "fiscal@x.com.br",
  });
  const como = (t: typeof t1, role: "owner" | "admin", email = "dono@empresa.com") =>
    (ctxRef.current = { tenant: t, projects: [], userId: null, userEmail: email, role, perms: defaultPermissions(role) });
  const form = (o: Record<string, string | File>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) f.set(k, v);
    return f;
  };
  const certificado = () => new File([CERT], "empresa.pfx", { type: "application/x-pkcs12" });

  beforeAll(async () => {
    [t1] = await db.insert(schema.tenants).values(fiscal("Emissor Um", "11444777000161")).returning();
    [t2] = await db.insert(schema.tenants).values(fiscal("Emissor Dois", "45997418000153")).returning();
    tenants.push(t1.id, t2.id);
  });
  afterAll(async () => {
    process.env = env;
    vi.unstubAllGlobals();
    for (const id of tenants) await db.delete(schema.tenants).where(eq(schema.tenants.id, id));
  });
  beforeEach(() => {
    process.env.FOCUS_NFE_TOKEN_MASTER = "master-da-plataforma";
    delete process.env.NFSE_TENANT_ID;
    chamadas = [];
    municipio = { codigo_municipio: "3552502", nome_municipio: "Itanhaém", sigla_uf: "SP", nfse_habilitada: true, status_nfse: "ativo" };
    vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
      const u = new URL(url);
      const auth = (init.headers as Record<string, string> | undefined)?.Authorization ?? null;
      chamadas.push({ metodo: init.method ?? "GET", url, auth, corpo: typeof init.body === "string" ? init.body : null });
      const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
      if (u.pathname.startsWith("/v2/municipios/")) return json(200, municipio);
      if (u.pathname === "/v2/empresas" && init.method === "GET") return json(200, empresasNaFocus.filter((e) => e.cnpj === u.searchParams.get("cnpj")));
      if (u.pathname === "/v2/empresas" && init.method === "POST") {
        const corpo = JSON.parse(String(init.body));
        const nova = { id: 70 + empresasNaFocus.length, cnpj: corpo.cnpj };
        empresasNaFocus.push(nova);
        return json(200, { ...nova, certificado_valido_ate: "2027-08-01T12:00:00-03:00", certificado_cnpj: corpo.cnpj, token_homologacao: `hom-${nova.id}`, token_producao: `prod-${nova.id}` });
      }
      const m = u.pathname.match(/^\/v2\/empresas\/(\d+)$/);
      if (m && (init.method === "PUT" || (init.method ?? "GET") === "GET")) {
        const e = empresasNaFocus.find((x) => String(x.id) === m[1]);
        if (!e) return json(404, { codigo: "nao_encontrado", mensagem: "Empresa não encontrada" });
        return json(200, { ...e, certificado_valido_ate: "2027-08-01T12:00:00-03:00", token_homologacao: `hom-${e.id}`, token_producao: `prod-${e.id}` });
      }
      return json(500, { mensagem: "rota não simulada" });
    });
  });

  it("o proprietário ativa: a empresa vai para a Focus com o certificado; o app guarda só o vínculo e a validade", async () => {
    como(t1, "owner");
    const r = await ativarEmissaoNfse(form({ certificado: certificado(), senhaCertificado: SENHA }));
    expect(r).toEqual({ ok: true, avisos: [] });

    const post = chamadas.find((c) => c.metodo === "POST")!;
    expect(post.url).toBe("https://api.focusnfe.com.br/v2/empresas");
    expect(post.auth).toBe(`Basic ${Buffer.from("master-da-plataforma:").toString("base64")}`);
    expect(JSON.parse(post.corpo!)).toMatchObject({ cnpj: "11444777000161", arquivo_certificado_base64: CERT64, senha_certificado: SENHA, habilita_nfse: true, regime_tributario: 3 });

    const [e] = await db.select().from(schema.nfseEmissores).where(eq(schema.nfseEmissores.tenantId, t1.id));
    expect(e).toMatchObject({ provedor: "focus", cnpj: "11444777000161", municipioStatus: "ativo" });
    expect(e.certificadoValidoAte?.toISOString()).toBe("2027-08-01T15:00:00.000Z");
    // Nada de segredo no banco: nem no emissor, nem na auditoria.
    const auditoria = await db.select().from(schema.auditLog).where(eq(schema.auditLog.tenantId, t1.id));
    const tudo = JSON.stringify([e, auditoria]);
    expect(tudo).not.toContain(SENHA);
    expect(tudo).not.toContain(CERT64);
    expect(tudo).not.toContain("hom-");
    expect(auditoria.map((a) => a.action)).toContain("nfse.emissor.ativar");

    // A emissão passa a valer, com o token da empresa lido da Focus.
    const s = await situacaoDaEmissao(t1);
    expect(s).toMatchObject({ modo: "tela", recusa: null });
    expect(s.configurado("homologacao")).toBe(true);
    expect(await credencialDaEmissao(t1, "homologacao")).toEqual({ ok: true, token: `hom-${e.empresaIdProvedor}` });
    expect(await credencialDaEmissao(t1, "producao")).toEqual({ ok: true, token: `prod-${e.empresaIdProvedor}` });
  });

  it("atualizar sem trocar o certificado: PUT na mesma empresa, sem certificado no corpo", async () => {
    como(t1, "owner");
    const r = await ativarEmissaoNfse(form({ serieRps: "1", proximoNumeroRps: "251" }));
    expect(r.ok).toBe(true);
    const put = chamadas.find((c) => c.metodo === "PUT")!;
    expect(put.url).toMatch(/\/v2\/empresas\/\d+$/);
    const corpo = JSON.parse(put.corpo!);
    expect(corpo).not.toHaveProperty("arquivo_certificado_base64");
    expect(corpo).not.toHaveProperty("senha_certificado");
    expect(corpo).toMatchObject({ serie_nfse_producao: "1", proximo_numero_nfse_producao: "251" });
    expect(chamadas.some((c) => c.metodo === "POST")).toBe(false);
  });

  it("admin não ativa; operador da plataforma ativa; sem certificado na 1ª vez não vai nada à Focus", async () => {
    como(t2, "admin");
    expect(await ativarEmissaoNfse(form({ certificado: certificado(), senhaCertificado: SENHA }))).toMatchObject({ ok: false, error: expect.stringMatching(/proprietário/) });
    process.env.SUPERADMIN_EMAILS = "op@plataforma.com";
    como(t2, "admin", "op@plataforma.com");
    expect(await ativarEmissaoNfse(form({}))).toMatchObject({ ok: false, error: expect.stringMatching(/certificado/) });
    expect(await ativarEmissaoNfse(form({ certificado: certificado() }))).toMatchObject({ ok: false, error: expect.stringMatching(/senha/) });
    expect(chamadas.filter((c) => c.metodo !== "GET")).toEqual([]);
    expect((await situacaoDaEmissao(t2)).modo).toBeNull();
  });

  it("município onde a Focus não emite: recusa antes de cadastrar", async () => {
    municipio = { ...municipio, nfse_habilitada: false, status_nfse: "nao_implementado" };
    como(t2, "owner");
    expect(await ativarEmissaoNfse(form({ certificado: certificado(), senhaCertificado: SENHA }))).toMatchObject({ ok: false, error: expect.stringMatching(/não emite/) });
    expect(chamadas.some((c) => c.metodo === "POST" || c.metodo === "PUT")).toBe(false);
  });

  it("o mesmo CNPJ não serve a duas empresas do sistema", async () => {
    // t2 troca o cadastro para o CNPJ que já está ativado em t1.
    await db.update(schema.tenants).set({ cnpj: "11444777000161" }).where(eq(schema.tenants.id, t2.id));
    const [t2b] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, t2.id));
    como(t2b, "owner");
    expect(await ativarEmissaoNfse(form({ certificado: certificado(), senhaCertificado: SENHA }))).toMatchObject({ ok: false, error: expect.stringMatching(/outra empresa/) });
    await db.update(schema.tenants).set({ cnpj: "45997418000153" }).where(eq(schema.tenants.id, t2.id));
  });

  it("CNPJ trocado ou certificado vencido param a emissão nova; consultar e baixar nota antiga continuam", async () => {
    const [e] = await db.select().from(schema.nfseEmissores).where(eq(schema.nfseEmissores.tenantId, t1.id));
    esquecerTokens(e.empresaIdProvedor);
    expect(await credencialDaEmissao({ ...t1, cnpj: "45997418000153" }, "homologacao")).toMatchObject({ ok: false, error: expect.stringMatching(/CNPJ/) });
    await db.update(schema.nfseEmissores).set({ certificadoValidoAte: new Date("2020-01-01") }).where(eq(schema.nfseEmissores.tenantId, t1.id));
    expect(await credencialDaEmissao(t1, "homologacao")).toMatchObject({ ok: false, error: expect.stringMatching(/vencido/) });
    expect(await credencialDeLeitura(t1.id, "homologacao")).toBe(`hom-${e.empresaIdProvedor}`);
    // Sem o token master, nada fala com a Focus pela empresa.
    delete process.env.FOCUS_NFE_TOKEN_MASTER;
    expect((await situacaoDaEmissao(t1)).configurado("homologacao")).toBe(false);
  });

  it("modo antigo (NFSE_TENANT_ID) continua valendo para quem já estava nele", async () => {
    process.env.NFSE_TENANT_ID = t2.id;
    process.env.FOCUS_NFE_TOKEN_HOMOLOGACAO = "token-antigo";
    expect(await credencialDaEmissao(t2, "homologacao")).toEqual({ ok: true, token: "token-antigo" });
    expect((await situacaoDaEmissao(t2)).modo).toBe("legado");
  });
});
