import assert from 'node:assert';
import { test } from 'node:test';
import { type AutoRunOptions, createAutoRunner } from '../../autoRun';

// PRD-50: auto-run on save — debounce por arquivo + guarda de concorrência (puro).

interface Scheduled {
  fn: () => void;
  ms: number;
}

function harness(
  over: Partial<AutoRunOptions> = {},
  running = false,
  eligible?: (u: string) => boolean,
) {
  const scheduled: Scheduled[] = [];
  const cleared: Scheduled[] = [];
  const runs: string[] = [];
  const opts: AutoRunOptions = { enabled: true, delayMs: 500, queue: 'skip', ...over };
  let isRunning = running;
  const runner = createAutoRunner(() => opts, {
    run: (uri) => {
      runs.push(uri);
    },
    isRunning: () => isRunning,
    setTimeout: (fn, ms) => {
      const s = { fn, ms };
      scheduled.push(s);
      return s as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimeout: (h) => {
      cleared.push(h as unknown as Scheduled);
    },
    isEligible: eligible,
  });
  return {
    runner,
    scheduled,
    cleared,
    runs,
    setRunning: (v: boolean) => {
      isRunning = v;
    },
    setOpts: (v: Partial<AutoRunOptions>) => Object.assign(opts, v),
    // Dispara (uma vez) os timers agendados que não foram cancelados.
    flush: () => {
      const fired = scheduled.filter((s) => !cleared.includes(s));
      for (const s of fired) s.fn();
      // Remove os já disparados das próximas chamadas de flush.
      for (const s of fired) scheduled.splice(scheduled.indexOf(s), 1);
    },
  };
}

test('autoRun: modo off não agenda nada', () => {
  const h = harness({ enabled: false });
  h.runner.schedule('/ws/ut_a.pks');
  assert.strictEqual(h.scheduled.length, 0);
  assert.strictEqual(h.runner.pending, 0);
});

test('autoRun: agenda com o delay configurado', () => {
  const h = harness({ delayMs: 300 });
  h.runner.schedule('/ws/ut_a.pks');
  assert.strictEqual(h.scheduled.length, 1);
  assert.strictEqual(h.scheduled[0].ms, 300);
  assert.strictEqual(h.runner.pending, 1);
});

test('autoRun: saves rápidos do mesmo arquivo coalescem (um clear + um timer final)', () => {
  const h = harness();
  h.runner.schedule('/ws/ut_a.pks');
  h.runner.schedule('/ws/ut_a.pks');
  h.runner.schedule('/ws/ut_a.pks');
  assert.strictEqual(h.scheduled.length, 3);
  assert.strictEqual(h.cleared.length, 2, 'dois timers anteriores cancelados');
  assert.strictEqual(h.runner.pending, 1);
  h.flush();
  assert.deepStrictEqual(h.runs, ['/ws/ut_a.pks']);
});

test('autoRun: arquivos distintos não se cancelam', () => {
  const h = harness();
  h.runner.schedule('/ws/ut_a.pks');
  h.runner.schedule('/ws/ut_b.pks');
  assert.strictEqual(h.cleared.length, 0);
  assert.strictEqual(h.runner.pending, 2);
  h.flush();
  assert.deepStrictEqual(h.runs, ['/ws/ut_a.pks', '/ws/ut_b.pks']);
});

test('autoRun: arquivo inelegível é ignorado', () => {
  const h = harness({}, false, (u) => u.endsWith('.pks'));
  h.runner.schedule('/ws/ut_a.pkb');
  assert.strictEqual(h.scheduled.length, 0);
});

test('autoRun: execução em andamento com queue=skip descarta o disparo', () => {
  const h = harness({ queue: 'skip' }, true);
  h.runner.schedule('/ws/ut_a.pks');
  h.flush();
  assert.deepStrictEqual(h.runs, []);
});

test('autoRun: execução em andamento com queue=replace reagenda e roda ao liberar', () => {
  const h = harness({ queue: 'replace' }, true);
  h.runner.schedule('/ws/ut_a.pks');
  h.flush();
  assert.deepStrictEqual(h.runs, [], 'ainda rodando: não executa');
  h.setRunning(false);
  // Um novo save após liberar dispara o pendente.
  h.runner.schedule('/ws/ut_a.pks');
  h.flush();
  assert.deepStrictEqual(h.runs, ['/ws/ut_a.pks']);
});

test('autoRun: cancel(uri) remove só o timer do arquivo', () => {
  const h = harness();
  h.runner.schedule('/ws/ut_a.pks');
  h.runner.schedule('/ws/ut_b.pks');
  h.runner.cancel('/ws/ut_a.pks');
  assert.strictEqual(h.runner.pending, 1);
  h.flush();
  assert.deepStrictEqual(h.runs, ['/ws/ut_b.pks']);
});

test('autoRun: cancel() sem uri limpa todos os timers', () => {
  const h = harness();
  h.runner.schedule('/ws/ut_a.pks');
  h.runner.schedule('/ws/ut_b.pks');
  h.runner.cancel();
  assert.strictEqual(h.runner.pending, 0);
  h.flush();
  assert.deepStrictEqual(h.runs, []);
});

test('autoRun: delay negativo/zero é normalizado para 0', () => {
  const h = harness({ delayMs: -10 });
  h.runner.schedule('/ws/ut_a.pks');
  assert.strictEqual(h.scheduled[0].ms, 0);
});

test('autoRun: lê enabled a cada schedule (mudança de config em runtime)', () => {
  const h = harness({ enabled: false });
  h.runner.schedule('/ws/ut_a.pks');
  assert.strictEqual(h.scheduled.length, 0);
  h.setOpts({ enabled: true });
  h.runner.schedule('/ws/ut_a.pks');
  assert.strictEqual(h.scheduled.length, 1);
});
