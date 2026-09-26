import './setup.js';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';

// Testa os helpers do script scripts/brain.cjs (geradores de índice do vault).
const {
  configure,
  sync,
  check,
  vaultNotes,
  parseFm,
  yamlBlock,
  genRootDocs,
  genReadmeVariants,
  genWikiIndex,
  genLinkedinIndex,
  genFuncionalIndex,
  genPrdRoadmap,
  genPrdEstrutura,
  genPrdSummary,
  prdNotes,
  genStack,
  genDeps,
  genConexoes,
  genMocIndex,
  pipelineNotes,
  localeNotes,
  buildCodeNoteSpecs,
  noteNames,
  generateNotes,
  resetCaches,
  runCli,
} = require('../../../scripts/brain.cjs') as {
  configure: (options?: { repo?: string; vault?: string }) => void;
  sync: () => number;
  check: () => number;
  vaultNotes: () => string[];
  parseFm: (t: string) => Record<string, string>;
  yamlBlock: (t: string, key: string) => string[];
  genRootDocs: (note: string) => string;
  genReadmeVariants: () => string;
  genWikiIndex: () => string;
  genLinkedinIndex: (note: string) => string;
  genFuncionalIndex: (note: string) => string;
  genPrdRoadmap: (notes?: Record<string, string>[]) => string;
  genPrdEstrutura: (notes?: Record<string, string>[]) => string;
  genPrdSummary: (note: string) => string;
  prdNotes: () => Record<string, string>[];
  genStack: () => string;
  genDeps: () => string;
  genConexoes: (notePath: string) => string;
  resetCaches: () => void;
  genMocIndex: (notePath: string) => string;
  pipelineNotes: () => { dir: string; file: string; content: string }[];
  localeNotes: () => { dir: string; file: string; content: string }[];
  buildCodeNoteSpecs: (refs: {
    impl: string[];
    tests: string[];
  }) => { dir: string; file: string; content: string }[];
  noteNames: (paths: string[], prefix: string) => Map<string, string>;
  generateNotes: () => number;
  runCli: (argv?: string[]) => number;
};

function writeFixture(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

const FIXTURE_COMMIT_DATE = '2024-02-03T12:00:00+00:00';
const GIT_ENV_KEYS = [
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_INDEX_FILE',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_COMMON_DIR',
  'GIT_NAMESPACE',
  'GIT_PREFIX',
  'GIT_CEILING_DIRECTORIES',
  'GIT_DISCOVERY_ACROSS_FILESYSTEM',
  'GIT_CONFIG_PARAMETERS',
  'GIT_CONFIG_COUNT',
  'GIT_CONFIG_SYSTEM',
  'GIT_CONFIG_GLOBAL',
  'GIT_CONFIG_NOSYSTEM',
];

function gitEnvKeys(env: NodeJS.ProcessEnv): string[] {
  return [
    ...GIT_ENV_KEYS,
    ...Object.keys(env).filter((key) => /^GIT_CONFIG_(?:KEY|VALUE)_\d+$/.test(key)),
  ];
}

function fixtureGitEnv(repo: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of gitEnvKeys(env)) delete env[key];
  env.GIT_AUTHOR_DATE = FIXTURE_COMMIT_DATE;
  env.GIT_COMMITTER_DATE = FIXTURE_COMMIT_DATE;
  env.GIT_CONFIG_NOSYSTEM = '1';
  env.GIT_CONFIG_GLOBAL = path.join(repo, '.git', 'global-config');
  return env;
}

function sanitizeProcessGitEnv(repo: string): () => void {
  const keys = gitEnvKeys(process.env);
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  process.env.GIT_CONFIG_NOSYSTEM = '1';
  process.env.GIT_CONFIG_GLOBAL = path.join(repo, '.git', 'global-config');
  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

function initFixtureGit(repo: string): void {
  const env = fixtureGitEnv(repo);
  execFileSync('git', ['init', '--quiet', repo], { env, stdio: 'ignore' });
  execFileSync('git', ['-C', repo, 'config', 'user.name', 'Brain Fixture'], {
    env,
    stdio: 'ignore',
  });
  execFileSync('git', ['-C', repo, 'config', 'user.email', 'fixture@example.test'], {
    env,
    stdio: 'ignore',
  });
  writeFixture(path.join(repo, '.gitkeep'), 'fixture\n');
  execFileSync('git', ['-C', repo, 'add', '--', '.gitkeep'], { env, stdio: 'ignore' });
  execFileSync('git', ['-C', repo, 'commit', '--quiet', '-m', 'fixture'], {
    env,
    stdio: 'ignore',
  });
}

function commitFixtureFiles(repo: string, files: string[]): void {
  execFileSync('git', ['-C', repo, 'add', '--', ...files], {
    env: fixtureGitEnv(repo),
    stdio: 'ignore',
  });
  execFileSync('git', ['-C', repo, 'commit', '--quiet', '-m', 'fixture files'], {
    env: fixtureGitEnv(repo),
    stdio: 'ignore',
  });
}

function withBrainFixture<T>(fn: (paths: { root: string; repo: string; vault: string }) => T): T {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-brain-'));
  const repo = path.join(root, 'repo');
  const vault = path.join(repo, 'docs', 'brain');
  fs.mkdirSync(vault, { recursive: true });
  initFixtureGit(repo);
  const restoreGitEnv = sanitizeProcessGitEnv(repo);
  try {
    configure({ repo, vault });
    return fn({ root, repo, vault });
  } finally {
    restoreGitEnv();
    configure();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function captureLogs(fn: () => number): { result: number; output: string } {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const lines: string[] = [];
  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(' '));
  };
  console.warn = (...args: unknown[]) => {
    lines.push(args.map(String).join(' '));
  };
  try {
    return { result: fn(), output: lines.join('\n') };
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
}

const prd = (over: Record<string, string>) => ({
  id: 'PRD-01',
  status: 'completed',
  titulo: 'A',
  file: 'prd-01-a.md',
  versao: '0.1.0',
  data: '2026-01-01',
  ...over,
});

test('brain: fixture permite sincronizar sem tocar no vault real', () => {
  withBrainFixture(({ repo, vault }) => {
    writeFixture(
      path.join(repo, 'package.json'),
      JSON.stringify({
        main: './dist/extension.js',
        engines: { node: '>=22', vscode: '^1.88.0' },
        dependencies: { runtime: '1.0.0' },
        devDependencies: { typescript: '5.0.0' },
      }),
    );
    writeFixture(path.join(repo, 'README.md'), '# Fixture\n');
    writeFixture(path.join(repo, 'CHANGELOG.md'), '# Changes\n');
    writeFixture(path.join(repo, 'package.nls.json'), '{"run":"Run"}\n');
    writeFixture(path.join(repo, 'package.nls.pt-br.json'), '{"run":"Executar"}\n');
    writeFixture(
      path.join(repo, '.github', 'workflows', 'ci.yml'),
      'name: CI\non:\n  push:\n    branches: [main]\njobs:\n  build:\n    steps:\n      - run: npm test\n',
    );
    writeFixture(
      path.join(vault, '20-PRDs', 'prd-01-a.md'),
      '---\nid: PRD-01\nstatus: completed\ntitulo: A\nversao: 1.0.0\ndata: 2026-01-01\n---\n# A\n',
    );
    writeFixture(
      path.join(vault, '30-Regras', 'MOC - Regras.md'),
      '---\nid: MOC-REGRAS\ntipo: moc\n---\n# MOC\n',
    );
    writeFixture(
      path.join(vault, '30-Regras', 'BR-01 - uma regra.md'),
      '---\nid: BR-01\ntipo: regra\nprds: [PRD-01]\nregras: [BR-01]\ndepende: [DEP-1]\nrequisitos: [PRD-01/RF1]\nimplementacao: [src/one.ts:10, src/one.ts]\ntestes: [src/test/one.test.ts]\n---\n# Regra\n',
    );
    writeFixture(
      path.join(vault, '21-Codigo', 'OLD.md'),
      '---\ngerado: true\n---\n# Gerado antigo\n',
    );
    writeFixture(path.join(vault, '21-Codigo', 'manual.md'), '---\ngerado: false\n---\n# Manual\n');
    writeFixture(
      path.join(vault, '21-Codigo', '_templates', 'keep.md'),
      '---\ngerado: true\n---\n# Template\n',
    );
    writeFixture(
      path.join(vault, '22-Testes', 'old.md'),
      '---\ngerado: true\n---\n# Teste antigo\n',
    );
    writeFixture(
      path.join(vault, '00-Index.md'),
      [
        '---',
        'tipo: indice',
        '---',
        '# Fixture',
        '',
        '<!-- brain:auto:start:root-docs -->old<!-- brain:auto:end -->',
        '<!-- brain:auto:start:readme-variants -->old<!-- brain:auto:end -->',
        '<!-- brain:auto:start:wiki-index -->old<!-- brain:auto:end -->',
        '<!-- brain:auto:start:linkedin-index -->old<!-- brain:auto:end -->',
        '<!-- brain:auto:start:funcional-index -->old<!-- brain:auto:end -->',
        '<!-- brain:auto:start:prd-summary -->old<!-- brain:auto:end -->',
        '<!-- brain:auto:start:prd-roadmap -->old<!-- brain:auto:end -->',
        '<!-- brain:auto:start:prd-estrutura -->old<!-- brain:auto:end -->',
        '<!-- brain:auto:start:conexoes -->old<!-- brain:auto:end -->',
        '<!-- brain:auto:start:moc-index -->old<!-- brain:auto:end -->',
        '<!-- brain:auto:start:stack -->old<!-- brain:auto:end -->',
        '<!-- brain:auto:start:deps -->old<!-- brain:auto:end -->',
        '<!-- brain:auto:start:unknown -->keep<!-- brain:auto:end -->',
        '',
      ].join('\n'),
    );

    assert.strictEqual(sync(), 0);
    const index = fs.readFileSync(path.join(vault, '00-Index.md'), 'utf8');
    assert.match(index, /\[README\.md\]/);
    assert.match(index, /_60-README ausente\._/);
    assert.match(index, /_70-Wiki ausente\._/);
    assert.match(index, /_docs\/linkedin ausente/);
    assert.match(index, /_README funcional ausente\._/);
    assert.match(index, /Propostos: \*\*0\*\*/);
    assert.match(index, /### 🟢 Concluídos/);
    assert.match(index, /docs\/prd\//);
    assert.match(index, /sem conexões/);
    assert.match(index, /_vazio_/);
    assert.match(index, /Node \(engines\)/);
    assert.match(index, /Runtime \(1\)/);
    assert.match(index, /keep/);
    assert.ok(fs.existsSync(path.join(vault, '21-Codigo', 'COD - one.ts.md')));
    assert.ok(fs.existsSync(path.join(vault, '22-Testes', 'TST - one.test.ts.md')));
    assert.ok(!fs.existsSync(path.join(vault, '21-Codigo', 'OLD.md')));
    assert.ok(!fs.existsSync(path.join(vault, '22-Testes', 'old.md')));
    assert.ok(fs.existsSync(path.join(vault, '21-Codigo', 'manual.md')));
    assert.ok(fs.existsSync(path.join(vault, '21-Codigo', '_templates', 'keep.md')));
    assert.strictEqual(sync(), 0);
    assert.strictEqual(sync(), 0);
  });
});

test('brain: geradores cobrem diretórios ausentes e conteúdo representativo', () => {
  withBrainFixture(({ repo, vault }) => {
    const note = path.join(vault, '00-Index.md');
    writeFixture(path.join(repo, 'package.json'), '{}');
    const missingVault = path.join(repo, 'missing-vault');
    configure({ repo, vault: missingVault });
    assert.deepStrictEqual(vaultNotes(), []);
    configure({ repo, vault });
    assert.deepStrictEqual(pipelineNotes(), []);
    assert.deepStrictEqual(localeNotes(), []);
    assert.strictEqual(genRootDocs(note), '_nenhum_');
    assert.strictEqual(genReadmeVariants(), '_60-README ausente._');
    assert.strictEqual(genWikiIndex(), '_70-Wiki ausente._');
    assert.strictEqual(
      genLinkedinIndex(note),
      '_docs/linkedin ausente (pasta local, não versionada)._',
    );
    assert.strictEqual(genFuncionalIndex(note), '_README funcional ausente._');
    assert.strictEqual(
      genPrdSummary(note),
      '- 📝 Propostos: **0**\n- 🔵 Aprovados: **0**\n- 🟡 Em desenvolvimento: **0**\n- 🟢 Concluídos: **0**',
    );
    assert.strictEqual(genStack(), '_indisponível_');
    assert.match(genDeps(), /Runtime \(0\)[\s\S]*_nenhuma_[\s\S]*Desenvolvimento \(0\)/);

    writeFixture(path.join(repo, 'README.md'), '# Fixture\n');
    writeFixture(path.join(repo, 'CONTRIBUTING.md'), '# Contribute\n');
    assert.match(genRootDocs(note), /README\.md/);
    assert.doesNotMatch(genRootDocs(note), /SECURITY\.md/);

    writeFixture(path.join(repo, '.github', 'workflows', 'empty.yml'), 'on:\n');
    const emptyPipeline = pipelineNotes().find((noteSpec) => noteSpec.file.includes('empty'));
    assert.match(emptyPipeline?.content ?? '', /_nenhum_/);
    writeFixture(path.join(repo, 'package.nls.xx.json'), '{"one":"Um"}\n');
    writeFixture(path.join(repo, 'package.nls.zz.json'), '{"one":"One"}\n');
    writeFixture(path.join(vault, '60-README', 'README.xx.md'), '---\nlocale: xx\n---\n# XX\n');
    const locale = localeNotes().find((noteSpec) => noteSpec.file.includes('LOC-xx'));
    const noReadmeLocale = localeNotes().find((noteSpec) => noteSpec.file.includes('LOC-zz'));
    assert.match(locale?.content ?? '', /README: \[\[README\.xx\]\]/);
    assert.doesNotMatch(noReadmeLocale?.content ?? '', /README:/);

    writeFixture(
      path.join(vault, '60-README', 'README.pt-BR.md'),
      '---\nlocale: pt-BR\npublicar: sim\n---\n# PT\n',
    );
    writeFixture(
      path.join(vault, '60-README', 'README (extensão).md'),
      '---\nlocale: en\npublicar: yes\n---\n# EN\n',
    );
    writeFixture(path.join(vault, '60-README', 'README.extra.md'), '# Extra\n');
    writeFixture(path.join(vault, '60-README', 'README.z.md'), '# Z\n');
    const variants = genReadmeVariants();
    assert.match(variants, /README \(extensão\).*`en`/);
    assert.match(variants, /README\.pt-BR.*`pt-BR`/);
    assert.match(variants, /README\.extra.*`\?`/);

    writeFixture(path.join(vault, '70-Wiki', 'B.md'), '# B\n');
    writeFixture(path.join(vault, '70-Wiki', 'A.md'), '# A\n');
    writeFixture(path.join(vault, '70-Wiki', '_Sidebar.md'), '# Sidebar\n');
    writeFixture(path.join(vault, '70-Wiki', 'ignored.txt'), 'ignored\n');
    const wiki = genWikiIndex();
    assert.match(wiki, /\[\[A\]\][\s\S]*\[\[B\]\]/);
    assert.doesNotMatch(wiki, /Sidebar/);

    writeFixture(path.join(repo, 'docs', 'linkedin', 'README.md'), '# Ignore\n');
    assert.strictEqual(genLinkedinIndex(note), '_vazio_');
    writeFixture(path.join(repo, 'docs', 'linkedin', 'nested', 'post.md'), '# Post\n');
    assert.match(genLinkedinIndex(note), /nested\/post/);

    writeFixture(path.join(vault, '10-Projeto', 'Funcional', 'README.md'), '# Ainda vazio\n');
    assert.strictEqual(genFuncionalIndex(note), '_Nenhum documento funcional encontrado._');
    writeFixture(
      path.join(vault, '10-Projeto', 'Funcional', 'README.md'),
      '| # | Documento | Descrição |\n|---|---|---|\n| 1 | [Um](Um.md) | Primeiro |\n| 2 | [Dois](Dois.md) | Segundo |\n',
    );
    const functional = genFuncionalIndex(note);
    assert.match(functional, /\| 1 \| \[Um\]/);
    assert.match(functional, /\| 2 \| \[Dois\]/);

    writeFixture(path.join(repo, '.nvmrc'), '24\n');
    writeFixture(path.join(repo, 'tsconfig.json'), '{"compilerOptions":{}}\n');
    writeFixture(path.join(repo, 'biome.json'), '{"formatter":{}}\n');
    assert.strictEqual(genStack(), '- **.nvmrc:** 24');
    writeFixture(
      path.join(repo, 'package.json'),
      JSON.stringify({
        main: './dist/extension.js',
        engines: { node: '>=22', vscode: '^1.88.0' },
        dependencies: { zeta: '2', alpha: '1' },
        devDependencies: { typescript: '5' },
      }),
    );
    writeFixture(path.join(repo, 'tsconfig.json'), '{"target":"ES2021","module":"Node16"}\n');
    writeFixture(path.join(repo, 'biome.json'), '{"lineWidth":100,"quoteStyle":"single"}\n');
    const stack = genStack();
    assert.match(stack, /Node \(engines\)/);
    assert.match(stack, /TypeScript:\*\* ES2021 \/ Node16/);
    assert.match(stack, /Biome:\*\* lineWidth 100, single/);
    const deps = genDeps();
    assert.match(deps, /Runtime \(2\)/);
    assert.match(deps, /`alpha` `1`[\s\S]*`zeta` `2`/);

    writeFixture(
      path.join(vault, '20-PRDs', 'prd-01-a.md'),
      '---\nid: PRD-01\nstatus: proposed\ntitulo: A\nversao: 1.0.0\n---\n# A\n',
    );
    writeFixture(path.join(repo, 'docs', 'prd', 'index.md'), '# PRD index\n');
    assert.match(genPrdSummary(note), /Detalhe completo/);
  });
});

test('brain: gitDate usa commit datado do fixture Git', () => {
  withBrainFixture(({ repo, vault }) => {
    writeFixture(path.join(repo, 'README.md'), '# Fixture\n');
    commitFixtureFiles(repo, ['README.md']);
    const output = genRootDocs(path.join(vault, '00-Index.md'));
    assert.match(output, /README\.md.*— _2024-02-03_/);
  });
});

test('brain: gitDate trata repo sem Git sem stderr', () => {
  withBrainFixture(({ repo, vault }) => {
    fs.rmSync(path.join(repo, '.git'), { recursive: true, force: true });
    writeFixture(path.join(repo, 'README.md'), '# Sem Git\n');
    const output = genRootDocs(path.join(vault, '00-Index.md'));
    assert.match(output, /\[README\.md\]/);
    assert.doesNotMatch(output, /_\d{4}-\d{2}-\d{2}_/);
  });
});

test('brain: notas PRD são cacheadas e roadmap ordena versões semanticamente', () => {
  withBrainFixture(({ repo, vault }) => {
    assert.deepStrictEqual(prdNotes(), []);
    writeFixture(
      path.join(vault, '20-PRDs', 'prd-10-delta.md'),
      '---\nid: PRD-10\nstatus: completed\ntitulo: Delta\nversao: 1.10.0\ndata: 2026-10-10\n---\n# Delta\n',
    );
    writeFixture(
      path.join(vault, '20-PRDs', 'prd-02-alpha.md'),
      '---\nid: PRD-02\nstatus: proposed\ntitulo: Alpha\nversao: 1.2.0\nversao_titulo: 1.2.0 — Alpha\n---\n# Alpha\n',
    );
    writeFixture(path.join(vault, '20-PRDs', 'not-a-prd.md'), '# Ignore\n');
    const first = prdNotes();
    assert.deepStrictEqual(
      first.map((note) => note.id),
      ['PRD-02', 'PRD-10'],
    );
    writeFixture(
      path.join(vault, '20-PRDs', 'prd-11-beta.md'),
      '---\nid: PRD-11\nstatus: approved\ntitulo: Beta\nversao: investigação\nversao_titulo: 1.2.0 — Alpha\n---\n# Beta\n',
    );
    assert.strictEqual(prdNotes(), first);

    const roadmapNotes = [
      prd({
        id: 'PRD-10',
        status: 'completed',
        titulo: 'Delta',
        file: 'prd-10-delta.md',
        versao: '1.10.0',
        data: '2026-10-10',
      }),
      prd({
        id: 'PRD-06',
        status: 'completed',
        titulo: 'Delta igual',
        file: 'prd-06-igual.md',
        versao: '1.10.0',
        data: '2026-06-06',
      }),
      prd({
        id: 'PRD-07',
        status: 'completed',
        titulo: 'Parcial A',
        file: 'prd-07-parcial.md',
        versao: '2.1',
      }),
      prd({
        id: 'PRD-08',
        status: 'completed',
        titulo: 'Parcial B',
        file: 'prd-08-parcial.md',
        versao: '2.2',
      }),
      prd({
        id: 'PRD-12',
        status: 'completed',
        titulo: 'Sem patch A',
        file: 'prd-12-sem-patch.md',
        versao: '3.1',
      }),
      prd({
        id: 'PRD-13',
        status: 'completed',
        titulo: 'Sem patch B',
        file: 'prd-13-sem-patch.md',
        versao: '3.1.1',
      }),
      prd({
        id: 'PRD-14',
        status: 'completed',
        titulo: 'Patch à esquerda',
        file: 'prd-14-patch.md',
        versao: '3.2.1',
      }),
      prd({
        id: 'PRD-15',
        status: 'completed',
        titulo: 'Patch à direita',
        file: 'prd-15-sem-patch.md',
        versao: '3.2',
      }),
      prd({
        id: 'PRD-02',
        status: 'completed',
        titulo: 'Alpha',
        file: 'prd-02-alpha.md',
        versao: '1.2.0',
        data: '2026-02-02',
      }),
      prd({
        id: 'PRD-03',
        status: 'approved',
        titulo: 'Gamma',
        file: 'prd-03-gamma.md',
        versao: 'investigação',
        versao_titulo: '1.2.0 — Alpha',
      }),
      prd({
        id: 'PRD-04',
        status: 'in-progress',
        titulo: 'Beta',
        file: 'prd-04-beta.md',
        versao: '1.2.0',
        versao_titulo: '1.2.0 — Alpha',
        data: '2026-04-04',
      }),
      prd({
        id: 'PRD-05',
        status: 'proposed',
        titulo: 'Sem versão',
        file: 'prd-05-sem.md',
        versao: '',
        data: '',
      }),
      prd({
        id: undefined as unknown as string,
        status: 'proposed',
        titulo: 'Sem número',
        file: 'prd-sem-numero.md',
        versao: '',
        data: '',
      }),
      prd({
        id: 'PRD-99',
        status: 'ignored',
        titulo: 'Ignorado',
        file: 'prd-99.md',
      }),
    ];
    const roadmap = genPrdRoadmap(roadmapNotes);
    assert.match(genPrdRoadmap(), /### 🟢 Concluídos/);
    assert.match(roadmap, /### 🟢 Concluídos/);
    assert.match(roadmap, /### 🔵 Aprovados/);
    assert.match(roadmap, /### 🟡 Em desenvolvimento/);
    assert.match(roadmap, /### ⚪ Propostos/);
    assert.match(roadmap, /#### 1\.2\.0 — Alpha/);
    assert.match(roadmap, /\| 0?5 \| \[Sem versão\].*\| — \| — \|/);
    assert.ok(roadmap.indexOf('prd-02-alpha.md') < roadmap.indexOf('prd-10-delta.md'));
    assert.doesNotMatch(roadmap, /Ignorado/);

    const structure = genPrdEstrutura(roadmapNotes);
    assert.match(structure, /├── completed\//);
    assert.match(structure, /└── proposed\//);
    assert.match(structure, /└── prd-sem-numero\.md/);
    assert.match(structure, /├── prd-02-alpha\.md/);

    writeFixture(path.join(repo, 'docs', 'prd', 'index.md'), '# PRD index\n');
    const summary = genPrdSummary(path.join(vault, '00-Index.md'));
    assert.match(summary, /Propostos: \*\*1\*\*/);
    assert.match(summary, /Aprovados: \*\*0\*\*/);
    assert.match(summary, /Detalhe completo/);
  });
});

test('brain: parseFm lê escalares entre aspas', () => {
  const fm = parseFm('---\nid: PRD-85\nstatus: in-progress\ntitulo: "Um: título"\n---\n');
  assert.strictEqual(fm.id, 'PRD-85');
  assert.strictEqual(fm.status, 'in-progress');
  assert.strictEqual(fm.titulo, 'Um: título');
  assert.deepStrictEqual(parseFm('# sem frontmatter\n'), {});
  assert.deepStrictEqual(
    parseFm('---\nvazio: []\nitems: [a, "b"]\ninvalid line\nquoted: \'x\'\n---\n'),
    { vazio: [], items: ['a', 'b'], quoted: 'x' },
  );
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
  assert.deepStrictEqual(yamlBlock('name: X\n', 'on'), []);
  assert.deepStrictEqual(yamlBlock('on:\n  push:\n\n', 'on'), ['  push:']);
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

test('brain: pipelineNotes lê um workflow em fixture', () => {
  withBrainFixture(({ repo }) => {
    writeFixture(
      path.join(repo, '.github', 'workflows', 'ci.yml'),
      'name: CI\non:\n  push:\njobs:\n  build:\n    steps:\n      - run: npm test\n',
    );
    const notes = pipelineNotes();
    assert.strictEqual(notes.length, 1);
    assert.strictEqual(notes[0]?.dir, '11-Stack');
    assert.match(notes[0]?.content ?? '', /jobs: \[build\]/);
  });
});

test('brain: localeNotes lê um package.nls e aponta o README', () => {
  withBrainFixture(({ repo, vault }) => {
    writeFixture(path.join(repo, 'package.nls.json'), '{"run":"Run"}\n');
    writeFixture(path.join(repo, 'package.nls.pt-br.json'), '{"run":"Executar"}\n');
    writeFixture(
      path.join(vault, '60-README', 'README.pt-BR.md'),
      '---\nlocale: pt-BR\n---\n# PT\n',
    );
    const notes = localeNotes();
    assert.strictEqual(notes.length, 2);
    assert.match(
      notes.find((n) => n.file.includes('LOC-pt-br'))?.content ?? '',
      /\[\[README\.pt-BR\]\]/,
    );
  });
});

test('brain: conexões relacionam PRD, RF, RNF, BR e código', () => {
  withBrainFixture(({ repo, vault }) => {
    writeFixture(
      path.join(repo, '.github', 'workflows', 'ci.yml'),
      'name: CI\non: push\njobs:\n  build:\n    steps:\n      - run: npm test\n',
    );
    writeFixture(
      path.join(vault, '20-PRDs', 'MOC - PRDs.md'),
      '---\nid: MOC-PRDS\ntipo: moc\n---\n# MOCs\n',
    );
    writeFixture(
      path.join(vault, '20-PRDs', 'prd-10-feature.md'),
      [
        '---',
        'id: PRD-10',
        'tipo: prd',
        'status: completed',
        'titulo: Feature',
        'versao: 1.0.0',
        'versao_titulo: 1.0.0 — First',
        '---',
        '# Feature',
        'PRD-02',
        'PRD-10',
        'PRD-999',
        '.github/workflows/ci.yml',
        '#### RF1 — Primeiro requisito',
        '#### RF2 — Sem implementação',
        '- RNF1 — Requisito não funcional',
        '- RNF2 — Também sem implementação',
        '',
      ].join('\n'),
    );
    writeFixture(
      path.join(vault, '20-PRDs', 'prd-11-sibling.md'),
      '---\nid: PRD-11\ntipo: prd\nstatus: in-progress\ntitulo: Sibling\nversao: 1.0.0\nversao_titulo: 1.0.0 — First\n---\n# Sibling\n',
    );
    writeFixture(
      path.join(vault, '20-PRDs', 'prd-02-other.md'),
      '---\nid: PRD-02\ntipo: prd\nstatus: proposed\ntitulo: Other\nversao: 1.0.0\n---\n# Other\n',
    );
    writeFixture(
      path.join(vault, '30-Regras', 'MOC - Regras.md'),
      '---\nid: MOC-REGRAS\ntipo: moc\n---\n# Regras\n',
    );
    writeFixture(
      path.join(vault, '30-Regras', 'BR-10 - regra.md'),
      [
        '---',
        'id: BR-10',
        'tipo: regra',
        'prds: [PRD-10, PRD-999]',
        'regras: [BR-10, ABC, BR-999]',
        'depende: [DEP-1, DEP-999]',
        'requisitos: [PRD-10/RF1, PRD-10/RNF1, PRD-999/RF9]',
        'implementacao: [src/feature.ts:10, src/feature.ts, src/missing.ts]',
        'testes: [src/test/feature.test.ts:4, src/test/feature.test.ts]',
        'relacionado: [PRD-10]',
        '---',
        '# Regra\n',
      ].join('\n'),
    );
    writeFixture(
      path.join(vault, '30-Regras', 'ABC.md'),
      '---\nid: ABC\ntipo: componente\n---\n# ABC\n',
    );
    writeFixture(
      path.join(vault, '30-Regras', 'NOID.md'),
      '---\ntipo: componente\nprds: [PRD-10]\nrequisitos: [PRD-10, PRD-10/RF1]\nimplementacao: src/no-id.ts\ntestes: src/test/no-id.test.ts\n---\n# Sem id\n',
    );
    writeFixture(
      path.join(vault, '30-Regras', 'BR-99 - referencia.md'),
      '---\nid: BR-99\ntipo: regra\nregras: [BR-10]\n---\n# Referência\n',
    );
    writeFixture(
      path.join(vault, '40-DEPENDENCIAS', 'DEP-1.md'),
      '---\nid: DEP-1\ntipo: dependencia\n---\n# Dependência\n',
    );
    writeFixture(
      path.join(vault, '50-Outros', 'sem-conexoes.md'),
      '---\ntipo: nota\n---\n# Sem conexões\n',
    );
    writeFixture(
      path.join(vault, '50-Outros', '_templates', 'template.md'),
      '---\ntipo: template\nimplementacao: [src/template-only.ts]\n---\n# Template\n',
    );

    assert.ok(generateNotes() > 0);
    const rule = path.join(vault, '30-Regras', 'BR-10 - regra.md');
    const ruleConnections = genConexoes(rule);
    assert.match(ruleConnections, /\[\[MOC - Regras\]\]/);
    assert.match(ruleConnections, /PRDs: \[\[prd-10-feature\|PRD-10\]\] · `PRD-999`/);
    assert.match(ruleConnections, /Regras: \[\[BR-10 - regra\|BR-10\]\] · \[\[ABC\]\] · `BR-999`/);
    assert.match(ruleConnections, /Depende de: \[\[DEP-1\]\] · `DEP-999`/);
    assert.match(ruleConnections, /Requisitos: \[\[prd-10-feature\|PRD-10 RF1\]\]/);
    assert.match(ruleConnections, /Código: \[\[COD - feature\.ts\]\] · \[\[COD - missing\.ts\]\]/);
    assert.match(ruleConnections, /Testes: \[\[TST - feature\.test\.ts\]\]/);
    assert.match(ruleConnections, /🔗 PRD-10/);
    assert.match(ruleConnections, /↩️ Referenciada por:.*BR-99 - referencia/);

    writeFixture(
      path.join(vault, '30-Decisoes', 'ADR-001 - usar-streaming.md'),
      '---\nid: ADR-001\ntipo: decisao\ntitulo: Usar streaming\n---\n# ADR-001\n',
    );
    const comDecisao = path.join(vault, '30-Regras', 'BR-11 - com decisao.md');
    writeFixture(
      comDecisao,
      '---\nid: BR-11\ntipo: regra\ndecisoes: [ADR-001]\n---\n# Regra com decisão\n',
    );
    // `idMaps` é cacheado por execução: invalida antes de gerar com a nota nova.
    resetCaches();
    assert.match(genConexoes(comDecisao), /🧭 Decisões: \[\[ADR-001 - usar-streaming\|ADR-001\]\]/);
    assert.match(
      genConexoes(path.join(vault, '30-Decisoes', 'ADR-001 - usar-streaming.md')),
      /↩️ Citada por:.*BR-11 - com decisao/,
    );

    // `relacionado` por basename também gera backlink (ADR citada por nota).
    const cita = path.join(vault, '30-Regras', 'NFR-90 - cita adr.md');
    writeFixture(
      cita,
      '---\nid: NFR-90\ntipo: nfr\nrelacionado: ["[[ADR-001 - usar-streaming]]"]\n---\n# Cita\n',
    );
    resetCaches();
    assert.match(
      genConexoes(path.join(vault, '30-Decisoes', 'ADR-001 - usar-streaming.md')),
      /↩️ Citada por:.*(BR-11 - com decisao|NFR-90 - cita adr)/,
    );

    // `erros:` liga a regra ao ERR-* e dá backlink no erro.
    writeFixture(
      path.join(vault, '18-Erros', 'ERR-001 - erro qualquer.md'),
      '---\nid: ERR-001\ntipo: erro\ncodigo: TESTE-1\ntitulo: Erro qualquer\n---\n# ERR-001\n',
    );
    const comErro = path.join(vault, '30-Regras', 'BR-12 - trata erro.md');
    writeFixture(comErro, '---\nid: BR-12\ntipo: regra\nerros: [ERR-001]\n---\n# Trata erro\n');
    resetCaches();
    assert.match(genConexoes(comErro), /⚠️ Erros: \[\[ERR-001 - erro qualquer\|ERR-001\]\]/);
    assert.match(
      genConexoes(path.join(vault, '18-Erros', 'ERR-001 - erro qualquer.md')),
      /↩️ Referenciada por:.*BR-12 - trata erro/,
    );

    // `origem:` liga a nota publicada (wiki/readme) à canônica, 1:N.
    writeFixture(
      path.join(vault, '10-Projeto', '09-configuration.md'),
      '---\nid: CONF-09\ntipo: funcional\ntitulo: 09 Configuration\n---\n# 09\n',
    );
    const wiki = path.join(vault, '70-Wiki', 'Configuration.md');
    writeFixture(
      wiki,
      '---\ntipo: wiki\npublicar: "docs/wiki/Configuration.md"\norigem: ["[[09-configuration]]", "[[BR-10 - regra]]"]\n---\n# Configuration\n',
    );
    resetCaches();
    const wikiConexoes = genConexoes(wiki);
    assert.match(wikiConexoes, /📚 Origem: \[\[09-configuration\]\] · \[\[BR-10 - regra\]\]/);

    // Vizinhança de release derivada do SemVer (sem campo manual).
    writeFixture(
      path.join(vault, '20-PRDs', 'prd-20-release.md'),
      '---\nid: PRD-20\ntipo: prd\nstatus: completed\ntitulo: Release 1.1.0\nversao: 1.1.0\n---\n# 1.1.0\n',
    );
    writeFixture(
      path.join(vault, '20-PRDs', 'prd-21-release.md'),
      '---\nid: PRD-21\ntipo: prd\nstatus: proposed\ntitulo: Release 1.2.0\nversao: 1.2.0\n---\n# 1.2.0\n',
    );
    resetCaches();
    const prdViz = genConexoes(path.join(vault, '20-PRDs', 'prd-10-feature.md'));
    // PRD-02 é 1.0.0 (mesma versão, não é release anterior); PRD-20 é 1.1.0.
    assert.match(prdViz, /próxima release: \[\[prd-20-release\|PRD-20 \(1\.1\.0\)\]\]/);
    assert.doesNotMatch(prdViz, /release anterior: \[\[prd-02-other/);

    const prdNote = path.join(vault, '20-PRDs', 'prd-10-feature.md');
    const prdConnections = genConexoes(prdNote);
    assert.match(prdConnections, /PRDs relacionados: \[\[prd-02-other\|PRD-02\]\]/);
    assert.match(prdConnections, /Pipelines: \[\[PIPE-ci - CI\|PIPE-ci\]\]/);
    assert.match(prdConnections, /Mesma versão \(1\.0\.0\): \[\[prd-11-sibling\|PRD-11\]\]/);
    assert.match(prdConnections, /🎯 RF1 — Primeiro requisito/);
    assert.match(prdConnections, /🎯 RNF1 — Requisito não funcional/);
    assert.doesNotMatch(prdConnections, /RF2|RNF2/);
    assert.match(genConexoes(prdNote), /🎯 RF1/);
    assert.match(genConexoes(path.join(vault, '30-Regras', 'NOID.md')), /Requisitos:/);
    assert.match(prdConnections, /📐 Regras: \[\[BR-10 - regra\|BR-10\]\]/);

    assert.strictEqual(
      genConexoes(path.join(vault, '50-Outros', 'sem-conexoes.md')),
      '- 🗺️ _sem conexões_',
    );
    assert.match(
      genConexoes(path.join(vault, '50-Outros', '_templates', 'template.md')),
      /Código: `src\/template-only\.ts`/,
    );

    writeFixture(path.join(vault, '30-Regras', 'index.md'), '# Index\n');
    const mocIndex = genMocIndex(path.join(vault, '30-Regras', 'MOC - Regras.md'));
    assert.match(mocIndex, /\[\[ABC\]\] — `ABC`/);
    assert.match(mocIndex, /\[\[NOID\]\]/);
    assert.doesNotMatch(mocIndex, /MOC - Regras|index\.md/);
    writeFixture(path.join(vault, '51-Vazio', 'MOC - Vazio.md'), '# Vazio\n');
    assert.strictEqual(genMocIndex(path.join(vault, '51-Vazio', 'MOC - Vazio.md')), '_vazio_');
  });
});

test('brain: conexões toleram notas antes das pastas geradas', () => {
  withBrainFixture(({ vault }) => {
    const note = path.join(vault, '00-Index.md');
    writeFixture(
      note,
      '---\nid: NOTE-1\nimplementacao: [src/pending.ts]\ntestes: [src/test/pending.test.ts]\n---\n# Nota\n',
    );
    const output = genConexoes(note);
    assert.match(output, /Código: `src\/pending\.ts`/);
    assert.match(output, /Testes: `src\/test\/pending\.test\.ts`/);
  });
});

test('brain: check valida links, âncoras e ignora código', () => {
  withBrainFixture(({ vault }) => {
    writeFixture(path.join(vault, 'Known.md'), '# Known\n\n## Section\n');
    writeFixture(path.join(vault, '_tools', 'ignored.md'), '[[Missing-in-tools]]\n');
    writeFixture(path.join(vault, '.obsidian', 'ignored.md'), '[[Missing-in-obsidian]]\n');
    writeFixture(
      path.join(vault, 'Bad.md'),
      [
        '# Bad',
        '[[./Known]]',
        '[[Missing]]',
        '[broken](missing.md)',
        '![image](missing.png)',
        '[known](./Known.md#section)',
        '[anchor](#section)',
        '[external](https://example.test/docs)',
        '[mail](mailto:test@example.test)',
        '`[[InlineMissing]]`',
        '```md',
        '[[FenceMissing]]',
        '[FenceBroken](also-missing.md)',
        '```',
        '',
      ].join('\n'),
    );

    const bad = captureLogs(check);
    assert.strictEqual(bad.result, 1);
    assert.match(bad.output, /wikilink relativo/);
    assert.match(bad.output, /wikilink quebrado: Bad\.md -> Missing/);
    assert.match(bad.output, /link externo quebrado: Bad\.md -> missing\.md/);
    assert.doesNotMatch(bad.output, /InlineMissing|FenceMissing|FenceBroken|missing\.png/);

    writeFixture(
      path.join(vault, 'Bad.md'),
      '# Good\n[[Known]]\n[known](./Known.md#section)\n[external](http://example.test)\n',
    );
    const good = captureLogs(check);
    assert.strictEqual(good.result, 0);
    assert.match(good.output, /todos os links resolvem/);
  });
});

test('brain: runCli cobre vault ausente, default e comando inválido', () => {
  withBrainFixture(({ repo, vault }) => {
    fs.rmSync(vault, { recursive: true, force: true });
    configure({ repo, vault });
    const absent = captureLogs(() => runCli([]));
    assert.strictEqual(absent.result, 0);
    assert.match(absent.output, /Vault docs\/brain ausente/);

    fs.mkdirSync(vault, { recursive: true });
    const invalid = captureLogs(() => runCli(['wat']));
    assert.strictEqual(invalid.result, 2);
    assert.match(invalid.output, /Uso: node scripts\/brain\.cjs/);
    assert.strictEqual(runCli([]), 0);
    assert.strictEqual(runCli(['sync']), 0);
  });
});

test('brain.cjs: CLI ausente e uso inválido', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-brain-cli-'));
  const script = path.join(root, 'scripts', 'brain.cjs');
  const cliEnv = fixtureGitEnv(root);
  const { spawnSync } = require('node:child_process') as typeof import('node:child_process');
  try {
    fs.mkdirSync(path.dirname(script), { recursive: true });
    fs.copyFileSync(require.resolve('../../../scripts/brain.cjs'), script);

    const absent = spawnSync(process.execPath, [script], { encoding: 'utf8', env: cliEnv });
    assert.strictEqual(absent.status, 0, `${absent.stdout}\n${absent.stderr}`);
    assert.match(absent.stdout, /Vault docs\/brain ausente/);

    fs.mkdirSync(path.join(root, 'docs', 'brain'), { recursive: true });
    const invalid = spawnSync(process.execPath, [script, 'wat'], { encoding: 'utf8', env: cliEnv });
    assert.strictEqual(invalid.status, 2, `${invalid.stdout}\n${invalid.stderr}`);
    assert.match(invalid.stdout, /Uso: node scripts\/brain\.cjs \[check\|sync\]/);

    initFixtureGit(root);
    writeFixture(path.join(root, 'README.md'), '# CLI fixture\n');
    writeFixture(
      path.join(root, 'docs', 'brain', '00-Index.md'),
      '<!-- brain:auto:start:root-docs -->old<!-- brain:auto:end -->\n',
    );
    commitFixtureFiles(root, ['README.md']);
    const synced = spawnSync(process.execPath, [script, 'sync'], { encoding: 'utf8', env: cliEnv });
    assert.strictEqual(synced.status, 0, `${synced.stdout}\n${synced.stderr}`);
    assert.strictEqual(synced.stderr, '');
    assert.match(
      fs.readFileSync(path.join(root, 'docs', 'brain', '00-Index.md'), 'utf8'),
      /2024-02-03/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('brain: buildCodeNoteSpecs gera notas COD/TST com id e arquivo', () => {
  const specs = buildCodeNoteSpecs({
    impl: ['src/oracleRunner.ts'],
    tests: ['src/test/unit/oracleRunner.test.ts'],
  });
  const cod = specs.find((s) => s.file.startsWith('COD'));
  const tst = specs.find((s) => s.file.startsWith('TST'));
  assert.ok(cod && tst);
  assert.strictEqual(cod?.dir, '21-Codigo');
  assert.match(cod?.content ?? '', /id: COD-oracleRunner\.ts/);
  assert.match(cod?.content ?? '', /arquivo: "src\/oracleRunner\.ts"/);
  assert.strictEqual(tst?.dir, '22-Testes');
  assert.match(tst?.content ?? '', /tipo: teste/);

  // Aresta estática código↔teste (não depende do Dataview).
  assert.match(
    cod?.content ?? '',
    /## Testes que cobrem[\s\S]*- \[\[TST - oracleRunner\.test\.ts\]\]/,
  );
  assert.match(tst?.content ?? '', /## Código exercitado[\s\S]*- \[\[COD - oracleRunner\.ts\]\]/);
});

test('brain: a query Dataview das notas geradas é válida', () => {
  // Regras da DQL verificadas aqui (regressões já ocorreram):
  //  - `LIST` aceita UM valor extra; `LIST a, b` é inválido → use TABLE.
  //  - `FROM ""` (string vazia) é inválido → omita o FROM.
  const specs = buildCodeNoteSpecs({
    impl: ['src/oracleRunner.ts'],
    tests: ['src/test/unit/oracleRunner.test.ts'],
  });
  for (const s of specs) {
    const queries = [...s.content.matchAll(/```dataview\n([\s\S]*?)```/g)].map((m) => m[1].trim());
    assert.ok(queries.length > 0, `${s.file} sem bloco dataview`);
    for (const q of queries) {
      assert.doesNotMatch(q, /FROM\s*""/, `${s.file}: query com FROM vazio`);
      assert.doesNotMatch(q, /\bLIST\b[^|]*,[^|]*\bWHERE\b/i, `${s.file}: LIST com vários campos`);
      assert.match(q, /^(LIST|TABLE)\b/, `${s.file}: query deve começar com LIST/TABLE`);
      assert.match(q, /\bWHERE\b/, `${s.file}: query deve ter WHERE`);
    }
  }
});

test('brain: buildCodeNoteSpecs sem par marca _nenhum_', () => {
  const specs = buildCodeNoteSpecs({
    impl: ['src/solto.ts'],
    tests: ['src/test/unit/outro.test.ts'],
  });
  const cod = specs.find((s) => s.file.startsWith('COD'));
  const tst = specs.find((s) => s.file.startsWith('TST'));
  assert.match(cod?.content ?? '', /## Testes que cobrem\n\n_nenhum_/);
  assert.match(tst?.content ?? '', /## Código exercitado\n\n_nenhum_/);
});

test('brain: buildCodeNoteSpecs exige o casamento de basename, não de pasta', () => {
  const specs = buildCodeNoteSpecs({
    impl: ['src/a/run.ts', 'src/b/run.ts'],
    tests: ['src/test/a/run.test.ts', 'src/test/b/run.test.ts'],
  });
  const codA = specs.find((s) => s.file === 'COD - a-run.ts.md');
  const codB = specs.find((s) => s.file === 'COD - b-run.ts.md');
  assert.match(codA?.content ?? '', /- \[\[TST - a-run\.test\.ts\]\]/);
  assert.doesNotMatch(codA?.content ?? '', /TST - b-run/);
  assert.match(codB?.content ?? '', /- \[\[TST - b-run\.test\.ts\]\]/);
});

test('brain: noteNames desambigua basenames colidentes', () => {
  const names = noteNames(['a/run.ts', 'b/run.ts'], 'COD');
  assert.strictEqual(names.get('a/run.ts'), 'COD - a-run.ts');
  assert.strictEqual(names.get('b/run.ts'), 'COD - b-run.ts');
});
