---
id: PIPE-pagespeed
aliases: [PIPE-pagespeed]
tipo: pipeline
titulo: "PageSpeed Check"
arquivo: ".github/workflows/pagespeed.yml"
gatilhos: [schedule, workflow_dispatch]
jobs: [pagespeed]
gerado: true
tags: [pipeline, ci]
regras: [BR-SITE-001]
---

# PIPE-pagespeed — PageSpeed Check

Workflow [`pagespeed.yml`](../../../.github/workflows/pagespeed.yml) — **gerado** por `npm run brain:sync`.

## Gatilhos

- `schedule`
- `workflow_dispatch`

## Jobs

- `pagespeed`

## Passos

- `run: |`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
- 📐 Regras: [[BR-SITE-001 - Landing page gerada de site e publicada no GitHub Pages, sem noindex|BR-SITE-001]]
<!-- brain:auto:end -->
