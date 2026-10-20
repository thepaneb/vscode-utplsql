/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';

// PRD-82 — resolução de alias TNS no driver thin.
//
// Por padrão, gera um `tnsnames.ora` temporário a partir de `UTPLSQL_CONN`
// (Easy Connect `user/pass@//host:port/service`). Também aceita um arquivo
// externo:
//
//   UTPLSQL_TNS_ADMIN=/caminho/com/tnsnames.ora
//   UTPLSQL_TNS_ALIAS=MEU_ALIAS
//
// Valida que `resolveConnectString` resolve o alias e que `ensurePool` conecta
// usando o alias, sem `TNS_ADMIN` global.

const hasConnection = !!process.env.UTPLSQL_CONN;
let alias = process.env.UTPLSQL_TNS_ALIAS;
let tnsDir = process.env.UTPLSQL_TNS_ADMIN ?? process.env.TNS_ADMIN;
let tempDir: string | undefined;
const describeTns = hasConnection || (!!alias && !!tnsDir) ? describe : describe.skip;

describeTns('PRD-82 — alias TNS no thin', () => {
  before(async () => {
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
    if (alias && tnsDir) return;
    if (!hasConnection) return;

    const { parseConnString } = await import('../../oracleRunner.js');
    const base = parseConnString(process.env.UTPLSQL_CONN as string);
    const match = /^\/\/([^:/]+)(?::(\d+))?\/(.+)$/.exec(base.connectionString);
    if (!match) return;

    alias = 'UTPLSQL_IT_ALIAS';
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-tns-'));
    const service = match[3].split('?')[0];
    fs.writeFileSync(
      path.join(tempDir, 'tnsnames.ora'),
      `${alias} =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = ${match[1]})(PORT = ${match[2] ?? '1521'}))
    (CONNECT_DATA =
      (SERVICE_NAME = ${service})
    )
  )
`,
    );
    tnsDir = tempDir;
  });

  after(() => {
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('resolveConnectString lê o tnsnames.ora e resolve o alias', function () {
    if (!alias || !tnsDir) this.skip();
    const { resolveConnectString } = require('../../oracleRunner.js');
    const resolved = resolveConnectString(alias as string, tnsDir as string);
    assert.notStrictEqual(resolved, alias, 'o alias deveria ser resolvido para o descriptor');
    assert.ok(
      /DESCRIPTION/i.test(resolved),
      `descriptor inesperado para ${alias}: ${resolved.slice(0, 200)}`,
    );
  });

  it('ensurePool conecta usando o alias (sem TNS_ADMIN global)', async function () {
    if (!hasConnection || !alias || !tnsDir) this.skip();
    this.timeout(120_000);
    const { parseConnString, ensurePool, closeOraclePool } = require('../../oracleRunner.js');
    const { readConfig } = require('../../config.js');
    const mod = await import('oracledb');
    const oracledb =
      ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
      (mod as typeof import('oracledb'));

    const base = parseConnString(process.env.UTPLSQL_CONN as string);
    const connection = `${base.user}/${base.password}@${alias}`;
    const cfg = { ...readConfig(), tnsAdminPath: tnsDir as string };
    try {
      const pool = await ensurePool(oracledb, connection, cfg);
      assert.ok(pool, 'ensurePool deveria resolver o alias e abrir o pool');
    } finally {
      await closeOraclePool();
    }
  });
});
