# PRDs — vscode-utplsql

Catálogo de Product Requirements Documents da extensão.

---

## Como usar

1. Para **propor** uma mudança: copie `template.md` para `proposed/<nome>.md`
   e preencha.
2. Quando aprovado: mova para `approved/<nome>.md`.
3. Durante implementação: mova para `in-progress/<nome>.md`.
4. Quando entregue: mova para `completed/<nome>.md` e registre a versão.

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

_(nenhum no momento)_

### 🔵 Aprovados

| # | PRD | Versão alvo | Data |
|---|---|---|---|
| 07 | [Upgrade Node 24 + TypeScript 6.0](approved/prd-07-upgrade-node-ts.md) | 0.4.0 | 2026-07-02 |

### ⚪ Propostos

| # | PRD | Versão alvo | Data |
|---|---|---|---|
| 05 | [Feedback de progresso e cancelamento](proposed/prd-05-progress-cancel.md) | 0.5.0 | 2026-07-02 |
| 06 | [Suporte a múltiplos workspace folders](proposed/prd-06-multiroot.md) | 0.5.0 | 2026-07-02 |

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
│   └── prd-04-expand-tests.md
├── approved/         ← aprovados, aguardando implementação
├── in-progress/      ← sendo implementados agora
└── proposed/         ← em avaliação
    ├── prd-05-progress-cancel.md
    └── prd-06-multiroot.md
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
