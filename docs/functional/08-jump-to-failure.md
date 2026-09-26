<!-- GENERATED FROM docs/brain/10-Projeto/Funcional/08-jump-to-failure.md — DO NOT EDIT -->
# 08 — Jump to Failure

Navegação direta do resultado de um teste falho para a linha exata da asserção
no código fonte.

## Mecanismo

O utPLSQL emite stack traces no corpo das tags `<failure>` e `<error>` do JUnit XML.
O formato **real** do `ut_junit_reporter` é o nome único qualificado
(`SCHEMA.PACKAGE.PROCEDURE`) numa única string entre aspas:

```xml
<failure>
  <![CDATA[
Actual: 1 (number) was expected to equal: 2 (number)
at "UT3.TEST_MATH_FAIL.EXPECTS_ONE_TO_EQUAL_TWO", line 4 ut3.ut.expect(1).to_equal(2);
]]>
</failure>
```

A extensão extrai esses frames, filtra frames internos do utPLSQL, resolve o
arquivo fonte e popula `vscode.TestMessage.location`. O VSCode habilita
automaticamente o botão **"Go to Error"** no Test Explorer.

> A seção **Bug anterior: `%suitepath` → "No JUnit result found"** (mais abaixo)
> detalha os quatro pontos que impediam o "Go to Error" contra um banco real.

## `parseStackFrames` (src/junit.ts)

```typescript
function parseStackFrames(body: string): StackFrame[] | undefined
```

Regex: `/at\s+(?:"([^"]+)"\."([^"]+)"|"([^"]+)"|([\w.$#]+)),?\s*line\s+(\d+)/g`

Suporta três formatos (alternativas na regex, na ordem):

| # | Formato | Grupo | `objectName` | Origem |
|---|---|---|---|---|
| 1 | **Quoted duplo**: `at "SCHEMA.PKG"."PROC", line 42` | 1 | `SCHEMA.PKG` | backtrace `DBMS_UTILITY` |
| 2 | **Quoted único**: `at "SCHEMA.PKG.PROC", line 42` | 3 | `SCHEMA.PKG.PROC` | **utPLSQL (formato real)** |
| 3 | **Unquoted**: `at PKG.PROC, line 15` | 4 | `PKG.PROC` | sem aspas |

Em todos, `line` vem do grupo 5. O nome da **procedure é ignorado** — só o
`objectName` qualificado interessa, porque a resolução acontece por *package*
(veja `packageFromFrameObject`).

Retorna `undefined` se nenhum frame encontrado.

### `StackFrame`

```typescript
interface StackFrame {
  objectName: string;   // OBJETO | SCHEMA.OBJETO | SCHEMA.OBJETO.PROCEDURE
  line: number;         // número da linha
}
```

### `isUserFrame`

```typescript
function isUserFrame(frame: StackFrame): boolean
```

Filtra frames internos do utPLSQL **por segmento**, não pelo `objectName` inteiro:

```typescript
const INTERNAL_PREFIXES = ['UT_', 'UT$', 'UT3_', 'UT3$'];

function isUserFrame(frame: StackFrame): boolean {
  if (frame.line <= 0) return false;
  const segments = frame.objectName.toUpperCase().split('.');
  return !segments.some((s) => INTERNAL_PREFIXES.some((p) => s.startsWith(p)));
}
```

- Qualquer segmento que comece por `UT_`, `UT$`, `UT3_` ou `UT3$` descarta o
  frame — assim `UT3.UT_SUITE_MANAGER` e `UT3.UT_ASSERT.ANY_PROC` (framework,
  qualificado com o schema) são rejeitados.
- **O schema `UT3.` NÃO rejeita mais o frame.** Num install próprio o schema do
  usuário *é* o de instalação (`UT3`), então o teste do próprio usuário chega
  qualificado (`UT3.TEST_MATH_FAIL.P`) e precisa passar.

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

## `packageFromFrameObject` (src/results.ts)

```typescript
function packageFromFrameObject(objectName: string): string
```

O frame vem qualificado com o schema e pode trazer a procedure; o
`meta.packageName` do `TestItem` vem do nome do arquivo `.pks` (sem schema, sem
procedure). A função extrai o **package**:

| Segmentos do `objectName` | Exemplo | Retorna |
|---|---|---|
| 1 | `TEST_MATH_FAIL` | `TEST_MATH_FAIL` (o próprio) |
| 2 | `UTPLSQL_TEST.TEST_MATH_FAIL` | `TEST_MATH_FAIL` (último) |
| 3+ | `UT3.TEST_MATH_FAIL.EXPECTS_ONE_TO_EQUAL_TWO` | `TEST_MATH_FAIL` (penúltimo) |

## `resolveStackFrameToUri` (src/results.ts)

```typescript
function resolveStackFrameToUri(
  stackFrames: StackFrame[],
  state: TestStateManager,
): vscode.Location | undefined
```

1. Encontra o primeiro `isUserFrame` (descarta `line <= 0`)
2. Extrai o package com `packageFromFrameObject` → `packageName`
3. Busca no `state.cachedItems`: suite com `meta.packageName` (lowercase) ===
   `packageName` (lowercase)
4. Se encontrado → `new Location(meta.uri, Position(line-1, 0))`
5. Fallback: `vscode.workspace.workspaceFolders` → `joinPath(folder, <packageName>.pks)`
   (minúsculo e original, case-insensitive; prefere arquivo existente)
6. Se nada encontrado → `undefined`

Função canônica unificada (PRD-39) — os dois runners usam a mesma
implementação em `results.ts`.

## Integração no `applyResultsFromCases`

```typescript
// src/results.ts — switch unificado (Oracle direto)
case 'failed':
  testMessage = new TestMessage(message ?? 'Falhou');
  if (stackFrames) {
    const loc = resolveStackFrameToUri(stackFrames, state);
    if (loc) testMessage.location = loc;
  }
  run.failed(item, testMessage, ms);
// idem para 'error'
```

Com `message.location` populado, o VSCode automaticamente:
- Mostra botão **"Go to Error"** no Test Explorer (ícone de seta)
- Habilita peek view com a localização
- Navega para o arquivo/linha ao clicar

## Filtro de frames internos

```typescript
const INTERNAL_PREFIXES = ['UT_', 'UT$', 'UT3_', 'UT3$'];
```

O filtro roda **por segmento** do `objectName`: `UT_RUNNER`, `UT_SUITE_MANAGER`,
`UT3.UT_UTILS`, `UT3.UT_ASSERT.ANY_PROC` são descartados; `UT3.TEST_MATH_FAIL.P`
(usuário no schema de instalação) passa. Apenas o primeiro frame de usuário é
usado para navegação.

## Bug anterior: `%suitepath` → "No JUnit result found"

Quatro defeitos se somavam e faziam o "Go to Error" nunca funcionar contra um
banco real. O primeiro é o que produz a mensagem **"No JUnit result found"**.

### 1. `testsuite` aninhado não era percorrido (→ "No JUnit result found")

`parseJUnit` iterava só os `testsuite` do **nível raiz** (`root.testsuite`) e
nunca descia para `suite.testsuite`. Mas o `ut_junit_reporter` **aninha
`<testsuite>` por nível** (`schema` › `package` › `suite`) — é o que acontece com
`--%suitepath` e o padrão em instalação compartilhada (utPLSQL em `UT3`, suites
em outro schema). Os `<testcase>` vivem no nível **mais interno**, então o parse
devolvia `[]`:

```
testsuites
└── testsuite  name="utplsql_test"        ← nível raiz: sem testcase
    └── testsuite  name="Math failures"   ← aninhado: ignorado
        └── testcase classname="utplsql_test.test_math_fail"  ← o resultado real
```

Com `cases = []`, `applyResultsFromCases` não casa nada e marca **todo** leaf
test como skipped, imprimindo por item:

```
[aviso] Nenhum resultado JUnit encontrado para "test:utplsql_test.test_math_fail". packageName esperado: test_math_fail
```

Os testes rodavam no banco, mas a extensão reportava "sem resultado" — e sem
`TestCaseResult` não há `message`, `stackFrames` nem `location`.

**Correção**: visita recursiva dos `testsuite` aninhados, com os `testcase` do
nível atual **antes** dos aninhados (preserva a ordem do documento).

### 2. O frame real do utPLSQL não casava com a regex

O reporter emite `at "SCHEMA.PACKAGE.PROCEDURE", line N` (nome único entre
aspas), não `at "OBJ"."PROC"`. A regex antiga não tinha essa alternativa →
`stackFrames` ficava `undefined` → sem `location`.

**Correção**: terceiro grupo na regex — `"([^"]+)"` (formato quoted único).

### 3. `isUserFrame` rejeitava o schema `UT3.`

Num install próprio o schema do usuário é o de instalação (`UT3`), então o frame
do teste do próprio usuário vem `UT3.TEST_MATH_FAIL.EXPECTS_ONE_TO_EQUAL_TWO` e
era descartado pelo prefixo `UT3.`. Sobravam só frames de framework → nenhum
frame de usuário → sem `location`.

**Correção**: filtro por segmento; o schema não entra na lista.

### 4. `objectName` não era o `packageName`

Mesmo com frame válido, `objectName` (`UT3.TEST_MATH_FAIL.EXPECTS_ONE_TO_EQUAL_TWO`)
era comparado com `meta.packageName` (`test_math_fail`) e com o fallback
`<objectName>.pks` — nunca casava.

**Correção**: `packageFromFrameObject` extrai o package (1 → ele, 2 → último,
3+ → penúltimo) e a comparação/fallback usam esse nome.

### Cobertura

- Unitário: `src/test/unit/junit.test.ts` (XML aninhado real, 3 formatos de
  frame, `isUserFrame` por segmento) e `src/test/unit/results.test.ts`
  (`packageFromFrameObject` via `resolveStackFrameToUri`).
- E2E com banco real: `src/test/integration/jumpToFailureE2E.test.ts` — cria um
  package descartável, roda `executeRunOracle` e exige
  `failed(item, TestMessage)` com `location` no `.pks` da suite, na linha do
  stack (gate: `UTPLSQL_CONN` no `.env`).

## Limitações

- Funciona para código local (`.pks`/`.pkb` no workspace) **e** para suites
  só-DB: o `dbSourceProvider` serve o documento virtual `utplsql-db:` (fonte de
  `ALL_SOURCE`) para o "Go to Error"
- Stack traces multi-frame usam o primeiro frame de usuário
- Código externo (packages padrão Oracle) → `message.location` fica `undefined`
- Resolução para `.pks` por padrão; `.pkb` não é verificado automaticamente
- Sem `--%suitepath` e com utPLSQL no mesmo schema do usuário, o XML já vinha
  plano — os formatos aninhado e qualificado são suportados em paralelo
