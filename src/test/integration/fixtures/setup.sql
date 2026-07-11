-- Setup do schema de teste UTPLSQL_TEST para testes de integração
-- PRD-14: Schema e objetos de teste utPLSQL
-- Idempotente: pode rodar múltiplas vezes
-- Uso: sqlplus sys/...@//localhost:1521/freepdb1 as sysdba @setup.sql

set heading off
set feedback off
set serveroutput on

define ut3_owner=UT3

prompt ===== Criando schema UTPLSQL_TEST =====

declare
  e user_tables%rowtype;
begin
  for e in (select username from dba_users where username = 'UTPLSQL_TEST') loop
    execute immediate 'drop user utplsql_test cascade';
  end loop;
end;
/

create user utplsql_test identified by "utplsql_test#2026"
  default tablespace users quota unlimited on users;

grant connect, resource, create procedure, create type, create table, create sequence to utplsql_test;

prompt ===== Concedendo acesso ao utPLSQL =====

grant execute on &ut3_owner..ut to utplsql_test;
grant execute on &ut3_owner..ut3 to utplsql_test;
grant inherit privileges on user &ut3_owner to utplsql_test;
grant execute on sys.dbms_profiler to utplsql_test;

prompt ===== Schema criado com sucesso =====
prompt Agora execute o script compile_packages.sql como utplsql_test:
prompt   sqlplus utplsql_test/utplsql_test#2026@//localhost:1521/freepdb1 @compile_packages.sql
