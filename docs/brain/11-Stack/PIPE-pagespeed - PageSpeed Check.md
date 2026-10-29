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
- `uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
- 📐 Regras: [[BR-SITE-001 - Landing page gerada de site e publicada no GitHub Pages, sem noindex|BR-SITE-001]]
<!-- brain:auto:end -->
