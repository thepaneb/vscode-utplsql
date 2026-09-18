#!/usr/bin/env bash
# Prepara um banco da matriz para os testes de integração:
#   1. baixa/instala o utPLSQL (<UTPLSQL_VERSION>) no schema UT3;
#   2. aplica os grants do README (profilers, cobertura, V$SQL, debugger);
#   3. cria o schema de teste UTPLSQL_TEST e compila os fixtures.
#
# Uso: bootstrap.sh <container> <pdb>
# Env: UT3_PASSWORD, TEST_PASSWORD, UTPLSQL_VERSION, CACHE_DIR, FIXTURES_DIR
set -euo pipefail

CONTAINER="${1:?uso: bootstrap.sh <container> <pdb>}"
PDB="${2:?uso: bootstrap.sh <container> <pdb>}"
UT3_PASSWORD="${UT3_PASSWORD:?defina UT3_PASSWORD}"
TEST_PASSWORD="${TEST_PASSWORD:?defina TEST_PASSWORD}"
UTPLSQL_VERSION="${UTPLSQL_VERSION:-v.3.2.3}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CACHE_DIR="${CACHE_DIR:-$ROOT_DIR/docker/db-matrix/.cache}"
FIXTURES_DIR="${FIXTURES_DIR:-$ROOT_DIR/src/test/integration/fixtures}"

log() { printf '\n\033[1m[bootstrap]\033[0m %s\n' "$*"; }

# ── helpers de SQL ────────────────────────────────────────────────────

# Executa SQL como SYSDBA no PDB (root + ALTER SESSION SET CONTAINER).
sys_sql() {
  {
    printf 'SET DEFINE OFF FEEDBACK OFF HEADING OFF PAGESIZE 0\n'
    printf 'ALTER SESSION SET CONTAINER=%s;\n' "$PDB"
    printf '%s\n' "$1"
    printf 'EXIT\n'
  } | docker exec -i "$CONTAINER" bash -lc "\$ORACLE_HOME/bin/sqlplus -s / as sysdba"
}

# Executa um arquivo local como um schema do PDB.
user_file() {
  local user="$1" pass="$2" file="$3"
  docker exec -i -e "DBU=$user" -e "DBP=$pass" -e "DBS=$PDB" "$CONTAINER" \
    bash -lc '$ORACLE_HOME/bin/sqlplus -s "$DBU/$DBP@//localhost:1521/$DBS"' < "$file"
}

# ── 1. cache do fonte do utPLSQL ──────────────────────────────────────

ensure_utplsql_source() {
  local marker="$CACHE_DIR/.src-$UTPLSQL_VERSION"
  if [ -f "$marker" ] && [ -d "$(cat "$marker")" ]; then
    UTPLSQL_SRC="$(cat "$marker")"
    return
  fi

  local found
  found="$(find "$CACHE_DIR" -name install_headless.sql -print -quit 2>/dev/null || true)"
  if [ -z "$found" ]; then
    log "baixando utPLSQL $UTPLSQL_VERSION"
    mkdir -p "$CACHE_DIR"
    local url="https://github.com/utPLSQL/utPLSQL/archive/refs/tags/${UTPLSQL_VERSION}.zip"
    local zip="$CACHE_DIR/utplsql-${UTPLSQL_VERSION}.zip"
    curl -fsSL "$url" -o "$zip"
    rm -rf "$CACHE_DIR/utPLSQL-"* 2>/dev/null || true
    if command -v unzip >/dev/null 2>&1; then
      unzip -q -o "$zip" -d "$CACHE_DIR"
    else
      python3 -c "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "$zip" "$CACHE_DIR"
    fi
    found="$(find "$CACHE_DIR" -name install_headless.sql -print -quit)"
  fi
  [ -n "$found" ] || {
    echo "install_headless.sql não encontrado na fonte do utPLSQL" >&2
    exit 1
  }
  UTPLSQL_SRC="$(dirname "$found")"
  printf '%s' "$UTPLSQL_SRC" > "$marker"
}

# ── 2. UT3 + instalação do utPLSQL ────────────────────────────────────

ensure_tablespace() {
  log "garantindo tablespace USERS"
  sys_sql "
DECLARE
  v_exists NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_exists FROM dba_tablespaces WHERE tablespace_name = 'USERS';
  IF v_exists = 0 THEN
    EXECUTE IMMEDIATE 'CREATE TABLESPACE users DATAFILE ''users01.dbf'' SIZE 200M AUTOEXTEND ON NEXT 100M MAXSIZE 4G';
  END IF;
END;
/
"
}

install_utplsql() {
  log "instalando utPLSQL em UT3 via install_headless.sql"
  # Recria o UT3 para o install ser determinístico (container é efêmero, mas
  # permite re-execução).
  sys_sql "
DECLARE
  v_exists NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_exists FROM dba_users WHERE username = 'UT3';
  IF v_exists > 0 THEN
    EXECUTE IMMEDIATE 'DROP USER ut3 CASCADE';
  END IF;
END;
/
"
  docker exec "$CONTAINER" bash -lc 'rm -rf /tmp/utplsql-source && mkdir -p /tmp/utplsql-source'
  docker cp "$UTPLSQL_SRC/." "$CONTAINER:/tmp/utplsql-source/" >/dev/null
  # install_headless.sql cria o owner e instala (precisa de SYSDBA no PDB).
  docker exec -i -e "DBS=$PDB" -e "OWNER=UT3" -e "DBPASS=$UT3_PASSWORD" "$CONTAINER" bash -lc '
    cd /tmp/utplsql-source || exit 1
    { echo "ALTER SESSION SET CONTAINER=$DBS;";
      echo "@install_headless.sql $OWNER $DBPASS users";
      echo "EXIT"; } | $ORACLE_HOME/bin/sqlplus -s / as sysdba
  ' > /tmp/utplsql-install.log 2>&1 || true
  local n
  n="$(sys_sql "SELECT COUNT(*) FROM dba_objects WHERE owner='UT3';" | tr -dc '0-9')"
  log "objetos em UT3: ${n:-0} (log: /tmp/utplsql-install.log)"
  [ "${n:-0}" -ge 300 ] || {
    echo "instalação do utPLSQL parece ter falhado" >&2
    tail -30 /tmp/utplsql-install.log >&2
    exit 1
  }
}

# ── 3. grants do README (+ debugger/cobertura) ────────────────────────

apply_grants() {
  log "aplicando grants"
  sys_sql "
DECLARE
  PROCEDURE try_grant(p_sql VARCHAR2) IS
  BEGIN
    EXECUTE IMMEDIATE p_sql;
  EXCEPTION WHEN OTHERS THEN
    DBMS_OUTPUT.PUT_LINE('skip: ' || p_sql || ' -> ' || SQLERRM);
  END;
BEGIN
  try_grant('grant execute on sys.dbms_profiler to ut3');
  try_grant('grant execute on sys.dbms_plsql_code_coverage to ut3');
  try_grant('grant execute on sys.dbms_debug to ut3');
  try_grant('grant execute on sys.dbms_output to ut3');
  try_grant('grant select on sys.v_\$sql to ut3');
  try_grant('grant debug connect session to ut3');
  FOR r IN (
    SELECT object_name FROM all_objects
     WHERE owner = 'UT3'
       AND object_type IN ('TYPE','PACKAGE')
       AND object_name NOT LIKE '%TMP%'
       AND object_name NOT LIKE 'SYS%'
       AND object_name NOT LIKE 'DBMS_%'
  ) LOOP
    try_grant('grant execute on ut3.' || r.object_name || ' to public');
  END LOOP;
END;
/
"
}

# ── 4. schema UTPLSQL_TEST + fixtures ─────────────────────────────────

create_test_schema() {
  log "criando schema UTPLSQL_TEST"
  sys_sql "
DECLARE
  v_exists NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_exists FROM dba_users WHERE username = 'UTPLSQL_TEST';
  IF v_exists > 0 THEN
    EXECUTE IMMEDIATE 'DROP USER utplsql_test CASCADE';
  END IF;
END;
/
CREATE USER utplsql_test IDENTIFIED BY \"${TEST_PASSWORD}\"
  DEFAULT TABLESPACE users QUOTA UNLIMITED ON users;
GRANT connect, resource, create procedure, create type, create table, create sequence TO utplsql_test;
GRANT execute ON ut3.ut TO utplsql_test;
GRANT inherit privileges ON user ut3 TO utplsql_test;
GRANT execute ON sys.dbms_profiler TO utplsql_test;
GRANT execute ON sys.dbms_debug TO utplsql_test;
GRANT debug connect session TO utplsql_test;
"
}

compile_fixtures() {
  # Os testes de integração esperam as suites no schema da CONEXÃO (UT3):
  # fetchDbSource(utplsql-db:/<user>/TEST_MATH) e discoverSchemaFromDb(user).
  log "compilando fixtures em UT3"
  user_file UT3 "$UT3_PASSWORD" "$FIXTURES_DIR/compile_packages.sql" \
    > /tmp/fixtures-compile.log 2>&1 || true
  if grep -qiE "ORA-|PLS-" /tmp/fixtures-compile.log; then
    echo "erros ao compilar fixtures (ver /tmp/fixtures-compile.log)" >&2
    grep -iE "ORA-|PLS-" /tmp/fixtures-compile.log | head >&2
    exit 1
  fi
}

verify() {
  log "verificando (ut3.ut.run('test_math'))"
  local out
  out="$(docker exec -i -e "DBU=UT3" -e "DBP=$UT3_PASSWORD" -e "DBS=$PDB" "$CONTAINER" \
    bash -lc '$ORACLE_HOME/bin/sqlplus -s "$DBU/$DBP@//localhost:1521/$DBS"' <<'SQL' 2>&1 | tr -d '\r'
SET SERVEROUTPUT ON SIZE UNLIMITED FEEDBACK OFF
EXEC ut3.ut.run('test_math');
EXIT
SQL
)"
  if grep -q '0 failed, 0 errored' <<<"$out"; then
    log "utPLSQL ok — ${PDB} pronto (UT3/${UT3_PASSWORD}@//localhost:1521/${PDB})"
  else
    echo "$out" >&2
    echo "verificação do utPLSQL falhou" >&2
    exit 1
  fi
}

ensure_utplsql_source
ensure_tablespace
install_utplsql
apply_grants
create_test_schema
compile_fixtures
verify
