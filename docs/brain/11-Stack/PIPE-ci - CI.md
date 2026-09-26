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
---

# PIPE-ci — CI

Workflow [`ci.yml`](../../../.github/workflows/ci.yml) — **gerado** por `npm run brain:sync`.

## Gatilhos

- `push`
- `pull_request`

## Jobs

- `build`

## Passos

- `uses: actions/checkout@v7`
- `uses: actions/setup-node@v7`
- `run: npm ci`
- `run: npm run brain:ci`
- `run: git diff --exit-code`
- `run: npm run docs:check`
- `run: npm run lint`
- `run: npm run typecheck`
- `run: npm run test:coverage`

## Conexões

- 🗺️ [[MOC - Stack]]
