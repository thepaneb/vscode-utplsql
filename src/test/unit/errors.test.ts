import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import {
  ConfigurationError,
  formatUserError,
  mapOracleError,
  OracleConnectionError,
  ReporterNotFoundError,
  TimeoutError,
  UtplsqlError,
  UtplsqlVersionError,
} from '../../errors';

test('UtplsqlError: carrega code, userMessageKey, params e cause', () => {
  const cause = new Error('boom');
  const err = new UtplsqlError('falhou', {
    code: 'UTPLSQL_X',
    userMessageKey: 'common.error',
    params: { name: 'X' },
    cause,
  });
  assert.strictEqual(err.name, 'UtplsqlError');
  assert.strictEqual(err.code, 'UTPLSQL_X');
  assert.strictEqual(err.userMessageKey, 'common.error');
  assert.deepStrictEqual(err.params, { name: 'X' });
  assert.strictEqual(err.cause, cause);
});

test('OracleConnectionError: default de conexão e código de autenticação', () => {
  const conn = new OracleConnectionError('ORA-12541');
  assert.strictEqual(conn.code, 'UTPLSQL_CONNECTION');
  assert.strictEqual(conn.userMessageKey, 'runner.oracleError');

  const auth = new OracleConnectionError('ORA-01017', { code: 'UTPLSQL_AUTH' });
  assert.strictEqual(auth.code, 'UTPLSQL_AUTH');
});

test('mapOracleError: ORA de conexão vira OracleConnectionError com cause', () => {
  const original = Object.assign(new Error('ORA-12541: no listener'), { errorNum: 12541 });
  const mapped = mapOracleError(original);
  assert.ok(mapped instanceof OracleConnectionError);
  assert.strictEqual(mapped.code, 'UTPLSQL_CONNECTION');
  assert.strictEqual(mapped.cause, original);
});

test('mapOracleError: ORA de autenticação usa o código de auth', () => {
  const mapped = mapOracleError(new Error('ORA-01017: invalid username/password'));
  assert.ok(mapped instanceof OracleConnectionError);
  assert.strictEqual(mapped.code, 'UTPLSQL_AUTH');
});

test('mapOracleError: timeout do pool vira TimeoutError', () => {
  const mapped = mapOracleError(new Error('NJS-040: connection request timeout'));
  assert.ok(mapped instanceof TimeoutError);
  assert.strictEqual(mapped.code, 'UTPLSQL_TIMEOUT');
});

test('mapOracleError: erro desconhecido é preservado', () => {
  const original = new Error('ORA-00942: table or view does not exist');
  assert.strictEqual(mapOracleError(original), original);
});

test('mapOracleError: erro de domínio é devolvido intacto', () => {
  const original = new ReporterNotFoundError('UT_FOO');
  assert.strictEqual(mapOracleError(original), original);
});

test('formatUserError: usa a chave localizada e preserva o detalhe', () => {
  const err = new OracleConnectionError('ORA-12541: no listener');
  const pt = formatUserError(err, 'pt-br');
  assert.match(pt, /Oracle runner: ORA-12541: no listener/);

  const en = formatUserError(err, 'en');
  assert.match(en, /Oracle runner: ORA-12541: no listener/);
});

test('formatUserError: erro desconhecido devolve a mensagem redigida', () => {
  const msg = formatUserError(
    new Error('falha em scott/segredo@host:1521/XE'),
    'pt-br',
    'scott/segredo@host:1521/XE',
  );
  assert.strictEqual(msg, 'falha em scott@host:1521/XE');
});

test('formatUserError: versão e reporter não repetem o detalhe', () => {
  const version = formatUserError(new UtplsqlVersionError('old', '3.0.0'), 'en');
  assert.match(version, /3\.0\.0/);
  assert.doesNotMatch(version, /: old$/);

  const reporter = formatUserError(new ReporterNotFoundError('UT_MISSING'), 'en');
  assert.match(reporter, /UT_MISSING/);
});

test('ConfigurationError: mensagem localizada inclui o detalhe', () => {
  const msg = formatUserError(new ConfigurationError('pool inválido'), 'pt-br');
  assert.match(msg, /pool inválido/);
});
