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
- `run: scripts/db-matrix/run.sh --only 23free --tests "xvfb-run -a ${{ steps.scope.outputs.cmd }}"`
- `uses: actions/checkout@v7`
- `uses: actions/setup-node@v7`
- `run: npm ci`
- `run: |`
- `run: scripts/db-matrix/run.sh --only 18xe,21xe,23free --tests "xvfb-run -a npm run test:integration"`

## Conexões

- 🗺️ [[MOC - Stack]]
