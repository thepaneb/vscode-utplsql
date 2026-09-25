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
  prdCleanup,
  run,
} = require('../../../scripts/brain-build.cjs') as {
  syncDir: (
    src: string,
    dst: string,
    relLabel: string,
    check: boolean,
    mirror: boolean,
  ) => { changed: number; drifted: number; total: number };
  published: (vault?: string) => Array<{
    note: string;
    rel: string;
    target: string;
    body: string;
    prd?: boolean;
    prdIndex?: boolean;
    status?: string;
  }>;
  prdCleanup: (
    items: Array<{ prd?: boolean; target: string }>,
    check: boolean,
    repo?: string,
  ) => { changed: number; drifted: number };
  run: (check: boolean, options?: { repo?: string; vault?: string }) => number;
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

function withTempDir(prefix: string, fn: (dir: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function writeFixture(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function captureLogs(fn: () => number): { result: number; output: string } {
  const originalLog = console.log;
  const lines: string[] = [];
  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(' '));
  };
  try {
    return { result: fn(), output: lines.join('\n') };
  } finally {
    console.log = originalLog;
  }
}

function makeBuildFixture(root: string): { repo: string; vault: string; target: string } {
  const repo = path.join(root, 'repo');
  const vault = path.join(root, 'vault');
  const target = path.join(repo, 'docs', 'wiki', 'Generated.md');
  writeFixture(
    path.join(vault, '70-Wiki', 'Generated.md'),
    '---\ntipo: wiki\npublicar: docs/wiki/Generated.md\n---\n# Generated\n',
  );
  return { repo, vault, target };
}

test('brain-build: parseFrontmatter separa frontmatter e corpo', () => {
  const { fm, body, hasFm } = parseFrontmatter(
    '---\ntipo: wiki\npublicar: docs/wiki/A.md\n---\n# A\n',
  );
  assert.strictEqual(hasFm, true);
  assert.strictEqual(fm.tipo, 'wiki');
  assert.strictEqual(fm.publicar, 'docs/wiki/A.md');
  assert.strictEqual(body, '# A\n');
});

test('brain-build: parseFrontmatter aceita CRLF, remove aspas e ignora linhas inválidas', () => {
  const parsed = parseFrontmatter(
    '---\r\ntipo: "wiki"\r\npublicar: \'docs/wiki/A.md\'\r\nlinha sem campo\r\n---\r\n# A\r\n',
  );
  assert.deepStrictEqual(parsed.fm, { tipo: 'wiki', publicar: 'docs/wiki/A.md' });
  assert.strictEqual(parsed.body, '# A\r\n');
  assert.strictEqual(parsed.hasFm, true);

  const plain = parseFrontmatter('# Nota sem frontmatter\n');
  assert.deepStrictEqual(plain, { fm: {}, body: '# Nota sem frontmatter\n', hasFm: false });
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

test('brain-build: readmeLinks preserva o alvo quando não há alias', () => {
  assert.strictEqual(
    readmeLinks('veja [[README (extensão)]]'),
    'veja [README (extensão)](README.md)',
  );
  assert.strictEqual(readmeLinks('[[Página]]'), '[Página](Página.md)');
});

test('brain-build: withStatus injeta na tabela e na seção', () => {
  const table = '# T\n\n| Campo | Valor |\n|---|---|\n| Autor | X |\n';
  assert.match(withStatus(table, 'Concluído'), /\| Status \| Concluído \|/);
  const section = '# T\n\n## Resumo\n\nX\n';
  assert.match(withStatus(section, 'Proposto'), /## Status\n\nProposto/);
});

test('brain-build: withStatus substitui os formatos existentes de status', () => {
  const table = '# T\n\n| Status | Antigo |\n|---|---|\n';
  const tableOut = withStatus(table, 'Concluído');
  assert.match(tableOut, /\| Status \| Concluído \|/);
  assert.doesNotMatch(tableOut, /Antigo/);

  const section = '# T\n\n## Status\n\nAntigo\n\n## Detalhes\n';
  assert.strictEqual(
    withStatus(section, 'Proposto'),
    '# T\n\n## Status\n\nProposto\n\n## Detalhes\n',
  );
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

test('brain-build: syncDir cria target ausente e não espelha quando mirror=false', () => {
  withTempDir('bb-missing-target-', (dir) => {
    const src = path.join(dir, 'src');
    const dst = path.join(dir, 'nested', 'dst');
    writeFixture(path.join(src, 'a.png'), 'A');

    const first = syncDir(src, dst, 'rel/', false, false);
    assert.deepStrictEqual(first, { changed: 1, drifted: 0, total: 1 });
    assert.strictEqual(fs.readFileSync(path.join(dst, 'a.png'), 'utf8'), 'A');

    fs.writeFileSync(path.join(dst, 'extra.bin'), 'extra');
    const second = syncDir(src, dst, 'rel/', false, false);
    assert.deepStrictEqual(second, { changed: 0, drifted: 0, total: 1 });
    assert.ok(fs.existsSync(path.join(dst, 'extra.bin')));
  });
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

test('brain-build: published usa o frontmatter para filtrar e classificar notas', () => {
  withTempDir('bb-published-', (dir) => {
    const vault = path.join(dir, 'vault');
    writeFixture(
      path.join(vault, '20-PRDs', 'prd-ok.md'),
      '---\ntipo: prd\nstatus: proposed\n---\n# PRD\n',
    );
    writeFixture(
      path.join(vault, '20-PRDs', 'prd-invalid.md'),
      '---\ntipo: prd\nstatus: rejected\npublicar: docs/prd/rejected/prd-invalid.md\n---\n# Invalid\n',
    );
    writeFixture(
      path.join(vault, '20-PRDs', 'index.md'),
      '---\ntipo: prd-index\npublicar: docs/prd/index.md\n---\n# PRDs\n',
    );
    writeFixture(
      path.join(vault, '70-Wiki', 'Guide.md'),
      '---\ntipo: wiki\npublicar: docs/wiki/Guide.md\n---\n# Guide\n',
    );
    writeFixture(
      path.join(vault, '60-README', 'README (extensão).md'),
      '---\ntipo: readme\npublicar: README.md\n---\n# Readme\n',
    );
    writeFixture(path.join(vault, 'plain.md'), '# Plain\n');
    writeFixture(path.join(vault, '.obsidian', 'ignored.md'), '# Ignored\n');
    writeFixture(path.join(vault, '_templates', 'ignored.md'), '# Ignored\n');
    writeFixture(path.join(vault, '.trash', 'ignored.md'), '# Ignored\n');
    writeFixture(path.join(vault, '70-Wiki', 'not-markdown.txt'), 'ignored');

    const items = published(vault);
    const byRel = new Map(items.map((item) => [item.rel, item]));
    assert.deepStrictEqual(published(path.join(dir, 'missing-vault')), []);
    assert.strictEqual(byRel.get('20-PRDs/prd-ok.md')?.prd, true);
    assert.strictEqual(byRel.get('20-PRDs/prd-ok.md')?.status, 'proposed');
    assert.strictEqual(byRel.get('20-PRDs/index.md')?.prdIndex, true);
    assert.strictEqual(byRel.get('70-Wiki/Guide.md')?.target, 'docs/wiki/Guide.md');
    assert.strictEqual(byRel.get('60-README/README (extensão).md')?.target, 'README.md');
    assert.strictEqual(byRel.has('20-PRDs/prd-invalid.md'), false);
    assert.strictEqual(byRel.has('plain.md'), false);
    assert.strictEqual(byRel.has('.obsidian/ignored.md'), false);
  });
});

test('brain-build: prdCleanup preserva wanted, remove stale e ignora não-markdown', () => {
  withTempDir('bb-prd-cleanup-', (dir) => {
    const repo = path.join(dir, 'repo');
    const proposed = path.join(repo, 'docs', 'prd', 'proposed');
    writeFixture(path.join(proposed, 'wanted.md'), 'Wanted\n');
    writeFixture(path.join(proposed, 'stale.md'), 'Stale\n');
    writeFixture(path.join(proposed, 'metadata.json'), '{}\n');

    const items = [
      { prd: true, target: 'docs/prd/proposed/wanted.md' },
      { prd: false, target: 'docs/prd/proposed/ignored.md' },
    ];
    const result = prdCleanup(items, false, repo);
    assert.deepStrictEqual(result, { changed: 1, drifted: 0 });
    assert.ok(fs.existsSync(path.join(proposed, 'wanted.md')));
    assert.ok(!fs.existsSync(path.join(proposed, 'stale.md')));
    assert.ok(fs.existsSync(path.join(proposed, 'metadata.json')));

    writeFixture(path.join(proposed, 'stale-check.md'), 'Stale\n');
    const check = prdCleanup(items, true, repo);
    assert.deepStrictEqual(check, { changed: 0, drifted: 1 });
    assert.ok(fs.existsSync(path.join(proposed, 'stale-check.md')));
    assert.ok(!fs.existsSync(path.join(repo, 'docs', 'prd', 'approved')));
  });
});

test('brain-build: run(true) reporta drift sem escrever no repo', () => {
  withTempDir('bb-run-check-', (dir) => {
    const { repo, vault, target } = makeBuildFixture(dir);
    writeFixture(target, 'stale\n');

    const captured = captureLogs(() => run(true, { repo, vault }));
    assert.strictEqual(captured.result, 1);
    assert.match(captured.output, /\[drift\] docs\/wiki\/Generated\.md/);
    assert.match(captured.output, /1 arquivo\(s\) com drift/);
    assert.strictEqual(fs.readFileSync(target, 'utf8'), 'stale\n');
  });
});

test('brain-build: run(false) gera uma vez e a segunda execução é idempotente', () => {
  withTempDir('bb-run-build-', (dir) => {
    const { repo, vault, target } = makeBuildFixture(dir);

    const first = captureLogs(() => run(false, { repo, vault }));
    assert.strictEqual(first.result, 0);
    assert.match(first.output, /1 arquivo\(s\) atualizado\(s\)/);
    const generated = fs.readFileSync(target, 'utf8');
    assert.match(generated, /GENERATED FROM docs\/brain\/70-Wiki\/Generated\.md/);

    const second = captureLogs(() => run(false, { repo, vault }));
    assert.strictEqual(second.result, 0);
    assert.match(second.output, /0 arquivo\(s\) atualizado\(s\)/);
    assert.strictEqual(fs.readFileSync(target, 'utf8'), generated);
  });
});

test('brain-build.cjs: CLI sem vault termina sem gerar', () => {
  withTempDir('bb-no-vault-', (dir) => {
    const script = path.join(dir, 'brain-build.cjs');
    fs.copyFileSync(path.join(ROOT, 'scripts', 'brain-build.cjs'), script);
    const r = spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' });
    assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout, /Vault docs\/brain ausente — nada a gerar\./);
  });
});

test('brain-build.cjs: check do repo atual não reporta drift', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'brain-build.cjs'), 'check'], {
    encoding: 'utf8',
  });
  assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /em sincronia|OK/);
});
