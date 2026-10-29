---
tipo: nota
status: ativo
titulo: "Registro de features (fonte para README, wiki e posts)"
verificado: 2026-10-29
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

```json
[
  { "id": "hardening-defensivo", "prd": "PRD-110", "interno": true },
  { "id": "supply-chain-ci", "prd": "PRD-104", "interno": true },
  { "id": "lint-scope", "prd": "PRD-113", "interno": true },
  { "id": "vscode-stub-tipado", "prd": "PRD-114", "interno": true },
  { "id": "docs-anti-drift", "prd": "PRD-98", "interno": true },
  { "id": "oracle-11g-thick", "prd": "PRD-123", "interno": true },
  { "id": "commit-signing", "prd": "PRD-118", "interno": true },
  { "id": "ossf-scorecard", "prd": "PRD-119", "interno": true }
]
```
