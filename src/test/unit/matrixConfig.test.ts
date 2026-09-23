import './setup.js';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

const ROOT = path.resolve(__dirname, '../../..');

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('matrix.env: cada versão tem label|imagem|service e label única', () => {
  const block = read('scripts/db-matrix/matrix.env').match(/VERSIONS="([^"]*)"/s);
  assert.ok(block, 'VERSIONS não encontrado no matrix.env');
  const entries = block[1]
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  assert.ok(entries.length >= 4, `esperado >= 4 versões, achei ${entries.length}`);
  const labels = new Set<string>();
  for (const line of entries) {
    const parts = line.split('|');
    // label|imagem|service|[utplsql_version] — o 4º campo é opcional (piso por versão)
    assert.ok(
      parts.length === 3 || parts.length === 4,
      `linha malformada (esperado 3 ou 4 campos): ${line}`,
    );
    const [label, image, service] = parts;
    assert.ok(label && image && service, `campos vazios: ${line}`);
    assert.ok(!labels.has(label), `label duplicada: ${label}`);
    labels.add(label);
    if (parts[3]) {
      assert.match(parts[3], /^v?\d+\.\d+/, `versão do utPLSQL inválida: ${parts[3]}`);
    }
  }
});

test('matrix.env: 12.2 usa piso alternativo utPLSQL v3.1.x', () => {
  const block = read('scripts/db-matrix/matrix.env').match(/VERSIONS="([^"]*)"/s);
  assert.ok(block);
  const line122 = block[1].split('\n').find((l) => l.trim().startsWith('12.2|'));
  assert.ok(line122, 'entrada 12.2 ausente no matrix.env');
  const parts = line122.trim().split('|');
  assert.strictEqual(parts.length, 4, '12.2 deve declarar a versão do utPLSQL (4º campo)');
  assert.match(parts[3], /^v?3\.1\./, `12.2 deveria usar utPLSQL 3.1.x, veio: ${parts[3]}`);
  // O serviço do 12.2 tem DB_DOMAIN (orclpdb1.localdomain), não orclpdb1.
  assert.match(parts[2], /\.localdomain$/);
  // As demais versões são 18c+ e podem ficar sem o 4º campo (usam UTPLSQL_VERSION).
  const withoutVersion = block[1]
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('12.2|') && l.split('|').length === 3);
  assert.ok(withoutVersion.length >= 4, 'demais versões devem usar o default UTPLSQL_VERSION');
});

test('smoke inclui os testes de DBMS_DEBUG (package + function standalone)', () => {
  const smoke = read('.vscode-test.smoke.mjs');
  assert.match(smoke, /debuggerE2E\.test\.js/);
  assert.match(smoke, /debuggerStandaloneFn\.test\.js/);
});

test('smoke cobre as capacidades das PRDs 0.13 (get_suites_info/rebuild)', () => {
  const smoke = read('.vscode-test.smoke.mjs');
  assert.match(smoke, /oracleCapabilities\.test\.js/);
  const caps = read('src/test/integration/oracleCapabilities.test.ts');
  assert.match(caps, /get_suites_info/);
  assert.match(caps, /rebuildAnnotationCache/);
  assert.match(caps, /UTPLSQL_SUITES_INFO_MIN_VERSION/);
});

test('integração 0.13 existe e é coberta pelo glob base do vscode-test', () => {
  assert.ok(
    fs.existsSync(path.join(ROOT, 'src/test/integration/v013-features.test.ts')),
    'v013-features.test.ts deveria existir',
  );
  const base = read('.vscode-test.mjs');
  assert.match(base, /out\/test\/integration\/\*\*\/\*\.test\.js/);
});

test('bootstrap da matriz concede os grants de debugger ao schema de teste', () => {
  const bootstrap = read('scripts/db-matrix/bootstrap.sh');
  assert.match(bootstrap, /grant debug connect session to ut3/i);
  assert.match(bootstrap, /grant execute on sys\.dbms_debug to ut3/i);
  assert.match(bootstrap, /grant execute on sys\.dbms_debug to utplsql_test/i);
  assert.match(bootstrap, /grant debug connect session to utplsql_test/i);
});

test('scripts da matriz: sintaxe bash válida', (t) => {
  if (process.platform === 'win32') {
    t.skip('bash indisponível a partir do node Windows');
    return;
  }
  for (const s of ['run.sh', 'bootstrap.sh', 'wait-ready.sh']) {
    const r = spawnSync('bash', ['-n', path.join(ROOT, 'scripts', 'db-matrix', s)], {
      encoding: 'utf8',
    });
    assert.strictEqual(r.status, 0, `${s}: ${r.stderr}`);
  }
});

// ── parse-version.cjs (piso alternativo de utPLSQL por banco) ─────────

const { parseVersionLine } = require(
  path.join(ROOT, 'scripts', 'db-matrix', 'parse-version.cjs'),
) as { parseVersionLine: (line: string, def?: string) => Record<string, unknown> };

test('parse-version: linha com 4 campos usa a versão explícita', () => {
  const r = parseVersionLine(
    '12.2|container-registry.oracle.com/database/enterprise:12.2.0.1-slim|orclpdb1.localdomain|v3.1.14',
    'v.3.2.3',
  );
  assert.strictEqual(r.label, '12.2');
  assert.strictEqual(r.service, 'orclpdb1.localdomain');
  assert.strictEqual(r.utplsqlVersion, 'v3.1.14');
  assert.strictEqual(r.hasExplicitVersion, true);
});

test('parse-version: linha com 3 campos cai no default', () => {
  const r = parseVersionLine('23free|image|FREEPDB1', 'v.3.2.3');
  assert.strictEqual(r.utplsqlVersion, 'v.3.2.3');
  assert.strictEqual(r.hasExplicitVersion, false);
});

test('parse-version: 4º campo vazio cai no default', () => {
  const r = parseVersionLine('18xe|image|XEPDB1|', 'v.3.2.3');
  assert.strictEqual(r.utplsqlVersion, 'v.3.2.3');
  assert.strictEqual(r.hasExplicitVersion, false);
});

test('parse-version: tolera espaços e linha vazia', () => {
  assert.strictEqual(parseVersionLine('  a | b | c | v3.1.1 ', '').utplsqlVersion, 'v3.1.1');
  const empty = parseVersionLine('', 'v.3.2.3');
  assert.strictEqual(empty.label, '');
  assert.strictEqual(empty.utplsqlVersion, 'v.3.2.3');
});

test('parse-version: run.sh usa parse-version.cjs para a versão por banco', () => {
  const run = read('scripts/db-matrix/run.sh');
  assert.match(run, /parse-version\.cjs/);
});
