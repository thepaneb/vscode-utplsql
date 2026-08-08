# PRD-11 — Streaming de resultados em tempo real

| Campo | Valor |
|---|---|
| Status | Concluído |
| Spike | 2026-07-30 — validado: `UT_OUTPUT_BUFFER_TMP`, dual-conn polling, thin driver OK |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-03 |
| Conclusão | 2026-08-02 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão | 0.9.0 |
| Arquivos afetados | `src/oracleRunner.ts` (novo), `src/runner.ts`, `src/config.ts`, `src/extension.ts`, `src/state.ts`, `package.json` |

## 1. Resumo

Substituir o modelo atual (executa CLI → espera → parseia XML) por um consumo em tempo real dos resultados de teste via `ut_runner.run`, chamando o banco Oracle diretamente com `node-oracledb`. Cada teste concluído aparece instantaneamente no Test Explorer como passed/failed, sem depender de arquivos temporários.

## 2. Contexto e problema

- O modelo atual é síncrono por lote: a extensão spawna o CLI, espera o processo terminar, lê o JUnit XML e só então atualiza o Test Explorer.
- Para 30+ testes com cobertura, o usuário fica **minutos sem feedback** além do documentation_reporter no output.
- Não há como cancelar testes individuais — só o lote inteiro via `child.kill()`.
- Os arquivos temporários (results.xml, coverage.xml) são lixo que precisa ser limpo.
- O JUnit XML contém tudo no final — se o processo falha no meio, perde-se todos os resultados.
- O utPLSQL framework já suporta consumo em tempo real: os reporters escrevem incrementalmente na tabela `UT_OUTPUT_BUFFER_TMP` (VARCHAR2) e `UT_OUTPUT_CLOB_BUFFER_TMP` (CLOB), com colunas `OUTPUT_ID`, `MESSAGE_ID`, `TEXT`, `IS_FINISHED`. O `utPLSQL-java-api` (`TestRunner`) lê essas tabelas via polling para streaming.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Conectar no Oracle via `node-oracledb` (thin driver, sem dependência de Instant Client).
- Chamar `ut_runner.run` com paths, reporters e cobertura.
- Consumir as tabelas `UT_OUTPUT_BUFFER_TMP` / `UT_OUTPUT_CLOB_BUFFER_TMP` em polling a partir de uma segunda conexão Oracle.
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
  onOutput: (text: string) => void,
): Promise<void> {
  const parsed = parseConnString(connStr);
  const conn1 = await oracledb!.getConnection(parsed);
  const conn2 = await oracledb!.getConnection(parsed); // polling

  try {
    // 0. Descobre schema do utPLSQL (ex: 'UT3' em shared install)
    const utSchema = await discoverUtplsqlSchema(conn1);

    // 1. Limpa buffers anteriores
    await conn1.execute(`DELETE FROM ${utSchema}UT_OUTPUT_BUFFER_TMP`, {}, { autoCommit: true });
    await conn1.execute(`DELETE FROM ${utSchema}UT_OUTPUT_BUFFER_INFO_TMP`, {}, { autoCommit: true });
    await conn1.execute(`DELETE FROM ${utSchema}UT_OUTPUT_CLOB_BUFFER_TMP`, {}, { autoCommit: true });

    // 2. Monta reporters sem a_output_id (não suportado no utPLSQL 3.2)
    const reportersPlsql = [
      'ut_documentation_reporter()',
      'ut_junit_reporter()',
    ];
    if (coverage) {
      reportersPlsql.push('ut_coverage_cobertura_reporter()');
    }

    // 3. Dispara ut_runner.run em conn1 (bloqueante)
    const runnerPromise = conn1.execute(
      `BEGIN ut_runner.run(
        a_paths => ut_varchar2_list(${paths.map(p => `'${p}'`).join(',')}),
        a_reporters => ut_reporters(${reportersPlsql.join(',')})
      ); END;`,
      {}, { autoCommit: true }
    );

    // 4. Polling em conn2 enquanto conn1 roda
    let lastMsgId = 0;
    let junitXml = '';
    const bufEnd = token.onCancellationRequested(async () => {
      // ALTER SYSTEM KILL SESSION para abortar
    });

    while (true) {
      const done = await Promise.race([
        runnerPromise.then(() => true),
        new Promise(r => setTimeout(r, 200)).then(() => false),
      ]);

      const rows = await conn2.execute(
        `SELECT message_id, text, is_finished FROM ${utSchema}UT_OUTPUT_BUFFER_TMP WHERE message_id > :last ORDER BY message_id`,
        { last: lastMsgId }
      );

      for (const row of rows.rows ?? []) {
        lastMsgId = row[0];
        if (row[1]) {
          if (row[1].startsWith('<')) {
            junitXml += row[1] + '\n';  // acumular JUnit
          } else {
            onOutput(row[1]);             // documentation em tempo real
          }
        }
      }

      if (done) break;
    }

    // 5. Parse final do JUnit e coverage
    const cases = parseJUnit(junitXml);
    applyResultsFromCases(cases, items, run, state);

    if (coverage) {
      const covRows = await conn2.execute(
        `SELECT text FROM UT_OUTPUT_CLOB_BUFFER_TMP ORDER BY message_id`
      );
      // parse Cobertura XML...
    }

  } finally {
    await conn1.close();
    await conn2.close();
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

### RF5 — Mapeamento JUnit (parse final + progresso textual)

**Abordagem pragmática (confirmada pelo spike):**
- O documentation_reporter escreve linhas de progresso (`"Suite X"`, `"  test Y [.006 sec]"`, `"Finished..."`) **antes** das linhas JUnit no buffer.
- Essas linhas são exibidas em tempo real via `run.appendOutput()`, dando feedback imediato ao usuário.
- As linhas JUnit (XML) são acumuladas e parseadas ao final com `parseJUnit()` — mesma função já usada no modo CLI.
- O mapeamento `TestItem` → resultado usa o mesmo algoritmo de `applyResults` (match por `packageName|procName`).

Esta abordagem elimina a complexidade do parsing incremental de XML sem perder o valor do feedback em tempo real.

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
    │ ──────────────────────────►   │  conn1: CONNECT                  │
    │                               │ ──────────────────────────────►  │
    │                               │  conn2: CONNECT                  │
    │                               │ ──────────────────────────────►  │
    │                               │  conn1: ut_runner.run(...)       │
    │                               │ ──────────────────────────────►  │ (bloqueante)
    │                               │  conn2: LOOP:                    │
    │                               │    SELECT FROM UT_OUTPUT_BUFFER_TMP │
    │                               │    ◄────────────────────────────  │
    │                               │    doc lines → run.appendOutput  │
    │   run.appendOutput()          │    JUnit lines → acumular        │
    │   ◄────────────────────────── │                                  │
    │                               │    ... até runnerPromise done    │
    │                               │                                  │
    │                               │  parseJUnit() + applyResults     │
    │                               │  parseCobertura() + applyCoverage│
    │                               │                                  │
    │                               │  conn1 + conn2: DISCONNECT       │
    │                               │ ──────────────────────────────►  │
```

### 5.2 `src/oracleRunner.ts` — detalhes da implementação

- `discoverUtplsqlSchema(conn)`: query `ALL_SYNONYMS` para encontrar o schema real dono do utPLSQL (ex: `UT3`). Usado como prefixo em todas as queries de buffer para suportar shared install.
- `parseConnString(connStr)`: parseia `user/password@//host:port/service` em `{ user, password, connectionString }` para `oracledb.getConnection()`.
- `callUtRunner(conn, paths, reporters)`: monta bloco PL/SQL com `ut_runner.run(a_paths => ut_varchar2_list(...), a_reporters => ut_reporters(...))` e executa via `connection.execute()`.
- `pollBuffer(conn, lastMsgId)`: `SELECT message_id, text, is_finished FROM ${utSchema}UT_OUTPUT_BUFFER_TMP WHERE message_id > :last ORDER BY message_id`.
- `token.onCancellationRequested`: encerra conexões e/ou executa `ALTER SYSTEM KILL SESSION` para abortar o run.
- Reporters **não** aceitam `a_output_id` no utPLSQL 3.2 — escrevem diretamente nas tabelas de buffer com `MESSAGE_ID` sequencial.
- Separação doc/JUnit: linhas que começam com `<` são JUnit XML, demais são documentation.
- Coverage: `UT_COVERAGE_COBERTURA_REPORTER` escreve no `UT_OUTPUT_CLOB_BUFFER_TMP` — parseado ao final.

### 5.3 Parsing de JUnit e cobertura

1. Linhas JUnit (começam com `<`) são acumuladas em string durante o polling.
2. Ao final do run, `parseJUnit(junitXml)` — mesma função de `src/junit.ts`, sem alterações.
3. Resultados são mapeados para `vscode.TestItem` usando o mesmo algoritmo de `applyResults` (match por `packageName|procName`).
4. Coverage: `UT_COVERAGE_COBERTURA_REPORTER` escreve no `UT_OUTPUT_CLOB_BUFFER_TMP`. As linhas do XML Cobertura são extraídas e parseadas com `parseCobertura()` existente.
5. O mapeamento de coverage (source files) reusa `applyCoverage` existente.

### 5.4 `runner.ts`

Adicionar `runnerMode` ao `UtConfig`. Bifurcar entre CLI e Oracle no início de `executeRun`.

### 5.5 `state.ts`

Nenhuma mudança significativa — `TestStateManager` já mantém o meta dos testes.

### 5.6 Schema discovery e grants (shared install)

**Problema**: em instalação compartilhada (utPLSQL no schema `UT3`, testes em `APP_USER`):
1. As tabelas `UT_OUTPUT_BUFFER_TMP`/`UT_OUTPUT_CLOB_BUFFER_TMP` não têm synonyms públicos
2. O script `create_grants.sql` concede `EXECUTE` nos tipos de buffer mas **não** `SELECT`/`DELETE` nas tabelas
3. A query direta `SELECT FROM UT_OUTPUT_BUFFER_TMP` falha com `ORA-00942`

**Solução — schema discovery**: antes de executar, a extensão descobre o schema do utPLSQL via `ALL_SYNONYMS`:

```sql
SELECT table_owner FROM ALL_SYNONYMS
WHERE synonym_name = 'UT_RUNNER' AND owner = 'PUBLIC'
```

Isso retorna `UT3` (o schema real). Com o prefixo, a query usa `UT3.UT_OUTPUT_BUFFER_TMP`.

**Solução — grants**: o DBA precisa conceder acesso às tabelas de buffer:

```sql
GRANT SELECT, DELETE ON UT3.UT_OUTPUT_BUFFER_TMP TO PUBLIC;
GRANT SELECT, DELETE ON UT3.UT_OUTPUT_BUFFER_INFO_TMP TO PUBLIC;
```

> Nota: `UT_OUTPUT_CLOB_BUFFER_TMP` **não** é usado pelos reporters padrão (JUnit, documentation, coverage cobertura) — todos escrevem na mesma `UT_OUTPUT_BUFFER_TMP` (VARCHAR2). O CLOB buffer existe para reporters customizados com saída muito grande.

**Fallback**: se a query com schema prefixado falhar (ex: `ORA-00942` por falta de grants), o erro é capturado e o runner cai para CLI (em modo `auto`) ou reporta erro (em modo `oracle`).

**Alternativa futura**: criar um package wrapper (`UTPLSQL_BRIDGE`) com `AUTHID DEFINER` no schema do utPLSQL que lê os buffers e expõe via `SYS_REFCURSOR`. Isso eliminaria a necessidade de grants manuais. Não incluso no escopo inicial.

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
| `node-oracledb` tem dependências nativas complexas | O thin driver (puro JS) elimina a necessidade de Instant Client. Disponível desde oracledb 6.0. **Validado no spike com v7.0.1.** |
| Conexão Oracle pode falhar com string de conexão diferente | Parse robusto da connection string + fallback para CLI. |
| `ut_runner.run` pode não estar disponível (utPLSQL < 3.0) | `CompatibilityProxy` (PRD-09) detecta versão antes de tentar; fallback para CLI. |
| Polling intensivo do buffer pode sobrecarregar o banco | Intervalo de 200ms entre polls; 2 conexões apenas (1 run + 1 poll). |
| Coverage via `UT_OUTPUT_CLOB_BUFFER_TMP` pode ter formato diferente | **Corrigido.** O `UT_COVERAGE_COBERTURA_REPORTER` usa `UT_OUTPUT_BULK_BUFFER`, que escreve na mesma `UT_OUTPUT_BUFFER_TMP` (VARCHAR2) que os reporters JUnit e documentation. Nenhum reporter padrão usa `UT_OUTPUT_CLOB_BUFFER_TMP`. Coverage é extraído do mesmo buffer JUnit (tag `<coverage` no XML). |
| `ut_output_buffer.get_lines` não existe no utPLSQL 3.2 | **Corrigido.** `UT_OUTPUT_REPORTER_BASE.get_lines` existe, tem synonym público e grant EXECUTE. Porém usa `DELETE...RETURNING` (leitura destrutiva), desenhado para consumo na **mesma sessão** — não funciona para cross-connection polling. Query direta em `UT_OUTPUT_BUFFER_TMP` com schema prefixado é a abordagem correta. Ver seção **5.6**. |
| Shared install: `GRANT SELECT` ausente nas tabelas de buffer | O script `create_grants.sql` concede apenas `EXECUTE` nos tipos de buffer (`UT_OUTPUT_BUFFER_BASE` etc.), **não** concede `SELECT`/`DELETE` em `UT_OUTPUT_BUFFER_TMP`, `UT_OUTPUT_BUFFER_INFO_TMP`, `UT_OUTPUT_CLOB_BUFFER_TMP`. Em instalação compartilhada, a query direta falha com `ORA-00942`. Mitigação: documentar que o DBA precisa executar `GRANT SELECT, DELETE ON UT3.UT_OUTPUT_BUFFER_TMP TO PUBLIC` (e análogos). Fallback automático para CLI se a query falhar. |

## 9. Rollout

- Release 0.9.0 (minor).
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

- ~~Vale a pena usar `DBMS_PARALLEL_EXECUTE` para consumir múltiplos reporters em paralelo?~~ Resolvido: os reporters escrevem no mesmo buffer com `MESSAGE_ID` sequencial — consumo sequencial é suficiente.
- ~~Como tratar a connection string para `oracledb`?~~ Resolvido: parse `user/pass@//host:port/service` → `{ user, password, connectionString: 'host:port/service' }`.
- ~~`ut_output_buffer.get_lines` existe?~~ Resolvido: `UT_OUTPUT_REPORTER_BASE.get_lines` existe (PIPELINED, synonym público), mas é destrutivo e só funciona mesma-sessão. Query direta com schema prefixado é a abordagem correta.
- ~~E se o `ut_runner.run` lançar uma exceção PL/SQL?~~ Resolvido: `connection.execute()` lança erro JS. O `catch` no `executeRunOracle` propaga, e o `runner.ts` captura (modo `auto` → fallback CLI; modo `oracle` → marca todos como erro).
- ~~Suporte a TNS (tnsnames.ora)?~~ Resolvido: `oracledb` suporta `connectString` no formato TNS se o Oracle Client estiver configurado. Não incluso no escopo inicial — documentar como opcional no README.
- ~~Coverage: o `UT_COVERAGE_COBERTURA_REPORTER` escreve no buffer CLOB ou VARCHAR2?~~ Resolvido: confirmado no código-fonte — `UT_COVERAGE_COBERTURA_REPORTER` usa `UT_OUTPUT_BULK_BUFFER`, que escreve em `UT_OUTPUT_BUFFER_TMP` (VARCHAR2), mesma tabela dos reporters JUnit e documentation. `UT_OUTPUT_CLOB_BUFFER_TMP` não é usado por nenhum reporter padrão.

## 12. Resultado do spike técnico (2026-07-30)

| Teste | Resultado |
|---|---|
| Conexão `oracledb` thin driver (v7.0.1) | ✅ OK |
| `ut_runner.run` via `connection.execute()` | ✅ 3 testes em 181ms |
| `UT_OUTPUT_BUFFER_TMP` existe | ✅ Colunas: `OUTPUT_ID`, `MESSAGE_ID`, `TEXT`, `ITEM_TYPE`, `IS_FINISHED` |
| Polling incremental (2 conexões) | ✅ Dados visíveis durante execução |
| JUnit XML parseável do buffer | ✅ Idêntico ao gerado pelo CLI |
| `ut_output_buffer.get_lines` | ❌ Chamada `ut_output_buffer.get_lines(...)` não existe como função standalone. **Porém** `UT_OUTPUT_REPORTER_BASE.get_lines` (método de tipo, PIPELINED) existe, tem synonym público e é `FINAL`. A confusão original veio de tentar chamar como função solta em vez de método do tipo. |
| `UT_OUTPUT_REPORTER_BASE.get_lines` (spin-off) | ✅ Existe, mas é destrutivo (`DELETE...RETURNING` do `UT_OUTPUT_TABLE_BUFFER.tpb` linha 114-123) — só funciona na mesma sessão que executou o `ut_runner.run`. Inviável para cross-connection polling. |
| Grants em buffer tables (shared install) | ⚠️ `create_grants.sql` concede `EXECUTE` nos tipos de buffer mas **não** concede `SELECT` em `UT_OUTPUT_BUFFER_TMP` etc. Em shared install, SELECT direto falha. Precisa de grants manuais ou wrapper. |
| Reporters com `a_output_id` | ❌ Não suportado — escrevem no buffer compartilhado |
| Buffer usado pelos reporters padrão | ✅ Todos (JUnit, documentation, coverage cobertura) escrevem na mesma `UT_OUTPUT_BUFFER_TMP` (VARCHAR2). `UT_OUTPUT_BUFFER_INFO_TMP` armazena metadados dos buffers ativos. `UT_OUTPUT_CLOB_BUFFER_TMP` não é usado por nenhum reporter padrão. |
