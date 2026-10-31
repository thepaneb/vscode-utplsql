import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

const root = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

test('esbuild: bundle publicado é ESM (.mjs) com target node24', () => {
  const config = read('esbuild.config.mjs');
  assert.match(config, /outfile:\s*'dist\/extension\.mjs'/, 'outfile precisa ser .mjs');
  assert.match(config, /format:\s*'esm'/, 'format precisa ser esm');
  assert.match(config, /target:\s*'node24'/, 'target precisa ser node24');
  assert.match(config, /external:\s*\[[^\]]*'vscode'[^\]]*'oracledb'[^\]]*\]/);
  assert.match(config, /rmSync\('dist'/, 'bundle precisa limpar o dist antes');
});

test('package.json: main aponta para o bundle ESM', () => {
  const pkg = JSON.parse(read('package.json')) as { main?: string };
  assert.strictEqual(pkg.main, './dist/extension.mjs');
});

test('tsconfig: testes compilam em ES2024 e continuam CJS (node16)', () => {
  const tsconfig = JSON.parse(read('tsconfig.json')) as {
    compilerOptions?: { target?: string; lib?: string[]; module?: string };
  };
  assert.strictEqual(tsconfig.compilerOptions?.target, 'ES2024');
  assert.deepStrictEqual(tsconfig.compilerOptions?.lib, ['ES2024']);
  assert.strictEqual(tsconfig.compilerOptions?.module, 'node16');
});
