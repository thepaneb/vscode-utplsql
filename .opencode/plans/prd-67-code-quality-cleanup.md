# Plano de execução — PRD-67 (qualidade, limpeza e performance)

| Campo | Valor |
|---|---|
| Data | 2026-09-15 |
| Branch | `release/v0.12.0` |
| PRD | [prd-67-code-quality-cleanup](../../docs/prd/approved/prd-67-code-quality-cleanup.md) |
| Versão alvo | 0.12.0 |
| Esforço | 3–4 dias · Complexidade Média |

## Estado de partida

- `extension.ts` com ~1009 linhas e a maioria dos `registerCommand`.
- Lacunas de teste: `extension.ts`, `buildFileTree`/`buildSchemaTree`, mudança de
  config → pool (PRD-66), resolução de suites só-DB (PRD-65).
- `discovery.ts:92` usa `path.posix.relative`; falta casing de drive/drives distintos.
- Watcher sem debounce (`extension.ts:540-543`).
- Bundle carrega debugger e script runner sempre.
- Strings hardcoded: `junit.ts:76,83`, `oracleRunner.ts:19`, `discovery.ts:159`.
- Código morto: `checkCli()`, `UTPLSQL_BAD_CONN` (branch), `runner.applyResults/applyCoverage`.
- `runner.ts`: loop sombreia `t`; `require('node:fs')`/`require('node:path')` dentro de funções.
- **Deve rodar por último** (após 65, 66 e 68): o refactor de `extension.ts` rebaseia
  em todas as mudanças anteriores.

## Ordem de execução (risco crescente — um commit por etapa)

| Ordem | Requisito | Arquivos | Esforço | Risco | Por quê |
|---|---|---|---|---|---|
| 1 | RF8 — cleanups de `runner.ts` (loop `t`, imports no topo) | `runner.ts` | 2 h | Baixo | Isolado |
| 2 | RF3 — paths cross-platform (casing de drive, drives distintos) | `discovery.ts` | 0,5 dia | Baixo | Puro e testável |
| 3 | RF6 — i18n das strings hardcoded (24 catálogos) | `junit.ts`, `oracleRunner.ts`, `discovery.ts`, `i18nLocales.ts` | 1 dia | Médio | Repetitivo; fallback cobre ausências |
| 4 | RF7 — remover código morto | `quickfix.ts`, `runner.ts`, `results.ts` (testes) | 0,5 dia | Médio | **Preservar** `UTPLSQL_BAD_CONN` (PRD-68) |
| 5 | RF4 — debounce de refresh + setting `utplsql.refreshDebounceMs` | `extension.ts`, `package.json`, `config.ts` | 0,5 dia | Médio | Nova setting ⇒ README |
| 6 | RF5 — lazy-load do debugger e do script runner | `extension.ts` | 0,5 dia | Médio | Depende de RF1 idealmente; pode ser fase |
| 7 | RF1 — extrair `src/commands/{run,debug,script,profile,connection,utility}.ts` | `extension.ts`, `commands/*` | 1–1,5 dia | Alto | Maior refactor; precisa de smoke de todos os comandos |
| 8 | RF2 — fechar lacunas de teste | testes | 0,5 dia | Baixo | Fecha cobertura após o refactor |

> RF6 antes de RF7: mover strings enquanto os módulos ainda têm os call sites;
> RF1 por último para não conflitar com o refactor de strings/comandos.

## Comandos e gates por etapa

Cada etapa fecha com `npm run compile && npm run lint && npm run test:unit`
verde + gate específico.

```sh
# RF8 / RF3
node --test out/test/unit/runner.test.js out/test/unit/discovery.test.js
# RF6
node --test out/test/unit/i18n.test.js out/test/unit/junit.test.js
# RF4
node --test out/test/unit/extension.test.js      # debounce com fake timers (novo)
# RF1 (após refactor)
npm run test:unit
npm run test:integration                          # smoke: todos os comandos
npm run test:coverage                             # thresholds 65/80/70
npm run package                                   # bundle menor / lazy-load
```

## Dependências e interações

- **Após PRD-68**: não remover o branch `UTPLSQL_BAD_CONN` (agora tem produtor).
- **Depende de PRD-65/66**: os testes de "config → pool" e "suites só-DB" previstos
  em RF2 só fazem sentido depois delas.
- Nova setting `utplsql.refreshDebounceMs` exige atualizar **README** (tabela de
  config) conforme `AGENTS.md` e revalidar com a skill `docs-fidelity`.
- Rebase frequente de `extension.ts` — executar por último e em commits pequenos.

## Rotina de conclusão da PRD

1. Mover `docs/prd/approved/prd-67-*.md` → `docs/prd/completed/` (Status → Concluído).
2. `docs/prd/index.md`: linha 67 → 🟢 Concluídos (0.12.0) + Estrutura.
3. `CHANGELOG.md`: entry na 0.12.0.
4. README (config) + `docs:check` + `brain:sync`/`brain:check`.
5. `sync-prds` (label `prd:completed`, fecha a issue #86).

## Observações

- Antes de remover "código morto", confirmar referências via grep.
- Lazy-load com `import()` dinâmico + catch → mensagem i18n se `oracledb` faltar.
- Incremental refresh (arquivo único) fica como follow-up (fora do escopo).
