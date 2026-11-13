import type { Role } from "@/lib/context";

/**
 * Permissões GRANULARES por tela × ação (Ver / Criar / Editar / Excluir),
 * portado do protótipo v0.4 (Gestão de Acessos). Cada membership tem um `role`
 * (perfil) que define permissões padrão; um admin pode sobrescrever por membro
 * via `membership.permissions` (matriz completa).
 */

export type PermAction = "ver" | "criar" | "editar" | "excluir";
export interface ScreenPerm {
  ver: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
}
export type PermMatrix = Record<string, ScreenPerm>;

export type Modulo =
  | "Planejamento"
  | "Receitas"
  | "Despesas"
  | "Conciliação de Caixa"
  | "Pessoas"
  | "Reports"
  | "Backup"
  | "Config";

export interface Screen {
  id: string; // = primeiro segmento da rota (ex.: "unidades")
  label: string;
  modulo: Modulo;
}

/** Todas as telas governadas (rota → tela). `perfil` é pessoal e não entra aqui. */
export const SCREENS: Screen[] = [
  { id: "dashboard", label: "Dashboard", modulo: "Reports" },
  { id: "projecao", label: "Projeção de Receitas", modulo: "Reports" },
  // Prompt AB2: o Consolidado saiu (redireciona para a Projeção de Receitas).
  { id: "caixa", label: "Controle de Caixa", modulo: "Conciliação de Caixa" },
  // Prompt L, Parte 9: a rota /fechamento saiu; "criar" aqui é fechar o dia no cartão do Caixa.
  { id: "fechamento", label: "Fechar o dia (no Caixa)", modulo: "Conciliação de Caixa" },
  // Prompt AB2: a tela saiu; a chave ficou e governa a lista "Dias fechados" do Caixa.
  { id: "balancodia", label: "Dias fechados (no Caixa)", modulo: "Reports" },
  { id: "dre", label: "DRE", modulo: "Reports" },
  { id: "fluxocaixa", label: "Fluxo de Caixa", modulo: "Reports" },
  { id: "medicao", label: "Medição de Projeto — Relatório CEF", modulo: "Reports" },
  { id: "resumo", label: "Resumo Executivo", modulo: "Reports" },
  // Prompt RC: tela nova. Dentro dela, cada relatório também exige ver a DRE
  // ou o Fluxo — a tela não abre número que a pessoa não vê nas telas de origem.
  { id: "relatorios", label: "Relatórios Customizados", modulo: "Reports" },
  { id: "unidades", label: "Unidades / Dados de Venda", modulo: "Receitas" },
  { id: "budget", label: "Orçamentos", modulo: "Planejamento" },
  { id: "forecast", label: "Previsão Atualizada", modulo: "Planejamento" },
  // Prompt AP, BAP-2: a trava de versão saiu de /versao e mora nas telas de
  // Orçamentos, Previsão e Projetos. Permissão PRÓPRIA (ação, não rota): nasce
  // só com owner e admin — como `versao` hoje — e pode ser dada por override.
  { id: "versaotrava", label: "Travar e destravar versão", modulo: "Planejamento" },
  // Decisão de 01/10/2026 (BH-4): aprovar e desaprovar versão tem permissão
  // PRÓPRIA — desaprovar tira número de relatório, não pode valer o `editar`
  // da tela. Nasce só com owner e admin (TELAS_SENSIVEIS).
  { id: "versaoaprova", label: "Aprovar e desaprovar versão", modulo: "Planejamento" },
  { id: "clientes", label: "Clientes (Compradores)", modulo: "Receitas" },
  // Permissão de CAMPO, não de rota (Prompt M, 5.4 · BM-3): renda, FGTS, score,
  // restrições, estado civil e inteligência de mercado do comprador. Nasce só
  // com owner e admin — ver TELAS_SENSIVEIS.
  { id: "clientesdados", label: "Clientes — dados financeiros e de perfil", modulo: "Receitas" },
  { id: "contasreceber", label: "Contas a Receber", modulo: "Receitas" },
  { id: "medicaolanc", label: "Medição de Projeto — Lançar medição", modulo: "Despesas" },
  { id: "simulador", label: "Simulador", modulo: "Receitas" },
  // O `id` continua "reembolso" DE PROPÓSITO: ele é a chave gravada em
  // `membership.permissions` e o primeiro segmento da rota. Trocar o id
  // órfãozaria toda permissão já salva — o rótulo é o que mudou de nome.
  { id: "reembolso", label: "Liberações de Obra", modulo: "Receitas" },
  { id: "permuta", label: "Inventário de Permuta", modulo: "Receitas" },
  // Prompt AG (6.1/6.2): a lista e o rascunho das notas EMITIDAS (NFS-e);
  // emitir e cancelar são permissões próprias, com efeito externo.
  { id: "notasfiscais", label: "Notas Fiscais (emitidas)", modulo: "Receitas" },
  { id: "notaemitir", label: "Emitir nota fiscal (NFS-e)", modulo: "Receitas" },
  { id: "notacancelar", label: "Cancelar nota fiscal (NFS-e)", modulo: "Receitas" },
  { id: "parametros", label: "Índices de Reajuste", modulo: "Receitas" },
  // Growth Ambiental — Contratos e Aditivos (0077). "contratos" é a rota; as
  // demais são chaves de ação, sem página própria (como "conciliacao").
  // Aprovar é sensível: nasce só com owner e admin e se concede por membro.
  { id: "contratos", label: "Contratos — cadastro, itens, projetos e cronograma", modulo: "Receitas" },
  { id: "contratosaditivos", label: "Contratos — registrar aditivos", modulo: "Receitas" },
  { id: "contratosmedicao", label: "Contratos — lançar medições", modulo: "Receitas" },
  { id: "contratosaprovar", label: "Contratos — aprovar aditivos e medições", modulo: "Receitas" },
  { id: "contratosfinanceiro", label: "Contratos — faturamento, recebimentos, custos, reembolsos e exportação", modulo: "Receitas" },
  { id: "despesas", label: "Lançamentos de Despesas", modulo: "Despesas" },
  { id: "contaspagar", label: "Contas a Pagar", modulo: "Despesas" },
  { id: "restituicoes", label: "Ressarcimentos (pago por terceiro)", modulo: "Despesas" },
  { id: "cartoes", label: "Cartões de Crédito", modulo: "Despesas" },
  { id: "fornecedores", label: "Fornecedores e Parceiros", modulo: "Despesas" },
  // Prompt AN, Parte 5: a Conferência de lançamentos ganha id próprio (e rota
  // /conferencia) para passar pelo enforcement central. A permissão ACOMPANHA
  // a de Lançamentos de Despesas, inclusive o override de cada membro — ver
  // HERDA_DE. Quem alcançava a tela por `despesas` continua alcançando.
  { id: "conferencia", label: "Conferência de lançamentos", modulo: "Despesas" },
  { id: "planocontas", label: "Plano de Contas", modulo: "Planejamento" },
  // Growth Ambiental — Planejamento de projetos (0078). "plano" é a rota do
  // Plano de Trabalho (ver, criar, editar, excluir fases/atividades/entregas);
  // "modelos" é a biblioteca da empresa (Config: nasce só com owner/admin).
  { id: "plano", label: "Plano de Trabalho (fases, atividades e entregas)", modulo: "Planejamento" },
  { id: "modelos", label: "Modelos de Fases e Atividades", modulo: "Config" },
  // Prompt X, 6 — conta corrente é instrumento de caixa, não de despesa.
  { id: "contas", label: "Contas Correntes", modulo: "Conciliação de Caixa" },
  // Prompt L, 4.2.2 e 5.1 — permissões PRÓPRIAS do Caixa, distintas de editar:
  // "criar" = lançar ajuste de caixa; "excluir" = desfazer conciliação. Não é
  // rota: é chave de permissão (sem página própria).
  { id: "conciliacao", label: "Conciliação — ajustar e desfazer", modulo: "Conciliação de Caixa" },
  { id: "estoque", label: "Controle de Estoques", modulo: "Despesas" },
  // Prompt Z — módulo Pessoas. "ponto" saiu (tela extinta; a chave gravada em
  // permissões antigas sobra no JSON sem efeito). As duas telas "dados" são
  // permissão de CAMPO (BM-3): nascem só com owner/admin — ver TELAS_SENSIVEIS.
  { id: "funcionarios", label: "Funcionários", modulo: "Pessoas" },
  { id: "funcionariosdados", label: "Funcionários — endereço, salário, jornada, banco e dependentes", modulo: "Pessoas" },
  { id: "funcionariosaso", label: "Funcionários — ASO (dado de saúde)", modulo: "Pessoas" },
  { id: "equipes", label: "Equipes de Projetos", modulo: "Pessoas" },
  { id: "backup", label: "Backup de dados", modulo: "Backup" },
  { id: "usuarios", label: "Usuários & Acessos", modulo: "Config" },
  { id: "acessos", label: "Gestão de Acessos", modulo: "Config" },
  { id: "acoes", label: "Log de Auditoria", modulo: "Config" },
  // Prompt AL: "contabilidade" saiu (a tela virou redirecionamento para
  // Usuários). Override gravado com essa chave fica no banco, inerte (AJ 2.4).
  { id: "empresa", label: "Empresa", modulo: "Config" },
  { id: "projeto", label: "Projetos", modulo: "Config" },
  { id: "numeracao", label: "Numeração de Despesas", modulo: "Config" },
  // Chaves de mudança por empresa (B4): ligar muda número ou acesso em
  // produção. Só owner e admin, qualquer que seja o override.
  { id: "chaves", label: "Chaves de mudança", modulo: "Config" },
  // Prompt AP: "versao" saiu (a tela virou redirecionamento para Projetos).
  // A trava foi para `versaotrava`; a planilha, para a tela Projetos.
  { id: "diagnosticoia", label: "Diagnóstico de IA", modulo: "Config" },
];

export const SCREEN_IDS = SCREENS.map((s) => s.id);

/**
 * Telas cuja permissão é SEMPRE a de outra (Prompt AN, 5.4): a célula é cópia
 * da tela-mãe, depois do merge dos overrides dela e antes dos clamps. Override
 * gravado na própria chave não vale — a tela não se configura à parte, e por
 * isso ninguém ganha nem perde acesso com a chegada do id.
 */
export const HERDA_DE: Readonly<Record<string, string>> = { conferencia: "despesas" };

const NONE: ScreenPerm = { ver: false, criar: false, editar: false, excluir: false };
const VIEW: ScreenPerm = { ver: true, criar: false, editar: false, excluir: false };
const FULL: ScreenPerm = { ver: true, criar: true, editar: true, excluir: true };
const EDIT: ScreenPerm = { ver: true, criar: true, editar: true, excluir: false };

/**
 * Telas que o perfil "contador" enxerga POR PADRÃO (somente leitura).
 *
 * Prompt AL, Parte 2: deixou de ser lista fixa — é o ponto de partida do
 * papel, e owner ou admin ajustam por membro na Gestão de Acessos, como para
 * qualquer outro papel. A lista não mudou (2.3).
 */
export const CONTADOR_VE: ReadonlySet<string> = new Set([
  "dre",
  "fluxocaixa",
  "medicao",
  "resumo",
  "planocontas",
  "despesas",
  "acoes",
  // Prompt AG, 6.4: o contador vê as notas emitidas e não emite.
  "notasfiscais",
]);

/**
 * Telas do `membro` no padrão NOVO (Prompt AJ, Parte 1 · decisão BAJ-2 =
 * "lançamento + receita", 28/09/2026): ver, criar e editar; excluir fica com
 * owner e admin. Critério POSITIVO — tela que não está aqui nasce negada para
 * o membro, inclusive toda tela nova de `SCREENS` (1.5).
 *
 * "Medição" entra com as duas rotas (relatório e lançamento): o Prompt V as
 * funde num item só, e hoje o membro já alcança as duas.
 */
export const MEMBRO_TELAS = new Set([
  "despesas",
  "contaspagar",
  "fornecedores",
  "caixa",
  "contas",
  "medicao",
  "medicaolanc",
  "clientes",
  "unidades",
  "contasreceber",
  "permuta",
]);

/**
 * Telas restritas a owner e admin, qualquer que seja o override (Prompt AJ,
 * Parte 3 = Prompt AI, Parte 0). Quem alcança Usuários troca papéis; quem
 * alcança Gestão de Acessos concede telas — inclusive a si mesmo; quem alcança
 * Chaves de mudança liga regra nova para a empresa inteira (B4).
 */
export const TELAS_SO_ADMIN = new Set(["usuarios", "acessos", "chaves"]);

/**
 * Prompt PLAT (Fase 3, revisão V5): telas que só os operadores da plataforma
 * (super-admins, `src/lib/tenant/superadmin.ts`) alcançam — nem owner nem
 * admin do cliente. Chaves de mudança ligam regra nova para a empresa
 * inteira; o backup completo é extração de todos os dados, risco de
 * segurança se a senha do dono vazar. O dono que precisar pede à plataforma.
 * Não se concede por override e não aparece na Gestão de Acessos.
 */
export const TELAS_SO_PLATAFORMA: ReadonlySet<string> = new Set(["chaves"]);

/**
 * Prompt AO, BAO-2 (decisão de 26/10/2026, revendo o PLAT de 18/10): o Backup
 * deixa de ser só da plataforma. Vira tela SENSÍVEL — nasce só com owner e
 * admin e pode ser concedida na Gestão de Acessos — porque o pacote completo
 * leva dado pessoal. O operador da plataforma continua alcançando.
 */
export const OPERADOR_SEMPRE_ALCANCA: ReadonlySet<string> = new Set(["backup"]);

/**
 * Telas que nenhum padrão de papel concede além de owner/admin — mas que,
 * diferente de TELAS_SO_ADMIN, podem ser dadas a alguém por override na Gestão
 * de Acessos (BM-3: "quem recebe a permissão nova por padrão: só owner e
 * admin").
 */
export const TELAS_SENSIVEIS = new Set(["clientesdados", "funcionariosdados", "funcionariosaso", "versaotrava", "versaoaprova", "notaemitir", "notacancelar", "backup", "contratosaprovar"]);

/**
 * Papéis com TETO DE LEITURA (Prompt AL, Parte 3 · decisão BAL-2 = opção 1):
 * podem receber `ver` em qualquer tela por override, e nunca `criar`,
 * `editar` ou `excluir`. O contador é externo à empresa; quem de fora precisar
 * lançar é outro papel, com outro nome.
 */
export const PAPEIS_SO_LEITURA: ReadonlySet<Role> = new Set<Role>(["contador"]);

export function temTetoDeLeitura(role: Role | string): boolean {
  return PAPEIS_SO_LEITURA.has(role as Role);
}

export interface OpcoesPermissao {
  /**
   * Padrão novo do `membro` ligado para o tenant (chave por tenant, AJ 1.4).
   * Desligado = comportamento de antes, célula por célula.
   */
  membroRestrito?: boolean;
  /**
   * Prompt PLAT: o usuário é operador da plataforma (super-admin por e-mail).
   * Só ele vê TELAS_SO_PLATAFORMA. Ausente = não é.
   */
  operadorDaPlataforma?: boolean;
}

/** Permissões padrão por perfil (role). */
export function defaultPermissions(role: Role, opts: OpcoesPermissao = {}): PermMatrix {
  const out: PermMatrix = {};
  for (const s of SCREENS) {
    if (role === "owner" || role === "admin") {
      out[s.id] = { ...FULL };
    } else if (TELAS_SENSIVEIS.has(s.id)) {
      out[s.id] = { ...NONE };
    } else if (role === "membro") {
      if (opts.membroRestrito) {
        out[s.id] = MEMBRO_TELAS.has(s.id) ? { ...EDIT } : { ...NONE };
      } else {
        // Padrão ANTIGO (critério negativo): tudo fora de Config com EDIT.
        // Vale enquanto a chave do tenant estiver desligada.
        out[s.id] = s.modulo === "Config" ? { ...NONE } : { ...EDIT };
      }
    } else if (role === "engenheiro") {
      // engenheiro: acesso apenas ao Lançamento de Medição
      out[s.id] = s.id === "medicaolanc" ? { ...FULL } : { ...NONE };
    } else {
      // contador: somente leitura de um subconjunto
      out[s.id] = CONTADOR_VE.has(s.id) ? { ...VIEW } : { ...NONE };
    }
  }
  for (const [filha, mae] of Object.entries(HERDA_DE)) out[filha] = { ...out[mae] };
  // Prompt PLAT: o padrão de qualquer papel é negado; só o operador da plataforma alcança.
  for (const id of TELAS_SO_PLATAFORMA) out[id] = opts.operadorDaPlataforma ? { ...FULL } : { ...NONE };
  if (opts.operadorDaPlataforma) for (const id of OPERADOR_SEMPRE_ALCANCA) out[id] = { ...FULL };
  return out;
}

/**
 * Permissões efetivas: overrides do membro (se houver) por tela, senão
 * default — e, POR ÚLTIMO, o clamp de papel (AJ 3.1 e 3.3; AL 3.1):
 *  - owner e admin: acesso total, mesmo com override restritivo gravado (o
 *    que a matriz sempre prometeu passa a ser verdade no módulo);
 *  - demais papéis: Usuários e Gestão de Acessos negadas, mesmo com override;
 *  - contador (teto de leitura): criar, editar e excluir negados em toda
 *    tela, mesmo com override. Roda DEPOIS do merge — aplicado antes, o
 *    override sobrescreveria o teto.
 */
export function effectivePermissions(
  role: Role,
  overrides?: PermMatrix | null,
  opts: OpcoesPermissao = {},
): PermMatrix {
  const base = defaultPermissions(role, opts);
  if (overrides) {
    for (const s of SCREENS) {
      if (HERDA_DE[s.id]) continue;
      const o = overrides[s.id];
      if (o) base[s.id] = { ...base[s.id], ...o };
    }
  }
  for (const [filha, mae] of Object.entries(HERDA_DE)) base[filha] = { ...base[mae] };
  const total = role === "owner" || role === "admin";
  const soLeitura = temTetoDeLeitura(role);
  for (const s of SCREENS) {
    if (total) base[s.id] = { ...FULL };
    else if (TELAS_SO_ADMIN.has(s.id)) base[s.id] = { ...NONE };
    else if (soLeitura) base[s.id] = { ver: base[s.id].ver, criar: false, editar: false, excluir: false };
    // Prompt PLAT: por último, acima do papel — owner e admin do cliente não alcançam.
    if (TELAS_SO_PLATAFORMA.has(s.id)) base[s.id] = opts.operadorDaPlataforma ? { ...FULL } : { ...NONE };
    if (opts.operadorDaPlataforma && OPERADOR_SEMPRE_ALCANCA.has(s.id)) base[s.id] = { ...FULL };
  }
  return base;
}

/**
 * O que gravar como override (AJ, Parte 2): só as telas que divergem do
 * padrão do papel EM VIGOR no tenant. Tela igual ao padrão volta a ser
 * governada pelo papel — inclusive quando o padrão mudar (é assim que a Parte 1
 * alcança quem já salvou a matriz).
 *
 * Um cuidado a mais, só enquanto convivem os dois padrões do membro: uma NEGAÇÃO
 * que o admin viu também é gravada se o outro padrão a concederia. Sem isso,
 * salvar "DRE negada" com a chave ligada não gravaria nada (igual ao padrão
 * novo), e desligar a chave devolveria a DRE — ampliar o que o admin decidiu.
 * O inverso (concessão igual ao padrão antigo) NÃO é gravado: some ao ligar a
 * chave, que é exatamente o efeito aprovado na prévia.
 */
export function overridesDivergentes(
  role: Role,
  matriz: PermMatrix,
  opts: OpcoesPermissao = {},
): PermMatrix {
  const vigente = defaultPermissions(role, opts);
  const outro = defaultPermissions(role, { membroRestrito: !opts.membroRestrito });
  const acoes: PermAction[] = ["ver", "criar", "editar", "excluir"];
  const out: PermMatrix = {};
  for (const s of SCREENS) {
    // Tela que acompanha outra não se grava (AN 5.4): segue a mãe.
    if (HERDA_DE[s.id]) continue;
    const m = matriz[s.id];
    if (!m) continue;
    const difereDoVigente = acoes.some((a) => m[a] !== vigente[s.id][a]);
    const negaOQueOOutroDaria = acoes.some((a) => !m[a] && outro[s.id][a]);
    if (!difereDoVigente && !negaOQueOOutroDaria) continue;
    out[s.id] = { ver: m.ver, criar: m.criar, editar: m.editar, excluir: m.excluir };
  }
  return out;
}

/**
 * Validação do payload da Gestão de Acessos no servidor (AJ, Parte 4): chave
 * fora de `SCREENS`, valor não booleano, ação sem "ver" e concessão de tela
 * restrita a owner/admin são recusados. Devolve a mensagem, ou null se ok.
 */
export function validarMatriz(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "Matriz de permissões inválida.";
  }
  const ids = new Set(SCREEN_IDS);
  for (const [tela, v] of Object.entries(payload as Record<string, unknown>)) {
    if (!ids.has(tela)) return `Tela desconhecida: "${tela}".`;
    if (!v || typeof v !== "object") return `Permissão inválida em "${tela}".`;
    const p = v as Record<string, unknown>;
    for (const k of Object.keys(p)) {
      if (!["ver", "criar", "editar", "excluir"].includes(k)) return `Ação desconhecida em "${tela}": "${k}".`;
    }
    for (const a of ["ver", "criar", "editar", "excluir"]) {
      if (typeof p[a] !== "boolean") return `Valor não booleano em "${tela}.${a}".`;
    }
    if (!p.ver && (p.criar || p.editar || p.excluir)) {
      return `"${tela}": criar, editar ou excluir exigem "ver".`;
    }
    if (TELAS_SO_PLATAFORMA.has(tela) && (p.ver || p.criar || p.editar || p.excluir)) {
      return `"${tela}" é operada só pela plataforma e não pode ser concedida por override.`;
    }
    if (TELAS_SO_ADMIN.has(tela) && (p.ver || p.criar || p.editar || p.excluir)) {
      return `"${tela}" é exclusiva de owner e admin e não pode ser concedida por override.`;
    }
  }
  return null;
}

/**
 * Prompt AL, 3.2 — recusa, na gravação, ação de escrita para papel com teto
 * de leitura. A matriz nem oferece a caixa; isto é a mesma regra no servidor,
 * para quem chamar a action direto. Devolve a mensagem, ou null se ok.
 */
export function recusaDoTetoDeLeitura(role: Role | string, matriz: PermMatrix): string | null {
  if (!temTetoDeLeitura(role)) return null;
  for (const s of SCREENS) {
    const m = matriz[s.id];
    if (m && (m.criar || m.editar || m.excluir)) {
      return `O ${role} é somente leitura: em "${s.label}" só a coluna Ver pode ser marcada.`;
    }
  }
  return null;
}

/** O usuário pode executar `action` na `screenId`? */
export function can(
  perms: PermMatrix,
  screenId: string,
  action: PermAction,
): boolean {
  return perms[screenId]?.[action] ?? false;
}

/** Primeiro segmento da rota → id de tela (ou null se não governada). */
export function screenIdOfPath(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const seg = pathname.replace(/^\//, "").split("/")[0];
  return SCREEN_IDS.includes(seg) ? seg : null;
}
