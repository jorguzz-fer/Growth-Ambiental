import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Compara o segredo recebido com o esperado em tempo constante. Sem segredo
 * configurado, nada passa (fail-closed).
 */
export function segredoConfere(recebido: string | null | undefined, esperado: string | null | undefined): boolean {
  if (!esperado || !recebido) return false;
  const a = createHash("sha256").update(recebido).digest();
  const b = createHash("sha256").update(esperado).digest();
  return timingSafeEqual(a, b);
}
