#!/usr/bin/env bash
# Suíte de testes EXIGINDO banco.
#
# Por que existe: 95 dos 263 arquivos de teste são de integração e começam com
# `describe.skipIf(!HAS_DB)`. Sem DATABASE_URL eles são PULADOS em silêncio e a
# suíte termina verde — justamente os que cobrem concorrência de numeração,
# travas de conciliação, Acerto, Ressarcimentos e permissões. "Todos os testes
# passam" sem banco não prova nada sobre esses caminhos.
#
# Este script recusa rodar sem DATABASE_URL, para que a ausência de banco seja
# um ERRO visível e não um resultado verde enganoso.
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  cat >&2 <<'FIM'
ERRO: DATABASE_URL não está definido.

  `npm run test:db` existe para rodar a suíte COM banco. Sem DATABASE_URL os
  testes de integração (describe.skipIf(!HAS_DB)) seriam pulados e a suíte
  terminaria verde sem ter exercitado nada do que depende do Postgres.

  Como rodar:
    export DATABASE_URL='postgres://usuario:senha@localhost:5432/growth'
    npm run db:migrate
    npm run test:db

  Para rodar só o que não precisa de banco, use `npm test` — e saiba que o
  resultado NÃO cobre os caminhos de integração.
FIM
  exit 1
fi

# GA-13 J1 — o app não pode depender do fuso do servidor do banco. A suíte
# roda com o banco de teste FORA de UTC (padrão America/Sao_Paulo), para provar
# sempre que a conexão fixa a sessão em UTC (src/lib/db/conexao.ts).
# Só em banco local (localhost/127.0.0.1/::1): é um ALTER DATABASE, e o banco
# de teste é descartável. Em banco remoto, o script recusa.
export TEST_DB_TZ="${TEST_DB_TZ:-America/Sao_Paulo}"
node --input-type=module -e '
import postgres from "postgres";
const url = new URL(process.env.DATABASE_URL);
const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
if (!local) {
  console.error(`ERRO: o banco de teste (${url.hostname}) não é local. O test-db.sh só altera o fuso de banco local e descartável.`);
  process.exit(1);
}
const banco = decodeURIComponent(url.pathname.slice(1));
const tz = process.env.TEST_DB_TZ;
if (!/^[A-Za-z0-9_+\/-]+$/.test(tz)) { console.error(`TEST_DB_TZ inválido: ${tz}`); process.exit(1); }
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {}, connection: { TimeZone: "UTC" } });
await sql.unsafe(`ALTER DATABASE "${banco.replace(/"/g, "\"\"")}" SET timezone TO '"'"'${tz}'"'"'`);
await sql.end();
console.log(`Banco de teste "${banco}" com timezone ${tz} (a conexão do app fixa a sessão em UTC).`);
'

echo "DATABASE_URL definido — rodando a suíte completa (integração incluída)."
exec npx vitest run --reporter=default "$@"
