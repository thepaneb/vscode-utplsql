CREATE OR REPLACE PACKAGE test_betwnvarchar AS
  --%suite(Between VARCHAR)
  --%suitepath(utplsql_test)

  --%test(Returns string between two string boundaries)
  PROCEDURE string_between_two_strings;
END;
