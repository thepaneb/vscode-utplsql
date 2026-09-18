#!/usr/bin/env bash
# Orquestra a matriz de bancos: para cada versão, baixa -> sobe -> espera ->
# bootstrap (utPLSQL/grants/schemas/fixtures) -> testes de integração -> down.
# Roda UMA versão por vez para caber em disco/memória.
#
# Uso:
#   scripts/db-matrix/run.sh --list
#   scripts/db-matrix/run.sh                        # roda a matriz inteira
#   scripts/db-matrix/run.sh --only 21xe
#   scripts/db-matrix/run.sh --only 18xe,19ee
#   scripts/db-matrix/run.sh --smoke                # só capacidades + debugger (~1 min/versão)
#   scripts/db-matrix/run.sh --thick                # thick mode (Instant Client) por versão
#   scripts/db-matrix/run.sh --clean --only 18xe    # apaga o volume e recria o banco
#   scripts/db-matrix/run.sh --skip-bootstrap       # volume já preparado: pula o bootstrap
#   scripts/db-matrix/run.sh --bootstrap-only --only 21xe
#   scripts/db-matrix/run.sh --keep-db --only 23free     # não derruba no fim
#   scripts/db-matrix/run.sh --tests "npm run test:integration"
#
# Persistência: os dados ficam num volume nomeado por versão
# (`utplsql-dbmatrix-<label>`). A 1ª run cria o banco (~15-25 min); as seguintes
# sobem em ~1-2 min. Use DOCKER volume ls/rm para gerenciar; `--clean` recria.
#
# Atalhos npm: `npm run db:matrix` e `npm run db:matrix:list`.
#
# Credenciais das imagens EE (database/enterprise) vêm de ORACLE_AUTH_USER e
# ORACLE_AUTH_TOKEN (ambiente ou .env.dbmatrix). Free/Express são anônimas.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker/db-matrix/compose.yaml"

# shellcheck disable=SC1091
[ -f "$SCRIPT_DIR/matrix.env" ] && source "$SCRIPT_DIR/matrix.env"
[ -f "$ROOT_DIR/.env.dbmatrix" ] && source "$ROOT_DIR/.env.dbmatrix"
# Fallback: reaproveita as credenciais já existentes no .env do projeto.
if [ -f "$ROOT_DIR/.env" ] && [ -z "${ORACLE_AUTH_USER:-}" ]; then
  ORACLE_AUTH_USER="$(sed -n 's/^ORACLE_AUTH_USER=//p' "$ROOT_DIR/.env" | tr -d '\r')"
  ORACLE_AUTH_TOKEN="$(sed -n 's/^ORACLE_AUTH_TOKEN=//p' "$ROOT_DIR/.env" | tr -d '\r')"
  export ORACLE_AUTH_USER ORACLE_AUTH_TOKEN
fi

DB_PORT="${DB_PORT:-1531}"
ORACLE_PWD="${ORACLE_PWD:-Oracle#2026}"
UT3_PASSWORD="${UT3_PASSWORD:-ut3#matrix2026}"
TEST_PASSWORD="${TEST_PASSWORD:-utplsql_test#2026}"
UTPLSQL_VERSION="${UTPLSQL_VERSION:-v.3.2.3}"
TESTS_CMD="npm run test:integration"
CONTAINER="utplsql-dbmatrix"
ONLY=""
BOOTSTRAP_ONLY=0
SKIP_BOOTSTRAP=0
KEEP_DB=0
KEEP_IMAGE=0
NO_PULL=0
CLEAN=0

log() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

usage() { grep '^#' "$0" | sed 's/^# \{0,1\}//'; }

while [ $# -gt 0 ]; do
  case "$1" in
    --list) echo "$VERSIONS" | sed '/^$/d'; exit 0 ;;
    --only) ONLY="$2"; shift 2 ;;
    --tests) TESTS_CMD="$2"; shift 2 ;;
    --smoke) TESTS_CMD="npm run test:integration:smoke"; shift ;;
    --thick) TESTS_CMD="npm run test:integration:thick"; shift ;;
    --bootstrap-only) BOOTSTRAP_ONLY=1; shift ;;
    --skip-bootstrap) SKIP_BOOTSTRAP=1; shift ;;
    --clean) CLEAN=1; shift ;;
    --keep-db) KEEP_DB=1; shift ;;
    --keep-image) KEEP_IMAGE=1; shift ;;
    --no-pull) NO_PULL=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "opção desconhecida: $1" >&2; usage; exit 1 ;;
  esac
done

compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

login_registry() {
  if [ -n "${ORACLE_AUTH_USER:-}" ] && [ -n "${ORACLE_AUTH_TOKEN:-}" ]; then
    log "login no container-registry.oracle.com (imagens EE)"
    printf '%s' "$ORACLE_AUTH_TOKEN" | docker login container-registry.oracle.com \
      -u "$ORACLE_AUTH_USER" --password-stdin >/dev/null
  fi
}

selected() { [ -z "$ONLY" ] && return 0; case ",$ONLY," in *",$1,"*) return 0 ;; esac; return 1; }

login_registry

echo "$VERSIONS" | sed '/^$/d' | while IFS='|' read -r label image service; do
  selected "$label" || continue
  log "$label — $image (serviço $service)"

  # Volume de dados por versão: a 1ª subida cria o banco; as demais reaproveitam.
  export DB_VOLUME="${DB_VOLUME_PREFIX:-utplsql-dbmatrix}-${label}"
  export DB_IMAGE="$image" DB_CONTAINER="$CONTAINER" DB_PORT ORACLE_PWD
  export UT3_PASSWORD TEST_PASSWORD UTPLSQL_VERSION

  if [ "$CLEAN" = 1 ]; then
    log "limpando volume $DB_VOLUME (--clean)"
    compose down --remove-orphans >/dev/null 2>&1 || true
    docker volume rm "$DB_VOLUME" >/dev/null 2>&1 || true
  fi

  [ "$NO_PULL" = 1 ] || compose pull --quiet db
  compose up -d db
  # 1ª subida de uma imagem que cria o banco do zero (ex.: 18c/19c) leva ~15-25
  # min; com o volume já populado o boot é ~1-2 min.
  "$SCRIPT_DIR/wait-ready.sh" "$CONTAINER" "$service" "${WAIT_TIMEOUT:-1800}"

  if [ "$SKIP_BOOTSTRAP" = 0 ]; then
    "$SCRIPT_DIR/bootstrap.sh" "$CONTAINER" "$service"
  else
    log "pulando bootstrap (--skip-bootstrap): usando UT3/UTPLSQL_TEST já no volume"
  fi

  if [ "$BOOTSTRAP_ONLY" = 0 ]; then
    export UTPLSQL_CONN="UT3/${UT3_PASSWORD}@//localhost:${DB_PORT}/${service}"
    # WSL: o `node` é o binário do Windows e não herda env do WSL — WSLENV faz
    # a variável atravessar para o processo dos testes. ORACLE_CLIENT_LIB_DIR/
    # TNS_ADMIN só são usados pelo modo --thick.
    export WSLENV="UTPLSQL_CONN${ORACLE_CLIENT_LIB_DIR:+:ORACLE_CLIENT_LIB_DIR}${TNS_ADMIN:+:TNS_ADMIN}${WSLENV:+:$WSLENV}"
    log "rodando testes: $TESTS_CMD  (UTPLSQL_CONN=$UTPLSQL_CONN)"
    (cd "$ROOT_DIR" && eval "$TESTS_CMD")
  fi

  if [ "$KEEP_DB" = 1 ]; then
    log "mantendo o banco no ar (--keep-db): $CONTAINER em localhost:$DB_PORT/$service"
  else
    # `down` (sem -v) preserva o volume nomeado da versão para a próxima run.
    log "derrubando $label (volume $DB_VOLUME preservado)"
    compose down --remove-orphans >/dev/null 2>&1 || true
    if [ "$KEEP_IMAGE" = 0 ]; then
      docker image rm "$image" >/dev/null 2>&1 || true
    fi
  fi
done

log "matriz concluída"
