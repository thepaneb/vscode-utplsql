---
id: PIPE-wiki
tipo: pipeline
titulo: "Publish Wiki"
arquivo: ".github/workflows/wiki.yml"
gatilhos: [push, workflow_dispatch]
jobs: [publish]
gerado: true
tags: [pipeline, ci]
---

# PIPE-wiki — Publish Wiki

Workflow [`wiki.yml`](../../../.github/workflows/wiki.yml) — **gerado** por `npm run brain:sync`.

## Gatilhos

- `push`
- `workflow_dispatch`

## Jobs

- `publish`

## Passos

- `uses: actions/setup-node@v7`
