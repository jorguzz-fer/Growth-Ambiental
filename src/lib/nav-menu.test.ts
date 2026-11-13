import { describe, it, expect } from "vitest";
import { SCREEN_IDS, defaultPermissions, effectivePermissions, type PermMatrix } from "./permissions";
import {
  NAV_MENU,
  activeModuleId,
  isItemActive,
  permOf,
  roleLabel,
  visibleMenu,
} from "./nav-menu";

/**
 * O menu antigo (sidebar.tsx antes do Prompt C), item a item: rota → chave de
 * permissão. É a referência de não regressão — nenhuma tela pode sumir e
 * nenhuma pode mudar de chave (seções 21 e 26 do Prompt C).
 */
const MENU_ANTIGO: Record<string, string> = {
  "/budget": "budget",
  "/forecast": "forecast",
  "/planocontas": "planocontas",
  "/unidades": "unidades",
  "/contasreceber": "contasreceber",
  "/clientes": "clientes",
  "/simulador": "simulador",
  "/reembolso": "reembolso",
  "/permuta": "permuta",
  "/parametros": "parametros",
  "/despesas": "despesas",
  "/contaspagar": "contaspagar",
  "/restituicoes": "restituicoes",
  "/acerto": "despesas",
  "/medicaolanc": "medicaolanc",
  "/fornecedores": "fornecedores",
  "/contas": "contas",
  "/estoque": "estoque",
  // "/ponto" saiu no Prompt Z (Parte 1): o módulo Pessoas substitui o ponto por
  // geolocalização. `time_entry` fica no banco.
  "/caixa": "caixa",
  // "/fechamento" saiu no Prompt L, Parte 9: fechar o dia é ação no cartão do
  // Caixa e o histórico já é o Balanço do Dia (9.8). A chave "fechamento" fica.
  "/dashboard": "dashboard",
  "/projecao": "projecao",
  "/consolidado": "consolidado",
  "/balancodia": "balancodia",
  "/dre": "dre",
  "/fluxocaixa": "fluxocaixa",
  "/medicao": "medicao",
  "/resumo": "resumo",
  "/projeto": "projeto",
  "/numeracao": "numeracao",
  "/empresa": "empresa",
  "/usuarios": "usuarios",
  "/acessos": "acessos",
  "/acoes": "acoes",
  "/contabilidade": "contabilidade",
  "/diagnosticoia": "diagnosticoia",
  "/diagnostico/categorias-invertidas": "despesas",
  "/diagnostico/planos-recebiveis": "unidades",
  "/backup": "backup",
};

/** Telas que entraram no menu depois dele, cada uma com a sua chave. */
const TELAS_NOVAS: Record<string, string> = {
  "/chaves": "chaves", // V2-BLOQUEIOS B4
  "/cartoes": "cartoes", // Prompt U, seção 1
  "/funcionarios": "funcionarios", // Prompt Z, Parte 2
  "/equipes": "equipes", // Prompt Z, Parte 3
  "/conferencia": "conferencia", // Prompt AN, Parte 5 (era /diagnostico/categorias-invertidas)
  "/notasfiscais": "notasfiscais", // Prompt AG: NFS-e emitida, última seção de Receitas
  "/dre/analitica": "dre", // Prompt AC3: mora sob /dre, mesma permissão
  "/dre/contratos": "dre", // Implementação integrada: DRE por contrato e cliente (exige também contratos:ver)
  "/fluxocaixa/analitico": "fluxocaixa", // Prompt AD3: mora sob /fluxocaixa, mesma permissão
  "/relatorios": "relatorios", // Prompt RC: tela nova, chave própria
  // Growth Ambiental — módulo Contratos: tudo sob /contratos, uma chave de rota.
  "/contratos": "contratos",
  "/contratos/painel": "contratos",
  "/contratos/aditivos": "contratos",
  "/contratos/medicoes": "contratos",
  "/contratos/reembolsos": "contratos",
  "/contratos/modalidades": "contratos",
  // Growth Ambiental — Planejamento de projetos.
  "/plano": "plano",
  "/modelos": "modelos",
};
/**
 * Prompt V, 0.2: /medicaolanc SAIU do menu (continua rota e aba da tela única
 * de Medição de Obra). O item /medicao aparece para quem tem `medicao` OU
 * `medicaolanc` — o engenheiro continua vendo o módulo Projetos (antigo Obra).
 */
const FUNDIDAS_NO_ITEM: Record<string, string> = {};
/** Prompt AL: /contabilidade saiu do sistema (virou redirecionamento para /usuarios). */
const SAIRAM = new Set([
  "/medicaolanc",
  "/contabilidade",
  // Prompt AN: a Conferência de lançamentos mudou para /conferencia; a de planos saiu.
  "/diagnostico/categorias-invertidas",
  "/diagnostico/planos-recebiveis",
  // Prompt AB2: Consolidado e Balanço do Dia saíram (redirecionamento com aviso).
  "/consolidado",
  "/balancodia",
  // Growth Ambiental: módulos de construção e incorporação (telas-removidas.ts).
  "/unidades",
  "/simulador",
  "/reembolso",
  "/permuta",
  "/parametros",
  "/medicao",
  "/projecao",
]);
const ESPERADO = Object.fromEntries(Object.entries({ ...MENU_ANTIGO, ...TELAS_NOVAS }).filter(([href]) => !SAIRAM.has(href)));

const todos = NAV_MENU.flatMap((m) => m.items);

describe("NAV_MENU — nenhuma tela se perde", () => {
  it("tem as 38 telas do menu antigo (40 menos /fechamento e /ponto) menos /medicaolanc (fundida, Prompt V) e /contabilidade (removida, Prompt AL), mais as novas declaradas, sem duplicata", () => {
    const hrefs = todos.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect([...hrefs].sort()).toEqual(Object.keys(ESPERADO).sort());
    expect(Object.keys(MENU_ANTIGO)).toHaveLength(38);
  });

  it("Growth Ambiental: a medição é do contrato — um item só, que aparece para o engenheiro (sem o financeiro)", () => {
    expect(todos.filter((i) => /medic/.test(i.href)).map((i) => i.href)).toEqual(["/contratos/medicoes"]);
    expect(todos.find((i) => i.href === "/contratos/medicoes")!.label).toBe("Medições");
    const eng = visibleMenu(defaultPermissions("engenheiro")).flatMap((m) => m.items.map((i) => i.href));
    expect(eng).toContain("/contratos/medicoes");
    expect(eng).not.toContain("/contratos/reembolsos"); // exige o financeiro do contrato
    expect(defaultPermissions("engenheiro").contratosfinanceiro?.ver ?? false).toBe(false);
  });

  it("Growth Ambiental: nenhum item aponta para módulo de construção ou incorporação", () => {
    for (const r of ["/unidades", "/simulador", "/permuta", "/parametros", "/medicao", "/medicaolanc", "/reembolso", "/projecao"])
      expect(todos.some((i) => i.href === r || i.href.startsWith(`${r}/`)), r).toBe(false);
    for (const i of todos) expect(i.label, i.href).not.toMatch(/\bobras?\b|unidade|permuta|INCC|libera(ç|c)(õ|o)es de obra|simulador/i);
  });

  it("cada tela mantém a mesma chave de permissão", () => {
    for (const it of todos) expect(permOf(it), it.href).toBe(ESPERADO[it.href]);
  });

  it("toda chave existe em SCREENS (chave errada some para todos ou aparece para todos)", () => {
    for (const it of todos) expect(SCREEN_IDS, it.href).toContain(permOf(it));
  });

  it("não traz /versao ao menu (decisão de exposição fica com o dono)", () => {
    expect(todos.some((i) => i.href.startsWith("/versao"))).toBe(false);
  });
});

/**
 * Prompt AI2 (BAI2-1) — o item some quando a PÁGINA nega: o Acerto Contábil
 * exige editar Despesas e ver o Caixa. Não reduz acesso (a página já negava);
 * tira do menu o link que abria "Acesso negado".
 */
const EXIGE_DA_PAGINA: Record<string, [string, "ver" | "editar"][]> = {
  "/acerto": [["despesas", "editar"], ["caixa", "ver"]],
  "/contratos/reembolsos": [["contratosfinanceiro", "ver"]],
  "/contratos/modalidades": [["contratos", "editar"]],
  "/dre/contratos": [["contratos", "ver"]],
};

/** Visibilidade pela regra de sempre, sobre a lista antiga mais as novas. */
function visiveisAntigo(perms: PermMatrix): string[] {
  return Object.entries(ESPERADO)
    .flatMap(([href, perm]) => {
      if ((EXIGE_DA_PAGINA[href] ?? []).some(([t, a]) => !perms[t]?.[a])) return [];
      if (perms[perm]?.ver) return [href];
      // item fundido: só com a permissão da outra aba, a rota é a dela
      const alt = FUNDIDAS_NO_ITEM[href];
      return alt && perms[alt]?.ver ? [`/${alt}`] : [];
    })
    .sort();
}
function visiveisNovo(perms: PermMatrix): string[] {
  return visibleMenu(perms)
    .flatMap((m) => m.items.map((i) => i.href))
    .sort();
}

describe("visibleMenu — não amplia nem reduz acesso", () => {
  for (const role of ["owner", "admin", "membro", "contador", "engenheiro"] as const) {
    it(`papel ${role}: enxerga exatamente as mesmas telas de antes`, () => {
      const perms = defaultPermissions(role);
      expect(visiveisNovo(perms)).toEqual(visiveisAntigo(perms));
    });
  }

  it("Chaves de mudança: só a plataforma (Prompt PLAT), mesmo com override", () => {
    const ve = (perms: PermMatrix) => visiveisNovo(perms).includes("/chaves");
    expect(ve(defaultPermissions("owner"))).toBe(false);
    expect(ve(defaultPermissions("admin"))).toBe(false);
    expect(ve(effectivePermissions("owner", null, { operadorDaPlataforma: true }))).toBe(true);
    for (const role of ["membro", "contador", "engenheiro"] as const) {
      expect(ve(defaultPermissions(role)), role).toBe(false);
      const override = { chaves: { ver: true, criar: true, editar: true, excluir: true } };
      expect(ve(effectivePermissions(role, override)), `${role} com override`).toBe(false);
    }
  });

  it("matriz personalizada: o mesmo conjunto de antes", () => {
    const perms = defaultPermissions("contador");
    perms.clientes = { ver: true, criar: false, editar: false, excluir: false };
    perms.dre = { ver: false, criar: false, editar: false, excluir: false };
    expect(visiveisNovo(perms)).toEqual(visiveisAntigo(perms));
  });

  it("módulo sem item visível some inteiro", () => {
    const mods = visibleMenu(defaultPermissions("engenheiro")).map((m) => m.id);
    expect(mods).toEqual(["contratos"]);
  });

  it("sem permissão nenhuma, menu vazio", () => {
    expect(visibleMenu({})).toEqual([]);
  });
});

describe("isItemActive — prefixo na fronteira de segmento", () => {
  it("sub-rotas mantêm o pai destacado", () => {
    expect(isItemActive("/clientes/novo", "/clientes")).toBe(true);
    expect(isItemActive("/clientes/abc-123", "/clientes")).toBe(true);
    expect(isItemActive("/contratos/novo", "/contratos")).toBe(true);
    expect(isItemActive("/notasfiscais/nova", "/notasfiscais")).toBe(true);
  });

  it("/contas × /contaspagar × /contasreceber não se destacam mutuamente", () => {
    expect(isItemActive("/contaspagar", "/contas")).toBe(false);
    expect(isItemActive("/contasreceber", "/contas")).toBe(false);
    expect(isItemActive("/contas", "/contaspagar")).toBe(false);
    expect(isItemActive("/contasreceber", "/contaspagar")).toBe(false);
    expect(isItemActive("/contas", "/contas")).toBe(true);
  });

  it("prefixo só na fronteira de segmento (/contratos × /contratosx)", () => {
    expect(isItemActive("/contratosx", "/contratos")).toBe(false);
  });

  it("a Conferência destaca só a si", () => {
    expect(isItemActive("/conferencia", "/conferencia")).toBe(true);
    expect(isItemActive("/conferencia", "/contas")).toBe(false);
  });

  it("nenhum par de itens do menu se destaca ao mesmo tempo (o mais específico vence, Prompt AC3)", async () => {
    const { itemAtivoDoModulo } = await import("./nav-menu");
    for (const x of todos) {
      const ativos = NAV_MENU.map((m) => itemAtivoDoModulo(x.href, m.items)).filter(Boolean);
      expect(ativos, x.href).toEqual([x.href]);
    }
    // Só os analíticos casam com o relatório-pai pelo prefixo; nenhum outro par.
    const pares = todos.flatMap((x) => todos.filter((y) => y !== x && isItemActive(x.href, y.href)).map((y) => `${x.href}>${y.href}`));
    // Contratos: as telas do módulo moram sob /contratos (o mais específico vence).
    const doModulo = ["painel", "aditivos", "medicoes", "reembolsos", "modalidades"].map((t) => `/contratos/${t}>/contratos`);
    expect(pares).toEqual(["/dre/analitica>/dre", "/dre/contratos>/dre", "/fluxocaixa/analitico>/fluxocaixa", ...doModulo]);
  });

  it("/perfil e rota nula não ativam nada", () => {
    expect(activeModuleId("/perfil")).toBeNull();
    expect(activeModuleId(null)).toBeNull();
  });

  it("módulo ativo acompanha a tela", () => {
    expect(activeModuleId("/projeto")).toBe("obra"); // Growth Ambiental: módulo Projetos
    expect(activeModuleId("/clientes/novo")).toBe("receitas");
    expect(activeModuleId("/diagnosticoia")).toBe("config"); // Prompt AM2: virou Diagnóstico de IA, em Configurações
    expect(activeModuleId("/conferencia")).toBe("config");
  });
});

describe("roleLabel", () => {
  it("traduz os cinco papéis e deixa o desconhecido como veio", () => {
    expect(roleLabel("owner")).toBe("Proprietário");
    expect(roleLabel("admin")).toBe("Administrador");
    expect(roleLabel("xyz")).toBe("xyz");
  });
});

describe("Prompt REN (Fase 3) — mudanças de menu e rótulos", () => {
  const moduloDe = (href: string) => NAV_MENU.find((m) => m.items.some((i) => i.href === href))?.id;
  const rotuloDe = (href: string) => todos.find((i) => i.href === href)?.label;

  it("Cartões moram no Caixa (a Projeção de Receitas por unidade saiu)", () => {
    expect(moduloDe("/projecao")).toBeUndefined();
    expect(moduloDe("/cartoes")).toBe("caixa");
  });

  it("Growth Ambiental: o módulo Obra se chama Projetos", () => {
    expect(NAV_MENU.find((m) => m.id === "obra")!.label).toBe("Projetos");
  });

  it("nada em inglês nem 'Obra' genérico nos rótulos renomeados", () => {
    expect(rotuloDe("/fornecedores")).toBe("Fornecedores e Parceiros");
    expect(rotuloDe("/contratos/medicoes")).toBe("Medições");
    expect(rotuloDe("/estoque")).toBe("Materiais e Equipamentos");
    expect(rotuloDe("/equipes")).toBe("Equipes e Presença de Campo");
    expect(rotuloDe("/acerto")).toBe("Acertos e Rateios");
  });

  it("mover de módulo não muda a chave de permissão", () => {
    expect(permOf(todos.find((i) => i.href === "/cartoes")!)).toBe("cartoes");
    expect(permOf(todos.find((i) => i.href === "/contratos/medicoes")!)).toBe("contratos");
  });
});

describe("Prompt AC3 — DRE Analítica no menu", () => {
  it("só o item mais específico fica marcado", async () => {
    const { itemAtivoDoModulo } = await import("./nav-menu");
    const bi = NAV_MENU.find((m) => m.id === "bi")!.items;
    expect(itemAtivoDoModulo("/dre/analitica", bi)).toBe("/dre/analitica");
    expect(itemAtivoDoModulo("/dre", bi)).toBe("/dre");
    expect(itemAtivoDoModulo("/caixa", bi)).toBeNull();
  });
});
