---
id: PIPE-jev-review
aliases: [PIPE-jev-review]
tipo: pipeline
titulo: "Jev Review"
arquivo: ".github/workflows/jev-review.yml"
gatilhos: [pull_request]
jobs: [review]
gerado: true
tags: [pipeline, ci]
---

# PIPE-jev-review — Jev Review

Workflow [`jev-review.yml`](../../../.github/workflows/jev-review.yml) — **gerado** por `npm run brain:sync`.

## Gatilhos

- `pull_request`

## Jobs

- `review`

## Passos

- `uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7`
- `uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7`
- `run: npm ci`
- `run: npm run compile`
- `run: |`
- `run: cat jev-review.md >> "$GITHUB_STEP_SUMMARY"`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
<!-- brain:auto:end -->
