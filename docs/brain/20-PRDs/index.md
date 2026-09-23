---
tipo: prd-index
status: ativo
titulo: "PRDs — vscode-utplsql"
publicar: docs/prd/index.md
verificado: 2026-09-23
tags: [prd, indice]
---

# PRDs — vscode-utplsql

Catálogo de Product Requirements Documents da extensão.

---

## Como usar

1. Para **propor** uma mudança: crie uma nota `prd-<NN>-<slug>` em `20-PRDs/`
   (a partir de `_templates/template-prd`) e preencha o frontmatter.
2. Quando aprovado: mude `status: proposed` → `status: approved`.
3. Durante implementação: `status: in-progress`.
4. Quando entregue: `status: completed` e registre `versao:`.

> A **fonte da verdade** do status é o campo `status:` no frontmatter da nota
> (pasta `20-PRDs/`). Os arquivos `docs/prd/**` e este índice são **gerados**
> por `npm run brain:build`. **Não edite os arquivos gerados.**

## Manutenção e sincronia

```
Frontmatter (20-PRDs/)  ──brain:build──►  docs/prd/** (gerado) + index.md (gerado)
        │
        └──sync-prds.cjs──►  label + issue no GitHub
```

### Regras

1. **Status**: `status:` aceita `proposed`, `approved`, `in-progress`,
   `completed`.
2. **Pastas geradas**: a pasta do arquivo gerado (`docs/prd/<status>/`) deriva do
   `status:` do frontmatter.
3. **Índice gerado**: as tabelas do **Roadmap** e a árvore **Estrutura** são
   geradas do frontmatter das notas (`npm run brain:sync`).
4. **Label ↔ Status**: `sync-prds.cjs` lê o `status:` do frontmatter para
   determinar a label GitHub (`prd:proposed`, `prd:approved`, `prd:completed`,
   `prd:in-progress`).

### Fluxo de mudança de status

```
CRIAR (proposed)
  → nova nota em 20-PRDs/ com status: proposed
  → npm run brain:sync && npm run brain:build
  → npm run sync-prds (cria a issue)

APROVAR
  → status: proposed → approved no frontmatter
  → npm run brain:build
  → npm run sync-prds (label prd:approved)

IMPLEMENTAR
  → status: approved → in-progress
  → npm run brain:build
  → npm run sync-prds (label prd:in-progress)

CONCLUIR
  → status: in-progress → completed + versao: <release>
  → npm run brain:build
  → registrar no CHANGELOG.md
  → npm run sync-prds (fecha a issue, label prd:completed)
```

> ⚠️ **Nunca** edite o cache `.prd-issues.json` manualmente. O `sync-prds.cjs`
> gerencia esse arquivo automaticamente.

---

## Roadmap

<!-- brain:auto:start:prd-roadmap -->
### 🟢 Concluídos

| # | PRD | Versão | Data |
|---|---|---|---|
| 63 | [Wiki bilíngue (pt-BR/en) + correção de links + limpeza de READMEs](../../../docs/prd/completed/prd-63-diagram-i18n.md) | — | — |
| 01 | [Modo de invocação `java` (bypass do launcher)](../../../docs/prd/completed/prd-01-java-mode.md) | 0.3.0 | 2026-06-28 |
| 02 | [Refatoração de `extension.ts`](../../../docs/prd/completed/prd-02-refactor-extension.md) | 0.4.0 | 2026-07-02 |
| 03 | [Pipeline CI + Linter](../../../docs/prd/completed/prd-03-ci-lint.md) | 0.4.0 | 2026-07-02 |
| 04 | [Expansão da cobertura de testes](../../../docs/prd/completed/prd-04-expand-tests.md) | 0.4.0 | 2026-07-02 |
| 07 | [Upgrade Node 24 + TypeScript 6.0](../../../docs/prd/completed/prd-07-upgrade-node-ts.md) | 0.4.0 | 2026-07-02 |
| 05 | [Feedback de progresso e cancelamento na UX](../../../docs/prd/completed/prd-05-progress-cancel.md) | 0.5.0 | 2026-07-02 |
| 06 | [Suporte a múltiplos workspace folders](../../../docs/prd/completed/prd-06-multiroot.md) | 0.5.0 | 2026-07-02 |
| 08 | [Opções CLI avançadas expostas como settings](../../../docs/prd/completed/prd-08-cli-options.md) | 0.5.0 | 2026-07-03 |
| 09 | [Diagnóstico e validação com `utplsql info`](../../../docs/prd/completed/prd-09-cli-info.md) | 0.5.0 | 2026-07-03 |
| 13 | [Infraestrutura de testes com Oracle real](../../../docs/prd/completed/prd-13-oracle-infra.md) | 0.6.0 | 2026-07-11 |
| 14 | [Schema e objetos de teste utPLSQL](../../../docs/prd/completed/prd-14-test-schema-packages.md) | 0.6.0 | 2026-07-11 |
| 15 | [Testes de integração com banco real](../../../docs/prd/completed/prd-15-integration-tests-real-db.md) | 0.6.0 | 2026-07-11 |
| 16 | [Testes de integração para ambos os modos de invocação](../../../docs/prd/completed/prd-16-integration-test-invocation-modes.md) | 0.6.0 | 2026-07-13 |
| 10 | [Reporters dinâmicos com `utplsql reporters`](../../../docs/prd/completed/prd-10-dynamic-reporters.md) | 0.7.0 | 2026-07-03 |
| 18 | [Alinhamento `engines.node` com CI](../../../docs/prd/completed/prd-18-engine-node-ci.md) | 0.7.1 | 2026-07-18 |
| 19 | [Normalização do sistema de PRDs](../../../docs/prd/completed/prd-19-normalize-prd-system.md) | 0.7.1 | 2026-07-18 |
| 20 | [Limpeza de dependências e configurações](../../../docs/prd/completed/prd-20-cleanup-deps-config.md) | 0.7.1 | 2026-07-18 |
| 22 | [Sincronizar imagens no workflow da wiki](../../../docs/prd/completed/prd-22-wiki-image-sync.md) | 0.7.1 | 2026-07-21 |
| 35 | [Correção de cobertura no Windows + blindagem de testes para argumentos CLI](../../../docs/prd/completed/prd-35-windows-coverage-fix.md) | 0.7.2 | 2026-07-21 |
| 36 | [Correção do parse de `reporters` com descrições + flag `coverageEnabled`](../../../docs/prd/completed/prd-36-reporter-parse-fix.md) | 0.7.2 | 2026-07-21 |
| 24 | [CodeLens Integration](../../../docs/prd/completed/prd-24-codelens-integration.md) | 0.8.0 | 2026-07-21 |
| 25 | [Status Bar Indicator](../../../docs/prd/completed/prd-25-status-bar-indicator.md) | 0.8.0 | 2026-07-21 |
| 26 | [Inline Test Result Decorations](../../../docs/prd/completed/prd-26-inline-test-decorations.md) | 0.8.0 | 2026-07-21 |
| 27 | [Default Keybindings](../../../docs/prd/completed/prd-27-default-keybindings.md) | 0.8.0 | 2026-07-21 |
| 31 | [Smart Re-run Patterns](../../../docs/prd/completed/prd-31-smart-rerun-patterns.md) | 0.8.0 | 2026-07-21 |
| 11 | [Streaming de resultados em tempo real](../../../docs/prd/completed/prd-11-streaming-results.md) | 0.9.0 | 2026-07-03 |
| 17 | [Flags JVM customizáveis para o modo `java`](../../../docs/prd/completed/prd-17-java-args-setting.md) | 0.9.0 | 2026-07-13 |
| 28 | [PL/SQL Compilation Diagnostics](../../../docs/prd/completed/prd-28-plsql-compilation-diagnostics.md) | 0.9.0 | 2026-07-21 |
| 29 | [Jump to Failing Assertion](../../../docs/prd/completed/prd-29-jump-to-failing-assertion.md) | 0.9.0 | 2026-07-21 |
| 30 | [Schema-Aware Test Organization](../../../docs/prd/completed/prd-30-schema-aware-organization.md) | 0.9.0 | 2026-07-21 |
| 32 | [Quick-Fix Setup Diagnostics](../../../docs/prd/completed/prd-32-quickfix-setup-diagnostics.md) | 0.9.0 | 2026-07-21 |
| 37 | [Cobertura de código TypeScript com `c8`](../../../docs/prd/completed/prd-37-ts-coverage.md) | 0.9.0 | 2026-07-25 |
| 23 | [Screenshots da wiki: checklist manual + diagramas (reconciliada)](../../../docs/prd/completed/prd-23-auto-wiki-screenshots.md) | 0.10.0 | 2026-07-21 (reconciliada 2026-08-15) |
| 38 | [Connection Pooling no Oracle Runner](../../../docs/prd/completed/prd-38-connection-pooling.md) | 0.10.0 | 2026-08-08 |
| 39 | [Eliminar código duplicado entre runner.ts e oracleRunner.ts](../../../docs/prd/completed/prd-39-deduplicate-runners.md) | 0.10.0 | 2026-08-08 |
| 40 | [Refatorar executeRunOracle: Long Parameter List → Options Object](../../../docs/prd/completed/prd-40-options-object.md) | 0.10.0 | 2026-08-08 |
| 42 | [SuiteParser: parse de annotations %disabled, %throws, %tags e lifecycle](../../../docs/prd/completed/prd-42-suiteparser-annotations.md) | 0.10.0 | 2026-08-08 |
| 21 | [Melhorias nos workflows CI/CD](../../../docs/prd/completed/prd-21-workflow-improvements.md) | 0.11.0 | 2026-07-18 |
| 41 | [Verificação de instalação do utPLSQL na ativação](../../../docs/prd/completed/prd-41-utplsql-install-verification.md) | 0.11.0 | 2026-08-08 |
| 43 | [Schema-mode: descoberta de suites via ALL_OBJECTS e ALL_SOURCE](../../../docs/prd/completed/prd-43-schema-db-discovery.md) | 0.11.0 | 2026-08-08 |
| 44 | [Extrair matching resultado→teste para funções puras testáveis](../../../docs/prd/completed/prd-44-pure-matching.md) | 0.11.0 | 2026-08-08 |
| 45 | [Bundling com esbuild + poda do node-oracledb no VSIX](../../../docs/prd/completed/prd-45-bundle-esbuild.md) | 0.11.0 | 2026-08-26 |
| 46 | [Atualização de dependências major (oracledb 7, fast-xml-parser 5, iconv-lite 0.7, TypeScript 7)](../../../docs/prd/completed/prd-46-dependency-majors.md) | 0.11.0 | 2026-08-29 |
| 12 | [Cobertura de código para objetos SQL (views, queries)](../../../docs/prd/completed/prd-12-sql-coverage.md) | 0.12.0 | 2026-07-08 |
| 33 | [PL/SQL Debugger Integration](../../../docs/prd/completed/prd-33-plsql-debugger-integration.md) | 0.12.0 | 2026-07-21 |
| 34 | [Multi-Connection Profiles](../../../docs/prd/completed/prd-34-multi-connection-profiles.md) | 0.12.0 | 2026-07-21 |
| 48 | [Function Coverage derivada (DeclarationCoverage no Test Coverage)](../../../docs/prd/completed/prd-48-function-coverage.md) | 0.12.0 | 2026-08-29 |
| 49 | [Internacionalização (i18n) dos conteúdos textuais da extensão](../../../docs/prd/completed/prd-49-internacionalizacao.md) | 0.12.0 | 2026-08-29 |
| 62 | [Execução de scripts SQL contra perfil de conexão](../../../docs/prd/completed/prd-62-run-scripts-against-profiles.md) | 0.12.0 | 2026-09-06 |
| 64 | [Migração para Oracle-Only: eliminação do utPLSQL-cli e Java](../../../docs/prd/completed/prd-64-oracle-only-migration.md) | 0.12.0 | 2026-09-09 |
| 65 | [Correções críticas de schema-mode e segurança](../../../docs/prd/completed/prd-65-schema-mode-security-fixes.md) | 0.12.0 | 2026-09-15 |
| 66 | [Robustez de conexão, logging e cache](../../../docs/prd/completed/prd-66-connection-robustness-logging.md) | 0.12.0 | 2026-09-15 |
| 67 | [Qualidade, limpeza e performance](../../../docs/prd/completed/prd-67-code-quality-cleanup.md) | 0.12.0 | 2026-09-15 |
| 68 | [Religar diagnostics e reporter de sessão perdidos na migração Oracle-only](../../../docs/prd/completed/prd-68-restore-oracle-diagnostics-and-reporter.md) | 0.12.0 | 2026-09-15 |
| 70 | [Thick mode opcional (Instant Client) para bancos com NNE](../../../docs/prd/completed/prd-70-thick-mode-nne.md) | 0.12.1 | 2026-09-17 |
| 71 | [Corrigir o debugger para o DBMS_DEBUG real](../../../docs/prd/completed/prd-71-debugger-dbms-debug-fix.md) | 0.12.1 | 2026-09-18 |
| 72 | [Matriz de bancos Oracle para testes de integração](../../../docs/prd/completed/prd-72-db-test-matrix.md) | 0.12.1 | 2026-09-18 |
| 73 | [Compilar objeto para debug (comando + menus)](../../../docs/prd/completed/prd-73-compile-for-debug.md) | 0.12.1 | 2026-09-18 |
| 69 | [Runner Oracle: binds tipados, `a_tags` e validação de reporters](../../../docs/prd/completed/prd-69-oracle-runner-typed-binds.md) | 0.13.0 | 2026-09-15 |
| 74 | [Descoberta de suítes direto do banco (`ut_runner.get_suites_info`)](../../../docs/prd/completed/prd-74-db-first-discovery.md) | 0.13.0 | 2026-09-19 |
| 77 | [Reconstruir o cache de anotações do utPLSQL](../../../docs/prd/completed/prd-77-rebuild-annotation-cache.md) | 0.13.0 | 2026-09-19 |
| 78 | [Ordem aleatória de execução com seed (`a_random_test_order`)](../../../docs/prd/completed/prd-78-random-test-order.md) | 0.13.0 | 2026-09-19 |
| 79 | [Escopo avançado de cobertura (regex include/exclude + `excludeObjects`)](../../../docs/prd/completed/prd-79-coverage-scope.md) | 0.13.0 | 2026-09-19 |
| 83 | [Higiene do pacote VSIX: bloquear vazamento de arquivos de desenvolvimento](../../../docs/prd/completed/prd-83-vsix-package-hygiene.md) | 0.13.0 | 2026-09-22 |
| 84 | [Suporte a Oracle 12.2 com piso alternativo de utPLSQL e charset de conexão](../../../docs/prd/completed/prd-84-oracle-122-support.md) | 0.13.0 | 2026-09-22 |

### 🟡 Em desenvolvimento

#### 0.17.0 — Conhecimento e documentação (second brain)

| # | PRD | Versão alvo | Data |
|---|---|---|---|
| 85 | [Second brain canônico (Obsidian) com MCP e extração de conhecimento](../../../docs/prd/in-progress/prd-85-brain-source-of-truth.md) | 0.17.0 | 2026-09-23 |

### 🔵 Aprovados

#### 0.14.0 — Árvore, relatórios, conectividade e segurança

| # | PRD | Versão alvo | Data |
|---|---|---|---|
| 47 | [Node 26 no toolchain de desenvolvimento](../../../docs/prd/approved/prd-47-node-26-toolchain.md) | 0.14.0 | 2026-08-29 |

### ⚪ Propostos

#### 0.14.0 — Árvore, relatórios, conectividade e segurança

| # | PRD | Versão alvo | Data |
|---|---|---|---|
| 75 | [Árvore de testes lazy (resolução incremental por nível)](../../../docs/prd/proposed/prd-75-lazy-test-tree.md) | 0.14.0 | 2026-09-19 |
| 76 | [Execução e export com reporter arbitrário](../../../docs/prd/proposed/prd-76-reporter-export.md) | 0.14.0 | 2026-09-19 |
| 80 | [Documento virtual de fonte do banco para falhas e cobertura](../../../docs/prd/proposed/prd-80-virtual-db-source.md) | 0.14.0 | 2026-09-19 |
| 81 | [Hardening de segurança das settings de conexão](../../../docs/prd/proposed/prd-81-security-hardening.md) | 0.14.0 | 2026-09-19 |
| 82 | [Resolução TNS no thin e senha de wallet no SecretStorage](../../../docs/prd/proposed/prd-82-tns-wallet.md) | 0.14.0 | 2026-09-19 |

#### 0.15.0 — Tags e UX de execução

| # | PRD | Versão alvo | Data |
|---|---|---|---|
| 50 | [Auto-run on Save (Watch Mode)](../../../docs/prd/proposed/prd-50-auto-run-on-save.md) | 0.15.0 | 2026-09-06 |
| 51 | [Execução e seleção por Tag (`%tags`)](../../../docs/prd/proposed/prd-51-run-by-tag.md) | 0.15.0 | 2026-09-06 |
| 52 | [Diff inline esperado × obtido nas falhas](../../../docs/prd/proposed/prd-52-inline-diff-expected-actual.md) | 0.15.0 | 2026-09-06 |
| 53 | [Debug de testes: variações (cursor, falhos, último)](../../../docs/prd/proposed/prd-53-debug-test-variants.md) | 0.15.0 | 2026-09-06 |
| 54 | [Toggle de cobertura na status bar](../../../docs/prd/proposed/prd-54-coverage-toggle.md) | 0.15.0 | 2026-09-06 |
| 55 | [Organização da árvore de testes por tag](../../../docs/prd/proposed/prd-55-tag-organization.md) | 0.15.0 | 2026-09-06 |

#### 0.16.0 — Persistência, multi-root e produtividade

| # | PRD | Versão alvo | Data |
|---|---|---|---|
| 56 | [Duração por teste e persistência de resultados](../../../docs/prd/proposed/prd-56-duration-persistence.md) | 0.16.0 | 2026-09-06 |
| 57 | [Multi-root: resolução de `root`/`sourcePath` por folder](../../../docs/prd/proposed/prd-57-multiroot-root-resolution.md) | 0.16.0 | 2026-09-06 |
| 58 | [Run Related Tests](../../../docs/prd/proposed/prd-58-run-related-tests.md) | 0.16.0 | 2026-09-06 |
| 59 | [Scaffold de suíte de teste](../../../docs/prd/proposed/prd-59-scaffold-suite.md) | 0.16.0 | 2026-09-06 |

#### Fora de release (investigação / a reavaliar)

| # | PRD | Versão alvo | Data |
|---|---|---|---|
| 60 | [Cobertura de branch (investigação de viabilidade)](../../../docs/prd/proposed/prd-60-branch-coverage-investigation.md) | — | 2026-09-06 |
| 61 | [Auto-provisionamento do utPLSQL-cli](../../../docs/prd/proposed/prd-61-cli-auto-provision.md) | Suspenso — a reavaliar (PRD-64 removeu o CLI) | 2026-09-06 |
<!-- brain:auto:end -->

---

## Estrutura

<!-- brain:auto:start:prd-estrutura -->
```
docs/prd/
├── index.md          ← este arquivo (catálogo + roadmap)
├── template.md       ← molde para novos PRDs
├── completed/        ← já implementados
│   ├── prd-01-java-mode.md
│   ├── prd-02-refactor-extension.md
│   ├── prd-03-ci-lint.md
│   ├── prd-04-expand-tests.md
│   ├── prd-05-progress-cancel.md
│   ├── prd-06-multiroot.md
│   ├── prd-07-upgrade-node-ts.md
│   ├── prd-08-cli-options.md
│   ├── prd-09-cli-info.md
│   ├── prd-10-dynamic-reporters.md
│   ├── prd-11-streaming-results.md
│   ├── prd-12-sql-coverage.md
│   ├── prd-13-oracle-infra.md
│   ├── prd-14-test-schema-packages.md
│   ├── prd-15-integration-tests-real-db.md
│   ├── prd-16-integration-test-invocation-modes.md
│   ├── prd-17-java-args-setting.md
│   ├── prd-18-engine-node-ci.md
│   ├── prd-19-normalize-prd-system.md
│   ├── prd-20-cleanup-deps-config.md
│   ├── prd-21-workflow-improvements.md
│   ├── prd-22-wiki-image-sync.md
│   ├── prd-23-auto-wiki-screenshots.md
│   ├── prd-24-codelens-integration.md
│   ├── prd-25-status-bar-indicator.md
│   ├── prd-26-inline-test-decorations.md
│   ├── prd-27-default-keybindings.md
│   ├── prd-28-plsql-compilation-diagnostics.md
│   ├── prd-29-jump-to-failing-assertion.md
│   ├── prd-30-schema-aware-organization.md
│   ├── prd-31-smart-rerun-patterns.md
│   ├── prd-32-quickfix-setup-diagnostics.md
│   ├── prd-33-plsql-debugger-integration.md
│   ├── prd-34-multi-connection-profiles.md
│   ├── prd-35-windows-coverage-fix.md
│   ├── prd-36-reporter-parse-fix.md
│   ├── prd-37-ts-coverage.md
│   ├── prd-38-connection-pooling.md
│   ├── prd-39-deduplicate-runners.md
│   ├── prd-40-options-object.md
│   ├── prd-41-utplsql-install-verification.md
│   ├── prd-42-suiteparser-annotations.md
│   ├── prd-43-schema-db-discovery.md
│   ├── prd-44-pure-matching.md
│   ├── prd-45-bundle-esbuild.md
│   ├── prd-46-dependency-majors.md
│   ├── prd-48-function-coverage.md
│   ├── prd-49-internacionalizacao.md
│   ├── prd-62-run-scripts-against-profiles.md
│   ├── prd-63-diagram-i18n.md
│   ├── prd-64-oracle-only-migration.md
│   ├── prd-65-schema-mode-security-fixes.md
│   ├── prd-66-connection-robustness-logging.md
│   ├── prd-67-code-quality-cleanup.md
│   ├── prd-68-restore-oracle-diagnostics-and-reporter.md
│   ├── prd-69-oracle-runner-typed-binds.md
│   ├── prd-70-thick-mode-nne.md
│   ├── prd-71-debugger-dbms-debug-fix.md
│   ├── prd-72-db-test-matrix.md
│   ├── prd-73-compile-for-debug.md
│   ├── prd-74-db-first-discovery.md
│   ├── prd-77-rebuild-annotation-cache.md
│   ├── prd-78-random-test-order.md
│   ├── prd-79-coverage-scope.md
│   ├── prd-83-vsix-package-hygiene.md
│   └── prd-84-oracle-122-support.md
├── approved/        ← aprovados, aguardando implementação
│   └── prd-47-node-26-toolchain.md
├── in-progress/        ← sendo implementados agora
│   └── prd-85-brain-source-of-truth.md
└── proposed/        ← em avaliação
    ├── prd-50-auto-run-on-save.md
    ├── prd-51-run-by-tag.md
    ├── prd-52-inline-diff-expected-actual.md
    ├── prd-53-debug-test-variants.md
    ├── prd-54-coverage-toggle.md
    ├── prd-55-tag-organization.md
    ├── prd-56-duration-persistence.md
    ├── prd-57-multiroot-root-resolution.md
    ├── prd-58-run-related-tests.md
    ├── prd-59-scaffold-suite.md
    ├── prd-60-branch-coverage-investigation.md
    ├── prd-61-cli-auto-provision.md
    ├── prd-75-lazy-test-tree.md
    ├── prd-76-reporter-export.md
    ├── prd-80-virtual-db-source.md
    ├── prd-81-security-hardening.md
    └── prd-82-tns-wallet.md
```
<!-- brain:auto:end -->

---

## Convenções

- **Nome da nota**: `prd-<NN>-<slug>` (NN = sequencial de 2 dígitos, slug em kebab-case).
- **Status**: `status:` no frontmatter é a fonte da verdade.
- **Versão alvo**: a `minor` seguinte se for feature, `patch` se for bugfix.
- **Rollout**: toda PRD concluída vira um entry no `CHANGELOG.md`. A publicação é
  **exclusivamente pelo workflow do GitHub** (criar release) — `npm run publish`
  local é bloqueado.

## Publicação

**NÃO usar `npm run publish` ou `npx vsce publish` localmente.** A publicação é
feita automaticamente pelo workflow `.github/workflows/publish.yml` quando uma
release é publicada no GitHub. O único comando local válido para distribuição é
`npm run package` (gera `.vsix` para testes internos).
