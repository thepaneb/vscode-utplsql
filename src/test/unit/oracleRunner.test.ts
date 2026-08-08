import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import type { TestCaseResult } from '../../junit';
import { applyResultsFromCases, countResultsFromCases, parseConnString } from '../../oracleRunner';
import type { ItemMeta } from '../../types';

function makeMeta(over: Partial<ItemMeta>): ItemMeta {
  return {
    kind: 'test',
    packageName: 'app',
    procName: 'proc',
    description: 'desc',
    uri: { fsPath: '/x', path: '/x', scheme: 'file' } as any,
    ...over,
  } as ItemMeta;
}

function makeRun() {
  const passed: any[] = [];
  const failed: any[] = [];
  const skipped: any[] = [];
  const errored: any[] = [];
  const output: string[] = [];
  return {
    passed: (t: any, ms?: number) => passed.push({ t, ms }),
    failed: (t: any, m: any, ms?: number) => failed.push({ t, m, ms }),
    skipped: (t: any) => skipped.push(t),
    errored: (t: any, m: any, ms?: number) => errored.push({ t, m, ms }),
    appendOutput: (s: string) => output.push(s),
    enqueued: () => {},
    started: () => {},
    addCoverage: () => {},
    end: () => {},
  };
}

function makeState(metaMap: Map<any, ItemMeta>) {
  return {
    getMeta: (t: any) => metaMap.get(t),
    setMeta: () => {},
    setCoverage: () => {},
    getCoverage: () => [],
    clearCoverage: () => {},
    cachedItems: [] as any[],
  } as any;
}

// ── parseConnString ──────────────────────────────────────────────────

test('parseConnString: string valida', () => {
  const r = parseConnString('UT3/senha@//localhost:1521/freepdb1');
  assert.strictEqual(r.user, 'UT3');
  assert.strictEqual(r.password, 'senha');
  assert.strictEqual(r.connectionString, 'localhost:1521/freepdb1');
});

test('parseConnString: host com ip e porta customizada', () => {
  const r = parseConnString('user/pass@//192.168.1.100:9999/XE');
  assert.strictEqual(r.user, 'user');
  assert.strictEqual(r.password, 'pass');
  assert.strictEqual(r.connectionString, '192.168.1.100:9999/XE');
});

test('parseConnString: servico com underscore e caracteres validos', () => {
  const r = parseConnString('ADMIN/pass_123@//db.example.com:1521/pdb_svc1');
  assert.strictEqual(r.user, 'ADMIN');
  assert.strictEqual(r.password, 'pass_123');
  assert.strictEqual(r.connectionString, 'db.example.com:1521/pdb_svc1');
});

test('parseConnString: formato invalido lanca erro', () => {
  assert.throws(() => parseConnString('invalid'));
  assert.throws(() => parseConnString('user/pass@host'));
  assert.throws(() => parseConnString('user/pass@host:port'));
  assert.throws(() => parseConnString(''));
});

test('parseConnString: hostname com subdominios', () => {
  const r = parseConnString('u/p@//ora-prod.us-east1.company.com:1521/proddb');
  assert.strictEqual(r.user, 'u');
  assert.strictEqual(r.password, 'p');
  assert.strictEqual(r.connectionString, 'ora-prod.us-east1.company.com:1521/proddb');
});

// ── applyResultsFromCases ────────────────────────────────────────────

test('applyResultsFromCases: mapeia passed por packageName|procName', () => {
  const cases: TestCaseResult[] = [
    { classname: 'pkg', name: 't_one', status: 'passed', durationMs: 100 },
  ];
  const item = { id: 't1', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(item, makeMeta({ packageName: 'pkg', procName: 't_one' }));

  const run = makeRun() as any;
  const state = makeState(metaMap);

  const resultMap = applyResultsFromCases(cases, [item as any], run, state);
  assert.strictEqual(resultMap.size, 1);
  assert.strictEqual(resultMap.get('t1')?.status, 'passed');
});

test('applyResultsFromCases: mapeia failed com message', () => {
  const cases: TestCaseResult[] = [
    {
      classname: 'pkg',
      name: 'f_test',
      status: 'failed',
      message: 'expected 1 got 2',
      durationMs: 50,
    },
  ];
  const item = { id: 't2', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(item, makeMeta({ packageName: 'pkg', procName: 'f_test' }));

  const run = makeRun() as any;
  const state = makeState(metaMap);

  const resultMap = applyResultsFromCases(cases, [item as any], run, state);
  assert.strictEqual(resultMap.get('t2')?.status, 'failed');
  assert.strictEqual(resultMap.get('t2')?.message, 'expected 1 got 2');
});

test('applyResultsFromCases: mapeia skipped', () => {
  const cases: TestCaseResult[] = [{ classname: 'pkg', name: 's_me', status: 'skipped' }];
  const item = { id: 't3', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(item, makeMeta({ packageName: 'pkg', procName: 's_me' }));

  const run = makeRun() as any;
  const state = makeState(metaMap);

  const resultMap = applyResultsFromCases(cases, [item as any], run, state);
  assert.strictEqual(resultMap.get('t3')?.status, 'skipped');
});

test('applyResultsFromCases: mapeia errored', () => {
  const cases: TestCaseResult[] = [
    { classname: 'pkg', name: 'boom', status: 'error', message: 'ORA-00001' },
  ];
  const item = { id: 't4', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(item, makeMeta({ packageName: 'pkg', procName: 'boom' }));

  const run = makeRun() as any;
  const state = makeState(metaMap);

  const resultMap = applyResultsFromCases(cases, [item as any], run, state);
  assert.strictEqual(resultMap.get('t4')?.status, 'error');
  assert.strictEqual(resultMap.get('t4')?.message, 'ORA-00001');
});

test('applyResultsFromCases: fallback por description quando procName nao bate', () => {
  const cases: TestCaseResult[] = [{ classname: 'shm.pkg', name: 'Cenario um', status: 'passed' }];
  const item = { id: 't5', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(
    item,
    makeMeta({ packageName: 'pkg', procName: 'diff_proc', description: 'Cenario um' }),
  );

  const run = makeRun() as any;
  const state = makeState(metaMap);

  const resultMap = applyResultsFromCases(cases, [item as any], run, state);
  assert.strictEqual(resultMap.size, 1);
  assert.strictEqual(resultMap.get('t5')?.status, 'passed');
});

test('applyResultsFromCases: fallback por procName sem package', () => {
  const cases: TestCaseResult[] = [
    { classname: 'some_schema.different', name: 'match_by_proc', status: 'passed' },
  ];
  const item = { id: 't6', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(item, makeMeta({ packageName: 'different', procName: 'match_by_proc' }));

  const run = makeRun() as any;
  const state = makeState(metaMap);

  const resultMap = applyResultsFromCases(cases, [item as any], run, state);
  assert.strictEqual(resultMap.get('t6')?.status, 'passed');
});

test('applyResultsFromCases: unmatched items sao skipped', () => {
  const cases: TestCaseResult[] = [];
  const item = { id: 't7', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(item, makeMeta({ packageName: 'pkg', procName: 'no_match' }));

  const run = makeRun() as any;
  const state = makeState(metaMap);

  const resultMap = applyResultsFromCases(cases, [item as any], run, state);
  assert.strictEqual(resultMap.size, 0);
});

test('applyResultsFromCases: multiplos cases com match misto', () => {
  const cases: TestCaseResult[] = [
    { classname: 'pkg', name: 't_a', status: 'passed', durationMs: 10 },
    { classname: 'pkg', name: 't_b', status: 'failed', message: 'err', durationMs: 20 },
    { classname: 'pkg', name: 'diff_proc', status: 'skipped' },
  ];
  const itemA = { id: 'a', children: [] };
  const itemB = { id: 'b', children: [] };
  const itemC = { id: 'c', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(itemA, makeMeta({ packageName: 'pkg', procName: 't_a' }));
  metaMap.set(itemB, makeMeta({ packageName: 'pkg', procName: 't_b' }));
  metaMap.set(itemC, makeMeta({ packageName: 'pkg', procName: 'diff_proc' }));
  // itemC uses JUnit name 'diff_proc' which matches procName

  const run = makeRun() as any;
  const state = makeState(metaMap);

  const resultMap = applyResultsFromCases(cases, [itemA, itemB, itemC] as any, run, state);
  assert.strictEqual(resultMap.size, 3);
  assert.strictEqual(resultMap.get('a')?.status, 'passed');
  assert.strictEqual(resultMap.get('b')?.status, 'failed');
  assert.strictEqual(resultMap.get('b')?.message, 'err');
  assert.strictEqual(resultMap.get('c')?.status, 'skipped');
});

// ── countResultsFromCases ────────────────────────────────────────────

test('countResultsFromCases: conta todos os statuses', () => {
  const cases: TestCaseResult[] = [
    { classname: 'p', name: 'a', status: 'passed', durationMs: 100 },
    { classname: 'p', name: 'b', status: 'failed', durationMs: 50 },
    { classname: 'p', name: 'c', status: 'skipped', durationMs: 0 },
    { classname: 'p', name: 'd', status: 'error', durationMs: 25 },
    { classname: 'p', name: 'e', status: 'passed', durationMs: 10 },
  ];
  const r = countResultsFromCases(cases);
  assert.strictEqual(r.passed, 2);
  assert.strictEqual(r.failed, 1);
  assert.strictEqual(r.skipped, 1);
  assert.strictEqual(r.errored, 1);
  assert.strictEqual(r.totalMs, 185);
});

test('countResultsFromCases: durationMs undefined nao quebra', () => {
  const cases: TestCaseResult[] = [
    { classname: 'p', name: 'a', status: 'passed' },
    { classname: 'p', name: 'b', status: 'failed' },
  ];
  const r = countResultsFromCases(cases);
  assert.strictEqual(r.totalMs, 0);
});

test('countResultsFromCases: array vazio retorna zeros', () => {
  const r = countResultsFromCases([]);
  assert.strictEqual(r.passed, 0);
  assert.strictEqual(r.failed, 0);
  assert.strictEqual(r.skipped, 0);
  assert.strictEqual(r.errored, 0);
  assert.strictEqual(r.totalMs, 0);
});
