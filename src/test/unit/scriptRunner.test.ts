import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import type * as vscode from 'vscode';
import { t } from '../../i18n';
import {
  adaptOracleConn,
  connectOracle,
  createScriptDb,
  decodeScript,
  executeScript,
  filterScriptFiles,
  type OracleConn,
  type OracledbModule,
  type ScriptConn,
  type ScriptDb,
  type SqlStatement,
  splitScript,
  summarizeStatement,
} from '../../scriptRunner';

const pt = (key: string, params?: Record<string, string | number>): string =>
  t('pt-br', key, params);

function stmt(text: string, index: number): SqlStatement {
  return { text, index, line: 1 };
}

function collector() {
  const lines: string[] = [];
  return { lines, output: { appendLine: (value: string): void => void lines.push(value) } };
}

function fakeToken(cancelled: boolean): vscode.CancellationToken {
  return {
    onCancellationRequested: (cb: () => void): { dispose(): void } => {
      if (cancelled) cb();
      return { dispose: (): void => {} };
    },
  } as unknown as vscode.CancellationToken;
}

// ─── decodeScript ────────────────────────────────────────────────────────────

test('decodeScript: utf8 preserva acentos', () => {
  const bytes = Buffer.from('ção €', 'utf-8');
  assert.strictEqual(decodeScript(bytes, 'utf8'), 'ção €');
});

test('decodeScript: latin1 decodifica bytes altos', () => {
  const bytes = Uint8Array.from([0x63, 0xe7, 0xe3, 0xf5]);
  assert.strictEqual(decodeScript(bytes, 'latin1'), 'cçãõ');
});

test('decodeScript: win1252 cobre 0x80-0x9F (latin1 diverge)', () => {
  const euro = Uint8Array.from([0x80]);
  assert.strictEqual(decodeScript(euro, 'win1252'), '€');
  assert.notStrictEqual(decodeScript(euro, 'latin1'), '€');
  const quotes = Uint8Array.from([0x93, 0x94]);
  assert.strictEqual(decodeScript(quotes, 'win1252'), '“”');
});

test('decodeScript: ausente ou inválido cai para utf8', () => {
  const bytes = Buffer.from('ção', 'utf-8');
  assert.strictEqual(decodeScript(bytes), 'ção');
  assert.strictEqual(decodeScript(bytes, undefined), 'ção');
  assert.strictEqual(decodeScript(bytes, 'bogus' as unknown as 'utf8'), 'ção');
});

test('decodeScript: remove BOM e aceita vazio', () => {
  assert.strictEqual(decodeScript(Uint8Array.from([0xef, 0xbb, 0xbf, 0x61]), 'utf8'), 'a');
  assert.strictEqual(decodeScript(new Uint8Array(0), 'win1252'), '');
});

// ─── splitScript ─────────────────────────────────────────────────────────────

test('splitScript: vazio e só-comentário retornam []', () => {
  assert.deepStrictEqual(splitScript(''), []);
  assert.deepStrictEqual(splitScript('   \n  '), []);
  assert.deepStrictEqual(splitScript('-- só comentário\n/* bloco */'), []);
});

test('splitScript: SQL simples termina em ponto-e-vírgula', () => {
  const stmts = splitScript('SELECT 1;\nSELECT 2;');
  assert.strictEqual(stmts.length, 2);
  assert.strictEqual(stmts[0].text, 'SELECT 1;');
  assert.strictEqual(stmts[1].text, 'SELECT 2;');
  assert.strictEqual(stmts[0].index, 0);
  assert.strictEqual(stmts[1].index, 1);
  assert.strictEqual(stmts[0].line, 1);
  assert.strictEqual(stmts[1].line, 2);
});

test('splitScript: bloco PL/SQL ignora ponto-e-vírgula interno e termina em /', () => {
  const stmts = splitScript('CREATE OR REPLACE PROCEDURE p IS\nBEGIN\n  NULL;\nEND;\n/\nSELECT 1;');
  assert.strictEqual(stmts.length, 2);
  assert.ok(stmts[0].text.includes('NULL;'));
  assert.ok(!stmts[0].text.split('\n').some((l) => l.trim() === '/'));
  assert.strictEqual(stmts[1].text, 'SELECT 1;');
});

test('splitScript: BEGIN/DECLARE terminam em /', () => {
  assert.strictEqual(splitScript('BEGIN\n  do_x;\nEND;\n/').length, 1);
  assert.strictEqual(splitScript('DECLARE\n  x NUMBER;\nBEGIN\n  NULL;\nEND;\n/').length, 1);
});

test('splitScript: trigger e package terminam em /', () => {
  const trigger = 'CREATE OR REPLACE TRIGGER trg\nBEFORE INSERT ON t\nBEGIN\n  NULL;\nEND;\n/';
  assert.strictEqual(splitScript(trigger).length, 1);
  const spec = 'CREATE OR REPLACE PACKAGE pkg IS\n  PROCEDURE p;\nEND pkg;\n/';
  const body =
    'CREATE OR REPLACE PACKAGE BODY pkg IS\n  PROCEDURE p IS BEGIN NULL; END;\nEND pkg;\n/';
  assert.strictEqual(splitScript(`${spec}\n${body}`).length, 2);
});

test('splitScript: literais e comentários não quebram o split', () => {
  assert.strictEqual(splitScript(`INSERT INTO t VALUES ('a;b');`).length, 1);
  assert.strictEqual(splitScript('SELECT "a;b" FROM t;').length, 1);
  assert.strictEqual(splitScript('SELECT 1; -- foo;bar\nSELECT 2;').length, 2);
  assert.strictEqual(splitScript('/* a;b */\nSELECT 1;').length, 1);
});

test('splitScript: linha / dentro de string não termina o bloco', () => {
  const stmts = splitScript("INSERT INTO t VALUES ('x\n/\ny');");
  assert.strictEqual(stmts.length, 1);
});

test('splitScript: casos de borda (sem terminador, / separador, linhas)', () => {
  assert.deepStrictEqual(
    splitScript('SELECT 1').map((s) => s.text),
    ['SELECT 1'],
  );
  assert.strictEqual(splitScript('BEGIN\n  NULL;').length, 1);
  assert.strictEqual(splitScript('SELECT 1\n/\nSELECT 2;').length, 2);
  assert.strictEqual(splitScript('SELECT 1;\n/').length, 1);
  const stmts = splitScript('\n\nSELECT 1;');
  assert.strictEqual(stmts[0].line, 3);
});

test('splitScript: barra solta inicial é separador, não statement', () => {
  assert.deepStrictEqual(
    splitScript('/\nSELECT 1;').map((s) => s.text),
    ['SELECT 1;'],
  );
});

test('splitScript: quebra de linha em bloco comentado não quebra o split', () => {
  const stmts = splitScript('/* linha1\nlinha2 */\nSELECT 1;');
  assert.strictEqual(stmts.length, 1);
  assert.ok(stmts[0].text.includes('linha2'));
});

test('splitScript: aspas escapadas dentro de string não quebram o split', () => {
  const stmts = splitScript(`SELECT 'a''b' FROM t;`);
  assert.strictEqual(stmts.length, 1);
  assert.ok(stmts[0].text.includes(`'a''b'`));
});

test('summarizeStatement: primeira linha truncada', () => {
  assert.strictEqual(summarizeStatement('SELECT 1\nFROM t'), 'SELECT 1');
  assert.strictEqual(summarizeStatement(`SELECT ${'x'.repeat(100)}`).length, 80);
});

// ─── filterScriptFiles ───────────────────────────────────────────────────────

test('filterScriptFiles: filtra por extensão e ordena (case-insensitive)', () => {
  const files = filterScriptFiles(
    ['b.pkb', 'a.sql', 'c.txt', 'D.PKS', 'sub/e.fnc'],
    '**/*.{sql,pks,pkb,fnc,prc,trg}',
  );
  assert.deepStrictEqual(files, ['a.sql', 'b.pkb', 'D.PKS', 'sub/e.fnc']);
});

test('filterScriptFiles: padrão sem chaves usa a extensão única', () => {
  assert.deepStrictEqual(filterScriptFiles(['a.sql', 'b.pks'], '**/*.sql'), ['a.sql']);
});

// ─── executeScript ───────────────────────────────────────────────────────────

function fakeDb(
  opts: { failOn?: number; failMessage?: string; rowsAffected?: number; dbmsLines?: string[] } = {},
): ScriptDb & { calls: string[]; broken: boolean; dbmsEnabled: boolean } {
  const db = {
    calls: [] as string[],
    broken: false,
    dbmsEnabled: false,
    async execute(sql: string, _execOpts: { autoCommit: boolean }) {
      db.calls.push(sql);
      if (opts.failOn !== undefined && db.calls.length === opts.failOn) {
        throw new Error(opts.failMessage ?? 'ORA-00942: table or view does not exist');
      }
      return { rowsAffected: opts.rowsAffected };
    },
    async enableDbmsOutput() {
      db.dbmsEnabled = true;
    },
    async drainDbmsOutput() {
      return opts.dbmsLines ?? [];
    },
    async break() {
      db.broken = true;
    },
    async close() {},
  };
  return db;
}

test('executeScript: saída por statement com header, ok e rowsAffected', async () => {
  const db = fakeDb({ rowsAffected: 3 });
  const { lines, output } = collector();
  const result = await executeScript(() => Promise.resolve(db), {
    connection: 'u/p@//h:1521/s',
    statements: [stmt('SELECT 1;', 0), stmt('SELECT 2;', 1)],
    output,
    label: 'seed.sql',
    charset: 'win1252',
  });
  assert.deepStrictEqual(result, { executed: 2, ok: 2, failed: 0, cancelled: false });
  assert.strictEqual(lines[0], pt('script.header', { label: 'seed.sql (win1252)' }));
  assert.match(lines[1], /^\[1\] ok \d+ms — SELECT 1; \(3 linhas afetadas\)$/);
  assert.match(lines[2], /^\[2\] ok \d+ms — SELECT 2; \(3 linhas afetadas\)$/);
  assert.ok(lines[3].startsWith('Concluído'));
});

test('executeScript: stopOnError interrompe na primeira falha', async () => {
  const db = fakeDb({ failOn: 2 });
  const { lines, output } = collector();
  const result = await executeScript(() => Promise.resolve(db), {
    connection: 'u/p@//h:1521/s',
    statements: [stmt('SELECT 1;', 0), stmt('BAD SQL;', 1), stmt('SELECT 3;', 2)],
    output,
  });
  assert.strictEqual(result.failed, 1);
  assert.strictEqual(db.calls.length, 2);
  assert.ok(lines.some((l) => l.includes('erro')));
  assert.ok(lines.some((l) => l.includes('ORA-00942')));
});

test('executeScript: stopOnError false continua após falha', async () => {
  const db = fakeDb({ failOn: 2 });
  const { output } = collector();
  const result = await executeScript(() => Promise.resolve(db), {
    connection: 'u/p@//h:1521/s',
    statements: [stmt('SELECT 1;', 0), stmt('BAD SQL;', 1), stmt('SELECT 3;', 2)],
    output,
    stopOnError: false,
  });
  assert.deepStrictEqual([result.executed, result.ok, result.failed], [3, 2, 1]);
  assert.strictEqual(db.calls.length, 3);
});

test('executeScript: senha nunca é logada', async () => {
  const db = fakeDb({ failOn: 1, failMessage: 'ORA-01017 user/secret@//host:1521/svc' });
  const { lines, output } = collector();
  await executeScript(() => Promise.resolve(db), {
    connection: 'user/secret@//host:1521/svc',
    statements: [stmt('SELECT 1;', 0)],
    output,
  });
  const joined = lines.join('\n');
  assert.ok(!joined.includes('secret'));
  assert.ok(joined.includes('user@//host:1521/svc'));
});

test('executeScript: falha de conexão retorna zerado', async () => {
  const { lines, output } = collector();
  const result = await executeScript(() => Promise.reject(new Error('ECONNREFUSED')), {
    connection: 'u/p@//h:1521/s',
    statements: [stmt('SELECT 1;', 0)],
    output,
  });
  assert.deepStrictEqual(result, { executed: 0, ok: 0, failed: 0, cancelled: false });
  assert.ok(lines.some((l) => l.includes('ECONNREFUSED')));
});

test('executeScript: cancelamento chama break e marca cancelled', async () => {
  const db = fakeDb();
  const { output } = collector();
  const result = await executeScript(() => Promise.resolve(db), {
    connection: 'u/p@//h:1521/s',
    statements: [stmt('SELECT 1;', 0)],
    output,
    token: fakeToken(true),
  });
  assert.strictEqual(result.cancelled, true);
  assert.strictEqual(db.broken, true);
  assert.strictEqual(result.executed, 0);
});

test('executeScript: dbmsOutput drena linhas por statement', async () => {
  const db = fakeDb({ dbmsLines: ['hello'] });
  const { lines, output } = collector();
  await executeScript(() => Promise.resolve(db), {
    connection: 'u/p@//h:1521/s',
    statements: [stmt('SELECT 1;', 0)],
    output,
    dbmsOutput: true,
  });
  assert.strictEqual(db.dbmsEnabled, true);
  assert.ok(lines.includes(pt('script.dbms', { line: 'hello' })));
});

test('executeScript: falha no ENABLE do dbmsOutput não interrompe', async () => {
  const db = fakeDb({ dbmsLines: ['hi'] });
  db.enableDbmsOutput = () => Promise.reject(new Error('ORA-20000'));
  const { output } = collector();
  const result = await executeScript(() => Promise.resolve(db), {
    connection: 'u/p@//h:1521/s',
    statements: [stmt('SELECT 1;', 0)],
    output,
    dbmsOutput: true,
  });
  assert.deepStrictEqual([result.ok, result.failed], [1, 0]);
});

test('executeScript: falha no DRAIN do dbmsOutput não interrompe', async () => {
  const db = fakeDb();
  db.drainDbmsOutput = () => Promise.reject(new Error('ORA-20000'));
  const { output } = collector();
  const result = await executeScript(() => Promise.resolve(db), {
    connection: 'u/p@//h:1521/s',
    statements: [stmt('SELECT 1;', 0)],
    output,
    dbmsOutput: true,
  });
  assert.deepStrictEqual([result.ok, result.failed], [1, 0]);
});

test('connectOracle: string inválida rejeita sem conectar', async () => {
  await assert.rejects(() => connectOracle('formato-invalido'), /Formato de conexão inválido/);
});

function fakeConn(dbmsLines: string[] = []): ScriptConn & { calls: unknown[][]; broken: boolean } {
  const calls: unknown[][] = [];
  let drained = false;
  const conn: ScriptConn & { calls: unknown[][]; broken: boolean } = {
    calls,
    broken: false,
    callTimeout: 0,
    execute: (...args: unknown[]) => {
      calls.push(args);
      if (String(args[0]).includes('GET_LINE')) {
        if (!drained) {
          drained = true;
          return Promise.resolve({ outBinds: { line: dbmsLines[0] ?? 'x', status: 0 } });
        }
        return Promise.resolve({ outBinds: { line: null, status: 1 } });
      }
      return Promise.resolve({ rowsAffected: 2 });
    },
    break: () => {
      conn.broken = true;
      return Promise.resolve();
    },
    close: () => Promise.resolve(),
  };
  return conn;
}

const fakeCodes = { BIND_OUT: 3001, STRING: 'STRING', NUMBER: 'NUMBER' };

test('createScriptDb: aplica callTimeout e executa com autoCommit', async () => {
  const conn = fakeConn();
  const db = createScriptDb(conn, fakeCodes, 60);
  assert.strictEqual(conn.callTimeout, 60000);
  const r = await db.execute('SELECT 1;', { autoCommit: true });
  assert.strictEqual(r.rowsAffected, 2);
  assert.deepStrictEqual(conn.calls[0][2], { autoCommit: true });
});

test('createScriptDb: drena DBMS_OUTPUT até status != 0', async () => {
  const conn = fakeConn(['ola']);
  const db = createScriptDb(conn, fakeCodes, 300);
  await db.enableDbmsOutput?.();
  assert.deepStrictEqual(await db.drainDbmsOutput?.(), ['ola']);
  await db.break?.();
  assert.strictEqual(conn.broken, true);
  await db.close();
});

test('adaptOracleConn: repassa chamadas e callTimeout à conexão real', async () => {
  const raw = {
    calls: [] as unknown[][],
    callTimeout: 0,
    execute: (sql: string) => {
      raw.calls.push([sql]);
      return Promise.resolve({ rowsAffected: 5 });
    },
    break: () => Promise.resolve(),
    close: () => Promise.resolve(),
  };
  const db = adaptOracleConn(
    raw as unknown as OracleConn,
    fakeCodes as unknown as OracledbModule,
    45,
  );
  assert.strictEqual(raw.callTimeout, 45000);
  assert.strictEqual((await db.execute('SELECT 1;', { autoCommit: false })).rowsAffected, 5);
  await db.break?.();
  await db.close();
});
