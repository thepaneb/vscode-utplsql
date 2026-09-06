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
  const coverageList: unknown[] = [];
  return {
    passed: (t: any, ms?: number) => passedList.push({ t, ms }),
    failed: (t: any, m: any, ms?: number) => failedList.push({ t, m, ms }),
    skipped: (t: any) => skippedList.push(t),
    errored: (t: any, m: any, ms?: number) => erroredList.push({ t, m, ms }),
    appendOutput: (s: string) => output.push(s),
    enqueued: () => {},
    started: () => {},
    addCoverage: (fc: unknown) => coverageList.push(fc),
    end: () => {},
    passedList,
    failedList,
    skippedList,
    erroredList,
    output,
    coverageList,
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

test('resolveStackFrameToUri: undefined sem cachedItems e sem workspace folders', () => {
  vscode.workspace.__setWorkspaceFolders(undefined);
  const state = makeState(new Map(), []);
  const loc = resolveStackFrameToUri([{ objectName: 'APP', line: 42 }], state);
  assert.strictEqual(loc, undefined);
});

test('applyResultsFromCases: error com stackFrames ganha location', () => {
  const cases: TestCaseResult[] = [
    {
      classname: 'shm.app',
      name: 't_boom',
      status: 'error',
      message: 'ORA-00001',
      stackFrames: [{ objectName: 'APP', line: 10 }],
    },
  ];
  const suiteUri = { fsPath: '/ws/ut_app.pks', path: '/ws/ut_app.pks', scheme: 'file' };
  const suiteItem = { id: 'suite:app' };
  const item = { id: 't1', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(suiteItem, makeMeta({ kind: 'suite', packageName: 'app', uri: suiteUri as any }));
  metaMap.set(item, makeMeta({ packageName: 'app', procName: 't_boom' }));

  const run = makeRun() as any;
  const state = makeState(metaMap, [suiteItem]);

  const resultMap = applyResultsFromCases(cases, [item as any], run, state);
  assert.strictEqual(resultMap.get('t1')?.status, 'error');
  assert.strictEqual(run.erroredList.length, 1);
  const msg = run.erroredList[0].m as any;
  assert.ok(msg.location, 'TestMessage deveria ter location');
  assert.strictEqual(msg.location.range.start.line, 9);
});

test('applyCoverageFromXml: mapeia arquivo quando folders resolve', async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-map-'));
  const installDir = path.join(tmpDir, 'install', 'packages');
  fs.mkdirSync(installDir, { recursive: true });
  fs.writeFileSync(path.join(installDir, 'app.sql'), 'create package app;');

  try {
    const run = makeRun() as any;
    const state = makeState(new Map());
    const setCoverageCalls: [string, unknown][] = [];
    state.setCoverage = (k: string, v: unknown) => setCoverageCalls.push([k, v]);

    const folders = [{ uri: { fsPath: tmpDir }, name: 'tmp', index: 0 }];
    applyCoverageFromXml(COV_XML, 'install', tmpDir, run, state, folders as any);

    assert.strictEqual(run.coverageList.length, 1);
    assert.strictEqual(setCoverageCalls.length, 1);
    const warnings = run.output.filter((s: string) => s.includes('nenhum arquivo mapeado'));
    assert.strictEqual(warnings.length, 0);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('applyCoverageFromXml: emite DeclarationCoverage derivado do fonte', async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-decl-'));
  const installDir = path.join(tmpDir, 'install', 'packages');
  fs.mkdirSync(installDir, { recursive: true });
  fs.writeFileSync(
    path.join(installDir, 'app.sql'),
    `PACKAGE BODY app IS
  PROCEDURE calc IS
  BEGIN
    NULL;
  END;
  FUNCTION get_total RETURN NUMBER IS
  BEGIN
    RETURN 1;
  END;
END;`,
  );
  const xml = `<?xml version="1.0"?>
<coverage>
  <packages>
    <package name="pkg">
      <classes>
        <class name="app" filename="packages/app.sql">
          <lines>
            <line number="3" hits="1"/>
            <line number="8" hits="0"/>
          </lines>
        </class>
      </classes>
    </package>
  </packages>
</coverage>`;

  try {
    const run = makeRun() as any;
    const state = makeState(new Map());
    const setCoverageCalls: [string, unknown][] = [];
    state.setCoverage = (k: string, v: unknown) => setCoverageCalls.push([k, v]);

    const folders = [{ uri: { fsPath: tmpDir }, name: 'tmp', index: 0 }];
    applyCoverageFromXml(xml, 'install', tmpDir, run, state, folders as any);

    assert.strictEqual(run.coverageList.length, 1);
    const details = setCoverageCalls[0][1] as unknown[];
    const declarations = details.filter(
      // biome-ignore lint/suspicious/noExplicitAny: detail de cobertura stub
      (d) => (d as any).constructor?.name === 'DeclarationCoverage',
    );
    assert.strictEqual(declarations.length, 2);
    // calc (linha 2) tem hits na linha 3; get_total não → só calc executada
    const execNames = declarations.map(
      // biome-ignore lint/suspicious/noExplicitAny: detail de cobertura stub
      (d) => [(d as any).name, (d as any).executed],
    );
    assert.deepStrictEqual(execNames, [
      ['calc', true],
      ['get_total', false],
    ]);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('applyCoverageFromXml: classe sem linhas emite aviso de nao mapeado', () => {
  const xml = `<?xml version="1.0"?>
<coverage>
  <packages>
    <package name="pkg">
      <classes>
        <class name="app" filename="packages/app.sql">
        </class>
      </classes>
    </package>
  </packages>
</coverage>`;
  const run = makeRun() as any;
  const state = makeState(new Map());
  applyCoverageFromXml(xml, 'install', '/root', run, state, []);
  const warnings = run.output.filter((s: string) => s.includes('nenhum arquivo mapeado'));
  assert.strictEqual(warnings.length, 1);
});

test('resolveStackFrameToUri: itens de teste são ignorados (continue)', () => {
  vscode.workspace.__setWorkspaceFolders(undefined);
  const suiteItem = { id: 'suite:app' };
  const testItem = { id: 't1', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(testItem, makeMeta({ packageName: 'app', procName: 't1' }));
  metaMap.set(suiteItem, makeMeta({ kind: 'suite', packageName: 'app' }));
  const state = makeState(metaMap, [testItem as any]);
  const loc = resolveStackFrameToUri([{ objectName: 'APP', line: 42 }], state);
  assert.strictEqual(loc, undefined);
});

test('resolveStackFrameToUri: com workspace folders retorna Location', () => {
  const folders = [{ uri: { fsPath: '/ws' }, name: 'ws', index: 0 }];
  vscode.workspace.__setWorkspaceFolders(folders as any);
  try {
    const state = makeState(new Map(), []);
    const loc = resolveStackFrameToUri([{ objectName: 'APP', line: 10 }], state);
    assert.ok(loc, 'deveria resolver via workspace folder');
    assert.strictEqual((loc as any).uri.fsPath, '/ws/app.pks');
  } finally {
    vscode.workspace.__setWorkspaceFolders(undefined);
  }
});

test('applyResultsFromCases: failed sem message usa "Falhou"', () => {
  const cases: TestCaseResult[] = [
    { classname: 'pkg', name: 't1', status: 'failed', durationMs: 5 },
  ];
  const item = { id: 't1', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(item, makeMeta({ packageName: 'pkg', procName: 't1' }));
  const run = makeRun() as any;
  const state = makeState(metaMap);
  applyResultsFromCases(cases, [item as any], run, state);
  assert.strictEqual(run.failedList.length, 1);
  assert.strictEqual(run.failedList[0].m.message, 'Falhou');
});

test('applyResultsFromCases: failed com stackFrames ganha location', () => {
  const cases: TestCaseResult[] = [
    {
      classname: 'pkg',
      name: 't1',
      status: 'failed',
      message: 'x',
      stackFrames: [{ objectName: 'APP', line: 9 }],
    },
  ];
  const suiteUri = { fsPath: '/ws/ut_app.pks', path: '/ws/ut_app.pks', scheme: 'file' };
  const suiteItem = { id: 'suite:app' };
  const item = { id: 't1', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(suiteItem, makeMeta({ kind: 'suite', packageName: 'app', uri: suiteUri as any }));
  metaMap.set(item, makeMeta({ packageName: 'app', procName: 't1' }));
  const run = makeRun() as any;
  const state = makeState(metaMap, [suiteItem as any]);
  applyResultsFromCases(cases, [item as any], run, state);
  const msg = run.failedList[0].m as any;
  assert.ok(msg.location, 'failed com stack deveria ter location');
});

test('resolveStackFrameToUri: item não correspondente cai para workspace folders', () => {
  const folders = [{ uri: { fsPath: '/ws' }, name: 'ws', index: 0 }];
  vscode.workspace.__setWorkspaceFolders(folders as any);
  try {
    const suiteItem = { id: 'suite:other' };
    const metaMap = new Map<any, ItemMeta>();
    metaMap.set(suiteItem, makeMeta({ kind: 'suite', packageName: 'other' }));
    const state = makeState(metaMap, [suiteItem as any]);
    const loc = resolveStackFrameToUri([{ objectName: 'APP', line: 3 }], state);
    assert.ok(loc, 'deveria resolver via workspace folders');
  } finally {
    vscode.workspace.__setWorkspaceFolders(undefined);
  }
});

test('applyResultsFromCases: error sem message usa "Erro"', () => {
  const cases: TestCaseResult[] = [
    { classname: 'pkg', name: 't1', status: 'error', durationMs: 5 },
  ];
  const item = { id: 't1', children: [] };
  const metaMap = new Map<any, ItemMeta>();
  metaMap.set(item, makeMeta({ packageName: 'pkg', procName: 't1' }));
  const run = makeRun() as any;
  const state = makeState(metaMap);
  applyResultsFromCases(cases, [item as any], run, state);
  assert.strictEqual(run.erroredList.length, 1);
  assert.strictEqual(run.erroredList[0].m.message, 'Erro');
});
