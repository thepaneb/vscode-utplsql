import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import * as cli from '../../cli';
import { listReporters, parseReportersOutput } from '../../cliReporters';
import * as invocation from '../../invocation';

test('parseReportersOutput: lista completa', () => {
  const stdout = [
    'UT_DOCUMENTATION_REPORTER',
    'UT_JUNIT_REPORTER',
    'UT_COVERAGE_COBERTURA_REPORTER',
    'UT_COVERAGE_HTML_REPORTER',
    'MY_CUSTOM_REPORTER',
  ].join('\n');
  const reporters = parseReportersOutput(stdout);
  assert.deepStrictEqual(reporters, [
    'UT_DOCUMENTATION_REPORTER',
    'UT_JUNIT_REPORTER',
    'UT_COVERAGE_COBERTURA_REPORTER',
    'UT_COVERAGE_HTML_REPORTER',
    'MY_CUSTOM_REPORTER',
  ]);
});

test('parseReportersOutput: lista vazia', () => {
  assert.deepStrictEqual(parseReportersOutput(''), []);
});

test('parseReportersOutput: linhas comentadas e de seção são ignoradas', () => {
  const stdout = [
    '# Comentário ignorado',
    '[section]',
    'UT_DOCUMENTATION_REPORTER',
    '# Outro comentário',
    'MY_CUSTOM_REPORTER',
  ].join('\n');
  const reporters = parseReportersOutput(stdout);
  assert.deepStrictEqual(reporters, ['UT_DOCUMENTATION_REPORTER', 'MY_CUSTOM_REPORTER']);
});

test('parseReportersOutput: CRLF é tratado', () => {
  const stdout = 'UT_DOCUMENTATION_REPORTER\r\nUT_JUNIT_REPORTER\r\n';
  const reporters = parseReportersOutput(stdout);
  assert.deepStrictEqual(reporters, ['UT_DOCUMENTATION_REPORTER', 'UT_JUNIT_REPORTER']);
});

test('parseReportersOutput: linhas com espaços extras são trimadas', () => {
  const stdout = '  UT_DOCUMENTATION_REPORTER  \n  UT_JUNIT_REPORTER  ';
  const reporters = parseReportersOutput(stdout);
  assert.deepStrictEqual(reporters, ['UT_DOCUMENTATION_REPORTER', 'UT_JUNIT_REPORTER']);
});

test('parseReportersOutput: linha só com espaço não entra', () => {
  const stdout = 'UT_DOCUMENTATION_REPORTER\n   \nUT_JUNIT_REPORTER';
  const reporters = parseReportersOutput(stdout);
  assert.deepStrictEqual(reporters, ['UT_DOCUMENTATION_REPORTER', 'UT_JUNIT_REPORTER']);
});

test('listReporters: retorna lista quando CLI executa com sucesso', async () => {
  mock.method(invocation, 'buildInvocation', () => ({
    file: 'echo',
    args: ['reporters', 'conn'],
    shell: true,
  }));
  mock.method(cli, 'runCli', () => Promise.resolve({ code: 0, stdout: 'UT_A\nUT_B', stderr: '' }));
  const result = await listReporters(
    { invocation: 'launcher', cliPath: 'utplsql', javaPath: 'java', cliHome: '' },
    'conn',
  );
  assert.deepStrictEqual(result, ['UT_A', 'UT_B']);
  mock.restoreAll();
});

test('listReporters: retorna erro quando buildInvocation falha', async () => {
  mock.method(invocation, 'buildInvocation', () => ({ error: 'no cli home' }));
  const result = await listReporters(
    { invocation: 'java', cliPath: 'utplsql', javaPath: 'java', cliHome: '' },
    'conn',
  );
  assert.ok('error' in result);
  assert.match((result as { error: string }).error, /no cli home/);
  mock.restoreAll();
});

test('listReporters: retorna erro quando CLI retorna codigo != 0', async () => {
  mock.method(invocation, 'buildInvocation', () => ({
    file: 'echo',
    args: [],
    shell: true,
  }));
  mock.method(cli, 'runCli', () =>
    Promise.resolve({ code: 1, stdout: '', stderr: 'command failed' }),
  );
  const result = await listReporters(
    { invocation: 'launcher', cliPath: 'utplsql', javaPath: 'java', cliHome: '' },
    'conn',
  );
  assert.ok('error' in result);
  assert.match((result as { error: string }).error, /command failed/);
  mock.restoreAll();
});
