---
id: PIPE-wiki
aliases: [PIPE-wiki]
tipo: pipeline
titulo: "Publish Wiki"
arquivo: ".github/workflows/wiki.yml"
gatilhos: [push, workflow_dispatch]
jobs: [publish]
gerado: true
tags: [pipeline, ci]
decisoes: [ADR-002]
---

# PIPE-wiki — Publish Wiki

Workflow [`wiki.yml`](../../../.github/workflows/wiki.yml) — **gerado** por `npm run brain:sync`.

## Gatilhos

- `push`
- `workflow_dispatch`

## Jobs

- `publish`

## Passos

- `uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7`
- `uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7`
- `run: node scripts/brain-build.cjs`
- `run: |`
- `run: |`
- `run: |`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
- 🧭 Decisões: [[ADR-002 - Vault como fonte da verdade|ADR-002]]
<!-- brain:auto:end -->
