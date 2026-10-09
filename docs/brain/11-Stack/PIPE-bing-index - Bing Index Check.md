---
id: PIPE-bing-index
aliases: [PIPE-bing-index]
tipo: pipeline
titulo: "Bing Index Check"
arquivo: ".github/workflows/bing-index.yml"
gatilhos: [schedule, workflow_dispatch]
jobs: [bing-index]
gerado: true
tags: [pipeline, ci]
regras: [BR-SITE-001]
---

# PIPE-bing-index — Bing Index Check

Workflow [`bing-index.yml`](../../../.github/workflows/bing-index.yml) — **gerado** por `npm run brain:sync`.

## Gatilhos

- `schedule`
- `workflow_dispatch`

## Jobs

- `bing-index`

## Passos

- `run: |`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
- 📐 Regras: [[BR-SITE-001 - Landing page gerada de site e publicada no GitHub Pages, sem noindex|BR-SITE-001]]
<!-- brain:auto:end -->
