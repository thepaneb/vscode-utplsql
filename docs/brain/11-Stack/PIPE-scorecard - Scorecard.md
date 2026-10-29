---
id: PIPE-scorecard
aliases: [PIPE-scorecard]
tipo: pipeline
titulo: "Scorecard"
arquivo: ".github/workflows/scorecard.yml"
gatilhos: [branch_protection_rule, schedule, push, workflow_dispatch]
jobs: [analysis]
gerado: true
tags: [pipeline, ci]
---

# PIPE-scorecard — Scorecard

Workflow [`scorecard.yml`](../../../.github/workflows/scorecard.yml) — **gerado** por `npm run brain:sync`.

## Gatilhos

- `branch_protection_rule`
- `schedule`
- `push`
- `workflow_dispatch`

## Jobs

- `analysis`

## Passos

- `uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7`
- `uses: ossf/scorecard-action@62b2cac7ed8198b15735ed49ab1e5cf35480ba46 # v2.4.0`
- `uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4`
- `uses: github/codeql-action/upload-sarif@9b3254085494b55a0f7c4c2b3d2d52cc712ce370 # v4`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
<!-- brain:auto:end -->
