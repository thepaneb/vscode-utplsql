---
id: PIPE-publish
aliases: [PIPE-publish]
tipo: pipeline
titulo: "Publish Extension"
arquivo: ".github/workflows/publish.yml"
gatilhos: [release]
jobs: [verify, publish]
gerado: true
tags: [pipeline, ci]
decisoes: [ADR-004]
---

# PIPE-publish — Publish Extension

Workflow [`publish.yml`](../../../.github/workflows/publish.yml) — **gerado** por `npm run brain:sync`.

## Gatilhos

- `release`

## Jobs

- `verify`
- `publish`

## Passos

- `uses: actions/checkout@v7`
- `uses: actions/setup-node@v7`
- `run: npm ci`
- `run: npm run compile`
- `run: npm run lint`
- `run: npm run test:unit`
- `uses: actions/checkout@v7`
- `uses: actions/setup-node@v7`
- `run: npm ci`
- `run: npm run package:target -- ${{ matrix.target }}`
- `run: npm run publish -- --packagePath vscode-utplsql-*@${{ matrix.target }}.vsix`
- `run: gh release upload ${{ github.event.release.tag_name }} *.vsix`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
- 🧭 Decisões: [[ADR-004 - Bundling com esbuild e higiene do VSIX|ADR-004]]
<!-- brain:auto:end -->
