# PRD-33 — PL/SQL Debugger Integration

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-21 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 1.0.0 |
| Arquivos afetados | `src/debugger.ts` (novo), `src/extension.ts`, `src/runner.ts`, `package.json` |

## 1. Resumo

Permitir a depuração passo-a-passo de testes PL/SQL diretamente no VSCode,
usando `DBMS_DEBUG` do Oracle. O usuário poderá definir breakpoints nos
procedimentos de teste (`.pks`/`.pkb`), executar com debug, e usar Step In,
Step Over, Step Out, Continue e Stop — inspecionando variáveis locais no
Debug Console. Nexo SQL Studio é o único concorrente que oferece PL/SQL
debugger integrado ao VSCode.

## 2. Contexto e problema

Atualmente o vscode-utplsql não tem capacidade de debugging. O ciclo de
desenvolvimento quando um teste falha é:

1. Executar teste → vê que falhou
2. Adicionar `DBMS_OUTPUT.PUT_LINE` no código
3. Recompilar e re-executar
4. Ler o Output Panel
5. Repetir até entender o problema

Isso é lento e primitivo comparado a um debugger interativo. O Nexo SQL Studio
já demonstra que é possível integrar `DBMS_DEBUG` com o VSCode Debug Adapter
em uma extensão PL/SQL. Para o vscode-utplsql, o foco seria debugging
específico de testes (não debug geral de PL/SQL).

## 3. Objetivos / Não-objetivos

**Objetivos**
- Suporte a breakpoints em arquivos `.pks` e `.pkb`
- Execução de teste com debug (perfil "Debug Test" no CodeLens e Test Explorer)
- Step Into, Step Over, Step Out, Continue, Stop
- Inspeção de variáveis locais (nome, valor, tipo) no Debug Console
- Call stack visível durante debugging
- Configuração de launch para debug via `launch.json`

**Não-objetivos**
- Debugger geral de PL/SQL (fora de testes) — isso seria uma extensão separada
- Debug remoto (vários clientes no mesmo debug session)
- Debug de SQL puro (apenas PL/SQL em contexto de teste)
- Suporte a Oracle < 12c (requer `DBMS_DEBUG` disponível)
- Hot reload / edit-and-continue

## 4. Requisitos

### RF1 — Grants Oracle necessários

```sql
GRANT EXECUTE ON SYS.DBMS_DEBUG TO <schema>;
GRANT DEBUG CONNECT SESSION TO <schema>;
-- Para debug cross-schema:
GRANT EXECUTE ON <target_package> TO <schema>;
GRANT DEBUG ON <target_package> TO <schema>;
```

### RF2 — Debug Adapter via `node-oracledb` (PRD-11 dependência)

O debugger requer conexão Oracle direta — não funciona via CLI. Portanto
depende de PRD-11 (streaming/node-oracledb) ou de uma implementação
independente de `oracledb` para o debugger.

```typescript
// src/debugger.ts (novo) — Debug Adapter implementando DebugAdapter interface
import * as vscode from 'vscode';
import * as oracledb from 'oracledb';

class UtplsqlDebugAdapter implements vscode.DebugAdapter {
  private conn: oracledb.Connection | undefined;
  private debugSessionId: string | undefined;

  async initialize(): Promise<void> {
    // Conecta no Oracle
    // Inicializa DBMS_DEBUG session
  }

  async setBreakpoints(
    file: string,
    breakpoints: vscode.DebugProtocol.SourceBreakpoint[],
  ): Promise<vscode.DebugProtocol.Breakpoint[]> {
    // Mapeia breakpoints VSCode → DBMS_DEBUG breakpoints
    // DBMS_DEBUG.SET_BREAKPOINT(lineno, ...)
  }

  async continue(): Promise<void> {
    // DBMS_DEBUG.CONTINUE
  }

  async next(): Promise<void> {
    // DBMS_DEBUG.STEP_OVER
  }

  async stepIn(): Promise<void> {
    // DBMS_DEBUG.STEP_INTO
  }

  async stepOut(): Promise<void> {
    // DBMS_DEBUG.STEP_OUT
  }

  async stackTrace(): Promise<vscode.DebugProtocol.StackTraceResponse> {
    // Obtém stack via DBMS_DEBUG
  }

  async scopes(frameId: number): Promise<vscode.DebugProtocol.ScopesResponse> {
    // Escopos: Locals
  }

  async variables(variablesReference: number): Promise<vscode.DebugProtocol.VariablesResponse> {
    // Variáveis locais do frame atual via DBMS_DEBUG.GET_VALUES
  }

  async disconnect(): Promise<void> {
    // DBMS_DEBUG.DEBUG_OFF
    // Fecha conexão Oracle
  }
}
```

### RF3 — Configuração de launch

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "utplsql",
      "request": "launch",
      "name": "Debug Current Test",
      "packageName": "${fileBasenameNoExtension}",
      "testName": "${selectedText}",
      "connection": "${config:utplsql.connection}",
      "stopOnException": true
    }
  ]
}
```

### RF4 — Provider de debug

Registrar no `package.json`:
```json
{
  "contributes": {
    "debuggers": [
      {
        "type": "utplsql",
        "label": "utPLSQL Debugger",
        "languages": ["plsql"],
        "configurationAttributes": {
          "launch": {
            "properties": {
              "packageName": { "type": "string", "description": "Test package to debug" },
              "testName": { "type": "string", "description": "Specific test procedure" },
              "connection": { "type": "string", "description": "Oracle connection string" },
              "stopOnException": { "type": "boolean", "default": true }
            }
          }
        }
      }
    ]
  }
}
```

### RF5 — CodeLens "Debug Test"

Em PRD-24, adicionar terceiro CodeLens: "Debug Test" acima de `%test`:

```typescript
const debugLens = new vscode.CodeLens(range, {
  title: '🐛 Debug',
  command: 'utplsql.debugTest',
  arguments: [{ type: 'test', packageName, procName }],
});
```

O comando `utplsql.debugTest` inicia uma debug session.

**Não-funcionais**
- RNF1 — Debug session timeout: 5 minutos (evitar conexões Oracle zumbis).
- RNF2 — Apenas uma debug session por vez (Oracle `DBMS_DEBUG` é single-session).
- RNF3 — Documentar grants necessários no README e no quick-fix (PRD-32).

## 5. Solução proposta

### 5.1 Arquitetura

```
VSCode Debug UI (breakpoints, call stack, variables)
  ↕ Debug Adapter Protocol
UtplsqlDebugAdapter (src/debugger.ts)
  ↕ DBMS_DEBUG API
Oracle Database (utPLSQL test execution)
```

### 5.2 Fluxo de debug

1. Usuário define breakpoint em uma procedure de teste (`.pks`)
2. Usuário clica "Debug" no CodeLens ou usa F5 com launch config
3. Debug adapter inicia: conecta no Oracle, inicializa `DBMS_DEBUG`
4. Executa `ut_runner.run` com o teste específico
5. Oracle pausa no breakpoint → debug adapter notifica VSCode
6. Usuário usa Step Into/Over/Out, inspeciona variáveis
7. Ao finalizar (Continue ou Stop), debug adapter fecha sessão

### 5.3 Limitações vs Nexo SQL Studio

| Funcionalidade | vscode-utplsql (proposto) | Nexo SQL Studio |
|---|---|---|
| Breakpoints em `.pks`/`.pkb` | Sim | Sim |
| Step Into/Over/Out | Sim | Sim |
| Variáveis locais | Sim (nome + valor) | Sim |
| Watch expressions | Não (inicial) | Sim |
| Stop on exception | Sim (configurável) | Sim (configurável) |
| Debug de SQL puro | Não | Não |
| Cross-schema debug | Sim (com grants) | Sim |
| Pause (interrupção assíncrona) | Não | Não (Oracle não suporta) |

### 5.4 Dependência de PRD-11 (node-oracledb)

O debugger **requer** `node-oracledb` — não é viável via CLI. Se PRD-11 não
estiver implementado, a dependência `oracledb` é adicionada como
`optionalDependencies` exclusivamente para o debugger.

## 6. Configuração

| Setting | Tipo | Default | Descrição |
|---|---|---|---|
| `utplsql.debugger.enabled` | boolean | `true` | Habilita suporte a debug de testes PL/SQL |
| `utplsql.debugger.stopOnException` | boolean | `true` | Pausa automaticamente em exceções PL/SQL |
| `utplsql.debugger.timeoutSeconds` | number | `300` | Timeout da sessão de debug (5 min default) |

### Commands

| Comando | Descrição |
|---|---|
| `utplsql.debugTest` | Inicia debug do teste sob o cursor/selecionado |
| `utplsql.debugSuite` | Inicia debug de todos os testes de uma suite |
| `utplsql.debugFile` | Inicia debug de todos os testes de um arquivo |

## 7. Plano de testes

- **Unitários** (`src/test/unit/debugger.test.ts`):
  - Mockar `oracledb` e testar inicialização do debug adapter
  - Testar mapping de breakpoints VSCode → Oracle
  - Testar parse de variáveis locais do `DBMS_DEBUG.GET_VALUES`
- **Integração** (requer Oracle + grants):
  - Definir breakpoint → executar debug → pausa no breakpoint
  - Step Over → próxima linha
  - Inspecionar variável local → valor correto
  - Continue → execução termina
  - Stop → execução interrompida
- **Manual**:
  - Sem grants → mensagem de erro clara com SQL necessário
  - Debug sem `node-oracledb` → mensagem orientando instalar

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `DBMS_DEBUG` não disponível em Oracle < 12c | Documentar requisito mínimo; quick-fix sugere upgrade |
| Grants complexos para setup inicial | PRD-32 (quick-fix) fornece SQL pronto para copiar |
| Debug session pode travar (bug PL/SQL com loop infinito) | Timeout da sessão (5 min); comando "Stop" força `ALTER SYSTEM KILL SESSION` |
| `oracledb` dependência pesada para quem só quer debug | `optionalDependencies` — só instala se usuário explicitamente quiser |
| Conflito com PRD-11 (streaming) — ambos usam `oracledb` | Compartilhar conexão; debugger usa sessão separada com `DBMS_DEBUG` |
| Múltiplos breakpoints podem degradar performance Oracle | Documentar boas práticas; limitar a 20 breakpoints por sessão |

## 9. Rollout

- Release 1.0.0 (major) — nova funcionalidade de alto impacto + PRD-11
- Habilitado por default (mas funcionalidade é condicional a `oracledb`)
- CHANGELOG: "PL/SQL Debugger: suporte a breakpoints, step debugging e
  inspeção de variáveis em testes utPLSQL"
- Publicar via release no GitHub

## 10. Critérios de aceite

- `npm test` passa
- Debugger registrado como `type: "utplsql"` no VSCode
- Breakpoints em `.pks` funcionam
- Step Into/Over/Out funcionam
- Variáveis locais visíveis no Debug Console
- Continue termina a execução normalmente
- Stop interrompe a execução
- Sem `oracledb` → funcionalidade desabilitada com mensagem clara
- Sem grants → erro com SQL de grants

## 11. Questões em aberto

- Watch expressions: permitir expressões PL/SQL arbitrárias?
  Nexo só permite nomes de variáveis. Recomendação: seguir mesma limitação.
- Suporte a debug de `%beforeall` / `%afterall` hooks?
  — Sim, qualquer código PL/SQL executado pelo utPLSQL no contexto do teste.
- Como integrar com PRD-24 (CodeLens "Debug") e PRD-29 (Jump to failure)?
  — Jump to failure pode abrir o arquivo com breakpoint automático na linha da
  falha da última execução.
- Debug adapter pode ser reusado para debug geral de PL/SQL fora de testes?
  — Sim, a infraestrutura é genérica; o escopo inicial é testes.
