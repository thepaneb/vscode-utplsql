# PRD-16 — Testes de integração para ambos os modos de invocação

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-13 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.6.0 |
| Arquivos afetados | `src/test/integration/extension.test.ts`, `.vscode-test.mjs`, `src/test/integration/fixtures/settings.example.json` |

## 1. Resumo

Expandir os testes de integração (`extension.test.ts`) para validar o fluxo
completo nos dois modos de invocação suportados — `launcher` e `java`. Hoje
os testes de integração rodam apenas com o modo padrão `launcher`, deixando
o modo `java` coberto exclusivamente por testes unitários de `buildInvocation`
em `invocation.test.ts`.

## 2. Contexto e problema

O modo `java` foi introduzido na PRD-01 para contornar a fragilidade do
shell (`cmd`) com metacaracteres nos argumentos `coverageSourceArgs`.
Desde então:

- Os testes unitários (`invocation.test.ts`) validam que `buildInvocation`
  monta os argumentos corretos para `java` — mas sem executar o CLI.
- Os testes de integração (`extension.test.ts`) rodam apenas com o default
  `launcher`, sem jamais alterar a setting `utplsql.invocation`.
- Não há garantia de que o fluxo `executeRun → buildInvocation → runCli`
  funcione de ponta a ponta no modo `java` com um banco real.
- Uma regressão no modo `java` (ex.: `resolveCliHome` quebrado, classpath
  errado, flag `-D` faltando) passaria despercebida até validação manual.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Adicionar suite de testes de integração parametrizada por modo de invocação.
- Para cada modo (`launcher`, `java`), testar: `runAll`, `runFileCoverage`.
- Garantir que o setup de `cliHome` para o modo `java` funcione no ambiente
  de teste (derivado de `cliPath` ou via env var).
- Condicionar à presença de `UTPLSQL_CONN` (mesmo padrão dos testes atuais).

**Não-objetivos**
- Modificar a lógica de produção de `invocation.ts`/`runner.ts`.
- Testar cenários de erro de configuração (já cobertos por unitários).
- Adicionar suporte a novos modos de invocação.

## 4. Requisitos

### RF1 — Testes parametrizados por modo

Os testes de banco devem rodar em dois cenários, alternando a config
via `withInvocationMode` (seção 5.3) que isola a alteração da setting
no escopo do teste e restaura o valor original:

```typescript
const MODES = ['launcher', 'java'] as const;

for (const mode of MODES) {
  describe(`modo ${mode}`, () => {
    it('runAll executa testes', async () => {
      await withInvocationMode(mode, async () => {
        await vscode.commands.executeCommand('utplsql.runAll');
      });
    });

    it('runFileCoverage gera cobertura', async () => {
      await withInvocationMode(mode, async () => {
        const root = vscode.workspace.workspaceFolders![0].uri;
        const fixtureUri = vscode.Uri.joinPath(root, 'src', 'test', 'integration', 'fixtures', 'test_math.pks');
        const doc = await vscode.workspace.openTextDocument(fixtureUri);
        await vscode.window.showTextDocument(doc);
        await vscode.commands.executeCommand('utplsql.runFileCoverage', fixtureUri);
      });
    });
  });
}
```

### RF2 — Setup de cliHome para o modo `java`

No modo `java`, `buildInvocation` precisa de um `cliHome` resolvível. O
teste deve garantir que:

1. Se `utplsql.cliHome` estiver vazio, o `resolveCliHome` derive do
   `utplsql.cliPath`.
2. Se `cliPath` for um comando no PATH (sem caminho absoluto), o teste
   deve pular com skip em vez de falhar, pois não há como inferir a raiz.

### RF3 — Isolamento entre modos

Cada modo deve resetar o estado:
- `utplsql.clearConnection` antes de cada modo (evita cache de sessão).
- `withInvocationMode` garante que `utplsql.invocation` é restaurado ao
  valor original após cada teste, sem persistir entre execuções.

### RF4 — Verificação de resultados

Os testes devem verificar que a execução não lançou exceção e que o output
contém marcadores esperados (ex.: "Rodando utPLSQL" no `run.appendOutput`).

O teste `runFileCoverage` deve adicionalmente verificar que dados de
cobertura foram produzidos (arquivo XML temporário gerado).

## 5. Solução proposta

### 5.1 Estrutura expandida do `extension.test.ts`

```
src/test/integration/extension.test.ts
├── Testes existentes (sempre rodam)
│   ├── extension found and activates
│   ├── commands registered
│   ├── refresh executes
│   └── clearConnection executes
└── describeDB('integração com banco Oracle')
    ├── modo launcher
    │   ├── runAll executa testes
    │   └── runFileCoverage gera cobertura
    └── modo java
        ├── (setup: resolveCliHome / skip)
        ├── runAll executa testes
        └── runFileCoverage gera cobertura
```

### 5.2 Configuração de CLI para testes

O `@vscode/test-cli` v0.0.10 não suporta `settings` no `defineConfig`.
Usa-se `env` para repassar as variáveis ao host do VSCode. O `.env` da
raiz é carregado manualmente (sem `dotenv`) e com `replace(/\r$/, '')`
para lidar com `\r\n` do Windows:

```js
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@vscode/test-cli';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = resolve(__dirname, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/\r$/, '');
    }
  }
}

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
```

O desenvolvedor pode definir `UTPLSQL_CLI_PATH` e `UTPLSQL_CLI_HOME`
no `.env` da raiz ou como env vars reais:

```bash
export UTPLSQL_CLI_PATH=/home/user/utplsql-cli/bin/utplsql
export UTPLSQL_CLI_HOME=/home/user/utplsql-cli
npm run test:integration
```

Sem as env vars, `cliPath` fica `utplsql` (PATH) e o modo `java` pula.

### 5.3 Helper para alternar modo sem persistir

Usar `ConfigurationTarget.Workspace` e restaurar o valor original no
`finally` para evitar que a setting vaze entre execuções. No modo `java`,
aplica `cliHome` de `process.env` se a setting ainda não estiver definida:

```typescript
async function withInvocationMode<T>(
  mode: string,
  fn: () => Promise<T>,
): Promise<T> {
  const config = vscode.workspace.getConfiguration('utplsql');
  const original = config.inspect<string>('invocation');

  await config.update('invocation', mode, vscode.ConfigurationTarget.Workspace);

  if (mode === 'java' && !config.get<string>('cliHome')) {
    await config.update(
      'cliHome',
      process.env.UTPLSQL_CLI_HOME || '',
      vscode.ConfigurationTarget.Workspace,
    );
  }

  try {
    return await fn();
  } finally {
    await config.update(
      'invocation',
      original?.workspaceValue ?? original?.defaultValue ?? 'launcher',
      vscode.ConfigurationTarget.Workspace,
    );
  }
}
```

Uso nos testes:

```typescript
for (const mode of MODES) {
  describe(`modo ${mode}`, () => {
    it('runAll executa testes', async () => {
      await withInvocationMode(mode, async () => {
        await vscode.commands.executeCommand('utplsql.runAll');
      });
    });

    it('runFileCoverage gera cobertura', async () => {
      await withInvocationMode(mode, async () => {
        const root = vscode.workspace.workspaceFolders![0].uri;
        const fixtureUri = vscode.Uri.joinPath(root, 'src', 'test', 'integration', 'fixtures', 'test_math.pks');
        const doc = await vscode.workspace.openTextDocument(fixtureUri);
        await vscode.window.showTextDocument(doc);
        await vscode.commands.executeCommand('utplsql.runFileCoverage', fixtureUri);
      });
    });
  });
}
```

### 5.4 Tratamento de skip para modo `java` sem `cliHome`

A verificação de `cliHome` é feita por `process.env` (herdado via `env`
no `.vscode-test.mjs`) no topo do `describe`, antes do loop de modos:

```typescript
const cliHome = process.env.UTPLSQL_CLI_HOME || '';

for (const mode of MODES) {
  if (mode === 'java' && !cliHome) {
    describe(`modo ${mode}`, () => {
      it.skip('cliHome não configurado — defina UTPLSQL_CLI_HOME no .env', () => {});
    });
    continue;
  }
  // ...
}
```

## 6. Configuração

Nenhuma nova setting no schema. O comportamento é testado com as settings existentes.

O `.vscode-test.mjs` carrega o `.env` da raiz e repassa `UTPLSQL_CLI_PATH`
e `UTPLSQL_CLI_HOME` ao host do VSCode via `env` (não `settings`, que não
é suportado pelo `@vscode/test-cli` v0.0.10).

Um arquivo de configuração de exemplo (`fixtures/settings.example.json`) serve como
fallback documentado: o desenvolvedor pode copiá-lo para `.vscode/settings.json` e
ajustar os caminhos, dispensando o uso de env vars.

## 7. Plano de testes

- **Unitários**: N/A (já existe `invocation.test.ts`).
- **Integração**: `npm run test:integration` com `UTPLSQL_CONN` definida.
  - Deve rodar ambos os modos se o ambiente suportar.
  - Deve pular o modo `java` se `cliHome` não for resolvível.
- **Validação manual**:
  - Rodar sem `UTPLSQL_CONN` — tudo pula.
  - Rodar com `UTPLSQL_CONN` + `utplsql` no PATH — modo `java` pode pular.
  - Rodar com `UTPLSQL_CONN` + `UTPLSQL_CLI_PATH`/`UTPLSQL_CLI_HOME` — ambos os modos passam.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `config.update('invocation')` pode ser lento ou falhar em teste | Usar `await` e try/catch com fallback |
| Modo `java` exige Java + JARs no classpath | Skip silencioso se `cfg.cliHome` vazio |
| Testes duplicam tempo de execução (2x) | Manter timeouts individuais de 120s (já existentes) |
| Settings alteradas pelo teste vazam para outros testes | Restaurar `invocation` no `after` de cada bloco |

## 9. Critérios de aceite

- `npm run test:integration` sem `UTPLSQL_CONN` — testes de banco pulam, modo `java` não aparece.
- `npm run test:integration` com `UTPLSQL_CONN` + `UTPLSQL_CLI_PATH`/`UTPLSQL_CLI_HOME` — ambos os modos passam.
- `npm run test:integration` com `UTPLSQL_CONN` + `cliPath` no PATH — modo `launcher` passa, modo `java` pula com skip.
- Nenhuma alteração no código de produção.

## 10. Questões em aberto

*(Nenhuma)*
