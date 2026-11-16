import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { copyFile, readFile, mkdtemp } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { CODIGO_INTERNO } from "@/lib/codigos-internos";

/**
 * GA-2B §7 — nenhum texto interno de desenvolvimento na tela: os testes 2 a 6.
 * (O teste 1 é a trava `textos-visiveis.test.ts`.)
 */
vi.mock("server-only", () => ({}));
const ctxRef: { current: unknown } = { current: null };
vi.mock("@/lib/context", async (orig) => ({ ...(await orig<typeof import("@/lib/context")>()), getTenantContext: async () => ctxRef.current }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, unstable_update: async () => null }));
vi.mock("next/server", () => ({ after: () => {} }));
const r2 = vi.hoisted(() => ({ saida: "" }));
vi.mock("@/lib/storage/r2", () => ({
  isR2Configured: () => true,
  getObjectBytes: async (k: string) => new TextEncoder().encode(`conteudo de ${k}`),
  putObjectFile: async (_k: string, caminho: string) => {
    await copyFile(caminho, r2.saida);
    return (await readFile(caminho)).byteLength;
  },
  presignDownload: async (k: string) => `https://r2.exemplo/${k}`,
}));

const ler = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("GA-2B §7.2 — página pública de entrada (/)", () => {
  it("sem Scaffold, sem Next.js, sem Drizzle (nem Auth.js, Coolify ou Fase 0)", async () => {
    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(createElement(Home));
    expect(html).toContain("Growth");
    expect(html).toContain("Abrir o app");
    for (const t of ["Scaffold", "Next.js", "Drizzle", "Auth.js", "Coolify", "Fase 0"]) expect(html, t).not.toContain(t);
  });
});

describe("GA-2B §7.3 — cartão “Montar outra análise” (habilitado: abre a Cris)", () => {
  it("o pedido leva a frase e o recorte da tela (projeto, versões e período)", async () => {
    const { pedidoDeAnalise, PEDIDO_MONTAR_ANALISE } = await import("@/lib/montar-analise");
    const { textoDoRecorte } = await import("@/lib/dashboard-tela");
    expect(PEDIDO_MONTAR_ANALISE).toBe("Quero montar uma análise. Me ajude a escolher os dados.");
    const recorte = textoDoRecorte({ projetos: 1, nomeDoProjeto: "Rodovia", versoes: ["Atual (“Atual”)"], de: "01/01/2026", ate: "06/30/2026" });
    const p = pedidoDeAnalise("Dashboard", recorte);
    expect(p.startsWith(PEDIDO_MONTAR_ANALISE)).toBe(true);
    expect(p).toContain("Tela: Dashboard · Projeto Rodovia · versões: Atual");
    expect(p).toContain("período de 01/01/2026 a 30/06/2026");
    expect(CODIGO_INTERNO.test(p)).toBe(false);
  });

  it.each([
    ["src/components/app/assistente-dashboard.tsx", "Dashboard"],
    ["src/components/app/assistente-resumo.tsx", "Resumo Executivo"],
  ])("%s: o cartão chama a Cris com o pedido; sem IA mostra a mensagem do app; nada desabilitado com explicação técnica", (arquivo, tela) => {
    const f = ler(arquivo);
    const i = f.indexOf('titulo="Montar outra análise"');
    expect(i).toBeGreaterThan(0);
    const bloco = f.slice(f.lastIndexOf("<Acao", i), f.indexOf("</Acao>", i));
    expect(bloco).not.toMatch(/desabilitada/);
    expect(bloco).toContain(`cris?.perguntar(pedidoDeAnalise("${tela}", recorte))`);
    expect(bloco).toMatch(/if \(!aiConfigured\) return setSemIa/);
    expect(bloco).toContain("{MENSAGEM_CRIS_SEM_IA}");
    expect(f).not.toMatch(/Indisponível: depende/);
  });

  it("as duas páginas passam o recorte e se a IA está configurada", () => {
    expect(ler("src/app/(app)/dashboard/page.tsx")).toMatch(/<AssistenteDashboard [^>]*recorte=\{recorte\} aiConfigured=\{isAiConfigured\(\)\}/);
    expect(ler("src/app/(app)/resumo/page.tsx")).toMatch(/<AssistenteResumo [^>]*recorte=\{textoDoRecorte\(/);
    expect(ler("src/app/(app)/resumo/page.tsx")).toMatch(/<AssistenteResumo [^>]*aiConfigured=\{isAiConfigured\(\)\}/);
  });

  it("a mensagem sem IA é a mesma do resto do app", async () => {
    const { MENSAGEM_CRIS_SEM_IA } = await import("@/lib/cris-sem-ia");
    expect(MENSAGEM_CRIS_SEM_IA).toBe("A Cris precisa da IA configurada (Configurações → Diagnóstico de IA).");
  });
});

describe("GA-2B §7.4 — blocos pendentes do Resumo", () => {
  it("Resultado e Caixa têm o texto novo com o link; Comparativo continua; Execução saiu", async () => {
    const { BLOCOS_PENDENTES } = await import("@/lib/resumo-blocos");
    expect(BLOCOS_PENDENTES.resultado).toEqual({
      texto: "O resultado por competência deste resumo está em revisão. Para a margem por contrato e projeto, veja a DRE.",
      link: { href: "/dre", rotulo: "DRE" },
    });
    expect(BLOCOS_PENDENTES.caixa).toEqual({ texto: "Saldo de hoje e projeção do caixa: veja o Fluxo de Caixa.", link: { href: "/fluxocaixa", rotulo: "Fluxo de Caixa" } });
    expect(BLOCOS_PENDENTES.comparativo.texto).toMatch(/^Comparativo entre projetos: aparece quando/);
    expect(Object.keys(BLOCOS_PENDENTES)).toEqual(["resultado", "caixa", "comparativo"]);
    for (const b of Object.values(BLOCOS_PENDENTES)) expect(CODIGO_INTERNO.test(b.texto), b.texto).toBe(false);
  });

  it("a tela mostra o link do bloco e não mostra mais a nota de Execução; a margem do Comparativo sem código", () => {
    const f = ler("src/app/(app)/resumo/page.tsx");
    expect(f).toContain("{bloco.link.rotulo} →");
    expect(f).toContain("href={`${bloco.link.href}${q}`}");
    expect(f).not.toMatch(/BLOCOS_PENDENTES\.execucao/);
    expect(f).toContain("A margem não entra neste total.");
  });

  it("o painel do Assistente do Resumo explica Resultado e Caixa com o mesmo texto novo", async () => {
    const { analisarResumo } = await import("@/lib/resumo-analise");
    const { BLOCOS_PENDENTES } = await import("@/lib/resumo-blocos");
    const a = analisarResumo({
      obra: "P",
      versao: "Atual",
      definicaoNova: true,
      indicadores: [],
      unidades: { total: 0, vendidas: 0 },
      servicos: null,
      vendas: null,
      exposicao: null,
      atencao: null,
      recorte: "x",
      fmt: (n: number) => String(n),
    } as unknown as Parameters<typeof analisarResumo>[0]);
    const textos = a.explicacoes.map((e) => e.texto);
    expect(textos).toContain(BLOCOS_PENDENTES.resultado.texto);
    expect(textos).toContain(BLOCOS_PENDENTES.caixa.texto);
    for (const t of textos) expect(CODIGO_INTERNO.test(t), t).toBe(false);
  });
});

describe("GA-2B §7.6 — a Cris aprende a regra", () => {
  it("a instrução do sistema traz a regra da §5 e não cita mais (Etapa 7)", async () => {
    const { regrasDaCris } = await import("@/lib/cris");
    const r = regrasDaCris();
    expect(r).toContain("Nunca cite códigos internos de desenvolvimento (como 'Prompt', 'BA-', '§') nem diga que algo 'aguarda decisão'. Se uma função não estiver disponível, diga o que o usuário pode usar no lugar.");
    expect(r).not.toContain("(Etapa 7)");
    // fora a própria regra, nada da instrução casa o padrão
    const semARegra = r.split("\n").filter((l) => !l.startsWith("- Nunca cite códigos internos"));
    expect(semARegra.filter((l) => CODIGO_INTERNO.test(l))).toEqual([]);
  });
});

const HAS_DB = !!process.env.DATABASE_URL;
describe.skipIf(!HAS_DB)("GA-2B §7.5 — backup: o texto do pacote gerado não tem código interno", async () => {
  const JSZip = (await import("jszip")).default;
  const { db, schema } = await import("@/lib/db");
  const { gerarPacote } = await import("./backup-geracao");
  let tenantId = "";

  beforeAll(async () => {
    r2.saida = join(await mkdtemp(join(tmpdir(), "teste-ga2b-")), "pacote.zip");
    tenantId = (await db.insert(schema.tenants).values({ name: "Empresa GA-2B" }).returning())[0].id;
    const [p] = await db.insert(schema.projects).values({ tenantId, name: "PROJETO" }).returning();
    const [v] = await db.insert(schema.versions).values({ projectId: p.id, tenantId, key: "atual", kind: "atual", label: "Atual", color: "#000" }).returning();
    await db.insert(schema.despesas).values({ tenantId, versionId: v.id, valor: "100", categoriaDre: "Custo Variável", status: "Pago", competencia: "03/2026" });
    // Cliente com dado sensível e funcionário com endereço e salário: as colunas ficam fora, com o motivo.
    await db.insert(schema.clientes).values({ tenantId, nomeCompleto: "Cliente Teste", cpfCnpj: "12345678909", rendaBruta: "9000", estadoCivil: "Casada" });
    await db.insert(schema.funcionarios).values({ tenantId, nome: "Funcionário Teste", salario: "5000", endereco: "Rua A" });
    await db.insert(schema.documents).values([
      { tenantId, storageKey: "k/nota", filename: "nota.pdf", tipo: "Nota Fiscal", uploadedAt: new Date(2026, 2, 5) },
      { tenantId, storageKey: "k/aso", filename: "aso.pdf", tipo: "ASO — exame admissional", uploadedAt: new Date(2026, 2, 6) },
    ]);
  });
  afterAll(async () => {
    if (tenantId) await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it("leia-me e manifesto: o motivo das omissões fala em proteção de dados, sem código interno", async () => {
    const [{ id }] = await db.insert(schema.backupPacotes).values({ tenantId, semestre: "2026-H1" }).returning();
    await gerarPacote(id);
    const [reg] = await db.select().from(schema.backupPacotes).where(eq(schema.backupPacotes.id, id));
    expect(reg.status).toBe("pronto");
    const zip = await JSZip.loadAsync(await readFile(r2.saida));
    const leiaMe = await zip.file("_leia-me.txt")!.async("string");
    const manifesto = await zip.file("_manifesto.json")!.async("string");
    expect(leiaMe).toContain("não incluído no backup (proteção de dados, LGPD)");
    expect(leiaMe).toMatch(/1 documento\(s\) de ASO .* não incluído no backup \(proteção de dados, LGPD\)/);
    const linhas = [...leiaMe.split("\n"), ...manifesto.split("\n")];
    expect(linhas.filter((l) => CODIGO_INTERNO.test(l))).toEqual([]);
    // o resumo guardado (que a tela de Backup mostra) também
    expect(CODIGO_INTERNO.test(JSON.stringify(reg.resumo))).toBe(false);
  });
});
