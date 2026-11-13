import { MARCA_PROTEGIDO } from "@/lib/audit-mask";

/**
 * Dados sensíveis do comprador (Prompt M, Parte 2 · decisão BM-3, aprovada em
 * 29/09/2026). Arquivo sem dependência de servidor: tela e action leem daqui.
 */

/** Tela de permissão própria que governa estes campos. */
export const TELA_DADOS_CLIENTE = "clientesdados";

/**
 * Campos que exigem `clientesdados:ver` para aparecer e `:editar` para gravar.
 * Quem não tem a permissão não recebe os valores do servidor (5.4).
 */
export const CAMPOS_SENSIVEIS_CLIENTE = [
  // Dados financeiros
  "bancoFinanc",
  "rendaBruta",
  "rendaLiquida",
  "comprometimento",
  "possuiFgts",
  "saldoFgts",
  "scoreCredito",
  "restricoes",
  // Estado civil (está no bloco cadastral, mas é sensível pelo BM-3)
  "estadoCivil",
  // Inteligência de mercado
  "morarOuInvestir",
  "ramoAtividade",
  "cargoFuncao",
  "areaAtuacao",
  "empresa",
  "regimeTrabalho",
  "localTrabalho",
  "tempoEmpresa",
  "possuiImovel",
  "motivacaoCompra",
  "comoConheceu",
  "indicadoPor",
  "interesse",
  "obsEstrategicas",
] as const;

export type CampoSensivelCliente = (typeof CAMPOS_SENSIVEIS_CLIENTE)[number];

const SENSIVEIS = new Set<string>(CAMPOS_SENSIVEIS_CLIENTE);
export const campoSensivelCliente = (k: string) => SENSIVEIS.has(k);

/**
 * CPF/CNPJ mascarado (5.1): só os dígitos centrais aparecem.
 * CPF `000.000.002-72` → `•••.000.002-••`; CNPJ mostra a raiz central.
 * Valor fora do padrão (dado antigo) não é convertido: aparece mascarado inteiro,
 * exceto os 4 últimos caracteres.
 */
export function mascararDocumento(doc: string | null | undefined): string | null {
  if (!doc) return null;
  const d = doc.replace(/\D/g, "");
  if (d.length === 11) return `•••.${d.slice(3, 6)}.${d.slice(6, 9)}-••`;
  if (d.length === 14) return `••.${d.slice(2, 5)}.${d.slice(5, 8)}/••••-••`;
  const t = doc.trim();
  return t.length <= 4 ? "••••" : `${"•".repeat(Math.min(8, t.length - 4))}${t.slice(-4)}`;
}

/**
 * `changes` do log de cliente com os campos sensíveis e o CPF SEM valor
 * (Prompt M, 7 — nota): registra que mudou, não o quê. Mesmo formato que a
 * tela de Auditoria já exibe como "alterado".
 */
export function changesSemValorSensivel(
  changes: Record<string, { de: unknown; para: unknown }>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(changes)) {
    out[k] =
      campoSensivelCliente(k) || k === "cpfCnpj"
        ? { de: MARCA_PROTEGIDO, para: MARCA_PROTEGIDO, protegido: true }
        : v;
  }
  return out;
}
