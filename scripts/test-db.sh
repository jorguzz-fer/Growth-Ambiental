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

echo "DATABASE_URL definido — rodando a suíte completa (integração incluída)."
exec npx vitest run --reporter=default "$@"
