import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";

/**
 * Prompt W, PR W-1 — actions de stakeholder: `{ ok, error, avisos }`,
 * validação de documento, nome obrigatório, trim, endereço condicional,
 * papel fora da lista preservado. Integração: só com DATABASE_URL.
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

describe.skipIf(!HAS_DB)("Stakeholders — actions (Prompt W, PR W-1)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { addStakeholder, updateStakeholder, setStakeholderAtivo, deleteStakeholder } = await import("./stakeholders");
  const { PAPEIS_STAKEHOLDER } = await import("@/lib/calc/constants");
  let tenantId = "";
  const fd = (campos: Record<string, string | string[]>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) {
      if (Array.isArray(v)) for (const x of v) f.append(k, x);
      else f.set(k, v);
    }
    return f;
  };
  const linha = (id: string) => db.select().from(schema.stakeholders).where(eq(schema.stakeholders.id, id)).then((r) => r[0]);
  const ultimoLog = (entityId: string) =>
    db.select().from(schema.auditLog).where(eq(schema.auditLog.entityId, entityId)).then((r) => r.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]);

  beforeAll(async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "stk-W1" }).returning();
    tenantId = t.id;
    ctxRef.current = { tenant: t, projects: [], userId: null, userEmail: "w@teste", role: "owner", perms: defaultPermissions("owner") };
  });
  afterAll(async () => {
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("13 — 'Pagador por Terceiro' é o 20º papel da lista", () => {
    expect(PAPEIS_STAKEHOLDER).toHaveLength(20);
    expect(PAPEIS_STAKEHOLDER).toContain("Pagador por Terceiro");
  });

  it("12 — salvar sem nome é recusado, nas duas actions", async () => {
    const r = await addStakeholder(fd({ nome: "   ", tipo: "PJ" }));
    expect(r).toEqual({ ok: false, error: "Informe o nome do cadastro." });
    const ok = await addStakeholder(fd({ nome: "Com Nome", tipo: "PJ" }));
    expect(ok.ok).toBe(true);
    const u = await updateStakeholder(fd({ id: (ok as { id: string }).id, nome: "", tipo: "PJ" }));
    expect(u.ok).toBe(false);
    expect((await linha((ok as { id: string }).id)).nome).toBe("Com Nome");
  });

  it("6/7 — CNPJ e CPF inválidos são recusados na criação e na edição", async () => {
    expect((await addStakeholder(fd({ nome: "X", tipo: "PJ", doc: "00.000.001/0001-35" }))).ok).toBe(false);
    expect((await addStakeholder(fd({ nome: "X", tipo: "PF", doc: "000.000.001-00" }))).ok).toBe(false);
    const ok = await addStakeholder(fd({ nome: "Válido", tipo: "PJ", doc: "00.000.001/0001-36" }));
    expect(ok.ok).toBe(true);
    const id = (ok as { id: string }).id;
    const u = await updateStakeholder(fd({ id, nome: "Válido", tipo: "PJ", doc: "00.000.001/0001-35" }));
    expect(u.ok).toBe(false);
    expect((u as { error: string }).error).toMatch(/CNPJ inválido/);
    expect((await linha(id)).doc).toBe("00.000.001/0001-36");
  });

  it("8 — documento com espaços é gravado sem eles, nas duas actions", async () => {
    const ok = await addStakeholder(fd({ nome: "  Espaços  ", tipo: "PF", doc: "  000.000.001-91  " }));
    expect(ok.ok).toBe(true);
    const id = (ok as { id: string }).id;
    const l = await linha(id);
    expect(l.nome).toBe("Espaços");
    expect(l.doc).toBe("000.000.001-91");
    await updateStakeholder(fd({ id, nome: "Espaços", tipo: "PF", doc: " 000.000.001-91 " }));
    expect((await linha(id)).doc).toBe("000.000.001-91");
  });

  it("9 — PJ com documento de 11 dígitos AVISA, sem bloquear", async () => {
    const r = await addStakeholder(fd({ nome: "PJ com CPF", tipo: "PJ", doc: "123.456.789-09" }));
    expect(r.ok).toBe(true);
    expect((r as { avisos: string[] }).avisos.join(" ")).toMatch(/CPF.*PJ/);
    expect((await linha((r as { id: string }).id)).doc).toBe("123.456.789-09");
  });

  it("10 — documento já existente em outro cadastro AVISA com o nome, sem bloquear", async () => {
    const a = await addStakeholder(fd({ nome: "Original Ltda", tipo: "PJ", doc: "11.222.333/0001-81" }));
    expect(a.ok).toBe(true);
    const b = await addStakeholder(fd({ nome: "Cópia Ltda", tipo: "PJ", doc: "11222333000181" }));
    expect(b.ok).toBe(true);
    expect((b as { avisos: string[] }).avisos.join(" ")).toMatch(/Original Ltda/);
    // editar o próprio cadastro sem mudar o documento não avisa de si mesmo
    const u = await updateStakeholder(fd({ id: (a as { id: string }).id, nome: "Original Ltda", tipo: "PJ", doc: "11.222.333/0001-81" }));
    expect(u.ok).toBe(true);
    expect((u as { avisos: string[] }).avisos.join(" ")).toMatch(/Cópia Ltda/);
  });

  it("11 — cadastro antigo com documento fora do padrão continua editável (o gravado não é recusado)", async () => {
    const [antigo] = await db.insert(schema.stakeholders).values({ tenantId, nome: "Antigo", tipo: "PJ", doc: "12.345", papeis: ["Construtora"] }).returning();
    const u = await updateStakeholder(fd({ id: antigo.id, nome: "Antigo editado", tipo: "PJ", doc: "12.345", email: "a@b.c" }));
    expect(u.ok).toBe(true);
    const l = await linha(antigo.id);
    expect(l.nome).toBe("Antigo editado");
    expect(l.doc).toBe("12.345");
    // mas digitar outro documento inválido é recusado
    expect((await updateStakeholder(fd({ id: antigo.id, nome: "Antigo", tipo: "PJ", doc: "99.999" }))).ok).toBe(false);
  });

  it("13a — PF com papel de serviço ou mão de obra exige endereço ao gravar", async () => {
    const r = await addStakeholder(fd({ nome: "Pedreiro", tipo: "PF", doc: "000.000.001-91", papeis: ["Mão de Obra RPA"] }));
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toMatch(/endereço residencial/);
    const ok = await addStakeholder(fd({ nome: "Pedreiro", tipo: "PF", doc: "000.000.001-91", papeis: ["Mão de Obra RPA"], endereco: "Rua A", numero: "1" }));
    expect(ok.ok).toBe(true);
    // PF com outro papel, ou PJ, não exige
    expect((await addStakeholder(fd({ nome: "Corretor", tipo: "PF", papeis: ["Corretor Autônomo"] }))).ok).toBe(true);
    expect((await addStakeholder(fd({ nome: "Empresa", tipo: "PJ", papeis: ["Prestador de Serviço"] }))).ok).toBe(true);
  });

  it("13a-1 — o cadastro não tem campo de valor de diária", () => {
    expect(Object.keys(schema.stakeholders)).not.toContain("valorDiaria");
    expect(Object.keys(schema.stakeholders)).not.toContain("diaria");
  });

  it("13b — cadastro antigo sem endereço continua editável; a edição que CRIA a condição exige", async () => {
    const [antigo] = await db.insert(schema.stakeholders).values({ tenantId, nome: "Mestre antigo", tipo: "PF", papeis: ["Prestador de Serviço"] }).returning();
    const u = await updateStakeholder(fd({ id: antigo.id, nome: "Mestre antigo", tipo: "PF", tel: "11 9", papeis: ["Prestador de Serviço"] }));
    expect(u.ok).toBe(true);
    expect((await linha(antigo.id)).tel).toBe("11 9");
    const [pj] = await db.insert(schema.stakeholders).values({ tenantId, nome: "Vira PF", tipo: "PJ", papeis: ["Prestador de Serviço"] }).returning();
    const v = await updateStakeholder(fd({ id: pj.id, nome: "Vira PF", tipo: "PF", papeis: ["Prestador de Serviço"] }));
    expect(v.ok).toBe(false);
    expect((await linha(pj.id)).tipo).toBe("PJ");
  });

  it("BW-2 — papel fora da lista reenviado pela tela é preservado; endereço não enviado não é apagado", async () => {
    const [imp] = await db.insert(schema.stakeholders).values({ tenantId, nome: "Importado", tipo: "PJ", papeis: ["Papel Importado", "Construtora"], endereco: "Rua Fixa" }).returning();
    const u = await updateStakeholder(fd({ id: imp.id, nome: "Importado", tipo: "PJ", papeis: ["Papel Importado", "Construtora"] }));
    expect(u.ok).toBe(true);
    const l = await linha(imp.id);
    expect(l.papeis).toEqual(["Papel Importado", "Construtora"]);
    expect(l.endereco).toBe("Rua Fixa");
  });

  it("17 — sem permissão toda action devolve { ok: false, error }, nada lança", async () => {
    const salvo = ctxRef.current;
    ctxRef.current = { ...(salvo as object), role: "viewer", perms: defaultPermissions("viewer" as "owner") };
    expect(await addStakeholder(fd({ nome: "X" }))).toEqual({ ok: false, error: "Sem permissão para cadastrar fornecedores." });
    expect((await updateStakeholder(fd({ id: "x", nome: "X" }))).ok).toBe(false);
    expect((await setStakeholderAtivo("x", false)).ok).toBe(false);
    ctxRef.current = salvo;
  });

  it("auditoria: documento mascarado no create e no update", async () => {
    const r = await addStakeholder(fd({ nome: "Log", tipo: "PF", doc: "000.000.001-91" }));
    const id = (r as { id: string }).id;
    const c = await ultimoLog(id);
    expect(JSON.stringify(c.meta)).not.toContain("000.000.001-91");
    expect(JSON.stringify(c.meta)).toContain("•••.000.001-••");
    await updateStakeholder(fd({ id, nome: "Log", tipo: "PF", doc: "123.456.789-09" }));
    const u = await ultimoLog(id);
    expect(u.action).toBe("stakeholder.update");
    expect(JSON.stringify(u.meta)).not.toContain("123.456.789-09");
  });

  describe("exclusão (seção 2)", () => {
    const novo = async (nome: string) => {
      const r = await addStakeholder(fd({ nome, tipo: "PJ", doc: "00.000.001/0001-36", papeis: ["Construtora"] }));
      return (r as { id: string }).id;
    };
    const excluir = (id: string, confirmacao: string) => deleteStakeholder(fd({ id, confirmacao }));
    const versao = async () => {
      const [p] = await db.insert(schema.projects).values({ tenantId, name: "OBRA W2" }).returning();
      const [v] = await db.insert(schema.versions).values({ tenantId, projectId: p.id, label: "Atual", key: `w2-${Date.now()}-${Math.random()}`, kind: "atual", color: "#000" } as typeof schema.versions.$inferInsert).returning();
      return v.id;
    };

    it("1 — obrigação de terceiro impede, e a mensagem diz qual vínculo", async () => {
      const id = await novo("Pagador");
      const versionId = await versao();
      const [d] = await db.insert(schema.despesas).values({ tenantId, versionId, valor: "10" } as typeof schema.despesas.$inferInsert).returning();
      await db.insert(schema.despesaTerceiros).values({ tenantId, despesaId: d.id, pagadorTerceiroId: id } as typeof schema.despesaTerceiros.$inferInsert);
      const r = await excluir(id, "Pagador");
      expect(r.ok).toBe(false);
      expect((r as { error: string }).error).toMatch(/1 obrigação\(ões\) como pagador por terceiro/);
      expect(await linha(id)).toBeTruthy();
    });

    it("2 — recebimento de terceiro, acerto, compensação e documento impedem, cada um nomeado", async () => {
      const casos: [string, (id: string) => Promise<unknown>, RegExp][] = [
        ["Recebedor", (id) => db.insert(schema.recebimentosTerceiros).values({ tenantId, recebedorTerceiroId: id } as typeof schema.recebimentosTerceiros.$inferInsert), /1 recebimento\(s\) por terceiro/],
        ["Favorecido", (id) => db.insert(schema.acertos).values({ tenantId, favorecidoId: id } as typeof schema.acertos.$inferInsert), /1 acerto\(s\) como favorecido/],
        ["Compensado", (id) => db.insert(schema.compensacoes).values({ tenantId, terceiroId: id } as typeof schema.compensacoes.$inferInsert), /1 compensação\(ões\)/],
        ["Com Arquivo", (id) => db.insert(schema.documents).values({ tenantId, stakeholderId: id, storageKey: "k", filename: "f.pdf" }), /1 documento\(s\) anexado\(s\)/],
      ];
      for (const [nome, seed, esperado] of casos) {
        const id = await novo(nome);
        await seed(id);
        const r = await excluir(id, nome);
        expect(r.ok).toBe(false);
        expect((r as { error: string }).error).toMatch(esperado);
        expect(await linha(id)).toBeTruthy();
      }
      // despesa como fornecedor (a única que já era checada) continua impedindo
      const id = await novo("Fornecedor");
      const versionId = await versao();
      await db.insert(schema.despesas).values({ tenantId, versionId, valor: "10", fornecedorId: id } as typeof schema.despesas.$inferInsert);
      expect((await excluir(id, "Fornecedor") as { error: string }).error).toMatch(/1 despesa\(s\) como fornecedor/);
    });

    it("3 — sem nenhum vínculo continua excluível", async () => {
      const id = await novo("Livre");
      expect(await excluir(id, "Livre")).toEqual({ ok: true, id, avisos: [] });
      expect(await linha(id)).toBeUndefined();
    });

    it("4 — exige o nome digitado (sem diferenciar caixa e acento), e nada apaga sem ele", async () => {
      const id = await novo("João Ltda");
      expect((await excluir(id, "")).ok).toBe(false);
      expect((await excluir(id, "Joao")).ok).toBe(false);
      expect(await linha(id)).toBeTruthy();
      expect((await excluir(id, "joao ltda")).ok).toBe(true);
    });

    it("5 — a auditoria da exclusão tem nome, documento mascarado, papéis e as contagens", async () => {
      const id = await novo("Auditado");
      await excluir(id, "Auditado");
      const l = await ultimoLog(id);
      expect(l.action).toBe("stakeholder.delete");
      const meta = l.meta as { nome: string; doc: string; papeis: string[]; vinculos: Record<string, number> };
      expect(meta.nome).toBe("Auditado");
      expect(meta.doc).toBe("••.000.001/••••-••");
      expect(meta.papeis).toEqual(["Construtora"]);
      expect(meta.vinculos).toEqual({ despesas: 0, obrigacoesTerceiro: 0, recebimentosTerceiro: 0, acertos: 0, compensacoes: 0, documentos: 0 });
      expect(JSON.stringify(meta)).not.toContain("00.000.001/0001-36");
    });

    it("sem permissão de excluir devolve { ok: false }", async () => {
      const id = await novo("Protegido");
      const salvo = ctxRef.current;
      ctxRef.current = { ...(salvo as object), role: "membro", perms: defaultPermissions("membro" as "owner") };
      expect((await excluir(id, "Protegido")).ok).toBe(false);
      ctxRef.current = salvo;
      expect(await linha(id)).toBeTruthy();
    });
  });

  it("setStakeholderAtivo devolve ok e audita deactivate/reactivate", async () => {
    const r = await addStakeholder(fd({ nome: "Liga", tipo: "PJ" }));
    const id = (r as { id: string }).id;
    expect((await setStakeholderAtivo(id, false)).ok).toBe(true);
    expect((await linha(id)).ativo).toBe(false);
    expect((await ultimoLog(id)).action).toBe("stakeholder.deactivate");
    expect((await setStakeholderAtivo(id, true)).ok).toBe(true);
    expect((await ultimoLog(id)).action).toBe("stakeholder.reactivate");
  });
});
