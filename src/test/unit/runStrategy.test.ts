import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { readConfig } from '../../config';
import { type RunStrategyContext, selectRunStrategy } from '../../runStrategy';
import { TestStateManager } from '../../state';

function context(over: Partial<RunStrategyContext> = {}): RunStrategyContext {
  return {
    cfg: readConfig(),
    coverage: false,
    roots: ['/ws'],
    connection: 'u/p@//h:1521/s',
    sourcePath: 'install',
    run: {} as never,
    state: new TestStateManager(),
    folders: [],
    ...over,
  };
}

test('selectRunStrategy: export > debug > coverage > normal', () => {
  assert.strictEqual(
    selectRunStrategy({ coverage: true, exportReporter: { name: 'x' } }).kind,
    'export',
  );
  assert.strictEqual(selectRunStrategy({ coverage: true, debug: true }).kind, 'debug');
  assert.strictEqual(selectRunStrategy({ coverage: true }).kind, 'coverage');
  assert.strictEqual(selectRunStrategy({ coverage: false }).kind, 'normal');
});

test('NormalRun: cobertura desligada e finalize aplica SQL coverage só se ligado', async () => {
  const strategy = selectRunStrategy({ coverage: false });
  const prep = strategy.prepare(context());
  assert.strictEqual(typeof prep.coverage, 'object');
  if (typeof prep.coverage === 'boolean') return assert.fail('coverage deveria ser objeto');
  assert.strictEqual(prep.coverage.enabled, false);

  let calls = 0;
  await strategy.finalize(context(), {
    applySqlCoverage: async () => {
      calls += 1;
    },
  });
  assert.strictEqual(calls, 0);

  const cfg = { ...readConfig(), sqlCoverageEnabled: true };
  await strategy.finalize(context({ cfg }), {
    applySqlCoverage: async () => {
      calls += 1;
    },
  });
  assert.strictEqual(calls, 1);
});

test('CoverageRun: monta escopo e HTML a partir da config', () => {
  const cfg = {
    ...readConfig(),
    coverageHtmlReport: true,
    coverageOwner: 'APP',
    coverageSchemes: ['APP'],
    coverageIncludeObjects: ['APP.PKG'],
    coverageExcludeObjects: ['UT3.UT'],
    coverageIncludeSchemaExpr: '^APP$',
    coverageIncludeObjectExpr: '^PKG',
    coverageExcludeSchemaExpr: '^UT',
    coverageExcludeObjectExpr: '^UT_',
  };
  let htmlPath = '';
  const strategy = selectRunStrategy({ coverage: true });
  const prep = strategy.prepare(
    context({
      cfg,
      roots: ['/ws/a'],
      onHtmlReport: (p) => {
        htmlPath = p;
      },
    }),
  );
  assert.strictEqual(typeof prep.coverage, 'object');
  if (typeof prep.coverage === 'boolean') return assert.fail('coverage deveria ser objeto');
  assert.strictEqual(prep.coverage.enabled, true);
  assert.strictEqual(prep.coverage.htmlReport, true);
  assert.strictEqual(prep.coverage.reportRoot, '/ws/a');
  assert.strictEqual(prep.coverage.owner, 'APP');
  assert.deepStrictEqual(prep.coverage.schemes, ['APP']);
  assert.deepStrictEqual(prep.coverage.includeObjects, ['APP.PKG']);
  assert.deepStrictEqual(prep.coverage.excludeObjects, ['UT3.UT']);
  assert.strictEqual(prep.coverage.includeSchemaExpr, '^APP$');
  assert.strictEqual(prep.coverage.includeObjectExpr, '^PKG');
  assert.strictEqual(prep.coverage.excludeSchemaExpr, '^UT');
  assert.strictEqual(prep.coverage.excludeObjectExpr, '^UT_');
  prep.coverage.onHtmlReport?.('/tmp/c.html');
  assert.strictEqual(htmlPath, '/tmp/c.html');
});

test('ExportRun: só o reporter escolhido e nenhum pós-processamento', async () => {
  const strategy = selectRunStrategy({ coverage: false, exportReporter: { name: 'UT_X' } });
  const prep = strategy.prepare(context({ exportReporter: { name: 'UT_X' } }));
  assert.strictEqual(typeof prep.coverage, 'object');
  if (typeof prep.coverage === 'boolean') return assert.fail('coverage deveria ser objeto');
  assert.strictEqual(prep.coverage.enabled, false);
  assert.deepStrictEqual(prep.exportReporter, { name: 'UT_X' });
  let calls = 0;
  await strategy.finalize(context(), {
    applySqlCoverage: async () => {
      calls += 1;
    },
  });
  assert.strictEqual(calls, 0);
});

test('DebugRun: reusa NormalRun com hook de debug', async () => {
  const strategy = selectRunStrategy({ coverage: false, debug: true });
  assert.strictEqual(strategy.kind, 'debug');
  const prep = strategy.prepare(context());
  assert.strictEqual(typeof prep.coverage, 'object');
  if (typeof prep.coverage === 'boolean') return assert.fail('coverage deveria ser objeto');
  assert.strictEqual(prep.coverage.enabled, false);
  const cfg = { ...readConfig(), sqlCoverageEnabled: true };
  let calls = 0;
  await strategy.finalize(context({ cfg }), {
    applySqlCoverage: async () => {
      calls += 1;
    },
  });
  assert.strictEqual(calls, 1);
});
