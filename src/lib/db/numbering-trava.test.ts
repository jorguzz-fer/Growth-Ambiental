import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { analisarOcupacao, mensagemColisaoNumDoc, INDICE_NUM_DOC } from "./numbering";

const PED = { prefix: "PED", usePrefix: true, digits: 6 };

/** Amostra de números de documento como aparecem numa base real (valores sintéticos). */
const AMOSTRA = [
  "PED-000001", "PED-000002", "PED-000431",
  "PED-026179", "PED-026180", "PED-026181",
  "202606", "8441-1", "8441-2", "EXM-2026-000001", "56", null, "",
];

describe("analisarOcupacao — só conta o que o contador pode reproduzir", () => {
  it("contador em 432 com lote importado à frente: livre, mas com números adiante", () => {
    const o = analisarOcupacao(AMOSTRA, PED, 432);
    expect(o.proximoOcupado).toBe(false);
    expect(o.maiorEmitido).toBe(26181);
    expect(o.emUsoAFrente).toBe(3);
  });

  it("números de outro formato não viram régua (202606, 8441-1, 56)", () => {
    const o = analisarOcupacao(["202606", "8441-1", "56"], PED, 1);
    expect(o.maiorEmitido).toBeNull();
  });

  it("recuar para um número já emitido é detectado", () => {
    expect(analisarOcupacao(AMOSTRA, PED, 2).proximoOcupado).toBe(true);
    expect(analisarOcupacao(AMOSTRA, PED, 26181).proximoOcupado).toBe(true);
  });

  it("igual ao maior emitido também está ocupado", () => {
    const o = analisarOcupacao(AMOSTRA, PED, 26181);
    expect(o.proximoOcupado).toBe(true);
  });

  it("acima do maior: nada à frente", () => {
    const o = analisarOcupacao(AMOSTRA, PED, 26182);
    expect(o).toEqual({ maiorEmitido: 26181, proximoOcupado: false, emUsoAFrente: 0 });
  });

  it("sem prefixo, compara com o texto sem prefixo — e o dígito conta", () => {
    const f = { prefix: "", usePrefix: false, digits: 6 };
    const o = analisarOcupacao(["202606", "000010", "56"], f, 10);
    expect(o.proximoOcupado).toBe(true); // "000010"
    expect(o.maiorEmitido).toBe(202606); // "202606" tem 6 dígitos: é deste formato
  });

  it("prefixo com dígitos (EXM-2026) funciona", () => {
    const f = { prefix: "EXM-2026", usePrefix: true, digits: 6 };
    const o = analisarOcupacao(AMOSTRA, f, 1);
    expect(o.proximoOcupado).toBe(true);
    expect(o.maiorEmitido).toBe(1);
  });
});

describe("mensagemColisaoNumDoc", () => {
  it("reconhece a colisão no índice e cita o número", () => {
    const e = new Error(`duplicate key value violates unique constraint "${INDICE_NUM_DOC}"`);
    expect(mensagemColisaoNumDoc(e, "PED-000432")).toMatch(/PED-000432 já foi usado/);
  });
  it("reconhece pelo código 23505 na causa (driver)", () => {
    const e = Object.assign(new Error("Failed query: insert into despesa (num_doc)"), {
      cause: { code: "23505" },
    });
    expect(mensagemColisaoNumDoc(e, "PED-000001")).not.toBeNull();
  });
  it("outros erros passam adiante (null)", () => {
    expect(mensagemColisaoNumDoc(new Error("connection reset"), "PED-1")).toBeNull();
  });
});

const HAS_DB = !!process.env.DATABASE_URL;

describe.skipIf(!HAS_DB)("índice despesa_tenant_num_doc_uq (integração)", () => {
  it("barra repetido no mesmo tenant, permite em outro, e aceita vários sem número", async () => {
    const { db, schema } = await import("./index");
    const mk = async (name: string) => {
      const [t] = await db.insert(schema.tenants).values({ name }).returning();
      const [p] = await db.insert(schema.projects).values({ tenantId: t.id, name: "P" }).returning();
      const [v] = await db
        .insert(schema.versions)
        .values({ projectId: p.id, tenantId: t.id, key: "atual", kind: "atual", label: "Atual", color: "#000" })
        .returning();
      return { t, v };
    };
    const a = await mk("tenant-uq-a");
    const b = await mk("tenant-uq-b");
    try {
      const d = (x: { t: { id: string }; v: { id: string } }, numDoc: string | null) =>
        db.insert(schema.despesas).values({ versionId: x.v.id, tenantId: x.t.id, numDoc, valor: "1" });
      await d(a, "PED-000001");
      const erro = await d(a, "PED-000001").then(() => null, (e: unknown) => e);
      expect(erro).not.toBeNull();
      expect(mensagemColisaoNumDoc(erro, "PED-000001")).not.toBeNull();
      await d(b, "PED-000001"); // outro tenant: permitido
      await d(a, null);
      await d(a, null);
      await d(a, "");
      await d(a, ""); // parcial: nulo e vazio convivem
    } finally {
      await db.delete(schema.tenants).where(eq(schema.tenants.id, a.t.id));
      await db.delete(schema.tenants).where(eq(schema.tenants.id, b.t.id));
    }
  });
});
