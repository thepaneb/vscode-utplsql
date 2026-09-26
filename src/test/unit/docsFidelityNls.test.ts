import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';

// Isoler o mock de `fs` mantém a validação do repositório intacta nos demais
// testes. Execute com --experimental-test-module-mocks.
const realFs = require('node:fs') as typeof import('node:fs');

mock.module('fs', {
  namedExports: {
    ...realFs,
    readFileSync: (filePath: string, options?: any) => {
      if (String(filePath).endsWith('package.nls.json')) return '{ invalid json';
      return realFs.readFileSync(filePath, options);
    },
  },
});

const { commandTitleFragments } = require('../../../scripts/docs-fidelity.cjs') as {
  commandTitleFragments: () => { id: string; title: string }[];
};

test('docs-fidelity: NLS inválido é tratado como catálogo vazio', () => {
  assert.deepStrictEqual(commandTitleFragments(), []);
});
