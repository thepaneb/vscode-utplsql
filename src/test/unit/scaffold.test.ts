import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import {
  buildSuiteTemplate,
  DEFAULT_GENERATE_OPTIONS,
  deriveObjectName,
  deriveRoutines,
  deriveSuiteName,
  type GenerateOptions,
} from '../../scaffold.js';
import { parseSuiteText } from '../../suiteParser.js';

const opts = (over: Partial<GenerateOptions> = {}): GenerateOptions => ({
  ...DEFAULT_GENERATE_OPTIONS,
  ...over,
});

const SPEC = `CREATE OR REPLACE PACKAGE app_pkg IS
  --%suite(Testes de app_pkg)

  PROCEDURE is_valid(p_id IN NUMBER);
  FUNCTION total RETURN NUMBER;
  PROCEDURE is_valid(p_name IN VARCHAR2);
END app_pkg;
`;

test('scaffold: deriveObjectName tira diretórios e extensão (case-insensitive)', () => {
  assert.strictEqual(deriveObjectName('app_pkg.pkb'), 'app_pkg');
  assert.strictEqual(deriveObjectName('app_pkg.PKS'), 'app_pkg');
  assert.strictEqual(deriveObjectName('C:\\proj\\src\\app_pkg.pks'), 'app_pkg');
  assert.strictEqual(deriveObjectName('src/db/query.sql'), 'query');
  assert.strictEqual(deriveObjectName('noext'), 'noext');
});

test('scaffold: deriveSuiteName aplica prefixo/sufixo sem duplicar', () => {
  assert.strictEqual(deriveSuiteName('app_pkg', opts()), 'ut_app_pkg');
  // idempotente: já é uma suíte ut_*
  assert.strictEqual(deriveSuiteName('ut_app_pkg', opts()), 'ut_app_pkg');
  assert.strictEqual(
    deriveSuiteName('ut_app_pkg', opts({ testPackageSuffix: '_tests' })),
    'ut_app_pkg_tests',
  );
  assert.strictEqual(
    deriveSuiteName('app_pkg', opts({ testPackagePrefix: 'test_', testPackageSuffix: '_spec' })),
    'test_app_pkg_spec',
  );
  assert.strictEqual(deriveSuiteName('app_pkg', opts({ testPackagePrefix: '' })), 'app_pkg');
  // não duplica sufixo já presente
  assert.strictEqual(
    deriveSuiteName('app_pkg_spec', opts({ testPackageSuffix: '_spec' })),
    'ut_app_pkg_spec',
  );
});

test('scaffold: deriveRoutines lista rotinas sem duplicar (overloads) e ignora comentários', () => {
  assert.deepStrictEqual(deriveRoutines(SPEC), ['is_valid', 'total']);
  // corpo: a mesma rotina declarada e implementada conta uma vez
  assert.deepStrictEqual(deriveRoutines(`${SPEC}\nCREATE OR REPLACE PACKAGE BODY app_pkg IS`), [
    'is_valid',
    'total',
  ]);
  assert.deepStrictEqual(deriveRoutines('-- PROCEDURE fake;\nPROCEDURE real;'), ['real']);
});

test('scaffold: buildSuiteTemplate gera um %test por rotina, parseável', () => {
  const sql = buildSuiteTemplate('app_pkg', deriveRoutines(SPEC), opts());
  assert.strictEqual(
    sql,
    [
      'CREATE OR REPLACE PACKAGE ut_app_pkg IS',
      '  --%suite(app_pkg)',
      '',
      '  --%test(is_valid)',
      '  PROCEDURE is_valid; -- TODO',
      '',
      '  --%test(total)',
      '  PROCEDURE total; -- TODO',
      'END ut_app_pkg;',
      '/',
      '',
    ].join('\n'),
  );
  const parsed = parseSuiteText(sql);
  assert.ok(parsed, 'a saída deve ser reconhecida como suite utPLSQL');
  assert.strictEqual(parsed?.packageName, 'ut_app_pkg');
  assert.deepStrictEqual(
    parsed?.tests.map((t) => t.procName),
    ['is_valid', 'total'],
  );
});

test('scaffold: sem rotinas gera o esqueleto (PRD-59)', () => {
  const sql = buildSuiteTemplate('app_pkg', [], opts());
  assert.strictEqual(
    sql,
    [
      'CREATE OR REPLACE PACKAGE ut_app_pkg IS',
      '  --%suite(app_pkg)',
      '',
      '  --%test(TODO)',
      '  PROCEDURE dummy; -- TODO',
      'END ut_app_pkg;',
      '/',
      '',
    ].join('\n'),
  );
  const parsed = parseSuiteText(sql);
  assert.strictEqual(parsed?.packageName, 'ut_app_pkg');
  assert.deepStrictEqual(
    parsed?.tests.map((t) => t.procName),
    ['dummy'],
  );
});

test('scaffold: numberOfTestsPerUnit gera N %test por rotina com nomes únicos', () => {
  const sql = buildSuiteTemplate('app_pkg', ['add'], opts({ numberOfTestsPerUnit: 3 }));
  const parsed = parseSuiteText(sql);
  assert.strictEqual(parsed?.tests.length, 3);
  // sem colisão de PROCEDURE (o pacote gerado precisa compilar)
  const procs = parsed?.tests.map((t) => t.procName) ?? [];
  assert.deepStrictEqual(procs, ['add', 'add_2', 'add_3']);
  assert.strictEqual(new Set(procs).size, 3);
});

test('scaffold: generateComments=false não emite -- TODO', () => {
  const sql = buildSuiteTemplate('app_pkg', ['add'], opts({ generateComments: false }));
  assert.ok(!sql.includes('TODO'));
  assert.ok(sql.includes('PROCEDURE add;'));
});

test('scaffold: opções inválidas caem em valores seguros', () => {
  const sql = buildSuiteTemplate('app_pkg', ['add'], opts({ numberOfTestsPerUnit: 0 }));
  const parsed = parseSuiteText(sql);
  // 0 (ou negativo) → 1 teste por rotina
  assert.strictEqual(parsed?.tests.length, 1);
});
