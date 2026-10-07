---
id: PIPE-google-index
aliases: [PIPE-google-index]
tipo: pipeline
titulo: "Google Index Check"
arquivo: ".github/workflows/google-index.yml"
gatilhos: [schedule, workflow_dispatch]
jobs: [google-index]
gerado: true
tags: [pipeline, ci]
---

# PIPE-google-index — Google Index Check

Workflow [`google-index.yml`](../../../.github/workflows/google-index.yml) — **gerado** por `npm run brain:sync`.

## Gatilhos

- `schedule`
- `workflow_dispatch`

## Jobs

- `google-index`

## Passos

- `uses: google-github-actions/auth@v2`
- `run: |`

## Conexões

- 🗺️ [[MOC - Stack]]
