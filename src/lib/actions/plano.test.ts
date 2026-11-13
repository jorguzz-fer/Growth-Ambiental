import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";

/**
 * Planejamento de projetos — integração (DATABASE_URL). Cobre a seção 22:
 * biblioteca e modelos (1–7), criação do plano (8–15), independência entre
 * modelo e projeto (16–21), proposta da Cris (22–27), integrações (28–34).
 */
const HAS_DB = !!process.env.DATABASE_URL;
const ctxRef: { current: unknown } = { current: null };
vi.mock("@/lib/context", async (orig) => ({ ...(await orig<typeof import("@/lib/context")>()), getTenantContext: async () => ctxRef.current }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));
vi.mock("server-only", () => ({}));

describe.skipIf(!HAS_DB)("Planejamento de projetos — integração", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions } = await import("@/lib/permissions");
  const A = await import("./plano");
  const C = await import("./contratos");
  const Q = await import("@/lib/plano-queries");
  const { garantirBiblioteca } = await import("@/lib/plano-biblioteca");
  const { arvoreDoModelo, propostaDaCris } = await import("@/lib/plano-regras");

  type Ctx = { tenant: { id: string }; projects: { id: string; name: string }[]; userId: null; userEmail: string; role: string; perms: ReturnType<typeof defaultPermissions> };
  const t = { a: "", b: "" };
  let ctxA: Ctx;
  let ctxB: Ctx;
  const proj: Record<string, string> = {};
  const como = (c: Ctx) => (ctxRef.current = c);
  const ok = <T extends { ok: boolean }>(r: T) => {
    if (!r.ok) throw new Error((r as unknown as { error: string }).error);
    return r as T & { ok: true; id: string };
  };
  let chave = 0;
  const novaChave = () => `chave-${Date.now()}-${chave++}`;
  const bib = async (tenantId: string) => (await Q.carregarModelos(tenantId)).find((m) => m.biblioteca)!;
  const arvore = (m: Awaited<ReturnType<typeof bib>>) => arvoreDoModelo(m.fases, m.fases.flatMap((f) => f.atividades));
  const plano = (pid: string) => Q.carregarPlano(t.a, pid, "P");

  beforeAll(async () => {
    const [ta] = await db.insert(schema.tenants).values({ name: "plano-A" }).returning();
    const [tb] = await db.insert(schema.tenants).values({ name: "plano-B" }).returning();
    t.a = ta.id;
    t.b = tb.id;
    const ps = [];
    for (const n of ["Branco", "Todas", "UmaFase", "Parcial", "Combinado", "Indep", "Cris", "Integra"]) {
      const [p] = await db.insert(schema.projects).values({ tenantId: t.a, name: n }).returning();
      await db.insert(schema.versions).values({ projectId: p.id, tenantId: t.a, key: "atual", kind: "atual", label: "Atual", color: "#000" });
      proj[n] = p.id;
      ps.push(p);
    }
    const [pb] = await db.insert(schema.projects).values({ tenantId: t.b, name: "Da B" }).returning();
    proj.B = pb.id;
    ctxA = { tenant: ta, projects: ps, userId: null, userEmail: "gestor@exemplo.com", role: "owner", perms: defaultPermissions("owner") };
    ctxB = { tenant: tb, projects: [pb], userId: null, userEmail: "outra@exemplo.com", role: "owner", perms: defaultPermissions("owner") };
    await garantirBiblioteca(t.a);
    await garantirBiblioteca(t.b);
  });
  afterAll(async () => {
    for (const id of [t.a, t.b]) if (id) await db.delete(schema.tenants).where(eq(schema.tenants.id, id));
  });

  it("1–7 · biblioteca e modelos: criar, editar, atividades, modelo, duplicar, desativar, isolamento", async () => {
    como(ctxA);
    const b = await bib(t.a);
    expect(b.fases).toHaveLength(7);
    const f = ok(await A.salvarFaseDeModelo({ modeloId: b.id, nome: "Fase própria" }));
    ok(await A.salvarFaseDeModelo({ id: f.id, modeloId: b.id, nome: "Fase própria (renomeada)", descricao: "d" }));
    ok(await A.salvarAtividadeDeModelo({ faseId: f.id, nome: "Atividade padrão" }));
    ok(await A.salvarAtividadeDeModelo({ faseId: f.id, nome: "Relatório", tipo: "entrega" }));
    const m = ok(await A.salvarModelo({ nome: "Modelo próprio" }));
    const sug = ok(await A.adicionarModeloSugerido("monitoramento_arqueologico"));
    const dup = ok(await A.duplicarModelo(sug.id));
    const modelos = await Q.carregarModelos(t.a);
    const original = modelos.find((x) => x.id === sug.id)!;
    const copia = modelos.find((x) => x.id === dup.id)!;
    expect(copia.nome).toMatch(/cópia/);
    expect(copia.fases.map((x) => x.nome)).toEqual(original.fases.map((x) => x.nome));
    expect(copia.fases.flatMap((x) => x.atividades.map((a) => a.nome))).toEqual(original.fases.flatMap((x) => x.atividades.map((a) => a.nome)));
    expect(copia.fases[0].id).not.toBe(original.fases[0].id);
    ok(await A.salvarFaseDeModelo({ id: f.id, modeloId: b.id, nome: "Fase própria (renomeada)", ativo: false }));
    expect(arvore(await bib(t.a)).some((x) => x.nome.startsWith("Fase própria"))).toBe(false);
    expect(await A.salvarModelo({ id: b.id, nome: "Biblioteca", ativo: false })).toMatchObject({ ok: false });
    expect(await A.excluirModelo(b.id)).toMatchObject({ ok: false, error: expect.stringMatching(/não se exclui/) });
    expect(m.id).toBeTruthy();
    como(ctxB);
    expect(await A.salvarFaseDeModelo({ modeloId: b.id, nome: "invasão" })).toMatchObject({ ok: false, error: expect.stringMatching(/não encontrado/) });
    expect(await A.duplicarModelo(sug.id)).toMatchObject({ ok: false });
    expect((await Q.carregarModelos(t.b)).some((x) => x.id === sug.id)).toBe(false);
  });

  it("8–15 · criar plano: em branco, todas, uma fase, parcial, sem diagnóstico, modelos combinados, fase própria", async () => {
    como(ctxA);
    const b = await bib(t.a);
    // 8/11 — em branco: nada é criado, e não é erro
    ok(await A.criarPlano({ projectId: proj.Branco, origem: "branco", chave: novaChave(), fases: [] }));
    expect((await plano(proj.Branco)).fases).toEqual([]);
    // 9 — todas as sugestões (as que vêm marcadas)
    const todas = arvore(b);
    ok(await A.criarPlano({ projectId: proj.Todas, origem: "biblioteca", chave: novaChave(), fases: todas }));
    expect((await plano(proj.Todas)).fases).toHaveLength(7);
    // 10 — uma fase
    const uma = arvore(b).map((f, i) => ({ ...f, marcado: i === 0 }));
    ok(await A.criarPlano({ projectId: proj.UmaFase, origem: "biblioteca", chave: novaChave(), fases: uma }));
    expect((await plano(proj.UmaFase)).fases.map((f) => f.nome)).toEqual(["Planejamento e mobilização"]);
    // 12/13 — algumas atividades; diagnóstico inteiramente de fora; sem aviso
    const parcial = arvore(b).map((f) => ({
      ...f,
      marcado: f.nome !== "Diagnóstico e levantamentos preliminares",
      atividades: f.atividades.map((a, i) => ({ ...a, marcado: i === 0 })),
    }));
    const rp = ok(await A.criarPlano({ projectId: proj.Parcial, origem: "biblioteca", chave: novaChave(), fases: parcial }));
    expect(rp.aviso).toBeUndefined();
    const pp = await plano(proj.Parcial);
    expect(pp.fases.some((f) => f.nome.startsWith("Diagnóstico"))).toBe(false);
    expect(pp.atividades.length).toBe(6);
    // 14/15 — combina biblioteca + modelo especializado + fase própria
    const arq = (await Q.carregarModelos(t.a)).find((m) => m.nome === "Monitoramento arqueológico")!;
    const combinado = [arvore(b)[0], ...arvoreDoModelo(arq.fases, arq.fases.flatMap((f) => f.atividades)).slice(1, 2), { chave: "nova", nome: "Fase personalizada", marcado: true, atividades: [{ chave: "na", nome: "Atividade própria", marcado: true, subatividades: [] }], entregas: [] }];
    ok(await A.criarPlano({ projectId: proj.Combinado, origem: "biblioteca", chave: novaChave(), fases: combinado }));
    const pc = await plano(proj.Combinado);
    expect(pc.fases.map((f) => f.nome)).toEqual(["Planejamento e mobilização", "Monitoramento das frentes de obra", "Fase personalizada"]);
    expect(pc.entregas.map((e) => e.nome)).toEqual(["Relatório mensal de monitoramento"]);
  });

  it("16–21 · independência: editar no projeto não muda o modelo; editar/excluir modelo não muda projeto; mover; hierarquia", async () => {
    como(ctxA);
    const b = await bib(t.a);
    ok(await A.criarPlano({ projectId: proj.Indep, origem: "biblioteca", chave: novaChave(), fases: arvore(b).slice(0, 2) }));
    const p1 = await plano(proj.Indep);
    const f0 = p1.fases[0];
    ok(await A.salvarFase({ id: f0.id, projectId: proj.Indep, nome: "Mobilização do monitoramento" }));
    expect((await bib(t.a)).fases.find((f) => f.id === f0.origemModeloFaseId)!.nome).toBe("Planejamento e mobilização");
    ok(await A.salvarFaseDeModelo({ id: f0.origemModeloFaseId!, modeloId: b.id, nome: "Planejamento (texto novo do modelo)" }));
    expect((await plano(proj.Indep)).fases[0].nome).toBe("Mobilização do monitoramento");
    // 19 — exclui um modelo usado por um projeto: o plano fica intacto
    const sug = ok(await A.adicionarModeloSugerido("resgate_fauna"));
    const m = (await Q.carregarModelos(t.a)).find((x) => x.id === sug.id)!;
    ok(await A.criarPlano({ projectId: proj.Indep, origem: "biblioteca", chave: novaChave(), fases: arvoreDoModelo(m.fases, m.fases.flatMap((f) => f.atividades)) }));
    const antes = (await plano(proj.Indep)).fases.length;
    ok(await A.excluirModelo(sug.id));
    const depois = await plano(proj.Indep);
    expect(depois.fases.length).toBe(antes);
    expect(depois.fases.some((f) => f.nome === "Preparação")).toBe(true);
    // 20 — reordenar e mover entre fases (a subatividade acompanha)
    const [fa, fb] = depois.fases;
    const at = depois.atividades.find((x) => x.faseId === fa.id && !x.parentId)!;
    const sub = ok(await A.salvarAtividade({ faseId: fa.id, parentId: at.id, nome: "Sub" }));
    ok(await A.moverNoPlano({ tipo: "fase", id: fb.id, direcao: "cima" }));
    expect((await plano(proj.Indep)).fases[0].id).toBe(fb.id);
    ok(await A.moverNoPlano({ tipo: "atividade", id: at.id, paraFaseId: fb.id }));
    const [s] = await db.select().from(schema.projetoAtividades).where(eq(schema.projetoAtividades.id, sub.id));
    expect(s.faseId).toBe(fb.id);
    // 21 — hierarquias inválidas
    expect(await A.salvarAtividade({ id: at.id, faseId: fb.id, parentId: at.id, nome: at.nome })).toMatchObject({ ok: false, error: expect.stringMatching(/si mesma/) });
    expect(await A.salvarAtividade({ faseId: fb.id, parentId: sub.id, nome: "neto" })).toMatchObject({ ok: false, error: expect.stringMatching(/não tem subatividade/) });
    const outra = (await plano(proj.Indep)).atividades.find((x) => x.faseId === fb.id && !x.parentId && x.id !== at.id)!;
    expect(await A.salvarAtividade({ id: at.id, faseId: fb.id, parentId: outra.id, nome: at.nome })).toMatchObject({ ok: false, error: expect.stringMatching(/tem subatividades/) });
    const outroProjeto = (await plano(proj.Todas)).atividades[0];
    expect(await A.salvarAtividade({ faseId: fb.id, parentId: outroProjeto.id, nome: "x" })).toMatchObject({ ok: false, error: expect.stringMatching(/mesma fase/) });
    expect(await A.salvarAtividade({ faseId: fb.id, nome: "data ruim", inicioPrevisto: "31/12/2027" })).toMatchObject({ ok: false, error: expect.stringMatching(/data inválida/) });
  });

  it("22–27 · Cris: proposta conferida, só fases pertinentes, novas atividades, confirmação idempotente, documentos", async () => {
    como(ctxA);
    const b = await bib(t.a);
    // 22 — resposta simulada da Cris (campos do formulário)
    const proposta = propostaDaCris(
      {
        fase1_nome: b.fases[0].nome,
        fase1_origem: "biblioteca",
        fase1_atividades: "Análise documental | biblioteca | 2.1\nMobilização da equipe de arqueologia | documento | 2.2",
        fase2_nome: "Acompanhamento das frentes de obra",
        fase2_origem: "documento",
        fase2_trecho: "3. O monitoramento ocorrerá durante a escavação",
        fase2_atividades: "Vistoria diária | documento | 3.1\n- Registro fotográfico | sugestão",
        fase2_entregas: "Relatório mensal | 03/31/2027 | documento",
      },
      b.fases.flatMap((f) => [{ id: f.id, nome: f.nome }, ...f.atividades.map((a) => ({ id: a.id, nome: a.nome }))]),
    );
    // 23 — sem diagnóstico, sem encerramento: nada da biblioteca entra sem estar no documento
    expect(proposta.map((f) => f.nome)).toEqual([b.fases[0].nome, "Acompanhamento das frentes de obra"]);
    expect(proposta[1].atividades[0].subatividades[0].origem).toBe("sugestao");
    // 25 — nada gravado antes da confirmação
    expect((await plano(proj.Cris)).fases).toEqual([]);
    // o usuário desmarca uma atividade na conferência e confirma
    proposta[0].atividades[0].marcado = false;
    const k = novaChave();
    const [r1, r2] = await Promise.all([1, 2].map(() => A.criarPlano({ projectId: proj.Cris, origem: "cris", chave: k, fases: proposta })));
    expect(r1.ok && r2.ok).toBe(true);
    const pc = await plano(proj.Cris);
    // 26 — confirmação repetida não duplica
    expect(pc.fases).toHaveLength(2);
    expect(pc.atividades.map((a) => a.nome).sort()).toEqual(["Mobilização da equipe de arqueologia", "Registro fotográfico", "Vistoria diária"]);
    expect(pc.fases[0].origemModeloFaseId).toBe(b.fases[0].id);
    expect(pc.entregas[0]).toMatchObject({ nome: "Relatório mensal", dataPrevista: "03/31/2027", dataOriginal: "03/31/2027" });
    const [imp] = await db.select().from(schema.projetoPlanoImportacoes).where(and(eq(schema.projetoPlanoImportacoes.tenantId, t.a), eq(schema.projetoPlanoImportacoes.chave, k)));
    expect(imp).toMatchObject({ origem: "cris", resumo: { fases: 2, atividades: 2, subatividades: 1, entregas: 1 } });
    // 27 — documento do plano no repositório de documentos, ligado ao item
    const [doc] = await db.insert(schema.documents).values({ tenantId: t.a, projectId: proj.Cris, projetoFaseId: pc.fases[1].id, storageKey: "k", filename: "plano-de-trabalho.pdf" }).returning();
    expect((await plano(proj.Cris)).documentos.map((d) => d.id)).toContain(doc.id);
    // origem de modelo de OUTRA empresa é ignorada
    const daB = await bib(t.b);
    ok(await A.criarPlano({ projectId: proj.Cris, origem: "cris", chave: novaChave(), fases: [{ chave: "x", nome: "Fase X", marcado: true, origemModeloId: daB.fases[0].id, atividades: [], entregas: [] }] }));
    expect((await plano(proj.Cris)).fases.find((f) => f.nome === "Fase X")!.origemModeloFaseId).toBeNull();
  });

  it("28–34 · integrações: contrato e item, equipe, custo por fase sem mexer na DRE, linha de base e histórico, permissões e isolamento", async () => {
    como(ctxA);
    const fase = ok(await A.salvarFase({ projectId: proj.Integra, nome: "Execução", inicioPrevisto: "03/01/2027", terminoPrevisto: "04/15/2027" }));
    // 32 — linha de base e reprogramação com justificativa no histórico
    ok(await A.salvarFase({ id: fase.id, projectId: proj.Integra, nome: "Execução", inicioPrevisto: "03/01/2027", terminoPrevisto: "04/30/2027", justificativa: "Chuva" }));
    const p = await plano(proj.Integra);
    expect(p.fases[0]).toMatchObject({ terminoOriginal: "04/15/2027", terminoPrevisto: "04/30/2027", desvioDias: 15 });
    expect(p.historico.find((h) => h.action === "plano.fase.reprogramar")?.meta).toMatchObject({ justificativa: "Chuva", mudou: { terminoPrevisto: { de: "04/15/2027", para: "04/30/2027" } } });
    // 29 — equipe: profissional e função da empresa; de outra empresa, não
    const [func] = await db.insert(schema.funcionarios).values({ tenantId: t.a, nome: "Profissional Exemplo" }).returning();
    const [funcao] = await db.insert(schema.funcoesEquipe).values({ tenantId: t.a, nome: "Arqueólogo" }).returning();
    const [funcB] = await db.insert(schema.funcionarios).values({ tenantId: t.b, nome: "De outra" }).returning();
    const at = ok(await A.salvarAtividade({ faseId: fase.id, nome: "Acompanhamento", funcionarioId: func.id, funcaoId: funcao.id, horasPrevistas: 40, horasRealizadas: 12 }));
    expect(await A.salvarAtividade({ faseId: fase.id, nome: "x", funcionarioId: funcB.id })).toMatchObject({ ok: false, error: expect.stringMatching(/Profissional/) });
    expect((await plano(proj.Integra)).fases[0]).toMatchObject({ horasPrevistas: 40, horasRealizadas: 12 });
    // 28 — entrega ligada a contrato e item do projeto; contrato de fora, não
    const c = ok(await C.salvarContrato({ titulo: "Contrato do projeto", valorOriginal: 1000, projetos: [{ projectId: proj.Integra }] }));
    const item = ok(await C.salvarItem({ contratoId: c.id, codigo: "01", descricao: "Relatório", quantidade: 1, valorUnitario: 1000, criterioMedicao: "entrega" }));
    const outro = ok(await C.salvarContrato({ titulo: "Outro", valorOriginal: 1, projetos: [{ projectId: proj.Todas }] }));
    const e = ok(await A.salvarEntrega({ projectId: proj.Integra, faseId: fase.id, nome: "Relatório final", contratoId: c.id, contratoItemId: item.id, valor: 1000, dataPrevista: "04/30/2027" }));
    expect(await A.salvarEntrega({ projectId: proj.Integra, nome: "x", contratoId: outro.id })).toMatchObject({ ok: false, error: expect.stringMatching(/vinculado a este projeto/) });
    ok(await A.salvarAtividade({ id: at.id, faseId: fase.id, nome: "Acompanhamento", contratoItemId: item.id }));
    // entrega aceita não cria medição, fatura nem conta a receber
    ok(await A.salvarEntrega({ id: e.id, projectId: proj.Integra, faseId: fase.id, nome: "Relatório final", contratoId: c.id, contratoItemId: item.id, status: "aceita", dataEfetiva: "04/29/2027" }));
    expect(await db.select().from(schema.contratoMedicoes).where(eq(schema.contratoMedicoes.contratoId, c.id))).toEqual([]);
    expect(await db.select().from(schema.contasReceber).where(eq(schema.contasReceber.contratoId, c.id))).toEqual([]);
    // 30/31 — custo por fase é só apropriação: valor, conta, categoria e o realizado do projeto não mudam
    const [v] = await db.select().from(schema.versions).where(and(eq(schema.versions.projectId, proj.Integra), eq(schema.versions.kind, "atual")));
    const [d1] = await db.insert(schema.despesas).values({ tenantId: t.a, versionId: v.id, valor: "300.00", competencia: "03/2027", categoriaDre: "Custo Variável", contaCef: "2.1" }).returning();
    const [d2] = await db.insert(schema.despesas).values({ tenantId: t.a, versionId: v.id, valor: "200.00", competencia: "03/2027", categoriaDre: "Custo Variável", contaCef: "2.2" }).returning();
    const realizadoAntes = (await plano(proj.Integra)).planejamento.realizado;
    ok(await A.apropriarDespesaNoPlano({ despesaId: d1.id, faseId: null, atividadeId: at.id }));
    const pi = await plano(proj.Integra);
    expect(pi.planejamento.realizado).toEqual(realizadoAntes);
    expect(pi.fases[0].custo).toBe(300);
    expect(pi.custos).toMatchObject({ total: 500, transversal: 200 });
    const [d1b] = await db.select().from(schema.despesas).where(eq(schema.despesas.id, d1.id));
    expect(d1b).toMatchObject({ valor: "300.00", contaCef: "2.1", categoriaDre: "Custo Variável", projetoFaseId: fase.id });
    expect(d2.id).toBeTruthy();
    // 33 — permissões e isolamento
    const contador = { ...ctxA, role: "contador", perms: defaultPermissions("contador" as never) };
    como(contador as Ctx);
    expect(await A.salvarFase({ projectId: proj.Integra, nome: "x" })).toMatchObject({ ok: false, error: expect.stringMatching(/permissão/) });
    const membro = { ...ctxA, role: "membro", perms: defaultPermissions("membro" as never) };
    como(membro as Ctx);
    expect(await A.salvarModelo({ nome: "x" })).toMatchObject({ ok: false, error: expect.stringMatching(/permissão/) });
    como(ctxB);
    const nao = /não encontrad/;
    expect(await A.salvarFase({ id: fase.id, projectId: proj.Integra, nome: "invadido" })).toMatchObject({ ok: false, error: expect.stringMatching(nao) });
    expect(await A.salvarFase({ id: fase.id, projectId: proj.B, nome: "invadido" })).toMatchObject({ ok: false, error: expect.stringMatching(nao) });
    expect(await A.salvarAtividade({ faseId: fase.id, nome: "invadido" })).toMatchObject({ ok: false, error: expect.stringMatching(nao) });
    expect(await A.excluirDoPlano({ tipo: "fase", id: fase.id })).toMatchObject({ ok: false, error: expect.stringMatching(nao) });
    expect(await A.apropriarDespesaNoPlano({ despesaId: d1.id, faseId: null })).toMatchObject({ ok: false, error: expect.stringMatching(nao) });
    expect(await A.criarPlano({ projectId: proj.Integra, origem: "branco", chave: novaChave(), fases: [] })).toMatchObject({ ok: false, error: expect.stringMatching(nao) });
    expect(await A.moverNoPlano({ tipo: "atividade", id: at.id, paraFaseId: fase.id })).toMatchObject({ ok: false, error: expect.stringMatching(nao) });
    const [intacta] = await db.select().from(schema.projetoFases).where(eq(schema.projetoFases.id, fase.id));
    expect(intacta.nome).toBe("Execução");
    // 34 — projeto preexistente sem plano continua válido e lê vazio
    como(ctxA);
    expect((await plano(proj.Branco)).progressoProjeto.percentual).toBeNull();
  });
});
