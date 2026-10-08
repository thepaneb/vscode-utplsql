// Config dedicada ao thick mode (Instant Client).
//
// A inicialização thick é GLOBAL e irreversível no processo do extension host;
// rodá-la junto com a suíte normal quebraria o teste que garante o thin default
// (`prd70-sqlplus.test.ts`). Por isso este config roda APENAS o thickMode.test.ts
// num host isolado.
//
//   ORACLE_CLIENT_LIB_DIR='C:\oracle\instantclient_23_0' npm run test:integration:thick
//
// Reaproveita a config base (que carrega o .env) e repassa ORACLE_CLIENT_LIB_DIR
// e TNS_ADMIN ao host.
import base from './.vscode-test.mjs';

export default {
  ...base,
  files: ['out/test/integration/thickMode.test.js'],
  // Workspace SEM .pks/.pkb e SEM `UTPLSQL_CONN`: a extensão ativa em
  // `onStartupFinished` e `validateOnActivation` abriria uma conexão THIN,
  // impedindo o thick depois (NJS-118). Sem `UTPLSQL_CONN`, o host chega limpo
  // ao `ensureOracleClient`. A conexão do teste vai por `UTPLSQL_THICK_CONN`.
  workspaceFolder: 'src/test/integration/fixtures/thick-workspace',
  env: {
    ...base.env,
    UTPLSQL_CONN: '',
    UTPLSQL_THICK_CONN: process.env.UTPLSQL_CONN ?? '',
    UTPLSQL_THICK_TEST: '1',
    ORACLE_CLIENT_LIB_DIR: process.env.ORACLE_CLIENT_LIB_DIR ?? '',
    TNS_ADMIN: process.env.TNS_ADMIN ?? '',
  },
};

