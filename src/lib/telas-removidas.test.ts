import { readFileSync, existsSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { TELAS_REMOVIDAS, avisoDeTelaRemovida, redirecionamentosDeTelasRemovidas } from "./telas-removidas";
import { SCREEN_IDS, defaultPermissions, effectivePermissions, overridesDivergentes, screenIdOfPath, type PermMatrix } from "./permissions";
import { NAV_MENU } from "./nav-menu";

describe("Prompt AL · Parte 1 — a tela Acesso Contabilidade sai", () => {
  it("1 — /contabilidade redireciona para /usuarios com o aviso (BAL-3); next.config tem as mesmas regras", () => {
    const cfg = readFileSync("next.config.ts", "utf8");
    for (const r of redirecionamentosDeTelasRemovidas()) {
      expect(cfg).toContain(`{ source: "${r.source}", destination: "${r.destination}", permanent: false }`);
    }
    expect(redirecionamentosDeTelasRemovidas().map((r) => r.source)).toEqual(
      [
        "/contabilidade",
        "/versao",
        "/diagnostico/planos-recebiveis",
        "/consolidado",
        "/balancodia",
        "/unidades",
        "/simulador",
        "/permuta",
        "/parametros",
        "/medicao",
        "/medicaolanc",
        "/reembolso",
        "/projecao",
      ].flatMap((r) => [r, `${r}/:path*`]),
    );
    expect(avisoDeTelaRemovida("contabilidade")).toMatch(/Acesso Contabilidade saiu/);
    expect(avisoDeTelaRemovida(["contabilidade"])).toBe(TELAS_REMOVIDAS.contabilidade.aviso);
    expect(avisoDeTelaRemovida(undefined)).toBeNull();
    expect(avisoDeTelaRemovida("toString")).toBeNull();
    expect(avisoDeTelaRemovida("dre")).toBeNull();
  });

  it("1.4 — a página não existe mais (nenhuma rota fica sem id de permissão)", () => {
    expect(existsSync("src/app/(app)/contabilidade/page.tsx")).toBe(false);
    expect(SCREEN_IDS).not.toContain("contabilidade");
    expect(screenIdOfPath("/contabilidade")).toBeNull();
  });

  it("2 — nenhum item de menu aponta para ela", () => {
    expect(NAV_MENU.flatMap((m) => m.items).some((i) => i.href.startsWith("/contabilidade"))).toBe(false);
  });

  it("3 — varredura: nenhuma menção restante à rota ou ao id no código", () => {
    // fora deste módulo (que guarda o redirecionamento) e dos testes
    const arquivos = [
      "src/lib/permissions.ts",
      "src/lib/nav-menu.ts",
      "src/lib/actions/users.ts",
      "src/app/(app)/usuarios/page.tsx",
      "src/app/(app)/acessos/page.tsx",
      "src/components/app/access-matrix.tsx",
    ];
    for (const f of arquivos) {
      const txt = readFileSync(f, "utf8");
      expect(txt, f).not.toMatch(/["'`]\/contabilidade/);
      expect(txt, f).not.toMatch(/inviteContador/);
    }
  });

  it("5 — override gravado para `contabilidade` é inerte: não muda nenhuma célula efetiva", () => {
    const comOrfa: PermMatrix = { contabilidade: { ver: true, criar: true, editar: true, excluir: true } };
    for (const role of ["membro", "contador", "engenheiro"] as const) {
      expect(effectivePermissions(role, comOrfa)).toEqual(effectivePermissions(role, null));
      expect(effectivePermissions(role, comOrfa)).not.toHaveProperty("contabilidade");
    }
  });

  it("8.2 — owner, admin, membro e engenheiro: nenhuma célula das telas que ficam muda", () => {
    for (const role of ["owner", "admin", "membro", "engenheiro"] as const) {
      const p = defaultPermissions(role);
      expect(Object.keys(p).sort()).toEqual([...SCREEN_IDS].sort());
    }
  });
});

describe("Prompt AN · Partes 5 e 6 — Conferência com id próprio; a de planos sai", () => {
  it("16a — /diagnostico/planos-recebiveis não existe mais, redireciona para Contas a Receber com o aviso (as unidades saíram), e nenhum menu aponta para ela", () => {
    expect(existsSync("src/app/(app)/diagnostico/planos-recebiveis/page.tsx")).toBe(false);
    expect(avisoDeTelaRemovida("planos-recebiveis")).toMatch(/Conferência de planos de venda saiu.*Contas a Receber/);
    expect(NAV_MENU.flatMap((m) => m.items).some((i) => i.href.startsWith("/diagnostico/"))).toBe(false);
  });

  it("17 — a Conferência mora em /conferencia, tem id em SCREENS e passa pelo enforcement central; a URL antiga redireciona", () => {
    expect(existsSync("src/app/(app)/conferencia/page.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/diagnostico/categorias-invertidas/page.tsx")).toBe(false);
    expect(screenIdOfPath("/conferencia")).toBe("conferencia");
    expect(readFileSync("next.config.ts", "utf8")).toContain('{ source: "/diagnostico/categorias-invertidas", destination: "/conferencia", permanent: false }');
  });

  it("18 — a checagem própria continua: a página exige conferencia E despesas", () => {
    const src = readFileSync("src/app/(app)/conferencia/page.tsx", "utf8");
    expect(src).toContain('can(ctx.perms, "conferencia", "ver")');
    expect(src).toContain('can(ctx.perms, "despesas", "ver")');
  });

  it("19 — quem alcançava continua alcançando: conferencia = despesas, célula a célula, para todo papel e override", () => {
    const overrides: (PermMatrix | null)[] = [
      null,
      { despesas: { ver: false, criar: false, editar: false, excluir: false } },
      { despesas: { ver: true, criar: false, editar: false, excluir: false } },
      { despesas: { ver: true, criar: true, editar: true, excluir: true } },
      // override gravado na própria chave não vale
      { conferencia: { ver: true, criar: true, editar: true, excluir: true }, despesas: { ver: false, criar: false, editar: false, excluir: false } },
    ];
    for (const role of ["owner", "admin", "membro", "contador", "engenheiro"] as const)
      for (const restrito of [false, true])
        for (const o of overrides) {
          const e = effectivePermissions(role, o, { membroRestrito: restrito });
          expect(e.conferencia, `${role} ${JSON.stringify(o)}`).toEqual(e.despesas);
        }
  });

  it("a tela que acompanha outra não é gravada como override", () => {
    const m = defaultPermissions("membro");
    m.conferencia = { ver: false, criar: false, editar: false, excluir: false };
    expect(overridesDivergentes("membro", m)).not.toHaveProperty("conferencia");
  });
});

describe("Prompt AP — a tela Configuração da Versão sai", () => {
  it("1/11 — /versao não existe mais como página nem rota; redireciona para Projetos com aviso, e os downloads para os novos endereços", () => {
    for (const f of ["src/app/(app)/versao/page.tsx", "src/app/(app)/versao/export/route.ts", "src/app/(app)/versao/template/route.ts"]) expect(existsSync(f), f).toBe(false);
    expect(SCREEN_IDS).not.toContain("versao");
    expect(screenIdOfPath("/versao")).toBeNull();
    const cfg = readFileSync("next.config.ts", "utf8");
    const i = (x: string) => cfg.indexOf(x);
    expect(i('{ source: "/versao/export", destination: "/projeto/planilha/exportar", permanent: false }')).toBeGreaterThan(-1);
    expect(i('{ source: "/versao/template", destination: "/projeto/planilha/modelo", permanent: false }')).toBeGreaterThan(-1);
    // os específicos vêm antes do genérico
    expect(i('source: "/versao/export"')).toBeLessThan(i('source: "/versao/:path*"'));
    expect(avisoDeTelaRemovida("versao")).toMatch(/Configuração da Versão saiu.*Versões do projeto/);
    expect(existsSync("src/app/(app)/projeto/planilha/exportar/route.ts")).toBe(true);
    expect(existsSync("src/app/(app)/projeto/planilha/modelo/route.ts")).toBe(true);
  });

  it("1.2/1.4 — as actions de criar, excluir, renomear e marcar padrão saíram; a trava ficou em travarVersao", () => {
    expect(existsSync("src/lib/actions/versions.ts")).toBe(false);
    expect(existsSync("src/components/app/version-identity.tsx")).toBe(false);
    expect(existsSync("src/lib/actions/versao-trava.ts")).toBe(true);
    expect(SCREEN_IDS).toContain("versaotrava");
  });

  it("2 — nenhuma menção restante à rota em href, redirect ou revalidatePath", () => {
    const arquivos = [
      "src/components/app/budget-planning-screen.tsx",
      "src/components/app/versoes-do-projeto.tsx",
      "src/app/(app)/projeto/page.tsx",
      "src/lib/actions/version-io.ts",
      "src/lib/actions/versao-trava.ts",
      "src/lib/nav-menu.ts",
    ];
    for (const f of arquivos) expect(readFileSync(f, "utf8"), f).not.toMatch(/["'`]\/versao(["'`/?])/);
  });

  it("a permissão da trava nasce só com owner e admin", () => {
    for (const role of ["owner", "admin"] as const) expect(defaultPermissions(role).versaotrava.editar).toBe(true);
    for (const role of ["membro", "contador", "engenheiro"] as const) {
      expect(defaultPermissions(role).versaotrava.ver, role).toBe(false);
      expect(defaultPermissions(role, { membroRestrito: true }).versaotrava.ver, role).toBe(false);
    }
  });
});

describe("Prompt AB2 — Consolidado e Balanço do Dia saem", () => {
  it("as páginas não existem mais; as rotas redirecionam com o aviso em ?saiu= (o destino usa ?de= como data)", () => {
    expect(existsSync("src/app/(app)/consolidado/page.tsx")).toBe(false);
    expect(existsSync("src/app/(app)/balancodia/page.tsx")).toBe(false);
    const cfg = readFileSync("next.config.ts", "utf8");
    expect(cfg).toContain('{ source: "/consolidado", destination: "/contratos/painel?saiu=consolidado", permanent: false }');
    expect(cfg).toContain('{ source: "/balancodia", destination: "/caixa?saiu=balancodia", permanent: false }');
    expect(avisoDeTelaRemovida("consolidado")).toMatch(/Consolidado saiu.*Painel de Contratos/);
    expect(avisoDeTelaRemovida("balancodia")).toMatch(/Balanço do Dia saiu.*Dias fechados/);
  });

  it("nenhum item de menu aponta para elas", () => {
    const hrefs = NAV_MENU.flatMap((m) => m.items).map((i) => i.href);
    expect(hrefs).not.toContain("/consolidado");
    expect(hrefs).not.toContain("/balancodia");
  });

  it("a chave do Consolidado sai; a do Balanço do Dia fica e governa os dias fechados no Caixa", () => {
    expect(SCREEN_IDS).not.toContain("consolidado");
    expect(screenIdOfPath("/consolidado")).toBeNull();
    expect(SCREEN_IDS).toContain("balancodia");
    const caixa = readFileSync("src/app/(app)/caixa/page.tsx", "utf8");
    expect(caixa).toContain('can(ctx.perms, "balancodia", "ver")');
    expect(caixa).toContain("data-dias-fechados");
  });

  it("override gravado para `consolidado` é inerte", () => {
    const comOrfa: PermMatrix = { consolidado: { ver: true, criar: true, editar: true, excluir: true } };
    for (const role of ["membro", "contador", "engenheiro"] as const) {
      expect(effectivePermissions(role, comOrfa)).toEqual(effectivePermissions(role, null));
    }
  });

  it("nenhuma menção restante às rotas em href, redirect ou revalidatePath", () => {
    for (const f of ["src/lib/nav-menu.ts", "src/lib/actions/fechamento.ts"]) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(/["'`]\/(consolidado|balancodia)["'`/?]/);
    }
  });
});

describe("Growth Ambiental — módulos de construção e incorporação saem", () => {
  const SAIRAM = {
    unidades: { rota: "/unidades", destino: "/contasreceber" },
    simulador: { rota: "/simulador", destino: "/contratos" },
    permuta: { rota: "/permuta", destino: "/contasreceber" },
    parametros: { rota: "/parametros", destino: "/contratos" },
    medicao: { rota: "/medicao", destino: "/contratos/medicoes" },
    medicaolanc: { rota: "/medicaolanc", destino: "/contratos/medicoes" },
    reembolso: { rota: "/reembolso", destino: "/contratos/reembolsos" },
    projecao: { rota: "/projecao", destino: "/contratos/painel" },
  } as const;

  it("1–6 — as páginas não existem mais; a rota (e as sub-rotas) redireciona para a tela que assumiu, com o aviso", () => {
    const cfg = readFileSync("next.config.ts", "utf8");
    for (const [id, t] of Object.entries(SAIRAM)) {
      expect(existsSync(`src/app/(app)${t.rota}/page.tsx`), id).toBe(false);
      expect(cfg, id).toContain(`{ source: "${t.rota}", destination: "${t.destino}?saiu=${id}", permanent: false }`);
      expect(cfg, id).toContain(`{ source: "${t.rota}/:path*", destination: "${t.destino}?saiu=${id}", permanent: false }`);
      expect(avisoDeTelaRemovida(id), id).toBeTruthy();
      // a tela de destino mostra o aviso
      const destino = readFileSync(`src/app/(app)${t.destino}/page.tsx`, "utf8");
      expect(destino, t.destino).toContain("<AvisoTelaRemovida de={sp.saiu} />");
    }
    expect(existsSync("src/app/api/agent/unidades/route.ts")).toBe(false);
  });

  it("as chaves saem de SCREENS (não aparecem em Gestão de Acessos) e nenhuma rota fica sem id", () => {
    for (const [id, t] of Object.entries(SAIRAM)) {
      expect(SCREEN_IDS, id).not.toContain(id);
      expect(screenIdOfPath(t.rota), id).toBeNull();
    }
  });

  it("override gravado para essas chaves é inerte", () => {
    const comOrfas: PermMatrix = Object.fromEntries(Object.keys(SAIRAM).map((id) => [id, { ver: true, criar: true, editar: true, excluir: true }]));
    for (const role of ["owner", "admin", "membro", "contador", "engenheiro"] as const) expect(effectivePermissions(role, comOrfas)).toEqual(effectivePermissions(role, null));
  });

  it("nenhum item de menu aponta para elas", () => {
    const hrefs = NAV_MENU.flatMap((m) => m.items).map((i) => i.href);
    for (const t of Object.values(SAIRAM)) expect(hrefs.some((h) => h === t.rota || h.startsWith(`${t.rota}/`)), t.rota).toBe(false);
  });

  it("as ações de servidor exclusivas desses módulos saíram (nada as chama por acesso direto)", () => {
    for (const f of ["units", "unidades-assistente", "receitas", "permuta-assistente", "incc", "medicao", "medicao-docs", "medicao-assistente"])
      expect(existsSync(`src/lib/actions/${f}.ts`), f).toBe(false);
  });
});
