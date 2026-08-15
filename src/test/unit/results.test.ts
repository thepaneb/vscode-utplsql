import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import type { TestCaseResult } from '../../junit';
import { applyCoverageFromXml, applyResultsFromCases, resolveStackFrameToUri } from '../../results';
import type { ItemMeta } from '../../types';
import * as vscode from '../vscode-stub';

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
  const passedList: any[] = [];
  const failedList: any[] = [];
  const skippedList: any[] = [];
  const erroredList: any[] = [];
  const output: string[] = [];
  return {
    passed: (t: any, ms?: number) => passedList.push({ t, ms }),
    failed: (t: any, m: any, ms?: number) => failedList.push({ t, m, ms }),
    skipped: (t: any) => skippedList.push(t),
    errored: (t: any, m: any, ms?: number) => erroredList.push({ t, m, ms }),
    appendOutput: (s: string) => output.push(s),
    enqueued: () => {},
    started: () => {},
    addCoverage: () => {},
    end: () => {},
    passedList,
    failedList,
    skippedList,
    erroredList,
    output,
  };
}

function makeState(metaMap: Map<any, ItemMeta>, cachedItems: any[] = []) {
  return {
    getMeta: (t: any) => metaMap.get(t),
    setMeta: () => {},
    setCoverage: () => {},
    getCoverage: () => [],
    clearCoverage: () => {},
    cachedItems,
  } as any;
}

// ── resolveStackFrameToUri ───────────────────────────────────────────

test('resolveStackFrameToUri: encontra suite nos cachedItems', () => {
  const suiteUri = { fsPath: '/ws/tests/ut_app.pks', path: '/ws/tests/ut_app.pks', scheme: 'file' };
  const suiteItem = { id: 'suite:app' };
  const state = makeState(
    new Map([[suiteItem, makeMeta({ kind: 'suite', packageName: 'app', uri: suiteUri as any })]]),
    [suiteItem],
  );
  const loc = resolveStackFrameToUri([{ objectName: 'APP', line: 42 }], state);
  assert.ok(loc);
  assert.strictEqual(loc.uri.fsPath, '/ws/tests/ut_app.pks');
  assert.strictEqual(loc.range.start.line, 41);
});

test('resolveStackFrameToUri: ignora frames internos UT_', () => {
  const suiteUri = { fsPath: '/ws/ut_app.pks', path: '/ws/ut_app.pks', scheme: 'file' };
  const suiteItem = { id: 'suite:app' };
  const state = makeState(
    new Map([[suiteItem, makeMeta({ kind: 'suite', packageName: 'app', uri: suiteUri as any })]]),
    [suiteItem],
  );
  const loc = resolveStackFrameToUri(
    [
      { objectName: 'UT_ASSERT', line: 10 },
      { objectName: 'UT3.UT_UTILS', line: 11 },
      { objectName: 'APP', line: 42 },
    ],
    state,
  );
  assert.ok(loc);
  assert.strictEqual(loc.range.start.line, 41);
});

test('resolveStackFrameToUri: fallback para {objName}.pks no workspace', () => {
  vscode.workspace.__setWorkspaceFolders([{ uri: { fsPath: '/ws' }, name: 'ws', index: 0 }]);
  try {
    const state = makeState(new Map(), []);
    const loc = resolveStackFrameToUri([{ objectName: 'APP_PKG', line: 7 }], state);
    assert.ok(loc);
    assert.strictEqual(loc.uri.fsPath, '/ws/app_pkg.pks');
    assert.strictEqual(loc.range.start.line, 6);
  } finally {
    vscode.workspace.__setWorkspaceFolders(undefined);
  }
});

test('resolveStackFrameToUri: undefined quando so ha frames internos', () => {
  vscode.workspace.__setWorkspaceFolders(undefined);
  const state = makeState(new Map(), []);
  const loc = resolveStackFrameToUri([{ objectName: 'UT_ASSERT', line: 10 }], state);
  assert.strictEqual(loc, undefined);
});

// ── applyResultsFromCases ────────────────────────────────────────────

test('applyResultsFromCases: failed com stackFrames ganha location', () => {
  const cases: TestCaseResult[] = [
    {
      classname: 'shm.app',
      name: 't_broken',
      status: 'failed',
      message: 'expected 1 got 2',
      stackFrames: [{ objectName: 'APP', line: 42 }],
    },
  ];
  const suiteUri = { fsPath: '/ws/ut_app.pks', path: '/ws/ut_app.pks', scheme: 'file' };
  const suiteItem = { id: 'suite:app' };
  const item = { id: 't1', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(suiteItem, makeMeta({ kind: 'suite', packageName: 'app', uri: suiteUri as any }));
  metaMap.set(item, makeMeta({ packageName: 'app', procName: 't_broken' }));

  const run = makeRun() as any;
  const state = makeState(metaMap, [suiteItem]);

  const resultMap = applyResultsFromCases(cases, [item as any], run, state);
  assert.strictEqual(resultMap.get('t1')?.status, 'failed');
  assert.strictEqual(run.failedList.length, 1);
  const msg = run.failedList[0].m as any;
  assert.ok(msg.location, 'TestMessage deveria ter location');
  assert.strictEqual(msg.location.uri.fsPath, '/ws/ut_app.pks');
});

test('applyResultsFromCases: unmatched gera aviso e skipped', () => {
  const cases: TestCaseResult[] = [];
  const item = { id: 't_sem_match', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(item, makeMeta({ packageName: 'pkg', procName: 'sem_match' }));

  const run = makeRun() as any;
  const state = makeState(metaMap);

  const resultMap = applyResultsFromCases(cases, [item as any], run, state);
  assert.strictEqual(resultMap.size, 0);
  assert.strictEqual(run.skippedList.length, 1);
  assert.strictEqual(run.skippedList[0].id, 't_sem_match');
  const warnings = run.output.filter((s: string) => s.includes('Nenhum resultado JUnit'));
  assert.strictEqual(warnings.length, 1);
});

// ── applyCoverageFromXml ─────────────────────────────────────────────

const COV_XML = `<?xml version="1.0"?>
<coverage>
  <packages>
    <package name="pkg">
      <classes>
        <class name="app" filename="packages/app.sql">
          <lines>
            <line number="1" hits="1"/>
            <line number="2" hits="0"/>
          </lines>
        </class>
      </classes>
    </package>
  </packages>
</coverage>`;

test('applyCoverageFromXml: sem folders nao mapeia e emite aviso', () => {
  const run = makeRun() as any;
  const state = makeState(new Map());
  let cleared = 0;
  state.clearCoverage = () => {
    cleared++;
  };

  applyCoverageFromXml(COV_XML, 'install', '/root', run, state, []);
  assert.strictEqual(cleared, 1);
  const warnings = run.output.filter((s: string) => s.includes('nenhum arquivo mapeado'));
  assert.strictEqual(warnings.length, 1);
});
