/**
 * GA-13 J1 — opções de conexão com o Postgres, as mesmas em todo o repositório.
 *
 * As colunas `timestamp` (sem fuso) com `defaultNow()` gravam a hora da SESSÃO.
 * Se o servidor do banco estiver em America/Sao_Paulo, a sessão grava a hora
 * local e o código compara com `new Date()` (UTC): 3 h de diferença. Fixar a
 * sessão em UTC faz o app não depender do fuso do servidor. Não muda o tipo
 * de nenhuma coluna.
 *
 * Use em todo `postgres(url, …)`: `postgres(url, comConexaoUtc({ max: 1 }))`.
 * Os scripts `.mjs` (que não importam TypeScript) repetem `TimeZone: "UTC"`;
 * o `src/lib/db/fuso.test.ts` confere todas as chamadas.
 */
import type postgres from "postgres";

export const OPCOES_DE_CONEXAO = {
  connection: { TimeZone: "UTC" },
} as const;

type Opcoes = postgres.Options<Record<string, postgres.PostgresType>>;

/** As opções de uma conexão, com a sessão em UTC (preserva outros parâmetros de `connection`). */
export function comConexaoUtc(opcoes: Opcoes = {}): Opcoes {
  return { ...opcoes, connection: { ...(opcoes.connection ?? {}), ...OPCOES_DE_CONEXAO.connection } };
}
