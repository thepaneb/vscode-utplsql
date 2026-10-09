---
id: PIPE-site-health
aliases: [PIPE-site-health]
tipo: pipeline
titulo: "Site Health Check"
arquivo: ".github/workflows/site-health.yml"
gatilhos: [schedule, workflow_dispatch]
jobs: [health]
gerado: true
tags: [pipeline, ci]
regras: [BR-SITE-001]
---

# PIPE-site-health — Site Health Check

Workflow [`site-health.yml`](../../../.github/workflows/site-health.yml) — **gerado** por `npm run brain:sync`.

## Gatilhos

- `schedule`
- `workflow_dispatch`

## Jobs

- `health`

## Passos

- `run: |`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
- 📐 Regras: [[BR-SITE-001 - Landing page gerada de site e publicada no GitHub Pages, sem noindex|BR-SITE-001]]
<!-- brain:auto:end -->
