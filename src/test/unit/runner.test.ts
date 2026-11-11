import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import * as oracleRunner from '../../oracleRunner';
import { setupValidator } from '../../quickfix';
import { createRunEventBus } from '../../runEvents';
import {
  collectRunTargets,
  countResults,
  deriveLastRun,
  executeRun,
  lastSegment,
} from '../../runner';
import { TestStateManager } from '../../state';
import * as viewCoverage from '../../viewCoverage';
import {
  makeController,
  makeFolder,
  makeMeta,
  makeRequest,
  makeTestItem,
  makeUri,
  NEVER_TOKEN,
} from '../fixtures';
import * as vscode from '../vscode-stub';

function makeExecState() {
  const state = new TestStateManager();
  const suiteItem = makeTestItem('suite1');
  const testItem = makeTestItem('test1');

  suiteItem.children.add(testItem);

  state.setMeta(
    suiteItem,
    makeMeta({
      kind: 'suite',
      packageName: 'TEST_PKG',
      uri: makeUri('/tmp/test.pks'),
      folder: makeFolder('/tmp', 'tmp'),
    }),
  );
  state.setMeta(
    testItem,
    makeMeta({
      kind: 'test',
      packageName: 'TEST_PKG',
      procName: 'test_pass',
      description: 'test_pass',
      uri: makeUri('/tmp/test.pks'),
      folder: makeFolder('/tmp', 'tmp'),
    }),
  );

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
      vscode.workspace.__setWorkspaceFolders([makeFolder('/tmp', 'tmp')]);
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
      const run = new vscode.TestRun();
      const controller = makeController(run);
      await executeRun(controller, makeRequest(), NEVER_TOKEN, false, state);
      assert.strictEqual(run.passedCount(), 0);
    },
    { noFolders: true },
  ));

test('executeRun: sem conexao mostra erro e retorna', async () =>
  withExecEnv(
    async () => {
      const { state } = makeExecState();
      const run = new vscode.TestRun();
      const controller = makeController(run);
      await executeRun(controller, makeRequest(), NEVER_TOKEN, false, state);
      assert.strictEqual(run.passedCount(), 0);
    },
    { noConn: true },
  ));

test('executeRun: oracle falha marca todos como erro', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = makeController(run);
    const request = makeRequest([suiteItem]);

    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('ORA-00942');
    });

    await executeRun(controller, request, NEVER_TOKEN, false, state);

    assert.strictEqual(run.erroredCount(), 1);
    assert.match(run.output(), /Oracle runner/);
  }));

test('executeRun: run vazio não abre atividade Oracle nem apaga o último resultado', async () =>
  withExecEnv(async () => {
    const state = new TestStateManager();
    state.setLastResults(new Map([['test1', { status: 'passed', ts: 1 }]]));
    const run = new vscode.TestRun();
    const controller = makeController(run);
    const began: string[] = [];
    mock.method(oracleRunner, 'beginOracleActivity', () => {
      began.push('begin');
      return { end: async () => {} };
    });
    await executeRun(controller, makeRequest(), NEVER_TOKEN, false, state);
    assert.deepStrictEqual(began, [], 'run sem alvos não deve abrir atividade Oracle');
    assert.strictEqual(state.getLastResults().size, 1, 'resultado anterior deve ser preservado');
  }));

test('executeRun: timeout/cancelamento marca skipped e não erro', async () =>
  withExecEnv(async () => {
    const { state, testItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = makeController(run);
    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new oracleRunner.RunAbortedError('timedOut');
    });
    await executeRun(controller, makeRequest([testItem]), NEVER_TOKEN, false, state);
    assert.strictEqual(run.passedCount(), 0);
    assert.strictEqual(run.erroredCount(), 0);
    assert.strictEqual(run.skippedCount(), 1);
    assert.match(run.output(), /timeout/i);
  }));

test('executeRun: erro oracle não-Error é stringificado', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = makeController(run);
    const request = makeRequest([suiteItem]);

    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw 'mensagem crua';
    });

    await executeRun(controller, request, NEVER_TOKEN, false, state);
    assert.match(run.output(), /mensagem crua/);
  }));

test('executeRun: request sem include percorre controller.items', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = makeController(run);
    controller.items.add(suiteItem);
    mock.method(oracleRunner, 'executeRunOracle', async () => {});
    await executeRun(controller, new vscode.TestRunRequest(undefined), NEVER_TOKEN, false, state);
    assert.strictEqual(state.getLastRun()?.type, 'all');
  }));

test('executeRun: include de teste único seta lastRun type test', async () =>
  withExecEnv(async () => {
    const { state, testItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = makeController(run);
    const request = makeRequest([testItem]);

    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });

    await executeRun(controller, request, NEVER_TOKEN, false, state);
    assert.strictEqual(state.getLastRun()?.type, 'test');
  }));

test('executeRun: include múltiplo seta lastRun type file', async () =>
  withExecEnv(async () => {
    const { state, suiteItem, testItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = makeController(run);
    const request = makeRequest([suiteItem, testItem]);

    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });

    await executeRun(controller, request, NEVER_TOKEN, false, state);
    assert.strictEqual(state.getLastRun()?.type, 'file');
  }));

test('executeRun: sem include roda "all" via controller.items', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = makeController(run);
    controller.items.add(suiteItem);

    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });

    await executeRun(controller, makeRequest(), NEVER_TOKEN, false, state);
    assert.strictEqual(state.getLastRun()?.type, 'all');
  }));

test('executeRun: onComplete é chamado quando oracle falha', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = makeController(run);
    const request = makeRequest([suiteItem]);

    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });

    let complete = false;
    await executeRun(controller, request, NEVER_TOKEN, false, state, undefined, () => {
      complete = true;
    });
    assert.ok(!complete, 'onComplete nao deveria ser chamado quando oracle falha');
  }));

test('executeRun: onSuiteStart é chamado para suites', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = makeController(run);
    const request = makeRequest([suiteItem]);

    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });

    let suiteStarts = 0;
    await executeRun(
      controller,
      request,
      NEVER_TOKEN,
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
    const run = new vscode.TestRun();
    const controller = makeController(run);
    const request = makeRequest([suiteItem]);

    let receivedCoverage = false;
    mock.method(oracleRunner, 'executeRunOracle', async (opts: any) => {
      receivedCoverage = opts.coverage.enabled;
      throw new Error('sem oracle');
    });

    await executeRun(controller, request, NEVER_TOKEN, true, state);
    assert.strictEqual(receivedCoverage, true);
  }));

test('executeRun: resultado da cobertura publica/limpa o diagnóstico', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = makeController(run);
    const request = makeRequest([suiteItem]);

    const add = mock.method(setupValidator, 'addCoverageDiagnostic', () => {});
    const clear = mock.method(setupValidator, 'clearCoverageDiagnostic', () => {});
    mock.method(oracleRunner, 'executeRunOracle', async (opts: any) => {
      opts.onCoverageResult?.(false);
      opts.onCoverageResult?.(true);
      return undefined;
    });

    try {
      await executeRun(controller, request, NEVER_TOKEN, true, state);
      assert.strictEqual(add.mock.callCount(), 1);
      assert.strictEqual(clear.mock.callCount(), 1);
    } finally {
      add.mock.restore();
      clear.mock.restore();
    }
  }));

test('executeRun: emite a sequência de eventos no bus (PRD-128)', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = makeController(run);
    const request = makeRequest([suiteItem]);
    mock.method(oracleRunner, 'executeRunOracle', async (opts: { bus?: { emit(event: unknown): void } }) => {
      opts.bus?.emit({
        type: 'run:complete',
        passed: 1,
        failed: 0,
        skipped: 0,
        errored: 0,
        durationMs: 10,
      });
      opts.bus?.emit({ type: 'coverage:generated', generated: true });
      return undefined;
    });

    const bus = createRunEventBus();
    const events: string[] = [];
    bus.on('run:start', () => events.push('run:start'));
    bus.on('suite:start', () => events.push('suite:start'));
    bus.on('run:complete', () => events.push('run:complete'));
    bus.on('coverage:generated', () => events.push('coverage:generated'));

    await executeRun(
      controller,
      request,
      NEVER_TOKEN,
      false,
      state,
      undefined,
      undefined,
      undefined,
      bus,
    );
    assert.deepStrictEqual(events, [
      'run:start',
      'suite:start',
      'run:complete',
      'coverage:generated',
    ]);
  }));

test('executeRun: coverageHtmlReport/reportRoot e notificação após run.end', async () =>
  withExecEnv(async () => {
    __setConfigValue('coverage.htmlReport', true);
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const events: string[] = [];
    const originalEnd = run.end.bind(run);
    run.end = () => {
      events.push('end');
      originalEnd();
    };
    const controller = makeController(run);
    const request = makeRequest([suiteItem]);

    vscode.__resetMessages();
    mock.method(oracleRunner, 'executeRunOracle', async (opts: any) => {
      assert.strictEqual(opts.coverage.htmlReport, true);
      assert.ok(opts.coverage.reportRoot, 'reportRoot deveria ser o folder da suíte');
      opts.coverage.onHtmlReport?.('/tmp/utplsql-report.html');
      return undefined;
    });

    await executeRun(controller, request, NEVER_TOKEN, true, state);

    assert.deepStrictEqual(events, ['end'], 'run.end deve acontecer antes da notificação');
    assert.ok(
      vscode.__getInformationMessages().some((m) => m.includes('/tmp/utplsql-report.html')),
      'a notificação do HTML deveria ser disparada',
    );
  }));

test('executeRun: additionalReporters são passados para oracle', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = makeController(run);
    const request = makeRequest([suiteItem]);

    __setConfigValue('additionalReporters', ['ut_custom']);
    let receivedReporters: string[] = [];
    mock.method(oracleRunner, 'executeRunOracle', async (opts: any) => {
      receivedReporters = opts.output?.additionalReporters ?? [];
      throw new Error('sem oracle');
    });

    await executeRun(controller, request, NEVER_TOKEN, false, state);
    assert.deepStrictEqual(receivedReporters, ['ut_custom']);
  }));

test('executeRun: dbmsOutput flag é passado para oracle', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = makeController(run);
    const request = makeRequest([suiteItem]);

    __setConfigValue('dbmsOutput', true);
    let receivedDbmsOutput = false;
    mock.method(oracleRunner, 'executeRunOracle', async (opts: any) => {
      receivedDbmsOutput = opts.execution.dbmsOutput;
      throw new Error('sem oracle');
    });

    await executeRun(controller, request, NEVER_TOKEN, false, state);
    assert.strictEqual(receivedDbmsOutput, true);
  }));

test('executeRun: timeoutMinutes é passado para oracle', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = makeController(run);
    const request = makeRequest([suiteItem]);

    __setConfigValue('timeoutMinutes', 30);
    let receivedTimeout = 0;
    mock.method(oracleRunner, 'executeRunOracle', async (opts: any) => {
      receivedTimeout = opts.execution.timeoutMinutes;
      throw new Error('sem oracle');
    });

    await executeRun(controller, request, NEVER_TOKEN, false, state);
    assert.strictEqual(receivedTimeout, 30);
  }));

test('executeRun: coverageOwner é passado para oracle', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = makeController(run);
    const request = makeRequest([suiteItem]);

    __setConfigValue('coverageOwner', 'MY_SCHEMA');
    let receivedOwner = '';
    mock.method(oracleRunner, 'executeRunOracle', async (opts: any) => {
      receivedOwner = opts.coverage.owner;
      throw new Error('sem oracle');
    });

    await executeRun(controller, request, NEVER_TOKEN, false, state);
    assert.strictEqual(receivedOwner, 'MY_SCHEMA');
  }));

test('executeRun: sqlCoverageEnabled delega para applySqlCoverage no sucesso', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = makeController(run);
    const request = makeRequest([suiteItem]);

    __setConfigValue('sqlCoverageEnabled', true);
    mock.method(oracleRunner, 'executeRunOracle', async () => {});
    let receivedConn = '';
    mock.method(viewCoverage, 'applySqlCoverage', async (opts: any) => {
      receivedConn = opts.connection;
    });

    await executeRun(controller, request, NEVER_TOKEN, false, state);
    assert.strictEqual(receivedConn, 'user/pass@//host:1521/svc');
  }));

// ── collectRunTargets / schema-mode ───────────────────────────────

function makeSchemaHierarchy(suiteItem: vscode.TestItem) {
  const pkg = makeTestItem(`package:APP:${suiteItem.id}`);
  pkg.children.add(suiteItem);
  const schema = makeTestItem('schema:APP');
  schema.children.add(pkg);
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
    const run = new vscode.TestRun();
    const controller = makeController(run);
    const request = makeRequest([schema]);

    let receivedPaths: string[] = [];
    mock.method(oracleRunner, 'executeRunOracle', async (opts: any) => {
      receivedPaths = opts.pathArgs;
    });

    await executeRun(controller, request, NEVER_TOKEN, false, state);
    assert.deepStrictEqual(receivedPaths, ['TEST_PKG']);
  }));

test('executeRun: nó sem testes não chama o Oracle e avisa', async () =>
  withExecEnv(async () => {
    const state = new TestStateManager();
    const schema = makeTestItem('schema:EMPTY');
    schema.children.replace([]);
    const run = new vscode.TestRun();
    const controller = makeController(run);
    const request = makeRequest([schema]);

    let called = false;
    mock.method(oracleRunner, 'executeRunOracle', async () => {
      called = true;
    });

    await executeRun(controller, request, NEVER_TOKEN, false, state);
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

test('deriveLastRun: vários testes sem suite viram file usando o primeiro teste', () => {
  const state = new TestStateManager();
  const a = makeTestItem('test:a');
  const b = makeTestItem('test:b');
  for (const item of [a, b]) {
    state.setMeta(
      item,
      makeMeta({
        packageName: 'UT_A',
        procName: item.id,
        uri: makeUri('/tmp/ut_a.pks'),
        folder: makeFolder('/tmp', 'tmp'),
      }),
    );
  }
  const lr = deriveLastRun([a, b], true, false, state);
  assert.strictEqual(lr.type, 'file');
  assert.strictEqual(lr.uri?.fsPath, '/tmp/ut_a.pks');
});

test('deriveLastRun: schema com várias suites vira lastRun file', () => {
  const { state, suiteItem } = makeExecState();
  const { schema, pkg } = makeSchemaHierarchy(suiteItem);
  const otherSuite = makeTestItem('suite:other');
  state.setMeta(
    otherSuite,
    makeMeta({
      kind: 'suite',
      packageName: 'OTHER_PKG',
      uri: makeUri('/tmp/other.pks'),
      folder: makeFolder('/tmp', 'tmp'),
    }),
  );
  pkg.children.add(otherSuite);

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
    const run = new vscode.TestRun();
    const controller = makeController(run);
    const request = makeRequest([schema]);

    mock.method(oracleRunner, 'executeRunOracle', async () => {});
    await executeRun(controller, request, NEVER_TOKEN, false, state);
    assert.strictEqual(state.getLastRun()?.type, 'suite');
  }));
