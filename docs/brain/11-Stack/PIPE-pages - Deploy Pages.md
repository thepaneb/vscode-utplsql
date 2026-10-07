---
id: PIPE-pages
aliases: [PIPE-pages]
tipo: pipeline
titulo: "Deploy Pages"
arquivo: ".github/workflows/pages.yml"
gatilhos: [push, workflow_dispatch]
jobs: [deploy]
gerado: true
tags: [pipeline, ci]
---

# PIPE-pages — Deploy Pages

Workflow [`pages.yml`](../../../.github/workflows/pages.yml) — **gerado** por `npm run brain:sync`.

## Gatilhos

- `push`
- `workflow_dispatch`

## Jobs

- `deploy`

## Passos

- `uses: actions/checkout@v7`
- `uses: actions/configure-pages@v5`
- `uses: actions/upload-pages-artifact@v3`
- `uses: actions/deploy-pages@v4`
- `run: |`

## Conexões

- 🗺️ [[MOC - Stack]]
