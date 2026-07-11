#!/bin/bash
# ============================================================
# Setup do ambiente de testes de integração com banco Oracle real
# PRD-13, PRD-14, PRD-15
# ============================================================
# Pré-requisitos:
#   - Docker com container oracle-data rodando (porta 1521)
#   - Java 17+ instalado
#   - utPLSQL-cli baixado em ~/utplsql-cli/
# ============================================================

set -euo pipefail

ORACLE_CONN="sys/Oracle#2026@//localhost:1521/freepdb1"
UT3_PASS="XNtxj8eEgA6X6b6f"
TEST_PASS="utplsql_test#2026"
UTPLSQL_SRC="/tmp/utplsql-source"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "===== Step 1: Verificando container Oracle ====="
docker exec oracle-data sqlplus -s sys/Oracle#2026@//localhost:1521/freepdb1 as sysdba \
  <<< "select 'CONNECTED' from dual;" 2>/dev/null || {
  echo "ERRO: Container oracle-data não está acessível"
  exit 1
}

echo "===== Step 2: Verificando utPLSQL-cli ====="
if ! ~/utplsql-cli/bin/utplsql info UT3/${UT3_PASS}@//localhost:1521/freepdb1 2>&1 | grep -q "utPLSQL"; then
  echo "AVISO: utPLSQL não detectado. Execute a instalação manualmente."
  echo "Consulte docs/prd/in-progress/prd-13-oracle-infra.md"
fi

echo "===== Step 3: Instalando utPLSQL (se necessário) ====="
docker exec oracle-data bash -c "sqlplus -s sys/Oracle#2026@//localhost:1521/freepdb1 as sysdba \
  <<< 'select count(*) from dba_objects where owner='\"'\"'UT3'\"'\"';'" 2>/dev/null | grep -q "376" || {
  echo "utPLSQL não instalado. Execute a instalação manualmente."
  echo "Consulte docs/prd/in-progress/prd-13-oracle-infra.md"
}

echo "===== Step 4: Garantindo grants para UT3 ====="
docker exec oracle-data bash -c "sqlplus -s sys/Oracle#2026@//localhost:1521/freepdb1 as sysdba" << SQL 2>/dev/null
begin
  for r in (select object_name from all_objects 
            where owner = 'UT3' and object_type in ('TYPE', 'PACKAGE')
            and object_name not like '%TMP%'
            and object_name not like 'SYS%'
            and object_name not like 'DBMS_%') loop
    begin
      execute immediate 'grant execute on ut3.' || r.object_name || ' to public';
    exception when others then null;
    end;
  end loop;
end;
/
SQL

echo "===== Step 5: Recompilando objetos inválidos ====="
docker exec oracle-data bash -c "sqlplus -s sys/Oracle#2026@//localhost:1521/freepdb1 as sysdba" << SQL 2>/dev/null
begin
  for r in (select object_name, object_type from dba_objects 
            where owner = 'UT3' and status = 'INVALID') loop
    begin
      execute immediate 'alter ' || r.object_type || ' UT3.' || r.object_name || ' compile';
    exception when others then null;
    end;
  end loop;
end;
/
SQL

echo "===== Step 6: Criando schema de teste ====="
docker exec oracle-data bash -c "sqlplus -s sys/Oracle#2026@//localhost:1521/freepdb1 as sysdba" << SQL 2>/dev/null
drop user utplsql_test cascade;
create user utplsql_test identified by "${TEST_PASS}"
  default tablespace users quota unlimited on users;
grant connect, resource, create procedure, create type, create table, create sequence to utplsql_test;
grant execute on ut3.ut to utplsql_test;
grant inherit privileges on user ut3 to utplsql_test;
grant execute on sys.dbms_profiler to utplsql_test;
SQL

echo "===== Step 7: Compilando packages de teste ====="
docker exec -i oracle-data bash -c 'cat > /tmp/compile_pkgs.sql' < "${SCRIPT_DIR}/compile_packages.sql"
docker exec oracle-data bash -c "sqlplus -s utplsql_test/${TEST_PASS}@//localhost:1521/freepdb1 @/tmp/compile_pkgs.sql" \
  2>/dev/null | grep -E "No errors|error"

echo "===== Step 8: Verificando ====="
docker exec oracle-data bash -c "sqlplus -s utplsql_test/${TEST_PASS}@//localhost:1521/freepdb1" << SQL 2>/dev/null
set serveroutput on
exec ut3.ut.run('test_betwnvarchar');
exec ut3.ut.run('test_math');
exec ut3.ut.run('test_employees');
SQL

echo ""
echo "===== Setup concluído! ====="
echo ""
echo "Para usar a extensão, configure:"
echo "  utplsql.connection: UT3/${UT3_PASS}@//localhost:1521/freepdb1"
echo "  utplsql.cliPath: ~/utplsql-cli/bin/utplsql"
echo ""
echo "OU use a env var:"
echo "  export UTPLSQL_CONN=UT3/${UT3_PASS}@//localhost:1521/freepdb1"
