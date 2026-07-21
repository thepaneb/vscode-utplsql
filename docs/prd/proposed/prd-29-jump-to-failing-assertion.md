# PRD-29 — Jump to Failing Assertion

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-21 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.9.0 |
| Arquivos afetados | `src/runner.ts`, `src/junit.ts`, `src/extension.ts`, `src/state.ts` |

## 1. Resumo

Permitir que o usuário navegue diretamente do resultado de um teste falho
(Test Explorer, Output Panel, ou decoração inline) para a linha exata do
código onde a asserção falhou — seja no próprio arquivo de teste (`.pks`)
ou no código fonte testado (`.pkb`). Nexo SQL Studio oferece "jump to
failing assertion" como funcionalidade nativa.

## 2. Contexto e problema

Atualmente, quando um teste falha, o usuário vê no Test Explorer:
- Nome do teste
- Mensagem de falha (ex: "Expected 1 but got 0")
- Stack trace (se disponível no JUnit XML)

O problema é que a mensagem de falha não contém a linha exata do código
fonte. O usuário precisa:
1. Ler a mensagem de erro
2. Procurar manualmente o `%test` no arquivo `.pks`
3. Navegar para a procedure de teste
4. Procurar a linha da asserção que falhou

O Nexo SQL Studio resolve isso mapeando a stack trace da falha para o
arquivo fonte correto e saltando diretamente para a linha.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Mapear falhas de teste para arquivos fonte (`.pks`/`.pkb`)
- Navegar para a linha da asserção que falhou
- Suportar clique no Test Explorer (ação "Go to Failure")
- Suportar clique na decoração inline (PRD-26) → jump to failure
- Exibir a mensagem de falha no hover da linha

**Não-objetivos**
- Diff visual de expected vs actual (ex.: Jest snapshot diff) — feature separada
- Jump to failure para testes de outros schemas (cross-schema) — complexo
- Stack trace completa com navegação em cascata (só a primeira linha relevante)

## 4. Requisitos

### RF1 — Parse de stack trace no JUnit XML

O `ut_junit_reporter` já inclui stack traces nas tags `<failure>` e `<error>`.
O formato típico do utPLSQL:

```
<failure message="Expected 1 but got 0" type="ut_utils.test_failure">
  at PACKAGE_NAME.PROC_NAME, line 42
  at PACKAGE_NAME.TEST_NAME, line 15
</failure>
```

```typescript
// src/junit.ts — adicionar parse de stack trace
interface FailureInfo {
  message: string;
  stackFrames: StackFrame[];
}

interface StackFrame {
  objectName: string;    // package/procedure/function name
  objectType: 'PACKAGE' | 'PROCEDURE' | 'FUNCTION' | 'UNKNOWN';
  line: number;
}
```

### RF2 — Resolução de arquivo fonte a partir do stack frame

```typescript
// src/junit.ts ou novo módulo
function resolveStackFrameToUri(
  frame: StackFrame,
  state: TestStateManager,
  workspaceFolders: vscode.WorkspaceFolder[],
): vscode.Uri | undefined {
  const objectName = frame.objectName.toLowerCase();

  // 1. Procurar no TestStateManager (testes conhecidos)
  for (const [, meta] of state.items) {
    if (meta.type === 'suite' && meta.packageName.toLowerCase() === objectName) {
      // Se for o pacote de teste, retorna o .pks
      return vscode.Uri.file(meta.uri.fsPath.replace('.pkb', '.pks'));
    }
  }

  // 2. Procurar nos arquivos do workspace
  for (const folder of workspaceFolders) {
    const pattern = new vscode.RelativePattern(folder, `**/${objectName}.pks`);
    // ... usar workspace.findFiles ...
  }

  return undefined;
}
```

### RF3 — Comando `utplsql.goToFailure`

```typescript
// extension.ts
context.subscriptions.push(
  vscode.commands.registerCommand('utplsql.goToFailure', async (testItem: vscode.TestItem) => {
    const meta = state.getItemMeta(testItem);
    if (!meta || meta.type !== 'test') return;

    const lastFailure = state.getLastFailure(testItem);
    if (!lastFailure) return;

    // Encontra o primeiro stack frame relevante
    // (ignorando frames internos do utPLSQL como ut_runner, ut_suite_manager)
    const userFrame = lastFailure.stackFrames.find(f =>
      !f.objectName.startsWith('UT_') && f.line > 0
    );

    if (!userFrame) return;

    const uri = resolveStackFrameToUri(userFrame, state, workspaceFolders);
    if (!uri) return;

    const position = new vscode.Position(userFrame.line - 1, 0);
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position));
  })
);
```

### RF4 — Ação no Test Explorer

O VSCode Test Explorer já suporta nativamente "Go to Error" quando o
`TestMessage` tem `location` definido:

```typescript
// runner.ts — ao reportar falha
const message = new vscode.TestMessage(failure.message);
message.location = new vscode.Location(resolvedUri, new vscode.Position(line - 1, 0));
run.failed(testItem, message);
```

Com `message.location` preenchido, o VSCode automaticamente habilita o
botão "Go to Error" no Test Explorer e no peek view.

### RF5 — Filtro de frames internos

Frames de bibliotecas internas do utPLSQL devem ser ignorados:
```typescript
const INTERNAL_PREFIXES = ['UT_', 'UT3.', 'UT3$'];

function isUserFrame(frame: StackFrame): boolean {
  return !INTERNAL_PREFIXES.some(prefix =>
    frame.objectName.toUpperCase().startsWith(prefix)
  ) && frame.line > 0;
}
```

**Não-funcionais**
- RNF1 — Resolução de URI é assíncrona (pode usar `workspace.findFiles`) mas o
  comando `goToFailure` deve responder em < 500ms.
- RNF2 — Cache de resoluções de stack frame para evitar re-busca.

## 5. Solução proposta

### 5.1 Aprimorar `src/junit.ts`

Adicionar `parseFailureStack` ao `parseJUnit`:

```typescript
interface JunitTestCase {
  name: string;
  classname: string;
  time: number;
  failure?: {
    message: string;
    body: string;
    stackFrames: StackFrame[];
  };
  error?: {
    message: string;
    body: string;
    stackFrames: StackFrame[];
  };
}

function parseStackFrames(body: string): StackFrame[] {
  const frames: StackFrame[] = [];
  const regex = /at\s+([\w.$]+)(?:\.(\w+))?,\s*line\s+(\d+)/g;
  let match;
  while ((match = regex.exec(body)) !== null) {
    frames.push({
      objectName: match[1],
      line: parseInt(match[3], 10),
    });
  }
  return frames;
}
```

### 5.2 Aprimorar `src/runner.ts`

No `report()` function, ao criar `vscode.TestMessage`, popular `location`
com o primeiro `userFrame` resolvido.

### 5.3 Comando `utplsql.goToFailure`

Registrar comando simples que recebe `vscode.TestItem` e navega.

## 6. Configuração

Nenhuma nova setting necessária. O comportamento é naturalmente integrado
ao Test Explorer via `message.location`.

## 7. Plano de testes

- **Unitários** (`src/test/unit/junit.test.ts`):
  - `parseStackFrames` com JUnit XML contendo stack trace utPLSQL
  - `parseStackFrames` com JUnit XML sem stack trace (fallback vazio)
  - Filtro `isUserFrame`: ignora `UT_SUITE_MANAGER`, `UT_RUNNER`
  - Filtro `isUserFrame`: mantém `MY_PACKAGE.MY_PROC`
  - `resolveStackFrameToUri` com package de teste conhecido
- **Integração**:
  - Teste com falha → `message.location` populado → botão "Go to Error" visível
  - Clicar "Go to Error" → editor abre no arquivo/linha corretos
- **Manual**:
  - Falha em procedure de teste → salta para linha da falha no `.pks`/`.pkb`
  - Falha sem stack trace → botão "Go to Error" não aparece
  - Stack trace com múltiplos frames → primeiro frame de usuário é usado

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Formato do stack trace varia entre versões do utPLSQL | Regex flexível com fallback: se não parsear, `message.location` fica undefined (comportamento atual) |
| Objeto referenciado no stack trace não existe no workspace (ex.: package padrão Oracle) | `resolveStackFrameToUri` retorna undefined → location não populado |
| Stack trace pode referenciar `.pkb` mas arquivo no workspace é `.pks` | Resolver para `.pks` ou `.pkb` conforme disponível; preferir `.pks` |
| Falhas multi-frame (ex.: package A chama B que falha) | Usar o primeiro `userFrame` (mais próximo da falha) |

## 9. Rollout

- Release 0.9.0 (minor) — melhoria de UX
- Sem novas settings, integração transparente
- CHANGELOG: "Jump to failure: falhas de teste agora têm localização no editor;
  clique 'Go to Error' para navegar até a linha da asserção"
- Publicar via release no GitHub

## 10. Critérios de aceite

- `npm test` passa
- Teste com falha → `message.location` com URI e linha corretos
- Botão "Go to Error" visível no Test Explorer para testes falhos
- Clique em "Go to Error" → editor abre na linha exata da falha
- Falha em código externo (sem arquivo local) → location undefined (comportamento atual)
- Stack trace com frames internos (`UT_*`) → frames internos ignorados

## 11. Questões em aberto

- Suporte a `error` (além de `failure`)? — Sim, mesmo tratamento.
- Como mapear stack traces de código compilado on-the-fly (sem arquivo `.pks`/`.pkb`
  no workspace)? — Não mapear; só funciona para código versionado localmente.
- Stack trace pode referenciar código em outro workspace folder (multi-root)?
  — `resolveStackFrameToUri` deve buscar em todos os folders.
