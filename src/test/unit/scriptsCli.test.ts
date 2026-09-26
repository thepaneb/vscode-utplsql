import './setup.js';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { test } from 'node:test';

const ROOT = path.resolve(__dirname, '../../..');

function runScript(name: string, args: string[], env: NodeJS.ProcessEnv = process.env) {
  return spawnSync(process.execPath, [path.join(ROOT, 'scripts', name), ...args], {
    encoding: 'utf8',
    env,
  });
}

test('package-target.cjs: alvo ausente/ inválido sai com erro', () => {
  const noArg = runScript('package-target.cjs', []);
  assert.strictEqual(noArg.status, 1);
  assert.match(noArg.stderr, /target obrigatório/);

  const bad = runScript('package-target.cjs', ['plan9']);
  assert.strictEqual(bad.status, 1);
  assert.match(bad.stderr, /target obrigatório/);
});

test('publish.cjs: bloqueia publicação fora do CI', () => {
  const env = { ...process.env };
  delete env.CI;
  const r = runScript('publish.cjs', [], env);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /workflow|Publicacao/i);
});

test('db-matrix: run.sh expõe --list sem subir banco', (t) => {
  // No Windows o `bash` do WSL não recebe caminhos `D:\...`; o teste roda no CI.
  if (process.platform === 'win32') {
    t.skip('bash/run.sh não é executável a partir do node Windows');
    return;
  }
  const r = spawnSync('bash', [path.join(ROOT, 'scripts', 'db-matrix', 'run.sh'), '--list'], {
    encoding: 'utf8',
    cwd: ROOT,
  });
  assert.strictEqual(r.status, 0);
  const labels = r.stdout
    .split('\n')
    .map((l) => l.split('|')[0].trim())
    .filter(Boolean);
  assert.ok(labels.includes('18xe'));
  assert.ok(labels.includes('23free'));
});

test('publish.cjs: no CI com --packagePath inexistente falha com aviso', () => {
  const env = { ...process.env, CI: 'true' };
  const r = runScript('publish.cjs', ['--packagePath', 'nao-existe.vsix'], env);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /VSIX não encontrado/);
});
