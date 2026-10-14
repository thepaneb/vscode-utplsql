import assert from 'node:assert';
import { test } from 'node:test';
import {
  formatDuration,
  PERSIST_KEY,
  PERSIST_MESSAGE_LIMIT,
  TestStateManager,
  truncateMessage,
  withDurationSuffix,
} from '../../state';

/** Memento falso em memória (workspaceState). */
function fakeMemento(initial: Record<string, unknown> = {}) {
  const store: Record<string, unknown> = { ...initial };
  return {
    store,
    get<T>(key: string): T | undefined {
      return store[key] as T | undefined;
    },
    update(key: string, value: unknown): Thenable<void> {
      store[key] = value;
      return Promise.resolve();
    },
    keys: () => Object.keys(store),
  } as never;
}

test('TestStateManager: setMeta e getMeta', () => {
  const mgr = new TestStateManager();
  const item = { id: 'suite:app' } as any;
  const meta = {
    kind: 'suite' as const,
    packageName: 'app',
    uri: { fsPath: '/x' } as any,
    folder: { uri: { fsPath: '/ws' }, name: 'ws', index: 0 } as any,
  };
  mgr.setMeta(item, meta);
  assert.strictEqual(mgr.getMeta(item), meta);
});

test('TestStateManager: getMeta retorna undefined para item sem meta', () => {
  const mgr = new TestStateManager();
  assert.strictEqual(mgr.getMeta({ id: 'unknown' } as any), undefined);
});

test('TestStateManager: setCoverage e getCoverage', () => {
  const mgr = new TestStateManager();
  const details = [{ line: 1, hits: 2 } as any];
  mgr.setCoverage('file:///test.sql', details);
  assert.strictEqual(mgr.getCoverage('file:///test.sql'), details);
});

test('TestStateManager: getCoverate retorna array vazio para chave inexistente', () => {
  const mgr = new TestStateManager();
  assert.deepStrictEqual(mgr.getCoverage('file:///nonexistent'), []);
});

test('TestStateManager: clearCoverage limpa o store', () => {
  const mgr = new TestStateManager();
  mgr.setCoverage('file:///test.sql', [{ line: 1, hits: 2 } as any]);
  mgr.clearCoverage();
  assert.deepStrictEqual(mgr.getCoverage('file:///test.sql'), []);
});

test('TestStateManager: setExtraReporter armazena o valor', () => {
  const mgr = new TestStateManager();
  mgr.setExtraReporter('UT_COVERAGE_HTML_REPORTER');
  assert.strictEqual(mgr.extraReporter, 'UT_COVERAGE_HTML_REPORTER');
});

test('TestStateManager: consumeExtraReporter retorna o valor armazenado', () => {
  const mgr = new TestStateManager();
  mgr.setExtraReporter('UT_MY_CUSTOM');
  assert.strictEqual(mgr.consumeExtraReporter(), 'UT_MY_CUSTOM');
});

test('TestStateManager: consumeExtraReporter limpa apos consumo', () => {
  const mgr = new TestStateManager();
  mgr.setExtraReporter('UT_TEMP');
  mgr.consumeExtraReporter();
  assert.strictEqual(mgr.consumeExtraReporter(), undefined);
});

test('TestStateManager: consumeExtraReporter retorna undefined sem nada armazenado', () => {
  const mgr = new TestStateManager();
  assert.strictEqual(mgr.consumeExtraReporter(), undefined);
});

test('TestStateManager: setLastResults e getLastResults', () => {
  const mgr = new TestStateManager();
  const map = new Map([['test:x', { status: 'passed' as const }]]);
  mgr.setLastResults(map);
  assert.strictEqual(mgr.getLastResults(), map);
});

test('TestStateManager: clearLastResults limpa o map', () => {
  const mgr = new TestStateManager();
  mgr.setLastResults(new Map([['test:x', { status: 'passed' as const }]]));
  mgr.clearLastResults();
  assert.strictEqual(mgr.getLastResults().size, 0);
});

test('TestStateManager: setLastRun e getLastRun', () => {
  const mgr = new TestStateManager();
  const lr = { type: 'all' as const, coverage: false };
  mgr.setLastRun(lr);
  assert.strictEqual(mgr.getLastRun(), lr);
});

test('TestStateManager: setLastFailedItems e getLastFailedItems', () => {
  const mgr = new TestStateManager();
  const items = [{ id: 'test:a' }, { id: 'test:b' }] as any[];
  mgr.setLastFailedItems(items);
  assert.strictEqual(mgr.getLastFailedItems().length, 2);
  assert.strictEqual(mgr.getLastFailedItems()[0].id, 'test:a');
});

test('TestStateManager: setSuiteItem e getSuiteItem', () => {
  const mgr = new TestStateManager();
  const item = { id: 'suite:app', children: [] } as any;
  mgr.setSuiteItem('suite:app', item);
  assert.strictEqual(mgr.getSuiteItem('suite:app'), item);
});

test('TestStateManager: getSuiteItem retorna undefined para id inexistente', () => {
  const mgr = new TestStateManager();
  assert.strictEqual(mgr.getSuiteItem('suite:nao_existe'), undefined);
});

test('TestStateManager: clearSuiteMap remove todos os itens', () => {
  const mgr = new TestStateManager();
  mgr.setSuiteItem('suite:a', { id: 'a' } as any);
  mgr.setSuiteItem('suite:b', { id: 'b' } as any);
  mgr.clearSuiteMap();
  assert.strictEqual(mgr.getSuiteItem('suite:a'), undefined);
  assert.strictEqual(mgr.getSuiteItem('suite:b'), undefined);
});

// ── Duração no label (PRD-56 RF4) ──────────────────────────────────────

test('formatDuration: abaixo de 1s usa ms; acima usa s com 1 decimal', () => {
  assert.strictEqual(formatDuration(850), '850ms');
  assert.strictEqual(formatDuration(999), '999ms');
  assert.strictEqual(formatDuration(1000), '1.0s');
  assert.strictEqual(formatDuration(1234), '1.2s');
  assert.strictEqual(formatDuration(65432), '65.4s');
});

test('withDurationSuffix: aplica, substitui (idempotente) e remove', () => {
  assert.strictEqual(withDurationSuffix('app_pkg.is_valid', 1200, true), 'app_pkg.is_valid (1.2s)');
  // reaplicar não acumula sufixos
  assert.strictEqual(
    withDurationSuffix('app_pkg.is_valid (1.2s)', 800, true),
    'app_pkg.is_valid (800ms)',
  );
  // desligado → limpa o sufixo anterior
  assert.strictEqual(withDurationSuffix('app_pkg.is_valid (1.2s)', 800, false), 'app_pkg.is_valid');
  // sem duração → nada
  assert.strictEqual(withDurationSuffix('x (1.2s)', undefined, true), 'x');
  assert.strictEqual(withDurationSuffix('x', Number.NaN, true), 'x');
  assert.strictEqual(withDurationSuffix('x', -1, true), 'x');
  // sufixo que não é duração fica intacto
  assert.strictEqual(withDurationSuffix('x [tag] (2)', undefined, true), 'x [tag] (2)');
});

test('truncateMessage: corta mensagens longas com reticências', () => {
  assert.strictEqual(truncateMessage('curta'), 'curta');
  const long = 'a'.repeat(PERSIST_MESSAGE_LIMIT + 50);
  const out = truncateMessage(long);
  assert.strictEqual(out.length, PERSIST_MESSAGE_LIMIT + 1);
  assert.ok(out.endsWith('…'));
});

// ── Snapshot persistido (PRD-56 RF1/RF2/RF3) ───────────────────────────

test('persist/restore: round-trip com duração, ts e mensagem truncada', () => {
  const mgr = new TestStateManager();
  const memento = fakeMemento();
  mgr.attachMemento(memento);

  mgr.setLastResults(
    new Map([
      ['test:app.ok', { status: 'passed' as const, durationMs: 1200, ts: 111 }],
      [
        'test:app.bad',
        { status: 'failed' as const, message: 'x'.repeat(PERSIST_MESSAGE_LIMIT + 10), ts: 222 },
      ],
    ]),
  );
  mgr.persist();

  const snapshot = (memento as { store: Record<string, unknown> }).store[PERSIST_KEY] as {
    v: number;
    ts: number;
    items: Record<string, { message?: string; durationMs?: number; ts: number }>;
  };
  assert.strictEqual(snapshot.v, 1);
  assert.strictEqual(snapshot.items['test:app.ok']?.durationMs, 1200);
  assert.strictEqual(snapshot.items['test:app.ok']?.ts, 111);
  assert.strictEqual(
    (snapshot.items['test:app.bad']?.message ?? '').length,
    PERSIST_MESSAGE_LIMIT + 1,
  );

  const other = new TestStateManager();
  other.attachMemento(memento);
  assert.strictEqual(other.restore(), 2);
  assert.strictEqual(other.getLastResults().get('test:app.ok')?.durationMs, 1200);
  assert.strictEqual(other.getLastResults().get('test:app.ok')?.status, 'passed');
});

test('persist: sem Memento é no-op (não lança)', () => {
  const mgr = new TestStateManager();
  mgr.setLastResults(new Map([['a', { status: 'passed' as const }]]));
  mgr.persist();
  assert.strictEqual(mgr.restore(), 0);
});

test('restore: descarta versão desconhecida e entradas inválidas', () => {
  const memento = fakeMemento({
    [PERSIST_KEY]: { v: 2, ts: 1, items: { a: { status: 'passed', ts: 1 } } },
  });
  const mgr = new TestStateManager();
  mgr.attachMemento(memento);
  assert.strictEqual(mgr.restore(), 0);

  const parcial = fakeMemento({
    [PERSIST_KEY]: {
      v: 1,
      ts: 1,
      items: { ok: { status: 'passed', ts: 5 }, semTs: { status: 'failed' }, nulo: null },
    },
  });
  const mgr2 = new TestStateManager();
  mgr2.attachMemento(parcial);
  assert.strictEqual(mgr2.restore(), 1);
  assert.strictEqual(mgr2.getLastResults().get('ok')?.ts, 5);
});

test('restoreLastFailed: mapeia ids para itens da árvore e ignora removidos', () => {
  const mgr = new TestStateManager();
  mgr.attachMemento(
    fakeMemento({
      [PERSIST_KEY]: {
        v: 1,
        ts: 1,
        items: {
          'test:a': { status: 'failed', ts: 1 },
          'test:b': { status: 'error', ts: 1 },
          'test:c': { status: 'passed', ts: 1 },
          'test:removido': { status: 'failed', ts: 1 },
        },
      },
    }),
  );
  mgr.restore();
  const a = { id: 'test:a' } as any;
  const b = { id: 'test:b' } as any;
  const c = { id: 'test:c' } as any;
  mgr.setItem('test:a', a);
  mgr.setItem('test:b', b);
  mgr.setItem('test:c', c);

  const failed = mgr.restoreLastFailed();
  assert.deepStrictEqual(failed, [a, b]);
  assert.deepStrictEqual(mgr.getLastFailedItems(), [a, b]);
});
