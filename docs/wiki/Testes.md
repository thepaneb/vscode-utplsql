# Testes

Visão geral dos testes da extensão e como executá-los.

## Tipos de teste

| Tipo | Runner | Localização | Requer banco? |
|---|---|---|---|
| Unitários | `node --test` | `src/test/unit/` | Não |
| Integração | `@vscode/test-cli` | `src/test/integration/` | Opcional (com `.env`) |

## Testes unitários

Testam módulos puros (sem dependência de `vscode`):

```
src/test/unit/
├── cli.test.js
├── cliInfo.test.js
├── cliReporters.test.js
├── cobertura.test.js
├── config.test.js
├── discovery.test.js
├── invocation.test.js
├── junit.test.js
├── matching.test.js
├── runner.test.js
├── state.test.js
└── suiteParser.test.js
```

### Como criar um teste

1. Crie `src/test/unit/meu_modulo.test.ts`:

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { minhaFuncao } from '../../meu_modulo.js';

describe('minhaFunca', () => {
  it('retorna x para entrada y', () => {
    assert.strictEqual(minhaFunca('y'), 'x');
  });

  it('lança erro para entrada inválida', () => {
    assert.throws(() => minhaFunca(null));
  });
});
```

2. Se o teste usa módulos vscode-dependentes, adicione na primeira linha:

```typescript
import './setup.js';  // redireciona require('vscode') → stub
```

### Como rodar

```bash
# Todos
npm test

# Arquivo específico
node --test out/test/unit/junit.test.js

# Por padrão de nome
node --test --test-name-pattern "parse" out/test/unit/**/*.test.js
```

> `node --test <diretório>` falha (tenta carregar a pasta como módulo).
> Sempre use o glob `out/test/unit/**/*.test.js`. Compile antes (`npm run compile`).

## Testes de integração

Testam a extensão dentro de uma instância real do VSCode:

```
src/test/integration/
└── extension.test.ts
```

Os testes de integração têm dois modos:

- **Sem banco**: testam discovery, comandos, UI — não precisam de Oracle
- **Com banco** (`describeDB`): testam execução real, cobertura, reporters —
  requerem Oracle + variáveis de ambiente

### Setup

Crie um arquivo `.env` na raiz:

```bash
UTPLSQL_CONN=UT3/senha@//localhost:1521/XEPDB1
UTPLSQL_CLI_PATH=/home/user/utplsql-cli/bin/utplsql
UTPLSQL_CLI_HOME=/home/user/utplsql-cli
```

### Fixtures de banco

Os testes com banco usam um schema `utplsql_test` com packages de exemplo:

```
src/test/integration/fixtures/
├── setup.sh                       ← script de configuração do ambiente
├── test_betwnvarchar.pks          ← suite de exemplo 1
├── test_betwnvarchar.pkb
├── test_math.pks                  ← suite de exemplo 2
├── test_math.pkb
├── test_employees.pks             ← suite de exemplo 3
└── test_employees.pkb
```

### Como rodar

```bash
npm run test:integration
```

### VSCode stub

Módulos que dependem de `vscode` usam `src/test/vscode-stub.ts` — um mock
completo das APIs do VSCode (`TestController`, `TestRun`, `workspace`, etc.).
O stub é carregado de duas formas:

1. `import './setup.js'` no topo do arquivo de teste (explícito)
2. `--require scripts/test-setup.cjs` no runner global (rede de segurança)
