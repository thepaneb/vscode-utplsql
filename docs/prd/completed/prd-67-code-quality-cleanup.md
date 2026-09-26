<!-- GENERATED FROM docs/brain/20-PRDs/prd-67-code-quality-cleanup.md — DO NOT EDIT -->

# PRD-67 — Qualidade, limpeza e performance

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-15 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.12.0 |
| Arquivos afetados | `src/extension.ts`, `src/commands/` (novo), `src/runner.ts`, `src/matching.ts`, `src/discovery.ts`, `src/junit.ts`, `src/oracleRunner.ts`, `src/viewCoverage.ts`, `src/debugger.ts`, `src/quickfix.ts`, `src/i18nLocales.ts`, `README.md` |
| Esforço estimado | 3–4 dias |
| Complexidade | Média |

## 1. Resumo

Reduzir o tamanho de `extension.ts` extraindo módulos de comando, fechar
lacunas de teste, corrigir paths cross-platform, adicionar debounce ao watcher,
lazy-load do debugger/script runner, eliminar strings hardcoded fora do i18n e
remover código morto da era CLI.

## 2. Contexto e problema

- **`extension.ts` com 1009 linhas**: a maioria dos `registerCommand` está
  concentrada no arquivo.
- **Lacunas de teste**: `extension.ts`, `buildSchemaTree`/`buildFileTree` (não
  exportados), mudança de config → pool, e resolução de suites só-DB.
- **Paths cross-platform**: `discovery.ts:92` usa `path.posix.relative` com
  paths normalizados; o caso backslash já é testado (`discovery.test.ts:208`),
  faltando casing de drive e drives diferentes.
- **Watcher sem debounce**: create/change/delete chamam `refresh` direto
  (`extension.ts:540-543`).
- **Bundle**: `dist/extension.js` (esbuild) carrega debugger e script runner
  sempre.
- **i18n**: strings hardcoded em `junit.ts:76,83` (`'Falhou'`),
  `oracleRunner.ts:19` (erro de formato de conexão) e `discovery.ts:159`
  (`console.warn`).
- **Código morto**: `SetupValidator.checkCli()` sempre retorna `true`
  (`quickfix.ts:86-88`); `UTPLSQL_BAD_CONN` tratado mas nunca produzido
  (`quickfix.ts:269`); `runner.applyResults`/`applyCoverage` só usados em testes
  (`runner.ts:149-210`).
- **`runner.ts`**: loops usam `t` como variável (`runner.ts:100-103`),
  sombreando o `t` do i18n; `require('node:fs')`/`require('node:path')` dentro
  de funções (`runner.ts:156,177-178`).

## 3. Objetivos / Não-objetivos

**Objetivos**
- `extension.ts` < 200 linhas como orquestrador.
- Elevar a cobertura de testes para as funções puras e novos módulos.
- Paths corretos em Windows (drive letters).
- Debounce configurável no refresh.
- Lazy-load do debugger e do script runner.
- i18n completo para strings de runtime.
- Remover código morto e cleanups de estilo.

**Não-objetivos**
- Novas features.
- Alterar comportamento funcional existente.
- Mudanças de segurança/schema-mode (PRD-65) ou conexão/logging (PRD-66).

## 4. Requisitos

### RF1 — Refatorar `extension.ts` em módulos de comando

Criar `src/commands/{run,debug,script,profile,connection,utility}.ts`, cada um
exportando `register(context, deps)`. `extension.ts` mantém apenas ativação,
wiring de deps e dispose.

### RF2 — Fechar lacunas de teste

- Exportar/injetar `buildFileTree`/`buildSchemaTree` para testes unitários, ou
  testar via integração dedicada.
- Teste de `onDidChangeConfiguration` → `invalidatePool` (ver PRD-66).
- Teste de resolução de suites só-DB (ver PRD-65 RF1).

### RF3 — Paths cross-platform

Normalizar casing de drive antes da comparação e retornar `undefined` para
drives diferentes em `extractSchemaFromPath`.

### RF4 — Debounce de refresh

Coalescer eventos do watcher (default 300ms), configurável por
`utplsql.refreshDebounceMs`.

### RF5 — Lazy-load

`import()` dinâmico do debugger e do script runner dentro dos respectivos
`register` de comando (apoiado no RF1).

### RF6 — i18n

Rotear as strings de `junit.ts`/`oracleRunner.ts`/`discovery.ts` por `t()` (ou
retornar códigos nos módulos puros e traduzir no chamador), adicionando chaves
aos 24 catálogos.

### RF7 — Remover código morto

Remover `checkCli`, o branch `UTPLSQL_BAD_CONN` (ou implementar quem o produz) e
`runner.applyResults`/`runner.applyCoverage` (mover teste para `results.ts`).

### RF8 — Cleanups de `runner.ts`

Renomear a variável de loop que sombreia `t` e mover
`require('node:fs')`/`require('node:path')` para imports no topo.

**Não-funcionais**
- RNF1 — `npm run test:coverage` mantém 65% linhas/statements, 80% branches,
  70% funções.
- RNF2 — `npm run lint` sem novos warnings.
- RNF3 — `npm run test:integration` verde.

## 5. Solução proposta

### 5.1 `src/commands/`

Mover os `registerCommand` por domínio; passar `controller`, `state`,
`statusBar`, `decorationManager`, `setupValidator` via objeto `deps`. Registrar
em `extension.ts` numa única chamada por módulo.

### 5.2 `src/discovery.ts`

Aplicar normalização de drive (`C:`/`c:`) e guarda de drives distintos em
`extractSchemaFromPath`.

### 5.3 `src/extension.ts` (watcher)

Implementar debounce com `setTimeout`/`clearTimeout` e dispose no
`context.subscriptions`.

### 5.4 `src/i18nLocales.ts` + chamadores

Adicionar chaves novas em pt-BR e propagar aos demais catálogos; fallback
existente cobre chaves ausentes.

## 6. Configuração

- Nova setting `utplsql.refreshDebounceMs` (number, default 300).
- Atualizar README (tabela de config, Comandos, Keybindings, Troubleshooting)
  conforme AGENTS.md.

## 7. Plano de testes

- **Unitários**: `extractSchemaFromPath` com drives diferentes; debounce
  (fake timers); funções puras movidas.
- **Integração**: refresh em schema mode; smoke de todos os comandos após o
  refactor.
- **Manual**: salvar `.pks` múltiplas vezes → um único refresh; verificar
  bundle menor e lazy-load.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Refactor de `extension.ts` quebrar comandos | Manter assinaturas e testar cada comando (unit/integration/smoke). |
| Debounce atrasar feedback | 300ms default e configurável. |
| Lazy-load quebrar em ambientes sem `oracledb` | Import dinâmico com catch e mensagem i18n. |
| Remover código "morto" que ainda é usado | Confirmar referências via grep antes de remover. |

## 9. Rollout

- Release 0.12.0 (minor).
- CHANGELOG: "Refatoração de `extension.ts`, debounce de refresh, lazy-load e
  limpeza de código".

## 10. Critérios de aceite

- `extension.ts` < 200 linhas e todos os comandos funcionando.
- `npm test`, `npm run lint`, `npm run test:coverage` verdes (thresholds
  mantidos).
- Debounce coalesce saves rápidos.
- Nenhuma string de runtime hardcoded fora do i18n.
- README atualizado.

## 11. Questões em aberto

- Exportar `buildFileTree`/`buildSchemaTree` ou cobrir só por integração?
  (Recomendado: extrair para módulo testável.)
- Incremental refresh (arquivo único) além do debounce? (Recomendado: follow-up.)
