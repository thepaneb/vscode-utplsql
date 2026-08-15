# PRD-38 — Connection Pooling no Oracle Runner

| Campo | Valor |
|---|---|
| Status | Em desenvolvimento |
| Autor | Gil Cleber |
| Data | 2026-08-08 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.10.0 |
| Arquivos afetados | `src/oracleRunner.ts`, `src/extension.ts`, `src/config.ts` |

## 1. Resumo

Substituir `oracledb.getConnection()` raw por `oracledb.createPool()` gerenciado no ciclo de vida da extensão (criação lazy na primeira execução, fechamento na desativação), adicionando validação de conexão (`poolPingInterval`), cache de statements (`stmtCacheSize`) e `outFormat` global, conforme prescrito pela skill oficial `oracle/skills/db/appdev/nodejs-oracledb.md`.

## 2. Contexto e problema

A skill oficial `oracle/skills/db/appdev/nodejs-oracledb.md` e a skill local `oracle-nodejs` exigem connection pooling para aplicações. O código atual (`oracleRunner.ts:79-80`) cria duas conexões raw por execução:

```typescript
const conn1 = await oracledb.getConnection(parsed); // conexão raw
const conn2 = await oracledb.getConnection(parsed); // segunda conexão raw
```

Conexões raw não se beneficiam de:
- Reconexão automática em caso de queda de rede
- Limite de conexões simultâneas (risco de exaustão do BD)
- Health checks periódicos (`poolPingInterval`)
- Cache de prepared statements (`stmtCacheSize`)
- Formato de saída padronizado (`outFormat`)

A skill recomenda: criar pool **uma vez** na inicialização, pegar conexões do pool, devolver no `finally`.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Criar pool lazy no primeiro `executeRunOracle()` com `oracledb.createPool()` (decisão D1)
- Fechar pool em `extension.ts:deactivate()` via `closeOraclePool()`
- Usar `pool.getConnection()` em `oracleRunner.ts`
- Configurar `poolPingInterval: 60`, `stmtCacheSize: 30`
- Definir `oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT`

**Não-objetivos**
- Não altera o CLI runner
- Não implementa DRCP (Database Resident Connection Pooling)
- Não expõe configurações avançadas do pool além dos 4 settings listados em RF4

## 4. Requisitos

### RF1 — Pool lazy na primeira execução

`oracledb.createPool()` chamado lazy no primeiro `executeRunOracle()`, reutilizando a connection string resolvida em `runner.ts` (decisão D1). Como o Oracle runner só é invocado quando `runnerMode !== 'cli'`, o pool nunca é criado no modo CLI.

### RF2 — Pool na desativação

`closeOraclePool()` em `deactivate()` com timeout de 10 segundos para drenar conexões ativas (best-effort, `catch(() => {})`).

### RF3 — Aquisição do pool

`oracleRunner.ts` passa a usar `pool.getConnection()` (pool gerenciado por `ensurePool`). `conn.close()` devolve ao pool, não fecha a conexão física.

### RF4 — Configuração

Novos settings opcionais: `utplsql.oraclePoolMin` (default `2`), `utplsql.oraclePoolMax` (default `10`), `utplsql.oraclePoolIncrement` (default `1`), `utplsql.oraclePoolPingInterval` (default `60`).

**Não-funcionais**
- RNF1 — Pool não deve bloquear ativação da extensão (criação lazy ou async)
- RNF2 — Compatível com Thin mode (default, sem Instant Client)

## 5. Solução proposta

### 5.1 Criação do pool (lazy, no primeiro run Oracle)

O pool é criado **lazy** no primeiro `executeRunOracle()` — **não** em `activate()` (decisão D1). Um gerenciador em `oracleRunner.ts` mantém `{ pool, key }`, onde `key` é a connection string usada na criação (decisão D3):

```typescript
// oracleRunner.ts — gerenciador de pool (módulo)
let currentPool: { pool: oracledb.Pool; key: string } | undefined;

async function ensurePool(oracledb, connection: string, cfg: UtConfig) {
  if (currentPool?.key === connection) return currentPool.pool;
  if (currentPool) await currentPool.pool.close(10).catch(() => {});
  const parsed = parseConnString(connection);
  const pool = await oracledb.createPool({
    user: parsed.user,
    password: parsed.password,
    connectString: parsed.connectionString,
    poolMin: cfg.oraclePoolMin ?? 2,
    poolMax: cfg.oraclePoolMax ?? 10,
    poolIncrement: cfg.oraclePoolIncrement ?? 1,
    poolPingInterval: cfg.oraclePoolPingInterval ?? 60,
    stmtCacheSize: 30,
  });
  currentPool = { pool, key: connection };
  return pool;
}

// oracleRunner.ts — exportado para extension.ts
export async function closeOraclePool() {
  if (currentPool) {
    await currentPool.pool.close(10).catch(() => {});
    currentPool = undefined;
  }
}
```

```typescript
// extension.ts:deactivate()
await closeOraclePool();
```

**Por que lazy:** `resolveConnection()` pode abrir prompt ao usuário
(config.ts:91) — chamar em `activate()` exibiria um dialog na inicialização do
VSCode. A validação antecipada já é coberta pelo `SetupValidator` na ativação
(extension.ts:264) e pelo `getCliInfo` a cada execução.

### 5.2 Uso do pool (oracleRunner.ts)

```typescript
// Antes:
const conn1 = await oracledb.getConnection(parsed);
const conn2 = await oracledb.getConnection(parsed);

// Depois (helper exportado, cobre pool e fallback raw):
export async function acquireRunnerConnections(oracledb, connection, cfg) {
  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  const parsed = parseConnString(connection);
  const pool = await ensurePool(oracledb, connection, cfg).catch(() => undefined);
  if (pool) {
    return { conn1: await pool.getConnection(), conn2: await pool.getConnection() };
  }
  return {
    conn1: await oracledb.getConnection(parsed),
    conn2: await oracledb.getConnection(parsed),
  };
}
```

O `finally` existente (`conn.close()`) já devolve ao pool — sem alteração.

> **Implementação**: com `outFormat = OBJECT`, os acessos posicionais de rows
> foram trocados por propriedades nomeadas — `TABLE_OWNER` em
> `discoverUtplsqlSchema` e `MESSAGE_ID`/`TEXT` no poll do buffer.

### 5.3 Fallback: pool não disponível

Se `ensurePool` falhar (ex.: banco inacessível), `executeRunOracle` recebe a
connection string e cria conexão raw como fallback:

```typescript
const conn1 = pool
  ? await oracledb.getConnection()
  : await oracledb.getConnection(parsed);
```

Quando a connection string muda entre execuções (setting editado,
`utPLSQL: Limpar conexão` + nova), `ensurePool` fecha o pool antigo e cria um
novo — a comparação por `key` acontece a cada execução.

## 6. Configuração

| Setting | Tipo | Default | Descrição |
|---|---|---|---|
| `utplsql.oraclePoolMin` | `number` | `2` | Conexões mínimas mantidas no pool |
| `utplsql.oraclePoolMax` | `number` | `10` | Conexões máximas no pool |
| `utplsql.oraclePoolIncrement` | `number` | `1` | Incremento ao expandir o pool |
| `utplsql.oraclePoolPingInterval` | `number` | `60` | Segundos entre health checks |

## 7. Plano de testes

- **Unitários**: `oracleRunner.test.ts` — mock do `oracledb.getConnection()` e `createPool()`, verificar que pool é usado quando disponível. Teste de fallback para conexão raw. Teste de `ensurePool`: reutiliza pool quando a connection string é igual, recria quando muda.
- **Integração**: Rodar suite com pool, verificar que `conn.close()` devolve ao pool (conexão reutilizada na segunda execução).
- **Validação manual**: Rodar com `runnerMode: 'oracle'`, mudar a conexão via `utPLSQL: Limpar conexão` + nova conexão e verificar que o pool antigo é fechado e um novo criado. Ativar/desativar extensão e verificar no log que o pool é destruído no `deactivate()`.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Pool no modo `auto` impede fallback CLI | Pool só é criado se `runnerMode !== 'cli'`. No modo `auto`, se Oracle falhar, CLI ainda funciona (não usa pool). |
| Conexão inválida no pool após timeout de rede | `poolPingInterval: 60` valida conexões a cada 60s com ping interno do node-oracledb. |
| Memória extra (2 conexões mantidas) | `poolMin: 2` é o padrão conservador. Impacto de memória < 10 MB por conexão. |
| Thick mode conflita com pool | Thin mode é default. Se `initOracleClient()` for chamado antes, pool funciona normalmente. |
| Troca de pool (D3) durante execução em voo | Execuções são serializadas por `runWithProgress` (cancela a anterior via `currentRunToken.cancel()`). `deactivate()` cancela a execução antes de fechar o pool. |
| `conn.break()` (cancelamento) devolve conexão quebrada ao pool | O pool descarta a conexão no próximo checkout (ping do `poolPingInterval`); o `finally` com `close().catch(() => {})` não lança. |

## 9. Rollout

- Versão alvo: `0.10.0` (minor)
- Backward-compatible: `runnerMode: 'cli'` não é afetado
- Feature gate: configuração `runnerMode` existente controla uso do pool indiretamente
- README.md: adicionar novas settings na tabela de configuração

## 10. Critérios de aceite

- [x] Pool criado lazy na primeira execução Oracle (`runnerMode: 'oracle'` ou `'auto'`)
- [x] Pool fechado em `deactivate()` (via `closeOraclePool()`)
- [x] `oracleRunner.ts` usa `pool.getConnection()` quando pool existe
- [x] Fallback para conexão raw quando pool não disponível
- [x] Pool recriado quando a connection string muda entre execuções
- [x] `oracledb.outFormat = OUT_FORMAT_OBJECT` definido globalmente
- [x] Novos settings documentados no README.md
- [x] `npm run compile && npm run lint && node --test` passam

## 11. Decisões

**D1 — Pool lazy (não em `activate()`)**: a criação ocorre no primeiro
`executeRunOracle()`. `resolveConnection()` pode abrir prompt ao usuário
(config.ts:91) — criar o pool em `activate()` exibiria um dialog na
inicialização do VSCode e conectaria ao banco mesmo sem nenhuma execução.
A validação antecipada que a criação em `activate()` daria já é coberta pelo
`SetupValidator.validateOnActivation()` (extension.ts:264) e pelo `getCliInfo`
a cada execução (runner.ts:82). Atende RNF1.

**D2 — Sem `SELECT 1 FROM DUAL` explícito**: desnecessário. O driver Thin
(usado pelo projeto, sem Instant Client) implementa ping automático no
checkout do pool: quando a conexão ficou ociosa por mais de
`poolPingInterval` segundos, o pool faz ping e descarta conexões mortas
(`node_modules/oracledb/lib/thin/pool.js:558-588`). Durante uma execução, o
poll de 200ms na `UT_OUTPUT_BUFFER_TMP` e o próprio `ut_runner.run` detectam
conexão morta imediatamente. Um ping extra por checkout só adiciona
round-trip sem benefício.

**D3 — Pool indexado por connection string**: `ensurePool` compara a string
resolvida a cada execução com a `key` do pool atual. Se mudou (setting
editado, `utPLSQL: Limpar conexão` + nova conexão), o pool antigo é fechado
(drenagem de 10s, best-effort) e um novo é criado. Sem isso, o pool
continuaria apontando para o banco antigo silenciosamente. Nenhum tratamento
especial é necessário em `clearSessionConnection` — a comparação acontece no
momento da execução.
