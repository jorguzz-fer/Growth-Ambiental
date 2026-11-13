import { chromium } from "playwright";
// Credenciais do ambiente de teste (nada fixo no código):
//   E2E_EMAIL, E2E_PASSWORD (owner/admin) · E2E_EMAIL_ADMIN (2º admin, opcional) ·
//   E2E_EMAIL_CONTADOR (usuário criado pelo teste de restrição).
const E2E_EMAIL = process.env.E2E_EMAIL ?? "";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";
if (!E2E_EMAIL || !E2E_PASSWORD) throw new Error("Defina E2E_EMAIL e E2E_PASSWORD.");


const BASE = "http://localhost:3300";
let ok = 0, falha = 0;
const check = (nome, cond, detalhe = "") => {
  console.log(`[${cond ? "  OK  " : " FALHA"}] ${nome}${detalhe ? " — " + detalhe : ""}`);
  cond ? ok++ : falha++;
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });

// login
await page.goto(`${BASE}/login`);
await page.fill('input[type="email"]', E2E_EMAIL);
await page.fill('input[type="password"]', E2E_PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20000 });
check("Login", true);

await page.goto(`${BASE}/despesas`);
await page.waitForLoadState("networkidle");

// preenche o cabeçalho: valor e vencimento, forma cheque
await page.fill('input[placeholder="0,00"]', "10000");
// O 1º campo dd/mm/aaaa é a "Emissão" do documento fiscal (desabilitado).
// Miramos o Vencimento pelo rótulo.
const venc = page.locator('div:has(> label:text-is("Vencimento")) input[placeholder="dd/mm/aaaa"]').first();
await venc.fill("10/01/2027");
await venc.blur();
// forma de pagamento = Cheque
const selects = page.locator("select");
const n = await selects.count();
for (let i = 0; i < n; i++) {
  const opts = await selects.nth(i).locator("option").allTextContents();
  if (opts.includes("Cheque") && opts.includes("PIX")) { await selects.nth(i).selectOption("Cheque"); break; }
}

// abre o painel
await page.click('button:has-text("Configurar parcelas")');
await page.waitForSelector('h2:has-text("Configurar parcelas")', { timeout: 8000 });
check("Painel abre ao clicar", true);

// Ancora no overlay do modal (z-[120]) — o ancestral "p-5" casa com 2 nós.
const painel = page.locator('div.fixed.inset-0.z-\\[120\\]');
for (const col of ["Nº cheque", "Emitente", "Banco / conta", "Vencimento", "Valor", "Forma", "Status"])
  check(`Coluna "${col}"`, await painel.locator(`th:has-text("${col}")`).count() > 0);

// gera 3 parcelas dia 31
await painel.locator('input[type="number"]').first().fill("3");
await painel.locator('input[placeholder="do venc."]').fill("31");
await painel.locator('button:has-text("Gerar parcelas")').click();
await page.waitForTimeout(600);

const linhas = await painel.locator("tbody tr").count();
check("Gerou 3 parcelas", linhas === 3, `${linhas} linhas`);

const datas = await painel.locator('tbody tr input[placeholder="dd/mm/aaaa"]').evaluateAll(
  (els) => els.map((e) => e.value).filter((v) => /\d{2}\/\d{2}\/\d{4}/.test(v)),
);
check("Fim de mês: dia 31 vira 28/02 em 2027", datas.some((d) => d.startsWith("28/02")), datas.slice(0,4).join(" · "));
check("Fim de mês NÃO contamina março (31/03)", datas.some((d) => d.startsWith("31/03")), datas.slice(0,4).join(" · "));

// soma fecha com o total
const rodape = await painel.textContent();
check("Painel indica que fecha", rodape.includes("fecha"), "R$ 10.000 em 3 parcelas");

// sequência de cheques
await painel.locator('input[placeholder="000450"]').first().fill("000450");
await painel.locator('button:has-text("Preencher sequência")').click();
await page.waitForTimeout(400);
const cheques = await painel.locator('tbody tr input[placeholder="000450"]').evaluateAll((els) => els.map((e) => e.value));
check("Sequência de cheques preenchida com largura preservada",
  cheques[0] === "000450" && cheques[1] === "000451" && cheques[2] === "000452", cheques.join(" · "));

// edita um número para simular talão salteado
await painel.locator('tbody tr input[placeholder="000450"]').nth(1).fill("000455");
await page.waitForTimeout(300);
const salteado = await painel.locator('tbody tr input[placeholder="000450"]').evaluateAll((els) => els.map((e) => e.value));
check("Numeração salteada é aceita", salteado[1] === "000455", salteado.join(" · "));

// duplicidade: repete o número da 1ª na 3ª
await painel.locator('tbody tr input[placeholder="000450"]').nth(2).fill("000450");
await page.waitForTimeout(400);
check("Cheque repetido gera AVISO (não bloqueio)", (await painel.textContent()).includes("Cheque repetido"));
check("Botão aplicar segue habilitado com o aviso",
  await painel.locator('button:has-text("Aplicar")').isEnabled());
await painel.locator('tbody tr input[placeholder="000450"]').nth(2).fill("000461");
await page.waitForTimeout(300);

// divergência de soma + ajustar na última
await painel.locator('tbody tr').nth(0).locator('td:nth-child(3) input:visible').first().fill("1");
await page.waitForTimeout(400);
check("Divergência de soma é reportada", (await painel.textContent()).includes("Diferença"));
check("Aplicar fica BLOQUEADO quando não fecha",
  !(await painel.locator('button:has-text("Aplicar")').isEnabled()));
await painel.locator('button:has-text("Ajustar na última parcela")').click();
await page.waitForTimeout(400);
check("'Ajustar na última parcela' fecha a conta", (await painel.textContent()).includes("fecha"));

// adicionar e remover linha
await painel.locator('button:has-text("+ Adicionar parcela")').click();
await page.waitForTimeout(300);
check("Adicionar linha", (await painel.locator("tbody tr").count()) === 4);
await painel.locator('tbody tr').last().locator('button:has-text("Remover")').click();
await page.waitForTimeout(300);
check("Remover linha", (await painel.locator("tbody tr").count()) === 3);

// duplicar não copia o cheque
await painel.locator('tbody tr').nth(0).locator('button:has-text("Duplicar")').click();
await page.waitForTimeout(300);
const aposDup = await painel.locator('tbody tr input[placeholder="000450"]').evaluateAll((els) => els.map((e) => e.value));
check("Duplicar NÃO copia o nº do cheque", aposDup[1] === "", aposDup.join(" · "));
await painel.locator('tbody tr').nth(1).locator('button:has-text("Remover")').click();
await page.waitForTimeout(300);
await painel.locator('button:has-text("Ajustar na última parcela")').click().catch(() => {});
await page.waitForTimeout(300);

// aplica
await painel.locator('button:has-text("Aplicar")').click();
await page.waitForTimeout(600);
check("Painel fecha ao aplicar", (await page.locator('h2:has-text("Configurar parcelas")').count()) === 0);
const corpo = await page.textContent("body");
check("Resumo das parcelas aparece no formulário", corpo.includes("parcela(s)") && corpo.includes("soma"));

await page.screenshot({ path: "parcelas-resumo.png", fullPage: false });

// reabrir preserva o que foi configurado
await page.click('button:has-text("Editar")');
await page.waitForSelector('h2:has-text("Configurar parcelas")', { timeout: 8000 });
const reaberto = page.locator('div.fixed.inset-0.z-\\[120\\]');
const chequesReab = await reaberto.locator('tbody tr input[placeholder="000450"]').evaluateAll((els) => els.map((e) => e.value));
check("Reabrir preserva os cheques digitados", chequesReab.filter(Boolean).length >= 2, chequesReab.join(" · "));
await reaberto.locator('button:has-text("Cancelar")').click();
await page.waitForTimeout(400);

// recorrente x parcelado
await page.locator('input[type="checkbox"]').first().check().catch(() => {});
await page.waitForTimeout(500);
const txt = await page.textContent("body");
check("Recorrente com parcelas ativas é bloqueado com explicação",
  txt.includes("Recorrente e parcelado são coisas diferentes"));

await page.screenshot({ path: "parcelas-conflito.png", fullPage: false });
await browser.close();
console.log(`\n=== ${ok} OK · ${falha} FALHA ===`);
process.exit(falha === 0 ? 0 : 1);
