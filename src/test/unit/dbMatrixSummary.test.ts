import './setup.js';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';

// Testa o parser/render do resumo da matriz (scripts/db-matrix/summary.cjs).
const ROOT = path.resolve(__dirname, '../../..');
const SUMMARY = path.join(ROOT, 'scripts', 'db-matrix', 'summary.cjs');
const { parseTestCounts, entry, renderSummary } = require(SUMMARY) as {
  parseTestCounts: (output: string) => {
    tests: number | null;
    pass: number | null;
    fail: number | null;
    skipped: number | null;
    framework: string | null;
  };
  entry: (data: Record<string, unknown>) => Record<string, unknown>;
  renderSummary: (entries: Record<string, unknown>[]) => string;
};

test('db-matrix summary: parser do node --test', () => {
  const parsed = parseTestCounts(`
ℹ tests 1346
ℹ pass 1344
ℹ fail 0
ℹ skipped 2
`);
  assert.deepStrictEqual(parsed, {
    tests: 1346,
    pass: 1344,
    fail: 0,
    skipped: 2,
    framework: 'node',
  });
});

test('db-matrix summary: parser do Mocha/vscode-test', () => {
  const parsed = parseTestCounts(`
  109 passing (4m)
  11 pending
`);
  assert.deepStrictEqual(parsed, {
    tests: 120,
    pass: 109,
    fail: 0,
    skipped: 11,
    framework: 'mocha',
  });
});

test('db-matrix summary: soma múltiplos blocos Mocha (--full: integração + multi-root)', () => {
  const parsed = parseTestCounts(`
  109 passing (4m)
  11 pending
  6 passing (6s)
`);
  assert.strictEqual(parsed.tests, 126);
  assert.strictEqual(parsed.pass, 115);
  assert.strictEqual(parsed.fail, 0);
  assert.strictEqual(parsed.skipped, 11);
});

test('db-matrix summary: parser de falha Mocha', () => {
  const parsed = parseTestCounts('1 passing\n2 failing\n3 pending\n');
  assert.strictEqual(parsed.tests, 6);
  assert.strictEqual(parsed.pass, 1);
  assert.strictEqual(parsed.fail, 2);
  assert.strictEqual(parsed.skipped, 3);
});

test('db-matrix summary: formato desconhecido vira null (não inventa números)', () => {
  const parsed = parseTestCounts('sem contadores aqui');
  assert.strictEqual(parsed.tests, null);
  assert.strictEqual(parsed.pass, null);
  assert.strictEqual(parsed.fail, null);
  assert.strictEqual(parsed.skipped, null);
  assert.strictEqual(parsed.framework, null);
});

test('db-matrix summary: entry não inclui connection string', () => {
  const data = entry({
    label: '23free',
    image: 'database/free:23.26.3.0',
    utplsql: 'v.3.2.3',
    status: 'passed',
    log: '/tmp/23free.log',
    duration: '42',
    output: '109 passing\n11 pending\n',
  });
  const serialized = JSON.stringify(data);
  assert.ok(!serialized.includes('UT3/'));
  assert.ok(!serialized.includes('password'));
  assert.strictEqual(data.tests, 120);
  assert.strictEqual(data.pass, 109);
  assert.strictEqual(data.skipped, 11);
  assert.strictEqual(data.durationSeconds, 42);
});

test('db-matrix summary: render gera tabela Markdown', () => {
  const md = renderSummary([
    {
      label: '23free',
      utplsql: 'v.3.2.3',
      status: 'passed',
      tests: 120,
      pass: 109,
      fail: 0,
      skipped: 11,
      durationSeconds: 42,
      log: '/tmp/23free.log',
    },
  ]);
  assert.match(md, /\| Banco \| utPLSQL \| Status \|/);
  assert.match(md, /\| 23free \| v\.3\.2\.3 \| passed \| 120 \| 109 \| 0 \| 11 \| 42s \|/);
});

test('db-matrix summary: CLI append + render', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-matrix-summary-'));
  const log = path.join(dir, '23free.log');
  const jsonl = path.join(dir, 'summary.jsonl');
  const md = path.join(dir, 'summary.md');
  fs.writeFileSync(log, '109 passing (4m)\n11 pending\n');
  try {
    const append = spawnSync(
      process.execPath,
      [
        SUMMARY,
        'append',
        '--file',
        jsonl,
        '--label',
        '23free',
        '--image',
        'database/free:23.26.3.0',
        '--utplsql',
        'v.3.2.3',
        '--status',
        'passed',
        '--log',
        log,
        '--duration',
        '7',
      ],
      { encoding: 'utf8' },
    );
    assert.strictEqual(append.status, 0, append.stderr);
    assert.ok(fs.existsSync(jsonl));

    const render = spawnSync(process.execPath, [SUMMARY, 'render', '--file', jsonl, '--out', md], {
      encoding: 'utf8',
    });
    assert.strictEqual(render.status, 0, render.stderr);
    const text = fs.readFileSync(md, 'utf8');
    assert.match(text, /\| 23free \|/);
    assert.match(text, /109/);
    assert.match(text, /11/);
    assert.ok(!text.includes('UT3/'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
