// Config do eixo **thick full** (PRD-125): a suíte de integração completa, mas
// com o processo inicializado em thick mode desde a primeira conexão.
//
//   ORACLE_CLIENT_LIB_DIR='C:\oracle\instantclient_23_0' \
//   UTPLSQL_CONN='user/pass@//host:port/svc' \
//   npm run test:integration:thick-full
//
// O workspace é um `.code-workspace` temporário com a pasta do repositório e as
// settings que a extensão lê (`oracleClientMode`/`oracleClientLibDir`). O
// `prd70-sqlplus` (afirma thin default) e o `v014-tns` (TNS thin) ficam fora.
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import base from './.vscode-test.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)));
const libDir = process.env.ORACLE_CLIENT_LIB_DIR ?? '';
const conn = process.env.UTPLSQL_CONN ?? '';

const EXCLUDED = new Set(['prd70-sqlplus.test.js', 'v014-tns.test.js']);
const files = readdirSync(join(root, 'out', 'test', 'integration'))
  .filter((f) => f.endsWith('.test.js') && !EXCLUDED.has(f))
  .sort()
  .map((f) => `out/test/integration/${f}`);

const dir = mkdtempSync(join(tmpdir(), 'utplsql-thick-full-'));
const workspace = join(dir, 'thick-full.code-workspace');
writeFileSync(
  workspace,
  JSON.stringify(
    {
      folders: [{ path: root }],
      settings: {
        'utplsql.oracleClientMode': 'thick',
        'utplsql.oracleClientLibDir': libDir,
      },
    },
    null,
    2,
  ),
);

export default {
  ...base,
  files,
  workspaceFolder: workspace,
  env: {
    ...base.env,
    UTPLSQL_CONN: conn,
    UTPLSQL_THICK_CONN: conn,
    UTPLSQL_THICK_TEST: '1',
    ORACLE_CLIENT_LIB_DIR: libDir,
  },
  mocha: {
    ...base.mocha,
    timeout: 120_000,
  },
};
