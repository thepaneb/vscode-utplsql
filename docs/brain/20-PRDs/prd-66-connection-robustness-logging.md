---
tipo: prd
id: PRD-66
status: completed
titulo: "Robustez de conexão, logging e cache"
versao: "0.12.0"
data: "2026-09-15"
autor: "Gil Cleber Barboza"
verificado: 2026-09-23
tags: [prd]
---

# PRD-66 — Robustez de conexão, logging e cache

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-15 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.12.0 |
| Arquivos afetados | `src/oracleRunner.ts`, `src/logger.ts` (novo), `src/config.ts`, `src/discovery.ts`, `src/dbmsDebug.ts`, `src/debugger.ts`, `src/viewCoverage.ts`, `src/scriptRunner.ts`, `src/extension.ts` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média |

## 1. Resumo

Ampliar o suporte a formatos de connection string delegando o parse ao
`oracledb`, substituir catches que engolem erros por logging gateado
(`UTPLSQL_DEBUG`), invalidar o pool quando as settings de pool mudarem, cachear
a leitura de configuração e eliminar duplicação/verificações ineficazes no
acesso a conexão.

## 2. Contexto e problema

- **Connection string limitada**: a regex de `parseConnString`
  (`oracleRunner.ts:16`) só aceita `user/pass@//host:port/service` e re-encoda
  host/porta/serviço; não cobre TNS aliases, SID, IPv6 sem `//`/porta.
- **Erros silenciados**: vários `catch` vazios escondem falhas de diagnóstico em
  `oracleRunner.ts` (98, 149, 178, 186, 204, 270, 463, 481) e `discovery.ts`
  (164, 205, 224, 258).
- **Pool não invalida por settings**: `ensurePool` chaveia o pool apenas pela
  connection string (`oracleRunner.ts:36,49`); mudanças em `oraclePoolMin/Max/
  Increment/PingInterval` não recriam o pool. Não existe
  `onDidChangeConfiguration` no projeto.
- **Config lida em hot path**: `getExtensionLocale()` → `readConfig()` →
  `getActiveProfile()` (`config.ts:64-66,128`) roda múltiplos
  `getConfiguration` + varredura de array a cada mensagem/CodeLens.
- **Código duplicado**: `showInfo` (`extension.ts:184-202`) e `selectReporter`
  (`extension.ts:130-162`) duplicam criação de pool, aquisição e cleanup.
- **`checkDebugAccess` ineficaz**: consulta `user_objects` por `DBMS_DEBUG`
  (objeto SYS via synonym) — a query sempre sucede e retorna 0 linhas, logo
  sempre retorna `true` (`dbmsDebug.ts:248-255`), sem validar grants.
- **SQL dinâmico no debugger**: `liveRuntime.runTest` interpola o path em
  `ut_varchar2_list('...')` (`debugger.ts:54-63`).
- **`v$sql` sem filtro de sessão**: `applySqlCoverage` varre `v$sql` global
  (`viewCoverage.ts:120-123`) e o prefixo `file.startsWith(base)`
  (`viewCoverage.ts:144`) casa `/foobar` para base `/foo`.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Parse completo de connection string (delegando ao `oracledb`).
- Logging de debug consistente (`UTPLSQL_DEBUG=1`).
- Recriar o pool quando as settings de pool mudarem; cachear config com
  invalidação.
- Deduplicar lógica de conexão.
- Verificação de grants de debug efetiva e uso de binds no debugger.
- Cobertura de views baseada apenas na sessão do runner.

**Não-objetivos**
- Provider de conteúdo `utplsql-db` e SecretStorage (PRD-65).
- Refatoração de `extension.ts` em módulos (PRD-67) — aqui só extrai o helper
  compartilhado de conexão.

## 4. Requisitos

### RF1 — Módulo de log `src/logger.ts`

`logger.debug(message, context?)`, silencioso por padrão e ativo quando
`UTPLSQL_DEBUG=1`; nunca lança.

```typescript
export const logger = {
  debug(msg: string, ctx?: Record<string, unknown>): void {
    if (process.env.UTPLSQL_DEBUG !== '1') return;
    console.debug('[utplsql]', msg, ctx ?? '');
  },
};
```

### RF2 — Substituir catches que engolem erro

Trocar os `catch` listados no contexto por `logger.debug()` com contexto
(operação/schema/package/query), mantendo o retorno `undefined`/`[]`. Os
`.catch(() => {})` de fechamento de pool/connection permanecem silenciosos.

### RF3 — Parse completo de connection string

Separar `user/pass` do `connectString` e entregar o restante inalterado ao
`oracledb` (que resolve TNS/Easy Connect/SID). Cobrir IPv6, sem porta e sem
`//`.

### RF4 — Invalidação de pool + cache de config

- Chave do pool = connection + hash de `oraclePoolMin/Max/Increment/PingInterval`.
- Exportar `invalidatePool()` de `oracleRunner.ts`.
- Handler `onDidChangeConfiguration` que chama `invalidatePool()` e invalida o
  cache de `readConfig()`/`getExtensionLocale()`.

### RF5 — Helper `withOracleConnection(fn)`

Extrair o padrão pool → `getConnection` → `try/finally close` e usá-lo em
`showInfo` e `selectReporter`.

```typescript
export async function withOracleConnection<T>(
  oracledb: typeof import('oracledb'),
  connection: string,
  cfg: UtConfig,
  fn: (conn: OracleConnection) => Promise<T>,
): Promise<T | undefined>;
```

### RF6 — `checkDebugAccess` efetivo

Consultar `all_objects`/`dba_objects` por privilégio, ou tentar
`DBMS_DEBUG.DEBUG_ON`; retornar `false` quando o grant faltar.

### RF7 — Binds no debugger

Usar bind variable para o path em `ut_varchar2_list(:path)` em vez de
interpolação.

### RF8 — Filtro de sessão no `v$sql`

Filtrar por `userenv('sessionid')` (ou `v$session.sid`) e corrigir o prefixo de
path no multi-root.

**Não-funcionais**
- RNF1 — Sem mudança de comportamento observável para callers (exceto logs).
- RNF2 — `UTPLSQL_DEBUG` não loga credenciais.
- RNF3 — `npm test`/`lint`/`coverage` verdes.

## 5. Solução proposta

### 5.1 `src/logger.ts`

Novo módulo puro, sem `vscode`; usado por `oracleRunner`, `discovery`,
`viewCoverage` e `debugger`.

### 5.2 `src/oracleRunner.ts`

- `parseConnString`: split no último `@` e primeiro `/`; `connectString` opaco.
- `ensurePool`: chave composta + `invalidatePool()`.
- `withOracleConnection` exportado.

### 5.3 `src/config.ts` + `src/extension.ts`

Cache em memória de `readConfig()` com invalidação via
`onDidChangeConfiguration` registrado em `activate`.

### 5.4 `src/dbmsDebug.ts`, `src/debugger.ts`, `src/viewCoverage.ts`

Ajustes de RF6, RF7 e RF8 descritos acima.

## 6. Configuração

- Sem novas settings. Documentar `UTPLSQL_DEBUG=1` no README (Troubleshooting).

## 7. Plano de testes

- **Unitários**:
  - `logger.debug` respeita a env var.
  - `parseConnString` para TNS/SID/IPv6/sem porta.
  - Detecção de mudança de config → `invalidatePool` chamado.
  - `checkDebugAccess` retorna `false` sem grant.
  - `matchExecutedViews`/filtro de sessão (função pura).
- **Integração**: reuse do pool entre runs; `showInfo`/`selectReporter` sem
  duplicação (smoke).
- **Manual**: `UTPLSQL_DEBUG=1` exibindo contexto; alterar
  `utplsql.oraclePoolMax` e confirmar recriação do pool.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Delegar TNS ao `oracledb` alterar conexões existentes | Manter compatibilidade e testes com o formato atual. |
| Logging vazar credenciais | Nunca logar a connection string; usar `maskConnection` quando necessário. |
| Recriar pool derrubar conexões em uso | Invalidar apenas entre runs (sem execução ativa). |

## 9. Rollout

- Release 0.12.0 (minor).
- CHANGELOG: "Logging `UTPLSQL_DEBUG`, connection strings completas e
  invalidação de pool por settings".

## 10. Critérios de aceite

- `npm test`, `npm run lint`, `npm run test:coverage` verdes.
- `UTPLSQL_DEBUG=1` produz logs de contexto; ausente → silêncio.
- Mudar settings de pool recria o pool; mudanças não relacionadas não.
- `showInfo`/`selectReporter` usam o helper compartilhado.
- `checkDebugAccess` reflete grants reais.

## 11. Questões em aberto

- Cache de `readConfig` deve usar TTL ou apenas o evento de config? (Recomendado:
  apenas o evento.)
- Recriar pool de forma lazy (próximo run) ou imediata no evento? (Recomendado:
  lazy.)

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-65-schema-mode-security-fixes|PRD-65]] · [[prd-67-code-quality-cleanup|PRD-67]]
- 🎯 RF1 — Módulo de log `src/logger.ts` → [[BR-CONN-014 - Log de debug é opt-in por variável de ambiente|BR-CONN-014]]
- 🎯 RF3 — Parse completo de connection string → [[BR-CONN-013 - Parsing da connection string tolera @ e barra na senha|BR-CONN-013]]
- 📐 Regras: [[BR-CONN-001 - Precedência de resolução da conexão|BR-CONN-001]] · [[BR-CONN-014 - Log de debug é opt-in por variável de ambiente|BR-CONN-014]]
<!-- brain:auto:end -->
