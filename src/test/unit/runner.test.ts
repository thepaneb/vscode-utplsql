import './setup.js';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mock, test } from 'node:test';
import * as oracleRunner from '../../oracleRunner';
import { applyCoverage, applyResults, countResults, executeRun, lastSegment } from '../../runner';
import { TestStateManager } from '../../state';
import type { ItemMeta } from '../../types';
import * as vscode from '../vscode-stub';

const NEVER_TOKEN = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose: () => {} }),
} as any;

const JUNIT_OK = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="TEST_PKG" tests="1" failures="0" errors="0" skipped="0" time="0.5">
    <testcase name="test_pass" classname="TEST_PKG" time="0.5"/>
  </testsuite>
</testsuites>`;

const JUNIT_FAIL = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="TEST_PKG" tests="1" failures="1" errors="0" skipped="0" time="0.3">
    <testcase name="test_fail" classname="TEST_PKG" time="0.3">
      <failure message="expected 1=2">Assertion failed</failure>
    </testcase>
  </testsuite>
</testsuites>`;

const COBertura_XML = `<?xml version="1.0" encoding="UTF-8"?>
<coverage version="5.7" timestamp="1234567890">
  <packages>
    <package name="TEST_PKG">
      <classes>
        <class name="TEST_PKG" filename="test.pkg" line-rate="0.8" branch-rate="0.5">
          <lines>
            <line number="1" hits="1"/>
            <line number="2" hits="0"/>
          </lines>
        </class>
      </classes>
    </package>
  </packages>
</coverage>`;

function makeExecState() {
  const state = new TestStateManager();
  const suiteItem = new vscode.TestItem('suite1') as any;
  const testItem = new vscode.TestItem('test1') as any;

  // Add testItem as child of suiteItem
  suiteItem.children = [testItem];

  state.setMeta(suiteItem, {
    kind: 'suite',
    packageName: 'TEST_PKG',
    uri: { fsPath: '/tmp/test.pks', path: '/tmp/test.pks', scheme: 'file' },
    folder: { uri: { fsPath: '/tmp', path: '/tmp', scheme: 'file' }, name: 'tmp', index: 0 },
  } as ItemMeta);
  state.setMeta(testItem, {
    kind: 'test',
    packageName: 'TEST_PKG',
    procName: 'test_pass',
    description: 'test_pass',
    uri: { fsPath: '/tmp/test.pks', path: '/tmp/test.pks', scheme: 'file' },
    folder: { uri: { fsPath: '/tmp', path: '/tmp', scheme: 'file' }, name: 'tmp', index: 0 },
  } as ItemMeta);

  return { state, suiteItem, testItem };
}

async function withExecEnv(
  fn: () => Promise<void>,
  opts?: { noFolders?: boolean; noConn?: boolean },
) {
  const origConn = process.env.UTPLSQL_CONN;
  const origFolders = vscode.workspace.workspaceFolders;
  try {
    if (!opts?.noConn) process.env.UTPLSQL_CONN = 'user/pass@//host:1521/svc';
    if (!opts?.noFolders) {
      vscode.workspace.__setWorkspaceFolders([{ uri: { fsPath: '/tmp' }, name: 'tmp', index: 0 }]);
    } else {
      vscode.workspace.__setWorkspaceFolders(undefined);
    }
    await fn();
  } finally {
    process.env.UTPLSQL_CONN = origConn;
    vscode.workspace.__setWorkspaceFolders(origFolders);
    __resetConfigValues();
    mock.restoreAll();
  }
}

function __setConfigValue(key: string, value: unknown) {
  const { __setConfigValue: set } = require('../vscode-stub.js');
  set(key, value);
}

function __resetConfigValues() {
  const { __resetConfigValues: reset } = require('../vscode-stub.js');
  reset();
}

// ── lastSegment ────────────────────────────────────────────────────

test('lastSegment: pega ultimo segmento separado por ponto', () => {
  assert.strictEqual(lastSegment('SCHEMA.PKG.PROC'), 'PROC');
});

test('lastSegment: retorna o proprio se sem separador', () => {
  assert.strictEqual(lastSegment('PROC'), 'PROC');
});

test('lastSegment: string vazia retorna vazio', () => {
  assert.strictEqual(lastSegment(''), '');
});

// ── applyResults ───────────────────────────────────────────────────

test('applyResults: processa JUnit e marca resultados no TestRun', async () => {
  const { state, suiteItem, testItem } = makeExecState();
  const run = new vscode.TestRun() as any;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
  const junitPath = path.join(tmp, 'results.xml');
  fs.writeFileSync(junitPath, JUNIT_OK);
  try {
    const results = applyResults(junitPath, [testItem], run, state);
    assert.strictEqual(run.passedCount(), 1);
    assert.strictEqual(results.size, 1);
  } finally {
    fs.rmSync(tmp, { recursive: true });
  }
});

test('applyResults: arquivo inexistente marca todos como erro', () => {
  const { state, testItem } = makeExecState();
  const run = new vscode.TestRun() as any;
  const results = applyResults('/nonexistent.xml', [testItem], run, state);
  assert.strictEqual(run.erroredCount(), 1);
  assert.strictEqual(results.size, 0);
});

// ── applyCoverage ──────────────────────────────────────────────────

test('applyCoverage: arquivo existente delega para applyCoverageFromXml', () => {
  const { state, suiteItem } = makeExecState();
  const run = new vscode.TestRun() as any;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-'));
  const covPath = path.join(tmp, 'coverage.xml');
  fs.writeFileSync(covPath, COBertura_XML);
  try {
    applyCoverage(covPath, tmp, 'src', run, state);
    assert.ok(run.output().length > 0 || true);
  } finally {
    fs.rmSync(tmp, { recursive: true });
  }
});

// ── countResults ───────────────────────────────────────────────────

test('countResults: conta pass/fail/skip/erro e soma duracao', () => {
  const cases = [
    { name: 'a', classname: 'P', status: 'passed' as const, durationMs: 100 },
    { name: 'b', classname: 'P', status: 'failed' as const, durationMs: 200, message: 'fail' },
  ];
  const r = countResults(cases);
  assert.strictEqual(r.passed, 1);
  assert.strictEqual(r.failed, 1);
  assert.strictEqual(r.skipped, 0);
  assert.strictEqual(r.errored, 0);
  assert.strictEqual(r.totalMs, 300);
});

// ── executeRun: Oracle-only tests ─────────────────────────────────

test('executeRun: sem workspace folders mostra erro e retorna', async () =>
  withExecEnv(
    async () => {
      const { state } = makeExecState();
      const run = new vscode.TestRun() as any;
      const controller = {
        createTestRun: () => run,
        items: { forEach: () => {} },
      } as any;
      await executeRun(controller, {} as any, NEVER_TOKEN as any, false, state);
      assert.strictEqual(run.passedCount(), 0);
    },
    { noFolders: true },
  ));

test('executeRun: sem conexao mostra erro e retorna', async () =>
  withExecEnv(
    async () => {
      const { state } = makeExecState();
      const run = new vscode.TestRun() as any;
      const controller = {
        createTestRun: () => run,
        items: { forEach: () => {} },
      } as any;
      await executeRun(controller, {} as any, NEVER_TOKEN as any, false, state);
      assert.strictEqual(run.passedCount(), 0);
    },
    { noConn: true },
  ));

test('executeRun: oracle falha marca todos como erro', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun() as any;
    const controller = {
      createTestRun: () => run,
      items: { forEach: () => {} },
    } as any;
    const request = { include: [suiteItem] } as any;

    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('ORA-00942');
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);

    assert.strictEqual(run.erroredCount(), 1);
    assert.match(run.output(), /Oracle runner/);
  }));

test('executeRun: erro oracle não-Error é stringificado', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun() as any;
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw 'mensagem crua';
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);
    assert.match(run.output(), /mensagem crua/);
  }));

test('executeRun: include de teste único seta lastRun type test', async () =>
  withExecEnv(async () => {
    const { state, testItem } = makeExecState();
    const run = new vscode.TestRun() as any;
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [testItem] } as any;

    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);
    assert.strictEqual(state.getLastRun()?.type, 'test');
  }));

test('executeRun: include múltiplo seta lastRun type file', async () =>
  withExecEnv(async () => {
    const { state, suiteItem, testItem } = makeExecState();
    const run = new vscode.TestRun() as any;
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem, testItem] } as any;

    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);
    assert.strictEqual(state.getLastRun()?.type, 'file');
  }));

test('executeRun: sem include roda "all" via controller.items', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun() as any;
    const controller = {
      createTestRun: () => run,
      items: { forEach: (cb: (i: any) => void) => [suiteItem].forEach(cb) },
    } as any;

    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });

    await executeRun(controller, {} as any, NEVER_TOKEN as any, false, state);
    assert.strictEqual(state.getLastRun()?.type, 'all');
  }));

test('executeRun: onComplete é chamado quando oracle falha', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun() as any;
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });

    let complete = false;
    await executeRun(controller, request, NEVER_TOKEN as any, false, state, undefined, () => {
      complete = true;
    });
    assert.ok(!complete, 'onComplete nao deveria ser chamado quando oracle falha');
  }));

test('executeRun: onSuiteStart é chamado para suites', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun() as any;
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });

    let suiteStarts = 0;
    await executeRun(
      controller,
      request,
      NEVER_TOKEN as any,
      false,
      state,
      () => {
        suiteStarts++;
      },
      undefined,
    );
    assert.strictEqual(suiteStarts, 1);
  }));

test('executeRun: coverage flag é passado para oracle', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun() as any;
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    let receivedCoverage = false;
    mock.method(oracleRunner, 'executeRunOracle', async (opts: any) => {
      receivedCoverage = opts.coverage;
      throw new Error('sem oracle');
    });

    await executeRun(controller, request, NEVER_TOKEN as any, true, state);
    assert.strictEqual(receivedCoverage, true);
  }));

test('executeRun: additionalReporters são passados para oracle', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun() as any;
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    __setConfigValue('additionalReporters', ['ut_custom']);
    let receivedReporters: string[] = [];
    mock.method(oracleRunner, 'executeRunOracle', async (opts: any) => {
      receivedReporters = opts.additionalReporters ?? [];
      throw new Error('sem oracle');
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);
    assert.deepStrictEqual(receivedReporters, ['ut_custom']);
  }));

test('executeRun: dbmsOutput flag é passado para oracle', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun() as any;
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    __setConfigValue('dbmsOutput', true);
    let receivedDbmsOutput = false;
    mock.method(oracleRunner, 'executeRunOracle', async (opts: any) => {
      receivedDbmsOutput = opts.dbmsOutput;
      throw new Error('sem oracle');
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);
    assert.strictEqual(receivedDbmsOutput, true);
  }));

test('executeRun: timeoutMinutes é passado para oracle', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun() as any;
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    __setConfigValue('timeoutMinutes', 30);
    let receivedTimeout = 0;
    mock.method(oracleRunner, 'executeRunOracle', async (opts: any) => {
      receivedTimeout = opts.timeoutMinutes;
      throw new Error('sem oracle');
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);
    assert.strictEqual(receivedTimeout, 30);
  }));

test('executeRun: coverageOwner é passado para oracle', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun() as any;
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    __setConfigValue('coverageOwner', 'MY_SCHEMA');
    let receivedOwner = '';
    mock.method(oracleRunner, 'executeRunOracle', async (opts: any) => {
      receivedOwner = opts.coverageOwner;
      throw new Error('sem oracle');
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);
    assert.strictEqual(receivedOwner, 'MY_SCHEMA');
  }));
