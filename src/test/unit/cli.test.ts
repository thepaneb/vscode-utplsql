import assert from 'node:assert';
import * as os from 'node:os';
import { test } from 'node:test';
import { quoteArg, runCli } from '../../cli';

const tmpCwd = os.tmpdir();

const neverCancel = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose: () => {} }),
};

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

test('quoteArg: string vazia nao e alterada', () => {
  assert.strictEqual(quoteArg(''), '');
});

test('quoteArg: trailing whitespace', () => {
  assert.strictEqual(quoteArg('foo '), '"foo "');
});

test('quoteArg: caminho Windows sem espaco nao e alterado', () => {
  assert.strictEqual(quoteArg('-o=C:\\Temp\\cov.xml'), '-o=C:\\Temp\\cov.xml');
});

test('quoteArg: caminho Windows com espaco e citado', () => {
  assert.strictEqual(quoteArg('-o=C:\\My Docs\\cov.xml'), '"-o=C:\\My Docs\\cov.xml"');
});

test('quoteArg: regex de coverageSourceArgs e citado pelo $', () => {
  assert.strictEqual(
    quoteArg('-regex_expression=.*[/\\\\](\\w+)\\.sql$'),
    '"-regex_expression=.*[/\\\\](\\w+)\\.sql$"',
  );
});

test('quoteArg: type_mapping com espacos e barra e citado', () => {
  assert.strictEqual(
    quoteArg('-type_mapping=p=PACKAGE BODY/f=FUNCTION'),
    '"-type_mapping=p=PACKAGE BODY/f=FUNCTION"',
  );
});

test('runCli: executa echo com shell e retorna stdout', async () => {
  const result = await runCli('echo', ['hello', 'world'], true, tmpCwd, neverCancel);
  assert.strictEqual(result.code, 0);
  assert.match(result.stdout, /hello world/);
});

test('runCli: executa node sem shell e retorna stdout', async () => {
  const result = await runCli(
    process.execPath,
    ['-e', 'console.log("hello")'],
    false,
    tmpCwd,
    neverCancel,
  );
  assert.strictEqual(result.code, 0);
  assert.match(result.stdout, /hello/);
});

test('runCli: stderr separado do stdout', async () => {
  const result = await runCli(
    process.execPath,
    ['-e', 'console.error("erro")'],
    false,
    tmpCwd,
    neverCancel,
  );
  assert.strictEqual(result.code, 0);
  assert.strictEqual(result.stdout.trim(), '');
});

test('runCli: onStdout callback recebe chunks', async () => {
  const chunks: string[] = [];
  const result = await runCli(
    process.execPath,
    ['-e', 'console.log("hello")'],
    false,
    tmpCwd,
    neverCancel,
    (chunk) => {
      chunks.push(chunk);
    },
  );
  assert.strictEqual(result.code, 0);
  assert.ok(chunks.length > 0);
  assert.match(chunks.join(''), /hello/);
});

test('runCli: comando inexistente retorna codigo -1', async () => {
  const result = await runCli('comando_inexistente_xyz_123', [], false, tmpCwd, neverCancel);
  assert.strictEqual(result.code, -1);
  assert.ok(result.stderr);
});

test('runCli: cancelamento mata o processo', async () => {
  const callbacks: (() => void)[] = [];
  const cts: any = {
    isCancellationRequested: false,
    onCancellationRequested: (cb: () => void) => {
      callbacks.push(cb);
      return { dispose: () => {} };
    },
  };

  const p = runCli(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], false, tmpCwd, cts);

  await new Promise((r) => setTimeout(r, 100));
  cts.isCancellationRequested = true;
  for (const cb of callbacks) cb();

  const result = await p;
  assert.ok(result.code !== 0 || result.stderr || result.stdout !== '');
});
