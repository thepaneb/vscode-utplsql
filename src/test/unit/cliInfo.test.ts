import assert from 'node:assert';
import { test } from 'node:test';
import { parseInfoOutput, semverLt } from '../../cliInfo';

test('parseInfoOutput: saída completa com CLI, API e DB', () => {
  const stdout = 'cli 3.1.7\nutPLSQL-java-api 3.1.7\nutPLSQL 3.1.2.1913';
  const info = parseInfoOutput(stdout);
  assert.strictEqual(info.cliVersion, '3.1.7');
  assert.strictEqual(info.apiVersion, '3.1.7');
  assert.strictEqual(info.dbVersion, '3.1.2.1913');
});

test('parseInfoOutput: sem versao do banco', () => {
  const stdout = 'cli 2.0.0\nutPLSQL-java-api 2.0.0';
  const info = parseInfoOutput(stdout);
  assert.strictEqual(info.cliVersion, '2.0.0');
  assert.strictEqual(info.apiVersion, '2.0.0');
  assert.strictEqual(info.dbVersion, undefined);
});

test('parseInfoOutput: saida vazia retorna desconhecida', () => {
  const info = parseInfoOutput('');
  assert.strictEqual(info.cliVersion, 'desconhecida');
  assert.strictEqual(info.apiVersion, 'desconhecida');
  assert.strictEqual(info.dbVersion, undefined);
});

test('parseInfoOutput: linhas fora de ordem', () => {
  const stdout = 'utPLSQL-java-api 3.1.7\ncli 3.1.7\nutPLSQL 3.1.2.1913';
  const info = parseInfoOutput(stdout);
  assert.strictEqual(info.cliVersion, '3.1.7');
  assert.strictEqual(info.dbVersion, '3.1.2.1913');
});

test('semverLt: menor que', () => {
  assert.ok(semverLt('3.0.9', '3.1.0'));
  assert.ok(semverLt('2.9.9', '3.0.0'));
  assert.ok(semverLt('3.1.0', '3.1.1'));
});

test('semverLt: maior ou igual retorna false', () => {
  assert.strictEqual(semverLt('3.1.0', '3.0.9'), false);
  assert.strictEqual(semverLt('3.1.0', '3.1.0'), false);
});

test('semverLt: versoes com partes desiguais', () => {
  assert.ok(semverLt('3.0', '3.0.1'));
  assert.strictEqual(semverLt('3.0.1', '3.0'), false);
});

test('semverLt: versao longa vs curta', () => {
  assert.ok(semverLt('3.1.0.1234', '3.1.1'));
  assert.strictEqual(semverLt('3.1.1', '3.1.0.1234'), false);
});
