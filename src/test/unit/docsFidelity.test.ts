import './setup.js';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';

// Testa o script scripts/docs-fidelity.cjs (checagens de fidelidade código↔docs).
// Requer o módulo via require (CJS) para injetar conteúdo nos cenários.
const {
  checkFidelity,
  realSettings,
  realCommands,
  commandTitleFragments,
  srcModules,
  pkgVersion,
  listCompletedPrds,
} = require('../../../scripts/docs-fidelity.cjs') as {
  checkFidelity: (o?: Record<string, unknown>) => string[];
  realSettings: () => string[];
  realCommands: () => string[];
  commandTitleFragments: () => { id: string; title: string }[];
  srcModules: () => string[];
  pkgVersion: () => string;
  listCompletedPrds: () => string[];
};

function writeFixture(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

test('docs-fidelity: o repositório atual é fiel (nenhum problema)', () => {
  assert.deepStrictEqual(checkFidelity(), []);
});

test('docs-fidelity: detecta setting ausente no README', () => {
  const problems = checkFidelity({ settings: ['utplsql.inexistente'], readme: 'nada aqui' });
  assert.ok(problems.some((p) => p.includes('utplsql.inexistente')));
});

test('docs-fidelity: detecta comando de paleta ausente na wiki', () => {
  const problems = checkFidelity({
    commandTitles: [{ id: 'utplsql.comandoX', title: 'Fazer algo muito especifico' }],
    wikiCommands: 'sem o comando aqui',
  });
  assert.ok(problems.some((p) => p.includes('utplsql.comandoX')));
});

test('docs-fidelity: detecta módulo src não citado na Architecture', () => {
  const problems = checkFidelity({
    modules: ['moduloNovo.ts'],
    wikiArchitecture: 'sem referência',
  });
  assert.ok(problems.some((p) => p.includes('moduloNovo.ts')));
});

test('docs-fidelity: detecta .vsix em versão divergente', () => {
  const problems = checkFidelity({
    version: '9.9.9',
    faq: 'code --install-extension vscode-utplsql-0.1.0.vsix',
  });
  assert.ok(problems.some((p) => p.includes('0.1.0') && p.includes('9.9.9')));
});

test('docs-fidelity: detecta PRD concluído ausente na wiki', () => {
  const problems = checkFidelity({ completedPrds: ['999'], wikiPrds: '| 1 | x | 0.0.1 |' });
  assert.ok(problems.some((p) => p.includes('PRD 999')));
});

test('docs-fidelity: detecta termo obsoleto', () => {
  const problems = checkFidelity({ faq: 'usa type_mapping internamente' });
  assert.ok(problems.some((p) => p.includes('type_mapping')));
});

test('docs-fidelity: detecta título de comando ausente no README', () => {
  const problems = checkFidelity({
    commandTitles: [{ id: 'utplsql.comandoY', title: 'Fazer coisa muito especifica' }],
    readme: 'README sem o comando',
  });
  assert.ok(problems.some((p) => p.includes('utplsql.comandoY')));
});

test('docs-fidelity: detecta claim obsoleto (is never called)', () => {
  const problems = checkFidelity({
    'Reporters.md': 'the selection is never called aqui',
  });
  assert.ok(problems.some((p) => p.includes('is never called') && p.includes('Reporters.md')));
});

test('docs-fidelity: detecta os demais claims de não implementação', () => {
  const cases = [
    ['Configuration.md', 'has no effect'],
    ['FAQ.md', 'not wired'],
    ['Diagnostics-and-quick-fix.md', 'is never emitted'],
  ] as const;
  for (const [file, phrase] of cases) {
    const problems = checkFidelity({ [file]: `the feature ${phrase} aqui` });
    assert.ok(
      problems.some((problem) => problem.includes(phrase) && problem.includes(file)),
      `${file}/${phrase}`,
    );
  }
});

test('docs-fidelity: detecta termo de empacotamento obsoleto', () => {
  const problems = checkFidelity({
    'Installation-and-requirements': 'use java -jar para instalar',
  });
  assert.ok(problems.some((problem) => problem.includes('java -jar')));
});

test('docs-fidelity.cjs: CLI valida fixture isolada', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-docs-fidelity-'));
  const script = path.join(root, 'scripts', 'docs-fidelity.cjs');
  try {
    fs.mkdirSync(path.dirname(script), { recursive: true });
    fs.copyFileSync(require.resolve('../../../scripts/docs-fidelity.cjs'), script);
    writeFixture(
      path.join(root, 'package.json'),
      JSON.stringify({
        version: '1.2.3',
        contributes: {
          configuration: { properties: { 'demo.setting': { type: 'boolean' } } },
          commands: [{ command: 'utplsql.demo', title: '%nls.demo' }],
        },
      }),
    );
    writeFixture(path.join(root, 'package.nls.json'), '{"demo":"Demo"}\n');
    writeFixture(path.join(root, 'README.md'), '# Fixture\n\ndemo.setting\nDemo\n');
    writeFixture(path.join(root, 'src', 'demo.ts'), 'export const demo = true;\n');
    writeFixture(path.join(root, 'docs', 'wiki', 'Commands.md'), 'utplsql.demo Demo\n');
    writeFixture(path.join(root, 'docs', 'wiki', 'Architecture.md'), 'demo.ts\n');
    writeFixture(path.join(root, 'docs', 'wiki', 'PRDs.md'), '| 7 | Demo | 1.2.3 |\n');
    writeFixture(path.join(root, 'docs', 'wiki', 'FAQ.md'), '# FAQ\n');
    writeFixture(
      path.join(root, 'docs', 'wiki', 'Installation-and-requirements.md'),
      '# Install\n',
    );
    writeFixture(path.join(root, 'docs', 'prd', 'completed', 'prd-7-demo.md'), '# PRD 7\n');

    const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
    assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.strictEqual(result.stderr, '');
    assert.match(result.stdout, /documentação fiel ao código/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('docs-fidelity: metadados do repo são coerentes', () => {
  assert.ok(realSettings().length > 20, 'deveria ler as settings do package.json');
  assert.strictEqual(realCommands().length, realCommands().length);
  assert.ok(commandTitleFragments().every((c) => c.title));
  assert.ok(srcModules().includes('extension.ts'));
  assert.match(pkgVersion(), /^\d+\.\d+\.\d+$/);
  assert.ok(listCompletedPrds().length > 50);
});
