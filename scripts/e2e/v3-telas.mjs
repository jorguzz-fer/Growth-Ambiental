// Fase 3 — conferência das telas mudadas pelos prompts da revisão V5.
// Uso: com o app em http://localhost:3400 e o banco do seed:
//   node scripts/e2e/v3-telas.mjs
import pw from "playwright";
// Credenciais do ambiente de teste (nada fixo no código):
//   E2E_EMAIL, E2E_PASSWORD (owner/admin) · E2E_EMAIL_ADMIN (2º admin, opcional) ·
//   E2E_EMAIL_CONTADOR (usuário criado pelo teste de restrição).
const E2E_EMAIL = process.env.E2E_EMAIL ?? "";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";
if (!E2E_EMAIL || !E2E_PASSWORD) throw new Error("Defina E2E_EMAIL e E2E_PASSWORD.");

const { chromium } = pw;

const BASE = process.env.BASE ?? "http://localhost:3400";
const OUT = process.env.OUT ?? ".";
let ok = 0, falha = 0;
const check = (n, c, d = "") => { console.log(`[${c ? "  OK  " : " FALHA"}] ${n}${d ? " — " + d : ""}`); c ? ok++ : falha++; };

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });

async function entrar(email) {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', E2E_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 30000 });
  return page;
}

const texto = async (page, url) => {
  await page.goto(`${BASE}${url}`, { timeout: 90000 });
  await page.waitForLoadState("networkidle", { timeout: 90000 });
  return (await page.textContent("body")) ?? "";
};

// ── Owner do cliente (não é operador da plataforma) ──────────────────────
{
  const page = await entrar(E2E_EMAIL);
  const menu = await texto(page, "/dashboard");
  check("REN: menu mostra Fornecedores e Parceiros", menu.includes("Fornecedores e Parceiros"));
  check("REN: menu mostra Medição de Projeto", menu.includes("Medição de Projeto"));
  check("PLAT: owner não vê Chaves de mudança no menu", !menu.includes("Chaves de mudança"));
  check("PLAT: owner não vê Backup de dados no menu", !menu.includes("Backup de dados"));
  const chaves = await texto(page, "/chaves");
  check("PLAT: owner não abre /chaves", !chaves.includes("Ligar") && /acesso|permiss/i.test(chaves));
  const desp = await texto(page, "/despesas?proj=all");
  check("REN: Despesas sem a aba A Pagar", !/\bA Pagar\b/.test(desp.replace("Contas a Pagar", "")));
  await page.goto(`${BASE}/despesas?tab=apagar`);
  await page.waitForLoadState("networkidle");
  check("REN: ?tab=apagar leva a Contas a Pagar", page.url().includes("/contaspagar"), page.url());
  await page.context().close();
}

// ── Operador da plataforma ───────────────────────────────────────────────
{
  const page = await entrar((process.env.E2E_EMAIL_ADMIN ?? E2E_EMAIL));
  const menu = await texto(page, "/dashboard");
  check("PLAT: operador vê Chaves de mudança", menu.includes("Chaves de mudança"));
  check("PLAT: operador vê Backup de dados", menu.includes("Backup de dados"));

  const dre = await texto(page, "/dre?proj=all");
  check("AC2: DRE tem a visão mensal abaixo", dre.includes("Visão mensal"));
  const caixas = await page.locator('input[type="checkbox"]').count();
  check("AC2: cenários em caixas de seleção", caixas >= 3, `${caixas} caixas`);
  check("AC2: seletor Consolidado/Mensal saiu", !(await page.locator('option[value="mensal"]').count()));
  await page.screenshot({ path: `${OUT}/v3-dre.png`, fullPage: true });

  // E2 — a Cris sabe a tela e responde (sem chave de IA: pelo cálculo local).
  await page.click("[data-chat-botao]");
  const ctxCris = (await page.textContent("[data-chat-contexto]")) ?? "";
  check("E2: Cris abre com o nome e a tela", /DRE/.test(ctxCris) && (await page.locator("[data-chat]").getAttribute("aria-label"))?.startsWith("Cris"), ctxCris.slice(0, 80));
  check("E2: Cris traz as sugestões da tela", ((await page.textContent("[data-chat]")) ?? "").includes("Qual linha mais pesa sobre a receita?"));
  await page.fill('input[aria-label="Mensagem para a Cris"]', "Qual o saldo das contas hoje?");
  await page.click('[data-chat] button[type="submit"]');
  await page.waitForSelector("[data-chat-resposta], [data-chat] [role=alert]", { timeout: 60000 });
  const resp = (await page.textContent("[data-chat]")) ?? "";
  check("E2: Cris responde o saldo", /Saldo disponível/.test(resp), resp.slice(-160));
  await page.screenshot({ path: `${OUT}/v3-cris.png` });
  await page.click("[data-chat-botao]");

  const fluxo = await texto(page, "/fluxocaixa?proj=all");
  check("AD2: Fluxo de Caixa tem a visão semanal", fluxo.includes("Visão semanal"));
  const linhasSem = await page.locator("[data-fluxo-semanal] tbody tr").count();
  check("AD2: janela de 13 semanas", linhasSem === 13, `${linhasSem} linhas`);
  check("AD2: marca a semana atual", fluxo.includes("esta semana"));
  await page.click("text=Próximas →");
  await page.waitForURL(/[?&]sem=/, { timeout: 60000 }).catch(() => {});
  check("AD2: navega para as próximas semanas", /[?&]sem=\d{4}-\d{2}-\d{2}/.test(page.url()), page.url());
  await page.screenshot({ path: `${OUT}/v3-fluxo.png`, fullPage: true });

  await texto(page, "/caixa");
  const primeiro = await page.locator("select option").nth(1).getAttribute("value");
  const caixa = await texto(page, `/caixa?proj=${primeiro}`);
  check("L2: Caixa lista os dias fechados", (await page.locator("[data-dias-fechados]").count()) === 1);
  const previstos = await page.locator("[data-previsto-dia]").count();
  check("L2: dias de hoje em diante mostram o previsto", previstos >= 1, `${previstos} dia(s)`);
  check("L2: cartão traz o saldo projetado", caixa.includes("Saldo projetado"));
  await page.screenshot({ path: `${OUT}/v3-caixa.png`, fullPage: true });

  // AB2 — Consolidado e Balanço do Dia saem (redirecionamento com aviso).
  check("AB2: menu sem Consolidado e sem Balanço do Dia", !/\bConsolidado\b/.test(menu) && !menu.includes("Balanço do Dia"));
  const proj = await texto(page, "/consolidado");
  check("AB2: /consolidado leva à Projeção com o aviso", page.url().includes("/projecao") && proj.includes("A tela Consolidado saiu"), page.url());
  await page.context().close();
}
{
  const page = await entrar((process.env.E2E_EMAIL_ADMIN ?? E2E_EMAIL));
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
  const bal = await texto(page, "/balancodia");
  check("AB2: /balancodia leva ao Caixa com o aviso", page.url().includes("/caixa") && bal.includes("A tela Balanço do Dia saiu"), page.url());
  check("AB2: dias fechados aparecem no Caixa", (await page.locator("[data-dias-fechados]").count()) === 1);

  // DP — categoria da DRE por conta; a chave nasce desligada, com prévia.
  const plano = await texto(page, "/planocontas");
  const comCategoria = await page.locator("[data-categoria-conta]").count();
  check("DP: cada conta do plano mostra a categoria da DRE", comCategoria > 10 && plano.includes("(padrão)"), `${comCategoria} contas`);
  await page.click("[data-chat-botao]");
  await page.waitForFunction(() => /Novas contas do Plano de Contas/.test(document.querySelector("[data-chat-contexto]")?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
  check("G2: a Cris pode propor contas no Plano de Contas", /Novas contas do Plano de Contas/.test((await page.textContent("[data-chat-contexto]")) ?? ""));
  await page.click("[data-chat-botao]");
  check("DP: gasto de obra nasce Custo Variável", ((await page.textContent('[data-categoria-conta="1.1"]')) ?? "").includes("Custo Variável"));
  const chaves = await texto(page, "/chaves");
  check("DP: a chave aparece desligada com a prévia", chaves.includes("Despesa herda a categoria da DRE do Plano de Contas") && (await page.locator("#previa-categoria [data-previa-categoria-total]").count()) === 1);
  await page.screenshot({ path: `${OUT}/v3-chaves-categoria.png`, fullPage: false });
  check("Q2: a chave do INCC da empresa aparece com a prévia", chaves.includes("INCC da empresa: uma série para todas as obras") && (await page.locator("#previa-incc [data-previa-incc-total]").count()) === 1);
  const desp = await texto(page, "/despesas");
  check("DP: com a chave desligada, a categoria da despesa segue livre", (await page.locator("[data-categoria-travada]").count()) === 0, desp.length ? "" : "vazio");

  // AC3 — DRE Analítica: categoria → grupo → conta, com os totais da DRE.
  // Precisa de despesa lançada na Atual (o seed não traz; ver o relatório do AC3).
  const dreTxt = await texto(page, "/dre?proj=all");
  const resultadoDre = (await page.locator("tr", { hasText: "= Resultado Final" }).first().locator("td").nth(1).textContent())?.trim();
  const analitica = await texto(page, "/dre/analitica?proj=all");
  check("AC3: menu traz a DRE Analítica", dreTxt.includes("DRE Analítica"));
  check("AC3: abre com as categorias e os grupos", (await page.locator('[data-tabela-analitica] tr[data-tipo="grupo"]').count()) > 0, analitica.slice(0, 0));
  const resultadoAna = (await page.locator('[data-tabela-analitica] tr[data-tipo="final"] td').nth(1).textContent())?.trim();
  check("AC3: Resultado Final igual ao da DRE", !!resultadoDre && resultadoDre === resultadoAna, `${resultadoDre} × ${resultadoAna}`);
  await page.click("[data-abrir-tudo]");
  check("AC3: abre até a conta", (await page.locator('[data-tabela-analitica] tr[data-tipo="conta"]').count()) > 0);
  check("AC3: só o item DRE Analítica fica marcado no menu", (await page.locator('a[aria-current="page"]').count()) === 1 && ((await page.locator('a[aria-current="page"]').textContent()) ?? "").includes("DRE Analítica"));
  await page.screenshot({ path: `${OUT}/v3-dre-analitica.png`, fullPage: true });

  // AD3 — Fluxo de Caixa Analítico: bloco → grupo → conta, pelo vencimento.
  const fluxoAna = await texto(page, "/fluxocaixa/analitico?proj=all");
  check("AD3: menu traz o Fluxo de Caixa Analítico", fluxoAna.includes("Fluxo de Caixa Analítico"));
  check("AD3: saídas abertas em obra e complementares", fluxoAna.includes("Obra (grupos CEF)") && fluxoAna.includes("Complementares"));
  check("AD3: traz o saldo do período", (await page.locator('[data-tabela-analitica] tr[data-tipo="final"]').count()) === 1);
  check("AD3: só o item analítico fica marcado", ((await page.locator('a[aria-current="page"]').textContent()) ?? "").includes("Fluxo de Caixa Analítico") && (await page.locator('a[aria-current="page"]').count()) === 1);
  await page.screenshot({ path: `${OUT}/v3-fluxo-analitico.png`, fullPage: true });

  // PDF — os relatórios exportam pelo navegador, com a faixa da empresa só no PDF.
  check("PDF: botão Exportar PDF no Fluxo Analítico", (await page.locator("[data-exportar-pdf]").count()) === 1);
  check("PDF: a faixa da empresa fica escondida na tela", !(await page.locator("[data-cabecalho-impressao]").isVisible()));
  await page.emulateMedia({ media: "print" });
  check("PDF: na impressão, a faixa aparece e os seletores somem", (await page.locator("[data-cabecalho-impressao]").isVisible()) && !(await page.locator("[data-exportar-pdf]").isVisible()));
  await page.emulateMedia({ media: "screen" });

  // AA2 — Dashboard: fluxo em linhas, DRE em barras empilhadas, e o PDF.
  await texto(page, "/dashboard?proj=all");
  await page.waitForSelector("[data-graficos-dashboard] canvas", { timeout: 30000 }).catch(() => {});
  check("AA2: gráfico do fluxo de caixa", (await page.locator('[data-grafico="fluxo"] canvas').count()) === 1);
  check("AA2: gráfico da DRE em barras", (await page.locator('[data-grafico="dre"] canvas').count()) === 1);
  check("AA2: Dashboard exporta PDF", (await page.locator("[data-exportar-pdf]").count()) === 1);
  await page.click("[data-chat-botao]");
  check("IAR: a Cris sabe que está no Dashboard e sugere simulação", /Dashboard/.test((await page.textContent("[data-chat-contexto]")) ?? "") && ((await page.textContent("[data-chat]")) ?? "").includes("E se a receita dos próximos meses cair 10%?"));
  await page.click("[data-chat-botao]");
  await page.screenshot({ path: `${OUT}/v3-dashboard.png`, fullPage: true });

  // RC — Relatórios Customizados: receita na URL, campos, tabela e chat.
  const rc0 = await texto(page, "/relatorios");
  check("RC: menu traz Relatórios Customizados", rc0.includes("Relatórios Customizados"));
  check("RC: sem pedido, a tela orienta", (await page.locator("[data-relatorio-vazio]").count()) === 1);
  await page.selectOption('[data-relatorio-campos] select[name="colunas"]', "mes");
  await page.check('[data-relatorio-campos] input[name="av"]');
  await page.click('[data-relatorio-campos] button[type="submit"]');
  await page.waitForURL(/fonte=dre/, { timeout: 60000 });
  await page.waitForLoadState("networkidle");
  const colunasRc = await page.locator("[data-relatorio-tabela] thead th").count();
  check("RC: pelos campos, a DRE mês a mês com vertical", colunasRc === 1 + 13 * 2, `${colunasRc} cabeçalhos`);
  const linkRc = page.url();
  await texto(page, linkRc.replace("http://localhost:3400", ""));
  check("RC: o link refaz o relatório", (await page.locator("[data-relatorio-tabela]").count()) === 1);
  check("RC: baixa CSV e exporta PDF", (await page.locator("[data-baixar-csv]").count()) === 1 && (await page.locator("[data-exportar-pdf]").count()) === 1);
  await page.fill('textarea[aria-label="Pedido de relatório"]', "DRE por obra");
  await page.click('[data-relatorio-chat] button[type="submit"]');
  await page.waitForSelector("[data-relatorio-chat] [role=alert], [data-relatorio-fala=cris]", { timeout: 60000 });
  check("RC: o chat responde (sem chave de IA, manda usar os campos)", /campos/.test((await page.textContent("[data-relatorio-chat]")) ?? ""));
  await page.screenshot({ path: `${OUT}/v3-relatorios.png`, fullPage: true });

  // AE2 — Resumo Executivo: indicadores de negócio selecionáveis, no link e no PDF.
  await texto(page, "/resumo?proj=all");
  check("AE2: painel de indicadores no Resumo", (await page.locator("[data-indicadores-negocio]").count()) === 1);
  check("AE2: abre com os indicadores padrão", (await page.locator("[data-linha-indicador]").count()) === 4);
  await page.check('[data-indicador="margem_orcada"]');
  await page.waitForURL(/ind=.*margem_orcada/, { timeout: 30000 }).catch(() => {});
  check("AE2: marcar um indicador entra na tabela e no link", (await page.locator('[data-linha-indicador="margem_orcada"]').count()) === 1 && /ind=/.test(page.url()), page.url());
  check("AE2: Resumo exporta PDF", (await page.locator("[data-exportar-pdf]").count()) === 1);
  await page.screenshot({ path: `${OUT}/v3-resumo.png`, fullPage: true });
  await texto(page, "/caixa");
  const obraParaCadastro = await page.locator("select option").nth(1).getAttribute("value");
  await texto(page, `/projeto?proj=${obraParaCadastro}`);
  check("AE2: cadastro do projeto tem a área construída", (await page.locator('input[aria-label="Área construída (m²)"]').count()) >= 1);
  // B2 — o cadastro do projeto aberto se oferece à Cris; alteração pendente avisa ao sair.
  await page.click("[data-chat-botao]");
  await page.waitForFunction(() => /Cadastro do projeto/.test(document.querySelector("[data-chat-contexto]")?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
  check("B2: a Cris sabe o cadastro do projeto aberto", /Cadastro do projeto/.test((await page.textContent("[data-chat-contexto]")) ?? ""));
  await page.click("[data-chat-botao]");

  // M2 — Clientes: o perfil da base, só contagens.
  const cliTxt = await texto(page, "/clientes");
  check("M2: Clientes mostra o perfil da base", (await page.locator("[data-perfil-base]").count()) === 1 && /Perfil da base/.test(cliTxt));

  // K2 — Contas a Receber e Liberações: o formulário se oferece à Cris.
  const ctxCris = async (url, padrao) => {
    await texto(page, url);
    await page.click("[data-chat-botao]");
    await page.waitForFunction((p) => new RegExp(p).test(document.querySelector("[data-chat-contexto]")?.textContent ?? ""), padrao, { timeout: 15000 }).catch(() => {});
    const t = (await page.textContent("[data-chat-contexto]")) ?? "";
    await page.click("[data-chat-botao]");
    return t;
  };
  check("K2: a Cris preenche a nova conta a receber", /Nova conta a receber/.test(await ctxCris(`/contasreceber?proj=${obraParaCadastro}`, "Nova conta a receber")));
  check("P2: a Cris preenche o novo ativo de permuta", /Novo ativo de permuta/.test(await ctxCris(`/permuta/novo?proj=${obraParaCadastro}`, "Novo ativo de permuta")));
  check("S3: a Cris preenche a nova despesa", /Nova despesa/.test(await ctxCris("/despesas?proj=all", "Nova despesa")));
  check("V2b: a Cris preenche a nova medição", /Nova medição de projeto/.test(await ctxCris(`/medicaolanc?aba=nova&proj=${obraParaCadastro}`, "Nova medição de projeto")));
  // Y2 — Estoque: a baixa à vista, a caixa de conversa no painel, a Cris no movimento.
  await texto(page, "/estoque");
  check("Y2: o atalho Dar baixa aparece no Estoque", (await page.locator("[data-atalho-baixa]").count()) === 1);
  check("Y2: o painel tem a caixa de conversa", (await page.locator("[data-caixa-conversa]").count()) === 1);
  await page.click("[data-atalho-baixa]");
  await page.waitForURL(/lancar=saida/, { timeout: 15000 }).catch(() => {});
  await page.waitForSelector("text=Registrar baixa", { timeout: 15000 }).catch(() => {});
  check("Y2: o atalho abre o formulário na baixa", (await page.locator("button:has-text('Registrar baixa')").count()) === 1);
  check("Y2: a Cris preenche o movimento de estoque", /Movimento de estoque/.test(await ctxCris("/estoque?tab=mov&lancar=saida", "Movimento de estoque")));
  // Q2 — INCC: o cartão da série da empresa e a Cris com a tabela.
  check("Q2: a tela de INCC mostra o INCC da empresa", await (async () => { await texto(page, `/parametros?proj=${obraParaCadastro}`); return (await page.locator("[data-incc-empresa]").count()) === 1; })());
  check("Q2: a Cris recebe a tabela do INCC", /Parâmetros \/ INCC/.test(await ctxCris(`/parametros?proj=${obraParaCadastro}`, "Parâmetros / INCC")));
  check("Z2: a Cris preenche o vínculo do funcionário", /Novo funcionário \(CLT\)/.test(await ctxCris("/funcionarios", "Novo funcionário")));
  check("AI2: o novo usuário mostra as telas sugeridas do papel", await (async () => { await texto(page, "/usuarios"); return (await page.locator("[data-telas-sugeridas] input[type=checkbox]").count()) > 0; })());
  // AH2/AK2/AF2 — Empresa, Auditoria e Numeração com a Cris.
  check("AH2: a Cris preenche os dados fiscais da Empresa", /Dados fiscais da empresa/.test(await ctxCris("/empresa", "Dados fiscais da empresa")));
  check("AK2: a Auditoria tem o filtro e a Cris o preenche", /Filtro do Log de Auditoria/.test(await ctxCris("/acoes", "Filtro do Log de Auditoria")) && (await page.locator("[data-filtro-auditoria]").count()) === 1);
  await texto(page, "/acoes?acao=membership");
  check("AK2: o filtro por ação funciona", (await page.locator("tbody tr").count()) >= 1 && !((await page.textContent("tbody")) ?? "").match(/\bdespesa\.(create|update)\b/));
  check("AF2: a Cris sugere a numeração", /Numeração de despesas/.test(await ctxCris("/numeracao", "Numeração de despesas")));
  // N2 — Simulador: parcelamento da planilha, proposta ao cliente e a Cris sem a renda.
  await texto(page, `/simulador?proj=${obraParaCadastro}`);
  await page.fill('input[aria-label="Valor do imóvel"]', "537027");
  await page.fill('input[aria-label="Ato de assinatura"]', "30000");
  await page.fill('input[aria-label="Sinal 1"]', "3000");
  await page.fill('input[aria-label="Nº de mensais"]', "90");
  await page.fill('input[aria-label="Renda familiar"]', "16000");
  await page.waitForSelector("[data-proposta]", { timeout: 15000 }).catch(() => {});
  check("N2: o simulador mostra os cinco números da planilha", (await page.locator("[data-kpis-simulador] > *").count()) === 5);
  check("N2: o comprometimento de renda aparece em %", /Comprometimento de renda: \d/.test((await page.textContent("[data-comprometimento]").catch(() => "")) ?? ""));
  check("N2: a proposta ao cliente lista o plano", /Ato \(assinatura\)[\s\S]*Sinal 1[\s\S]*90 mensais/.test((await page.textContent("[data-plano-da-proposta]").catch(() => "")) ?? ""));
  check("N2: a proposta não mostra a renda nem o limite", !/16\.000|renda|limite/i.test((await page.textContent("[data-proposta]").catch(() => "")) ?? ""));
  await page.click("[data-chat-botao]");
  await page.waitForFunction(() => /Simulador de Unidade/.test(document.querySelector("[data-chat-contexto]")?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
  const ctxSim = (await page.textContent("[data-chat-contexto]")) ?? "";
  check("N2: a Cris conhece a simulação", /Simulador de Unidade/.test(ctxSim));
  await page.click("[data-chat-botao]");
  check("U2: a Cris conhece os Cartões", /Cartões de Crédito/.test(await ctxCris("/cartoes", "Cartões de Crédito")));
  check("U2: o extrato aceita o PDF da fatura", /PDF da fatura/.test((await page.textContent("main")) ?? ""));
  check("W2: a Cris lê o documento do fornecedor", /Novo cadastro de Fornecedores/.test(await ctxCris("/fornecedores", "Novo cadastro de Fornecedores")));
  check("T2: a Cris marca as despesas do acerto", /Acerto Contábil: pagamento/.test(await ctxCris("/acerto", "Acerto Contábil")));
  check("K2: a Cris preenche a nova liberação", /Nova liberação de obra/.test(await ctxCris(`/reembolso/novo?proj=${obraParaCadastro}`, "Nova liberação")));

  // D2 — Orçamentos: alteração não salva marca a tela e pede confirmação ao sair.
  await texto(page, `/budget?proj=${obraParaCadastro}`);
  check("D2: abre sem alteração pendente", (await page.locator("[data-nao-salvo]").count()) === 0);
  await page.click("[data-chat-botao]");
  // O formulário se registra num efeito do cliente: espera em vez de ler uma vez só.
  await page.waitForFunction(() => /Despesas do Orçamento/.test(document.querySelector("[data-chat-contexto]")?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
  check("D2: a Cris sabe a grade do Orçamento (receitas e despesas)", /Receitas do Orçamento.*Despesas do Orçamento/.test((await page.textContent("[data-chat-contexto]")) ?? ""), ((await page.textContent("[data-chat-contexto]")) ?? "").slice(0, 120));
  await page.click("[data-chat-botao]");
  const celula = page.locator("table tbody input").first();
  await celula.fill("7");
  await celula.blur();
  check("D2: editar marca 'Alterações não salvas'", (await page.locator("[data-nao-salvo]").count()) >= 1);
  let perguntou = "";
  page.once("dialog", async (d) => { perguntou = d.message(); await d.dismiss(); });
  await page.locator('a[href="/projeto"]:visible').first().click();
  await page.waitForTimeout(800);
  check("D2: sair pelo menu pede confirmação e cancelar fica na tela", /não salvas/.test(perguntou) && page.url().includes("/budget"), perguntou);
  page.once("dialog", (d) => d.accept());
  await page.locator('a[href="/projeto"]:visible').first().click();
  await page.waitForURL(/\/projeto/, { timeout: 60000 }).catch(() => {});
  check("D2: confirmar sai sem gravar", page.url().includes("/projeto"), page.url());
  await page.context().close();
}

await browser.close();
console.log(`\n${ok} ok, ${falha} falha(s)`);
process.exit(falha ? 1 : 0);
