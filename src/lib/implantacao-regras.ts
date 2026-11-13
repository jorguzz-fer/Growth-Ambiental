/**
 * Implantação (onboarding) de uma empresa no Growth Ambiental — regras PURAS.
 * Serve a qualquer empresa (tenant): cada uma tem as próprias etapas.
 *
 * A implantação é um checklist por empresa, em grupos A a H. O modelo padrão
 * abaixo é só o ponto de partida: a empresa aplica o modelo e depois inclui,
 * edita ou exclui etapas (o modelo é customizável por empresa). Cada etapa tem
 * responsável, datas prevista e realizada, situação, dependência e evidência.
 *
 * Regras:
 *  · "Concluída" exige evidência (o que comprova: documento, link, relatório);
 *  · não se conclui nem se inicia uma etapa cuja dependência não foi concluída;
 *  · dependência só entre etapas da mesma empresa, sem ciclo;
 *  · "Bloqueada" e "Aguardando cliente" pedem observação (o motivo).
 */

export const STATUS_DA_ETAPA = ["nao_iniciada", "planejada", "em_andamento", "aguardando_cliente", "bloqueada", "concluida"] as const;
export type StatusDaEtapa = (typeof STATUS_DA_ETAPA)[number];
export const ROTULO_STATUS_ETAPA: Record<StatusDaEtapa, string> = {
  nao_iniciada: "Não iniciada",
  planejada: "Planejada",
  em_andamento: "Em andamento",
  aguardando_cliente: "Aguardando cliente",
  bloqueada: "Bloqueada",
  concluida: "Concluída",
};
export const ehStatusDaEtapa = (s: unknown): s is StatusDaEtapa => typeof s === "string" && (STATUS_DA_ETAPA as readonly string[]).includes(s);

export const GRUPOS_DA_IMPLANTACAO: Record<string, string> = {
  A: "A. Diagnóstico e levantamento",
  B: "B. Configuração inicial",
  C: "C. Estrutura financeira",
  D: "D. Cadastros operacionais",
  E: "E. Processos financeiros",
  F: "F. Treinamento",
  G: "G. Piloto assistido",
  H: "H. Homologação e entrada em operação",
};

export interface EtapaDoModelo {
  grupo: keyof typeof GRUPOS_DA_IMPLANTACAO;
  codigo: string;
  titulo: string;
  descricao: string;
  dependeDe?: string;
}

/**
 * Modelo padrão (sugerido) de implantação de uma consultoria ambiental. Sem
 * prazos: as datas previstas são combinadas com cada cliente.
 */
export const MODELO_DE_IMPLANTACAO: readonly EtapaDoModelo[] = [
  { grupo: "A", codigo: "A1", titulo: "Levantamento de necessidades", descricao: "Como a empresa mede, fatura, apropria custos e controla horas hoje; planilhas e sistemas usados." },
  { grupo: "A", codigo: "A2", titulo: "Cadastro de responsáveis", descricao: "Responsáveis de cada lado (cliente e implantação) por etapa.", dependeDe: "A1" },
  { grupo: "A", codigo: "A3", titulo: "Validação do escopo", descricao: "Escopo da implantação aprovado pelo cliente.", dependeDe: "A2" },
  { grupo: "B", codigo: "B1", titulo: "Empresa", descricao: "Razão social, CNPJ, regime tributário e dados do emitente fiscal.", dependeDe: "A3" },
  { grupo: "B", codigo: "B2", titulo: "Usuários", descricao: "Usuários criados para cada pessoa que vai operar.", dependeDe: "B1" },
  { grupo: "B", codigo: "B3", titulo: "Permissões", descricao: "Perfis (administrador, financeiro, gestor, técnico, diretoria) e revisão de acessos por tela.", dependeDe: "B2" },
  { grupo: "B", codigo: "B4", titulo: "Parâmetros", descricao: "Numeração, chaves de mudança, limites da IA e demais configurações.", dependeDe: "B1" },
  { grupo: "C", codigo: "C1", titulo: "Plano de Contas", descricao: "Plano padrão ambiental revisado e ajustado à empresa.", dependeDe: "B1" },
  { grupo: "C", codigo: "C2", titulo: "Centros de custo", descricao: "Hoje o sistema apropria por projeto e contrato; centro de custo como entidade própria é pendência registrada. Definir com o cliente como representar.", dependeDe: "C1" },
  { grupo: "C", codigo: "C3", titulo: "Contas bancárias", descricao: "Contas da empresa, saldos de abertura e cartões corporativos.", dependeDe: "B1" },
  { grupo: "C", codigo: "C4", titulo: "DRE", descricao: "Classificação das contas na DRE gerencial conferida com a contabilidade.", dependeDe: "C1" },
  { grupo: "C", codigo: "C5", titulo: "Budget e Forecast", descricao: "Versão Orçamento de cada projeto ativo, aprovada, e rotina de Previsão.", dependeDe: "D2" },
  { grupo: "D", codigo: "D1", titulo: "Clientes", descricao: "Clientes contratantes com documento e contatos.", dependeDe: "B1" },
  { grupo: "D", codigo: "D2", titulo: "Projetos", descricao: "Projetos ativos com fases, atividades e entregas.", dependeDe: "D1" },
  { grupo: "D", codigo: "D3", titulo: "Contratos", descricao: "Contratos vigentes com valor, itens, critérios de medição, aditivos e vínculo com os projetos.", dependeDe: "D2" },
  { grupo: "D", codigo: "D4", titulo: "Equipes", descricao: "Funcionários, prestadores e alocação nos projetos, com custo-hora quando houver.", dependeDe: "D2" },
  { grupo: "D", codigo: "D5", titulo: "Fornecedores", descricao: "Fornecedores recorrentes (laboratórios, hospedagem, locação, transporte).", dependeDe: "B1" },
  { grupo: "E", codigo: "E1", titulo: "Despesas", descricao: "Rotina de lançamento, classificação no plano e apropriação a projeto e contrato.", dependeDe: "C1" },
  { grupo: "E", codigo: "E2", titulo: "Medições", descricao: "Rotina de medição, envio e aprovação; medições anteriores à implantação registradas.", dependeDe: "D3" },
  { grupo: "E", codigo: "E3", titulo: "Reembolsos", descricao: "Despesas reembolsáveis, solicitação, aprovação e glosa (o tratamento contábil depende de validação).", dependeDe: "E1" },
  { grupo: "E", codigo: "E4", titulo: "Faturamento", descricao: "Faturas a partir das medições aprovadas; NFS-e só em homologação até a aprovação formal.", dependeDe: "E2" },
  { grupo: "E", codigo: "E5", titulo: "Contas a pagar e receber", descricao: "Títulos em aberto na data de corte e conciliação bancária.", dependeDe: "C3" },
  { grupo: "F", codigo: "F1", titulo: "Treinamento — administrativo", descricao: "Ver os treinamentos por perfil abaixo.", dependeDe: "B3" },
  { grupo: "F", codigo: "F2", titulo: "Treinamento — financeiro", descricao: "Despesas, pagamentos, recebimentos, reembolsos e conciliação.", dependeDe: "B3" },
  { grupo: "F", codigo: "F3", titulo: "Treinamento — gestores", descricao: "Projetos, contratos, fases, equipes, medições, orçamento e Forecast.", dependeDe: "B3" },
  { grupo: "F", codigo: "F4", titulo: "Treinamento — diretoria", descricao: "Dashboard, DRE, fluxo de caixa, margens, relatórios e Cris.", dependeDe: "B3" },
  { grupo: "F", codigo: "F5", titulo: "Treinamento — Cris", descricao: "Perguntas financeiras, leitura de documentos, preenchimento assistido com confirmação e limites.", dependeDe: "B3" },
  { grupo: "G", codigo: "G1", titulo: "Projeto fictício", descricao: "Projeto de piloto com dados fictícios, separado da operação.", dependeDe: "D3" },
  { grupo: "G", codigo: "G2", titulo: "Lançamentos", descricao: "Despesas, horas e reembolsos do piloto.", dependeDe: "G1" },
  { grupo: "G", codigo: "G3", titulo: "Medições", descricao: "Medição, aprovação, faturamento simulado e recebimento no piloto.", dependeDe: "G2" },
  { grupo: "G", codigo: "G4", titulo: "Forecast", descricao: "Previsão e projeção ao término do piloto.", dependeDe: "G2" },
  { grupo: "G", codigo: "G5", titulo: "Relatórios", descricao: "DRE, fluxo, relatório gerencial e Dashboard conferidos com o piloto.", dependeDe: "G3" },
  { grupo: "H", codigo: "H1", titulo: "Checklist de homologação", descricao: "Fluxo ponta a ponta e conferências financeiras (ver HOMOLOGACAO_PONTA_A_PONTA.md).", dependeDe: "G5" },
  { grupo: "H", codigo: "H2", titulo: "Aprovação", descricao: "Aceite formal do cliente para entrar em operação.", dependeDe: "H1" },
  { grupo: "H", codigo: "H3", titulo: "Pendências", descricao: "Pendências abertas registradas com responsável e data.", dependeDe: "H1" },
  { grupo: "H", codigo: "H4", titulo: "Suporte inicial", descricao: "Operação assistida nas primeiras semanas.", dependeDe: "H2" },
];

export const PERFIS_DE_TREINAMENTO: Record<string, { rotulo: string; temas: string[] }> = {
  financeiro: { rotulo: "Administrativo e financeiro", temas: ["Despesas", "Pagamentos", "Recebimentos", "Reembolsos", "Conciliação"] },
  gestores: { rotulo: "Gestores de projeto", temas: ["Projetos", "Contratos", "Fases", "Equipes", "Medições", "Orçamento e Forecast"] },
  diretoria: { rotulo: "Diretoria", temas: ["Dashboard", "DRE", "Fluxo de caixa", "Margens", "Relatórios", "Cris"] },
  administradores: { rotulo: "Administradores", temas: ["Usuários", "Permissões", "Plano de Contas", "Configurações", "Auditoria"] },
};
export const STATUS_DO_TREINAMENTO = ["planejado", "realizado", "pendente"] as const;
export type StatusDoTreinamento = (typeof STATUS_DO_TREINAMENTO)[number];
export const ROTULO_STATUS_TREINAMENTO: Record<StatusDoTreinamento, string> = { planejado: "Planejado", realizado: "Realizado", pendente: "Pendente" };

export interface EtapaParaRegra {
  codigo: string;
  status: string;
  dependeDe: string | null;
}

/** Recusa (texto) da mudança de situação, ou null quando pode. */
export function recusaDeSituacao(alvo: EtapaParaRegra & { para: string; evidencia?: string | null; observacoes?: string | null }, todas: readonly EtapaParaRegra[]): string | null {
  if (!ehStatusDaEtapa(alvo.para)) return "Situação inválida.";
  if (alvo.para === "concluida" && !(alvo.evidencia ?? "").trim()) return "Para concluir, registre a evidência (documento, link ou relatório que comprova).";
  if ((alvo.para === "bloqueada" || alvo.para === "aguardando_cliente") && !(alvo.observacoes ?? "").trim()) return "Informe na observação o motivo do bloqueio ou o que se espera do cliente.";
  if ((alvo.para === "em_andamento" || alvo.para === "concluida") && alvo.dependeDe) {
    const dep = todas.find((e) => e.codigo === alvo.dependeDe);
    if (dep && dep.status !== "concluida") return `A etapa ${dep.codigo} precisa estar concluída antes.`;
  }
  return null;
}

/** Recusa da dependência (inexistente, ela mesma ou ciclo), ou null. */
export function recusaDeDependencia(codigo: string, dependeDe: string | null, todas: readonly EtapaParaRegra[]): string | null {
  if (!dependeDe) return null;
  if (dependeDe === codigo) return "A etapa não pode depender de si mesma.";
  const porCodigo = new Map(todas.map((e) => [e.codigo, e]));
  if (!porCodigo.has(dependeDe)) return `Etapa ${dependeDe} não existe nesta implantação.`;
  // anda pela cadeia a partir da dependência; voltar ao código é ciclo
  const vistos = new Set<string>();
  let atual: string | null = dependeDe;
  while (atual) {
    if (atual === codigo) return "Essa dependência cria um ciclo entre etapas.";
    if (vistos.has(atual)) break;
    vistos.add(atual);
    atual = porCodigo.get(atual)?.dependeDe ?? null;
  }
  return null;
}

export interface ResumoDaImplantacao {
  total: number;
  concluidas: number;
  percentual: number;
  porStatus: Record<StatusDaEtapa, number>;
  /** etapas abertas com data prevista já passada */
  atrasadas: number;
  /** etapas que não podem começar porque a dependência não terminou */
  esperandoDependencia: number;
}

const ymd = (mdy: string | null | undefined) => (mdy && /^\d{2}\/\d{2}\/\d{4}$/.test(mdy) ? Number(mdy.slice(6) + mdy.slice(0, 2) + mdy.slice(3, 5)) : null);

export function resumoDaImplantacao(etapas: readonly (EtapaParaRegra & { previsto: string | null })[], hojeMDY: string): ResumoDaImplantacao {
  const porStatus = Object.fromEntries(STATUS_DA_ETAPA.map((s) => [s, 0])) as Record<StatusDaEtapa, number>;
  for (const e of etapas) if (ehStatusDaEtapa(e.status)) porStatus[e.status]++;
  const hoje = ymd(hojeMDY) ?? 0;
  const status = new Map(etapas.map((e) => [e.codigo, e.status]));
  const abertas = etapas.filter((e) => e.status !== "concluida");
  return {
    total: etapas.length,
    concluidas: porStatus.concluida,
    percentual: etapas.length ? Math.round((porStatus.concluida / etapas.length) * 100) : 0,
    porStatus,
    atrasadas: abertas.filter((e) => (ymd(e.previsto) ?? Infinity) < hoje).length,
    esperandoDependencia: abertas.filter((e) => e.dependeDe && status.has(e.dependeDe) && status.get(e.dependeDe) !== "concluida").length,
  };
}
