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
#   scripts/db-matrix/run.sh --smoke                # smoke: capacidades + debugger + v017 (~1 min/versão)
#   scripts/db-matrix/run.sh --thick                # thick smoke: Instant Client + conexão
#   scripts/db-matrix/run.sh --full                 # integração completa + multi-root por banco
#   scripts/db-matrix/run.sh --clean --only 18xe    # apaga o volume e recria o banco
#   scripts/db-matrix/run.sh --skip-bootstrap       # volume já preparado (valida UT3/TEST antes)
#   scripts/db-matrix/run.sh --bootstrap-only --only 21xe
#   scripts/db-matrix/run.sh --keep-db --only 23free     # não derruba no fim
#   scripts/db-matrix/run.sh --continue-on-error    # segue para o próximo banco se um falhar
#   scripts/db-matrix/run.sh --tests "npm run test:integration"
#
# Resultado: logs em docker/db-matrix/.cache/logs/<label>.log e resumo
# JSONL/Markdown em docker/db-matrix/.cache/matrix-summary-<timestamp>.{jsonl,md}.
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
# As imagens gvenzl (11g) leem ORACLE_PASSWORD; as Oracle leem ORACLE_PWD.
ORACLE_PASSWORD="${ORACLE_PASSWORD:-$ORACLE_PWD}"
DB_DATA_DIR="${DB_DATA_DIR:-/opt/oracle/oradata}"
DB_DATA_DIR_11XE="${DB_DATA_DIR_11XE:-/u01/app/oracle/oradata}"
UT3_PASSWORD="${UT3_PASSWORD:-ut3#matrix2026}"
TEST_PASSWORD="${TEST_PASSWORD:-utplsql_test#2026}"
UTPLSQL_VERSION="${UTPLSQL_VERSION:-v.3.2.3}"
# Default estável entre iterações: `UTPLSQL_VERSION` é reexportado por banco no
# loop; sem uma base separada, a versão do 1º banco (12.2 -> 3.1.x) viraria o
# default de todos os seguintes.
UTPLSQL_BASE_VERSION="$UTPLSQL_VERSION"
TESTS_CMD="npm run test:integration"
CONTAINER="utplsql-dbmatrix"
ONLY=""
BOOTSTRAP_ONLY=0
SKIP_BOOTSTRAP=0
KEEP_DB=0
KEEP_IMAGE=0
NO_PULL=0
CLEAN=0
CONTINUE_ON_ERROR=0
CURRENT_IMAGE=""
# WSL pode não ter `node` no PATH (o binário real é `node.exe` do Windows);
# o resumo é opcional e não pode derrubar a matriz.
NODE_BIN="$(command -v node 2>/dev/null || command -v node.exe 2>/dev/null || true)"
node_path() {
  # node.exe do Windows não resolve caminhos /mnt/...; converte via wslpath.
  if [[ "$NODE_BIN" == *.exe ]] && command -v wslpath >/dev/null 2>&1; then
    wslpath -w "$1"
  else
    printf '%s' "$1"
  fi
}
LOG_DIR="${LOG_DIR:-$ROOT_DIR/docker/db-matrix/.cache/logs}"
SUMMARY_FILE="${MATRIX_SUMMARY_FILE:-$ROOT_DIR/docker/db-matrix/.cache/matrix-summary-$(date +%Y%m%d-%H%M%S).jsonl}"

log() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

mask_conn() {
  # Nunca logar a senha da conexão (CWE-532).
  sed -E 's#^([^/]+)/[^@]*@#\1/***@#' <<< "$1"
}

cleanup() {
  if [ "${KEEP_DB:-0}" = 1 ]; then
    return 0
  fi
  compose down --remove-orphans >/dev/null 2>&1 || true
  if [ "${KEEP_IMAGE:-0}" = 0 ] && [ -n "${CURRENT_IMAGE:-}" ]; then
    docker image rm "$CURRENT_IMAGE" >/dev/null 2>&1 || true
  fi
}

assert_bootstrapped() {
  local ut3_ok test_ok
  ut3_ok="$(docker exec -i -e "DBU=UT3" -e "DBP=$UT3_PASSWORD" -e "DBS=$service" "$CONTAINER" \
    bash -lc '$ORACLE_HOME/bin/sqlplus -s "$DBU/$DBP@//localhost:1521/$DBS"' <<'SQL' 2>&1 | tr -d '\r'
SET HEADING OFF FEEDBACK OFF PAGESIZE 0
SELECT 'OK' FROM user_objects WHERE object_name = 'UT_RUNNER' AND object_type = 'PACKAGE';
EXIT
SQL
)" || true
  test_ok="$(docker exec -i -e "DBU=UTPLSQL_TEST" -e "DBP=$TEST_PASSWORD" -e "DBS=$service" "$CONTAINER" \
    bash -lc '$ORACLE_HOME/bin/sqlplus -s "$DBU/$DBP@//localhost:1521/$DBS"' <<'SQL' 2>&1 | tr -d '\r'
SET HEADING OFF FEEDBACK OFF PAGESIZE 0
SELECT 'OK' FROM dual;
EXIT
SQL
)" || true
  if ! grep -q 'OK' <<<"$ut3_ok" || ! grep -q 'OK' <<<"$test_ok"; then
    echo "volume $DB_VOLUME não tem bootstrap válido para $label." >&2
    # Diagnóstico sem ecoar credenciais: só a linha de erro do sqlplus.
    echo "  UT3: $(grep -m1 -E 'ORA-|SP2-' <<<"$ut3_ok" || echo 'sem resposta OK')" >&2
    echo "  UTPLSQL_TEST: $(grep -m1 -E 'ORA-|SP2-' <<<"$test_ok" || echo 'sem resposta OK')" >&2
    echo "rode sem --skip-bootstrap (ou com --clean) para reinstalar UT3/UTPLSQL_TEST." >&2
    exit 1
  fi
}

usage() { grep '^#' "$0" | sed 's/^# \{0,1\}//'; }

while [ $# -gt 0 ]; do
  case "$1" in
    --list)
      # Anota o 5º campo (`client`) sem esconder label|imagem|serviço|versão.
      echo "$VERSIONS" | sed '/^$/d' | while IFS='|' read -r l i s v c; do
        if [ "${c:-both}" = thick ]; then
          printf '%s|%s|%s|%s (thick-only)\n' "$l" "$i" "$s" "$v"
        else
          printf '%s|%s|%s|%s\n' "$l" "$i" "$s" "$v"
        fi
      done
      exit 0
      ;;
    --only) ONLY="$2"; shift 2 ;;
    --tests) TESTS_CMD="$2"; shift 2 ;;
    --smoke) TESTS_CMD="npm run test:integration:smoke"; shift ;;
    --thick) TESTS_CMD="npm run test:integration:thick"; shift ;;
    --full) TESTS_CMD="npm run test:integration && npm run test:integration:multiroot"; shift ;;
    --bootstrap-only) BOOTSTRAP_ONLY=1; shift ;;
    --skip-bootstrap) SKIP_BOOTSTRAP=1; shift ;;
    --clean) CLEAN=1; shift ;;
    --keep-db) KEEP_DB=1; shift ;;
    --keep-image) KEEP_IMAGE=1; shift ;;
    --continue-on-error) CONTINUE_ON_ERROR=1; shift ;;
    --no-pull) NO_PULL=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "opção desconhecida: $1" >&2; usage; exit 1 ;;
  esac
done

compose() { docker compose -f "$COMPOSE_FILE" "$@"; }
trap cleanup EXIT INT TERM

login_registry() {
  if [ -n "${ORACLE_AUTH_USER:-}" ] && [ -n "${ORACLE_AUTH_TOKEN:-}" ]; then
    log "login no container-registry.oracle.com (imagens EE)"
    printf '%s' "$ORACLE_AUTH_TOKEN" | docker login container-registry.oracle.com \
      -u "$ORACLE_AUTH_USER" --password-stdin >/dev/null
  fi
}

selected() { [ -z "$ONLY" ] && return 0; case ",$ONLY," in *",$1,"*) return 0 ;; esac; return 1; }

login_registry
mkdir -p "$LOG_DIR" "$(dirname "$SUMMARY_FILE")"

mapfile -t VERSION_LINES < <(echo "$VERSIONS" | sed '/^$/d')
for __line in "${VERSION_LINES[@]}"; do
  # label|imagem|service[|utplsql_version[|client]] — o 4º/5º campos são
  # opcionais. parse-version.cjs normaliza (testado em matrixConfig.test.ts).
  local_utplsql_version="$UTPLSQL_BASE_VERSION"
  local_client="both"
  if command -v node >/dev/null 2>&1; then
    IFS='|' read -r label image service local_utplsql_version local_client <<< \
      "$("$NODE_BIN" "$(node_path "$SCRIPT_DIR/parse-version.cjs")" "$__line" "$UTPLSQL_BASE_VERSION" | \
        "$NODE_BIN" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);process.stdout.write([j.label,j.image,j.service,j.utplsqlVersion,j.client].join("|"))})')"
  else
    IFS='|' read -r label image service version_field client_field <<< "$__line"
    local_utplsql_version="${version_field:-$UTPLSQL_BASE_VERSION}"
    local_client="${client_field:-both}"
  fi
  label="$(echo "$label" | tr -d ' ')"; image="$(echo "$image" | tr -d ' ')"
  service="$(echo "$service" | tr -d ' ')"; local_utplsql_version="$(echo "$local_utplsql_version" | tr -d ' ')"
  local_client="$(echo "$local_client" | tr -d ' ')"
  selected "$label" || continue
  CURRENT_IMAGE="$image"

  # Guarda fail-fast: 11g (client=thick) só roda no eixo thick. Melhor falhar
  # antes do pull/bootstrap do que receber NJS-138 no meio da suíte.
  if [ "$local_client" = "thick" ]; then
    case "$TESTS_CMD" in
      *test:integration:thick*) ;;
      *)
        echo "$label só roda com --thick (thin exige 12.1+; use --thick/--tests 'npm run test:integration:thick')." >&2
        exit 1
        ;;
    esac
  fi

  log "$label — $image (serviço $service, utPLSQL $local_utplsql_version, client $local_client)"

  # Instant Client específico da versão (ex.: ORACLE_CLIENT_LIB_DIR_11XE) tem
  # precedência sobre o global; exportado para o WSLENV abaixo.
  label_suffix="$(printf '%s' "$label" | tr '[:lower:]' '[:upper:]' | tr -c 'A-Z0-9' '_')"
  client_var="ORACLE_CLIENT_LIB_DIR_${label_suffix}"
  if [ -n "${!client_var:-}" ]; then
    export ORACLE_CLIENT_LIB_DIR="${!client_var}"
  fi

  # Volume de dados por versão: a 1ª subida cria o banco; as demais reaproveitam.
  export DB_VOLUME="${DB_VOLUME_PREFIX:-utplsql-dbmatrix}-${label}"
  if [ "$label" = "11xe" ]; then
    export DB_DATA_DIR="${DB_DATA_DIR_11XE:-/u01/app/oracle/oradata}"
  else
    export DB_DATA_DIR="${DB_DATA_DIR:-/opt/oracle/oradata}"
  fi
  export DB_IMAGE="$image" DB_CONTAINER="$CONTAINER" DB_PORT ORACLE_PWD ORACLE_PASSWORD DB_DATA_DIR
  export UT3_PASSWORD TEST_PASSWORD UTPLSQL_VERSION="$local_utplsql_version"

  if [ "$CLEAN" = 1 ]; then
    log "limpando volume $DB_VOLUME (--clean)"
    compose down --remove-orphans >/dev/null 2>&1 || true
    docker volume rm "$DB_VOLUME" >/dev/null 2>&1 || true
  fi

  [ "$NO_PULL" = 1 ] || compose pull --quiet db
  compose up -d db
  # 1ª subida de uma imagem que cria o banco do zero (ex.: 18c/19c) leva ~15-25
  # min; com o volume já populado o boot é ~1-2 min.
  bash "$SCRIPT_DIR/wait-ready.sh" "$CONTAINER" "$service" "${WAIT_TIMEOUT:-1800}"

  if [ "$SKIP_BOOTSTRAP" = 0 ]; then
    bash "$SCRIPT_DIR/bootstrap.sh" "$CONTAINER" "$service"
  else
    log "pulando bootstrap (--skip-bootstrap): validando UT3/UTPLSQL_TEST no volume"
    assert_bootstrapped
  fi

  if [ "$BOOTSTRAP_ONLY" = 0 ]; then
    export UTPLSQL_CONN="UT3/${UT3_PASSWORD}@//localhost:${DB_PORT}/${service}"
    # WSL: o `node` é o binário do Windows e não herda env do WSL — WSLENV faz
    # a variável atravessar para o processo dos testes. ORACLE_CLIENT_LIB_DIR/
    # TNS_ADMIN só são usados pelo modo --thick.
    export WSLENV="UTPLSQL_CONN${ORACLE_CLIENT_LIB_DIR:+:ORACLE_CLIENT_LIB_DIR}${TNS_ADMIN:+:TNS_ADMIN}${WSLENV:+:$WSLENV}"
    test_log="$LOG_DIR/$label.log"
    start_ts="$(date +%s)"
    log "rodando testes: $TESTS_CMD  (UTPLSQL_CONN=$(mask_conn "$UTPLSQL_CONN"))"
    set +e
    # Subshell explícito em vez de `eval` no shell do orquestrador: TESTS_CMD
    # pode conter `&&` e `bash -c '...'` (--full/--tests). O valor é entrada
    # do mantenedor (dev-only), mas não deve reavaliar o ambiente do run.sh.
    (cd "$ROOT_DIR" && bash -c "$TESTS_CMD") 2>&1 | tee "$test_log"
    test_status="${PIPESTATUS[0]}"
    set -e
    duration="$(( $(date +%s) - start_ts ))"
    if [ -n "$NODE_BIN" ]; then
      "$NODE_BIN" "$(node_path "$SCRIPT_DIR/summary.cjs")" append \
        --file "$(node_path "$SUMMARY_FILE")" \
        --label "$label" \
        --image "$image" \
        --utplsql "$local_utplsql_version" \
        --status "$([ "$test_status" -eq 0 ] && echo passed || echo failed)" \
        --log "$(node_path "$test_log")" \
        --duration "$duration"
    else
      log "node não encontrado: resumo JSONL/Markdown não será gerado"
    fi
    if [ "$test_status" -ne 0 ] && [ "$CONTINUE_ON_ERROR" = 0 ]; then
      exit "$test_status"
    fi
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

if [ -f "$SUMMARY_FILE" ] && [ -n "$NODE_BIN" ]; then
  "$NODE_BIN" "$(node_path "$SCRIPT_DIR/summary.cjs")" render \
    --file "$(node_path "$SUMMARY_FILE")" \
    --out "$(node_path "${SUMMARY_FILE%.jsonl}.md")"
  log "resumo da matriz: ${SUMMARY_FILE%.jsonl}.md"
fi

log "matriz concluída"
