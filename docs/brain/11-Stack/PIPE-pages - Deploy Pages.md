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
- `uses: actions/configure-pages@983d7736d9b0ae728b81ab479565c72886d7745b # v5`
- `uses: actions/upload-pages-artifact@56afc609e74202658d3ffba0e8f6dda462b719fa # v3`
- `uses: actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e # v4`
- `run: |`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
- 📐 Regras: [[BR-SITE-001 - Landing page gerada de site e publicada no GitHub Pages, sem noindex|BR-SITE-001]]
<!-- brain:auto:end -->
