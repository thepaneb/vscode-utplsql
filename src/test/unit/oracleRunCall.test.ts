import * as assert from 'node:assert';
import { test } from 'node:test';
import {
  buildCoverageScope,
  buildRandomOrderParams,
  buildReporterList,
  buildRunCall,
  exportReporterCall,
} from '../../oracleRunCall';

const oracle = {
  BIND_IN: 3001,
  STRING: 2001,
  DB_TYPE_BOOLEAN: 2009,
  NUMBER: 2010,
} as unknown as typeof import('oracledb');

test('exportReporterCall: só inclui parâmetros da allowlist', () => {
  const binds: Record<string, import('oracledb').BindParameter> = {};
  assert.strictEqual(
    exportReporterCall('ut_documentation_reporter', 'AL32UTF8', true, binds, oracle),
    'ut_documentation_reporter(a_client_character_set => :exportCharset, a_color_console => :exportColor)',
  );
  assert.deepStrictEqual(binds.exportCharset, { dir: 3001, type: 2001, val: 'AL32UTF8' });
  assert.deepStrictEqual(binds.exportColor, { dir: 3001, type: 2009, val: true });

  const other: Record<string, import('oracledb').BindParameter> = {};
  assert.strictEqual(
    exportReporterCall('ut_coverage_cobertura_reporter', 'AL32UTF8', true, other, oracle),
    'ut_coverage_cobertura_reporter()',
  );
  assert.deepStrictEqual(other, {});
});

test('buildReporterList: default, cobertura e HTML', () => {
  const list = buildReporterList({
    exporting: false,
    coverageEnabled: true,
    htmlEnabled: true,
    knownReporters: [],
    oracledb: oracle,
  });
  assert.deepStrictEqual(list.runners, [
    'ut_documentation_reporter()',
    'ut_junit_reporter()',
    'ut_coverage_cobertura_reporter()',
    'ut_coverage_html_reporter()',
  ]);
});

test('buildReporterList: export usa só o reporter escolhido', () => {
  const list = buildReporterList({
    exporting: true,
    exportReporter: { name: 'ut_sonar_test_reporter', charset: 'UTF-8' },
    coverageEnabled: false,
    htmlEnabled: false,
    knownReporters: [],
    oracledb: oracle,
  });
  assert.deepStrictEqual(list.runners, [
    'ut_sonar_test_reporter(a_client_character_set => :exportCharset)',
  ]);
  assert.deepStrictEqual(list.binds.exportCharset, { dir: 3001, type: 2001, val: 'UTF-8' });
});

test('buildReporterList: ignora inválidos/duplicados/desconhecidos', () => {
  const list = buildReporterList({
    exporting: false,
    coverageEnabled: false,
    htmlEnabled: false,
    additionalReporters: [
      'ut_documentation_reporter',
      'ut_teamcity_reporter',
      'bad-name',
      'ut_missing_reporter',
    ],
    knownReporters: ['UT_TEAMCITY_REPORTER'],
    oracledb: oracle,
  });
  assert.deepStrictEqual(list.runners, [
    'ut_documentation_reporter()',
    'ut_junit_reporter()',
    'ut_teamcity_reporter()',
  ]);
  assert.deepStrictEqual(list.invalid, ['bad-name']);
  assert.deepStrictEqual(list.unknown, ['ut_missing_reporter']);
});

test('buildCoverageScope: desabilitado devolve null', () => {
  const scope = buildCoverageScope(oracle, { enabled: false, owner: 'APP' });
  assert.deepStrictEqual(scope, { schemesArg: 'null', scopeParams: '', binds: {} });
});

test('buildCoverageScope: schemes + escopo fino', () => {
  const scope = buildCoverageScope(oracle, {
    enabled: true,
    owner: 'APP',
    schemes: ['APP', 'OTHER'],
    includeObjects: ['APP.A'],
    excludeObjects: ['APP.B'],
    includeSchemaExpr: '^APP$',
    includeObjectExpr: '^A',
    excludeSchemaExpr: '^UT',
    excludeObjectExpr: '^UT_',
  });
  assert.strictEqual(scope.schemesArg, ':schemes');
  assert.match(scope.scopeParams, /a_include_objects => :includeObjects/);
  assert.match(scope.scopeParams, /a_exclude_object_expr => :excludeObjectExpr/);
  assert.deepStrictEqual(scope.binds.schemes, {
    dir: 3001,
    type: 'UT_VARCHAR2_LIST',
    val: ['APP', 'OTHER'],
  });
  assert.deepStrictEqual(scope.binds.includeObjects, {
    dir: 3001,
    type: 'UT_VARCHAR2_LIST',
    val: ['APP.A'],
  });
});

test('buildRandomOrderParams: desabilitado e com seed', () => {
  assert.deepStrictEqual(buildRandomOrderParams(oracle, {}), {
    params: '',
    binds: {},
    seed: 0,
  });
  const enabled = buildRandomOrderParams(oracle, { randomOrder: true, randomOrderSeed: 42 });
  assert.deepStrictEqual(enabled.binds.randomOrder, { dir: 3001, type: 2009, val: true });
  assert.deepStrictEqual(enabled.binds.randomSeed, { dir: 3001, type: 2010, val: 42 });
  assert.match(enabled.params, /a_random_test_order => :randomOrder/);
});

test('buildRunCall: PL/SQL e binds idênticos ao contrato', () => {
  const call = buildRunCall(oracle, {
    pathArgs: ['pkg', 'pkg.proc'],
    runners: ['ut_documentation_reporter()', 'ut_junit_reporter()'],
    schemesArg: ':schemes',
    scopeParams: ',\n      a_include_objects => :includeObjects',
    randomOrderParams:
      ',\n      a_random_test_order => :randomOrder,\n      a_random_test_order_seed => :randomSeed',
    tags: 'fast & !slow',
    binds: { exportCharset: { dir: 3001, type: 2001, val: 'UTF-8' } },
  });
  assert.match(call.plsql, /a_paths => :paths/);
  assert.match(
    call.plsql,
    /a_reporters => ut_reporters\(ut_documentation_reporter\(\),ut_junit_reporter\(\)\)/,
  );
  assert.match(call.plsql, /a_coverage_schemes => :schemes,\n {6}a_include_objects/);
  assert.match(call.plsql, /a_tags => :tags,\n {6}a_random_test_order/);
  assert.deepStrictEqual(call.binds.tags, { dir: 3001, type: 2001, val: 'fast & !slow' });
  assert.deepStrictEqual(call.binds.paths, {
    dir: 3001,
    type: 'UT_VARCHAR2_LIST',
    val: ['pkg', 'pkg.proc'],
  });
  assert.deepStrictEqual(call.binds.exportCharset, { dir: 3001, type: 2001, val: 'UTF-8' });
});

test('buildRunCall: sem paths/tags/cobertura mantém null', () => {
  const call = buildRunCall(oracle, {
    pathArgs: [],
    runners: ['ut_documentation_reporter()'],
    schemesArg: 'null',
  });
  assert.match(call.plsql, /a_paths => null/);
  assert.match(call.plsql, /a_coverage_schemes => null/);
  assert.doesNotMatch(call.plsql, /a_random_test_order/);
  assert.deepStrictEqual(call.binds.tags, { dir: 3001, type: 2001, val: null });
});
