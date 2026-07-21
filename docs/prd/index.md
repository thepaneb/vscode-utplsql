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
| 13 | [Infraestrutura de testes com Oracle real](completed/prd-13-oracle-infra.md) | 0.6.0 | 2026-07-11 |
| 14 | [Schema e objetos de teste utPLSQL](completed/prd-14-test-schema-packages.md) | 0.6.0 | 2026-07-11 |
| 15 | [Testes de integração com banco real](completed/prd-15-integration-tests-real-db.md) | 0.6.0 | 2026-07-11 |
| 16 | [Testes de integração para ambos os modos de invocação](completed/prd-16-integration-test-invocation-modes.md) | 0.6.0 | 2026-07-13 |
| 18 | [Alinhamento `engines.node` com CI](completed/prd-18-engine-node-ci.md) | 0.7.1 | 2026-07-18 |
| 19 | [Normalização do sistema de PRDs](completed/prd-19-normalize-prd-system.md) | 0.7.1 | 2026-07-18 |
| 20 | [Limpeza de dependências e configurações](completed/prd-20-cleanup-deps-config.md) | 0.7.1 | 2026-07-18 |
| 22 | [Sincronizar imagens no workflow da wiki](completed/prd-22-wiki-image-sync.md) | 0.7.1 | 2026-07-21 |

### 🟡 Em desenvolvimento

| # | PRD | Versão alvo | Data |
|---|---|---|---|
*(vazio)*

### 🔵 Aprovados

| # | PRD | Versão alvo | Data |
|---|---|---|---|
| 24 | [CodeLens Integration](approved/prd-24-codelens-integration.md) | 0.8.0 | 2026-07-21 |
| 25 | [Status Bar Indicator](approved/prd-25-status-bar-indicator.md) | 0.8.0 | 2026-07-21 |
| 26 | [Inline Test Result Decorations](approved/prd-26-inline-test-decorations.md) | 0.8.0 | 2026-07-21 |
| 27 | [Default Keybindings](approved/prd-27-default-keybindings.md) | 0.8.0 | 2026-07-21 |
| 31 | [Smart Re-run Patterns](approved/prd-31-smart-rerun-patterns.md) | 0.8.0 | 2026-07-21 |

### ⚪ Propostos

| # | PRD | Versão alvo | Data |
|---|---|---|---|
| 11 | [Streaming de resultados em tempo real](proposed/prd-11-streaming-results.md) | 0.9.0 | 2026-07-03 |
| 12 | [Cobertura de código para objetos SQL (views, queries)](proposed/prd-12-sql-coverage.md) | 1.0.0 | 2026-07-08 |
| 17 | [Flags JVM customizáveis para o modo `java`](proposed/prd-17-java-args-setting.md) | 0.9.0 | 2026-07-13 |
| 21 | [Melhorias nos workflows CI/CD](proposed/prd-21-workflow-improvements.md) | 1.0.0 | 2026-07-18 |
| 23 | [Automatizar geração de screenshots da wiki](proposed/prd-23-auto-wiki-screenshots.md) | 1.0.0 | 2026-07-21 |
| 28 | [PL/SQL Compilation Diagnostics](proposed/prd-28-plsql-compilation-diagnostics.md) | 0.9.0 | 2026-07-21 |
| 29 | [Jump to Failing Assertion](proposed/prd-29-jump-to-failing-assertion.md) | 0.9.0 | 2026-07-21 |
| 30 | [Schema-Aware Test Organization](proposed/prd-30-schema-aware-organization.md) | 0.9.0 | 2026-07-21 |
| 32 | [Quick-Fix Setup Diagnostics](proposed/prd-32-quickfix-setup-diagnostics.md) | 0.9.0 | 2026-07-21 |
| 33 | [PL/SQL Debugger Integration](proposed/prd-33-plsql-debugger-integration.md) | 1.0.0 | 2026-07-21 |
| 34 | [Multi-Connection Profiles](proposed/prd-34-multi-connection-profiles.md) | 1.0.0 | 2026-07-21 |
| 35 | [Correção de cobertura no Windows + blindagem de testes](proposed/prd-35-windows-coverage-fix.md) | 0.7.2 | 2026-07-21 |
| 36 | [Correção do parse de reporters com descrições](proposed/prd-36-reporter-parse-fix.md) | 0.7.2 | 2026-07-21 |


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
│   ├── prd-13-oracle-infra.md
│   ├── prd-14-test-schema-packages.md
│   ├── prd-15-integration-tests-real-db.md
│   ├── prd-16-integration-test-invocation-modes.md
│   ├── prd-18-engine-node-ci.md
│   ├── prd-19-normalize-prd-system.md
│   ├── prd-20-cleanup-deps-config.md
│   └── prd-22-wiki-image-sync.md
├── approved/         ← aprovados, aguardando implementação
│   ├── prd-24-codelens-integration.md
│   ├── prd-25-status-bar-indicator.md
│   ├── prd-26-inline-test-decorations.md
│   ├── prd-27-default-keybindings.md
│   └── prd-31-smart-rerun-patterns.md
├── in-progress/      ← sendo implementados agora
│   (vazio)
└── proposed/         ← em avaliação
    ├── prd-11-streaming-results.md
    ├── prd-12-sql-coverage.md
    ├── prd-17-java-args-setting.md
    ├── prd-21-workflow-improvements.md
    ├── prd-23-auto-wiki-screenshots.md
    ├── prd-28-plsql-compilation-diagnostics.md
    ├── prd-29-jump-to-failing-assertion.md
    ├── prd-30-schema-aware-organization.md
    ├── prd-32-quickfix-setup-diagnostics.md
    ├── prd-33-plsql-debugger-integration.md
    ├── prd-34-multi-connection-profiles.md
    ├── prd-35-windows-coverage-fix.md
    └── prd-36-reporter-parse-fix.md
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
