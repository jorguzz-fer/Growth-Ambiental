import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { comConexaoUtc } from "./conexao";

/*
 * Client do banco.
 *
 * `db` é uma instância real do Drizzle (necessária para o adapter do Auth.js,
 * que inspeciona o tipo do client). O `postgres-js` conecta de forma PREGUIÇOSA
 * — só abre conexão na primeira query — então construir o client no import é
 * barato e não toca o banco. Em `next build` a env pode não existir e as páginas
 * que consultam o banco são dinâmicas (force-dynamic, só rodam em runtime), por
 * isso usamos um placeholder de connection string quando DATABASE_URL falta:
 * isso permite o build sem banco, e em runtime a env real está presente.
 */
const connectionString =
  process.env.DATABASE_URL ?? "postgres://localhost:5432/_buildtime";

if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
  // Aviso (não fatal) caso a env não chegue em produção — a 1ª query falhará.
  console.warn(
    "[db] DATABASE_URL ausente em produção — configure a variável de ambiente.",
  );
}

// Reaproveita a conexão entre hot-reloads em dev para não esgotar o pool.
const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.client ?? postgres(connectionString, comConexaoUtc({ prepare: false }));
if (process.env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client, { schema });
export { schema };
