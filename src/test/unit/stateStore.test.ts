import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { LruMap } from '../../lru';
import { COVERAGE_STORE_MAX_ENTRIES, CoverageStore } from '../../stateStore/coverageStore';

test('LruMap: evicta o menos recente e promove no get', () => {
  const lru = new LruMap<string, number>(2);
  lru.set('a', 1);
  lru.set('b', 2);
  assert.strictEqual(lru.get('a'), 1); // promove a
  lru.set('c', 3); // deve evictar b
  assert.strictEqual(lru.size, 2);
  assert.strictEqual(lru.get('b'), undefined);
  assert.strictEqual(lru.get('a'), 1);
  assert.strictEqual(lru.get('c'), 3);
});

test('CoverageStore: teto LRU de 500 entradas e get ausente devolve []', () => {
  const store = new CoverageStore();
  assert.deepStrictEqual(store.get('missing'), []);
  for (let i = 0; i < COVERAGE_STORE_MAX_ENTRIES + 2; i++) {
    store.set(`file:///f${i}`, [{ line: i, hits: 1 } as never]);
  }
  assert.strictEqual(store.size, COVERAGE_STORE_MAX_ENTRIES);
  assert.deepStrictEqual(store.get('file:///f0'), []);
  assert.strictEqual(store.get(`file:///f${COVERAGE_STORE_MAX_ENTRIES + 1}`).length, 1);
  store.clear();
  assert.strictEqual(store.size, 0);
});
