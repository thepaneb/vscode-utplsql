/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { installOutFormatIsolation } from './helpers';

// Cobre o caminho em que o `V$SQL` está **negado** em `applySqlCoverage`
// (viewCoverage.ts): a extensão deve avisar com o grant necessário e não
// quebrar. Condicional ao ambiente: se o usuário tiver o grant, o teste é
// pulado (não há como forçar a negação sem DBA).
//
// Gate: UTPLSQL_CONN no .env.

function hasConnection(): boolean {
  return !!process.env.UTPLSQL_CONN;
}
const describeDB = hasConnection() ? describe : describe.skip;

function connParts(): { user: string; password: string; connectString: string } {
  const conn = process.env.UTPLSQL_CONN as string;
  const m = conn.match(/^([^/]+)\/([^@]+)@\/\/(.+)$/);
  assert.ok(m, 'UTPLSQL_CONN deve ser user/pass@//host:port/svc');
  return { user: m[1], password: m[2], connectString: m[3] };
}

describeDB('viewCoverage: V$SQL negado (sem grant) emite aviso', () => {
  installOutFormatIsolation();

  before(async () => {
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
  });

  it('emite a mensagem com o grant e não quebra', async function () {
    this.timeout(120_000);
    const mod = await import('oracledb');
    const oracledb =
      ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
      (mod as typeof import('oracledb'));
    const { user, password, connectString } = connParts();
    const conn = await oracledb.getConnection({ user, password, connectString });
    try {
      let denied = false;
      try {
        await conn.execute('SELECT sql_text FROM v$sql WHERE ROWNUM = 1');
      } catch {
        denied = true;
      }
      if (!denied) {
        // Ambiente concedeu SELECT ON V$SQL: o caminho negado não é exercitável.
        this.skip();
        return;
      }

      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-vsql-denied-'));
      const viewsDir = path.join(root, 'install', 'views');
      fs.mkdirSync(viewsDir, { recursive: true });
      fs.writeFileSync(
        path.join(viewsDir, 'VW_DENIED_IT.sql'),
        'CREATE VIEW VW_DENIED_IT AS SELECT 1 AS n FROM dual',
        'utf8',
      );

      const { applySqlCoverage } = require('../../viewCoverage.js');
      const { TestStateManager } = require('../../state.js');
      const { t } = require('../../i18n.js');
      const { getExtensionLocale } = require('../../config.js');

      const output: string[] = [];
      const run = { appendOutput: (s: string) => output.push(s), addCoverage: () => {} };
      const state = new TestStateManager();
      const folder = { uri: vscode.Uri.file(root), name: 'root', index: 0 };
      try {
        await applySqlCoverage({
          connection: process.env.UTPLSQL_CONN as string,
          root,
          sourcePath: 'install',
          run: run as never,
          state,
          folders: [folder] as never,
        });
        const expected = t(getExtensionLocale(), 'viewCoverage.vsqlDenied');
        assert.ok(
          output.join('\n').includes(expected),
          `deveria avisar V$SQL negado: ${output.join('\n')}`,
        );
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    } finally {
      await conn.close().catch(() => {});
    }
  });
});
