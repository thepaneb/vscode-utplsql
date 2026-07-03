import assert from 'node:assert';
import * as path from 'node:path';
import { test } from 'node:test';
import {
  buildInvocation,
  type InvocationConfig,
  isInvocationError,
  resolveCliHome,
  type Spawn,
  UTPLSQL_MAIN_CLASS,
} from '../../invocation';

function cfg(over: Partial<InvocationConfig> = {}): InvocationConfig {
  return {
    invocation: 'launcher',
    cliPath: 'utplsql',
    javaPath: 'java',
    cliHome: '',
    ...over,
  };
}

// ---------- resolveCliHome ----------

test('resolveCliHome: cliHome explícito tem prioridade', () => {
  const home = resolveCliHome(cfg({ cliHome: 'C:/tools/utPLSQL-cli', cliPath: 'utplsql' }));
  assert.strictEqual(home, 'C:/tools/utPLSQL-cli');
});

test('resolveCliHome: deriva do cliPath (.../bin/utplsql.bat -> raiz)', () => {
  const cliPath = path.join('C:', 'tools', 'utPLSQL-cli', 'bin', 'utplsql.bat');
  const home = resolveCliHome(cfg({ cliPath }));
  assert.strictEqual(home, path.join('C:', 'tools', 'utPLSQL-cli'));
});

test('resolveCliHome: undefined quando cliPath é só um comando no PATH', () => {
  assert.strictEqual(resolveCliHome(cfg({ cliPath: 'utplsql' })), undefined);
});

test('resolveCliHome: ignora espaços em cliHome', () => {
  assert.strictEqual(resolveCliHome(cfg({ cliHome: '   ' })), undefined);
});

// ---------- buildInvocation: launcher ----------

test('buildInvocation launcher: usa cliPath com shell', () => {
  const inv = buildInvocation(cfg({ invocation: 'launcher', cliPath: 'utplsql' }), ['run', '-x']);
  assert.ok(!isInvocationError(inv));
  const s = inv as Spawn;
  assert.strictEqual(s.file, 'utplsql');
  assert.deepStrictEqual(s.args, ['run', '-x']);
  assert.strictEqual(s.shell, true);
});

// ---------- buildInvocation: java ----------

test('buildInvocation java: monta JVM sem shell', () => {
  const home = path.join('C:', 'tools', 'utPLSQL-cli');
  const inv = buildInvocation(cfg({ invocation: 'java', cliHome: home, javaPath: 'java' }), [
    'run',
    'u/p@db',
    '-p=foo',
  ]);
  assert.ok(!isInvocationError(inv));
  const s = inv as Spawn;

  assert.strictEqual(s.file, 'java');
  assert.strictEqual(s.shell, false);

  const expectedCp = [path.join(home, 'etc'), path.join(home, 'lib', '*')].join(path.delimiter);
  const cpIdx = s.args.indexOf('-cp');
  assert.ok(cpIdx >= 0, 'deveria ter -cp');
  assert.strictEqual(s.args[cpIdx + 1], expectedCp);

  // classe principal seguida exatamente dos cliArgs
  const mainIdx = s.args.indexOf(UTPLSQL_MAIN_CLASS);
  assert.ok(mainIdx >= 0, 'deveria ter a classe principal');
  assert.deepStrictEqual(s.args.slice(mainIdx + 1), ['run', 'u/p@db', '-p=foo']);

  // props -D apontam para a raiz
  assert.ok(s.args.includes(`-Dapp.home=${home}`));
  assert.ok(s.args.includes(`-Dbasedir=${home}`));
  assert.ok(s.args.includes('-Dapp.name=utplsql'));
});

test('buildInvocation java: metacaracteres passam literais (sem shell)', () => {
  const home = path.join('C:', 'tools', 'utPLSQL-cli');
  const regexArg = '-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$';
  const mapArg = '-type_mapping=packages=PACKAGE BODY/functions=FUNCTION';
  const inv = buildInvocation(cfg({ invocation: 'java', cliHome: home }), [regexArg, mapArg]);
  const s = inv as Spawn;
  // nada de quoting/escape — os argumentos chegam exatamente como entraram
  assert.ok(s.args.includes(regexArg));
  assert.ok(s.args.includes(mapArg));
});

test('buildInvocation java: usa javaPath customizado', () => {
  const home = path.join('C:', 'tools', 'utPLSQL-cli');
  const javaPath = path.join('C:', 'jdk', 'bin', 'java.exe');
  const inv = buildInvocation(cfg({ invocation: 'java', cliHome: home, javaPath }), ['run']);
  assert.strictEqual((inv as Spawn).file, javaPath);
});

test('buildInvocation java: erro quando não dá para resolver a raiz', () => {
  const inv = buildInvocation(cfg({ invocation: 'java', cliPath: 'utplsql', cliHome: '' }), [
    'run',
  ]);
  assert.ok(isInvocationError(inv));
  if (isInvocationError(inv)) {
    assert.match(inv.error, /cliHome|raiz/i);
  }
});

// ---------- isInvocationError ----------

test('isInvocationError discrimina Spawn de InvocationError', () => {
  assert.strictEqual(isInvocationError({ file: 'java', args: [], shell: false }), false);
  assert.strictEqual(isInvocationError({ error: 'x' }), true);
});
