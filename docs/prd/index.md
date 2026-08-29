# PRDs — vscode-utplsql

Catálogo de Product Requirements Documents da extensão.

---

## Como usar

1. Para **propor** uma mudança: copie `template.md` para `proposed/<nome>.md`
   e preencha.
2. Quando aprovado: mova para `approved/<nome>.md`.
3. Durante implementação: mova para `in-progress/<nome>.md`.
4. Quando entregue: mova para `completed/<nome>.md` e registre a versão.

## Manutenção e sincronia

Quatro artefatos devem estar sempre consistentes entre si:

```
Status da PRD  ←→  Pasta do arquivo  ←→  Tabela no index.md  ←→  Label no GitHub
(Proposto)         proposed/              ⚪ Propostos             prd:proposed
(Aprovado)         approved/              🔵 Aprovados             prd:approved
(Em desenvolvimento) in-progress/          🟡 Em desenvolvimento    prd:in-progress
(Concluído)        completed/             🟢 Concluídos            prd:completed
```

### Regras

1. **Status ↔ Pasta**: o status no cabeçalho da PRD (`Status: Proposto`) deve
   corresponder **exatamente** à pasta onde o arquivo está. Ex.: se o arquivo
   está em `proposed/`, o status é `Proposto`.
2. **Pasta ↔ Índice**: a seção **Estrutura** em `index.md` deve listar
   **exatamente** os arquivos presentes em cada pasta — nem mais, nem menos.
3. **Índice ↔ Status**: cada PRD aparece na tabela da seção correspondente ao
   seu status. Uma PRD só aparece **uma única vez** no roadmap.
4. **Label ↔ Status**: o script `sync-prds.cjs` lê a pasta para determinar a
   label GitHub (`prd:proposed`, `prd:approved`, `prd:completed`). Por isso a
   pasta é a **fonte da verdade** para o status.

### Fluxo de mudança de status

```
CRIAR (Proposto)
  → criar arquivo em proposed/
  → adicionar na tabela ⚪ Propostos + na árvore Estrutura
  → rodar sync-prds (cria issue)

APROVAR
  → mover arquivo de proposed/ → approved/
  → mover linha na tabela de ⚪ Propostos → 🔵 Aprovados
  → atualizar a árvore Estrutura
  → rodar sync-prds (atualiza label para prd:approved)

IMPLEMENTAR
  → mover arquivo de approved/ → in-progress/
  → mover linha na tabela de 🔵 Aprovados → 🟡 Em desenvolvimento
  → atualizar a árvore Estrutura
  → rodar sync-prds (atualiza label para prd:in-progress)

CONCLUIR
  → mover arquivo de in-progress/ → completed/
  → mover linha na tabela de 🟡 Em desenvolvimento → 🟢 Concluídos
  → preencher a coluna Versão com o número da release
  → atualizar a árvore Estrutura
  → registrar no CHANGELOG.md
  → rodar sync-prds (fecha a issue, atualiza label para prd:completed)
```

> ⚠️ **Nunca** edite o cache `.prd-issues.json` manualmente. O `sync-prds.cjs`
> gerencia esse arquivo automaticamente.

---

## Roadmap

### 🟢 Concluídos

| # | PRD | Versão | Data |
|---|---|---|---|
| 01 | [Modo de invocação `java` (bypass do launcher)](completed/prd-01-java-mode.md) | 0.3.0 | 2026-06-28 |
| 02 | [Refatoração de `extension.ts`](completed/prd-02-refactor-extension.md) | 0.4.0 | 2026-07-02 |
| 03 | [Pipeline CI + Linter](completed/prd-03-ci-lint.md) | 0.4.0 | 2026-07-02 |
| 04 | [Expansão da cobertura de testes](completed/prd-04-expand-tests.md) | 0.4.0 | 2026-07-02 |
| 05 | [Feedback de progresso e cancelamento na UX](completed/prd-05-progress-cancel.md) | 0.5.0 | 2026-07-07 |
| 06 | [Suporte a múltiplos workspace folders](completed/prd-06-multiroot.md) | 0.5.0 | 2026-07-08 |
| 07 | [Upgrade Node 24 + TypeScript 6.0](completed/prd-07-upgrade-node-ts.md) | 0.4.0 | 2026-07-02 |
| 08 | [Opções CLI avançadas expostas como settings](completed/prd-08-cli-options.md) | 0.5.0 | 2026-07-08 |
| 09 | [Diagnóstico e validação com `utplsql info`](completed/prd-09-cli-info.md) | 0.5.0 | 2026-07-08 |
| 10 | [Reporters dinâmicos com `utplsql reporters`](completed/prd-10-dynamic-reporters.md) | 0.7.0 | 2026-07-03 |
| 11 | [Streaming de resultados em tempo real](completed/prd-11-streaming-results.md) | 0.9.0 | 2026-08-02 |
| 13 | [Infraestrutura de testes com Oracle real](completed/prd-13-oracle-infra.md) | 0.6.0 | 2026-07-11 |
| 14 | [Schema e objetos de teste utPLSQL](completed/prd-14-test-schema-packages.md) | 0.6.0 | 2026-07-11 |
| 15 | [Testes de integração com banco real](completed/prd-15-integration-tests-real-db.md) | 0.6.0 | 2026-07-11 |
| 16 | [Testes de integração para ambos os modos de invocação](completed/prd-16-integration-test-invocation-modes.md) | 0.6.0 | 2026-07-13 |
| 17 | [Flags JVM customizáveis para o modo `java`](completed/prd-17-java-args-setting.md) | 0.9.0 | 2026-08-02 |
| 18 | [Alinhamento `engines.node` com CI](completed/prd-18-engine-node-ci.md) | 0.7.1 | 2026-07-18 |
| 19 | [Normalização do sistema de PRDs](completed/prd-19-normalize-prd-system.md) | 0.7.1 | 2026-07-18 |
| 20 | [Limpeza de dependências e configurações](completed/prd-20-cleanup-deps-config.md) | 0.7.1 | 2026-07-18 |
| 21 | [Melhorias nos workflows CI/CD](completed/prd-21-workflow-improvements.md) | 0.11.0 | 2026-07-18 |
| 22 | [Sincronizar imagens no workflow da wiki](completed/prd-22-wiki-image-sync.md) | 0.7.1 | 2026-07-21 |
| 23 | [Screenshots da wiki: checklist manual + diagramas](completed/prd-23-auto-wiki-screenshots.md) | 0.10.0 | 2026-07-21 |
| 24 | [CodeLens Integration](completed/prd-24-codelens-integration.md) | 0.8.0 | 2026-07-25 |
| 25 | [Status Bar Indicator](completed/prd-25-status-bar-indicator.md) | 0.8.0 | 2026-07-25 |
| 26 | [Inline Test Result Decorations](completed/prd-26-inline-test-decorations.md) | 0.8.0 | 2026-07-25 |
| 27 | [Default Keybindings](completed/prd-27-default-keybindings.md) | 0.8.0 | 2026-07-25 |
| 28 | [PL/SQL Compilation Diagnostics](completed/prd-28-plsql-compilation-diagnostics.md) | 0.9.0 | 2026-08-02 |
| 29 | [Jump to Failing Assertion](completed/prd-29-jump-to-failing-assertion.md) | 0.9.0 | 2026-08-02 |
| 30 | [Schema-Aware Test Organization](completed/prd-30-schema-aware-organization.md) | 0.9.0 | 2026-08-02 |
| 31 | [Smart Re-run Patterns](completed/prd-31-smart-rerun-patterns.md) | 0.8.0 | 2026-07-25 |
| 32 | [Quick-Fix Setup Diagnostics](completed/prd-32-quickfix-setup-diagnostics.md) | 0.9.0 | 2026-08-02 |
| 35 | [Correção de cobertura no Windows + blindagem de testes](completed/prd-35-windows-coverage-fix.md) | 0.7.2 | 2026-07-21 |
| 36 | [Correção do parse de reporters com descrições](completed/prd-36-reporter-parse-fix.md) | 0.7.2 | 2026-07-21 |
| 37 | [Cobertura de código TypeScript com `c8`](completed/prd-37-ts-coverage.md) | 0.9.0 | 2026-08-02 |
| 38 | [Connection Pooling no Oracle Runner](completed/prd-38-connection-pooling.md) | 0.10.0 | 2026-08-08 |
| 39 | [Eliminar código duplicado entre runners](completed/prd-39-deduplicate-runners.md) | 0.10.0 | 2026-08-08 |
| 40 | [Refatorar executeRunOracle: Options Object](completed/prd-40-options-object.md) | 0.10.0 | 2026-08-08 |
| 41 | [Verificação de instalação do utPLSQL](completed/prd-41-utplsql-install-verification.md) | 0.11.0 | 2026-08-08 |
| 42 | [SuiteParser: parse de annotations estendidas](completed/prd-42-suiteparser-annotations.md) | 0.10.0 | 2026-08-08 |
| 43 | [Schema-mode: descoberta via ALL_OBJECTS/ALL_SOURCE](completed/prd-43-schema-db-discovery.md) | 0.11.0 | 2026-08-29 |
| 44 | [Matching resultado→teste como função pura](completed/prd-44-pure-matching.md) | 0.11.0 | 2026-08-08 |
| 45 | [Bundling com esbuild + poda do node-oracledb no VSIX](completed/prd-45-bundle-esbuild.md) | 0.11.0 | 2026-08-26 |

### 🟡 Em desenvolvimento

_(vazio — nenhuma PRD em implementação)_

### 🔵 Aprovados

_(vazio — nenhuma PRD aprovada aguardando implementação)_

### ⚪ Propostos

#### 0.12.0

| # | PRD | Versão alvo | Data |
|---|---|---|---|
| 12 | [Cobertura de código para objetos SQL (views, queries)](proposed/prd-12-sql-coverage.md) | 0.12.0 | 2026-07-08 |
| 33 | [PL/SQL Debugger Integration](proposed/prd-33-plsql-debugger-integration.md) | 0.12.0 | 2026-07-21 |
| 34 | [Multi-Connection Profiles](proposed/prd-34-multi-connection-profiles.md) | 0.12.0 | 2026-07-21 |
| 46 | [Atualização de dependências major](proposed/prd-46-dependency-majors.md) | 0.12.0 | 2026-08-29 |


---

## Estrutura

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
│   └── prd-45-bundle-esbuild.md
├── approved/         ← aprovados, aguardando implementação (vazio)
├── in-progress/      ← sendo implementados agora (vazio)
└── proposed/         ← em avaliação
    ├── prd-12-sql-coverage.md
    ├── prd-33-plsql-debugger-integration.md
    ├── prd-34-multi-connection-profiles.md
    └── prd-46-dependency-majors.md
```

---

## Convenções

- **Nome do arquivo**: `prd-<NN>-<slug>.md` (NN = sequencial de 2 dígitos, slug em kebab-case).
- **Status no cabeçalho**: deve refletir a pasta onde o arquivo está.
- **Versão alvo**: a `minor` seguinte se for feature, `patch` se for bugfix.
- **Rollout**: toda PRD concluída vira um entry no `CHANGELOG.md`. A publicação é
  **exclusivamente pelo workflow do GitHub** (criar release) — `npm run publish`
  local é bloqueado.

## Publicação

**NÃO usar `npm run publish` ou `npx vsce publish` localmente.** A publicação é
feita automaticamente pelo workflow `.github/workflows/publish.yml` quando uma
release é publicada no GitHub. O único comando local válido para distribuição é
`npm run package` (gera `.vsix` para testes internos).
