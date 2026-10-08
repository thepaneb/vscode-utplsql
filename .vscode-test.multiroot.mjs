import base from './.vscode-test.mjs';

export default {
  ...base,
  workspaceFolder: 'src/test/integration/fixtures/e2e-multiroot.code-workspace',
  files: ['out/test/integration/multiRootE2E.test.js'],
};
