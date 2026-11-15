// Foto dos números da demonstração, tela por tela (GA-9, Fase 0).
//
// Abre o app de verdade (como o usuário vê), entra com o dono da demonstração
// e lê, por projeto (cada um, a sede e "todos"), as tabelas e os indicadores de:
// DRE, DRE analítica, Fluxo de Caixa, Fluxo analítico, Dashboard, Resumo,
// Contas a Receber e Caixa. Também baixa a exportação do Orçamento e da
// Previsão de cada projeto e lê as planilhas. Não grava nada no banco.
//
// Toda fase do GA-9 compara com essa foto: os números de consultoria não podem mudar.
//
// Pré-requisitos (só banco de TESTE):
//   1. demonstração criada com a mesma DATA_FIXA (ver scripts/data-fixa.mjs);
//   2. app no ar com a mesma DATA_FIXA, por exemplo:
//        DATA_FIXA=2026-11-15 TZ=UTC NODE_OPTIONS="--import $PWD/scripts/data-fixa.mjs" npx next start -p 3100
//
// Uso:
//   DATA_FIXA=2026-11-15 TZ=UTC DATABASE_URL=... FOTO_EMAIL=demo@exemplo.com FOTO_SENHA=... \
//     node scripts/foto-numeros-demo.mjs gravar docs/revisao/GA9-numeros-antes.json
//   ... node scripts/foto-numeros-demo.mjs comparar docs/revisao/GA9-numeros-antes.json
//
// `comparar` tira uma foto nova e lista cada diferença; sai com código 1 se houver alguma.
// Senha e URL do banco vêm do ambiente; nada disso vai para o arquivo.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const postgres = require("postgres");
const XLSX = require("xlsx");

const [modo, arquivo] = process.argv.slice(2);
if (!["gravar", "comparar"].includes(modo) || !arquivo) {
  console.error("Uso: node scripts/foto-numeros-demo.mjs gravar|comparar <arquivo.json>");
  process.exit(2);
}
const BASE = process.env.FOTO_BASE ?? "http://localhost:3100";
const EMAIL = (process.env.FOTO_EMAIL ?? "").trim().toLowerCase();
const SENHA = process.env.FOTO_SENHA ?? "";
const DATA_FIXA = process.env.DATA_FIXA ?? "";
if (!EMAIL || !SENHA || !process.env.DATABASE_URL || !/^\d{4}-\d{2}-\d{2}$/.test(DATA_FIXA)) {
  console.error("Defina DATABASE_URL, FOTO_EMAIL, FOTO_SENHA e DATA_FIXA (AAAA-MM-DD).");
  process.exit(2);
}
if (process.env.TZ !== "UTC") {
  console.error("Rode com TZ=UTC (o mesmo fuso do servidor e do seed).");
  process.exit(2);
}

// ── Quem é quem no banco (só leitura) ──────────────────────────────────────
async function lerEmpresa() {
  const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    const [dono] = await sql`
      select m.tenant_id, t.name from membership m
      join "user" u on u.id = m.user_id join tenant t on t.id = m.tenant_id
      where lower(u.email) = ${EMAIL} and m.role = 'owner'`;
    if (!dono) throw new Error(`${EMAIL} não é proprietário de nenhuma empresa.`);
    const projetos = await sql`select id, name, kind from project where tenant_id = ${dono.tenant_id} order by name`;
    const versoes = await sql`select id, project_id, kind from version where tenant_id = ${dono.tenant_id} and kind in ('budget','forecast')`;
    const contas = await sql`select id, banco, cc from bank_account where tenant_id = ${dono.tenant_id} order by banco, cc`;
    // Janela de meses de cada projeto: do menor ao maior mês entre o início/fim do
    // cadastro e os meses lançados no Orçamento/Previsão/Atual.
    const janelas = await sql`
      select p.id,
             to_char(least(min(to_date(bl.mes, 'MM/YYYY')), min(to_date(p.start_date, 'MM/DD/YYYY'))), 'MM/YYYY') as de,
             to_char(greatest(max(to_date(bl.mes, 'MM/YYYY')), max(to_date(p.end_date, 'MM/DD/YYYY'))), 'MM/YYYY') as ate
      from project p
      join version v on v.project_id = p.id
      join budget_line bl on bl.version_id = v.id
      where p.tenant_id = ${dono.tenant_id}
      group by p.id`;
    return { empresa: dono.name, projetos, versoes, contas, janelas };
  } finally {
    await sql.end();
  }
}

// ── Meses ("MM/AAAA") ──────────────────────────────────────────────────────
const indice = (m) => {
  const [mm, aa] = m.split("/").map(Number);
  return aa * 12 + (mm - 1);
};
function mesesEntre(de, ate) {
  const out = [];
  for (let i = indice(de); i <= indice(ate); i++) out.push(`${String((i % 12) + 1).padStart(2, "0")}/${Math.floor(i / 12)}`);
  return out;
}
/** A linha tem algum número diferente de zero? (cabeçalhos ficam: não têm dígito). */
const temValor = (linha) => !linha.some((c) => /\d/.test(c)) || linha.some((c) => /[1-9]/.test(c.replace(/^\d{2}\/\d{4}$/, "")));

// ── Leitura de uma tela ────────────────────────────────────────────────────
/** Tabelas (cabeçalho + linhas) e as demais linhas com número, do <main>. */
async function lerTela(page) {
  return page.evaluate(() => {
    const limpa = (s) => s.replace(/\s+/g, " ").trim();
    const raiz = document.querySelector("main") ?? document.body;
    const tabelas = [...raiz.querySelectorAll("table")].map((t) => {
      const titulo = limpa(t.querySelector("caption")?.innerText ?? t.closest("section,[data-bloco],div")?.querySelector("h2,h3")?.innerText ?? "");
      const linhas = [...t.querySelectorAll("tr")].map((tr) => [...tr.querySelectorAll("th,td")].map((c) => limpa(c.innerText)));
      return { titulo, linhas: linhas.filter((l) => l.some((c) => c !== "")) };
    });
    // Indicadores: o texto da tela sem as tabelas, só as linhas que têm número.
    const escondidas = [...raiz.querySelectorAll("table")].map((t) => [t, t.style.display]);
    for (const [t] of escondidas) t.style.display = "none";
    const texto = raiz.innerText;
    for (const [t, d] of escondidas) t.style.display = d;
    const indicadores = texto
      .split("\n")
      .map(limpa)
      .filter((l) => /\d/.test(l));
    return { tabelas, indicadores };
  });
}

async function abrir(page, rota) {
  const resp = await page.goto(BASE + rota, { waitUntil: "networkidle", timeout: 180000 });
  const status = resp?.status() ?? 0;
  const final = new URL(page.url());
  return { status, rotaFinal: final.pathname + final.search };
}

// ── Foto completa ──────────────────────────────────────────────────────────
async function tirarFoto() {
  const { empresa, projetos, versoes, contas, janelas } = await lerEmpresa();
  const janela = Object.fromEntries(janelas.map((j) => [j.id, mesesEntre(j.de, j.ate)]));
  const todosOsMeses = [...new Set(Object.values(janela).flat())].sort((a, b) => indice(a) - indice(b));
  const escopos = [...projetos.map((p) => ({ chave: p.name, proj: p.id, meses: janela[p.id] ?? [] })), { chave: "(todos)", proj: "all", meses: todosOsMeses }];
  const navegador = await chromium.launch();
  const ctx = await navegador.newContext({ viewport: { width: 1600, height: 1000 }, timezoneId: "UTC", locale: "pt-BR", acceptDownloads: true });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date(`${DATA_FIXA}T12:00:00Z`) });
  const errosDePagina = [];
  page.on("pageerror", (e) => errosDePagina.push(`${page.url()}: ${String(e)}`));

  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.fill("input[type=email]", EMAIL);
  await page.fill("input[type=password]", SENHA);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 });

  const telas = {};
  // `soTabelas`: nas leituras mês a mês guarda só as tabelas, sem as linhas
  // vazias ou zeradas (o arquivo fica menor; o total do período já está acima).
  const registrar = async (tela, chave, rota, soTabelas = false) => {
    const { status, rotaFinal } = await abrir(page, rota);
    const leitura = await lerTela(page);
    (telas[tela] ??= {})[chave] = soTabelas ? { status, tabelas: leitura.tabelas.map((t) => ({ ...t, linhas: t.linhas.filter(temValor) })) } : { status, ...leitura };
    if (status !== 200) console.log(`  aviso: ${rota} respondeu ${status} (${rotaFinal})`);
    process.stdout.write(".");
  };

  const CENARIOS = ["atual", "budget", "forecast"];
  for (const e of escopos) {
    const q = `proj=${e.proj}`;
    await registrar("dre", e.chave, `/dre?${q}`);
    for (const c of CENARIOS) {
      await registrar("dre", `${e.chave} · ${c}`, `/dre?${q}&vkind=${c}`);
      await registrar("dre_analitica", `${e.chave} · ${c}`, `/dre/analitica?${q}&vkind=${c}`);
      await registrar("fluxo_analitico", `${e.chave} · ${c}`, `/fluxocaixa/analitico?${q}&vkind=${c}`);
    }
    await registrar("fluxo", e.chave, `/fluxocaixa?${q}`);
    await registrar("dashboard", e.chave, `/dashboard?${q}`);
    await registrar("resumo", e.chave, `/resumo?${q}`);
    await registrar("contas_receber", e.chave, `/contasreceber?${q}`);
    // Mês a mês: DRE (os três cenários lado a lado), DRE analítica e Fluxo analítico por cenário.
    for (const m of e.meses) {
      const mes = encodeURIComponent(m);
      await registrar("dre_por_mes", `${e.chave} · ${m}`, `/dre?${q}&periodo=custom&de=${mes}&ate=${mes}`, true);
      for (const c of CENARIOS) {
        await registrar("dre_analitica_por_mes", `${e.chave} · ${c} · ${m}`, `/dre/analitica?${q}&vkind=${c}&periodo=custom&de=${mes}&ate=${mes}`, true);
        await registrar("fluxo_analitico_por_mes", `${e.chave} · ${c} · ${m}`, `/fluxocaixa/analitico?${q}&vkind=${c}&de=${mes}&ate=${mes}`, true);
      }
    }
  }
  await registrar("caixa", "(padrão)", "/caixa");
  await registrar("caixa", "(ajustes)", "/caixa?tab=ajustes");
  for (const c of contas) await registrar("caixa", `${c.banco ?? ""} ${c.cc ?? ""}`.trim(), `/caixa?conta=${c.id}`);

  // Exportação do Orçamento e da Previsão (planilha baixada pela tela).
  const exportacao = {};
  for (const p of projetos) {
    for (const v of versoes.filter((x) => x.project_id === p.id)) {
      const resp = await page.request.get(`${BASE}/lancamento/export?v=${v.id}`);
      const chave = `${p.name} · ${v.kind}`;
      if (resp.status() !== 200) {
        exportacao[chave] = { status: resp.status() };
        continue;
      }
      const wb = XLSX.read(await resp.body(), { type: "buffer" });
      exportacao[chave] = {
        status: 200,
        abas: Object.fromEntries(wb.SheetNames.map((n) => [n, XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: "" })])),
      };
      process.stdout.write("x");
    }
  }
  console.log("");
  await navegador.close();
  return { meta: { dataFixa: DATA_FIXA, fuso: "UTC", empresa, projetos: projetos.map((p) => p.name), errosDePagina }, telas, exportacao };
}

// ── Comparação ─────────────────────────────────────────────────────────────
function diferencas(a, b, caminho = "", saida = []) {
  if (saida.length > 500) return saida;
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || a === null || b === null || typeof a !== "object") {
    if (JSON.stringify(a) !== JSON.stringify(b)) saida.push(`${caminho}: antes ${JSON.stringify(a)} → agora ${JSON.stringify(b)}`);
    return saida;
  }
  const chaves = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of chaves) {
    if (!(k in a)) saida.push(`${caminho}/${k}: só agora`);
    else if (!(k in b)) saida.push(`${caminho}/${k}: só antes`);
    else diferencas(a[k], b[k], `${caminho}/${k}`, saida);
  }
  return saida;
}

const foto = await tirarFoto();
if (modo === "gravar") {
  mkdirSync(path.dirname(arquivo), { recursive: true });
  writeFileSync(arquivo, JSON.stringify(foto, null, 1) + "\n");
  const n = Object.values(foto.telas).reduce((a, t) => a + Object.keys(t).length, 0);
  console.log(`Foto gravada em ${arquivo}: ${n} telas lidas, ${Object.keys(foto.exportacao).length} exportações.`);
  if (foto.meta.errosDePagina.length) console.log(`Erros de página: ${foto.meta.errosDePagina.join(" | ")}`);
} else {
  const antes = JSON.parse(readFileSync(arquivo, "utf8"));
  const difs = diferencas({ telas: antes.telas, exportacao: antes.exportacao }, { telas: foto.telas, exportacao: foto.exportacao });
  if (antes.meta.dataFixa !== foto.meta.dataFixa) difs.unshift(`DATA_FIXA diferente: foto ${antes.meta.dataFixa}, agora ${foto.meta.dataFixa}`);
  if (difs.length) {
    console.log(`✗ ${difs.length} diferença(s) contra ${arquivo}:`);
    for (const d of difs) console.log(`  ${d}`);
    process.exit(1);
  }
  console.log(`✓ Números iguais à foto ${arquivo}.`);
}
