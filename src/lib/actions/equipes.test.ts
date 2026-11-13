import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";

/** Prompt Z, PR Z-3 — Equipes de Projetos. Integração (DATABASE_URL); R2 substituído. */
const HAS_DB = !!process.env.DATABASE_URL;
const ctxRef: { current: unknown } = { current: null };
const enviados: string[] = [];
vi.mock("@/lib/context", async (orig) => ({ ...(await orig<typeof import("@/lib/context")>()), getTenantContext: async () => ctxRef.current }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {}, notFound: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/storage/r2", () => ({ isR2Configured: () => true, putObject: async (key: string) => void enviados.push(key), readUrl: async (key: string) => `https://r2.local/${key}`, getObjectBytes: async () => new Uint8Array() }));

const fd = (campos: Record<string, string | File | File[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) {
    if (Array.isArray(v)) v.forEach((x) => f.append(k, x));
    else f.set(k, v);
  }
  return f;
};

describe.skipIf(!HAS_DB)("Equipes de Projetos (Prompt Z, Parte 3)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { alocarMembro, updateAlocacao, registrarDiariasDoDia, addEquipeDiaDocs, addFuncao, vincularDiariasADespesa } = await import("./equipes");
  const { garantirFuncoesPadrao } = await import("@/lib/equipes-db");
  const { getEquipeDoProjeto, getAlocaveis, getDiasDaEquipe, getDocumentsByEquipeDias } = await import("@/lib/queries");
  let tenant: typeof schema.tenants.$inferSelect;
  let obraA = "";
  let obraB = "";
  let autonomoId = "";
  let socioId = "";
  let cltId = "";
  let desligadoId = "";
  let alocAutonomoA = "";
  let alocCltA = "";
  let fotoAntes = "";
  const foto = async () => JSON.stringify(await db.select({ id: schema.stakeholders.id, nome: schema.stakeholders.nome, doc: schema.stakeholders.doc }).from(schema.stakeholders).where(eq(schema.stakeholders.tenantId, tenant.id)));

  beforeAll(async () => {
    [tenant] = await db.insert(schema.tenants).values({ name: "equipes-Z3" }).returning();
    const [a] = await db.insert(schema.projects).values({ tenantId: tenant.id, name: "OBRA 28" }).returning();
    const [b] = await db.insert(schema.projects).values({ tenantId: tenant.id, name: "OBRA 31" }).returning();
    obraA = a.id;
    obraB = b.id;
    const [au] = await db.insert(schema.stakeholders).values({ tenantId: tenant.id, nome: "João Pedreiro", tipo: "PF", doc: "52998224725", papeis: ["Mão de Obra RPA"] }).returning();
    const [so] = await db.insert(schema.stakeholders).values({ tenantId: tenant.id, nome: "Sócio Gestor", tipo: "PF", papeis: ["Sócio/Quotista"] }).returning();
    await db.insert(schema.stakeholders).values({ tenantId: tenant.id, nome: "Loja de Material", tipo: "PJ", papeis: ["Fornecedor de Material"] });
    autonomoId = au.id;
    socioId = so.id;
    const [c] = await db.insert(schema.funcionarios).values({ tenantId: tenant.id, nome: "Carlos CLT", cargo: "Servente" }).returning();
    const [d] = await db.insert(schema.funcionarios).values({ tenantId: tenant.id, nome: "Dora Desligada", desligamento: "2026-08-31" }).returning();
    cltId = c.id;
    desligadoId = d.id;
    ctxRef.current = { tenant, projects: [{ id: obraA }, { id: obraB }], userId: null, userEmail: "z3@teste", role: "owner", perms: defaultPermissions("owner") };
    fotoAntes = await foto();
  });
  afterAll(async () => {
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenant.id));
  });

  it("BZ-3 — as funções padrão (de campo) nascem na primeira leitura; nova função é editável; 3.3 — o seletor lista autônomo, sócio e CLT ativo com a origem", async () => {
    const funcoes = await garantirFuncoesPadrao(tenant.id);
    expect(funcoes.map((f) => f.nome)).toEqual(["Técnico de campo", "Coordenador de campo", "Arqueólogo(a)", "Biólogo(a)", "Engenheiro(a) ambiental", "Auxiliar de campo", "Comercial", "Gestor Administrativo"]);
    expect(await addFuncao("Técnico de campo")).toMatchObject({ ok: false, error: expect.stringMatching(/já existe/) });
    expect(await addFuncao("Eletricista")).toMatchObject({ ok: true });
    const al = await getAlocaveis(tenant.id);
    expect(al.map((x) => [x.nome, x.origem])).toEqual([["Carlos CLT", "clt"], ["João Pedreiro", "autonomo"], ["Sócio Gestor", "socio"]]); // loja e desligada ficam fora
  });

  it("5 / 6 / 7 / 8 / 10 / 10b — alocação referencia o cadastro; origem única; funções diferentes por obra; desligado não entra; diária por alocação; CLT e sócio sem valor", async () => {
    const funcoes = await garantirFuncoesPadrao(tenant.id);
    const mestre = funcoes.find((f) => f.nome === "Coordenador de campo")!.id;
    const pedreiro = funcoes.find((f) => f.nome === "Técnico de campo")!.id;
    expect(await alocarMembro(fd({ projectId: obraA, stakeholderId: autonomoId, funcionarioId: cltId }))).toMatchObject({ ok: false, error: expect.stringMatching(/não os dois/) });
    expect(await alocarMembro(fd({ projectId: obraA, funcionarioId: desligadoId }))).toMatchObject({ ok: false, error: expect.stringMatching(/desligado/) });
    expect(await alocarMembro(fd({ projectId: obraA, funcionarioId: cltId, valorDiaria: "200" }))).toMatchObject({ ok: false, error: expect.stringMatching(/não têm diária/) });
    const r1 = await alocarMembro(fd({ projectId: obraA, stakeholderId: autonomoId, funcaoId: mestre, valorDiaria: "250", entrada: "09/01/2026" }));
    expect(r1).toMatchObject({ ok: true });
    alocAutonomoA = (r1 as { ok: true; id: string }).id;
    const r2 = await alocarMembro(fd({ projectId: obraB, stakeholderId: autonomoId, funcaoId: pedreiro, valorDiaria: "180" })); // 7 — outra função em outra obra
    expect(r2).toMatchObject({ ok: true });
    const r3 = await alocarMembro(fd({ projectId: obraA, funcionarioId: cltId }));
    expect(r3).toMatchObject({ ok: true });
    alocCltA = (r3 as { ok: true; id: string }).id;
    expect(await alocarMembro(fd({ projectId: obraA, stakeholderId: socioId }))).toMatchObject({ ok: true });
    const equipe = await getEquipeDoProjeto(tenant.id, obraA);
    expect(equipe.map((m) => [m.nome, m.origem, m.funcaoNome, m.valorDiaria])).toEqual([["Carlos CLT", "clt", null, null], ["João Pedreiro", "autonomo", "Coordenador de campo", 250], ["Sócio Gestor", "socio", null, null]]);
    // 5 — a alocação não copia nome nem documento
    const [row] = await db.select().from(schema.equipesProjeto).where(eq(schema.equipesProjeto.id, alocAutonomoA));
    expect(JSON.stringify(row)).not.toMatch(/João|52998224725/);
    // 10 — o cadastro de Fornecedores não tem campo de diária
    expect("valorDiaria" in schema.stakeholders).toBe(false);
  });

  it("9 / 10a / 3.5.4 — lote registra a equipe inteira; o valor é GRAVADO; alterar a alocação não reescreve; CLT sem valor", async () => {
    const r = await registrarDiariasDoDia({ projectId: obraA, data: "09/10/2026", itens: [{ equipeProjetoId: alocAutonomoA, quantidade: 1 }, { equipeProjetoId: alocCltA, quantidade: 0.5 }] });
    expect(r).toMatchObject({ ok: true, registradas: 2 });
    expect(await updateAlocacao(alocAutonomoA, fd({ valorDiaria: "300" }))).toMatchObject({ ok: true, aviso: expect.stringMatching(/próximos registros/) });
    const r2 = await registrarDiariasDoDia({ projectId: obraA, data: "09/11/2026", itens: [{ equipeProjetoId: alocAutonomoA, quantidade: 1.5 }] });
    expect(r2).toMatchObject({ ok: true });
    const dias = await getDiasDaEquipe(tenant.id, obraA);
    const d10 = dias.find((d) => d.data === "09/10/2026")!;
    const d11 = dias.find((d) => d.data === "09/11/2026")!;
    expect(d10.diarias.find((x) => x.equipeProjetoId === alocAutonomoA)?.valor).toBe(250); // valor da época
    expect(d10.diarias.find((x) => x.equipeProjetoId === alocCltA)?.valor).toBeNull(); // 10b
    expect(d11.diarias[0]).toMatchObject({ quantidade: 1.5, valor: 300 });
    // registrar de novo o mesmo dia atualiza a quantidade (não duplica)
    expect(await registrarDiariasDoDia({ projectId: obraA, data: "09/10/2026", itens: [{ equipeProjetoId: alocAutonomoA, quantidade: 0.5 }] })).toMatchObject({ ok: true });
    expect((await getDiasDaEquipe(tenant.id, obraA)).find((d) => d.data === "09/10/2026")!.diarias.filter((x) => x.equipeProjetoId === alocAutonomoA)).toHaveLength(1);
    // quantidade fora da lista / autônomo sem valor
    expect(await registrarDiariasDoDia({ projectId: obraA, data: "09/12/2026", itens: [{ equipeProjetoId: alocAutonomoA, quantidade: 0.3 }] })).toMatchObject({ ok: false, error: expect.stringMatching(/Quantidade/) });
    // BZ-1 — nenhuma despesa nasceu aqui
    expect((await db.select().from(schema.despesas).where(eq(schema.despesas.tenantId, tenant.id))).length).toBe(0);
  });

  it("11 / 12 — documento e foto por DIA (não por membro), várias imagens de uma vez", async () => {
    const [dia] = await getDiasDaEquipe(tenant.id, obraA);
    expect(await addEquipeDiaDocs(fd({ equipeDiaId: dia.id, tipo: "Diário", file: new File([new Uint8Array(5)], "x.jpg", { type: "image/jpeg" }) }))).toEqual({ ok: false, error: expect.stringMatching(/tipo do documento/) });
    expect(await addEquipeDiaDocs(fd({ equipeDiaId: dia.id, tipo: "Foto da equipe em campo", file: [new File([new Uint8Array(5)], "a.jpg", { type: "image/jpeg" }), new File([new Uint8Array(5)], "b.jpg", { type: "image/jpeg" })] }))).toEqual({ ok: true, added: 2 });
    const docs = await getDocumentsByEquipeDias(tenant.id, [dia.id]);
    expect(docs).toHaveLength(2);
    expect(docs.every((d) => d.equipeDiaId === dia.id && d.funcionarioId == null && d.stakeholderId == null)).toBe(true);
    expect(docs.map((d) => d.versao).sort()).toEqual([1, 2]);
  });

  it("BZ-1 — a despesa lançada em /despesas passa a ser o rastro das diárias; stakeholders intactos (19)", async () => {
    const dias = await getDiasDaEquipe(tenant.id, obraA);
    const ids = dias.flatMap((d) => d.diarias.filter((x) => x.equipeProjetoId === alocAutonomoA).map((x) => x.id));
    const [v] = await db.insert(schema.versions).values({ projectId: obraA, tenantId: tenant.id, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
    const [desp] = await db.insert(schema.despesas).values({ versionId: v.id, tenantId: tenant.id, valor: "575", categoriaDre: "Custo Variável", competencia: "09/2026", vencimento: "09/30/2026", status: "A pagar", fornecedorId: autonomoId, numDoc: "PED-D1" }).returning();
    expect(await vincularDiariasADespesa(tenant.id, ids, desp.id)).toBe(2);
    expect(await vincularDiariasADespesa(tenant.id, ids, desp.id)).toBe(0); // já vinculadas
    const [d] = await db.select().from(schema.diarias).where(and(eq(schema.diarias.tenantId, tenant.id), eq(schema.diarias.id, ids[0])));
    expect(d.despesaId).toBe(desp.id);
    expect(await foto()).toBe(fotoAntes);
  });
});
