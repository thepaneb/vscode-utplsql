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

- `uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7`
- `uses: actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d # v6.0.0`
- `uses: actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5.0.0`
- `uses: actions/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346 # v5.0.1`
- `run: |`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
- 📐 Regras: [[BR-SITE-001 - Landing page gerada de site e publicada no GitHub Pages, sem noindex|BR-SITE-001]]
<!-- brain:auto:end -->
