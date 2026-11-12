---
id: PIPE-integration
aliases: [PIPE-integration]
tipo: pipeline
titulo: "Integration (Oracle)"
arquivo: ".github/workflows/integration.yml"
gatilhos: [pull_request, schedule, workflow_dispatch]
jobs: [integration, thick, matrix, matrix-thick]
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
- `thick`
- `matrix`
- `matrix-thick`

## Passos

- `uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7`
- `uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7`
- `run: npm ci`
- `run: |`
- `run: |`
- `run: bash scripts/db-matrix/run.sh --only 23free --tests "xvfb-run -a bash -c '${{ steps.scope.outputs.cmd }}'"`
- `uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7`
- `uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7`
- `run: npm ci`
- `run: |`
- `run: |`
- `run: bash scripts/db-matrix/run.sh --only 23free --tests "xvfb-run -a bash -c 'npm run test:integration:thick'"`
- `run: bash scripts/db-matrix/run.sh --only 11xe --tests "xvfb-run -a bash -c 'npm run test:integration:thick'"`
- `run: bash scripts/db-matrix/run.sh --only 23free --tests "xvfb-run -a bash -c 'npm run test:integration:thick-full'"`
- `run: bash scripts/db-matrix/run.sh --only 23free --tests "xvfb-run -a bash -c 'npm run test:integration:thick-full'"`
- `run: bash scripts/db-matrix/run.sh --only 11xe --tests "xvfb-run -a bash -c 'npm run test:integration:thick-full'"`
- `uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7`
- `uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7`
- `run: npm ci`
- `run: |`
- `run: |`
- `run: bash scripts/db-matrix/run.sh --only 19ee --tests "xvfb-run -a bash -c 'npm run test:integration:smoke'"`
- `uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2`
- `uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7`
- `uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7`
- `run: npm ci`
- `run: |`
- `run: |`
- `run: |`
- `uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
- 📐 Regras: [[BR-TEST-001 - Matriz de bancos Oracle cobre 12.2-23ai em thin e thick|BR-TEST-001]] · [[BR-TEST-002 - Testes de integração exigem banco e são skip sem UTPLSQL_CONN|BR-TEST-002]]
- 🧭 Decisões: [[ADR-011 - Thick mode opt-in e matriz de bancos|ADR-011]]
<!-- brain:auto:end -->
