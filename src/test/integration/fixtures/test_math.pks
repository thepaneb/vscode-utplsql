CREATE OR REPLACE PACKAGE test_math AS
  --%suite(Math operations)
  --%suitepath(utplsql_test)

  --%test(Adds two numbers)
  PROCEDURE adds_two_numbers;

  --%test(Divides by zero raises exception)
  PROCEDURE divide_by_zero;
END;
