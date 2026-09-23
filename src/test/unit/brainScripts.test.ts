import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';

// Testa os helpers do script scripts/brain.cjs (geradores de índice do vault).
const {
  parseFm,
  yamlBlock,
  genPrdRoadmap,
  genPrdEstrutura,
  genConexoes,
  genMocIndex,
  pipelineNotes,
  localeNotes,
} = require('../../../scripts/brain.cjs') as {
  parseFm: (t: string) => Record<string, string>;
  yamlBlock: (t: string, key: string) => string[];
  genPrdRoadmap: (notes: Record<string, string>[]) => string;
  genPrdEstrutura: (notes: Record<string, string>[]) => string;
  genConexoes: (notePath: string) => string;
  genMocIndex: (notePath: string) => string;
  pipelineNotes: () => { dir: string; file: string; content: string }[];
  localeNotes: () => { dir: string; file: string; content: string }[];
};

const prd = (over: Record<string, string>) => ({
  id: 'PRD-01',
  status: 'completed',
  titulo: 'A',
  file: 'prd-01-a.md',
  versao: '0.1.0',
  data: '2026-01-01',
  ...over,
});

test('brain: parseFm lê escalares entre aspas', () => {
  const fm = parseFm('---\nid: PRD-85\nstatus: in-progress\ntitulo: "Um: título"\n---\n');
  assert.strictEqual(fm.id, 'PRD-85');
  assert.strictEqual(fm.status, 'in-progress');
  assert.strictEqual(fm.titulo, 'Um: título');
});

test('brain: yamlBlock extrai bloco e valor inline', () => {
  const yml =
    'name: X\non:\n  push:\n    branches: [main]\n  workflow_dispatch:\njobs:\n  build:\n    steps: []\n';
  assert.deepStrictEqual(yamlBlock(yml, 'on'), [
    '  push:',
    '    branches: [main]',
    '  workflow_dispatch:',
  ]);
  assert.deepStrictEqual(yamlBlock('on: push\n', 'on'), ['__inline__:push']);
});

test('brain: genPrdRoadmap agrupa por status e versão', () => {
  const md = genPrdRoadmap([
    prd({}),
    prd({
      id: 'PRD-02',
      status: 'proposed',
      titulo: 'B',
      file: 'prd-02-b.md',
      versao: '0.2.0',
      versao_titulo: '0.2.0 — X',
    }),
  ]);
  assert.match(md, /### 🟢 Concluídos/);
  assert.match(md, /\[A\]\(\.\.\/\.\.\/\.\.\/docs\/prd\/completed\/prd-01-a\.md\)/);
  assert.match(md, /#### 0\.2\.0 — X/);
  assert.match(md, /### ⚪ Propostos/);
});

test('brain: genPrdEstrutura lista as pastas e arquivos', () => {
  const md = genPrdEstrutura([prd({})]);
  assert.match(md, /completed\/\s+←/);
  assert.match(md, /prd-01-a\.md/);
});

test('brain: pipelineNotes lê os workflows do repo', () => {
  const notes = pipelineNotes();
  assert.ok(notes.length >= 3);
  const ci = notes.find((n) => n.file.includes('PIPE-ci'));
  assert.ok(ci);
  assert.strictEqual(ci?.dir, '11-Stack');
  assert.match(ci?.content ?? '', /jobs: \[build\]/);
});

test('brain: localeNotes lê os package.nls e aponta o README', () => {
  const notes = localeNotes();
  assert.strictEqual(notes.length, 24);
  const pt = notes.find((n) => n.file.includes('LOC-pt-br'));
  assert.ok(pt);
  assert.match(pt?.content ?? '', /\[\[README\.pt-BR\]\]/);
});

test('brain: genConexoes liga a nota à MOC e às referências', () => {
  const out = genConexoes(
    'docs/brain/16-Seguranca/SEC-001 - Senha Oracle nunca é gravada em settings.md',
  );
  assert.match(out, /\[\[MOC - Seguranca\]\]/);
  assert.match(out, /\[\[BR-CONN-005/);
});

test('brain: genMocIndex lista as notas da pasta como wikilinks', () => {
  const out = genMocIndex('docs/brain/17-Componentes/MOC - Componentes.md');
  assert.match(out, /\[\[TPL-ORACLEDB - node-oracledb\]\]/);
  assert.ok(!out.includes('MOC - Componentes'));
});
