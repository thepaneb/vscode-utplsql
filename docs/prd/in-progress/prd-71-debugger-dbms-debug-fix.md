# PRD-71 — Corrigir o debugger para o DBMS_DEBUG real

| Campo | Valor |
|---|---|
| Status | Em desenvolvimento |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-18 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.12.1 |
| Arquivos afetados | `src/dbmsDebug.ts`, `src/debugger.ts`, `src/test/unit/dbmsDebug.test.ts`, `src/test/unit/debugger.test.ts`, `src/test/integration/debuggerE2E.test.ts`, `CHANGELOG.md` |
| Esforço estimado | 3–5 dias |
| Complexidade | Alta |

## 1. Resumo

O cliente do debugger (`src/dbmsDebug.ts`) usa uma API **inexistente** do
`DBMS_DEBUG`: não há `STEP_INTO`/`STEP_OVER`/`STEP_OUT` nem `GET_VALUES`, e
`DEBUG_ON`, `ATTACH_SESSION`, `SET_BREAKPOINT`, `SYNCHRONIZE`, `CONTINUE` e
`GET_RUNTIME_INFO` têm assinaturas diferentes das usadas. O debugger (PRD-33)
nunca funcionou contra Oracle real; só era exercitado com conexões fake. Esta PRD
reescreve o cliente para a API documentada e liga o teste de integração que
estava gated.

## 2. Contexto e problema

`src/dbmsDebug.ts` gera blocos PL/SQL que não compilam no banco. Divergências
confirmadas nas documentações Oracle 11.2, 12.2, 19c, 21c, 23ai e 26ai (as
assinaturas são **idênticas** em todas; a única diferença é o aviso de
depreciação do `DBMS_DEBUG` a partir do 12.1, que recomenda o `DBMS_DEBUG_JDWP`):

| Uso atual (incorreto) | Assinatura real (11.2–26ai) | Efeito |
|---|---|---|
| `v_session := DBMS_DEBUG.DEBUG_ON()` | `DEBUG_ON(no_client_side_plsql_engine BOOLEAN := TRUE, immediate BOOLEAN := FALSE)` é **procedure**; quem retorna o id é `INITIALIZE(debug_session_id IN VARCHAR2 := NULL, diagnostics IN BINARY_INTEGER := 0) RETURN VARCHAR2` | PLS-00306/erro de compilação; sessão nunca depurada |
| `ATTACH_SESSION(session_id => :id, timeout => :t)` | `ATTACH_SESSION(debug_session_id IN VARCHAR2, diagnostics IN BINARY_INTEGER := 0)` | parâmetros inexistentes |
| `SET_BREAKPOINT(program => :owner||'.'||:unit, line => :line, breakpoint_id => v)` | `SET_BREAKPOINT(program IN program_info, line# IN BINARY_INTEGER, breakpoint# OUT BINARY_INTEGER, fuzzy IN BINARY_INTEGER := 0, iterations IN BINARY_INTEGER := 0) RETURN BINARY_INTEGER` | `program_info` é **record**; nomes `line`/`breakpoint_id` não existem |
| `SYNCHRONIZE(v_status)` | `SYNCHRONIZE(run_info OUT runtime_info, info_requested IN BINARY_INTEGER := NULL) RETURN BINARY_INTEGER` | tipo/retorno errados |
| `CONTINUE(v_status)` | `CONTINUE(run_info IN OUT runtime_info, breakflags IN BINARY_INTEGER, info_requested IN BINARY_INTEGER := NULL) RETURN BINARY_INTEGER` | tipo/retorno errados |
| `STEP_INTO(v_status)`, `STEP_OVER(v)`, `STEP_OUT(v)` | **não existem**. Stepping é `CONTINUE` com `breakflags`: `break_any_call` (into), `break_next_line` (over), `break_any_return` (out) | PLS-00302 (subprograma inexistente) |
| `GET_RUNTIME_INFO(v_info)` | `GET_RUNTIME_INFO(info_requested IN BINARY_INTEGER, run_info OUT runtime_info) RETURN BINARY_INTEGER` | parâmetro `info_requested` obrigatório |
| `TABLE(DBMS_DEBUG.GET_VALUES(scope => 1))` | **não existe** `GET_VALUES`. Existe `GET_VALUE(variable_name IN VARCHAR2, frame# IN BINARY_INTEGER, scalar_value OUT VARCHAR2, format IN VARCHAR2 := NULL) RETURN BINARY_INTEGER` (e um overload para variável de package, via `program_info`) | variáveis nunca listadas |

Observações de implementação que a correção deve respeitar:

- **Order no debuggee**: `INITIALIZE()` (retorna o `debug_session_id`) e então
  `DEBUG_ON()`. `DEBUG_OFF` é procedure sem argumentos.
- **`program_info`** (record): `namespace`, `name`, `owner`, `dblink`, `line#`.
  A partir da versão 2.1, `namespace`/`name`/`owner`/`dblink` podem ser `NULL`
  (breakpoint cai na unidade corrente). Constant de namespace documentada:
  `namespace_pkgspec_or_toplevel` (além de `namespace_cursor`,
  `namespace_pkg_body`, `namespace_trigger`).
- **`runtime_info`** (record): `line#`, `terminated`, `breakpoint`, `stackdepth`,
  `interpreterdepth`, `reason`, `program` (outro `program_info`).
- **`breakflags`**: `break_next_line`, `break_any_call`, `break_any_return`,
  `break_return`, `break_exception`, `break_handler`, `abort_execution`.
- **`info_requested`**: `info_getStackDepth`, `info_getBreakpoint`,
  `info_getLineinfo` (a doc também lista `info_getLineInfo`), `info_getOerInfo`.
- **Mapeamento de status**: `parseProceedStatus` já cobre os códigos; conferir
  contra os retornos documentados (`success`, `error_timeout`,
  `error_communication`, `error_exception`, `error_deferred`, …).
- **Nomes de parâmetro**: usar notação posicional ou os nomes reais
  (`line#`, `breakpoint#`) — `line#`/`breakpoint#` contêm `#` e exigem notação
  posicional ou citação; preferir posicional para evitar ambiguidade.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Reescrever `DbmsDebugClient` para a API real do `DBMS_DEBUG`, compatível com
  11.2+.
- Fazer o fluxo init → attach → breakpoint → run → synchronize/step → detach
  funcionar ponta a ponta.
- Ligar o teste de integração `debuggerE2E.test.ts` (hoje só valida o ambiente).
- Manter os testes unitários com conexão fake alinhados à nova geração de SQL.

**Não-objetivos**
- Migrar para `DBMS_DEBUG_JDWP` (protocolo JDWP exige cliente Java/TCP; fica para
  uma PRD futura, se desejado).
- Enumeração automática de variáveis locais por debug info (ver RF5: o escopo é
  listar variáveis por nome conhecido).
- Suporte a debug remoto por database link.

## 4. Requisitos

### RF1 — Sessão do debuggee via `INITIALIZE` + `DEBUG_ON`

```typescript
async debugOn(): Promise<string> // retorna o debug_session_id de INITIALIZE
// PL/SQL: v_id := DBMS_DEBUG.INITIALIZE(); DBMS_DEBUG.DEBUG_ON(); :session := v_id;
```

### RF2 — `ATTACH_SESSION(debug_session_id, diagnostics)`

Aceitar o id e um timeout lógico (mapeado para `DBMS_DEBUG.default_timeout` ou
para o `timeout` da própria sessão), não um parâmetro `timeout` inexistente.

### RF3 — Breakpoints com `program_info`

```typescript
async setBreakpoint(target: BreakpointTarget): Promise<number>
// DECLARE v_prog DBMS_DEBUG.program_info; v_brkpt BINARY_INTEGER;
// BEGIN v_prog.name := :unit; v_prog.owner := :owner; v_prog.line# := :line;
//   v_status := DBMS_DEBUG.SET_BREAKPOINT(v_prog, :line, v_brkpt, 1 /*fuzzy*/);
//   :brkpt := v_brkpt; END;
```

### RF4 — Continue/step via `breakflags`

Substituir `STEP_*` por `CONTINUE(run_info, breakflags, info_requested)`:

| Ação DAP | breakflags |
|---|---|
| continue | `0` (para no próximo breakpoint) |
| next / stepOver | `break_next_line` |
| stepIn | `break_any_call` |
| stepOut | `break_any_return` |

### RF5 — Variáveis via `GET_VALUE`

Listar variáveis por nome conhecido (parâmetros/`%displayname`/locais extraídos do
fonte, ou um conjunto fixo configurável) e chamar `GET_VALUE` para cada uma; sem
`GET_VALUES`. Se não houver nomes, retornar `[]` (não quebrar a UI).

### RF6 — Frame atual via `runtime_info`

Usar o `run_info.program.owner/name` e `run_info.line#` retornados por
`CONTINUE`/`SYNCHRONIZE`; `GET_RUNTIME_INFO(info_requested, run_info)` quando
necessário.

### RF7 — Teardown correto

`DETACH_SESSION` (debugger) e `DEBUG_OFF` (debuggee) são procedures sem
argumentos; garantir `DEBUG_OFF` em `finally`.

**Não-funcionais**
- RNF1 — Nunca lançar por falha de debug; emitir `output`/`terminated` e limpar
  a sessão.
- RNF2 — Compatibilidade 11.2+ (assinaturas idênticas; não usar features
  posteriores).
- RNF3 — Sem regressão: os testes unitários de `dbmsDebug`/`debugger` devem
  refletir o SQL novo.

## 5. Solução proposta

### 5.1 `src/dbmsDebug.ts`

- `debugOn`: `INITIALIZE` (out `:session`) + `DEBUG_ON`.
- `attachSession(id, timeout)`: `ATTACH_SESSION(:id, 0)`, aguardando o primeiro
  evento com `SYNCHRONIZE`/`CONTINUE` quando aplicável.
- `setBreakpoint`: montar `program_info` em PL/SQL anônimo.
- `deleteBreakpoint`: `DELETE_BREAKPOINT(:id)` (função chamada como statement).
- `continueRun`/`stepInto`/`stepOver`/`stepOut`: único gerador parametrizado por
  `breakflags`, usando `CONTINUE`.
- `getRuntimeFrame`: decodificar `runtime_info` (pro overlay do frame).
- `getVariables(names[])`: `GET_VALUE` por nome.
- Remover `PROCEED_CODES`/`parseProceedStatus` se não fizerem mais sentido,
  ou ajustá-los aos retornos documentados.

### 5.2 `src/debugger.ts`

- Ajustar a ordem de `initSession` (attach antes ou depois de iniciar o teste,
  conforme o protocolo Probe: o debuggee precisa sinalizar o primeiro evento).
- Mapear `reportStop` a partir de `runtime_info.reason`
  (`reason_breakpoint`, `reason_enter`, `reason_return`, `reason_exit`, …).
- `readVariables` passa a receber os nomes a consultar.

## 6. Configuração

Nenhuma nova setting. (Opcional: `utplsql.debugger.variables` com a lista de
nomes a exibir.)

## 7. Plano de testes

- **Unitários**: conexão fake registra o SQL; asserts por subprograma real
  (`INITIALIZE`, `ATTACH_SESSION`, `SET_BREAKPOINT` com `program_info`,
  `CONTINUE` com `breakflags`, `GET_VALUE`), e caminhos de erro já cobertos.
- **Integração** (`debuggerE2E.test.ts`, gated por `DEBUG CONNECT SESSION` +
  `EXECUTE ON DBMS_DEBUG`): compilar um package com `PLSQL_DEBUG`/`COMPILE DEBUG`,
  `INITIALIZE` + `DEBUG_ON` no debuggee, `SET_BREAKPOINT`, executar o package,
  `CONTINUE`/`SYNCHRONIZE` até `reason_breakpoint`, ler `line#`, `DEBUG_OFF`.
- **Validação manual**: F5 no Extension Development Host, breakpoint no editor,
  step over/into/out e inspeção de variáveis.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Sem grant de `DBMS_DEBUG` no banco de teste | Integração faz `skip`; gate por `checkDebugAccess` |
| Ordem attach/run difícil de acertar | Seguir o fluxo do manual Oracle (target: `INITIALIZE`→`DEBUG_ON`→roda; debug: `ATTACH_SESSION`→`SYNCHRONIZE`) |
| `DBMS_DEBUG` deprecado em favor do `DBMS_DEBUG_JDWP` | Manter `DBMS_DEBUG` (disponível até 26ai); avaliar JDWP em PRD futura |
| Enumeração de variáveis sem debug info | RF5 limita a nomes conhecidos; degrada para `[]` |

## 9. Rollout

- Release **0.13.0** (mesma faixa das PRD-47/69).
- Registrar em `CHANGELOG.md` (seção da versão).
- Sem feature flag: o debugger hoje não funciona, então a correção não regride
  comportamento existente.

## 10. Critérios de aceite

- Nenhum PL/SQL gerado usa `STEP_INTO`/`STEP_OVER`/`STEP_OUT`/`GET_VALUES`/
  `DEBUG_ON()` como função.
- Teste unitário falha se qualquer assinatura regredir.
- `debuggerE2E.test.ts` executa (não apenas skip) num banco com grants e conclui
  um ciclo breakpoint → stop → frame.
- `npm test`, `npm run test:coverage` e `npm run test:integration` verdes.

## 11. Questões em aberto

- Vale migrar para `DBMS_DEBUG_JDWP` (protocolo padrão, não deprecado) já nesta
  PRD, ou manter `DBMS_DEBUG`?
- De onde obter a lista de variáveis para `GET_VALUE` (parse do fonte da suíte,
  `ALL_SOURCE`, ou setting)?
