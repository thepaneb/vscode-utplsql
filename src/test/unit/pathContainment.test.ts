import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';
import { hasTraversalSegment, isInside, isReallyInside } from '../../pathContainment';

test('isInside: raiz, subpasta e prefixo parecido', () => {
  const root = path.join(path.sep, 'ws', 'project');
  assert.strictEqual(isInside(root, root), true);
  assert.strictEqual(isInside(path.join(root, 'src', 'a.ts'), root), true);
  assert.strictEqual(isInside(path.join(path.sep, 'ws', 'project2', 'a.ts'), root), false);
  assert.strictEqual(isInside(path.join(path.sep, 'other'), root), false);
});

test('isInside: traversal relativo não é confundido com nome', () => {
  const root = path.join(path.sep, 'ws', 'project');
  assert.strictEqual(isInside(path.join(root, '..', 'secret'), root), false);
  assert.strictEqual(isInside(path.join(root, '..foo'), root), true);
});

test('hasTraversalSegment: detecta .. e . em / e \\', () => {
  assert.strictEqual(hasTraversalSegment('db/../x'), true);
  assert.strictEqual(hasTraversalSegment('db\\..\\x'), true);
  assert.strictEqual(hasTraversalSegment('db/./x'), true);
  assert.strictEqual(hasTraversalSegment('db/{schema}'), false);
  assert.strictEqual(hasTraversalSegment('db/..foo'), false);
});

test('isReallyInside: diretório real dentro da raiz', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'contain-'));
  try {
    const inside = path.join(base, 'inside');
    fs.mkdirSync(inside);
    assert.strictEqual(isReallyInside(inside, base), true);
    assert.strictEqual(isReallyInside(path.join(base, 'missing'), base), false);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('isReallyInside: symlink para fora da raiz é rejeitado', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'contain-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'outside-'));
  try {
    const link = path.join(base, 'link');
    fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
    assert.strictEqual(isReallyInside(link, base), false);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});
