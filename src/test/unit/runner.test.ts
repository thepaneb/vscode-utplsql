import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';
import type { TestCaseResult } from '../../junit';
import { applyCoverage, applyResults, countResults, lastSegment } from '../../runner';

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
