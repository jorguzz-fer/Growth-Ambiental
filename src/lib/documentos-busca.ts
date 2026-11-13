/**
 * Busca transversal de documentos (Growth Ambiental). Módulo PURO: decide de
 * que tipo é cada documento (pelo vínculo) e se a pessoa pode vê-lo — a MESMA
 * permissão da tela de origem. Documento de funcionário exige a permissão de
 * dados pessoais (`funcionariosdados`). Nada amplia acesso.
 */
import type { PermMatrix } from "@/lib/permissions";

export type OrigemDoDocumento = "contrato" | "medicao" | "despesa" | "cliente" | "fornecedor" | "projeto" | "conta_receber" | "funcionario" | "equipe" | "estoque" | "outro";

export const ROTULO_ORIGEM: Record<OrigemDoDocumento, string> = {
  contrato: "Contrato / aditivo",
  medicao: "Medição de contrato",
  despesa: "Despesa",
  cliente: "Cliente",
  fornecedor: "Fornecedor / prestador",
  projeto: "Projeto / plano de trabalho",
  conta_receber: "Conta a receber",
  funcionario: "Funcionário",
  equipe: "Equipe de campo / folha",
  estoque: "Materiais e equipamentos",
  outro: "Outro",
};

/** Tela (permissão "ver") que governa cada origem. */
export const TELA_DA_ORIGEM: Record<OrigemDoDocumento, string | null> = {
  contrato: "contratos",
  medicao: "contratos",
  despesa: "despesas",
  cliente: "clientes",
  fornecedor: "fornecedores",
  projeto: "projeto",
  conta_receber: "contasreceber",
  funcionario: "funcionariosdados",
  equipe: "equipes",
  estoque: "estoque",
  outro: null,
};

export interface VinculosDoDocumento {
  contratoMedicaoId?: string | null;
  contratoId?: string | null;
  contratoAditivoId?: string | null;
  despesaId?: string | null;
  clienteId?: string | null;
  stakeholderId?: string | null;
  contaReceberId?: string | null;
  funcionarioId?: string | null;
  equipeDiaId?: string | null;
  folhaId?: string | null;
  stockMovementId?: string | null;
  projectId?: string | null;
  projetoFaseId?: string | null;
  projetoAtividadeId?: string | null;
  projetoEntregaId?: string | null;
}

/** A origem mais específica do documento. */
export function origemDoDocumento(d: VinculosDoDocumento): OrigemDoDocumento {
  if (d.contratoMedicaoId) return "medicao";
  if (d.contratoId || d.contratoAditivoId) return "contrato";
  if (d.funcionarioId) return "funcionario";
  if (d.equipeDiaId || d.folhaId) return "equipe";
  if (d.despesaId) return "despesa";
  if (d.contaReceberId) return "conta_receber";
  if (d.stockMovementId) return "estoque";
  if (d.clienteId) return "cliente";
  if (d.stakeholderId) return "fornecedor";
  if (d.projectId || d.projetoFaseId || d.projetoAtividadeId || d.projetoEntregaId) return "projeto";
  return "outro";
}

export function podeVerDocumento(perms: PermMatrix, d: VinculosDoDocumento): boolean {
  const tela = TELA_DA_ORIGEM[origemDoDocumento(d)];
  return !!tela && !!perms[tela]?.ver;
}

/** Busca sem acento e sem caixa, por todos os termos, no nome, tipo e nº fiscal. */
export function casaBusca(q: string, campos: readonly (string | null | undefined)[]): boolean {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const termos = norm(q).split(/\s+/).filter(Boolean);
  if (!termos.length) return true;
  const alvo = norm(campos.filter(Boolean).join(" "));
  return termos.every((t) => alvo.includes(t));
}
