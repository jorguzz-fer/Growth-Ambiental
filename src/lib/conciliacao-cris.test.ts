import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import * as XLSX from "xlsx";

/**
 * Prompt AT §7 e §8 (Revisão 4) — a conciliação com a Cris. Ferramentas que só
 * leem, proposta validada no servidor, lote confirmado pela pessoa.
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
// A leitura de PDF é a da importação; aqui ela devolve linhas fixas (sem IA e sem arquivo real).
vi.mock("@/lib/ai/extrato-extract", async (orig) => ({
  ...(await orig<typeof import("@/lib/ai/extrato-extract")>()),
  extractExtratoFromText: vi.fn(async () => ({ movimentos: [{ data: "11/03/2026", descricao: "PIX X", doc: "1", valor: -10 }], saldoFinal: 90 })),
}));

describe("AT-T15: ler_extrato devolve as mesmas linhas que o diálogo de importação", async () => {
  const { lerExtratoDoAnexo } = await import("./extrato-leitura");
  const { linhasDaPlanilha } = await import("./extrato-planilha");
  const planilha = [
    ["Data", "Histórico", "Documento", "Valor"],
    ["03/11/2026", "PIX RECEBIDO MARIA", "123", "2.345,67"],
    ["04/11/2026", "PAGTO BOLETO", "124", "-1.850,00"],
    ["05/11/2026", "TARIFA", "", "-59,90"],
  ];
  const quem = { tenantId: "t", userId: null };

  for (const [nome, tipo, gerar] of [
    ["XLSX", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", () => XLSX.write({ SheetNames: ["s"], Sheets: { s: XLSX.utils.aoa_to_sheet(planilha) } }, { type: "buffer", bookType: "xlsx" }) as Buffer],
    ["CSV", "text/csv", () => Buffer.from(planilha.map((l) => l.map((c) => `"${c}"`).join(";")).join("\n"), "utf8")],
  ] as const) {
    it(nome, async () => {
      const bytes = gerar();
      const doDialogo = linhasDaPlanilha(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer).rows.map((r) => ({ data: r.data, descricao: r.descricao, doc: r.doc, valor: r.valor }));
      const daCris = await lerExtratoDoAnexo({ tipo, base64: bytes.toString("base64"), nome: `extrato.${nome.toLowerCase()}` }, quem);
      expect(doDialogo).toHaveLength(3);
      expect(daCris).toEqual({ linhas: doDialogo, saldoFinal: null });
    });
  }

  it("PDF de texto: a mesma leitura do diálogo (extractExtratoFromText, sem IA)", async () => {
    const antes = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const r = await lerExtratoDoAnexo({ tipo: "application/pdf", base64: Buffer.from("%PDF-1.4").toString("base64"), nome: "extrato.pdf" }, quem);
      expect(r).toEqual({ linhas: [{ data: "11/03/2026", descricao: "PIX X", doc: "1", valor: -10 }], saldoFinal: 90 });
    } finally {
      if (antes) process.env.ANTHROPIC_API_KEY = antes;
    }
  });
});

describe.skipIf(!HAS_DB)("conciliação com a Cris (AT §8)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { confirmarConciliacoes } = await import("@/lib/actions/caixa");
  const { addDespesa } = await import("@/lib/actions/despesas");
  const { candidatosDoMovimento, pendentesDaRodada } = await import("./conciliacao-cris");
  const { ferramentasDoCaixa } = await import("./conciliacao-cris-ferramentas");
  let tenant: typeof schema.tenants.$inferSelect;
  let projectId = "";
  let versao = "";
  let contaId = "";
  const despesas: string[] = [];
  const movimentos: string[] = [];
  const fd = (campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    return f;
  };

  beforeAll(async () => {
    [tenant] = await db.insert(schema.tenants).values({ name: "AT8-cris" }).returning();
    const [p] = await db.insert(schema.projects).values({ tenantId: tenant.id, name: "OBRA AT8" }).returning();
    projectId = p.id;
    [{ id: versao }] = await db.insert(schema.versions).values({ projectId, tenantId: tenant.id, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
    [{ id: contaId }] = await db.insert(schema.bankAccounts).values({ tenantId: tenant.id, banco: "Banco", cc: "9" }).returning();
    ctxRef.current = { tenant, projects: [p], userId: null, userEmail: "at8@teste", role: "owner", perms: defaultPermissions("owner") };
    for (let i = 1; i <= 6; i++) {
      const [d] = await db.insert(schema.despesas).values({ tenantId: tenant.id, versionId: versao, valor: String(100 * i), status: "A pagar", competencia: "11/2026", vencimento: `11/0${i}/2026` }).returning();
      despesas.push(d.id);
      const [m] = await db.insert(schema.cashEntries).values({ tenantId: tenant.id, versionId: versao, bankAccountId: contaId, data: `11/0${i}/2026`, descricao: `BOLETO ${i}`, valor: String(-100 * i), importHash: `h${i}` }).returning();
      movimentos.push(m.id);
    }
  });
  afterAll(async () => {
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenant.id));
  });

  it("a rodada: até 20 pendentes, do mais antigo para o mais novo, cada um com candidatos do servidor", async () => {
    const ps = await pendentesDaRodada(tenant.id);
    expect(ps.map((p) => p.movimento)).toEqual(movimentos);
    const c = await candidatosDoMovimento(tenant.id, movimentos[0]);
    expect(c?.candidatos[0]).toMatchObject({ ref: `D:${despesas[0]}`, grau: "alta" });
  });

  it("AT-T16: proposta com uma despesa que não está nos candidatos do movimento → recusada no servidor", async () => {
    const f = ferramentasDoCaixa(ctxRef.current as never, { podeConciliar: true, podeImportar: true, anexo: null, contaDaTela: null });
    const r = await f.propor!([{ movimento: movimentos[0], ref: `D:${despesas[5]}` }]);
    expect(r.proposta).toBeNull();
    expect(r.texto).toMatch(/não é candidato/);
    // e o botão também recusa (a tela não é a única barreira)
    const c = await confirmarConciliacoes([{ movimento: movimentos[0], ref: `D:${despesas[5]}` }]);
    expect(c).toMatchObject({ ok: true, gravadas: 0 });
    expect((c as { resultados: { ok: boolean }[] }).resultados[0].ok).toBe(false);
    expect(await db.select().from(schema.conciliacoesDespesa).where(eq(schema.conciliacoesDespesa.tenantId, tenant.id))).toEqual([]);
  });

  it("AT-T17: lote de 5 confirmadas → 5 vínculos e 5 auditorias; uma falha não grava as outras pela metade e o resultado diz qual", async () => {
    const f = ferramentasDoCaixa(ctxRef.current as never, { podeConciliar: true, podeImportar: true, anexo: null, contaDaTela: null });
    const lote = movimentos.slice(0, 5).map((m, i) => ({ movimento: m, ref: `D:${despesas[i]}` }));
    const p = await f.propor!(lote);
    expect(p.proposta?.itens).toHaveLength(5);
    // entre a proposta e o clique, uma das despesas foi cancelada: esse item falha, os outros gravam
    await db.update(schema.despesas).set({ cancelado: true }).where(eq(schema.despesas.id, despesas[2]));
    const r = await confirmarConciliacoes(p.proposta!.itens.map((i) => ({ movimento: i.movimento, ref: i.ref, valor: i.valor })));
    expect(r).toMatchObject({ ok: true, gravadas: 4 });
    const falha = (r as { resultados: { movimento: string; ok: boolean }[] }).resultados.find((x) => !x.ok)!;
    expect(falha.movimento).toBe(movimentos[2]);
    const vinc = await db.select().from(schema.conciliacoesDespesa).where(and(eq(schema.conciliacoesDespesa.tenantId, tenant.id), eq(schema.conciliacoesDespesa.desfeito, false)));
    expect(vinc.map((v) => v.cashEntryId).sort()).toEqual([movimentos[0], movimentos[1], movimentos[3], movimentos[4]].sort());
    expect(vinc.every((v) => v.origem === "assistente")).toBe(true);
    const audit = await db.select().from(schema.auditLog).where(and(eq(schema.auditLog.tenantId, tenant.id), eq(schema.auditLog.action, "conciliacao.create")));
    expect(audit).toHaveLength(4);
    // o movimento da despesa cancelada continua pendente, inteiro
    const [m3] = await db.select().from(schema.cashEntries).where(eq(schema.cashEntries.id, movimentos[2]));
    expect(m3.rec).toBe(false);
    // acima de 20 é recusado de uma vez
    expect(await confirmarConciliacoes(Array.from({ length: 21 }, () => ({ movimento: movimentos[5], ref: `D:${despesas[5]}` })))).toMatchObject({ ok: false });
  });

  it("AT-T18: sem Caixa/editar, a Cris não recebe as ferramentas de conciliação e explica por quê", async () => {
    const f = ferramentasDoCaixa(ctxRef.current as never, { podeConciliar: false, podeImportar: false, anexo: null, contaDaTela: null });
    expect(f.pendentes).toBeUndefined();
    expect(f.candidatos).toBeUndefined();
    expect(f.propor).toBeUndefined();
    expect(f.lerExtrato).toBeUndefined();
    expect(f.semPermissao).toMatch(/Caixa\/editar/);
    // e o botão de confirmar também recusa quem não pode
    const ctx = ctxRef.current as { perms: ReturnType<typeof defaultPermissions> };
    const antes = ctx.perms;
    ctxRef.current = { ...(ctxRef.current as object), perms: defaultPermissions("contador") };
    expect(await confirmarConciliacoes([{ movimento: movimentos[5], ref: `D:${despesas[5]}` }])).toMatchObject({ ok: false });
    ctxRef.current = { ...(ctxRef.current as object), perms: antes };
  });

  it("AT-T19: a despesa lançada a partir do movimento nasce paga na data do extrato, vinculada a ele, sem segunda saída", async () => {
    const [mov] = await db.insert(schema.cashEntries).values({ tenantId: tenant.id, versionId: versao, bankAccountId: contaId, data: "11/09/2026", descricao: "PIX SEM PAR", valor: "-77.70", importHash: "sem-par" }).returning();
    const saidasAntes = (await db.select().from(schema.cashEntries).where(eq(schema.cashEntries.tenantId, tenant.id))).length;
    const r = await addDespesa(fd({ projectId, categoriaDre: "Custo Variável", formaPagamento: "PIX", status: "A pagar", competencia: "11/2026", vencimento: "11/09/2026", valor: "77.70", obs: "PIX SEM PAR", cashEntryId: mov.id }));
    expect(r.ok).toBe(true);
    const [d] = await db.select().from(schema.despesas).where(eq(schema.despesas.id, (r as { id: string }).id));
    expect([d.status, d.dataCaixa]).toEqual(["Pago", "11/09/2026"]);
    const [v] = await db.select().from(schema.conciliacoesDespesa).where(eq(schema.conciliacoesDespesa.cashEntryId, mov.id));
    expect(v.despesaId).toBe(d.id);
    expect((await db.select().from(schema.cashEntries).where(eq(schema.cashEntries.tenantId, tenant.id))).length).toBe(saidasAntes);
    const [m] = await db.select().from(schema.cashEntries).where(eq(schema.cashEntries.id, mov.id));
    expect(m.rec).toBe(true);
  });
});
