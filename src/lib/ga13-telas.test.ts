import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { primeiroProjetoAtivo, TODOS_OS_PROJETOS } from "@/lib/projeto-selecao";

/**
 * GA-13 Lote 4 — layout. A prova visual (prints em 1280, 1440 e 1920 px, e as
 * telas abrindo com dados) está em `scripts/verificar-cabecalho.cjs` e no
 * relatório; aqui ficam as regras que a suíte consegue garantir.
 */
const ler = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("GA-13 H1 — cabeçalho não espreme o título", () => {
  it("título com largura mínima; filtros quebram para baixo (e entre si), sem shrink-0", () => {
    const f = ler("src/components/app/page-header.tsx");
    expect(f).toMatch(/<header className="[^"]*flex-wrap[^"]*"/);
    expect(f).toMatch(/flex-\[1_1_22rem\]/);
    expect(f).toMatch(/data-page-header-acoes/);
    const acoes = f.slice(f.indexOf("{actions &&"));
    expect(acoes).toMatch(/flex-wrap/);
    expect(acoes).not.toMatch(/shrink-0/);
    expect(f).not.toMatch(/sm:flex-row/);
  });
});

describe("GA-13 H2 — telas não abrem vazias pedindo projeto", () => {
  const p = (id: string, situacao: string | null, kind = "proj") => ({ id, situacao, kind });

  it("primeiro projeto ativo: Ativo antes; sem ativo, o primeiro não escritório; sem projeto, null", () => {
    expect(primeiroProjetoAtivo([p("a", "Finalizado"), p("b", "Ativo"), p("c", "Ativo")])?.id).toBe("b");
    expect(primeiroProjetoAtivo([p("esc", "Ativo", "office"), p("b", "Ativo")])?.id).toBe("b");
    expect(primeiroProjetoAtivo([p("esc", null, "office"), p("a", "Finalizado")])?.id).toBe("a");
    expect(primeiroProjetoAtivo([p("esc", null, "office")])?.id).toBe("esc");
    expect(primeiroProjetoAtivo([])).toBeNull();
  });

  it("Despesas: sem projeto lembrado, abre em Todos", () => {
    expect(ler("src/app/(app)/despesas/page.tsx")).toMatch(/<RecuperarProjeto idsPermitidos=\{[^}]+\} semMemoria=\{TODOS_OS_PROJETOS\}>/);
    expect(TODOS_OS_PROJETOS).toBe("all");
  });

  it("Equipes (um projeto só): abre no último usado ou no primeiro ativo", () => {
    const f = ler("src/app/(app)/equipes/page.tsx");
    expect(f).toMatch(/<RecuperarProjeto idsPermitidos=\{[^}]+\} semMemoria=\{primeiroProjetoAtivo\(ctx\.projects\)\?\.id\}>/);
    expect(f).not.toMatch(/>Selecione um projeto\.</);
  });

  it("PedirProjeto (Resumo, Orçamentos, Previsão, Plano, Ressarcimentos): Todos quando há a opção; senão, o primeiro ativo", () => {
    expect(ler("src/components/app/pedir-projeto.tsx")).toMatch(/semMemoria=\{allOption \? TODOS_OS_PROJETOS : primeiroProjetoAtivo\(projetos\)\?\.id\}/);
    expect(ler("src/app/(app)/resumo/page.tsx")).toMatch(/<PedirProjeto titulo="Resumo Executivo"[^>]*allOption \/>/);
  });

  it("Dashboard, DRE, Fluxo de Caixa (e os analíticos) já abriam em Todos", () => {
    for (const f of ["dashboard", "dre", "fluxocaixa", "fluxocaixa/analitico", "dre/analitica"]) {
      expect(ler(`src/app/(app)/${f}/page.tsx`), f).toMatch(/semMemoria=\{TODOS_OS_PROJETOS\}/);
    }
  });
});

describe("GA-13 H3 — telas pesadas mostram o esqueleto em vez de ficar em branco", () => {
  it("o RecuperarProjeto (que decide o projeto da tela) mostra o esqueleto enquanto decide e carrega, não nada", () => {
    const f = ler("src/components/app/projeto-da-aba.tsx");
    expect(f).toMatch(/return semMemoria \? <>\{children\}<\/> : <EsqueletoDeTela /);
    expect(f).not.toMatch(/return semMemoria \? <>\{children\}<\/> : null;/);
  });

  it.each([
    ["dashboard", "Dashboard"],
    ["dre", "DRE"],
    ["fluxocaixa", "Fluxo de Caixa"],
    ["fluxocaixa/analitico", "Fluxo de Caixa Analítico"],
    ["dre/analitica", "DRE Analítica"],
  ])("/%s: o esqueleto traz o título da tela", (rota, titulo) => {
    expect(ler(`src/app/(app)/${rota}/page.tsx`)).toMatch(new RegExp(`semMemoria=\\{TODOS_OS_PROJETOS\\}\\s+titulo="${titulo}"`));
  });

  it("sem loading.tsx: a fronteira de Suspense dele travava navegações (abas do Caixa, Todos da DRE) — ver o relatório", () => {
    for (const d of ["(app)", "(app)/fluxocaixa", "(app)/dre", "(app)/dashboard", "(app)/resumo", "(app)/caixa"]) {
      expect(existsSync(join(process.cwd(), `src/app/${d}/loading.tsx`)), d).toBe(false);
    }
  });
});
