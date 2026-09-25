---
tipo: funcional
status: ativo
numero: 11
titulo: "11 — PL/SQL Debugger"
publicar: docs/functional/11-debugger.md
verificado: 2026-09-23
regras: ["BR-CONN-012"]
relacionado: ["[[NFR-001 - Compatibilidade com Oracle e piso do utPLSQL]]", "[[ADR-012 - Debugger PLSQL via DBMS_DEBUG e DAP]]"]
tags: [funcional]
---
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
interface BreakpointTarget {
  owner: string; unit: string; line: number;   // line 1-based
  namespaces?: DebugNamespace[];               // candidatos, em ordem
  sourcePath?: string;                         // fonte local (alinhamento de linha)
}
type DebugNamespace = 'toplevel' | 'pkg_body' | 'trigger';
interface FrameInfo { name: string; line: number; frameId: number }
interface VariableInfo { name: string; value: string; type: string }
type StopReason = 'break' | 'exiting' | 'no_break' | 'unknown';
```

> Não existem `STEP_INTO`/`STEP_OVER`/`STEP_OUT` nem `GET_VALUES` no
> `DBMS_DEBUG`. Stepping é `CONTINUE` com `breakflags` e variáveis são lidas uma
> a uma com `GET_VALUE(name)`.

### Namespace e alinhamento de linha dos breakpoints

- `program_info.namespace` **não é sempre `pkg_body`**: subprogramas soltos
  (`.fnc`/`.prc`, ou `.sql` que define function/procedure) vivem em
  `namespace_pkgspec_or_toplevel`; triggers em `namespace_trigger`. O
  `parseBreakpointTarget` deriva os namespaces da extensão e o cliente tenta um
  a um (`.sql` ambíguo tenta os três). Usar o namespace errado faz o
  `SET_BREAKPOINT` falhar silenciosamente.
- `program_info.name`/`owner` são maiúsculos (nome do objeto no dicionário).
- O Oracle descarta `CREATE OR REPLACE` e comentários antes da declaração da
  unidade; um arquivo com header comentado fica **deslocado** em relação ao
  objeto armazenado. O adapter compara a 1ª linha de `ALL_SOURCE` com o arquivo
  local para achar o offset, ajusta a linha enviada ao `SET_BREAKPOINT` e
  converte a linha do frame de volta para o arquivo (destaque correto no
  editor).

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
configurationDone     → marca handshake concluído (NÃO continua sozinho)
stopped(reason=entry) → sessão pronta, parada aguardando o usuário
continue/next/stepIn/stepOut → queueStep(...) → CONTINUE com breakflags
stackTrace            → frame atual (name, line) → sourcePathForFrame()
variables             → readVariables() (GET_VALUE para nomes conhecidos)
disconnect/terminate  → teardown()
```

- `pause` **não** é suportado (`DBMS_DEBUG` não oferece interrupção assíncrona).
- `stopOnException` (default `true`) soma `DBMS_DEBUG.break_exception` aos
  `breakflags` do `CONTINUE`; com `false` o debuggee segue sem suspender em
  exceções (PRD-86).
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
- `contributes.languages` associa `.pks/.pkb/.prc/.fnc/.trg` à linguagem
  `plsql` e `contributes.breakpoints` habilita o gutter nessas linguagens. Sem
  esse par o VSCode bloqueia a criação de breakpoints em arquivos sem
  *language id* (a menos que `debug.allowBreakpointsEverywhere` esteja ligado).
- `contributes.debuggers` em `package.json` declara o tipo `utplsql` com os
  atributos de launch `packageName`, `testName`, `connection`,
  `stopOnException`.
- `contributes.debuggers[].initialConfigurations` fornece a launch config
  padrão (`packageName: ${fileBasenameNoExtension}`) exibida ao criar um
  `launch.json` pelo Run and Debug.
- `utplsql.debugTest` também aparece no menu de contexto do editor em
  `.pks/.pkb`.
- `UtplsqlDebugConfigurationProvider` preenche `connection` (perfil/conexão
  resolvida) e `stopOnException` (`utplsql.debugger.stopOnException`) se não
  vierem na launch config.

## Compilação para debug (PRD-73)

Para que o breakpoint pare, o objeto precisa ter sido compilado com debug info.
Além do `ALTER … COMPILE DEBUG` manual, a extensão oferece:

- comando **`utPLSQL: Compile for Debug`** (`utplsql.compileForDebug`) na paleta,
  no menu de contexto do editor e do Explorer (arquivo ou pasta);
- deriva o objeto do arquivo (`.pks`/`.pkb` → package, `.fnc` → function,
  `.prc` → procedure, `.trg` → trigger; `.sql` tenta package → procedure →
  function → trigger);
- owner = schema extraído do caminho (modo schema) ou usuário da conexão;
- executa `ALTER <TYPE> "OWNER"."NAME" COMPILE DEBUG PLSQL_OPTIMIZE_LEVEL = 1`
  reusando o pool do runner (`src/compileForDebug.ts`, best-effort). O
  `COMPILE DEBUG` sozinho só liga `PLSQL_DEBUG`, mantendo o nível de otimização
  (default 2), que pode remover/reordenar linhas e impedir o breakpoint.
- setting `utplsql.debugger.compileOnDebug` (default `false`): o adapter compila
  o pacote com debug info em `initSession()` antes de iniciar a sessão.

## Requisitos

- `utplsql.debugger.enabled` = `true` (default).
- Pacote-alvo compilado com informação de debug
  (`PLSQL_OPTIMIZE_LEVEL <= 1`, ou `ALTER PACKAGE ... COMPILE DEBUG
  PLSQL_OPTIMIZE_LEVEL = 1`, ou o comando `utPLSQL: Compile for Debug`).
- Grants: `DEBUG CONNECT SESSION` e `EXECUTE ON SYS.DBMS_DEBUG`.
- `oracledb` disponível (o VSIX já embarca o driver).

## Settings

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.debugger.enabled` | `true` | Habilita o debug de testes PL/SQL |
| `utplsql.debugger.stopOnException` | `true` | Para quando uma exceção não tratada é levantada |
| `utplsql.debugger.timeoutSeconds` | `300` | Timeout da sessão de debug (encerra ao expirar) |
| `utplsql.debugger.compileOnDebug` | `false` | Compila o objeto com debug info antes de iniciar a sessão |

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
- **Breakpoints no package de teste (`test_*.pkb`) podem não parar**: o utPLSQL
  executa os testes por SQL dinâmico, e o `DBMS_DEBUG` não instrumenta esses
  blocos. Coloque os breakpoints no **código sob teste** (function, procedure ou
  package de produção) — esses são atingidos normalmente mesmo via
  `ut_runner.run`.

## Testes

- Unitários: `src/test/unit/dbmsDebug.test.ts`, `src/test/unit/debugger.test.ts`.
- Integração: `src/test/integration/debuggerE2E.test.ts` (breakpoint → stop →
  frame → variável, na matriz de bancos).

## Settings relacionadas em outros módulos

A sessão de debug usa **conexões dedicadas** (fora do pool do runner): o
debuggee fica bloqueado no `ut_runner.run` enquanto o usuário depura, e usar o
pool compartilhado esgotaria as conexões do runner/cobertura (`NJS-040
queueTimeout`). Respeita o modo do cliente (`utplsql.oracleClientMode`, PRD-70).
Veja [02 — Test Execution](02-test-execution.md) e
[09 — Configuration](09-configuration.md).

## Conexões

<!-- brain:auto:start:conexoes -->
- 📐 Regras: [[BR-CONN-012 - Thick opt-in, fixado na primeira chamada e idempotente|BR-CONN-012]]
- 🔗 [[NFR-001 - Compatibilidade com Oracle e piso do utPLSQL]] · [[ADR-012 - Debugger PLSQL via DBMS_DEBUG e DAP]]
- ↩️ Referenciada por: [[ERR-007 - ORA-04043 — objeto não encontrado ao compilar para debug|ERR-007]]
<!-- brain:auto:end -->
