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
- `uses: ossf/scorecard-action@fa7117db83c52d787ae5a89f350999701505d78e # v2.5.0`
- `uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2`
- `uses: github/codeql-action/upload-sarif@9b3254085494b55a0f7c4c2b3d2d52cc712ce370 # v4`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
<!-- brain:auto:end -->
