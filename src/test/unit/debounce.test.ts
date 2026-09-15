import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import { createDebounced } from '../../debounce';

test('debounce: coalesce múltiplas chamadas em uma', (t) => {
  mock.timers.enable({ apis: ['setTimeout'] });
  t.after(() => mock.timers.reset());

  let calls = 0;
  const d = createDebounced(
    () => {
      calls++;
    },
    () => 300,
  );
  d.schedule();
  d.schedule();
  d.schedule();

  mock.timers.tick(299);
  assert.strictEqual(calls, 0);
  mock.timers.tick(1);
  assert.strictEqual(calls, 1);
  assert.strictEqual(d.pending, false);
});

test('debounce: schedule após disparo agenda de novo', (t) => {
  mock.timers.enable({ apis: ['setTimeout'] });
  t.after(() => mock.timers.reset());

  let calls = 0;
  const d = createDebounced(
    () => {
      calls++;
    },
    () => 100,
  );
  d.schedule();
  mock.timers.tick(100);
  assert.strictEqual(calls, 1);
  d.schedule();
  mock.timers.tick(100);
  assert.strictEqual(calls, 2);
});

test('debounce: cancel evita disparo', (t) => {
  mock.timers.enable({ apis: ['setTimeout'] });
  t.after(() => mock.timers.reset());

  let calls = 0;
  const d = createDebounced(
    () => {
      calls++;
    },
    () => 300,
  );
  d.schedule();
  assert.strictEqual(d.pending, true);
  d.cancel();
  assert.strictEqual(d.pending, false);
  mock.timers.tick(500);
  assert.strictEqual(calls, 0);
});

test('debounce: delay é lido a cada schedule (config dinâmica)', (t) => {
  mock.timers.enable({ apis: ['setTimeout'] });
  t.after(() => mock.timers.reset());

  let calls = 0;
  let delay = 300;
  const d = createDebounced(
    () => {
      calls++;
    },
    () => delay,
  );
  d.schedule();
  delay = 50;
  d.schedule();
  mock.timers.tick(50);
  assert.strictEqual(calls, 1);
});
