# PRD — Expansão da cobertura de testes

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Análise automatizada |
| Data | 2026-07-02 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.4.0 |
| Arquivos afetados | `src/test/unit/coverage.test.ts` (novo), `src/test/unit/cli.test.ts` (novo), `src/test/unit/config.test.ts` (novo), `src/test/unit/discovery.test.ts` (novo), `src/test/unit/runner.test.ts` (novo), `src/coverage.ts`, `src/cli.ts`, `src/config.ts`, `src/runner.ts`, `src/extension.ts` |

## 1. Resumo

Adicionar testes unitários para os módulos atualmente **sem cobertura**
(`coverage.ts`, `cli.ts`, `config.ts`, `discovery.ts`) e melhorar a
resiliência do matching `applyResults` com fallback mais robusto e logs
de debug.

## 2. Contexto e problema

| Módulo | Testes | Risco |
|---|---|---|
| `coverage.ts` (`resolveSourceUri`) | ❌ Nenhum | Mudança pode quebrar mapeamento de cobertura sem detecção |
| `cli.ts` (`runCli`, `quoteArg`) | ❌ Nenhum | Fragilidade no quoting/quoting de shell não testada |
| `config.ts` (`readConfig`, `resolveConnection`) | ❌ Nenhum | Mudança em defaults pode quebrar fluxo sem warning |
| `discovery.ts` (`parseSuite`, `discoverWorkspace`) | ❌ Nenhum | Lógica de filtro de suites silenciosamente errada |
| `runner.ts` / `extension.ts` (`applyResults`) | ❌ Nenhum | Heurística frágil sem fallback audível |

## 3. Objetivos / Não-objetivos

**Objetivos**
- Testar `resolveSourceUri` com caminhos absolutos, relativos, com/sem `sourcePath`.
- Testar `quoteArg` com argumentos limpos, com espaços, com metacaracteres.
- Testar `readConfig` com settings default e customizadas (mockando `vscode.workspace.getConfiguration`).
- Testar `parseSuite` (wrapper de `discovery.ts` que adiciona URI).
- Testar `applyResults` com JUnit conhecido + `TestRun` mockado.
- Adicionar **fallback** em `applyResults` para testes sem match: log via
  `run.appendOutput` em vez de skip silencioso.

**Não-objetivos**
- Testes de integração com VSCode real (`@vscode/test-electron`) — continuam no
  arquivo existente.
- Mockar `child_process.spawn` para testar `runCli` com processo real (teste de
  integração) — testar `quoteArg` isoladamente + comportamento de `shell:true/false`.
- Cobertura 100% — foco nos módulos com zero teste.

## 4. Requisitos

### RF1 — Testes para `coverage.ts`

```typescript
test('resolveSourceUri: caminho absoluto existente', () => {
  const uri = resolveSourceUri('/tmp/exists.sql', '/workspace', 'install');
  assert.ok(uri);
});

test('resolveSourceUri: relativo ao workspace', () => {
  const uri = resolveSourceUri('install/funcao.sql', '/workspace', 'install');
  // Deve tentar /workspace/install/funcao.sql
});

test('resolveSourceUri: relativo ao sourcePath', () => {
  const uri = resolveSourceUri('funcao.sql', '/workspace', 'install');
  // Deve tentar /workspace/install/funcao.sql
});

test('resolveSourceUri: arquivo inexistente retorna undefined', () => {
  const uri = resolveSourceUri('nao_existe.sql', '/workspace', 'install');
  assert.strictEqual(uri, undefined);
});

test('resolveSourceUri: com folderRoot (multi-root)', () => {
  const uri = resolveSourceUri('funcao.sql', '/workspace', 'install', '/workspace/folder2/install');
  // Deve preferir folderRoot
});
```

### RF2 — Testes para `cli.ts`

```typescript
import { quoteArg, runCli } from '../../cli';

test('quoteArg: argumento limpo nao e alterado', () => {
  assert.strictEqual(quoteArg('run'), 'run');
  assert.strictEqual(quoteArg('-p=foo'), '-p=foo');
});

test('quoteArg: argumento com espaco e citado', () => {
  assert.strictEqual(quoteArg('foo bar'), '"foo bar"');
});

test('quoteArg: aspas internas escapadas', () => {
  assert.strictEqual(quoteArg('say "hi"'), '"say \\"hi\\""');
});

// runCli testado com processo mock ou subprocesso real echo
test('runCli: executa comando e retorna stdout', async () => {
  const result = await runCli('echo', ['hello'], true, '/tmp', ...);
  assert.strictEqual(result.stdout.trim(), 'hello');
});
```

### RF3 — Testes para `config.ts`

```typescript
// Usar sinon ou mock manual substituindo vscode.workspace.getConfiguration
test('readConfig: defaults sao usados quando sem config', () => {
  const cfg = readConfig();
  assert.strictEqual(cfg.cliPath, 'utplsql');
  assert.strictEqual(cfg.sourcePath, 'install');
  assert.strictEqual(cfg.invocation, 'launcher');
});

test('readConfig: valores customizados sao lidos', () => {
  // mock getConfiguration para retornar valores customizados
  // ...
});
```

### RF4 — Testes para `discovery.ts`

```typescript
import { parseSuite } from '../../discovery';

test('parseSuite: retorna SuiteFile com uri', () => {
  const uri = vscode.Uri.file('/workspace/test_exemplo.pks');
  const suite = parseSuite(uri, PKS_CONTENT);
  assert.ok(suite);
  assert.strictEqual(suite!.uri.fsPath, uri.fsPath);
  assert.strictEqual(suite!.packageName, 'test_exemplo');
});

test('parseSuite: retorna null se nao for suite', () => {
  const uri = vscode.Uri.file('/workspace/pkg_qualquer.pks');
  assert.strictEqual(parseSuite(uri, 'CREATE OR REPLACE PACKAGE ...'), null);
});
```

### RF5 — Melhorar `applyResults`

- Adicionar `run.appendOutput` quando um teste não encontra match:

```typescript
for (const t of leafTests) {
  if (!matched.has(t)) {
    run.appendOutput(`[aviso] Teste sem resultado no JUnit: ${t.id}\r\n`);
    run.skipped(t);
  }
}
```

- Adicionar `run.appendOutput` para cada match de depuração (opcional, ativado
  se `utplsql.debug` for true).

## 5. Solução proposta

### 5.1 Estrutura de novos arquivos de teste

```
src/test/unit/
  ├── suiteParser.test.ts   (existente)
  ├── junit.test.ts         (existente)
  ├── cobertura.test.ts     (existente)
  ├── invocation.test.ts    (existente)
  ├── coverage.test.ts      (novo)
  ├── cli.test.ts           (novo)
  ├── config.test.ts        (novo)
  ├── discovery.test.ts     (novo)
  └── runner.test.ts        (novo)
```

### 5.2 Mocking

Para módulos que dependem de `vscode`:

| Módulo | Dependência | Estratégia de teste |
|---|---|---|
| `coverage.ts` | `fs.existsSync`, `fs.statSync` | Usar `tmp` dir com arquivos reais + `mock` |
| `config.ts` | `vscode.workspace.getConfiguration` | Substituir via `import` mock (ex.: `node --test` com `mock` global) |
| `discovery.ts` | `vscode.workspace.findFiles`, `vscode.workspace.fs.readFile` | Mockar `vscode` workspace |
| `cli.ts` | `child_process.spawn` | Testar `quoteArg` puro; `runCli` com `echo` real |
| `runner.ts` | `vscode.TestRun`, `vscode.TestMessage` | Objetos mockados |

Node 18+ tem `mock` experimental via `node:test`:

```typescript
import { mock } from 'node:test';
mock.method(vscode.workspace, 'getConfiguration', () => { /* ... */ });
```

### 5.3 `applyResults` com fallback explícito

```typescript
for (const t of leafTests) {
  if (!matched.has(t)) {
    run.appendOutput(
      `[aviso] Nenhum resultado JUnit encontrado para "${t.id}". ` +
      `classname esperado: ${meta.get(t)?.packageName}\r\n`
    );
    run.skipped(t);
  }
}
```

## 6. Configuração

Nenhuma setting nova. Opcional: `utplsql.debug` (boolean, default false) ativa
logs detalhados de matching no output da execução.

## 7. Plano de testes

- `npm test` deve rodar todos os arquivos novos.
- `node --test --test-name-pattern "resolveSourceUri"` roda só os testes de
  cobertura.
- Cobertura de linhas (ideal): `coverage.ts` ≥ 90%, `cli.ts` ≥ 70%, `config.ts` ≥
  80%, `discovery.ts` ≥ 60%, `runner.ts` ≥ 50%.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `mock.method` do Node pode ser instável | Testar com Node 20+; fallback para `sinon` se necessário |
| `child_process.spawn` real no teste `runCli` | Usar `echo` ou `node -e` como subprocesso previsível |
| `config.ts` depende fortemente de `vscode` | Extrair `readConfig` para função pura que recebe objeto de config |

## 9. Rollout

- Juntamente com a refatoração do `extension.ts` (PRD refactor) na v0.4.0.
- Os testes novos validam a refatoração.
- Publicação via **release no GitHub** — o workflow publica automaticamente.

## 10. Critérios de aceite

- `coverage.test.ts` cobre `resolveSourceUri` com 5+ cenários.
- `cli.test.ts` cobre `quoteArg` com 3+ cenários e `runCli` com `echo`.
- `config.test.ts` cobre `readConfig` com defaults e custom.
- `discovery.test.ts` cobre `parseSuite` retornando `null` e `SuiteFile`.
- `runner.test.ts` cobre `applyResults` com JUnit + `TestRun` mock.
- `npm test` passa sem erros.
- Testes sem match em `applyResults` geram aviso no output.
