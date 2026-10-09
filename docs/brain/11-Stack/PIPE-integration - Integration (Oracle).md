---
id: PIPE-integration
aliases: [PIPE-integration]
tipo: pipeline
titulo: "Integration (Oracle)"
arquivo: ".github/workflows/integration.yml"
gatilhos: [pull_request, schedule, workflow_dispatch]
jobs: [integration, matrix]
gerado: true
tags: [pipeline, ci]
regras: [BR-TEST-001, BR-TEST-002]
decisoes: [ADR-011]
---

# PIPE-integration — Integration (Oracle)

Workflow [`integration.yml`](../../../.github/workflows/integration.yml) — **gerado** por `npm run brain:sync`.

## Gatilhos

- `pull_request`
- `schedule`
- `workflow_dispatch`

## Jobs

- `integration`
- `matrix`

## Passos

- `uses: actions/checkout@v7`
- `uses: actions/setup-node@v7`
- `run: npm ci`
- `run: |`
- `run: |`
- `run: bash scripts/db-matrix/run.sh --only 23free --tests "xvfb-run -a bash -c '${{ steps.scope.outputs.cmd }}'"`
- `uses: actions/checkout@v7`
- `uses: actions/setup-node@v7`
- `run: npm ci`
- `run: |`
- `run: bash scripts/db-matrix/run.sh --only 18xe,21xe,23free --tests "xvfb-run -a npm run test:integration"`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
- 📐 Regras: [[BR-TEST-001 - Matriz de bancos Oracle cobre 12.2-23ai em thin e thick|BR-TEST-001]] · [[BR-TEST-002 - Testes de integração exigem banco e são skip sem UTPLSQL_CONN|BR-TEST-002]]
- 🧭 Decisões: [[ADR-011 - Thick mode opt-in e matriz de bancos|ADR-011]]
<!-- brain:auto:end -->
