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
regras: [BR-SITE-001]
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

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
- 📐 Regras: [[BR-SITE-001 - Landing page gerada de site e publicada no GitHub Pages, sem noindex|BR-SITE-001]]
<!-- brain:auto:end -->
