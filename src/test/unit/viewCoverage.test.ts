import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';
import { discoverViewFiles, matchExecutedViews, viewNameFromPath } from '../../viewCoverage';

test('viewNameFromPath: extrai nome do objeto em maiusculas', () => {
  assert.strictEqual(viewNameFromPath('/ws/install/views/vw_vendedor.sql'), 'VW_VENDEDOR');
});

test('matchExecutedViews: view executada quando SQL_TEXT contem o nome', () => {
  const files = [
    { uri: { fsPath: '/ws/install/views/vw_vendedor.sql' } },
    { uri: { fsPath: '/ws/install/views/vw_total.sql' } },
  ];
  const executed = matchExecutedViews(
    ['SELECT * FROM vw_vendedor WHERE 1=1', 'SELECT 1 FROM dual'],
    files as never,
  );
  assert.deepStrictEqual(executed, [true, false]);
});

test('matchExecutedViews: case-insensitive e word boundary', () => {
  const files = [{ uri: { fsPath: '/ws/install/views/vw_sales.sql' } }];
  assert.deepStrictEqual(matchExecutedViews(['select * from VW_SALES x'], files as never), [true]);
  // não casa prefixo (v_w_sales vs vw_sales2)
  assert.deepStrictEqual(matchExecutedViews(['vw_sales2'], files as never), [false]);
});

test('matchExecutedViews: V$SQL vazio → nada executado', () => {
  const files = [{ uri: { fsPath: '/ws/install/views/vw_x.sql' } }];
  assert.deepStrictEqual(matchExecutedViews([], files as never), [false]);
});

test('matchExecutedViews: nome com regex special e escapado', () => {
  const files = [{ uri: { fsPath: '/ws/install/views/vw_(tmp).sql' } }];
  const executed = matchExecutedViews(['select * from vw_(tmp)'], files as never);
  assert.deepStrictEqual(executed, [true]);
});

test('discoverViewFiles: encontra .sql sob views/ recursivamente', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'views-'));
  try {
    const viewsDir = path.join(base, 'install', 'views');
    fs.mkdirSync(path.join(viewsDir, 'sub'), { recursive: true });
    fs.writeFileSync(path.join(viewsDir, 'vw_a.sql'), 'CREATE VIEW vw_a AS ...');
    fs.writeFileSync(path.join(viewsDir, 'sub', 'vw_b.sql'), 'CREATE VIEW vw_b AS ...');
    fs.writeFileSync(path.join(viewsDir, 'not-a-view.txt'), 'x');
    const files = discoverViewFiles(base, 'install').sort();
    assert.deepStrictEqual(files.map((f) => path.basename(f)).sort(), ['vw_a.sql', 'vw_b.sql']);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('discoverViewFiles: sem pasta views retorna vazio', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'views-'));
  try {
    assert.deepStrictEqual(discoverViewFiles(base, 'install'), []);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});
