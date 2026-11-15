import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq, and } from "drizzle-orm";

/** Prompt Z, PR Z-1 — Funcionários. Integração (precisa de DATABASE_URL). */
const HAS_DB = !!process.env.DATABASE_URL;
const ctxRef: { current: unknown } = { current: null };
vi.mock("@/lib/context", async (orig) => ({
  ...(await orig<typeof import("@/lib/context")>()),
  getTenantContext: async () => ctxRef.current,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {}, notFound: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));
vi.mock("server-only", () => ({}));

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const CPF = "529.982.247-25";

describe.skipIf(!HAS_DB)("Funcionários (Prompt Z, Parte 2)", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const { addFuncionario, updateFuncionario, desligarFuncionario, deleteFuncionario, addDependente } = await import("./funcionarios");
  const { getFuncionarios, getFuncionario } = await import("@/lib/queries");
  let tenant: typeof schema.tenants.$inferSelect;
  let projectId = "";
  let id = "";
  const ctxDe = (perms: ReturnType<typeof defaultPermissions>) => ({ tenant, projects: [{ id: projectId }], userId: null, userEmail: "z1@teste", role: "owner", perms });
  const semDados = () => {
    const p = defaultPermissions("owner");
    p.funcionariosdados = { ver: false, criar: false, editar: false, excluir: false };
    return p;
  };
  // Em ordem de gravação: sem ORDER BY, o Postgres pode devolver as linhas em qualquer ordem (e `.at(-1)` pegaria outra).
  const logs = (action: string) => db.select().from(schema.auditLog).where(and(eq(schema.auditLog.tenantId, tenant.id), eq(schema.auditLog.action, action))).orderBy(schema.auditLog.createdAt);

  beforeAll(async () => {
    [tenant] = await db.insert(schema.tenants).values({ name: "pessoas-Z1" }).returning();
    const [p] = await db.insert(schema.projects).values({ tenantId: tenant.id, name: "OBRA Z1" }).returning();
    projectId = p.id;
    await db.insert(schema.stakeholders).values({ tenantId: tenant.id, nome: "João Autônomo", tipo: "PF", doc: CPF, papeis: ["Mão de Obra RPA"] });
    ctxRef.current = ctxDe(defaultPermissions("owner"));
  });
  afterAll(async () => {
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenant.id));
  });

  it("3 / 2.5 — CLT nasce em Funcionários (não em Fornecedores); nome obrigatório; CPF validado; duplicado contra fornecedor AVISA", async () => {
    expect(await addFuncionario(fd({ nome: " " }))).toMatchObject({ ok: false, error: expect.stringMatching(/nome/) });
    expect(await addFuncionario(fd({ nome: "Ana", cpf: "111.111.111-11" }))).toMatchObject({ ok: false, error: expect.stringMatching(/CPF inválido/) });
    const r = await addFuncionario(fd({ nome: "Ana Souza", cpf: CPF, cargo: "Pedreira", admissao: "2026-09-01", projectId, salario: "3.200,00", jornada: "44h", endereco: "Rua A", bancoConta: "1-2" }));
    expect(r).toMatchObject({ ok: true, aviso: expect.stringMatching(/João Autônomo \(fornecedor\)/) });
    id = (r as { ok: true; id: string }).id;
    expect((await db.select().from(schema.stakeholders).where(eq(schema.stakeholders.tenantId, tenant.id))).length).toBe(1); // 4 — fornecedores intactos
    const [f] = await db.select().from(schema.funcionarios).where(eq(schema.funcionarios.id, id));
    expect(f.cpf).toBe("52998224725");
    expect(Number(f.salario)).toBe(3200);
  });

  it("13 / 14 / 7.2 — a lista traz o CPF mascarado; sem a permissão de dados o servidor devolve endereço, salário, jornada e banco NULOS", async () => {
    const lista = await getFuncionarios(tenant.id);
    expect(lista[0]).toMatchObject({ nome: "Ana Souza", cpfMascarado: "•••.982.247-••", cargo: "Pedreira", projectName: "OBRA Z1" });
    expect(JSON.stringify(lista)).not.toMatch(/52998224725|3200|Rua A/);
    const sem = await getFuncionario(tenant.id, id, false);
    expect(sem).toMatchObject({ nome: "Ana Souza", cpf: "52998224725", cargo: "Pedreira", endereco: null, salario: null, jornada: null, bancoConta: null, dependentes: [] });
    const com = await getFuncionario(tenant.id, id, true);
    expect(com).toMatchObject({ endereco: "Rua A", jornada: "44h", bancoConta: "1-2" });
    expect(Number(com!.salario)).toBe(3200);
  });

  it("14 / 7.2 — quem não tem a permissão não grava campo sensível (vazio não apaga) nem dependente", async () => {
    ctxRef.current = ctxDe(semDados());
    expect(await updateFuncionario(id, fd({ nome: "Ana Souza", cpf: CPF, cargo: "Mestre de obra", salario: "", endereco: "" }))).toMatchObject({ ok: true });
    const [f] = await db.select().from(schema.funcionarios).where(eq(schema.funcionarios.id, id));
    expect(f.cargo).toBe("Mestre de obra");
    expect(Number(f.salario)).toBe(3200); // não apagou
    expect(f.endereco).toBe("Rua A");
    expect(await addDependente(id, fd({ nome: "Filho" }))).toMatchObject({ ok: false, error: expect.stringMatching(/permissão/) });
    ctxRef.current = ctxDe(defaultPermissions("owner"));
    expect(await addDependente(id, fd({ nome: "Filho", parentesco: "Filho(a)", dependenteIr: "1" }))).toMatchObject({ ok: true });
  });

  it("15 / 7.3 — o audit_log não contém CPF nem salário em claro", async () => {
    await updateFuncionario(id, fd({ nome: "Ana Souza", cpf: "453.178.287-91", cargo: "Mestre de obra", salario: "3.500,00", endereco: "Rua B" }));
    const todos = [...(await logs("funcionario.create")), ...(await logs("funcionario.update"))];
    const texto = JSON.stringify(todos.map((l) => l.meta));
    expect(texto).not.toMatch(/52998224725|45317828791|3200|3500|Rua A|Rua B/);
    const upd = await logs("funcionario.update");
    expect(upd.at(-1)!.meta).toMatchObject({ changes: { cpf: { protegido: true }, salario: { protegido: true }, endereco: { protegido: true } } });
  });

  it("8 / 2.4 — desligado sai das listas de alocação e permanece; excluir exige nome digitado e recusa com alocação", async () => {
    expect(await desligarFuncionario(id, "2026-08-01", null)).toMatchObject({ ok: false, error: expect.stringMatching(/anterior à admissão/) });
    expect(await desligarFuncionario(id, "2026-09-30", "fim do contrato")).toMatchObject({ ok: true });
    const lista = await getFuncionarios(tenant.id);
    expect(lista[0].desligamento).toBe("2026-09-30"); // permanece, com a data
    // alocação em equipe (tabela da 0061) impede exclusão
    const [al] = await db.insert(schema.equipesProjeto).values({ tenantId: tenant.id, projectId, funcionarioId: id }).returning();
    expect(await deleteFuncionario(id, "Ana Souza")).toMatchObject({ ok: false, error: expect.stringMatching(/alocação/) });
    await db.delete(schema.equipesProjeto).where(eq(schema.equipesProjeto.id, al.id));
    expect(await deleteFuncionario(id, "Ana")).toMatchObject({ ok: false, error: expect.stringMatching(/digite o nome/) });
    expect(await deleteFuncionario(id, "ana souza")).toMatchObject({ ok: true });
    expect((await db.select().from(schema.funcionarios).where(eq(schema.funcionarios.id, id))).length).toBe(0);
    const [l] = await logs("funcionario.delete");
    expect(JSON.stringify(l.meta)).not.toMatch(/4531782879/);
  });

  it("6 — a alocação aponta stakeholder OU funcionario, nunca os dois (CHECK no banco)", async () => {
    const [s] = await db.select().from(schema.stakeholders).where(eq(schema.stakeholders.tenantId, tenant.id));
    const r = await addFuncionario(fd({ nome: "Bia" }));
    const fid = (r as { ok: true; id: string }).id;
    await expect(db.insert(schema.equipesProjeto).values({ tenantId: tenant.id, projectId, stakeholderId: s.id, funcionarioId: fid })).rejects.toThrow(/equipe_projeto_origem_unica/);
    await expect(db.insert(schema.equipesProjeto).values({ tenantId: tenant.id, projectId })).rejects.toThrow(/equipe_projeto_origem_unica/);
  });
});
