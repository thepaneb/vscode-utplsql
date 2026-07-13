import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@vscode/test-cli';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carrega .env manualmente (sem dotenv) — não sobrescreve env vars já definidas.
const envPath = resolve(__dirname, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/\r$/, '');
    }
  }
}

// Configuração do runner de testes de integração.
// UTPLSQL_CLI_PATH e UTPLSQL_CLI_HOME podem ser definidas como env vars,
// no .env, ou via o campo `env` abaixo que as repassa ao host do VSCode.
export default defineConfig({
  files: 'out/test/integration/**/*.test.js',
  workspaceFolder: '.',
  env: {
    UTPLSQL_CLI_PATH: process.env.UTPLSQL_CLI_PATH ?? '',
    UTPLSQL_CLI_HOME: process.env.UTPLSQL_CLI_HOME ?? '',
  },
  mocha: {
    ui: 'bdd',
    timeout: 60000,
  },
});
