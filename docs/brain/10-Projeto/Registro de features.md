---
tipo: nota
status: ativo
titulo: "Registro de features (fonte para README, wiki e posts)"
verificado: 2026-11-08
tags: [docs, features]
---

# Registro de features

Fonte estruturada usada por `npm run docs:features-check -- <versão>` (PRD-98
RF4/RF5). Cada entrada liga uma PRD a um bullet do README, uma âncora presente
nas variantes de README, uma página da wiki e (quando houver) posts pt/en e
cards do LinkedIn.

Campos:

- `id` — identificador curto da feature;
- `prd` — ID da PRD (`PRD-NN`);
- `interno: true` — enabler de infraestrutura/testes; dispensa bullet/wiki/posts;
- `readme_bullet` — texto exato do bullet no `README.md` (EN);
- `readme_anchor` — trecho estável presente nas 23 variantes (emoji/heading);
- `wiki` — página em `docs/brain/70-Wiki` (sem `.md`);
- `linkedin` — `["docs/linkedin/features/...-pt.md", "...-en.md"]`;
- `card` — `["docs/linkedin/assets/....png", "...-en.png"]`.

> A 0.18.0 é uma release de **fundação** (segurança, testes e anti-drift): os
> itens abaixo são enablers internos. O post de **release** é coberto pela skill
> `release`/`linkedin-posts`, não por um post de feature individual.
>
> A 0.19.0 é uma release de **plataforma/runtime** (piso 1.125/Node 24, ESM,
> driver 26): os itens da versão também são `interno: true`; a PRD-125 ficou
> parcial e não entra no registro até concluir a suíte thick-full.
>
> A 0.20.0 fecha a PRD-125 (eixo experimental) e inclui PRD-146 (attestations)
> e PRD-147 (Marketplace) como enablers de distribuição (`interno: true`).

```json
[
  { "id": "hardening-defensivo", "prd": "PRD-110", "interno": true },
  { "id": "supply-chain-ci", "prd": "PRD-104", "interno": true },
  { "id": "lint-scope", "prd": "PRD-113", "interno": true },
  { "id": "vscode-stub-tipado", "prd": "PRD-114", "interno": true },
  { "id": "docs-anti-drift", "prd": "PRD-98", "interno": true },
  { "id": "oracle-11g-thick", "prd": "PRD-123", "interno": true },
  { "id": "commit-signing", "prd": "PRD-118", "interno": true },
  { "id": "ossf-scorecard", "prd": "PRD-119", "interno": true },
  { "id": "node24-vscode-1-125", "prd": "PRD-127", "interno": true },
  { "id": "toolchain-node24-ci26", "prd": "PRD-47", "interno": true },
  { "id": "bundle-esm-es2024", "prd": "PRD-95", "interno": true },
  { "id": "decompose-oracle-runner", "prd": "PRD-111", "interno": true },
  { "id": "oracledb-26", "prd": "PRD-124", "interno": true },
  { "id": "lean-activation", "prd": "PRD-120", "interno": true },
  { "id": "unpriv-fixture", "prd": "PRD-107", "interno": true },
  { "id": "idle-pool-cleanup", "prd": "PRD-101", "interno": true },
  { "id": "grouped-run-options", "prd": "PRD-111", "interno": true },
  { "id": "trace-perf", "prd": "PRD-102", "interno": true },
  { "id": "incremental-reindex", "prd": "PRD-103", "interno": true },
  { "id": "perf-harness", "prd": "PRD-106", "interno": true },
  { "id": "thick-full-matrix", "prd": "PRD-125", "interno": true },
  { "id": "publish-attestations", "prd": "PRD-146", "interno": true },
  { "id": "marketplace-listing", "prd": "PRD-147", "interno": true }
]
```
