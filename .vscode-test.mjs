import { defineConfig } from '@vscode/test-cli';

// Configuração do runner de testes de integração (host de extensão do VSCode).
export default defineConfig({
  files: 'out/test/integration/**/*.test.js',
  workspaceFolder: '.',
  mocha: {
    ui: 'bdd',
    timeout: 60000
  }
});
