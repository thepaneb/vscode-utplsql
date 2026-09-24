/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { firstCol, installOutFormatIsolation } from './helpers';

// Testes de integração das features 0.13.0 contra o banco Oracle real:
//   PRD-69 binds tipados + a_tags | PRD-74 get_suites_info | PRD-77 rebuild
//   PRD-78 ordem aleatória | PRD-79 escopo de cobertura.
// Gate: UTPLSQL_CONN no .env.
//
// Nota sobre o utPLSQL: o `ut_runner` usa um *suite cache* separado do cache de
// anotações e, com o DDL trigger ausente, só enxerga packages já cacheados.
// Tags que não casam com nenhum teste fazem o `ut_runner.run` abortar com
// ORA-20204 — por isso o filtro por tag é validado pelos testes unitários
// (montagem do SQL/binds) e aqui validamos o caminho real dos binds null
// (`a_tags`/`a_random_test_order`) via `executeRunOracle`.

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

/** Divide o script SQL*Plus em blocos terminados por `/`, preservando comentários. */
function compileScript(text: string): string[] {
  const out: string[] = [];
  let buf = '';
  for (const raw of text.split(/\r?\n/)) {
    const t = raw.trim();
    if (t === '/') {
      if (buf.trim()) out.push(buf);
      buf = '';
      continue;
    }
    if (/^(set|show|prompt|spool|whenever|@|exit|rem)\b/i.test(t)) continue;
    buf += (buf ? '\n' : '') + raw;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function extractObj(script: string, from: string, to: string): string {
  const i = script.indexOf(from);
  const j = script.indexOf(to, i);
  return script.slice(i, j >= 0 ? j : script.length);
}

describeDB('v0.13.0 — features contra o banco real', () => {
  installOutFormatIsolation();
  const { user, password, connectString } = connParts();
  const owner = user.toUpperCase();
  const connStr = process.env.UTPLSQL_CONN as string;

  before(async () => {
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
  });

  async function loadOracle(): Promise<typeof import('oracledb')> {
    const mod = await import('oracledb');
    return (
      ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
      (mod as typeof import('oracledb'))
    );
  }

  async function withConn<T>(fn: (c: import('oracledb').Connection) => Promise<T>): Promise<T> {
    const oracledb = await loadOracle();
    const c = await oracledb.getConnection({ user, password, connectString });
    try {
      return await fn(c);
    } finally {
      await c.close().catch(() => {});
    }
  }

  async function utVersion(c: import('oracledb').Connection): Promise<string> {
    const r = await c.execute('SELECT ut_runner.version() FROM dual');
    return String(firstCol(r.rows?.[0])).replace(/^v/, '');
  }

  function versionAtLeast(v: string, min: string): boolean {
    const a = v.split('.').map((n) => Number.parseInt(n, 10) || 0);
    const b = min.split('.').map((n) => Number.parseInt(n, 10) || 0);
    for (let i = 0; i < 3; i++) {
      if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
    }
    return true;
  }

  async function rebuild(): Promise<void> {
    const { rebuildAnnotationCache } = require('../../oracleRunner.js');
    const { readConfig } = require('../../config.js');
    await rebuildAnnotationCache(await loadOracle(), connStr, readConfig());
  }

  // ── PRD-74: descoberta via get_suites_info ───────────────────────────

  it('getSuitesInfo retorna suites/testes do schema (após rebuild do cache)', async function () {
    this.timeout(120_000);
    const { getSuitesInfo } = require('../../discovery.js');
    await rebuild();
    await withConn(async (c) => {
      if (!versionAtLeast(await utVersion(c), '3.1.3')) {
        this.skip();
        return;
      }
      const rows = await getSuitesInfo(c, owner);
      assert.ok(rows.length > 0, 'deveria retornar linhas de get_suites_info');
      const pkgs = new Set(rows.map((r: { packageName: string }) => r.packageName.toUpperCase()));
      assert.ok(pkgs.has('TEST_MATH'), `deveria conter TEST_MATH, veio: ${[...pkgs].join(',')}`);
      assert.ok(
        rows.some(
          (r: { itemType: string; itemName: string }) =>
            r.itemType === 'test' && r.itemName.toUpperCase() === 'ADDS_TWO_NUMBERS',
        ),
        'deveria conter o teste ADDS_TWO_NUMBERS',
      );
    });
  });

  it('discoverDbSuites devolve SuiteFile com URI virtual utplsql-db', async function () {
    this.timeout(120_000);
    const { discoverDbSuites } = require('../../discovery.js');
    await rebuild();
    const folders = vscode.workspace.workspaceFolders as never;
    const suites = await discoverDbSuites(connStr, owner, folders);
    assert.ok(suites.length > 0, 'deveria descobrir suites via banco');
    assert.ok(
      suites.some((s: { packageName: string }) => s.packageName.toUpperCase() === 'TEST_MATH'),
      `deveria conter TEST_MATH, veio: ${suites.map((s: { packageName: string }) => s.packageName).join(',')}`,
    );
    assert.ok(
      suites.every((s: { uri: vscode.Uri }) => s.uri.scheme === 'utplsql-db'),
      'todas as URIs deveriam ser utplsql-db',
    );
  });

  // ── PRD-69/78: binds tipados, a_tags null e ordem aleatória ───────────

  it('executeRunOracle com randomOrder + seed (bind BOOLEAN) e a_tags null', async function () {
    this.timeout(120_000);
    const { executeRunOracle, closeOraclePool } = require('../../oracleRunner.js');
    const outputs: string[] = [];
    const run = {
      appendOutput: (s: string) => outputs.push(s),
      passed: () => {},
      failed: () => {},
      errored: () => {},
      skipped: () => {},
    };
    const state = {
      getMeta: () => undefined,
      setLastResults: () => {},
      setLastFailedItems: () => {},
      getLastFailedItems: () => [],
      setCoverage: () => {},
      getCoverage: () => [],
      clearCoverage: () => {},
      cachedItems: [],
    };
    const token = {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    };
    try {
      await executeRunOracle(
        {
          connection: connStr,
          pathArgs: ['test_math'],
          coverage: false,
          sourcePath: 'install',
          root: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
          run: run as never,
          leafTests: [],
          state: state as never,
          tags: '',
          randomOrder: true,
          randomOrderSeed: 12345,
        },
        token as never,
      );
    } finally {
      await closeOraclePool();
    }
    assert.ok(
      outputs.join('').includes('seed: 12345'),
      `deveria registrar a seed; saída: ${outputs.join('')}`,
    );
    assert.ok(
      outputs.join('').includes('Oracle runner'),
      `o run deveria concluir com o resumo do runner; saída: ${outputs.join('')}`,
    );
  });

  // ── PRD-79: escopo de cobertura via executeRunOracle ──────────────────

  it('executeRunOracle com escopo de cobertura (include + exclude regex) aplica cobertura', async function () {
    this.timeout(180_000);
    const { executeRunOracle, closeOraclePool } = require('../../oracleRunner.js');
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath as string;
    const script = fs.readFileSync(
      path.join(root, 'src', 'test', 'integration', 'fixtures', 'compile_packages.sql'),
      'utf8',
    );
    const cal = extractObj(
      script,
      'create or replace package calculator as',
      'create or replace function greet',
    );
    const tcal = extractObj(
      script,
      'create or replace package test_calculator as',
      'create or replace package test_betwnvarchar',
    );

    await withConn(async (c) => {
      for (const stmt of compileScript(`${cal}\n/\n${tcal}\n/`)) {
        await c.execute(stmt, {}, { autoCommit: true });
      }
      await c.execute(`BEGIN ut_runner.rebuild_annotation_cache(a_object_owner => :o); END;`, {
        o: owner,
      });
    });

    // Workspace temporário com o fonte de produção para o mapeamento de cobertura.
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-v013-cov-'));
    const pkgDir = path.join(tmpRoot, 'install', 'packages');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, 'CALCULATOR.pkb'),
      'create or replace package body calculator as\n' +
        '  function add(a number, b number) return number is begin return a + b; end;\n' +
        '  function subtract(a number, b number) return number is begin return a - b; end;\n' +
        'end calculator;\n',
    );

    const coverages: { uri: { fsPath: string } }[] = [];
    const run = {
      appendOutput: () => {},
      passed: () => {},
      failed: () => {},
      errored: () => {},
      skipped: () => {},
      addCoverage: (fc: { uri: { fsPath: string } }) => coverages.push(fc),
    };
    const state = {
      getMeta: () => undefined,
      setLastResults: () => {},
      setLastFailedItems: () => {},
      getLastFailedItems: () => [],
      setCoverage: () => {},
      getCoverage: () => [],
      clearCoverage: () => {},
      cachedItems: [],
    };
    const token = {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    };

    try {
      await executeRunOracle(
        {
          connection: connStr,
          pathArgs: ['test_calculator'],
          coverage: true,
          sourcePath: 'install',
          root: tmpRoot,
          run: run as never,
          leafTests: [],
          state: state as never,
          folders: [{ uri: vscode.Uri.file(tmpRoot), name: 'tmp', index: 0 }],
          coverageOwner: owner,
          coverageIncludeObjects: [`${owner}.CALCULATOR`],
          coverageExcludeObjects: [`${owner}.NAO_EXISTE_XYZ`],
          coverageIncludeObjectExpr: '^CALC',
          coverageIncludeSchemaExpr: `^${owner}$`,
          coverageExcludeSchemaExpr: '^SYS$',
          coverageExcludeObjectExpr: '^UT_',
        },
        token as never,
      );
    } finally {
      await closeOraclePool();
      fs.rmSync(tmpRoot, { recursive: true, force: true });
      await withConn(async (c) => {
        for (const obj of ['TEST_CALCULATOR', 'CALCULATOR']) {
          await c.execute(`DROP PACKAGE ${owner}.${obj}`, {}, { autoCommit: true }).catch(() => {});
        }
      });
    }

    assert.ok(coverages.length > 0, 'coverage deveria ser aplicada a algum arquivo');
    assert.ok(
      coverages.some((fc) => /calculator/i.test(fc.uri.fsPath)),
      `cobertura deveria mapear calculator, veio: ${coverages.map((c) => c.uri.fsPath).join(', ') || '(nenhum)'}`,
    );
  });

  // ── PRD-77: rebuild do cache de anotações (idempotência) ─────────────

  it('rebuildAnnotationCache é idempotente (executa duas vezes sem lançar)', async function () {
    this.timeout(120_000);
    await rebuild();
    await rebuild();
    assert.ok(true);
  });
});
