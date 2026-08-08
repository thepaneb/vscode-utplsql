import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { SetupValidator } from '../../quickfix';

test('checkCli: retorna false quando arquivo nao existe', () => {
  const v = new SetupValidator();
  assert.strictEqual(v.checkCli('/caminho/inexistente/utplsql'), false);
});

test('checkCli: retorna true quando arquivo existe', () => {
  const v = new SetupValidator();
  assert.strictEqual(v.checkCli(process.execPath), true);
});

test('applyDiagnostics: array vazio nao quebra', () => {
  const v = new SetupValidator();
  assert.doesNotThrow(() => v.applyDiagnostics([]));
});

test('applyDiagnostics: aplica diagnostico unico', () => {
  const v = new SetupValidator();
  const diags = [
    {
      code: 'UTPLSQL_NO_CLI',
      severity: 0,
      message: 'CLI not found',
      command: { title: 'Fix', command: 'test' },
    },
  ];
  assert.doesNotThrow(() => v.applyDiagnostics(diags));
  v.clear();
});

test('applyDiagnostics: multiplos diagnosticos', () => {
  const v = new SetupValidator();
  const diags = [
    { code: 'A', severity: 0, message: 'msg A' },
    { code: 'B', severity: 1, message: 'msg B' },
  ];
  assert.doesNotThrow(() => v.applyDiagnostics(diags));
  v.clear();
});

test('addCoverageDiagnostic: nao quebra', () => {
  const v = new SetupValidator();
  assert.doesNotThrow(() => v.addCoverageDiagnostic());
  v.clear();
});

test('clear: nao quebra', () => {
  const v = new SetupValidator();
  assert.doesNotThrow(() => v.clear());
});

test('dispose: nao quebra', () => {
  const v = new SetupValidator();
  assert.doesNotThrow(() => v.dispose());
});
