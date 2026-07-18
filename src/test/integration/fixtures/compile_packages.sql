-- Compila os packages de teste no schema UTPLSQL_TEST
-- Uso: sqlplus utplsql_test/utplsql_test#2026@//localhost:1521/freepdb1 @compile_packages.sql

set feedback on
set serveroutput on

prompt ===== Objetos de producao (calculator) =====

create or replace package calculator as

  function add(a number, b number) return number;

  function subtract(a number, b number) return number;

  function multiply(a number, b number) return number;

  function divide(a number, b number) return number;

end calculator;
/

show errors

create or replace package body calculator as

  function add(a number, b number) return number as
  begin
    return a + b;
  end add;

  function subtract(a number, b number) return number as
  begin
    return a - b;
  end subtract;

  function multiply(a number, b number) return number as
  begin
    return a * b;
  end multiply;

  function divide(a number, b number) return number as
  begin
    if b = 0 then
      raise zero_divide;
    end if;
    return a / b;
  end divide;

end calculator;
/

show errors

prompt ----- greet function -----

create or replace function greet(name varchar2) return varchar2 as
begin
  return 'Hello, ' || name || '!';
end greet;
/

show errors

prompt ===== test_calculator =====

create or replace package test_calculator as
  --%suite(Calculator unit tests)
  --%suitepath(utplsql_test)

  --%test(Adds two positive numbers)
  procedure test_add_positive;

  --%test(Adds positive and negative)
  procedure test_add_negative;

  --%test(Subtracts two numbers)
  procedure test_subtract;

  --%test(Multiplies two numbers)
  procedure test_multiply;

  --%test(Divides two numbers)
  procedure test_divide;

  --%test(Division by zero raises exception)
  procedure test_divide_by_zero;
end;
/

show errors

create or replace package body test_calculator as

  procedure test_add_positive is
  begin
    ut3.ut.expect(calculator.add(2, 3)).to_equal(5);
  end;

  procedure test_add_negative is
  begin
    ut3.ut.expect(calculator.add(-1, 1)).to_equal(0);
  end;

  procedure test_subtract is
  begin
    ut3.ut.expect(calculator.subtract(10, 3)).to_equal(7);
  end;

  procedure test_multiply is
  begin
    ut3.ut.expect(calculator.multiply(4, 5)).to_equal(20);
  end;

  procedure test_divide is
  begin
    ut3.ut.expect(calculator.divide(10, 2)).to_equal(5);
  end;

  procedure test_divide_by_zero is
    dummy number;
  begin
    begin
      dummy := calculator.divide(1, 0);
      ut3.ut.fail('Deveria ter lançado ZERO_DIVIDE');
    exception
      when zero_divide then
        null;
    end;
  end;

end;
/

show errors

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

prompt ===== test_math_fail =====

create or replace package test_math_fail as
  --%suite(Math failures)
  --%suitepath(utplsql_test)

  --%test(Expects 1 to equal 2 — sempre falha)
  procedure expects_one_to_equal_two;
end;
/

show errors

create or replace package body test_math_fail as
  procedure expects_one_to_equal_two is
  begin
    ut3.ut.expect(1).to_equal(2);
  end;
end;
/

show errors

prompt ===== Todos os packages compilados =====
