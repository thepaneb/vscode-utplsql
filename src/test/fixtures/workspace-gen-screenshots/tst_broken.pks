create or replace package tst_broken as

  -- %suite(Broken Package — compilation error demo)
  -- %suitepath(utplsql.errors)

  -- %test(This test will never run due to compilation error)
  procedure test_will_fail;

end tst_broken;
/

create or replace package body tst_broken as

  procedure test_will_fail is
    v_result number;
  begin
    -- ERROR abaixo: typo intencional
    v_result := DOES_NOT_EXIST(42);
    ut.expect(v_result).to_equal(42);
  end;

end tst_broken;
/
