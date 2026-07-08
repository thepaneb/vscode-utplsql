import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';
import { resolveSourceUri } from '../../coverage';

function withTempDir(fn: (dir: string) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-test-'));
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('resolveSourceUri: caminho absoluto existente', () => {
  withTempDir((dir) => {
    const filePath = path.join(dir, 'exemplo.sql');
    fs.writeFileSync(filePath, '');
    const uri = resolveSourceUri(filePath, dir, 'install');
    assert.ok(uri);
    assert.strictEqual(uri.fsPath, filePath);
  });
});

test('resolveSourceUri: relativo ao workspace', () => {
  withTempDir((dir) => {
    const filePath = path.join(dir, 'funcao.sql');
    fs.writeFileSync(filePath, '');
    const uri = resolveSourceUri('funcao.sql', dir, 'install');
    assert.ok(uri);
    assert.strictEqual(uri.fsPath, filePath);
  });
});

test('resolveSourceUri: relativo ao sourcePath', () => {
  withTempDir((dir) => {
    const sub = path.join(dir, 'install');
    fs.mkdirSync(sub);
    const filePath = path.join(sub, 'funcao.sql');
    fs.writeFileSync(filePath, '');
    const uri = resolveSourceUri('funcao.sql', dir, 'install');
    assert.ok(uri);
    assert.strictEqual(uri.fsPath, filePath);
  });
});

test('resolveSourceUri: basename no sourcePath', () => {
  withTempDir((dir) => {
    const sub = path.join(dir, 'install');
    fs.mkdirSync(sub);
    const filePath = path.join(sub, 'funcao.sql');
    fs.writeFileSync(filePath, '');
    const uri = resolveSourceUri('packages/funcao.sql', dir, 'install');
    assert.ok(uri);
    assert.strictEqual(uri.fsPath, filePath);
  });
});

test('resolveSourceUri: arquivo inexistente retorna undefined', () => {
  withTempDir((dir) => {
    const uri = resolveSourceUri('nao_existe.sql', dir, 'install');
    assert.strictEqual(uri, undefined);
  });
});
