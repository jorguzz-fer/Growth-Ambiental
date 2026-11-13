/**
 * Busca "inteligente" compartilhada pelas telas de Despesas e Contas a Receber.
 *
 * Características:
 *  - normaliza acentos, caixa e espaços (procurar "jose" acha "JOSÉ");
 *  - casa por SIMILARIDADE em vários campos ao mesmo tempo (nome, documento,
 *    descrição, projeto, valor…), sem exigir que o termo esteja num campo
 *    específico;
 *  - aceita VÁRIOS termos: todos precisam aparecer em algum campo do registro,
 *    em qualquer ordem. Assim "portao 880" encontra a despesa do fornecedor
 *    PORTÃO no valor de 880;
 *  - entende valores monetários digitados como "1.234,56", "1234.56" ou só os
 *    dígitos ("880" acha R$ 880,00).
 *
 * A filtragem é incremental: roda a cada caractere digitado.
 */

const STRIP = new RegExp("[\\u0300-\\u036f]", "g");

/** minúsculas, sem acentos, espaços colapsados. */
export function norm(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(STRIP, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Texto monetário → número. Aceita "1.234,56", "1234.56", "R$ 880". */
export function parseValorBusca(s: string): number | null {
  const limpo = s.replace(/[^\d,.-]/g, "");
  if (!limpo) return null;
  // Se tem vírgula, ela é o separador decimal (padrão BR).
  const norm = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}

/** Um valor numérico casa com o termo digitado? */
export function valorCasa(valor: number, termo: string): boolean {
  const alvo = parseValorBusca(termo);
  if (alvo != null && Math.abs(valor - alvo) < 0.005) return true;
  // Casamento parcial pelos dígitos: "880" acha 880,00 e 1.880,00.
  const digitos = termo.replace(/\D/g, "");
  if (digitos.length >= 2) {
    const inteiro = String(Math.round(Math.abs(valor)));
    const comCentavos = Math.abs(valor).toFixed(2).replace(".", "");
    if (inteiro.includes(digitos) || comCentavos.includes(digitos)) return true;
  }
  return false;
}

/**
 * O registro casa com a consulta?
 *
 * `campos` são os textos pesquisáveis do registro; `valores` são os campos
 * numéricos (valor, saldo…). TODOS os termos da consulta precisam casar com
 * algum campo — a ordem não importa.
 */
export function registroCasa(
  consulta: string,
  campos: (string | null | undefined)[],
  valores: number[] = [],
): boolean {
  const termos = norm(consulta).split(" ").filter(Boolean);
  if (termos.length === 0) return false;
  const texto = campos.map(norm).filter(Boolean).join(" ");
  return termos.every(
    (t) => texto.includes(t) || valores.some((v) => valorCasa(v, t)),
  );
}
