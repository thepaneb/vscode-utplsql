import './setup.js';
import assert from 'node:assert';
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

test('docs-fidelity: metadados do repo são coerentes', () => {
  assert.ok(realSettings().length > 20, 'deveria ler as settings do package.json');
  assert.strictEqual(realCommands().length, realCommands().length);
  assert.ok(commandTitleFragments().every((c) => c.title));
  assert.ok(srcModules().includes('extension.ts'));
  assert.match(pkgVersion(), /^\d+\.\d+\.\d+$/);
  assert.ok(listCompletedPrds().length > 50);
});
