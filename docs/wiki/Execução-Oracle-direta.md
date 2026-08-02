# Execução Oracle direta (streaming)

A partir da v0.9.0, a extensão suporta execução de testes diretamente no banco
Oracle via [node-oracledb](https://node-oracle.readthedocs.io/), com resultados
em **tempo real** — cada teste aparece no Test Explorer assim que termina, sem
esperar o batch completo.

## Modos de execução (`utplsql.runnerMode`)

| Modo | Comportamento |
|---|---|
| `auto` (default) | Tenta conexão Oracle direta; se `oracledb` não estiver instalado, cai para CLI automaticamente. |
| `oracle` | Sempre via Oracle direto. Erro se `oracledb` não disponível. |
| `cli` | Sempre via linha de comando (comportamento tradicional). |

## Como funciona o modo Oracle direto

```
Extension Host
    │
    ├─► conn1: ut_runner.run(...)          ← executa os testes (bloqueante)
    │
    └─► conn2: polling a cada 200ms        ← lê resultados incrementais
              SELECT FROM UT_OUTPUT_BUFFER_TMP
              WHERE message_id > :last
              ORDER BY message_id
```

1. A extensão abre **duas conexões** Oracle via `node-oracledb` (thin driver, sem Instant Client).
2. A **conn1** executa `ut_runner.run(a_paths => ..., a_reporters => ...)` — bloqueante.
3. A **conn2** faz polling da tabela `UT_OUTPUT_BUFFER_TMP` a cada 200ms.
4. Linhas de documentation (texto) são exibidas em tempo real no Output.
5. Linhas XML (JUnit) são acumuladas e parseadas ao final com `parseJUnit()`.
6. Coverage é extraído do mesmo buffer (tag `<coverage` no XML).

**Vantagens sobre o CLI:**
- Feedback instantâneo — cada teste aparece no Explorer assim que termina
- Cancelamento mata a sessão Oracle (sem `child.kill()`)
- Sem arquivos temporários (`results.xml`, `coverage.xml`)
- Resultados preservados mesmo se o processo falhar no meio

## Pré-requisitos

### node-oracledb

```bash
npm install oracledb
```

A dependência é **opcional** (`optionalDependencies` no `package.json`). O thin
driver (puro JavaScript) não requer Oracle Instant Client.

### Grants no banco (shared install)

Se o utPLSQL estiver instalado em um schema separado (ex.: `UT3`), o DBA precisa
conceder acesso às tabelas de buffer usadas pelo polling:

```sql
-- Como DBA (ou owner UT3):
GRANT SELECT, DELETE ON UT3.UT_OUTPUT_BUFFER_TMP TO PUBLIC;
GRANT SELECT, DELETE ON UT3.UT_OUTPUT_BUFFER_INFO_TMP TO PUBLIC;
```

Sem esses grants, o modo Oracle direto falha com `ORA-00942`. Nesse caso, use
`runnerMode: auto` — a extensão detecta o erro e cai para CLI automaticamente.

> Em instalação **por schema** (utPLSQL no mesmo schema dos testes), esses grants
> não são necessários — as tabelas estão no próprio schema.

### Cobertura

A cobertura requer `GRANT EXECUTE ON SYS.DBMS_PROFILER` no schema dos testes
(mesmo requisito do modo CLI).

## Configuração

```jsonc
{
  // Recomendado: modo auto (tenta Oracle, fallback CLI)
  "utplsql.runnerMode": "auto"

  // Sempre Oracle (erro se oracledb não disponível)
  // "utplsql.runnerMode": "oracle"
}
```

## Comparação CLI vs Oracle direto

| Aspecto | CLI | Oracle direto |
|---|---|---|
| Feedback | Batch (espera tudo terminar) | Streaming (teste por teste) |
| Cancelamento | `child.kill()` | `ALTER SYSTEM KILL SESSION` |
| Arquivos temp | `results.xml`, `coverage.xml` | Nenhum |
| Dependências | Java + utPLSQL-cli | node-oracledb (opcional) |
| Latência extra | Spawn de processo + JVM startup | Conexão TCP direta |
| Shared install | Funciona sempre | Requer grants nas tabelas de buffer |

## Troubleshooting

| Sintoma | Solução |
|---|---|
| "oracledb não disponível" | `npm install oracledb` ou use `runnerMode: cli` |
| `ORA-00942: table does not exist` | Execute os grants nas tabelas de buffer (veja acima) |
| Conexão recusada | Verifique formato: `user/pass@//host:port/service` |
| Coverage não funciona | Mesmo requisito do CLI: `GRANT EXECUTE ON DBMS_PROFILER` |
