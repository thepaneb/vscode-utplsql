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
