/**
 * Mascaramento de dado pessoal no Log de Auditoria (BAK-2, decidido em
 * 28/09/2026 — ver docs/historico-construction/V2-BLOCO0-BLOQUEIOS.md, decisão 3.8).
 *
 * ## O problema
 *
 * `cliente.update` grava no `meta.changes` todo campo alterado do comprador —
 * CPF, renda, saldo de FGTS, score e restrições de crédito — e o papel
 * `contador` (o contador externo) vê a tela de auditoria. Resultado: dado
 * pessoal e financeiro de pessoa física exposto a quem não precisa dele.
 *
 * ## Por que a correção é na EXIBIÇÃO, e não no dado
 *
 * `audit_log` é append-only (regra 3.4): nenhuma linha é alterada ou removida,
 * nem para corrigir o que o próprio sistema gravou torto. Os registros antigos
 * continuam no banco com o valor — o que muda é quem enxerga. Por isso esta
 * função não toca no dado: devolve uma CÓPIA mascarada para a tela.
 *
 * ## A regra
 *
 * Para quem não é `owner` nem `admin`, os campos protegidos aparecem só como
 * "alterado", sem o valor anterior nem o novo. O resto do log continua
 * integral — o contador segue vendo quem fez o quê e quando.
 */

import type { Role } from "@/lib/context";

/**
 * Campos que nunca aparecem com valor para quem não é owner/admin.
 *
 * É a mesma lista do BM-3 (Prompt M) e vale para o backup (BAK-3): dado
 * pessoal e financeiro de pessoa física, na acepção da LGPD.
 */
export const CAMPOS_PROTEGIDOS = [
  "cpfCnpj",
  "nascimento",
  "rendaBruta",
  "rendaLiquida",
  "comprometimento",
  "saldoFgts",
  "scoreCredito",
  "restricoes",
  // Prompt Z (7.3): dado pessoal de trabalhador
  "cpf",
  "pis",
  "ctpsNumero",
  "ctpsSerie",
  "rg",
  "salario",
  "jornada",
  "endereco",
  "cep",
  "bancoConta",
  "bancoAgencia",
  "pixChave",
] as const;

/** Marca que substitui o valor protegido fora de uma entrada `de → para`. */
export const MARCA_PROTEGIDO = "[protegido]";

/**
 * `cpfCnpj`, `cpf_cnpj` e `CPF-CNPJ` são o mesmo campo. O `meta` nasce de
 * lugares diferentes — objeto do Drizzle (camelCase), linha crua do banco
 * (snake_case) —, e um campo que escapasse do filtro só por grafia seria
 * exatamente o vazamento que esta função existe para impedir.
 */
function normalizarChave(chave: string): string {
  return chave.toLowerCase().replace(/[_\s-]/g, "");
}

const PROTEGIDAS = new Set<string>(CAMPOS_PROTEGIDOS.map(normalizarChave));

export function campoProtegido(chave: string): boolean {
  return PROTEGIDAS.has(normalizarChave(chave));
}

/** Quem enxerga o valor dos campos protegidos no log. */
export function podeVerDadoProtegido(role: Role): boolean {
  return role === "owner" || role === "admin";
}

/** Entrada de `diffAudit` / do loop de `cliente.update`: `{ de, para }`. */
function ehEntradaDeAlteracao(v: unknown): v is { de: unknown; para: unknown } {
  return (
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    "de" in (v as object) &&
    "para" in (v as object)
  );
}

/** Entrada `de → para` já mascarada — a tela exibe só "alterado". */
export interface AlteracaoProtegida {
  de: typeof MARCA_PROTEGIDO;
  para: typeof MARCA_PROTEGIDO;
  protegido: true;
}

export function ehAlteracaoProtegida(v: unknown): v is AlteracaoProtegida {
  return !!v && typeof v === "object" && (v as { protegido?: unknown }).protegido === true;
}

/**
 * Devolve uma cópia do `meta` com os campos protegidos mascarados, em qualquer
 * profundidade. Nunca altera o objeto recebido.
 *
 * - campo protegido cujo valor é `{ de, para }` → vira `AlteracaoProtegida`
 *   (a tela mostra "alterado");
 * - campo protegido com qualquer outro valor → vira `MARCA_PROTEGIDO`;
 * - o resto é copiado como está.
 *
 * Varre em profundidade porque o `meta` não tem formato fixo: há `changes`
 * aninhado, e a tela cai em `JSON.stringify` para os formatos que não
 * reconhece — um campo protegido num nível que não fosse varrido sairia cru
 * nesse caminho.
 */
export function mascararMeta(meta: unknown): unknown {
  if (Array.isArray(meta)) return meta.map(mascararMeta);
  if (!meta || typeof meta !== "object") return meta;

  const saida: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(meta as Record<string, unknown>)) {
    if (campoProtegido(chave)) {
      saida[chave] = ehEntradaDeAlteracao(valor)
        ? ({ de: MARCA_PROTEGIDO, para: MARCA_PROTEGIDO, protegido: true } satisfies AlteracaoProtegida)
        : MARCA_PROTEGIDO;
      continue;
    }
    saida[chave] = mascararMeta(valor);
  }
  return saida;
}

/** O `meta` como o papel `role` pode vê-lo. */
export function metaVisivel(meta: unknown, role: Role): unknown {
  return podeVerDadoProtegido(role) ? meta : mascararMeta(meta);
}
