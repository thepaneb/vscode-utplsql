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
    assert.strictEqual(parts.length, 3, `linha malformada: ${line}`);
    const [label, image, service] = parts;
    assert.ok(label && image && service, `campos vazios: ${line}`);
    assert.ok(!labels.has(label), `label duplicada: ${label}`);
    labels.add(label);
  }
});

test('smoke inclui os testes de DBMS_DEBUG (package + function standalone)', () => {
  const smoke = read('.vscode-test.smoke.mjs');
  assert.match(smoke, /debuggerE2E\.test\.js/);
  assert.match(smoke, /debuggerStandaloneFn\.test\.js/);
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
