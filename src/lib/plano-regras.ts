/**
 * Planejamento de projetos — regras PURAS (sem banco). Ver
 * docs/MODULO_PLANEJAMENTO_PROJETOS.md.
 *
 * Princípio: o sistema SUGERE, a consultoria DECIDE. Nada aqui exige fase,
 * atividade, data ou entrega. A biblioteca e os modelos são sugestões; o
 * plano de cada projeto guarda só o que foi escolhido, como cópia editável.
 */
import { ymd } from "@/lib/utils";

// ───────────────────────────── Situações ─────────────────────────────

export const STATUS_ITEM = ["planejada", "nao_iniciada", "em_andamento", "suspensa", "concluida", "cancelada"] as const;
export type StatusItem = (typeof STATUS_ITEM)[number];
export const ROTULO_STATUS_ITEM: Record<StatusItem, string> = {
  planejada: "Planejada",
  nao_iniciada: "Não iniciada",
  em_andamento: "Em andamento",
  suspensa: "Suspensa",
  concluida: "Concluída",
  cancelada: "Cancelada",
};
export const ehStatusItem = (v: unknown): v is StatusItem => typeof v === "string" && (STATUS_ITEM as readonly string[]).includes(v);

/**
 * Entrega: a conclusão técnica, o aceite do cliente, a medição aprovada e o
 * faturamento são eventos DIFERENTES. Aqui só os dois primeiros; medição e
 * fatura seguem as regras do módulo de Contratos.
 */
export const STATUS_ENTREGA = ["prevista", "em_elaboracao", "entregue", "aceita", "rejeitada", "cancelada"] as const;
export type StatusEntrega = (typeof STATUS_ENTREGA)[number];
export const ROTULO_STATUS_ENTREGA: Record<StatusEntrega, string> = {
  prevista: "Prevista",
  em_elaboracao: "Em elaboração",
  entregue: "Entregue (concluída tecnicamente)",
  aceita: "Aceita pelo cliente",
  rejeitada: "Devolvida pelo cliente",
  cancelada: "Cancelada",
};
export const ehStatusEntrega = (v: unknown): v is StatusEntrega => typeof v === "string" && (STATUS_ENTREGA as readonly string[]).includes(v);
export const TIPOS_ENTREGA = ["entrega", "marco"] as const;

// ───────────────────────────── Biblioteca e modelos sugeridos ─────────────────────────────

export interface FaseSugerida {
  nome: string;
  atividades: string[];
  entregas?: string[];
}

/** Biblioteca padrão inicial (a mesma da migração 0078). Sugestões genéricas — nenhuma obrigatória. */
export const BIBLIOTECA_INICIAL: readonly FaseSugerida[] = [
  { nome: "Planejamento e mobilização", atividades: ["Análise documental", "Planejamento das atividades", "Mobilização de equipe", "Preparação logística"] },
  { nome: "Diagnóstico e levantamentos preliminares", atividades: ["Levantamento bibliográfico", "Levantamento de campo", "Diagnóstico técnico", "Consolidação dos resultados preliminares"] },
  { nome: "Execução dos serviços técnicos", atividades: ["Execução das atividades de campo", "Registro de ocorrências", "Coleta e tratamento de dados", "Supervisão técnica"] },
  { nome: "Monitoramento e acompanhamento", atividades: ["Campanhas de monitoramento", "Acompanhamento de atividades", "Registro e análise dos resultados"] },
  { nome: "Análise e consolidação", atividades: ["Tratamento dos dados", "Análises técnicas", "Consolidação de informações"] },
  { nome: "Relatórios e entregas", atividades: ["Elaboração de relatórios", "Revisão técnica", "Entrega de produtos", "Protocolo e apresentação ao cliente"] },
  { nome: "Encerramento", atividades: ["Validação das entregas", "Desmobilização", "Encerramento administrativo", "Encerramento financeiro"] },
];

/**
 * Modelos por modalidade que a empresa pode ADICIONAR à sua biblioteca (não
 * entram sozinhos). Depois de adicionados, são da empresa: edita, duplica,
 * desativa ou apaga à vontade.
 */
export const MODELOS_SUGERIDOS: readonly { chave: string; nome: string; modalidade: string; fases: FaseSugerida[] }[] = [
  {
    chave: "monitoramento_arqueologico",
    nome: "Monitoramento arqueológico",
    modalidade: "Arqueologia e patrimônio cultural",
    fases: [
      { nome: "Mobilização", atividades: ["Análise do projeto e das autorizações", "Mobilização da equipe de arqueologia", "Integração de segurança na obra"] },
      { nome: "Monitoramento das frentes de obra", atividades: ["Acompanhamento das frentes de escavação", "Registro de ocorrências arqueológicas", "Comunicação de achados ao órgão competente"], entregas: ["Relatório mensal de monitoramento"] },
      { nome: "Relatórios e encerramento", atividades: ["Consolidação dos registros", "Elaboração do relatório final", "Desmobilização"], entregas: ["Relatório final de monitoramento", "Protocolo junto ao órgão competente"] },
    ],
  },
  {
    chave: "prospeccao_arqueologica",
    nome: "Prospecção arqueológica",
    modalidade: "Prospecção arqueológica",
    fases: [
      { nome: "Planejamento", atividades: ["Levantamento bibliográfico e documental", "Definição da malha amostral", "Mobilização"] },
      { nome: "Prospecção de campo", atividades: ["Caminhamento sistemático", "Sondagens e poços-teste", "Registro e georreferenciamento"] },
      { nome: "Análise e relatório", atividades: ["Análise do material coletado", "Elaboração do relatório"], entregas: ["Relatório de prospecção", "Protocolo junto ao órgão competente"] },
    ],
  },
  {
    chave: "resgate_arqueologico",
    nome: "Resgate arqueológico",
    modalidade: "Resgate e salvamento arqueológico",
    fases: [
      { nome: "Planejamento do resgate", atividades: ["Projeto de resgate", "Mobilização da equipe", "Logística de campo"] },
      { nome: "Escavação e registro", atividades: ["Escavação controlada", "Registro de contexto", "Coleta e acondicionamento"] },
      { nome: "Laboratório e curadoria", atividades: ["Triagem e higienização", "Análise do acervo", "Encaminhamento à instituição de guarda"] },
      { nome: "Relatórios", atividades: ["Elaboração do relatório final"], entregas: ["Relatório final de resgate"] },
    ],
  },
  {
    chave: "patrimonio_cultural",
    nome: "Gestão do patrimônio cultural",
    modalidade: "Arqueologia e patrimônio cultural",
    fases: [
      { nome: "Diagnóstico do patrimônio", atividades: ["Levantamento do patrimônio material e imaterial", "Consulta às comunidades"] },
      { nome: "Programa de gestão", atividades: ["Ações de preservação", "Educação patrimonial"], entregas: ["Relatório do programa"] },
    ],
  },
  {
    chave: "monitoramento_fauna",
    nome: "Monitoramento de fauna",
    modalidade: "Monitoramento de fauna",
    fases: [
      { nome: "Planejamento e autorizações", atividades: ["Plano de trabalho", "Autorização de captura e coleta", "Mobilização"] },
      { nome: "Campanhas de campo", atividades: ["Campanha sazonal de amostragem", "Registro e identificação", "Tratamento dos dados da campanha"], entregas: ["Relatório de campanha"] },
      { nome: "Consolidação", atividades: ["Análise da série histórica", "Elaboração do relatório consolidado"], entregas: ["Relatório consolidado de monitoramento"] },
    ],
  },
  {
    chave: "resgate_fauna",
    nome: "Resgate de fauna",
    modalidade: "Resgate de fauna",
    fases: [
      { nome: "Preparação", atividades: ["Plano de resgate", "Autorização de manejo", "Estrutura de triagem e soltura"] },
      { nome: "Acompanhamento da supressão", atividades: ["Afugentamento", "Captura e triagem", "Destinação e soltura"] },
      { nome: "Relatórios", atividades: ["Consolidação dos registros"], entregas: ["Relatório de resgate de fauna"] },
    ],
  },
  {
    chave: "flora",
    nome: "Inventário e manejo de flora",
    modalidade: "Inventário e manejo de flora",
    fases: [
      { nome: "Planejamento", atividades: ["Definição da amostragem", "Mobilização"] },
      { nome: "Levantamento florístico", atividades: ["Instalação de parcelas", "Coleta e identificação botânica", "Inventário florestal"] },
      { nome: "Análise e relatório", atividades: ["Processamento dos dados", "Elaboração do relatório"], entregas: ["Relatório de inventário florestal"] },
    ],
  },
  {
    chave: "licenciamento",
    nome: "Licenciamento ambiental",
    modalidade: "Licenciamento ambiental",
    fases: [
      { nome: "Enquadramento e planejamento", atividades: ["Análise do empreendimento", "Enquadramento legal", "Termo de referência"] },
      { nome: "Elaboração dos estudos", atividades: ["Diagnóstico ambiental", "Avaliação de impactos", "Programas ambientais"], entregas: ["Estudo ambiental"] },
      { nome: "Protocolo e acompanhamento", atividades: ["Protocolo no órgão licenciador", "Atendimento a pedidos de complementação", "Acompanhamento de condicionantes"], entregas: ["Protocolo do pedido de licença"] },
    ],
  },
  {
    chave: "diagnostico_ambiental",
    nome: "Diagnóstico ambiental",
    modalidade: "Consultoria e estudos ambientais",
    fases: [
      { nome: "Levantamentos", atividades: ["Dados secundários", "Campanha de campo"] },
      { nome: "Diagnóstico", atividades: ["Meio físico", "Meio biótico", "Meio socioeconômico"], entregas: ["Relatório de diagnóstico"] },
    ],
  },
  {
    chave: "educacao_ambiental",
    nome: "Educação ambiental",
    modalidade: "Educação ambiental e patrimonial",
    fases: [
      { nome: "Planejamento", atividades: ["Diagnóstico participativo", "Planejamento das ações"] },
      { nome: "Execução", atividades: ["Oficinas e atividades educativas", "Registro de participação"], entregas: ["Relatório de atividades"] },
    ],
  },
  {
    chave: "consultoria_simplificada",
    nome: "Consultoria técnica simplificada",
    modalidade: "Consultoria técnica especializada",
    fases: [{ nome: "Execução", atividades: ["Análise técnica", "Elaboração do parecer"], entregas: ["Parecer técnico"] }],
  },
];

// ───────────────────────────── Seleção (biblioteca, modelos, Cris) ─────────────────────────────

/** Origem de um elemento proposto: veio do documento, da biblioteca, ou é sugestão da IA. */
export type OrigemProposta = "documento" | "biblioteca" | "sugestao" | "manual";

export interface NoDeSelecao {
  /** chave estável na tela (não vai ao banco). */
  chave: string;
  nome: string;
  descricao?: string | null;
  marcado: boolean;
  origem?: OrigemProposta;
  /** trecho do documento que fundamenta a sugestão (Cris). */
  trecho?: string | null;
  origemModeloId?: string | null;
}
export interface AtividadeSelecionada extends NoDeSelecao {
  tipo?: "atividade" | "entrega";
  subatividades: NoDeSelecao[];
  responsavel?: string | null;
  inicio?: string | null;
  termino?: string | null;
}
export interface FaseSelecionada extends NoDeSelecao {
  atividades: AtividadeSelecionada[];
  entregas: (NoDeSelecao & { data?: string | null })[];
  responsavel?: string | null;
  inicio?: string | null;
  termino?: string | null;
}

/** Linhas de um modelo (banco) → árvore de seleção; marcado = ativo E sugerido. */
export function arvoreDoModelo(
  fases: readonly { id: string; nome: string; descricao?: string | null; ordem: number; ativo: boolean; sugerida: boolean }[],
  atividades: readonly { id: string; faseId: string; parentId: string | null; tipo: string; nome: string; descricao?: string | null; ordem: number; ativo: boolean; sugerida: boolean }[],
): FaseSelecionada[] {
  const ord = <T extends { ordem: number }>(l: T[]) => [...l].sort((a, b) => a.ordem - b.ordem);
  return ord(fases.filter((f) => f.ativo)).map((f) => {
    const daFase = atividades.filter((a) => a.faseId === f.id && a.ativo);
    return {
      chave: `mf:${f.id}`,
      nome: f.nome,
      descricao: f.descricao ?? null,
      marcado: f.sugerida,
      origem: "biblioteca" as const,
      origemModeloId: f.id,
      atividades: ord(daFase.filter((a) => !a.parentId && a.tipo !== "entrega")).map((a) => ({
        chave: `ma:${a.id}`,
        nome: a.nome,
        descricao: a.descricao ?? null,
        marcado: f.sugerida && a.sugerida,
        origem: "biblioteca" as const,
        origemModeloId: a.id,
        subatividades: ord(daFase.filter((s) => s.parentId === a.id)).map((s) => ({ chave: `ma:${s.id}`, nome: s.nome, descricao: s.descricao ?? null, marcado: f.sugerida && a.sugerida && s.sugerida, origem: "biblioteca" as const, origemModeloId: s.id })),
      })),
      entregas: ord(daFase.filter((a) => a.tipo === "entrega")).map((e) => ({ chave: `me:${e.id}`, nome: e.nome, descricao: e.descricao ?? null, marcado: f.sugerida && e.sugerida, origem: "biblioteca" as const, origemModeloId: e.id })),
    };
  });
}

/**
 * O que será GRAVADO: só fases marcadas, e nelas só atividades/entregas
 * marcadas. Fase sem atividade marcada é válida (o usuário pode querer só a
 * fase). Nomes vazios caem. Nada é completado automaticamente.
 */
export function filtrarSelecao(fases: readonly FaseSelecionada[]): FaseSelecionada[] {
  return fases
    .filter((f) => f.marcado && f.nome.trim())
    .map((f) => ({
      ...f,
      nome: f.nome.trim(),
      atividades: f.atividades
        .filter((a) => a.marcado && a.nome.trim())
        .map((a) => ({ ...a, nome: a.nome.trim(), subatividades: a.subatividades.filter((s) => s.marcado && s.nome.trim()).map((s) => ({ ...s, nome: s.nome.trim() })) })),
      entregas: f.entregas.filter((e) => e.marcado && e.nome.trim()).map((e) => ({ ...e, nome: e.nome.trim() })),
    }));
}

export const LIMITES = { fases: 60, atividadesPorFase: 120, subPorAtividade: 60, nome: 200 } as const;

/** Data interna "MM/DD/YYYY" existente (mês 1–12, dia válido no mês). */
export function dataValida(s: string | null | undefined): boolean {
  const m = s ? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s) : null;
  if (!m) return false;
  const [mo, d, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return mo >= 1 && mo <= 12 && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Recusa de uma seleção (estrutura, tamanhos, datas). Vazia é válida: começar em branco. */
export function recusaDaSelecao(fases: readonly FaseSelecionada[]): string | null {
  if (fases.length > LIMITES.fases) return `No máximo ${LIMITES.fases} fases por vez.`;
  for (const f of fases) {
    if (f.nome.length > LIMITES.nome) return "Nome de fase longo demais.";
    if (f.atividades.length > LIMITES.atividadesPorFase) return `No máximo ${LIMITES.atividadesPorFase} atividades por fase.`;
    for (const d of [f.inicio, f.termino]) if (d && !dataValida(d)) return `Data inválida na fase "${f.nome}".`;
    if (f.inicio && f.termino && ymd(f.termino)! < ymd(f.inicio)!) return `A fase "${f.nome}" termina antes de começar.`;
    for (const a of f.atividades) {
      if (a.nome.length > LIMITES.nome) return "Nome de atividade longo demais.";
      if (a.subatividades.length > LIMITES.subPorAtividade) return `No máximo ${LIMITES.subPorAtividade} subatividades por atividade.`;
      for (const d of [a.inicio, a.termino]) if (d && !dataValida(d)) return `Data inválida na atividade "${a.nome}".`;
    }
  }
  return null;
}

// ───────────────────────────── Hierarquia ─────────────────────────────

/**
 * Hierarquia do plano: fase → atividade → subatividade (um nível). Recusa:
 * pai de outra fase ou projeto, pai que já é subatividade, ser pai de si
 * mesmo, e virar subatividade tendo subatividades (o que criaria 3 níveis).
 */
export function recusaDeHierarquia(
  item: { id?: string | null; faseId: string; projectId: string },
  parent: { id: string; faseId: string; projectId: string; parentId: string | null } | null,
  temFilhos: boolean,
): string | null {
  if (!parent) return null;
  if (item.id && parent.id === item.id) return "Uma atividade não pode ser subatividade de si mesma.";
  if (parent.projectId !== item.projectId || parent.faseId !== item.faseId) return "A atividade superior precisa ser da mesma fase.";
  if (parent.parentId) return "Subatividade não tem subatividade: escolha uma atividade principal.";
  if (temFilhos) return "Esta atividade tem subatividades: ela não pode virar subatividade de outra.";
  return null;
}

// ───────────────────────────── Progresso físico ─────────────────────────────

export interface ItemDeProgresso {
  id: string;
  parentId?: string | null;
  status: string;
  percentual: number | string | null;
  peso?: number | string | null;
  horasPrevistas?: number | string | null;
}
export interface Progresso {
  percentual: number | null;
  base: "informado" | "pesos" | "horas" | "trivial" | "sem_base";
  motivo?: string;
}

const n = (v: number | string | null | undefined) => (v == null || v === "" ? null : Number(v));
const pctDoItem = (i: ItemDeProgresso): number | null => (i.status === "concluida" ? 100 : n(i.percentual));

/**
 * Consolida o progresso de um conjunto de itens SEM inventar: precisa do %
 * de cada um (ou concluída = 100) e de uma base de ponderação comum — peso em
 * todos, ou horas previstas em todos. Sem base, só os casos sem ambiguidade
 * (tudo 0 ou tudo 100). Itens cancelados não entram.
 */
export function consolidar(itens: readonly ItemDeProgresso[]): Progresso {
  const vivos = itens.filter((i) => i.status !== "cancelada");
  if (!vivos.length) return { percentual: null, base: "sem_base", motivo: "sem itens" };
  const pcts = vivos.map(pctDoItem);
  if (pcts.some((p) => p == null)) return { percentual: null, base: "sem_base", motivo: "há itens sem percentual informado" };
  const ps = pcts as number[];
  if (ps.every((p) => p === ps[0]) && (ps[0] === 0 || ps[0] === 100)) return { percentual: ps[0], base: "trivial" };
  const pesos = vivos.map((i) => n(i.peso));
  if (pesos.every((p) => p != null && p > 0)) {
    const tot = (pesos as number[]).reduce((s, p) => s + p, 0);
    return { percentual: Math.round((ps.reduce((s, p, k) => s + p * (pesos[k] as number), 0) / tot) * 100) / 100, base: "pesos" };
  }
  const horas = vivos.map((i) => n(i.horasPrevistas));
  if (horas.every((h) => h != null && h > 0)) {
    const tot = (horas as number[]).reduce((s, h) => s + h, 0);
    return { percentual: Math.round((ps.reduce((s, p, k) => s + p * (horas[k] as number), 0) / tot) * 100) / 100, base: "horas" };
  }
  return { percentual: null, base: "sem_base", motivo: "defina o peso ou as horas previstas de todos os itens (não se presume peso igual)" };
}

/** Progresso de uma atividade: o informado, ou o consolidado das subatividades. */
export function progressoDaAtividade(a: ItemDeProgresso, subs: readonly ItemDeProgresso[]): Progresso {
  const p = pctDoItem(a);
  if (p != null) return { percentual: p, base: "informado" };
  if (!subs.length) return { percentual: null, base: "sem_base", motivo: "percentual não informado" };
  return consolidar(subs);
}

/** Progresso de uma fase: o informado, ou o consolidado das atividades principais. */
export function progressoDaFase(f: ItemDeProgresso, atividades: readonly ItemDeProgresso[]): Progresso {
  const p = pctDoItem(f);
  if (p != null) return { percentual: p, base: "informado" };
  const principais = atividades.filter((a) => !a.parentId);
  const itens = principais.map((a) => {
    const pr = progressoDaAtividade(a, atividades.filter((s) => s.parentId === a.id));
    return { ...a, percentual: pr.percentual, status: a.status === "concluida" ? "concluida" : a.status };
  });
  if (!itens.length) return { percentual: null, base: "sem_base", motivo: "sem atividades" };
  return consolidar(itens);
}

// ───────────────────────────── Prazos, atraso e linha de base ─────────────────────────────

/** Atrasado: término planejado já passou e não está concluído nem cancelado. */
export function atrasado(i: { terminoPrevisto?: string | null; terminoReal?: string | null; status: string }, hoje: string): boolean {
  if (i.status === "concluida" || i.status === "cancelada" || i.terminoReal) return false;
  const t = ymd(i.terminoPrevisto);
  const h = ymd(hoje);
  return t != null && h != null && t < h;
}

/** Dias entre a data original (linha de base) e a atual; positivo = adiado. */
export function desvioEmDias(original: string | null | undefined, atual: string | null | undefined): number | null {
  const a = ymd(original);
  const b = ymd(atual);
  if (a == null || b == null) return null;
  const d = (x: number) => Date.UTC(Math.floor(x / 10000), Math.floor((x % 10000) / 100) - 1, x % 100);
  return Math.round((d(b) - d(a)) / 86400000);
}

/**
 * Linha de base: a primeira data planejada vira a original e não muda mais;
 * mudanças depois são reprogramação (ficam na auditoria com de/para).
 */
export function linhaDeBase(original: string | null | undefined, atualAntes: string | null | undefined, atualNova: string | null | undefined): { original: string | null; reprogramou: boolean } {
  if (!original) return { original: atualNova ?? atualAntes ?? null, reprogramou: false };
  return { original, reprogramou: (atualAntes ?? null) !== (atualNova ?? null) };
}

/** Código de exibição (1, 1.2, 1.2.3) quando o item não tem código próprio. */
export function codigoDeExibicao(faseOrdem: number, atividadeOrdem?: number, subOrdem?: number): string {
  return [faseOrdem, atividadeOrdem, subOrdem].filter((x) => x != null).join(".");
}

// ───────────────────────────── Proposta da Cris ─────────────────────────────

export const MAX_FASES_CRIS = 12;
const normal = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const origemDe = (s: string | undefined): OrigemProposta => {
  const t = normal(s ?? "");
  return t.startsWith("doc") ? "documento" : t.startsWith("bib") ? "biblioteca" : "sugestao";
};

/**
 * Lê a proposta da Cris (campos do formulário) e devolve a árvore para
 * CONFERÊNCIA. Atividades: uma por linha, "Nome | origem | trecho"; linha que
 * começa com "-" é subatividade da anterior. Entregas: "Nome | data | origem".
 * Nada é marcado como obrigatório; o usuário desmarca o que não quiser.
 */
export function propostaDaCris(v: Record<string, string>, biblioteca: readonly { id: string; nome: string }[] = []): FaseSelecionada[] {
  const casa = (nome: string) => biblioteca.find((b) => normal(b.nome) === normal(nome))?.id ?? null;
  const out: FaseSelecionada[] = [];
  for (let k = 1; k <= MAX_FASES_CRIS; k++) {
    const nome = (v[`fase${k}_nome`] ?? "").trim();
    if (!nome) continue;
    const atividades: AtividadeSelecionada[] = [];
    for (const linha of (v[`fase${k}_atividades`] ?? "").split(/\r?\n|;(?=\s*[-A-ZÁÉÍÓÚa-z])/)) {
      const bruto = linha.trim();
      if (!bruto) continue;
      const sub = bruto.startsWith("-");
      const [n0, o, t] = bruto.replace(/^[-•*]\s*/, "").split("|").map((x) => x.trim());
      if (!n0) continue;
      const no = { chave: `c:${k}:${atividades.length}:${n0}`, nome: n0, marcado: true, origem: origemDe(o), trecho: t || null, origemModeloId: origemDe(o) === "biblioteca" ? casa(n0) : null };
      if (sub && atividades.length) atividades[atividades.length - 1].subatividades.push(no);
      else atividades.push({ ...no, subatividades: [] });
    }
    const entregas = (v[`fase${k}_entregas`] ?? "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l, i) => {
        const [n0, d, o] = l.replace(/^[-•*]\s*/, "").split("|").map((x) => x.trim());
        return { chave: `ce:${k}:${i}`, nome: n0, marcado: true, origem: origemDe(o), data: dataValida(d) ? d : null, trecho: null };
      })
      .filter((e) => e.nome);
    const origem = origemDe(v[`fase${k}_origem`]);
    out.push({
      chave: `cf:${k}`,
      nome,
      marcado: true,
      origem,
      trecho: (v[`fase${k}_trecho`] ?? "").trim() || null,
      origemModeloId: origem === "biblioteca" ? casa(nome) : null,
      responsavel: (v[`fase${k}_responsavel`] ?? "").trim() || null,
      inicio: dataValida(v[`fase${k}_inicio`]) ? v[`fase${k}_inicio`] : null,
      termino: dataValida(v[`fase${k}_termino`]) ? v[`fase${k}_termino`] : null,
      atividades,
      entregas,
    });
  }
  return out;
}
