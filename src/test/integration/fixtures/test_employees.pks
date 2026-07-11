CREATE OR REPLACE PACKAGE test_employees AS
  --%suite(Employees tests)
  --%suitepath(utplsql_test)

  --%test(Returns all employees)
  PROCEDURE returns_all_employees;

  --%test(Throws on invalid id)
  PROCEDURE throws_on_invalid_id;

  --%beforetest
  PROCEDURE setup;

  --%aftertest
  PROCEDURE cleanup;
END;
