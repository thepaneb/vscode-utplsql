# Plano de execução — PRD-66 (robustez de conexão, logging e cache)

| Campo | Valor |
|---|---|
| Data | 2026-09-15 |
| Branch | `release/v0.12.0` |
| PRD | [prd-66-connection-robustness-logging](../../docs/prd/approved/prd-66-connection-robustness-logging.md) |
| Versão alvo | 0.12.0 |
| Esforço | 2–3 dias · Complexidade Média |

## Estado de partida

- `parseConnString` limita-se a Easy Connect e re-encoda host/porta/serviço.
- `catch` vazios em `oracleRunner.ts` (98, 149, 178, 186, 204, 270, 463, 481) e
  `discovery.ts` (164, 205, 224, 258) escondem falhas.
- `ensurePool` chaveia só pela connection string; sem `onDidChangeConfiguration`.
- `readConfig()`/`getExtensionLocale()` rodam `getConfiguration` no hot path.
- `showInfo`/`selectReporter` duplicam aquisição de pool.
- `checkDebugAccess` sempre retorna `true`.
- `debugger.runTest` interpola o path em SQL.
- `applySqlCoverage` varre `v$sql` global e o prefixo `startsWith` casa `/foobar`.
- Depende da **PRD-65 RF4** (split de credenciais) já aplicado.

## Ordem de execução (risco crescente — um commit por etapa)

| Ordem | Requisito | Arquivos | Esforço | Risco | Por quê |
|---|---|---|---|---|---|
| 1 | RF1 — `src/logger.ts` (puro, `UTPLSQL_DEBUG=1`) | `logger.ts` (novo), `package.json`? não | 2 h | Baixo | Base para RF2 |
| 2 | RF2 — trocar catches vazios por `logger.debug` | `oracleRunner.ts`, `discovery.ts` | 0,5 dia | Baixo | Só observabilidade |
| 3 | RF5 — `withOracleConnection(fn)` + uso em `showInfo`/`selectReporter` | `oracleRunner.ts`, `extension.ts` | 0,5 dia | Médio | Dedup; base para PRD-65 RF1 |
| 4 | RF4 — chave de pool + `invalidatePool()` + `onDidChangeConfiguration` + cache de config | `oracleRunner.ts`, `config.ts`, `extension.ts` | 0,5–1 dia | Médio | Cache precisa de invalidação confiável |
| 5 | RF3 — parse completo delegando ao `oracledb` (TNS/SID/IPv6) | `oracleRunner.ts` | 0,5 dia | Médio | Complementa 65 RF4 |
| 6 | RF7 — binds no debugger | `debugger.ts` | 2 h | Baixo | Isolado |
| 7 | RF6 — `checkDebugAccess` efetivo | `dbmsDebug.ts` | 0,5 dia | Médio | Exige decisão de query de privilégio |
| 8 | RF8 — filtro de sessão no `v$sql` + prefixo de path | `viewCoverage.ts` | 0,5 dia | Médio | Só afeta cobertura de views |

## Comandos e gates por etapa

Cada etapa fecha com `npm run compile && npm run lint && npm run test:unit`
verde + gate específico.

```sh
# RF1/RF2
node --test out/test/unit/logger.test.js            # (novo) respeita UTPLSQL_DEBUG
# RF5
node --test out/test/unit/oracleRunner.test.js
# RF4
node --test out/test/unit/config.test.js            # invalidação de cache
npm run test:integration                            # reuse de pool entre runs
# RF3 + RF7/RF6/RF8
node --test out/test/unit/oracleRunner.test.js out/test/unit/dbmsDebug.test.js out/test/unit/viewCoverage.test.js
npm run test:integration                            # grants reais de DBMS_DEBUG
```

## Dependências e interações

- **PRD-65 RF4** primeiro: aqui só se estende o parse (TNS/SID/IPv6), sem
  reintroduzir o re-encode.
- **RF5 antes da PRD-65 RF1**: o provider `utplsql-db` deve usar
  `withOracleConnection`.
- **PRD-67 RF6** mexe na string de erro de `parseConnString` (i18n) — coordenar.
- `UTPLSQL_DEBUG` deve ser documentado no README (Troubleshooting) — skill
  `docs-fidelity`.

## Rotina de conclusão da PRD

1. Mover `docs/prd/approved/prd-66-*.md` → `docs/prd/completed/` (Status → Concluído).
2. `docs/prd/index.md`: linha 66 → 🟢 Concluídos (0.12.0) + Estrutura.
3. `CHANGELOG.md`: entry na 0.12.0.
4. `docs:check` + `brain:sync`/`brain:check`.
5. `sync-prds` (label `prd:completed`, fecha a issue #85).

## Observações

- Nunca logar a connection string; usar mascaramento quando necessário.
- Invalidar o pool apenas **entre runs** (nunca durante execução ativa).
- Decisão recomendada: cache de config só por evento (sem TTL); recriação do
  pool lazy no próximo run.
