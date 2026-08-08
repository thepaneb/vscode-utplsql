# PRD-38 — Connection Pooling no Oracle Runner

| Campo | Valor |
|---|---|
| Status | Aprovado |
| Autor | Gil Cleber |
| Data | 2026-08-08 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.10.0 |
| Arquivos afetados | `src/oracleRunner.ts`, `src/extension.ts`, `src/config.ts` |

## 1. Resumo

Substituir `oracledb.getConnection()` raw por `oracledb.createPool()` gerenciado no ciclo de vida da extensão (ativação/desativação), adicionando validação de conexão (`poolPingInterval`), cache de statements (`stmtCacheSize`) e `outFormat` global, conforme prescrito pela skill oficial `oracle/skills/db/appdev/nodejs-oracledb.md`.

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
- Criar pool em `extension.ts:activate()` com `oracledb.createPool()`
- Fechar pool em `extension.ts:deactivate()` com `oracledb.getPool().close()`
- Usar `oracledb.getConnection()` (do pool) em `oracleRunner.ts`
- Configurar `poolPingInterval: 60`, `stmtCacheSize: 30`
- Definir `oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT`

**Não-objetivos**
- Não altera o CLI runner
- Não implementa DRCP (Database Resident Connection Pooling)
- Não expõe configurações de pool na UI de settings

## 4. Requisitos

### RF1 — Pool na ativação

`oracledb.createPool()` chamado em `activate()`, reutilizando a connection string resolvida. O pool só é criado se `runnerMode !== 'cli'` e conexão disponível.

### RF2 — Pool na desativação

`oracledb.getPool().close(drainTime)` em `deactivate()` com timeout de 10 segundos para drenar conexões ativas.

### RF3 — Aquisição do pool

`oracleRunner.ts` passa a usar `oracledb.getConnection()` sem argumentos (usa pool default). `conn.close()` devolve ao pool, não fecha a conexão física.

### RF4 — Configuração

Novos settings opcionais: `utplsql.oraclePoolMin` (default `2`), `utplsql.oraclePoolMax` (default `10`), `utplsql.oraclePoolIncrement` (default `1`), `utplsql.oraclePoolPingInterval` (default `60`).

**Não-funcionais**
- RNF1 — Pool não deve bloquear ativação da extensão (criação lazy ou async)
- RNF2 — Compatível com Thin mode (default, sem Instant Client)

## 5. Solução proposta

### 5.1 Criação do pool (extension.ts)

```typescript
// extension.ts:activate()
let pool: oracledb.Pool | undefined;
const cfg = readConfig();
if (cfg.runnerMode !== 'cli') {
  const conn = await resolveConnection();
  if (conn) {
    const parsed = parseConnString(conn);
    pool = await oracledb.createPool({
      user: parsed.user,
      password: parsed.password,
      connectString: parsed.connectionString,
      poolMin: cfg.oraclePoolMin ?? 2,
      poolMax: cfg.oraclePoolMax ?? 10,
      poolIncrement: cfg.oraclePoolIncrement ?? 1,
      poolPingInterval: cfg.oraclePoolPingInterval ?? 60,
      stmtCacheSize: 30,
    });
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  }
}

// extension.ts:deactivate()
if (pool) {
  await pool.close(10).catch(() => {});
}
```

### 5.2 Uso do pool (oracleRunner.ts)

```typescript
// Antes:
const conn1 = await oracledb.getConnection(parsed);
const conn2 = await oracledb.getConnection(parsed);

// Depois:
const conn1 = await oracledb.getConnection();
const conn2 = await oracledb.getConnection();
```

O `finally` existente (`conn.close()`) já devolve ao pool — sem alteração.

### 5.3 Fallback: pool não disponível

Se o pool não foi criado (modo CLI ou falha na conexão), `executeRunOracle` recebe a connection string e cria conexão raw como fallback:

```typescript
const conn1 = pool
  ? await oracledb.getConnection()
  : await oracledb.getConnection(parsed);
```

## 6. Configuração

| Setting | Tipo | Default | Descrição |
|---|---|---|---|
| `utplsql.oraclePoolMin` | `number` | `2` | Conexões mínimas mantidas no pool |
| `utplsql.oraclePoolMax` | `number` | `10` | Conexões máximas no pool |
| `utplsql.oraclePoolIncrement` | `number` | `1` | Incremento ao expandir o pool |
| `utplsql.oraclePoolPingInterval` | `number` | `60` | Segundos entre health checks |

## 7. Plano de testes

- **Unitários**: `oracleRunner.test.ts` — mock do `oracledb.getConnection()` e `createPool()`, verificar que pool é usado quando disponível. Teste de fallback para conexão raw.
- **Integração**: Rodar suite com pool, verificar que `conn.close()` devolve ao pool (conexão reutilizada na segunda execução).
- **Validação manual**: Ativar/desativar extensão com `runnerMode: 'oracle'`, verificar no log que pool é criado/destruído.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Pool no modo `auto` impede fallback CLI | Pool só é criado se `runnerMode !== 'cli'`. No modo `auto`, se Oracle falhar, CLI ainda funciona (não usa pool). |
| Conexão inválida no pool após timeout de rede | `poolPingInterval: 60` valida conexões a cada 60s com ping interno do node-oracledb. |
| Memória extra (2 conexões mantidas) | `poolMin: 2` é o padrão conservador. Impacto de memória < 10 MB por conexão. |
| Thick mode conflita com pool | Thin mode é default. Se `initOracleClient()` for chamado antes, pool funciona normalmente. |

## 9. Rollout

- Versão alvo: `0.10.0` (minor)
- Backward-compatible: `runnerMode: 'cli'` não é afetado
- Feature gate: configuração `runnerMode` existente controla uso do pool indiretamente
- README.md: adicionar novas settings na tabela de configuração

## 10. Critérios de aceite

- [ ] Pool criado em `activate()` com `runnerMode: 'oracle'` ou `'auto'`
- [ ] Pool fechado em `deactivate()`
- [ ] `oracleRunner.ts` usa `getConnection()` sem argumentos quando pool existe
- [ ] Fallback para conexão raw quando pool não disponível
- [ ] `oracledb.outFormat = OUT_FORMAT_OBJECT` definido globalmente
- [ ] Novos settings documentados no README.md
- [ ] `npm run compile && npm run lint && node --test` passam

## 11. Questões em aberto

- Pool deve ser criado em `activate()` ou lazy no primeiro `executeRunOracle()`? Lazy evita bloqueio na ativação mas perde validação antecipada.
- `poolPingInterval` usa ping interno do driver. Precisamos de `SELECT 1 FROM DUAL` explícito?
- O que fazer se `resolveConnection()` mudar durante a sessão (reconexão com outro banco)?
