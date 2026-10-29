---
id: PIPE-ci
aliases: [PIPE-ci]
tipo: pipeline
titulo: "CI"
arquivo: ".github/workflows/ci.yml"
gatilhos: [push, pull_request]
jobs: [build]
gerado: true
tags: [pipeline, ci]
regras: [BR-PLAT-001]
---

# PIPE-ci — CI

Workflow [`ci.yml`](../../../.github/workflows/ci.yml) — **gerado** por `npm run brain:sync`.

## Gatilhos

- `push`
- `pull_request`

## Jobs

- `build`

## Passos

- `uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7`
- `uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7`
- `run: npm ci`
- `run: npm run audit:prod`
- `run: npm run version:check`
- `run: npm run brain:ci`
- `run: git diff --exit-code`
- `run: npm run docs:check`
- `run: npm run lint`
- `run: npm run typecheck`
- `run: npm run test:coverage`
- `uses: codecov/codecov-action@0fb7174895f61a3b6b78fc075e0cd60383518dac # v5`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
- 📐 Regras: [[BR-PLAT-001 - Piso de VS Code e runtime Node do host sao coerentes|BR-PLAT-001]]
<!-- brain:auto:end -->
