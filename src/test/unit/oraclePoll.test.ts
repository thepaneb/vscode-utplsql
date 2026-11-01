import * as assert from 'node:assert';
import { test } from 'node:test';
import { pollOutputStream } from '../../oraclePoll';

test('pollOutputStream: entrega as linhas e para quando done', async () => {
  const done = Promise.withResolvers<boolean>();
  const seen: string[] = [];
  const lastBinds: unknown[] = [];
  let calls = 0;
  const conn = {
    execute: async (_sql: string, binds?: Record<string, unknown>) => {
      calls++;
      lastBinds.push(binds?.last);
      if (calls === 1) {
        return {
          rows: [
            { OUTPUT_ID: 'a', MESSAGE_ID: 1, TEXT: 'one' },
            { OUTPUT_ID: 'a', MESSAGE_ID: 2, TEXT: null },
          ],
        };
      }
      if (calls === 2) {
        done.resolve(true);
        return { rows: [{ OUTPUT_ID: 'b', MESSAGE_ID: 3, TEXT: 'two' }] };
      }
      return { rows: [] };
    },
  };

  await pollOutputStream({
    conn,
    utSchema: 'UT3.',
    done: done.promise,
    intervalMs: 1,
    onText: (text, outputId) => seen.push(`${String(outputId)}:${text}`),
  });

  assert.deepStrictEqual(seen, ['a:one', 'b:two']);
  assert.deepStrictEqual(lastBinds.slice(0, 3), [0, 2, 3]);
});

test('pollOutputStream: erro de poll chama onError e continua', async () => {
  const done = Promise.withResolvers<boolean>();
  const errors: unknown[] = [];
  let calls = 0;
  const conn = {
    execute: async () => {
      calls++;
      if (calls === 1) throw new Error('boom');
      done.resolve(true);
      return { rows: [] };
    },
  };

  await pollOutputStream({
    conn,
    utSchema: '',
    done: done.promise,
    intervalMs: 1,
    onText: () => {},
    onError: (error) => errors.push(error),
  });

  assert.strictEqual(errors.length, 1);
  assert.match(String(errors[0]), /boom/);
});
