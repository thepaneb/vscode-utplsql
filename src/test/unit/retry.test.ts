import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { isRetryable, retryWithBackoff } from '../../retry';

function transient(message = 'ORA-12541: no listener'): Error {
  return Object.assign(new Error(message), { errorNum: 12541 });
}

test('retryWithBackoff: sucesso na segunda tentativa', async () => {
  let calls = 0;
  const result = await retryWithBackoff(
    async () => {
      calls += 1;
      if (calls < 2) throw transient();
      return 'ok';
    },
    { attempts: 2, isRetryable, sleep: async () => {} },
  );
  assert.strictEqual(result, 'ok');
  assert.strictEqual(calls, 2);
});

test('retryWithBackoff: desiste após N tentativas extras', async () => {
  let calls = 0;
  await assert.rejects(
    retryWithBackoff(
      async () => {
        calls += 1;
        throw transient();
      },
      { attempts: 2, isRetryable, sleep: async () => {} },
    ),
  );
  assert.strictEqual(calls, 3);
});

test('retryWithBackoff: erro não retryable não repete', async () => {
  let calls = 0;
  await assert.rejects(
    retryWithBackoff(
      async () => {
        calls += 1;
        throw new Error('ORA-01017: invalid username/password');
      },
      { attempts: 2, isRetryable, sleep: async () => {} },
    ),
  );
  assert.strictEqual(calls, 1);
});

test('retryWithBackoff: attempts=0 desliga o retry', async () => {
  let calls = 0;
  await assert.rejects(
    retryWithBackoff(
      async () => {
        calls += 1;
        throw transient();
      },
      { attempts: 0, isRetryable, sleep: async () => {} },
    ),
  );
  assert.strictEqual(calls, 1);
});

test('retryWithBackoff: backoff 200/400/800 e onRetry', async () => {
  const waits: number[] = [];
  const retries: number[] = [];
  await assert.rejects(
    retryWithBackoff(
      async () => {
        throw transient();
      },
      {
        attempts: 3,
        isRetryable,
        baseDelayMs: 200,
        sleep: async (ms) => {
          waits.push(ms);
        },
        onRetry: (_error, attempt) => retries.push(attempt),
      },
    ),
  );
  assert.deepStrictEqual(waits, [200, 400, 800]);
  assert.deepStrictEqual(retries, [1, 2, 3]);
});

test('isRetryable: conexão/FS transitórios sim; auth/permissão não', () => {
  assert.strictEqual(isRetryable(transient()), true);
  assert.strictEqual(isRetryable(new Error('ORA-12170: TNS:Connect timeout')), true);
  assert.strictEqual(isRetryable(new Error('NJS-040: connection request timeout')), true);
  assert.strictEqual(isRetryable(Object.assign(new Error('busy'), { code: 'EBUSY' })), true);
  assert.strictEqual(isRetryable(new Error('ORA-01017: invalid username/password')), false);
  assert.strictEqual(isRetryable(new Error('ORA-28000: account is locked')), false);
  assert.strictEqual(isRetryable(new Error('ORA-00942: table or view does not exist')), false);
});
