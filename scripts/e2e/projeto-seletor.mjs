import { chromium } from "playwright";
// Credenciais do ambiente de teste (nada fixo no código):
//   E2E_EMAIL, E2E_PASSWORD (owner/admin) · E2E_EMAIL_ADMIN (2º admin, opcional) ·
//   E2E_EMAIL_CONTADOR (usuário criado pelo teste de restrição).
const E2E_EMAIL = process.env.E2E_EMAIL ?? "";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";
if (!E2E_EMAIL || !E2E_PASSWORD) throw new Error("Defina E2E_EMAIL e E2E_PASSWORD.");

const BASE = "http://localhost:3400";
let ok = 0, falha = 0;
const check = (n, c, d = "") => { console.log(`[${c ? "  OK  " : " FALHA"}] ${n}${d ? " — " + d : ""}`); c ? ok++ : falha++; };

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });

await page.goto(`${BASE}/login`);
await page.fill('input[type="email"]', E2E_EMAIL);
await page.fill('input[type="password"]', E2E_PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20000 });

await page.goto(`${BASE}/projeto`);
await page.waitForLoadState("networkidle");

// o seletor está no topo
const picker = page.locator('header select, select').first();
const opcoes = await page.locator("select").first().locator("option").allTextContents();
check("Seletor no topo com a lista de projetos", opcoes.length >= 3, opcoes.join(" | "));
check('Traz a opção "Todos"', opcoes.some((o) => o.toLowerCase().includes("todos")));
check("Matriz/filial identificada na lista", opcoes.some((o) => o.includes("Matriz/Filial")));

// estado inicial: lista completa
const corpoTodos = await page.textContent("body");
const nomes = opcoes.filter((o) => !o.toLowerCase().includes("todos")).map((o) => o.split(" · ")[0]);
check("Todos: lista completa visível", nomes.every((n) => corpoTodos.includes(n)), nomes.join(", "));
check("Todos: formulário de novo projeto presente", corpoTodos.includes("Novo projeto"));
await page.screenshot({ path: "projeto-todos.png" });

// seleciona uma obra
const alvo = nomes.find((n) => !opcoes.find((o) => o.startsWith(n) && o.includes("Matriz")));
await page.locator("select").first().selectOption({ label: alvo });
await page.waitForLoadState("networkidle");
await page.waitForTimeout(600);
check("URL guarda a escolha (?proj=)", page.url().includes("proj="), page.url().split("?")[1] ?? "");

const corpoUm = await page.textContent("body");
const outros = nomes.filter((n) => n !== alvo);
check(`Selecionado "${alvo}": aparece`, corpoUm.includes(alvo));
// Os nomes dos demais projetos continuam no <body> porque estão nas OPÇÕES do
// seletor. O que interessa é o que foi RENDERIZADO como linha: cada projeto na
// tela tem um campo "Nome da obra" com o nome dentro.
const nomesRenderizados = await page
  .locator('input[value]')
  .evaluateAll((els) =>
    els.map((e) => e.value).filter((v) => /^(OBRA|PROJETO|MATRIZ)/i.test(v)),
  );
check(
  "Só o projeto escolhido é renderizado",
  nomesRenderizados.length === 1 && nomesRenderizados[0] === alvo,
  `renderizados: ${nomesRenderizados.join(", ") || "nenhum"}`,
);
check("Formulário de cadastro recolhe", !corpoUm.includes("Novo projeto"));
check("Subtítulo explica como voltar", corpoUm.includes("Todos"));
await page.screenshot({ path: "projeto-um.png" });

// deep link direto
await page.goto(`${BASE}/projeto?proj=${(await page.locator("select").first().inputValue())}`);
await page.waitForLoadState("networkidle");
check("Deep link ?proj= abre já filtrado", (await page.textContent("body")).includes(alvo));

// volta para todos
await page.locator("select").first().selectOption("all");
await page.waitForLoadState("networkidle");
await page.waitForTimeout(600);
const corpoVolta = await page.textContent("body");
check('Voltar para "Todos" restaura a lista', nomes.every((n) => corpoVolta.includes(n)));
check('Voltar para "Todos" restaura o formulário', corpoVolta.includes("Novo projeto"));

// seleciona a matriz
const matriz = opcoes.find((o) => o.includes("Matriz/Filial"));
await page.locator("select").first().selectOption({ label: matriz });
await page.waitForLoadState("networkidle");
await page.waitForTimeout(600);
const corpoMatriz = await page.textContent("body");
check("Selecionar a matriz mostra só a seção de escritórios",
  corpoMatriz.includes(matriz.split(" · ")[0]) && !corpoMatriz.includes("empreendimentos imobiliários"));

await browser.close();
console.log(`\n=== ${ok} OK · ${falha} FALHA ===`);
process.exit(falha === 0 ? 0 : 1);
