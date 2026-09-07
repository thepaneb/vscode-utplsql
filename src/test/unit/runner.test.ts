import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { mock, test } from 'node:test';
import * as cli from '../../cli';
import * as cliInfo from '../../cliInfo';
import * as cliReporters from '../../cliReporters';
import type { TestCaseResult } from '../../junit';
import * as oracleRunner from '../../oracleRunner';
import { applyCoverage, applyResults, countResults, executeRun, lastSegment } from '../../runner';
import { TestStateManager } from '../../state';
import * as vscode from '../vscode-stub';

function makeState() {
  return {
    getMeta: (_item: any) => undefined as any,
    setMeta: () => {},
    setCoverage: () => {},
    getCoverage: () => [],
    clearCoverage: () => {},
    cachedItems: [] as any[],
    runProfile: undefined,
    coverageProfile: undefined,
  } as any;
}

test('lastSegment: pega ultimo segmento separado por ponto', () => {
  assert.strictEqual(lastSegment('schema.package'), 'package');
});

test('lastSegment: pega ultimo segmento separado por :', () => {
  assert.strictEqual(lastSegment('schema:package'), 'package');
});

test('lastSegment: retorna o proprio se sem separador', () => {
  assert.strictEqual(lastSegment('package'), 'package');
});

test('lastSegment: string vazia retorna vazio', () => {
  assert.strictEqual(lastSegment(''), '');
});

test('lastSegment: separadores misturados . e :', () => {
  assert.strictEqual(lastSegment('schema:package.test'), 'test');
});

test('lastSegment: segmentos vazios sao ignorados', () => {
  assert.strictEqual(lastSegment('schema..package'), 'package');
  assert.strictEqual(lastSegment('schema..test'), 'test');
});

test('lastSegment: varios separadores consecutivos', () => {
  assert.strictEqual(lastSegment('a..b...c'), 'c');
});

test('applyResults: processa JUnit e marca resultados no TestRun', () => {
  const xml = `<?xml version="1.0"?>
<testsuites>
  <testsuite name="app.test_exemplo">
    <testcase classname="app.test_exemplo" name="Cenario um" time="0.05"/>
    <testcase classname="app.test_exemplo" name="Falha" time="0.02">
      <failure message="Erro">stack</failure>
    </testcase>
  </testsuite>
</testsuites>`;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-test-'));
  const junitPath = path.join(tmpDir, 'results.xml');
  fs.writeFileSync(junitPath, xml);

  const passed: any[] = [];
  const failed: any[] = [];
  const skipped: any[] = [];
  const output: string[] = [];

  const run = {
    passed: (t: any) => passed.push(t),
    failed: (t: any, m: any) => failed.push({ t, m }),
    skipped: (t: any) => skipped.push(t),
    errored: (t: any, m: any) => {
      failed.push({ t, m });
    },
    appendOutput: (s: string) => output.push(s),
    enqueued: () => {},
    started: () => {},
    addCoverage: () => {},
    end: () => {},
  };

  const leafTests: any[] = [];
  const state = makeState();

  const item = { id: 'test_1', children: [] };
  leafTests.push(item);
  state.getMeta = (t: any) => {
    if (t === item)
      return {
        kind: 'test',
        packageName: 'test_exemplo',
        procName: 'cen_um',
        description: 'Cenario um',
        uri: null as any,
      };
    return undefined;
  };

  applyResults(junitPath, leafTests, run as any, state as any);

  assert.strictEqual(passed.length, 1);
  assert.strictEqual(failed.length, 0);
  assert.strictEqual(skipped.length, 0);

  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

test('applyResults: avisa via appendOutput quando teste nao tem match', () => {
  const xml = `<?xml version="1.0"?>
<testsuites>
  <testsuite name="outro">
    <testcase classname="outro" name="Outro teste" time="0.01"/>
  </testsuite>
</testsuites>`;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-test-'));
  const junitPath = path.join(tmpDir, 'results.xml');
  fs.writeFileSync(junitPath, xml);

  const output: string[] = [];
  const run = {
    passed: () => {},
    failed: () => {},
    skipped: () => {},
    errored: () => {},
    appendOutput: (s: string) => output.push(s),
    enqueued: () => {},
    started: () => {},
    addCoverage: () => {},
    end: () => {},
  };

  const state = makeState();

  const leafTests: any[] = [
    { id: 'test_sem_match', children: [] },
    { id: 'test_sem_match2', children: [] },
  ];

  applyResults(junitPath, leafTests, run as any, state as any);

  const warnings = output.filter((s) => s.includes('Nenhum resultado JUnit'));
  assert.strictEqual(warnings.length, 2);

  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

test('applyResults: processa testcase com failure como failed no report', () => {
  const xml = `<?xml version="1.0"?>
<testsuites>
  <testsuite name="pkg">
    <testcase classname="pkg" name="Vai falhar" time="0.02">
      <failure message="Erro">stack</failure>
    </testcase>
  </testsuite>
</testsuites>`;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-test-'));
  const junitPath = path.join(tmpDir, 'report.xml');
  fs.writeFileSync(junitPath, xml);

  const failed: any[] = [];
  const run = {
    passed: () => {},
    failed: (t: any, m: any) => failed.push({ t, m }),
    errored: () => {},
    skipped: () => {},
    appendOutput: () => {},
    enqueued: () => {},
    started: () => {},
    addCoverage: () => {},
    end: () => {},
  };

  const item = { id: 'test:fail', children: [] };
  const items: any[] = [item];
  const state = {
    getMeta: (t: any) => {
      if (t === item)
        return {
          kind: 'test',
          packageName: 'pkg',
          procName: 'vai_falhar',
          description: 'Vai falhar',
          uri: null as any,
        };
      return undefined;
    },
    setMeta: () => {},
    setCoverage: () => {},
    getCoverage: () => [],
    clearCoverage: () => {},
    cachedItems: [] as any[],
  } as any;

  applyResults(junitPath, items, run as any, state);
  assert.strictEqual(failed.length, 1);
  assert.strictEqual(failed[0].t.id, 'test:fail');
  assert.match(failed[0].m.message, /Erro/);

  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

test('applyResults: processa testcase com error como erro no report', () => {
  const xml = `<?xml version="1.0"?>
<testsuites>
  <testsuite name="pkg">
    <testcase classname="pkg" name="Vai errar" time="0.01">
      <error message="Explodiu">stack</error>
    </testcase>
  </testsuite>
</testsuites>`;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-test-'));
  const junitPath = path.join(tmpDir, 'report.xml');
  fs.writeFileSync(junitPath, xml);

  const errored: any[] = [];
  const run = {
    passed: () => {},
    failed: () => {},
    errored: (t: any, m: any) => errored.push({ t, m }),
    skipped: () => {},
    appendOutput: () => {},
    enqueued: () => {},
    started: () => {},
    addCoverage: () => {},
    end: () => {},
  };

  const item = { id: 'test:err', children: [] };
  const items: any[] = [item];
  const state = {
    getMeta: (t: any) => {
      if (t === item)
        return {
          kind: 'test',
          packageName: 'pkg',
          procName: 'vai_errar',
          description: 'Vai errar',
          uri: null as any,
        };
      return undefined;
    },
    setMeta: () => {},
    setCoverage: () => {},
    getCoverage: () => [],
    clearCoverage: () => {},
    cachedItems: [] as any[],
  } as any;

  applyResults(junitPath, items, run as any, state);
  assert.strictEqual(errored.length, 1);
  assert.strictEqual(errored[0].t.id, 'test:err');
  assert.match(errored[0].m.message, /Explodiu/);

  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

test('applyResults: processa testcase com skipped como skipped no report', () => {
  const xml = `<?xml version="1.0"?>
<testsuites>
  <testsuite name="pkg">
    <testcase classname="pkg" name="Pulado" time="0">
      <skipped/>
    </testcase>
  </testsuite>
</testsuites>`;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-test-'));
  const junitPath = path.join(tmpDir, 'report.xml');
  fs.writeFileSync(junitPath, xml);

  const skipped: any[] = [];
  const run = {
    passed: () => {},
    failed: () => {},
    errored: () => {},
    skipped: (t: any) => skipped.push(t),
    appendOutput: () => {},
    enqueued: () => {},
    started: () => {},
    addCoverage: () => {},
    end: () => {},
  };

  const item = { id: 'test:skip', children: [] };
  const items: any[] = [item];
  const state = {
    getMeta: (t: any) => {
      if (t === item)
        return {
          kind: 'test',
          packageName: 'pkg',
          procName: 'pulado',
          description: 'Pulado',
          uri: null as any,
        };
      return undefined;
    },
    setMeta: () => {},
    setCoverage: () => {},
    getCoverage: () => [],
    clearCoverage: () => {},
    cachedItems: [] as any[],
  } as any;

  applyResults(junitPath, items, run as any, state);
  assert.strictEqual(skipped.length, 1);
  assert.strictEqual(skipped[0].id, 'test:skip');

  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

test('applyResults: arquivo inexistente marca todos como erro', () => {
  const errored: any[] = [];
  const run = {
    passed: () => {},
    failed: () => {},
    skipped: () => {},
    errored: (t: any, m: any) => errored.push({ t, m }),
    appendOutput: () => {},
    enqueued: () => {},
    started: () => {},
    addCoverage: () => {},
    end: () => {},
  };
  const leafTests: any[] = [{ id: 'test_1' }];
  const state = { getMeta: () => ({ kind: 'test' }) };

  applyResults('/caminho/inexistente.xml', leafTests, run as any, state as any);
  assert.strictEqual(errored.length, 1);
});

test('applyCoverage: arquivo ausente gera diagnostico com caminho', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-cov-test-'));
  const coveragePath = path.join(tmpDir, 'coverage.xml');
  const output: string[] = [];

  const run = {
    passed: () => {},
    failed: () => {},
    skipped: () => {},
    errored: () => {},
    appendOutput: (s: string) => output.push(s),
    enqueued: () => {},
    started: () => {},
    addCoverage: () => {},
    end: () => {},
  };

  const state = {
    clearCoverage: () => {},
    setCoverage: () => {},
    getMeta: () => undefined,
    setMeta: () => {},
    getCoverage: () => [],
  } as any;

  try {
    applyCoverage(coveragePath, '/root', 'install', run as any, state, []);
    const all = output.join('');
    assert.match(all, /\[cobertura\] relatório não gerado/);
    assert.match(all, /esperado em:/);
    assert.match(all, /\(vazio\)/);
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

test('countResults: conta pass/fail/skip/erro e soma duracao', () => {
  const cases: TestCaseResult[] = [
    { classname: 'p', name: 'a', status: 'passed', durationMs: 100 },
    { classname: 'p', name: 'b', status: 'failed', durationMs: 50 },
    { classname: 'p', name: 'c', status: 'skipped', durationMs: 25 },
    { classname: 'p', name: 'd', status: 'error', durationMs: 25 },
  ];
  const r = countResults(cases);
  assert.strictEqual(r.passed, 1);
  assert.strictEqual(r.failed, 1);
  assert.strictEqual(r.skipped, 1);
  assert.strictEqual(r.errored, 1);
  assert.strictEqual(r.totalMs, 200);
});

test('countResults: apenas passed com duracao zero', () => {
  const cases: TestCaseResult[] = [
    { classname: 'p', name: 'a', status: 'passed' },
    { classname: 'p', name: 'b', status: 'passed', durationMs: 10 },
  ];
  const r = countResults(cases);
  assert.strictEqual(r.passed, 2);
  assert.strictEqual(r.failed, 0);
  assert.strictEqual(r.skipped, 0);
  assert.strictEqual(r.errored, 0);
  assert.strictEqual(r.totalMs, 10);
});

test('countResults: array vazio retorna zeros', () => {
  const r = countResults([]);
  assert.strictEqual(r.passed, 0);
  assert.strictEqual(r.failed, 0);
  assert.strictEqual(r.skipped, 0);
  assert.strictEqual(r.errored, 0);
  assert.strictEqual(r.totalMs, 0);
});

test('applyCoverage: arquivo existente delega para applyCoverageFromXml', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-cov-ok-'));
  const installDir = path.join(tmpDir, 'install', 'packages');
  fs.mkdirSync(installDir, { recursive: true });
  fs.writeFileSync(path.join(installDir, 'app.sql'), 'create package app;');
  const coveragePath = path.join(tmpDir, 'coverage.xml');
  const xml = `<?xml version="1.0"?>
<coverage>
  <packages>
    <package name="pkg">
      <classes>
        <class name="app" filename="packages/app.sql">
          <lines>
            <line number="1" hits="1"/>
          </lines>
        </class>
      </classes>
    </package>
  </packages>
</coverage>`;
  fs.writeFileSync(coveragePath, xml);

  const coverageCalls: any[] = [];
  const output: string[] = [];
  const run = {
    passed: () => {},
    failed: () => {},
    skipped: () => {},
    errored: () => {},
    appendOutput: (s: string) => output.push(s),
    enqueued: () => {},
    started: () => {},
    addCoverage: (fc: unknown) => coverageCalls.push(fc),
    end: () => {},
  };
  const state = {
    clearCoverage: () => {},
    setCoverage: () => {},
    getMeta: () => undefined,
    setMeta: () => {},
    getCoverage: () => [],
  } as any;

  try {
    const folders = [{ uri: { fsPath: tmpDir }, name: 'tmp', index: 0 }];
    applyCoverage(coveragePath, tmpDir, 'install', run as any, state, folders as any);
    assert.strictEqual(coverageCalls.length, 1);
    const all = output.join('');
    assert.ok(!all.includes('relatório não gerado'), 'não deveria emitir diagnóstico de ausência');
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

// ── executeRun ───────────────────────────────────────────────────────

const EXEC_CONN = 'user/pass@//host:1521/svc';

const JUNIT_OK = `<?xml version="1.0"?>
<testsuites>
  <testsuite name="app">
    <testcase classname="app" name="t_one" time="0.01"/>
  </testsuite>
</testsuites>`;

const NEVER_TOKEN = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose: () => {} }),
};

function makeExecState(): { state: TestStateManager; suiteItem: any; testItem: any } {
  const state = new TestStateManager();
  const suiteItem = { id: 'suite:app', children: new Map() };
  const testItem = { id: 'test:app.t_one', children: [] };
  suiteItem.children.set(testItem.id, testItem);
  const uri = vscode.Uri.file('/root/app.pks');
  const folder = { uri: vscode.Uri.file('/root'), name: 'root', index: 0 } as any;
  state.setMeta(suiteItem as any, {
    kind: 'suite',
    packageName: 'app',
    uri: uri as any,
    folder,
  });
  state.setMeta(testItem as any, {
    kind: 'test',
    packageName: 'app',
    procName: 't_one',
    description: 'Teste um',
    uri: uri as any,
    folder,
  });
  return { state, suiteItem, testItem };
}

async function withExecEnv(
  fn: () => Promise<void>,
  opts?: { noConn?: boolean; noFolders?: boolean },
): Promise<void> {
  const origEnv = process.env.UTPLSQL_CONN;
  if (opts?.noConn) {
    delete process.env.UTPLSQL_CONN;
  } else {
    process.env.UTPLSQL_CONN = EXEC_CONN;
  }
  const { __setInputBoxResult, __resetConfigValues } = await import('../vscode-stub.js');
  __resetConfigValues();
  __setInputBoxResult(undefined);
  if (opts?.noFolders) {
    vscode.workspace.__setWorkspaceFolders(undefined);
  } else {
    vscode.workspace.__setWorkspaceFolders([{ uri: { fsPath: '/root' }, name: 'root', index: 0 }]);
  }
  try {
    await fn();
  } finally {
    process.env.UTPLSQL_CONN = origEnv;
    vscode.workspace.__setWorkspaceFolders(undefined);
    __resetConfigValues();
    mock.restoreAll();
  }
}

test('executeRun: executa via CLI (fallback auto) e aplica resultados', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = {
      createTestRun: () => run,
      items: { forEach: () => {} },
    } as any;
    const request = { include: [suiteItem] } as any;

    mock.method(cliInfo, 'getCliInfo', async () => ({ cliVersion: '3.2.3', apiVersion: '3.2.3' }));
    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });
    mock.method(cli, 'runCli', async (_file: string, args: string[]) => {
      const o = args.find((a) => a.startsWith('-o='));
      assert.ok(o, 'runCli deveria receber -o=<junitPath>');
      fs.writeFileSync(String(o).slice(3), JUNIT_OK);
      return { code: 0, stdout: '', stderr: '' };
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);

    assert.strictEqual(run.passedCount(), 1);
    assert.strictEqual(run.failedCount(), 0);
    assert.match(run.output(), /fallback para CLI/);
  }));

test('executeRun: runnerMode oracle com falha marca todos como erro', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = {
      createTestRun: () => run,
      items: { forEach: () => {} },
    } as any;
    const request = { include: [suiteItem] } as any;

    const { __setConfigValue } = await import('../vscode-stub.js');
    __setConfigValue('runnerMode', 'oracle');

    mock.method(cliInfo, 'getCliInfo', async () => ({ cliVersion: '3.2.3', apiVersion: '3.2.3' }));
    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('ORA-00942');
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);

    assert.strictEqual(run.erroredCount(), 1);
    assert.match(run.output(), /\[erro\] Oracle runner/);
  }));

test('executeRun: info do CLI indisponivel nao bloqueia a execucao', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = {
      createTestRun: () => run,
      items: { forEach: () => {} },
    } as any;
    const request = { include: [suiteItem] } as any;

    const { __setConfigValue } = await import('../vscode-stub.js');
    __setConfigValue('runnerMode', 'cli');

    mock.method(cliInfo, 'getCliInfo', async () => ({ error: 'cli quebrado' }));
    mock.method(cli, 'runCli', async (_file: string, args: string[]) => {
      const o = args.find((a) => a.startsWith('-o='));
      fs.writeFileSync(String(o).slice(3), JUNIT_OK);
      return { code: 0, stdout: '', stderr: '' };
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);

    assert.strictEqual(run.passedCount(), 1);
    assert.match(run.output(), /\[aviso\] Não foi possível obter info do CLI/);
  }));

test('executeRun: sem workspace folders mostra erro e retorna', async () =>
  withExecEnv(
    async () => {
      const { state } = makeExecState();
      const run = new vscode.TestRun();
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
      const run = new vscode.TestRun();
      const controller = {
        createTestRun: () => run,
        items: { forEach: () => {} },
      } as any;
      await executeRun(controller, {} as any, NEVER_TOKEN as any, false, state);
      assert.strictEqual(run.passedCount(), 0);
    },
    { noConn: true },
  ));

test('executeRun: include de teste único seta lastRun type test', async () =>
  withExecEnv(async () => {
    const { state, testItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [testItem] } as any;

    mock.method(cliInfo, 'getCliInfo', async () => ({ cliVersion: '3.2.3', apiVersion: '3.2.3' }));
    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });
    mock.method(cli, 'runCli', async (_file: string, args: string[]) => {
      const o = args.find((a) => a.startsWith('-o='));
      fs.writeFileSync(String(o).slice(3), JUNIT_OK);
      return { code: 0, stdout: '', stderr: '' };
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);
    assert.strictEqual(run.passedCount(), 1);
    assert.strictEqual(state.getLastRun()?.type, 'test');
  }));

test('executeRun: include múltiplo seta lastRun type file', async () =>
  withExecEnv(async () => {
    const { state, suiteItem, testItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem, testItem] } as any;

    mock.method(cliInfo, 'getCliInfo', async () => ({ cliVersion: '3.2.3', apiVersion: '3.2.3' }));
    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });
    mock.method(cli, 'runCli', async (_file: string, args: string[]) => {
      const o = args.find((a) => a.startsWith('-o='));
      fs.writeFileSync(String(o).slice(3), JUNIT_OK);
      return { code: 0, stdout: '', stderr: '' };
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);
    assert.strictEqual(state.getLastRun()?.type, 'file');
  }));

test('executeRun: sem include roda "all" via controller.items', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = {
      createTestRun: () => run,
      items: { forEach: (cb: (i: any) => void) => [suiteItem].forEach(cb) },
    } as any;

    mock.method(cliInfo, 'getCliInfo', async () => ({ cliVersion: '3.2.3', apiVersion: '3.2.3' }));
    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });
    mock.method(cli, 'runCli', async (_file: string, args: string[]) => {
      const o = args.find((a) => a.startsWith('-o='));
      fs.writeFileSync(String(o).slice(3), JUNIT_OK);
      return { code: 0, stdout: '', stderr: '' };
    });

    await executeRun(controller, {} as any, NEVER_TOKEN as any, false, state);
    assert.strictEqual(run.passedCount(), 1);
    assert.strictEqual(state.getLastRun()?.type, 'all');
  }));

test('executeRun: info com db antigo mostra aviso de versão', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    mock.method(cliInfo, 'getCliInfo', async () => ({
      cliVersion: '3.2.3',
      apiVersion: '3.2.3',
      dbVersion: '3.0.9',
    }));
    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });
    mock.method(cli, 'runCli', async (_file: string, args: string[]) => {
      const o = args.find((a) => a.startsWith('-o='));
      fs.writeFileSync(String(o).slice(3), JUNIT_OK);
      return { code: 0, stdout: '', stderr: '' };
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);
    assert.match(run.output(), /anterior a 3\.1\.0/);
  }));

test('executeRun: erro oracle não-Error é stringificado', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    const { __setConfigValue } = await import('../vscode-stub.js');
    __setConfigValue('runnerMode', 'oracle');
    mock.method(cliInfo, 'getCliInfo', async () => ({ cliVersion: '3.2.3', apiVersion: '3.2.3' }));
    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw 'mensagem crua';
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);
    assert.match(run.output(), /mensagem crua/);
  }));

test('executeRun: extraReporter adiciona -f ao CLI', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    state.setExtraReporter('ut_custom');
    const run = new vscode.TestRun();
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    mock.method(cliInfo, 'getCliInfo', async () => ({ cliVersion: '3.2.3', apiVersion: '3.2.3' }));
    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });
    mock.method(cli, 'runCli', async (_file: string, args: string[]) => {
      assert.ok(args.includes('-f=ut_custom'), 'deveria incluir -f=ut_custom');
      const o = args.find((a) => a.startsWith('-o='));
      fs.writeFileSync(String(o).slice(3), JUNIT_OK);
      return { code: 0, stdout: '', stderr: '' };
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);
    assert.strictEqual(run.passedCount(), 1);
  }));

test('executeRun: coverage true chama applyCoverage', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    const { __setConfigValue } = await import('../vscode-stub.js');
    __setConfigValue('sqlCoverageEnabled', false);
    mock.method(cliInfo, 'getCliInfo', async () => ({ cliVersion: '3.2.3', apiVersion: '3.2.3' }));
    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });
    mock.method(cli, 'runCli', async (_file: string, args: string[]) => {
      const o = args.find((a) => a.startsWith('-o='));
      fs.writeFileSync(String(o).slice(3), JUNIT_OK);
      return { code: 0, stdout: '', stderr: '' };
    });

    await executeRun(controller, request, NEVER_TOKEN as any, true, state);
    assert.strictEqual(run.passedCount(), 1);
    assert.match(run.output(), /com cobertura/);
  }));

test('executeRun: additionalReporters filtra built-in e adiciona custom', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    const { __setConfigValue } = await import('../vscode-stub.js');
    __setConfigValue('additionalReporters', ['UT_JUNIT_REPORTER', 'ut_custom']);
    __setConfigValue('timeoutMinutes', 30);
    __setConfigValue('dbmsOutput', true);
    mock.method(cliInfo, 'getCliInfo', async () => ({ cliVersion: '3.2.3', apiVersion: '3.2.3' }));
    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });
    mock.method(cli, 'runCli', async (_file: string, args: string[]) => {
      assert.ok(args.includes('-f=ut_custom'), 'custom reporter deveria ser adicionado');
      assert.ok(!args.some((a) => a === '-f=UT_JUNIT_REPORTER'), 'built-in deveria ser filtrado');
      assert.ok(args.includes('-t=30'), 'timeout deveria ser 30');
      assert.ok(args.includes('-D'), 'dbmsOutput deveria adicionar -D');
      const o = args.find((a) => a.startsWith('-o='));
      fs.writeFileSync(String(o).slice(3), JUNIT_OK);
      return { code: 0, stdout: '', stderr: '' };
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);
    assert.strictEqual(run.passedCount(), 1);
  }));

test('executeRun: stderr gera diagnóstico de compilação', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    const { __setConfigValue } = await import('../vscode-stub.js');
    __setConfigValue('compilationDiagnosticsEnabled', true);
    mock.method(cliInfo, 'getCliInfo', async () => ({ cliVersion: '3.2.3', apiVersion: '3.2.3' }));
    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });
    mock.method(cli, 'runCli', async (_file: string, args: string[]) => {
      const o = args.find((a) => a.startsWith('-o='));
      fs.writeFileSync(String(o).slice(3), JUNIT_OK);
      return { code: 0, stdout: '', stderr: 'PLS-00103: erro sintaxe' };
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);
    assert.strictEqual(run.passedCount(), 1);
    assert.match(run.output(), /PLS-00103/);
  }));

test('executeRun: erro de invocação do CLI é reportado', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    const { __setConfigValue } = await import('../vscode-stub.js');
    __setConfigValue('invocation', 'java');
    __setConfigValue('javaPath', '');
    mock.method(cliInfo, 'getCliInfo', async () => ({ cliVersion: '3.2.3', apiVersion: '3.2.3' }));
    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });
    mock.method(cli, 'runCli', async () => ({ code: 0, stdout: '', stderr: '' }));

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);
    assert.match(run.output(), /erro/i);
  }));

test('executeRun: coverage com listReporters com erro desabilita cobertura', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    const { __setConfigValue } = await import('../vscode-stub.js');
    __setConfigValue('sqlCoverageEnabled', false);
    mock.method(cliInfo, 'getCliInfo', async () => ({ cliVersion: '3.2.3', apiVersion: '3.2.3' }));
    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });
    mock.method(cli, 'runCli', async (_file: string, args: string[]) => {
      const o = args.find((a) => a.startsWith('-o='));
      fs.writeFileSync(String(o).slice(3), JUNIT_OK);
      return { code: 0, stdout: '', stderr: '' };
    });
    mock.method(cliReporters, 'listReporters', async () => ({ error: 'falha' }));

    await executeRun(controller, request, NEVER_TOKEN as any, true, state);
    assert.match(run.output(), /cobertura.*desabilitada|reporterListFailed|cobertura/i);
  }));

test('executeRun: coverage sem reporter cobertura desabilita', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    const { __setConfigValue } = await import('../vscode-stub.js');
    __setConfigValue('sqlCoverageEnabled', false);
    mock.method(cliInfo, 'getCliInfo', async () => ({ cliVersion: '3.2.3', apiVersion: '3.2.3' }));
    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });
    mock.method(cli, 'runCli', async (_file: string, args: string[]) => {
      const o = args.find((a) => a.startsWith('-o='));
      fs.writeFileSync(String(o).slice(3), JUNIT_OK);
      return { code: 0, stdout: '', stderr: '' };
    });
    mock.method(cliReporters, 'listReporters', async () => ['ut_documentation_reporter']);

    await executeRun(controller, request, NEVER_TOKEN as any, true, state);
    assert.match(run.output(), /reporter.*cobertura|cobertura/i);
  }));

test('executeRun: quiet, failureExitCode e extraRunArgs passam ao CLI', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    const { __setConfigValue } = await import('../vscode-stub.js');
    __setConfigValue('quiet', true);
    __setConfigValue('failureExitCode', 3);
    __setConfigValue('extraRunArgs', ['-Dcustom', '--foo=1']);
    mock.method(cliInfo, 'getCliInfo', async () => ({ cliVersion: '3.2.3', apiVersion: '3.2.3' }));
    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });
    mock.method(cli, 'runCli', async (_file: string, args: string[]) => {
      assert.ok(args.includes('-q'), 'quiet deveria adicionar -q');
      assert.ok(args.includes('--failure-exit-code=3'));
      assert.ok(args.includes('-Dcustom'));
      assert.ok(args.includes('--foo=1'));
      const o = args.find((a) => a.startsWith('-o='));
      fs.writeFileSync(String(o).slice(3), JUNIT_OK);
      return { code: 0, stdout: '', stderr: '' };
    });

    await executeRun(controller, request, NEVER_TOKEN as any, false, state);
    assert.strictEqual(run.passedCount(), 1);
  }));

test('executeRun: onComplete recebe contagens do JUnit', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    mock.method(cliInfo, 'getCliInfo', async () => ({ cliVersion: '3.2.3', apiVersion: '3.2.3' }));
    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });
    mock.method(cli, 'runCli', async (_file: string, args: string[]) => {
      const o = args.find((a) => a.startsWith('-o='));
      fs.writeFileSync(String(o).slice(3), JUNIT_OK);
      return { code: 0, stdout: '', stderr: '' };
    });

    let complete: number[] | undefined;
    await executeRun(
      controller,
      request,
      NEVER_TOKEN as any,
      false,
      state,
      undefined,
      (p: number, f: number, s: number, e: number) => {
        complete = [p, f, s, e];
      },
    );
    assert.ok(complete, 'onComplete deveria ser chamado');
    assert.deepStrictEqual(complete, [1, 0, 0, 0]);
  }));

test('executeRun: onSuiteStart é chamado para suites', async () =>
  withExecEnv(async () => {
    const { state, suiteItem } = makeExecState();
    const run = new vscode.TestRun();
    const controller = { createTestRun: () => run, items: { forEach: () => {} } } as any;
    const request = { include: [suiteItem] } as any;

    mock.method(cliInfo, 'getCliInfo', async () => ({ cliVersion: '3.2.3', apiVersion: '3.2.3' }));
    mock.method(oracleRunner, 'executeRunOracle', async () => {
      throw new Error('sem oracle');
    });
    mock.method(cli, 'runCli', async (_file: string, args: string[]) => {
      const o = args.find((a) => a.startsWith('-o='));
      fs.writeFileSync(String(o).slice(3), JUNIT_OK);
      return { code: 0, stdout: '', stderr: '' };
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
    assert.strictEqual(run.passedCount(), 1);
    assert.strictEqual(suiteStarts, 1);
  }));
