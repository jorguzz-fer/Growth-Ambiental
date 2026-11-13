// Prompt AI2 (BAI2-1) — reproduz "a restrição de telas por papel não funcionava".
// O owner cria um contador pelo formulário novo, desmarcando a DRE da sugestão;
// o contador entra e o script confere, tela a tela, que o menu e o acesso batem.
// Uso: BASE=http://localhost:3400 node scripts/e2e/v3-restricao.mjs
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
// Credenciais do ambiente de teste (nada fixo no código):
//   E2E_EMAIL, E2E_PASSWORD (owner/admin) · E2E_EMAIL_ADMIN (2º admin, opcional) ·
//   E2E_EMAIL_CONTADOR (usuário criado pelo teste de restrição).
const E2E_EMAIL = process.env.E2E_EMAIL ?? "";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";
if (!E2E_EMAIL || !E2E_PASSWORD) throw new Error("Defina E2E_EMAIL e E2E_PASSWORD.");


const BASE = process.env.BASE ?? "http://localhost:3400";
const DB = process.env.APP_DB ?? "postgres://postgres@localhost:5433/gc_app";
const EMAIL = process.env.E2E_EMAIL_CONTADOR ?? "e2e-contador@exemplo.com";
let ok = 0;
let falha = 0;
const check = (n, c, d = "") => { console.log(`[${c ? "  OK  " : " FALHA"}] ${n}${d ? " — " + d : ""}`); c ? ok++ : falha++; };
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });

async function entrar(email) {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', E2E_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 60000 });
  return page;
}
const abrir = async (page, url) => {
  await page.goto(`${BASE}${url}`, { timeout: 90000 });
  await page.waitForLoadState("networkidle", { timeout: 90000 });
  return { texto: (await page.textContent("body")) ?? "", url: new URL(page.url()).pathname };
};

// 1) O owner cria o contador, com a sugestão de telas do papel, sem a DRE.
{
  const page = await entrar(E2E_EMAIL);
  await abrir(page, "/usuarios");
  await page.fill('input[name="name"]', "E2E Contador");
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', E2E_PASSWORD);
  await page.selectOption('select[name="role"]', "contador");
  const sugeridas = await page.locator("[data-telas-sugeridas] input[type=checkbox]:checked").evaluateAll((els) => els.map((e) => e.getAttribute("data-tela")));
  check("AI2: o papel contador sugere as telas dele", sugeridas.includes("dre") && sugeridas.includes("despesas") && !sugeridas.includes("caixa"), sugeridas.join(","));
  await page.locator('[data-tela="dre"]').uncheck();
  await page.click('button[type="submit"]:has-text("Adicionar")');
  await page.waitForSelector("text=Usuário adicionado", { timeout: 30000 }).catch(() => {});
  check("AI2: o usuário é adicionado", (await page.textContent("body"))?.includes(EMAIL) ?? false);
  await page.context().close();
  // a senha inicial é provisória: para o teste, dispensa a troca no primeiro acesso
  execSync(`psql "${DB}" -Atc "update \\"user\\" set must_change_password=false where email='${EMAIL}'"`);
}

// 2) O contador entra: menu e acesso batem em todas as telas.
{
  const page = await entrar(EMAIL);
  await abrir(page, "/despesas");
  const noMenu = new Set(
    (await page.locator("nav a[href^='/']").evaluateAll((els) => els.map((e) => e.getAttribute("href")))).map((h) => h.split("?")[0].split("/")[1]).filter(Boolean),
  );
  check("AI2: a DRE desmarcada não aparece no menu", !noMenu.has("dre"), [...noMenu].join(","));
  const rotas = readdirSync("src/app/(app)", { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).filter((r) => !["perfil", "lancamento"].includes(r));
  const divergencias = [];
  for (const r of rotas) {
    const { texto, url } = await abrir(page, `/${r}`);
    const negado = texto.includes("Acesso negado");
    const desviado = url.split("/")[1] !== r;
    const acessa = !negado && !desviado;
    if (acessa !== noMenu.has(r)) divergencias.push(`${r}: ${acessa ? "abre" : negado ? "negado" : "desvia para " + url} / ${noMenu.has(r) ? "no menu" : "fora do menu"}`);
  }
  check("AI2: toda tela do menu abre e toda tela fora do menu é negada", divergencias.length === 0, divergencias.join(" · "));
  check("AI2: a DRE desmarcada é negada pela URL", (await abrir(page, "/dre")).texto.includes("Acesso negado"));
  check("AI2: Despesas, sugerida para o contador, abre", !(await abrir(page, "/despesas")).texto.includes("Acesso negado"));
  await page.context().close();
}

await browser.close();
console.log(`\n${ok} ok, ${falha} falha(s)`);
process.exit(falha ? 1 : 0);
