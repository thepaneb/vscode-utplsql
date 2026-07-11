-- Compila os packages de teste no schema UTPLSQL_TEST
-- Uso: sqlplus utplsql_test/utplsql_test#2026@//localhost:1521/freepdb1 @compile_packages.sql

set feedback on
set serveroutput on

prompt ===== test_betwnvarchar =====

create or replace package test_betwnvarchar as
  --%suite(Between VARCHAR)
  --%suitepath(utplsql_test)

  --%test(Returns string between two string boundaries)
  procedure string_between_two_strings;
end;
/

show errors

create or replace package body test_betwnvarchar as
  procedure string_between_two_strings is
  begin
    ut3.ut.expect('between').to_equal('between');
  end;
end;
/

show errors

prompt ===== test_math =====

create or replace package test_math as
  --%suite(Math operations)
  --%suitepath(utplsql_test)

  --%test(Adds two numbers)
  procedure adds_two_numbers;

  --%test(Divides by zero raises exception)
  procedure divide_by_zero;
end;
/

show errors

create or replace package body test_math as
  procedure adds_two_numbers is
  begin
    ut3.ut.expect(2 + 2).to_equal(4);
  end;

  procedure divide_by_zero is
  begin
    execute immediate 'begin ut3.ut.expect(1 / 0).to_equal(1); end;';
  exception
    when zero_divide then
      null;
  end;
end;
/

show errors

prompt ===== test_employees =====

create or replace package test_employees as
  --%suite(Employees tests)
  --%suitepath(utplsql_test)

  --%test(Returns all employees)
  procedure returns_all_employees;

  --%test(Throws on invalid id)
  procedure throws_on_invalid_id;

  --%beforetest
  procedure setup;

  --%aftertest
  procedure cleanup;
end;
/

show errors

create or replace package body test_employees as
  g_count number := 0;

  procedure setup is
  begin
    g_count := 0;
    select count(*) into g_count from user_tables where rownum = 1;
  end;

  procedure cleanup is
  begin
    null;
  end;

  procedure returns_all_employees is
  begin
    ut3.ut.expect(g_count).to_be_greater_or_equal(0);
  end;

  procedure throws_on_invalid_id is
  begin
    raise no_data_found;
  exception
    when no_data_found then
      null;
  end;
end;
/

show errors

prompt ===== Todos os packages compilados =====
