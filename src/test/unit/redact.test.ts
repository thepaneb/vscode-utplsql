import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { maskConnection, redactConnection } from '../../redact';

test('maskConnection: remove a senha preservando usuário/host', () => {
  assert.strictEqual(
    maskConnection('scott/tiger@//localhost:1521/XE'),
    'scott@//localhost:1521/XE',
  );
  assert.strictEqual(maskConnection('scott/t/ig@//host/svc'), 'scott@//host/svc');
  assert.strictEqual(maskConnection('scott/tiger@https://host'), 'scott@https://host');
});

test('maskConnection: conexão sem @ corta após o primeiro /', () => {
  assert.strictEqual(maskConnection('scott/tiger'), 'scott');
  assert.strictEqual(maskConnection('scott'), 'scott');
  assert.strictEqual(maskConnection(''), '');
});

test('maskConnection: conexão sem senha fica intacta', () => {
  assert.strictEqual(maskConnection('scott@//host/svc'), 'scott@//host/svc');
});

test('redactConnection: substitui a ocorrência exata (inclusive múltipla)', () => {
  const conn = 'scott/tiger@//host:1521/svc';
  const msg = `erro em ${conn}; retry ${conn}`;
  assert.strictEqual(
    redactConnection(msg, conn),
    'erro em scott@//host:1521/svc; retry scott@//host:1521/svc',
  );
});

test('redactConnection: mensagem sem a credencial fica intacta', () => {
  const conn = 'scott/tiger@//host:1521/svc';
  assert.strictEqual(
    redactConnection('ORA-00942: table or view does not exist', conn),
    'ORA-00942: table or view does not exist',
  );
  assert.strictEqual(redactConnection('', conn), '');
});

test('redactConnection: connection vazia ou sem senha não altera a mensagem', () => {
  assert.strictEqual(redactConnection('erro', ''), 'erro');
  assert.strictEqual(redactConnection('erro', 'scott@//host/svc'), 'erro');
});

test('redactConnection: não usa heurística (só a connection conhecida)', () => {
  const conn = 'scott/tiger@//host/svc';
  const msg = 'outro/user@//host/svc';
  assert.strictEqual(redactConnection(msg, conn), msg);
});
