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
- `uses: ossf/scorecard-action@23f22cd43608bae7a1f1fa2603d7314dee9538a5 # v2.6.0`
- `uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2`
- `uses: github/codeql-action/upload-sarif@1bd86f2fdb4b86187fa4059f16f31a3202acc9ea # v4`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
<!-- brain:auto:end -->
