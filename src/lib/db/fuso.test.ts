import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import { listarArquivosDoRepositorio } from "@/lib/test-utils/listar-arquivos";

/**
 * GA-13 J1 — o app não depende do fuso do servidor do banco.
 *
 * As colunas `timestamp` (sem fuso) com `defaultNow()` gravam a hora da SESSÃO
 * do Postgres. Com o banco em America/Sao_Paulo, a sessão gravava a hora local
 * e o código comparava com `new Date()` (UTC): 3 h de diferença. Daí o limite
 * de conversas da Cris que nunca disparava, o reenvio da NFS-e "logo após o
 * envio" que não segurava, e o backup que não via o que mudou.
 *
 * A correção fixa a sessão em UTC em toda conexão (`OPCOES_DE_CONEXAO`). O
 * `scripts/test-db.sh` põe o banco de teste em America/Sao_Paulo, para a
 * suíte provar sempre que o fuso do servidor não importa.
 */
const HAS_DB = !!process.env.DATABASE_URL;

describe("GA-13 J1 — toda conexão do repositório fixa a sessão em UTC", () => {
  it("as opções centralizadas pedem TimeZone UTC", async () => {
    const { OPCOES_DE_CONEXAO } = await import("./conexao");
    expect(OPCOES_DE_CONEXAO.connection.TimeZone).toBe("UTC");
  });

  it("cada postgres(...) de src e scripts usa as opções (ou TimeZone UTC, nos .mjs)", () => {
    const arquivos = listarArquivosDoRepositorio().filter((f) => /^(src|scripts)\//.test(f) && /\.(ts|tsx|mjs|js|cjs)$/.test(f) && !/\.test\.tsx?$/.test(f));
    const semUtc: string[] = [];
    let chamadas = 0;
    for (const f of arquivos) {
      const fonte = readFileSync(join(process.cwd(), f), "utf8");
      for (const m of fonte.matchAll(/\bpostgres\(/g)) {
        // o trecho da chamada até o fim da linha seguinte
        const trecho = fonte.slice(m.index!, fonte.indexOf("\n", fonte.indexOf("\n", m.index!) + 1));
        if (/^\s*(\*|\/\/)/.test(fonte.slice(fonte.lastIndexOf("\n", m.index!) + 1, m.index!))) continue; // comentário
        chamadas++;
        if (!/OPCOES_DE_CONEXAO|comConexaoUtc\(|TimeZone:\s*"UTC"/.test(trecho)) semUtc.push(`${f}: ${trecho.split("\n")[0].trim()}`);
      }
    }
    expect(chamadas).toBeGreaterThanOrEqual(6);
    expect(semUtc).toEqual([]);
  });
});

describe.skipIf(!HAS_DB)("GA-13 J1 — no banco: a sessão é UTC e defaultNow() bate com new Date()", async () => {
  const { db, schema } = await import("@/lib/db");

  it("current_setting('TimeZone') = UTC, qualquer que seja o fuso do banco", async () => {
    const [r] = await db.execute<{ tz: string }>(sql`select current_setting('TimeZone') as tz`);
    expect(r.tz).toBe("UTC");
  });

  it("uma linha gravada com defaultNow() fica a menos de 5 s de new Date()", async () => {
    const [t] = await db.insert(schema.tenants).values({ name: "Fuso GA-13" }).returning();
    try {
      expect(Math.abs(t.createdAt.getTime() - Date.now())).toBeLessThan(5000);
      // relida do banco (sem o cache do returning)
      const [lida] = await db.select({ c: schema.tenants.createdAt }).from(schema.tenants).where(eq(schema.tenants.id, t.id));
      expect(Math.abs(lida.c.getTime() - Date.now())).toBeLessThan(5000);
    } finally {
      await db.delete(schema.tenants).where(eq(schema.tenants.id, t.id));
    }
  });

  it("o banco de teste está fora de UTC (o test-db.sh põe America/Sao_Paulo), para a prova valer", async () => {
    const [r] = await db.execute<{ tz: string }>(sql`select setting as tz from pg_db_role_setting s join pg_database d on d.oid = s.setdatabase, unnest(s.setconfig) as setting where d.datname = current_database() and setting like 'TimeZone=%'`);
    // Só exige quando a suíte roda pelo test-db.sh (que exporta TEST_DB_TZ).
    if (process.env.TEST_DB_TZ) expect(r?.tz).toBe(`TimeZone=${process.env.TEST_DB_TZ}`);
  });
});
