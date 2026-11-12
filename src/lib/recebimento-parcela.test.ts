import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { situacaoDaParcela, sugestoesDeParcela, type ParcelaDeVenda } from "./recebimento-parcela";
import { emptyUnit } from "@/lib/calc/__fixtures__";

/**
 * Prompt AT §5 (Revisão 4) — a parcela do comprador conciliável com a entrada
 * do extrato.
 */
describe("situação da parcela (puro)", () => {
  const hoje = "2026-11-12";
  it("a vencer, parcial, recebida e vencida", () => {
    expect(situacaoDaParcela({ valor: 100, recebido: 0, dia: "11/20/2026", hojeISO: hoje })).toEqual({ situacao: "a vencer", saldo: 100 });
    expect(situacaoDaParcela({ valor: 100, recebido: 40, dia: "11/20/2026", hojeISO: hoje })).toEqual({ situacao: "parcial", saldo: 60 });
    expect(situacaoDaParcela({ valor: 100, recebido: 100, dia: "10/20/2026", hojeISO: hoje })).toEqual({ situacao: "recebida", saldo: 0 });
    expect(situacaoDaParcela({ valor: 100, recebido: 40, dia: "10/20/2026", hojeISO: hoje })).toEqual({ situacao: "vencida", saldo: 60 });
  });

  it("sugestões: valor exato com o nome do comprador = alta; permuta e financiamento nunca", () => {
    const base = { refId: "", descricao: "U1 — Mensal #12", unitCode: "U1", projectId: "p", projectName: "OBRA", status: "A receber", recebido: 0, situacao: "a vencer" as const };
    const parcelas: ParcelaDeVenda[] = [
      { ...base, unitId: "u1", chave: "Mensais#12", secao: "Mensais", dia: "11/10/2026", valor: 2345.67, saldo: 2345.67, clienteNome: "João Silva" },
      { ...base, unitId: "u1", chave: "Permuta#1", secao: "Permuta", dia: "11/10/2026", valor: 2345.67, saldo: 2345.67, clienteNome: "João Silva" },
      { ...base, unitId: "u1", chave: "Banco#1", secao: "Banco", dia: "11/10/2026", valor: 2345.67, saldo: 2345.67, clienteNome: "João Silva" },
    ];
    const s = sugestoesDeParcela({ valor: 2345.67, data: "11/11/2026", descricao: "PIX RECEBIDO JOAO SILVA" }, parcelas);
    expect(s.map((x) => [x.chave, x.grau])).toEqual([["Mensais#12", "alta"]]);
  });
});

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

describe.skipIf(!HAS_DB)("recebimento da parcela do comprador (AT §5)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { getConciliacaoData, getMonthlyRevenue } = await import("@/lib/queries");
  const { conciliarParcelaDeVenda, estornarRecebimentoDeParcela, criarContaAPartirDoExtrato } = await import("@/lib/actions/caixa");
  const { parcelasDeVenda, recebimentosSemParcela } = await import("./recebimento-parcela");
  const { entradasDoFluxo } = await import("@/lib/fluxo-caixa");
  const { realizadoDaVersao } = await import("./movimento-obra");
  const hoje = "2026-11-12";
  let tenantId = "";
  let projectId = "";
  let versao: typeof schema.versions.$inferSelect;
  let unitId = "";
  let contaId = "";

  const plano = () => {
    const u = emptyUnit("U1", 30000);
    u.status = "Vendido";
    u.Mensais = { val: 2345.67, venc: "12/10/2025", n: 12, usarSem: false };
    u.S3.usarMens = true;
    return u;
  };
  const entrada = async (valor: number, data: string, descricao: string, versionId: string | null = versao.id) =>
    (await db.insert(schema.cashEntries).values({ tenantId, versionId, bankAccountId: contaId, data, descricao, valor: String(valor), importHash: `${descricao}|${valor}|${data}` }).returning())[0];
  const parcela = async (chave: string) => (await parcelasDeVenda(tenantId, hoje)).find((p) => p.chave === chave)!;

  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "AT5-parcela" }).returning();
    tenantId = t.id;
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "OBRA AT5" }).returning();
    projectId = p.id;
    [versao] = await db.insert(schema.versions).values({ projectId, tenantId, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
    [{ id: unitId }] = await db.insert(schema.units).values({ tenantId, versionId: versao.id, code: "U1", status: "Vendido", valor: "30000", paymentPlan: plano() as never }).returning();
    await db.insert(schema.clientes).values({ tenantId, unitCode: "U1", nomeCompleto: "João Silva" } as never);
    [{ id: contaId }] = await db.insert(schema.bankAccounts).values({ tenantId, banco: "Banco", cc: "1" }).returning();
    ctxRef.current = { tenant: t, projects: [p], userId: null, userEmail: "at5@teste", role: "owner", perms: defaultPermissions("owner") };
  });
  afterAll(async () => {
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("AT-T7: entrada de R$ 2.345,67 com o nome do comprador → sugestão alta da Mensais#12; conciliar → parcela recebida", async () => {
    expect((await parcela("Mensais#12")).situacao).toBe("vencida");
    const mov = await entrada(2345.67, "11/11/2026", "PIX RECEBIDO JOAO SILVA");
    const conc = await getConciliacaoData(tenantId, {});
    const pend = conc.pendentesEntrada.find((m) => m.cashEntryId === mov.id)!;
    expect(pend.parcelas?.[0]).toMatchObject({ chave: "Mensais#12", grau: "alta", unidade: "U1" });
    const receitaAntes = await getMonthlyRevenue(versao.id, projectId);

    expect(await conciliarParcelaDeVenda({ cashEntryId: mov.id, unitId, chave: "Mensais#12" })).toEqual({ ok: true, concluida: true, valor: 2345.67 });
    expect(await parcela("Mensais#12")).toMatchObject({ situacao: "recebida", recebido: 2345.67, saldo: 0 });
    const [m] = await db.select().from(schema.cashEntries).where(eq(schema.cashEntries.id, mov.id));
    expect(m.rec).toBe(true);
    // AT-T8: a receita da DRE não muda (a parcela já estava lá); nenhuma conta a receber nasce
    expect(await getMonthlyRevenue(versao.id, projectId)).toEqual(receitaAntes);
    expect(await db.select().from(schema.contasReceber).where(eq(schema.contasReceber.tenantId, tenantId))).toEqual([]);
    // e a entrada some das pendentes
    expect((await getConciliacaoData(tenantId, {})).pendentesEntrada.some((x) => x.cashEntryId === mov.id)).toBe(false);
  });

  it("parcial: duas entradas quitam a parcela; recusa valor acima do saldo; estorno devolve a pendência", async () => {
    const a = await entrada(1000, "11/05/2026", "PIX JOAO");
    expect(await conciliarParcelaDeVenda({ cashEntryId: a.id, unitId, chave: "Mensais#11" })).toEqual({ ok: true, concluida: true, valor: 1000 });
    expect(await parcela("Mensais#11")).toMatchObject({ situacao: "vencida", recebido: 1000, saldo: 1345.67 });
    const b = await entrada(2000, "11/06/2026", "PIX JOAO 2");
    // o que couber: o saldo da parcela; a entrada fica com o resto livre
    expect(await conciliarParcelaDeVenda({ cashEntryId: b.id, unitId, chave: "Mensais#11", valor: 1500 })).toMatchObject({ ok: false });
    expect(await conciliarParcelaDeVenda({ cashEntryId: b.id, unitId, chave: "Mensais#11" })).toEqual({ ok: true, concluida: false, valor: 1345.67 });
    expect((await parcela("Mensais#11")).situacao).toBe("recebida");
    const pend = (await getConciliacaoData(tenantId, {})).pendentesEntrada.find((x) => x.cashEntryId === b.id)!;
    expect(pend.livre).toBe(654.33);

    const [rec] = await db.select().from(schema.recebimentosParcela).where(and(eq(schema.recebimentosParcela.cashEntryId, a.id)));
    expect(await estornarRecebimentoDeParcela(rec.id, " ")).toMatchObject({ ok: false });
    expect(await estornarRecebimentoDeParcela(rec.id, "parcela errada")).toEqual({ ok: true });
    expect((await parcela("Mensais#11")).recebido).toBe(1345.67);
    const [ma] = await db.select().from(schema.cashEntries).where(eq(schema.cashEntries.id, a.id));
    expect(ma.rec).toBe(false);
  });

  it("5.4: criar conta a receber de uma entrada com parcela compatível exige a confirmação de que não é ela", async () => {
    const mov = await entrada(2345.67, "10/10/2026", "TED JOAO SILVA");
    const r = await criarContaAPartirDoExtrato({ cashEntryId: mov.id });
    expect(r).toMatchObject({ ok: false });
    expect((r as { parcelas: { chave: string }[] }).parcelas.map((p) => p.chave)).toContain("Mensais#10");
    expect(await db.select().from(schema.contasReceber).where(eq(schema.contasReceber.tenantId, tenantId))).toEqual([]);
    expect(await criarContaAPartirDoExtrato({ cashEntryId: mov.id, naoEParcela: true })).toEqual({ ok: true });
    expect(await db.select().from(schema.contasReceber).where(eq(schema.contasReceber.tenantId, tenantId))).toHaveLength(1);
  });

  it("BAT-6: com a chave, o recebido sai do previsto do Fluxo no mês da parcela; desligada, nada muda", async () => {
    const antes = (await entradasDoFluxo(versao, projectId)).vendas["11/2026"];
    await db.insert(schema.tenantFlags).values({ tenantId, chave: "parcela_recebida_situacao", ligada: true });
    const depois = (await entradasDoFluxo(versao, projectId)).vendas;
    expect(Math.round((antes - depois["11/2026"]) * 100) / 100).toBe(2345.67);
    // a Mensais#11 (10/2026) foi quitada pelas duas entradas (uma estornada, a outra de 1.345,67)
    await db.delete(schema.tenantFlags).where(eq(schema.tenantFlags.tenantId, tenantId));
    expect((await entradasDoFluxo(versao, projectId)).vendas["11/2026"]).toBe(antes);
  });

  it("movimento sem obra conciliado com parcela vai para a obra da unidade (§3)", async () => {
    const mov = await entrada(2345.67, "09/10/2026", "PIX JOAO SILVA", null);
    expect(await conciliarParcelaDeVenda({ cashEntryId: mov.id, unitId, chave: "Mensais#10" })).toMatchObject({ ok: true });
    expect((await realizadoDaVersao(versao.id)).some((x) => x.id === mov.id && x.valor === 2345.67)).toBe(true);
  });

  it("AT-T9 / BAT-5: editar o plano depois do recebimento não apaga o recebimento; a chave sumida vira 'sem parcela'", async () => {
    const recebimentos = async () => (await db.select().from(schema.recebimentosParcela).where(and(eq(schema.recebimentosParcela.tenantId, tenantId), eq(schema.recebimentosParcela.estornado, false)))).length;
    const n = await recebimentos();
    const curto = plano();
    curto.Mensais.n = 10;
    await db.update(schema.units).set({ paymentPlan: curto as never }).where(eq(schema.units.id, unitId));
    expect(await recebimentos()).toBe(n);
    const sem = await recebimentosSemParcela(tenantId);
    expect(sem.map((s) => s.chave).sort()).toEqual(["Mensais#11", "Mensais#12"]);
    // a que continua no plano segue recebida
    expect((await parcela("Mensais#10")).situacao).toBe("recebida");
  });
});
