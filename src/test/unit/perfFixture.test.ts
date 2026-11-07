import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import {
  dropPerfSql,
  expectedTestCount,
  generatePerfSql,
  parsePerfArgs,
  perfPackageName,
} from '../perf/perfFixture';

test('perfPackageName: prefixo e zero-padding determinísticos', () => {
  assert.strictEqual(perfPackageName(1), 'UT_PERF_0001');
  assert.strictEqual(perfPackageName(42, 'UT_X_'), 'UT_X_0042');
});

test('expectedTestCount: packages × tests', () => {
  assert.strictEqual(expectedTestCount({ packages: 10, testsPerPackage: 15 }), 150);
  assert.throws(() => expectedTestCount({ packages: 0, testsPerPackage: 1 }), /packages/);
  assert.throws(() => expectedTestCount({ packages: 1, testsPerPackage: 0 }), /testsPerPackage/);
});

test('generatePerfSql: contém suite, suite path e o modo de falha', () => {
  const tree = generatePerfSql({ packages: 2, testsPerPackage: 3, mode: 'tree', seed: 7 });
  assert.match(tree, /%suite/);
  assert.match(tree, /%suitepath\(PERF\)/);
  assert.match(tree, /IF \(false\)/);
  assert.match(tree, /1\.\.2/);
  assert.match(tree, /1\.\.3/);

  const full = generatePerfSql({ packages: 1, testsPerPackage: 1, mode: 'full' });
  assert.match(full, /IF \(true\)/);

  const mixed = generatePerfSql({ packages: 1, testsPerPackage: 1, mode: 'mixed', seed: 9 });
  assert.match(mixed, /mod\(i \* 31 \+ j \* 17 \+ 9, 10\) = 0/);
});

test('generatePerfSql/dropPerfSql: validam prefixo e são idempotentes no texto', () => {
  assert.throws(() => generatePerfSql({ packages: 1, testsPerPackage: 1, prefix: 'x; drop' }));
  const drop = dropPerfSql('UT_PERF_');
  assert.match(drop, /LIKE 'UT_PERF_%'/);
  assert.match(drop, /DROP PACKAGE/);
});

test('parsePerfArgs: defaults e flags', () => {
  assert.deepStrictEqual(parsePerfArgs([]), {
    command: 'generate',
    options: {
      packages: 1000,
      testsPerPackage: 15,
      seed: 1,
      prefix: 'UT_PERF_',
      mode: 'mixed',
    },
  });
  const parsed = parsePerfArgs([
    'generate',
    '--packages',
    '200',
    '--tests',
    '10',
    '--seed',
    '7',
    '--mode',
    'tree',
  ]);
  assert.strictEqual(parsed.options.packages, 200);
  assert.strictEqual(parsed.options.testsPerPackage, 10);
  assert.strictEqual(parsed.options.seed, 7);
  assert.strictEqual(parsed.options.mode, 'tree');
  assert.throws(() => parsePerfArgs(['nope']), /comando inválido/);
  assert.throws(() => parsePerfArgs(['generate', '--mode', 'x']), /mode inválido/);
});
