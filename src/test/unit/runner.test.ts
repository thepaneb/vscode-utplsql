import assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';
import { applyResults, findByNameOnly, lastSegment } from '../../runner';
import type { ItemMeta } from '../../types';

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

function makeTestItem(id: string, meta?: ItemMeta) {
  const item = { id, children: [] } as any;
  if (meta) {
    const state = { getMeta: () => meta };
    return { item, state };
  }
  return { item, state: { getMeta: () => undefined } };
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

test('findByNameOnly: encontra por procName', () => {
  const { item } = makeTestItem('test_1', makeMeta({ procName: 'proc_x', description: 'desc x' }));
  const items = [item];
  const state = { getMeta: (t: any) => t.meta } as any;
  item.meta = makeMeta({ procName: 'proc_x', description: 'desc x' });
  const found = findByNameOnly(items, 'proc_x', state);
  assert.ok(found);
  assert.strictEqual(found.id, 'test_1');
});

test('findByNameOnly: encontra por description', () => {
  const { item } = makeTestItem('test_1', makeMeta({ procName: 'proc_x', description: 'desc x' }));
  const items = [item];
  const state = { getMeta: (t: any) => t.meta } as any;
  item.meta = makeMeta({ procName: 'proc_x', description: 'desc x' });
  const found = findByNameOnly(items, 'desc x', state);
  assert.ok(found);
  assert.strictEqual(found.id, 'test_1');
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
