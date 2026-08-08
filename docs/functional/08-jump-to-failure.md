# 08 — Jump to Failure

Navegação direta do resultado de um teste falho para a linha exata da asserção
no código fonte.

## Mecanismo

O utPLSQL emite stack traces no corpo das tags `<failure>` e `<error>` do JUnit XML:

```xml
<failure message="Expected 1 but got 0" type="ut_utils.test_failure">
  at "UT3.APP_TESTS"."MY_PROC", line 42
  at "UT3.APP_TESTS"."ASSERT_EQUALS", line 8
</failure>
```

A extensão extrai esses frames, filtra frames internos do utPLSQL, resolve o
arquivo fonte e popula `vscode.TestMessage.location`. O VSCode habilita
automaticamente o botão **"Go to Error"** no Test Explorer.

## `parseStackFrames` (src/junit.ts)

```typescript
function parseStackFrames(body: string): StackFrame[] | undefined
```

Regex: `/at\s+(?:"([^"]+)"\."([^"]+)"|([\w.$#]+)),?\s*line\s+(\d+)/g`

Suporta dois formatos:
1. **Quoted**: `at "SCHEMA.PACKAGE"."PROC", line 42` — captura grupo 1 (schema.package)
2. **Unquoted**: `at PACKAGE.PROC, line 15` — captura grupo 3

Retorna `undefined` se nenhum frame encontrado.

### `StackFrame`

```typescript
interface StackFrame {
  objectName: string;   // ex: "UT3.APP_TESTS" (schema.package)
  line: number;         // número da linha
}
```

### `isUserFrame`

```typescript
function isUserFrame(frame: StackFrame): boolean
```

Filtra frames internos do utPLSQL. Prefixos ignorados:
- `UT_`, `UT$`, `UT3_`, `UT3$`, `UT3.`

Também descarta frames com `line <= 0`.

## Integração no parse JUnit

```typescript
// src/junit.ts — dentro do parseJUnit
const failure = tc.failure;
if (failure !== undefined) {
  status = 'failed';
  message = extractMessage(failure);
  stackFrames = parseStackFrames(extractBody(failure));
}
// idem para error
```

`stackFrames` é adicionado ao `TestCaseResult` e propagado para `applyResults`.

## `resolveStackFrameToUri` (src/runner.ts)

```typescript
function resolveStackFrameToUri(
  stackFrames: StackFrame[],
  state: TestStateManager,
): vscode.Location | undefined
```

1. Encontra primeiro `isUserFrame`
2. Busca no `state.cachedItems`: suite com `meta.packageName` === `objectName` (lowercase)
3. Se encontrado → `new Location(meta.uri, Position(line-1, 0))`
4. Fallback: `vscode.workspace.workspaceFolders` → `joinPath(folder, objectName.pks)`
5. Se nada encontrado → `undefined`

## Integração no `report()`

```typescript
// src/runner.ts
function report(run, item, status, message, ms, stackFrames, state) {
  case 'failed':
    testMessage = new TestMessage(message ?? 'Falhou');
    if (stackFrames && state) {
      const loc = resolveStackFrameToUri(stackFrames, state);
      if (loc) testMessage.location = loc;
    }
    run.failed(item, testMessage, ms);
  // idem para 'error'
}
```

Com `message.location` populado, o VSCode automaticamente:
- Mostra botão **"Go to Error"** no Test Explorer (ícone de seta)
- Habilita peek view com a localização
- Navega para o arquivo/linha ao clicar

## Oracle direto (`oracleRunner.ts`)

```typescript
// applyResultsFromCases — mesmo mecanismo
case 'failed':
  const msg = new TestMessage(c.message ?? 'Falhou');
  if (c.stackFrames) {
    const loc = resolveStackLocation(c.stackFrames, state);
    if (loc) msg.location = loc;
  }
  run.failed(item, msg, c.durationMs);
```

`resolveStackLocation` é análogo a `resolveStackFrameToUri`, mas sem workspace
folders (usa apenas `state.cachedItems`).

## Filtro de frames internos

```typescript
const INTERNAL_PREFIXES = ['UT_', 'UT$', 'UT3_', 'UT3$', 'UT3.'];
```

Frames como `UT_RUNNER`, `UT_SUITE_MANAGER`, `UT3.UT_UTILS` são ignorados.
Apenas o primeiro frame de usuário é usado para navegação.

## Limitações

- Funciona apenas para código versionado localmente (`.pks`/`.pkb` no workspace)
- Stack traces multi-frame usam o primeiro frame de usuário
- Código externo (packages padrão Oracle) → `message.location` fica `undefined`
- Resolução para `.pks` por padrão; `.pkb` não é verificado automaticamente
