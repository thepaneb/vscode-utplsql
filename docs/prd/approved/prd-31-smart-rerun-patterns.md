# PRD-31 — Smart Re-run Patterns

| Campo | Valor |
|---|---|
| Status | Aprovado |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-21 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.8.0 |
| Arquivos afetados | `src/extension.ts`, `src/runner.ts`, `src/state.ts`, `package.json` |

## 1. Resumo

Implementar três padrões de re-execução inteligente que aceleram o ciclo TDD:
(1) rerun last test — repetir a última execução com um atalho; (2) run test at
cursor — executar o `%test` ou `%suite` sob o cursor no editor; (3) run failed
only — re-executar apenas os testes que falharam na última rodada. Extensões
como Jest, Test Explorer UI, Java e Go oferecem variações desses padrões.

## 2. Contexto e problema

Atualmente, após corrigir um teste que falhou, o usuário precisa:
1. Encontrar o teste no Test Explorer
2. Clicar no ícone ▶ do teste específico
3. Ou: re-executar todos os testes (desperdício de tempo)

Para um fluxo TDD típico (editar → rodar → ver falha → corrigir → rodar de novo),
a ausência de "rerun last" e "run failed" adiciona atrito significativo.
"Run test at cursor" é oferecido por Java Test Runner e Go — o usuário está
editando um teste e quer executá-lo sem tirar as mãos do teclado.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Comando `utplsql.rerunLast` — repete a última execução exata (mesmos testes,
  mesmo perfil Run/Coverage)
- Comando `utplsql.runAtCursor` — descobre qual `%test`/`%suite` está sob o
  cursor e executa apenas ele
- Comando `utplsql.runFailed` — re-executa apenas testes que falharam na
  última rodada
- Keybindings padrão para os três comandos
- Ações no menu de contexto do status bar (PRD-25)

**Não-objetivos**
- Watch mode / run on save (complexo para Oracle; depende de PRD-11 streaming)
- Run test by tag/annotation (utPLSQL suporta `%tags` mas o parser atual não)
- Histórico de múltiplas execuções (só a última)

## 4. Requisitos

### RF1 — Rerun last test run

```typescript
// src/state.ts
interface LastRunState {
  type: 'all' | 'file' | 'folder' | 'suite' | 'test' | 'failed';
  uris?: vscode.Uri[];
  packageName?: string;
  procName?: string;
  coverage: boolean;
  folderUri?: vscode.Uri;
}
```

```typescript
// src/extension.ts
let lastRun: LastRunState | undefined;

async function rerunLast() {
  if (!lastRun) {
    vscode.window.showInformationMessage('No previous test run to repeat.');
    return;
  }

  switch (lastRun.type) {
    case 'all': await runAll(lastRun.coverage); break;
    case 'file': await runForUri(lastRun.uris![0], lastRun.coverage); break;
    case 'folder': await runForFolder(lastRun.folderUri!, lastRun.coverage); break;
    case 'suite':
    case 'test':
      await runSingleTest(
        lastRun.uris![0],
        lastRun.packageName!,
        lastRun.procName!,
        lastRun.coverage,
      );
      break;
    case 'failed':
      await runFailedOnly(); break;
  }
}
```

### RF2 — Run test at cursor

```typescript
async function runAtCursor() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  if (!document.fileName.endsWith('.pks')) {
    vscode.window.showWarningMessage('Run at cursor is only available in .pks files.');
    return;
  }

  const position = editor.selection.active;
  const annotation = findAnnotationAtLine(document, position.line);

  if (!annotation) {
    vscode.window.showWarningMessage('No %suite or %test annotation found at cursor position.');
    return;
  }

  // annotation: { type: 'suite' | 'test', line: number, description: string,
  //   packageName: string, procName?: string }

  if (annotation.type === 'suite') {
    await runSuite(document.uri, annotation.packageName, false);
  } else if (annotation.type === 'test' && annotation.procName) {
    await runSingleTest(document.uri, annotation.packageName, annotation.procName, false);
  }
}

function findAnnotationAtLine(
  document: vscode.TextDocument,
  cursorLine: number,
): Annotation | undefined {
  // Procura para cima a partir da linha do cursor até achar um %suite ou %test
  for (let i = cursorLine; i >= 0; i--) {
    const line = document.lineAt(i).text;
    const suiteMatch = line.match(/^--%suite\s*\(\s*(.+?)\s*\)/);
    if (suiteMatch) {
      return {
        type: 'suite',
        line: i,
        description: suiteMatch[1].trim(),
        packageName: extractPackageName(document),
      };
    }
    const testMatch = line.match(/^--%test\s*\(\s*(.+?)\s*\)/);
    if (testMatch) {
      const procName = findProcedureName(document, i);
      return {
        type: 'test',
        line: i,
        description: testMatch[1].trim(),
        packageName: extractPackageName(document),
        procName,
      };
    }
  }
  return undefined;
}
```

### RF3 — Run failed tests only

```typescript
// src/state.ts
let lastFailedTests: vscode.TestItem[] = [];

// src/extension.ts
async function runFailedOnly() {
  if (lastFailedTests.length === 0) {
    vscode.window.showInformationMessage('No failed tests from the last run.');
    return;
  }

  const run = controller.createTestRun(
    new vscode.TestRunRequest(lastFailedTests),
    'Run Failed Tests',
  );

  // Deduplica os path args para os testes falhos
  const pathArgs = new Set<string>();
  for (const item of lastFailedTests) {
    const meta = state.getItemMeta(item);
    if (meta?.type === 'test') {
      pathArgs.add(`${meta.packageName}.${meta.procName}`);
    } else if (meta?.type === 'suite') {
      pathArgs.add(meta.packageName);
    }
  }

  await executeRun(connection, [...pathArgs], false, run, lastFailedTests, state, token);
}
```

### RF4 — Armazenamento de `lastFailedTests`

No `applyResults` (runner.ts), além de reportar status, armazenar os
`TestItem`s que falharam:

```typescript
// runner.ts — applyResults()
const failedItems: vscode.TestItem[] = [];
for (const [testItem, result] of results) {
  if (result.status === 'failed' || result.status === 'errored') {
    failedItems.push(testItem);
  }
}
state.setLastFailedTests(failedItems);
```

### RF5 — Keybindings

| Comando | Atalho | When |
|---|---|---|
| `utplsql.rerunLast` | `Ctrl+Shift+U L` | `utplsql:activated` |
| `utplsql.runAtCursor` | `Ctrl+Shift+U U` | `editorTextFocus && resourceExtname == .pks` |
| `utplsql.runFailed` | `Ctrl+Shift+U X` | `utplsql:hasFailures` |

**Não-funcionais**
- RNF1 — `lastRun` é volátil (memória), não persiste entre sessões do VSCode.
- RNF2 — `runAtCursor` deve funcionar mesmo se o cursor estiver no corpo da
  procedure (não exatamente na linha do `%test`), procurando a anotação acima.

## 5. Solução proposta

### 5.1 `src/state.ts`

Adicionar ao `TestStateManager`:
- `lastRun: LastRunState | undefined`
- `lastFailedTests: vscode.TestItem[]`
- `setLastRun(state: LastRunState)`
- `setLastFailedTests(items: vscode.TestItem[])`

### 5.2 `runner.ts`

No `executeRun`, ao iniciar, registrar `LastRunState` baseado nos parâmetros.
Ao finalizar (`applyResults`), registrar `lastFailedTests`.

### 5.3 `extension.ts`

Registrar 3 novos comandos e integrar com PRD-25 (status bar context menu)
e PRD-27 (keybindings).

### 5.4 Context key `utplsql:hasFailures`

```typescript
vscode.commands.executeCommand(
  'setContext',
  'utplsql:hasFailures',
  lastFailedTests.length > 0,
);
```

## 6. Configuração

Nenhuma nova setting. Comandos são registrados e keybindings definidos no
`package.json`.

## 7. Plano de testes

- **Unitários** (`src/test/unit/rerun.test.ts`):
  - `findAnnotationAtLine` com cursor na linha do `%test` → encontra
  - `findAnnotationAtLine` com cursor na procedure (linhas abaixo do `%test`) → encontra
  - `findAnnotationAtLine` com cursor antes do primeiro `%suite` → undefined
  - `extractPackageName` de arquivo `.pks` → nome correto
- **Integração**:
  - Rodar suite → `Ctrl+Shift+U L` → repete mesma execução
  - Rodar com coverage → `Ctrl+Shift+U L` → repete com coverage
  - Cursor no corpo de um `%test` → `Ctrl+Shift+U U` → executa só esse teste
  - Suite com 2/5 falhas → `Ctrl+Shift+U X` → executa apenas os 2 falhos
- **Manual**:
  - "Rerun last" sem execução anterior → mensagem informativa
  - "Run at cursor" em arquivo `.pkb` → aviso
  - "Run failed" sem falhas → mensagem informativa

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `runAtCursor` falha se o parser não encontrar a anotação (ex.: comentários entre `%test` e procedure) | `findAnnotationAtLine` procura para cima até 50 linhas; usar mesmo parser de PRD-24 (CodeLens) |
| `rerunLast` com testes removidos desde a última execução | Executar o que ainda existe; ignorar paths ausentes silenciosamente |
| `runFailed` pode executar testes que passariam em outra ordem | Mesmo comportamento de executar manualmente os mesmos testes; utPLSQL já lida com ordenação |
| Context key `utplsql:hasFailures` stale após clear/deactivate | Atualizar em `clearConnection`, `deactivate`, e após cada run |

## 9. Rollout

- Release 0.9.0 (minor) — novos comandos de produtividade
- CHANGELOG: "Smart re-run: Rerun Last (Ctrl+Shift+U L), Run at Cursor
  (Ctrl+Shift+U U), Run Failed Only (Ctrl+Shift+U X)"
- Publicar via release no GitHub

## 10. Critérios de aceite

- `npm test` passa
- `utplsql.rerunLast` repete a última execução (tipo + coverage)
- `utplsql.runAtCursor` com cursor em `%test` executa só aquele teste
- `utplsql.runAtCursor` com cursor no corpo da procedure também funciona
- `utplsql.runFailed` executa apenas testes falhos da última rodada
- `utplsql.runFailed` sem falhas → mensagem informativa
- `utplsql.rerunLast` sem execução anterior → mensagem informativa
- Keybindings funcionam nos contextos corretos

## 11. Questões em aberto

- Run at cursor com coverage? — Adicionar variação `utplsql.runAtCursorCoverage`
  ou usar argumento opcional. Recomendação: manter simples, sem coverage por padrão.
- Rerun last com modificação (ex.: "rerun last but with coverage")?
  — Feature futura; inicialmente rerun é idêntico.
- "Run failed" deve incluir também testes skipped/errored?
  — Sim, incluir errored; skipped é opcional (setting futura).
- Como `runAtCursor` interage com `%context` do utPLSQL?
  — Executar o `%context` pai + o `%test` específico? Ou só o `%test`?
  Recomendação: executar o suite pai (mais seguro, `%context` setup é necessário).
