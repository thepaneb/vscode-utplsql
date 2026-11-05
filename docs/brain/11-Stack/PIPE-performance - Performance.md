---
id: PIPE-performance
aliases: [PIPE-performance]
tipo: pipeline
titulo: "Performance"
arquivo: ".github/workflows/performance.yml"
gatilhos: [workflow_dispatch, schedule]
jobs: [perf]
gerado: true
tags: [pipeline, ci]
---

# PIPE-performance — Performance

Workflow [`performance.yml`](../../../.github/workflows/performance.yml) — **gerado** por `npm run brain:sync`.

## Gatilhos

- `workflow_dispatch`
- `schedule`

## Jobs

- `perf`

## Passos

- `uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7`
- `uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7`
- `run: npm ci`
- `run: |`
- `run: bash scripts/db-matrix/run.sh --only 23free --tests "bash scripts/perf-run.sh"`
- `uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
<!-- brain:auto:end -->
