# 11 — PL/SQL Debugger

Depuração de testes utPLSQL direto no Debug Adapter nativo do VSCode, via
`DBMS_DEBUG` (PRD-33; cliente reescrito para a API real do `DBMS_DEBUG` na
PRD-71).

## Visão geral

O debugger usa **duas sessões Oracle**:

```
conn debuggee  ──► ut_runner.run(a_paths => pkg[.proc])   (roda o teste)
conn debugger  ──► DBMS_DEBUG: INITIALIZE / DEBUG_ON,
                   ATTACH_SESSION, SET_BREAKPOINT, CONTINUE, GET_VALUE
```

O debuggee é "alvo": habilita o debug (`DEBUG_ON`) e roda o teste. A sessão
debugger anexa ao `debug_session_id` do alvo, define breakpoints e comanda a
execução (`CONTINUE` + `breakflags`). O adapter (`utplsql`) traduz o protocolo
DAP do VSCode para essas chamadas.

## Módulos

| Arquivo | Tipo | Descrição |
|---|---|---|
| `src/debugger.ts` | vscode | Adapter DAP (`UtplsqlDebugAdapter`), factory, configuration provider, `liveRuntime` e `startDebugSession` |
| `src/dbmsDebug.ts` | Puro | `DbmsDebugClient` — monta os blocos PL/SQL e interpreta os retornos; sem `vscode` |

```typescript
class DbmsDebugClient {
  debugOn(): Promise<string>;                          // INITIALIZE + DEBUG_ON (debuggee)
  debugOff(): Promise<void>;
  attachSession(sessionId: string, timeout: number): Promise<boolean>;
  setBreakpoint(target: BreakpointTarget): Promise<number>;  // breakpoint# ou -1
  continue(breakflags: number, infoRequested: number): Promise<BreakResult>;
  synchronize(): Promise<void>;
  getValue(name: string): Promise<VariableInfo | undefined>;
}

function parseBreakpointTarget(filePath: string, schema: string): BreakpointTarget;
```

```typescript
interface BreakpointTarget { owner: string; unit: string; line: number }  // line 1-based
interface FrameInfo { name: string; line: number; frameId: number }
interface VariableInfo { name: string; value: string; type: string }
type StopReason = 'break' | 'exiting' | 'no_break' | 'unknown';
```

> Não existem `STEP_INTO`/`STEP_OVER`/`STEP_OUT` nem `GET_VALUES` no
> `DBMS_DEBUG`. Stepping é `CONTINUE` com `breakflags` e variáveis são lidas uma
> a uma com `GET_VALUE(name)`.

## Fluxo da sessão

```
initialize            → anuncia capacidades (configurationDone, terminate)
launch                → resolve packageName/testName/connection/stopOnException
                        → initSession()
                          ├─ acquireConnection() (debuggee) → debugOn() → sessionId
                          ├─ acquireConnection() (debugger) → attachSession(sessionId, 30)
                          ├─ startTimeout() (debugger.timeoutSeconds)
                          └─ runTestInBackground() → ut_runner.run no debuggee
setBreakpoints        → antes do entry ficam "pendentes"; depois viram SET_BREAKPOINT
synchronize + flush   → instala breakpoints após o entry (deferred é ignorado)
configurationDone     → continua
stopped(reason=entry) → sessão pronta
continue/next/stepIn/stepOut → queueStep(...) → CONTINUE com breakflags
stackTrace            → frame atual (name, line) → sourcePathForFrame()
variables             → readVariables() (GET_VALUE para nomes conhecidos)
disconnect/terminate  → teardown()
```

- `pause` **não** é suportado (`DBMS_DEBUG` não oferece interrupção assíncrona).
- `stopOnException` controla a parada em exceções (`breakflags`).
- Breakpoints só são aplicados **depois** que o alvo chega ao entry — o
  `DBMS_DEBUG` ignora silenciosamente breakpoints "deferred" (PRD-71).

## Registro e comando

```typescript
class UtplsqlDebugAdapter implements vscode.DebugAdapter
class UtplsqlDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory
class UtplsqlDebugConfigurationProvider implements vscode.DebugConfigurationProvider

async function startDebugSession(packageName: string, testName?: string): Promise<void>
```

- `commands/debug.ts` registra o adapter sob o tipo `utplsql` e o comando
  `utplsql.debugTest` (o módulo é carregado sob demanda via `import()`).
- `contributes.debuggers` em `package.json` declara o tipo `utplsql` com os
  atributos de launch `packageName`, `testName`, `connection`,
  `stopOnException`.
- `UtplsqlDebugConfigurationProvider` preenche `connection` (perfil/conexão
  resolvida) e `stopOnException` (`utplsql.debugger.stopOnException`) se não
  vierem na launch config.

## Requisitos

- `utplsql.debugger.enabled` = `true` (default).
- Pacote-alvo compilado com informação de debug
  (`PLSQL_OPTIMIZE_LEVEL <= 1`, ou `ALTER PACKAGE ... COMPILE DEBUG`).
- Grants: `DEBUG CONNECT SESSION` e `EXECUTE ON SYS.DBMS_DEBUG`.
- `oracledb` disponível (o VSIX já embarca o driver).

## Settings

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.debugger.enabled` | `true` | Habilita o debug de testes PL/SQL |
| `utplsql.debugger.stopOnException` | `true` | Para quando uma exceção não tratada é levantada |
| `utplsql.debugger.timeoutSeconds` | `300` | Timeout da sessão de debug (encerra ao expirar) |

## Eventos e mensagens

O adapter emite no **Debug Console** (`output`, categoria `console`), entre
outros:
- `[utplsql-debug] Sessão <id> anexada.`
- `[utplsql-debug] Timeout da sessão de debug — encerrando.`
- erros de conexão/anexo da sessão (i18n `debug.*`)

## Limitações

- `pause` não suportado; sem `setVariable` (somente leitura de variáveis).
- Um único frame no `stackTrace` (o frame atual do `DBMS_DEBUG`).
- Resolução de arquivo assume `.pks` a partir do nome do frame.
- Variáveis são lidas por nome conhecido (extraído do fonte) via `GET_VALUE`.

## Testes

- Unitários: `src/test/unit/dbmsDebug.test.ts`, `src/test/unit/debugger.test.ts`.
- Integração: `src/test/integration/debuggerE2E.test.ts` (breakpoint → stop →
  frame → variável, na matriz de bancos).

## Settings relacionadas em outros módulos

A sessão de debug reutiliza o **pool** do Oracle runner (PRD-38) e, portanto,
respeita `utplsql.oraclePool*` e o modo do cliente
(`utplsql.oracleClientMode`, PRD-70). Veja
[02 — Test Execution](02-test-execution.md) e
[09 — Configuration](09-configuration.md).
