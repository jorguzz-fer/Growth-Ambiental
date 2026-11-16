/**
 * Runner de migração para produção.
 *
 * Usa o migrator do `drizzle-orm` (não precisa do `drizzle-kit`), o que permite
 * empacotar este arquivo com esbuild num único .mjs e rodá-lo na imagem Docker
 * standalone, antes de subir o servidor (ver docker-entrypoint.sh).
 *
 * Aplica as migrações de `MIGRATIONS_DIR` (default ./migrations) usando
 * DATABASE_URL. Idempotente: o migrator pula migrações já aplicadas.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { comConexaoUtc } from "./conexao";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[migrate] DATABASE_URL ausente — migração ignorada.");
    return;
  }
  const folder = process.env.MIGRATIONS_DIR ?? "./migrations";
  // onnotice silencia os avisos "already exists, skipping" do próprio migrator.
  const sql = postgres(url, comConexaoUtc({ max: 1, prepare: false, onnotice: () => {} }));
  try {
    console.log(`[migrate] aplicando migrações de "${folder}"...`);
    await migrate(drizzle(sql), { migrationsFolder: folder });
    console.log("[migrate] concluído.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("[migrate] falha:", err);
  process.exit(1);
});
