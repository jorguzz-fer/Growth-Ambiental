import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { and, eq, isNull } from "drizzle-orm";

/**
 * GA-11 — a Conciliação de Caixa como tela única, com o seletor de conta e as
 * abas Contas correntes · Cartões de crédito · Ajustes, e a Cris no cartão.
 * Os testes de fonte rodam sempre; os de banco, só com DATABASE_URL.
 */
const ler = (f: string) => readFileSync(f, "utf8");
const TELA = "src/app/(app)/caixa/conciliacao-de-caixa.tsx";
const PAGINA = "src/app/(app)/caixa/page.tsx";

describe("GA-11 · uma tela só (testes 1, 2 e 10)", () => {
  it("1 · /caixa sempre renderiza a Conciliação de Caixa: sem chave, sem seletor de projeto, de versão nem comparação", () => {
    const page = ler(PAGINA);
    const tela = ler(TELA);
    expect(page).toContain("<ConciliacaoDeCaixa");
    expect(page).not.toContain("chaveLigada");
    for (const fonte of [page, tela])
      for (const proibido of ["ProjectPicker", "lerSelecaoDeProjeto", "LembrarProjeto", "RecuperarProjeto", "VersionMultiSelect", "VersionCompareTable", "resolveCompareVersions", "Controle de Caixa"]) expect(fonte, proibido).not.toContain(proibido);
    expect(tela).toContain('title="Conciliação de Caixa"');
  });

  it("2 · ?proj= e ?vs= abrem a mesma tela e são ignorados; ?tab=conciliacao (link antigo) abre Contas correntes", async () => {
    const { abaDoCaixa, urlDoCaixa, urlDaAba } = await import("@/lib/caixa-url");
    expect(ler(PAGINA)).toMatch(/sp=\{\{ tab: sp\.tab, conta: sp\.conta \}\}/);
    expect(abaDoCaixa("conciliacao")).toBe("contas");
    expect(abaDoCaixa(undefined)).toBe("contas");
    expect(abaDoCaixa("cartoes")).toBe("cartoes");
    expect(urlDoCaixa({ tab: "contas", conta: "c1" })).toBe("/caixa?conta=c1");
    expect(urlDoCaixa({ tab: "cartoes", conta: "k1", de: "11/01/2026" })).toBe("/caixa?tab=cartoes&conta=k1&de=11%2F01%2F2026");
    // §3.1 — trocar de aba volta para "Todas" e mantém o período.
    expect(urlDaAba({ tab: "contas", conta: "c1", de: "11/01/2026" }, "ajustes")).toBe("/caixa?tab=ajustes&de=11%2F01%2F2026");
    for (const u of [urlDoCaixa({ conta: "x" }), urlDaAba({ conta: "x" }, "cartoes")]) expect(u).not.toMatch(/proj=|vs=/);
  });

  it("10 · \"Controle de Caixa\" só em comentário de código; menu e permissões com o nome novo", async () => {
    const achados: string[] = [];
    const varrer = (dir: string) => {
      for (const n of readdirSync(dir)) {
        const p = path.join(dir, n);
        if (statSync(p).isDirectory()) varrer(p);
        else if (/\.(ts|tsx)$/.test(n) && !/\.test\./.test(n)) {
          ler(p)
            .split("\n")
            .forEach((linha, i) => {
              const t = linha.trim();
              if (linha.includes("Controle de Caixa") && !(t.startsWith("//") || t.startsWith("*") || t.startsWith("/*"))) achados.push(`${p}:${i + 1}`);
            });
        }
      }
    };
    varrer("src");
    expect(achados).toEqual([]);
    const { NAV_MENU } = await import("@/lib/nav-menu");
    const caixa = NAV_MENU.find((m) => m.id === "caixa")!;
    expect(caixa.items.map((i) => i.label)).toEqual(["Conciliação de Caixa", "Contas Correntes", "Cartões de Crédito"]);
    const { SCREENS } = await import("@/lib/permissions");
    expect(SCREENS.find((t) => t.id === "caixa")?.label).toBe("Conciliação de Caixa");
    expect(ler("src/components/app/conciliacao-review.tsx")).not.toContain("(Prompt K)");
  });

  it("4 · /cartoes não tem mais a conferência da fatura: tem o link para a aba Cartões, com o cartão escolhido", () => {
    const cartoes = ler("src/app/(app)/cartoes/page.tsx");
    expect(cartoes).not.toContain("<ExtratoCartao");
    expect(cartoes).not.toContain("conferirExtrato");
    expect(cartoes).toContain("data-link-conciliacao-cartao");
    expect(cartoes).toContain('urlDoCaixa({ tab: "cartoes", conta: c.id })');
    // link antigo da conferência redireciona para a aba
    expect(cartoes).toContain('if (sp.extrato) redirect(urlDoCaixa({ tab: "cartoes", conta: sp.extrato }));');
  });
});

describe("GA-11 · 8 · o que não pode sumir (checklist §3.5)", () => {
  const tela = ler(TELA);
  const fonte = (f: string) => ler(`src/components/app/${f}`);
  const itens: [string, () => string, string][] = [
    ["cartões do dia", () => tela, "data-cartoes-do-dia"],
    ["os três caminhos", () => fonte("faixa-conciliacao.tsx"), 'data-caminho="cris"'],
    ["Subir fatura na aba Cartões", () => fonte("faixa-conciliacao.tsx"), '"Subir fatura" : "Subir extrato"'],
    ["Open Finance", () => fonte("faixa-conciliacao.tsx"), 'data-caminho="openfinance"'],
    ["quadro dos dois saldos, por conta", () => tela, "<SaldosCaixa"],
    ["quadro por cartão", () => fonte("aba-cartoes.tsx"), "data-cartao-saldo"],
    ["seletor com uma conta e com todas", () => tela, "<SeletorDeConta"],
    ["pendentes com sugestões e desfazer", () => fonte("caixa-conciliacao.tsx"), "<ConciliacaoReview"],
    ["agrupamento (um movimento, várias despesas)", () => fonte("conciliacao-review.tsx"), "um pagamento pode quitar várias despesas"],
    ["falta cadastrar", () => fonte("conciliacao-review.tsx"), "criarContaAPartirDoExtrato"],
    ["desfazer conciliação", () => fonte("conciliacao-review.tsx"), "desfazerConciliacao"],
    ["pagamento de fatura conciliável na conta", () => fonte("conciliacao-review.tsx"), "conciliarPagamentoDeFatura"],
    ["subir fatura", () => fonte("aba-cartoes.tsx"), "<SubirFatura"],
    ["conferência do cartão", () => fonte("aba-cartoes.tsx"), "<ConferenciaDoCartao"],
    ["conciliação linha a linha do cartão", () => fonte("aba-cartoes.tsx"), "<CartaoConciliacaoLista"],
    ["proposta de compra com link para Despesas", () => fonte("extrato-cartao.tsx"), "data-proposta-compra"],
    ["estorno só por ação do usuário", () => fonte("extrato-cartao.tsx"), "data-registrar-estorno"],
    ["ajustes", () => tela, "<AjustesCaixa"],
    ["cadeia de saldo, projeção e fechar o dia", () => tela, "<CadeiaDias"],
    ["Dias fechados", () => ler(PAGINA), "data-dias-fechados"],
    ["Assistente IA (contas)", () => tela, "<AssistenteCaixa"],
    ["Assistente IA (cartões)", () => tela, "<AssistenteCartoes"],
    ["Cris da tela", () => tela, "<CrisDaTela"],
    ["estado vazio sem conta corrente", () => tela, "Cadastre uma conta corrente em"],
    ["estado vazio sem cartão", () => fonte("aba-cartoes.tsx"), "Cadastre um cartão em"],
  ];
  it.each(itens)("%s", (_nome, src, marcador) => {
    expect(src()).toContain(marcador);
  });

  it("sem filtro de período (decisão do dono de 15/11/2026): a barra só tem o seletor de conta", () => {
    expect(tela).not.toContain("DateRangeFilter");
    expect(tela).not.toContain("dateInRange");
    expect(ler(PAGINA)).not.toMatch(/de: sp\.de|ate: sp\.ate/);
  });

  it("sugestões da Cris por aba (§4.1)", () => {
    for (const s of ["Quais pendências conciliar primeiro?", "O que está na fatura e não foi lançado?", "Quanto vence na próxima fatura?", "Como subo a fatura em PDF?", "Como lanço um estorno?", "Por que há ajustes neste mês?"]) expect(tela).toContain(s);
  });

  it("o botão Conciliar com a Cris leva a aba e o escolhido; sem IA, a mensagem clara (§4.1)", async () => {
    const { MENSAGEM_CRIS_SEM_IA } = await import("@/lib/cris-sem-ia");
    expect(MENSAGEM_CRIS_SEM_IA).toBe("A Cris precisa da IA configurada (Configurações → Diagnóstico de IA).");
    expect(ler("src/components/app/faixa-conciliacao.tsx")).toContain("{MENSAGEM_CRIS_SEM_IA}");
    expect(ler("src/lib/actions/cris.ts")).toContain("MENSAGEM_CRIS_SEM_IA");
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

describe.skipIf(!HAS_DB)("GA-11 · com banco", async () => {
  const { db, schema } = await import("@/lib/db");
  const { defaultPermissions, effectivePermissions } = await import("@/lib/permissions");
  const { getCash, getCashDaEmpresa, getConciliacaoData } = await import("@/lib/queries");
  const { cadeiaDeSaldo } = await import("@/lib/calc/cadeia-caixa");
  const { cadeiaDaEmpresa } = await import("@/lib/cadeia-da-empresa");
  const { addAjuste } = await import("./caixa");
  const { gravarTransacoesDaConta } = await import("@/lib/openfinance/sincronizar");
  const { addDespesa } = await import("./despesas");
  const { importarExtratoCartao } = await import("./cartao-extrato");
  const { conciliarLinhaDoCartao, desfazerLinhaDoCartao, confirmarConciliacoesCartao } = await import("./cartao-conciliacao");
  const { saldosDosCartoes } = await import("@/lib/caixa-cartoes");
  const { dadosDaAbaCartoes } = await import("@/lib/caixa-aba-cartoes");
  const { ferramentasDoCartao } = await import("@/lib/conciliacao-cris-ferramentas");
  const { CHAVES_EMPRESA_NOVA } = await import("@/lib/chaves");

  let tenant: typeof schema.tenants.$inferSelect;
  const obras: { id: string; atual: string }[] = [];
  const contas: string[] = [];
  let cartaoId = "";
  let outroCartao = "";
  const fd = (campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    return f;
  };
  const ctxDe = (perms: unknown) => ({ tenant, projects: [], userId: null, userEmail: "ga11@teste", role: "owner", perms });

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 3, 1, 12, 0, 0));
    // Empresa "criada antes do GA-1": nenhuma linha em tenant_flag (a chave do Caixa nunca existiu nela).
    [tenant] = await db.insert(schema.tenants).values({ name: "GA-11 antiga" }).returning();
    for (const n of ["A", "B"]) {
      const [p] = await db.insert(schema.projects).values({ tenantId: tenant.id, name: `PROJETO ${n}` }).returning();
      const [v] = await db.insert(schema.versions).values({ projectId: p.id, tenantId: tenant.id, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
      await db.insert(schema.versions).values({ projectId: p.id, tenantId: tenant.id, key: "budget", kind: "budget", label: "Orç", color: "#000" });
      obras.push({ id: p.id, atual: v.id });
    }
    for (const [banco, saldo] of [["Banco X", "1000"], ["Banco Y", "500"]] as const) contas.push((await db.insert(schema.bankAccounts).values({ tenantId: tenant.id, banco, cc: banco.slice(-1), saldo, tipo: "Construtora" }).returning())[0].id);
    [{ id: cartaoId }] = await db.insert(schema.cartoesCredito).values({ tenantId: tenant.id, apelido: "Visa", ultimos4: "1111", diaFechamento: 10, diaVencimento: 20, limite: "5000" }).returning();
    [{ id: outroCartao }] = await db.insert(schema.cartoesCredito).values({ tenantId: tenant.id, apelido: "Master", ultimos4: "2222", diaFechamento: 10, diaVencimento: 20 }).returning();
    // Movimentos gravados pela tela ANTIGA: na Atual de cada projeto, em contas diferentes; um conciliado.
    await db.insert(schema.cashEntries).values([
      { tenantId: tenant.id, versionId: obras[0].atual, bankAccountId: contas[0], data: "03/28/2026", valor: "-100", importHash: "a", rec: true },
      { tenantId: tenant.id, versionId: obras[0].atual, bankAccountId: contas[1], data: "03/29/2026", valor: "250", importHash: "b" },
      { tenantId: tenant.id, versionId: obras[1].atual, bankAccountId: contas[0], data: "03/30/2026", valor: "-40", importHash: "c" },
      { tenantId: tenant.id, versionId: obras[1].atual, bankAccountId: contas[1], data: "03/31/2026", valor: "60", importHash: "d", rec: true },
    ]);
    ctxRef.current = ctxDe(defaultPermissions("owner"));
  });
  afterAll(async () => {
    vi.useRealTimers();
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenant.id));
  });

  it("6/7 · empresa sem a chave: os saldos de cada conta (em conta e conciliado) são os mesmos da tela antiga somando os projetos", async () => {
    expect(await db.select().from(schema.tenantFlags).where(eq(schema.tenantFlags.tenantId, tenant.id))).toEqual([]);
    const hoje = "2026-04-01";
    // tela antiga: o caixa de cada projeto (getCash da Atual), somados
    const antigos = [...(await getCash(obras[0].atual)), ...(await getCash(obras[1].atual))];
    const empresa = await cadeiaDaEmpresa(tenant.id, { hojeISO: hoje });
    // a tela nova lê exatamente os mesmos movimentos (nada migrado, nada perdido)
    expect(empresa.cash.map((c) => c.id).sort()).toEqual(antigos.map((c) => c.id).sort());
    const comoMovimento = (c: (typeof antigos)[number]) => ({ id: c.id, data: c.data, valor: Number(c.valor), rec: c.rec, cat: c.cat, importado: !!c.importHash, bankAccountId: c.bankAccountId });
    const bancos = await db.select().from(schema.bankAccounts).where(eq(schema.bankAccounts.tenantId, tenant.id));
    for (const conta of bancos) {
      const nova = cadeiaDeSaldo({ movimentos: empresa.movimentos.filter((m) => m.bankAccountId === conta.id), saldoEmContaAtual: Number(conta.saldo), fechamentos: [], hojeISO: hoje });
      const antiga = cadeiaDeSaldo({ movimentos: antigos.map(comoMovimento).filter((m) => m.bankAccountId === conta.id), saldoEmContaAtual: Number(conta.saldo), fechamentos: [], hojeISO: hoje });
      const dia = (c: typeof nova) => c.dias.find((d) => d.dia === hoje)!;
      expect(dia(nova).conciliado.final, conta.banco).toBe(dia(antiga).conciliado.final);
      expect(dia(nova).emConta?.final ?? null, conta.banco).toBe(dia(antiga).emConta?.final ?? null);
    }
    // e cada movimento continua na Atual do projeto dele (nada foi migrado)
    expect((await getCash(obras[0].atual)).length).toBe(2);
  });

  it("3 · seletor: \"Todas\" junta as contas (com a conta de cada movimento); uma conta filtra", async () => {
    const todas = await getConciliacaoData(tenant.id, {});
    expect(todas.pendentes.map((p) => p.valor)).toEqual([-40]);
    expect(todas.pendentesEntrada.map((p) => p.valor)).toEqual([250]);
    const cash = await getCashDaEmpresa(tenant.id);
    const contaDe = new Map(cash.map((c) => [c.id, c.bankAccountId]));
    expect(new Set([...todas.pendentes, ...todas.pendentesEntrada].map((p) => contaDe.get(p.cashEntryId)))).toEqual(new Set(contas));
    const soY = await getConciliacaoData(tenant.id, { conta: contas[1] });
    expect(soY.pendentes).toEqual([]);
    expect(soY.pendentesEntrada.map((p) => p.valor)).toEqual([250]);
  });

  it("6 · ajuste com e sem projeto e Open Finance (mock): nada grava em versão de planejamento", async () => {
    expect(await addAjuste(fd({ motivo: "tarifa", valor: "7", data: "04/01/2026", sinal: "menos", bankAccountId: contas[0] }))).toMatchObject({ ok: true });
    expect(await addAjuste(fd({ motivo: "acerto", valor: "3", data: "04/01/2026", bankAccountId: contas[0], projectId: obras[1].id }))).toMatchObject({ ok: true });
    const r = await gravarTransacoesDaConta({ id: contas[1], tenantId: tenant.id }, [{ id: "pluggy-1", date: "2026-04-01T10:00:00.000Z", description: "PIX recebido", amount: 90, type: "CREDIT" } as never]);
    expect(r.inseridos).toBe(1);
    const novos = await db.select({ v: schema.cashEntries.versionId, cat: schema.cashEntries.cat, valor: schema.cashEntries.valor }).from(schema.cashEntries).where(and(eq(schema.cashEntries.tenantId, tenant.id), eq(schema.cashEntries.data, "04/01/2026")));
    const budgets = await db.select({ id: schema.versions.id }).from(schema.versions).where(and(eq(schema.versions.tenantId, tenant.id), eq(schema.versions.kind, "budget")));
    expect(novos.some((n) => budgets.some((b) => b.id === n.v))).toBe(false);
    expect(novos.find((n) => n.cat === "openfinance")?.v).toBeNull();
    expect(novos.filter((n) => n.cat === "ajuste").map((n) => n.v).sort()).toEqual([null, obras[1].atual].sort());
  });

  const compra = async (valor: string, data: string, obs: string, cartao = cartaoId) => {
    const r = await addDespesa(fd({ projectId: obras[0].id, categoriaDre: "Custo Variável", formaPagamento: "Cartão de crédito", status: "A pagar", cartaoId: cartao, competencia: "03/2026", valor, cartaoDataCompra: data, cartaoParcelas: "1", obs }));
    expect(r.ok).toBe(true);
    return (r as { id: string }).id;
  };

  it("4 · aba Cartões: subir fatura, quadro por cartão, conciliar, desfazer, e \"Todos os cartões\"", async () => {
    await compra("100", "03/02/2026", "compra 100");
    await compra("200", "03/03/2026", "compra 200");
    expect((await importarExtratoCartao({ cartaoId, itens: [{ data: "03/02/2026", descricao: "LOJA 100", valor: 100 }, { data: "03/03/2026", descricao: "LOJA 200", valor: 200 }, { data: "03/05/2026", descricao: "PADARIA", valor: 30 }] })).ok).toBe(true);
    // registrar de novo não duplica
    const de2 = await importarExtratoCartao({ cartaoId, itens: [{ data: "03/02/2026", descricao: "LOJA 100", valor: 100 }] });
    expect(de2).toMatchObject({ ok: true, inseridos: 0, ignorados: 1 });
    const saldos = await saldosDosCartoes(tenant.id, "2026-04-01");
    const um = await dadosDaAbaCartoes(tenant.id, "2026-04-01", saldos, cartaoId);
    const linha = um.quadro.find((q) => q.id === cartaoId)!;
    expect(linha).toMatchObject({ limite: 5000, extrato: 330, lancado: 300, diferenca: 30, pendentes: 3 });
    expect(linha.fatura?.fechamento).toBe("03/10/2026");
    expect(um.cartoes.map((c) => c.id)).toEqual([cartaoId]);
    // conferência: a padaria está na fatura e não foi lançada → proposta (link para Despesas)
    expect(um.cartoes[0].conferencia.semLancamento.map((i) => i.descricao)).toEqual(["PADARIA"]);
    // conciliar as duas compras pela linha e desfazer uma
    const linhas = um.cartoes[0].faturas.flatMap((f) => f.linhas);
    for (const l of linhas.filter((x) => x.sugestoes.length)) expect(await conciliarLinhaDoCartao({ linhaId: l.id, despesaId: l.sugestoes[0].despesaId })).toEqual({ ok: true });
    const desfazer = linhas.find((x) => x.descricao === "LOJA 200")!;
    expect(await desfazerLinhaDoCartao(desfazer.id, "teste")).toEqual({ ok: true });
    // "Todos os cartões": os dois aparecem no quadro; a lista é de todos
    const todos = await dadosDaAbaCartoes(tenant.id, "2026-04-01", await saldosDosCartoes(tenant.id, "2026-04-01"), null);
    expect(todos.quadro.map((q) => q.nome).sort()).toEqual(["Master •••• 2222", "Visa •••• 1111"]);
    expect(todos.cartoes.map((c) => c.id).sort()).toEqual([cartaoId, outroCartao].sort());
    expect(todos.quadro.find((q) => q.id === outroCartao)).toMatchObject({ extrato: null, situacao: expect.any(String) });
  });

  it("9 · Cris no cartão: pendentes respeitam o cartão; o lote só propõe (nada grava); o botão grava; compra alheia é recusada", async () => {
    const ctx = ctxDe(defaultPermissions("owner")) as never;
    const f = ferramentasDoCartao(ctx, { podeConciliar: true, podeRegistrarFatura: true, anexo: null, cartaoDaTela: cartaoId });
    const pend = JSON.parse(await f.pendentes!(""));
    expect(pend.linhas.map((l: { descricao: string }) => l.descricao).sort()).toEqual(["LOJA 200", "PADARIA"]);
    expect(pend.linhas.find((l: { descricao: string }) => l.descricao === "PADARIA").sem_lancamento).toBe(true);
    const loja = pend.linhas.find((l: { descricao: string }) => l.descricao === "LOJA 200");
    const padaria = pend.linhas.find((l: { descricao: string }) => l.descricao === "PADARIA");
    const cand = JSON.parse(await f.candidatos!(loja.linha));
    expect(cand.candidatos).toHaveLength(1);
    const alheia = await compra("200", "03/03/2026", "do outro cartão", outroCartao);
    const antes = await db.select().from(schema.extratoCartao).where(and(eq(schema.extratoCartao.tenantId, tenant.id), isNull(schema.extratoCartao.despesaId)));
    const r = await f.propor!([{ linha: loja.linha, despesa: cand.candidatos[0].despesa }, { linha: padaria.linha }, { linha: loja.linha, despesa: alheia }]);
    expect(r.proposta?.itens).toHaveLength(1);
    expect(r.proposta?.lancar).toHaveLength(1);
    expect(r.proposta?.lancar[0].href).toMatch(/^\/despesas\?.*pf_forma=Cart%C3%A3o\+de\+cr%C3%A9dito/);
    expect(r.proposta?.recusados).toHaveLength(1);
    // propor não grava nada
    const depois = await db.select().from(schema.extratoCartao).where(and(eq(schema.extratoCartao.tenantId, tenant.id), isNull(schema.extratoCartao.despesaId)));
    expect(depois.length).toBe(antes.length);
    const despesasAntes = await db.select({ id: schema.despesas.id }).from(schema.despesas).where(eq(schema.despesas.tenantId, tenant.id));
    // o botão grava (e a Cris nunca lança despesa)
    expect(await confirmarConciliacoesCartao(r.proposta!.itens.map((i) => ({ linha: i.linha, despesaId: i.despesaId })))).toMatchObject({ ok: true, gravadas: 1 });
    const despesasDepois = await db.select({ id: schema.despesas.id }).from(schema.despesas).where(eq(schema.despesas.tenantId, tenant.id));
    expect(despesasDepois.length).toBe(despesasAntes.length);
  });

  it("9 · permissões: sem Caixa/editar, nenhuma ferramenta de conciliação (só o aviso); o botão também recusa", async () => {
    const soVer = effectivePermissions("membro", { caixa: { ver: true, criar: false, editar: false, excluir: false } } as never);
    const f = ferramentasDoCartao(ctxDe(soVer) as never, { podeConciliar: false, podeRegistrarFatura: false, anexo: { tipo: "text/csv", base64: "", nome: "x.csv" }, cartaoDaTela: null });
    expect(f.pendentes).toBeUndefined();
    expect(f.propor).toBeUndefined();
    expect(f.lerFatura).toBeUndefined();
    expect(f.semPermissao).toMatch(/Caixa\/editar/);
    ctxRef.current = ctxDe(soVer);
    expect(await confirmarConciliacoesCartao([{ linha: "x", despesaId: "y" }])).toMatchObject({ ok: false });
    ctxRef.current = ctxDe(defaultPermissions("owner"));
  });

  it("11 · a chave do Caixa saiu das listas: empresa nova nasce com 10 chaves", () => {
    expect(CHAVES_EMPRESA_NOVA).toHaveLength(10);
    expect((CHAVES_EMPRESA_NOVA as readonly string[]).includes("caixa_conciliacao_por_conta")).toBe(false);
  });
});
