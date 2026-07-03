import assert from 'node:assert';
import { test } from 'node:test';
import { quoteArg, runCli } from '../../cli';

test('quoteArg: argumento limpo nao e alterado', () => {
  assert.strictEqual(quoteArg('run'), 'run');
  assert.strictEqual(quoteArg('-p=foo'), '-p=foo');
  assert.strictEqual(quoteArg('test_exemplo'), 'test_exemplo');
});

test('quoteArg: argumento com espaco e citado', () => {
  assert.strictEqual(quoteArg('foo bar'), '"foo bar"');
});

test('quoteArg: aspas internas escapadas', () => {
  assert.strictEqual(quoteArg('say "hi"'), '"say \\"hi\\""');
});

test('quoteArg: metacaracteres de shell forcam quoting', () => {
  assert.strictEqual(quoteArg('a&b'), '"a&b"');
  assert.strictEqual(quoteArg('x|y'), '"x|y"');
  assert.strictEqual(quoteArg('p<q'), '"p<q"');
  assert.strictEqual(quoteArg('p>q'), '"p>q"');
  assert.strictEqual(quoteArg('a^b'), '"a^b"');
  assert.strictEqual(quoteArg('$(ls)'), '"$(ls)"');
  assert.strictEqual(quoteArg('`cmd`'), '"`cmd`"');
});

test('runCli: executa echo com shell e retorna stdout', async () => {
  const result = await runCli('echo', ['hello', 'world'], true, '/tmp', {
    isCancellationRequested: false,
    onCancellationRequested: () => ({ dispose: () => {} }),
  });
  assert.strictEqual(result.code, 0);
  assert.match(result.stdout, /hello world/);
});

test('runCli: executa echo sem shell', async () => {
  const result = await runCli('echo', ['hello'], false, '/tmp', {
    isCancellationRequested: false,
    onCancellationRequested: () => ({ dispose: () => {} }),
  });
  assert.strictEqual(result.code, 0);
  assert.match(result.stdout, /hello/);
});

test('runCli: stderr separado do stdout', async () => {
  const result = await runCli('node', ['-e', 'console.error("erro")'], false, '/tmp', {
    isCancellationRequested: false,
    onCancellationRequested: () => ({ dispose: () => {} }),
  });
  assert.strictEqual(result.code, 0);
  assert.strictEqual(result.stdout.trim(), '');
});
