import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { createPerfProbe, formatPerfLine, type PerfSample } from '../../perf';

test('createPerfProbe: desligado não mede nem chama o sink', () => {
  let calls = 0;
  const probe = createPerfProbe({
    enabled: false,
    sink: () => {
      calls += 1;
    },
  });
  const end = probe.start('run');
  end();
  probe.record('parseXml', 10);
  assert.strictEqual(calls, 0);
  assert.strictEqual(probe.enabled, false);
});

test('createPerfProbe: mede a fase e serializa uma linha JSONL', () => {
  let now = 1000;
  const samples: PerfSample[] = [];
  const probe = createPerfProbe({
    enabled: true,
    now: () => now,
    sink: (sample) => samples.push(sample),
  });
  const end = probe.start('discovery');
  now = 1250;
  end();
  end(); // idempotente

  assert.strictEqual(samples.length, 1);
  assert.strictEqual(samples[0].phase, 'discovery');
  assert.strictEqual(samples[0].ms, 250);
  const line = formatPerfLine(samples[0]);
  assert.strictEqual(JSON.parse(line).phase, 'discovery');
  assert.ok(!line.includes('\n'));
});

test('createPerfProbe: aceita metadados e não lança quando o sink falha', () => {
  const samples: PerfSample[] = [];
  const throwing = createPerfProbe({
    enabled: true,
    sink: () => {
      throw new Error('disk full');
    },
  });
  assert.doesNotThrow(() => throwing.record('run', 12));

  const probe = createPerfProbe({
    enabled: true,
    sink: (sample) => samples.push(sample),
  });
  probe.record('poll', -1, { tests: 3 });
  assert.strictEqual(samples[0].ms, 0);
  assert.deepStrictEqual(samples[0].meta, { tests: 3 });
});
