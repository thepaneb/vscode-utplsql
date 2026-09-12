/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import type { DebugConnection } from '../../dbmsDebug';

// Capacidades lidas do banco Oracle real: metadados do utPLSQL, erros de
// compilação (ALL_ERRORS), validação de setup e acesso a debug.
// Gate: UTPLSQL_CONN no .env (mesma regra dos demais testes de integração).
// Objetos criados usam sufixo _IT62 e são removidos em `finally`.

function hasConnection(): boolean {
  return !!process.env.UTPLSQL_CONN;
}
const describeDB = hasConnection() ? describe : describe.skip;

describeDB('capacidades Oracle do banco real', () => {
  before(async () => {
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
  });

  function connParts(): { user: string; password: string; connectString: string } {
    const conn = process.env.UTPLSQL_CONN as string;
    const m = conn.match(/^([^/]+)\/([^@]+)@\/\/(.+)$/);
    assert.ok(m, 'UTPLSQL_CONN deve ser user/pass@//host:port/svc');
    return { user: m[1], password: m[2], connectString: m[3] };
  }

  async function openRaw(): Promise<import('oracledb').Connection> {
    const mod = await import('oracledb');
    const oracledb =
      ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
      (mod as typeof import('oracledb'));
    const { user, password, connectString } = connParts();
    return oracledb.getConnection({ user, password, connectString });
  }

  /** Roda com OUT_FORMAT_OBJECT e restaura o global (outros testes mudam). */
  async function withObjectFormat<T>(fn: () => Promise<T>): Promise<T> {
    const mod = await import('oracledb');
    const oracledb =
      ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
      (mod as typeof import('oracledb'));
    const prev = oracledb.outFormat;
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    try {
      return await fn();
    } finally {
      oracledb.outFormat = prev;
    }
  }

  it('discoverUtplsqlSchema reflete o synonym público (ou vazio sem ele)', async function () {
    this.timeout(60_000);
    const { discoverUtplsqlSchema } = require('../../oracleRunner.js');
    const dbc = await openRaw();
    try {
      const expected = await withObjectFormat(async () => {
        const r = await dbc.execute(
          `SELECT table_owner FROM ALL_SYNONYMS WHERE synonym_name = 'UT_RUNNER' AND owner = 'PUBLIC'`,
          {},
        );
        const owner = (r.rows?.[0] as { TABLE_OWNER?: string } | undefined)?.TABLE_OWNER;
        return owner ? `${owner}.` : '';
      });
      const prefix: string = await withObjectFormat(() => discoverUtplsqlSchema(dbc));
      assert.strictEqual(prefix, expected);
    } finally {
      await dbc.close().catch(() => {});
    }
  });

  it('getOracleInfo retorna versões do utPLSQL e do banco', async function () {
    this.timeout(60_000);
    const { getOracleInfo } = require('../../oracleRunner.js');
    const dbc = await openRaw();
    try {
      const info = await getOracleInfo(dbc);
      assert.ok(info.utVersion, 'versão do utPLSQL deveria vir do banco');
      assert.ok(info.dbVersion, 'versão do banco deveria vir do banco');
    } finally {
      await dbc.close().catch(() => {});
    }
  });

  it('listReportersOracle lista reporters; checkReporterExists valida', async function () {
    this.timeout(60_000);
    const { listReportersOracle, checkReporterExists } = require('../../oracleRunner.js');
    const dbc = await openRaw();
    try {
      const reporters = await listReportersOracle(dbc);
      assert.ok(reporters.length > 0, 'banco deveria listar reporters');
      const doc = reporters.find((r: string) => /documentation/i.test(r));
      assert.ok(doc, `reporter de documentação esperado, veio: ${reporters.join(',')}`);
      assert.strictEqual(await checkReporterExists(dbc, doc), true);
      assert.strictEqual(await checkReporterExists(dbc, 'UT_REPORTER_INEXISTENTE_XYZ'), false);
    } finally {
      await dbc.close().catch(() => {});
    }
  });

  it('findInvalidUt3Objects retorna shape sem lançar', async function () {
    this.timeout(60_000);
    const { findInvalidUt3Objects } = require('../../oracleRunner.js');
    const { readConfig } = require('../../config.js');
    const found = await findInvalidUt3Objects(
      await import('oracledb').then(
        (mod) =>
          ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
          (mod as typeof import('oracledb')),
      ),
      process.env.UTPLSQL_CONN as string,
      readConfig(),
    );
    assert.ok(found, 'deveria retornar o schema + lista (best-effort)');
    assert.strictEqual(typeof found.schema, 'string');
    assert.ok(Array.isArray(found.invalid));
  });

  it('checkCompilationErrors encontra package inválido e limpa após drop', async function () {
    this.timeout(120_000);
    const { checkCompilationErrors } = require('../../oracleRunner.js');
    const { user } = connParts();
    const schema = user.toUpperCase();
    const pkg = 'UTPLSQL_BADPKG_IT62';
    const dbc = await openRaw();
    try {
      await dbc.execute(`DROP PACKAGE ${pkg}`, {}, { autoCommit: true }).catch(() => {});
      await dbc.execute(
        `CREATE OR REPLACE PACKAGE ${pkg} AS PROCEDURE p (x IN ${pkg}_TYPEDEF); END ${pkg};`,
        {},
        { autoCommit: true },
      );
      const errors = await checkCompilationErrors(dbc, schema);
      const mine = errors.filter((e: { name: string }) => e.name === pkg);
      assert.ok(mine.length > 0, 'ALL_ERRORS deveria conter o package inválido');
      assert.ok(mine[0].line > 0);
      assert.ok(mine[0].text.length > 0);
      await dbc.execute(`DROP PACKAGE ${pkg}`, {}, { autoCommit: true });
      const after = await checkCompilationErrors(dbc, schema);
      assert.ok(
        after.every((e: { name: string }) => e.name !== pkg),
        'após o drop não deveria restar erro do package',
      );
    } finally {
      await dbc.execute(`DROP PACKAGE ${pkg}`, {}, { autoCommit: true }).catch(() => {});
      await dbc.close().catch(() => {});
    }
  });

  it('setupValidator.validateOnActivation não lança e retorna array', async function () {
    this.timeout(120_000);
    const { setupValidator } = require('../../quickfix.js');
    const diags = await setupValidator.validateOnActivation();
    assert.ok(Array.isArray(diags));
  });

  it('checkDebugAccess reporta acesso a DBMS_DEBUG (skip sem grant)', async function () {
    this.timeout(60_000);
    const { checkDebugAccess } = require('../../dbmsDebug.js');
    const dbc = await openRaw();
    try {
      const adapter = {
        execute: (sql: string, binds?: Record<string, unknown>) =>
          dbc.execute(sql, (binds ?? {}) as never),
        close: () => dbc.close(),
      } as unknown as DebugConnection;
      if (!(await checkDebugAccess(adapter))) {
        this.skip();
        return;
      }
      assert.strictEqual(await checkDebugAccess(adapter), true);
    } finally {
      await dbc.close().catch(() => {});
    }
  });
});
