/**
 * Plano de Contas — regras puras (estrutura, classificação gerencial,
 * duplicidade, importação e DRE gerencial). Sem banco.
 *
 * Princípio: a CONTA diz a natureza econômica do lançamento. Projeto,
 * contrato, fase, atividade e modalidade dizem onde e por que o recurso foi
 * usado — são dimensões do lançamento, nunca contas novas.
 *
 * Nada aqui decide pela posição ou pelo prefixo do código: a natureza, a
 * categoria da DRE, a classe gerencial e o papel técnico são atributos
 * gravados na própria conta.
 */
import { CATEGORIAS_DRE, type CategoriaDRE } from "@/lib/calc/constants";

// ───────────────────────────── Atributos da conta ─────────────────────────────

/**
 * Classe gerencial: a linha da DRE gerencial (Receita bruta → Resultado
 * líquido) em que a conta entra. É uma VISÃO sobre os mesmos números da
 * cascata (categoria da DRE), que continua sendo o motor.
 */
export const CLASSES_GERENCIAIS = [
  "receita_bruta",
  "deducao",
  "custo_servico",
  "despesa_operacional",
  "resultado_financeiro",
  "outros_resultados",
  "tributo_lucro",
  "fora_do_resultado",
] as const;
export type ClasseGerencial = (typeof CLASSES_GERENCIAIS)[number];
export const ROTULO_CLASSE: Record<ClasseGerencial, string> = {
  receita_bruta: "Receita bruta",
  deducao: "Deduções da receita",
  custo_servico: "Custos dos serviços prestados",
  despesa_operacional: "Despesas operacionais",
  resultado_financeiro: "Resultado financeiro",
  outros_resultados: "Outras receitas e despesas não operacionais",
  tributo_lucro: "Tributos sobre o lucro",
  fora_do_resultado: "Fora do resultado (investimentos, empréstimos, distribuição)",
};
export const ehClasse = (v: unknown): v is ClasseGerencial => typeof v === "string" && (CLASSES_GERENCIAIS as readonly string[]).includes(v);

/** Classe padrão quando a conta não tem uma escolhida: derivada da categoria da DRE. */
export function classePadrao(categoria: string): ClasseGerencial {
  switch (categoria) {
    case "Receita":
      return "receita_bruta";
    case "Custo Variável":
    case "Custo Fixo":
      return "custo_servico";
    case "Despesas Financeiras":
      return "resultado_financeiro";
    case "Retiradas":
    case "Investimento":
    case "Empréstimos":
      return "fora_do_resultado";
    default:
      return "despesa_operacional";
  }
}
export const classeDaConta = (c: { classeGerencial?: string | null }, categoria: string): ClasseGerencial => (ehClasse(c.classeGerencial) ? c.classeGerencial : classePadrao(categoria));

/** Classes que servem a cada natureza (receita não vira custo; despesa não vira receita bruta). */
export function classesPermitidas(natureza: string): ClasseGerencial[] {
  return natureza === "receita"
    ? ["receita_bruta", "resultado_financeiro", "outros_resultados"]
    : CLASSES_GERENCIAIS.filter((c) => c !== "receita_bruta");
}

/**
 * Custo direto ou indireto: PADRÃO da conta. O lançamento pode tratar
 * diferente (combustível pode ser de um projeto ou da administração).
 */
export const TIPOS_CUSTO = ["direto", "indireto"] as const;
export type TipoCusto = (typeof TIPOS_CUSTO)[number];
export const ehTipoCusto = (v: unknown): v is TipoCusto => v === "direto" || v === "indireto";
export const ROTULO_TIPO_CUSTO: Record<TipoCusto, string> = { direto: "Custo direto", indireto: "Custo indireto" };
/** O que vale para o lançamento: o informado nele, senão o padrão da conta. */
export const tipoCustoDoLancamento = (lancamento: string | null | undefined, conta: string | null | undefined): TipoCusto | null =>
  ehTipoCusto(lancamento) ? lancamento : ehTipoCusto(conta) ? conta : null;

/**
 * Papel técnico: a conta que uma regra do sistema usa (ex.: o acerto grava
 * a diferença em "juros de mora" ou "descontos obtidos"). Resolve-se pelo
 * papel, não pelo código — o código é da empresa.
 */
export const PAPEIS = ["juros_mora", "descontos_obtidos"] as const;
export type PapelDaConta = (typeof PAPEIS)[number];
export const ROTULO_PAPEL: Record<PapelDaConta, string> = { juros_mora: "Juros e multas de mora (acerto)", descontos_obtidos: "Descontos obtidos (acerto)" };
/** Código histórico de cada papel, para empresas antigas sem o papel gravado. */
export const CODIGO_LEGADO_DO_PAPEL: Record<PapelDaConta, string> = { juros_mora: "F.6", descontos_obtidos: "F.7" };
export function contaDoPapel(contas: readonly { code: string; papel?: string | null }[], papel: PapelDaConta): string {
  return contas.find((c) => c.papel === papel)?.code ?? CODIGO_LEGADO_DO_PAPEL[papel];
}

// ───────────────────────────── Estrutura ─────────────────────────────

/** Até 3 níveis de grupos (grupo → subgrupo → subnível); a conta fica abaixo. */
export const MAX_NIVEIS = 3;
export const LIMITES = { codigo: 20, nome: 120, descricao: 500 } as const;

/** Código aceito: letras, números, ponto, hífen e sublinhado; sem espaço. */
export function recusaDeCodigo(code: string): string | null {
  const c = code.trim();
  if (!c) return "Informe o código.";
  if (c.length > LIMITES.codigo) return `Código com até ${LIMITES.codigo} caracteres.`;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(c)) return "Código só com letras, números, ponto, hífen ou sublinhado.";
  return null;
}

export interface NoDoPlano {
  id: string;
  code: string;
  parentId: string | null;
}

/** Nível do grupo (1 = raiz). Ciclo = Infinity. */
export function nivelDoGrupo(grupos: readonly NoDoPlano[], id: string): number {
  const porId = new Map(grupos.map((g) => [g.id, g]));
  let n = 0;
  const vistos = new Set<string>();
  for (let g = porId.get(id); g; g = g.parentId ? porId.get(g.parentId) : undefined) {
    if (vistos.has(g.id)) return Infinity;
    vistos.add(g.id);
    n++;
  }
  return n;
}

/** Profundidade da subárvore a partir do grupo (o próprio = 1). */
function alturaDe(grupos: readonly NoDoPlano[], id: string): number {
  const filhos = grupos.filter((g) => g.parentId === id);
  return 1 + (filhos.length ? Math.max(...filhos.map((f) => alturaDe(grupos, f.id))) : 0);
}

/** Recusa de mover/criar um grupo sob `novoPai`: sem ciclo e sem passar de MAX_NIVEIS. */
export function recusaDeHierarquia(grupos: readonly NoDoPlano[], id: string | null, novoPai: string | null): string | null {
  if (!novoPai) return null;
  if (id && novoPai === id) return "Um grupo não pode ficar dentro de si mesmo.";
  const porId = new Map(grupos.map((g) => [g.id, g]));
  if (!porId.has(novoPai)) return "Grupo superior não encontrado.";
  for (let g = porId.get(novoPai); g; g = g.parentId ? porId.get(g.parentId) : undefined) {
    if (id && g.id === id) return "Movimento criaria um ciclo: o grupo de destino está dentro deste.";
  }
  const nivelPai = nivelDoGrupo(grupos, novoPai);
  const altura = id ? alturaDe(grupos, id) : 1;
  if (nivelPai + altura > MAX_NIVEIS) return `O plano aceita até ${MAX_NIVEIS} níveis de grupos.`;
  return null;
}

/**
 * A categoria da DRE que todas as contas ATIVAS de um grupo têm; null se
 * divergem (o Orçamento planeja uma linha por grupo com uma só categoria).
 */
export function categoriaDoGrupo(contas: readonly { ativo: boolean; categoria: string }[]): string | null {
  const ativas = contas.filter((c) => c.ativo);
  if (!ativas.length) return null;
  return ativas.every((c) => c.categoria === ativas[0].categoria) ? ativas[0].categoria : null;
}

/**
 * Grupo de uma CHAVE do Orçamento (row_key): já é o código de um grupo
 * conhecido → ela mesma; senão (chave antiga gravada por conta) → o grupo da
 * conta; por fim, o prefixo antes do primeiro ponto (legado).
 */
export function grupoDaChave(chave: string | null | undefined, grupos: { has(code: string): boolean }, contaParaGrupo?: ReadonlyMap<string, string>): string {
  const k = chave ?? "";
  if (grupos.has(k)) return k;
  return contaParaGrupo?.get(k) ?? k.split(".")[0];
}

/** Grupo de uma conta pelo cadastro; código fora do plano cai no prefixo (lançamento legado). */
export function grupoDaConta(mapa: ReadonlyMap<string, string> | Readonly<Record<string, string>>, code: string | null | undefined): string {
  if (!code) return "";
  const g = mapa instanceof Map ? mapa.get(code) : (mapa as Record<string, string>)[code];
  return g ?? code.split(".")[0];
}

// ───────────────────────────── Duplicidade e sugestão ─────────────────────────────

const PALAVRAS_VAZIAS = new Set(["de", "da", "do", "das", "dos", "e", "em", "a", "o", "as", "os", "para", "por", "com", "no", "na", "nos", "nas", "outros", "outras", "outro", "outra"]);
export const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
/** Raiz simples (plural e gênero): hospedagens → hospedag, combustiveis → combustiv. */
const raiz = (p: string) => p.replace(/(oes|aes|ais|eis|is|ns|s)$/, "").replace(/(em|ao|a|o|e)$/, "");
export function tokens(s: string): string[] {
  return [...new Set(normalizar(s).split(" ").filter((p) => p.length > 1 && !PALAVRAS_VAZIAS.has(p)).map(raiz).filter((p) => p.length > 1))];
}
/** Semelhança 0–1: o quanto o nome menor está contido no maior (tokens com raiz). */
export function semelhanca(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return 0;
  const comum = ta.filter((t) => tb.some((u) => u === t || (t.length >= 5 && u.startsWith(t)) || (u.length >= 5 && t.startsWith(u)))).length;
  return comum / Math.min(ta.length, tb.length);
}

export interface ContaParaComparar {
  code: string;
  name: string;
  ativo?: boolean;
  natureza?: string;
}
/**
 * Contas parecidas com o nome proposto (possível duplicidade). Não impede a
 * criação: a pessoa pode manter as duas com justificativa.
 */
export function contasSemelhantes<T extends ContaParaComparar>(nome: string, contas: readonly T[], minimo = 0.6, max = 3): (T & { semelhanca: number })[] {
  return contas
    .map((c) => ({ ...c, semelhanca: Math.round(semelhanca(nome, c.name) * 100) / 100 }))
    .filter((c) => c.semelhanca >= minimo)
    .sort((a, b) => b.semelhanca - a.semelhanca || a.code.localeCompare(b.code, undefined, { numeric: true }))
    .slice(0, max);
}

/**
 * Candidatas para classificar um lançamento pela descrição (apoio à Cris e ao
 * formulário). Só contas ATIVAS de despesa (ou da natureza pedida) da empresa.
 */
export function sugerirContas<T extends ContaParaComparar>(descricao: string, contas: readonly T[], natureza: "despesa" | "receita" = "despesa", max = 3): (T & { semelhanca: number })[] {
  const alvo = tokens(descricao);
  if (!alvo.length) return [];
  return contas
    .filter((c) => c.ativo !== false && (c.natureza ?? "despesa") === natureza)
    .map((c) => {
      const tc = tokens(c.name);
      const acertos = tc.filter((t) => alvo.some((u) => u === t || (t.length >= 5 && u.startsWith(t)) || (u.length >= 5 && t.startsWith(u)))).length;
      return { ...c, semelhanca: tc.length ? Math.round((acertos / tc.length) * 100) / 100 : 0 };
    })
    .filter((c) => c.semelhanca > 0)
    .sort((a, b) => b.semelhanca - a.semelhanca || a.code.localeCompare(b.code, undefined, { numeric: true }))
    .slice(0, max);
}

// ───────────────────────────── Validação do lançamento ─────────────────────────────

export interface ContaDoCadastro {
  code: string;
  ativo: boolean;
  natureza: string;
}
/**
 * A conta que um lançamento NOVO (ou com a conta trocada) pode usar: existe
 * no plano DESTA empresa, está ativa e é conta analítica (grupo não recebe
 * lançamento). Manter a conta antiga numa edição é sempre permitido.
 */
export function recusaDaContaDoLancamento(
  code: string | null | undefined,
  contas: ReadonlyMap<string, ContaDoCadastro>,
  grupos: ReadonlySet<string>,
  opcoes: { anterior?: string | null; natureza?: "despesa" | "receita" } = {},
): string | null {
  const c = (code ?? "").trim();
  if (!c) return null;
  if (opcoes.anterior && c === opcoes.anterior) return null;
  const conta = contas.get(c);
  if (!conta) return grupos.has(c) ? `"${c}" é um grupo do Plano de Contas: escolha uma conta dentro dele.` : `A conta "${c}" não existe no Plano de Contas da empresa.`;
  if (!conta.ativo) return `A conta ${c} está inativa: escolha uma conta ativa.`;
  return null;
}

// ───────────────────────────── Importação ─────────────────────────────

export interface LinhaImportada {
  linha: number;
  code: string;
  name: string;
  grupo: string;
  natureza: string;
  categoria: string;
  descricao?: string;
  situacao?: string;
}
export interface ContaExistente {
  id: string;
  code: string;
  name: string;
  descricao: string | null;
  groupCode: string;
  natureza: string;
  dreCategory: string | null;
  categoria: string;
  ativo: boolean;
  usada: boolean;
}
export interface PreviaDeImportacao {
  novas: LinhaImportada[];
  alteradas: { linha: LinhaImportada; id: string; mudancas: string[] }[];
  iguais: number;
  duplicidades: { linha: number; code: string; motivo: string }[];
  erros: { linha: number; code: string; motivo: string }[];
  impactoDre: { code: string; de: string; para: string; usada: boolean }[];
}

const naturezaDe = (s: string) => {
  const t = normalizar(s);
  return t.startsWith("rec") ? "receita" : t.startsWith("desp") || t === "" ? "despesa" : null;
};
const categoriaDe = (s: string): CategoriaDRE | null => {
  const t = normalizar(s);
  return (CATEGORIAS_DRE as readonly string[]).find((c) => normalizar(c) === t) as CategoriaDRE | undefined ?? null;
};

/**
 * Prévia da importação de contas por planilha: nada é gravado aqui. Novas
 * entram; existentes podem mudar nome, descrição e categoria; código nunca
 * muda (é a referência dos lançamentos) e grupo de conta usada não muda por
 * importação (exige revisão na tela).
 */
export function previaDaImportacao(linhas: readonly LinhaImportada[], existentes: readonly ContaExistente[], grupos: ReadonlySet<string>): PreviaDeImportacao {
  const porCodigo = new Map(existentes.map((e) => [e.code, e]));
  const out: PreviaDeImportacao = { novas: [], alteradas: [], iguais: 0, duplicidades: [], erros: [], impactoDre: [] };
  const vistos = new Map<string, number>();
  for (const l of linhas) {
    const code = l.code.trim();
    const rc = recusaDeCodigo(code);
    if (rc) {
      out.erros.push({ linha: l.linha, code: code || "—", motivo: rc });
      continue;
    }
    if (vistos.has(code)) {
      out.duplicidades.push({ linha: l.linha, code, motivo: `código repetido na planilha (linha ${vistos.get(code)})` });
      continue;
    }
    vistos.set(code, l.linha);
    if (grupos.has(code)) {
      out.erros.push({ linha: l.linha, code, motivo: "o código é de um grupo, não de uma conta" });
      continue;
    }
    const nome = l.name.trim().slice(0, LIMITES.nome);
    if (!nome) {
      out.erros.push({ linha: l.linha, code, motivo: "nome vazio" });
      continue;
    }
    const natureza = naturezaDe(l.natureza);
    if (!natureza) {
      out.erros.push({ linha: l.linha, code, motivo: `natureza "${l.natureza}" inválida (receita ou despesa)` });
      continue;
    }
    const categoria = l.categoria.trim() ? categoriaDe(l.categoria) : null;
    if (l.categoria.trim() && !categoria) {
      out.erros.push({ linha: l.linha, code, motivo: `categoria da DRE "${l.categoria}" não existe` });
      continue;
    }
    if (categoria && (natureza === "receita") !== (categoria === "Receita")) {
      out.erros.push({ linha: l.linha, code, motivo: natureza === "receita" ? "conta de receita tem a categoria Receita" : "conta de despesa não pode ter a categoria Receita" });
      continue;
    }
    const grupo = l.grupo.trim();
    const atual = porCodigo.get(code);
    if (!atual) {
      if (!grupos.has(grupo)) {
        out.erros.push({ linha: l.linha, code, motivo: grupo ? `grupo "${grupo}" não existe no plano` : "informe o código do grupo" });
        continue;
      }
      const parecida = existentes.find((e) => semelhanca(e.name, nome) >= 0.85);
      if (parecida) out.duplicidades.push({ linha: l.linha, code, motivo: `parecida com ${parecida.code} — ${parecida.name} (será criada mesmo assim; confira)` });
      out.novas.push({ ...l, code, name: nome, natureza });
      continue;
    }
    const mudancas: string[] = [];
    if (atual.name !== nome) mudancas.push(`nome: "${atual.name}" → "${nome}"`);
    if ((l.descricao ?? "").trim() && (atual.descricao ?? "") !== (l.descricao ?? "").trim()) mudancas.push("descrição");
    if (natureza !== atual.natureza) {
      out.erros.push({ linha: l.linha, code, motivo: "natureza não muda por importação (mude na tela, com a prévia de impacto)" });
      continue;
    }
    if (grupo && grupo !== atual.groupCode) {
      if (atual.usada) {
        out.erros.push({ linha: l.linha, code, motivo: "conta com lançamentos não muda de grupo por importação (use a tela, com a prévia de impacto)" });
        continue;
      }
      if (!grupos.has(grupo)) {
        out.erros.push({ linha: l.linha, code, motivo: `grupo "${grupo}" não existe no plano` });
        continue;
      }
      mudancas.push(`grupo: ${atual.groupCode} → ${grupo}`);
    }
    if (categoria && categoria !== atual.categoria) {
      mudancas.push(`categoria DRE: ${atual.categoria} → ${categoria}`);
      out.impactoDre.push({ code, de: atual.categoria, para: categoria, usada: atual.usada });
    }
    if (mudancas.length) out.alteradas.push({ linha: { ...l, code, name: nome, natureza }, id: atual.id, mudancas });
    else out.iguais++;
  }
  return out;
}

// ───────────────────────────── DRE gerencial ─────────────────────────────

export interface LancamentoGerencial {
  categoria: string;
  conta: string | null;
  valor: number;
}
export interface LinhaGerencial {
  id: string;
  rotulo: string;
  valor: number;
  tipo: "item" | "sub" | "final" | "conta" | "nota";
  pai?: string;
}

/**
 * DRE gerencial (Receita bruta → Resultado líquido) montada a partir dos
 * MESMOS lançamentos da cascata, só reagrupados pela classe gerencial da
 * conta. Sinal: receita soma, o resto subtrai (como na cascata). O que é
 * "fora do resultado" (investimento, empréstimo, distribuição) fica numa
 * linha de conciliação, de modo que o total bate com o Resultado Final da
 * cascata — sem dupla contagem.
 */
export function dreGerencial(
  entrada: { receitaSemConta: number; encargos: number; lancamentos: readonly LancamentoGerencial[] },
  contas: ReadonlyMap<string, { name: string; classe: ClasseGerencial }>,
): { linhas: LinhaGerencial[]; resultadoLiquido: number; foraDoResultado: number; resultadoDaCascata: number; semClasse: string[] } {
  const r2 = (v: number) => Math.round(v * 100) / 100;
  // contribuição de cada lançamento ao resultado (+ receita, − o resto)
  const porClasse = new Map<ClasseGerencial, number>(CLASSES_GERENCIAIS.map((c) => [c, 0]));
  const porConta = new Map<string, { classe: ClasseGerencial; rotulo: string; valor: number }>();
  const semClasse = new Set<string>();
  const somar = (classe: ClasseGerencial, chave: string, rotulo: string, contribuicao: number) => {
    porClasse.set(classe, (porClasse.get(classe) ?? 0) + contribuicao);
    const k = `${classe}|${chave}`;
    const atual = porConta.get(k) ?? { classe, rotulo, valor: 0 };
    atual.valor += contribuicao;
    porConta.set(k, atual);
  };
  if (entrada.receitaSemConta) somar("receita_bruta", "_receita", "Receita de contratos e vendas (sem conta do plano)", entrada.receitaSemConta);
  if (entrada.encargos) somar("resultado_financeiro", "_encargos", "Encargos de pagamento (juros, multa, desconto)", -entrada.encargos);
  for (const l of entrada.lancamentos) {
    const sinal = l.categoria === "Receita" ? 1 : -1;
    const conta = l.conta ? contas.get(l.conta) : undefined;
    const classe = conta?.classe ?? classePadrao(l.categoria);
    if (l.conta && !conta) semClasse.add(l.conta);
    somar(classe, l.conta ?? `_sem_${l.categoria}`, conta ? `${l.conta} — ${conta.name}` : l.conta ? `${l.conta} (fora do plano)` : `Sem conta (${l.categoria})`, sinal * l.valor);
  }
  const v = (c: ClasseGerencial) => r2(porClasse.get(c) ?? 0);
  const receitaBruta = v("receita_bruta");
  const receitaLiquida = r2(receitaBruta + v("deducao"));
  const resultadoBruto = r2(receitaLiquida + v("custo_servico"));
  const resultadoOperacional = r2(resultadoBruto + v("despesa_operacional"));
  const lair = r2(resultadoOperacional + v("resultado_financeiro") + v("outros_resultados"));
  const resultadoLiquido = r2(lair + v("tributo_lucro"));
  const fora = v("fora_do_resultado");
  const contasDe = (classe: ClasseGerencial): LinhaGerencial[] =>
    [...porConta.values()]
      .filter((x) => x.classe === classe && r2(x.valor) !== 0)
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo, undefined, { numeric: true }))
      .map((x) => ({ id: `${classe}:${x.rotulo}`, rotulo: x.rotulo, valor: r2(x.valor), tipo: "conta" as const, pai: classe }));
  const item = (classe: ClasseGerencial, rotulo: string): LinhaGerencial[] => [{ id: classe, rotulo, valor: v(classe), tipo: "item" }, ...contasDe(classe)];
  const linhas: LinhaGerencial[] = [
    ...item("receita_bruta", "Receita bruta"),
    ...item("deducao", "(−) Deduções da receita"),
    { id: "receita_liquida", rotulo: "= Receita líquida", valor: receitaLiquida, tipo: "sub" },
    ...item("custo_servico", "(−) Custos dos serviços prestados"),
    { id: "resultado_bruto", rotulo: "= Resultado bruto", valor: resultadoBruto, tipo: "sub" },
    ...item("despesa_operacional", "(−) Despesas operacionais"),
    { id: "resultado_operacional", rotulo: "= Resultado operacional", valor: resultadoOperacional, tipo: "sub" },
    ...item("resultado_financeiro", "(±) Resultado financeiro"),
    ...item("outros_resultados", "(±) Outras receitas e despesas não operacionais"),
    { id: "lair", rotulo: "= Resultado antes dos tributos sobre o lucro", valor: lair, tipo: "sub" },
    ...item("tributo_lucro", "(−) Tributos sobre o lucro"),
    { id: "resultado_liquido", rotulo: "= Resultado líquido", valor: resultadoLiquido, tipo: "final" },
    ...item("fora_do_resultado", "(−) Fora do resultado: investimentos, empréstimos e distribuição"),
    { id: "conciliacao", rotulo: "= Resultado Final da cascata (conferência)", valor: r2(resultadoLiquido + fora), tipo: "nota" },
  ];
  return { linhas, resultadoLiquido, foraDoResultado: fora, resultadoDaCascata: r2(resultadoLiquido + fora), semClasse: [...semClasse] };
}

// ───────────────────────────── Exportação ─────────────────────────────

/** Linhas da planilha de exportação, na ordem da árvore (grupo → subgrupo → conta). */
export function linhasDeExportacao(
  grupos: readonly { id: string; code: string; name: string; parentId: string | null; ordem: number }[],
  contas: readonly { code: string; name: string; groupCode: string; natureza: string; dreCategory: string | null; classeGerencial: string | null; tipoCusto: string | null; ativo: boolean; descricao: string | null; ordem: number; kind: string }[],
  categoriaDe: (c: (typeof contas)[number]) => string = (c) => c.dreCategory ?? "",
) {
  const ord = <T extends { ordem: number; code: string }>(l: readonly T[]) => [...l].sort((a, b) => a.ordem - b.ordem || a.code.localeCompare(b.code, undefined, { numeric: true }));
  const porId = new Map(grupos.map((g) => [g.id, g]));
  const raiz = (g: (typeof grupos)[number]): (typeof grupos)[number] => (g.parentId && porId.get(g.parentId) ? raiz(porId.get(g.parentId)!) : g);
  const out: Record<string, string>[] = [];
  const visitar = (g: (typeof grupos)[number]) => {
    for (const c of ord(contas.filter((x) => x.groupCode === g.code))) {
      const cat = categoriaDe(c);
      out.push({
        "Grupo (1º nível)": `${raiz(g).code} — ${raiz(g).name}`,
        Grupo: c.groupCode,
        "Nome do grupo": g.name,
        Código: c.code,
        Nome: c.name,
        Natureza: c.natureza === "receita" ? "Receita" : "Despesa",
        "Categoria DRE": cat,
        "Classe gerencial": ROTULO_CLASSE[classeDaConta(c, cat || "Despesa Fixa")],
        Custo: c.tipoCusto === "direto" ? "Direto" : c.tipoCusto === "indireto" ? "Indireto" : "",
        Situação: c.ativo ? "Ativa" : "Inativa",
        Descrição: c.descricao ?? "",
      });
    }
    for (const f of ord(grupos.filter((x) => x.parentId === g.id))) visitar(f);
  };
  for (const g of ord(grupos.filter((x) => !x.parentId))) visitar(g);
  // conta cujo grupo não está no cadastro de grupos (legado) vai ao fim
  const vistos = new Set(out.map((l) => l["Código"]));
  for (const c of ord(contas.filter((x) => !vistos.has(x.code))))
    out.push({ "Grupo (1º nível)": "", Grupo: c.groupCode, "Nome do grupo": "", Código: c.code, Nome: c.name, Natureza: c.natureza === "receita" ? "Receita" : "Despesa", "Categoria DRE": categoriaDe(c), "Classe gerencial": "", Custo: "", Situação: c.ativo ? "Ativa" : "Inativa", Descrição: c.descricao ?? "" });
  return out;
}
