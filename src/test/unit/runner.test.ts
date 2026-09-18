import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import * as oracleRunner from '../../oracleRunner';
import {
  collectRunTargets,
  countResults,
  deriveLastRun,
  executeRun,
  lastSegment,
} from '../../runner';
import { TestStateManager } from '../../state';
import type { ItemMeta } from '../../types';
import * as viewCoverage from '../../viewCoverage';
import * as vscode from '../vscode-stub';

const NEVER_TOKEN = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose: () => {} }),
} as any;

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
    if (origConn === undefined) delete process.env.UTPLSQL_CONN;
    else process.env.UTPLSQL_CONN = origConn;
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

test('executeRun: sqlCoverageEnabled delega para applySqlCoverage no sucesso', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun() as any;
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    __setConfigValue('sqlCoverageEnabled', true);
    mock.method(oracleRunner, 'executeRunOracle', async () => {});
    let receivedConn = '';
    mock.method(viewCoverage, 'applySqlCoverage', async (opts: any) => {
      receivedConn = opts.connection;
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);
    assert.strictEqual(receivedConn, 'user/pass@//host:1521/svc');
  }));

// ── collectRunTargets / schema-mode ───────────────────────────────

function makeSchemaHierarchy(suiteItem: any) {
  const pkg = new vscode.TestItem(`package:APP:${suiteItem.id}`) as any;
  pkg.children = [suiteItem];
  const schema = new vscode.TestItem('schema:APP') as any;
  schema.children = [pkg];
  return { schema, pkg };
}

test('collectRunTargets: expande schema/package sem meta até suites e testes', () => {
  const { state, suiteItem } = makeExecState();
  const { schema } = makeSchemaHierarchy(suiteItem);

  const result = collectRunTargets([schema], state);

  assert.deepStrictEqual([...result.pathArgs], ['TEST_PKG']);
  assert.strictEqual(result.leafTests.length, 1);
  assert.strictEqual(result.leafTests[0].id, 'test1');
  assert.strictEqual(result.suiteCount, 1);
});

test('collectRunTargets: teste direto (sem suite) usa path PKG.PROC', () => {
  const { state, testItem } = makeExecState();

  const result = collectRunTargets([testItem], state);

  assert.deepStrictEqual([...result.pathArgs], ['TEST_PKG.test_pass']);
  assert.strictEqual(result.leafTests.length, 1);
  assert.strictEqual(result.suiteCount, 0);
});

test('executeRun: include de nó schema expande suites e passa path do package', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const { schema } = makeSchemaHierarchy(suiteItem);
    const run = new vscode.TestRun() as any;
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [schema] } as any;

    let receivedPaths: string[] = [];
    mock.method(oracleRunner, 'executeRunOracle', async (opts: any) => {
      receivedPaths = opts.pathArgs;
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);
    assert.deepStrictEqual(receivedPaths, ['TEST_PKG']);
  }));

test('executeRun: nó sem testes não chama o Oracle e avisa', async () =>
  withExecEnv(async () => {
    const state = new TestStateManager();
    const schema = new vscode.TestItem('schema:EMPTY') as any;
    schema.children = [];
    const run = new vscode.TestRun() as any;
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [schema] } as any;

    let called = false;
    mock.method(oracleRunner, 'executeRunOracle', async () => {
      called = true;
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);
    assert.strictEqual(called, false);
    assert.match(run.output(), /Nenhum teste/);
  }));

test('deriveLastRun: schema com uma suite vira lastRun suite', () => {
  const { state, suiteItem } = makeExecState();
  const { schema } = makeSchemaHierarchy(suiteItem);

  const lr = deriveLastRun([schema], true, false, state);
  assert.strictEqual(lr.type, 'suite');
  assert.strictEqual(lr.packageName, 'TEST_PKG');
});

test('deriveLastRun: schema com várias suites vira lastRun file', () => {
  const { state, suiteItem } = makeExecState();
  const { schema } = makeSchemaHierarchy(suiteItem);
  const otherSuite = new vscode.TestItem('suite:other') as any;
  otherSuite.children = [];
  state.setMeta(otherSuite, {
    kind: 'suite',
    packageName: 'OTHER_PKG',
    uri: { fsPath: '/tmp/other.pks', path: '/tmp/other.pks', scheme: 'file' },
    folder: { uri: { fsPath: '/tmp', path: '/tmp', scheme: 'file' }, name: 'tmp', index: 0 },
  } as ItemMeta);
  schema.children[0].children.push(otherSuite);

  const lr = deriveLastRun([schema], true, false, state);
  assert.strictEqual(lr.type, 'file');
});

test('deriveLastRun: sem include vira lastRun all', () => {
  const { state } = makeExecState();
  const lr = deriveLastRun([], false, true, state);
  assert.strictEqual(lr.type, 'all');
  assert.strictEqual(lr.coverage, true);
});

test('executeRun: include de nó schema registra lastRun suite', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const { schema } = makeSchemaHierarchy(suiteItem);
    const run = new vscode.TestRun() as any;
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [schema] } as any;

    mock.method(oracleRunner, 'executeRunOracle', async () => {});
    await executeRun(controller, request, NEVER_TOKEN as any, false, state);
    assert.strictEqual(state.getLastRun()?.type, 'suite');
  }));
