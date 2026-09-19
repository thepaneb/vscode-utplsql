// Config de "smoke": subconjunto rápido dos testes de integração, útil para
// validar várias versões de banco sem rodar a suíte inteira.
//
//   UTPLSQL_CONN=... npm run test:integration:smoke
//
// Reaproveita a config base (que carrega o .env e repassa UTPLSQL_CONN ao host)
// e reduz os arquivos às capacidades Oracle + contrato do DBMS_DEBUG.
import base from './.vscode-test.mjs';

export default {
  ...base,
  files: [
    'out/test/integration/oracleCapabilities.test.js',
    'out/test/integration/debuggerE2E.test.js',
    'out/test/integration/debuggerStandaloneFn.test.js',
  ],
};
