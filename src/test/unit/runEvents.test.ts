import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { createRunEventBus, type RunEvent } from '../../runEvents';

test('runEvents: emite para múltiplos assinantes e permite off', () => {
  const bus = createRunEventBus();
  const seen: number[] = [];
  const first = (event: { passed: number }) => seen.push(event.passed);
  const second = (event: { passed: number }) => seen.push(event.passed + 1);
  const off = bus.on('run:complete', first);
  bus.on('run:complete', second);
  bus.emit({ type: 'run:complete', passed: 2, failed: 0, skipped: 0, errored: 0, durationMs: 1 });
  assert.deepStrictEqual(seen, [2, 3]);
  off();
  bus.emit({ type: 'run:complete', passed: 3, failed: 0, skipped: 0, errored: 0, durationMs: 1 });
  assert.deepStrictEqual(seen, [2, 3, 4]);
  assert.strictEqual(bus.listenerCount('run:complete'), 1);
});

test('runEvents: listener que lança não impede os demais', () => {
  const bus = createRunEventBus();
  const seen: string[] = [];
  bus.on('run:error', () => {
    throw new Error('boom');
  });
  bus.on('run:error', (event) => seen.push(event.error));
  bus.emit({ type: 'run:error', error: 'falhou' });
  assert.deepStrictEqual(seen, ['falhou']);
});

test('runEvents: emitAsync aguarda listeners assíncronos', async () => {
  const bus = createRunEventBus();
  let done = false;
  bus.on('run:complete', async () => {
    await Promise.resolve();
    done = true;
  });
  await bus.emitAsync({
    type: 'run:complete',
    passed: 1,
    failed: 0,
    skipped: 0,
    errored: 0,
    durationMs: 1,
  });
  assert.strictEqual(done, true);
});

test('runEvents: dispose limpa listeners e ignora emissões', () => {
  const bus = createRunEventBus();
  let calls = 0;
  bus.on('suite:start', () => {
    calls += 1;
  });
  bus.dispose();
  bus.emit({ type: 'suite:start', index: 1, total: 1 });
  assert.strictEqual(calls, 0);
  assert.strictEqual(bus.listenerCount('suite:start'), 0);
});

test('runEvents: on após dispose devolve off inerte', () => {
  const bus = createRunEventBus();
  bus.dispose();
  const off = bus.on('run:start', () => assert.fail('não deveria ouvir'));
  off();
  bus.emit({ type: 'run:start', pathArgs: [], coverage: false, exporting: false });
});

test('runEvents: payloads tipados cobrem todos os eventos', () => {
  const events: RunEvent[] = [
    { type: 'suite:start', index: 1, total: 2 },
    { type: 'run:start', pathArgs: ['pkg'], coverage: true, exporting: false },
    { type: 'run:complete', passed: 1, failed: 0, skipped: 0, errored: 0, durationMs: 10 },
    { type: 'coverage:generated', generated: true },
    { type: 'coverage:html:written', path: '/tmp/c.html' },
    { type: 'run:cancelled', outcome: 'timedOut' },
    { type: 'run:error', error: 'ORA-1' },
  ];
  assert.strictEqual(new Set(events.map((event) => event.type)).size, 7);
});
