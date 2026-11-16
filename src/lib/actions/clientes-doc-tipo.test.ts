import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, desc, eq } from "drizzle-orm";

/**
 * GA-13 K3 — o anexo do cliente com o tipo "Documentos do contratante".
 *
 * A tela oferecia "Documentos do contratante", mas a lista do servidor só
 * tinha "Documentos do comprador": a action respondia "Escolha o tipo do
 * documento." e não gravava. Integração: só com DATABASE_URL. O R2 é
 * substituído: nenhum arquivo sai daqui.
 */
const HAS_DB = !!process.env.DATABASE_URL;
const ctxRef: { current: unknown } = { current: null };
const enviados: string[] = [];
vi.mock("@/lib/context", async (orig) => ({ ...(await orig<typeof import("@/lib/context")>()), getTenantContext: async () => ctxRef.current }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/storage/r2", () => ({
  isR2Configured: () => true,
  putObject: async (key: string) => void enviados.push(key),
  readUrl: async (key: string) => `https://r2.local/${key}`,
}));

const ler = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("GA-13 K3 — a tela e o servidor oferecem a mesma lista de tipos", () => {
  it("uma constante única, num arquivo de regras (não de 'use server'), com 'Documentos do contratante'", async () => {
    const regras = await import("@/lib/clientes-regras");
    expect(regras.TIPOS_DOC_CLIENTE).toEqual(["Contrato assinado", "Proposta", "Documentos do contratante", "Comprovante", "Termo aditivo", "Distrato", "Outros"]);
    expect(regras.TIPOS_DOC_CLIENTE).not.toContain("Documentos do comprador");
    for (const t of regras.TIPOS_DOC_CLIENTE) expect(regras.tipoDeDocClienteValido(t)).toBe(true);
    expect(regras.tipoDeDocClienteValido("Documentos do comprador")).toBe(false);
    expect(ler("src/lib/clientes-regras.ts")).not.toMatch(/^"use server"/m);
  });

  it("a tela monta o select com a constante e a action valida com ela: nenhuma lista própria", () => {
    const tela = ler("src/app/(app)/clientes/[id]/page.tsx");
    const action = ler("src/lib/actions/clientes.ts");
    expect(tela).toMatch(/TIPOS_DOC_CLIENTE\.map\(/);
    expect(tela).not.toMatch(/\["Contrato assinado"/);
    expect(action).toMatch(/import \{[^}]*tipoDeDocClienteValido[^}]*\} from "@\/lib\/clientes-regras"/);
    expect(action).not.toMatch(/const TIPOS_DOC_CLIENTE = \[/);
  });
});

describe.skipIf(!HAS_DB)("GA-13 K3 — anexo do cliente (banco)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { uploadClienteDoc } = await import("./clientes");
  let tenantId = "";
  let clienteId = "";

  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "GA-13 K3" }).returning();
    tenantId = t.id;
    const [c] = await db.insert(schema.clientes).values({ tenantId, nomeCompleto: "Contratante Teste" }).returning();
    clienteId = c.id;
    ctxRef.current = { tenant: t, projects: [], userId: null, userEmail: "k3@teste", role: "owner", perms: defaultPermissions("owner") };
  });
  afterAll(async () => {
    if (tenantId) await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  const enviar = (tipo: string, nome = "doc.pdf") => {
    const fd = new FormData();
    fd.set("clienteId", clienteId);
    fd.set("tipo", tipo);
    fd.set("file", new File([new Uint8Array([1, 2, 3])], nome, { type: "application/pdf" }));
    return uploadClienteDoc(fd);
  };
  const docs = () => db.select().from(schema.documents).where(and(eq(schema.documents.clienteId, clienteId), eq(schema.documents.tenantId, tenantId))).orderBy(desc(schema.documents.uploadedAt));

  it("anexar com 'Documentos do contratante' grava", async () => {
    expect(await enviar("Documentos do contratante", "rg.pdf")).toEqual({ ok: true });
    const lista = await docs();
    expect(lista.map((d) => [d.filename, d.tipo, d.versao])).toEqual([["rg.pdf", "Documentos do contratante", 1]]);
  });

  it("um registro antigo com 'Documentos do comprador' continua listado; anexo novo com o tipo antigo é recusado", async () => {
    await db.insert(schema.documents).values({ tenantId, clienteId, storageKey: "k/antigo", filename: "antigo.pdf", tipo: "Documentos do comprador", versao: 1 });
    const lista = await docs();
    expect(lista.map((d) => d.tipo)).toContain("Documentos do comprador");
    expect(await enviar("Documentos do comprador")).toEqual({ ok: false, error: "Escolha o tipo do documento." });
  });

  it("tipo fora da lista é recusado", async () => {
    expect(await enviar("Qualquer")).toEqual({ ok: false, error: "Escolha o tipo do documento." });
  });
});
