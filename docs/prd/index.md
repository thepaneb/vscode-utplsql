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
| 01 | [Modo de invocação `java`](completed/prd-01-java-mode.md) | 0.3.0 | 2026-06-28 |
| 02 | [Refatoração de extension.ts](completed/prd-02-refactor-extension.md) | 0.4.0 | 2026-07-02 |
| 03 | [Pipeline CI + Linter](completed/prd-03-ci-lint.md) | 0.4.0 | 2026-07-02 |
| 04 | [Expansão da cobertura de testes](completed/prd-04-expand-tests.md) | 0.4.0 | 2026-07-02 |
| 07 | [Upgrade Node 24 + TypeScript 6.0](completed/prd-07-upgrade-node-ts.md) | 0.4.0 | 2026-07-02 |

### 🟡 Em desenvolvimento

| # | PRD | Versão alvo | Data |
|---|---|---|---|
| 05 | [Feedback de progresso e cancelamento](in-progress/prd-05-progress-cancel.md) | 0.5.0 | 2026-07-02 |
| 06 | [Suporte a múltiplos workspace folders](in-progress/prd-06-multiroot.md) | 0.5.0 | 2026-07-02 |
| 08 | [Opções CLI avançadas como settings](in-progress/prd-08-cli-options.md) | 0.5.0 | 2026-07-03 |
| 09 | [Diagnóstico com info](in-progress/prd-09-cli-info.md) | 0.5.0 | 2026-07-03 |

### 🔵 Aprovados

| # | PRD | Versão alvo | Data |
|---|---|---|---|
| 09 | [Diagnóstico com info](approved/prd-09-cli-info.md) | 0.5.0 | 2026-07-03 |

### ⚪ Propostos

| # | PRD | Versão alvo | Data |
|---|---|---|---|
| 10 | [Reporters dinâmicos](proposed/prd-10-dynamic-reporters.md) | 0.6.0 | 2026-07-03 |
| 11 | [Streaming de resultados](proposed/prd-11-streaming-results.md) | 0.7.0 | 2026-07-03 |

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
│   └── prd-07-upgrade-node-ts.md
├── approved/         ← aprovados, aguardando implementação
│   (vazio)
├── in-progress/      ← sendo implementados agora
│   ├── prd-05-progress-cancel.md
│   ├── prd-06-multiroot.md
│   ├── prd-08-cli-options.md
│   └── prd-09-cli-info.md
└── proposed/         ← em avaliação
    ├── prd-10-dynamic-reporters.md
    └── prd-11-streaming-results.md
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
