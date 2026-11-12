import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { partesDoMovimento } from "./movimento-obra";

/**
 * Prompt AT §3 (Revisão 4) — o movimento do extrato pertence à conta; a obra
 * vem do vínculo. Testes puros (a divisão) e com banco (AT-T5, AT-T6 e a
 * importação com a chave "caixa_conciliacao_por_conta").
 */
describe("partesDoMovimento (puro)", () => {
  const mov = { id: "m", valor: -1000, data: "11/05/2026" };

  it("divide pelos vínculos, com o sinal do movimento", () => {
    expect(partesDoMovimento(mov, [{ versionId: "A", valor: 600 }, { versionId: "B", valor: 400 }])).toEqual([
      { cashEntryId: "m", versionId: "A", valor: -600, data: "11/05/2026" },
      { cashEntryId: "m", versionId: "B", valor: -400, data: "11/05/2026" },
    ]);
  });

  it("sem vínculo: tudo 'não atribuído a obra' (BAT-2)", () => {
    expect(partesDoMovimento({ ...mov, valor: 250 }, [])).toEqual([{ cashEntryId: "m", versionId: null, valor: 250, data: "11/05/2026" }]);
  });

  it("vínculo parcial: o resto fica sem obra; a soma é sempre o movimento", () => {
    const p = partesDoMovimento(mov, [{ versionId: "A", valor: 300 }]);
    expect(p).toEqual([
      { cashEntryId: "m", versionId: "A", valor: -300, data: "11/05/2026" },
      { cashEntryId: "m", versionId: null, valor: -700, data: "11/05/2026" },
    ]);
  });

  it("vínculos que passam do valor são cortados; mesma obra soma", () => {
    const p = partesDoMovimento(mov, [{ versionId: "A", valor: 700 }, { versionId: "A", valor: 200 }, { versionId: "B", valor: 500 }]);
    expect(p).toEqual([
      { cashEntryId: "m", versionId: "A", valor: -900, data: "11/05/2026" },
      { cashEntryId: "m", versionId: "B", valor: -100, data: "11/05/2026" },
    ]);
    expect(p.reduce((a, x) => a + x.valor, 0)).toBe(-1000);
  });
});

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

describe.skipIf(!HAS_DB)("o movimento é da conta; a obra vem do vínculo (AT §3)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { realizadoDaVersao, partesDosMovimentosSemObra } = await import("./movimento-obra");
  const { getCash, getCashDaEmpresa, getStatusProjeto } = await import("@/lib/queries");
  const { flowMapsRealizado } = await import("@/lib/fluxo-caixa");
  const { importCash, addAjuste } = await import("@/lib/actions/caixa");
  const tenants: string[] = [];

  async function empresa(nome: string) {
    const [t] = await db.insert(schema.tenants).values({ name: nome }).returning();
    tenants.push(t.id);
    const obras: { projectId: string; atual: string }[] = [];
    for (const n of ["OBRA A", "OBRA B"]) {
      const [p] = await db.insert(schema.projects).values({ tenantId: t.id, name: n }).returning();
      const [v] = await db.insert(schema.versions).values({ projectId: p.id, tenantId: t.id, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
      obras.push({ projectId: p.id, atual: v.id });
    }
    const [conta] = await db.insert(schema.bankAccounts).values({ tenantId: t.id, banco: "Banco", cc: "1" }).returning();
    ctxRef.current = { tenant: t, projects: [], userId: null, userEmail: "teste@x", role: "owner", perms: defaultPermissions("owner") };
    return { tenant: t, obras, conta };
  }
  const ligar = (tenantId: string) => db.insert(schema.tenantFlags).values({ tenantId, chave: "caixa_conciliacao_por_conta", ligada: true });
  const despesa = async (tenantId: string, versionId: string, valor: number) =>
    (await db.insert(schema.despesas).values({ tenantId, versionId, valor: String(valor), status: "Pago", competencia: "11/2026", vencimento: "11/05/2026" }).returning())[0];
  const soma = (xs: { valor: number | string }[]) => Math.round(xs.reduce((a, x) => a + Number(x.valor), 0) * 100) / 100;

  afterAll(async () => {
    for (const id of tenants) await db.delete(schema.tenants).where(eq(schema.tenants.id, id));
  });

  it("AT-T5: R$ 1.000 sem obra conciliado com 600 da obra A e 400 da B → A = 600, B = 400, empresa = 1.000", async () => {
    const { tenant, obras, conta } = await empresa("AT3-T5");
    const [mov] = await db.insert(schema.cashEntries).values({ tenantId: tenant.id, versionId: null, bankAccountId: conta.id, data: "11/05/2026", valor: "-1000", rec: true }).returning();
    const dA = await despesa(tenant.id, obras[0].atual, 600);
    const dB = await despesa(tenant.id, obras[1].atual, 400);
    await db.insert(schema.conciliacoesDespesa).values([
      { tenantId: tenant.id, cashEntryId: mov.id, despesaId: dA.id, valor: "600" },
      { tenantId: tenant.id, cashEntryId: mov.id, despesaId: dB.id, valor: "400" },
    ]);
    expect(soma(await realizadoDaVersao(obras[0].atual))).toBe(-600);
    expect(soma(await realizadoDaVersao(obras[1].atual))).toBe(-400);
    // O Fluxo de Caixa (realizado) lê pela mesma regra.
    expect((await flowMapsRealizado(obras[0].atual)).saidas["11/2026"]).toBe(600);
    expect((await flowMapsRealizado(obras[1].atual)).saidas["11/2026"]).toBe(400);
    // O caixa da empresa (cadeia de saldo) tem o movimento inteiro, uma vez.
    const daEmpresa = await getCashDaEmpresa(tenant.id);
    expect(daEmpresa.map((c) => c.id)).toEqual([mov.id]);
    expect(daEmpresa[0].projectId).toBeNull();
    expect(soma(daEmpresa)).toBe(-1000);
  });

  it("BAT-2: entrada sem vínculo entra na empresa e em nenhuma obra; ligada a uma conta a receber, vai para a obra da conta", async () => {
    const { tenant, obras, conta } = await empresa("AT3-BAT2");
    const [mov] = await db.insert(schema.cashEntries).values({ tenantId: tenant.id, versionId: null, bankAccountId: conta.id, data: "11/06/2026", valor: "500" }).returning();
    expect(await partesDosMovimentosSemObra(tenant.id)).toEqual([{ cashEntryId: mov.id, versionId: null, valor: 500, data: "11/06/2026" }]);
    expect(await realizadoDaVersao(obras[0].atual)).toEqual([]);
    const st = await getStatusProjeto(tenant.id, [obras[0].projectId]);
    expect(st.recebido).toBe(0);

    const [cr] = await db.insert(schema.contasReceber).values({ tenantId: tenant.id, projectId: obras[1].projectId, descricao: "Aluguel", valor: "500" }).returning();
    await db.insert(schema.contaReceberRecebimentos).values({ tenantId: tenant.id, contaReceberId: cr.id, valor: "500", data: "11/06/2026", cashEntryId: mov.id });
    expect(soma(await realizadoDaVersao(obras[1].atual))).toBe(500);
    expect((await getStatusProjeto(tenant.id, [obras[1].projectId])).recebido).toBe(500);
    expect((await getStatusProjeto(tenant.id, [obras[0].projectId])).recebido).toBe(0);
  });

  it("AT-T6: movimento antigo (com obra) continua na obra que tem, mesmo vinculado a despesa de outra obra", async () => {
    const { tenant, obras, conta } = await empresa("AT3-T6");
    const [mov] = await db.insert(schema.cashEntries).values({ tenantId: tenant.id, versionId: obras[0].atual, bankAccountId: conta.id, data: "11/07/2026", valor: "-300", rec: true }).returning();
    const dB = await despesa(tenant.id, obras[1].atual, 300);
    await db.insert(schema.conciliacoesDespesa).values({ tenantId: tenant.id, cashEntryId: mov.id, despesaId: dB.id, valor: "300" });
    await db.insert(schema.cashEntries).values({ tenantId: tenant.id, versionId: obras[0].atual, bankAccountId: conta.id, data: "11/08/2026", valor: "1200" });
    for (const o of obras) {
      // o realizado novo de cada obra é exatamente o que `getCash` (a leitura de antes) dava
      expect(soma(await realizadoDaVersao(o.atual))).toBe(soma(await getCash(o.atual)));
    }
    expect(soma(await realizadoDaVersao(obras[0].atual))).toBe(900);
    expect(await realizadoDaVersao(obras[1].atual)).toEqual([]);
    expect(await partesDosMovimentosSemObra(tenant.id)).toEqual([]);
  });

  it("chave desligada: o extrato importado nasce na obra da tela, como sempre", async () => {
    const { tenant, obras, conta } = await empresa("AT3-desligada");
    const r = await importCash({ rows: [{ data: "11/09/2026", descricao: "PIX", valor: 75 }], bankAccountId: conta.id, projectId: obras[1].projectId });
    expect(r.inserted).toBe(1);
    const ms = await db.select().from(schema.cashEntries).where(eq(schema.cashEntries.tenantId, tenant.id));
    expect(ms.map((m) => m.versionId)).toEqual([obras[1].atual]);
  });

  it("chave ligada: o extrato nasce só com a conta; a conciliação automática procura em todas as obras (candidata única)", async () => {
    const { tenant, obras, conta } = await empresa("AT3-ligada");
    await ligar(tenant.id);
    const unica = (await db.insert(schema.despesas).values({ tenantId: tenant.id, versionId: obras[1].atual, valor: "88.40", status: "Em aberto", competencia: "11/2026", vencimento: "11/10/2026" }).returning())[0];
    // duas candidatas de 50 (uma em cada obra): fica pendente
    for (const o of obras) await db.insert(schema.despesas).values({ tenantId: tenant.id, versionId: o.atual, valor: "50", status: "Em aberto", competencia: "11/2026", vencimento: "11/10/2026" });
    const r = await importCash({ rows: [{ data: "11/10/2026", descricao: "BOLETO", valor: -88.4 }, { data: "11/10/2026", descricao: "BOLETO 2", valor: -50 }], bankAccountId: conta.id, projectId: "" });
    expect(r.conciliated).toBe(1);
    const ms = await db.select().from(schema.cashEntries).where(eq(schema.cashEntries.tenantId, tenant.id));
    expect(ms.every((m) => m.versionId === null)).toBe(true);
    // o movimento conciliado aparece no realizado da obra da despesa, o outro em nenhuma
    expect(soma(await realizadoDaVersao(obras[1].atual))).toBe(-88.4);
    expect(await realizadoDaVersao(obras[0].atual)).toEqual([]);
    const vinc = await db.select().from(schema.conciliacoesDespesa).where(eq(schema.conciliacoesDespesa.tenantId, tenant.id));
    expect(vinc.map((v) => v.despesaId)).toEqual([unica.id]);
  });

  it("BAT-3 (provisório): com a chave ligada, ajuste sem obra é da empresa; com obra, vai para a obra", async () => {
    const { tenant, obras, conta } = await empresa("AT3-ajuste");
    const fd = (campos: Record<string, string>) => {
      const f = new FormData();
      for (const [k, v] of Object.entries(campos)) f.set(k, v);
      return f;
    };
    // desligada: sem obra é recusado, como antes
    expect(await addAjuste(fd({ motivo: "tarifa", valor: "10", data: "11/11/2026", sinal: "menos", bankAccountId: conta.id }))).toMatchObject({ ok: false });
    await ligar(tenant.id);
    expect(await addAjuste(fd({ motivo: "tarifa", valor: "10", data: "11/11/2026", sinal: "menos", bankAccountId: conta.id }))).toMatchObject({ ok: true });
    expect(await addAjuste(fd({ motivo: "acerto", valor: "5", data: "11/11/2026", bankAccountId: conta.id, projectId: obras[0].projectId }))).toMatchObject({ ok: true });
    const ms = await db.select().from(schema.cashEntries).where(eq(schema.cashEntries.tenantId, tenant.id));
    expect(ms.map((m) => [m.versionId, Number(m.valor)]).sort((a, b) => Number(a[1]) - Number(b[1]))).toEqual([[null, -10], [obras[0].atual, 5]]);
  });
});
