# PRD-11 — Streaming de resultados em tempo real

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-03 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.9.0 |
| Arquivos afetados | `src/oracleRunner.ts` (novo), `src/runner.ts`, `src/config.ts`, `src/extension.ts`, `src/state.ts`, `package.json` |

## 1. Resumo

Substituir o modelo atual (executa CLI → espera → parseia XML) por um consumo em tempo real dos resultados de teste via `ut_runner.run`, chamando o banco Oracle diretamente com `node-oracledb`. Cada teste concluído aparece instantaneamente no Test Explorer como passed/failed, sem depender de arquivos temporários.

## 2. Contexto e problema

- O modelo atual é síncrono por lote: a extensão spawna o CLI, espera o processo terminar, lê o JUnit XML e só então atualiza o Test Explorer.
- Para 30+ testes com cobertura, o usuário fica **minutos sem feedback** além do documentation_reporter no output.
- Não há como cancelar testes individuais — só o lote inteiro via `child.kill()`.
- Os arquivos temporários (results.xml, coverage.xml) são lixo que precisa ser limpo.
- O JUnit XML contém tudo no final — se o processo falha no meio, perde-se todos os resultados.
- O utPLSQL framework já suporta consumo assíncrono via `ut_runner.run` + `ut_output_buffer.get_lines`, que é o que o `utPLSQL-java-api` (`TestRunner`) usa internamente.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Conectar no Oracle via `node-oracledb` (thin driver, sem dependência de Instant Client).
- Chamar `ut_runner.run` com paths, reporters e cobertura.
- Consumir `ut_output_buffer.get_lines` em polling para cada reporter.
- Atualizar `run.passed()` / `run.failed()` / `run.skipped()` em tempo real.
- Suporte a cancelamento: matar a sessão Oracle.
- Fallback automático para o modo CLI se `node-oracledb` não estiver disponível.

**Não-objetivos**
- Remover o modo CLI (continua como fallback e para usuários sem `node-oracledb`).
- Suporte a múltiplas sessões simultâneas (uma execução por vez como hoje).
- Cobertura em tempo real (o relatório de cobertura só está disponível após o fim da execução).

## 4. Requisitos

### RF1 — Dependência opcional `node-oracledb`

```json
// package.json
"optionalDependencies": {
  "oracledb": "^6.6.0"
}
```

A importação é feita com `try/catch` dinâmico:
```typescript
let oracledb: typeof import('oracledb') | undefined;
try {
  oracledb = await import('oracledb');
} catch {
  // modo CLI como fallback
}
```

### RF2 — Setting `utplsql.runnerMode`

```
"utplsql.runnerMode": {
  "type": "string",
  "enum": ["auto", "cli", "oracle"],
  "default": "auto",
  "description": "Modo de execução: 'auto' (tenta oracle, fallback cli), 'cli' (sempre CLI), 'oracle' (sempre node-oracledb; erro se não disponível)."
}
```

### RF3 — `src/oracleRunner.ts` (novo)

```typescript
export async function executeRunOracle(
  connStr: string,
  paths: string[],
  coverage: boolean,
  run: vscode.TestRun,
  items: vscode.TestItem[],
  state: TestStateManager,
  token: vscode.CancellationToken,
): Promise<void> {
  const conn = await oracledb!.getConnection(connStr);

  try {
    // 1. Gera output_id únicos para cada reporter
    const docOutputId = generateId();
    const junitOutputId = generateId();
    const covOutputId = coverage ? generateId() : undefined;

    // 2. Dispara ut_runner.run em background (DBMS_SCHEDULER ou thread separada)
    //    ut_runner.run(
    //      a_paths => ut_varchar2_list(path1, path2, ...),
    //      a_reporters => ut_reporters(
    //        ut_documentation_reporter(output_id => docOutputId),
    //        ut_junit_reporter(output_id => junitOutputId),
    //        ut_coverage_cobertura_reporter(output_id => covOutputId)
    //      )
    //    );

    // 3. Polling: SELECT * FROM TABLE(ut_output_buffer.get_lines(output_id))
    //    para cada reporter, em paralelo.
    //    Documentation: appendOutput em tempo real
    //    JUnit: acumular linhas e parsear como XML no final
    //    Cobertura: acumular linhas e parsear como XML no final

    // 4. Quando ut_runner termina, fazer o parse final dos XMLs acumulados
    //    e chamar applyResults / applyCoverage

  } finally {
    await conn.close();
  }
}
```

### RF4 — Integração com runner.ts

```typescript
if (cfg.runnerMode === 'cli' || (cfg.runnerMode === 'auto' && !oracledb)) {
  // fluxo atual
} else {
  await executeRunOracle(connection, pathArgs, coverage, run, leafTests, state, token);
}
```

### RF5 — Mapeamento JUnit em tempo real

Em vez de esperar o XML completo, o streaming consome linhas do buffer JUnit e, ao detectar o fechamento de um `<testcase>`, já mapeia para `run.passed()`/`run.failed()`. Isso exige um parser de streaming de XML (ex.: `sax` ou `node:html` parser) — ou, mais simples, fazer o parse completo do buffer acumulado a cada N segundos e atualizar os testes ainda não reportados.

**Abordagem recomendada (incremental parsing):**
- Acumular linhas do buffer JUnit.
- A cada 500ms, tentar parsear o XML parcial com `fast-xml-parser` (tolerante a XML incompleto?).
- Se o parse falhar (XML incompleto), ignorar e tentar de novo.
- Quando um `<testcase>` aparece completo, atualizar o status no Test Explorer.

Alternativa mais simples: parse completo ao final + documentation_reporter como indicador de progresso (linhas de "passed/failed" do documentation_reporter aparecem no output em tempo real — o usuário vê o progresso textual, e os status são atualizados em lote no final).

**Não-funcionais**
- RNF1 — `oracledb` é dependência opcional; sem ela, comportamento é idêntico ao atual.
- RNF2 — A string de conexão nunca é logada (reusa `resolveConnection`).
- RNF3 — O polling de buffers é feito com `setInterval` + verificação de token cancelado.

## 5. Solução proposta

### 5.1 Arquitetura do streaming

```
extension.ts                    oracleRunner.ts                     Oracle DB
    │                               │                                  │
    │  executeRunOracle()           │                                  │
    │ ──────────────────────────►   │  CONNECT                         │
    │                               │ ──────────────────────────────►  │
    │                               │  ut_runner.run(...)              │
    │                               │ ──────────────────────────────►  │
    │                               │                                  │ (async)
    │                               │  LOOP:                           │
    │                               │    SELECT get_lines(output_id)   │
    │                               │    ◄────────────────────────────  │
    │                               │    parse + run.passed/failed     │
    │   run.passed/failed           │                                  │
    │   ◄────────────────────────── │                                  │
    │                               │    ... até get_lines vazio       │
    │                               │                                  │
    │                               │  applyCoverage()                 │
    │   run.addCoverage()           │                                  │
    │   ◄────────────────────────── │                                  │
    │                               │  DISCONNECT                      │
    │                               │ ──────────────────────────────►  │
```

### 5.2 `src/oracleRunner.ts` — detalhes da implementação

- `getConnection(connStr)`: parseia `user/password@host:port/service` para `oracledb.getConnection()`.
- `generateId()`: UUID v4 sem dependência (`crypto.randomUUID()`).
- `callUtRunner(paths, reporters)`: executa `BEGIN ut_runner.run(...); END;` via `connection.execute()`.
- `pollBuffer(outputId)`: `SELECT * FROM TABLE(ut_output_buffer.get_lines(:id))` em loop com `setTimeout` de 200ms.
- `token.onCancellationRequested`: executa `ALTER SYSTEM KILL SESSION` ou `DBMS_SESSION` equivalente para abortar.

### 5.3 Parsing incremental de JUnit

Usar `fast-xml-parser` com `{ stopNodes: ['testcase'] }` ou similar. Como o `fast-xml-parser` não é streaming, a abordagem mais pragmática é:

1. Acumular todo o buffer JUnit.
2. A cada tick do polling, tentar parsear o XML acumulado com `parseJUnit`.
3. Comparar com o estado anterior: novos `<testcase>` parsed → atualizar no Test Explorer.
4. Ao final do polling (buffer vazio e `ut_runner` concluído), parse final + `applyResults`.

### 5.4 `runner.ts`

Adicionar `runnerMode` ao `UtConfig`. Bifurcar entre CLI e Oracle no início de `executeRun`.

### 5.5 `state.ts`

Nenhuma mudança significativa — `TestStateManager` já mantém o meta dos testes.

## 6. Configuração

| Setting | Tipo | Default | Descrição |
|---|---|---|---|
| `utplsql.runnerMode` | enum | `"auto"` | `"auto"` (tenta oracle, fallback cli), `"cli"` (sempre CLI), `"oracle"` (sempre oracle; erro se indisponível) |

## 7. Plano de testes

- **Unitários** (`src/test/unit/oracleRunner.test.ts`): testar a lógica de parse da connection string e geração de IDs. A parte de integração com Oracle requer banco real.
- **Mock**: simular `get_lines` retornando linhas de JUnit incrementalmente e verificar que os callbacks de progresso são chamados na ordem correta.
- **Integração**: execução real com banco Oracle + node-oracledb instalado.
- **Manual**:
  - Modo `auto` sem `oracledb` → execução via CLI (comportamento atual).
  - Modo `oracle` com `oracledb` → resultados streaming no Test Explorer.
  - Cancelamento → testes são interrompidos e run finaliza.
- **Regressão**: todos os testes unitários existentes passam.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `node-oracledb` tem dependências nativas complexas | O thin driver (puro JS) elimina a necessidade de Instant Client. Disponível desde oracledb 6.0. |
| Conexão Oracle pode falhar com string de conexão diferente | Parse robusto da connection string + fallback para CLI. |
| `ut_runner.run` pode não estar disponível (utPLSQL < 3.0) | `CompatibilityProxy` (PRD-09) detecta versão antes de tentar; fallback para CLI. |
| Polling intensivo do buffer pode sobrecarregar o banco | Intervalo de 200-500ms entre polls; `fetchArraySize` grande. |
| XML incremental pode falhar se o buffer contiver fragments | `fast-xml-parser` pode lançar erro com XML incompleto — capturar e ignorar até o próximo tick. |

## 9. Rollout

- Release 0.7.0 (minor) — requer validação extensa com diferentes versões de banco.
- Feature flag: default `auto` → comportamento atual para quem não tem `oracledb`.
- `CHANGELOG.md`: novo modo de execução Oracle com streaming de resultados.
- Publicar via release no GitHub.

## 10. Critérios de aceite

- `npm test` passa.
- Sem `oracledb` instalado, `auto` → execução via CLI (idêntico ao atual).
- Com `oracledb`, `auto` → execução via Oracle com resultados streaming.
- Testes aparecem no Test Explorer progressivamente, não só no final.
- Cancelamento interrompe a execução.
- Cobertura funciona (parse do XML final).

## 11. Questões em aberto

- Vale a pena usar `DBMS_PARALLEL_EXECUTE` para consumir múltiplos reporters em paralelo? O `ut_runner.run` já escreve nos buffers simultaneamente — o consumo é sequencial por output_id.
- Como tratar a connection string para `oracledb`? O formato `user/pass@//host:port/service` é compatível com `oracledb.getConnection({ connectionString })` direto.
- E se o `ut_runner.run` lançar uma exceção PL/SQL? O `connection.execute()` lança erro JS — capturar e marcar todos os testes como erro.
- Suporte a TNS (tnsnames.ora)? `oracledb` suporta `connectString` TNS se o Oracle Client estiver configurado — documentar como opcional.
