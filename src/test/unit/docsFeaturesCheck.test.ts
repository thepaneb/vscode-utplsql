import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';

const { checkFeatures, loadRegistry, main, wikiPath } =
  require('../../../scripts/docs-features-check.cjs') as {
    checkFeatures: (o?: { root?: string; version?: string; registry?: unknown[] }) => string[];
    loadRegistry: (root?: string) => unknown[];
    main: (argv?: string[], root?: string) => number;
    wikiPath: (root: string, wiki: string) => string;
  };

function write(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function fixture(registry: unknown[]): { root: string; cleanup: () => void } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-features-'));
  write(path.join(root, 'package.json'), JSON.stringify({ version: '1.2.3' }));
  write(
    path.join(root, 'CHANGELOG.md'),
    '# Changelog\n\n## 1.2.3\n\n- Feature X (PRD-200)\n\n## 1.2.2\n\n- old\n',
  );
  write(
    path.join(root, 'docs', 'brain', '20-PRDs', 'prd-200-demo.md'),
    '---\ntipo: prd\nid: PRD-200\nstatus: completed\nversao: "1.2.3"\ntitulo: Demo\n---\n\n# Demo\n',
  );
  write(
    path.join(root, 'docs', 'brain', '10-Projeto', 'Registro de features.md'),
    '---\ntipo: nota\n---\n\n```json\n' + JSON.stringify(registry) + '\n```\n',
  );
  return { root, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test('docs-features: PRD interna só exige registro + CHANGELOG', () => {
  const { root, cleanup } = fixture([{ id: 'x', prd: 'PRD-200', interno: true }]);
  try {
    assert.deepStrictEqual(checkFeatures({ root, version: '1.2.3' }), []);
  } finally {
    cleanup();
  }
});

test('docs-features: PRD concluída sem entrada no registro é reportada', () => {
  const { root, cleanup } = fixture([{ id: 'outra', prd: 'PRD-999', interno: true }]);
  try {
    const problems = checkFeatures({ root, version: '1.2.3' });
    assert.ok(problems.some((p) => p.includes('PRD-200') && p.includes('registro')));
  } finally {
    cleanup();
  }
});

test('docs-features: feature de usuário exige bullet, âncora e wiki', () => {
  const { root, cleanup } = fixture([{ id: 'x', prd: 'PRD-200' }]);
  try {
    const problems = checkFeatures({ root, version: '1.2.3' });
    assert.ok(problems.some((p) => p.includes('readme_bullet')));
    assert.ok(problems.some((p) => p.includes('readme_anchor')));
    assert.ok(problems.some((p) => p.includes('wiki')));
  } finally {
    cleanup();
  }
});

test('docs-features: feature de usuário com assets passa (sem docs/linkedin local)', () => {
  const { root, cleanup } = fixture([
    {
      id: 'x',
      prd: 'PRD-200',
      readme_bullet: 'Feature X',
      readme_anchor: '🚀 Feature X',
      wiki: 'Feature',
    },
  ]);
  try {
    write(path.join(root, 'README.md'), '# Demo\n\nFeature X\n');
    write(path.join(root, 'README.pt.md'), '# Demo\n\n🚀 Feature X\n');
    write(path.join(root, 'docs', 'wiki', 'Feature.md'), '# Feature\n\nPRD-200\n');
    assert.deepStrictEqual(checkFeatures({ root, version: '1.2.3' }), []);
  } finally {
    cleanup();
  }
});

test('docs-features: variante sem a âncora é reportada', () => {
  const { root, cleanup } = fixture([
    {
      id: 'x',
      prd: 'PRD-200',
      readme_bullet: 'Feature X',
      readme_anchor: '🚀 Feature X',
      wiki: 'Feature',
    },
  ]);
  try {
    write(path.join(root, 'README.md'), '# Demo\n\nFeature X\n');
    write(path.join(root, 'README.pt.md'), '# Demo\n\nsem ancora\n');
    write(path.join(root, 'docs', 'wiki', 'Feature.md'), '# Feature\n\nPRD-200\n');
    const problems = checkFeatures({ root, version: '1.2.3' });
    assert.ok(problems.some((p) => p.includes('README.pt.md')));
  } finally {
    cleanup();
  }
});

test('docs-features: versão default vem do package.json e PRD de outra versão é ignorada', () => {
  const { root, cleanup } = fixture([{ id: 'x', prd: 'PRD-200', interno: true }]);
  try {
    write(
      path.join(root, 'docs', 'brain', '20-PRDs', 'prd-199-old.md'),
      '---\ntipo: prd\nid: PRD-199\nstatus: completed\nversao: "1.2.2"\ntitulo: Old\n---\n',
    );
    assert.deepStrictEqual(checkFeatures({ root }), []);
  } finally {
    cleanup();
  }
});

test('docs-features: package.json sem versão é reportado', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-features-nover-'));
  try {
    write(path.join(root, 'package.json'), '{}');
    assert.ok(checkFeatures({ root }).some((p) => p.includes('versão ausente')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('docs-features: registro vazio é reportado', () => {
  const { root, cleanup } = fixture([]);
  try {
    assert.ok(checkFeatures({ root, version: '1.2.3' }).some((p) => p.includes('registro')));
  } finally {
    cleanup();
  }
});

test('docs-features: CHANGELOG sem a seção da versão é reportado', () => {
  const { root, cleanup } = fixture([{ id: 'x', prd: 'PRD-200', interno: true }]);
  try {
    write(path.join(root, 'CHANGELOG.md'), '# Changelog\n\n## 1.2.2\n\n- old\n');
    assert.ok(checkFeatures({ root, version: '1.2.3' }).some((p) => p.includes('CHANGELOG')));
  } finally {
    cleanup();
  }
});

test('docs-features: feature de usuário com docs/linkedin exige posts e cards', () => {
  const { root, cleanup } = fixture([
    {
      id: 'x',
      prd: 'PRD-200',
      readme_bullet: 'Feature X',
      readme_anchor: '🚀 Feature X',
      wiki: 'wiki/Feature.md',
    },
  ]);
  try {
    write(path.join(root, 'README.md'), '# Demo\n\nFeature X\n');
    write(path.join(root, 'README.pt.md'), '# Demo\n\n🚀 Feature X\n');
    write(path.join(root, 'docs', 'wiki', 'Feature.md'), '# Feature\n\nPRD-200\n');
    fs.mkdirSync(path.join(root, 'docs', 'linkedin'), { recursive: true });
    const problems = checkFeatures({ root, version: '1.2.3' });
    assert.ok(problems.some((p) => p.includes('LinkedIn')));
    assert.ok(problems.some((p) => p.includes('cards')));
  } finally {
    cleanup();
  }
});

test('docs-features: feature de usuário com posts/cards presentes passa', () => {
  const { root, cleanup } = fixture([
    {
      id: 'x',
      prd: 'PRD-200',
      readme_bullet: 'Feature X',
      readme_anchor: '🚀 Feature X',
      wiki: 'Feature',
      linkedin: ['docs/linkedin/features/x-pt.md', 'docs/linkedin/features/x-en.md'],
      card: ['docs/linkedin/assets/x.png', 'docs/linkedin/assets/x-en.png'],
    },
  ]);
  try {
    write(path.join(root, 'README.md'), '# Demo\n\nFeature X\n');
    write(path.join(root, 'README.pt.md'), '# Demo\n\n🚀 Feature X\n');
    write(path.join(root, 'docs', 'wiki', 'Feature.md'), '# Feature\n\nPRD-200\n');
    for (const rel of [
      'docs/linkedin/features/x-pt.md',
      'docs/linkedin/features/x-en.md',
      'docs/linkedin/assets/x.png',
      'docs/linkedin/assets/x-en.png',
    ]) {
      write(path.join(root, rel), 'x');
    }
    assert.deepStrictEqual(checkFeatures({ root, version: '1.2.3' }), []);
  } finally {
    cleanup();
  }
});

test('docs-features: wikiPath normaliza prefixo/extensão e main retorna código', () => {
  const { root, cleanup } = fixture([{ id: 'x', prd: 'PRD-200', interno: true }]);
  try {
    assert.strictEqual(
      wikiPath(root, 'wiki/Database-requirements.md'),
      path.join(root, 'docs', 'wiki', 'Database-requirements.md'),
    );
    assert.strictEqual(main([], root), 0);
    assert.strictEqual(main(['1.2.3'], root), 0);
  } finally {
    cleanup();
  }
});

test('docs-features: main retorna 1 quando há problema', () => {
  const { root, cleanup } = fixture([{ id: 'outra', prd: 'PRD-999', interno: true }]);
  try {
    assert.strictEqual(main(['1.2.3'], root), 1);
  } finally {
    cleanup();
  }
});

test('docs-features: loadRegistry lê o bloco JSON e tolera ausência', () => {
  const { root, cleanup } = fixture([{ id: 'x', prd: 'PRD-200', interno: true }]);
  try {
    assert.deepStrictEqual(loadRegistry(root), [{ id: 'x', prd: 'PRD-200', interno: true }]);
    assert.deepStrictEqual(loadRegistry(path.join(root, 'nao-existe')), []);
  } finally {
    cleanup();
  }
});
