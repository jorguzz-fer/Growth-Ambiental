#!/usr/bin/env bash
# GA-9 · foto dos números da demonstração (Fase 0) e comparação (fases seguintes).
#
# Só em ambiente LOCAL de teste: recria o banco `growth_demo_seed`, roda o seed
# com a data fixa, sobe o app nessa mesma data e lê as telas.
#
#   bash scripts/ga9-foto.sh gravar     # grava docs/revisao/GA9-numeros-antes.{txt,json}
#   bash scripts/ga9-foto.sh comparar   # refaz tudo e compara com a foto; sai 1 se mudar
#
# Variáveis: DATABASE_URL de .env.local (banco de teste); FOTO_SENHA (senha local
# do dono da demonstração; padrão só para o banco de teste). Pressupõe `npm run build`
# já feito com o código a comparar.
set -euo pipefail
cd "$(dirname "$0")/.."
modo="${1:-}"
[[ "$modo" == "gravar" || "$modo" == "comparar" ]] || { echo "Uso: $0 gravar|comparar"; exit 2; }

export DATA_FIXA="${DATA_FIXA:-2026-11-15}" TZ=UTC
BASEURL="$(grep -E '^DATABASE_URL=' .env.local | cut -d= -f2-)"
case "$BASEURL" in *localhost*|*127.0.0.1*) ;; *) echo "DATABASE_URL de .env.local não é local; nada foi feito."; exit 2;; esac
export DATABASE_URL="${BASEURL%/*}/growth_demo_seed"
EMAIL=demo@exemplo.com
SENHA="${FOTO_SENHA:-Local-Teste-123}"
TXT=docs/revisao/GA9-numeros-antes.txt
JSON=docs/revisao/GA9-numeros-antes.json
TMP="$(mktemp -d)"
trap 'kill "${SERVIDOR:-0}" 2>/dev/null || true; rm -rf "$TMP"' EXIT

echo "1/4 Recriando a demonstração em growth_demo_seed (data fixa $DATA_FIXA)..."
psql "${BASEURL%/*}/postgres" -qc "drop database if exists growth_demo_seed" -qc "create database growth_demo_seed"
MIGRATIONS_DIR=src/lib/db/migrations npx tsx src/lib/db/migrate.ts >/dev/null
npm run build:seed >/dev/null
SEED_DEMO_RECRIAR=sim SEED_ADMIN_EMAIL="$EMAIL" SEED_ADMIN_PASSWORD="$SENHA" node --import ./scripts/data-fixa.mjs .migrate/seed.mjs >"$TMP/seed.log"

echo "2/4 Conferência da demonstração..."
# A linha "Empresa: … (id)" muda a cada recriação; o id sai do arquivo.
SEED_ADMIN_EMAIL="$EMAIL" node --import ./scripts/data-fixa.mjs .migrate/conferir-demo.mjs | sed -E 's/ \([0-9a-f-]{36}\)//' >"$TMP/conferir.txt"

echo "3/4 Subindo o app na data fixa..."
NODE_OPTIONS="--import $PWD/scripts/data-fixa.mjs" npx next start -p 3100 >"$TMP/servidor.log" 2>&1 &
SERVIDOR=$!
for _ in $(seq 1 60); do curl -s -o /dev/null localhost:3100/login && break; sleep 1; done

echo "4/4 Lendo as telas..."
if [[ "$modo" == "gravar" ]]; then
  cp "$TMP/conferir.txt" "$TXT"
  FOTO_EMAIL="$EMAIL" FOTO_SENHA="$SENHA" node scripts/foto-numeros-demo.mjs gravar "$JSON"
else
  falhou=0
  if diff -u "$TXT" "$TMP/conferir.txt"; then echo "✓ conferir-demo igual a $TXT"; else echo "✗ conferir-demo mudou"; falhou=1; fi
  FOTO_EMAIL="$EMAIL" FOTO_SENHA="$SENHA" node scripts/foto-numeros-demo.mjs comparar "$JSON" || falhou=1
  exit $falhou
fi
if grep -q "⨯" "$TMP/servidor.log"; then echo "Erros no servidor:"; grep -A3 "⨯" "$TMP/servidor.log" | head -30; exit 1; fi
