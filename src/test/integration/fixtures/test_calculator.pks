CREATE OR REPLACE PACKAGE test_calculator AS
  --%suite(Calculator unit tests)
  --%suitepath(utplsql_test)

  --%test(Adds two positive numbers)
  PROCEDURE test_add_positive;

  --%test(Adds positive and negative)
  PROCEDURE test_add_negative;

  --%test(Subtracts two numbers)
  PROCEDURE test_subtract;

  --%test(Multiplies two numbers)
  PROCEDURE test_multiply;

  --%test(Divides two numbers)
  PROCEDURE test_divide;

  --%test(Division by zero raises exception)
  PROCEDURE test_divide_by_zero;
END;
