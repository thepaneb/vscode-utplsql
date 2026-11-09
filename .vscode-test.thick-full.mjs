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
// O `thickMode` também fica fora: ele reseta o estado e chama
// `initOracleClient` de novo, mas o host já inicializou thick na ativação (o
// driver acusa "already initialized"). O teste continua no eixo thick isolado.
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import base from './.vscode-test.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)));
const libDir = process.env.ORACLE_CLIENT_LIB_DIR ?? '';
const conn = process.env.UTPLSQL_CONN ?? '';

const EXCLUDED = new Set([
  // thin-only
  'prd70-sqlplus.test.js',
  'v014-tns.test.js',
  // inicializa o cliente de novo (o host já está thick)
  'thickMode.test.js',
  // UI/comandos: cobertos pelo eixo thin; no workspace temporário do
  // thick-full eles falham/hangam por dependerem do `.vscode/settings.json`
  'extension.test.js',
  'commandsE2E.test.js',
  // Debugger/DBMS_DEBUG: limitação conhecida no thick (#288). Os testes
  // passam isolados, mas deixam sessões `pipe get` que envenenam o host
  // compartilhado e derrubam timeout/cancelamento seguintes (PRD-150 RF3).
  'debuggerE2E.test.js',
  'debuggerExceptionE2E.test.js',
  // debugger de function standalone: limitação conhecida no thick (PRD-125)
  'debuggerStandaloneFn.test.js',
  // 11g legado: o full do 23free não deve inicializar thick depois de um thin;
  // o eixo `--thick`/11g cobre este teste no host isolado.
  'thickLegacyE2E.test.js',
]);
// 11g/utPLSQL 3.1: timeout/cancelamento não interrompem o run no thick — o
// teste inteiro (inclusive o before) é excluído por eixo, não silenciado.
const LEGACY = process.env.UTPLSQL_LEGACY === '1';
const LEGACY_EXCLUDED = new Set(LEGACY ? ['runTimeoutE2E.test.js'] : []);
const files = readdirSync(join(root, 'out', 'test', 'integration'))
  .filter((f) => f.endsWith('.test.js') && !EXCLUDED.has(f) && !LEGACY_EXCLUDED.has(f))
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
        // As fixtures do repo (o `.vscode/settings.json` da pasta não é
        // herdado de forma confiável quando o host roda a partir de um
        // `.code-workspace` temporário).
        'utplsql.sourcePath': 'src/test/integration/fixtures',
        'utplsql.includePatterns': ['src/test/integration/fixtures/*.pks'],
        // PRD-101: o eixo thick-full mantém o pool entre runs (o teste de
        // fechamento do pool é coberto no eixo thin e no unitário).
        'utplsql.oraclePoolCloseAfterRun': false,
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
    UTPLSQL_LEGACY: process.env.UTPLSQL_LEGACY ?? '',
    ORACLE_CLIENT_LIB_DIR: libDir,
  },
  mocha: {
    ...base.mocha,
    timeout: 120_000,
    // Inicializa o Instant Client antes de qualquer conexão raw dos testes.
    // Sem isso o driver entra em thin e o `ensurePool`/`initOracleClient`
    // posterior falha com NJS-118.
    require: ['./out/test/integration/thickSetup.js'],
  },
};
