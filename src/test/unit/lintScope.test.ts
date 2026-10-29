import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

const ROOT = path.resolve(__dirname, '../../..');
const biome = JSON.parse(fs.readFileSync(path.join(ROOT, 'biome.json'), 'utf8')) as {
  $schema: string;
  files: { includes: string[] };
};
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
  name: string;
  version: string;
  engines: { node: string };
  scripts: Record<string, string>;
  contributes: unknown;
};
const includes = biome.files.includes;

test('biome: o escopo inclui a raiz e exclui gerados/vendorizados', () => {
  assert.ok(includes.includes('**'), 'o escopo deve partir da raiz');
  for (const excluded of [
    'docs',
    'site',
    '.agents',
    '.kilo',
    '.opencode',
    'node_modules',
    'out',
    'dist',
    'coverage',
    '.vscode-test',
    'package-lock.json',
    'skills-lock.json',
  ]) {
    assert.ok(
      includes.some((p) => p.startsWith('!') && p.includes(excluded)),
      `falta excluir ${excluded}`,
    );
  }
  // Manifestos e scripts continuam no gate (não foram excluídos).
  assert.ok(!includes.some((p) => p.startsWith('!') && p.includes('scripts')));
  assert.ok(!includes.some((p) => p.startsWith('!') && /package\.json/.test(p)));
  assert.ok(!includes.some((p) => p.startsWith('!') && /package\.nls/.test(p)));
});

test('scripts npm: lint/lint:fix/format cobrem a raiz', () => {
  assert.strictEqual(pkg.scripts.lint, 'biome check .');
  assert.strictEqual(pkg.scripts['lint:fix'], 'biome check --write .');
  assert.strictEqual(pkg.scripts.format, 'biome format --write .');
});

test('biome: schema acompanha a versão instalada do CLI', () => {
  const biomePkg = require('@biomejs/biome/package.json') as { version: string };
  assert.ok(
    biome.$schema.includes(`/${biomePkg.version}/`),
    `schema ${biome.$schema} não acompanha a versão ${biomePkg.version}`,
  );
});

test('package.json: segue íntegro após a normalização', () => {
  assert.ok(pkg.name.length > 0);
  assert.match(pkg.version, /^\d+\.\d+\.\d+/);
  assert.match(pkg.engines.node, />=22/);
  assert.ok(pkg.contributes, 'contributes preservado');
  assert.match(pkg.scripts.compile ?? '', /tsc/);
  assert.match(pkg.scripts['test:coverage'] ?? '', /c8/);
});
