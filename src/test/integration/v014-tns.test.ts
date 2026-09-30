/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';

// PRD-82 — resolução de alias TNS no driver thin, **opt-in** via variáveis de
// ambiente (não roda por padrão, pois exige um `tnsnames.ora` com um alias
// apontando para um banco acessível):
//
//   UTPLSQL_TNS_ADMIN=/caminho/com/tnsnames.ora
//   UTPLSQL_TNS_ALIAS=MEU_ALIAS
//
// Com ambas definidas (+ `UTPLSQL_CONN` do banco), valida que:
//   - `resolveConnectString` lê o `tnsnames.ora` e resolve o alias;
//   - `ensurePool` conecta usando o alias, sem `TNS_ADMIN` global.

const ALIAS = process.env.UTPLSQL_TNS_ALIAS;
const TNS_DIR = process.env.UTPLSQL_TNS_ADMIN ?? process.env.TNS_ADMIN;
const describeTns = ALIAS && TNS_DIR ? describe : describe.skip;
const hasConnection = !!process.env.UTPLSQL_CONN;

describeTns('PRD-82 — alias TNS no thin (opt-in)', () => {
  before(async () => {
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
  });

  it('resolveConnectString lê o tnsnames.ora e resolve o alias', function () {
    this.timeout(60_000);
    const { resolveConnectString } = require('../../oracleRunner.js');
    const resolved = resolveConnectString(ALIAS as string, TNS_DIR as string);
    assert.notStrictEqual(resolved, ALIAS, 'o alias deveria ser resolvido para o descriptor');
    assert.ok(
      /DESCRIPTION/i.test(resolved),
      `descriptor inesperado para ${ALIAS}: ${resolved.slice(0, 200)}`,
    );
  });

  it('ensurePool conecta usando o alias (sem TNS_ADMIN global) [requer UTPLSQL_CONN]', async function () {
    if (!hasConnection) this.skip();
    this.timeout(120_000);
    const { parseConnString, ensurePool, closeOraclePool } = require('../../oracleRunner.js');
    const { readConfig } = require('../../config.js');
    const mod = await import('oracledb');
    const oracledb =
      ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
      (mod as typeof import('oracledb'));

    const base = parseConnString(process.env.UTPLSQL_CONN as string);
    const connection = `${base.user}/${base.password}@${ALIAS}`;
    const cfg = { ...readConfig(), tnsAdminPath: TNS_DIR as string };
    try {
      const pool = await ensurePool(oracledb, connection, cfg);
      assert.ok(pool, 'ensurePool deveria resolver o alias e abrir o pool');
    } finally {
      await closeOraclePool();
    }
  });
});
