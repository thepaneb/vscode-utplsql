import './setup.js';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';

const ROOT = path.resolve(__dirname, '../../..');

const createPr = require(path.join(ROOT, 'scripts', 'create-pr.cjs')) as {
  validateRef: (name: string, value: unknown) => void;
};
const createRelease = require(path.join(ROOT, 'scripts', 'create-release.cjs')) as {
  escapeRegExp: (value: unknown) => string;
  changelogNotes: (version: string, root?: string) => string;
};

test('create-pr: validateRef aceita refs legítimas', () => {
  for (const ref of ['main', 'release/v0.18.0', 'feat/prd-110-defensive-hardening', 'a_b.c-1']) {
    assert.doesNotThrow(() => createPr.validateRef('base', ref), ref);
  }
});

test('create-pr: validateRef rejeita injeção/metacaracteres', () => {
  for (const ref of [
    '',
    'x; rm -rf /',
    'x$(whoami)',
    'x`id`',
    '-x',
    'a..b',
    'a b',
    'a\nb',
    'a&b',
    'a|b',
    undefined,
  ]) {
    assert.throws(() => createPr.validateRef('base', ref), /--base inválido/, String(ref));
  }
});

test('create-pr: CLI falha antes do git com --base inválido', () => {
  const r = spawnSync(
    process.execPath,
    [path.join(ROOT, 'scripts', 'create-pr.cjs'), '--base', 'x;rm', '--closes'],
    { encoding: 'utf8' },
  );
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /--base inválido/);
});

test('create-release: escapeRegExp neutraliza metacaracteres', () => {
  assert.strictEqual(createRelease.escapeRegExp('1.2.3'), '1\\.2\\.3');
  assert.strictEqual(createRelease.escapeRegExp('a+b(c)[d]'), 'a\\+b\\(c\\)\\[d\\]');
  assert.strictEqual(new RegExp(createRelease.escapeRegExp('1.2.3')).test('1x2y3'), false);
});

test('create-release: changelogNotes extrai só a seção exata da versão', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-changelog-'));
  try {
    fs.writeFileSync(
      path.join(dir, 'CHANGELOG.md'),
      [
        '# Changelog',
        '',
        '## 0.18.0',
        '',
        '- item A',
        '',
        '## 0.17.1',
        '',
        '- item B',
        '',
        '## 0x18y0',
        '',
        '- item falso',
        '',
      ].join('\n'),
    );
    const section = createRelease.changelogNotes('0.18.0', dir);
    assert.match(section, /^## 0\.18\.0/);
    assert.match(section, /item A/);
    assert.doesNotMatch(section, /item B|item falso/);
    // Versão com metacaractere não explode e não casa a seção "falsa".
    assert.strictEqual(createRelease.changelogNotes('0.18.*', dir), '');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('run.sh: não usa eval e isola o comando em bash -c', () => {
  const run = fs.readFileSync(path.join(ROOT, 'scripts', 'db-matrix', 'run.sh'), 'utf8');
  assert.doesNotMatch(run, /eval "\$TESTS_CMD"/);
  assert.match(run, /bash -c "\$TESTS_CMD"/);
});
