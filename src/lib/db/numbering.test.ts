import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { previewNumber, reserveDespesaNumber } from "./numbering";

describe("previewNumber (formatação)", () => {
  it("aplica prefixo e dígitos", () => {
    expect(previewNumber("PED", true, 6, 1258)).toBe("PED-001258");
  });
  it("sem prefixo", () => {
    expect(previewNumber("PED", false, 6, 1258)).toBe("001258");
  });
  it("respeita a quantidade de dígitos", () => {
    expect(previewNumber("", true, 4, 7)).toBe("0007");
  });
});

// Integração com o banco: roda apenas quando DATABASE_URL está definido.
const HAS_DB = !!process.env.DATABASE_URL;

describe.skipIf(!HAS_DB)("reserveDespesaNumber (integração / concorrência)", () => {
  it("gera números únicos sob concorrência a partir do ponto definido", async () => {
    const { db, schema } = await import("./index");
    const [t] = await db
      .insert(schema.tenants)
      .values({ name: "tenant-numbering-test" })
      .returning();
    try {
      await db.insert(schema.numberSequences).values({
        tenantId: t.id,
        entity: "despesa",
        prefix: "PED",
        digits: 6,
        nextNumber: 1000,
      });
      // 25 reservas simultâneas
      const results = await Promise.all(
        Array.from({ length: 25 }, () => reserveDespesaNumber(t.id)),
      );
      // todos distintos (nenhum duplicado)
      expect(new Set(results).size).toBe(25);
      // começa exatamente no ponto configurado
      expect(results).toContain("PED-001000");
      // sequência contígua 1000..1024
      const nums = results.map((r) => Number(r.split("-")[1])).sort((a, b) => a - b);
      expect(nums[0]).toBe(1000);
      expect(nums[nums.length - 1]).toBe(1024);
    } finally {
      await db.delete(schema.tenants).where(eq(schema.tenants.id, t.id));
    }
  });

  it("semeia a sequência a partir do maior número já existente", async () => {
    const { db, schema } = await import("./index");
    const [t] = await db
      .insert(schema.tenants)
      .values({ name: "tenant-numbering-seed" })
      .returning();
    try {
      // cria projeto+versão mínima para lançar despesas com numDoc
      const [p] = await db
        .insert(schema.projects)
        .values({ tenantId: t.id, name: "P" })
        .returning();
      const [v] = await db
        .insert(schema.versions)
        .values({ projectId: p.id, tenantId: t.id, key: "atual", kind: "atual", label: "Atual", color: "#000" })
        .returning();
      await db.insert(schema.despesas).values([
        { versionId: v.id, tenantId: t.id, numDoc: "PED-000500", valor: "10" },
        { versionId: v.id, tenantId: t.id, numDoc: "EXM-2026-000842", valor: "10" },
      ]);
      // primeira reserva deve continuar após 842 (o maior sufixo)
      const first = await reserveDespesaNumber(t.id);
      expect(Number(first.split("-").pop())).toBe(843);
    } finally {
      await db.delete(schema.tenants).where(eq(schema.tenants.id, t.id));
    }
  });
});
