import './setup.js';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';

const ROOT = path.resolve(__dirname, '../../..');

// Testa o script scripts/brain-build.cjs (vault → repo: transformações e banner).
const {
  parseFrontmatter,
  wikiLinks,
  readmeLinks,
  withStatus,
  stripConexoes,
  render,
  syncDir,
  published,
} = require('../../../scripts/brain-build.cjs') as {
  syncDir: (
    src: string,
    dst: string,
    relLabel: string,
    check: boolean,
    mirror: boolean,
  ) => { changed: number; drifted: number; total: number };
  published: () => Array<{
    note: string;
    rel: string;
    target: string;
    body: string;
    prd?: boolean;
  }>;
  parseFrontmatter: (t: string) => { fm: Record<string, string>; body: string; hasFm: boolean };
  wikiLinks: (b: string) => string;
  readmeLinks: (b: string) => string;
  withStatus: (b: string, label: string) => string;
  stripConexoes: (b: string) => string;
  render: (i: {
    rel: string;
    target: string;
    body: string;
    prd?: boolean;
    prdIndex?: boolean;
    status?: string;
  }) => string;
};

test('brain-build: parseFrontmatter separa frontmatter e corpo', () => {
  const { fm, body, hasFm } = parseFrontmatter(
    '---\ntipo: wiki\npublicar: docs/wiki/A.md\n---\n# A\n',
  );
  assert.strictEqual(hasFm, true);
  assert.strictEqual(fm.tipo, 'wiki');
  assert.strictEqual(fm.publicar, 'docs/wiki/A.md');
  assert.strictEqual(body, '# A\n');
});

test('brain-build: wikiLinks converte wikilinks em links de wiki', () => {
  assert.strictEqual(
    wikiLinks('ver [[Architecture|Arquitetura]].'),
    'ver [Arquitetura](Architecture).',
  );
  assert.strictEqual(wikiLinks('[[Architecture]]'), '[Architecture](Architecture)');
});

test('brain-build: wikiLinks preserva imagens e links externos', () => {
  assert.strictEqual(wikiLinks('![x](images/a.png)'), '![x](images/a.png)');
  assert.strictEqual(wikiLinks('[u](https://x.y)'), '[u](https://x.y)');
});

test('brain-build: readmeLinks adiciona .md e mapeia a nota principal', () => {
  assert.strictEqual(readmeLinks('[[README.pt-BR|Português]]'), '[Português](README.pt-BR.md)');
  assert.strictEqual(readmeLinks('[[README (extensão)|English]]'), '[English](README.md)');
});

test('brain-build: withStatus injeta na tabela e na seção', () => {
  const table = '# T\n\n| Campo | Valor |\n|---|---|\n| Autor | X |\n';
  assert.match(withStatus(table, 'Concluído'), /\| Status \| Concluído \|/);
  const section = '# T\n\n## Resumo\n\nX\n';
  assert.match(withStatus(section, 'Proposto'), /## Status\n\nProposto/);
});

test('brain-build: stripConexoes remove a seção do PRD publicado', () => {
  const body =
    '# T\n\nx\n\n## Conexões\n\n<!-- brain:auto:start:conexoes -->\n- [[MOC - PRDs]]\n<!-- brain:auto:end -->\n';
  const out = stripConexoes(body);
  assert.ok(!out.includes('Conexões'));
  assert.ok(!out.includes('[['));
  assert.match(out, /# T/);
});

test('brain-build: render prefixa o banner e transforma o corpo', () => {
  const out = render({ rel: '70-Wiki/A.md', target: 'docs/wiki/A.md', body: '\n[[B|b]]\n' });
  assert.match(
    out,
    /^<!-- GENERATED FROM docs\/brain\/70-Wiki\/A\.md — DO NOT EDIT -->\n\n\[b\]\(B\)/,
  );
});

test('brain-build: render de PRD reinjeta o status do frontmatter', () => {
  const out = render({
    rel: '20-PRDs/prd-01-x.md',
    target: 'docs/prd/completed/prd-01-x.md',
    body: '# PRD-01\n\n| Campo | Valor |\n|---|---|\n| Autor | X |\n',
    prd: true,
    status: 'completed',
  });
  assert.match(out, /\| Status \| Concluído \|/);
});

test('brain-build: syncDir copia novos, ignora iguais e remove sobras no mirror', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-sync-'));
  try {
    const src = path.join(dir, 'src');
    const dst = path.join(dir, 'dst');
    fs.mkdirSync(src);
    fs.mkdirSync(dst);
    fs.writeFileSync(path.join(src, 'a.png'), 'A');
    fs.writeFileSync(path.join(src, 'b.png'), 'B');
    fs.writeFileSync(path.join(dst, 'a.png'), 'A');
    fs.writeFileSync(path.join(dst, 'sobra.png'), 'X');

    const r = syncDir(src, dst, 'rel/', false, true);
    assert.strictEqual(r.total, 2);
    assert.strictEqual(r.changed, 2); // b.png copiado + sobra.png removida
    assert.ok(fs.existsSync(path.join(dst, 'b.png')));
    assert.ok(!fs.existsSync(path.join(dst, 'sobra.png')));

    const r2 = syncDir(src, dst, 'rel/', false, true);
    assert.strictEqual(r2.changed, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('brain-build: syncDir em check detecta drift sem escrever', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-drift-'));
  try {
    const src = path.join(dir, 'src');
    const dst = path.join(dir, 'dst');
    fs.mkdirSync(src);
    fs.mkdirSync(dst);
    fs.writeFileSync(path.join(src, 'a.png'), 'A');
    fs.writeFileSync(path.join(dst, 'a.png'), 'B');
    fs.writeFileSync(path.join(dst, 'sobra.png'), 'X');

    const r = syncDir(src, dst, 'rel/', true, true);
    assert.strictEqual(r.drifted, 2); // a.png diferente + sobra.png
    assert.strictEqual(r.changed, 0);
    assert.strictEqual(fs.readFileSync(path.join(dst, 'a.png'), 'utf8'), 'B');
    assert.ok(fs.existsSync(path.join(dst, 'sobra.png')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('brain-build: syncDir com src ausente devolve zeros', () => {
  const r = syncDir('/nao/existe/mesmo', '/tmp/x', 'rel/', false, false);
  assert.deepStrictEqual(r, { changed: 0, drifted: 0, total: 0 });
});

test('brain-build: published lê o vault real e classifica os itens', () => {
  const items = published();
  assert.ok(Array.isArray(items));
  for (const item of items) {
    assert.ok(item.rel);
    assert.ok(item.target);
    assert.strictEqual(typeof item.body, 'string');
  }
  assert.ok(
    items.some((i) => i.prd),
    'deveria haver PRDs publicados',
  );
});

test('brain-build.cjs: check do repo atual não reporta drift', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'brain-build.cjs'), 'check'], {
    encoding: 'utf8',
  });
  assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /em sincronia|OK/);
});
