create or replace package calculator as

  function add(a number, b number) return number;

  function subtract(a number, b number) return number;

  function multiply(a number, b number) return number;

  function divide(a number, b number) return number;

end calculator;
/

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
