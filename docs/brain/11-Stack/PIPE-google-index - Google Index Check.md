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
regras: [BR-SITE-001]
---

# PIPE-google-index — Google Index Check

Workflow [`google-index.yml`](../../../.github/workflows/google-index.yml) — **gerado** por `npm run brain:sync`.

## Gatilhos

- `schedule`
- `workflow_dispatch`

## Jobs

- `google-index`

## Passos

- `uses: actions/setup-python@6d4fd22b20465ccc0f7354476588e8df7c9ca0e0 # v7.1.0`
- `run: |`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
- 📐 Regras: [[BR-SITE-001 - Landing page gerada de site e publicada no GitHub Pages, sem noindex|BR-SITE-001]]
<!-- brain:auto:end -->
