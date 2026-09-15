# Plano de execução — PRD-68 (religar diagnostics e reporter de sessão)

| Campo | Valor |
|---|---|
| Data | 2026-09-15 |
| Branch | `release/v0.12.0` |
| PRD | [prd-68-restore-oracle-diagnostics-and-reporter](../../docs/prd/approved/prd-68-restore-oracle-diagnostics-and-reporter.md) |
| Versão alvo | 0.12.0 |
| Esforço | 2–3 dias · Complexidade Média |

## Estado de partida

- `oracleRunner.checkCompilationErrors()` existe (query `ALL_ERRORS`) mas **sem caller**
  e sem `DiagnosticCollection`; `utplsql.compilationDiagnostics.enabled` é lido e ignorado.
- `state.consumeExtraReporter()` existe mas nunca é chamado (`setExtraReporter` é).
- `UTPLSQL_BAD_CONN` tem handler de quick-fix mas nenhum produtor;
  `validateOnActivation` só emite `UTPLSQL_OLD_VERSION` (`major < 3`).
- `extractSchemaFromPath` faz `match[1].toUpperCase()` sem guard.
- Docs (README/wiki/functional) descrevem compilation diagnostics como **inativo** —
  devem ser reativadas ao final desta PRD (skill `docs-fidelity`).

## Ordem de execução (risco crescente — um commit por etapa)

| Ordem | Requisito | Arquivos | Esforço | Risco | Por quê |
|---|---|---|---|---|---|
| 1 | RF4 — constante `UTPLSQL_MIN_VERSION` + semver no aviso/quick-fix + i18n | `oracleRunner.ts`, `quickfix.ts`, `i18nLocales.ts` | 0,5 dia | Baixo | Base dos diagnostics |
| 2 | RF5 — guard em `extractSchemaFromPath` (padrão sem `{schema}` → `UNKNOWN`) | `discovery.ts` | 2 h | Baixo | Puro e testável |
| 3 | RF3 — produzir `UTPLSQL_BAD_CONN` em `validateOnActivation` | `quickfix.ts` | 0,5 dia | Médio | Exige conexão real no teste |
| 4 | RF2 — consumir `state.consumeExtraReporter()` em `executeRunOracle` | `state.ts`, `oracleRunner.ts` | 0,5 dia | Médio | Dedup com `additionalReporters` |
| 5 | RF1 — religar compilation diagnostics (collection + wiring + gate de setting) | `extension.ts`, `oracleRunner.ts`, `results.ts` | 1 dia | Médio-Alto | Precisa mapear `ALL_ERRORS` → URI/posição |

> Ordem 1–3 são independentes e de baixo risco; RF1 por último por depender de
> resolução de URI (reusa `resolveStackFrameToUri`).

## Comandos e gates por etapa

Cada etapa fecha com `npm run compile && npm run lint && npm run test:unit`
verde + gate específico.

```sh
# RF4/RF5
node --test out/test/unit/quickfix.test.js out/test/unit/discovery.test.js
# RF3
node --test out/test/unit/quickfix.test.js
npm run test:integration        # conexão inválida → UTPLSQL_BAD_CONN
# RF2
node --test out/test/unit/oracleRunner.test.js
# RF1
node --test out/test/unit/oracleRunner.test.js
npm run test:integration        # objeto inválido real → Problems Panel
# gate final
npm run test:coverage
```

## Dependências e interações

- **Deve rodar ANTES da PRD-67 RF7**: a 67 pretende remover o branch
  `UTPLSQL_BAD_CONN`; se a 68 rodar primeiro, a 67 deve **preservá-lo**.
- **PRD-66 RF5** (`withOracleConnection`) pode ser usado na coleta de erros.
- Não conflita com 65, exceto por ambos tocarem `extension.ts` no wiring.
- Ao concluir, **atualizar docs** que hoje marcam a feature como inativa:
  `README.md`, `docs/wiki/Diagnostics-and-quick-fix.md` (+pt),
  `docs/functional/07`, `AGENTS.md`, e a descrição de
  `utplsql.compilationDiagnostics.enabled` no `package.json`.

## Rotina de conclusão da PRD

1. Mover `docs/prd/approved/prd-68-*.md` → `docs/prd/completed/` (Status → Concluído).
2. `docs/prd/index.md`: linha 68 → 🟢 Concluídos (0.12.0) + Estrutura.
3. `CHANGELOG.md`: entry na 0.12.0.
4. Reativar a documentação da feature (README/wiki/functional/AGENTS).
5. `docs:check` + `brain:sync`/`brain:check`.
6. `sync-prds` (label `prd:completed`, fecha a issue #87).

## Observações

- Mapear linhas de `ALL_ERRORS` é best-effort: reusar `resolveStackFrameToUri` e
  degradar para "Problems Panel sem underline" quando não resolver o arquivo.
- Decisão em aberto: threshold final `3.1.0` (documentado) vs `3.0.0` (código) —
  escolher **uma** constante e alinhar i18n/testes.
