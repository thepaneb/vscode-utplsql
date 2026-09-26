CREATE OR REPLACE PACKAGE utplsql_jumpfail_e2e AS
  --%suite(Jump to failure E2E)

  -- alinha a asserção do BODY com a declaração abaixo (linha 5)
  --%test(Expects 1 to equal 2)
  PROCEDURE expects_one_to_equal_two;
END utplsql_jumpfail_e2e;
