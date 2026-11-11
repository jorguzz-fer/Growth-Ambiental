#!/usr/bin/env bash
# Gera o ZIP de revisão a partir de `git archive HEAD`.
#
# Por que existe: um pacote montado à mão, escolhendo diretórios, saiu INCOMPLETO
# e o revisor não conseguiu rodar as migrações — faltou
# `src/lib/db/migrations/meta/_journal.json`, sem o qual o migrator do Drizzle
# aborta com "Can't find meta/_journal.json file". Faltou também `docs/`, para
# onde o README aponta. `git archive` resolve isso na raiz: ele exporta tudo o
# que está VERSIONADO, respeitando o .gitignore, sem depender de ninguém
# lembrar de incluir uma pasta.
#
# Uso:
#   scripts/pacote-revisao.sh [desde]
#
#   desde  commit ou tag que marca a última revisão (opcional). Com ele, o
#          REVISAO.txt traz o log e o diffstat do intervalo desde..HEAD.
#          Sem ele, usa os últimos 30 commits.
#
# Saída: pacote-revisao/<nome>-<hash>.zip
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

DESDE="${1:-}"
HASH="$(git rev-parse --short HEAD)"
HASH_LONGO="$(git rev-parse HEAD)"
DATA_HEAD="$(git log -1 --format=%cd --date=iso HEAD)"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
NOME="$(basename "$(pwd)")"
SAIDA_DIR="pacote-revisao"
BASE="${NOME}-${HASH}"
ZIP="${SAIDA_DIR}/${BASE}.zip"

rm -rf "${SAIDA_DIR:?}"
mkdir -p "$SAIDA_DIR"

# 1 · Árvore versionada completa, via git archive (respeita .gitignore e
#     inclui migrations/meta/ e docs/ sem precisar listá-los).
git archive --format=zip -o "$ZIP" HEAD

# 2 · REVISAO.txt com a procedência do pacote.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
REV="$TMP/REVISAO.txt"
{
  echo "PACOTE DE REVISÃO — $NOME"
  echo
  echo "HEAD ......... $HASH_LONGO"
  echo "Data do HEAD . $DATA_HEAD"
  echo "Branch ....... $BRANCH"
  echo "Gerado em .... $(date --iso-8601=seconds)"
  echo "Gerado por ... scripts/pacote-revisao.sh"
  echo
  if [ -n "$DESDE" ]; then
    if ! git rev-parse --verify --quiet "$DESDE" >/dev/null; then
      echo "AVISO: '$DESDE' não é um commit/tag válido neste repositório." >&2
      exit 1
    fi
    INTERVALO="${DESDE}..HEAD"
    echo "Intervalo .... $INTERVALO"
  else
    INTERVALO="HEAD~30..HEAD"
    echo "Intervalo .... (nenhum 'desde' informado; usando os últimos 30 commits)"
  fi
  echo
  echo "── Conteúdo ─────────────────────────────────────────────────────────"
  echo "Árvore versionada completa de HEAD, via 'git archive' — inclui"
  echo "src/lib/db/migrations/meta/ (com _journal.json, exigido pelo migrator"
  echo "do Drizzle) e docs/. Arquivos ignorados pelo .gitignore ficam fora."
  echo
  echo "── git log --oneline $INTERVALO ─────────────────────────────────────"
  git log --oneline "$INTERVALO" 2>/dev/null || echo "(intervalo indisponível)"
  echo
  echo "── git diff --stat $INTERVALO ───────────────────────────────────────"
  git diff --stat "$INTERVALO" 2>/dev/null || echo "(intervalo indisponível)"
} >"$REV"

(cd "$TMP" && zip -q "$OLDPWD/$ZIP" REVISAO.txt)

# 3 · Conferência: o pacote tem o que o revisor precisa?
FALTOU=0
for OBRIGATORIO in \
  "src/lib/db/migrations/meta/_journal.json" \
  "docs/SPEC.md" \
  "package.json" \
  "REVISAO.txt"
do
  if ! unzip -l "$ZIP" "$OBRIGATORIO" >/dev/null 2>&1; then
    echo "ERRO: '$OBRIGATORIO' não entrou no pacote." >&2
    FALTOU=1
  fi
done
[ "$FALTOU" -eq 0 ] || exit 1

N_ARQ="$(unzip -l "$ZIP" | tail -1 | awk '{print $2}')"
N_META="$(unzip -l "$ZIP" 'src/lib/db/migrations/meta/*' 2>/dev/null | tail -1 | awk '{print $2}')"
N_DOCS="$(unzip -l "$ZIP" 'docs/*' 2>/dev/null | tail -1 | awk '{print $2}')"

echo
echo "Pacote: $ZIP"
echo "  arquivos ............. $N_ARQ"
echo "  migrations/meta/ ..... $N_META  (inclui _journal.json)"
echo "  docs/ ................ $N_DOCS"
echo "  tamanho .............. $(du -h "$ZIP" | cut -f1)"
