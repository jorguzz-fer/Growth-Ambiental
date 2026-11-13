import { can, type PermMatrix } from "@/lib/permissions";

/**
 * Menu da moldura V2 (Prompt C): módulos → subitens.
 *
 * É SÓ apresentação. A rota de cada item é a de sempre (seção 22 do Prompt C:
 * rótulo muda, URL não), e a permissão é a mesma chave de `SCREENS` que a
 * página já verifica no servidor. Esconder item aqui é conveniência — o
 * controle de acesso continua no layout (`screenIdOfPath`) e em cada página.
 *
 * Os agrupamentos NÃO se confundem com `Screen.modulo` em permissions.ts: lá o
 * módulo decide o padrão de permissão por papel (ex.: membro não vê "Config");
 * aqui decide só onde o item aparece. Mover um item de módulo neste arquivo não
 * muda quem o enxerga.
 */

export type ModuleIcon =
  | "bi"
  | "planejamento"
  | "receitas"
  | "despesas"
  | "caixa"
  | "contratos"
  | "obra"
  | "pessoas"
  | "config";

export interface NavItem {
  href: string;
  label: string;
  /**
   * Chave de permissão (id em `SCREENS`), quando não coincide com o primeiro
   * segmento da rota. As conferências de /diagnostico reaproveitam as
   * permissões de Despesas e Unidades, como já faziam no menu antigo.
   */
  perm?: string;
  /**
   * Segunda chave que também mostra o item (Prompt V, 0.2): a tela única de
   * Medição de Obra tem duas permissões (relatório e lançamento) e UM item —
   * quem tem qualquer uma delas vê o item; a página manda cada um à sua aba.
   */
  permAlt?: string;
  /** Rota do item para quem só tem `permAlt` (a guarda central nega `href`). */
  hrefAlt?: string;
  /**
   * Prompt AI2 (BAI2-1) — permissões que a PÁGINA exige além de "ver" da
   * chave. Sem isto, o item aparecia para quem a página nega (o Acerto
   * Contábil aparecia para o contador e abria "Acesso negado").
   */
  exige?: { tela: string; acao: "ver" | "criar" | "editar" | "excluir" }[];
  /** Outras rotas que destacam este item (as abas da tela única). */
  tambem?: string[];
}

export interface NavModule {
  id: string;
  label: string;
  icon: ModuleIcon;
  items: NavItem[];
}

/**
 * Ordem dos módulos e rótulos seguem o mockup V2. Telas que o mockup desenha
 * mas que ainda não existem (Relatórios customizados, Assistente, Notas
 * Fiscais, Cartões de Crédito, Pessoas) não entram: o menu não cria tela.
 * Telas que existem e o mockup não mostra (Consolidado, Projeção, Balanço do
 * Dia, Fechamento, Acerto, Ponto, Acesso do contador) continuam aqui até o
 * prompt dono de cada uma decidir — tirar do menu seria perder a tela.
 */
export const NAV_MENU: NavModule[] = [
  {
    id: "bi",
    label: "Business Intelligence",
    icon: "bi",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/dre", label: "DRE" },
      // Prompt AC3: mora sob /dre — a permissão é a da DRE.
      { href: "/dre/analitica", label: "DRE Analítica" },
      { href: "/fluxocaixa", label: "Fluxo de Caixa" },
      // Prompt AD3: mora sob /fluxocaixa — a permissão é a do Fluxo.
      { href: "/fluxocaixa/analitico", label: "Fluxo de Caixa Analítico" },
      { href: "/resumo", label: "Resumo Executivo" },
      // Prompt RC: tela própria, com chat próprio (decisão de 18/10).
      { href: "/relatorios", label: "Relatórios Customizados" },
    ],
  },
  {
    id: "planejamento",
    label: "Planejamento",
    icon: "planejamento",
    items: [
      { href: "/budget", label: "Orçamentos" },
      { href: "/forecast", label: "Previsão Atualizada" },
      { href: "/planocontas", label: "Plano de Contas" },
    ],
  },
  {
    // Growth Ambiental — Contratos e Aditivos. Tudo mora sob /contratos (uma
    // chave de rota); as abas e telas internas conferem as chaves de ação.
    id: "contratos",
    label: "Contratos",
    icon: "contratos",
    items: [
      { href: "/contratos", label: "Contratos", tambem: ["/contratos/novo"] },
      { href: "/contratos/painel", label: "Painel de Contratos" },
      { href: "/contratos/aditivos", label: "Aditivos" },
      // Growth Ambiental: a medição é do SERVIÇO, no contrato (item, aditivo,
      // período, aprovação e documentos). A medição por grupo de obra e o
      // Relatório CEF saíram (telas-removidas.ts).
      { href: "/contratos/medicoes", label: "Medições" },
      { href: "/contratos/reembolsos", label: "Despesas Reembolsáveis", exige: [{ tela: "contratosfinanceiro", acao: "ver" }] },
      { href: "/contratos/modalidades", label: "Modalidades de Serviço", exige: [{ tela: "contratos", acao: "editar" }] },
    ],
  },
  {
    id: "receitas",
    label: "Receitas",
    icon: "receitas",
    items: [
      { href: "/clientes", label: "Clientes" },
      { href: "/contasreceber", label: "Contas a Receber" },
      // Prompt AG: NFS-e de serviço EMITIDA (última seção de Receitas, como na revisão de 17/10).
      { href: "/notasfiscais", label: "Notas Fiscais" },
    ],
  },
  {
    id: "despesas",
    label: "Despesas",
    icon: "despesas",
    items: [
      { href: "/despesas", label: "Despesas / Lançamentos" },
      { href: "/contaspagar", label: "Contas a Pagar" },
      { href: "/restituicoes", label: "Ressarcimentos" },
      // Pagamento único quitando várias despesas — governado por Despesas.
      { href: "/acerto", label: "Acertos e Rateios", perm: "despesas", exige: [{ tela: "despesas", acao: "editar" }, { tela: "caixa", acao: "ver" }] },
      { href: "/fornecedores", label: "Fornecedores e Parceiros" },
    ],
  },
  {
    id: "caixa",
    label: "Caixa",
    icon: "caixa",
    items: [
      { href: "/caixa", label: "Caixa" },
      { href: "/contas", label: "Contas Correntes" },
      // Prompt REN (Fase 3): o cartão é meio de pagamento — mora no Caixa.
      { href: "/cartoes", label: "Cartões de Crédito" },
    ],
  },
  {
    // Growth Ambiental: o módulo "Obra" passou a se chamar "Projetos". O id
    // continua "obra" (chave interna, não aparece na tela).
    id: "obra",
    label: "Projetos",
    icon: "obra",
    items: [
      // Growth Ambiental: o cadastro de Projetos saiu de Planejamento e abre
      // o módulo Projetos. Rota e permissão ("projeto") continuam as mesmas.
      { href: "/projeto", label: "Cadastro de Projetos" },
      // Planejamento (0078): fases, atividades, entregas e cronograma do projeto.
      { href: "/plano", label: "Plano de Trabalho" },
      { href: "/estoque", label: "Materiais e Equipamentos" },
    ],
  },
  {
    // Prompt Z — módulo novo, depois de Obra: operação de obra, não relatório.
    // "Equipes de Projetos" entra quando a tela existir (PR Z-3).
    id: "pessoas",
    label: "Pessoas",
    icon: "pessoas",
    items: [
      { href: "/funcionarios", label: "Funcionários" },
      { href: "/equipes", label: "Equipes e Presença de Campo" },
    ],
  },
  {
    id: "config",
    label: "Configurações",
    icon: "config",
    items: [
      { href: "/empresa", label: "Empresa" },
      { href: "/modelos", label: "Modelos de Fases e Atividades" },
      { href: "/usuarios", label: "Usuários" },
      { href: "/acessos", label: "Gestão de Acessos" },
      { href: "/acoes", label: "Auditoria" },
      { href: "/numeracao", label: "Numeração de despesas" },
      { href: "/chaves", label: "Chaves de mudança" },
      { href: "/backup", label: "Backup de dados" },
      // Prompt AM2: o Assistente saiu (a Cris explica o sistema); a rota fica como diagnóstico da IA.
      { href: "/diagnosticoia", label: "Diagnóstico de IA" },
      // Prompt AN: id próprio (acompanha Despesas). A Conferência de planos
      // saiu; a data impossível virou aviso no cadastro da unidade.
      { href: "/conferencia", label: "Conferência de lançamentos" },
    ],
  },
];

/** Chave de permissão que governa o item. */
export function permOf(item: NavItem): string {
  return item.perm ?? item.href.replace(/^\//, "").split("/")[0];
}

/**
 * Só os itens com "ver"; módulo sem nenhum item visível some inteiro
 * (seção 21). Mesma regra do menu antigo — não amplia nem reduz acesso.
 * Prompt AI2: item com `exige` só aparece para quem a página deixa entrar.
 */
export function visibleMenu(perms: PermMatrix, menu: NavModule[] = NAV_MENU): NavModule[] {
  return menu
    .map((m) => ({
      ...m,
      items: m.items
        .filter((it) => can(perms, permOf(it), "ver") || (!!it.permAlt && can(perms, it.permAlt, "ver")))
        .filter((it) => (it.exige ?? []).every((e) => can(perms, e.tela, e.acao)))
        // Só com a permissão alternativa: o item aponta para a rota dela (a
        // guarda central negaria `href`); a página de lá abre na aba certa.
        .map((it) => (!can(perms, permOf(it), "ver") && it.hrefAlt ? { ...it, href: it.hrefAlt, tambem: [...(it.tambem ?? []), it.href] } : it)),
    }))
    .filter((m) => m.items.length > 0);
}

/**
 * O item está ativo na rota atual? Casamento por prefixo NA FRONTEIRA DE
 * SEGMENTO (seção 12): `/clientes/novo` ativa Clientes, mas `/contaspagar` não
 * ativa `/contas`, nem `/medicaolanc` ativa `/medicao`.
 */
export function isItemActive(pathname: string | null | undefined, href: string, tambem: readonly string[] = []): boolean {
  if (!pathname) return false;
  return [href, ...tambem].some((h) => pathname === h || pathname.startsWith(h + "/"));
}

/**
 * Prompt AC3: com /dre e /dre/analitica no mesmo módulo, as duas casariam com
 * /dre/analitica. Só o item mais específico fica marcado.
 */
export function itemAtivoDoModulo(pathname: string | null | undefined, items: readonly NavItem[]): string | null {
  let melhor: string | null = null;
  for (const it of items) {
    if (!isItemActive(pathname, it.href, it.tambem)) continue;
    if (!melhor || it.href.length > melhor.length) melhor = it.href;
  }
  return melhor;
}

/** Módulo que contém a rota atual (o que precisa ficar aberto), ou null. */
export function activeModuleId(
  pathname: string | null | undefined,
  menu: NavModule[] = NAV_MENU,
): string | null {
  for (const m of menu) {
    if (m.items.some((it) => isItemActive(pathname, it.href, it.tambem))) return m.id;
  }
  return null;
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  membro: "Membro",
  contador: "Contador",
  engenheiro: "Engenheiro / técnico de campo",
};

/** Rótulo do papel para o cabeçalho; papel desconhecido aparece como veio. */
export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role;
}

/** Item do menu que responde por uma rota (o de `href`, `tambem` ou `hrefAlt` mais longo que casa). */
export function itemDaRota(rota: string | null | undefined, menu: NavModule[] = NAV_MENU): NavItem | null {
  if (!rota) return null;
  const caminho = rota.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  let melhor: { item: NavItem; tam: number } | null = null;
  for (const m of menu) {
    for (const it of m.items) {
      for (const h of [it.href, ...(it.tambem ?? []), ...(it.hrefAlt ? [it.hrefAlt] : [])]) {
        if ((caminho === h || caminho.startsWith(h + "/")) && (!melhor || h.length > melhor.tam)) melhor = { item: it, tam: h.length };
      }
    }
  }
  return melhor?.item ?? null;
}

/**
 * Prompt AQ §2 (Revisão 4) — o que a Cris pode usar numa rota, resolvido PELO
 * ITEM DO MENU (não pelo primeiro segmento da URL):
 *  - `tela`: a chave de permissão do item (`perm`, ou `permAlt` quando a rota
 *    é a da permissão alternativa, como /medicaolanc);
 *  - `ver`: "ver" da chave E todas as exigências do item (`exige`), as mesmas
 *    que o menu já confere para mostrar o item;
 *  - `lancar`: `ver` E criar ou editar na chave.
 *
 * Falha FECHADA: rota fora do menu → nada (antes, rota sem id de tela, como
 * /acerto, liberava os números sem conferir permissão e descartava o formulário).
 */
export function permissaoDaRota(rota: string | null | undefined, perms: PermMatrix): { tela: string | null; ver: boolean; lancar: boolean } {
  const item = itemDaRota(rota);
  if (!item) return { tela: null, ver: false, lancar: false };
  const segmento = (rota ?? "").split(/[?#]/)[0].replace(/^\//, "").split("/")[0];
  const tela = item.permAlt && segmento === item.permAlt ? item.permAlt : permOf(item);
  const ver = can(perms, tela, "ver") && (item.exige ?? []).every((e) => can(perms, e.tela, e.acao));
  const lancar = ver && (can(perms, tela, "criar") || can(perms, tela, "editar"));
  return { tela, ver, lancar };
}
