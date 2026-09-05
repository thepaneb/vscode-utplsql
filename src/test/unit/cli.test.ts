import './setup.js';
import assert from 'node:assert';
import * as os from 'node:os';
import { test } from 'node:test';
import { buildCliSpawn, buildCmdScript, quoteArg, runCli } from '../../cli';

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

// ── buildCliSpawn / buildCmdScript ───────────────────────────────────

test('buildCmdScript: args limpos ficam sem aspas', () => {
  const script = buildCmdScript('D:\\cli\\utplsql.bat', ['-p=test_x', '-o=C:\\Temp\\cov.xml']);
  assert.strictEqual(
    script,
    '@echo off\r\nD:\\cli\\utplsql.bat -p=test_x -o=C:\\Temp\\cov.xml\r\n',
  );
});

test('buildCmdScript: metacaracteres e espacos sao citados', () => {
  const script = buildCmdScript('D:\\cli\\utplsql.bat', [
    '-regex_expression=.*[/\\\\](package|view)\\w*[/\\\\](\\w+)\\.sql$',
    '-type_mapping=p=PACKAGE BODY/v=VIEW',
  ]);
  assert.ok(script.includes('"-regex_expression=.*[/\\\\](package|view)\\w*[/\\\\](\\w+)\\.sql$"'));
  assert.ok(script.includes('"-type_mapping=p=PACKAGE BODY/v=VIEW"'));
});

test('buildCmdScript: percentual e dobrado para virar literal', () => {
  const script = buildCmdScript('utplsql.bat', ['-p=50%_off']);
  assert.ok(script.includes('-p=50%%_off'));
});

test('buildCmdScript: caminho do cli com espacos e citado', () => {
  const script = buildCmdScript('C:\\Program Files\\utplsql\\utplsql.bat', []);
  assert.strictEqual(script, '@echo off\r\n"C:\\Program Files\\utplsql\\utplsql.bat"\r\n');
});

test('buildCliSpawn: win32 com args limpos usa caminho direto', () => {
  const plan = buildCliSpawn('D:\\cli\\utplsql.bat', ['-p=test_x'], true, 'win32');
  assert.strictEqual(plan.command, 'cmd.exe');
  assert.strictEqual(plan.shell, false);
  assert.strictEqual(plan.script, undefined);
  assert.deepStrictEqual(plan.args, ['/d', '/c', 'D:\\cli\\utplsql.bat', '-p=test_x']);
});

test('buildCliSpawn: win32 com metacaracteres gera script .cmd', () => {
  const plan = buildCliSpawn(
    'D:\\cli\\utplsql.bat',
    ['-regex_expression=.*[/\\\\](package|view)\\w*[/\\\\](\\w+)\\.sql$'],
    true,
    'win32',
  );
  assert.strictEqual(plan.command, 'cmd.exe');
  assert.strictEqual(plan.args.length, 0);
  assert.ok(plan.script?.includes('"-regex_expression=.*[/\\\\](package|view)'));
});

test('buildCliSpawn: posix monta string unica com args citados', () => {
  const plan = buildCliSpawn(
    '/usr/bin/utplsql',
    ['-f=ut_junit_reporter', '-regex_expression=.*(package|view).sql$'],
    true,
    'linux',
  );
  assert.strictEqual(plan.shell, true);
  assert.deepStrictEqual(plan.args, []);
  assert.ok(plan.command.startsWith('/usr/bin/utplsql -f=ut_junit_reporter '));
  assert.ok(plan.command.includes('"-regex_expression=.*(package|view).sql$"'));
});

test('buildCliSpawn: sem shell passa file e args sem alteracao', () => {
  const args = ['-cp', 'lib/*', '-regex_expression=.*(package|view).sql$'];
  const plan = buildCliSpawn('java', args, false, 'win32');
  assert.strictEqual(plan.command, 'java');
  assert.strictEqual(plan.shell, false);
  assert.strictEqual(plan.script, undefined);
  assert.deepStrictEqual(plan.args, args);
});

test('buildCliSpawn: posix monta string unica com args citados', () => {
  const plan = buildCliSpawn(
    '/usr/bin/utplsql',
    ['-f=ut_junit_reporter', '-regex_expression=.*(package|view).sql$'],
    true,
    'linux',
  );
  assert.strictEqual(plan.shell, true);
  assert.deepStrictEqual(plan.args, []);
  assert.ok(plan.command.startsWith('/usr/bin/utplsql -f=ut_junit_reporter '));
  assert.ok(plan.command.includes('"-regex_expression=.*(package|view).sql$"'));
});

test('buildCliSpawn: sem shell passa file e args sem alteracao', () => {
  const args = ['-cp', 'lib/*', '-regex_expression=.*(package|view).sql$'];
  const plan = buildCliSpawn('java', args, false, 'win32');
  assert.strictEqual(plan.command, 'java');
  assert.strictEqual(plan.shell, false);
  assert.deepStrictEqual(plan.args, args);
});

test('runCli: executa echo com shell e retorna stdout', async () => {
  const result = await runCli('echo', ['hello', 'world'], true, tmpCwd, neverCancel);
  assert.strictEqual(result.code, 0);
  assert.match(result.stdout, /hello world/);
});

test('runCli: argumento com metacaractere de shell chega intacto (win32 via .cmd)', async () => {
  const result = await runCli('echo', ['a|b'], true, tmpCwd, neverCancel);
  assert.strictEqual(result.code, 0);
  assert.match(result.stdout, /a\|b/);
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

test('runCli: caminho inexistente retorna erro limpo sem spawn', async () => {
  const result = await runCli(
    `${os.tmpdir()}/nao_existe_xyz/utplsql`,
    [],
    true,
    tmpCwd,
    neverCancel,
  );
  assert.strictEqual(result.code, -1);
  assert.match(result.stderr, /CLI não encontrado/);
  assert.match(result.stderr, /nao_existe_xyz/);
});

test('runCli: cancelamento mata o processo', async () => {
  const callbacks: (() => void)[] = [];
  // biome-ignore lint/suspicious/noExplicitAny: partial CancellationToken mock
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

test('runCli: output com bytes UTF-8 invalidos usa fallback sem quebrar', async () => {
  const result = await runCli(
    process.execPath,
    ['-e', 'process.stdout.write(Buffer.from([0xff, 0xfe, 0x41]))'],
    false,
    tmpCwd,
    neverCancel,
  );
  assert.strictEqual(result.code, 0);
  // No Windows o fallback decodifica pelo codepage ANSI/OEM ('ÿþA'...); em
  // POSIX substitui por U+FFFD. O que importa: não quebra e entrega o output.
  assert.ok(result.stdout.includes('A'), 'output deveria conter o byte valido final');
});

test('runCli: erro com stderr UTF-8 invalido nao quebra', async () => {
  const result = await runCli(
    process.execPath,
    ['-e', 'process.stderr.write(Buffer.from([0xff, 0x42])); process.exit(1)'],
    false,
    tmpCwd,
    neverCancel,
  );
  assert.strictEqual(result.code, 1);
  assert.ok(result.stderr.length > 0);
});
