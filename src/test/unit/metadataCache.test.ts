import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { TtlCache } from '../../metadataCache';

test('TtlCache: hit, miss e expiração', () => {
  let now = 1000;
  const cache = new TtlCache(30_000, () => now);
  assert.strictEqual(cache.get<string>('a'), undefined);
  cache.set('a', 'A');
  assert.strictEqual(cache.get<string>('a'), 'A');
  now += 30_001;
  assert.strictEqual(cache.get<string>('a'), undefined);
  assert.deepStrictEqual(cache.stats(), { hits: 1, misses: 2 });
});

test('TtlCache: clear, delete e TTL por entrada', () => {
  let now = 0;
  const cache = new TtlCache(1000, () => now);
  cache.set('curto', 1, 10);
  cache.set('longo', 2, 5000);
  now = 11;
  assert.strictEqual(cache.get<number>('curto'), undefined);
  assert.strictEqual(cache.get<number>('longo'), 2);
  cache.delete('longo');
  assert.strictEqual(cache.get<number>('longo'), undefined);
  cache.set('x', 1);
  cache.clear();
  assert.strictEqual(cache.size, 0);
  assert.deepStrictEqual(cache.stats(), { hits: 0, misses: 0 });
});
