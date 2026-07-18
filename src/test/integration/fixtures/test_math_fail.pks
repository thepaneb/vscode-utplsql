CREATE OR REPLACE PACKAGE test_math_fail AS
  --%suite(Math failures)
  --%suitepath(utplsql_test)

  --%test(Expects 1 to equal 2 — sempre falha)
  PROCEDURE expects_one_to_equal_two;
END;
