// GA-13 H1 — mede o cabeçalho (PageHeader) das telas com filtros em 1280, 1440
// e 1920 px: linhas do título e sobreposição dos filtros com o título/subtítulo.
// Uso: com o app rodando em BASE (padrão http://localhost:3100) e a demonstração:
//   node scripts/verificar-cabecalho.cjs [pasta-dos-prints]
// Sai com código 1 se algum título passar de 2 linhas ou houver sobreposição.
const { chromium } = require("playwright");
const BASE = process.env.BASE ?? "http://localhost:3100";
const PASTA = process.argv[2] ?? null;
const ROTAS = ["/dashboard", "/dre", "/fluxocaixa", "/resumo", "/contasreceber"];
const LARGURAS = [1280, 1440, 1920];
(async () => {
  const b = await chromium.launch();
  let falhas = 0;
  for (const largura of LARGURAS) {
    const p = await (await b.newContext({ viewport: { width: largura, height: 900 }, timezoneId: "UTC" })).newPage();
    await p.goto(BASE + "/login", { waitUntil: "networkidle" });
    await p.fill("input[type=email]", process.env.LOGIN ?? "demo@exemplo.com");
    await p.fill("input[type=password]", process.env.SENHA ?? "Local-Teste-123");
    await p.click("button[type=submit]");
    await p.waitForURL((u) => !u.pathname.startsWith("/login"));
    for (const rota of ROTAS) {
      await p.goto(BASE + rota, { waitUntil: "networkidle" });
      // a tela pode passar por um redirecionamento (projeto lembrado / "Todos") e pelo esqueleto
      await p.locator("[data-page-header] h1").first().waitFor({ timeout: 20000 }).catch(() => {});
      await p.waitForLoadState("networkidle");
      const m = await p.evaluate(() => {
        const h = document.querySelector("[data-page-header]") ?? document.querySelector("main header") ?? document.querySelector("header h1")?.closest("header");
        const h1 = h?.querySelector("h1");
        if (!h || !h1) return null;
        const lh = parseFloat(getComputedStyle(h1).lineHeight) || parseFloat(getComputedStyle(h1).fontSize) * 1.2;
        const linhas = Math.round(h1.getBoundingClientRect().height / lh);
        const texto = h1.parentElement.getBoundingClientRect();
        const acoes = h.lastElementChild !== h1.parentElement ? h.lastElementChild.getBoundingClientRect() : null;
        const sobrepoe = acoes ? !(acoes.left >= texto.right - 1 || acoes.right <= texto.left + 1 || acoes.top >= texto.bottom - 1 || acoes.bottom <= texto.top + 1) : false;
        const vaza = acoes ? acoes.right > h.getBoundingClientRect().right + 1 : false;
        return { linhas, sobrepoe, vaza, larguraTitulo: Math.round(texto.width) };
      });
      if (!m) {
        console.log(`${largura}px ${rota}: sem PageHeader`);
        continue;
      }
      const ok = m.linhas <= 2 && !m.sobrepoe && !m.vaza;
      if (!ok) falhas++;
      console.log(`${ok ? "OK  " : "ERRO"} ${largura}px ${rota}: título em ${m.linhas} linha(s), largura ${m.larguraTitulo}px${m.sobrepoe ? ", FILTROS SOBRE O TÍTULO" : ""}${m.vaza ? ", filtros vazam" : ""}`);
      if (PASTA) await p.screenshot({ path: `${PASTA}/cabecalho-${rota.slice(1)}-${largura}.png`, clip: { x: 0, y: 0, width: largura, height: 420 } });
    }
  }
  await b.close();
  process.exit(falhas ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
