/**
 * Equipes de Projetos (Prompt Z, Parte 3). PURO. A equipe REFERENCIA o
 * cadastro de origem — `stakeholder` (autônomo, sócio) ou `funcionario`
 * (CLT) — nunca copia nome ou documento. O valor da diária é DA ALOCAÇÃO
 * (3.5.4) e é GRAVADO em cada registro: alterar a alocação vale para os
 * próximos. CLT e sócio não têm diária (custo = folha / retirada). A diária
 * não gera despesa (BZ-1): a tela PROPÕE o lançamento em /despesas.
 */

/**
 * Funções criadas na primeira leitura de uma empresa sem funções (equipes-db).
 * Growth Ambiental: funções de equipe de campo de consultoria ambiental. As
 * empresas que já têm a lista não mudam (ela é editável na tela).
 */
export const FUNCOES_PADRAO = ["Técnico de campo", "Coordenador de campo", "Arqueólogo(a)", "Biólogo(a)", "Engenheiro(a) ambiental", "Auxiliar de campo", "Comercial", "Gestor Administrativo"] as const;
/** papéis de `stakeholder` que entram como autônomo (3.3). "Mão de Obra CLT" é papel antigo do cadastro: quem está lá é tratado como autônomo até migrar para Funcionários. */
export const PAPEIS_AUTONOMO = ["Prestador de Serviço", "Mão de Obra RPA", "Mão de Obra CLT", "Responsável Técnico (RT)"] as const;
export const PAPEIS_SOCIO = ["Sócio/Quotista"] as const;
// "Foto da equipe no canteiro" fica aceita para os registros antigos; o novo é "em campo".
export const TIPOS_DOC_EQUIPE_DIA = ["Folha de ponto assinada", "Foto da equipe em campo", "Recibo de diária", "Relatório de atividades de campo", "Outros", "Foto da equipe no canteiro"] as const;
export const QUANTIDADES_DIARIA = [0.5, 1, 1.5, 2] as const;

export type OrigemMembro = "autonomo" | "clt" | "socio";

/** 3.3 — o que um stakeholder é para a equipe: sócio (sem papel de trabalho) ou autônomo; null = não é alocável. */
export function origemDoStakeholder(papeis: readonly string[]): "autonomo" | "socio" | null {
  if (papeis.some((p) => (PAPEIS_AUTONOMO as readonly string[]).includes(p))) return "autonomo";
  if (papeis.some((p) => (PAPEIS_SOCIO as readonly string[]).includes(p))) return "socio";
  return null;
}

export interface AlocacaoParaValidar {
  stakeholderId: string | null | undefined;
  funcionarioId: string | null | undefined;
  origem: OrigemMembro | null;
  valorDiaria: number | null;
  funcionarioDesligado?: boolean;
  stakeholderAtivo?: boolean;
  entrada?: string | null;
  saida?: string | null;
}

/** 3.2 / 6 / 8 / 10b — origem única; CLT desligado e fornecedor inativo não entram; diária só para autônomo. */
export function recusaDaAlocacao(a: AlocacaoParaValidar): string | null {
  const temS = !!a.stakeholderId;
  const temF = !!a.funcionarioId;
  if (temS && temF) return "A alocação aponta para UM cadastro: fornecedor (autônomo/sócio) OU funcionário (CLT) — não os dois.";
  if (!temS && !temF) return "Escolha quem entra na equipe.";
  if (!a.origem) return "Este cadastro não é alocável: autônomo precisa de papel de serviço ou mão de obra; sócio, do papel Sócio/Quotista.";
  if (temF && a.funcionarioDesligado) return "Funcionário desligado não entra em equipe (o histórico dele fica).";
  if (temS && a.stakeholderAtivo === false) return "Cadastro inativo em Fornecedores não entra em equipe.";
  if (a.valorDiaria != null && (!Number.isFinite(a.valorDiaria) || a.valorDiaria < 0)) return "O valor da diária não pode ser negativo.";
  if (a.origem !== "autonomo" && a.valorDiaria != null && a.valorDiaria > 0) return "CLT e sócio não têm diária: o custo deles é a folha ou a retirada.";
  if (a.entrada && a.saida && a.saida < a.entrada) return "A saída da equipe não pode ser anterior à entrada.";
  return null;
}

/** 3.5.4 — o valor que vai GRAVADO no registro: o da alocação (autônomo); nulo para CLT e sócio. */
export function valorDaDiaria(origem: OrigemMembro, valorAlocacao: number | null): number | null {
  return origem === "autonomo" ? valorAlocacao : null;
}

/** 3.5.1 — quantidade inteira ou meia; autônomo precisa de valor vigente antes de registrar. */
export function recusaDoRegistro(r: { origem: OrigemMembro; valorAlocacao: number | null; quantidade: number; situacao: string }): string | null {
  if (r.situacao !== "ativa") return "Alocação encerrada: reative ou aloque de novo antes de registrar diária.";
  if (!(QUANTIDADES_DIARIA as readonly number[]).includes(r.quantidade)) return "Quantidade: ½, 1, 1½ ou 2 diárias.";
  if (r.origem === "autonomo" && (r.valorAlocacao == null || r.valorAlocacao <= 0)) return "Defina o valor da diária na alocação antes de registrar — o valor é gravado em cada registro.";
  return null;
}

export interface DiariaParaAcumular {
  id: string;
  equipeProjetoId: string;
  quantidade: number;
  valor: number | null;
  despesaId: string | null;
}
export interface AcumuladoDoMembro {
  equipeProjetoId: string;
  quantidade: number;
  valor: number;
  /** diárias ainda sem despesa lançada (BZ-1) — o que a tela propõe lançar. */
  semDespesa: { quantidade: number; valor: number; ids: string[] };
}
const r2 = (v: number) => Math.round(v * 100) / 100;

/** 3.5.5 — acumulado por membro, com o total da equipe. */
export function acumuladoPorMembro(diarias: readonly DiariaParaAcumular[]): { membros: AcumuladoDoMembro[]; total: { quantidade: number; valor: number } } {
  const m = new Map<string, AcumuladoDoMembro>();
  for (const d of diarias) {
    const a = m.get(d.equipeProjetoId) ?? { equipeProjetoId: d.equipeProjetoId, quantidade: 0, valor: 0, semDespesa: { quantidade: 0, valor: 0, ids: [] } };
    a.quantidade = r2(a.quantidade + d.quantidade);
    a.valor = r2(a.valor + (d.valor ?? 0) * d.quantidade);
    if (!d.despesaId && d.valor != null) {
      a.semDespesa.quantidade = r2(a.semDespesa.quantidade + d.quantidade);
      a.semDespesa.valor = r2(a.semDespesa.valor + d.valor * d.quantidade);
      a.semDespesa.ids.push(d.id);
    }
    m.set(d.equipeProjetoId, a);
  }
  const membros = [...m.values()].sort((x, y) => y.valor - x.valor);
  return { membros, total: { quantidade: r2(membros.reduce((s, x) => s + x.quantidade, 0)), valor: r2(membros.reduce((s, x) => s + x.valor, 0)) } };
}

/** BZ-1 — o link que PROPÕE o lançamento em /despesas com o autônomo como fornecedor; a despesa nasce lá. */
export function linkParaLancarDiarias(p: { projectId: string; fornecedorId: string; nome: string; valor: number; competencia: string; quantidade: number; diariasIds: readonly string[] }): string {
  const q = new URLSearchParams();
  q.set("proj", p.projectId);
  q.set("tab", "lancamentos");
  q.set("novo", "1");
  q.set("pf_valor", p.valor.toFixed(2));
  q.set("pf_comp", p.competencia);
  q.set("pf_fornecedor", p.fornecedorId);
  q.set("pf_obs", `Diárias ${p.competencia} · ${p.nome} · ${p.quantidade} diária(s)`);
  q.set("pf_diarias", p.diariasIds.join(","));
  return `/despesas?${q.toString()}`;
}

/** "MM/DD/YYYY" → "MM/YYYY" */
export const competenciaDaData = (dataBR: string) => `${dataBR.slice(0, 2)}/${dataBR.slice(6)}`;
