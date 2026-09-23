import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';

// Testa o script scripts/brain-build.cjs (vault → repo: transformações e banner).
const { parseFrontmatter, wikiLinks, readmeLinks, withStatus, stripConexoes, render } =
  require('../../../scripts/brain-build.cjs') as {
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
