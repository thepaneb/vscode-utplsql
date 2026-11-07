import './setup.js';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';

const ROOT = path.resolve(__dirname, '../../..');

const createPr = require(path.join(ROOT, 'scripts', 'create-pr.cjs')) as {
  parseArgs: (argv: string[]) => Record<string, string | true>;
  validateRef: (name: string, value: unknown) => void;
};
const createRelease = require(path.join(ROOT, 'scripts', 'create-release.cjs')) as {
  escapeRegExp: (value: unknown) => string;
  changelogNotes: (version: string, root?: string) => string;
  parseArgs: (argv: string[]) => Record<string, string | true>;
};

function cliEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GITHUB_REPOSITORY: 'thepaneb/vscode-utplsql',
    GITHUB_TOKEN: 'fake-token',
    ...extra,
  };
}

function runCli(
  script: string,
  args: string[],
  env: NodeJS.ProcessEnv = cliEnv(),
  preload?: string,
) {
  return spawnSync(
    process.execPath,
    [...(preload ? ['--require', preload] : []), path.join(ROOT, 'scripts', script), ...args],
    { encoding: 'utf8', env },
  );
}

/**
 * Preload que substitui `node:https` por respostas roteirizadas. Roda no
 * processo filho (Windows node.exe) para cobrir os caminhos de sucesso/erro da
 * API sem rede.
 */
function fakeHttpsPreload(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-fake-https-'));
  const file = path.join(dir, 'preload.cjs');
  fs.writeFileSync(
    file,
    `const https = require('node:https');
const { EventEmitter } = require('node:events');
const responses = JSON.parse(process.env.FAKE_RESPONSES || '[]');
let n = 0;
https.request = (_opts, cb) => {
  const spec = responses[n++] || { status: 200, body: '{}' };
  const req = new EventEmitter();
  req.write = () => {};
  req.end = () => {
    if (spec.error) {
      req.emit('error', new Error(spec.error));
      return;
    }
    const res = new EventEmitter();
    res.statusCode = spec.status || 200;
    cb(res);
    res.emit('data', spec.body || '');
    res.emit('end');
  };
  return req;
};
`,
  );
  return file;
}

function runFakeApi(
  script: string,
  args: string[],
  responses: Array<{ status?: number; body?: string; error?: string }>,
) {
  const preload = fakeHttpsPreload();
  try {
    return runCli(script, args, cliEnv({ FAKE_RESPONSES: JSON.stringify(responses) }), preload);
  } finally {
    fs.rmSync(path.dirname(preload), { recursive: true, force: true });
  }
}

test('create-pr/create-release: parseArgs lê flags e valores', () => {
  assert.deepStrictEqual(createPr.parseArgs(['--draft', '--title', 'x', '--body-file', 'b']), {
    draft: true,
    title: 'x',
    'body-file': 'b',
  });
  assert.deepStrictEqual(
    createRelease.parseArgs(['--dry-run', '--tag', 'v0.20.0', '--prerelease']),
    { 'dry-run': true, tag: 'v0.20.0', prerelease: true },
  );
});

test('create-pr: dry-run cria PR sem tocar a API', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-pr-'));
  const body = path.join(dir, 'body.md');
  try {
    fs.writeFileSync(body, 'corpo');
    const r = runCli('create-pr.cjs', [
      '--title',
      'test: dry',
      '--body-file',
      body,
      '--head',
      'feat/x',
      '--base',
      'main',
      '--dry-run',
    ]);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /\[dry-run\] GET \/pulls\?state=open/);
    assert.match(r.stdout, /\[dry-run\] POST \/pulls/);
    assert.match(r.stdout, /"title":"test: dry"/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('create-pr: dry-run atualiza PR existente', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-pr-'));
  const body = path.join(dir, 'body.md');
  try {
    fs.writeFileSync(body, 'corpo');
    const r = runCli('create-pr.cjs', [
      '--update',
      '123',
      '--title',
      'test: update',
      '--body-file',
      body,
      '--dry-run',
    ]);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /\[dry-run\] PATCH \/pulls\/123/);
    assert.match(r.stdout, /"body":"corpo"/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('create-pr: falha sem body-file, sem título e com head==base', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-pr-'));
  const body = path.join(dir, 'body.md');
  try {
    fs.writeFileSync(body, 'corpo');
    const noBody = runCli('create-pr.cjs', ['--title', 'x', '--head', 'feat/x', '--dry-run']);
    assert.strictEqual(noBody.status, 1);
    assert.match(noBody.stderr, /--body-file/);

    const noTitle = runCli('create-pr.cjs', ['--body-file', body, '--head', 'feat/x', '--dry-run']);
    assert.strictEqual(noTitle.status, 1);
    assert.match(noTitle.stderr, /--title/);

    const same = runCli('create-pr.cjs', [
      '--title',
      'x',
      '--body-file',
      body,
      '--head',
      'main',
      '--base',
      'main',
      '--dry-run',
    ]);
    assert.strictEqual(same.status, 1);
    assert.match(same.stderr, /head e base são iguais/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('create-release: dry-run cria release com notas inline', () => {
  const r = runCli('create-release.cjs', [
    '--tag',
    'v0.20.0',
    '--notes',
    'notas da release',
    '--dry-run',
  ]);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /\[dry-run\] POST \/releases/);
  assert.match(r.stdout, /"tag_name":"v0.20.0"/);
  assert.match(r.stdout, /"body":"notas da release"/);
});

test('create-release: dry-run aceita notes-file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-rel-'));
  const notes = path.join(dir, 'notes.md');
  try {
    fs.writeFileSync(notes, 'notas do arquivo');
    const r = runCli('create-release.cjs', [
      '--tag',
      'v0.20.0',
      '--notes-file',
      notes,
      '--draft',
      '--prerelease',
      '--dry-run',
    ]);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /"body":"notas do arquivo"/);
    assert.match(r.stdout, /"draft":true/);
    assert.match(r.stdout, /"prerelease":true/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('create-release: valida tag, versão e notes-file ausente', () => {
  const badTag = runCli('create-release.cjs', ['--tag', '0.20.0', '--dry-run']);
  assert.strictEqual(badTag.status, 1);
  assert.match(badTag.stderr, /--tag vX\.Y\.Z/);

  const mismatch = runCli('create-release.cjs', ['--tag', 'v9.9.9', '--notes', 'x', '--dry-run']);
  assert.strictEqual(mismatch.status, 1);
  assert.match(mismatch.stderr, /≠ package\.json/);

  const missing = runCli('create-release.cjs', [
    '--tag',
    'v0.20.0',
    '--notes-file',
    path.join(os.tmpdir(), 'utplsql-not-exists.md'),
    '--dry-run',
  ]);
  assert.strictEqual(missing.status, 1);
  assert.match(missing.stderr, /--notes-file não existe/);
});

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

test('create-pr: caminho real cria PR e atualiza existente (API fake)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-pr-'));
  const body = path.join(dir, 'body.md');
  try {
    fs.writeFileSync(body, 'corpo');
    const created = runFakeApi(
      'create-pr.cjs',
      ['--title', 'test: real', '--body-file', body, '--head', 'feat/x'],
      [
        { status: 200, body: '[]' },
        { status: 201, body: '{"html_url":"https://example/pr/1"}' },
      ],
    );
    assert.strictEqual(created.status, 0, created.stderr);
    assert.match(created.stdout, /PR criado: https:\/\/example\/pr\/1/);

    const existing = runFakeApi(
      'create-pr.cjs',
      ['--title', 'test: update', '--body-file', body, '--head', 'feat/x'],
      [
        { status: 200, body: '[{"number":7}]' },
        { status: 200, body: '{"html_url":"https://example/pr/7"}' },
      ],
    );
    assert.strictEqual(existing.status, 0, existing.stderr);
    assert.match(existing.stdout, /PR #7 atualizado: https:\/\/example\/pr\/7/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('create-pr: erro HTTP e erro de rede viram exit 1', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-pr-'));
  const body = path.join(dir, 'body.md');
  try {
    fs.writeFileSync(body, 'corpo');
    const http = runFakeApi(
      'create-pr.cjs',
      ['--title', 'x', '--body-file', body, '--head', 'feat/x'],
      [{ status: 500, body: 'boom' }],
    );
    assert.strictEqual(http.status, 1);
    assert.match(http.stderr, /HTTP 500: boom/);

    const network = runFakeApi(
      'create-pr.cjs',
      ['--title', 'x', '--body-file', body, '--head', 'feat/x'],
      [{ error: 'network down' }],
    );
    assert.strictEqual(network.status, 1);
    assert.match(network.stderr, /network down/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('create-pr: sem GITHUB_REPOSITORY deduz do git remote e sem --head usa a branch atual', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-pr-'));
  const body = path.join(dir, 'body.md');
  try {
    fs.writeFileSync(body, 'corpo');
    const r = runCli(
      'create-pr.cjs',
      ['--title', 'x', '--body-file', body, '--dry-run'],
      cliEnv({ GITHUB_REPOSITORY: '' }),
    );
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /\[dry-run\] POST \/pulls/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('create-release: caminho real cria release e detecta existente (API fake)', () => {
  const created = runFakeApi(
    'create-release.cjs',
    ['--tag', 'v0.20.0', '--notes', 'notas', '--target', 'main'],
    [
      { status: 404, body: '{"message":"Not Found"}' },
      { status: 201, body: '{"html_url":"https://example/releases/1"}' },
    ],
  );
  assert.strictEqual(created.status, 0, created.stderr);
  assert.match(created.stdout, /Release v0\.20\.0 criada: https:\/\/example\/releases\/1/);
  assert.match(created.stdout, /publish\.yml/);

  const existing = runFakeApi(
    'create-release.cjs',
    ['--tag', 'v0.20.0', '--notes', 'notas'],
    [{ status: 200, body: '{"html_url":"https://example/releases/old"}' }],
  );
  assert.strictEqual(existing.status, 1);
  assert.match(existing.stderr, /Release v0\.20\.0 já existe/);

  const failed = runFakeApi(
    'create-release.cjs',
    ['--tag', 'v0.20.0', '--notes', 'notas'],
    [
      { status: 404, body: '{}' },
      { status: 500, body: 'boom' },
    ],
  );
  assert.strictEqual(failed.status, 1);
  assert.match(failed.stderr, /HTTP 500: boom/);
});

test('create-release: usa a seção do CHANGELOG quando não há notas', () => {
  const r = runCli('create-release.cjs', ['--tag', 'v0.20.0', '--dry-run']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /"body":"## 0\.20\.0/);
});

test('run.sh: não usa eval e isola o comando em bash -c', () => {
  const run = fs.readFileSync(path.join(ROOT, 'scripts', 'db-matrix', 'run.sh'), 'utf8');
  assert.doesNotMatch(run, /eval "\$TESTS_CMD"/);
  assert.match(run, /bash -c "\$TESTS_CMD"/);
});
